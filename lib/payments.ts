import { createAdminClient } from "@/lib/supabase/admin";
import { fetchIncomingUsdt, amountMatches } from "@/lib/tron";
import { periodDays } from "@/lib/pricing";
import type { PaymentRow, PaymentStatus } from "@/lib/supabase/types";

const MS_PER_DAY = 86_400_000;
// Allow a payment to confirm a bit after the window closes (block/confirmation lag).
const CONFIRM_GRACE_MS = 20 * 60_000;

/**
 * Check a single pending payment against the chain and, if a matching USDT
 * transfer is found within the order's time window, confirm it and extend the
 * member's plan. Idempotent and safe to call repeatedly.
 *
 * `throttleMs` skips the on-chain lookup if the order was checked more recently
 * than that (used to bound cost on client-driven polling; the cron passes 0).
 */
export async function tryConfirmPayment(
  payment: PaymentRow,
  opts: { throttleMs?: number } = {},
): Promise<PaymentStatus> {
  if (payment.status !== "pending") return payment.status;

  const admin = createAdminClient();
  const nowMs = Date.now();
  const createdMs = new Date(payment.created_at).getTime();
  const expiresMs = new Date(payment.expires_at).getTime();

  // Expire stale orders.
  if (expiresMs < nowMs) {
    await admin.from("payments").update({ status: "expired" }).eq("id", payment.id).eq("status", "pending");
    return "expired";
  }

  // Throttle client-driven on-chain checks.
  if (
    opts.throttleMs &&
    payment.last_checked_at &&
    nowMs - new Date(payment.last_checked_at).getTime() < opts.throttleMs
  ) {
    return "pending";
  }
  await admin.from("payments").update({ last_checked_at: new Date().toISOString() }).eq("id", payment.id);

  let transfers;
  try {
    transfers = await fetchIncomingUsdt(payment.address, createdMs);
  } catch {
    return "pending"; // chain unreachable this tick — try again later
  }

  // Match by exact amount AND within this order's window, so a late payment for
  // an expired order can't be credited to a newer order that reused the amount.
  const match = transfers.find(
    (t) =>
      t.txId &&
      amountMatches(t.amount, payment.amount_usdt) &&
      t.timestampMs >= createdMs &&
      t.timestampMs <= expiresMs + CONFIRM_GRACE_MS,
  );
  if (!match) return "pending";

  // Don't credit a tx that already settled another order.
  const { data: used } = await admin.from("payments").select("id").eq("tx_hash", match.txId).maybeSingle();
  if (used && used.id !== payment.id) return "pending";

  const { error: confirmErr } = await admin
    .from("payments")
    .update({ status: "confirmed", tx_hash: match.txId, confirmed_at: new Date().toISOString() })
    .eq("id", payment.id)
    .eq("status", "pending");
  if (confirmErr) return "pending";

  // Extend membership from the later of now / current expiry. If granting access
  // fails, revert the order to pending so the next poll/cron retries (the tx is
  // pinned to this order via tx_hash, so it won't be double-credited).
  const { data: profile, error: readErr } = await admin
    .from("profiles")
    .select("plan_expires_at")
    .eq("id", payment.user_id)
    .single();
  if (readErr) {
    await admin.from("payments").update({ status: "pending" }).eq("id", payment.id).eq("status", "confirmed");
    return "pending";
  }

  const currentExpiry = profile?.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : 0;
  const base = Math.max(nowMs, currentExpiry);
  const newExpiry = new Date(base + periodDays(payment.period) * MS_PER_DAY).toISOString();

  const { error: updErr } = await admin
    .from("profiles")
    .update({ plan_id: payment.plan_id, plan_expires_at: newExpiry })
    .eq("id", payment.user_id);
  if (updErr) {
    await admin.from("payments").update({ status: "pending" }).eq("id", payment.id).eq("status", "confirmed");
    return "pending";
  }

  return "confirmed";
}

/**
 * Downgrade members whose paid plan has expired back to the free tier. Called
 * from the cron sweep. Returns the number downgraded.
 */
export async function downgradeExpiredMembers(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .update({ plan_id: "basic", plan_expires_at: null })
    .lt("plan_expires_at", new Date().toISOString())
    .neq("plan_id", "basic")
    .select("id");
  return data?.length ?? 0;
}
