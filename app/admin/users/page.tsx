import { createClient } from "@/lib/supabase/server";
import AdminUserRow from "@/components/admin/AdminUserRow";

export const dynamic = "force-dynamic";

const USER_LIMIT = 200;

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profiles }, { data: plans }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(USER_LIMIT),
    supabase.from("plans").select("*").order("sort", { ascending: true }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted">
          {profiles?.length ?? 0} most recent members. Change a plan or toggle admin access below.
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium">Member</th>
              <th className="px-2 py-3 font-medium">Plan</th>
              <th className="px-2 py-3 font-medium">Expires</th>
              <th className="px-2 py-3 font-medium">Role</th>
              <th className="px-2 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile) => (
              <AdminUserRow
                key={profile.id}
                profile={profile}
                plans={plans ?? []}
                isSelf={profile.id === user?.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
