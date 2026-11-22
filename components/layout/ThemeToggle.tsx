"use client";

import { useSyncExternalStore } from "react";

/**
 * Light / dark switch. Dark is the brand default; light is a per-device
 * preference kept in localStorage (it's how this screen looks, not account
 * data, so it isn't synced or backed up). The saved choice is applied before
 * first paint by the inline script in app/layout.tsx; this component only
 * flips the `data-theme` attribute and remembers it.
 */
export const THEME_KEY = "cc-theme";

type Theme = "light" | "dark";

const read = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

function setTheme(next: Theme) {
  if (next === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* private mode or blocked storage: the switch still works this visit */
  }
  listeners.forEach((l) => l());
}

/**
 * `sidebar`: a quiet row in the sidebar footer (icon only on the phone rail).
 * `pill`: a small bordered button for screens without the sidebar — the
 * sign-in page — with its label always shown.
 */
export function ThemeToggle({ variant = "sidebar" }: { variant?: "sidebar" | "pill" }) {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  const next: Theme = theme === "light" ? "dark" : "light";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`Switch to ${next} mode`}
        title={`Switch to ${next} mode`}
        className="flex min-h-9 items-center gap-2 rounded-full border border-edge-strong bg-surface/80 px-3.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted backdrop-blur transition-colors hover:border-accent hover:text-ink"
      >
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
        {next === "light" ? "Light mode" : "Dark mode"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="flex w-full items-center gap-2 rounded-sm px-1 py-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint transition-colors hover:text-ink max-md:min-h-11 max-md:justify-center"
    >
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
      <span className="max-md:hidden">{next === "light" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
