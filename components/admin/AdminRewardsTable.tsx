"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import type { RewardLedgerRow, RewardLedgerStatus } from "@/lib/supabase/types";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

const statusColor: Record<RewardLedgerStatus, string> = {
  estimated: "border-border-subtle text-muted",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  approved: "border-accent/40 bg-accent/10 text-accent-strong",
  paid: "border-accent/40 bg-accent/10 text-accent-strong",
};

export default function AdminRewardsTable({
  rewards,
  emailById,
}: {
  rewards: RewardLedgerRow[];
  emailById: Map<string, string | null>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<"approve" | "mark-paid" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runAction(action: "approve" | "mark-paid") {
    if (selected.size === 0) return;
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rewards/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Action failed.");
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="md"
          disabled={selected.size === 0 || loading !== null}
          onClick={() => runAction("approve")}
        >
          {loading === "approve" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Approve selected ({selected.size})
        </Button>
        <Button
          variant="secondary"
          size="md"
          disabled={selected.size === 0 || loading !== null}
          onClick={() => runAction("mark-paid")}
        >
          {loading === "mark-paid" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Mark paid ({selected.size})
        </Button>
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium" />
              <th className="px-2 py-3 font-medium">Member</th>
              <th className="px-2 py-3 font-medium">Type</th>
              <th className="px-2 py-3 font-medium">Amount</th>
              <th className="px-2 py-3 font-medium">Period</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium">Recorded</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id} className="border-b border-border-subtle text-sm last:border-0">
                <td className="px-2 py-3">
                  {(r.status === "pending" || r.status === "approved") && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select reward ${r.id}`}
                    />
                  )}
                </td>
                <td className="px-2 py-3 text-muted">
                  {r.user_id ? (emailById.get(r.user_id) ?? r.user_id.slice(0, 8)) : "House"}
                </td>
                <td className="px-2 py-3 capitalize text-foreground">{r.allocation_type}</td>
                <td className="px-2 py-3 font-medium tabular-nums text-foreground">{fmtUsd(r.amount)}</td>
                <td className="px-2 py-3 text-muted">{r.period ?? "—"}</td>
                <td className="px-2 py-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusColor[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-2 py-3 text-muted">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
            {rewards.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-8 text-center text-sm text-muted">
                  No reward ledger entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
