import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type TelegramBotConfig = {
  botToken: string | null;
  botUsername: string | null;
};

const ENV_FALLBACK: TelegramBotConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || null,
  botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
};

/**
 * Resolves the Telegram bot's token/username: an admin-set value in
 * `bot_settings` (via /admin/settings) takes priority, falling back to the
 * TELEGRAM_BOT_TOKEN/TELEGRAM_BOT_USERNAME env vars if the admin hasn't
 * configured one yet — so existing env-var-only deployments keep working
 * unchanged. Always reads through the service-role client; `bot_settings`
 * has no RLS policy for any other role.
 */
export async function getTelegramBotConfig(admin: SupabaseClient<Database>): Promise<TelegramBotConfig> {
  const { data } = await admin
    .from("bot_settings")
    .select("telegram_bot_token, telegram_bot_username")
    .eq("id", true)
    .maybeSingle();

  return {
    botToken: data?.telegram_bot_token || ENV_FALLBACK.botToken,
    botUsername: data?.telegram_bot_username || ENV_FALLBACK.botUsername,
  };
}

/**
 * Same as getTelegramBotConfig, but safe to call from a public-facing page
 * (landing, login) that must keep rendering even if the service-role client
 * can't be constructed — createAdminClient() throws synchronously when
 * SUPABASE_SERVICE_ROLE_KEY is missing, which would otherwise hard-crash
 * these pages over an optional widget. Telegram Login is additive: the
 * worst acceptable outcome here is "widget doesn't show," never a 500.
 */
export async function getTelegramBotConfigForPublicPage(): Promise<TelegramBotConfig> {
  try {
    return await getTelegramBotConfig(createAdminClient());
  } catch {
    return ENV_FALLBACK;
  }
}
