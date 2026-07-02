import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSignal } from "@/lib/nvidia";
import type { MarketKind } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MARKETS: MarketKind[] = ["crypto", "forex", "commodity"];

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const pair = String(body.pair ?? "").trim().slice(0, 40).toUpperCase();
  if (!pair) {
    return NextResponse.json({ error: "A trading pair is required." }, { status: 400 });
  }
  const market = MARKETS.includes(body.market as MarketKind) ? (body.market as MarketKind) : null;
  const timeframe = String(body.timeframe ?? "4H").trim().slice(0, 12) || "4H";
  const notes = String(body.notes ?? "").slice(0, 500);

  // Enforce the plan's daily signal limit (null = unlimited). An expired paid
  // plan is treated as basic even before the cron downgrades it.
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id, plan_expires_at")
    .eq("id", user.id)
    .single();
  const expired =
    !!profile?.plan_expires_at && new Date(profile.plan_expires_at).getTime() < Date.now();
  const planId = !profile || expired ? "basic" : profile.plan_id;

  const { data: plan } = await supabase
    .from("plans")
    .select("signal_limit")
    .eq("id", planId)
    .single();
  const limit = plan?.signal_limit ?? null;

  if (limit !== null) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("signals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfDay.toISOString());

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: `You've reached your plan's daily limit of ${limit} signals. Upgrade for more.`,
          code: "limit_reached",
        },
        { status: 429 },
      );
    }
  }

  let generated;
  try {
    generated = await generateSignal({ pair, market, timeframe, notes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Signal generation failed." },
      { status: 502 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("signals")
    .insert({
      user_id: user.id,
      pair,
      market,
      timeframe,
      bias: generated.bias,
      entry: generated.entry,
      target: generated.target,
      stop: generated.stop,
      confidence: generated.confidence,
      technique: generated.technique,
      rationale: generated.rationale,
      status: "active",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ signal: inserted });
}
