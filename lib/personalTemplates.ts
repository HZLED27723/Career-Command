import { db } from "./db";
import { splitSkills, type CoverLetterFields, type ResumeContent } from "./resume";
import type { Certification, CoverLetter, ResumeVersion } from "./types";

/**
 * One-time import of the owner's personal Vault templates (§7.32).
 *
 * The owner's real résumé, CV and cover letter used to be hard-coded as
 * defaults in lib/resume.ts, so their text — email and phone included —
 * shipped in the public JavaScript bundle. They were exported once to a
 * private file (`careercommand-personal-templates.json`, kept outside the
 * repo) and now live only in the owner's own rows, which sync like every
 * other record.
 *
 * The import only ever FILLS what is missing. It never overwrites content,
 * a name or caption, a stored file, or a date: rows it fills in place
 * keep their `updatedAt`, and rows it creates are marked `builtIn` so the
 * Vault shows them exactly as it showed the old built-in defaults.
 *
 * Nothing here is owner-specific: the file is the only thing that carries
 * personal content, and it never ships with the app.
 */

export const PERSONAL_TEMPLATES_FORMAT = "careercommand-personal-templates";
export const PERSONAL_TEMPLATES_FILENAME = "careercommand-personal-templates.json";

type SeedCertification = Pick<
  Certification,
  "title" | "issuer" | "issuedDate" | "credentialType"
>;

export interface PersonalTemplates {
  format: typeof PERSONAL_TEMPLATES_FORMAT;
  version: 1;
  visual?: { content: ResumeContent };
  cv?: { content: ResumeContent };
  cover?: { fields: CoverLetterFields; body: string };
  /** Added only to an account with no certifications at all. */
  certifications?: SeedCertification[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isResumeContent = (v: unknown): v is ResumeContent =>
  isRecord(v) && typeof v.name === "string" && Array.isArray(v.sections);

/** True when a stored `content` string holds a renderable résumé. */
export function hasResumeContent(content?: string): boolean {
  if (!content) return false;
  try {
    return isResumeContent(JSON.parse(content));
  } catch {
    return false;
  }
}

/**
 * The cover-letter fields the Vault used to fill from the built-in default
 * when a stored row lacked them (`c.yourName ?? DEFAULT…`).
 */
const COVER_FALLBACKS = [
  ["yourName", "yourName"],
  ["contactLine", "contactLine"],
  ["locationLine", "locationLine"],
  ["greeting", "greeting"],
  ["closing", "closing"],
] as const satisfies readonly (readonly [keyof CoverLetter, keyof CoverLetterFields])[];

/** Validate a parsed file. Returns the templates, or a reason it's unusable. */
export function parsePersonalTemplates(
  json: unknown,
): { ok: true; data: PersonalTemplates } | { ok: false; reason: string } {
  if (!isRecord(json) || json.format !== PERSONAL_TEMPLATES_FORMAT)
    return {
      ok: false,
      reason: `That isn't a personal-templates file. Choose ${PERSONAL_TEMPLATES_FILENAME}.`,
    };
  if (json.version !== 1)
    return {
      ok: false,
      reason: "This file was made by a newer version of CareerCommand.",
    };
  for (const slot of ["visual", "cv"] as const) {
    const s = json[slot];
    if (s !== undefined && !(isRecord(s) && isResumeContent(s.content)))
      return { ok: false, reason: `The ${slot} résumé in this file is damaged.` };
  }
  const cover = json.cover;
  if (
    cover !== undefined &&
    !(isRecord(cover) && isRecord(cover.fields) && typeof cover.body === "string")
  )
    return { ok: false, reason: "The cover letter in this file is damaged." };
  const certs = json.certifications;
  if (
    certs !== undefined &&
    !(
      Array.isArray(certs) &&
      certs.every(
        (c) => isRecord(c) && typeof c.title === "string" && typeof c.issuer === "string",
      )
    )
  )
    return { ok: false, reason: "The certifications in this file are damaged." };
  return { ok: true, data: json as unknown as PersonalTemplates };
}

/**
 * Which Vault templates this account is missing — what the import would
 * fill. Empty once the import has run (on this or any synced device).
 */
export async function missingTemplates(): Promise<("visual" | "cv" | "cover")[]> {
  const [visual, cv, cover] = await Promise.all([
    db.resumeVersions.where("engine").equals("visual").last(),
    db.resumeVersions.where("engine").equals("cv").last(),
    db.coverLetters.toCollection().last(),
  ]);
  const missing: ("visual" | "cv" | "cover")[] = [];
  if (!hasResumeContent(visual?.content)) missing.push("visual");
  if (!hasResumeContent(cv?.content)) missing.push("cv");
  if (
    !cover ||
    !cover.body?.trim() ||
    COVER_FALLBACKS.some(([k]) => cover[k] === undefined)
  )
    missing.push("cover");
  return missing;
}

/**
 * Fill the account's empty template slots from the file. One transaction, so
 * a failure leaves nothing half-written. Returns what was added, in words.
 */
export async function importPersonalTemplates(
  data: PersonalTemplates,
): Promise<string[]> {
  const done: string[] = [];
  const ts = new Date().toISOString();

  await db.transaction(
    "rw",
    [db.resumeVersions, db.coverLetters, db.certifications],
    async () => {
      for (const engine of ["visual", "cv"] as const) {
        const src = data[engine];
        if (!src) continue;
        const label = engine === "cv" ? "technical résumé" : "résumé";
        const row = await db.resumeVersions.where("engine").equals(engine).last();
        const content = JSON.stringify(src.content);

        if (!row) {
          await db.resumeVersions.add({
            name: engine === "cv" ? "Technical Resume" : "Resume",
            engine,
            track: engine === "visual" ? "retail" : "engineering",
            content,
            builtIn: true,
            createdAt: ts,
            updatedAt: ts,
          } as ResumeVersion);
          done.push(label);
          continue;
        }
        // Fill in place, keeping the row's name, caption, file and date.
        if (!hasResumeContent(row.content)) {
          await db.resumeVersions.update(row.id, { content });
          done.push(label);
        }
      }

      if (data.cover) {
        const { fields, body } = data.cover;
        const letter = {
          company: fields.company ?? "",
          position: fields.position ?? "",
          keySkills: splitSkills(fields.keySkills ?? ""),
          body,
          yourName: fields.yourName,
          hiringManager: fields.hiringManager,
          hook: fields.hook,
          tone: fields.track,
          contactLine: fields.contactLine,
          locationLine: fields.locationLine,
          greeting: fields.greeting,
          letterDate: fields.date,
          closing: fields.closing,
        } satisfies Partial<CoverLetter>;
        const row = await db.coverLetters.toCollection().last();
        if (!row) {
          await db.coverLetters.add({
            ...letter,
            builtIn: true,
            createdAt: ts,
            updatedAt: ts,
          } as CoverLetter);
          done.push("cover letter");
        } else {
          const patch: Partial<CoverLetter> = {};
          if (!row.body?.trim()) {
            // A row with no letter in it — saved by a rename, caption or file
            // import before this ran. Fill the letter, keep everything else.
            for (const [k, v] of Object.entries(letter) as [keyof typeof letter, unknown][]) {
              const cur = row[k];
              if (cur === undefined || cur === "" || (Array.isArray(cur) && cur.length === 0))
                patch[k] = v as never;
            }
          } else {
            for (const [k, f] of COVER_FALLBACKS)
              if (row[k] === undefined) patch[k] = fields[f] as never;
          }
          if (Object.keys(patch).length) {
            await db.coverLetters.update(row.id, patch);
            done.push("cover letter");
          }
        }
      }

      if (data.certifications?.length && (await db.certifications.count()) === 0) {
        await db.certifications.bulkAdd(
          data.certifications.map(
            (c) => ({ ...c, createdAt: ts, updatedAt: ts }) as Certification,
          ),
        );
        done.push(`${data.certifications.length} certifications`);
      }
    },
  );

  return done;
}
