import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Trust Center",
  description: "Every trust, compliance, and transparency page for Market Heist AI in one place.",
};

const PAGES: { href: string; label: string; detail: string }[] = [
  { href: "/risk", label: "Risk Disclaimer", detail: "Trading risk and no guarantee of profit." },
  { href: "/affiliate-disclosure", label: "Affiliate Disclosure", detail: "How our broker partnerships work." },
  { href: "/reward-policy", label: "Reward Policy", detail: "How reward eligibility, status, and payment work." },
  { href: "/dashboard/signals", label: "Signal Archive", detail: "Every signal outcome, shown transparently." },
  { href: "/donation-ledger", label: "Donation Ledger", detail: "Where the donation pool went, in full." },
  { href: "/transparency-report", label: "Transparency Report", detail: "Monthly report on signals, rewards, and growth." },
  { href: "/terms", label: "Terms of Service", detail: "The product/legal boundary." },
  { href: "/privacy", label: "Privacy Policy", detail: "How we collect and use your data." },
  { href: "/ai-data-consent", label: "AI Data Consent", detail: "How Mentor Heister uses your data." },
];

export default function TrustPage() {
  return (
    <article>
      <h1>Trust Center</h1>
      <p>
        Market Heist AI is built on transparency — real trading data, real reward math, and a clear
        account of where every donation goes. This page links to every trust and compliance page on
        the platform.
      </p>

      <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-2">
        {PAGES.map((p) => (
          <a
            key={p.href}
            href={p.href}
            className="group flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 !text-foreground !no-underline transition-colors hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium !text-foreground">{p.label}</p>
              <p className="text-xs !text-muted">{p.detail}</p>
            </div>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent-strong"
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </article>
  );
}
