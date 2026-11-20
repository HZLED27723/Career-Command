"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { skillRepo } from "@/lib/db";
import type { RoleTrack, Skill, SkillCategory, SkillStatus } from "@/lib/types";
import { useTracks } from "@/lib/tracks";

const CATEGORIES: SkillCategory[] = [
  "engineering",
  "software",
  "fabrication",
  "interpersonal",
  "other",
];

const CATEGORY_META: Record<
  SkillCategory,
  { label: string; code: string; text: string; dot: string }
> = {
  engineering: {
    label: "Engineering & analysis",
    code: "ENG",
    text: "text-info",
    dot: "bg-info",
  },
  software: {
    label: "Software & programming",
    code: "SFT",
    text: "text-ok",
    dot: "bg-ok",
  },
  fabrication: {
    label: "Workshop & fabrication",
    code: "FAB",
    text: "text-warn",
    dot: "bg-warn",
  },
  interpersonal: {
    label: "Interpersonal & service",
    code: "INT",
    text: "text-accent",
    dot: "bg-accent",
  },
  other: {
    label: "Other",
    code: "OTH",
    text: "text-ink-faint",
    dot: "bg-ink-faint",
  },
};

/** The growth pipeline, in display order: what you have → what's next. */
const SECTIONS: {
  status: SkillStatus;
  label: string;
  hint: string;
  dot: string;
}[] = [
  {
    status: "have",
    label: "Current skill set",
    hint: "what you can do today",
    dot: "bg-ok",
  },
  {
    status: "developing",
    label: "In development",
    hint: "actively building now",
    dot: "bg-warn",
  },
  {
    status: "target",
    label: "Future targets",
    hint: "skills you want to acquire",
    dot: "bg-info",
  },
];

const STATUS_LABEL: Record<SkillStatus, string> = {
  have: "Current",
  developing: "Developing",
  target: "Target",
};

const NOTE_PLACEHOLDER: Record<SkillStatus, string> = {
  have: "evidence — where you've used it…",
  developing: "how you're building it…",
  target: "why it matters + how you'll get it…",
};

/** Sensible starting proficiency when a skill enters each status. */
const DEFAULT_LEVEL: Record<SkillStatus, number> = {
  have: 3,
  developing: 1,
  target: 0,
};

/**
 * Optional example skills — suggestions, not anyone's records. Each is tagged
 * with the tracks it suits so someone working retail isn't offered a CAD
 * pipeline, and the set shown follows the tracks chosen in onboarding.
 */
const STARTER_SKILLS: {
  name: string;
  category: SkillCategory;
  status: SkillStatus;
  level: number;
  note?: string;
  tracks: RoleTrack[];
}[] = [
  { name: "SolidWorks (CAD)", category: "engineering", status: "have", level: 4, tracks: ["engineering"] },
  { name: "Engineering drawings", category: "engineering", status: "have", level: 3, tracks: ["engineering"] },
  { name: "MATLAB", category: "software", status: "have", level: 3, tracks: ["engineering"] },
  { name: "Python", category: "software", status: "have", level: 3, tracks: ["engineering"] },
  { name: "Microsoft Excel", category: "software", status: "have", level: 4, tracks: ["engineering", "retail"] },
  { name: "3D printing (FDM)", category: "fabrication", status: "have", level: 4, tracks: ["engineering"] },
  { name: "Workshop hand tools", category: "fabrication", status: "have", level: 3, tracks: ["engineering"] },
  { name: "Customer service", category: "interpersonal", status: "have", level: 4, tracks: ["retail", "hospitality"] },
  { name: "Cash handling & POS", category: "interpersonal", status: "have", level: 3, tracks: ["retail", "hospitality"] },
  { name: "Stock control & merchandising", category: "interpersonal", status: "have", level: 3, tracks: ["retail"] },
  { name: "Working a busy service period", category: "interpersonal", status: "have", level: 3, tracks: ["hospitality"] },
  {
    name: "Teamwork under pressure",
    category: "interpersonal",
    status: "have",
    level: 4,
    tracks: ["engineering", "retail", "hospitality"],
  },
  {
    name: "FEA / simulation",
    category: "engineering",
    status: "developing",
    level: 1,
    note: "coursework + practice models",
    tracks: ["engineering"],
  },
  {
    name: "Drivetrain design",
    category: "engineering",
    status: "target",
    level: 0,
    note: "via the 15:1 cycloidal drive holiday build",
    tracks: ["engineering"],
  },
  {
    name: "GD&T / tolerancing",
    category: "engineering",
    status: "target",
    level: 0,
    note: "reading + applying real manufacturing drawings",
    tracks: ["engineering"],
  },
  { name: "CNC machining", category: "fabrication", status: "target", level: 0, tracks: ["engineering"] },
  { name: "Welding (MIG/TIG)", category: "fabrication", status: "target", level: 0, tracks: ["engineering"] },
  {
    name: "Arduino & embedded control",
    category: "software",
    status: "target",
    level: 0,
    note: "mechatronics portfolio projects",
    tracks: ["engineering"],
  },
  {
    name: "Barista skills",
    category: "interpersonal",
    status: "target",
    level: 0,
    tracks: ["hospitality"],
  },
  {
    name: "Opening / closing a store",
    category: "interpersonal",
    status: "target",
    level: 0,
    tracks: ["retail"],
  },
];

const categoryOrder = (c: SkillCategory) => CATEGORIES.indexOf(c);

export default function SkillsPage() {
  const { tracks, ready: tracksReady } = useTracks();
  const skills = useLiveQuery(() => skillRepo.list(), []);
  const [filter, setFilter] = useState<SkillCategory | "all">("all");
  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] =
    useState<SkillCategory>("engineering");
  const [draftStatus, setDraftStatus] = useState<SkillStatus>("have");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const grouped = useMemo(() => {
    const byStatus = new Map<SkillStatus, Skill[]>(
      SECTIONS.map((s) => [s.status, []]),
    );
    for (const s of skills ?? []) byStatus.get(s.status)?.push(s);
    for (const list of byStatus.values())
      list.sort(
        (a, b) =>
          categoryOrder(a.category) - categoryOrder(b.category) ||
          a.name.localeCompare(b.name),
      );
    return byStatus;
  }, [skills]);

  const countByCategory = useMemo(() => {
    const counts = new Map<SkillCategory, number>(
      CATEGORIES.map((c) => [c, 0]),
    );
    for (const s of skills ?? [])
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    return counts;
  }, [skills]);

  const addSkill = async () => {
    const name = draft.trim();
    if (!name) return;
    await skillRepo.add({
      name,
      category: draftCategory,
      status: draftStatus,
      level: DEFAULT_LEVEL[draftStatus],
    });
    setDraft("");
  };

  const total = skills?.length ?? 0;

  /** Only the examples that match the tracks this person actually works in. */
  const starterForTracks = useMemo(
    () =>
      STARTER_SKILLS.filter((s) =>
        s.tracks.some((t) => tracks.includes(t)),
      ).map((s) => ({
        name: s.name,
        category: s.category,
        status: s.status,
        level: s.level,
        note: s.note,
      })),
    [tracks],
  );

  return (
    <div className="mx-auto max-w-4xl p-5">
      {/* ── Add bar ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 max-sm:flex-col">
        <select
          value={draftCategory}
          onChange={(e) => setDraftCategory(e.target.value as SkillCategory)}
          className="w-44 cursor-pointer rounded-sm border border-edge bg-panel px-3 py-2 text-xs outline-none focus:border-accent-dim max-sm:w-full"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_META[c].label}
            </option>
          ))}
        </select>
        <select
          value={draftStatus}
          onChange={(e) => setDraftStatus(e.target.value as SkillStatus)}
          className="w-32 cursor-pointer rounded-sm border border-edge bg-panel px-3 py-2 text-xs outline-none focus:border-accent-dim max-sm:w-full"
        >
          {SECTIONS.map((s) => (
            <option key={s.status} value={s.status}>
              {STATUS_LABEL[s.status]}
            </option>
          ))}
        </select>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSkill()}
          placeholder="Add a skill — current, or one you want to build…"
          className="flex-1 rounded-sm border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent-dim"
        />
        <button
          onClick={addSkill}
          disabled={!draft.trim()}
          className="rounded-sm bg-accent-dim px-4 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {/* ── Category filter chips ───────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <FilterChip
          label={`All · ${total}`}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            label={`${CATEGORY_META[c].label} · ${countByCategory.get(c) ?? 0}`}
            dot={CATEGORY_META[c].dot}
            active={filter === c}
            onClick={() => setFilter((f) => (f === c ? "all" : c))}
          />
        ))}
      </div>

      {/* ── Pipeline sections ───────────────────────────────────────── */}
      {total === 0 ? (
        <div className="mt-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            No skills logged yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Map what you can do today and the skills you&apos;re aiming for
            next — then watch targets move through the pipeline.
          </p>
          {/* Held back until the track preference has loaded, so the count
              never briefly shows the unfiltered total. */}
          <button
            onClick={() => skillRepo.bulkAdd(starterForTracks)}
            disabled={!tracksReady}
            className="mt-4 rounded-sm bg-accent-dim px-4 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:opacity-50"
          >
            {tracksReady
              ? `Load ${starterForTracks.length} example skills`
              : "Loading examples…"}
          </button>
          <p className="mx-auto mt-2 max-w-sm text-[11px] text-ink-faint">
            (Examples for your tracks — edit or delete anything.)
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {SECTIONS.map((section) => {
            const list = (grouped.get(section.status) ?? []).filter(
              (s) => filter === "all" || s.category === filter,
            );
            return (
              <section key={section.status}>
                <div className="mb-2 flex items-baseline gap-2">
                  <span
                    className={`size-1.5 self-center rounded-full ${section.dot}`}
                  />
                  <h2 className="text-sm font-semibold">{section.label}</h2>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {list.length} · {section.hint}
                  </span>
                </div>
                <div className="divide-y divide-edge overflow-hidden rounded-md border border-edge bg-surface">
                  {list.length === 0 ? (
                    <p className="px-4 py-5 text-center text-xs text-ink-faint">
                      {section.status === "target"
                        ? "No targets yet — what's the next skill you want?"
                        : "Nothing here yet."}
                    </p>
                  ) : (
                    list.map((s) => (
                      <SkillRow
                        key={s.id}
                        skill={s}
                        open={openIds.has(s.id!)}
                        onToggle={() => toggle(s.id!)}
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

function FilterChip({
  label,
  dot,
  active,
  onClick,
}: {
  label: string;
  dot?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
        active
          ? "border-accent-dim bg-raised text-accent-strong"
          : "border-transparent text-ink-faint hover:bg-panel hover:text-ink-muted"
      }`}
    >
      {dot && <span className={`size-1.5 rounded-full ${dot}`} />}
      {label}
    </button>
  );
}

const NOTE_LABEL: Record<SkillStatus, string> = {
  have: "Evidence",
  developing: "Progress",
  target: "Why it matters & the plan",
};

/**
 * One skill — Excel-style: name is inline-editable, proficiency is set by
 * clicking the dots, and the evidence/plan note expands via a dropdown
 * (same chevron + grid-rows pattern as the tracker's responsibilities panel
 * and the interview question bank). The pipeline action moves the skill
 * target → developing → have.
 */
function SkillRow({
  skill,
  open,
  onToggle,
}: {
  skill: Skill;
  open: boolean;
  onToggle: () => void;
}) {
  const meta = CATEGORY_META[skill.category];
  const hasNote = !!skill.note?.trim();

  const saveName = (value: string) => {
    const name = value.trim();
    if (name && name !== skill.name) void skillRepo.update(skill.id, { name });
  };

  const saveNote = (value: string) => {
    const note = value.trim();
    if (note !== (skill.note ?? ""))
      void skillRepo.update(skill.id, { note: note || undefined });
  };

  return (
    <div className={`transition-colors duration-300 ${open ? "bg-panel" : ""}`}>
      <div className="group flex items-center gap-3 py-1 pr-4 max-sm:flex-wrap">
        <button
          onClick={onToggle}
          title={NOTE_LABEL[skill.status]}
          className="flex items-center px-3 py-1.5 text-ink-faint transition-colors hover:text-accent"
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

        <span
          title={meta.label}
          className={`w-8 shrink-0 font-mono text-[10px] font-semibold ${meta.text}`}
        >
          {meta.code}
        </span>

        <input
          defaultValue={skill.name}
          onBlur={(e) => saveName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-44 shrink-0 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-faint focus:text-accent-strong max-sm:w-full"
        />

        {skill.status !== "target" ? (
          <LevelDots
            level={skill.level}
            onSet={(level) => void skillRepo.update(skill.id, { level })}
          />
        ) : (
          <span className="w-[72px] shrink-0 font-mono text-[10px] uppercase tracking-widest text-info">
            planned
          </span>
        )}

        <button
          onClick={onToggle}
          className="min-w-0 flex-1 truncate text-left text-xs text-ink-faint transition-colors hover:text-ink-muted"
        >
          {hasNote ? skill.note : NOTE_PLACEHOLDER[skill.status]}
        </button>

        <span className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          {skill.status === "target" && (
            <button
              onClick={() =>
                void skillRepo.update(skill.id, {
                  status: "developing",
                  level: Math.max(skill.level, 1),
                })
              }
              className="rounded-sm border border-edge px-2 py-0.5 font-mono text-[10px] text-warn transition-colors hover:border-warn"
              title="Start developing this skill"
            >
              develop →
            </button>
          )}
          {skill.status === "developing" && (
            <button
              onClick={() => void skillRepo.update(skill.id, { status: "have" })}
              className="rounded-sm border border-edge px-2 py-0.5 font-mono text-[10px] text-ok transition-colors hover:border-ok"
              title="Mark as acquired — moves to your current skill set"
            >
              ✓ got it
            </button>
          )}
          <button
            onClick={() => void skillRepo.remove(skill.id)}
            className="text-sm leading-none text-ink-faint transition-colors hover:text-danger"
            title="Delete skill"
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
          <div className="px-4 pb-4 pl-10">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-accent">
              {NOTE_LABEL[skill.status]}
            </p>
            <textarea
              key={skill.updatedAt}
              defaultValue={skill.note ?? ""}
              placeholder={NOTE_PLACEHOLDER[skill.status]}
              rows={3}
              tabIndex={open ? 0 : -1}
              onBlur={(e) => saveNote(e.target.value)}
              className="w-full resize-y rounded-sm border border-edge bg-surface p-3 text-xs leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
            />
            <p className="mt-1.5 font-mono text-[10px] text-ink-faint">
              auto-saves on click-away
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Five clickable proficiency dots (1–5). */
function LevelDots({
  level,
  onSet,
}: {
  level: number;
  onSet: (level: number) => void;
}) {
  return (
    <span className="flex w-[72px] shrink-0 items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onSet(n)}
          title={`Proficiency ${n}/5`}
          className={`size-2 rounded-full transition-colors ${
            n <= level
              ? "bg-accent"
              : "bg-edge-strong hover:bg-ink-faint"
          }`}
        />
      ))}
    </span>
  );
}
