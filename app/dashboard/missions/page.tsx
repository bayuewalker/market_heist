import { redirect } from "next/navigation";
import { CheckCircle2, Circle, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncMissionCompletions, getPointsBalance, getRankForPoints } from "@/lib/missions";
import MissionClaimButton from "@/components/dashboard/MissionClaimButton";
import RiskProfilePicker from "@/components/dashboard/RiskProfilePicker";
import type { UserMissionStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_META: Record<UserMissionStatus, { label: string; className: string }> = {
  pending: { label: "In progress", className: "border-border-subtle text-muted" },
  completed: { label: "Ready to claim", className: "border-accent/40 bg-accent/10 text-accent-strong" },
  claimed: { label: "Claimed", className: "border-accent/30 text-accent-strong" },
};

export default async function MissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  await syncMissionCompletions(admin, user.id);

  const [{ data: missions }, { data: userMissions }, points, { data: profile }] = await Promise.all([
    supabase.from("missions").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("user_missions").select("*").eq("user_id", user.id),
    getPointsBalance(admin, user.id),
    supabase.from("profiles").select("risk_profile").eq("id", user.id).single(),
  ]);
  const rank = await getRankForPoints(admin, points);

  const statusByMission = new Map((userMissions ?? []).map((m) => [m.mission_id, m.status as UserMissionStatus]));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Missions</h1>
        <p className="text-sm text-muted">
          Complete missions to earn Heist Points and climb the Heister Rank ladder.
        </p>
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">{points} HP</p>
          <p className="text-xs text-muted">{rank?.name ?? "Rookie Heister"}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {(missions ?? []).map((mission) => {
          const status = statusByMission.get(mission.id) ?? "pending";
          const meta = STATUS_META[status];
          const isRiskCalibration = mission.trigger_type === "complete_risk_profile" && status === "pending";

          return (
            <div key={mission.id} className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {status === "pending" ? (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-strong" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{mission.public_name}</p>
                    {mission.description && <p className="text-sm text-muted">{mission.description}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted">{mission.points_reward} HP</span>
                </div>
              </div>
              {status === "completed" && <MissionClaimButton missionId={mission.id} />}
              {isRiskCalibration && <RiskProfilePicker userId={user.id} current={profile?.risk_profile ?? null} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
