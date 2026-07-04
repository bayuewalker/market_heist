/**
 * Minimal Telegram Bot API client — just what the webhook handler needs
 * (send messages with inline keyboard buttons, verify the webhook secret).
 * No SDK dependency; Telegram's HTTP API is simple enough to call directly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type InlineButton = { text: string; url: string };

/**
 * Escapes Telegram's three HTML-mode reserved characters
 * (https://core.telegram.org/bots/api#html-style) in dynamic content before
 * it's interpolated into a `parse_mode: "HTML"` message. Without this, a
 * value containing `<`, `>`, or `&` (a signal rationale, a display name, a
 * persona tagline) can break message formatting or inject unintended tags.
 */
export function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function apiBase() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  return `https://api.telegram.org/bot${token}`;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  opts: { buttons?: InlineButton[][] } = {},
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (opts.buttons && opts.buttons.length > 0) {
    body.reply_markup = { inline_keyboard: opts.buttons.map((row) => row.map((b) => ({ text: b.text, url: b.url }))) };
  }

  const res = await fetch(`${apiBase()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed (${res.status}): ${detail}`);
  }
}

/**
 * Validates the `X-Telegram-Bot-Api-Secret-Token` header Telegram attaches to
 * every webhook request when the webhook was registered with a secret_token
 * (https://core.telegram.org/bots/api#setwebhook). This is the standard way
 * to confirm a webhook POST actually came from Telegram, since Telegram does
 * not sign requests with an HMAC the way some other providers do.
 */
export function verifyTelegramWebhookSecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  return provided === expected;
}

export function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://market-heist.vercel.app";
  return `${base}${path}`;
}

export function botDeepLink(code: string): string {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) throw new Error("TELEGRAM_BOT_USERNAME is not configured.");
  return `https://t.me/${username}?start=${encodeURIComponent(code)}`;
}

/**
 * Notification service primitive (Blueprint V1.1 §17.10's Telegram channel).
 * No-ops silently if the user hasn't linked Telegram or the bot isn't
 * configured — callers (signal-active pushes, future rank-up pushes) should
 * never have to check link status themselves.
 */
export async function notifyUserByTelegram(
  admin: SupabaseClient<Database>,
  userId: string,
  text: string,
  opts: { buttons?: InlineButton[][] } = {},
): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;

  const { data: link } = await admin
    .from("telegram_links")
    .select("telegram_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!link) return;

  try {
    await sendTelegramMessage(link.telegram_id, text, opts);
  } catch {
    // Best-effort — a failed push must not break the caller's own flow.
  }
}
