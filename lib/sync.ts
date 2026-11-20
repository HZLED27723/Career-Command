"use client";

import { supabase } from "./supabase";
import { db, metaRepo } from "./db";
import { buildBackup, restoreBackup, countRecords, CONTENT_TABLES } from "./backup";

/**
 * Cloud sync. Reuses the local backup format: the user's entire dataset is
 * mirrored into one `user_data` row (jsonb) keyed by their auth id.
 *
 * The whole-dataset-per-row model means every push is a full overwrite, so the
 * only real hazard is pushing a dataset that isn't actually the user's — an
 * empty device, a half-loaded one, or another account's records. Three guards
 * prevent that, and they are the reason this file is careful:
 *
 *  1. NOTHING is pushed until `reconcileOnLogin` has *succeeded*. If the pull
 *     fails (offline, auth expired, server error) the app stays read-only
 *     against the cloud rather than treating this device as the truth.
 *  2. A device that last held a *different* account's data is cleared before
 *     reconciling, so user A's records can never be pushed into user B's row.
 *  3. A push that would wipe a non-empty cloud copy down to zero records is
 *     refused outright and surfaced to the user.
 *
 * Last-writer-wins between devices of the same user — acceptable for a
 * single-user app. There is no field-level conflict resolution.
 */

const TABLE = "user_data";
const PUSH_DEBOUNCE_MS = 2500;
const LAST_USER_KEY = "lastUserId";

export type SyncState =
  /** Cloud sync not in use (signed out, or not configured). */
  | "idle"
  /** A pull or push is in flight. */
  | "syncing"
  /** Everything on this device is in the cloud. */
  | "synced"
  /** Saved locally; no connection, so the cloud copy is behind. */
  | "offline"
  /** A sync attempt failed. Local data is intact. */
  | "error"
  /** Syncing is deliberately halted to protect data. Needs user action. */
  | "blocked";

export interface SyncInfo {
  state: SyncState;
  /** ISO timestamp of the last *successful* sync, or null if never. */
  lastSyncedAt: string | null;
  /** True when local edits exist that aren't in the cloud yet. */
  pending: boolean;
  /** Plain-language explanation for the error/blocked states. */
  detail?: string;
}

let currentUserId: string | null = null;
/** Gate for guard 1 — set only after a successful reconcile. */
let reconciled = false;
let suppressTracking = false;
let dirty = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let hooksRegistered = false;
let listenersBound = false;
/** Record count of the cloud copy as we last saw it — input to guard 3. */
let lastKnownCloudCount = 0;

let info: SyncInfo = { state: "idle", lastSyncedAt: null, pending: false };
let listeners: ((i: SyncInfo) => void)[] = [];

function emit(patch: Partial<SyncInfo>) {
  info = { ...info, ...patch };
  for (const fn of listeners) fn(info);
}

export const getSyncInfo = () => info;

export function onSyncInfo(fn: (i: SyncInfo) => void) {
  listeners.push(fn);
  fn(info);
  return () => {
    listeners = listeners.filter((f) => f !== fn);
  };
}

const isOffline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;

async function pullCloud(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { data: data.data as unknown, updatedAt: data.updated_at as string }
    : null;
}

/**
 * Push this device's dataset to the cloud, subject to guards 1 and 3.
 * Returns false when a guard refused the push.
 */
export async function pushCloud(userId: string): Promise<boolean> {
  if (!supabase) return false;

  // Guard 1: never let an unreconciled device define the cloud copy.
  if (!reconciled) {
    emit({
      state: "blocked",
      detail:
        "Your cloud data hasn't loaded yet, so changes on this device aren't being uploaded.",
    });
    return false;
  }

  if (isOffline()) {
    emit({ state: "offline", pending: true });
    return false;
  }

  emit({ state: "syncing" });
  try {
    const backup = await buildBackup();
    const outgoing = countRecords(backup.counts);

    // Guard 3: refuse to empty a cloud copy that had records. This is the
    // signature of local storage being cleared out from under us, not of a
    // user deleting everything by hand.
    if (outgoing === 0 && lastKnownCloudCount > 0) {
      emit({
        state: "blocked",
        pending: true,
        detail:
          "This device has no records but your account does. Uploading was stopped so your cloud data isn't erased — reload to pull it back down.",
      });
      return false;
    }

    const at = new Date().toISOString();
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { user_id: userId, data: backup, updated_at: at },
        { onConflict: "user_id" },
      );
    if (error) throw error;

    lastKnownCloudCount = outgoing;
    emit({ state: "synced", lastSyncedAt: at, pending: false, detail: undefined });
    return true;
  } catch (e) {
    emit({
      state: isOffline() ? "offline" : "error",
      pending: true,
      detail:
        e instanceof Error
          ? `Couldn't save to the cloud: ${e.message}`
          : "Couldn't save to the cloud.",
    });
    return false;
  }
}

/** A cloud row counts as empty only if it holds no actual records. */
function cloudIsEmpty(payload: unknown): boolean {
  const tables = (payload as { data?: Record<string, unknown[]> })?.data;
  if (!tables || typeof tables !== "object") return true;
  return !CONTENT_TABLES.some(
    (t) => Array.isArray(tables[t]) && tables[t].length > 0,
  );
}

/**
 * On login: make this device match the account. Seeds the cloud from here only
 * when the account genuinely has no records; otherwise the cloud wins.
 *
 * Throws on failure — the caller must not start auto-sync unless this resolves.
 */
export async function reconcileOnLogin(
  userId: string,
): Promise<"pushed" | "pulled"> {
  reconciled = false;
  emit({ state: "syncing", detail: undefined });

  // Guard 2: a device carrying another account's records must be cleared
  // before anything is pulled or pushed.
  const previousUser = await metaRepo.get(LAST_USER_KEY);
  if (previousUser && previousUser !== userId) {
    suppressTracking = true;
    try {
      await db.transaction("rw", CONTENT_TABLES as unknown as string[], async () => {
        for (const t of CONTENT_TABLES) await db.table(t).clear();
      });
    } finally {
      suppressTracking = false;
    }
  }

  const cloud = await pullCloud(userId);

  if (!cloud || cloudIsEmpty(cloud.data)) {
    // No cloud records yet: this device seeds the account.
    lastKnownCloudCount = 0;
    reconciled = true;
    await metaRepo.set(LAST_USER_KEY, userId);
    await pushCloud(userId);
    return "pushed";
  }

  suppressTracking = true;
  try {
    const result = await restoreBackup(cloud.data);
    // restoreBackup reports failure by return value, not by throwing. Ignoring
    // it is how a failed load used to masquerade as a successful sync.
    if (!result.ok) {
      throw new Error(result.error ?? "Your cloud data couldn't be loaded.");
    }
    lastKnownCloudCount = countRecords(result.counts ?? {});
  } finally {
    suppressTracking = false;
  }

  reconciled = true;
  await metaRepo.set(LAST_USER_KEY, userId);
  emit({
    state: "synced",
    lastSyncedAt: cloud.updatedAt,
    pending: false,
    detail: undefined,
  });
  return "pulled";
}

function schedulePush() {
  if (!currentUserId || suppressTracking) return;
  dirty = true;
  if (info.state === "synced") emit({ state: "syncing", pending: true });
  else emit({ pending: true });
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void flushPending(), PUSH_DEBOUNCE_MS);
}

/** Push now if there's anything outstanding. Safe to call at any time. */
export async function flushPending(): Promise<void> {
  if (!currentUserId || !dirty) return;
  dirty = false;
  const ok = await pushCloud(currentUserId);
  // Keep the work queued so a later retry (reconnect, next edit) picks it up.
  if (!ok) dirty = true;
}

/** Retry after an error or a block — re-reads the cloud before deciding. */
export async function retrySync(): Promise<void> {
  if (!currentUserId) return;
  try {
    await reconcileOnLogin(currentUserId);
    dirty = false;
  } catch (e) {
    emit({
      state: isOffline() ? "offline" : "error",
      detail:
        e instanceof Error
          ? `Couldn't reach your cloud data: ${e.message}`
          : "Couldn't reach your cloud data.",
    });
  }
}

function registerHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  for (const t of CONTENT_TABLES) {
    const table = db.table(t);
    table.hook("creating", () => void schedulePush());
    table.hook("updating", () => void schedulePush());
    table.hook("deleting", () => void schedulePush());
  }
}

export function startAutoSync(userId: string) {
  currentUserId = userId;
  registerHooks();
  if (typeof window === "undefined" || listenersBound) return;
  listenersBound = true;

  // Last chance to save before the tab goes away.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushPending();
  });
  window.addEventListener("beforeunload", () => void flushPending());

  window.addEventListener("offline", () => {
    if (currentUserId) emit({ state: "offline" });
  });
  window.addEventListener("online", () => {
    if (!currentUserId) return;
    // Reconnecting after a failed reconcile means retrying the pull, not
    // pushing whatever this device happens to hold.
    if (!reconciled) void retrySync();
    else void flushPending();
  });
}

/**
 * Erase every record this account has, here and in the cloud.
 *
 * Deliberately deletes the cloud row directly rather than clearing locally and
 * letting a push follow: guard 3 exists precisely to refuse a push that empties
 * the cloud, and it cannot tell an accident from this. Cloud first, so a
 * failure there leaves the local copy intact and recoverable.
 *
 * The Supabase login itself survives — removing the auth user needs admin
 * credentials that the browser must never hold. The caller should say so.
 */
export async function deleteEverything(): Promise<void> {
  if (supabase && currentUserId) {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", currentUserId);
    if (error) throw error;
  }

  suppressTracking = true;
  try {
    await db.transaction("rw", CONTENT_TABLES as unknown as string[], async () => {
      for (const t of CONTENT_TABLES) await db.table(t).clear();
    });
  } finally {
    suppressTracking = false;
  }

  lastKnownCloudCount = 0;
  dirty = false;
  if (pushTimer) clearTimeout(pushTimer);
  emit({ state: "synced", pending: false, detail: undefined });
}

export function stopAutoSync() {
  currentUserId = null;
  reconciled = false;
  dirty = false;
  lastKnownCloudCount = 0;
  if (pushTimer) clearTimeout(pushTimer);
  emit({ state: "idle", pending: false, detail: undefined });
}
