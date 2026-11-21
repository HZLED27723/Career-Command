"use client";

import Link from "next/link";
import { describeWhen, type ActionKind, type NextAction } from "@/lib/actions";

/**
 * The top of the dashboard: what needs doing, soonest first.
 *
 * Overdue is distinguished from upcoming in words ("3 days overdue") as well as
 * colour, and every row links to the record it came from — the point is to get
 * from "something is due" to the thing itself in one click.
 */

const KIND_META: Record<ActionKind, { label: string; dot: string }> = {
  deadline: { label: "Deadline", dot: "bg-danger" },
  interview: { label: "Interview", dot: "bg-warn" },
  "follow-up": { label: "Follow up", dot: "bg-info" },
  learning: { label: "Learning", dot: "bg-accent" },
};

export function NextActions({
  actions,
  hasAnyRecords,
  waiting = 0,
}: {
  actions: NextAction[];
  hasAnyRecords: boolean;
  /** Applications sent and not yet answered — named in the empty state. */
  waiting?: number;
}) {
  // Anything more than a fortnight out isn't "next" — it's just a date.
  const soon = actions.filter((a) => a.daysAway <= 14);
  const later = actions.length - soon.length;

  if (soon.length === 0) {
    return (
      <section
        aria-labelledby="next-actions-heading"
        className="mb-6 rounded-lg border border-edge bg-surface p-5"
      >
        <h3
          id="next-actions-heading"
          className="font-mono text-[10px] uppercase tracking-widest text-accent"
        >
          What needs doing
        </h3>
        <p className="mt-2 text-sm text-ink">
          {hasAnyRecords
            ? "Nothing due in the next two weeks."
            : "Nothing tracked yet."}
        </p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-muted">
          {hasAnyRecords ? (
            <>
              {waiting > 0
                ? `${waiting} application${waiting === 1 ? " is" : "s are"} waiting to hear back. Add a follow-up date and ${waiting === 1 ? "it" : "they"}'ll show up here.`
                : "Add a deadline or a follow-up date to an application and it will show up here."}{" "}
              <Link
                href="/tracker"
                className="font-medium text-accent hover:text-accent-strong"
              >
                Open the tracker →
              </Link>
            </>
          ) : (
            <>
              Save one role you&apos;re considering — that&apos;s enough for
              this to start telling you what&apos;s next.{" "}
              <Link
                href="/tracker"
                className="font-medium text-accent hover:text-accent-strong"
              >
                Add an application →
              </Link>
            </>
          )}
        </p>
        {later > 0 && (
          <p className="mt-2 text-[11px] text-ink-faint">
            {later} further out.
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="next-actions-heading"
      className="mb-6 rounded-lg border border-edge-strong bg-surface p-5"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id="next-actions-heading"
          className="font-mono text-[10px] uppercase tracking-widest text-accent"
        >
          What needs doing
        </h3>
        <p className="text-[11px] text-ink-faint">
          next two weeks
          {later > 0 && ` · ${later} further out`}
        </p>
      </div>

      <ul className="space-y-1.5">
        {soon.map((a) => {
          const meta = KIND_META[a.kind];
          const when = describeWhen(a);
          const isOverdue = a.daysAway < 0;
          return (
            <li key={a.id}>
              <Link
                href={a.href}
                className={`flex items-start gap-3 rounded-sm border px-3 py-2.5 transition-colors max-md:min-h-11 ${
                  isOverdue
                    ? "border-danger/40 bg-danger/5 hover:border-danger"
                    : "border-edge bg-panel hover:border-accent-dim hover:bg-raised"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${meta.dot}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-semibold">{a.title}</span>
                    <span className="truncate text-[11px] text-ink-muted">
                      {a.subtitle}
                    </span>
                  </span>
                  {a.note && (
                    <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
                      {a.note}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 text-[11px] font-medium ${
                    isOverdue
                      ? "text-danger"
                      : a.daysAway === 0
                        ? "text-warn"
                        : "text-ink-muted"
                  }`}
                >
                  {when}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
