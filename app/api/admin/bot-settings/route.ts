import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FIELD_LENGTH = 200;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "You must be logged in." }, { status: 401 }) } as const;

  const { data: requester } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (requester?.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) } as const;
  }
  return { userId: user.id } as const;
}

// The bot token is write-only by design: GET only ever reports whether one
// is configured, never the value itself, so it can't leak to an admin's
// browser after being set once.
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bot_settings")
    .select("telegram_bot_username, telegram_bot_token")
    .eq("id", true)
    .maybeSingle();

  return NextResponse.json({
    telegram_bot_username: data?.telegram_bot_username ?? null,
    has_token: !!data?.telegram_bot_token,
    env_fallback_configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: { telegram_bot_username?: string; telegram_bot_token?: string } = {};
  const changedFields: string[] = [];

  if (typeof body.telegram_bot_username === "string") {
    const username = body.telegram_bot_username.trim().replace(/^@/, "").slice(0, MAX_FIELD_LENGTH);
    if (username) {
      update.telegram_bot_username = username;
      changedFields.push("telegram_bot_username");
    }
  }
  if (typeof body.telegram_bot_token === "string") {
    const token = body.telegram_bot_token.trim().slice(0, MAX_FIELD_LENGTH);
    if (token) {
      update.telegram_bot_token = token;
      changedFields.push("telegram_bot_token");
    }
  }

  if (changedFields.length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("bot_settings").upsert({ id: true, ...update }, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log which fields changed, never the token value itself.
  await writeAuditLog(admin, {
    actorId: auth.userId,
    action: "bot_settings.update",
    targetType: "bot_settings",
    meta: { changed_fields: changedFields },
  });

  return NextResponse.json({ ok: true });
}
