import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryConfirmPayment, downgradeExpiredMembers } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SWEEP_LIMIT = 500;

/**
 * Fallback sweeper (Vercel Cron). Confirms/expires pending orders that the
 * client poll may have missed and downgrades expired members. Fails closed:
 * requires CRON_SECRET to be set and presented (Vercel Cron sends it as a
 * Bearer token).
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 401 });
  }
  const auth = request.headers.get("authorization");
  const header = request.headers.get("x-cron-secret");
  if (auth !== `Bearer ${secret}` && header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("payments")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(SWEEP_LIMIT);

  let confirmed = 0;
  let expired = 0;
  for (const payment of pending ?? []) {
    const status = await tryConfirmPayment(payment);
    if (status === "confirmed") confirmed++;
    else if (status === "expired") expired++;
  }

  const downgraded = await downgradeExpiredMembers();

  return NextResponse.json({ checked: pending?.length ?? 0, confirmed, expired, downgraded });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
