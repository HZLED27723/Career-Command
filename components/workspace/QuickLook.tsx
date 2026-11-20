"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { openPdf, pageParagraphs } from "@/lib/pdf";

/**
 * Quick Look — the Vault's reader (§7.17). One page at a time, rendered in the
 * app (no browser PDF embed), fitted whole into whatever space is left after
 * the header. Opens at page one; Escape or Back to Vault closes it.
 */

export type QuickLookSource =
  | { kind: "pdf"; blob: Blob; fileName: string }
  | { kind: "word"; blob: Blob; fileName: string }
  | { kind: "image"; blob: Blob; fileName: string }
  | { kind: "template"; render: ReactNode };

type Mode = "fit" | "text";

export function QuickLook({
  title,
  trackLabel,
  source,
  onClose,
  onDownloadOriginal,
  templateActions,
}: {
  title: string;
  trackLabel: string;
  source: QuickLookSource;
  onClose: () => void;
  /** Present when there's a stored upload to hand back byte-for-byte. */
  onDownloadOriginal?: () => void;
  /** Export controls for a built-in template (print to PDF, Word). */
  templateActions?: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("fit");
  const [page, setPage] = useState(1);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState(false);

  const blob = source.kind === "pdf" ? source.blob : null;

  // Take focus so arrow keys and Escape work straight away.
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    setDoc(null);
    setLoadError(false);
    setPage(1);
    openPdf(blob)
      .then((d) => !cancelled && setDoc(d))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [blob]);

  const pages = doc?.numPages ?? 0;
  const paged = source.kind === "pdf" && pages > 0;
  const go = (delta: number) =>
    setPage((p) => Math.min(Math.max(p + delta, 1), Math.max(pages, 1)));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select")) return;
    if (paged && (e.key === "ArrowRight" || e.key === "PageDown")) {
      e.preventDefault();
      go(1);
    } else if (paged && (e.key === "ArrowLeft" || e.key === "PageUp")) {
      e.preventDefault();
      go(-1);
    }
  };

  const fileName = source.kind === "template" ? null : source.fileName;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      role="region"
      aria-label={`Quick Look: ${title}`}
      className="flex h-full flex-col bg-bg outline-none"
    >
      {/* ── Controls, all in one place ───────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-edge bg-surface px-4 py-2.5">
        <button
          onClick={onClose}
          className="flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-xs font-medium text-ink-muted transition-colors hover:bg-panel hover:text-ink"
        >
          <span aria-hidden>←</span> Back to Vault
        </button>

        <div className="min-w-0 flex-1 max-sm:basis-[calc(100%-9rem)]">
          <p className="truncate text-sm font-semibold" title={title}>
            {title}
          </p>
          <p className="truncate font-mono text-[10px] text-ink-faint">
            {trackLabel}
            {fileName && ` · ${fileName}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
          {source.kind === "pdf" && (
            <div
              role="group"
              aria-label="View"
              className="flex rounded-sm border border-edge-strong p-0.5"
            >
              <ModeButton active={mode === "fit"} onClick={() => setMode("fit")}>
                Fit page
              </ModeButton>
              <ModeButton active={mode === "text"} onClick={() => setMode("text")}>
                Read text
              </ModeButton>
            </div>
          )}

          {source.kind === "pdf" && (
            <div className="flex items-center gap-1">
              <PageArrow
                label="Previous page"
                disabled={!paged || page <= 1}
                onClick={() => go(-1)}
              >
                ‹
              </PageArrow>
              <span
                aria-live="polite"
                className="min-w-14 text-center font-mono text-[11px] tabular-nums text-ink-muted"
              >
                {paged ? `${page} / ${pages}` : "–"}
              </span>
              <PageArrow
                label="Next page"
                disabled={!paged || page >= pages}
                onClick={() => go(1)}
              >
                ›
              </PageArrow>
            </div>
          )}

          {templateActions}

          {onDownloadOriginal && (
            <button
              onClick={onDownloadOriginal}
              className="flex min-h-9 items-center rounded-sm bg-accent px-3 text-xs font-semibold text-bg transition-colors hover:bg-accent-strong max-sm:ml-auto"
            >
              ↓ Download original
            </button>
          )}
        </div>
      </div>

      {/* ── The page ─────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        {source.kind === "pdf" ? (
          loadError ? (
            <Notice
              title="This PDF couldn't be displayed"
              body="The file may be damaged or password-protected. The original is untouched and still downloads exactly as you stored it."
              onDownloadOriginal={onDownloadOriginal}
            />
          ) : !doc ? (
            <p className="grid h-full place-items-center font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Opening…
            </p>
          ) : mode === "fit" ? (
            <FitPage doc={doc} pageNumber={page} label={`${title}, page ${page} of ${pages}`} onDownloadOriginal={onDownloadOriginal} />
          ) : (
            <PageText
              doc={doc}
              pageNumber={page}
              onFitPage={() => setMode("fit")}
              onDownloadOriginal={onDownloadOriginal}
            />
          )
        ) : source.kind === "image" ? (
          <FitImage blob={source.blob} label={title} />
        ) : source.kind === "word" ? (
          <Notice
            title="Word files can't be previewed here"
            body={`${source.fileName} · ${Math.max(1, Math.round(source.blob.size / 1024))} KB · stored exactly as you uploaded it. Download the original to open it in Word.`}
            onDownloadOriginal={onDownloadOriginal}
          />
        ) : (
          <div className="absolute inset-0 overflow-auto p-4 sm:p-6">
            <div
              id="print-area"
              className="mx-auto min-h-[730px] w-full max-w-[620px] overflow-hidden rounded-xs bg-white shadow-[0_24px_48px_-16px_rgba(0,0,0,0.9)] ring-1 ring-black/40"
            >
              {source.render}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-8 rounded-[3px] px-2.5 font-mono text-[11px] transition-colors ${
        active
          ? "bg-raised text-accent-strong"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function PageArrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-sm border border-edge-strong text-base text-ink-muted transition-colors hover:border-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-edge-strong"
    >
      {children}
    </button>
  );
}

function Notice({
  title,
  body,
  onDownloadOriginal,
  children,
}: {
  title: string;
  body: string;
  onDownloadOriginal?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="grid h-full place-items-center overflow-auto p-6">
      <div className="max-w-sm rounded-md border border-edge bg-surface p-6 text-center">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">{body}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {children}
          {onDownloadOriginal && (
            <button
              onClick={onDownloadOriginal}
              className="min-h-9 rounded-sm bg-accent px-3 text-xs font-semibold text-bg transition-colors hover:bg-accent-strong"
            >
              ↓ Download original
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Content-box size of an element, kept current through resize and rotation. */
function useBoxSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev &&
        Math.abs(prev.w - width) < 1 &&
        Math.abs(prev.h - height) < 1
          ? prev
          : { w: width, h: height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/**
 * The whole sheet, scaled by the smaller of width-fit and height-fit. Rendered
 * at device-pixel resolution and shown at CSS size. A render that's been
 * overtaken (page turned, window resized) is cancelled, and the new page is
 * drawn off-screen first so the old one never blanks mid-turn.
 */
function FitPage({
  doc,
  pageNumber,
  label,
  onDownloadOriginal,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  label: string;
  onDownloadOriginal?: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const box = useBoxSize(boxRef);
  const [css, setCss] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!box || box.w < 10 || box.h < 10) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    setFailed(false);
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(box.w / base.width, box.h / base.height);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });
      const off = document.createElement("canvas");
      off.width = Math.floor(viewport.width);
      off.height = Math.floor(viewport.height);
      task = page.render({ canvasContext: off.getContext("2d")!, viewport });
      await task.promise;
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = off.width;
      canvas.height = off.height;
      canvas.getContext("2d")!.drawImage(off, 0, 0);
      setCss({ w: base.width * scale, h: base.height * scale });
    })().catch((e: unknown) => {
      if (cancelled || (e as { name?: string })?.name === "RenderingCancelledException")
        return;
      setFailed(true);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, box]);

  return (
    <div ref={boxRef} className="absolute inset-3 sm:inset-5">
      {failed ? (
        <Notice
          title="This page couldn't be drawn"
          body="Try the next page or Read text. The original file is untouched."
          onDownloadOriginal={onDownloadOriginal}
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={label}
            style={css ? { width: css.w, height: css.h } : { width: 0, height: 0 }}
            className="rounded-xs bg-white shadow-[0_24px_48px_-16px_rgba(0,0,0,0.9)] ring-1 ring-black/40"
          />
        </div>
      )}
    </div>
  );
}

/** An image proof, whole and at its own aspect ratio. */
function FitImage({ blob, label }: { blob: Blob; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return (
    <div className="absolute inset-3 flex items-center justify-center sm:inset-5">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- a local Blob URL
        <img
          src={url}
          alt={label}
          className="max-h-full max-w-full rounded-xs bg-white shadow-[0_24px_48px_-16px_rgba(0,0,0,0.9)] ring-1 ring-black/40"
        />
      )}
    </div>
  );
}

/** The current page as selectable, wrapping text at a comfortable size. */
function PageText({
  doc,
  pageNumber,
  onFitPage,
  onDownloadOriginal,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  onFitPage: () => void;
  onDownloadOriginal?: () => void;
}) {
  const [paragraphs, setParagraphs] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setParagraphs(null);
    doc
      .getPage(pageNumber)
      .then(pageParagraphs)
      .then((p) => !cancelled && setParagraphs(p))
      .catch(() => !cancelled && setParagraphs([]));
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber]);

  if (paragraphs === null)
    return (
      <p className="grid h-full place-items-center font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        Reading page {pageNumber}…
      </p>
    );

  if (paragraphs.length === 0)
    return (
      <Notice
        title="No text on this page"
        body="This page looks like a scan or an image, so there's no text to pull out. Fit page shows it as it is, and the original downloads untouched."
        onDownloadOriginal={onDownloadOriginal}
      >
        <button
          onClick={onFitPage}
          className="min-h-9 rounded-sm border border-edge-strong px-3 text-xs text-ink-muted transition-colors hover:border-accent hover:text-ink"
        >
          Fit page
        </button>
      </Notice>
    );

  return (
    <div className="absolute inset-0 overflow-auto px-4 py-6 sm:px-8">
      <article className="mx-auto max-w-[68ch] rounded-xs bg-paper px-6 py-7 text-[15px] leading-relaxed text-paper-ink shadow-[0_24px_48px_-16px_rgba(0,0,0,0.9)] select-text sm:px-10">
        {paragraphs.map((p, i) => (
          <p key={i} className="mb-3 break-words last:mb-0">
            {p}
          </p>
        ))}
      </article>
    </div>
  );
}
