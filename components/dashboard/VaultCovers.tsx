"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { coverLetterRepo, resumeRepo } from "@/lib/db";
import { pdfThumbnail, peekThumbnail, type PdfThumbnail } from "@/lib/pdf";
import { isPdfFile } from "@/components/workspace/DocumentUpload";

/**
 * The dashboard Vault tile's fanned papers, showing page one of the documents
 * actually stored — the same covers the Vault shelf renders. Slot ids and the
 * 300px width match ShelfCard / warmVaultCovers, so these are cache hits (in
 * memory, or the device-local `meta` copy) and normally paint at once.
 *
 * A slot without a stored PDF (empty, a built-in template, or a Word file —
 * browsers can't render .docx) keeps the drawn placeholder paper.
 */

type Slot = "cv" | "visual" | "cover";
type Doc = { slot: Slot; label: string; file?: Blob; fileName?: string; fileType?: string };

/** Left, centre, right: angle and hover lift for each paper in the fan. */
const FAN = [
  "left-[8%] -rotate-6 group-hover:-translate-y-2 group-hover:-rotate-9",
  "left-1/2 -translate-x-1/2 -translate-y-1 z-10 group-hover:-translate-y-3",
  "right-[8%] rotate-5 group-hover:-translate-y-2 group-hover:rotate-8",
];

function useCover(doc: Doc): PdfThumbnail | null {
  const pdf = doc.file && isPdfFile(doc.fileType, doc.fileName) ? doc.file : null;
  const [thumb, setThumb] = useState<PdfThumbnail | null>(() =>
    pdf ? peekThumbnail(pdf) : null,
  );
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    const known = peekThumbnail(pdf);
    if (known) {
      setThumb(known);
      return;
    }
    pdfThumbnail(pdf, 300, doc.slot)
      .then((t) => !cancelled && setThumb(t))
      .catch(() => {
        /* unreadable PDF — the placeholder stays */
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, doc.slot]);
  return pdf ? thumb : null;
}

function Paper({ doc, position }: { doc: Doc; position: string }) {
  const thumb = useCover(doc);
  return (
    <div
      className={`absolute top-1/2 aspect-[1/1.414] w-[84px] overflow-hidden rounded-xs bg-paper text-paper-ink shadow-[0_12px_28px_-10px_rgba(0,0,0,0.85)] ring-1 ring-black/30 transition-transform duration-300 ${position}`}
      style={{ marginTop: -59 }}
      title={doc.label}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local data URL
        <img
          src={thumb.src}
          alt={`${doc.label}, page one`}
          className="size-full object-cover object-top animate-fade-in"
        />
      ) : (
        <Placeholder label={doc.label} />
      )}
    </div>
  );
}

/** The drawn paper used before (and still, when there's no PDF to show). */
function Placeholder({ label }: { label: string }) {
  return (
    <div className="p-2">
      <p className="text-center text-[7px] font-semibold">{label}</p>
      <div className="mx-auto mt-1 h-px w-3/4 bg-accent" />
      <div className="mt-2 space-y-1 opacity-25">
        {[3 / 4, 1, 5 / 6, 0, 1 / 2, 1, 2 / 3].map((w, i) =>
          w === 0 ? (
            <div key={i} className="h-1" />
          ) : (
            <div key={i} className="h-0.5 bg-paper-ink" style={{ width: `${w * 100}%` }} />
          ),
        )}
      </div>
    </div>
  );
}

export function VaultCovers() {
  const docs = useLiveQuery(async (): Promise<Doc[]> => {
    const [cv, visual, cover] = await Promise.all([
      resumeRepo.getByEngine("cv"),
      resumeRepo.getByEngine("visual"),
      coverLetterRepo.getLatest(),
    ]);
    return [
      { slot: "cv", label: "Technical Résumé", file: cv?.file, fileName: cv?.fileName, fileType: cv?.fileType },
      { slot: "visual", label: "Résumé", file: visual?.file, fileName: visual?.fileName, fileType: visual?.fileType },
      { slot: "cover", label: "Cover Letter", file: cover?.file, fileName: cover?.fileName, fileType: cover?.fileType },
    ];
  }, []);

  return (
    <div className="relative my-4 h-32 shrink-0">
      {(docs ?? []).map((doc, i) => (
        <Paper key={doc.slot} doc={doc} position={FAN[i]} />
      ))}
    </div>
  );
}
