import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RewardAllocationType } from "@/lib/supabase/types";

/**
 * Server-only reward configuration. Never expose these rates to the client —
 * they determine real payouts and are tuned by the founder, not derived from
 * anything a member can see.
 *
 * Member reward is a percentage of the member's OWN trading fee for the
 * period (blueprint §5 "Public Reward" tiers — midpoint of each band).
 * Donation/operation are a percentage of the BACKEND commission Market Heist
 * actually received for that row (blueprint §5 "Backend Pool Allocation").
 * These are two different bases and are not meant to sum to 100% of
 * anything — captain/leaderboard/campaign buckets are intentionally not
 * computed yet (no recipient system exists until M10), so a portion of the
 * backend pool is currently unallocated by design.
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
