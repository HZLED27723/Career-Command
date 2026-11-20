"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { metaRepo } from "@/lib/db";
import { ALL_TRACKS, useTracks } from "@/lib/tracks";
import type { RoleTrack } from "@/lib/types";

/**
 * A short, skippable start for a new account.
 *
 * Steps complete themselves from real data rather than from a checkbox — if
 * you already saved an application, that step is done, whether or not you did
 * it from here. It disappears once dismissed or once every step is satisfied,
 * and it never blocks the app: it's a panel on the dashboard, not a gate.
 */

const DISMISS_KEY = "gettingStartedDismissed";

export function GettingStarted({
  hasDocument,
  hasApplication,
}: {
  hasDocument: boolean;
  hasApplication: boolean;
}) {
  const { tracks, setTracks } = useTracks();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [pickedTracks, setPickedTracks] = useState(false);

  useEffect(() => {
    void metaRepo.get(DISMISS_KEY).then((v) => setDismissed(v === "1"));
  }, []);

  // Don't flash the panel before we know whether it was dismissed.
  if (dismissed !== false) return null;
  if (pickedTracks && hasDocument && hasApplication) return null;

  const dismiss = () => {
    setDismissed(true);
    void metaRepo.set(DISMISS_KEY, "1");
  };

  const toggleTrack = (t: RoleTrack) => {
    const next = tracks.includes(t)
      ? tracks.filter((x) => x !== t)
      : [...tracks, t];
    setPickedTracks(true);
    void setTracks(next);
  };

  const done = [pickedTracks, hasDocument, hasApplication].filter(
    Boolean,
  ).length;

  return (
    <section
      aria-labelledby="getting-started-heading"
      className="mb-6 rounded-lg border border-edge-strong bg-surface p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="getting-started-heading" className="text-sm font-semibold">
            Getting started
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Three things worth doing first. {done} of 3 done — skip any of them.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="rounded-sm border border-edge-strong px-2.5 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink"
        >
          Dismiss
        </button>
      </div>

      <ol className="space-y-3">
        <Step n={1} done={pickedTracks} title="Choose the work you're after">
          <p className="text-[11px] text-ink-muted">
            This decides which example skills and courses you get offered. Pick
            as many as apply.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ALL_TRACKS.map((t) => {
              const on = tracks.includes(t.value);
              return (
                <button
                  key={t.value}
                  onClick={() => toggleTrack(t.value)}
                  aria-pressed={on}
                  title={t.hint}
                  className={`rounded-sm border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    on
                      ? "border-accent-dim bg-accent-dim text-accent-strong"
                      : "border-edge-strong text-ink-muted hover:border-accent hover:text-ink"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {t.label}
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={2} done={hasDocument} title="Put a resume in the vault">
          <p className="text-[11px] text-ink-muted">
            Import a PDF or Word file — it&apos;s stored exactly as you upload
            it, ready to attach to an application.{" "}
            <Link
              href="/workspace"
              className="font-medium text-accent hover:text-accent-strong"
            >
              Open the vault →
            </Link>
          </p>
        </Step>

        <Step n={3} done={hasApplication} title="Save one opportunity">
          <p className="text-[11px] text-ink-muted">
            Even one role you&apos;re considering. The dashboard starts working
            for you once something is in the tracker.{" "}
            <Link
              href="/tracker"
              className="font-medium text-accent hover:text-accent-strong"
            >
              Open the tracker →
            </Link>
          </p>
        </Step>
      </ol>
    </section>
  );
}

function Step({
  n,
  done,
  title,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
          done
            ? "bg-accent text-bg"
            : "border border-edge-strong text-ink-muted"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">
          {title}
          {/* State in text, not colour alone. */}
          <span className="ml-1.5 font-normal text-ink-faint">
            {done ? "· done" : "· not yet"}
          </span>
        </p>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
}
