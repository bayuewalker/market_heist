import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type CaptainTier = "Scout" | "Captain" | "Commander" | "Elite Captain";

// Tiers, thresholds, and reward rates are exact per issue #24's acceptance
// criteria (§23) — not founder-tunable placeholders like the leaderboard's
// scale constants. Below Scout's 5-referral threshold there's no tier yet
// and no captain reward accrues; Captain Code V1 (§11.2 #17) is otherwise
// intentionally lightweight, with the fuller verification-gated Captain
// Dashboard deferred to V2 (§17.2).
const TIERS: { name: CaptainTier; minReferred: number; rewardRate: number }[] = [
  { name: "Elite Captain", minReferred: 250, rewardRate: 0.1 },
  { name: "Commander", minReferred: 100, rewardRate: 0.06 },
  { name: "Captain", minReferred: 25, rewardRate: 0.04 },
  { name: "Scout", minReferred: 5, rewardRate: 0.02 },
];

export function getCaptainTier(referredCount: number): { name: CaptainTier; rewardRate: number } | null {
  return TIERS.find((t) => referredCount >= t.minReferred) ?? null;
}

/** 8 hex chars — short enough to type/share, ~4.3 billion possible codes. */
export function generateReferralCode(): string {
  return randomBytes(4).toString("hex");
}

const MAX_CODE_ATTEMPTS = 5;

/**
 * Get-or-create a captain's referral code (idempotent). Callers are
 * responsible for checking the caller is actually a captain first — this
 * function itself doesn't gate on role, since it's also called server-side
 * right after an admin promotes someone to captain (before any request
 * context exists to check against).
 */
export async function getOrCreateReferralCode(
  admin: SupabaseClient<Database>,
  captainId: string,
): Promise<{ code: string } | { error: string }> {
  const { data: existing } = await admin
    .from("referral_codes")
    .select("code")
    .eq("captain_id", captainId)
    .maybeSingle();
  if (existing) return { code: existing.code };

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateReferralCode();
    const { error: insertError } = await admin
      .from("referral_codes")
      .insert({ code: candidate, captain_id: captainId });
    if (!insertError) return { code: candidate };
    // 23505 = unique_violation (Postgres error code) — a genuine code
    // collision, retry with a new candidate. Anything else is a real failure.
    if (insertError.code !== "23505") return { error: insertError.message };
  }
  return { error: "Could not generate a unique code. Please try again." };
}
