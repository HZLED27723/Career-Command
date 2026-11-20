"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  flushPending,
  onSyncInfo,
  retrySync,
  stopAutoSync,
  type SyncInfo,
} from "@/lib/sync";

/**
 * Sidebar-footer account row: signed-in email, real sync state, sign out.
 * Renders nothing when cloud sync isn't configured (local-only mode).
 *
 * The label reflects what actually happened to the data — it is never a
 * restatement of "you are logged in".
 */
export function AccountControl() {
  const [email, setEmail] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncInfo>({
    state: "idle",
    lastSyncedAt: null,
    pending: false,
  });
  const [signingOut, setSigningOut] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setEmail(s?.user?.email ?? null),
    );
    const off = onSyncInfo(setSync);
    // Keep "3 min ago" honest without a per-frame timer.
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      sub.subscription.unsubscribe();
      off();
      clearInterval(tick);
    };
  }, []);

  if (!supabase || !email) return null;

  /** Save anything outstanding before the session goes away. */
  const signOut = async () => {
    setSigningOut(true);
    try {
      await flushPending();
    } finally {
      stopAutoSync();
      await supabase!.auth.signOut();
    }
  };

  const { dot, label, tone } = describe(sync, now);
  const needsAction = sync.state === "error" || sync.state === "blocked";

  return (
    <div
      className={`rounded-sm border bg-panel/60 px-2 py-1.5 max-md:px-1 ${
        needsAction ? "border-warn/40" : "border-edge"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
        <span
          className="min-w-0 flex-1 truncate text-[11px] text-ink-muted max-md:hidden"
          title={email}
        >
          {email}
        </span>
        <button
          onClick={signOut}
          disabled={signingOut}
          title={
            sync.pending
              ? "Saves your pending changes, then signs out"
              : "Sign out"
          }
          className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-ink-faint transition-colors hover:text-danger disabled:opacity-50 max-md:hidden"
        >
          {signingOut ? "Saving…" : "Sign out"}
        </button>
      </div>

      <p
        className={`mt-0.5 font-mono text-[10px] uppercase tracking-widest max-md:hidden ${tone}`}
        title={sync.detail}
      >
        {label}
      </p>

      {/* Status is conveyed in words, not only by the dot's colour. */}
      {needsAction && (
        <div className="mt-1 max-md:hidden">
          <p className="text-[10px] leading-snug text-ink-muted">
            {sync.detail ??
              "Your changes are saved on this device but aren't reaching the cloud."}
          </p>
          <button
            onClick={() => void retrySync()}
            className="mt-1 rounded-sm border border-edge-strong px-2 py-0.5 text-[10px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function describe(sync: SyncInfo, now: number) {
  switch (sync.state) {
    case "syncing":
      return {
        dot: "bg-warn animate-pulse-soft",
        label: "Saving…",
        tone: "text-ink-faint",
      };
    case "synced":
      return {
        dot: "bg-accent",
        label: `Saved ${relative(sync.lastSyncedAt, now)}`,
        tone: "text-ink-faint",
      };
    case "offline":
      return {
        dot: "bg-warn",
        label: "Offline — saved on this device",
        tone: "text-warn",
      };
    case "blocked":
      return {
        dot: "bg-warn",
        label: "Upload paused",
        tone: "text-warn",
      };
    case "error":
      return { dot: "bg-danger", label: "Sync failed", tone: "text-danger" };
    default:
      return {
        dot: "bg-ink-faint",
        label: "Not syncing",
        tone: "text-ink-faint",
      };
  }
}

function relative(iso: string | null, now: number): string {
  if (!iso) return "locally";
  const diff = now - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return `${Math.floor(diff / 86_400_000)} d ago`;
}
