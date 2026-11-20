import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

/**
 * In-app PDF rendering for the Vault (§7.17). PDF.js replaces the browser's own
 * PDF embed — that embed is what put the grey toolbar and side gutters around
 * every document.
 *
 * Client-only: the library is imported lazily, so it never runs during SSR and
 * isn't downloaded until a stored PDF is actually on screen. The legacy build
 * keeps older iOS Safari working. Its worker is vendored at a versioned path in
 * public/pdfjs — bump that file alongside the pdfjs-dist version.
 */
const WORKER_SRC = "/pdfjs/pdf.worker-4.10.38.min.mjs";

type PdfJs = typeof import("pdfjs-dist");
let pdfjs: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjs) {
    pdfjs = import("pdfjs-dist/legacy/build/pdf.mjs").then((m) => {
      m.GlobalWorkerOptions.workerSrc = WORKER_SRC;
      return m as unknown as PdfJs;
    });
    pdfjs.catch(() => {
      pdfjs = null;
    });
  }
  return pdfjs;
}

/**
 * One parsed document per stored Blob, shared by the shelf thumbnail and the
 * reader. Keyed by the Blob itself, so replacing a file can never serve the old
 * one's pages — the new Blob simply isn't in the map yet.
 */
const docs = new WeakMap<Blob, Promise<PDFDocumentProxy>>();

export function openPdf(blob: Blob): Promise<PDFDocumentProxy> {
  let doc = docs.get(blob);
  if (!doc) {
    doc = loadPdfJs().then(async (m) =>
      m.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise,
    );
    docs.set(blob, doc);
    doc.catch(() => docs.delete(blob));
  }
  return doc;
}

/** Free a replaced or removed file's parsed document and its thumbnail. */
export function releasePdf(blob: Blob | undefined | null): void {
  if (!blob) return;
  docs.get(blob)?.then((d) => d.destroy()).catch(() => {});
  docs.delete(blob);
  thumbs.delete(blob);
}

export interface PdfThumbnail {
  /** Image of page one. */
  src: string;
  pages: number;
  /** Width ÷ height of page one — landscape pages get a landscape cover. */
  aspect: number;
}

const thumbs = new WeakMap<Blob, Promise<PdfThumbnail>>();

/** A cover image of page one, rendered once per file. */
export function pdfThumbnail(blob: Blob, cssWidth = 240): Promise<PdfThumbnail> {
  let t = thumbs.get(blob);
  if (!t) {
    t = (async () => {
      const doc = await openPdf(blob);
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      return {
        src: canvas.toDataURL("image/png"),
        pages: doc.numPages,
        aspect: base.width / base.height,
      };
    })();
    thumbs.set(blob, t);
    t.catch(() => thumbs.delete(blob));
  }
  return t;
}

/**
 * The page's text as paragraphs, in reading order. A larger-than-usual gap
 * between lines starts a new paragraph. Returns [] for a page with no text
 * layer — a scan.
 */
export async function pageParagraphs(page: PDFPageProxy): Promise<string[]> {
  const content = await page.getTextContent();
  const paragraphs: string[] = [];
  let line = "";
  let current = "";
  let lastY: number | null = null;
  let lastHeight = 0;

  const endLine = () => {
    const t = line.replace(/\s+/g, " ").trim();
    if (t) current = current ? `${current} ${t}` : t;
    line = "";
  };
  const endParagraph = () => {
    endLine();
    if (current) paragraphs.push(current);
    current = "";
  };

  for (const item of content.items) {
    if (!("str" in item)) continue;
    const y = item.transform[5];
    const h = item.height || lastHeight || 10;
    if (lastY !== null && Math.abs(lastY - y) > h * 0.5) {
      // New line; a gap of well over one line height means a new paragraph.
      if (Math.abs(lastY - y) > Math.max(h, lastHeight) * 1.8) endParagraph();
      else endLine();
    }
    line += item.str;
    if (item.hasEOL) line += " ";
    lastY = y;
    lastHeight = h;
  }
  endParagraph();
  return paragraphs;
}
