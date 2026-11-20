import Dexie, { type EntityTable } from "dexie";
import type {
  Application,
  ResumeVersion,
  CoverLetter,
  InterviewEntry,
  Certification,
  Company,
  Skill,
  Course,
  Achievement,
  SubmittedDocument,
  MetaEntry,
} from "./types";

/**
 * Single data-access chokepoint. Components never import Dexie directly —
 * all reads/writes go through the repositories below, so the Phase 4+
 * Supabase migration is a one-file swap. Indexed fields mirror the columns
 * the future Postgres tables will index.
 */
export const db = new Dexie("careercommand-hub") as Dexie & {
  applications: EntityTable<Application, "id">;
  resumeVersions: EntityTable<ResumeVersion, "id">;
  coverLetters: EntityTable<CoverLetter, "id">;
  interviewEntries: EntityTable<InterviewEntry, "id">;
  certifications: EntityTable<Certification, "id">;
  companies: EntityTable<Company, "id">;
  skills: EntityTable<Skill, "id">;
  courses: EntityTable<Course, "id">;
  achievements: EntityTable<Achievement, "id">;
  meta: EntityTable<MetaEntry, "key">;
};

db.version(2).stores({
  applications: "++id, company, track, status, appliedDate",
  resumeVersions: "++id, name, engine, track",
  coverLetters: "++id, company, position",
  interviewEntries: "++id, category",
});

// v3: RoleTrack changed from the old dual-track values to the three-way
// engineering / retail / hospitality. Migrate existing records so their
// track column keeps a valid value.
const TRACK_MIGRATION: Record<string, string> = {
  "technical-internship": "engineering",
  "part-time-retail": "retail",
};
db.version(3).upgrade(async (tx) => {
  const remap = (row: { track?: string }) => {
    if (row.track && TRACK_MIGRATION[row.track])
      row.track = TRACK_MIGRATION[row.track];
  };
  await tx.table("applications").toCollection().modify(remap);
  await tx.table("resumeVersions").toCollection().modify(remap);
});

// v4: Certifications module (Module 04) — stores credential metadata plus
// the uploaded certificate file as a Blob.
db.version(4).stores({
  applications: "++id, company, track, status, appliedDate",
  resumeVersions: "++id, name, engine, track",
  coverLetters: "++id, company, position",
  interviewEntries: "++id, category",
  certifications: "++id, title, issuer, issuedDate",
});

// v5: Company Intelligence module — researched target employers.
db.version(5).stores({
  applications: "++id, company, track, status, appliedDate",
  resumeVersions: "++id, name, engine, track",
  coverLetters: "++id, company, position",
  interviewEntries: "++id, category",
  certifications: "++id, title, issuer, issuedDate",
  companies: "++id, name, track, priority",
});

// v6: Skills module — current skill set + the growth pipeline
// (target → developing → have).
db.version(6).stores({
  applications: "++id, company, track, status, appliedDate",
  resumeVersions: "++id, name, engine, track",
  coverLetters: "++id, company, position",
  interviewEntries: "++id, category",
  certifications: "++id, title, issuer, issuedDate",
  companies: "++id, name, track, priority",
  skills: "++id, name, category, status",
});

// v7: Courses module — the learning queue (planned → in-progress →
// completed); completed courses can be logged into the Certifications vault.
db.version(7).stores({
  applications: "++id, company, track, status, appliedDate",
  resumeVersions: "++id, name, engine, track",
  coverLetters: "++id, company, position",
  interviewEntries: "++id, category",
  certifications: "++id, title, issuer, issuedDate",
  companies: "++id, name, track, priority",
  skills: "++id, name, category, status",
  courses: "++id, title, provider, status",
});

// v8: `meta` — small key/value bookkeeping that is NOT user content. It is
// deliberately excluded from backups and cloud sync. It records which account
// this device last held data for, so signing in as a different user clears the
// previous user's records instead of pushing them into the new account.
db.version(8).stores({
  applications: "++id, company, track, status, appliedDate",
  resumeVersions: "++id, name, engine, track",
  coverLetters: "++id, company, position",
  interviewEntries: "++id, category",
  certifications: "++id, title, issuer, issuedDate",
  companies: "++id, name, track, priority",
  skills: "++id, name, category, status",
  courses: "++id, title, provider, status",
  meta: "key",
});

// v9: the achievements bank (reusable STAR examples). Applications also gain
// dates, a job-description snapshot, submitted-document copies and status
// history — all optional fields on existing rows, so no data migration is
// needed and old records keep working untouched.
db.version(9).stores({
  applications: "++id, company, track, status, appliedDate",
  resumeVersions: "++id, name, engine, track",
  coverLetters: "++id, company, position",
  interviewEntries: "++id, category",
  certifications: "++id, title, issuer, issuedDate",
  companies: "++id, name, track, priority",
  skills: "++id, name, category, status",
  courses: "++id, title, provider, status",
  achievements: "++id, title",
  meta: "key",
});

const now = () => new Date().toISOString();

type NewRecord<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

export const applicationRepo = {
  list: (): Promise<Application[]> => db.applications.toArray(),

  add(data: NewRecord<Application>): Promise<number> {
    const ts = now();
    return db.applications.add({ ...data, createdAt: ts, updatedAt: ts });
  },

  update(id: number, patch: Partial<NewRecord<Application>>): Promise<number> {
    return db.applications.update(id, { ...patch, updatedAt: now() });
  },

  /**
   * Change status and record the transition. History is append-only — it's the
   * record of what actually happened, so it is never rewritten, and a no-op
   * change adds nothing.
   */
  async setStatus(id: number, status: Application["status"]): Promise<void> {
    const app = await db.applications.get(id);
    if (!app || app.status === status) {
      if (app) await this.update(id, { status });
      return;
    }
    const history = app.statusHistory ?? [
      // Backfill the starting point for rows that predate history tracking, so
      // the timeline doesn't begin mid-story.
      { status: app.status, at: app.createdAt },
    ];
    await db.applications.update(id, {
      status,
      statusHistory: [...history, { status, at: now() }],
      updatedAt: now(),
    });
  },

  remove: (id: number): Promise<void> => db.applications.delete(id),
};

/**
 * Snapshot a vault document onto an application — a copy, not a reference.
 * Editing or replacing the master afterwards must not change what this record
 * says was sent.
 */
export async function snapshotVaultDocument(
  kind: "resume" | "cv" | "cover",
): Promise<SubmittedDocument | null> {
  if (kind === "cover") {
    const c = await db.coverLetters.toCollection().last();
    if (!c) return null;
    return {
      name: c.title?.trim() || "Cover letter",
      kind,
      file: c.file,
      fileName: c.fileName,
      fileType: c.fileType,
      attachedAt: now(),
    };
  }
  const engine = kind === "cv" ? "cv" : "visual";
  const r = await db.resumeVersions.where("engine").equals(engine).last();
  if (!r) return null;
  return {
    name: r.name?.trim() || (kind === "cv" ? "Technical resume" : "Resume"),
    kind,
    file: r.file,
    fileName: r.fileName,
    fileType: r.fileType,
    attachedAt: now(),
  };
}

export const resumeRepo = {
  getByEngine: (engine: ResumeVersion["engine"]) =>
    db.resumeVersions.where("engine").equals(engine).last(),

  /**
   * Merge fields into a document, creating the row if it's the first write.
   * Dexie deletes any key set to `undefined`, which is how a stored file is
   * cleared.
   */
  async patch(
    engine: ResumeVersion["engine"],
    patch: Partial<Omit<ResumeVersion, "id" | "createdAt" | "updatedAt">>,
  ): Promise<void> {
    const existing = await this.getByEngine(engine);
    if (existing) {
      await db.resumeVersions.update(existing.id, {
        ...patch,
        updatedAt: now(),
      });
      return;
    }
    const ts = now();
    await db.resumeVersions.add({
      name: engine === "cv" ? "Technical Resume" : "Resume",
      engine,
      track: engine === "visual" ? "retail" : "engineering",
      content: "{}",
      ...patch,
      createdAt: ts,
      updatedAt: ts,
    } as ResumeVersion);
  },

  /**
   * Upsert a document's content, optionally renaming it. `name` is the vault
   * label (rename it per company); it's left untouched when omitted.
   */
  async saveContent(
    engine: ResumeVersion["engine"],
    content: string,
    name?: string,
  ): Promise<number> {
    const existing = await this.getByEngine(engine);
    if (existing) {
      await db.resumeVersions.update(existing.id, {
        content,
        ...(name ? { name } : {}),
        updatedAt: now(),
      });
      return existing.id;
    }
    const ts = now();
    return db.resumeVersions.add({
      name: name ?? (engine === "cv" ? "Technical Resume" : "Resume"),
      engine,
      track: engine === "visual" ? "retail" : "engineering",
      content,
      createdAt: ts,
      updatedAt: ts,
    });
  },
};

export const coverLetterRepo = {
  getLatest: () => db.coverLetters.toCollection().last(),

  async save(data: NewRecord<CoverLetter>): Promise<number> {
    const existing = await this.getLatest();
    if (existing) {
      await db.coverLetters.update(existing.id, {
        ...data,
        updatedAt: now(),
      });
      return existing.id;
    }
    const ts = now();
    return db.coverLetters.add({ ...data, createdAt: ts, updatedAt: ts });
  },
};

export const questionRepo = {
  list: (): Promise<InterviewEntry[]> => db.interviewEntries.toArray(),

  add(data: NewRecord<InterviewEntry>): Promise<number> {
    const ts = now();
    return db.interviewEntries.add({ ...data, createdAt: ts, updatedAt: ts });
  },

  bulkAdd(items: NewRecord<InterviewEntry>[]): Promise<number> {
    const ts = now();
    return db.interviewEntries.bulkAdd(
      items.map((item) => ({ ...item, createdAt: ts, updatedAt: ts })),
    );
  },

  update(
    id: number,
    patch: Partial<NewRecord<InterviewEntry>>,
  ): Promise<number> {
    return db.interviewEntries.update(id, { ...patch, updatedAt: now() });
  },

  remove: (id: number): Promise<void> => db.interviewEntries.delete(id),
};

export const certificationRepo = {
  list: (): Promise<Certification[]> => db.certifications.toArray(),

  add(data: NewRecord<Certification>): Promise<number> {
    const ts = now();
    return db.certifications.add({ ...data, createdAt: ts, updatedAt: ts });
  },

  bulkAdd(items: NewRecord<Certification>[]): Promise<number> {
    const ts = now();
    return db.certifications.bulkAdd(
      items.map((item) => ({ ...item, createdAt: ts, updatedAt: ts })),
    );
  },

  update(
    id: number,
    patch: Partial<NewRecord<Certification>>,
  ): Promise<number> {
    return db.certifications.update(id, { ...patch, updatedAt: now() });
  },

  remove: (id: number): Promise<void> => db.certifications.delete(id),
};

export const companyRepo = {
  list: (): Promise<Company[]> => db.companies.toArray(),

  add(data: NewRecord<Company>): Promise<number> {
    const ts = now();
    return db.companies.add({ ...data, createdAt: ts, updatedAt: ts });
  },

  update(id: number, patch: Partial<NewRecord<Company>>): Promise<number> {
    return db.companies.update(id, { ...patch, updatedAt: now() });
  },

  remove: (id: number): Promise<void> => db.companies.delete(id),
};

export const courseRepo = {
  list: (): Promise<Course[]> => db.courses.toArray(),

  add(data: NewRecord<Course>): Promise<number> {
    const ts = now();
    return db.courses.add({ ...data, createdAt: ts, updatedAt: ts });
  },

  bulkAdd(items: NewRecord<Course>[]): Promise<number> {
    const ts = now();
    return db.courses.bulkAdd(
      items.map((item) => ({ ...item, createdAt: ts, updatedAt: ts })),
    );
  },

  update(id: number, patch: Partial<NewRecord<Course>>): Promise<number> {
    return db.courses.update(id, { ...patch, updatedAt: now() });
  },

  remove: (id: number): Promise<void> => db.courses.delete(id),
};

export const skillRepo = {
  list: (): Promise<Skill[]> => db.skills.toArray(),

  add(data: NewRecord<Skill>): Promise<number> {
    const ts = now();
    return db.skills.add({ ...data, createdAt: ts, updatedAt: ts });
  },

  bulkAdd(items: NewRecord<Skill>[]): Promise<number> {
    const ts = now();
    return db.skills.bulkAdd(
      items.map((item) => ({ ...item, createdAt: ts, updatedAt: ts })),
    );
  },

  update(id: number, patch: Partial<NewRecord<Skill>>): Promise<number> {
    return db.skills.update(id, { ...patch, updatedAt: now() });
  },

  remove: (id: number): Promise<void> => db.skills.delete(id),
};

/**
 * Device bookkeeping — not user content, so it is never backed up or synced.
 */
export const metaRepo = {
  async get(key: string): Promise<string | null> {
    return (await db.meta.get(key))?.value ?? null;
  },

  set: async (key: string, value: string): Promise<void> => {
    await db.meta.put({ key, value });
  },
};

/**
 * How many documents the user has actually put in the vault. The built-in
 * templates don't count — only stored rows do, which is what makes this a
 * truthful "have you added a document yet?" signal.
 */
export const countStoredDocuments = async (): Promise<number> =>
  (await db.resumeVersions.count()) + (await db.coverLetters.count());

export const achievementRepo = {
  list: (): Promise<Achievement[]> => db.achievements.toArray(),

  add(data: NewRecord<Achievement>): Promise<number> {
    const ts = now();
    return db.achievements.add({ ...data, createdAt: ts, updatedAt: ts });
  },

  update(id: number, patch: Partial<NewRecord<Achievement>>): Promise<number> {
    return db.achievements.update(id, { ...patch, updatedAt: now() });
  },

  remove: (id: number): Promise<void> => db.achievements.delete(id),
};
