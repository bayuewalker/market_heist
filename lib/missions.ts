import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MissionRow } from "@/lib/supabase/types";

/**
 * Checks each active mission's completion condition for a user and marks any
 * newly-satisfied ones `completed` (sets completed_at). Pull-based — called
 * whenever the member's dashboard/missions page loads, rather than wired
 * into every mutation site (broker verify, signal create, etc.) across
 * already-shipped milestones. Idempotent: never downgrades an already
 * completed/claimed mission, and only ever inserts/updates rows for THIS
 * user, so concurrent calls can't double-complete anything.
 */
export async function syncMissionCompletions(admin: SupabaseClient<Database>, userId: string): Promise<void> {
  const { data: missions } = await admin.from("missions").select("*").eq("is_active", true);
  if (!missions || missions.length === 0) return;

  const { data: existing } = await admin.from("user_missions").select("mission_id, status").eq("user_id", userId);
  const statusByMission = new Map((existing ?? []).map((r) => [r.mission_id, r.status]));

  const toComplete: MissionRow[] = [];
  for (const mission of missions) {
    const status = statusByMission.get(mission.id);
    if (status === "completed" || status === "claimed") continue;
    if (await isMissionSatisfied(admin, userId, mission.trigger_type)) {
      toComplete.push(mission);
    }
  }
  if (toComplete.length === 0) return;

  const now = new Date().toISOString();
  await Promise.all(
    toComplete.map((mission) =>
      admin
        .from("user_missions")
        .upsert(
          { user_id: userId, mission_id: mission.id, status: "completed", completed_at: now },
          { onConflict: "user_id,mission_id" },
        ),
    ),
  );
}

async function isMissionSatisfied(admin: SupabaseClient<Database>, userId: string, triggerType: string): Promise<boolean> {
  switch (triggerType) {
    case "complete_profile": {
      const { data } = await admin.from("profiles").select("full_name").eq("id", userId).single();
      return !!data?.full_name?.trim();
    }
    case "join_telegram": {
      const { count } = await admin
        .from("telegram_links")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return (count ?? 0) > 0;
    }
    case "login_dashboard":
      // Reaching this check at all means the member is signed in and on a
      // dashboard page — always satisfied.
      return true;
    case "submit_broker_uid": {
      const { count } = await admin
        .from("broker_accounts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return (count ?? 0) > 0;
    }
    case "uid_verified": {
      const { count } = await admin
        .from("broker_accounts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "verified");
      return (count ?? 0) > 0;
    }
    case "read_first_signal": {
      const { count } = await admin
        .from("signals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return (count ?? 0) > 0;
    }
    case "complete_risk_profile": {
      const { data } = await admin.from("profiles").select("risk_profile").eq("id", userId).single();
      return !!data?.risk_profile;
    }
    case "refer_member":
      // Depends on referral attribution (captain_networks / referral_codes),
      // which ships in M11. Always unsatisfied until then.
      return false;
    default:
      return false;
  }
}

export type ClaimResult = { ok: true; pointsAwarded: number; balanceAfter: number } | { ok: false; error: string };

/**
 * Awards a completed-but-unclaimed mission's points. Rejects a mission that's
 * still pending (not completed) or already claimed — the unique
 * (user_id, mission_id) constraint plus the completed-status check make
 * double-claiming impossible even under concurrent requests, since the
 * conditional update only succeeds once.
 */
export async function claimMission(admin: SupabaseClient<Database>, userId: string, missionId: string): Promise<ClaimResult> {
  const { data: mission } = await admin.from("missions").select("*").eq("id", missionId).single();
  if (!mission) return { ok: false, error: "Unknown mission." };

  const { data: claimedRow, error: claimErr } = await admin
    .from("user_missions")
    .update({ status: "claimed", claimed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("mission_id", missionId)
    .eq("status", "completed")
    .select()
    .maybeSingle();

  if (claimErr) return { ok: false, error: claimErr.message };
  if (!claimedRow) return { ok: false, error: "This mission isn't ready to claim yet." };

  const currentBalance = await getPointsBalance(admin, userId);
  const balanceAfter = currentBalance + mission.points_reward;

  const { error: ledgerErr } = await admin.from("heist_points_ledger").insert({
    user_id: userId,
    source_type: "mission",
    source_id: mission.id,
    points_delta: mission.points_reward,
    balance_after: balanceAfter,
  });
  if (ledgerErr) return { ok: false, error: ledgerErr.message };

  return { ok: true, pointsAwarded: mission.points_reward, balanceAfter };
}

export async function getPointsBalance(admin: SupabaseClient<Database>, userId: string): Promise<number> {
  const { data } = await admin
    .from("heist_points_ledger")
    .select("balance_after")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.balance_after ?? 0;
}

export async function getRankForPoints(admin: SupabaseClient<Database>, points: number) {
  const { data: ranks } = await admin
    .from("heister_ranks")
    .select("*")
    .eq("active", true)
    .not("min_points", "is", null)
    .lte("min_points", points)
    .order("min_points", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ranks;
}
