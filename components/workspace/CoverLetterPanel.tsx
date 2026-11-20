"use client";

import {
  coverLetterDate,
  generateCoverLetter,
  type CoverLetterFields,
} from "@/lib/resume";
import { cmSerif } from "./fonts";

/**
 * The user's real LaTeX cover letter as an editable template: letterhead,
 * greeting/date/closing and body are all fields, so per-application edits
 * are just field swaps. The generator is an optional helper that only
 * rewrites the body paragraphs.
 */
export function CoverLetterForm({
  fields,
  body,
  onFields,
  onBody,
}: {
  fields: CoverLetterFields;
  body: string;
  onFields: (f: CoverLetterFields) => void;
  onBody: (b: string) => void;
}) {
  const patch = (p: Partial<CoverLetterFields>) =>
    onFields({ ...fields, ...p });

  return (
    <div className="space-y-4 p-4">
      <Group label="Letterhead">
        <Input
          value={fields.yourName}
          onChange={(yourName) => patch({ yourName })}
          placeholder="Your name"
        />
        <Input
          value={fields.contactLine}
          onChange={(contactLine) => patch({ contactLine })}
          placeholder="Contact line (email | phone | linkedin)"
        />
        <Input
          value={fields.locationLine}
          onChange={(locationLine) => patch({ locationLine })}
          placeholder="Location line"
        />
      </Group>

      <Group label="Letter">
        <div className="grid grid-cols-2 gap-1.5">
          <Input
            value={fields.company}
            onChange={(company) => patch({ company })}
            placeholder="Company (for PDF filename)"
          />
          <Input
            value={fields.position}
            onChange={(position) => patch({ position })}
            placeholder="Position"
          />
          <Input
            value={fields.greeting}
            onChange={(greeting) => patch({ greeting })}
            placeholder="Greeting"
          />
          <Input
            value={fields.date}
            onChange={(date) => patch({ date })}
            placeholder="Date — blank = today"
          />
          <Input
            value={fields.closing}
            onChange={(closing) => patch({ closing })}
            placeholder="Closing (Sincerely,)"
            className="col-span-2"
          />
        </div>
      </Group>

      <Group label="Body · paragraphs separated by blank lines">
        <textarea
          value={body}
          onChange={(e) => onBody(e.target.value)}
          placeholder="The letter paragraphs…"
          rows={18}
          className="w-full resize-y rounded-sm border border-edge bg-surface px-2.5 py-2 text-xs leading-relaxed outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
        />
      </Group>

      <Group label="Generator · optional — overwrites the body">
        <div className="grid grid-cols-2 gap-1.5">
          <Input
            value={fields.hiringManager}
            onChange={(hiringManager) => patch({ hiringManager })}
            placeholder="Hiring manager"
          />
          <select
            value={fields.track}
            onChange={(e) =>
              patch({ track: e.target.value as CoverLetterFields["track"] })
            }
            className="w-full cursor-pointer rounded-sm border border-edge bg-surface px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-accent-dim"
          >
            <option value="technical">Technical tone</option>
            <option value="retail">Retail tone</option>
          </select>
        </div>
        <textarea
          value={fields.keySkills}
          onChange={(e) => patch({ keySkills: e.target.value })}
          placeholder="Key skills to weave in, comma-separated"
          rows={2}
          className="w-full resize-y rounded-sm border border-edge bg-surface px-2.5 py-1.5 text-xs leading-relaxed outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
        />
        <textarea
          value={fields.hook}
          onChange={(e) => patch({ hook: e.target.value })}
          placeholder="One sentence on why this company (optional hook)"
          rows={2}
          className="w-full resize-y rounded-sm border border-edge bg-surface px-2.5 py-1.5 text-xs leading-relaxed outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
        />
        <button
          onClick={() => onBody(generateCoverLetter(fields))}
          className="group relative mt-1 w-full overflow-hidden rounded-full p-px transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[0_0_28px_-8px_rgba(191,90,242,0.55)] active:scale-[0.98]"
        >
          {/* Iridescent ring — brightens on hover (static: the old infinite
              shimmer repainted the gradient every frame) */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-[linear-gradient(100deg,#0a84ff,#bf5af2,#ff375f,#ff9f0a,#0a84ff)] opacity-40 transition-opacity duration-200 group-hover:opacity-100"
          />
          <span className="relative flex items-center justify-center gap-2 rounded-full bg-surface py-2.5 text-xs font-medium text-ink transition-colors duration-200 group-hover:bg-raised">
            <SparkleIcon />
            Generate body
            <span className="font-normal text-[10px] text-ink-faint">
              replaces current
            </span>
          </span>
        </button>
      </Group>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110"
    >
      <defs>
        <linearGradient id="ai-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a84ff" />
          <stop offset="50%" stopColor="#bf5af2" />
          <stop offset="100%" stopColor="#ff9f0a" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ai-spark)"
        d="M12 2.5l2.1 6.1 6.1 2.1-6.1 2.1L12 19l-2.1-6.2-6.1-2.1 6.1-2.1L12 2.5z"
      />
      <path
        fill="url(#ai-spark)"
        opacity="0.85"
        d="M19.5 14.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z"
      />
    </svg>
  );
}

/* ── Preview: faithful render of the user's LaTeX letter ────────────── */

export function CoverLetterPreview({
  fields,
  body,
}: {
  fields: CoverLetterFields;
  body: string;
}) {
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <div
      className={`${cmSerif.className} h-full bg-white px-[7%] py-[6%] text-[10.5px] leading-[1.55] text-black`}
    >
      {/* Centered letterhead: \LARGE name over contact + location lines */}
      <header className="text-center">
        <h1 className="text-[23px] leading-tight">{fields.yourName}</h1>
        {fields.contactLine.trim() && (
          <p className="mt-2 text-[10px]">{fields.contactLine}</p>
        )}
        {fields.locationLine.trim() && (
          <p className="mt-0.5 text-[10px]">{fields.locationLine}</p>
        )}
      </header>

      {/* Greeting left, date right */}
      <div className="mt-6 flex items-baseline justify-between gap-4 text-[11px]">
        <p>{fields.greeting}</p>
        <p className="shrink-0">{coverLetterDate(fields)}</p>
      </div>

      <div className="mt-4 space-y-3">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p key={i} className="text-justify whitespace-pre-wrap">
              {p}
            </p>
          ))
        ) : (
          <p className="italic text-[#999]">
            Write the letter body on the left — paragraphs separated by blank
            lines.
          </p>
        )}
      </div>

      <p className="mt-5">{fields.closing}</p>
      <p className="mt-12">{fields.yourName}</p>
    </div>
  );
}

/* ── Field primitives ───────────────────────────────────────────────── */

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-edge bg-panel p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-sm border border-edge bg-surface px-2.5 py-1.5 text-xs outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim ${className}`}
    />
  );
}
