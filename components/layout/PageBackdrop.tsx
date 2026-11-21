/**
 * The quiet backdrop behind every page: the dashboard's dot grid, fading out
 * from the top, and a soft Mint wash centred above the content. It lives in the
 * layout's <main> (not in template.tsx), so it stays still while pages animate
 * in, and it scrolls away with the top of the page.
 *
 * Kept deliberately faint — brand §06 rules out glows that compete with
 * content. Pages draw their panels on solid surfaces, so it only shows in the
 * gaps between them.
 */
export function PageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--color-edge)_1px,transparent_0)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="absolute -top-40 left-1/2 h-80 w-[42rem] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent)_9%,transparent),transparent)]" />
    </div>
  );
}
