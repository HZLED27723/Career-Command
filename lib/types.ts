/**
 * Core domain types — defined in Phase 1, wired to Dexie in Phase 2.
 * Shapes map ~1:1 to future Supabase (Postgres) tables, so keep fields
 * flat and serializable. Dates are ISO 8601 strings.
 */

export type RoleTrack = "engineering" | "retail" | "hospitality";

export type ApplicationStatus =
  | "draft"
  | "applied"
  | "interview-scheduled"
  | "offer-extended"
  | "rejected";

/** One entry in an application's status history. */
export interface StatusChange {
  status: ApplicationStatus;
  /** ISO timestamp of the change. */
  at: string;
}

/**
 * A document exactly as it was submitted.
 *
 * Copied at attach time rather than referenced, which is the whole point: the
 * master document in the vault keeps changing, and an application record has
 * to keep saying what was actually sent. Editing the vault must never rewrite
 * history.
 */
export interface SubmittedDocument {
  /** The vault label at the moment it was attached. */
  name: string;
  /**
   * Which vault slot it was copied from. Only set on snapshots taken since the
   * Vault shelf began showing "Last used" — older ones can't be attributed, so
   * they claim nothing.
   */
  kind?: "resume" | "cv" | "cover";
  /** The file itself, if the vault held one. */
  file?: Blob;
  fileName?: string;
  fileType?: string;
  /** ISO timestamp of the attach. */
  attachedAt: string;
}

export interface Application {
  id: number;
  company: string;
  role: string;
  track: RoleTrack;
  status: ApplicationStatus;
  appliedDate?: string;
  resumeVersionId?: number;
  coverLetterId?: number;
  notes?: string;
  /** The role's responsibilities / required skills — pasted from the JD. */
  responsibilities?: string;

  /* ── Dates that drive the dashboard's "what's next" ─────────────── */
  /** Closing date for applications. */
  deadline?: string;
  /** Scheduled interview (date, or date + time). */
  interviewDate?: string;
  /** When to chase this up if nothing has happened. */
  followUpDate?: string;
  /** The single next thing to do — free text. */
  nextAction?: string;

  /* ── The listing, kept after it disappears ──────────────────────── */
  /** Original job posting URL. */
  jobUrl?: string;
  /** Pasted job description — survives the listing being taken down. */
  jobDescription?: string;
  /** ISO timestamp of when the description above was captured. */
  jobCapturedAt?: string;

  /* ── What was actually sent ─────────────────────────────────────── */
  submittedResume?: SubmittedDocument;
  submittedCover?: SubmittedDocument;

  /** Status transitions, oldest first. */
  statusHistory?: StatusChange[];

  createdAt: string;
  updatedAt: string;
}

/**
 * A reusable, verified example from the user's own experience — a project,
 * a work situation, a responsibility. Answers to behavioural questions get
 * rebuilt from these instead of being retyped per application.
 *
 * The STAR fields are optional on purpose: plenty of useful examples are just
 * "I did this, here's the outcome", and forcing four boxes makes people invent
 * structure they don't have.
 */
export interface Achievement {
  id: number;
  title: string;
  /** Where it happened — job, project, club, unit. */
  context?: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  /** Link or note backing it up — a repo, a report, a reference. */
  evidence?: string;
  /** Free-text skill tags, used to match examples to questions. */
  skillTags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * "visual" = Engine A (Hamdan Zahid — Resume), "cv" = Engine C (Technical
 * Resume). The retired "latex" engine may still appear on old stored rows;
 * nothing reads them.
 */
export type ResumeEngine = "visual" | "cv";

export interface ResumeVersion {
  id: number;
  name: string;
  engine: ResumeEngine;
  track: RoleTrack;
  /** Structured, engine-agnostic content (JSON) — not raw LaTeX/HTML. */
  content: string;
  /** Vault caption under the title — free text, edit it to whatever fits. */
  blurb?: string;
  /**
   * A stored PDF or Word file. When present the vault shows and serves this
   * instead of the built-in template — it's the real document, kept as-is.
   */
  file?: Blob;
  fileName?: string;
  fileType?: string;
  /** See `CoverLetter.builtIn`. */
  builtIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetter {
  id: number;
  /** Vault label — rename it per company, e.g. "Cover Letter — Stantec". */
  title?: string;
  /** Vault caption under the title — free text. */
  blurb?: string;
  /** A stored PDF or Word file, served instead of the built-in template. */
  file?: Blob;
  fileName?: string;
  fileType?: string;
  company: string;
  position: string;
  keySkills: string[];
  body: string;
  yourName?: string;
  hiringManager?: string;
  hook?: string;
  tone?: "technical" | "retail";
  /** Letterhead + letter furniture (user's LaTeX template layout). */
  contactLine?: string;
  locationLine?: string;
  greeting?: string;
  letterDate?: string;
  closing?: string;
  /**
   * True while the row holds only template text brought in by the one-time
   * personal-template import (lib/personalTemplates.ts) and nothing the user
   * has done since. The Vault shows no "Updated" date for it, just as it
   * showed none for the built-in defaults the import replaces. Every
   * repository write clears it.
   */
  builtIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type QuestionCategory = "behavioral" | "technical" | "situational";

export interface InterviewEntry {
  id: number;
  question: string;
  category: QuestionCategory;
  /**
   * The free-text answer from before STAR fields existed. Kept verbatim and
   * shown read-only as "Original answer" so the user can copy parts across —
   * it is never rewritten or cleared by the STAR editor.
   */
  answer?: string;
  /* STAR fields — each optional and saved independently (§7.17). */
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  /**
   * Stable key into the prompt bank for starter questions ("behavioral-02").
   * Rows created before keys existed fall back to matching the question text.
   */
  promptKey?: string;
  /** Achievements reusable as evidence in this answer (P2-04). */
  achievementIds?: number[];
  createdAt: string;
  updatedAt: string;
}

export type CredentialType = "certificate" | "licence" | "membership" | "course";

export interface Certification {
  id: number;
  title: string;
  issuer: string;
  /** Free-text or ISO date the credential was earned. */
  issuedDate?: string;
  /**
   * What kind of credential this is. Optional: older rows read as
   * "certificate", or "course" when logged from a completed course.
   */
  credentialType?: CredentialType;
  /** ISO date a licence (or anything time-limited) stops being valid. */
  expiresDate?: string;
  /**
   * The issuer's logo, downscaled on upload (see lib/credentials.ts). Shared
   * by display: every credential from the same issuer shows it.
   */
  issuerLogo?: Blob;
  credentialId?: string;
  /** Verification / credential URL. */
  url?: string;
  /** The uploaded certificate file (PDF or image), stored as a Blob. */
  file?: Blob;
  fileName?: string;
  fileType?: string;
  /**
   * Set when this entry was logged from a completed course rather than from a
   * credential the user holds proof of. Finishing a course is not the same as
   * being independently certified, and the vault shouldn't blur the two.
   */
  fromCourseId?: number;
  createdAt: string;
  updatedAt: string;
}

export type SkillCategory =
  | "engineering"
  | "software"
  | "fabrication"
  | "interpersonal"
  | "other";

/**
 * Where a skill sits in the growth pipeline:
 * target (want it) → developing (building it) → have (got it).
 */
export type SkillStatus = "have" | "developing" | "target";

export interface Skill {
  id: number;
  name: string;
  category: SkillCategory;
  status: SkillStatus;
  /** Proficiency 1–5 for have/developing skills; 0 = not rated yet. */
  level: number;
  /**
   * Free note: for current skills, the evidence (where it's been used);
   * for targets, the why and the plan to acquire it.
   */
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** Where a course sits in the learning queue. */
export type CourseStatus = "planned" | "in-progress" | "completed";

/**
 * A course or certification the user wants to complete — the forward-looking
 * counterpart to the Certifications vault (which holds earned credentials).
 * planned → in-progress → completed; a completed course can be logged into
 * the vault with one click.
 */
export interface Course {
  id: number;
  title: string;
  provider?: string;
  /** Course / enrolment link. */
  url?: string;
  status: CourseStatus;
  /** When the user wants it done by (ISO date). */
  targetDate?: string;
  /** When it was actually finished (ISO date). */
  completedDate?: string;
  /** Why it matters, prerequisites, progress notes. */
  note?: string;
  /** Provider / association logo, stored as an image Blob. */
  logo?: Blob;
  /** Skills this course is meant to build — links learning to the pipeline. */
  skillIds?: number[];
  /** Set once the finished course has been logged in the Certifications vault. */
  certId?: number;
  createdAt: string;
  updatedAt: string;
}

/** How keen the user is on a target employer. */
export type CompanyPriority = "dream" | "target" | "backup" | "watching";

/**
 * A researched target employer — the pre-work that makes cover letters and
 * interviews fast: what they do, what they specialise in, a notable project,
 * why the user's interested, upcoming opportunities, and interview talking
 * points. Can be autofilled by AI web research, then edited by hand.
 */
export interface Company {
  id: number;
  name: string;
  website?: string;
  track?: RoleTrack;
  priority?: CompanyPriority;
  /** Headline: what the company is and does. */
  overview?: string;
  /** What they specialise in / are known for technically. */
  specialisations?: string;
  /** Industries they're prominent in (tags). */
  industries?: string[];
  /** One notable project or achievement to reference. */
  notableProject?: string;
  /** Personal angle — why the user wants to work here (cover-letter hook). */
  whyInterested?: string;
  /** Internship / grad programs, deadlines, application links. */
  opportunities?: string;
  /** Ready-made talking points for interviews. */
  talkingPoints?: string;

  /* ── At-a-glance versions (§7.21) ─────────────────────────────────
     Short companions to the long fields above, shown as the dossier's
     tiles. The long text is never replaced; these sit alongside it. When
     one is missing the tile shows the first sentence of its long field. */
  /** ≤10 words: what the company is — the header line. */
  tagline?: string;
  /** 2–4 short tags for what they're known for. */
  knownFor?: string[];
  /** ≤8 words: the one fact worth dropping into a cover letter or interview. */
  hook?: string;
  /** ≤10 words: the applicant's angle, in their voice. */
  angleShort?: string;
  /** ≤8 words: the main role or program open right now. */
  roleShort?: string;
  /** ISO timestamp of the last AI research fill, if any. */
  researchedAt?: string;
  /**
   * Pages the research actually consulted. Present only when a lookup really
   * retrieved them — an empty or missing list means the dossier is unsourced
   * and must not be presented as if it were backed up.
   */
  sources?: ResearchSource[];
  /**
   * Which fields the last AI lookup filled. Used to mark them as suggestions
   * rather than things the user wrote or verified.
   */
  aiFilled?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Device-local bookkeeping (key/value). Not user content: excluded from
 * backups and from cloud sync.
 */
export interface MetaEntry {
  key: string;
  value: string;
}

/** A page the AI research step actually retrieved. */
export interface ResearchSource {
  url: string;
  title?: string;
}
