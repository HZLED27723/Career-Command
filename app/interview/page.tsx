"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { questionRepo } from "@/lib/db";
import {
  STAR_FIELDS,
  STAR_LABELS,
  STARTER_QUESTIONS,
  filledCount,
  promptsFor,
  type StarField,
} from "@/lib/interview";
import type { InterviewEntry, QuestionCategory } from "@/lib/types";

/**
 * The question bank. Every question gets four STAR fields (§7.17), each saved
 * on its own. Desktop is list-left / editor-right; on phones the editor opens
 * beneath the question that was tapped.
 */

const CATEGORIES: QuestionCategory[] = [
  "behavioral",
  "technical",
  "situational",
];

const CATEGORY_META: Record<
  QuestionCategory,
  { label: string; hint: string; dot: string; text: string }
> = {
  behavioral: {
    label: "Behavioral",
    hint: "Teamwork · conflict · leadership",
    dot: "bg-info",
    text: "text-info",
  },
  technical: {
    label: "Technical",
    hint: "Engineering fundamentals · projects",
    dot: "bg-ok",
    text: "text-ok",
  },
  situational: {
    label: "Situational",
    hint: "On-the-job judgement calls",
    dot: "bg-warn",
    text: "text-warn",
  },
};

/** A malformed category (hand-edited backup) must not white-screen the page. */
const categoryMeta = (c: string) =>
  CATEGORY_META[c as QuestionCategory] ?? {
    label: "Other",
    hint: "",
    dot: "bg-ink-faint",
    text: "text-ink-faint",
  };

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

export default function InterviewPage() {
  const questions = useLiveQuery(() => questionRepo.list(), []);
  const isWide = useIsWide();
  const [filter, setFilter] = useState<QuestionCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] =
    useState<QuestionCategory>("behavioral");

  const grouped = useMemo(() => {
    const byCategory = new Map<QuestionCategory, InterviewEntry[]>(
      CATEGORIES.map((c) => [c, []]),
    );
    for (const q of questions ?? []) byCategory.get(q.category)?.push(q);
    return byCategory;
  }, [questions]);

  const visibleCategories =
    filter === "all" ? CATEGORIES : ([filter] as QuestionCategory[]);
  const visible = visibleCategories.flatMap((c) => grouped.get(c) ?? []);

  // Desktop always shows an editor: the selection if it's still on screen,
  // else the first visible question. Phones only expand what was tapped.
  const selected =
    visible.find((q) => q.id === selectedId) ??
    (isWide ? visible[0] : undefined);

  const addQuestion = async () => {
    const question = draft.trim();
    if (!question) return;
    const id = await questionRepo.add({ question, category: draftCategory });
    setDraft("");
    if (filter !== "all" && filter !== draftCategory) setFilter("all");
    setSelectedId(id);
  };

  const loadStarters = () =>
    questionRepo.bulkAdd(
      STARTER_QUESTIONS.map(({ key, category, question }) => ({
        promptKey: key,
        category,
        question,
      })),
    );

  const total = questions?.length ?? 0;

  return (
    <div className="mx-auto max-w-6xl p-5">
      {/* ── Add bar ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 max-sm:flex-col">
        <select
          value={draftCategory}
          onChange={(e) =>
            setDraftCategory(e.target.value as QuestionCategory)
          }
          aria-label="Category for the new question"
          className="w-36 cursor-pointer rounded-sm border border-edge bg-panel px-3 py-2 text-xs outline-none focus:border-accent-dim max-sm:min-h-11 max-sm:w-full"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_META[c].label}
            </option>
          ))}
        </select>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuestion()}
          placeholder="Add a question you want to be ready for…"
          aria-label="New question"
          className="flex-1 rounded-sm border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent-dim max-sm:min-h-11"
        />
        <button
          onClick={addQuestion}
          disabled={!draft.trim()}
          className="rounded-sm bg-accent-dim px-4 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:cursor-not-allowed disabled:opacity-40 max-sm:min-h-11"
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
            label={`${CATEGORY_META[c].label} · ${grouped.get(c)?.length ?? 0}`}
            dot={CATEGORY_META[c].dot}
            active={filter === c}
            onClick={() => setFilter((f) => (f === c ? "all" : c))}
          />
        ))}
      </div>

      {total === 0 ? (
        <div className="mt-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Question bank is empty
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Add your own above, or start from a bank of common questions for
            both tracks.
          </p>
          <button
            onClick={() => void loadStarters()}
            className="mt-4 rounded-sm bg-accent-dim px-4 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg"
          >
            Load {STARTER_QUESTIONS.length} starter questions
          </button>
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* ── Question list, grouped by category ─────────────────── */}
          <div className="space-y-6">
            {visibleCategories.map((category) => {
              const list = grouped.get(category) ?? [];
              if (list.length === 0 && filter === "all") return null;
              return (
                <section key={category} aria-label={CATEGORY_META[category].label}>
                  <div className="mb-2 flex items-baseline gap-2">
                    <span
                      className={`size-1.5 self-center rounded-full ${CATEGORY_META[category].dot}`}
                    />
                    <h2 className="text-sm font-semibold">
                      {CATEGORY_META[category].label}
                    </h2>
                    <span className="font-mono text-[10px] text-ink-faint">
                      {list.length} · {CATEGORY_META[category].hint}
                    </span>
                  </div>
                  <div className="divide-y divide-edge overflow-hidden rounded-md border border-edge bg-surface">
                    {list.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-ink-faint">
                        Nothing here yet.
                      </p>
                    ) : (
                      list.map((q) => {
                        const isSelected = selected?.id === q.id;
                        return (
                          <div key={q.id}>
                            <QuestionRow
                              entry={q}
                              selected={isSelected}
                              expandable={!isWide}
                              onSelect={() =>
                                setSelectedId((cur) =>
                                  !isWide && cur === q.id ? null : q.id,
                                )
                              }
                            />
                            {!isWide && isSelected && (
                              <div className="border-t border-edge bg-panel px-4 pt-3 pb-4">
                                <StarEditor key={q.id} entry={q} compact />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* ── Selected question (desktop) ───────────────────────── */}
          {isWide && (
            <div className="sticky top-5">
              {selected ? (
                <div className="rounded-md border border-edge bg-surface p-5">
                  <StarEditor key={selected.id} entry={selected} />
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-edge p-8 text-center text-xs text-ink-faint">
                  No questions in this category yet.
                </p>
              )}
            </div>
          )}
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
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
        active
          ? "border-accent-dim bg-raised text-accent-strong"
          : "border-edge bg-panel text-ink-muted hover:border-edge-strong hover:text-ink"
      }`}
    >
      {dot && <span className={`size-1.5 rounded-full ${dot}`} />}
      {label}
    </button>
  );
}

/** Four pips, one per STAR field, lit when that field has text. */
function StarPips({ entry }: { entry: InterviewEntry }) {
  const n = filledCount(entry);
  return (
    <span
      className="flex shrink-0 items-center gap-1.5"
      title={`${n} of 4 STAR fields filled`}
    >
      <span aria-hidden className="flex gap-0.5">
        {STAR_FIELDS.map((f) => (
          <span
            key={f}
            className={`h-1.5 w-2.5 rounded-[1px] transition-colors duration-300 ${
              entry[f]?.trim() ? "bg-accent" : "bg-edge-strong"
            }`}
          />
        ))}
      </span>
      <span className="font-mono text-[10px] tabular-nums text-ink-faint">
        {n}/4
      </span>
    </span>
  );
}

function QuestionRow({
  entry,
  selected,
  expandable,
  onSelect,
}: {
  entry: InterviewEntry;
  selected: boolean;
  /** Phones: the row toggles an editor beneath it. */
  expandable: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-expanded={expandable ? selected : undefined}
      aria-current={!expandable && selected ? "true" : undefined}
      className={`flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        selected ? "bg-raised" : "hover:bg-panel"
      }`}
    >
      <span
        aria-hidden
        className={`h-4 w-0.5 shrink-0 rounded-full transition-colors ${
          selected ? "bg-accent" : "bg-transparent"
        }`}
      />
      <span className="min-w-0 flex-1 text-sm">
        {entry.question}
        {entry.answer?.trim() && (
          <span className="ml-2 font-mono text-[10px] text-ink-faint">
            · original answer
          </span>
        )}
      </span>
      <StarPips entry={entry} />
    </button>
  );
}

/**
 * The editor for one question. Keyed by question id by its parent, so every
 * save inside it can only ever target that question.
 */
function StarEditor({
  entry,
  compact,
}: {
  entry: InterviewEntry;
  /** Phone layout: the question is already shown in the row above. */
  compact?: boolean;
}) {
  const prompts = promptsFor(entry);
  const meta = categoryMeta(entry.category);
  const original = entry.answer?.trim();
  const n = filledCount(entry);

  const remove = () => {
    const hasWork = n > 0 || Boolean(original);
    if (
      hasWork &&
      !window.confirm(
        "Delete this question and everything written for it? This can't be undone.",
      )
    )
      return;
    void questionRepo.remove(entry.id);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${meta.text}`}
          >
            <span className={`size-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </p>
          {!compact && (
            <h2 className="mt-1.5 text-base leading-snug font-semibold">
              {entry.question}
            </h2>
          )}
        </div>
        <p className="shrink-0 font-mono text-[10px] text-ink-faint">
          {n === 4 ? "Structure complete" : `${n} of 4 filled`}
        </p>
      </div>

      {original && (
        <details className="group mt-4 rounded-sm border border-edge bg-bg/60" open>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted select-none hover:text-ink">
            Original answer
            <span className="normal-case tracking-normal text-ink-faint group-open:hidden">
              show
            </span>
            <span className="hidden normal-case tracking-normal text-ink-faint group-open:inline">
              hide
            </span>
          </summary>
          <div className="border-t border-edge px-3 py-2.5">
            <p className="max-h-48 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-ink-muted">
              {entry.answer}
            </p>
            <p className="mt-2 font-mono text-[10px] text-ink-faint">
              Kept exactly as you wrote it. Copy parts into the fields below at
              your own pace.
            </p>
          </div>
        </details>
      )}

      <div className="mt-4 space-y-4">
        {STAR_FIELDS.map((field) => (
          <StarFieldEditor
            key={field}
            entryId={entry.id}
            field={field}
            stored={entry[field] ?? ""}
            prompt={prompts[field]}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={remove}
          className="min-h-11 rounded-sm px-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint transition-colors hover:text-danger"
        >
          Delete question
        </button>
      </div>
    </div>
  );
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Autosave delay after the last keystroke. */
const SAVE_DELAY_MS = 600;

/**
 * One STAR field with its own autosave. Each save writes only this field of
 * this question, and a sequence number makes sure a slow earlier save can't
 * report "Saved" over a newer one. Pending text is flushed on blur and on
 * unmount (switching question or filter), so nothing typed is dropped.
 */
function StarFieldEditor({
  entryId,
  field,
  stored,
  prompt,
}: {
  entryId: number;
  field: StarField;
  /** The persisted value — used once, to seed the editor. */
  stored: string;
  prompt: string;
}) {
  const id = useId();
  const [value, setValue] = useState(stored);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const valueRef = useRef(stored);
  const savedRef = useRef(stored);
  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const save = useCallback(
    (next: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (next === savedRef.current) return;
      const seq = ++seqRef.current;
      if (mountedRef.current) setStatus("saving");
      questionRepo
        .update(entryId, { [field]: next })
        .then((updated) => {
          if (!updated) throw new Error("Question no longer exists");
          if (seq !== seqRef.current) return;
          savedRef.current = next;
          if (mountedRef.current) setStatus("saved");
        })
        .catch(() => {
          if (seq === seqRef.current && mountedRef.current) setStatus("error");
        });
    },
    [entryId, field],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Flush anything still waiting on the debounce.
      if (timerRef.current) save(valueRef.current);
    };
  }, [save]);

  const onChange = (next: string) => {
    setValue(next);
    valueRef.current = next;
    if (status === "saved" || status === "error") setStatus("idle");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(next), SAVE_DELAY_MS);
  };

  const label = STAR_LABELS[field];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <SaveIndicator status={status} onRetry={() => save(valueRef.current)} />
      </div>
      <p id={`${id}-prompt`} className="mt-0.5 text-xs leading-relaxed text-ink-muted">
        {prompt}
      </p>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => save(valueRef.current)}
        aria-describedby={`${id}-prompt`}
        rows={field === "action" ? 6 : 3}
        className={`mt-1.5 w-full resize-y rounded-sm border bg-bg p-3 text-sm leading-relaxed outline-none placeholder:text-ink-faint focus:border-accent-dim ${
          status === "error" ? "border-danger/60" : "border-edge"
        }`}
      />
    </div>
  );
}

function SaveIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  if (status === "error")
    return (
      <span role="alert" className="flex items-center gap-2 font-mono text-[10px] text-danger">
        Couldn&apos;t save
        <button
          onClick={onRetry}
          className="rounded-sm border border-danger/50 px-2 py-0.5 uppercase tracking-widest transition-colors hover:bg-danger/10"
        >
          Retry
        </button>
      </span>
    );
  return (
    <span
      aria-live="polite"
      className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint"
    >
      {status === "saving" && (
        <>
          <span className="size-1.5 animate-pulse-soft rounded-full bg-warn" />
          Saving
        </>
      )}
      {status === "saved" && (
        <>
          <span className="size-1.5 rounded-full bg-accent" />
          Saved
        </>
      )}
    </span>
  );
}
