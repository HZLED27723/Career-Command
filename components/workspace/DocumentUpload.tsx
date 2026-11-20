"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vault import. The vault stores documents rather than editing them, so this
 * keeps the file exactly as supplied — no parsing, nothing lost. PDF and Word
 * only; those are the formats employers actually ask for.
 */

export const ACCEPT =
  ".pdf,.doc,.docx,application/pdf," +
  "application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Everything lands in one synced row, so keep stored files sane. */
const MAX_BYTES = 8 * 1024 * 1024;

export const isWordFile = (type?: string, name?: string) =>
  type === "application/msword" ||
  type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  /\.docx?$/i.test(name ?? "");

export const isPdfFile = (type?: string, name?: string) =>
  type === "application/pdf" || /\.pdf$/i.test(name ?? "");

/** Why a file can't be stored, or null if it can. */
export function validateDocument(file: File): string | null {
  if (!isPdfFile(file.type, file.name) && !isWordFile(file.type, file.name))
    return "Only PDF and Word files can be stored here.";
  if (file.size > MAX_BYTES)
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Keep stored documents under 8 MB so they sync reliably.`;
  return null;
}

export function DocumentUpload({
  docId,
  onFile,
  label = "Import",
  quiet,
}: {
  /** Resets any open message when the user switches documents. */
  docId: string;
  onFile: (file: File) => void | Promise<void>;
  label?: string;
  /** Secondary styling, for use inside a card's File info panel. */
  quiet?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [docId]);

  const handle = (file: File) => {
    const problem = validateDocument(file);
    setError(problem);
    if (!problem) void onFile(file);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handle(file);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        title="Store a PDF or Word document in the vault"
        className={
          quiet
            ? "flex min-h-9 items-center gap-1.5 rounded-sm border border-edge-strong px-3 font-mono text-[11px] text-ink-muted transition-colors hover:border-accent hover:text-ink"
            : "flex min-h-9 items-center gap-1.5 rounded-sm border border-accent-dim bg-accent-dim px-3 text-xs font-semibold text-accent-strong transition-colors hover:border-accent hover:bg-accent hover:text-bg"
        }
      >
        <UploadIcon />
        {label}
      </button>

      {error && (
        <div className="animate-fade-in absolute top-full right-0 z-20 mt-2 w-72 rounded-md border border-edge-strong bg-raised p-3 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]">
          <p className="text-xs font-medium text-danger">Import failed</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            {error}
          </p>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setError(null)}
              className="rounded-sm px-2.5 py-1 text-[11px] text-ink-muted transition-colors hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5 fill-none stroke-current stroke-2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15V4M8 8l4-4 4 4M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
    </svg>
  );
}
