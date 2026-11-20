"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  companyRepo,
  questionRepo,
  achievementRepo,
  snapshotVaultDocument,
} from "@/lib/db";
import { downloadFile } from "@/lib/latex";
import { isDrafted } from "@/lib/interview";
import type {
  Application,
  ApplicationStatus,
  SubmittedDocument,
} from "@/lib/types";

/**
 * Everything one application needs, in one place: when things are due, what
 * the listing said, what was actually sent, what you know about the employer,
 * and what to rehearse.
 *
 * The row above stays a spreadsheet — this opens underneath it, so bulk
 * editing is untouched.
 */

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft: "Draft",
  applied: "Applied",
  "interview-scheduled": "Interview scheduled",
  "offer-extended": "Offer extended",
  rejected: "Rejected",
};

const shortDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const dateTime = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export function ApplicationDetail({
  app,
  commit,
}: {
  app: Application;
  commit: (patch: Partial<Application>) => void;
}) {
  const companies = useLiveQuery(() => companyRepo.list(), []);
  const questions = useLiveQuery(() => questionRepo.list(), []);
  const achievements = useLiveQuery(() => achievementRepo.list(), []);
  const [attaching, setAttaching] = useState<string | null>(null);

  /** The company record matching this application, if one exists. */
  const company = companies?.find(
    (c) =>
      c.name.trim().toLowerCase() === (app.company ?? "").trim().toLowerCase(),
  );

  const attach = async (
    kind: "resume" | "cv" | "cover",
    field: "submittedResume" | "submittedCover",
  ) => {
    setAttaching(field);
    try {
      const snap = await snapshotVaultDocument(kind);
      if (snap) commit({ [field]: snap } as Partial<Application>);
    } finally {
      setAttaching(null);
    }
  };

  return (
    /*
     * The panel lives in a <td> inside the tracker's horizontally scrolling
     * table, so by default it inherits the table's full width — on a phone
     * that means scrolling sideways to reach your own form fields. Pinning it
     * to the left edge and sizing it to the viewport keeps it usable without
     * changing the grid's scroll behaviour above it.
     */
    <div className="animate-fade-in space-y-4 px-4 pb-5 pt-2 pl-10 max-md:sticky max-md:left-0 max-md:w-[calc(100vw-6.5rem)] max-md:pl-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Dates & next action ───────────────────────────────────── */}
        <Section title="What's next">
          <div className="grid grid-cols-2 gap-2">
            <DateField
              label="Deadline"
              value={app.deadline}
              onCommit={(v) => commit({ deadline: v })}
            />
            <DateField
              label="Interview"
              type="datetime-local"
              value={app.interviewDate}
              onCommit={(v) => commit({ interviewDate: v })}
            />
            <DateField
              label="Follow up on"
              value={app.followUpDate}
              onCommit={(v) => commit({ followUpDate: v })}
            />
            <DateField
              label="Applied"
              value={app.appliedDate}
              onCommit={(v) => commit({ appliedDate: v })}
            />
          </div>
          <LabelledInput
            label="Next action"
            value={app.nextAction ?? ""}
            placeholder="e.g. email Priya about the site visit"
            onCommit={(v) => commit({ nextAction: v || undefined })}
          />
        </Section>

        {/* ── The listing ───────────────────────────────────────────── */}
        <Section title="The listing">
          <LabelledInput
            label="Job posting URL"
            value={app.jobUrl ?? ""}
            placeholder="https://…"
            onCommit={(v) => commit({ jobUrl: v || undefined })}
          />
          {app.jobUrl && (
            <a
              href={app.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[11px] font-medium text-accent hover:text-accent-strong"
            >
              Open the listing ↗
            </a>
          )}
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                Saved description
              </span>
              {app.jobCapturedAt && (
                <span className="text-[10px] text-ink-faint">
                  captured {shortDate(app.jobCapturedAt)}
                </span>
              )}
            </div>
            <textarea
              key={`jd:${app.id}`}
              defaultValue={app.jobDescription ?? ""}
              rows={4}
              placeholder="Paste the job ad here — listings get taken down, this copy doesn't."
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next === (app.jobDescription ?? "").trim()) return;
                commit({
                  jobDescription: next || undefined,
                  // Stamp the capture date only when there's something to stamp.
                  jobCapturedAt: next ? new Date().toISOString() : undefined,
                });
              }}
              className="w-full resize-y rounded-sm border border-edge bg-surface p-2.5 text-xs leading-relaxed outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
            />
          </div>
        </Section>
      </div>

      {/* ── What was sent ───────────────────────────────────────────── */}
      <Section title="What you sent">
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Attaching copies the document as it is right now. Editing the vault
          later won&apos;t change what this record says you sent.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <SubmittedSlot
            label="Resume"
            doc={app.submittedResume}
            busy={attaching === "submittedResume"}
            onAttachResume={() => attach("resume", "submittedResume")}
            onAttachCv={() => attach("cv", "submittedResume")}
            onClear={() => commit({ submittedResume: undefined })}
          />
          <SubmittedSlot
            label="Cover letter"
            doc={app.submittedCover}
            busy={attaching === "submittedCover"}
            onAttachResume={() => attach("cover", "submittedCover")}
            onClear={() => commit({ submittedCover: undefined })}
          />
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Employer research ─────────────────────────────────────── */}
        <Section title="What you know about them">
          {company ? (
            <div className="space-y-1.5">
              {company.talkingPoints?.trim() ? (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    Talking points
                  </span>
                  <p className="mt-0.5 whitespace-pre-line text-[11px] leading-relaxed text-ink-muted">
                    {company.talkingPoints}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-ink-muted">
                  No talking points saved for {company.name} yet.
                </p>
              )}
              <Link
                href="/companies"
                className="inline-block text-[11px] font-medium text-accent hover:text-accent-strong"
              >
                Open {company.name} →
              </Link>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-ink-muted">
              No company page for{" "}
              <span className="text-ink">
                {app.company?.trim() || "this employer"}
              </span>{" "}
              yet.{" "}
              <Link
                href="/companies"
                className="font-medium text-accent hover:text-accent-strong"
              >
                Research them →
              </Link>
            </p>
          )}
        </Section>

        {/* ── Prep ──────────────────────────────────────────────────── */}
        <Section title="Prep for this one">
          <p className="text-[11px] text-ink-muted">
            {questions?.length
              ? `${questions.filter(isDrafted).length} of ${questions.length} questions answered in your bank.`
              : "Your question bank is empty."}{" "}
            <Link
              href="/interview"
              className="font-medium text-accent hover:text-accent-strong"
            >
              Open prep →
            </Link>
          </p>
          <p className="text-[11px] text-ink-muted">
            {achievements?.length
              ? `${achievements.length} example${achievements.length === 1 ? "" : "s"} in your bank to draw on.`
              : "No examples saved yet."}{" "}
            <Link
              href="/examples"
              className="font-medium text-accent hover:text-accent-strong"
            >
              Open examples →
            </Link>
          </p>
        </Section>
      </div>

      {/* ── Responsibilities (pre-existing) ─────────────────────────── */}
      <Section title="Responsibilities & required skills">
        <textarea
          key={`resp:${app.id}`}
          defaultValue={app.responsibilities ?? ""}
          placeholder="Paste the job description's responsibilities and required skills here…"
          rows={4}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next !== (app.responsibilities ?? "").trim())
              commit({ responsibilities: next || undefined });
          }}
          className="w-full resize-y rounded-sm border border-edge bg-surface p-2.5 text-xs leading-relaxed outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
        />
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Even if this one doesn&apos;t land, these are the skills to build —
          the next role in this space probably wants the same.
        </p>
      </Section>

      {/* ── History ─────────────────────────────────────────────────── */}
      {app.statusHistory && app.statusHistory.length > 0 && (
        <Section title="History">
          <ol className="space-y-1">
            {app.statusHistory.map((h, i) => (
              <li
                key={`${h.at}:${i}`}
                className="flex items-baseline justify-between gap-3 text-[11px]"
              >
                <span className="text-ink-muted">
                  {STATUS_LABEL[h.status] ?? h.status}
                </span>
                <span className="font-mono text-[10px] text-ink-faint">
                  {dateTime(h.at)}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-edge bg-surface p-3">
      <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function DateField({
  label,
  value,
  type = "date",
  onCommit,
}: {
  label: string;
  value?: string;
  type?: "date" | "datetime-local";
  onCommit: (v: string | undefined) => void;
}) {
  const id = `${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label}
      </span>
      <input
        id={id}
        type={type}
        defaultValue={value ?? ""}
        onBlur={(e) => {
          const next = e.target.value;
          if (next !== (value ?? "")) onCommit(next || undefined);
        }}
        className="w-full rounded-sm border border-edge bg-panel px-2 py-1.5 text-[11px] outline-none transition-colors focus:border-accent-dim max-md:min-h-11"
      />
    </label>
  );
}

function LabelledInput({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onCommit: (v: string) => void;
}) {
  const id = `${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label}
      </span>
      <input
        id={id}
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => {
          const next = e.target.value.trim();
          if (next !== value.trim()) onCommit(next);
        }}
        className="w-full rounded-sm border border-edge bg-panel px-2 py-1.5 text-[11px] outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim max-md:min-h-11"
      />
    </label>
  );
}

/**
 * One attached document. `onAttachCv` is only passed for the resume slot,
 * where there are two vault documents worth attaching.
 */
function SubmittedSlot({
  label,
  doc,
  busy,
  onAttachResume,
  onAttachCv,
  onClear,
}: {
  label: string;
  doc?: SubmittedDocument;
  busy: boolean;
  onAttachResume: () => void;
  onAttachCv?: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-sm border border-edge bg-panel p-2.5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label}
      </p>
      {doc ? (
        <>
          <p className="mt-1 truncate text-xs font-medium" title={doc.name}>
            {doc.name}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-faint">
            attached {shortDate(doc.attachedAt)}
            {doc.file ? ` · ${doc.fileName ?? "file"}` : " · template, no file"}
          </p>
          <div className="mt-1.5 flex gap-2">
            {doc.file && (
              <button
                onClick={() =>
                  downloadFile(doc.file as Blob, doc.fileName ?? doc.name)
                }
                className="text-[11px] font-medium text-accent hover:text-accent-strong"
              >
                Download
              </button>
            )}
            <button
              onClick={onClear}
              className="text-[11px] text-ink-faint transition-colors hover:text-danger"
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            onClick={onAttachResume}
            disabled={busy}
            className="rounded-sm border border-edge-strong px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink disabled:opacity-50 max-md:min-h-11 max-md:px-3"
          >
            {busy ? "Attaching…" : onAttachCv ? "Attach resume" : "Attach"}
          </button>
          {onAttachCv && (
            <button
              onClick={onAttachCv}
              disabled={busy}
              className="rounded-sm border border-edge-strong px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink disabled:opacity-50 max-md:min-h-11 max-md:px-3"
            >
              Attach technical CV
            </button>
          )}
        </div>
      )}
    </div>
  );
}
