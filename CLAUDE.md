# MASTER PROMPT: CareerCommand Hub – Personal Career Architecture & Document Engine

## 1. Identity & Role
You are an expert Full-Stack Software Engineer, UX/UI Architect, and Technical Product Manager. Your objective is to help me design, architect, and systematically build a localized or self-hosted personal web application called **CareerCommand Hub**. 

This application serves as a unified career command center, custom-tailored for a 3rd-year Mechanical Engineering student juggling dual-track employment tracks: highly technical engineering internships and interpersonal-focused retail/hospitality part-time jobs.

---

## 2. Project Context & Problem Statement
Currently, managing my professional identity across two distinct job tracks incurs significant cognitive load and workflow fragmentation:

1. **The Technical Track (Internships):** Requires a precise technical resume built using **LaTeX** (managed via Overleaf or local VS Code) and customized, company-specific cover letters compiled in LaTeX for geometric and typographic precision.
2. **The Non-Technical Track (Part-Time/Retail):** Requires a highly visual, interpersonal-focused resume built inside **Canva** (e.g., targeted for roles like a Merchandiser at Coles or hospitality staff).

### The Core Pain Points:
* **Workflow Fragmentation:** Constant context-switching between local environments (VS Code), web environments (Overleaf, Canva), and local file directories to find, edit, and export PDFs.
* **Cover Letter Friction:** Manually tracking and editing individual `.tex` files across multiple directories for every single application.
* **Disjointed Tracking:** No centralized system to log where I applied, what version of which resume was submitted, and the real-time status of applications.
* **Immaterial Interview Prep:** Interview preparation logs, question banks, and framework-guided answers (like STAR/CAR) are either non-existent or scattered across isolated scratchpads.

---

## 3. Core System Architecture & Features
The **CareerCommand Hub** must be a unified application containing four tightly integrated core modules, accessible via a split-screen or multi-window local web dashboard.

### Module 1: The Dual-Engine Resume & Cover Letter Workspace
A split-screen view: the left side functions as a code/text editor, and the right side renders an instant, high-fidelity PDF preview.
* **Sub-Engine A (The Technical LaTeX Workspace):** A lightweight, embedded LaTeX compiling/rendering engine (or a highly structured Markdown/HTML-to-PDF template mimicking a professional LaTeX layout) allowing direct textual changes and rapid PDF generation without leaving the application.
* **Sub-Engine B (The Visual/Retail Workspace):** A visual or rich-text block editor that outputs beautifully styled, modern templates optimized for retail and hospitality applications, eliminating the need to log into Canva.
* **Dynamic Cover Letter Generator:** A templating system where entering basic metadata (Company Name, Position, Key Skills) instantly synthesizes a specialized cover letter using an underlying professional template.

### Module 2: The Two-Way Career CRM (Application Tracker)
An interactive database or Kanban-style dashboard to track applications.
* Fields: Company, Role Type (`Technical Internship` vs. `Part-Time/Retail`), Application Date, Status (`Draft`, `Applied`, `Interview Scheduled`, `Offer Extended`, `Rejected`), Resume Version Used, Cover Letter Link.
* Ability to filter data dynamically based on the track.

### Module 3: The Interview Sandbox & Framework Log
A structured rehearsal dashboard designed for active recall and behavioral interview mastery.
* **Question Bank:** Dropdowns categorized by type (Behavioral, Technical, Situational).
* **The Structured Answer Canvas:** Inputs mapped strictly to professional answer frameworks (e.g., **S**ituation, **T**ask, **A**ction, **R**esult).
* **Review/Memorization Mode:** A clean, flashcard-style layout to rapidly read questions, self-assess, and reveal optimized, logged responses.

### Module 4: The Public Portfolio Aggregator (Future Layer)
A modular backend architecture that enables a public-facing toggle. When turned on, a sanitized, highly aesthetic view of the user’s projects (e.g., *Mechanical Engineering Wing-Box Design, Lunar Rover Simulation Assets*), portfolio links, and LinkedIn integration is exposed directly to recruiters.

---

## 4. Technical Stack Considerations (Developer Guidelines)
To keep development efficient, rapid, and maintainable for an engineering student building alongside an AI assistant, prioritize the following architecture:
* **Frontend Framework:** Next.js (React) with Tailwind CSS for clean, rapid, semantic utility styling.
* **Database / State:** LocalStorage/IndexedDB for initial zero-configuration local-first operations, with seamless migration paths toward Supabase (PostgreSQL) for cloud synchronization.
* **PDF Compilation Solution:** Recommend a sustainable approach for compiling resumes locally (e.g., using specialized markdown-to-pdf libraries, puppeteer-based HTML canvas rendering, or a lightweight WebAssembly LaTeX engine like `SwiftLaTeX` / `Texlive.js`).

---

## 5. Phased Implementation Roadmap
We will execute this project in iterative phases. **Do not attempt to write the entire codebase at once.** We will build component by component:

* **Phase 1 (MVP Base):** Set up the framework, routing, and the split-screen layout shell.
* **Phase 2 (The Data Engine):** Implement the Application Tracker and the Interview Sandbox using local state.
* **Phase 3 (The Document Workspace):** Integrate the text-to-PDF compilation engine for the Technical and Visual resumes.
* **Phase 4 (Polish & Portfolio Linkage):** Aesthetic refinements, dark mode UI/UX optimization, and preparation for public-facing portfolio expansion.

---

## 6. Execution Instructions for Claude
When I prompt you with sections of this master document, you must:
1. Maintain strict modularity—write clean, self-documenting code.
2. Provide incremental building instructions, always asking for confirmation before moving to the next component.
3. Suggest the most frictionless technical paths for real-time PDF generation within a web browser.
4. Keep the UI design professional, minimal, and engineering-centric (monochrome tones with muted accents, precise grids, responsive layouts).

**Let's begin. Acknowledge this Master Prompt, analyze the architecture, and propose the initial directory structure and tech stack setup for Phase 1.**

---

## 7. Confirmed Architecture Decisions (LOCKED — do not re-litigate these)

The following decisions were finalized during architecture review. Treat them as constraints, not suggestions. Do not propose alternatives unless a decision proves technically impossible.

### 7.1 Tech Stack
* **Framework:** Next.js 15 (App Router) + TypeScript
* **Styling:** Tailwind CSS 4
* **UI State:** Zustand (no Redux, no Context sprawl)
* **Persistence:** Dexie.js (IndexedDB) from day one — **do NOT use localStorage** (5MB string-only cap won't hold resume version history or PDF blobs)
* **Data access:** All reads/writes go through a repository layer in `lib/db.ts` so the future Supabase migration is a one-file swap. Dexie schema should map ~1:1 to future Postgres tables.
* **No server/backend** for Phases 1–3. Fully local-first.

### 7.2 PDF Generation Strategy (MVP)
* **No WASM LaTeX** (SwiftLaTeX / TeXLive.js) in the MVP — too heavy (~30MB+ payload, slow cold-compiles, hard to debug). Real LaTeX compilation is a Phase 4 stretch goal only.
* Instead: **LaTeX-faithful HTML templates** — Computer Modern-style typography, precise margins, print CSS — rendered to PDF via the browser's Chromium print engine (`react-to-print` / `window.print()` with `@media print` styles).
* The resume content model stays structured and engine-agnostic, so swapping in real LaTeX later requires no data migration.

### 7.3 Design System
* Dark-first, monochrome palette with one muted accent colour
* Professional, minimal, engineering-centric: precise grids, responsive layouts

### 7.4 Phase 1 Directory Structure (build exactly this)
```
careercommand-hub/
├── app/
│   ├── layout.tsx           # Root shell: sidebar nav, dark mode, fonts
│   ├── page.tsx             # Dashboard home (module launcher)
│   ├── workspace/page.tsx   # Module 1: split-screen editor ⇄ PDF preview shell
│   ├── tracker/page.tsx     # Module 2: CRM (placeholder in P1)
│   ├── interview/page.tsx   # Module 3: Sandbox (placeholder in P1)
│   └── globals.css          # Tailwind + design tokens
├── components/
│   ├── layout/              # Sidebar, TopBar, SplitPane (resizable)
│   └── ui/                  # Button, Card, Badge primitives
├── lib/
│   ├── types.ts             # Application, Resume, InterviewEntry types (defined P1, wired P2)
│   └── db.ts                # Dexie schema (stubbed P1, wired P2)
└── config: next.config.ts, tailwind.config.ts, tsconfig.json
```

### 7.5 Phase 1 Scope (shell only)
Routing, sidebar navigation, resizable split-pane on `/workspace`, dark theme, responsive grid. **No data logic, no PDF engine, no CRM logic yet.** Placeholders for Modules 2 and 3.

### 7.6 Module Revisions (2026-07-04 — user-directed, supersedes §3 where they conflict)
* **Module 2 (Tracker):** NOT a Kanban board. It is a **spreadsheet-style grid** (Excel-like: inline-editable cells, row numbers, gridlines, sortable columns, search) with an **interactive dashboard strip** above it (clickable status stat-cards that filter the grid, status distribution bar, track filter).
* **Module 3 (Interview):** *(STAR part superseded by §7.17 — every question now has four STAR fields.)* NO flashcards, NO structured STAR/CAR answer canvas. It is a **categorised question-dropdown bank**: questions grouped by Behavioral/Technical/Situational, each an expandable dropdown revealing a free-form answer textarea that auto-saves. `InterviewEntry` = question + category + answer only.
* Both modules are live on Dexie via the repository layer (`applicationRepo` / `questionRepo` in `lib/db.ts`, `useLiveQuery` in pages). Phase 2 is effectively done.
* UI direction: denser, more interactive, more visual depth (status colours, hover lifts, animated transitions) — while keeping the dark monochrome + muted accent system.

### 7.7 Phase 3 status (2026-07-04 — done)
* **Module 1 is live.** Structured, engine-agnostic content model in `lib/resume.ts` (JSON in `ResumeVersion.content`); shared `ResumeEditor` feeds two print-ready templates in `components/workspace/ResumePreview.tsx` (LaTeX-faithful serif + visual retail) with live preview and 700ms-debounced auto-save via `resumeRepo`.
* **Cover letter generator** (`components/workspace/CoverLetterPanel.tsx` + `generateCoverLetter`): metadata form → synthesized letter in technical or retail tone, editable body, persisted via `coverLetterRepo`.
* **PDF export** per §7.2: `window.print()` prints only `#print-area` pinned to A4 (print CSS in `globals.css`). MVP assumes single-page documents (`#print-area` is position-fixed in print).
* **Site-wide motion**: `app/template.tsx` animates every route change; interview dropdowns animate via grid-rows 0fr→1fr; `prefers-reduced-motion` respected globally.
* Remaining for Phase 4: portfolio module, resume version history, real LaTeX (stretch).

### 7.8 Real LaTeX interop (2026-07-04)
* **In-browser WASM LaTeX is confirmed dead-ended**: SwiftLaTeX's on-demand package CDN (texlive2.swiftlatex.com) is offline, so its WASM engines cannot resolve packages at compile time. Do not retry without verifying the CDN or self-hosting a TeX tree.
* **Claude Prism (github.com/delibae/claude-prism) is a Tauri desktop app** with embedded Tectonic — it cannot be embedded in the website. The user has it installed.
* Chosen bridge per §7.2's engine-agnostic promise: `lib/latex.ts` serialises the structured content model to compile-ready .tex (resume + cover letter, proper character escaping). Workspace Engine A has a Fields ⇄ .tex source toggle and a "↓ .tex" download; compile externally in Claude Prism / Overleaf / local TeX.

### 7.9a CV 1:1 pass (2026-07-05)
* CVTemplate now matches the compiled resume_cv.pdf exactly: Roboto (header) + Source Sans 3 (body) fonts; section titles with FIRST 3 LETTERS in awesome-red + rule; semibold justified intro/bullets with "·" markers; education bullets are "→" + gray small-caps; heading-only items render as \cvsubsection headers; honors/clubs date column right-aligned (club dates are the PDF's literal "[1]"–"[5]" placeholders); locations/skill-lists in font-light red.
* Content is verbatim to the PDF **including the user's typos** ("Challange", "Uncrewed Ariel", "EG&E") — do not fix them. The PDF contains the Nova Systems project once (the duplicate exists only in the newer Projects.tex).
* Not reproduced: per-page footer ("Hamdan Zahid · CV" + page number) — not possible in the continuous flow preview.

### 7.9 CV tab (2026-07-04 — user-requested)
* Fourth workspace tab **"CV · Extended"** (after Cover Letter): a 2–3 page formal CV. Same `ResumeContent` model stored as `ResumeEngine: "cv"` in `resumeVersions`; own `CVTemplate` in `ResumePreview.tsx` (left name / right contact-block header, break-inside-avoid sections); gets the Fields ⇄ .tex toggle and .tex download like Engine A.
* Print CSS changed from `position: fixed` to `position: absolute` on `#print-area` so multi-page documents paginate — do not revert to fixed.

### 7.10 Real documents imported — fidelity is mandatory (2026-07-04)
* **CV tab** renders the user's real CV, faithful to his awesome-cv.cls layout (see §7.9). **Engine B (visual)** renders his real retail resume, imported verbatim from Hamdan_Zahid_resume.pdf: DM Sans (+ Public Sans contact row) via next/font/google, #D7E0E7 section bands, title—line—date connector rows in Work Experience, spread rows for Key Skills/Languages.
* RetailTemplate shape rules: items with no bullets and no dates render as a spread row; /experience/i sections get the connector line.
* **Engine A (latex)** renders his real technical resume, imported verbatim from "HZ Resume (Final).pdf" (Jake's-resume style): Computer Modern via vendored CMU Serif woffs in `app/fonts/cm` (next/font/local), small-caps name, FontAwesome-style icon contact row, ruled title-case sections, two-row \resumeSubheading entries (bold org/dates, italic role/location via the " · " sub split), single-row /project/i headings with "| italic tools", bold-category skill lines (no bullets + no dates). Dash conventions differ by section in his PDF (en dash vs hyphen) — preserved.
* Do NOT restyle or editorially "fix" the user's document content — reproduce exactly as sent (typos included) and disclose any deviation.
* **Cover Letter tab** holds his real LaTeX letter (Hamdan_Cover_Letter_Stantec.pdf), verbatim, rendered in the vendored CM fonts: centred name/contact/location letterhead, greeting-left/date-right row, justified paragraphs, closing + signature. He reuses it as a per-application template, so letterhead, greeting, date (blank = today), closing and body are all editable fields; the generator is an optional body-only helper. Shared document fonts live in `components/workspace/fonts.ts`; `coverLetterToLatex` mirrors this layout.

### 7.12 Module 1 is now a Document Vault (2026-09-14 — user-directed, supersedes §7.7/§7.9/§7.11 where they conflict)
* **Not an editor.** `/workspace` is a **vault**: three document cards (what's stored, its caption, the date it was last updated) above a preview of whichever is open. Every editing surface is gone — `ResumeEditor.tsx` and `LatexSourceView.tsx` deleted, `CoverLetterForm` left dormant in `CoverLetterPanel.tsx`, SplitPane no longer used here. Titled **Document Vault** in the TopBar, **Vault** in the sidebar and on the dashboard tile.
* **Three engines** (Engine A/B/C): `visual` = "Hamdan Zahid — Resume", `cover` = "Hamdan Zahid — Cover Letter", `cv` = "Technical Resume". **Engine A (the old `latex` Jake's-style resume) was removed entirely** — `TechnicalTemplate` and `DEFAULT_TECHNICAL` deleted, `ResumeEngine` narrowed to `"visual" | "cv"`. Its stored row is deliberately left in place (no content destroyed). Contact icons stayed: `CVTemplate` shares them.
* **PDF/Word import supersedes §7.11's "PDF import is intentionally NOT supported".** That ban was about *parsing* a PDF into the editable content model, which is lossy. The vault doesn't parse — it **stores the file as a Blob** (`ResumeVersion.file/fileName/fileType`, same on `CoverLetter`) and hands it back untouched. Accepted: `.pdf`, `.doc`, `.docx`, capped at 8 MB so the single synced row stays sane. A stored file *replaces* the built-in template: PDFs preview in an iframe, Word shows a file card (browsers can't render .docx). "Remove file" reverts to the template. `.tex`/`.json` import and export are gone; `lib/importers.ts` deleted.
* **Exports are PDF and Word only.** PDF hands back a stored PDF, else prints the template. Word hands back a stored .doc/.docx, else converts the rendered HTML via `downloadWordFromHtml` (Word-flavoured `.doc` — close, not pixel-perfect; no .docx builder dependency). Filenames follow the vault title.
* **Title and caption are editable in place** and persist (`ResumeVersion.name`/`.blurb`, `CoverLetter.title`/`.blurb`) so a document can be made company-specific ("Cover Letter — Stantec"). Repo-generated names (`Resume`, `Retail Resume`, `Extended CV`, …) are treated as *unnamed* so they can't mask the real label. Dates render as "14 Sep 2026" via a hand-built month table — every en-* locale except en-US now abbreviates September to "Sept".

### 7.11 Document upload / import (2026-07-05 — SUPERSEDED by §7.12)
* Each workspace tab has an **↑ Import** control + **↓ .json** backup export in the left sub-toolbar (`components/workspace/DocumentUpload.tsx`, parsers in `lib/importers.ts`, `downloadJson` in `lib/latex.ts`).
* **PDF import is intentionally NOT supported** — in-browser PDF structure extraction is too lossy for real docs; the careful PDF→content imports were done by hand. Accepted: `.tex` (best-effort parse of awesome-cv `\cventry/\cvhonor/\cvskill/\cvsubsection` and Jake's `\resumeSubheading/\resumeProjectHeading/\resumeItem`), `.json` (exact round-trip of the app's own backups), and `.txt/.md` (cover body only).
* `.tex` resume import MERGES onto the current doc (keeps header if the .tex lacks `\name` etc., replaces sections); `.json` is a full replace. Import always shows a parse report + Replace/Cancel confirm before overwriting. Multi-file `\input{}` resumes (his real resume_cv.tex) can't be parsed — the parser reports "flatten the .tex" rather than silently failing.

### 7.13 Sync safety model (2026-09-14 — P0 data reliability)

The cloud model is *one `user_data` row holding the whole dataset*, so **every push is a full overwrite**. That makes "which device is allowed to define the truth?" the only question that matters. Three guards in `lib/sync.ts` answer it; do not remove them without replacing the protection:

1. **Nothing is pushed until a pull has succeeded.** `reconcileOnLogin` sets an internal `reconciled` flag; `pushCloud` refuses while it is false and reports `state: "blocked"`. Previously `AuthGate` caught a failed initial sync, logged it, and started auto-sync anyway — so a device that couldn't reach the cloud looked like an empty account, and the next write replaced the real cloud copy with that emptiness.
2. **A device holding another account's records is cleared before reconciling.** `meta.lastUserId` (Dexie v8, device-local, never synced or backed up) is compared on login. Without this, signing in as a second user whose cloud row was empty pushed the *first* user's records into their account.
3. **A push that would empty a non-empty cloud copy is refused** (`lastKnownCloudCount`), which catches local storage being evicted mid-session.

Two supporting fixes belong to the same defect:

* `cloudIsEmpty` counted **keys of the table map** (always 8, even when every table was empty), so the "seed the cloud from this device" branch was dead and an empty snapshot always won. It now counts actual rows.
* `reconcileOnLogin` ignored `restoreBackup`'s `{ok:false}` return — a failed load reported itself as a successful sync. It now throws.

**The seeding half of the bug lived in `/workspace`.** Debounced auto-saves on `retail`/`cv`/cover state fired on every page visit, and since §7.12 removed content editing those values only ever change once (in the load effect, which falls back to `DEFAULT_*`). So merely opening the Vault on an empty device wrote three documents into storage as if authored — the exact "3 documents, 0 records" signature in the 14 Sep audit. Those effects are gone; renames, captions and file imports persist explicitly. **Do not reintroduce an auto-save of state that the user cannot edit.**

Restore is now validated before it is destructive: `inspectBackup` (in `lib/backup.ts`) checks shape, rejects a `version` newer than `BACKUP_VERSION`, and counts records **from the payload rather than the file's own `counts` header** (a truncated file can overstate it). The confirm dialog shows before/after counts and downloads a recovery copy first. `meta` is excluded from `CONTENT_TABLES`, so bookkeeping never travels in a backup or triggers a sync push.

Sync status is now reported truthfully (`SyncInfo`: idle/syncing/synced/offline/error/blocked + `lastSyncedAt`), in words as well as colour. "Synced to cloud" must never be shown merely because a session exists.

### 7.14 Module 05 = Examples, and the connections between modules (2026-09-14 — P2)

Nav is now: 00 Dashboard, 01 Vault, 02 Companies, 03 Tracker, 04 Interview, **05 Examples**, 06 Certifications, 07 Skills, 08 Courses, 09 Portfolio (still unbuilt).

**Examples** (`/examples`, Dexie v9 `achievements`) is the reusable-evidence bank: a project or work situation written up once and reused across applications. STAR fields are deliberately optional — most people have stories they can't split into four neat parts, and demanding the structure invites invented detail. There is **deliberately no "write this for me" button**: this is a record of the user's own experience, and a fabricated metric in an interview answer is worse than no metric.

**The dashboard leads with what's due**, not with module tiles. `lib/actions.ts` derives the list from applications (deadline / interview / follow-up) and courses (target date); the Vault dropped from `col-span-4 row-span-2` to `col-span-2 row-span-2`; "local-first · all systems go" is gone (decorative, and untrue since sync landed). Applications that are closed out (offer, rejected) stop generating follow-up actions.

**Date handling is local-time, deliberately.** `parseLocalDate` parses `"2026-09-20"` as LOCAL midnight — `new Date("2026-09-20")` gives UTC midnight, which marks a deadline overdue a day early for anyone west of Greenwich. Don't "simplify" it back.

**GOTCHA — two different mount gates in `app/page.tsx`.** `useMounted()` is rAF-based and exists so width transitions animate from 0; browsers **do not run rAF in a hidden tab**, so a dashboard opened in a background tab leaves it `false` forever. That's fine for decoration and wrong for content — anything the user must read uses `useHydrated()` (effect-based, always runs). The action list was invisible on background-tab loads until this was split.

**Applications carry history now** (Dexie v9, all optional fields so old rows are untouched): deadline / interviewDate / followUpDate / nextAction, a job-description snapshot with `jobUrl` + `jobCapturedAt` (listings get taken down), `statusHistory` (append-only, backfilled from `createdAt` for rows predating it), and `submittedResume` / `submittedCover`. **Submitted documents are COPIES, not references** (`snapshotVaultDocument` in `lib/db.ts`) — the vault master keeps changing and the application record has to keep saying what was actually sent. Verified: rewriting the vault document leaves the attached snapshot untouched.

**One bad row must not kill a module.** `trackMeta()` / `statusMeta()` in the tracker fall back to a neutral "Unknown" style instead of indexing a `Record` and throwing. An empty `track` (from a restored/hand-edited backup) used to white-screen the whole Tracker with "cannot read properties of undefined".

**Research provenance** (P2-03): the edge function now returns the pages it actually retrieved, collected from `web_search_tool_result` blocks — **not from anything the model writes**, so it can't be a fabricated citation list. An empty `sources` array is meaningful and the UI says the dossier is unsourced. Fields the AI filled are tracked in `Company.aiFilled` and badged "AI suggestion — check it"; the badge clears when the user edits the field. "Why I'm interested" carries an explicit warning that it's a guess at a motivation, not the user's. **This needs `supabase functions deploy research-company` to take effect** — the client tolerates its absence.

**Course → skills → credential** (P2-05): `Course.skillIds` links the learning queue to the skills pipeline; `Certification.fromCourseId` marks entries logged from a completed course so they aren't presented as independently verified credentials; and the "in vault ✓" state checks the certification still **exists** rather than trusting a possibly-dangling `certId`.

### 7.15 Mobile validation (2026-09-14 — P3-02, measured not assumed)

Measured at 375×812 across all nine routes: **zero horizontal page overflow** — the tracker's grid scrolls inside its own container, which is correct. Touch targets were the real problem and are fixed: sidebar nav links were under the 44px minimum (now 44), as were the tracker search, "+ New application" and the detail panel's Attach buttons.

**The detail panel needed pinning.** It renders in a `<td>` inside the horizontally scrolling table, so it inherited the table's full width and you had to scroll sideways to reach your own form fields. It is now `sticky left-0` with a viewport-relative width on small screens; the grid above it still scrolls normally.

Remaining sub-44px targets are inline links inside sentences ("Open prep →"), which WCAG 2.5.8 exempts, and the 30px table sort headers — left alone deliberately, since shrinking row density is the point of a spreadsheet view.

Not done, and still genuinely open: P3-01 (student/graduate beta) needs real users, and P3-03 (opt-in public portfolio) is unbuilt — the sidebar's 09 Portfolio entry is still a placeholder.

### 7.16 AI research cost controls (2026-09-14 — P0-04)

Research costs money per call, so the ceiling is enforced **in Postgres, not in the client and not in the edge function's own code**: `consume_research_quota()` in `supabase/schema.sql` is SECURITY DEFINER with the limit (25/day) declared as a `constant` inside the function body. It deliberately takes **no arguments** — an earlier draft passed `daily_limit` in, which a user could simply override by calling the RPC directly. `research_usage` is RLS'd to read-only for its owner; the function is the only writer.

The claim is atomic (conditional upsert), so two simultaneous requests can't both slip through the last slot, and a user already at the ceiling isn't counted again — the number they're shown stays true.

The edge function claims quota **before** doing any paid work, and fails closed if the counter isn't reachable: an unmetered endpoint is worse than an unavailable one. Provider calls share one 60s `AbortSignal.timeout` across the whole exchange (pause_turn continuations included), and a timeout returns 504 with a message that says the user's typing is safe.

**GOTCHA:** `supabase.functions.invoke` collapses every non-2xx into the same generic "Edge Function returned a non-2xx status code", which would hide the allowance message entirely. `lib/research.ts` reads the real explanation out of `error.context` (the raw `Response`) before falling back.

**Setup (one-time, needs the project owner):**
1. Paste `supabase/schema.sql` into the Supabase SQL editor and run it — it is idempotent and safe to re-run.
2. `npx supabase login`
3. `npx supabase functions deploy research-company --project-ref qfeoidxzaqesyysskscq`

Until step 3 runs, the deployed function is the old one: no quota, and no source citations.

### 7.17 Vault shelf + Quick Look, STAR interview fields, keep-alive (2026-11-21 — user-directed, from the "Implementation guide" PDF; supersedes §7.6's Module 3 line and §7.12's preview pane)

**Vault (`app/workspace/page.tsx`, `components/workspace/ShelfCard.tsx`, `QuickLook.tsx`, `lib/pdf.ts`).** The shelf is the whole page: each slot is a card with a cover (the real first page, slightly tilted, on a track-coloured backing — green engineering, sand retail/hospitality, slate blue cover letter, neutral empty; the track is always written out too). Cover + title open **Quick Look**; **Download original** is a separate button that returns the stored Blob with its own filename, byte-for-byte. Rename / caption / Replace / Remove live under **File info**; **Import file** at the top asks which slot. The old in-page preview (and its iframe) is gone.

* **Quick Look renders with PDF.js** (`pdfjs-dist` 4.10.38, legacy build, lazy-imported client-side). The worker is vendored at `public/pdfjs/pdf.worker-4.10.38.min.mjs` — **bump that file with the package**. One parsed doc + thumbnail per Blob (WeakMaps in `lib/pdf.ts`), so a replaced file can't show stale pages; `releasePdf` frees the old one.
* Fit page = min(width-fit, height-fit) of the space under the header, rendered at devicePixelRatio, re-fitted by ResizeObserver; overtaken renders are cancelled. Read text = `getTextContent` grouped into paragraphs; an empty page is reported as a scan with Fit page / Download original. Word files can't be previewed and say so.
* Reader state is `?doc=<slot>` via native `history.pushState` (Next integrates it), so browser Back closes it in one step. Escape / Back to Vault restore the shelf scroll position and focus the card that opened it.
* Built-in templates open in Quick Look via **Use template** with the existing print-to-PDF / Word exports (`#print-area` now lives inside the reader).
* **"Last used for …"** shows only when the Tracker recorded the slot: `SubmittedDocument.kind` is set by `snapshotVaultDocument` from now on. Older snapshots have no kind and claim nothing — a preview or download is never treated as "used".
* Not built: more than three slots ("additional uploads"). It needs a new table, a sync/backup version bump and a migration — a deliberate follow-up, not a tweak.

**Interview (`app/interview/page.tsx`, `lib/interview.ts`).** Every question has optional `situation/task/action/result` strings on the same row (no Dexie version bump — unindexed). The pre-STAR `answer` is **never written by the editor**; it shows read-only as "Original answer". Prompts come from `promptKey` (set on newly loaded starters) or, for older rows, by matching the question text **at read time** — opening the page writes nothing (see §7.13). Each field autosaves on its own (600 ms debounce, flush on blur/unmount, sequence-guarded so a late ack can't mark an older value "Saved"; failure keeps the text and offers Retry). `isDrafted()` (original prose OR ≥1 STAR field) is the one count used by the Dashboard and Tracker. Desktop is list-left / editor-right; below `lg` the editor opens under the tapped question.

**Keep-alive.** `app/api/keep-alive/route.ts` + `vercel.json` cron (daily 09:00 UTC) run one `user_data` query with the public key so the free Supabase project never pauses (it did in Nov 2026 and took sign-in down). Optional `CRON_SECRET` env var locks the route to Vercel Cron.

### 7.18 Certifications = Framed gallery (2026-11-21 — owner's choice over Wallet / Timeline)

* Credentials **with proof** are framed: the artwork (image, or page one of a PDF via `lib/pdf.ts`) fitted whole on a dark mat with a thin paper frame; type · expiry / title / issuer / "Issued …" or "Undated" always in the same positions beneath. The artwork is the "view proof" button and opens **Quick Look** (now also takes `{ kind: "image" }`), via `?cert=<id>` so Back / Escape return focus to the same credential. The old iframe viewer modal is gone.
* Credentials **without proof** are compact rows under "Awaiting proof": initials, title, issuer · date-or-Undated · type, **Attach proof**, Edit, Delete.
* New optional fields `credentialType` (certificate / licence / membership / course) and `expiresDate` (ISO, parsed with `parseLocalDate`). Rows without a type read as "course" when `fromCourseId` is set, else "certificate" — nothing is backfilled. Expiry shows on any type, amber within 60 days, red once past.
* Course ↔ certificate linkage (`fromCourseId` / `Course.certId`) is untouched. Delete now confirms, since it drops the attached file too.

### 7.19 Certifications = uniform credential cards (2026-11-21 — owner-directed, supersedes §7.18's framed gallery)

The framed gallery looked uneven because every certificate is a different shape, so certificates are no longer shown on the page at all — only in Quick Look.

* **Every credential is the same card** (`CredentialCard`), LinkedIn-style: type badge (+ "No proof yet") top-left, **issuer tile** top-right, then a two-line title slot, issuer, "Issued Jun 2026" (+ expiry), and a footer pinned to the bottom: **Show credential** (or **Attach proof**), **Verify ↗** when a URL is set (http/https only), then Download / Edit / Delete on their own row so every card matches. The "Awaiting proof" list is gone — fileless records are the same card.
* **The issuer tile is the preview button**: the logo on a light paper tile (logos are drawn for white), or a monogram on a colour picked stably from the issuer name. Hover/focus shows an eye (preview) or paperclip (attach). Clicking it opens Quick Look (`?cert=<id>`); without proof it opens the file picker.
* **`Certification.issuerLogo`** (optional Blob) is downscaled to ≤160 px PNG on upload (`shrinkLogo` in `lib/credentials.ts`) because every Blob rides in the single synced `user_data` row. Logos are **shared by issuer at display time** (`issuerKey` ignores case, spaces, punctuation, "&"/"and"), and a `Course.logo` from the same provider counts too — nothing is copied between rows.
* **Issue dates stay free text as typed**; `parseIssued` reads `YYYY-MM-DD`, `DD-MM-YYYY` (day-first, Australian), `YYYY-MM` and `YYYY` from local parts, for display at LinkedIn granularity and for sorting newest-first (unreadable/undated last). The old string sort put "21-06-2026" below "2025-11-12".

### 7.20 Landing / sign-in screen, rewritten short (2026-11-21 — owner-directed)

`components/auth/LoginScreen.tsx` went from ~170 words to ~30: lockup, "Your whole job hunt, *one place.*" (the only Mint text), one line, three Pine-tile pillars (Track / Store / Prep), and the sign-in card ("Create an account" inside it, "Forgot?" beside the password label). The feature cards and the fictional sample table are gone. **The data-handling note stays** — collapsed under "How your data is used" — because it is the one place the Anthropic API disclosure lives; don't delete it. Backdrop uses only brand colours: the dashboard dot grid and a Pine wash (no glow, per brand §06). The large background Mark was tried and removed at the owner's request. On desktop the two columns share a top edge (logo level with the card) and are centred as one block. Auth logic is unchanged.

### 7.21 Companies = at-a-glance dossier (2026-11-21 — owner-directed; the old page read like an essay)

* **Layout** (`CompanyDetail` in `app/companies/page.tsx`): monogram + name + one-line tagline (click it for the full Overview and Industries) → Priority / Track → one compact research bar → four **glance tiles** (Known for, Drop this in, Your angle, Open now) → talking points as numbered lines with Copy all → Sources → applications → delete. A tile opens in place, full width, to its **short version and the full write-up — both editable**. "Full write-up" opens everything at once. Nothing from the old page was removed; the long fields are all still there, one click in.
* **Short fields are companions, never replacements**: `tagline`, `knownFor[]`, `hook`, `angleShort`, `roleShort` (unindexed, optional). A tile with no short version shows the first sentence of its long field (`excerpt`). Talking points stay one string and are split into lines for display only.
* **Research** returns the long fields as before plus the short ones in the same lookup, and the short fields must restate the long ones — no new facts (prompt rule). Still fill-only-empty, still marks `aiFilled`. **Shorten** (`mode: "shorten"` on the same edge function, no web search, ~600 tokens) condenses what's already written for companies researched before this; it only fills empty short fields, uses one lookup from the daily quota, and an old deployed function that ignores the mode is detected and reported rather than read as "nothing to fill".
* **"Add to tracker"** on the Open now tile logs a draft application with `roleShort` as the role; once one exists the tile shows its status instead.
* Below `lg` the page is single-pane (list, then dossier with "All companies" back) — at 768–1023 px the two-pane layout squeezed the dossier to a sliver. Priority/Track chips wrap.
* **The edge function must be redeployed for the short fields and Shorten** (see DEPLOY.md). Until it is, research works as before and the tiles use excerpts.

### 7.22 Vault: instant open, shelf fills the screen (2026-11-22)

* **Owner check is local**: `useIsOwner` uses `getSession()` (stored session, no network) instead of `getUser()` (an auth-server round trip on every mount that held the Vault blank for seconds), and caches the answer module-wide. It's a display preference — which built-in templates to show — not access control.
* **Cover thumbnails are keyed by file signature** (size, type, name, lastModified), not Blob identity: every IndexedDB read returns a fresh Blob, so the old WeakMap missed on every visit. `peekThumbnail` lets a revisit paint covers on the first frame. Finished covers (JPEG data URLs) are also kept per slot in the device-local `meta` table as `pdfthumb:<slot>` — never synced or backed up — so a reload is fast too; they're cleared when a different account signs in on the device.
* **`warmVaultCovers`** (`lib/vaultWarmup.ts`, called once from `Sidebar` on idle) loads PDF.js and prepares every stored PDF's cover before the Vault is opened. Its slot ids and width (300) must match `ShelfCard`'s or the cache keys differ.
* **Desktop shelf fills the viewport**: the page is a column, the grid takes the remaining height, cards are full height, and the cover is the flexible part (`lg:flex-1 lg:[contain:size]` — the size containment stops the full-size template preview inside it from inflating the row) with the paper sized by height. Opening File info shrinks that card's cover instead of stretching the row. Phones keep the compact rows.

### 7.23 Courses: alignment and formatting pass (2026-11-22 — owner chose to keep the layout)

* Date and action columns are fixed width (`w-36` each) so every row's date lines up; actions are always visible (hover-only hid them on touch screens).
* `DateCell` shows "21 Jun 2026" / "set date" via `parseLocalDate` + `formatDate` and opens the native picker with `showPicker()`; the `<input type="date">` stays in the DOM but hidden. Completed courses sort by `completedDate`, newest first.
* Days are zero-padded ("08 Dec 2025") so every date in the mono column is the same length. Actions column is `w-40` and "log in vault →" never wraps.
* Course icons: own logo → issuer logo shared with Certifications (`issuerKey`) → favicon → two-letter monogram on `monogramColour`. Logos and favicons fill the tile edge to edge (`object-cover`, no paper padding — owner's call; wide wordmarks get cropped at the sides). Uploads go through `shrinkLogo`. Delete confirms when notes, link, logo or skill links would be lost.
* Phones: the title takes the first line; date and actions wrap below.
* Three redesigns were mocked (focus card, lanes, timeline) and declined for now — A and B would need a new per-course progress field.

### 7.24 Examples = story board (2026-11-22 — owner-directed: keep the original boxes, lose the side gutters)

* `app/examples/page.tsx` is full width (`max-w-[1600px]`, was `max-w-4xl`) with three stat tiles beside the heading (examples / fully detailed / skills). Add bar and tag filter unchanged.
* `lg` and up: list left (4fr) / selected story right (8fr, sticky), like Interview. Each row shows a four-segment STAR bar + "n/4 detailed"; the first visible example is selected by default. Below `lg` it is the original accordion.
* The editor keeps the original 2×2 STAR boxes, Skill tags, Evidence and Delete. New: a header with word count and spoken length (~150 wpm), and **Read it back** — the written parts joined into one paragraph, with what's missing, a warning past ~300 words (two minutes), and Copy. Nothing is generated; it only joins the user's own text.
* STAR text is held locally so Read it back updates live; each box still saves on blur, and unsaved text is flushed on unmount. No schema change.

### 7.25 Dashboard tweaks (2026-11-22 — owner kept the original layout; small fixes only)

* Tile numbers match the sidebar (04 Interview … 09 Portfolio) and a **05 · Examples** tile (stories written / fully detailed) sits between Interview and Certifications. Portfolio is an ordinary faded tile closing the last row instead of a full-width strip, so the grid has no holes at 3 columns or 2.
* The Applications bar has a caption ("17 open · 1 offer · 28 rejected"; open = draft + applied + interview). "Interviews" is now "Interviews scheduled" — it counts the current interview status only, which read as a mistake beside "1 offer".
* **"What needs doing" is hidden when nothing is due in the next two weeks** (owner asked to remove the empty box). It reappears as soon as a dated deadline / interview / follow-up / course target falls inside the window; an account with no applications still gets the "Add an application" nudge. Only dated items are ever listed.
* Page width `max-w-6xl` (was `5xl`). Clock, Vault tile and the rest are unchanged.

### 7.26 Shared page backdrop (2026-11-22)

The dashboard's dot grid + faint Mint glow is now `components/layout/PageBackdrop.tsx`, rendered once in the layout's `<main>` (which is `relative`), so every page has it behind its content. It is not in `template.tsx`, so it stays still while pages animate in; the template's wrapper is `relative` to sit above it. It covers the first screen and scrolls away. Keep it this faint — brand §06 rules out glows that compete with content; panels on solid surfaces hide it, which is intended.
