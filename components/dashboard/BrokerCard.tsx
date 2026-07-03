"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import type { BrokerAccountRow, BrokerAccountStatus, BrokerRow } from "@/lib/supabase/types";

type Status = BrokerAccountStatus | "not_submitted";

const STATUS_META: Record<Status, { label: string; className: string; Icon: LucideIcon }> = {
  not_submitted: { label: "Not submitted", className: "border-border-subtle bg-white/5 text-muted", Icon: Circle },
  submitted: { label: "Submitted", className: "border-amber-500/40 bg-amber-500/10 text-amber-300", Icon: Clock },
  under_review: { label: "Under review", className: "border-amber-500/40 bg-amber-500/10 text-amber-300", Icon: Loader2 },
  verified: { label: "Verified", className: "border-accent/40 bg-accent/10 text-accent-strong", Icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "border-rose-500/40 bg-rose-500/10 text-rose-300", Icon: XCircle },
  duplicate: { label: "Duplicate UID", className: "border-rose-500/40 bg-rose-500/10 text-rose-300", Icon: AlertTriangle },
  inactive: { label: "Inactive", className: "border-border-subtle bg-white/5 text-muted", Icon: Ban },
};

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

export default function BrokerCard({
  broker,
  account,
}: {
  broker: BrokerRow;
  account: BrokerAccountRow | null;
}) {
  const router = useRouter();
  const status: Status = account?.status ?? "not_submitted";
  const meta = STATUS_META[status];
  const editable = status === "not_submitted" || status === "submitted" || status === "rejected";

  const [uid, setUid] = useState(account?.uid ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/broker-accounts/submit-uid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker_id: broker.id, uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submission failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{broker.name}</h3>
          <p className="text-xs text-muted">{broker.markets.join(" · ") || "Crypto"}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
        >
          <meta.Icon className={`h-3.5 w-3.5 ${status === "under_review" ? "animate-spin" : ""}`} aria-hidden="true" />
          {meta.label}
        </span>
      </header>

      <a
        href={broker.referral_base_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent-strong hover:underline"
      >
        Open referral link
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>

      {status === "verified" && account?.verified_at && (
        <p className="text-xs text-muted">Verified on {fmtDate(account.verified_at)}.</p>
      )}

      {status === "rejected" && account?.note && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {account.note}
        </p>
      )}

      {(status === "duplicate" || status === "inactive") && account?.note && (
        <p className="text-xs text-muted">{account.note}</p>
      )}

      {editable ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <label htmlFor={`uid-${broker.id}`} className="text-xs font-medium text-foreground">
            Your {broker.name} UID
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`uid-${broker.id}`}
              required
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="e.g. 123456789"
              className={fieldClass}
            />
            <Button type="submit" size="md" disabled={loading} className="shrink-0">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : status === "rejected" ? (
                "Resubmit"
              ) : (
                "Submit UID"
              )}
            </Button>
          </div>
          {error && <p className="text-xs text-rose-300">{error}</p>}
        </form>
      ) : (
        <p className="font-mono text-sm text-foreground">{account?.uid}</p>
      )}
    </article>
  );
}
