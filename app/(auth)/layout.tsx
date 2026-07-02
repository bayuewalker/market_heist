import Link from "next/link";
import Logo from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(47,226,138,0.18),transparent)]"
      />
      <div className="bg-grid-fine pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Market Heist home">
            <Logo />
          </Link>
        </div>
        <div className="gradient-border rounded-2xl border border-border-subtle bg-surface/80 p-6 backdrop-blur-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
