"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { certificationRepo, courseRepo } from "@/lib/db";
import type { Certification, CredentialType } from "@/lib/types";
import { useIsOwner } from "@/lib/owner";
import { daysUntil, parseLocalDate } from "@/lib/actions";
import {
  formatIssued,
  issuedSortKey,
  issuerKey,
  monogram,
  monogramColour,
  shrinkLogo,
} from "@/lib/credentials";
import { formatDate } from "@/components/workspace/ShelfCard";
import {
  QuickLook,
  type QuickLookSource,
} from "@/components/workspace/QuickLook";

/**
 * Certifications as uniform credential cards (§7.19), LinkedIn-style: a type
 * badge up front, the issuer's logo on the right, then title / issuer / date in
 * fixed positions. Every card is the same shape whatever the certificate looks
 * like; the certificate itself opens in Quick Look from the logo or
 * "Show credential".
 */

type Draft = {
  id?: number;
  title: string;
  issuer: string;
  issuedDate: string;
  credentialType: CredentialType;
  expiresDate: string;
  credentialId: string;
  url: string;
  issuerLogo?: Blob;
  file?: Blob;
  fileName?: string;
  fileType?: string;
};

const TYPE_LABEL: Record<CredentialType, string> = {
  certificate: "Certificate",
  licence: "Licence",
  membership: "Membership",
  course: "Course completion",
};

/** Older rows have no type: a course-logged one is a course, else a certificate. */
const typeOf = (c: Certification): CredentialType =>
  c.credentialType ?? (c.fromCourseId !== undefined ? "course" : "certificate");

/**
 * The owner's four real credentials. Personal records, not sample data — so
 * the button that adds them is only offered to the owner (see lib/owner.ts).
 * "Add the 4 from your CV" is literally true for him and false for anyone
 * else, who would be importing a stranger's certificates.
 */
const CV_SEED = [
  { title: "Flight Test Engineering Virtual Internship", issuer: "Nova Systems", issuedDate: "2026", credentialType: "certificate" as const },
  { title: "Big Industry Challenge Certificate", issuer: "Common Purpose", issuedDate: "2025", credentialType: "certificate" as const },
  { title: "MATLAB Onramp Certificate", issuer: "MathWorks", issuedDate: "2025", credentialType: "certificate" as const },
  { title: "Student Member", issuer: "Engineers Australia", issuedDate: "2024", credentialType: "membership" as const },
];

const ACCEPT = "application/pdf,image/*";

const draftFromFile = (file: File): Draft => ({
  title: file.name.replace(/\.[^.]+$/, ""),
  issuer: "",
  issuedDate: "",
  credentialType: "certificate",
  expiresDate: "",
  credentialId: "",
  url: "",
  file,
  fileName: file.name,
  fileType: file.type,
});

const draftFromCert = (cert: Certification): Draft => ({
  id: cert.id,
  title: cert.title,
  issuer: cert.issuer,
  issuedDate: cert.issuedDate ?? "",
  credentialType: typeOf(cert),
  expiresDate: cert.expiresDate ?? "",
  credentialId: cert.credentialId ?? "",
  url: cert.url ?? "",
  issuerLogo: cert.issuerLogo,
  file: cert.file,
  fileName: cert.fileName,
  fileType: cert.fileType,
});

const isImage = (c: Pick<Certification, "fileType" | "fileName">) =>
  Boolean(c.fileType?.startsWith("image/")) ||
  /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(c.fileName ?? "");

/** Only follow links that are actually web addresses. */
const safeUrl = (raw?: string): string | null => {
  const s = raw?.trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
};

/** Pick a file and attach it to an existing record. */
function attachProof(cert: Certification) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ACCEPT;
  input.onchange = () => {
    const file = input.files?.[0];
    if (file)
      void certificationRepo.update(cert.id, {
        file,
        fileName: file.name,
        fileType: file.type,
      });
  };
  input.click();
}

// useSearchParams needs a Suspense boundary to build.
export default function CertificationsPage() {
  return (
    <Suspense fallback={null}>
      <Certifications />
    </Suspense>
  );
}

function Certifications() {
  const isOwner = useIsOwner();
  const certs = useLiveQuery(() => certificationRepo.list(), []);
  const courses = useLiveQuery(() => courseRepo.list(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewingId = Number(searchParams.get("cert")) || null;

  // Newest first by the date actually meant, not the string as typed;
  // undated entries last.
  const sorted = useMemo(
    () =>
      [...(certs ?? [])].sort(
        (a, b) =>
          issuedSortKey(b.issuedDate) - issuedSortKey(a.issuedDate) ||
          a.title.localeCompare(b.title),
      ),
    [certs],
  );
  const withProof = sorted.filter((c) => c.file).length;

  /**
   * One logo per issuer: any credential's upload, else a course logo from the
   * same provider. Add MathWorks once and every MathWorks credential shows it.
   */
  const sharedLogos = useMemo(() => {
    const map = new Map<string, Blob>();
    for (const c of courses ?? [])
      if (c.logo && c.provider) map.set(issuerKey(c.provider), c.logo);
    for (const c of certs ?? [])
      if (c.issuerLogo && c.issuer) map.set(issuerKey(c.issuer), c.issuerLogo);
    return map;
  }, [certs, courses]);
  const logoFor = (issuer: string, own?: Blob) =>
    own ?? sharedLogos.get(issuerKey(issuer));

  const onPickFile = (file: File | undefined) => {
    if (file) setDraft(draftFromFile(file));
  };

  /* ── Reader open/close with focus return (same model as the Vault) ── */

  const openers = useRef<Record<number, HTMLButtonElement | null>>({});
  const returnTo = useRef<{ id: number; scroll: number } | null>(null);
  const pushed = useRef(false);
  const mainEl = () => document.querySelector("main");

  const openProof = (id: number) => {
    returnTo.current = { id, scroll: mainEl()?.scrollTop ?? 0 };
    window.history.pushState(null, "", `${pathname}?cert=${id}`);
    pushed.current = true;
    mainEl()?.scrollTo({ top: 0 });
  };

  const closeProof = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", pathname);
    }
  };

  useEffect(() => {
    if (viewingId) return;
    pushed.current = false;
    const back = returnTo.current;
    if (!back) return;
    returnTo.current = null;
    requestAnimationFrame(() => {
      mainEl()?.scrollTo({ top: back.scroll });
      openers.current[back.id]?.focus({ preventScroll: true });
    });
  }, [viewingId]);

  const viewing = viewingId ? sorted.find((c) => c.id === viewingId) : undefined;
  if (viewing?.file) {
    const source: QuickLookSource = isImage(viewing)
      ? { kind: "image", blob: viewing.file, fileName: viewing.fileName ?? "certificate" }
      : { kind: "pdf", blob: viewing.file, fileName: viewing.fileName ?? "certificate.pdf" };
    return (
      <QuickLook
        key={viewing.id}
        title={viewing.title}
        trackLabel={[TYPE_LABEL[typeOf(viewing)], viewing.issuer].filter(Boolean).join(" · ")}
        source={source}
        onClose={closeProof}
        onDownloadOriginal={() => downloadCert(viewing)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onPickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-accent">
            Credential Vault
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            Certifications
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {sorted.length > 0
              ? `${sorted.length} logged · ${withProof} with proof attached`
              : "Upload and keep every certificate you earn in one place."}
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="min-h-9 shrink-0 rounded-sm bg-accent-dim px-3 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg"
        >
          ↑ Upload certificate
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          onUpload={() => inputRef.current?.click()}
          onSeed={
            isOwner ? () => certificationRepo.bulkAdd(CV_SEED) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((cert) => (
            <CredentialCard
              key={cert.id}
              cert={cert}
              logo={logoFor(cert.issuer, cert.issuerLogo)}
              openerRef={(el) => {
                openers.current[cert.id] = el;
              }}
              onView={() => openProof(cert.id)}
              onAttach={() => attachProof(cert)}
              onEdit={() => setDraft(draftFromCert(cert))}
              onDelete={() => confirmDelete(cert)}
            />
          ))}
        </div>
      )}

      {draft && (
        <EditModal
          draft={draft}
          sharedLogo={draft.issuer ? sharedLogos.get(issuerKey(draft.issuer)) : undefined}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={async () => {
            const payload = {
              title: draft.title.trim() || "Untitled certificate",
              issuer: draft.issuer.trim(),
              issuedDate: draft.issuedDate.trim() || undefined,
              credentialType: draft.credentialType,
              expiresDate: draft.expiresDate.trim() || undefined,
              credentialId: draft.credentialId.trim() || undefined,
              url: draft.url.trim() || undefined,
              issuerLogo: draft.issuerLogo,
              file: draft.file,
              fileName: draft.fileName,
              fileType: draft.fileType,
            };
            if (draft.id) await certificationRepo.update(draft.id, payload);
            else await certificationRepo.add(payload);
            setDraft(null);
          }}
        />
      )}
    </div>
  );
}

function confirmDelete(cert: Certification) {
  const what = cert.file
    ? `"${cert.title}" and its attached file`
    : `"${cert.title}"`;
  if (window.confirm(`Delete ${what}? This can't be undone.`))
    void certificationRepo.remove(cert.id);
}

/* ── Credential card ────────────────────────────────────────────────── */

/** "Expires 12 Mar 2027", or "Expired …" once it's past. */
function ExpiryLabel({ value }: { value: string }) {
  const due = parseLocalDate(value);
  if (!due) return <span>Expires {value}</span>;
  const days = daysUntil(due, new Date());
  const when = formatDate(due.toISOString());
  return days < 0 ? (
    <span className="text-danger">Expired {when}</span>
  ) : (
    <span className={days <= 60 ? "text-warn" : undefined}>Expires {when}</span>
  );
}

function CredentialCard({
  cert,
  logo,
  openerRef,
  onView,
  onAttach,
  onEdit,
  onDelete,
}: {
  cert: Certification;
  /** The issuer's logo — this credential's own, or one shared by issuer. */
  logo?: Blob;
  openerRef: (el: HTMLButtonElement | null) => void;
  onView: () => void;
  onAttach: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasProof = Boolean(cert.file);
  const issued = formatIssued(cert.issuedDate);
  const verify = safeUrl(cert.url);

  return (
    <article className="flex flex-col rounded-lg border border-edge bg-panel p-4 transition duration-200 hover:-translate-y-0.5 hover:border-edge-strong hover:shadow-[0_14px_32px_-18px_rgba(0,0,0,0.9)]">
      {/* All the details on the left, the issuer logo beside the whole block
          and exactly as tall as it (stretched, kept square) — so there's no
          empty space under the logo whether the title takes one line or two.
          A long title wraps beside the logo, two lines at most. */}
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="rounded-sm border border-accent-dim px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent">
              {TYPE_LABEL[typeOf(cert)]}
            </span>
            {!hasProof && (
              <span className="rounded-sm border border-edge-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                No proof yet
              </span>
            )}
          </div>
          <h3
            className="mt-2.5 line-clamp-2 text-[15px] leading-[1.3] font-semibold text-balance break-words"
            title={cert.title}
          >
            {cert.title}
          </h3>
          <p className="mt-2 truncate text-xs text-accent" title={cert.issuer}>
            {cert.issuer || "Issuer not recorded"}
          </p>
          <p className="mt-1 font-mono text-[10px] text-ink-faint">
            {issued ? `Issued ${issued}` : "Undated"}
            {cert.expiresDate && (
              <>
                {" · "}
                <ExpiryLabel value={cert.expiresDate} />
              </>
            )}
          </p>
          {cert.fromCourseId !== undefined && (
            <p className="mt-1 font-mono text-[10px] text-ink-faint">
              Logged from a completed course
            </p>
          )}
        </div>
        <IssuerTile
          issuer={cert.issuer}
          logo={logo}
          hasProof={hasProof}
          label={
            hasProof
              ? `Preview certificate: ${cert.title}`
              : `Attach proof for ${cert.title}`
          }
          buttonRef={openerRef}
          onClick={hasProof ? onView : onAttach}
        />
      </div>

      {/* Actions, pinned to the bottom so every card in a row lines up */}
      <div className="mt-auto pt-4">
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 border-t border-edge pt-3">
        {hasProof ? (
          <button
            onClick={onView}
            className="min-h-9 rounded-full border border-edge-strong px-3.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent-strong"
          >
            Show credential
          </button>
        ) : (
          <button
            onClick={onAttach}
            className="min-h-9 rounded-full bg-accent-dim px-3.5 text-xs font-semibold whitespace-nowrap text-accent-strong transition-colors hover:bg-accent hover:text-bg"
          >
            Attach proof
          </button>
        )}
        {verify && (
          <a
            href={verify}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the issuer's verification page"
            className="flex min-h-9 items-center rounded-sm px-2 font-mono text-[11px] text-ink-muted transition-colors hover:text-ink"
          >
            Verify ↗
          </a>
        )}
      </div>
      {/* Housekeeping on its own row, the same on every card */}
      <div className="-mr-2 mt-1 flex items-center justify-end">
        {hasProof && (
          <TextButton onClick={() => downloadCert(cert)}>Download</TextButton>
        )}
        <TextButton onClick={onEdit}>Edit</TextButton>
        <TextButton onClick={onDelete} danger>
          Delete
        </TextButton>
      </div>
      </div>
    </article>
  );
}

/**
 * The issuer's square: their logo on a light tile (logos are drawn for white
 * backgrounds), or a coloured monogram until one is added. It's a button —
 * hover shows what clicking does.
 */
function IssuerTile({
  issuer,
  logo,
  hasProof,
  label,
  buttonRef,
  onClick,
}: {
  issuer: string;
  logo?: Blob;
  hasProof: boolean;
  label: string;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
}) {
  const url = useObjectUrl(logo);
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      aria-label={label}
      title={hasProof ? "Preview certificate" : "Attach proof"}
      className="group/tile relative grid size-24 shrink-0 self-center place-items-center max-sm:size-16 max-sm:self-start overflow-hidden rounded-md ring-1 ring-edge-strong transition hover:ring-accent"
      style={url ? undefined : { backgroundColor: monogramColour(issuer) }}
    >
      {url ? (
        // Fills the tile edge to edge, like course icons (owner's call): no
        // paper margin; a non-square logo is trimmed at its edges.
        // eslint-disable-next-line @next/next/no-img-element -- a local Blob URL
        <img src={url} alt="" className="absolute inset-0 size-full bg-paper object-cover" />
      ) : (
        <span className="font-mono text-base font-semibold tracking-wide text-mist">
          {monogram(issuer)}
        </span>
      )}
      <span className="absolute inset-0 grid place-items-center bg-bg/75 text-accent-strong opacity-0 transition-opacity group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100">
        {hasProof ? <EyeIcon /> : <PaperclipIcon />}
      </span>
    </button>
  );
}

/* ── Edit modal ─────────────────────────────────────────────────────── */

function EditModal({
  draft,
  sharedLogo,
  onChange,
  onClose,
  onSave,
}: {
  draft: Draft;
  /** A logo another credential/course from this issuer already has. */
  sharedLogo?: Blob;
  onChange: (d: Draft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = (p: Partial<Draft>) => onChange({ ...draft, ...p });
  const [logoError, setLogoError] = useState<string | null>(null);
  const shownLogo = draft.issuerLogo ?? sharedLogo;
  const logoUrl = useObjectUrl(shownLogo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Backdrop onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={draft.id ? "Edit certification" : "New certification"}
        className="max-h-full w-full max-w-md animate-fade-in overflow-y-auto rounded-lg border border-edge-strong bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-sm font-semibold">
          {draft.id ? "Edit certification" : "New certification"}
        </p>

        <div className="space-y-2.5">
          <Field
            label="Title"
            value={draft.title}
            onChange={(title) => set({ title })}
            placeholder="e.g. MATLAB Onramp Certificate"
          />
          <Field
            label="Issuer"
            value={draft.issuer}
            onChange={(issuer) => set({ issuer })}
            placeholder="e.g. MathWorks"
          />

          {/* Issuer logo */}
          <div className="flex items-center gap-3 rounded-sm border border-edge bg-panel px-3 py-2">
            <span
              className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-sm ring-1 ring-edge-strong"
              style={logoUrl ? undefined : { backgroundColor: monogramColour(draft.issuer) }}
            >
              {logoUrl ? (
                <span className="grid size-full place-items-center bg-paper p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local Blob URL */}
                  <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                </span>
              ) : (
                <span className="font-mono text-[11px] font-semibold text-mist">
                  {monogram(draft.issuer)}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                Issuer logo
              </p>
              <p className="truncate text-[11px] text-ink-muted">
                {logoError
                  ? <span className="text-danger">{logoError}</span>
                  : draft.issuerLogo
                    ? "Shown on every credential from this issuer"
                    : sharedLogo
                      ? "Using the logo already saved for this issuer"
                      : "Optional — square logos work best"}
              </p>
            </div>
            <label className="shrink-0 cursor-pointer font-mono text-[10px] uppercase tracking-widest text-accent hover:text-accent-strong">
              {draft.issuerLogo ? "Replace" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    setLogoError(null);
                    set({ issuerLogo: await shrinkLogo(file) });
                  } catch (err) {
                    setLogoError(err instanceof Error ? err.message : "That image couldn't be used.");
                  }
                }}
              />
            </label>
            {draft.issuerLogo && (
              <button
                onClick={() => set({ issuerLogo: undefined })}
                className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-ink-faint hover:text-danger"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                Type
              </span>
              <select
                value={draft.credentialType}
                onChange={(e) =>
                  set({ credentialType: e.target.value as CredentialType })
                }
                className="min-h-8 w-full cursor-pointer rounded-sm border border-edge bg-panel px-2 text-xs outline-none focus:border-accent-dim"
              >
                {(Object.keys(TYPE_LABEL) as CredentialType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Date earned"
              value={draft.issuedDate}
              onChange={(issuedDate) => set({ issuedDate })}
              placeholder="e.g. 2025-11-12"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field
              label={draft.credentialType === "licence" ? "Expires" : "Expires (optional)"}
              type="date"
              value={draft.expiresDate}
              onChange={(expiresDate) => set({ expiresDate })}
              placeholder=""
            />
            <Field
              label="Credential ID"
              value={draft.credentialId}
              onChange={(credentialId) => set({ credentialId })}
              placeholder="optional"
            />
          </div>
          <Field
            label="Verification URL"
            value={draft.url}
            onChange={(url) => set({ url })}
            placeholder="optional — shows a Verify link"
          />

          <div className="flex items-center gap-2 rounded-sm border border-edge bg-panel px-3 py-2 text-xs">
            <FileGlyphSmall type={draft.fileType} hasFile={!!draft.file} />
            <span className="min-w-0 flex-1 truncate text-ink-muted">
              {draft.fileName ?? "No proof attached"}
            </span>
            <label className="shrink-0 cursor-pointer font-mono text-[10px] uppercase tracking-widest text-accent hover:text-accent-strong">
              {draft.file ? "Replace" : "Attach"}
              <input
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    set({
                      file,
                      fileName: file.name,
                      fileType: file.type,
                    });
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="min-h-9 rounded-sm px-3 text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="min-h-9 rounded-sm bg-accent-dim px-3 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg"
          >
            Save
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */

function EmptyState({
  onUpload,
  onSeed,
}: {
  onUpload: () => void;
  /** Omitted for anyone but the owner — the seed is his own credentials. */
  onSeed?: () => void;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-edge-strong bg-surface p-6">
      <div className="text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-panel text-accent">
          <CertIcon />
        </div>
        <p className="text-sm font-semibold">No certifications yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-ink-muted">
          Upload the PDF or image of any certificate you earn — courses,
          internships, memberships, licences — and keep them all in one vault.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={onUpload}
            className="min-h-9 rounded-sm bg-accent-dim px-3 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg"
          >
            ↑ Upload first certificate
          </button>
          {onSeed && (
            <button
              onClick={onSeed}
              className="min-h-9 rounded-sm border border-edge-strong px-3 text-xs text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              Add the 4 from your CV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Primitives & helpers ───────────────────────────────────────────── */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: "text" | "date";
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-8 w-full rounded-sm border border-edge bg-panel px-2.5 py-1.5 text-xs outline-none transition-colors placeholder:text-ink-faint focus:border-accent-dim"
      />
    </label>
  );
}

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6 max-sm:p-3"
      onClick={onClose}
    >
      {children}
    </div>
  );
}

function TextButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-9 rounded-sm px-2 font-mono text-[11px] text-ink-muted transition-colors hover:bg-raised ${
        danger ? "hover:text-danger" : "hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Create/revoke an object URL for a Blob for the lifetime of the component. */
function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function downloadCert(cert: Certification) {
  if (!cert.file) return;
  const url = URL.createObjectURL(cert.file);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    cert.fileName ??
    `${cert.title.replace(/\s+/g, "-").toLowerCase()}${
      cert.fileType === "application/pdf" ? ".pdf" : ""
    }`;
  a.click();
  URL.revokeObjectURL(url);
}

function FileGlyphSmall({ type, hasFile }: { type?: string; hasFile: boolean }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-xs ${
        hasFile ? "bg-accent-dim text-accent-strong" : "bg-raised text-ink-faint"
      }`}
    >
      <span className="font-mono text-[8px] font-bold">
        {!hasFile ? "—" : type === "application/pdf" ? "PDF" : "IMG"}
      </span>
    </span>
  );
}

const CertIcon = () => (
  <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[1.5]">
    <circle cx="12" cy="9" r="5" />
    <path d="M9 13.5L8 21l4-2 4 2-1-7.5" strokeLinejoin="round" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current stroke-[1.7]">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const PaperclipIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current stroke-[1.7]">
    <path d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
