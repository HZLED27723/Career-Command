import { db } from "./db";
import { downloadJson } from "./latex";

/**
 * Full-vault backup & restore. Serialises every Dexie table — including
 * binary certificate files (Blobs → base64 data URLs) — into a single JSON
 * file the user can save anywhere and re-import to fully restore their data.
 * This is the durability safety net for a local-first app: a browser/profile
 * reset can no longer lose anything the user has exported.
 */

/**
 * Every table holding user content. The `meta` table is deliberately absent:
 * it is device bookkeeping, so it must never travel in a backup or into
 * another device via sync. Shared with lib/sync.ts so the two can't drift.
 */
export const CONTENT_TABLES = [
  "applications",
  "resumeVersions",
  "coverLetters",
  "interviewEntries",
  "certifications",
  "companies",
  "skills",
  "courses",
  "achievements",
] as const;

const TABLES = CONTENT_TABLES;

const BACKUP_APP = "careercommand-hub";
/** Bumped to 8 when the achievements table landed. Older files still restore. */
const BACKUP_VERSION = 8;

/** Sum of all record counts in a counts map. */
export const countRecords = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((a, b) => a + (b || 0), 0);

interface Backup {
  app: string;
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  data: Record<string, Record<string, unknown>[]>;
}

interface SerializedBlob {
  __blob: true;
  type: string;
  dataUrl: string;
}

const isSerializedBlob = (v: unknown): v is SerializedBlob =>
  typeof v === "object" &&
  v !== null &&
  (v as { __blob?: unknown }).__blob === true;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

const dataUrlToBlob = (dataUrl: string): Promise<Blob> =>
  fetch(dataUrl).then((r) => r.blob());

async function serializeRow(
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] =
      v instanceof Blob
        ? ({
            __blob: true,
            type: v.type,
            dataUrl: await blobToDataUrl(v),
          } satisfies SerializedBlob)
        : v;
  }
  return out;
}

async function deserializeRow(
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = isSerializedBlob(v) ? await dataUrlToBlob(v.dataUrl) : v;
  }
  return out;
}

/** Snapshot every table into a Backup object. */
export async function buildBackup(): Promise<Backup> {
  const data: Backup["data"] = {};
  const counts: Backup["counts"] = {};
  for (const table of TABLES) {
    const rows = (await db.table(table).toArray()) as Record<
      string,
      unknown
    >[];
    counts[table] = rows.length;
    data[table] = await Promise.all(rows.map(serializeRow));
  }
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts,
    data,
  };
}

/** Build a backup and trigger a download. */
export async function exportBackup(): Promise<Backup["counts"]> {
  const backup = await buildBackup();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(backup, `careercommand-backup-${stamp}`);
  return backup.counts;
}

export interface RestoreResult {
  ok: boolean;
  counts?: Record<string, number>;
  error?: string;
}

export interface BackupPreview {
  ok: boolean;
  /** Records the file would write, per table. */
  counts?: Record<string, number>;
  total?: number;
  exportedAt?: string;
  version?: number;
  error?: string;
}

/**
 * Validate a backup file and describe what restoring it would do — WITHOUT
 * touching any stored data. Every destructive path goes through this first, so
 * a malformed or truncated file can never half-erase a vault.
 */
export function inspectBackup(json: unknown): BackupPreview {
  const backup = json as Partial<Backup> | null;

  if (!backup || typeof backup !== "object" || backup.app !== BACKUP_APP) {
    return { ok: false, error: "That file isn't a CareerCommand backup." };
  }
  if (!backup.data || typeof backup.data !== "object") {
    return {
      ok: false,
      error: "That backup is missing its data — the file looks incomplete.",
    };
  }
  if (typeof backup.version === "number" && backup.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `That backup was made by a newer version of CareerCommand (v${backup.version}). Update the app before restoring it.`,
    };
  }

  // Count from the payload itself rather than trusting the file's own
  // `counts` header, which a truncated file can overstate.
  const counts: Record<string, number> = {};
  let sawTable = false;
  for (const table of TABLES) {
    const rows = backup.data[table];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) {
      return {
        ok: false,
        error: `That backup's "${table}" section is damaged, so it can't be restored safely.`,
      };
    }
    sawTable = true;
    counts[table] = rows.length;
  }
  if (!sawTable) {
    return {
      ok: false,
      error: "That backup contains no recognisable records.",
    };
  }

  return {
    ok: true,
    counts,
    total: countRecords(counts),
    exportedAt: typeof backup.exportedAt === "string" ? backup.exportedAt : undefined,
    version: typeof backup.version === "number" ? backup.version : undefined,
  };
}

/**
 * Replace all local data with a backup file's contents. Ids are preserved so
 * cross-references (resume/cover-letter links) stay intact.
 *
 * Validation runs before anything is cleared, and the clear+write happens in a
 * single transaction, so a failure leaves the existing data untouched.
 */
export async function restoreBackup(json: unknown): Promise<RestoreResult> {
  const preview = inspectBackup(json);
  if (!preview.ok) return { ok: false, error: preview.error };
  const backup = json as Partial<Backup>;

  try {
    // Decode everything (incl. base64 → Blob via fetch) BEFORE the
    // transaction. IndexedDB transactions auto-close on any non-IDB await,
    // so the transaction body below must contain only IDB operations.
    const prepared: Record<string, Record<string, unknown>[]> = {};
    for (const table of TABLES) {
      const rows = backup.data?.[table];
      if (!Array.isArray(rows)) continue;
      prepared[table] = await Promise.all(rows.map(deserializeRow));
    }

    const counts: Record<string, number> = {};
    await db.transaction("rw", TABLES as unknown as string[], async () => {
      for (const table of TABLES) {
        const rows = prepared[table];
        if (!rows) continue;
        await db.table(table).clear();
        if (rows.length) await db.table(table).bulkAdd(rows);
        counts[table] = rows.length;
      }
    });
    return { ok: true, counts };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Restore failed.",
    };
  }
}

export const summariseCounts = (counts: Record<string, number>) =>
  [
    [counts.applications ?? 0, "application"],
    [counts.certifications ?? 0, "certification"],
    [counts.interviewEntries ?? 0, "question"],
    [counts.resumeVersions ?? 0, "resume"],
    [counts.skills ?? 0, "skill"],
    [counts.courses ?? 0, "course"],
    [counts.companies ?? 0, "company"],
    [counts.achievements ?? 0, "example"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, label]) => `${n} ${label}${(n as number) === 1 ? "" : "s"}`)
    .join(" · ") || "no records";
