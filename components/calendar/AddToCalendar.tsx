"use client";

import { useMemo } from "react";
import { collectActions, type NextAction } from "@/lib/actions";
import {
  downloadIcs,
  googleCalendarUrl,
  hasTime,
  upcoming,
} from "@/lib/calendar";
import type { Application } from "@/lib/types";

/**
 * "Add to calendar" controls (§7.30). The file works with Apple Calendar,
 * Outlook and Google (import); the per-date Google link is the quick path for
 * people who live in Google Calendar on their phone.
 */

export function CalendarIcon({
  className = "size-3.5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`${className} shrink-0 fill-none stroke-current stroke-[1.7]`}
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

/** Downloads every upcoming date in one file. Renders nothing when none. */
export function CalendarExportButton({
  actions,
  className = "",
  label = "Add to calendar",
}: {
  actions: NextAction[];
  className?: string;
  label?: string;
}) {
  const ahead = useMemo(() => upcoming(actions), [actions]);
  if (ahead.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => downloadIcs(ahead, "careercommand-dates")}
      title={`Download ${ahead.length} upcoming date${ahead.length === 1 ? "" : "s"} as a calendar file (Apple Calendar, Outlook, Google)`}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-edge-strong px-2.5 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink ${className}`}
    >
      <CalendarIcon />
      {label}
    </button>
  );
}

const whenLabel = (a: NextAction) =>
  a.due.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }) +
  (hasTime(a.due)
    ? `, ${a.due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : "");

/** One application's dates, each with a Google link, plus a file for all. */
export function ApplicationCalendar({ app }: { app: Application }) {
  const ahead = useMemo(() => upcoming(collectActions([app], [])), [app]);
  if (ahead.length === 0) return null;

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const name = (app.company || "application")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    <div className="rounded-sm border border-edge bg-panel px-3 py-2.5">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        <CalendarIcon className="size-3" />
        Add to calendar
      </p>
      <ul className="mt-2 space-y-1.5">
        {ahead.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 text-[11px]"
          >
            <span className="min-w-0 truncate">
              <span className="font-medium text-ink">{a.title}</span>
              <span className="text-ink-muted"> · {whenLabel(a)}</span>
            </span>
            <a
              href={googleCalendarUrl(a, origin)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-medium text-accent transition-colors hover:text-accent-strong max-md:py-1.5"
            >
              Google ↗
            </a>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          downloadIcs(ahead, `careercommand-${name || "application"}`)
        }
        className="mt-2.5 w-full rounded-sm border border-edge-strong py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink max-md:min-h-10"
      >
        ↓{" "}
        {ahead.length === 1
          ? "Calendar file"
          : `All ${ahead.length} as a calendar file`}{" "}
        · Apple, Outlook
      </button>
    </div>
  );
}
