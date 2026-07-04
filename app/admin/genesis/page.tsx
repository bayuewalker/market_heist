import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export default async function AdminGenesisPage() {
  const supabase = await createClient();

  const { data: eligible } = await supabase
    .from("genesis_eligibility")
    .select("user_id, reservation_id, eligible_at, exported_at")
    .eq("campaign_key", "genesis")
    .eq("is_eligible", true)
    .order("eligible_at", { ascending: false });

  const userIds = [...new Set((eligible ?? []).map((e) => e.user_id))];
  const { data: profiles } =
    userIds.length > 0 ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds) : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Genesis Pass eligibility</h1>
          <p className="text-sm text-muted">{eligible?.length ?? 0} member(s) eligible. Off-chain only — no NFT minting yet.</p>
        </div>
        <a
          href="/api/admin/genesis/export"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#06120d] transition-colors hover:bg-accent-strong"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </a>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium">Member</th>
              <th className="px-2 py-3 font-medium">Reservation ID</th>
              <th className="px-2 py-3 font-medium">Eligible since</th>
              <th className="px-2 py-3 font-medium">Last exported</th>
            </tr>
          </thead>
          <tbody>
            {(eligible ?? []).map((e) => (
              <tr key={e.user_id} className="border-b border-border-subtle text-sm last:border-0">
                <td className="px-2 py-3 text-muted">
                  {profileById.get(e.user_id)?.email ?? e.user_id.slice(0, 8)}
                </td>
                <td className="px-2 py-3 font-medium text-foreground">{e.reservation_id}</td>
                <td className="px-2 py-3 text-muted">{fmtDate(e.eligible_at)}</td>
                <td className="px-2 py-3 text-muted">{fmtDate(e.exported_at)}</td>
              </tr>
            ))}
            {(!eligible || eligible.length === 0) && (
              <tr>
                <td colSpan={4} className="px-2 py-8 text-center text-sm text-muted">
                  No eligible members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
