import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RewardAllocationType } from "@/lib/supabase/types";

/**
 * Server-only reward configuration. Never expose these rates to the client —
 * they determine real payouts and are tuned by the founder, not derived from
 * anything a member can see.
 *
 * Member reward is a percentage of the member's OWN trading fee for the
 * period (blueprint §5 "Public Reward" tiers — midpoint of each band).
 * Donation/operation/captain are a percentage of the BACKEND commission
 * Market Heist actually received for that row (blueprint §5 "Backend Pool
 * Allocation"). These are two different bases and are not meant to sum to
 * 100% of anything.
 *
 * Captain reward (M11) is one-level and never proportional to the referred
 * member's own reward — a thank-you for growing the community, not a
 * downstream override (§23: not MLM, not passive income, not an investment
 * return). The rate scales by the captain's tier (lib/captain.ts's Scout
 * 2% -> Elite Captain 10%, per issue #24's acceptance criteria) rather than
 * a single flat rate. Leaderboard/campaign buckets remain unallocated: a
 * leaderboard payout is a periodic, admin-triggered action (no per-row
 * trigger point exists yet), and campaign has no recipient system until the
 * V2 Campaign Engine.
 */
const MEMBER_FEE_REWARD_RATE: Record<string, number> = {
  basic: 0.015, // 0–3% band, §5
  pro: 0.045, // 3–6% band
  elite: 0.08, // 6–10% band
};
const DEFAULT_MEMBER_FEE_REWARD_RATE = MEMBER_FEE_REWARD_RATE.basic;

const DONATION_RATE_OF_BACKEND_COMMISSION = 0.1;
const OPERATION_RATE_OF_BACKEND_COMMISSION = 0.15;

export type RewardAllocationInput = {
  matchedUserId: string | null;
  matchedPlanId: string | null;
  fees: number | null;
  backendCommission: number;
  /** The captain who referred matchedUserId, if any (resolved by the caller from captain_networks). */
  captainId?: string | null;
  /** The captain's current tier reward rate (resolved by the caller from lib/captain.ts's getCaptainTier) — null/0 if below Scout, so no captain allocation is added. */
  captainRewardRate?: number | null;
};

export type RewardAllocation = {
  user_id: string | null;
  allocation_type: RewardAllocationType;
  amount: number;
};

/**
 * Split one matched commission row into reward_ledger allocations. Amounts
 * are rounded to 6 decimal places (matches the numeric(18,6) columns).
 */
export function computeRewardAllocations(input: RewardAllocationInput): RewardAllocation[] {
  const allocations: RewardAllocation[] = [];
  const round = (n: number) => Math.round(n * 1e6) / 1e6;

  if (input.matchedUserId && input.fees) {
    const rate = MEMBER_FEE_REWARD_RATE[input.matchedPlanId ?? ""] ?? DEFAULT_MEMBER_FEE_REWARD_RATE;
    const amount = round(input.fees * rate);
    if (amount > 0) {
      allocations.push({ user_id: input.matchedUserId, allocation_type: "member", amount });
    }
  }

  const donation = round(input.backendCommission * DONATION_RATE_OF_BACKEND_COMMISSION);
  if (donation > 0) allocations.push({ user_id: null, allocation_type: "donation", amount: donation });

  const operation = round(input.backendCommission * OPERATION_RATE_OF_BACKEND_COMMISSION);
  if (operation > 0) allocations.push({ user_id: null, allocation_type: "operation", amount: operation });

  if (input.captainId && input.captainRewardRate) {
    const captainAmount = round(input.backendCommission * input.captainRewardRate);
    if (captainAmount > 0) {
      allocations.push({ user_id: input.captainId, allocation_type: "captain", amount: captainAmount });
    }
  }

  return allocations;
}

/**
 * Best-effort audit log write. Never throws — a logging failure must not
 * roll back or block the admin action it's describing.
 */
export async function writeAuditLog(
  admin: SupabaseClient<Database>,
  entry: { actorId: string; action: string; targetType: string; targetId?: string; meta?: Record<string, unknown> },
) {
  try {
    await admin.from("audit_logs").insert({
      actor_id: entry.actorId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      meta: entry.meta ?? {},
    });
  } catch {
    // Swallow — audit logging is best-effort, not a transactional guarantee.
  }
}
