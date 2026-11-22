import { applicationRepo } from "./db";
import type { Application } from "./types";

/**
 * Yearly trackers ("seasons", §7.34). Recruiting runs in cycles, so the
 * Tracker shows one year at a time; earlier years become an archive that
 * stays complete and editable (a late rejection still needs logging).
 *
 * `Application.season` is optional and unindexed, so no Dexie or backup
 * version bump. Rows without one predate seasons: they're shown together
 * under one year — the year the newest of them was created — until the
 * user starts the next season, which stamps them with that year for good.
 */

const yearOf = (iso: string | undefined) => {
  const y = Number(iso?.slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : new Date().getFullYear();
};

/** The year that applications without a season are shown under. */
export function unstampedSeason(apps: Application[]): number {
  let latest = "";
  for (const a of apps) if (a.season == null && a.createdAt > latest) latest = a.createdAt;
  return latest ? yearOf(latest) : new Date().getFullYear();
}

export function seasonOf(app: Application, unstamped: number): number {
  return app.season ?? unstamped;
}

/**
 * Remembers on this device that a new season was started before it has any
 * applications (an empty 2027 tracker still needs to open as 2027). Once a
 * 2027 application exists, every device knows from the data itself.
 */
const STARTED_KEY = "cc-season-started";

function startedSeason(): number | null {
  try {
    const v = Number(localStorage.getItem(STARTED_KEY));
    return Number.isInteger(v) && v > 1900 ? v : null;
  } catch {
    return null;
  }
}

export interface SeasonInfo {
  /** The year new applications go into, and the one the dashboard counts. */
  current: number;
  /** Every year with applications (plus the current one), newest first. */
  years: number[];
  /** Applications per year. */
  counts: Map<number, number>;
  unstamped: number;
}

export function seasonInfo(apps: Application[]): SeasonInfo {
  const unstamped = unstampedSeason(apps);
  const counts = new Map<number, number>();
  for (const a of apps) {
    const y = seasonOf(a, unstamped);
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  const started = startedSeason();
  const withData = [...counts.keys()];
  const current = Math.max(
    ...(withData.length ? withData : [new Date().getFullYear()]),
    started ?? 0,
  );
  const years = [...new Set([current, ...withData])].sort((a, b) => b - a);
  return { current, years, counts, unstamped };
}

/** Only the current season's applications — what the dashboard counts. */
export function currentSeasonApps(apps: Application[]): Application[] {
  const { current, unstamped } = seasonInfo(apps);
  return apps.filter((a) => seasonOf(a, unstamped) === current);
}

/**
 * Start `year`: stamp every application that has no season with the year
 * it's currently shown under (so nothing moves unexpectedly later), and
 * remember the new season on this device. Applications themselves are
 * untouched otherwise — the archive is the same records, just filed.
 */
export async function startSeason(year: number, apps: Application[]): Promise<void> {
  await applicationRepo.fileUnstamped(unstampedSeason(apps));
  try {
    localStorage.setItem(STARTED_KEY, String(year));
  } catch {
    /* Private mode: the season still appears once it has an application. */
  }
}
