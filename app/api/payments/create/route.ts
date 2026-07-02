import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planAmountUsd, uniqueAmount, ORDER_TTL_MINUTES } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NETWORK = "tron-trc20";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const address = process.env.PAYMENT_TRON_ADDRESS;
  if (!address) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const planId = String(body.plan_id ?? "");
  const period = body.period;
  if (period !== "monthly" && period !== "annual") {
    return NextResponse.json({ error: "Invalid billing period." }, { status: 400 });
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("id, name, price_monthly")
    .eq("id", planId)
    .single();

  if (!plan || plan.price_monthly === null || plan.price_monthly <= 0) {
    return NextResponse.json({ error: "This plan is not purchasable." }, { status: 400 });
  }

  const base = planAmountUsd(plan.price_monthly, period);

  const admin = createAdminClient();

  // Avoid amount collisions with other live pending orders on the same wallet.
  const { data: pending } = await admin
    .from("payments")
    .select("amount_usdt")
    .eq("address", address)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());
  const amount = uniqueAmount(base, (pending ?? []).map((p) => p.amount_usdt));

  const expiresAt = new Date(Date.now() + ORDER_TTL_MINUTES * 60_000).toISOString();

  const { data: order, error } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      period,
      amount_usdt: amount,
      address,
      network: NETWORK,
      status: "pending",
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !order) {
    return NextResponse.json({ error: error?.message ?? "Could not create order." }, { status: 500 });
  }

  return NextResponse.json({
    payment_id: order.id,
    address: order.address,
    amount_usdt: order.amount_usdt,
    network: order.network,
    period: order.period,
    plan_id: order.plan_id,
    plan_name: plan.name,
    expires_at: order.expires_at,
  });
}
