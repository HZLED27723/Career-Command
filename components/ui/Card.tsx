interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-md border border-edge bg-panel ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
