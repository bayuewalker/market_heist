import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { botDeepLink } from "@/lib/telegram";
import { getTelegramBotConfig } from "@/lib/telegram-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MS = 15 * 60_000;

// /start <code> is a public entry point, so the code must not be guessable
// within its TTL — 16 bytes (128 bits) of CSPRNG output, hex-encoded.
function randomCode(): string {
  return randomBytes(16).toString("hex");
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const admin = createAdminClient();
  const { botUsername } = await getTelegramBotConfig(admin);
  if (!botUsername) {
    return NextResponse.json({ error: "Telegram isn't configured yet." }, { status: 503 });
  }

  const { data: existingLink } = await admin
    .from("telegram_links")
    .select("telegram_username")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingLink) {
    return NextResponse.json({ already_linked: true, telegram_username: existingLink.telegram_username });
  }

  // Reuse a still-valid unconsumed code instead of spawning a new one.
  const { data: existingCode } = await admin
    .from("telegram_link_codes")
    .select("code, expires_at")
    .eq("user_id", user.id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const code = existingCode?.code ?? randomCode();
  if (!existingCode) {
    const { error } = await admin.from("telegram_link_codes").insert({
      user_id: user.id,
      code,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code, deep_link: await botDeepLink(admin, code) });
}
