"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { certificationRepo } from "@/lib/db";
import type { Certification, CredentialType } from "@/lib/types";
import { useIsOwner } from "@/lib/owner";
import { daysUntil, parseLocalDate } from "@/lib/actions";
import { pdfThumbnail, type PdfThumbnail } from "@/lib/pdf";
import { formatDate } from "@/components/workspace/ShelfCard";
import {
  QuickLook,
  type QuickLookSource,
} from "@/components/workspace/QuickLook";

/**
 * Certifications as a framed gallery (§7.18): each credential's own artwork on
 * a dark mat inside a thin paper frame, with title, issuer, date and type in
 * the same places underneath. Records without proof sit below as compact rows
 * with an Attach proof action. Proof opens in the Vault's Quick Look reader.
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
  file: cert.file,
  fileName: cert.fileName,
  fileType: cert.fileType,
});

const isImage = (c: Pick<Certification, "fileType" | "fileName">) =>
  Boolean(c.fileType?.startsWith("image/")) ||
  /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(c.fileName ?? "");

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewingId = Number(searchParams.get("cert")) || null;

  const sorted = useMemo(
    () =>
      [...(certs ?? [])].sort((a, b) =>
        (b.issuedDate ?? "").localeCompare(a.issuedDate ?? ""),
      ),
    [certs],
  );
  const framed = sorted.filter((c) => c.file);
  const awaiting = sorted.filter((c) => !c.file);

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
              ? `${sorted.length} logged · ${framed.length} with proof attached`
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
        <>
          {/* ── The gallery ─────────────────────────────────────────── */}
          {framed.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {framed.map((cert) => (
                <FramedCredential
                  key={cert.id}
                  cert={cert}
                  openerRef={(el) => {
                    openers.current[cert.id] = el;
                  }}
                  onView={() => openProof(cert.id)}
                  onEdit={() => setDraft(draftFromCert(cert))}
                  onDelete={() => confirmDelete(cert)}
                />
              ))}
            </div>
          )}

          {/* ── Records still waiting for their proof ──────────────── */}
          {awaiting.length > 0 && (
            <section className={framed.length > 0 ? "mt-8" : ""}>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                Awaiting proof · {awaiting.length}
              </h3>
              <div className="divide-y divide-edge overflow-hidden rounded-md border border-edge bg-surface">
                {awaiting.map((cert) => (
                  <AwaitingRow
                    key={cert.id}
                    cert={cert}
                    onAttach={() => attachProof(cert)}
                    onEdit={() => setDraft(draftFromCert(cert))}
                    onDelete={() => confirmDelete(cert)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {draft && (
        <EditModal
          draft={draft}
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

/* ── Gallery frame ──────────────────────────────────────────────────── */

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

/** Page one of a PDF proof, for the frame. */
function usePdfArtwork(blob: Blob | undefined, enabled: boolean) {
  const [thumb, setThumb] = useState<PdfThumbnail | "error" | null>(null);
  useEffect(() => {
    if (!blob || !enabled) return;
    let cancelled = false;
    setThumb(null);
    pdfThumbnail(blob, 360)
      .then((t) => !cancelled && setThumb(t))
      .catch(() => !cancelled && setThumb("error"));
    return () => {
      cancelled = true;
    };
  }, [blob, enabled]);
  return thumb;
}

function FramedCredential({
  cert,
  openerRef,
  onView,
  onEdit,
  onDelete,
}: {
  cert: Certification;
  openerRef: (el: HTMLButtonElement | null) => void;
  /** Opens the proof in Quick Look — wired to the framed artwork. */
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const image = isImage(cert);
  const imageUrl = useObjectUrl(image ? cert.file : undefined);
  const pdf = usePdfArtwork(cert.file, !image);
  const src = image ? imageUrl : pdf && pdf !== "error" ? pdf.src : null;
  const type = typeOf(cert);

  return (
    <article className="group flex flex-col">
      {/* The mat, with the artwork framed and fitted whole */}
      <button
        ref={openerRef}
        onClick={onView}
        aria-label={`View proof: ${cert.title}`}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-[#0f1412] ring-1 ring-edge transition-colors hover:ring-edge-strong"
      >
        <span className="absolute inset-[9%] flex items-center justify-center">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local Blob/data URL
            <img
              src={src}
              alt=""
              className="max-h-full max-w-full bg-white shadow-[0_18px_36px_-14px_rgba(0,0,0,0.95)] ring-[3px] ring-paper transition-transform duration-300 group-hover:-translate-y-0.5"
            />
          ) : pdf === "error" ? (
            <span className="grid aspect-[1.414/1] w-full place-items-center bg-paper font-mono text-[10px] text-paper-ink/60 ring-[3px] ring-paper">
              Preview unavailable — open to download
            </span>
          ) : (
            <span className="aspect-[1.414/1] w-full animate-pulse-soft bg-paper/80 ring-[3px] ring-paper" />
          )}
        </span>
      </button>

      {/* Details, always in the same places */}
      <div className="mt-3 flex flex-1 flex-col px-0.5">
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          <span>{TYPE_LABEL[type]}</span>
          {cert.expiresDate && (
            <span className="normal-case tracking-normal">
              · <ExpiryLabel value={cert.expiresDate} />
            </span>
          )}
        </p>
        <h3 className="mt-1 text-sm leading-snug font-semibold break-words">
          {cert.title}
        </h3>
        <p className="mt-0.5 text-xs text-accent">{cert.issuer || "Issuer not recorded"}</p>
        <p className="mt-1 font-mono text-[10px] text-ink-faint">
          {cert.issuedDate ? `Issued ${cert.issuedDate}` : "Undated"}
        </p>
        {/* Finishing a course isn't the same as holding a verified credential. */}
        {cert.fromCourseId !== undefined && (
          <p className="mt-1.5 inline-flex w-fit rounded-xs border border-edge bg-raised px-1.5 py-0.5 text-[10px] text-ink-muted">
            Logged from a completed course
          </p>
        )}
        {/* The framed artwork is the "view proof" control. */}
        <div className="mt-2 -ml-2 flex flex-wrap items-center gap-1">
          <TextButton onClick={() => downloadCert(cert)}>Download</TextButton>
          <TextButton onClick={onEdit}>Edit</TextButton>
          <TextButton onClick={onDelete} danger>
            Delete
          </TextButton>
        </div>
      </div>
    </article>
  );
}

/* ── Awaiting-proof row ─────────────────────────────────────────────── */

const initials = (title: string) =>
  title
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

function AwaitingRow({
  cert,
  onAttach,
  onEdit,
  onDelete,
}: {
  cert: Certification;
  onAttach: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-full bg-panel font-mono text-[11px] font-semibold text-ink-muted ring-1 ring-edge-strong"
      >
        {initials(cert.title)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium break-words">{cert.title}</p>
        <p className="mt-0.5 font-mono text-[10px] text-ink-faint">
          <span className="text-accent">{cert.issuer || "Issuer not recorded"}</span>
          {" · "}
          {cert.issuedDate || "Undated"}
          {" · "}
          {TYPE_LABEL[typeOf(cert)]}
          {cert.expiresDate && (
            <>
              {" · "}
              <ExpiryLabel value={cert.expiresDate} />
            </>
          )}
          {cert.fromCourseId !== undefined && " · from a completed course"}
        </p>
      </div>
      <div className="flex items-center gap-1 max-sm:w-full max-sm:pl-12">
        <button
          onClick={onAttach}
          className="min-h-9 rounded-sm bg-accent-dim px-3 text-xs font-semibold whitespace-nowrap text-accent-strong transition-colors hover:bg-accent hover:text-bg"
        >
          Attach proof
        </button>
        <TextButton onClick={onEdit}>Edit</TextButton>
        <TextButton onClick={onDelete} danger>
          Delete
        </TextButton>
      </div>
    </div>
  );
}

/* ── Edit modal ─────────────────────────────────────────────────────── */

function EditModal({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = (p: Partial<Draft>) => onChange({ ...draft, ...p });

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
              placeholder="2025"
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
            placeholder="optional"
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
      className={`min-h-9 rounded-sm px-2 font-mono text-[11px] text-ink-muted transition-colors hover:bg-panel ${
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
