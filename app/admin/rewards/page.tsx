import { createClient } from "@/lib/supabase/server";
import AdminRewardsTable from "@/components/admin/AdminRewardsTable";

export const dynamic = "force-dynamic";

const REWARD_LIMIT = 200;

export default async function AdminRewardsPage() {
  const supabase = await createClient();

  const { data: rewards } = await supabase
    .from("reward_ledger")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(REWARD_LIMIT);

  const userIds = [...new Set((rewards ?? []).map((r) => r.user_id).filter((id): id is string => id !== null))];
  const { data: profiles } =
    userIds.length > 0 ? await supabase.from("profiles").select("id, email").in("id", userIds) : { data: [] };
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Rewards</h1>
        <p className="text-sm text-muted">
          {rewards?.length ?? 0} most recent reward ledger entries. Select rows to approve or mark paid.
        </p>
      </header>

      <AdminRewardsTable rewards={rewards ?? []} emailById={emailById} />
    </div>
  );
}
