type ButtonVariant = "primary" | "ghost" | "outline";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-dim text-accent-strong hover:bg-accent hover:text-bg border border-transparent",
  ghost: "text-ink-muted hover:bg-panel hover:text-ink border border-transparent",
  outline: "border border-edge-strong text-ink-muted hover:border-accent hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
