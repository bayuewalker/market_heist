import { createClient } from "@/lib/supabase/server";
import AdminBrokerAccountRow from "@/components/admin/AdminBrokerAccountRow";

export const dynamic = "force-dynamic";

const ACCOUNT_LIMIT = 200;

export default async function AdminBrokerAccountsPage() {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("broker_accounts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(ACCOUNT_LIMIT);

  const userIds = [...new Set((accounts ?? []).map((a) => a.user_id))];
  const [{ data: profiles }, { data: brokers }] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, email").in("id", userIds)
      : Promise.resolve({ data: [] }),
    supabase.from("brokers").select("id, name"),
  ]);
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const nameByBroker = new Map((brokers ?? []).map((b) => [b.id, b.name]));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Broker accounts</h1>
        <p className="text-sm text-muted">
          {accounts?.length ?? 0} most recent UID submissions. Verify, reject, or flag duplicates below.
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium">Member</th>
              <th className="px-2 py-3 font-medium">Broker</th>
              <th className="px-2 py-3 font-medium">UID</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium">Note</th>
              <th className="px-2 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {(accounts ?? []).map((account) => (
              <AdminBrokerAccountRow
                key={account.id}
                account={account}
                brokerName={nameByBroker.get(account.broker_id) ?? account.broker_id}
                memberEmail={emailById.get(account.user_id) ?? account.user_id.slice(0, 8)}
              />
            ))}
            {(!accounts || accounts.length === 0) && (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-sm text-muted">
                  No broker accounts submitted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
