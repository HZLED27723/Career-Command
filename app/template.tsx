/**
 * Remounts on every route change (unlike layout), giving each page a smooth
 * entrance without any client-side routing tricks.
 */
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  // `relative` keeps the page above the layout's PageBackdrop.
  return <div className="relative h-full animate-page-enter">{children}</div>;
}
