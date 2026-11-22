"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ResumePreview } from "@/components/workspace/ResumePreview";
import { CoverLetterPreview } from "@/components/workspace/CoverLetterPanel";
import {
  ACCEPT,
  isPdfFile,
  isWordFile,
  validateDocument,
} from "@/components/workspace/DocumentUpload";
import {
  ShelfCard,
  type ShelfContent,
  type ShelfTrack,
  type StoredFile,
} from "@/components/workspace/ShelfCard";
import {
  QuickLook,
  type QuickLookSource,
} from "@/components/workspace/QuickLook";
import { downloadFile, downloadWordFromHtml } from "@/lib/latex";
import { releasePdf } from "@/lib/pdf";
import { applicationRepo, resumeRepo, coverLetterRepo } from "@/lib/db";
import { useIsOwner } from "@/lib/owner";
import {
  EMPTY_COVER_FIELDS,
  splitSkills,
  type CoverLetterFields,
  type ResumeContent,
} from "@/lib/resume";
import {
  PERSONAL_TEMPLATES_FILENAME,
  hasResumeContent,
  importPersonalTemplates,
  missingTemplates,
  parsePersonalTemplates,
} from "@/lib/personalTemplates";

/**
 * The document vault. This is deliberately NOT an editor — it's the shelf you
 * reach for when an application is due: recognise the document by its cover,
 * look through it in Quick Look, take the original. A document is either a
 * stored PDF/Word file (kept byte-for-byte as imported) or, until one is
 * stored, the built-in rendered template.
 */

type Doc = "visual" | "cover" | "cv";
const isDoc = (v: string | null): v is Doc =>
  v === "visual" || v === "cover" || v === "cv";

/**
 * The three vault slots. `kind` is what the document IS, in the words someone
 * would use to ask for it; `track` picks the cover colour and is always
 * written out as well.
 */
const DOCS: {
  id: Doc;
  kind: string;
  track: ShelfTrack;
  trackLabel: string;
  /** The Tracker's snapshot kind for this slot (SubmittedDocument.kind). */
  snapshotKind: "resume" | "cv" | "cover";
  defaultTitle: string;
  defaultBlurb: string;
}[] = [
  {
    id: "cv",
    kind: "Technical resume",
    track: "eng",
    trackLabel: "Engineering",
    snapshotKind: "cv",
    defaultTitle: "Technical Resume",
    defaultBlurb: "Multi-page · engineering roles",
  },
  {
    id: "visual",
    kind: "Resume",
    track: "retail",
    trackLabel: "Retail & hospitality",
    snapshotKind: "resume",
    defaultTitle: "Hamdan Zahid — Resume",
    defaultBlurb: "Visual résumé · retail & hospitality",
  },
  {
    id: "cover",
    kind: "Cover letter",
    track: "letter",
    trackLabel: "Cover letter",
    snapshotKind: "cover",
    defaultTitle: "Hamdan Zahid — Cover Letter",
    defaultBlurb: "Letter template · reused per application",
  },
];

/**
 * Labels the repository assigns on its own (now and historically). They're not
 * user intent, so treat them as "unnamed" and let the vault's own default show
 * through — otherwise a row auto-created as "Resume" would mask
 * "Hamdan Zahid — Resume".
 */
const AUTO_NAMES = new Set([
  "Resume",
  "Retail Resume",
  "Technical Resume",
  "Extended CV",
]);
const storedTitle = (name?: string) => {
  const v = name?.trim() ?? "";
  return v && !AUTO_NAMES.has(v) ? v : "";
};

/** Filename-safe slug from a vault title. */
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";

// useSearchParams needs a Suspense boundary to build.
export default function VaultPage() {
  return (
    <Suspense fallback={null}>
      <Vault />
    </Suspense>
  );
}

function Vault() {
  /** Owner-only labels and the template-import prompt — see lib/owner.ts. */
  const isOwner = useIsOwner();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get("doc");
  const readerDoc: Doc | null = isDoc(param) ? param : null;

  const [retail, setRetail] = useState<ResumeContent | null>(null);
  const [cv, setCv] = useState<ResumeContent | null>(null);
  const [coverFields, setCoverFields] =
    useState<CoverLetterFields>(EMPTY_COVER_FIELDS);
  const [coverBody, setCoverBody] = useState("");
  /** Bumped to re-read storage after the personal-template import. */
  const [reloadKey, setReloadKey] = useState(0);
  /** Template slots the owner's account hasn't imported yet (§7.32). */
  const [missing, setMissing] = useState<string[]>([]);
  const [updated, setUpdated] = useState<Record<Doc, string | null>>({
    visual: null,
    cover: null,
    cv: null,
  });
  /** Vault labels — renameable so a document can be made company-specific. */
  const [titles, setTitles] = useState<Record<Doc, string>>({
    visual: "",
    cover: "",
    cv: "",
  });
  /** Captions under each title — free text. */
  const [blurbs, setBlurbs] = useState<Record<Doc, string>>({
    visual: "",
    cover: "",
    cv: "",
  });
  /** Imported PDF/Word files; when present they *are* the document. */
  const [files, setFiles] = useState<Record<Doc, StoredFile | null>>({
    visual: null,
    cover: null,
    cv: null,
  });
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const applications = useLiveQuery(() => applicationRepo.list(), []);

  const touch = (id: Doc) =>
    setUpdated((p) => ({ ...p, [id]: new Date().toISOString() }));

  /*
   * Load stored documents. There are no built-in fallbacks any more (§7.32):
   * a slot shows only what this account has stored, so a new account's Vault
   * is empty and the owner's templates come from the owner's own rows. Waits
   * for `isOwner` so the owner's labels don't flicker in after the cards.
   */
  useEffect(() => {
    if (isOwner === null) return;
    (async () => {
      const [r, v, c] = await Promise.all([
        resumeRepo.getByEngine("visual"),
        resumeRepo.getByEngine("cv"),
        coverLetterRepo.getLatest(),
      ]);
      setRetail(hasResumeContent(r?.content) ? JSON.parse(r!.content) : null);
      setCv(hasResumeContent(v?.content) ? JSON.parse(v!.content) : null);
      if (c) {
        setCoverFields({
          yourName: c.yourName ?? "",
          company: c.company,
          position: c.position,
          hiringManager: c.hiringManager ?? "",
          keySkills: c.keySkills.join(", "),
          hook: c.hook ?? "",
          track: c.tone ?? "technical",
          contactLine: c.contactLine ?? "",
          locationLine: c.locationLine ?? "",
          greeting: c.greeting ?? "",
          date: c.letterDate ?? "",
          closing: c.closing ?? "",
        });
        setCoverBody(c.body);
      } else {
        setCoverFields(EMPTY_COVER_FIELDS);
        setCoverBody("");
      }
      // Rows holding only the imported templates show no date, as the
      // built-in defaults they replace never did.
      const dated = (row?: { updatedAt: string; builtIn?: boolean }) =>
        row && !row.builtIn ? row.updatedAt : null;
      setUpdated({ visual: dated(r), cv: dated(v), cover: dated(c) });
      setTitles({
        visual: storedTitle(r?.name),
        cv: storedTitle(v?.name),
        cover: c?.title?.trim() || "",
      });
      setBlurbs({
        visual: r?.blurb ?? "",
        cv: v?.blurb ?? "",
        cover: c?.blurb ?? "",
      });
      const asStored = (
        blob?: Blob,
        name?: string,
        type?: string,
      ): StoredFile | null =>
        blob ? { blob, name: name ?? "document", type: type ?? "" } : null;
      setFiles({
        visual: asStored(r?.file, r?.fileName, r?.fileType),
        cv: asStored(v?.file, v?.fileName, v?.fileType),
        cover: asStored(c?.file, c?.fileName, c?.fileType),
      });
      setMissing(isOwner ? await missingTemplates() : []);
      setLoaded(true);
    })();
  }, [isOwner, reloadKey]);

  /*
   * NOTE: there is deliberately no auto-save of `retail` / `cv` / cover state
   * here. Since §7.12 the vault doesn't edit document content, so those values
   * only ever change once — in the load effect above. (It used to fall back
   * to built-in default templates when nothing was stored; see §7.32.)
   *
   * A debounced auto-save on them therefore fired on *every page visit* and
   * wrote the default templates into storage as if the user had authored them.
   * On a device with no data that manufactured three documents out of nothing,
   * which then synced upward as real records. Renames, captions and file
   * imports all persist explicitly below, so nothing is lost by not saving
   * state the user never touched.
   */

  /**
   * The cover letter is stored as one row, so every save rewrites all of its
   * fields — the title is passed explicitly rather than read from state, so a
   * rename doesn't race the state update.
   */
  const saveCover = (
    title: string | undefined,
    extra: Partial<Parameters<typeof coverLetterRepo.save>[0]> = {},
  ) =>
    coverLetterRepo.save({
      title,
      blurb: blurbs.cover || undefined,
      ...extra,
      company: coverFields.company,
      position: coverFields.position,
      keySkills: splitSkills(coverFields.keySkills),
      body: coverBody,
      yourName: coverFields.yourName,
      hiringManager: coverFields.hiringManager,
      hook: coverFields.hook,
      tone: coverFields.track,
      contactLine: coverFields.contactLine,
      locationLine: coverFields.locationLine,
      greeting: coverFields.greeting,
      letterDate: coverFields.date,
      closing: coverFields.closing,
    });

  /**
   * The fallback label for an unnamed slot. DOCS.defaultTitle carries the
   * owner's name, so everyone else falls back to the generic kind.
   */
  const defaultLabel = (id: Doc) => {
    const d = DOCS.find((x) => x.id === id)!;
    return isOwner ? d.defaultTitle : d.kind;
  };
  const titleOf = (id: Doc) => titles[id] || defaultLabel(id);

  /** Rename a document. Blank restores the default label. */
  const rename = async (id: Doc, raw: string) => {
    const next = raw.trim();
    if (next === titles[id]) return;
    setTitles((p) => ({ ...p, [id]: next }));
    setSaveState("saving");
    if (id === "cover") {
      await saveCover(next || undefined);
    } else {
      const content = id === "cv" ? cv : retail;
      if (content)
        await resumeRepo.saveContent(
          id,
          JSON.stringify(content),
          next || defaultLabel(id),
        );
      // A stored file with no template behind it still keeps its name; an
      // empty slot writes nothing (no document row out of a rename alone).
      else if (files[id])
        await resumeRepo.patch(id, { name: next || defaultLabel(id) });
    }
    setSaveState("saved");
    touch(id);
  };

  /** Edit the caption under a title. Blank restores the default. */
  const reblurb = async (id: Doc, raw: string) => {
    const next = raw.trim();
    if (next === blurbs[id]) return;
    setBlurbs((p) => ({ ...p, [id]: next }));
    setSaveState("saving");
    if (id === "cover") await saveCover(titles.cover || undefined, { blurb: next || undefined });
    else await resumeRepo.patch(id, { blurb: next || undefined });
    setSaveState("saved");
    touch(id);
  };

  /** Store an imported PDF/Word file — it becomes the document. */
  const storeFile = async (id: Doc, file: File) => {
    setSaveState("saving");
    const meta = { file, fileName: file.name, fileType: file.type };
    if (id === "cover") await saveCover(titles.cover || undefined, meta);
    else await resumeRepo.patch(id, meta);
    releasePdf(files[id]?.blob);
    setFiles((p) => ({
      ...p,
      [id]: { blob: file, name: file.name, type: file.type },
    }));
    setSaveState("saved");
    touch(id);
  };

  /** Drop the stored file and fall back to the built-in template. */
  const clearFile = async (id: Doc) => {
    const stored = files[id];
    if (
      !window.confirm(
        `Remove ${stored?.name ?? "the stored file"} from the vault? Download it first if you don't have another copy.`,
      )
    )
      return;
    setSaveState("saving");
    const cleared = {
      file: undefined,
      fileName: undefined,
      fileType: undefined,
    };
    if (id === "cover") await saveCover(titles.cover || undefined, cleared);
    else await resumeRepo.patch(id, cleared);
    releasePdf(stored?.blob);
    setFiles((p) => ({ ...p, [id]: null }));
    setSaveState("saved");
    touch(id);
  };

  /** The stored upload, with its own filename and bytes. */
  const downloadOriginal = (id: Doc) => {
    const f = files[id];
    if (f) downloadFile(f.blob, f.name);
  };

  /** Built-in template → PDF via the print engine (prints #print-area). */
  const printTemplate = (id: Doc) => {
    const prev = document.title; // the browser uses this as the filename
    document.title = titleOf(id);
    window.print();
    document.title = prev;
  };

  /** Built-in template → Word, converted from the rendered page. */
  const templateToWord = (id: Doc) => {
    const html = document.getElementById("print-area")?.innerHTML;
    if (html) downloadWordFromHtml(html, slug(titleOf(id)));
  };

  const templateFor = (id: Doc) =>
    id === "cover" ? (
      <CoverLetterPreview fields={coverFields} body={coverBody} />
    ) : (id === "cv" ? cv : retail) ? (
      <ResumePreview engine={id} content={(id === "cv" ? cv : retail)!} />
    ) : null;

  const contentFor = (id: Doc): ShelfContent => {
    const f = files[id];
    if (f) return { kind: "file", file: f };
    const hasTemplate =
      id === "cover" ? Boolean(coverBody.trim()) : Boolean(id === "cv" ? cv : retail);
    return hasTemplate
      ? { kind: "template", preview: templateFor(id) }
      : { kind: "empty" };
  };

  /** The latest application the Tracker recorded this slot being sent to. */
  const lastUsedFor = (id: Doc) => {
    const kind = DOCS.find((d) => d.id === id)!.snapshotKind;
    let best: { company: string; at: string } | null = null;
    for (const a of applications ?? []) {
      for (const s of [a.submittedResume, a.submittedCover]) {
        if (s?.kind === kind && (!best || s.attachedAt > best.at))
          best = { company: a.company || "an application", at: s.attachedAt };
      }
    }
    return best;
  };

  /* ── Quick Look open/close, focus and scroll restoration ─────────── */

  const cardRefs = useRef<Partial<Record<Doc, HTMLButtonElement | null>>>({});
  const returnTo = useRef<{ doc: Doc; scroll: number } | null>(null);
  /** True when this page pushed the ?doc= entry, so Back can pop it. */
  const pushed = useRef(false);
  /** The layout's scroll container. */
  const mainEl = () => document.querySelector("main");

  const openReader = (id: Doc) => {
    const main = mainEl();
    returnTo.current = { doc: id, scroll: main?.scrollTop ?? 0 };
    // Next.js integrates native pushState with its router, so browser Back
    // closes the reader in one step.
    window.history.pushState(null, "", `${pathname}?doc=${id}`);
    pushed.current = true;
    main?.scrollTo({ top: 0 });
  };

  const closeReader = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", pathname);
    }
  };

  // When the reader closes (button, Escape or browser Back), put the shelf
  // back where it was and return focus to the card that opened it.
  useEffect(() => {
    if (readerDoc) return;
    pushed.current = false;
    const back = returnTo.current;
    if (!back) return;
    returnTo.current = null;
    requestAnimationFrame(() => {
      mainEl()?.scrollTo({ top: back.scroll });
      cardRefs.current[back.doc]?.focus({ preventScroll: true });
    });
  }, [readerDoc]);

  /* ── Import file (top of the shelf) ───────────────────────────────── */

  const importInput = useRef<HTMLInputElement>(null);
  const importTarget = useRef<Doc>("cv");
  const [importOpen, setImportOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  /* ── One-time personal-template import (owner only, §7.32) ─────── */

  const templatesInput = useRef<HTMLInputElement>(null);
  const [templatesNote, setTemplatesNote] = useState<string | null>(null);

  const importTemplates = async (file: File) => {
    setImportError(null);
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setImportError(`That file isn't readable JSON. Choose ${PERSONAL_TEMPLATES_FILENAME}.`);
      return;
    }
    const parsed = parsePersonalTemplates(json);
    if (!parsed.ok) {
      setImportError(parsed.reason);
      return;
    }
    setSaveState("saving");
    try {
      const added = await importPersonalTemplates(parsed.data);
      setTemplatesNote(
        added.length
          ? `Imported your ${added.join(", ")}. They sync like the rest of your data.`
          : "Nothing to import — this account already has those templates.",
      );
      setSaveState("saved");
      setReloadKey((k) => k + 1);
    } catch (e) {
      setSaveState("idle");
      setImportError(
        `Couldn't import the templates${e instanceof Error ? `: ${e.message}` : ""}. Nothing was changed.`,
      );
    }
  };

  const chooseImport = (id: Doc) => {
    importTarget.current = id;
    setImportOpen(false);
    importInput.current?.click();
  };

  /* ── Render ───────────────────────────────────────────────────────── */

  if (readerDoc && loaded) {
    const d = DOCS.find((x) => x.id === readerDoc)!;
    const f = files[readerDoc];
    const template = templateFor(readerDoc);
    const source: QuickLookSource | null = f
      ? isPdfFile(f.type, f.name)
        ? { kind: "pdf", blob: f.blob, fileName: f.name }
        : { kind: "word", blob: f.blob, fileName: f.name }
      : template && (readerDoc !== "cover" || coverBody.trim())
        ? { kind: "template", render: template }
        : null;

    if (source)
      return (
        <QuickLook
          key={readerDoc}
          title={titleOf(readerDoc)}
          trackLabel={
            d.kind === d.trackLabel ? d.kind : `${d.trackLabel} · ${d.kind}`
          }
          source={source}
          onClose={closeReader}
          onDownloadOriginal={f ? () => downloadOriginal(readerDoc) : undefined}
          templateActions={
            source.kind === "template" ? (
              <>
                <button
                  onClick={() => templateToWord(readerDoc)}
                  className="min-h-9 rounded-sm border border-edge-strong px-3 font-mono text-[11px] text-ink-muted transition-colors hover:border-accent hover:text-ink"
                >
                  ↓ Word
                </button>
                <button
                  onClick={() => printTemplate(readerDoc)}
                  className="min-h-9 rounded-sm bg-accent px-3 text-xs font-semibold text-bg transition-colors hover:bg-accent-strong"
                >
                  ↓ PDF
                </button>
              </>
            ) : undefined
          }
        />
      );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col p-5">
      <input
        ref={importInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const problem = validateDocument(file);
          setImportError(problem);
          if (!problem) void storeFile(importTarget.current, file);
        }}
      />

      {/* ── Shelf header ────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            {DOCS.length} documents
          </p>
          <p className="mt-1 max-w-xl text-xs text-ink-muted">
            Open one to read it here, or take the original straight away.
            Imported PDF and Word files are kept exactly as you uploaded them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} />
          <div className="relative">
            <button
              onClick={() => setImportOpen((o) => !o)}
              aria-expanded={importOpen}
              aria-haspopup="menu"
              className="flex min-h-9 items-center gap-1.5 rounded-sm border border-accent-dim bg-accent-dim px-3 text-xs font-semibold text-accent-strong transition-colors hover:border-accent hover:bg-accent hover:text-bg"
            >
              Import file <span aria-hidden>▾</span>
            </button>
            {importOpen && (
              <div
                role="menu"
                onKeyDown={(e) => e.key === "Escape" && setImportOpen(false)}
                className="animate-fade-in absolute top-full right-0 z-20 mt-2 w-64 rounded-md border border-edge-strong bg-raised p-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]"
              >
                <p className="px-2.5 pt-1.5 pb-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                  Store it as…
                </p>
                {DOCS.map((d) => (
                  <button
                    key={d.id}
                    role="menuitem"
                    onClick={() => chooseImport(d.id)}
                    className="block min-h-11 w-full rounded-sm px-2.5 py-1.5 text-left transition-colors hover:bg-panel"
                  >
                    <span className="block text-xs font-medium text-ink">
                      {d.kind}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-ink-faint">
                      {files[d.id]
                        ? `Replaces ${files[d.id]!.name}`
                        : d.defaultBlurb}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isOwner && loaded && missing.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent-dim bg-panel p-3">
          <input
            ref={templatesInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importTemplates(file);
            }}
          />
          <p className="max-w-2xl text-xs text-ink-muted">
            <span className="font-medium text-ink">
              Your built-in templates have moved out of the app.{" "}
            </span>
            Import them once from{" "}
            <span className="font-mono text-[11px] text-ink">
              {PERSONAL_TEMPLATES_FILENAME}
            </span>{" "}
            and they&apos;ll be kept with your own data and sync to your other
            devices. Nothing you already have is overwritten.
          </p>
          <button
            onClick={() => templatesInput.current?.click()}
            className="min-h-9 shrink-0 rounded-sm bg-accent px-3 text-xs font-semibold text-bg transition-colors hover:bg-accent-strong"
          >
            Import templates
          </button>
        </div>
      )}

      {templatesNote && (
        <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-md border border-edge bg-panel p-3">
          <p className="text-xs text-ink-muted">{templatesNote}</p>
          <button
            onClick={() => setTemplatesNote(null)}
            className="shrink-0 text-[11px] text-ink-muted hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}

      {importError && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-md border border-danger/40 bg-panel p-3">
          <p className="text-xs text-ink-muted">
            <span className="font-medium text-danger">Import failed. </span>
            {importError}
          </p>
          <button
            onClick={() => setImportError(null)}
            className="shrink-0 text-[11px] text-ink-muted hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── The shelf ───────────────────────────────────────────────── */}
      {!loaded ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS.map((d) => (
            <div key={d.id} className="h-80 animate-pulse-soft rounded-lg border border-edge bg-panel max-sm:h-32" />
          ))}
        </div>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:min-h-[30rem] lg:flex-1 lg:grid-cols-3 lg:items-stretch">
          {DOCS.map((d) => (
            <ShelfCard
              key={d.id}
              slot={d.id}
              kindLabel={d.kind}
              track={d.track}
              trackLabel={d.trackLabel}
              title={titles[d.id]}
              placeholderTitle={defaultLabel(d.id)}
              blurb={blurbs[d.id]}
              defaultBlurb={d.defaultBlurb}
              content={contentFor(d.id)}
              updatedAt={updated[d.id]}
              lastUsed={lastUsedFor(d.id)}
              openRef={(el) => {
                cardRefs.current[d.id] = el;
              }}
              onOpen={() => openReader(d.id)}
              onDownloadOriginal={() => downloadOriginal(d.id)}
              onRename={(v) => void rename(d.id, v)}
              onReblurb={(v) => void reblurb(d.id, v)}
              onReplace={(file) => storeFile(d.id, file)}
              onRemove={() => void clearFile(d.id)}
            />
          ))}
        </div>
      )}

      <p className="mt-5 font-mono text-[10px] text-ink-faint">
        {isWordFile(files.cv?.type, files.cv?.name) ||
        isWordFile(files.visual?.type, files.visual?.name) ||
        isWordFile(files.cover?.type, files.cover?.name)
          ? "Word files can't be previewed in a browser — Quick Look offers the original instead."
          : "Tip: Quick Look turns pages with the arrow keys, and Escape brings you back here."}
      </p>
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "idle") return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
      <span
        className={`size-1.5 rounded-full ${
          state === "saving" ? "animate-pulse-soft bg-warn" : "bg-accent"
        }`}
      />
      {state === "saving" ? "saving" : "saved"}
    </span>
  );
}
