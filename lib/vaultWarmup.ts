"use client";

import { coverLetterRepo, resumeRepo } from "./db";
import { pdfThumbnail } from "./pdf";
import { isPdfFile } from "@/components/workspace/DocumentUpload";

/**
 * Get the Vault ready before anyone clicks it: load PDF.js and render (or read
 * back from the device cache) every stored PDF's cover. Run once, when the
 * browser is idle after the app opens, so it never competes with the page
 * actually being used. Failures are silent — the Vault renders on demand anyway.
 */
let started = false;

export function warmVaultCovers(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  const run = async () => {
    const [cv, visual, cover] = await Promise.all([
      resumeRepo.getByEngine("cv"),
      resumeRepo.getByEngine("visual"),
      coverLetterRepo.getLatest(),
    ]);
    // Slot ids and width must match ShelfCard's, or the cache keys differ.
    const slots: [string, { file?: Blob; fileName?: string; fileType?: string } | undefined][] = [
      ["cv", cv],
      ["visual", visual],
      ["cover", cover],
    ];
    for (const [slot, row] of slots) {
      if (row?.file && isPdfFile(row.fileType, row.fileName)) {
        await pdfThumbnail(row.file, 300, slot).catch(() => {});
      }
    }
  };

  const schedule =
    "requestIdleCallback" in window
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 4000 })
      : (cb: () => void) => window.setTimeout(cb, 1500);
  schedule(() => void run().catch(() => {}));
}
