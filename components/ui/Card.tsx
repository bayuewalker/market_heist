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
          ? "border-accent/50 bg-surface-2 shadow-[0_0_0_1px_rgba(47,226,138,0.25),0_20px_60px_-20px_rgba(47,226,138,0.4)]"
          : "border-border-subtle bg-surface hover:border-accent/40 hover:shadow-[0_0_0_1px_rgba(47,226,138,0.15),0_16px_40px_-20px_rgba(47,226,138,0.3)]"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
