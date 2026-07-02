import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryConfirmPayment } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fallback sweeper (Vercel Cron). Confirms/expires pending orders that the
 * client poll may have missed. Protected by CRON_SECRET when set; Vercel Cron
 * sends it as a Bearer token.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const header = request.headers.get("x-cron-secret");
    if (auth !== `Bearer ${secret}` && header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("payments")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);

  let confirmed = 0;
  let expired = 0;
  for (const payment of pending ?? []) {
    const status = await tryConfirmPayment(payment);
    if (status === "confirmed") confirmed++;
    else if (status === "expired") expired++;
  }

  return NextResponse.json({ checked: pending?.length ?? 0, confirmed, expired });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
