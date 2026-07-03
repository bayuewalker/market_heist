import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RewardLedgerStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

const STATUS_LABEL: Record<RewardLedgerStatus, string> = {
  estimated: "Estimated",
  pending: "Pending review",
  approved: "Approved",
  paid: "Paid",
};

const statusColor: Record<RewardLedgerStatus, string> = {
  estimated: "border-border-subtle text-muted",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  approved: "border-accent/40 bg-accent/10 text-accent-strong",
  paid: "border-accent/40 bg-accent/10 text-accent-strong",
};

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rewards } = await supabase
    .from("reward_ledger")
    .select("*")
    .order("created_at", { ascending: false });

  const totals: Record<RewardLedgerStatus, number> = { estimated: 0, pending: 0, approved: 0, paid: 0 };
  for (const r of rewards ?? []) totals[r.status] += r.amount;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Rewards</h1>
        <p className="text-sm text-muted">
          Trading fee rewards earned through your verified broker account. Amounts vary by broker,
          plan, and confirmed trading activity.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        {(Object.keys(STATUS_LABEL) as RewardLedgerStatus[]).map((status) => (
          <div key={status} className="flex flex-col gap-1 rounded-2xl border border-border-subtle bg-surface p-5">
            <p className="text-xs text-muted">{STATUS_LABEL[status]}</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{fmtUsd(totals[status])}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium">Period</th>
              <th className="px-2 py-3 font-medium">Amount</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium">Recorded</th>
            </tr>
          </thead>
          <tbody>
            {(rewards ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border-subtle text-sm last:border-0">
                <td className="px-2 py-3 text-muted">{r.period ?? "—"}</td>
                <td className="px-2 py-3 font-semibold tabular-nums text-foreground">{fmtUsd(r.amount)}</td>
                <td className="px-2 py-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-2 py-3 text-muted">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
            {(!rewards || rewards.length === 0) && (
              <tr>
                <td colSpan={4} className="px-2 py-8 text-center text-sm text-muted">
                  No rewards recorded yet. Submit and verify a broker UID to become eligible.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Rewards are estimates until approved by the team and are not guaranteed. See the reward
        policy for eligibility and payment terms.
      </p>
    </div>
  );
}
