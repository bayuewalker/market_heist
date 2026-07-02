import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tryConfirmPayment } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing order id." }, { status: 400 });

  // RLS ensures the user can only read their own order.
  const { data: payment } = await supabase.from("payments").select("*").eq("id", id).single();
  if (!payment) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const status = payment.status === "pending" ? await tryConfirmPayment(payment) : payment.status;

  return NextResponse.json({
    status,
    amount_usdt: payment.amount_usdt,
    address: payment.address,
    network: payment.network,
    period: payment.period,
    plan_id: payment.plan_id,
    expires_at: payment.expires_at,
  });
}
