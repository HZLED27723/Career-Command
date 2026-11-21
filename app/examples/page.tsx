"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { achievementRepo } from "@/lib/db";
import type { Achievement } from "@/lib/types";

/**
 * The examples bank: things you've actually done, written down once and reused
 * across applications and interviews.
 *
 * Layout is a story board: the list on the left (each row shows how much of
 * the story is written), the selected example on the right in the same STAR
 * boxes as before, plus a "Read it back" view that strings the four parts
 * together and says roughly how long it takes to tell. Below `lg` it falls
 * back to the original accordion.
 *
 * The STAR fields are optional. Most people have a handful of stories they can
 * tell but not in four neat parts, and demanding the structure up front is how
 * you end up with invented detail. Fill in what's true; leave the rest.
 *
 * Nothing here is AI-generated. It's a record of the user's own experience, so
 * there is deliberately no "write this for me" button — an invented metric in
 * an interview answer is worse than no metric.
 */

type StarKey = keyof Pick<Achievement, "situation" | "task" | "action" | "result">;

const FIELDS: { key: StarKey; label: string; hint: string }[] = [
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

/** Matches Tailwind's `lg` breakpoint, where the layout splits in two. */
const WIDE_QUERY = "(min-width: 1024px)";
function useIsWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

/** Spoken pace for an interview answer: ~150 words a minute. */
const sayTime = (words: number) => {
  const s = Math.round((words / 150) * 60);
  if (s < 60) return `~${Math.max(5, Math.round(s / 5) * 5)} s`;
  return `~${(s / 60).toFixed(1).replace(/\.0$/, "")} min`;
};
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

export default function ExamplesPage() {
  const achievements = useLiveQuery(() => achievementRepo.list(), []);
  const isWide = useIsWide();
  const [draft, setDraft] = useState("");
  const [draftContext, setDraftContext] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

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

  // Desktop always shows one story; fall back to the first visible one when
  // nothing is picked or the filter hides the pick.
  const selected =
    visible.find((a) => a.id === selectedId) ?? (isWide ? visible[0] : undefined);

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
    setTagFilter(null);
    setSelectedId(id);
  };

  const total = achievements?.length ?? 0;
  const complete = (achievements ?? []).filter(
    (a) => filledCount(a) === FIELDS.length,
  ).length;

  return (
    <div className="mx-auto max-w-[1600px] p-5 lg:px-8">
      <div className="mb-5 flex items-end justify-between gap-6">
        <div>
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
        {total > 0 && (
          <div className="flex shrink-0 gap-2 max-sm:hidden">
            <Stat value={total} label={total === 1 ? "example" : "examples"} />
            <Stat value={complete} label="fully detailed" />
            <Stat value={allTags.length} label={allTags.length === 1 ? "skill" : "skills"} />
          </div>
        )}
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
          className="w-64 rounded-sm border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent-dim max-sm:w-full max-md:min-h-11"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="rounded-sm bg-accent-dim px-5 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:opacity-40 max-md:min-h-11"
        >
          Add
        </button>
      </div>

      {/* ── Tag filter ────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <TagChip active={tagFilter === null} onClick={() => setTagFilter(null)}>
            All · {total}
          </TagChip>
          {allTags.map(([tag, n]) => (
            <TagChip
              key={tag}
              active={tagFilter === tag}
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
            >
              {tag} · {n}
            </TagChip>
          ))}
        </div>
      )}

      {/* ── Story board ───────────────────────────────────────────── */}
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
        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <ul className="space-y-2">
            {visible.map((a) => {
              const isSelected = selected?.id === a.id;
              return (
                <li
                  key={a.id}
                  className={`overflow-hidden rounded-md border bg-panel transition-colors ${
                    isSelected && isWide
                      ? "border-accent-dim shadow-[inset_2px_0_0_var(--color-accent)]"
                      : "border-edge"
                  }`}
                >
                  <ExampleRow
                    item={a}
                    selected={isSelected}
                    expandable={!isWide}
                    onSelect={() =>
                      setSelectedId((cur) => (!isWide && cur === a.id ? null : a.id))
                    }
                  />
                  {!isWide && isSelected && (
                    <div className="animate-fade-in border-t border-edge px-3 py-3">
                      <StoryEditor key={a.id} item={a} />
                    </div>
                  )}
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="rounded-md border border-dashed border-edge p-6 text-center text-xs text-ink-faint">
                No examples tagged “{tagFilter}”.
              </li>
            )}
          </ul>

          {isWide && selected && (
            <div className="sticky top-5 rounded-md border border-edge bg-panel p-4">
              <StoryEditor key={selected.id} item={selected} showHeader />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

const filledCount = (a: Achievement) => FIELDS.filter((f) => a[f.key]?.trim()).length;

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-24 rounded-md border border-edge bg-panel px-3 py-2">
      <p className="font-mono text-lg leading-none font-semibold">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label}
      </p>
    </div>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-accent-dim bg-accent-dim text-accent-strong"
          : "border-edge-strong text-ink-muted hover:border-accent hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Four segments, one per STAR part, lit when that part is written. */
function StarBar({ item }: { item: Achievement }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {FIELDS.map((f) => (
        <span
          key={f.key}
          title={f.label}
          className={`h-1 w-4 rounded-full ${item[f.key]?.trim() ? "bg-accent" : "bg-edge-strong"}`}
        />
      ))}
    </span>
  );
}

function ExampleRow({
  item,
  selected,
  expandable,
  onSelect,
}: {
  item: Achievement;
  selected: boolean;
  expandable: boolean;
  onSelect: () => void;
}) {
  const filled = filledCount(item);
  return (
    <button
      onClick={onSelect}
      aria-expanded={expandable ? selected : undefined}
      aria-current={!expandable && selected ? "true" : undefined}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-raised max-md:min-h-11 ${
        selected && !expandable ? "bg-raised" : ""
      }`}
    >
      {expandable && (
        <span
          aria-hidden
          className={`font-mono text-[10px] text-ink-faint transition-transform ${selected ? "rotate-90" : ""}`}
        >
          ▶
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.title}</span>
        {(item.context || item.skillTags?.length > 0) && (
          <span className="block truncate text-[11px] text-ink-muted">
            {[item.context, item.skillTags?.slice(0, 3).join(", ")]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <StarBar item={item} />
        <span className="font-mono text-[10px] text-ink-faint">{filled}/4 detailed</span>
      </span>
    </button>
  );
}

/**
 * The selected story: the four STAR boxes, tags, evidence, and Read it back.
 * Text is held locally so Read it back follows along as you type; each field
 * saves on blur (as before) and anything unsaved is flushed on unmount, so
 * picking another story never drops a half-written box.
 */
function StoryEditor({ item, showHeader = false }: { item: Achievement; showHeader?: boolean }) {
  const [vals, setVals] = useState<Record<StarKey, string>>(() => ({
    situation: item.situation ?? "",
    task: item.task ?? "",
    action: item.action ?? "",
    result: item.result ?? "",
  }));
  const [readBack, setReadBack] = useState(false);
  const [copied, setCopied] = useState(false);

  const latest = useRef({ vals, item });
  useEffect(() => {
    latest.current = { vals, item };
  }, [vals, item]);

  const saveField = (key: StarKey, raw: string, current: Achievement) => {
    const next = raw.trim();
    if (next !== (current[key] ?? "").trim())
      void achievementRepo.update(current.id, { [key]: next || undefined });
  };

  useEffect(
    () => () => {
      const { vals: v, item: it } = latest.current;
      for (const f of FIELDS) saveField(f.key, v[f.key], it);
    },
    [],
  );

  const parts = FIELDS.map((f) => ({ ...f, text: vals[f.key].trim() }));
  const story = parts
    .filter((p) => p.text)
    .map((p) => (/[.!?]$/.test(p.text) ? p.text : `${p.text}.`))
    .join(" ");
  const words = wordCount(story);
  const missing = parts.filter((p) => !p.text).map((p) => p.label);

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-edge pb-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight">{item.title}</h3>
            {item.context && (
              <p className="truncate text-[11px] text-ink-muted">{item.context}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StarBar item={{ ...item, ...vals }} />
            <span className="font-mono text-[10px] text-ink-faint">
              {words > 0 ? `${words} words · ${sayTime(words)} to say` : "nothing written yet"}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              {f.label}
              <span className="ml-1.5 normal-case tracking-normal opacity-80">{f.hint}</span>
            </span>
            <textarea
              value={vals[f.key]}
              rows={showHeader ? 5 : 3}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              onBlur={(e) => saveField(f.key, e.target.value, item)}
              className="w-full resize-y rounded-sm border border-edge bg-surface p-2 text-xs leading-relaxed outline-none transition-colors focus:border-accent-dim"
            />
          </label>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Skill tags
          <span className="ml-1.5 normal-case tracking-normal opacity-80">comma separated</span>
        </span>
        <input
          key={`${item.id}:tags`}
          defaultValue={(item.skillTags ?? []).join(", ")}
          placeholder="teamwork, CAD, problem solving"
          onBlur={(e) => {
            const next = splitTags(e.target.value);
            if (next.join("|") !== (item.skillTags ?? []).join("|"))
              void achievementRepo.update(item.id, { skillTags: next });
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
              void achievementRepo.update(item.id, { evidence: next || undefined });
          }}
          className="w-full rounded-sm border border-edge bg-surface px-2 py-1.5 text-xs outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim max-md:min-h-11"
        />
      </label>

      {/* ── Read it back ──────────────────────────────────────────── */}
      <div className="rounded-sm border border-edge bg-surface">
        <button
          onClick={() => setReadBack((o) => !o)}
          aria-expanded={readBack}
          className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-raised max-md:min-h-11"
        >
          <span
            aria-hidden
            className={`font-mono text-[10px] text-ink-faint transition-transform ${readBack ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            Read it back
          </span>
          <span className="ml-auto font-mono text-[10px] text-ink-faint">
            {words > 0 ? `${words} words · ${sayTime(words)}` : "write a part first"}
          </span>
        </button>
        {readBack && (
          <div className="animate-fade-in border-t border-edge px-3 py-3">
            {story ? (
              <>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">{story}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {missing.length > 0 && (
                    <span className="text-[11px] text-ink-faint">
                      Not written yet: {missing.join(", ")}
                    </span>
                  )}
                  {words > 300 && (
                    <span className="text-[11px] text-warn">
                      Over two minutes out loud. Interviewers usually want under two.
                    </span>
                  )}
                  <button
                    onClick={() => {
                      void navigator.clipboard?.writeText(story).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      });
                    }}
                    className="ml-auto rounded-sm border border-edge-strong px-2 py-1 text-[11px] text-ink-muted transition-colors hover:border-accent hover:text-ink"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-faint">
                Write any of the four parts and they&apos;ll read back here as one answer.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            if (confirm(`Delete "${item.title}"? This can't be undone.`))
              void achievementRepo.remove(item.id);
          }}
          className="text-[11px] text-ink-faint transition-colors hover:text-danger"
        >
          Delete this example
        </button>
      </div>
    </div>
  );
}
