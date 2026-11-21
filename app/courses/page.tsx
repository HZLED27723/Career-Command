"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { courseRepo, certificationRepo, skillRepo } from "@/lib/db";
import type { Course, CourseStatus, RoleTrack, Skill } from "@/lib/types";
import { useTracks } from "@/lib/tracks";
import { parseLocalDate } from "@/lib/actions";
import { issuerKey, monogram, monogramColour, shrinkLogo } from "@/lib/credentials";
import { formatDate } from "@/components/workspace/ShelfCard";

/** The learning queue, in display order: what you're on → what's next → done. */
const SECTIONS: {
  status: CourseStatus;
  label: string;
  hint: string;
  dot: string;
}[] = [
  {
    status: "in-progress",
    label: "In progress",
    hint: "currently working through",
    dot: "bg-warn",
  },
  {
    status: "planned",
    label: "Up next",
    hint: "courses & certs you want to complete",
    dot: "bg-info",
  },
  {
    status: "completed",
    label: "Completed",
    hint: "done — log them in the certifications vault",
    dot: "bg-ok",
  },
];

const STATUS_LABEL: Record<CourseStatus, string> = {
  planned: "Planned",
  "in-progress": "In progress",
  completed: "Completed",
};

const NOTE_LABEL: Record<CourseStatus, string> = {
  planned: "Why this course & what it unlocks",
  "in-progress": "Progress notes",
  completed: "Takeaways",
};

const NOTE_PLACEHOLDER: Record<CourseStatus, string> = {
  planned: "why it matters, prerequisites, cost, where to enrol…",
  "in-progress": "where you're up to, blockers, next session's goal…",
  completed: "what you got out of it, score, follow-ups…",
};

/**
 * Optional example courses — suggestions, not anyone's records. Tagged by the
 * tracks they suit so the set offered follows the tracks chosen in onboarding.
 */
const STARTER_COURSES: {
  title: string;
  provider?: string;
  status: CourseStatus;
  note?: string;
  tracks: RoleTrack[];
}[] = [
  {
    title: "SOLIDWORKS CSWA",
    provider: "Dassault Systèmes",
    status: "planned",
    note: "industry-recognised CAD cert — strong resume line for internships",
    tracks: ["engineering"],
  },
  {
    title: "MATLAB Onramp",
    provider: "MathWorks",
    status: "planned",
    note: "free, ~2 hours — quick win",
    tracks: ["engineering"],
  },
  {
    title: "White Card (CPCWHS1001)",
    provider: "SafeWork",
    status: "planned",
    note: "required before any construction site visit",
    tracks: ["engineering"],
  },
  {
    title: "First Aid (HLTAID011)",
    provider: "St John / Red Cross",
    status: "planned",
    tracks: ["engineering", "retail", "hospitality"],
  },
  {
    title: "RSA",
    provider: "Liquor & Gaming",
    status: "planned",
    note: "opens up hospitality shifts",
    tracks: ["hospitality"],
  },
  {
    title: "Food Safety (Level 1)",
    provider: "Food Safety Australia",
    status: "planned",
    note: "expected for most kitchen and café roles",
    tracks: ["hospitality"],
  },
  {
    title: "Forklift licence (LF)",
    provider: "WorkSafe",
    status: "planned",
    note: "warehouse / retail ops advantage",
    tracks: ["retail"],
  },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Hostname of the course link, for the favicon fallback. */
function domainOf(url?: string): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return null;
  }
}

export default function CoursesPage() {
  const { tracks, ready: tracksReady } = useTracks();
  const courses = useLiveQuery(() => courseRepo.list(), []);
  const certs = useLiveQuery(() => certificationRepo.list(), []);
  const skills = useLiveQuery(() => skillRepo.list(), []);
  const [draft, setDraft] = useState("");
  const [draftProvider, setDraftProvider] = useState("");
  const [draftStatus, setDraftStatus] = useState<CourseStatus>("planned");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const grouped = useMemo(() => {
    const byStatus = new Map<CourseStatus, Course[]>(
      SECTIONS.map((s) => [s.status, []]),
    );
    for (const c of courses ?? []) byStatus.get(c.status)?.push(c);
    // Soonest target date first; undated entries sink to the bottom.
    for (const [status, list] of byStatus)
      list.sort((a, b) =>
        status === "completed"
          ? // Finished courses: most recently finished first.
            (b.completedDate ?? "").localeCompare(a.completedDate ?? "") ||
            a.title.localeCompare(b.title)
          : (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999") ||
            a.title.localeCompare(b.title),
      );
    return byStatus;
  }, [courses]);

  /**
   * One logo per issuer, shared with Certifications: a logo added on either
   * page shows on every course and credential from the same provider.
   */
  const sharedLogos = useMemo(() => {
    const map = new Map<string, Blob>();
    for (const c of certs ?? [])
      if (c.issuerLogo && c.issuer) map.set(issuerKey(c.issuer), c.issuerLogo);
    for (const c of courses ?? [])
      if (c.logo && c.provider) map.set(issuerKey(c.provider), c.logo);
    return map;
  }, [certs, courses]);

  const addCourse = async () => {
    const title = draft.trim();
    if (!title) return;
    await courseRepo.add({
      title,
      provider: draftProvider.trim() || undefined,
      status: draftStatus,
    });
    setDraft("");
    setDraftProvider("");
  };

  /** Only the examples that match the tracks this person actually works in. */
  const starterForTracks = useMemo(
    () =>
      STARTER_COURSES.filter((c) =>
        c.tracks.some((t) => tracks.includes(t)),
      ).map((c) => ({
        title: c.title,
        provider: c.provider,
        status: c.status,
        note: c.note,
      })),
    [tracks],
  );

  const total = courses?.length ?? 0;
  const counts = {
    "in-progress": grouped.get("in-progress")?.length ?? 0,
    planned: grouped.get("planned")?.length ?? 0,
    completed: grouped.get("completed")?.length ?? 0,
  };

  return (
    <div className="mx-auto max-w-4xl p-5">
      {/* ── Module header ───────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Learning
          </p>
          <h2 className="mt-0.5 text-xl font-semibold tracking-tight">
            Courses
          </h2>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-muted">
            Everything you want to complete, in one line of sight — finished
            courses log straight into the certifications vault.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatChip dot="bg-warn" label={`${counts["in-progress"]} in progress`} />
          <StatChip dot="bg-info" label={`${counts.planned} up next`} />
          <StatChip dot="bg-ok" label={`${counts.completed} completed`} />
        </div>
      </div>

      {/* ── Add bar ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 max-sm:flex-col">
        <select
          value={draftStatus}
          onChange={(e) => setDraftStatus(e.target.value as CourseStatus)}
          className="w-32 cursor-pointer rounded-sm border border-edge bg-panel px-3 py-2 text-xs outline-none focus:border-accent-dim max-sm:w-full"
        >
          {(["planned", "in-progress", "completed"] as CourseStatus[]).map(
            (s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ),
          )}
        </select>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCourse()}
          placeholder="Course or certification…"
          className="flex-1 rounded-sm border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent-dim"
        />
        <input
          value={draftProvider}
          onChange={(e) => setDraftProvider(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCourse()}
          placeholder="Company / association…"
          className="w-52 rounded-sm border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent-dim max-sm:w-full"
        />
        <button
          onClick={addCourse}
          disabled={!draft.trim()}
          className="rounded-sm bg-accent-dim px-4 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {/* ── Queue sections ──────────────────────────────────────────── */}
      {total === 0 ? (
        <div className="mt-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Learning queue is empty
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Line up the courses and certifications you want to complete — so
            you always know what&apos;s next.
          </p>
          {/* Held back until the track preference has loaded, so the count
              never briefly shows the unfiltered total. */}
          <button
            onClick={() => courseRepo.bulkAdd(starterForTracks)}
            disabled={!tracksReady}
            className="mt-4 rounded-sm bg-accent-dim px-4 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:opacity-50"
          >
            {tracksReady
              ? `Load ${starterForTracks.length} example courses`
              : "Loading examples…"}
          </button>
          <p className="mx-auto mt-2 max-w-sm text-[11px] text-ink-faint">
            (Examples for your tracks — edit or delete anything.)
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {SECTIONS.map((section) => {
            const list = grouped.get(section.status) ?? [];
            return (
              <section key={section.status}>
                <div className="mb-2 flex items-baseline gap-2">
                  <span
                    className={`size-1.5 self-center rounded-full ${section.dot}`}
                  />
                  <h3 className="text-sm font-semibold">{section.label}</h3>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {list.length} · {section.hint}
                  </span>
                </div>
                <div className="divide-y divide-edge overflow-hidden rounded-md border border-edge bg-surface">
                  {list.length === 0 ? (
                    <p className="px-4 py-5 text-center text-xs text-ink-faint">
                      {section.status === "planned"
                        ? "Nothing queued — what do you want to learn next?"
                        : "Nothing here yet."}
                    </p>
                  ) : (
                    list.map((c) => (
                      <CourseRow
                        key={c.id}
                        course={c}
                        sharedLogo={c.provider ? sharedLogos.get(issuerKey(c.provider)) : undefined}
                        open={openIds.has(c.id!)}
                        onToggle={() => toggle(c.id!)}
                        skills={skills ?? []}
                        certExists={
                          c.certId !== undefined &&
                          (certs ?? []).some((cert) => cert.id === c.certId)
                        }
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function StatChip({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1 font-mono text-[11px] text-ink-muted">
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

/**
 * Provider icon tile: uploaded logo → the issuer's logo saved on another
 * course or credential → favicon from the course link → monogram. Click to
 * upload / replace the logo; uploads are shrunk (every Blob rides in the one
 * synced row).
 */
function CourseIcon({ course, sharedLogo }: { course: Course; sharedLogo?: Blob }) {
  const logoUrl = useObjectUrl(course.logo ?? sharedLogo);
  const domain = domainOf(course.url);
  const [faviconFailed, setFaviconFailed] = useState(false);
  useEffect(() => setFaviconFailed(false), [domain]);
  const name = course.provider || course.title;
  const showMonogram = !logoUrl && !(domain && !faviconFailed);

  return (
    <label
      title="Upload the company / association's logo"
      className="group/icon relative grid size-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border border-edge transition-colors hover:border-accent-dim"
      style={showMonogram ? { backgroundColor: monogramColour(name) } : undefined}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            await courseRepo.update(course.id, { logo: await shrinkLogo(f) });
          } catch {
            /* unreadable image — leave the current icon */
          }
        }}
      />
      {/* Logos fill the whole tile edge to edge (cropping, not letterboxing):
          the owner wants a full icon, not a logo floating in a white mat. */}
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : domain && !faviconFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          onError={() => setFaviconFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <span className="font-mono text-[11px] font-semibold text-mist">
          {monogram(name)}
        </span>
      )}
      <span className="pointer-events-none absolute inset-0 grid place-items-center bg-bg/70 text-[10px] font-semibold text-ink opacity-0 transition-opacity group-hover/icon:opacity-100">
        edit
      </span>
    </label>
  );
}

/**
 * "08 Dec 2025" from a stored YYYY-MM-DD, read as a local date. The day is
 * zero-padded so every date in the monospaced column is the same length.
 */
const showDay = (iso?: string) => {
  const d = parseLocalDate(iso);
  return d ? formatDate(d.toISOString()).padStart(11, "0") : null;
};

/**
 * The row's date: reads like the rest of the app ("21 Jun 2026", or a quiet
 * "set date") instead of the browser's "dd/mm/yyyy" mask, and still opens the
 * native picker on click. Fixed width so every row's date lines up.
 */
function DateCell({
  label,
  value,
  tone,
  title,
  onChange,
}: {
  label: string;
  value?: string;
  tone: "faint" | "danger";
  title: string;
  onChange: (v: string | undefined) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const shown = showDay(value);
  const open = () => {
    const el = ref.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  };
  return (
    <span className="relative flex w-36 shrink-0 justify-end max-sm:order-3 max-sm:w-auto max-sm:grow max-sm:justify-start max-sm:pl-[4.25rem]">
      <button
        type="button"
        onClick={open}
        title={title}
        className="flex min-h-9 items-center gap-1.5 rounded-sm px-2 transition-colors hover:bg-raised"
      >
        <span className={`font-mono text-[10px] uppercase ${tone === "danger" ? "text-danger" : "text-ink-faint"}`}>
          {label}
        </span>
        <span
          className={`font-mono text-xs ${
            !shown ? "text-ink-faint/70" : tone === "danger" ? "text-danger" : "text-ink-muted"
          }`}
        >
          {shown ?? "set date"}
        </span>
      </button>
      <input
        ref={ref}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
      />
    </span>
  );
}

/**
 * One course — provider logo tile (click to upload), title + provider
 * stacked and inline-editable, a target/completed date (overdue turns red),
 * and notes/link behind the chevron dropdown. Pipeline: planned → start →
 * in-progress → done → completed → log in vault.
 */
function CourseRow({
  course,
  sharedLogo,
  open,
  onToggle,
  skills,
  certExists,
}: {
  course: Course;
  /** The provider's logo saved elsewhere (another course or a credential). */
  sharedLogo?: Blob;
  open: boolean;
  onToggle: () => void;
  skills: Skill[];
  /** Whether course.certId still points at a real vault entry. */
  certExists: boolean;
}) {
  const hasNote = !!course.note?.trim();
  const done = course.status === "completed";
  const overdue =
    !done && !!course.targetDate && course.targetDate < todayISO();

  const saveTitle = (value: string) => {
    const title = value.trim();
    if (title && title !== course.title)
      void courseRepo.update(course.id, { title });
  };

  const saveProvider = (value: string) => {
    const provider = value.trim();
    if (provider !== (course.provider ?? ""))
      void courseRepo.update(course.id, { provider: provider || undefined });
  };

  const saveNote = (value: string) => {
    const note = value.trim();
    if (note !== (course.note ?? ""))
      void courseRepo.update(course.id, { note: note || undefined });
  };

  const saveUrl = (value: string) => {
    const url = value.trim();
    if (url !== (course.url ?? ""))
      void courseRepo.update(course.id, { url: url || undefined });
  };

  /**
   * Log a finished course into the Certifications vault.
   *
   * `fromCourseId` marks where the entry came from: finishing a course is not
   * the same as holding an independently verified credential, and the vault
   * shouldn't present them as equivalent. It also makes the link two-way, so a
   * deleted vault entry can be detected rather than leaving `certId` dangling.
   */
  const logInVault = async () => {
    const certId = await certificationRepo.add({
      title: course.title,
      issuer: course.provider ?? "",
      issuedDate: course.completedDate ?? todayISO(),
      url: course.url,
      fromCourseId: course.id,
    });
    await courseRepo.update(course.id, { certId });
  };

  return (
    <div className={`transition-colors duration-300 ${open ? "bg-panel" : ""}`}>
      <div className="group flex items-center gap-3 py-2 pr-4 max-sm:flex-wrap">
        <button
          onClick={onToggle}
          title={NOTE_LABEL[course.status]}
          className="flex items-center px-3 py-2 text-ink-faint transition-colors hover:text-accent"
        >
          <svg
            viewBox="0 0 16 16"
            className={`size-3 shrink-0 fill-none stroke-2 transition-transform duration-300 ${
              open
                ? "rotate-90 stroke-accent"
                : hasNote
                  ? "stroke-accent/70"
                  : "stroke-current"
            }`}
          >
            <path
              d="M6 4l4 4-4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <CourseIcon course={course} sharedLogo={sharedLogo} />

        {/* Phones: the title gets the whole first line; date and actions wrap below. */}
        <div className="min-w-0 flex-1 max-sm:basis-[calc(100%-6.5rem)]">
          <input
            defaultValue={course.title}
            onBlur={(e) => saveTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="block w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-faint focus:text-accent-strong"
          />
          <input
            defaultValue={course.provider ?? ""}
            onBlur={(e) => saveProvider(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            placeholder="company / association…"
            className="block w-full bg-transparent text-[11px] text-ink-muted outline-none placeholder:text-ink-faint/70 focus:text-ink"
          />
        </div>

        <DateCell
          label={done ? "done" : overdue ? "late" : "by"}
          value={done ? course.completedDate : course.targetDate}
          tone={overdue ? "danger" : "faint"}
          title={done ? "Date completed" : "Target completion date"}
          onChange={(v) =>
            void courseRepo.update(
              course.id,
              done ? { completedDate: v } : { targetDate: v },
            )
          }
        />

        {/* Always visible (hover-only hid them on touch screens) and fixed
            width, so the date column lines up whatever the status. */}
        <span className="flex w-40 shrink-0 items-center justify-end gap-2 max-sm:order-4 max-sm:ml-auto max-sm:w-auto">
          {course.status === "planned" && (
            <button
              onClick={() =>
                void courseRepo.update(course.id, { status: "in-progress" })
              }
              className="rounded-sm border border-edge px-2 py-0.5 font-mono text-[10px] text-warn transition-colors hover:border-warn"
              title="Start this course"
            >
              start →
            </button>
          )}
          {course.status === "in-progress" && (
            <button
              onClick={() =>
                void courseRepo.update(course.id, {
                  status: "completed",
                  completedDate: todayISO(),
                })
              }
              className="rounded-sm border border-edge px-2 py-0.5 font-mono text-[10px] text-ok transition-colors hover:border-ok"
              title="Mark as completed"
            >
              ✓ done
            </button>
          )}
          {/* certExists, not just certId: the vault entry may have been
              deleted since, and claiming "in vault" when it isn't there any
              more is worse than offering to log it again. */}
          {done &&
            (course.certId && certExists ? (
              <span className="font-mono text-[10px] uppercase tracking-widest text-ok">
                in vault ✓
              </span>
            ) : (
              <button
                onClick={() => void logInVault()}
                className="rounded-sm border border-edge px-2 py-0.5 font-mono text-[10px] whitespace-nowrap text-accent transition-colors hover:border-accent-dim"
                title="Create an entry in the Certifications vault"
              >
                log in vault →
              </button>
            ))}
          <button
            onClick={() => {
              const loses =
                course.note?.trim() || course.logo || course.url || course.skillIds?.length;
              if (
                loses &&
                !window.confirm(
                  `Delete "${course.title}" and its notes, link and logo? This can't be undone.`,
                )
              )
                return;
              void courseRepo.remove(course.id);
            }}
            className="grid size-7 place-items-center rounded-sm text-sm leading-none text-ink-faint transition-colors hover:bg-raised hover:text-danger"
            title="Delete course"
            aria-label={`Delete ${course.title}`}
          >
            ×
          </button>
        </span>
      </div>

      {/* Always mounted; grid-rows 0fr→1fr gives a smooth height animation */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pl-[4.75rem]">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                {NOTE_LABEL[course.status]}
              </p>
              <span className="flex items-center gap-3">
                {course.logo && (
                  <button
                    onClick={() =>
                      void courseRepo.update(course.id, { logo: undefined })
                    }
                    tabIndex={open ? 0 : -1}
                    className="font-mono text-[10px] text-ink-faint transition-colors hover:text-danger"
                  >
                    remove logo
                  </button>
                )}
                {course.url && (
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                    tabIndex={open ? 0 : -1}
                    className="truncate font-mono text-[10px] text-info underline-offset-2 hover:underline"
                  >
                    open course ↗
                  </a>
                )}
              </span>
            </div>
            <textarea
              key={course.updatedAt}
              defaultValue={course.note ?? ""}
              placeholder={NOTE_PLACEHOLDER[course.status]}
              rows={3}
              tabIndex={open ? 0 : -1}
              onBlur={(e) => saveNote(e.target.value)}
              className="w-full resize-y rounded-sm border border-edge bg-surface p-3 text-xs leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
            />
            <div className="mt-1.5 flex items-center gap-3">
              <input
                defaultValue={course.url ?? ""}
                onBlur={(e) => saveUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                placeholder="course link (https://…) — also powers the logo fallback"
                tabIndex={open ? 0 : -1}
                className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-ink-muted outline-none placeholder:text-ink-faint/70 focus:text-ink"
              />
              <p className="shrink-0 font-mono text-[10px] text-ink-faint">
                auto-saves on click-away
              </p>
            </div>

            {/* What this course is actually for — closes the loop between the
                learning queue and the skills pipeline. */}
            <SkillLinks
              course={course}
              skills={skills}
              tabbable={open}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Links a course to the skills it's meant to build. Only skills the user has
 * already put in their pipeline are offered — inventing skill records from
 * here would fill the pipeline with things they never chose to track.
 */
function SkillLinks({
  course,
  skills,
  tabbable,
}: {
  course: Course;
  skills: Skill[];
  tabbable: boolean;
}) {
  const linked = course.skillIds ?? [];

  const toggle = (id: number) => {
    const next = linked.includes(id)
      ? linked.filter((x) => x !== id)
      : [...linked, id];
    void courseRepo.update(course.id, {
      skillIds: next.length ? next : undefined,
    });
  };

  // Targets and in-development skills first: those are the ones a course is
  // usually taken for.
  const ordered = [...skills].sort((a, b) => {
    const rank = (s: Skill) =>
      s.status === "target" ? 0 : s.status === "developing" ? 1 : 2;
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });

  return (
    <div className="mt-3">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        Builds towards
      </p>
      {ordered.length === 0 ? (
        <p className="text-[11px] text-ink-faint">
          Add skills to your pipeline first, then link them here.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ordered.map((s) => {
            const on = linked.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                aria-pressed={on}
                tabIndex={tabbable ? 0 : -1}
                className={`rounded-sm border px-2 py-0.5 text-[11px] transition-colors ${
                  on
                    ? "border-accent-dim bg-accent-dim text-accent-strong"
                    : "border-edge text-ink-faint hover:border-accent hover:text-ink"
                }`}
              >
                {on ? "✓ " : ""}
                {s.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
