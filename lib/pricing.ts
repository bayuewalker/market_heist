import type { PaymentPeriod } from "@/lib/supabase/types";

export const ANNUAL_DISCOUNT = 0.2; // 20% off annual
export const ORDER_TTL_MINUTES = 30;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * USD (== USDT, stablecoin) amount for a plan + billing period.
 * Annual = 12 months with the annual discount applied.
 */
export function planAmountUsd(priceMonthly: number, period: PaymentPeriod): number {
  if (period === "annual") return round2(priceMonthly * 12 * (1 - ANNUAL_DISCOUNT));
  return round2(priceMonthly);
}

/**
 * Days a period grants, used to extend membership expiry.
 */
export function periodDays(period: PaymentPeriod): number {
  return period === "annual" ? 365 : 30;
}

/**
 * Build a unique payable amount by adding a small cents offset that does not
 * collide with the currently-pending amounts for the same wallet. Lets us match
 * an incoming transfer to a specific order by its exact amount.
 */
export function uniqueAmount(base: number, takenAmounts: number[]): number {
  const taken = new Set(takenAmounts.map((a) => round2(a)));
  for (let cents = 1; cents <= 99; cents++) {
    const candidate = round2(base + cents / 100);
    if (!taken.has(candidate)) return candidate;
  }
  // Fallback (extremely unlikely with <99 concurrent pending orders).
  return round2(base + (taken.size + 1) / 100);
}
