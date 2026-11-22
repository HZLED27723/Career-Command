import Link from "next/link";
import type { ReactNode } from "react";
import { Lockup } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Shared frame for the privacy policy and terms (§7.31). Public, so it renders
 * outside the app chrome: lockup home link, theme switch, readable column.
 */

/** Shown at the top of both pages. Change it whenever either page changes. */
export const LEGAL_UPDATED = "22 November 2026";

/** Where privacy questions and requests go. */
export const CONTACT_EMAIL = "hamdan3809@gmail.com";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-full overflow-x-clip">
      {/* The same soft accent glow the app pages have, kept to the top corner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] size-[34rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent)",
        }}
      />
      <div className="relative mx-auto max-w-2xl px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-16">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="CareerCommand home" className="rounded-sm">
            <Lockup tileClassName="size-8" wordClassName="text-base" />
          </Link>
          <ThemeToggle variant="pill" />
        </header>

        <p className="mt-12 font-mono text-[10px] uppercase tracking-widest text-accent">
          Last updated {LEGAL_UPDATED}
        </p>
        <h1 className="mt-2 text-[2rem] leading-tight font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        <div className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          {intro}
        </div>

        <div className="legal mt-10 space-y-9">{children}</div>

        <footer className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-edge pt-5 text-xs text-ink-faint">
          <Link href="/" className="transition-colors hover:text-ink">
            ← Back to CareerCommand
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-ink">
            Privacy policy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-ink">
            Terms of use
          </Link>
        </footer>
      </div>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6">
      <h2 id={`${id}-h`} className="text-lg font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-muted [&_a]:text-accent [&_a]:underline-offset-2 [&_a:hover]:underline [&_b]:font-semibold [&_b]:text-ink [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
