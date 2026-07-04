import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkMentorAccess, isUnderMentorRateLimit, mentorBotTemplate } from "@/lib/mentor";

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

  const strategyDescription = String(body.strategyDescription ?? "").trim().slice(0, 1000);
  if (!strategyDescription) {
    return NextResponse.json({ error: "A strategy description is required." }, { status: 400 });
  }

  let result;
  try {
    result = await mentorBotTemplate({ strategyDescription });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mentor request failed." },
      { status: 502 },
    );
  }

  const admin = createAdminClient();
  await admin.from("ai_chat_sessions").insert({
    user_id: user.id,
    function: "bot_template",
    input: { strategyDescription },
    output: result.answer,
    token_usage: result.tokenUsage,
  });

  return NextResponse.json({ answer: result.answer });
}
