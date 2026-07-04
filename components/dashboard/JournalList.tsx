"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { TradeJournalRow } from "@/lib/supabase/types";

const outcomeColor: Record<string, string> = {
  win: "text-accent-strong border-accent/40 bg-accent/10",
  loss: "text-rose-300 border-rose-500/40 bg-rose-500/10",
  breakeven: "text-muted border-border-subtle bg-white/5",
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

export default function JournalList({ trades }: { trades: TradeJournalRow[] }) {
  const router = useRouter();
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [reviewErrors, setReviewErrors] = useState<
    Record<string, { message: string; code?: "plan_gated" | "consent_required" }>
  >({});
  const [deleting, setDeleting] = useState<string | null>(null);

  async function getReview(id: string) {
    setReviewing(id);
    setReviewErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch("/api/mentor/trade-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalEntryId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewErrors((prev) => ({
          ...prev,
          [id]: { message: data?.error || "Review failed.", code: data?.code },
        }));
        return;
      }
      setReviews((prev) => ({ ...prev, [id]: data.answer }));
    } catch {
      setReviewErrors((prev) => ({ ...prev, [id]: { message: "Review failed." } }));
    } finally {
      setReviewing(null);
    }
  }

  async function deleteTrade(id: string) {
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("trade_journals").delete().eq("id", id);
    router.refresh();
    setDeleting(null);
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/50 p-10 text-center">
        <p className="font-medium text-foreground">No trades logged yet</p>
        <p className="mt-1 text-sm text-muted">Log your first trade above to start tracking discipline.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {trades.map((trade) => (
        <div key={trade.id} className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">
                {trade.pair} <span className="font-normal capitalize text-muted">· {trade.direction}</span>
              </p>
              <p className="text-xs text-muted">{fmtDate(trade.traded_at)} UTC</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {trade.outcome && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${outcomeColor[trade.outcome]}`}>
                  {trade.outcome}
                </span>
              )}
              {!trade.followed_plan && (
                <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                  Off-plan
                </span>
              )}
            </div>
          </div>

          {trade.notes && <p className="text-sm text-muted">{trade.notes}</p>}

          <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
            <button
              type="button"
              onClick={() => getReview(trade.id)}
              disabled={reviewing === trade.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent-strong disabled:opacity-50"
            >
              {reviewing === trade.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Get Mentor review
            </button>
            <button
              type="button"
              onClick={() => deleteTrade(trade.id)}
              disabled={deleting === trade.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </button>
          </div>

          {reviews[trade.id] && (
            <p className="whitespace-pre-line rounded-lg border border-accent/20 bg-accent/5 p-3 text-sm text-foreground">
              {reviews[trade.id]}
            </p>
          )}
          {reviewErrors[trade.id] && (
            <p role="alert" className="text-xs text-rose-300">
              {reviewErrors[trade.id].message}
              {reviewErrors[trade.id].code === "plan_gated" && (
                <>
                  {" "}
                  <Link href="/dashboard/billing" className="font-medium underline">Upgrade to Pro</Link> for Mentor
                  reviews.
                </>
              )}
              {reviewErrors[trade.id].code === "consent_required" && (
                <>
                  {" "}
                  Visit <Link href="/dashboard/ai-mentor" className="font-medium underline">Mentor Heister</Link> to
                  accept the AI data consent gate first.
                </>
              )}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
