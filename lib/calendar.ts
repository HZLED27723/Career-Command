import type { NextAction } from "./actions";

/**
 * Calendar export (§7.30). Deadlines, interviews and follow-ups go into the
 * user's own calendar so their phone reminds them, without the app ever
 * sending email or holding a calendar connection.
 *
 * Privacy: the .ics file is built in the browser and downloaded straight to
 * the device — nothing is uploaded. The Google link is different: it opens
 * Google Calendar with the event's title and date in the address, so it only
 * ever happens when the user clicks it for one event.
 */

/**
 * Only things still ahead are worth a calendar entry: today counts, but an
 * interview whose time has already passed doesn't.
 */
export function upcoming(actions: NextAction[]): NextAction[] {
  return actions.filter(
    (a) => a.daysAway >= 0 && !(hasTime(a.due) && a.overdue),
  );
}

/** Date-only values parse to local midnight; anything else carries a time. */
export const hasTime = (d: Date) => d.getHours() !== 0 || d.getMinutes() !== 0;

/** What the calendar entry is called: "Interview · Atlas · Graduate Engineer". */
export const eventTitle = (a: NextAction) => `${a.title} · ${a.subtitle}`;

const pad = (n: number) => String(n).padStart(2, "0");

/** 20261124 — a floating calendar date (all-day events). */
const ymd = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/** 20261124T030000Z — an exact moment, in UTC. */
const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

const nextDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

/** Interviews with a time get an hour; everything else is an all-day entry. */
const INTERVIEW_MS = 60 * 60 * 1000;

function details(a: NextAction, origin: string): string {
  return [a.note, `From CareerCommand: ${origin}${a.href}`]
    .filter(Boolean)
    .join("\n\n");
}

/** RFC 5545 text escaping. */
const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

/**
 * Lines longer than 75 octets must be folded. Folding by characters at 60
 * keeps multi-byte text (names with accents, emoji) under the octet limit.
 */
function fold(line: string): string {
  const chars = Array.from(line);
  if (chars.length <= 60) return line;
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += 60)
    parts.push(chars.slice(i, i + 60).join(""));
  return parts.join("\r\n ");
}

/**
 * Reminders, as offsets from the event's start. All-day events start at local
 * midnight, so -PT15H is 9am the day before and PT9H is 9am on the day.
 */
function alarms(a: NextAction): string[] {
  const timed = a.kind === "interview" && hasTime(a.due);
  const triggers =
    a.kind === "interview"
      ? timed
        ? ["-P1D", "-PT1H"]
        : ["-PT15H"]
      : a.kind === "deadline"
        ? ["-PT15H"]
        : ["PT9H"];
  return triggers.flatMap((t) => [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(eventTitle(a))}`,
    `TRIGGER:${t}`,
    "END:VALARM",
  ]);
}

/** One VCALENDAR holding every given action. */
export function buildIcs(
  actions: NextAction[],
  origin: string,
  now: Date = new Date(),
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareerCommand//Calendar export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:CareerCommand",
  ];
  for (const a of actions) {
    const timed = a.kind === "interview" && hasTime(a.due);
    lines.push(
      "BEGIN:VEVENT",
      // Stable per record and kind, so importing again updates the entry in
      // calendars that honour UIDs instead of adding a duplicate.
      `UID:${a.id}@careercommand`,
      `DTSTAMP:${utcStamp(now)}`,
      ...(timed
        ? [
            `DTSTART:${utcStamp(a.due)}`,
            `DTEND:${utcStamp(new Date(a.due.getTime() + INTERVIEW_MS))}`,
          ]
        : [
            `DTSTART;VALUE=DATE:${ymd(a.due)}`,
            `DTEND;VALUE=DATE:${ymd(nextDay(a.due))}`,
          ]),
      `SUMMARY:${esc(eventTitle(a))}`,
      `DESCRIPTION:${esc(details(a, origin))}`,
      `URL:${origin}${a.href}`,
      timed ? "TRANSP:OPAQUE" : "TRANSP:TRANSPARENT",
      ...alarms(a),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Save the .ics to the device. Nothing leaves the browser. */
export function downloadIcs(actions: NextAction[], fileName: string) {
  const ics = buildIcs(actions, window.location.origin);
  const url = URL.createObjectURL(
    new Blob([ics], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens Google Calendar's "new event" form, pre-filled with one action. */
export function googleCalendarUrl(a: NextAction, origin: string): string {
  const timed = a.kind === "interview" && hasTime(a.due);
  const dates = timed
    ? `${utcStamp(a.due)}/${utcStamp(new Date(a.due.getTime() + INTERVIEW_MS))}`
    : `${ymd(a.due)}/${ymd(nextDay(a.due))}`;
  // The note is left out on purpose: the whole event travels in Google's
  // address bar (and so its history and logs), so only title and date go.
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(a),
    dates,
    details: `From CareerCommand: ${origin}${a.href}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
