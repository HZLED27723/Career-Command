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
import {
  researchCompany,
  shortenCompany,
  ResearchNotSetupError,
} from "@/lib/research";
import { monogram, monogramColour } from "@/lib/credentials";

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
      [c.name, c.tagline, c.overview, c.specialisations, (c.industries ?? []).join(" "), (c.knownFor ?? []).join(" ")]
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
        className={`flex w-72 shrink-0 flex-col border-r border-edge max-lg:w-full ${
          detailOpenMobile ? "max-lg:hidden" : ""
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
        className={`min-w-0 flex-1 overflow-y-auto max-lg:w-full ${
          detailOpenMobile ? "" : "max-lg:hidden"
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
            onBack={() => {
              setDetailOpenMobile(false);
              setSelectedId(null);
            }}
          />
        ) : sorted.length > 0 ? (
          <ShortlistOverview companies={sorted} apps={apps ?? []} onOpen={open} />
        ) : (
          <DetailEmpty hasCompanies={false} onAdd={startDraft} />
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
            {company.tagline?.trim() ||
              (company.industries ?? []).slice(0, 2).join(" · ") ||
              company.specialisations ||
              "—"}
          </span>
        </div>
      </button>
    </li>
  );
}

/* ── Detail: the at-a-glance dossier (§7.21) ───────────────────────── */

type ResearchState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "shortening" }
  | { kind: "notSetup" }
  | { kind: "error"; message: string }
  | { kind: "done"; filled: number }
  | { kind: "shortened"; filled: number };

type TileKey = "about" | "known" | "hook" | "angle" | "open" | "points";
const TILE_KEYS: TileKey[] = ["about", "known", "hook", "angle", "open", "points"];

/** Short field → the long field it condenses. */
const SHORT_OF = {
  tagline: "overview",
  knownFor: "specialisations",
  hook: "notableProject",
  angleShort: "whyInterested",
  roleShort: "opportunities",
} as const;

/** First sentence of a long field, for tiles that have no short version yet. */
function excerpt(text?: string, max = 120): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const m = /^(.+?[.!?])(\s|$)/.exec(t);
  const first = m ? m[1] : t;
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

/** Talking points are stored as one block; show them as separate lines. */
const splitPoints = (text?: string) =>
  (text ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

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
  const [open, setOpen] = useState<Set<TileKey>>(new Set());
  const [copied, setCopied] = useState(false);
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

  const isSuggested = (...keys: (keyof Company)[]) =>
    keys.some((k) => (draft.aiFilled ?? []).includes(k as string));

  const toggle = (k: TileKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const allOpen = TILE_KEYS.every((k) => open.has(k));

  /**
   * Fill only what's empty — never clobber edits — and mark what was filled
   * so the UI can flag it as an AI suggestion.
   */
  const fillEmpty = (r: Record<string, unknown>, keys: (keyof Company)[]) => {
    const next: Partial<Company> = {};
    const aiFilled: string[] = [];
    for (const key of keys) {
      const val = r[key];
      const cur = draft[key];
      if (Array.isArray(val)) {
        const tags = val.map((v) => String(v).trim()).filter(Boolean);
        if (tags.length && !(Array.isArray(cur) && cur.length)) {
          (next as Record<string, unknown>)[key] = tags;
          aiFilled.push(key);
        }
      } else if (typeof val === "string" && val.trim() && !(typeof cur === "string" && cur.trim())) {
        (next as Record<string, unknown>)[key] = val.trim();
        aiFilled.push(key);
      }
    }
    next.aiFilled = [
      ...(draft.aiFilled ?? []).filter((k) => !aiFilled.includes(k)),
      ...aiFilled,
    ];
    return { next, filled: aiFilled.length };
  };

  const runResearch = async () => {
    const website = (draft.website ?? "").trim();
    if (!website) {
      setResearch({ kind: "error", message: "Add the company website first." });
      return;
    }
    setResearch({ kind: "busy" });
    try {
      const r = await researchCompany({ name: draft.name, website });
      const { next, filled } = fillEmpty(r as Record<string, unknown>, [
        "overview",
        "specialisations",
        "industries",
        "notableProject",
        "whyInterested",
        "opportunities",
        "talkingPoints",
        "tagline",
        "knownFor",
        "hook",
        "angleShort",
        "roleShort",
      ]);
      next.researchedAt = new Date().toISOString();
      /*
       * Left undefined when the backend didn't report sources at all — an
       * older deployed function doesn't send the field, and treating that as
       * "retrieved nothing" would be a false claim about a lookup that did
       * search. Undefined means unknown; [] means genuinely nothing found.
       */
      next.sources = r.sources;
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

  /** Short fields that are empty while their long field has text. */
  const missingShort = (Object.keys(SHORT_OF) as (keyof typeof SHORT_OF)[]).filter(
    (s) => {
      const cur = draft[s];
      const empty = Array.isArray(cur) ? cur.length === 0 : !cur?.trim();
      return empty && Boolean(draft[SHORT_OF[s]]?.trim());
    },
  );

  const runShorten = async () => {
    setResearch({ kind: "shortening" });
    try {
      const r = await shortenCompany({
        name: draft.name,
        notes: {
          overview: draft.overview,
          specialisations: draft.specialisations,
          notableProject: draft.notableProject,
          whyInterested: draft.whyInterested,
          opportunities: draft.opportunities,
        },
      });
      // A function deployed before shorten mode ignores it and returns none
      // of these keys — say so instead of reporting "nothing to fill".
      if (!["tagline", "knownFor", "hook", "angleShort", "roleShort"].some((k) => k in r)) {
        setResearch({
          kind: "error",
          message:
            "The research function on your Supabase project needs updating before it can shorten (see DEPLOY.md).",
        });
        return;
      }
      const { next, filled } = fillEmpty(r as Record<string, unknown>, missingShort);
      patch(next);
      flush();
      setResearch({ kind: "shortened", filled });
    } catch (e) {
      if (e instanceof ResearchNotSetupError) setResearch({ kind: "notSetup" });
      else
        setResearch({
          kind: "error",
          message: e instanceof Error ? e.message : "Shorten failed.",
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
      role: draft.roleShort?.trim() ?? "",
      track: draft.track ?? "engineering",
      status: "draft",
    });
  };

  const points = splitPoints(draft.talkingPoints);
  const copyPoints = async () => {
    try {
      await navigator.clipboard.writeText(points.map((p, i) => `${i + 1}. ${p}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the text is still on screen to select */
    }
  };

  const tagline = draft.tagline?.trim() || excerpt(draft.overview);
  const known = draft.knownFor ?? [];
  const hook = draft.hook?.trim() || excerpt(draft.notableProject, 90);
  const angle = draft.angleShort?.trim() || excerpt(draft.whyInterested, 90);
  const role = draft.roleShort?.trim() || excerpt(draft.opportunities, 90);
  const busy = research.kind === "busy" || research.kind === "shortening";

  return (
    <div className="mx-auto max-w-3xl p-6 max-md:p-4">
      {/* Back: to the list on phones, to the shortlist overview on desktop */}
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronLeftIcon />
        <span className="lg:hidden">All companies</span>
        <span className="max-lg:hidden">Shortlist overview</span>
      </button>

      {/* ── Header: who they are, in one line ─────────────────────── */}
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-lg font-mono text-sm font-semibold text-mist ring-1 ring-edge-strong"
          style={{ backgroundColor: monogramColour(draft.name) }}
        >
          {monogram(draft.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Company name"
              aria-label="Company name"
              className="min-w-0 flex-1 border-none bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-ink-faint"
            />
            {draft.website?.trim() && (
              <a
                href={ensureHttp(draft.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-ink-faint transition-colors hover:text-accent"
                title="Open website"
                aria-label="Open website"
              >
                <ExternalLinkIcon />
              </a>
            )}
          </div>
          <button
            onClick={() => toggle("about")}
            aria-expanded={open.has("about")}
            className="mt-0.5 block max-w-full text-left text-sm text-ink-muted transition-colors hover:text-ink"
          >
            {tagline || <span className="text-ink-faint">Add a one-line summary…</span>}
          </button>
          {(draft.industries ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(draft.industries ?? []).slice(0, 4).map((ind) => (
                <span key={ind} className="rounded-full border border-edge bg-raised px-2 py-0.5 text-[10px] text-ink-muted">
                  {ind}
                </span>
              ))}
              {(draft.industries ?? []).length > 4 && (
                <span className="px-1 py-0.5 text-[10px] text-ink-faint">
                  +{(draft.industries ?? []).length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChipRow
          label="Priority"
          options={PRIORITIES.map((p) => ({ value: p.value, label: p.label, dot: p.dot }))}
          value={draft.priority}
          onChange={(v) => patch({ priority: v as CompanyPriority })}
        />
        <ChipRow
          label="Track"
          options={TRACKS.map((t) => ({ value: t.value, label: t.label, dot: t.dot }))}
          value={draft.track}
          onChange={(v) => patch({ track: v as RoleTrack })}
        />
      </div>

      {/* ── Research: one compact bar ──────────────────────────────── */}
      <div className="mt-4 rounded-lg border border-edge bg-panel/50 p-2.5">
        <div className="flex items-center gap-2 max-sm:flex-col max-sm:items-stretch">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-sm border border-edge bg-bg px-2.5">
            <GlobeIcon />
            <input
              value={draft.website ?? ""}
              onChange={(e) => patch({ website: e.target.value })}
              placeholder="company.com"
              aria-label="Company website"
              className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none placeholder:text-ink-faint"
            />
          </div>
          {missingShort.length > 0 && (
            <button
              onClick={runShorten}
              disabled={busy}
              title="Condense what's already written into the short tiles — no new facts"
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-sm border border-edge-strong px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink disabled:opacity-60"
            >
              {research.kind === "shortening" ? <Spinner light /> : <SparkleIcon />} Shorten
            </button>
          )}
          <button
            onClick={runResearch}
            disabled={busy}
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
        <p className="mt-2 px-0.5 text-[11px] text-ink-faint">
          {research.kind === "done"
            ? research.filled > 0
              ? <span className="text-accent-strong">Filled {research.filled} empty section{research.filled > 1 ? "s" : ""} — review the tiles below.</span>
              : "Nothing new to fill — your sections are already written."
            : research.kind === "shortened"
              ? <span className="text-accent-strong">Shortened {research.filled} tile{research.filled === 1 ? "" : "s"} from what you&apos;d written.</span>
              : research.kind === "error"
                ? <span className="text-danger">{research.message}</span>
                : research.kind === "notSetup"
                  ? <span className="text-warn">AI research isn&apos;t connected yet — every tile can still be filled by hand.</span>
                  : draft.researchedAt
                    ? `Researched ${relTime(draft.researchedAt)} · AI only fills empty sections, never your edits.`
                    : "Paste a website and AI drafts every section. It only fills what's empty."}
        </p>
      </div>

      {/* ── The glance ─────────────────────────────────────────────── */}
      <div className="mt-5 mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          At a glance
        </p>
        <button
          onClick={() => setOpen(allOpen ? new Set() : new Set(TILE_KEYS))}
          className="font-mono text-[10px] uppercase tracking-widest text-ink-faint transition-colors hover:text-accent"
        >
          {allOpen ? "Collapse all" : "Full write-up"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {open.has("about") && (
          <GlanceTile
            label="About"
            open
            suggested={isSuggested("tagline", "overview", "industries")}
            onToggle={() => toggle("about")}
            preview={null}
          >
            <ShortField
              label="One-line summary"
              hint="Up to 10 words"
              value={draft.tagline}
              placeholder={excerpt(draft.overview) || "What the company is"}
              onChange={(v) => patchField("tagline", v)}
            />
            <Section
              label="Overview"
              hint="What the company is and does"
              value={draft.overview}
              suggested={isSuggested("overview")}
              onChange={(v) => patchField("overview", v)}
            />
            <TagsField
              label="Industries"
              hint="Comma-separated tags"
              placeholder="Aerospace, Defence, Manufacturing"
              value={draft.industries ?? []}
              onChange={(v) => patchField("industries", v)}
            />
          </GlanceTile>
        )}

        <GlanceTile
          label="Known for"
          open={open.has("known")}
          suggested={isSuggested("knownFor", "specialisations")}
          onToggle={() => toggle("known")}
          preview={
            known.length ? (
              <div className="flex flex-wrap gap-1.5">
                {known.map((k) => (
                  <span key={k} className="rounded-full border border-edge bg-raised px-2 py-0.5 text-[11px] text-ink">
                    {k}
                  </span>
                ))}
              </div>
            ) : (
              <Excerpt text={excerpt(draft.specialisations, 100)} empty="What they're known for" />
            )
          }
        >
          <TagsField
            label="Tags"
            hint="2–4 short tags"
            placeholder="Cataract surgery, Lasers, Lenses"
            value={known}
            onChange={(v) => patchField("knownFor", v)}
          />
          <Section
            label="Specialisations"
            hint="Full write-up"
            value={draft.specialisations}
            suggested={isSuggested("specialisations")}
            onChange={(v) => patchField("specialisations", v)}
          />
        </GlanceTile>

        <GlanceTile
          label="Drop this in"
          open={open.has("hook")}
          suggested={isSuggested("hook", "notableProject")}
          onToggle={() => toggle("hook")}
          preview={
            hook ? (
              <p className={draft.hook?.trim() ? "text-base leading-snug font-semibold" : "line-clamp-2 text-sm text-ink"}>
                {hook}
              </p>
            ) : (
              <Excerpt text="" empty="One fact worth mentioning" />
            )
          }
        >
          <ShortField
            label="The fact"
            hint="Up to 8 words"
            value={draft.hook}
            placeholder={excerpt(draft.notableProject, 60) || "$876M on R&D in 2024"}
            onChange={(v) => patchField("hook", v)}
          />
          <Section
            label="Notable project"
            hint="Full write-up"
            value={draft.notableProject}
            suggested={isSuggested("notableProject")}
            onChange={(v) => patchField("notableProject", v)}
          />
        </GlanceTile>

        <GlanceTile
          label="Your angle"
          accent
          open={open.has("angle")}
          suggested={isSuggested("angleShort", "whyInterested")}
          onToggle={() => toggle("angle")}
          preview={
            angle ? (
              <p className={draft.angleShort?.trim() ? "text-base leading-snug font-semibold" : "line-clamp-2 text-sm text-ink"}>
                {angle}
              </p>
            ) : (
              <Excerpt text="" empty="Why you want to work here" />
            )
          }
        >
          <ShortField
            label="In a line"
            hint="Up to 10 words, your words"
            value={draft.angleShort}
            placeholder={excerpt(draft.whyInterested, 60) || "Why them, in one line"}
            onChange={(v) => patchField("angleShort", v)}
          />
          <Section
            label="Why I'm interested"
            hint="Full write-up"
            accent
            value={draft.whyInterested}
            suggested={isSuggested("whyInterested")}
            reviewNote="This is a guess at a motivation, not your motivation. Rewrite it in your own words before it goes anywhere near a cover letter — a reason you don't actually hold reads as hollow in an interview."
            onChange={(v) => patchField("whyInterested", v)}
          />
        </GlanceTile>

        <GlanceTile
          label="Open now"
          open={open.has("open")}
          suggested={isSuggested("roleShort", "opportunities")}
          onToggle={() => toggle("open")}
          preview={
            role ? (
              <p className={draft.roleShort?.trim() ? "text-base leading-snug font-semibold" : "line-clamp-2 text-sm text-ink"}>
                {role}
              </p>
            ) : (
              <Excerpt text="" empty="Roles and programs" />
            )
          }
          footer={
            linkedApps.length > 0 ? (
              <Link href="/tracker" className="font-mono text-[10px] uppercase tracking-widest text-ink-muted transition-colors hover:text-accent">
                In tracker · {linkedApps[0].status.replace("-", " ")} →
              </Link>
            ) : (
              <button
                onClick={logApplication}
                className="text-[11px] font-medium text-accent transition-colors hover:text-accent-strong"
              >
                + Add to tracker
              </button>
            )
          }
        >
          <ShortField
            label="The role"
            hint="Up to 8 words"
            value={draft.roleShort}
            placeholder={excerpt(draft.opportunities, 60) || "Summer internship · closes Aug"}
            onChange={(v) => patchField("roleShort", v)}
          />
          <Section
            label="Opportunities & internships"
            hint="Full write-up — programs, deadlines, links"
            value={draft.opportunities}
            suggested={isSuggested("opportunities")}
            onChange={(v) => patchField("opportunities", v)}
          />
        </GlanceTile>
      </div>

      {/* ── Talking points, one per line ──────────────────────────── */}
      <div className="mt-3 rounded-lg border border-edge bg-panel p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Talking points
            {isSuggested("talkingPoints") && <AiBadge />}
          </span>
          <span className="flex items-center gap-3">
            {points.length > 0 && (
              <button onClick={copyPoints} className="font-mono text-[10px] uppercase tracking-widest text-ink-faint transition-colors hover:text-accent">
                {copied ? "Copied" : "Copy all"}
              </button>
            )}
            <button
              onClick={() => toggle("points")}
              aria-expanded={open.has("points")}
              className="font-mono text-[10px] uppercase tracking-widest text-ink-faint transition-colors hover:text-accent"
            >
              {open.has("points") ? "Done" : "Edit"}
            </button>
          </span>
        </div>
        {open.has("points") ? (
          <div className="mt-2">
            <Section
              label="One per line"
              hint="Each line becomes a point"
              value={draft.talkingPoints}
              suggested={isSuggested("talkingPoints")}
              onChange={(v) => patchField("talkingPoints", v)}
            />
          </div>
        ) : points.length > 0 ? (
          <ol className="mt-1">
            {points.map((p, i) => (
              <li key={i} className="flex gap-3 border-t border-edge py-2 text-sm leading-snug first:border-t-0">
                <span className="pt-0.5 font-mono text-[10px] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">{p}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-ink-faint">Things to raise when you meet them — research fills these, or add your own.</p>
        )}
      </div>

      <div className="mt-3">
        <ResearchSources sources={draft.sources} researchedAt={draft.researchedAt} />
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
              <li key={a.id} className="flex items-center gap-2 text-xs text-ink-muted">
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

/* ── Glance pieces ──────────────────────────────────────────────────── */

const AiBadge = () => (
  <span className="rounded-xs border border-warn/40 px-1.5 py-px text-[10px] normal-case tracking-normal text-warn">
    AI draft
  </span>
);

/**
 * One tile: a short preview that opens, in place and full width, to the short
 * version and the full write-up — both editable.
 */
function GlanceTile({
  label,
  preview,
  children,
  footer,
  open,
  onToggle,
  suggested,
  accent,
}: {
  label: string;
  preview: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  suggested?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border bg-panel transition-colors ${
        open ? "border-accent-dim sm:col-span-2" : "border-edge hover:border-edge-strong"
      }`}
    >
      <button onClick={onToggle} aria-expanded={open} className="w-full p-3.5 text-left">
        <span className="flex items-center justify-between gap-2">
          <span className={`font-mono text-[10px] uppercase tracking-widest ${accent ? "text-accent" : "text-ink-faint"}`}>
            {label}
          </span>
          <span className="flex items-center gap-2">
            {suggested && <AiBadge />}
            <svg viewBox="0 0 24 24" aria-hidden className={`size-3.5 fill-none stroke-ink-faint stroke-2 transition-transform ${open ? "rotate-180" : ""}`}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
        {preview && <span className="mt-2 block">{preview}</span>}
      </button>
      {footer && !open && <div className="-mt-1 px-3.5 pb-3">{footer}</div>}
      {open && (
        <div className="animate-fade-in space-y-3 border-t border-edge p-3.5">
          {children}
          {footer && <div>{footer}</div>}
        </div>
      )}
    </div>
  );
}

/** A long field's first sentence standing in for a missing short version. */
function Excerpt({ text, empty }: { text: string; empty: string }) {
  return text ? (
    <p className="line-clamp-2 text-sm text-ink">{text}</p>
  ) : (
    <p className="text-sm text-ink-faint">{empty} — add it</p>
  );
}

function ShortField({
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  hint: string;
  value?: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink">{label}</span>
        <span className="text-[10px] text-ink-faint">{hint}</span>
      </span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-sm border border-edge bg-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
      />
    </label>
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

function TagsField({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
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
          {label}
        </span>
        <span className="text-[10px] text-ink-faint">{hint}</span>
      </span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        placeholder={placeholder}
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
      <div className="flex flex-wrap gap-1">
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

/* ── Shortlist overview (nothing selected) ──────────────────────────── */

const APP_STATUS: Record<Application["status"], { label: string; text: string; dot: string }> = {
  draft: { label: "Draft", text: "text-ink-muted", dot: "bg-ink-faint" },
  applied: { label: "Applied", text: "text-info", dot: "bg-info" },
  "interview-scheduled": { label: "Interview", text: "text-warn", dot: "bg-warn" },
  "offer-extended": { label: "Offer", text: "text-ok", dot: "bg-ok" },
  rejected: { label: "Rejected", text: "text-danger", dot: "bg-danger" },
};

const sameCompany = (a: Application, c: Company) =>
  a.company.trim().toLowerCase() === c.name.trim().toLowerCase();

const isResearched = (c: Company) =>
  Boolean(c.tagline?.trim() || c.overview?.trim() || c.researchedAt);

/** The application that best describes where things stand with a company. */
function latestApp(apps: Application[], c: Company): Application | undefined {
  return apps
    .filter((a) => sameCompany(a, c))
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
}

/**
 * What the right pane shows when no company is open: the shortlist at a
 * glance — counts, the next useful step for a few companies, and every
 * company on a priority board. All derived from what's already stored;
 * nothing is written by viewing it.
 */
function ShortlistOverview({
  companies,
  apps,
  onOpen,
}: {
  companies: Company[];
  apps: Application[];
  onOpen: (id: number) => void;
}) {
  const withApp = companies.filter((c) => apps.some((a) => sameCompany(a, c)));
  const researched = companies.filter(isResearched);
  const keen = companies.filter((c) => (c.priority ?? "target") === "dream" || (c.priority ?? "target") === "target");

  // Next steps: upcoming interviews first, then keen-but-not-applied, then
  // unresearched. One line per company, five at most.
  const today = new Date().toISOString().slice(0, 10);
  const steps: { id: number; company: Company; verb: string; detail: string; tone: string }[] = [];
  const seen = new Set<number>();
  const push = (c: Company, verb: string, detail: string, tone: string) => {
    if (seen.has(c.id) || steps.length >= 5) return;
    seen.add(c.id);
    steps.push({ id: c.id, company: c, verb, detail, tone });
  };
  for (const c of companies) {
    const a = apps.find((x) => sameCompany(x, c) && x.interviewDate && x.interviewDate.slice(0, 10) >= today);
    if (a) push(c, "Prepare", `Interview ${formatDay(a.interviewDate!)} · ${a.role || "role not set"}`, "bg-warn");
  }
  for (const c of keen) if (!apps.some((a) => sameCompany(a, c))) push(c, "Apply", `${priorityLabel(c)}, no application yet${c.roleShort ? ` · ${c.roleShort}` : ""}`, "bg-accent");
  for (const c of companies) if (!isResearched(c)) push(c, "Research", "No dossier yet — one lookup fills it in", "bg-info");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Your shortlist</p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight">Where you stand with each employer</h3>
        <p className="mt-1 text-xs text-ink-muted">Pick any company to open its full dossier.</p>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-4 gap-3 max-xl:grid-cols-2">
        <OverviewStat value={companies.length} label="Companies" />
        <OverviewStat value={researched.length} of={companies.length} label="Researched" />
        <OverviewStat value={withApp.length} of={companies.length} label="Applied to" />
        <OverviewStat value={keen.length} label="Dream or target" />
      </div>

      {/* Next steps */}
      {steps.length > 0 && (
        <section aria-labelledby="next-steps" className="rounded-lg border border-edge bg-surface p-4">
          <h4 id="next-steps" className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Next steps
          </h4>
          <ul className="mt-3 space-y-1.5">
            {steps.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => onOpen(s.id)}
                  className="flex w-full items-center gap-3 rounded-md border border-edge bg-panel px-3 py-2.5 text-left transition-colors hover:border-accent-dim hover:bg-raised"
                >
                  <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${s.tone}`} />
                  <span className="w-16 shrink-0 text-xs font-semibold">{s.verb}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.company.name}</span>
                    <span className="block truncate text-[11px] text-ink-muted">{s.detail}</span>
                  </span>
                  <span aria-hidden className="text-xs text-ink-faint">→</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Priority board */}
      <section aria-labelledby="by-priority">
        <h4 id="by-priority" className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          By priority
        </h4>
        <div className="mt-3 grid grid-cols-4 gap-3 max-xl:grid-cols-2">
          {PRIORITIES.map((p) => {
            const list = companies.filter((c) => (c.priority ?? "target") === p.value);
            return (
              <div key={p.value} className="min-w-0 rounded-lg border border-edge bg-surface/80 p-2.5">
                <div className="mb-2 flex items-center gap-1.5 px-1">
                  <span className={`size-1.5 rounded-full ${p.dot}`} />
                  <span className="text-xs font-semibold">{p.label}</span>
                  <span className="ml-auto font-mono text-[10px] text-ink-faint">{list.length}</span>
                </div>
                {list.length === 0 ? (
                  <p className="rounded-md border border-dashed border-edge px-2 py-4 text-center text-[11px] text-ink-faint">
                    None yet
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {list.map((c) => {
                      const a = latestApp(apps, c);
                      const st = a ? APP_STATUS[a.status] : null;
                      const line = c.tagline?.trim() || (c.industries ?? []).join(" · ") || (isResearched(c) ? "" : "Not researched yet");
                      return (
                        <li key={c.id}>
                          <button
                            onClick={() => onOpen(c.id)}
                            className="flex w-full items-start gap-2.5 rounded-md border border-edge bg-panel p-2.5 text-left transition-colors hover:border-accent-dim hover:bg-raised"
                          >
                            <span
                              aria-hidden
                              className="grid size-8 shrink-0 place-items-center rounded-md font-mono text-[10px] font-semibold text-mist"
                              style={{ backgroundColor: monogramColour(c.name) }}
                            >
                              {monogram(c.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium">{c.name}</span>
                              {line && <span className="line-clamp-2 text-[11px] leading-snug text-ink-muted">{line}</span>}
                              {st && (
                                <span className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${st.text}`}>
                                  <span className={`size-1 rounded-full ${st.dot}`} />
                                  {st.label}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function OverviewStat({ value, of, label }: { value: number; of?: number; label: string }) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <p className="font-mono text-2xl font-semibold tabular-nums">
        {value}
        {of !== undefined && <span className="text-base text-ink-faint">/{of}</span>}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">{label}</p>
    </div>
  );
}

const priorityLabel = (c: Company) =>
  PRIORITIES.find((p) => p.value === (c.priority ?? "target"))?.label ?? "Target";

/** "Tue 24 Nov" from a stored date or datetime, as a local date. */
function formatDay(value: string) {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
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
const Spinner = ({ light }: { light?: boolean }) => (
  <span
    className={`inline-block size-3.5 animate-spin rounded-full border-2 ${
      light ? "border-ink-faint/40 border-t-ink" : "border-bg/40 border-t-bg"
    }`}
  />
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
