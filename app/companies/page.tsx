"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { companyRepo, applicationRepo } from "@/lib/db";
import type {
  Company,
  CompanyPriority,
  RoleTrack,
  Application,
  ResearchSource,
} from "@/lib/types";
import { researchCompany, ResearchNotSetupError } from "@/lib/research";

const TRACKS: { value: RoleTrack; label: string; dot: string; text: string }[] =
  [
    { value: "engineering", label: "Engineering", dot: "bg-info", text: "text-info" },
    { value: "retail", label: "Retail", dot: "bg-accent", text: "text-accent" },
    { value: "hospitality", label: "Hospitality", dot: "bg-warn", text: "text-warn" },
  ];

const PRIORITIES: {
  value: CompanyPriority;
  label: string;
  dot: string;
}[] = [
  { value: "dream", label: "Dream", dot: "bg-accent-strong" },
  { value: "target", label: "Target", dot: "bg-info" },
  { value: "backup", label: "Backup", dot: "bg-ink-muted" },
  { value: "watching", label: "Watching", dot: "bg-ink-faint" },
];

const PRIORITY_RANK: Record<CompanyPriority, number> = {
  dream: 0,
  target: 1,
  backup: 2,
  watching: 3,
};

export default function CompaniesPage() {
  const companies = useLiveQuery(() => companyRepo.list(), []);
  const apps = useLiveQuery(() => applicationRepo.list(), []);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [detailOpenMobile, setDetailOpenMobile] = useState(false);
  /** Unsaved new-company draft (see startDraft). */
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const draftRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draftOpen) draftRef.current?.focus();
  }, [draftOpen]);

  const sorted = useMemo(
    () =>
      [...(companies ?? [])].sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority ?? "target"];
        const pb = PRIORITY_RANK[b.priority ?? "target"];
        return pa !== pb ? pa - pb : a.name.localeCompare(b.name);
      }),
    [companies],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) =>
      [c.name, c.overview, c.specialisations, (c.industries ?? []).join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [sorted, query]);

  const selected = companies?.find((c) => c.id === selectedId) ?? null;

  /**
   * Adding a company opens an unsaved draft — nothing is written until the
   * name is filled in and Create is pressed. Clicking Add and changing your
   * mind used to leave a permanent blank "New company" record behind.
   */
  const startDraft = () => {
    setQuery("");
    setDraftName("");
    setDraftError(null);
    setDraftOpen(true);
  };

  const cancelDraft = () => {
    setDraftOpen(false);
    setDraftName("");
    setDraftError(null);
  };

  const createCompany = async () => {
    if (creating) return; // repeated clicks/Enter must not create duplicates
    const name = draftName.trim();
    if (!name) {
      setDraftError("Give the company a name first.");
      return;
    }
    const clash = (companies ?? []).find(
      (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (clash) {
      // Jump to the existing record rather than creating a near-duplicate.
      cancelDraft();
      setSelectedId(clash.id);
      setDetailOpenMobile(true);
      return;
    }
    setCreating(true);
    try {
      const id = await companyRepo.add({ name, priority: "target" });
      cancelDraft();
      setSelectedId(id);
      setDetailOpenMobile(true);
    } catch {
      setDraftError("Couldn't save that — try again.");
    } finally {
      setCreating(false);
    }
  };

  const open = (id: number) => {
    setSelectedId(id);
    setDetailOpenMobile(true);
  };

  return (
    <div className="flex h-full">
      {/* ── Master list ─────────────────────────────────────────────── */}
      <aside
        className={`flex w-72 shrink-0 flex-col border-r border-edge max-lg:w-64 max-md:w-full ${
          detailOpenMobile ? "max-md:hidden" : ""
        }`}
      >
        <div className="shrink-0 border-b border-edge p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                Employer Intel
              </p>
              <h2 className="text-sm font-semibold">
                Companies
                <span className="ml-1.5 font-mono text-xs font-normal text-ink-faint">
                  {sorted.length}
                </span>
              </h2>
            </div>
            <button
              onClick={startDraft}
              className="flex items-center gap-1 rounded-sm bg-accent-dim px-2.5 py-1.5 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg"
            >
              <PlusIcon /> Add
            </button>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies…"
            className="w-full rounded-sm border border-edge bg-panel px-2.5 py-1.5 text-xs outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
          />
        </div>

        {/* Unsaved draft — nothing is stored until Create */}
        {draftOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void createCompany();
            }}
            className="shrink-0 border-b border-edge bg-panel/60 p-3"
          >
            <label
              htmlFor="new-company-name"
              className="font-mono text-[10px] uppercase tracking-widest text-accent"
            >
              New company
            </label>
            <input
              id="new-company-name"
              ref={draftRef}
              value={draftName}
              onChange={(e) => {
                setDraftName(e.target.value);
                if (draftError) setDraftError(null);
              }}
              onKeyDown={(e) => e.key === "Escape" && cancelDraft()}
              placeholder="Company name"
              aria-invalid={Boolean(draftError)}
              aria-describedby={draftError ? "new-company-error" : undefined}
              className="mt-1.5 w-full rounded-sm border border-edge bg-bg px-2.5 py-1.5 text-xs outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
            />
            {draftError && (
              <p
                id="new-company-error"
                role="alert"
                className="mt-1.5 text-[11px] text-danger"
              >
                {draftError}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-sm bg-accent-dim py-1.5 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={cancelDraft}
                className="rounded-sm border border-edge-strong px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {sorted.length === 0 ? (
            <ListEmpty onAdd={startDraft} />
          ) : filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-ink-faint">
              No matches for “{query}”.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((c) => (
                <CompanyRow
                  key={c.id}
                  company={c}
                  appCount={
                    apps?.filter(
                      (a) =>
                        a.company.trim().toLowerCase() ===
                        c.name.trim().toLowerCase(),
                    ).length ?? 0
                  }
                  active={c.id === selectedId}
                  onClick={() => open(c.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Detail ──────────────────────────────────────────────────── */}
      <section
        className={`min-w-0 flex-1 overflow-y-auto max-md:w-full ${
          detailOpenMobile ? "" : "max-md:hidden"
        }`}
      >
        {selected ? (
          <CompanyDetail
            key={selected.id}
            company={selected}
            apps={apps ?? []}
            onDelete={async () => {
              await companyRepo.remove(selected.id);
              setSelectedId(null);
              setDetailOpenMobile(false);
            }}
            onBack={() => setDetailOpenMobile(false)}
          />
        ) : (
          <DetailEmpty hasCompanies={sorted.length > 0} onAdd={startDraft} />
        )}
      </section>
    </div>
  );
}

/* ── Master-list row ────────────────────────────────────────────────── */

function CompanyRow({
  company,
  appCount,
  active,
  onClick,
}: {
  company: Company;
  appCount: number;
  active: boolean;
  onClick: () => void;
}) {
  const track = TRACKS.find((t) => t.value === company.track);
  const priority = PRIORITIES.find((p) => p.value === company.priority);
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full rounded-sm border px-2.5 py-2 text-left transition-colors ${
          active
            ? "border-accent-dim bg-raised"
            : "border-transparent hover:border-edge hover:bg-panel"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 shrink-0 rounded-full ${priority?.dot ?? "bg-ink-faint"}`}
            title={priority?.label}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {company.name || "Untitled"}
          </span>
          {appCount > 0 && (
            <span className="shrink-0 rounded-full bg-panel px-1.5 font-mono text-[10px] text-ink-muted">
              {appCount} app{appCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 pl-3.5">
          {track && (
            <span className={`font-mono text-[10px] uppercase tracking-wider ${track.text}`}>
              {track.label}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[11px] text-ink-faint">
            {(company.industries ?? []).slice(0, 2).join(" · ") ||
              company.specialisations ||
              "—"}
          </span>
        </div>
      </button>
    </li>
  );
}

/* ── Detail editor ──────────────────────────────────────────────────── */

type ResearchState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "notSetup" }
  | { kind: "error"; message: string }
  | { kind: "done"; filled: number };

function CompanyDetail({
  company,
  apps,
  onDelete,
  onBack,
}: {
  company: Company;
  apps: Application[];
  onDelete: () => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<Company>(company);
  const [research, setResearch] = useState<ResearchState>({ kind: "idle" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = useRef<Partial<Company>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (Object.keys(pending.current).length) {
      companyRepo.update(company.id, pending.current);
      pending.current = {};
    }
  };

  // Persist pending edits when unmounting / switching companies.
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<Company>) => {
    setDraft((d) => ({ ...d, ...p }));
    pending.current = { ...pending.current, ...p };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  /**
   * Edit a field the AI filled. Writing over a suggestion makes it the user's
   * own words, so it stops being flagged as a suggestion.
   */
  const patchField = (key: keyof Company, value: unknown) => {
    const marked = draft.aiFilled ?? [];
    patch({
      [key]: value,
      ...(marked.includes(key as string)
        ? { aiFilled: marked.filter((k) => k !== key) }
        : {}),
    } as Partial<Company>);
  };

  const isSuggested = (key: keyof Company) =>
    (draft.aiFilled ?? []).includes(key as string);

  const runResearch = async () => {
    const website = (draft.website ?? "").trim();
    if (!website) {
      setResearch({ kind: "error", message: "Add the company website first." });
      return;
    }
    setResearch({ kind: "busy" });
    try {
      const r = await researchCompany({ name: draft.name, website });
      // Only fill sections that are currently empty — never clobber edits.
      const next: Partial<Company> = {};
      let filled = 0;
      // Which fields this lookup wrote, so the UI can mark them as AI
      // suggestions and leave everything the user typed unmarked.
      const aiFilled: string[] = [];
      const setIfEmpty = (key: keyof Company, val?: string) => {
        const cur = (draft[key] as string | undefined)?.trim();
        if (val && val.trim() && !cur) {
          (next as Record<string, unknown>)[key] = val.trim();
          aiFilled.push(key);
          filled++;
        }
      };
      setIfEmpty("overview", r.overview);
      setIfEmpty("specialisations", r.specialisations);
      setIfEmpty("notableProject", r.notableProject);
      setIfEmpty("whyInterested", r.whyInterested);
      setIfEmpty("opportunities", r.opportunities);
      setIfEmpty("talkingPoints", r.talkingPoints);
      if (r.industries?.length && !(draft.industries ?? []).length) {
        next.industries = r.industries;
        aiFilled.push("industries");
        filled++;
      }
      next.researchedAt = new Date().toISOString();
      /*
       * Left undefined when the backend didn't report sources at all — an
       * older deployed function doesn't send the field, and treating that as
       * "retrieved nothing" would be a false claim about a lookup that did
       * search. Undefined means unknown; [] means genuinely nothing found.
       */
      next.sources = r.sources;
      // Fields the user has since rewritten stop counting as AI-filled.
      next.aiFilled = [
        ...(draft.aiFilled ?? []).filter((k) => !aiFilled.includes(k)),
        ...aiFilled,
      ];
      patch(next);
      flush();
      setResearch({ kind: "done", filled });
    } catch (e) {
      if (e instanceof ResearchNotSetupError) setResearch({ kind: "notSetup" });
      else
        setResearch({
          kind: "error",
          message: e instanceof Error ? e.message : "Research failed.",
        });
    }
  };

  const linkedApps = apps.filter(
    (a) =>
      draft.name.trim() &&
      a.company.trim().toLowerCase() === draft.name.trim().toLowerCase(),
  );

  const logApplication = async () => {
    await applicationRepo.add({
      company: draft.name.trim() || "Untitled",
      role: "",
      track: draft.track ?? "engineering",
      status: "draft",
    });
  };

  return (
    <div className="mx-auto max-w-3xl p-6 max-md:p-4">
      {/* Mobile back */}
      <button
        onClick={onBack}
        className="mb-3 hidden items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink max-md:flex"
      >
        <ChevronLeftIcon /> All companies
      </button>

      {/* Header: name + priority + track */}
      <input
        value={draft.name}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder="Company name"
        className="w-full border-none bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-ink-faint"
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChipRow
          label="Priority"
          options={PRIORITIES.map((p) => ({
            value: p.value,
            label: p.label,
            dot: p.dot,
          }))}
          value={draft.priority}
          onChange={(v) => patch({ priority: v as CompanyPriority })}
        />
        <ChipRow
          label="Track"
          options={TRACKS.map((t) => ({
            value: t.value,
            label: t.label,
            dot: t.dot,
          }))}
          value={draft.track}
          onChange={(v) => patch({ track: v as RoleTrack })}
        />
      </div>

      {/* Website + AI research */}
      <div className="mt-5 rounded-lg border border-edge bg-panel/50 p-3.5">
        <div className="flex items-center gap-2 max-sm:flex-col max-sm:items-stretch">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-sm border border-edge bg-bg px-2.5">
            <GlobeIcon />
            <input
              value={draft.website ?? ""}
              onChange={(e) => patch({ website: e.target.value })}
              placeholder="company.com"
              className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none placeholder:text-ink-faint"
            />
            {draft.website?.trim() && (
              <a
                href={ensureHttp(draft.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-ink-faint transition-colors hover:text-accent"
                title="Open website"
              >
                <ExternalLinkIcon />
              </a>
            )}
          </div>
          <button
            onClick={runResearch}
            disabled={research.kind === "busy"}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-xs font-semibold text-bg transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            {research.kind === "busy" ? (
              <>
                <Spinner /> Researching…
              </>
            ) : (
              <>
                <SparkleIcon /> Research with AI
              </>
            )}
          </button>
        </div>

        {research.kind === "done" && (
          <p className="mt-2.5 text-[11px] text-accent-strong">
            {research.filled > 0
              ? `Filled ${research.filled} empty section${research.filled > 1 ? "s" : ""} — review and tweak below.`
              : "Nothing new to fill — your sections are already written."}
          </p>
        )}
        {research.kind === "error" && (
          <p className="mt-2.5 text-[11px] text-danger">{research.message}</p>
        )}
        {research.kind === "notSetup" && (
          <div className="mt-2.5 rounded-sm border border-warn/30 bg-warn/5 px-3 py-2 text-[11px] leading-relaxed text-warn">
            AI research isn&apos;t connected yet. It needs a one-time backend
            setup (an AI key on your Supabase project). Ask Claude to
            &ldquo;set up AI research&rdquo; and it&apos;ll walk you through it.
            You can still fill every section by hand below.
          </div>
        )}
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          <SparkleIcon />
          Paste a website, let AI draft every section, then make it yours.
          {draft.researchedAt && (
            <span className="text-ink-faint/70">
              · researched {relTime(draft.researchedAt)}
            </span>
          )}
        </p>
      </div>

      {/* Sections */}
      <div className="mt-5 space-y-4">
        <Section
          label="Overview"
          hint="What the company is and does"
          value={draft.overview}
          suggested={isSuggested("overview")}
          onChange={(v) => patchField("overview", v)}
        />
        <Section
          label="Specialisations"
          hint="What they're known for / specialise in"
          value={draft.specialisations}
          suggested={isSuggested("specialisations")}
          onChange={(v) => patchField("specialisations", v)}
        />

        <IndustriesField
          value={draft.industries ?? []}
          onChange={(v) => patchField("industries", v)}
        />

        <Section
          label="Notable project"
          hint="One thing you can reference in a cover letter or interview"
          value={draft.notableProject}
          suggested={isSuggested("notableProject")}
          onChange={(v) => patchField("notableProject", v)}
        />
        <Section
          label="Why I'm interested"
          hint="Your personal angle — the cover-letter hook"
          accent
          value={draft.whyInterested}
          suggested={isSuggested("whyInterested")}
          reviewNote="This is a guess at a motivation, not your motivation. Rewrite it in your own words before it goes anywhere near a cover letter — a reason you don't actually hold reads as hollow in an interview."
          onChange={(v) => patchField("whyInterested", v)}
        />
        <Section
          label="Opportunities & internships"
          hint="Open roles, program deadlines, application links"
          value={draft.opportunities}
          suggested={isSuggested("opportunities")}
          onChange={(v) => patchField("opportunities", v)}
        />
        <Section
          label="Interview talking points"
          hint="Smart things to raise when you meet them"
          value={draft.talkingPoints}
          suggested={isSuggested("talkingPoints")}
          onChange={(v) => patchField("talkingPoints", v)}
        />

        <ResearchSources
          sources={draft.sources}
          researchedAt={draft.researchedAt}
        />
      </div>

      {/* Linked applications */}
      <div className="mt-6 rounded-lg border border-edge bg-panel/40 p-3.5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Applications to this company
          </p>
          <button
            onClick={logApplication}
            className="text-[11px] font-medium text-accent transition-colors hover:text-accent-strong"
          >
            + Log application
          </button>
        </div>
        {linkedApps.length > 0 ? (
          <ul className="mt-2.5 space-y-1.5">
            {linkedApps.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 text-xs text-ink-muted"
              >
                <span className="size-1 rounded-full bg-ink-faint" />
                <span className="truncate">{a.role || "—"}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {a.status.replace("-", " ")}
                </span>
              </li>
            ))}
            <li className="pt-1">
              <Link
                href="/tracker"
                className="font-mono text-[10px] uppercase tracking-widest text-ink-faint transition-colors hover:text-accent"
              >
                Open in tracker →
              </Link>
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-[11px] text-ink-faint">
            None yet. Log one to start tracking it in your CRM.
          </p>
        )}
      </div>

      {/* Delete */}
      <div className="mt-6 flex justify-end">
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-muted">Delete this company?</span>
            <button
              onClick={onDelete}
              className="rounded-sm bg-danger/15 px-2.5 py-1 font-medium text-danger transition-colors hover:bg-danger hover:text-bg"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-ink-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-danger"
          >
            <TrashIcon /> Delete company
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Field primitives ───────────────────────────────────────────────── */

function Section({
  label,
  hint,
  value,
  onChange,
  accent,
  suggested,
  reviewNote,
}: {
  label: string;
  hint: string;
  value?: string;
  onChange: (v: string) => void;
  accent?: boolean;
  /** True when this text came from the AI lookup and hasn't been edited. */
  suggested?: boolean;
  /** Extra warning for fields that shouldn't be used as written. */
  reviewNote?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const grow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => grow(ref.current), [value]);

  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-2">
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${accent ? "text-accent" : "text-ink"}`}
        >
          {label}
        </span>
        <span className="text-[10px] text-ink-faint">{hint}</span>
        {/* Marks whose words these are. Anything the user typed stays
            unmarked; the badge clears as soon as they edit. */}
        {suggested && (
          <span className="ml-auto shrink-0 rounded-xs border border-warn/40 px-1.5 py-0.5 text-[10px] text-warn">
            AI suggestion — check it
          </span>
        )}
      </span>
      <textarea
        ref={ref}
        value={value ?? ""}
        onChange={(e) => {
          onChange(e.target.value);
          grow(e.target);
        }}
        rows={1}
        placeholder="—"
        className={`w-full resize-none overflow-hidden rounded-sm border bg-panel px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim ${
          suggested
            ? "border-warn/40"
            : accent
              ? "border-accent-dim/40"
              : "border-edge"
        }`}
      />
      {suggested && reviewNote && (
        <span className="mt-1 block text-[11px] leading-relaxed text-warn">
          {reviewNote}
        </span>
      )}
    </label>
  );
}

function IndustriesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const joined = value.join(", ");
  const [text, setText] = useState(joined);
  // Re-sync only when the committed tags actually change (e.g. AI fills them) —
  // depending on `joined` (a string), not `value` (a fresh array each render),
  // so typing isn't wiped by re-renders.
  useEffect(() => {
    setText(joined);
  }, [joined]);

  const commit = (raw: string) =>
    onChange(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );

  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink">
          Industries
        </span>
        <span className="text-[10px] text-ink-faint">Comma-separated tags</span>
      </span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        placeholder="Aerospace, Defence, Manufacturing"
        className="w-full rounded-sm border border-edge bg-panel px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
      />
      {value.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {value.map((ind) => (
            <span
              key={ind}
              className="rounded-full border border-edge bg-raised px-2 py-0.5 text-[10px] text-ink-muted"
            >
              {ind}
            </span>
          ))}
        </div>
      )}
    </label>
  );
}

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; dot: string }[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label}
      </span>
      <div className="flex gap-1">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                on
                  ? "border-accent-dim bg-raised text-ink"
                  : "border-edge text-ink-faint hover:text-ink-muted"
              }`}
            >
              <span className={`size-1.5 rounded-full ${o.dot}`} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Empty states ───────────────────────────────────────────────────── */

function ListEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-3 py-8 text-center">
      <p className="text-xs text-ink-muted">No companies yet.</p>
      <button
        onClick={onAdd}
        className="mt-2 text-xs font-medium text-accent hover:text-accent-strong"
      >
        + Add your first
      </button>
    </div>
  );
}

function DetailEmpty({
  hasCompanies,
  onAdd,
}: {
  hasCompanies: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-panel text-accent">
          <BuildingIcon />
        </div>
        <h3 className="text-sm font-semibold">
          {hasCompanies ? "Pick a company" : "Build your employer intel"}
        </h3>
        <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-ink-muted">
          {hasCompanies
            ? "Select a company on the left to see everything you've gathered."
            : "Keep a dossier on every company you're eyeing — what they do, a notable project, why you're keen — so you're ready before you apply or interview. Paste a website and let AI draft it."}
        </p>
        <button
          onClick={onAdd}
          className="mt-4 rounded-sm bg-accent-dim px-3 py-1.5 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg"
        >
          + Add a company
        </button>
      </div>
    </div>
  );
}

/* ── helpers & icons ────────────────────────────────────────────────── */

const ensureHttp = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3_600_000) return "just now";
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-[2]">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);
const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
    <path d="M12 2l1.6 4.8L18 8l-4.4 1.2L12 14l-1.6-4.8L6 8l4.4-1.2L12 2z" />
    <path d="M18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13z" />
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 fill-none stroke-current stroke-[1.6] text-ink-faint">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
  </svg>
);
const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" className="size-3 fill-none stroke-current stroke-[1.8]">
    <path d="M14 5h5v5M19 5l-8 8M11 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-[1.6]">
    <path d="M5 7h14M10 7V5h4v2m-6 0v12a1 1 0 001 1h6a1 1 0 001-1V7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-[2]">
    <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[1.5]">
    <path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 9h4a1 1 0 011 1v11M4 21h16M8 8h3M8 12h3M8 16h3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Spinner = () => (
  <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-bg/40 border-t-bg" />
);

/**
 * Where a dossier came from. Only shown once a lookup has run, and it states
 * plainly when nothing was retrieved — an unsourced dossier is model recall,
 * which is a different thing from research and shouldn't look the same.
 */
function ResearchSources({
  sources,
  researchedAt,
}: {
  sources?: ResearchSource[];
  researchedAt?: string;
}) {
  if (!researchedAt) return null;

  return (
    <div className="rounded-md border border-edge bg-panel/50 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        Sources
      </p>
      {/* Three distinct states, because conflating them would misdescribe the
          lookup: undefined = the backend didn't report sources, [] = it
          searched and found nothing, non-empty = here's where it came from. */}
      {sources === undefined ? (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
          Researched {relTime(researchedAt)}. This lookup ran before source
          tracking was added, so there&apos;s no list of what it read — re-run
          it to get one.
        </p>
      ) : sources.length === 0 ? (
        <p className="mt-1 text-[11px] leading-relaxed text-warn">
          This lookup didn&apos;t retrieve any pages, so nothing above is
          sourced — treat it as a starting point and verify anything you plan to
          rely on.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-ink-muted">
            Researched {relTime(researchedAt)} from {sources.length} page
            {sources.length === 1 ? "" : "s"}. Facts can go stale — re-run it if
            this is old.
          </p>
          <ul className="mt-1.5 space-y-1">
            {sources.map((s) => (
              <li key={s.url} className="min-w-0">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-[11px] text-info underline-offset-2 hover:underline"
                  title={s.url}
                >
                  {s.title?.trim() || s.url}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
