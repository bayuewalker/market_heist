import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  highlighted?: boolean;
};

export default function Card({
  children,
  highlighted = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`group relative rounded-2xl border p-6 transition-all duration-300 ${
        highlighted
          ? "gradient-border border-accent/50 bg-surface-2 shadow-[0_0_0_1px_rgba(47,226,138,0.25),0_28px_70px_-24px_rgba(47,226,138,0.5)]"
          : "border-border-subtle bg-surface hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_0_0_1px_rgba(47,226,138,0.15),0_24px_50px_-24px_rgba(47,226,138,0.4)]"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
