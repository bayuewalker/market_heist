import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getPointsBalance } from "@/lib/missions";

export const GENESIS_POINTS_THRESHOLD = 1500;
const CAMPAIGN_KEY = "genesis";

export type GenesisChecklist = {
  telegramLinked: boolean;
  profileCompleted: boolean;
  brokerUidSubmitted: boolean;
  brokerUidVerified: boolean;
  pointsThresholdMet: boolean;
  joinedCampaign: boolean;
};

export type GenesisStatus = {
  checklist: GenesisChecklist;
  isEligible: boolean;
  reservationId: string | null;
};

function generateReservationId(): string {
  return `GEN-${randomBytes(5).toString("hex").toUpperCase()}`;
}

/**
 * Pull-based sync (mirrors syncMissionCompletions from M8): checks the full
 * §12.7 checklist on each /dashboard/genesis page load and, the first time
 * it's fully satisfied, mints a sticky reservation_id. Never revokes
 * eligibility once earned — a "reservation" isn't meant to be lost to a
 * later balance dip (e.g. a manual admin points deduction).
 */
export async function syncGenesisEligibility(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<GenesisStatus> {
  const [{ data: profile }, { data: telegramLink }, { data: brokerAccounts }, pointsBalance, { data: existing }] =
    await Promise.all([
      admin.from("profiles").select("full_name, genesis_joined_at").eq("id", userId).single(),
      admin.from("telegram_links").select("id").eq("user_id", userId).maybeSingle(),
      admin.from("broker_accounts").select("status").eq("user_id", userId),
      getPointsBalance(admin, userId),
      admin
        .from("genesis_eligibility")
        .select("is_eligible, reservation_id")
        .eq("user_id", userId)
        .eq("campaign_key", CAMPAIGN_KEY)
        .maybeSingle(),
    ]);

  const checklist: GenesisChecklist = {
    telegramLinked: !!telegramLink,
    profileCompleted: !!profile?.full_name?.trim(),
    brokerUidSubmitted: (brokerAccounts ?? []).length > 0,
    brokerUidVerified: (brokerAccounts ?? []).some((b) => b.status === "verified"),
    pointsThresholdMet: pointsBalance >= GENESIS_POINTS_THRESHOLD,
    joinedCampaign: !!profile?.genesis_joined_at,
  };
  const isEligible = Object.values(checklist).every(Boolean);

  if (existing?.reservation_id) {
    return { checklist, isEligible: existing.is_eligible, reservationId: existing.reservation_id };
  }
  if (!isEligible) {
    return { checklist, isEligible: false, reservationId: null };
  }

  const reservationId = generateReservationId();
  const { data: inserted, error } = await admin
    .from("genesis_eligibility")
    .upsert(
      {
        user_id: userId,
        campaign_key: CAMPAIGN_KEY,
        is_eligible: true,
        reservation_id: reservationId,
        requirements_json: checklist,
        eligible_at: new Date().toISOString(),
      },
      { onConflict: "user_id,campaign_key" },
    )
    .select("reservation_id")
    .single();

  if (error || !inserted) {
    // Best-effort — if this write races or fails, report ineligible-for-a-
    // reservation this pass; the next page load retries.
    return { checklist, isEligible, reservationId: null };
  }

  return { checklist, isEligible: true, reservationId: inserted.reservation_id };
}
