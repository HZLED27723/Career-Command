"use client";

import { useEffect, useState } from "react";
import { certificationRepo, courseRepo } from "./db";
import { issuerKey } from "./credentials";

/**
 * Issuer logos that paint on the first frame (§7.33).
 *
 * The flicker on opening Certifications had three causes: the object URL was
 * made in an effect, so the first paint showed the coloured monogram; the
 * <img> then decoded after insertion, so the tile went blank before the logo
 * appeared; and every IndexedDB read returns a fresh Blob, so each visit (and
 * each sync) made a new URL and decoded all over again.
 *
 * So logos are cached for the page's lifetime by a stable signature, not by
 * Blob identity: the issuer plus the file's size and type. The same issuer
 * with a byte-identical size is, in practice, the same logo. Each entry keeps
 * its decoded Image alive, so an <img> using the URL draws immediately.
 * Logos are ≤160 px PNGs (shrinkLogo), so keeping them is cheap; URLs are
 * never revoked.
 */

interface Entry {
  url: string;
  ready: boolean;
  decoded: Promise<void>;
  /** Held so the browser keeps the decoded bitmap for this URL. */
  img: HTMLImageElement;
}

const cache = new Map<string, Entry>();

const signature = (issuer: string, blob: Blob) =>
  `${issuerKey(issuer)}|${blob.size}|${blob.type}`;

/** The cached entry for a logo, created (and decoding) on first sight. */
function entryFor(issuer: string, blob: Blob): Entry {
  const key = signature(issuer, blob);
  const hit = cache.get(key);
  if (hit) return hit;
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  const entry: Entry = { url, img, ready: false, decoded: Promise.resolve() };
  entry.decoded = img
    .decode()
    .catch(() => {}) // A broken file still resolves; the tile shows what it can.
    .then(() => {
      entry.ready = true;
    });
  cache.set(key, entry);
  return entry;
}

/** A logo's URL, synchronously, so the very first render can show it. */
export function logoSrc(issuer: string, blob: Blob | undefined): string | null {
  if (!blob || typeof window === "undefined") return null;
  return entryFor(issuer, blob).url;
}

/** Longest the page waits for logos before showing anyway. */
const MAX_WAIT_MS = 600;

/**
 * True once every given logo is decoded (or MAX_WAIT_MS has passed), so a
 * list can appear with its logos already drawn instead of popping them in.
 * `undefined` means the data itself is still loading. Once true it stays
 * true: a logo added later simply appears.
 */
export function useLogosReady(
  logos: { issuer: string; blob: Blob | undefined }[] | undefined,
): boolean {
  const [settled, setSettled] = useState(false);

  const entries =
    logos && typeof window !== "undefined"
      ? logos.flatMap(({ issuer, blob }) => (blob ? [entryFor(issuer, blob)] : []))
      : null;
  const allReady = entries !== null && entries.every((e) => e.ready);
  /** Stands in for `entries` as a dependency: same logos, same string. */
  const entriesKey = entries?.map((e) => e.url).join(" ") ?? null;

  useEffect(() => {
    if (settled || entries === null) return;
    if (allReady) {
      setSettled(true);
      return;
    }
    let cancelled = false;
    const timeout = new Promise<void>((r) => setTimeout(r, MAX_WAIT_MS));
    void Promise.race([Promise.all(entries.map((e) => e.decoded)), timeout]).then(() => {
      if (!cancelled) setSettled(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entriesKey covers entries
  }, [settled, allReady, entriesKey]);

  return settled || allReady;
}

let warmed = false;

/**
 * Decode every stored issuer and course logo while the browser is idle after
 * the app opens, so the first visit to Certifications is instant too.
 */
export function warmIssuerLogos(): void {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  const run = async () => {
    const [certs, courses] = await Promise.all([
      certificationRepo.list(),
      courseRepo.list(),
    ]);
    for (const c of certs) if (c.issuerLogo && c.issuer) entryFor(c.issuer, c.issuerLogo);
    for (const c of courses) if (c.logo && c.provider) entryFor(c.provider, c.logo);
  };
  const schedule =
    "requestIdleCallback" in window
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 3000 })
      : (cb: () => void) => window.setTimeout(cb, 1200);
  schedule(() => void run().catch(() => {}));
}
