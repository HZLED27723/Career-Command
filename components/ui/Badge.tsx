type BadgeTone = "accent" | "muted" | "faint";

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
}

const TONES: Record<BadgeTone, string> = {
  accent: "bg-accent-dim text-accent-strong",
  muted: "bg-raised text-ink-muted",
  faint: "bg-transparent text-ink-faint border border-edge",
};

export function Badge({ tone = "muted", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
