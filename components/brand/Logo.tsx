/**
 * CareerCommand brand marks — brand guidelines v1.0.
 *
 * §01 The mark: two concentric arcs on a 100-unit artboard, both 12 units
 * wide, with a 96° aperture that always faces right. Terminals are radial
 * butt cuts — never rounded. The outer (Mint) arc is the person and always
 * reads dominant; the inner (Sage) arc is the goal and never gets louder.
 *
 * §06 Misuse: never rotate, stretch, recolour outside the palette, add a
 * glow/bevel/shadow, or flip the weight hierarchy.
 */

/** §04 Colour. */
export const BRAND = {
  mint: "#7FD9B9",
  sage: "#4C8C78",
  pineFrom: "#26473E",
  pineTo: "#17322B",
  carbon: "#0B0E0D",
  mist: "#EDF1EF",
} as const;

// Geometry: centre (50,50), aperture ±48°, outer r=33.5, inner r=14.5.
const OUTER_ARC = "M72.416 25.105A33.5 33.5 0 1 0 72.416 74.895";
const INNER_ARC = "M59.702 39.224A14.5 14.5 0 1 0 59.702 60.776";

/** The mark on its own. Minimum size 16px (§01). */
export function Mark({
  className,
  outer = BRAND.mint,
  inner = BRAND.sage,
  label,
}: {
  className?: string;
  outer?: string;
  inner?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={OUTER_ARC} stroke={outer} strokeWidth={12} strokeLinecap="butt" />
      <path d={INNER_ARC} stroke={inner} strokeWidth={12} strokeLinecap="butt" />
    </svg>
  );
}

/**
 * The Pine tile with the mark at 62% of tile width (§03). Corner radius is
 * 22.37% of the tile. On light surfaces the tile stays dark — Mint has no
 * contrast on paper without it (§02).
 */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center ${className ?? ""}`}
      style={{
        background: `linear-gradient(135deg, ${BRAND.pineFrom}, ${BRAND.pineTo})`,
        borderRadius: "22.37%",
      }}
    >
      <Mark className="aspect-square w-[62%]" />
    </span>
  );
}

/**
 * §02 Wordmark: one word, two capitals, never a space, never all-caps.
 * Archivo, tracking −0.035em always.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={`font-brand whitespace-nowrap ${className ?? ""}`}
      style={{ letterSpacing: "-0.035em" }}
    >
      <span className="font-normal">Career</span>
      <span className="font-bold">Command</span>
    </span>
  );
}

/**
 * Primary horizontal lockup (§02). Tile height = 1.85 × wordmark size,
 * gap = 0.35 × tile height. Below 120px wide, drop the wordmark and use
 * the mark alone.
 */
export function Lockup({
  className,
  tileClassName = "size-8",
  wordClassName = "text-base",
}: {
  className?: string;
  tileClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoTile className={tileClassName} />
      <Wordmark className={wordClassName} />
    </span>
  );
}
