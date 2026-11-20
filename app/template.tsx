/**
 * Remounts on every route change (unlike layout), giving each page a smooth
 * entrance without any client-side routing tricks.
 */
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-full animate-page-enter">{children}</div>;
}
