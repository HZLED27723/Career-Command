"use client";

import { usePathname } from "next/navigation";

/**
 * Page heading. The second line says what the page is FOR, in the user's
 * terms — it used to carry build-oriented labels ("Module Launcher",
 * "Two-Way Career CRM", "Categorised Q&A Dropdowns") that describe how the
 * thing was built rather than what it does for the person reading it.
 */
const TITLES: Record<string, { title: string; blurb: string }> = {
  "/": { title: "Dashboard", blurb: "What needs your attention" },
  "/workspace": {
    title: "Document Vault",
    blurb: "Your resumes and cover letters, ready to send",
  },
  "/companies": {
    title: "Companies",
    blurb: "What you know about each employer",
  },
  "/tracker": {
    title: "Applications",
    blurb: "Every application and where it stands",
  },
  "/interview": {
    title: "Interview Prep",
    blurb: "Practise your answers before the day",
  },
  "/examples": {
    title: "Examples",
    blurb: "Things you've done, ready to reuse in an answer",
  },
  "/certifications": {
    title: "Certifications",
    blurb: "Your credentials and the proof behind them",
  },
  "/skills": {
    title: "Skills",
    blurb: "What you can do, and what you're building next",
  },
  "/courses": {
    title: "Courses",
    blurb: "What you're learning and what's queued up",
  },
};

export function TopBar() {
  const pathname = usePathname();
  const entry = TITLES[pathname] ?? TITLES["/"];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-edge bg-surface px-5">
      <div className="flex items-baseline gap-3">
        <h1 className="text-sm font-semibold tracking-tight">{entry.title}</h1>
        <p className="text-[11px] text-ink-muted max-sm:hidden">
          {entry.blurb}
        </p>
      </div>
    </header>
  );
}
