"use client";

import { usePathname } from "next/navigation";

/**
 * The quiet backdrop behind every page: the dot grid, fading out around the
 * main glow, plus two soft glows — Mint and one quieter brand tone — placed
 * differently on each page. They wander slowly (transform-only keyframes in
 * globals.css) and glide to the next page's layout on navigation.
 *
 * It lives in the layout's <main> (not template.tsx), so it persists across
 * routes — that's what lets the glows move rather than pop. It covers the
 * first screen and scrolls away. Pages draw their panels on solid surfaces,
 * so it only shows in the gaps.
 *
 * Keep it faint: brand §06 rules out glows that compete with content, and
 * "if a screen looks mint, it's wrong" (§04). Reduced motion stops the drift
 * and the glide (global rule in globals.css).
 */

type Glow = {
  /** Centre, as % of the first screen. */
  x: number;
  y: number;
  /** Width in rem; height is half. */
  size: number;
  /** A CSS colour (a brand token). */
  colour: string;
  /** How much of the colour at the centre, %. */
  strength: number;
};

const MINT = "var(--color-accent)";
const SAGE = "var(--color-sage)";
const SLATE = "var(--color-info)";
const SAND = "var(--color-cover-retail-ink)";

/** [Mint glow, second glow] per section. Unlisted routes use the default. */
const LAYOUTS: Record<string, [Glow, Glow]> = {
  "/": [
    { x: 50, y: 0, size: 60, colour: MINT, strength: 15 },
    { x: 92, y: 30, size: 40, colour: SAGE, strength: 12 },
  ],
  "/workspace": [
    { x: 12, y: 4, size: 52, colour: MINT, strength: 14 },
    { x: 88, y: 70, size: 46, colour: SLATE, strength: 10 },
  ],
  "/companies": [
    { x: 86, y: 2, size: 54, colour: MINT, strength: 14 },
    { x: 58, y: 92, size: 48, colour: SLATE, strength: 10 },
  ],
  "/tracker": [
    { x: 20, y: 0, size: 56, colour: MINT, strength: 14 },
    { x: 80, y: 6, size: 44, colour: SAND, strength: 8 },
  ],
  "/interview": [
    { x: 78, y: 0, size: 56, colour: MINT, strength: 14 },
    { x: 10, y: 45, size: 40, colour: SAGE, strength: 12 },
  ],
  "/examples": [
    { x: 30, y: 0, size: 58, colour: MINT, strength: 14 },
    { x: 95, y: 55, size: 42, colour: SAND, strength: 8 },
  ],
  "/certifications": [
    { x: 62, y: 0, size: 58, colour: MINT, strength: 14 },
    { x: 6, y: 35, size: 40, colour: SAND, strength: 9 },
  ],
  "/skills": [
    { x: 8, y: 10, size: 54, colour: MINT, strength: 14 },
    { x: 90, y: 0, size: 44, colour: SAGE, strength: 12 },
  ],
  "/courses": [
    { x: 40, y: 0, size: 56, colour: MINT, strength: 14 },
    { x: 96, y: 40, size: 42, colour: SLATE, strength: 9 },
  ],
};

const layoutFor = (path: string): [Glow, Glow] => {
  const section = "/" + (path.split("/")[1] ?? "");
  return LAYOUTS[section] ?? LAYOUTS["/"];
};

function GlowBlob({ glow, drift }: { glow: Glow; drift: "a" | "b" }) {
  return (
    <div
      className="absolute rounded-full transition-[left,top,width,height,opacity] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
      style={{
        left: `${glow.x}%`,
        top: `${glow.y}%`,
        width: `${glow.size}rem`,
        height: `${glow.size / 2}rem`,
        maxWidth: "140%",
        background: `radial-gradient(closest-side, color-mix(in srgb, ${glow.colour} ${glow.strength}%, transparent), transparent)`,
        animation: `glow-drift-${drift} ${drift === "a" ? 22 : 29}s ease-in-out infinite alternate`,
      }}
    />
  );
}

export function PageBackdrop() {
  const [main, second] = layoutFor(usePathname() ?? "/");
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--color-edge)_1px,transparent_0)] bg-[size:26px_26px]"
        style={{
          maskImage: `radial-gradient(ellipse 70% 60% at ${main.x}% ${main.y}%, black 30%, transparent 100%)`,
        }}
      />
      <GlowBlob glow={second} drift="b" />
      <GlowBlob glow={main} drift="a" />
    </div>
  );
}
