import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LeaderboardBoard } from "@/lib/supabase/types";
import { computeJournalStats } from "@/lib/journal";

const BOARDS: LeaderboardBoard[] = ["volume", "reward", "discipline", "captain", "points"];

// Composite "Discipline" board score weights (§22): the blueprint's formula
// (40% volume / 25% active days / 20% journal / 10% reward / 5% community)
// doesn't map 1:1 onto any of the other 4 single-metric boards (Volume,
// Reward, Captain, Points each already have an obvious raw metric), so it's
// applied here as the Discipline board's blended engagement score — the one
// board meant to reward well-rounded activity rather than a single number.
const WEIGHT_VOLUME = 0.4;
const WEIGHT_ACTIVE_DAYS = 0.25;
const WEIGHT_JOURNAL = 0.2;
const WEIGHT_REWARD = 0.1;
const WEIGHT_COMMUNITY = 0.05;

// Scale constants normalize each raw metric into a 0-1 component before
// weighting — founder-tunable placeholders (there's no real usage data yet
// to derive them from at MVP launch).
const VOLUME_SCALE = 100_000; // USDT lifetime traded volume for a full 1.0 component
const REWARD_SCALE = 500; // USDT lifetime confirmed reward for a full 1.0 component
const COMMUNITY_SCALE = 2000; // Heist Points for a full 1.0 component
const ACTIVE_DAYS_SCALE = 30; // distinct journaled days for a full 1.0 component

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export type LeaderboardScore = { user_id: string; score: number; metrics: Record<string, unknown> };

/**
 * Computes all 5 leaderboard boards from source data (does not touch
 * leaderboard_entries). Volume/Reward/Captain are gated on a `verified`
 * broker UID (real trading data) — Discipline and Points are open to any
 * signed-in user's activity (§22).
 */
export async function computeLeaderboards(
  admin: SupabaseClient<Database>,
): Promise<Record<LeaderboardBoard, LeaderboardScore[]>> {
  const { data: verifiedBrokers } = await admin.from("broker_accounts").select("user_id").eq("status", "verified");
  const verifiedUserIds = new Set((verifiedBrokers ?? []).map((b) => b.user_id));

  const { data: commissionRows } = await admin
    .from("commission_rows")
    .select("matched_user_id, volume")
    .not("matched_user_id", "is", null);
  const volumeByUser = new Map<string, number>();
  for (const row of commissionRows ?? []) {
    if (!row.matched_user_id || !verifiedUserIds.has(row.matched_user_id)) continue;
    volumeByUser.set(row.matched_user_id, (volumeByUser.get(row.matched_user_id) ?? 0) + Number(row.volume ?? 0));
  }

  const { data: rewardRows } = await admin
    .from("reward_ledger")
    .select("user_id, amount")
    .eq("allocation_type", "member")
    .in("status", ["approved", "paid"]);
  const rewardByUser = new Map<string, number>();
  for (const row of rewardRows ?? []) {
    if (!row.user_id || !verifiedUserIds.has(row.user_id)) continue;
    rewardByUser.set(row.user_id, (rewardByUser.get(row.user_id) ?? 0) + Number(row.amount));
  }

  const { data: journalRows } = await admin.from("trade_journals").select("user_id, followed_plan, traded_at");
  const journalByUser = new Map<string, { followed_plan: boolean; traded_at: string }[]>();
  for (const row of journalRows ?? []) {
    const list = journalByUser.get(row.user_id) ?? [];
    list.push({ followed_plan: row.followed_plan, traded_at: row.traded_at });
    journalByUser.set(row.user_id, list);
  }

  // Full-table scan, newest-first, first-seen-per-user wins — acceptable at
  // MVP scale; revisit with a windowed/materialized query if the ledger
  // grows large enough for this to matter.
  const { data: pointsRows } = await admin
    .from("heist_points_ledger")
    .select("user_id, balance_after, created_at")
    .order("created_at", { ascending: false });
  const pointsByUser = new Map<string, number>();
  for (const row of pointsRows ?? []) {
    if (!pointsByUser.has(row.user_id)) pointsByUser.set(row.user_id, Number(row.balance_after));
  }

  // Captain Leaderboard ranks verified referred users (§23) — same
  // verifiedUserIds gate as Volume/Reward, applied to the referred MEMBER,
  // not the captain themselves.
  const { data: captainRows } = await admin.from("captain_networks").select("captain_id, member_id");
  const captainCounts = new Map<string, number>();
  for (const row of captainRows ?? []) {
    if (!verifiedUserIds.has(row.member_id)) continue;
    captainCounts.set(row.captain_id, (captainCounts.get(row.captain_id) ?? 0) + 1);
  }

  const activeDaysByUser = new Map<string, number>();
  const disciplineByUser = new Map<string, number>();
  for (const [userId, trades] of journalByUser) {
    const stats = computeJournalStats(trades);
    disciplineByUser.set(userId, stats.disciplineScore ?? 0);
    activeDaysByUser.set(userId, new Set(trades.map((t) => t.traded_at.slice(0, 10))).size);
  }

  const allUserIds = new Set<string>([
    ...volumeByUser.keys(),
    ...rewardByUser.keys(),
    ...journalByUser.keys(),
    ...pointsByUser.keys(),
  ]);

  const volume: LeaderboardScore[] = [...volumeByUser].map(([user_id, score]) => ({
    user_id,
    score,
    metrics: { volume: score },
  }));
  const reward: LeaderboardScore[] = [...rewardByUser].map(([user_id, score]) => ({
    user_id,
    score,
    metrics: { reward: score },
  }));
  const points: LeaderboardScore[] = [...pointsByUser].map(([user_id, score]) => ({
    user_id,
    score,
    metrics: { points: score },
  }));
  const captain: LeaderboardScore[] = [...captainCounts]
    .filter(([user_id]) => verifiedUserIds.has(user_id))
    .map(([user_id, count]) => ({ user_id, score: count, metrics: { referred_count: count } }));

  const discipline: LeaderboardScore[] = [...allUserIds]
    .map((user_id) => {
      const volumeComponent = clamp01((volumeByUser.get(user_id) ?? 0) / VOLUME_SCALE);
      const activeDaysComponent = clamp01((activeDaysByUser.get(user_id) ?? 0) / ACTIVE_DAYS_SCALE);
      const journalComponent = clamp01((disciplineByUser.get(user_id) ?? 0) / 100);
      const rewardComponent = clamp01((rewardByUser.get(user_id) ?? 0) / REWARD_SCALE);
      const communityComponent = clamp01((pointsByUser.get(user_id) ?? 0) / COMMUNITY_SCALE);
      const score =
        volumeComponent * WEIGHT_VOLUME +
        activeDaysComponent * WEIGHT_ACTIVE_DAYS +
        journalComponent * WEIGHT_JOURNAL +
        rewardComponent * WEIGHT_REWARD +
        communityComponent * WEIGHT_COMMUNITY;
      return {
        user_id,
        score: Math.round(score * 1000) / 1000,
        metrics: { volumeComponent, activeDaysComponent, journalComponent, rewardComponent, communityComponent },
      };
    })
    .filter((d) => d.score > 0);

  return { volume, reward, discipline, captain, points };
}

/**
 * Recomputes every board and replaces leaderboard_entries' 'all_time'
 * snapshot. Meant to run periodically (Vercel Cron) — see
 * POST /api/leaderboard/recompute.
 */
export async function recomputeAndStoreLeaderboards(
  admin: SupabaseClient<Database>,
): Promise<Record<LeaderboardBoard, number>> {
  const boards = await computeLeaderboards(admin);
  const counts: Record<LeaderboardBoard, number> = { volume: 0, reward: 0, discipline: 0, captain: 0, points: 0 };
  const computedAt = new Date().toISOString();

  for (const board of BOARDS) {
    const entries = [...boards[board]].sort((a, b) => b.score - a.score);
    const rows = entries.map((e, i) => ({
      board,
      period: "all_time",
      user_id: e.user_id,
      score: e.score,
      rank: i + 1,
      metrics: e.metrics,
      computed_at: computedAt,
    }));
    const freshUserIds = new Set(rows.map((r) => r.user_id));

    // Write the fresh snapshot first — if a later step in this loop throws,
    // the board still has this run's data rather than sitting empty.
    if (rows.length > 0) {
      const { error: upsertError } = await admin
        .from("leaderboard_entries")
        .upsert(rows, { onConflict: "board,period,user_id" });
      if (upsertError) throw new Error(`Failed to upsert ${board} leaderboard: ${upsertError.message}`);
    }

    // Then clear rows for users who dropped out of this board entirely
    // (e.g. zero volume this run) — done after the fresh write, never before.
    const { data: existingRows, error: existingError } = await admin
      .from("leaderboard_entries")
      .select("user_id")
      .eq("board", board)
      .eq("period", "all_time");
    if (existingError) throw new Error(`Failed to read existing ${board} leaderboard rows: ${existingError.message}`);

    const staleUserIds = (existingRows ?? []).map((r) => r.user_id).filter((id) => !freshUserIds.has(id));
    if (staleUserIds.length > 0) {
      const { error: deleteError } = await admin
        .from("leaderboard_entries")
        .delete()
        .eq("board", board)
        .eq("period", "all_time")
        .in("user_id", staleUserIds);
      if (deleteError) throw new Error(`Failed to clear stale ${board} leaderboard rows: ${deleteError.message}`);
    }

    counts[board] = rows.length;
  }

  return counts;
}
