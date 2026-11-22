"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { warmVaultCovers } from "@/lib/vaultWarmup";
import { warmIssuerLogos } from "@/lib/logoCache";
import { Badge } from "@/components/ui/Badge";
import { LogoTile, Wordmark } from "@/components/brand/Logo";
import { BackupControl } from "@/components/layout/BackupControl";
import { AccountControl } from "@/components/auth/AccountControl";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", code: "00" },
  { href: "/workspace", label: "Vault", code: "01" },
  { href: "/companies", label: "Companies", code: "02" },
  { href: "/tracker", label: "Tracker", code: "03" },
  { href: "/interview", label: "Interview", code: "04" },
  { href: "/examples", label: "Examples", code: "05" },
  { href: "/certifications", label: "Certifications", code: "06" },
  { href: "/skills", label: "Skills", code: "07" },
  { href: "/courses", label: "Courses", code: "08" },
] as const;

const routeIndex = (pathname: string) =>
  NAV_ITEMS.findIndex((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );

/**
 * Wait this long after the last arrow press before opening the page, so
 * holding ↓ glides the highlight down the list without loading every page
 * on the way.
 */
const ARROW_SETTLE_MS = 160;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // The sidebar mounts once the app is ready (signed in and synced), which is
  // the right moment to get the Vault's covers ready in the background.
  useEffect(() => {
    warmVaultCovers();
    warmIssuerLogos();
  }, []);

  /* ── Keyboard: ↑/↓ (and Home/End) move between tabs ────────────────────
     Only while focus is in the nav (clicking a tab puts it there), so arrow
     keys still scroll pages everywhere else. The highlight moves at once;
     the route follows when the key is released for a moment. */
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const settle = useRef<number | undefined>(undefined);
  // An arrow-key pick that hasn't been navigated to yet, tied to the page it
  // was made on — once the route changes it's spent, with no effect needed.
  const [pending, setPending] = useState<{ index: number; from: string } | null>(null);
  const routeIdx = routeIndex(pathname);
  const shownIdx = pending && pending.from === pathname ? pending.index : routeIdx;

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const onNavKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const last = NAV_ITEMS.length - 1;
    const focused = linkRefs.current.findIndex((el) => el === document.activeElement);
    const from = focused >= 0 ? focused : Math.max(shownIdx, 0);
    let to: number;
    switch (e.key) {
      case "ArrowDown":
        to = Math.min(from + 1, last);
        break;
      case "ArrowUp":
        to = Math.max(from - 1, 0);
        break;
      case "Home":
        to = 0;
        break;
      case "End":
        to = last;
        break;
      default:
        return;
    }
    e.preventDefault(); // the nav column itself shouldn't scroll
    if (to === from && focused >= 0) return;
    linkRefs.current[to]?.focus({ preventScroll: true });
    setPending({ index: to, from: pathname });
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(
      () => router.push(NAV_ITEMS[to].href),
      ARROW_SETTLE_MS,
    );
  };

  /* ── Sliding highlight ─────────────────────────────────────────────────
     One indicator behind the links, moved with a transform, instead of each
     link toggling its own background — so changing tab glides. */
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ y: number; h: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const el = linkRefs.current[shownIdx];
      setIndicator(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
    };
    measure();
    const nav = navRef.current;
    if (!nav) return;
    // Sizes change at the md breakpoint (icon rail); re-measure without
    // animating the jump.
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [shownIdx]);

  // Enable the slide only after the first placement, so it doesn't sweep in
  // from the top on load.
  useEffect(() => {
    if (indicator && !animate) {
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
  }, [indicator, animate]);

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-edge bg-surface max-md:w-16">
      <div className="flex h-14 items-center gap-2.5 border-b border-edge px-4 max-md:justify-center max-md:px-0">
        <LogoTile className="size-8" />
        <Wordmark className="text-[15px] max-md:hidden" />
      </div>

      <nav
        ref={navRef}
        aria-label="Sections"
        onKeyDown={onNavKeyDown}
        className="relative flex flex-1 flex-col gap-1 p-2"
      >
        {indicator && (
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-x-2 top-0 rounded-sm bg-raised shadow-[inset_2px_0_0_var(--color-accent)] ${
              animate
                ? "transition-[transform,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                : ""
            }`}
            style={{
              height: indicator.h,
              transform: `translateY(${indicator.y}px)`,
            }}
          />
        )}

        {NAV_ITEMS.map((item, i) => {
          const active = i === shownIdx;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              aria-current={i === routeIdx ? "page" : undefined}
              onClick={(e) => {
                // Safari doesn't focus links on click; arrow keys need it.
                e.currentTarget.focus({ preventScroll: true });
                window.clearTimeout(settle.current);
                setPending(null);
              }}
              // On mobile the sidebar collapses to an icon rail, where py-2
              // left each link under the ~44px minimum touch target.
              className={`relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-200 max-md:min-h-11 max-md:justify-center max-md:px-0 max-md:py-3 ${
                // The sliding highlight (with its Mint edge) marks the focused
                // tab, so its outline would only flicker along behind it.
                active
                  ? "text-ink focus-visible:outline-none"
                  : "text-ink-muted hover:bg-panel hover:text-ink"
              }`}
            >
              <span
                className={`font-mono text-[10px] transition-colors duration-200 ${
                  active ? "text-accent" : "text-ink-faint"
                }`}
              >
                {item.code}
              </span>
              <span className="max-md:hidden">{item.label}</span>
            </Link>
          );
        })}

        <div
          className="mt-1 flex cursor-not-allowed items-center gap-3 rounded-sm px-3 py-2 text-sm text-ink-faint max-md:min-h-11 max-md:justify-center max-md:px-0 max-md:py-3"
          title="A shareable page of selected work — not built yet"
        >
          <span className="font-mono text-[10px]">09</span>
          <span className="max-md:hidden">Portfolio</span>
          <span className="ml-auto max-md:hidden">
            <Badge tone="faint">Soon</Badge>
          </span>
        </div>
      </nav>

      <div className="space-y-2 border-t border-edge p-3 max-md:p-2">
        <AccountControl />
        <BackupControl />
        <ThemeToggle />
        <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint max-md:text-center">
          <span className="max-md:hidden">v0.1</span>
          <span className="md:hidden">v0.1</span>
        </p>
      </div>
    </aside>
  );
}
