import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTelegramWebhookSecret } from "@/lib/telegram";
import { handleTelegramCommand } from "@/lib/telegram-commands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { id: number; username?: string; first_name?: string };
  };
};

export async function POST(request: Request) {
  if (!verifyTelegramWebhookSecret(request)) {
    return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const text = message?.text?.trim();
  const from = message?.from;
  if (!message || !text || !from) {
    // Non-text updates (edited messages, reactions, etc.) — nothing to do.
    return NextResponse.json({ ok: true });
  }

  const [rawCommand, ...args] = text.split(/\s+/);
  const command = rawCommand.split("@")[0].toLowerCase();

  const admin = createAdminClient();
  let eventType = "command.unknown";
  let errorMessage: string | null = null;

  try {
    const result = await handleTelegramCommand(admin, from, command, args);
    eventType = result.eventType;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error.";
    eventType = "command.error";
  }

  const { data: link } = await admin
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_id", from.id)
    .maybeSingle();

  await admin.from("bot_events").insert({
    user_id: link?.user_id ?? null,
    event_type: eventType,
    payload: {
      telegram_id: from.id,
      telegram_username: from.username ?? null,
      command,
      args,
      error: errorMessage,
    },
  });

  // Always 200 — Telegram retries aggressively on non-2xx, which would
  // resend the same command repeatedly for a transient handler error.
  return NextResponse.json({ ok: true });
}
