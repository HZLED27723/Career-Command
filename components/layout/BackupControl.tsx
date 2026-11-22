"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildBackup,
  exportBackup,
  inspectBackup,
  restoreBackup,
  summariseCounts,
  countRecords,
  type BackupPreview,
  type RestoreResult,
} from "@/lib/backup";
import { downloadJson } from "@/lib/latex";
import { metaRepo } from "@/lib/db";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import Link from "next/link";
import { deleteAccount, deleteEverything, stopAutoSync } from "@/lib/sync";

type Pending = { fileName: string; json: unknown; preview: BackupPreview };

const LAST_BACKUP_KEY = "lastBackupAt";
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return `${Math.floor(diff / 86_400_000)} d ago`;
}

const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "unknown date";

export function BackupControl() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  /** What this device held immediately before a restore, for the preview. */
  const [currentTotal, setCurrentTotal] = useState<number | null>(null);
  /** Deletion is gated behind typing the word, not just a second click. */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Read the last-backup timestamp on mount and whenever the panel opens.
  useEffect(() => {
    void metaRepo.get(LAST_BACKUP_KEY).then(setLastBackup);
  }, [open]);

  // useMemo keeps the impure Date.now() out of render.
  const isStale = useMemo(
    () => !lastBackup || Date.now() - new Date(lastBackup).getTime() > STALE_MS,
    [lastBackup],
  );

  const close = useCallback(() => {
    setOpen(false);
    setMessage(null);
    setPending(null);
    setError(null);
    setDeleteOpen(false);
    setDeleteConfirm("");
  }, []);

  /**
   * Wipe everything, cloud copy included. Exports a copy first so an
   * irreversible action still leaves the user holding their data.
   */
  const doDelete = async () => {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") return;
    setBusy(true);
    setError(null);
    try {
      const finalCopy = await buildBackup();
      downloadJson(
        finalCopy,
        `careercommand-final-export-${new Date().toISOString().slice(0, 10)}`,
      );
      await deleteEverything();
      stopAutoSync();
      if (!supabase) {
        window.location.reload();
        return;
      }
      // Records are gone; now the login itself (§7.31).
      if (await deleteAccount()) {
        // The user no longer exists server-side, so only the local session
        // needs clearing.
        await supabase.auth.signOut({ scope: "local" });
        return;
      }
      setMessage(
        `Your data has been deleted. Your login couldn't be removed automatically — use the contact address in the privacy policy (/privacy) and it will be.`,
      );
      setDeleteOpen(false);
      setBusy(false);
      setTimeout(() => void supabase!.auth.signOut(), 6000);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Couldn't delete everything: ${e.message}. Nothing was removed.`
          : "Couldn't delete everything. Nothing was removed.",
      );
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const doExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const counts = await exportBackup();
      const nowIso = new Date().toISOString();
      await metaRepo.set(LAST_BACKUP_KEY, nowIso);
      setLastBackup(nowIso);
      setMessage(`Backed up ${summariseCounts(counts)}.`);
    } catch {
      setError("Export failed — try again.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Validate and describe the file BEFORE anything is replaced. A file that
   * can't be read never reaches the restore path.
   */
  const onFile = async (file: File) => {
    setError(null);
    setMessage(null);
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setError("Couldn't read that file — it isn't valid JSON.");
      return;
    }
    const preview = inspectBackup(json);
    if (!preview.ok) {
      setError(preview.error ?? "That file isn't a usable backup.");
      return;
    }
    const current = await buildBackup();
    setCurrentTotal(countRecords(current.counts));
    setPending({ fileName: file.name, json, preview });
  };

  /**
   * Restore, but download a recovery copy of what's here first. The restore
   * itself is a single transaction, so a failure leaves current data intact.
   */
  const confirmRestore = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const recovery = await buildBackup();
      downloadJson(
        recovery,
        `careercommand-before-restore-${new Date().toISOString().slice(0, 10)}`,
      );
    } catch {
      // A recovery copy is a safety net, not a gate — the restore below is
      // transactional either way.
    }
    const result: RestoreResult = await restoreBackup(pending.json);
    setBusy(false);
    setPending(null);
    if (result.ok && result.counts) {
      setMessage(`Restored ${summariseCounts(result.counts)}. Reloading…`);
      setTimeout(() => window.location.reload(), 900);
    } else {
      setError(
        `${result.error ?? "Restore failed."} Your existing data was left unchanged.`,
      );
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-2 rounded-sm px-1 py-1 text-left font-mono text-[10px] uppercase tracking-widest transition-colors hover:text-accent max-md:min-h-11 max-md:justify-center ${
          isStale ? "text-warn" : "text-ink-faint"
        }`}
        title={
          isStale
            ? "No recent backup — export your data to stay safe"
            : `Last backup ${relativeTime(lastBackup)}`
        }
      >
        <span className="relative">
          <ShieldIcon />
          {isStale && (
            <span className="absolute -right-0.5 -top-0.5 size-1.5 animate-pulse-soft rounded-full bg-warn" />
          )}
        </span>
        <span className="max-md:hidden">Data &amp; backup</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6"
          onClick={close}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <div
            className="max-h-[90dvh] w-full max-w-md animate-fade-in overflow-y-auto rounded-lg border border-edge-strong bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-accent">
                <ShieldIcon />
              </span>
              <p className="text-sm font-semibold">Data &amp; backup</p>
            </div>

            {/* Where the data actually lives — must match how the app behaves. */}
            {isSupabaseConfigured ? (
              <p className="mb-3 text-xs leading-relaxed text-ink-muted">
                Your work is saved on this device first, then copied to your
                account so your other devices stay in step.{" "}
                <span className="text-ink">
                  That copy mirrors your data — it doesn&apos;t archive it.
                </span>{" "}
                If something gets deleted, it disappears everywhere. An exported
                backup is a separate snapshot in time, which is what makes it
                worth keeping.
              </p>
            ) : (
              <p className="mb-3 text-xs leading-relaxed text-ink-muted">
                Cloud sync isn&apos;t set up, so everything you enter lives only
                in this browser. Export a backup to keep it safe — clearing site
                data would otherwise remove it for good.
              </p>
            )}

            <div
              className={`mb-4 flex items-center gap-2 rounded-sm border px-3 py-2 text-[11px] ${
                isStale
                  ? "border-warn/30 bg-warn/5 text-warn"
                  : "border-accent-dim bg-raised text-accent-strong"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${isStale ? "bg-warn" : "bg-accent"}`}
              />
              <span>
                Last backup:{" "}
                <span className="font-mono">{relativeTime(lastBackup)}</span>
                {isStale && lastBackup && " — time for a fresh one"}
                {!lastBackup && " — export one now to stay protected"}
              </span>
            </div>

            {/* Export */}
            <div className="rounded-md border border-edge bg-panel p-3">
              <p className="text-xs font-medium">Export a backup</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                Downloads one file with all your data, including uploaded
                certificate files.
              </p>
              <button
                onClick={doExport}
                disabled={busy}
                className="mt-2.5 w-full rounded-sm bg-accent-dim py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:opacity-50"
              >
                ↓ Export all data
              </button>
            </div>

            {/* Restore */}
            <div className="mt-3 rounded-md border border-edge bg-panel p-3">
              <p className="text-xs font-medium">Restore from a backup</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                Replaces what&apos;s on this device with the file&apos;s
                contents — it doesn&apos;t merge the two.
                {isSupabaseConfigured &&
                  " Because your account mirrors this device, the restored data then replaces your cloud copy too."}{" "}
                You&apos;ll see exactly what changes before anything happens.
              </p>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="mt-2.5 w-full rounded-sm border border-edge-strong py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
              >
                ↑ Choose backup file
              </button>
            </div>

            {/* Delete everything */}
            <div className="mt-3 rounded-md border border-edge bg-panel p-3">
              <p className="text-xs font-medium">Delete all your data</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                Permanently removes every record
                {isSupabaseConfigured
                  ? " from this device and from your account, then deletes your login"
                  : " from this browser"}
                . A final export downloads first so you keep a copy. This
                can&apos;t be undone.
              </p>

              {!deleteOpen ? (
                <button
                  onClick={() => setDeleteOpen(true)}
                  disabled={busy}
                  className="mt-2.5 w-full rounded-sm border border-edge-strong py-2 text-xs font-medium text-ink-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
                >
                  Delete everything…
                </button>
              ) : (
                <div className="mt-2.5">
                  <label
                    htmlFor="delete-confirm"
                    className="block text-[11px] text-ink-muted"
                  >
                    Type <span className="font-mono text-danger">DELETE</span>{" "}
                    to confirm
                  </label>
                  <input
                    id="delete-confirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    autoComplete="off"
                    className="mt-1 w-full rounded-sm border border-edge bg-bg px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-danger"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={doDelete}
                      disabled={
                        busy || deleteConfirm.trim().toUpperCase() !== "DELETE"
                      }
                      className="flex-1 rounded-sm bg-danger py-1.5 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {busy ? "Deleting…" : "Delete everything"}
                    </button>
                    <button
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeleteConfirm("");
                      }}
                      className="rounded-sm px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                  {isSupabaseConfigured && (
                    <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
                      Your email address and login are removed too, so signing
                      in again would start a brand-new, empty account.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Feedback */}
            {message && (
              <p className="mt-3 rounded-sm border border-accent-dim bg-raised px-3 py-2 text-[11px] text-accent-strong">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-3 rounded-sm border border-edge bg-raised px-3 py-2 text-[11px] leading-relaxed text-danger">
                {error}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[10px] text-ink-faint">
                <Link href="/privacy" className="transition-colors hover:text-ink">
                  Privacy policy
                </Link>
                {" · "}
                <Link href="/terms" className="transition-colors hover:text-ink">
                  Terms
                </Link>
              </p>
              <button
                onClick={close}
                className="rounded-sm px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore confirmation — shows the actual before/after */}
      {pending && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-6"
          onClick={() => setPending(null)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-sm animate-fade-in overflow-y-auto rounded-lg border border-edge-strong bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-warn">Replace your data?</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              <span className="font-mono text-ink">{pending.fileName}</span> was
              exported {shortDate(pending.preview.exportedAt)}.
            </p>

            <div className="mt-3 rounded-sm border border-edge bg-panel p-2.5 text-[11px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-faint">On this device now</span>
                <span className="font-mono text-ink">
                  {currentTotal ?? "?"} record
                  {currentTotal === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-ink-faint">After restoring</span>
                <span className="font-mono text-accent-strong">
                  {pending.preview.total} record
                  {pending.preview.total === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 border-t border-edge pt-2 text-ink-muted">
                {summariseCounts(pending.preview.counts ?? {})}
              </p>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              A copy of your current data will download first, so you can undo
              this by restoring that file.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                className="rounded-sm px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                disabled={busy}
                className="rounded-sm bg-accent-dim px-3 py-1.5 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:opacity-50"
              >
                {busy ? "Restoring…" : "Replace & restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5 shrink-0 fill-none stroke-current stroke-[1.6]"
    >
      <path
        d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
