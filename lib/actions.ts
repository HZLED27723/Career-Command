import type { Application, Course } from "./types";

/**
 * Turns records into the list of things that actually need doing, soonest and
 * most overdue first. Kept out of the dashboard component so the date handling
 * can be reasoned about (and checked) on its own.
 *
 * Timezone: date-only values ("2026-09-20") are parsed as LOCAL midnight, not
 * UTC. `new Date("2026-09-20")` gives UTC midnight, which in Australia is the
 * morning of the 20th but in the Americas is the evening of the 19th — enough
 * to mark a deadline overdue a day early for anyone west of Greenwich.
 */

export type ActionKind =
  | "deadline"
  | "interview"
  | "follow-up"
  | "learning";

export interface NextAction {
  id: string;
  kind: ActionKind;
  /** What to do. */
  title: string;
  /** Which record it belongs to. */
  subtitle: string;
  href: string;
  /** Local date this is due. */
  due: Date;
  /** Whole days from today: negative = overdue, 0 = today. */
  daysAway: number;
  /** True when the due moment has passed. */
  overdue: boolean;
  /** Free-text note the user attached, if any. */
  note?: string;
}

/** Parse an ISO date or datetime-local string in the viewer's own timezone. */
export function parseLocalDate(value?: string): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  }
  // datetime-local ("2026-09-20T14:00") is already interpreted as local.
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local midnight today — the reference point for "overdue" and "in N days". */
const startOfToday = (now: Date) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate());

/** Whole days between today and a due date, in local time. */
export function daysUntil(due: Date, now: Date): number {
  const a = startOfToday(now).getTime();
  const b = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate(),
  ).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** How the date reads to a person. */
export function describeWhen(action: NextAction): string {
  const { daysAway, kind, due } = action;
  // A date-only interview parses to local midnight. The old check tested the
  // ISO string for "hh:mm", which every ISO string has, so date-only
  // interviews read "Tuesday, 12:00 AM".
  const time =
    kind === "interview" && (due.getHours() !== 0 || due.getMinutes() !== 0)
      ? due.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

  if (daysAway < -1) return `${Math.abs(daysAway)} days overdue`;
  if (daysAway === -1) return "Yesterday";
  if (daysAway === 0) return time ? `Today, ${time}` : "Today";
  if (daysAway === 1) return time ? `Tomorrow, ${time}` : "Tomorrow";
  if (daysAway < 7) {
    const day = due.toLocaleDateString(undefined, { weekday: "long" });
    return time ? `${day}, ${time}` : day;
  }
  return due.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const LIVE_STATUSES = new Set(["draft", "applied", "interview-scheduled"]);

/**
 * Everything due, most urgent first. Closed-out applications (offer, rejected)
 * stop generating actions — chasing a rejection is noise.
 */
export function collectActions(
  apps: Application[],
  courses: Course[],
  now: Date = new Date(),
): NextAction[] {
  const out: NextAction[] = [];

  const push = (
    kind: ActionKind,
    id: string,
    title: string,
    subtitle: string,
    href: string,
    raw?: string,
    note?: string,
  ) => {
    const due = parseLocalDate(raw);
    if (!due) return;
    out.push({
      id,
      kind,
      title,
      subtitle,
      href,
      due,
      daysAway: daysUntil(due, now),
      overdue: due.getTime() < now.getTime(),
      note,
    });
  };

  for (const a of apps) {
    const who = [a.company?.trim(), a.role?.trim()].filter(Boolean).join(" · ");
    const label = who || "Untitled application";

    // An interview stays relevant even once the status moves on, so it isn't
    // gated the way the chase-ups are.
    push(
      "interview",
      `app-${a.id}-interview`,
      "Interview",
      label,
      "/tracker",
      a.interviewDate,
      a.nextAction,
    );

    if (!LIVE_STATUSES.has(a.status)) continue;
    push(
      "deadline",
      `app-${a.id}-deadline`,
      a.status === "draft" ? "Applications close" : "Deadline",
      label,
      "/tracker",
      a.deadline,
      a.nextAction,
    );
    push(
      "follow-up",
      `app-${a.id}-followup`,
      "Follow up",
      label,
      "/tracker",
      a.followUpDate,
      a.nextAction,
    );
  }

  for (const c of courses) {
    if (c.status === "completed") continue;
    push(
      "learning",
      `course-${c.id}`,
      c.status === "in-progress" ? "Finish" : "Start",
      c.title,
      "/courses",
      c.targetDate,
      c.note,
    );
  }

  // Soonest first; within a day, overdue items lead.
  return out.sort(
    (x, y) => x.due.getTime() - y.due.getTime() || x.kind.localeCompare(y.kind),
  );
}
