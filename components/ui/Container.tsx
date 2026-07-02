import type { HTMLAttributes, ReactNode } from "react";

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export default function Container({ children, className = "", ...props }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-6 sm:px-8 ${className}`} {...props}>
      {children}
    </div>
  );
}
