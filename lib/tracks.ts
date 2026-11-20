"use client";

import { useEffect, useState } from "react";
import { metaRepo } from "./db";
import type { RoleTrack } from "./types";

/**
 * Which career tracks this person is actually job-hunting in.
 *
 * The three tracks themselves are fixed (they're indexed Dexie values and
 * carry colours across Tracker, Companies and Skills), but nobody should have
 * to look at all three when they only use one. The choice drives which tracks
 * appear in pickers and which starter content is offered.
 *
 * Stored in the device-local `meta` table rather than the synced dataset: it's
 * a preference, not a record, and it must not ride along in a backup.
 *
 * Default is all three, so existing data and the owner's setup are unchanged
 * by this landing.
 */

export const ALL_TRACKS: { value: RoleTrack; label: string; hint: string }[] = [
  {
    value: "engineering",
    label: "Engineering & technical",
    hint: "Internships, graduate programs, technical roles",
  },
  {
    value: "retail",
    label: "Retail",
    hint: "Shop floor, merchandising, customer-facing work",
  },
  {
    value: "hospitality",
    label: "Hospitality",
    hint: "Cafés, venues, events, front of house",
  },
];

const KEY = "activeTracks";
const EVERY: RoleTrack[] = ALL_TRACKS.map((t) => t.value);

const parse = (raw: string | null): RoleTrack[] => {
  if (!raw) return EVERY;
  const picked = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is RoleTrack => EVERY.includes(s as RoleTrack));
  // An empty selection would hide everything — treat it as "no preference".
  return picked.length ? picked : EVERY;
};

export const readTracks = async (): Promise<RoleTrack[]> =>
  parse(await metaRepo.get(KEY));

export const saveTracks = (tracks: RoleTrack[]): Promise<void> =>
  metaRepo.set(KEY, tracks.join(","));

/**
 * The active tracks, plus a setter. `ready` is false until the stored value
 * has been read, so callers can avoid rendering a filter with the wrong set.
 */
export function useTracks() {
  const [tracks, setTracks] = useState<RoleTrack[]>(EVERY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readTracks().then((t) => {
      if (!cancelled) {
        setTracks(t);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = async (next: RoleTrack[]) => {
    setTracks(next.length ? next : EVERY);
    await saveTracks(next);
  };

  return { tracks, ready, setTracks: update };
}
