import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkMentorAccess, isUnderMentorRateLimit, mentorTradeReview } from "@/lib/mentor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const journalEntryId = String(body.journalEntryId ?? "");
  if (!journalEntryId) return NextResponse.json({ error: "A journalEntryId is required." }, { status: 400 });

  // Requester's own client — RLS ("read own trade journals") means this
  // returns nothing if the entry belongs to someone else.
  const { data: trade } = await supabase
    .from("trade_journals")
    .select("pair, direction, entry, exit_price, outcome, followed_plan, notes")
    .eq("id", journalEntryId)
    .maybeSingle();
  if (!trade) return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });

  let result;
  try {
    result = await mentorTradeReview({
      pair: trade.pair,
      direction: trade.direction,
      entry: trade.entry,
      exitPrice: trade.exit_price,
      outcome: trade.outcome,
      followedPlan: trade.followed_plan,
      notes: trade.notes,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mentor request failed." },
      { status: 502 },
    );
  }

  const admin = createAdminClient();
  await admin.from("ai_chat_sessions").insert({
    user_id: user.id,
    function: "trade_review",
    input: { journalEntryId },
    output: result.answer,
    token_usage: result.tokenUsage,
  });

  return NextResponse.json({ answer: result.answer });
}
