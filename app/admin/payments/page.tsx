import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAYMENT_LIMIT = 100;

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

const statusColor: Record<string, string> = {
  confirmed: "border-accent/40 bg-accent/10 text-accent-strong",
  pending: "border-border-subtle text-muted",
  expired: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAYMENT_LIMIT);

  const userIds = [...new Set((payments ?? []).map((p) => p.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, email").in("id", userIds)
      : { data: [] };
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  const confirmedTotal = (payments ?? [])
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + Number(p.amount_usdt), 0);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted">Most recent {payments?.length ?? 0} orders.</p>
        </div>
        <p className="text-sm text-muted">
          Confirmed (this page): <span className="font-semibold text-accent-strong">${confirmedTotal.toFixed(2)}</span>
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium">Member</th>
              <th className="px-2 py-3 font-medium">Plan</th>
              <th className="px-2 py-3 font-medium">Amount</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium">Tx hash</th>
              <th className="px-2 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p) => (
              <tr key={p.id} className="border-b border-border-subtle text-sm last:border-0">
                <td className="px-2 py-3 text-muted">{emailById.get(p.user_id) ?? p.user_id.slice(0, 8)}</td>
                <td className="px-2 py-3 font-medium capitalize text-foreground">
                  {p.plan_id} · {p.period}
                </td>
                <td className="px-2 py-3 tabular-nums text-foreground">${Number(p.amount_usdt).toFixed(2)}</td>
                <td className="px-2 py-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusColor[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="max-w-[160px] truncate px-2 py-3 font-mono text-xs text-muted" title={p.tx_hash ?? undefined}>
                  {p.tx_hash ?? "—"}
                </td>
                <td className="px-2 py-3 text-muted">{fmtDate(p.created_at)}</td>
              </tr>
            ))}
            {(!payments || payments.length === 0) && (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-sm text-muted">
                  No payment orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
