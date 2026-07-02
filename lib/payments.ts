import { createAdminClient } from "@/lib/supabase/admin";
import { fetchIncomingUsdt, amountMatches } from "@/lib/tron";
import { periodDays } from "@/lib/pricing";
import type { PaymentRow, PaymentStatus } from "@/lib/supabase/types";

const MS_PER_DAY = 86_400_000;

/**
 * Check a single pending payment against the chain and, if a matching USDT
 * transfer is found, confirm it and extend the member's plan. Idempotent and
 * safe to call repeatedly (guarded by status checks + a unique tx_hash).
 */
export async function tryConfirmPayment(payment: PaymentRow): Promise<PaymentStatus> {
  if (payment.status !== "pending") return payment.status;

  const admin = createAdminClient();

  // Expire stale orders.
  if (new Date(payment.expires_at).getTime() < Date.now()) {
    await admin.from("payments").update({ status: "expired" }).eq("id", payment.id).eq("status", "pending");
    return "expired";
  }

  let transfers;
  try {
    transfers = await fetchIncomingUsdt(payment.address, new Date(payment.created_at).getTime() - 60_000);
  } catch {
    return "pending"; // chain unreachable this tick — try again later
  }

  const match = transfers.find((t) => t.txId && amountMatches(t.amount, payment.amount_usdt));
  if (!match) return "pending";

  // Don't credit a tx that already settled another order.
  const { data: used } = await admin
    .from("payments")
    .select("id")
    .eq("tx_hash", match.txId)
    .maybeSingle();
  if (used && used.id !== payment.id) return "pending";

  const { error: confirmErr } = await admin
    .from("payments")
    .update({ status: "confirmed", tx_hash: match.txId, confirmed_at: new Date().toISOString() })
    .eq("id", payment.id)
    .eq("status", "pending");
  if (confirmErr) return "pending";

  // Extend membership from the later of now / current expiry.
  const { data: profile } = await admin
    .from("profiles")
    .select("plan_expires_at")
    .eq("id", payment.user_id)
    .single();
  const now = Date.now();
  const currentExpiry = profile?.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : 0;
  const base = Math.max(now, currentExpiry);
  const newExpiry = new Date(base + periodDays(payment.period) * MS_PER_DAY).toISOString();

  await admin
    .from("profiles")
    .update({ plan_id: payment.plan_id, plan_expires_at: newExpiry })
    .eq("id", payment.user_id);

  return "confirmed";
}
