import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculatePositionSize, checkMentorAccess, isUnderMentorRateLimit } from "@/lib/mentor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id, plan_expires_at, ai_consent_at")
    .eq("id", user.id)
    .single();

  const access = checkMentorAccess(profile);
  if (!access.ok) return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });

  if (!(await isUnderMentorRateLimit(supabase, user.id))) {
    return NextResponse.json({ error: "You're going too fast. Please wait a moment and try again." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const accountSize = toPositiveNumber(body.accountSize);
  const riskPct = toPositiveNumber(body.riskPct);
  const entry = toPositiveNumber(body.entry);
  const stop = toPositiveNumber(body.stop);
  const takeProfit = body.takeProfit !== undefined ? toPositiveNumber(body.takeProfit) : null;

  if (!accountSize || !riskPct || !entry || !stop) {
    return NextResponse.json({ error: "accountSize, riskPct, entry, and stop must all be positive numbers." }, { status: 400 });
  }
  if (riskPct > 100) {
    return NextResponse.json({ error: "riskPct can't exceed 100." }, { status: 400 });
  }
  if (entry === stop) {
    return NextResponse.json({ error: "Entry and stop can't be the same price." }, { status: 400 });
  }

  const result = calculatePositionSize({ accountSize, riskPct, entry, stop, takeProfit });

  const admin = createAdminClient();
  await admin.from("ai_chat_sessions").insert({
    user_id: user.id,
    function: "position_size",
    input: { accountSize, riskPct, entry, stop, takeProfit },
    output: result.note,
    token_usage: 0,
  });

  return NextResponse.json(result);
}
