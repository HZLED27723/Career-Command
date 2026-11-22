/**
 * Engine-agnostic resume content model (§7.2): the same structure feeds the
 * LaTeX-faithful template, the visual/retail template, and — later — a real
 * LaTeX backend, with no data migration. Stored as JSON in
 * ResumeVersion.content. Bullets edit as one-per-line text; skills as a
 * comma-separated string.
 */

export interface ResumeItem {
  id: string;
  heading: string;
  sub?: string;
  dates?: string;
  bullets: string[];
}

export interface ResumeSection {
  id: string;
  title: string;
  items: ResumeItem[];
}

export interface ResumeContent {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  summary: string;
  skills: string;
  sections: ResumeSection[];
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export const splitSkills = (skills: string) =>
  skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/*
 * There are deliberately no built-in résumé, CV or cover-letter defaults
 * here. The owner's real documents used to live in this file, which put the
 * owner's contact details into the public JavaScript bundle. They now live
 * only in the owner's own synced data (resumeVersions / coverLetters rows),
 * imported once from a private file — see lib/personalTemplates.ts and §7.32.
 */

/* ── Cover letter ───────────────────────────────────────────────────── */

export interface CoverLetterFields {
  yourName: string;
  company: string;
  position: string;
  hiringManager: string;
  keySkills: string;
  hook: string;
  track: "technical" | "retail";
  contactLine: string;
  locationLine: string;
  greeting: string;
  /** Rendered verbatim; leave empty to show today's date. */
  date: string;
  closing: string;
}

/** A blank letter — what an empty Vault slot starts from. */
export const EMPTY_COVER_FIELDS: CoverLetterFields = {
  yourName: "",
  company: "",
  position: "",
  hiringManager: "",
  keySkills: "",
  hook: "",
  track: "technical",
  contactLine: "",
  locationLine: "",
  greeting: "",
  date: "",
  closing: "",
};

/**
 * Synthesises letter body paragraphs from the metadata (§3 Module 1).
 * Greeting, date, closing and signature are separate fields now, so this
 * returns only the paragraphs that go between them.
 */
export function generateCoverLetter(f: CoverLetterFields): string {
  const skills = splitSkills(f.keySkills);
  const skillLine =
    skills.length > 1
      ? `${skills.slice(0, -1).join(", ")} and ${skills.at(-1)}`
      : (skills[0] ?? "the skills listed in my resume");
  const company = f.company.trim() || "your company";
  const position = f.position.trim() || "advertised";

  const body =
    f.track === "technical"
      ? [
          `I am writing to apply for the ${position} position at ${company}. As a third-year Mechanical Engineering student, I bring a working command of ${skillLine}, sharpened through design-build-test project work rather than theory alone.`,
          f.hook.trim() &&
            `${f.hook.trim()} That is exactly the kind of problem I want to contribute to at ${company}.`,
          `Alongside my studies I hold down part-time customer-facing work, which has taught me to communicate clearly, manage competing deadlines and stay dependable under pressure — habits I bring to every engineering team I join.`,
          `I would welcome the opportunity to discuss how I can contribute. Thank you for your time and consideration.`,
        ]
      : [
          `I would like to apply for the ${position} role at ${company}. I bring ${skillLine}, and a genuine enjoyment of customer-facing work — keeping service quick, shelves presentable and customers looked after.`,
          f.hook.trim() && `${f.hook.trim()}`,
          `As an engineering student I am organised, punctual and quick to learn new systems, and my study timetable gives me reliable availability for evening and weekend shifts.`,
          `I would love the chance to show what I can bring to the team. Thank you for considering my application.`,
        ];

  return body.filter(Boolean).join("\n\n");
}

/** The date line: verbatim if set, otherwise today in the letter's format. */
export function coverLetterDate(f: CoverLetterFields): string {
  return (
    f.date.trim() ||
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  );
}
