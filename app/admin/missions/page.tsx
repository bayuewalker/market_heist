import { createClient } from "@/lib/supabase/server";
import AdminMissionRow from "@/components/admin/AdminMissionRow";
import CreateMissionForm from "@/components/admin/CreateMissionForm";
import PointsAdjustForm from "@/components/admin/PointsAdjustForm";

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  const supabase = await createClient();

  const { data: missions } = await supabase.from("missions").select("*").order("sort_order", { ascending: true });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Missions</h1>
        <p className="text-sm text-muted">Edit point values, enable/disable missions, and adjust points manually.</p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium">Mission</th>
              <th className="px-2 py-3 font-medium">Trigger</th>
              <th className="px-2 py-3 font-medium">Points</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(missions ?? []).map((mission) => (
              <AdminMissionRow key={mission.id} mission={mission} />
            ))}
          </tbody>
        </table>
      </div>

      <CreateMissionForm />
      <PointsAdjustForm />
    </div>
  );
}
