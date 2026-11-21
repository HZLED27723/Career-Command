/**
 * Helpers for the Certifications cards (§7.19): reading the free-text issue
 * date, issuer monograms, and shrinking logo uploads.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface IssuedDate {
  date: Date;
  precision: "day" | "month" | "year";
}

/**
 * Read the issue date as typed. It's free text, and real entries mix
 * "2025-11-12", "18-11-2025" and "2025". Day-first is assumed for d-m-y
 * (Australian usage). Built from local parts, never `new Date(string)`,
 * so a date can't shift a day west of Greenwich (see §7.14).
 */
export function parseIssued(raw?: string): IssuedDate | null {
  const s = raw?.trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return valid(+m[1], +m[2], +m[3], "day");
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
  if (m) return valid(+m[3], +m[2], +m[1], "day");
  m = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (m) return valid(+m[1], +m[2], 1, "month");
  m = /^(\d{4})$/.exec(s);
  if (m) return valid(+m[1], 1, 1, "year");
  return null;
}

function valid(
  y: number,
  mo: number,
  d: number,
  precision: IssuedDate["precision"],
): IssuedDate | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { date: new Date(y, mo - 1, d), precision };
}

/** "Jun 2026" / "2025" — LinkedIn's granularity. Unreadable text is shown as typed. */
export function formatIssued(raw?: string): string | null {
  const p = parseIssued(raw);
  if (!p) return raw?.trim() || null;
  return p.precision === "year"
    ? String(p.date.getFullYear())
    : `${MONTHS[p.date.getMonth()]} ${p.date.getFullYear()}`;
}

/** Sort key: newest first; undated or unreadable entries go last. */
export const issuedSortKey = (raw?: string): number =>
  parseIssued(raw)?.date.getTime() ?? Number.NEGATIVE_INFINITY;

/** Issuer identity for sharing a logo: case/space/punctuation-insensitive. */
export const issuerKey = (issuer?: string): string =>
  (issuer ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");

/** "MathWorks" → "MW", "McKinsey & Company" → "MC", "Common Purpose" → "CP". */
export function monogram(issuer?: string): string {
  const words = (issuer ?? "").split(/[\s&,.-]+/).filter((w) => /^[A-Za-z0-9]/.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) {
    // Use inner capitals for single CamelCase names (MathWorks → MW).
    const caps = words[0].match(/[A-Z]/g);
    return (caps && caps.length > 1 ? caps.slice(0, 2).join("") : words[0].slice(0, 2)).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Muted tile colours that sit on Carbon; picked stably from the issuer name. */
const TILE_COLOURS = ["#24473c", "#2c3b4d", "#4d4231", "#3d2f45", "#40332c", "#2d4447"];
export function monogramColour(issuer?: string): string {
  let h = 0;
  for (const ch of issuerKey(issuer)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TILE_COLOURS[h % TILE_COLOURS.length];
}

/**
 * Downscale a logo to fit 160×160 and re-encode as PNG. Every Blob ends up in
 * the single synced `user_data` row, so a 2 MB brand asset becomes ~10 KB.
 */
export async function shrinkLogo(file: Blob, max = 160): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That image couldn't be read."));
      el.src = url;
    });
    const w = img.naturalWidth || max;
    const h = img.naturalHeight || max;
    const scale = Math.min(1, max / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!out) throw new Error("That image couldn't be converted.");
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
