"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { pdfThumbnail, peekThumbnail, type PdfThumbnail } from "@/lib/pdf";
import { DocumentUpload, isPdfFile } from "./DocumentUpload";

/**
 * One document on the Vault shelf (§7.17). Two independent actions: the cover
 * and title open Quick Look; Download original hands back the stored upload
 * immediately. Routine file controls live under File info.
 */

export interface StoredFile {
  blob: Blob;
  name: string;
  type: string;
}

export type ShelfTrack = "eng" | "retail" | "letter";

export type ShelfContent =
  | { kind: "file"; file: StoredFile }
  | { kind: "template"; preview: ReactNode }
  | { kind: "empty" };

const TRACK_STYLE: Record<ShelfTrack, { backing: string; ink: string }> = {
  eng: { backing: "bg-cover-eng", ink: "text-cover-eng-ink" },
  retail: { backing: "bg-cover-retail", ink: "text-cover-retail-ink" },
  letter: { backing: "bg-cover-letter", ink: "text-cover-letter-ink" },
};

/**
 * "14 Sep 2026" — a date you can actually place, not "1m ago". Built by hand
 * rather than via toLocaleDateString: every en-* locale except en-US now
 * abbreviates September to "Sept", and en-US reorders the parts.
 */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const wordExt = (name: string) => (/\.docx$/i.test(name) ? ".docx" : ".doc");

/** Page one of a stored PDF; null while rendering, "error" if it can't be. */
function usePdfThumbnail(blob: Blob | null, slot: string) {
  // Start from an already-rendered cover when there is one, so a revisit
  // paints it on the first frame instead of flashing the placeholder.
  const [thumb, setThumb] = useState<PdfThumbnail | "error" | null>(() =>
    blob ? peekThumbnail(blob) : null,
  );
  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    const known = peekThumbnail(blob);
    setThumb(known);
    if (known) return;
    pdfThumbnail(blob, 300, slot)
      .then((t) => !cancelled && setThumb(t))
      .catch(() => !cancelled && setThumb("error"));
    return () => {
      cancelled = true;
    };
  }, [blob, slot]);
  return blob ? thumb : null;
}

export function ShelfCard({
  slot,
  kindLabel,
  track,
  trackLabel,
  title,
  placeholderTitle,
  blurb,
  defaultBlurb,
  content,
  updatedAt,
  lastUsed,
  openRef,
  onOpen,
  onDownloadOriginal,
  onRename,
  onReblurb,
  onReplace,
  onRemove,
}: {
  /** Vault slot id — names this card's saved cover in the device cache. */
  slot: string;
  kindLabel: string;
  track: ShelfTrack;
  trackLabel: string;
  /** The stored custom title ("" when unnamed). */
  title: string;
  placeholderTitle: string;
  blurb: string;
  defaultBlurb: string;
  content: ShelfContent;
  updatedAt: string | null;
  /** Only when the Tracker recorded this slot being attached. */
  lastUsed: { company: string; at: string } | null;
  /** The open control — focus returns here when Quick Look closes. */
  openRef: (el: HTMLButtonElement | null) => void;
  onOpen: () => void;
  onDownloadOriginal: () => void;
  onRename: (value: string) => void;
  onReblurb: (value: string) => void;
  onReplace: (file: File) => void | Promise<void>;
  onRemove: () => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const infoId = useId();
  const file = content.kind === "file" ? content.file : null;
  const isPdf = file ? isPdfFile(file.type, file.name) : false;
  const thumb = usePdfThumbnail(isPdf ? file!.blob : null, slot);
  const style = content.kind === "empty" ? null : TRACK_STYLE[track];
  const shownTitle = title || placeholderTitle;

  const format = !file
    ? content.kind === "template"
      ? "Built-in template"
      : "Nothing stored yet"
    : isPdf
      ? `PDF${thumb && thumb !== "error" ? ` · ${thumb.pages} page${thumb.pages === 1 ? "" : "s"}` : ""} · ${fileSize(file.blob.size)}`
      : `Word ${wordExt(file.name)} · ${fileSize(file.blob.size)}`;

  return (
    <article className="group/card flex flex-col overflow-hidden rounded-lg border border-edge bg-panel transition-colors hover:border-edge-strong max-sm:flex-row lg:h-full">
      {/* ── Cover ──────────────────────────────────────────────────── */}
      {content.kind === "empty" ? (
        <div className="grid aspect-[4/3] shrink-0 place-items-center bg-cover-neutral max-sm:aspect-auto max-sm:w-24 max-sm:py-3 lg:aspect-auto lg:min-h-56 lg:flex-1 lg:[contain:size]">
          <div className="grid aspect-[1/1.414] w-[42%] place-items-center rounded-xs border border-dashed border-edge-strong max-sm:w-14">
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
              Empty
            </span>
          </div>
        </div>
      ) : (
        <button
          ref={openRef}
          onClick={onOpen}
          aria-label={`Open ${shownTitle} in Quick Look`}
          className={`relative grid aspect-[4/3] shrink-0 place-items-center overflow-hidden ${style!.backing} max-sm:aspect-auto max-sm:w-24 max-sm:py-3 lg:aspect-auto lg:min-h-56 lg:flex-1 lg:[contain:size]`}
        >
          <Cover content={content} thumb={thumb} />
        </button>
      )}

      {/* ── Details ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col p-4 max-sm:p-3 lg:flex-none">
        <p
          className={`font-mono text-[10px] uppercase tracking-widest ${style?.ink ?? "text-ink-faint"}`}
        >
          {trackLabel}
          {kindLabel !== trackLabel && (
            <span className="text-ink-faint"> · {kindLabel}</span>
          )}
        </p>
        <h3 className="mt-1 text-sm leading-snug font-semibold">
          {content.kind === "empty" ? (
            <span className="break-words">{shownTitle}</span>
          ) : (
            <button
              onClick={onOpen}
              className="text-left break-words transition-colors hover:text-accent-strong"
            >
              {shownTitle}
            </button>
          )}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-muted">
          {blurb || defaultBlurb}
        </p>

        <dl className="mt-2.5 space-y-0.5 font-mono text-[10px] text-ink-faint">
          <div>
            <dt className="sr-only">Format</dt>
            <dd>{format}</dd>
          </div>
          {updatedAt && (
            <div>
              <dt className="sr-only">Last updated</dt>
              <dd>Updated {formatDate(updatedAt)}</dd>
            </div>
          )}
          {lastUsed && (
            <div>
              <dt className="sr-only">Last used</dt>
              <dd className="truncate">
                Last used for {lastUsed.company} · {formatDate(lastUsed.at)}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {content.kind === "file" ? (
            <button
              onClick={onDownloadOriginal}
              className="flex min-h-9 items-center rounded-sm bg-accent px-3 text-xs font-semibold text-bg transition-colors hover:bg-accent-strong"
            >
              ↓ Download original
            </button>
          ) : content.kind === "template" ? (
            <button
              onClick={onOpen}
              className="flex min-h-9 items-center rounded-sm border border-accent-dim bg-accent-dim px-3 text-xs font-semibold text-accent-strong transition-colors hover:border-accent hover:bg-accent hover:text-bg"
            >
              Use template
            </button>
          ) : (
            <DocumentUpload docId={kindLabel} onFile={onReplace} label="Import file" />
          )}
          <button
            onClick={() => setInfoOpen((o) => !o)}
            aria-expanded={infoOpen}
            aria-controls={infoId}
            className="flex min-h-9 items-center gap-1 rounded-sm px-2 font-mono text-[11px] text-ink-muted transition-colors hover:text-ink"
          >
            File info
            <span
              aria-hidden
              className={`transition-transform ${infoOpen ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </button>
        </div>

        {infoOpen && (
          <div
            id={infoId}
            className="mt-3 animate-fade-in space-y-3 border-t border-edge pt-3"
          >
            <InlineField
              label="Title"
              value={title}
              placeholder={placeholderTitle}
              onCommit={onRename}
            />
            <InlineField
              label="Caption"
              value={blurb}
              placeholder={defaultBlurb}
              onCommit={onReblurb}
            />
            {file ? (
              <>
                <p className="font-mono text-[10px] break-all text-ink-faint">
                  Stored file: {file.name}
                  <br />
                  Kept byte-for-byte as uploaded.
                </p>
                <div className="flex flex-wrap gap-2">
                  <DocumentUpload
                    docId={kindLabel}
                    onFile={onReplace}
                    label="Replace file"
                    quiet
                  />
                  <button
                    onClick={onRemove}
                    className="min-h-9 rounded-sm border border-edge-strong px-3 font-mono text-[11px] text-ink-muted transition-colors hover:border-danger hover:text-danger"
                  >
                    Remove file
                  </button>
                </div>
              </>
            ) : content.kind === "template" ? (
              <div className="space-y-2">
                <p className="text-[11px] leading-relaxed text-ink-faint">
                  The built-in template. Open it with Use template to export a
                  PDF or Word copy, or store your own file in its place.
                </p>
                <DocumentUpload
                  docId={kindLabel}
                  onFile={onReplace}
                  label="Store a file instead"
                  quiet
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

/** The paper on its backing: the real first page, tilted slightly. */
function Cover({
  content,
  thumb,
}: {
  content: Exclude<ShelfContent, { kind: "empty" }>;
  thumb: PdfThumbnail | "error" | null;
}) {
  const landscape = thumb && thumb !== "error" && thumb.aspect > 1;
  return (
    <div
      className={`relative overflow-hidden rounded-xs bg-white shadow-[0_14px_30px_-12px_rgba(0,0,0,0.85)] ring-1 ring-black/30 transition-transform duration-300 -rotate-2 group-hover/card:-translate-y-1 group-hover/card:-rotate-3 ${
        landscape ? "w-[66%] max-sm:w-[76px] lg:w-[78%]" : "w-[46%] max-sm:w-14 lg:h-[80%] lg:w-auto"
      }`}
      style={{
        aspectRatio:
          thumb && thumb !== "error" ? `${thumb.aspect}` : "1 / 1.414",
      }}
    >
      {content.kind === "template" ? (
        <TemplateThumb>{content.preview}</TemplateThumb>
      ) : !isPdfFile(content.file.type, content.file.name) ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 bg-paper p-2 text-paper-ink">
          <span className="grid size-6 place-items-center rounded-[2px] bg-[#2b579a] text-[11px] font-bold text-white max-sm:size-5">
            W
          </span>
          <span className="font-mono text-[8px] uppercase opacity-60">
            {wordExt(content.file.name)}
          </span>
        </div>
      ) : thumb === null ? (
        <div className="h-full animate-pulse-soft bg-paper" />
      ) : thumb === "error" ? (
        <div className="grid h-full place-items-center bg-paper p-2 text-center font-mono text-[8px] text-paper-ink/60">
          Preview unavailable
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a data URL rendered on the client
        <img src={thumb.src} alt="" className="h-full w-full object-cover" />
      )}
    </div>
  );
}

/** The live template, scaled down from its 620px page width to fit the cover. */
function TemplateThumb({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 620));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} aria-hidden inert className="pointer-events-none h-full w-full overflow-hidden select-none">
      {scale > 0 && (
        <div style={{ width: 620, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** A labelled text field that commits on blur/Enter and reverts on Escape. */
function InlineField({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label}
      </label>
      <input
        id={id}
        key={value}
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.stopPropagation();
            e.currentTarget.value = value;
            e.currentTarget.blur();
          }
        }}
        className="mt-1 min-h-9 w-full rounded-sm border border-edge bg-bg px-2.5 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-accent-dim"
      />
    </div>
  );
}
