"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  applicationRepo,
  questionRepo,
  certificationRepo,
  companyRepo,
  skillRepo,
  courseRepo,
  achievementRepo,
  countStoredDocuments,
} from "@/lib/db";
import { GettingStarted } from "@/components/onboarding/GettingStarted";
import { NextActions } from "@/components/dashboard/NextActions";
import { VaultCovers } from "@/components/dashboard/VaultCovers";
import { collectActions } from "@/lib/actions";
import { currentSeasonApps, seasonInfo } from "@/lib/seasons";
import { isDrafted } from "@/lib/interview";
import { useDisplayName } from "@/lib/owner";
import type { ApplicationStatus } from "@/lib/types";

const STATUS_ORDER: { status: ApplicationStatus; label: string; dot: string }[] =
  [
    { status: "draft", label: "Draft", dot: "bg-ink-faint" },
    { status: "applied", label: "Applied", dot: "bg-info" },
    { status: "interview-scheduled", label: "Interview", dot: "bg-warn" },
    { status: "offer-extended", label: "Offer", dot: "bg-ok" },
    { status: "rejected", label: "Rejected", dot: "bg-danger" },
  ];

export default function DashboardPage() {
  const allApps = useLiveQuery(() => applicationRepo.list(), []);
  /** The dashboard counts this year's tracker only; older years are archived (§7.34). */
  const apps = useMemo(() => allApps && currentSeasonApps(allApps), [allApps]);
  const season = useMemo(() => (allApps ? seasonInfo(allApps) : null), [allApps]);
  const everApplied = (allApps?.length ?? 0) > 0;
  const questions = useLiveQuery(() => questionRepo.list(), []);
  const certs = useLiveQuery(() => certificationRepo.list(), []);
  const companies = useLiveQuery(() => companyRepo.list(), []);
  const skills = useLiveQuery(() => skillRepo.list(), []);
  const courses = useLiveQuery(() => courseRepo.list(), []);
  const examples = useLiveQuery(() => achievementRepo.list(), []);
  const storedDocs = useLiveQuery(() => countStoredDocuments(), []);
  const mounted = useMounted();
  const hydrated = useHydrated();
  const certCount = certs?.length ?? 0;
  const companyCount = companies?.length ?? 0;
  const skillsHave = skills?.filter((s) => s.status === "have").length ?? 0;
  const skillsGrowing =
    skills?.filter((s) => s.status !== "have").length ?? 0;
  const coursesQueued =
    courses?.filter((c) => c.status !== "completed").length ?? 0;
  const coursesDone =
    courses?.filter((c) => c.status === "completed").length ?? 0;
  const exampleCount = examples?.length ?? 0;
  const examplesDetailed =
    examples?.filter((e) =>
      [e.situation, e.task, e.action, e.result].every((v) => v?.trim()),
    ).length ?? 0;

  const total = apps?.length ?? 0;
  const byStatus = Object.fromEntries(
    STATUS_ORDER.map((s) => [
      s.status,
      apps?.filter((a) => a.status === s.status).length ?? 0,
    ]),
  ) as Record<ApplicationStatus, number>;
  const interviews = byStatus["interview-scheduled"];
  const offers = byStatus["offer-extended"];
  const active = byStatus["applied"] + interviews;
  const open = byStatus["draft"] + active;
  // Words under the Applications bar, so its colours mean something.
  const pipelineCaption = [
    open > 0 && `${open} open`,
    offers > 0 && `${offers} offer${offers > 1 ? "s" : ""}`,
    byStatus["rejected"] > 0 && `${byStatus["rejected"]} rejected`,
  ]
    .filter(Boolean)
    .join(" · ");
  const questionCount = questions?.length ?? 0;
  const answered = questions?.filter(isDrafted).length ?? 0;

  /**
   * Derived after mount only: it reads the current time, and rendering that on
   * the server would hydrate into a mismatch (and could be a day off anyway,
   * since the server's timezone isn't the reader's).
   */
  const actions = useMemo(
    () => (hydrated ? collectActions(apps ?? [], courses ?? []) : []),
    [hydrated, apps, courses],
  );

  // Subtitle reacts to where the job hunt actually stands right now.
  const subtitle =
    offers > 0
      ? `${offers} offer${offers > 1 ? "s" : ""} on the table — that's huge. 🎉`
      : interviews > 0
        ? `You've got ${interviews} interview${interviews > 1 ? "s" : ""} lined up. Let's get you ready.`
        : active > 0
          ? `${active} application${active > 1 ? "s" : ""} in flight — keep the momentum going.`
          : total > 0
            ? "Quiet pipeline. Good time to line up the next one."
            : "Let's line up your first opportunity.";

  return (
    // The dot grid and Mint glow that used to live here are now the shared
    // PageBackdrop in the layout, behind every page.
    <div className="relative min-h-full">

      <div className="relative mx-auto max-w-6xl p-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 bg-[linear-gradient(100deg,var(--color-accent)_30%,var(--color-accent-strong)_50%,var(--color-accent)_70%)] bg-clip-text font-mono text-[10px] uppercase tracking-[0.25em] text-transparent">
              <TodayLabel />
            </p>
            <h2 className="text-[26px] font-semibold tracking-tight">
              <Greeting />
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          </div>
          {/* The clock stays, quietly. "local-first · all systems go" was
              decorative status text that told the user nothing about their
              own work, and stopped being true once sync landed. */}
          <div className="text-right max-sm:hidden">
            <Clock />
          </div>
        </div>

        <GettingStarted
          hasDocument={(storedDocs ?? 0) > 0}
          hasApplication={everApplied}
        />

        <NextActions actions={actions} hasAnyRecords={everApplied} />

        {/* ── Bento grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-3 max-md:grid-cols-2">
          {/* The Vault. Still the tallest tile, but no longer four columns
              wide — what's due comes first now, and the vault is where you go
              once you know which application you're working on. */}
          <Tile
            href="/workspace"
            className="col-span-2 row-span-2 max-md:col-span-2"
          >
            <div className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-accent">01 · Vault</p>
                {/* Only claim a count when documents have actually been saved. */}
                {(storedDocs ?? 0) > 0 && (
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    {storedDocs} saved
                  </p>
                )}
              </div>

              {/* Page one of each stored document, fanned */}
              <VaultCovers />

              <h3 className="mt-auto text-base font-semibold">
                Document Vault
              </h3>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-muted">
                Résumé, cover letter and technical CV — stored in one place and
                ready to grab the moment an application is due.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-faint transition-colors group-hover:text-accent">
                Open vault →
              </p>
            </div>
          </Tile>

          {/* Applications counter */}
          <Tile href="/tracker" className="col-span-2 max-md:col-span-1">
            <div className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                Applications
                {season && season.years.length > 1 && ` · ${season.current}`}
              </p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-ink">
                {total}
              </p>
              <div className="mt-3 flex h-1 overflow-hidden rounded-full bg-panel">
                {STATUS_ORDER.filter((s) => byStatus[s.status] > 0).map(
                  (s, i) => (
                    <div
                      key={s.status}
                      className={`${s.dot} transition-[width] duration-500 ease-out`}
                      style={{
                        width: mounted
                          ? `${(byStatus[s.status] / Math.max(total, 1)) * 100}%`
                          : "0%",
                        transitionDelay: `${100 + i * 60}ms`,
                      }}
                    />
                  ),
                )}
              </div>
              {pipelineCaption && (
                <p className="mt-2 truncate text-[11px] text-ink-muted">
                  {pipelineCaption}
                </p>
              )}
            </div>
          </Tile>

          {/* Interviews / offers */}
          <Tile href="/tracker" className="col-span-2 max-md:col-span-1">
            <div className="p-5">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                {interviews > 0 && (
                  <span className="size-1.5 animate-pulse-soft rounded-full bg-warn" />
                )}
                Interviews scheduled
              </p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-accent-strong">
                {interviews}
              </p>
              <p className="mt-3 truncate text-[11px] text-ink-muted">
                {offers > 0
                  ? `🎉 ${offers} offer${offers > 1 ? "s" : ""} on the table`
                  : interviews > 0
                    ? "Scheduled — time to rehearse."
                    : "None scheduled yet."}
              </p>
            </div>
          </Tile>

          {/* Company intelligence */}
          <Tile href="/companies" className="col-span-2 max-md:col-span-1">
            <div className="p-5">
              <p className="font-mono text-xs text-accent">02 · Companies</p>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">
                {companyCount}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {companyCount === 1
                  ? "employer researched"
                  : "employers researched"}
              </p>
              <p className="mt-2 truncate text-[11px] text-ink-faint">
                Dossiers ready before you apply →
              </p>
            </div>
          </Tile>

          {/* Pipeline breakdown */}
          <Tile href="/tracker" className="col-span-2 max-md:col-span-1">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-accent">03 · Tracker</p>
              </div>
              <div className="mt-3 space-y-1.5">
                {STATUS_ORDER.map((s) => (
                  <div
                    key={s.status}
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <span className={`size-1.5 rounded-full ${s.dot}`} />
                    <span className="text-ink-muted">{s.label}</span>
                    <span className="ml-auto font-mono tabular-nums text-ink">
                      {byStatus[s.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Tile>

          {/* Question bank progress */}
          <Tile href="/interview" className="col-span-2 max-md:col-span-1">
            <div className="p-5">
              <p className="font-mono text-xs text-accent">04 · Interview</p>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">
                {answered}
                <span className="text-ink-faint">/{questionCount}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                answers drafted
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-panel">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                  style={{
                    width: mounted
                      ? `${(answered / Math.max(questionCount, 1)) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </Tile>

          {/* Examples — the evidence bank */}
          <Tile href="/examples" className="col-span-2 max-md:col-span-1">
            <div className="p-5">
              <p className="font-mono text-xs text-accent">05 · Examples</p>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">
                {exampleCount}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {exampleCount === 1 ? "story written" : "stories written"}
              </p>
              <p className="mt-2 truncate text-[11px] text-ink-faint">
                {exampleCount > 0
                  ? `${examplesDetailed} fully detailed →`
                  : "Write up your first story →"}
              </p>
            </div>
          </Tile>

          {/* Certifications vault */}
          <Tile
            href="/certifications"
            className="col-span-2 max-md:col-span-1"
          >
            <div className="p-5">
              <p className="font-mono text-xs text-accent">
                06 · Certifications
              </p>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">
                {certCount}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {certCount === 1 ? "credential logged" : "credentials logged"}
              </p>
            </div>
          </Tile>

          {/* Skills — toolkit + growth pipeline */}
          <Tile href="/skills" className="col-span-2 max-md:col-span-1">
            <div className="p-5">
              <p className="font-mono text-xs text-accent">07 · Skills</p>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">
                {skillsHave}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {skillsHave === 1 ? "skill in the toolkit" : "skills in the toolkit"}
              </p>
              <p className="mt-2 truncate text-[11px] text-ink-faint">
                {skillsGrowing > 0
                  ? `${skillsGrowing} in the growth pipeline →`
                  : "Map your growth targets →"}
              </p>
            </div>
          </Tile>

          {/* Courses — the learning queue */}
          <Tile href="/courses" className="col-span-2 max-md:col-span-1">
            <div className="p-5">
              <p className="font-mono text-xs text-accent">08 · Courses</p>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">
                {coursesQueued}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {coursesQueued === 1 ? "course to complete" : "courses to complete"}
              </p>
              <p className="mt-2 truncate text-[11px] text-ink-faint">
                {coursesDone > 0
                  ? `${coursesDone} completed →`
                  : "Queue your next course →"}
              </p>
            </div>
          </Tile>

          {/* Portfolio — locked; a normal tile now, so it closes the last row
              instead of taking a full-width strip of its own. */}
          <Tile className="col-span-2 max-md:col-span-1">
            <div className="flex h-full flex-col p-5 opacity-60">
              <p className="font-mono text-xs text-ink-faint">09 · Portfolio</p>
              <p className="mt-3 text-sm font-semibold text-ink-muted">
                Public portfolio
              </p>
              <p className="mt-auto pt-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                🔒 future phase
              </p>
            </div>
          </Tile>
        </div>
      </div>
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

/**
 * Bento tile with a hover lift. Renders as a Link when href is given.
 * (No per-tile entrance animation — the page-level enter in template.tsx
 * covers it with a single composited layer; the old 8-tile stagger plus
 * cursor spotlight made dashboard entry choppy on weaker GPUs.)
 */
function Tile({
  href,
  className = "",
  children,
}: {
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const inner = (
    <div
      className={`group relative h-full overflow-hidden rounded-lg border border-edge bg-surface transition duration-200 ease-out ${
        href
          ? "hover:-translate-y-1 hover:border-accent-dim hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.9)]"
          : ""
      }`}
    >
      <div className="relative h-full">{children}</div>
    </div>
  );

  return (
    <div className={className}>
      {href ? (
        <Link href={href} className="block h-full">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString("en-AU", { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="font-mono text-lg tabular-nums text-ink-muted">
      {time ?? "--:--:--"}
    </p>
  );
}

/** Static welcome greeting. Name gets the accent colour for a personal pop. */
function Greeting() {
  // Was hard-coded to the owner's name, so every account was greeted as him.
  const name = useDisplayName();
  // Held invisible for the moment the local session is read, so the owner's
  // greeting doesn't flick from "Welcome back." to their name.
  if (name === undefined) return <span className="invisible">Welcome back.</span>;
  if (!name) return <>Welcome back.</>;
  return (
    <>
      Welcome, <span className="text-accent-strong">{name}</span>.
    </>
  );
}

/** Full weekday + date, shown as the gradient eyebrow line. */
function TodayLabel() {
  const [label, setLabel] = useState("Command Center");
  useEffect(() => {
    setLabel(
      new Date().toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
  }, []);
  return <>{label}</>;
}

/**
 * Animation gate: waits for a painted frame so width transitions actually
 * animate from 0 rather than jumping straight to their final value.
 *
 * Only use this for decoration. Browsers don't run rAF in a hidden tab, so a
 * page loaded in the background stays `false` indefinitely — fine for an
 * animation, wrong for anything the user needs to read.
 */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

/**
 * Hydration gate for content. Effects always run on mount, hidden tab or not,
 * so anything derived from the current time can rely on this.
 */
function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
