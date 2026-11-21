"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { applicationRepo } from "@/lib/db";
import { ApplicationDetail } from "@/components/tracker/ApplicationDetail";
import { parseLocalDate } from "@/lib/actions";
import type {
  Application,
  ApplicationStatus,
  RoleTrack,
} from "@/lib/types";

const STATUSES: ApplicationStatus[] = [
  "draft",
  "applied",
  "interview-scheduled",
  "offer-extended",
  "rejected",
];

const STATUS_META: Record<
  ApplicationStatus,
  { label: string; dot: string; text: string }
> = {
  draft: { label: "Draft", dot: "bg-ink-faint", text: "text-ink-muted" },
  applied: { label: "Applied", dot: "bg-info", text: "text-info" },
  "interview-scheduled": {
    label: "Interview",
    dot: "bg-warn",
    text: "text-warn",
  },
  "offer-extended": { label: "Offer", dot: "bg-ok", text: "text-ok" },
  rejected: { label: "Rejected", dot: "bg-danger", text: "text-danger" },
};

const TRACKS: {
  value: RoleTrack;
  label: string;
  dot: string;
  text: string;
}[] = [
  { value: "engineering", label: "Engineering", dot: "bg-info", text: "text-info" },
  { value: "retail", label: "Retail", dot: "bg-accent", text: "text-accent-strong" },
  { value: "hospitality", label: "Hospitality", dot: "bg-warn", text: "text-warn" },
];

const TRACK_META = Object.fromEntries(
  TRACKS.map((t) => [t.value, t]),
) as Record<RoleTrack, (typeof TRACKS)[number]>;

/**
 * Meta lookups that survive an unexpected value.
 *
 * A row whose track or status isn't one of the known values — a restored
 * backup written by another version, a hand-edited export, a future enum —
 * used to take the whole Tracker down with "cannot read properties of
 * undefined". One malformed row must not cost the user the entire module, so
 * unknown values render in a neutral style and stay editable.
 */
const UNKNOWN_META = {
  label: "Unknown",
  dot: "bg-ink-faint",
  text: "text-ink-muted",
};
const trackMeta = (track: RoleTrack) => TRACK_META[track] ?? UNKNOWN_META;
const statusMeta = (status: ApplicationStatus) =>
  STATUS_META[status] ?? UNKNOWN_META;

type SortKey = "company" | "status" | "appliedDate" | "updatedAt";

const SAMPLE_ROWS: Parameters<typeof applicationRepo.add>[0][] = [
  {
    company: "Boeing Aerostructures",
    role: "Structures Engineering Intern",
    track: "engineering",
    status: "applied",
    appliedDate: "2026-06-18",
    notes: "Referred by Dr. Chen. Follow up mid-July.",
  },
  {
    company: "Coles",
    role: "Merchandiser",
    track: "retail",
    status: "interview-scheduled",
    appliedDate: "2026-06-25",
    notes: "Group interview Tue 10am, Chadstone.",
  },
  {
    company: "SunDrive Solar",
    role: "Mechanical R&D Intern",
    track: "engineering",
    status: "draft",
    notes: "Tailor resume to cell-manufacturing line.",
  },
  {
    company: "Crown Melbourne",
    role: "Food & Beverage Attendant",
    track: "hospitality",
    status: "applied",
    appliedDate: "2026-06-28",
    notes: "Weekend availability highlighted.",
  },
  {
    company: "Woolworths",
    role: "Nightfill Team Member",
    track: "retail",
    status: "rejected",
    appliedDate: "2026-05-30",
  },
];

export default function TrackerPage() {
  const apps = useLiveQuery(() => applicationRepo.list(), []);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [trackFilter, setTrackFilter] = useState<RoleTrack | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "updatedAt",
    dir: -1,
  });

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(
      STATUSES.map((s) => [s, 0]),
    ) as Record<ApplicationStatus, number>;
    for (const app of apps ?? []) byStatus[app.status]++;
    return byStatus;
  }, [apps]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = (apps ?? []).filter(
      (app) =>
        (trackFilter === "all" || app.track === trackFilter) &&
        (statusFilter === null || app.status === statusFilter) &&
        (query === "" ||
          `${app.company} ${app.role} ${app.notes ?? ""}`
            .toLowerCase()
            .includes(query)),
    );
    const dir = sort.dir;
    return filtered.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [apps, trackFilter, statusFilter, search, sort]);

  const total = apps?.length ?? 0;

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }));

  const addRow = async () => {
    const id = await applicationRepo.add({
      company: "",
      role: "",
      track: trackFilter === "all" ? "engineering" : trackFilter,
      status: statusFilter ?? "draft",
    });
    // On a phone a new card starts open, ready to fill in; on desktop the
    // empty row is already editable in place.
    if (window.matchMedia("(max-width: 767px)").matches)
      setExpanded((prev) => new Set(prev).add(id));
  };

  return (
    // Desktop: fills the screen and the grid scrolls inside it. Phones: the
    // page scrolls normally and the grid becomes a list of cards.
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-5 md:h-full">
      {/* ── Dashboard strip ─────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-6 gap-2 max-lg:grid-cols-3">
        <StatCard
          label="Pipeline"
          value={total}
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)}
        />
        {STATUSES.map((status) => (
          <StatCard
            key={status}
            label={statusMeta(status).label}
            value={counts[status]}
            dot={statusMeta(status).dot}
            active={statusFilter === status}
            onClick={() =>
              setStatusFilter((f) => (f === status ? null : status))
            }
          />
        ))}
      </div>

      {/* Status distribution bar */}
      {total > 0 && (
        <div className="flex h-1.5 shrink-0 overflow-hidden rounded-full bg-panel">
          {STATUSES.filter((s) => counts[s] > 0).map((status) => (
            <div
              key={status}
              title={`${statusMeta(status).label}: ${counts[status]}`}
              className={`${statusMeta(status).dot} transition-[width] duration-500 ease-out`}
              style={{ width: `${(counts[status] / total) * 100}%` }}
            />
          ))}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {/* On a phone the four tracks don't fit: scroll inside the control
            rather than pushing the whole page sideways. */}
        <div className="flex max-w-full overflow-x-auto rounded-sm border border-edge bg-panel p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              { value: "all", label: "All tracks", dot: "" },
              ...TRACKS.map((t) => ({
                value: t.value,
                label: t.label,
                dot: t.dot,
              })),
            ] as { value: RoleTrack | "all"; label: string; dot: string }[]
          ).map((t) => (
            <button
              key={t.value}
              onClick={() => setTrackFilter(t.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xs px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors max-md:min-h-9 ${
                trackFilter === t.value
                  ? "bg-raised text-accent-strong"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.dot && <span className={`size-1.5 rounded-full ${t.dot}`} />}
              {t.label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, role, notes…"
          className="w-64 rounded-sm border border-edge bg-panel px-3 py-1.5 text-xs outline-none placeholder:text-ink-faint focus:border-accent-dim max-md:min-h-11 max-md:w-full"
        />

        <button
          onClick={addRow}
          className="ml-auto rounded-sm bg-accent-dim px-3 py-1.5 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg max-md:min-h-11"
        >
          + New application
        </button>
      </div>

      {/* ── Phones: one card per application ────────────────────────── */}
      <div className="flex flex-col gap-2 md:hidden">
        {total === 0 ? (
          <div className="rounded-md border border-edge bg-surface">
            <EmptyState />
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-edge px-4 py-8 text-center text-xs text-ink-faint">
            No applications match the current filters.
          </p>
        ) : (
          rows.map((app) => (
            <PhoneCard
              key={app.id}
              app={app}
              expanded={expanded.has(app.id)}
              onToggleExpand={() => toggleExpand(app.id)}
            />
          ))
        )}
      </div>

      {/* ── The grid ────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-edge bg-surface max-md:hidden">
        {total === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-panel">
              <tr className="border-b border-edge text-left font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                <th className="w-8 border-r border-edge px-2 py-2 text-center" />
                <HeaderCell
                  label="Company"
                  sortKey="company"
                  sort={sort}
                  onSort={toggleSort}
                />
                <th className="border-r border-edge px-3 py-2 font-medium">
                  Role
                </th>
                <th className="w-28 border-r border-edge px-3 py-2 font-medium">
                  Track
                </th>
                <HeaderCell
                  label="Status"
                  sortKey="status"
                  sort={sort}
                  onSort={toggleSort}
                  width="w-36"
                />
                <HeaderCell
                  label="Applied"
                  sortKey="appliedDate"
                  sort={sort}
                  onSort={toggleSort}
                  width="w-36"
                />
                <th className="border-r border-edge px-3 py-2 font-medium">
                  Notes
                </th>
                <th className="w-9" />
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {rows.map((app) => (
                <Row
                  key={app.id}
                  app={app}
                  expanded={expanded.has(app.id)}
                  onToggleExpand={() => toggleExpand(app.id)}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-xs text-ink-faint"
                  >
                    No applications match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Status bar ──────────────────────────────────────────────── */}
      <p className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {rows.length} of {total} applications
        {statusFilter && ` · ${statusMeta(statusFilter).label}`}
        {trackFilter !== "all" &&
          ` · ${TRACKS.find((t) => t.value === trackFilter)?.label}`}
        <span className="max-md:hidden">{" · click any cell to edit"}</span>
        <span className="md:hidden">{" · tap one to edit"}</span>
      </p>
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  dot,
  active,
  onClick,
}: {
  label: string;
  value: number;
  dot?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group rounded-md border p-3 text-left transition-colors duration-150 ${
        active
          ? "border-accent-dim bg-raised"
          : "border-edge bg-panel hover:border-edge-strong hover:bg-raised"
      }`}
    >
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {dot && <span className={`size-1.5 rounded-full ${dot}`} />}
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
          active ? "text-accent-strong" : "text-ink"
        }`}
      >
        {value}
      </p>
    </button>
  );
}

function HeaderCell({
  label,
  sortKey,
  sort,
  onSort,
  width = "",
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (key: SortKey) => void;
  width?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th className={`border-r border-edge font-medium ${width}`}>
      <button
        onClick={() => onSort(sortKey)}
        className="flex w-full items-center gap-1 px-3 py-2 uppercase tracking-widest transition-colors hover:text-ink-muted"
      >
        {label}
        <span className={active ? "text-accent" : "opacity-0"}>
          {active && sort.dir === -1 ? "▼" : "▲"}
        </span>
      </button>
    </th>
  );
}

function Row({
  app,
  expanded,
  onToggleExpand,
}: {
  app: Application;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const id = app.id!;
  const commit = (patch: Parameters<typeof applicationRepo.update>[1]) =>
    applicationRepo.update(id, patch);
  /** Tints the chevron when the panel actually holds something. */
  const hasDetails = Boolean(
    app.responsibilities?.trim() ||
      app.jobDescription?.trim() ||
      app.jobUrl?.trim() ||
      app.nextAction?.trim() ||
      app.deadline ||
      app.interviewDate ||
      app.followUpDate ||
      app.submittedResume ||
      app.submittedCover,
  );

  return (
    <>
      <tr
        className={`group transition-colors hover:bg-panel ${expanded ? "bg-panel" : ""}`}
      >
        <td className="border-r border-edge p-0 text-center">
          <button
            onClick={onToggleExpand}
            title="Role responsibilities & required skills"
            className="flex h-full w-full items-center justify-center py-2.5 text-ink-faint transition-colors hover:text-accent"
          >
            <svg
              viewBox="0 0 16 16"
              className={`size-3 fill-none stroke-2 transition-transform duration-300 ${
                expanded
                  ? "rotate-90 stroke-accent"
                  : hasDetails
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
        </td>
      <td className="border-r border-edge font-medium">
        <TextCell
          value={app.company}
          placeholder="Company…"
          onCommit={(company) => commit({ company })}
        />
      </td>
      <td className="border-r border-edge">
        <TextCell
          value={app.role}
          placeholder="Role…"
          onCommit={(role) => commit({ role })}
        />
      </td>
      <td className="border-r border-edge">
        <div className="relative">
          <span
            className={`pointer-events-none absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rounded-full ${trackMeta(app.track).dot}`}
          />
          <select
            value={app.track}
            onChange={(e) => commit({ track: e.target.value as RoleTrack })}
            className={`w-full cursor-pointer appearance-none bg-transparent py-2 pr-3 pl-7 font-mono text-[11px] uppercase tracking-wider outline-none focus:bg-raised ${trackMeta(app.track).text}`}
          >
            {TRACKS.map((t) => (
              <option key={t.value} value={t.value} className="bg-panel text-ink">
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="border-r border-edge">
        <div className="relative">
          <span
            className={`pointer-events-none absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rounded-full ${statusMeta(app.status).dot}`}
          />
          <select
            value={app.status}
            // Goes through setStatus, not commit, so the change is recorded in
            // the application's history rather than silently overwriting it.
            onChange={(e) =>
              void applicationRepo.setStatus(
                id,
                e.target.value as ApplicationStatus,
              )
            }
            className={`w-full cursor-pointer appearance-none bg-transparent py-2 pl-7 pr-3 text-xs font-medium outline-none focus:bg-raised ${statusMeta(app.status).text}`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-panel text-ink">
                {statusMeta(s).label}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="border-r border-edge">
        <input
          type="date"
          value={app.appliedDate ?? ""}
          onChange={(e) =>
            commit({ appliedDate: e.target.value || undefined })
          }
          className="w-full bg-transparent px-3 py-2 font-mono text-xs text-ink-muted outline-none focus:bg-raised"
        />
      </td>
      <td className="border-r border-edge">
        <TextCell
          value={app.notes ?? ""}
          placeholder="—"
          muted
          onCommit={(notes) => commit({ notes: notes || undefined })}
        />
      </td>
      <td className="text-center">
        <button
          onClick={() => applicationRepo.remove(id)}
          title="Delete row"
          className="px-2 py-2 text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
        >
          ✕
        </button>
      </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={8} className="bg-panel p-0">
            <ApplicationDetail app={app} commit={commit} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * "Tue 24 Nov" from a stored YYYY-MM-DD, read as a local date. Built by hand:
 * locale formats vary ("Tue, Nov 24", "Sept") and the card has little room.
 */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDay = (iso?: string) => {
  const d = parseLocalDate(iso);
  return d ? `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` : null;
};

/** The one date worth showing on a phone card, most pressing first. */
function nextDate(app: Application): string | null {
  const open = app.status === "draft" || app.status === "applied" || app.status === "interview-scheduled";
  if (open && app.interviewDate) return `Interview ${shortDay(app.interviewDate)}`;
  if (open && app.deadline) return `Closes ${shortDay(app.deadline)}`;
  if (open && app.followUpDate) return `Follow up ${shortDay(app.followUpDate)}`;
  if (app.appliedDate) return `Applied ${shortDay(app.appliedDate)}`;
  return null;
}

/**
 * The Tracker below tablet width: one card per application instead of an
 * 880px spreadsheet squeezed into a phone. Tap to open the same fields the
 * row edits, then the same detail panel (dates, job ad, documents sent).
 */
function PhoneCard({
  app,
  expanded,
  onToggleExpand,
}: {
  app: Application;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const id = app.id!;
  const commit = (patch: Parameters<typeof applicationRepo.update>[1]) =>
    applicationRepo.update(id, patch);
  const status = statusMeta(app.status);
  const track = trackMeta(app.track);
  const when = nextDate(app);
  const field = "w-full rounded-sm border border-edge bg-panel px-3 py-2 text-sm outline-none focus:border-accent-dim min-h-11";
  const label = "mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint";

  return (
    <div className={`overflow-hidden rounded-md border bg-surface ${expanded ? "border-edge-strong" : "border-edge"}`}>
      <button
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-start gap-3 px-3 py-3 text-left transition-colors active:bg-raised"
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-medium ${app.company ? "" : "text-ink-faint"}`}>
            {app.company || "New application"}
          </span>
          <span className="block truncate text-xs text-ink-muted">{app.role || "Add the role"}</span>
          <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className={`size-1.5 shrink-0 rounded-full ${track.dot}`} title={track.label} />
            {/* The date matters more than the track name, which the dot's
                colour already carries; name the track only when there's no date. */}
            <span className="truncate">{when ?? track.label}</span>
          </span>
        </span>
        <span
          className={`mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-[11px] font-medium ${status.text}`}
        >
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </button>

      {expanded && (
        <div className="animate-fade-in border-t border-edge">
          <div className="grid grid-cols-2 gap-3 px-4 pt-4">
            <label className="col-span-2 block">
              <span className={label}>Company</span>
              <input key={`c${app.company}`} defaultValue={app.company} placeholder="Company…" className={field}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== app.company) void commit({ company: v }); }} />
            </label>
            <label className="col-span-2 block">
              <span className={label}>Role</span>
              <input key={`r${app.role}`} defaultValue={app.role} placeholder="Role…" className={field}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== app.role) void commit({ role: v }); }} />
            </label>
            <label className="block">
              <span className={label}>Status</span>
              <select
                value={app.status}
                // Through setStatus so the change lands in the history, as on desktop.
                onChange={(e) => void applicationRepo.setStatus(id, e.target.value as ApplicationStatus)}
                className={`${field} ${status.text}`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-panel text-ink">{statusMeta(s).label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Track</span>
              <select value={app.track} onChange={(e) => void commit({ track: e.target.value as RoleTrack })} className={field}>
                {TRACKS.map((t) => (
                  <option key={t.value} value={t.value} className="bg-panel text-ink">{t.label}</option>
                ))}
              </select>
            </label>
            {/* Applied date lives in the detail panel below, with the others. */}
            <label className="col-span-2 block">
              <span className={label}>Notes</span>
              <textarea key={`n${app.notes ?? ""}`} defaultValue={app.notes ?? ""} rows={2} placeholder="—" className={`${field} resize-y`}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== (app.notes ?? "")) void commit({ notes: v || undefined }); }} />
            </label>
          </div>
          <ApplicationDetail app={app} commit={commit} />
          <div className="flex justify-end border-t border-edge px-4 py-2">
            <button
              onClick={() => {
                if (confirm(`Delete ${app.company || "this application"}? This can't be undone.`))
                  void applicationRepo.remove(id);
              }}
              className="min-h-11 px-2 text-xs text-ink-faint transition-colors hover:text-danger"
            >
              Delete application
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TextCell({
  value,
  placeholder,
  muted,
  onCommit,
}: {
  value: string;
  placeholder: string;
  muted?: boolean;
  onCommit: (value: string) => void;
}) {
  return (
    <input
      key={value}
      defaultValue={value}
      placeholder={placeholder}
      onBlur={(e) => {
        const next = e.target.value.trim();
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = value;
          e.currentTarget.blur();
        }
      }}
      className={`w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:bg-raised ${
        muted ? "text-ink-muted" : ""
      }`}
    />
  );
}

function EmptyState() {
  return (
    <div className="grid h-full min-h-64 place-items-center">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          No applications yet
        </p>
        <p className="mt-2 max-w-xs text-sm text-ink-muted">
          Every row is editable in place — company, role, status, dates and
          notes, spreadsheet-style.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() =>
              applicationRepo.add({
                company: "",
                role: "",
                track: "engineering",
                status: "draft",
              })
            }
            className="rounded-sm bg-accent-dim px-3 py-1.5 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg"
          >
            + Add first application
          </button>
          <button
            onClick={() => SAMPLE_ROWS.forEach((r) => applicationRepo.add(r))}
            className="rounded-sm border border-edge-strong px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-accent hover:text-ink"
          >
            Load sample data
          </button>
        </div>
      </div>
    </div>
  );
}
