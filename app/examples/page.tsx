"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { achievementRepo } from "@/lib/db";
import type { Achievement } from "@/lib/types";

/**
 * The examples bank: things you've actually done, written down once and reused
 * across applications and interviews.
 *
 * The STAR fields are optional. Most people have a handful of stories they can
 * tell but not in four neat parts, and demanding the structure up front is how
 * you end up with invented detail. Fill in what's true; leave the rest.
 *
 * Nothing here is AI-generated. It's a record of the user's own experience, so
 * there is deliberately no "write this for me" button — an invented metric in
 * an interview answer is worse than no metric.
 */

const FIELDS: {
  key: keyof Pick<Achievement, "situation" | "task" | "action" | "result">;
  label: string;
  hint: string;
}[] = [
  {
    key: "situation",
    label: "Situation",
    hint: "where you were and what was going on",
  },
  { key: "task", label: "Task", hint: "what you were responsible for" },
  { key: "action", label: "Action", hint: "what you actually did" },
  { key: "result", label: "Result", hint: "how it turned out" },
];

const splitTags = (raw: string) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export default function ExamplesPage() {
  const achievements = useLiveQuery(() => achievementRepo.list(), []);
  const [draft, setDraft] = useState("");
  const [draftContext, setDraftContext] = useState("");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const toggle = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of achievements ?? [])
      for (const t of a.skillTags ?? [])
        counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [achievements]);

  const visible = useMemo(() => {
    const list = [...(achievements ?? [])].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
    return tagFilter
      ? list.filter((a) => (a.skillTags ?? []).includes(tagFilter))
      : list;
  }, [achievements, tagFilter]);

  const add = async () => {
    const title = draft.trim();
    if (!title) return;
    const id = await achievementRepo.add({
      title,
      context: draftContext.trim() || undefined,
      skillTags: [],
    });
    setDraft("");
    setDraftContext("");
    setOpenIds((prev) => new Set(prev).add(id));
  };

  const total = achievements?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl p-5">
      <div className="mb-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          Your evidence
        </p>
        <h2 className="mt-0.5 text-xl font-semibold tracking-tight">Examples</h2>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
          Write up a project or work situation once, then reuse it wherever it
          fits. Tag each one with the skills it demonstrates so you can find the
          right story fast.
        </p>
      </div>

      {/* ── Add bar ───────────────────────────────────────────────── */}
      <div className="flex gap-2 max-sm:flex-col">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="What did you do? e.g. Redesigned the gearbox mount"
          aria-label="Example title"
          className="flex-1 rounded-sm border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent-dim max-md:min-h-11"
        />
        <input
          value={draftContext}
          onChange={(e) => setDraftContext(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Where? job, unit, club…"
          aria-label="Where it happened"
          className="w-52 rounded-sm border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent-dim max-sm:w-full max-md:min-h-11"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="rounded-sm bg-accent-dim px-4 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:opacity-40 max-md:min-h-11"
        >
          Add
        </button>
      </div>

      {/* ── Tag filter ────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTagFilter(null)}
            className={`rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors ${
              tagFilter === null
                ? "border-accent-dim bg-accent-dim text-accent-strong"
                : "border-edge-strong text-ink-muted hover:border-accent hover:text-ink"
            }`}
          >
            All · {total}
          </button>
          {allTags.map(([tag, n]) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
              className={`rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors ${
                tagFilter === tag
                  ? "border-accent-dim bg-accent-dim text-accent-strong"
                  : "border-edge-strong text-ink-muted hover:border-accent hover:text-ink"
              }`}
            >
              {tag} · {n}
            </button>
          ))}
        </div>
      )}

      {/* ── List ──────────────────────────────────────────────────── */}
      {total === 0 ? (
        <div className="mt-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            No examples yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Start with the thing you&apos;d mention first in an interview. One
            line is enough — you can fill in the detail later.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((a) => (
            <ExampleCard
              key={a.id}
              item={a}
              open={openIds.has(a.id)}
              onToggle={() => toggle(a.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ExampleCard({
  item,
  open,
  onToggle,
}: {
  item: Achievement;
  open: boolean;
  onToggle: () => void;
}) {
  const save = (patch: Partial<Achievement>) =>
    achievementRepo.update(item.id, patch);

  const filled = FIELDS.filter((f) => item[f.key]?.trim()).length;

  return (
    <li className="overflow-hidden rounded-md border border-edge bg-panel">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-raised max-md:min-h-11"
      >
        <span
          aria-hidden
          className={`font-mono text-[10px] text-ink-faint transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {item.title}
          </span>
          {item.context && (
            <span className="block truncate text-[11px] text-ink-muted">
              {item.context}
            </span>
          )}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-ink-faint">
          {filled}/4 detailed
        </span>
      </button>

      {open && (
        <div className="animate-fade-in space-y-3 border-t border-edge px-3 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                  {f.label}
                  <span className="ml-1.5 normal-case tracking-normal opacity-80">
                    {f.hint}
                  </span>
                </span>
                <textarea
                  key={`${item.id}:${f.key}`}
                  defaultValue={item[f.key] ?? ""}
                  rows={3}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next !== (item[f.key] ?? "").trim())
                      save({ [f.key]: next || undefined });
                  }}
                  className="w-full resize-y rounded-sm border border-edge bg-surface p-2 text-xs leading-relaxed outline-none transition-colors focus:border-accent-dim"
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Skill tags
              <span className="ml-1.5 normal-case tracking-normal opacity-80">
                comma separated
              </span>
            </span>
            <input
              key={`${item.id}:tags`}
              defaultValue={(item.skillTags ?? []).join(", ")}
              placeholder="teamwork, CAD, problem solving"
              onBlur={(e) => {
                const next = splitTags(e.target.value);
                if (next.join("|") !== (item.skillTags ?? []).join("|"))
                  save({ skillTags: next });
              }}
              className="w-full rounded-sm border border-edge bg-surface px-2 py-1.5 text-xs outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim max-md:min-h-11"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Evidence
              <span className="ml-1.5 normal-case tracking-normal opacity-80">
                a link, a report, someone who saw it
              </span>
            </span>
            <input
              key={`${item.id}:evidence`}
              defaultValue={item.evidence ?? ""}
              placeholder="github.com/… · unit report · supervisor's name"
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next !== (item.evidence ?? "").trim())
                  save({ evidence: next || undefined });
              }}
              className="w-full rounded-sm border border-edge bg-surface px-2 py-1.5 text-xs outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim max-md:min-h-11"
            />
          </label>

          <div className="flex justify-end">
            <button
              onClick={() => {
                if (
                  confirm(
                    `Delete "${item.title}"? This can't be undone.`,
                  )
                )
                  void achievementRepo.remove(item.id);
              }}
              className="text-[11px] text-ink-faint transition-colors hover:text-danger"
            >
              Delete this example
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
