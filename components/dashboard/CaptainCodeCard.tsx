"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Users } from "lucide-react";

export default function CaptainCodeCard({ code, link }: { code: string | null; link: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function becomeCaptain() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/captain/code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!code || !link) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Become a Captain</h2>
            <p className="text-xs text-muted">Get your own referral link and start growing the community.</p>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button
          type="button"
          onClick={becomeCaptain}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#06120d] transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Get my Captain Code
        </button>
        <p className="text-xs text-muted">
          Captain Reward is a thank-you for growing the community — it&apos;s not MLM, not passive income, and
          not an investment return.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25">
          <Users className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Your Captain Code</h2>
          <p className="text-xs text-muted">Share this link — anyone who signs up through it joins your branch.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          className="w-full flex-1 rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent-strong"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="text-xs text-muted">
        Captain Reward is a thank-you for growing the community — it&apos;s not MLM, not passive income, and not
        an investment return.
      </p>
    </div>
  );
}
