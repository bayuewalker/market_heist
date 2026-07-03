import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SIGNAL_LIMIT = 100;

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

const biasColor: Record<string, string> = {
  long: "text-accent-strong",
  short: "text-rose-300",
  neutral: "text-muted",
};

export default async function AdminSignalsPage() {
  const supabase = await createClient();

  const { data: signals } = await supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(SIGNAL_LIMIT);

  const userIds = [...new Set((signals ?? []).map((s) => s.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, email").in("id", userIds)
      : { data: [] };
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Signals</h1>
        <p className="text-sm text-muted">Most recent {signals?.length ?? 0} signals across all members.</p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium">Member</th>
              <th className="px-2 py-3 font-medium">Pair</th>
              <th className="px-2 py-3 font-medium">Bias</th>
              <th className="px-2 py-3 font-medium">Confidence</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(signals ?? []).map((s) => (
              <tr key={s.id} className="border-b border-border-subtle text-sm last:border-0">
                <td className="px-2 py-3 text-muted">{emailById.get(s.user_id) ?? s.user_id.slice(0, 8)}</td>
                <td className="px-2 py-3 font-medium text-foreground">{s.pair}</td>
                <td className={`px-2 py-3 font-medium capitalize ${biasColor[s.bias]}`}>{s.bias}</td>
                <td className="px-2 py-3 text-muted tabular-nums">
                  {s.confidence !== null ? `${Math.round(s.confidence * 100)}%` : "—"}
                </td>
                <td className="px-2 py-3 text-muted capitalize">{s.status}</td>
                <td className="px-2 py-3 text-muted">{fmtDate(s.created_at)}</td>
              </tr>
            ))}
            {(!signals || signals.length === 0) && (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-sm text-muted">
                  No signals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
