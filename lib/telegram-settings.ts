import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type TelegramBotConfig = {
  botToken: string | null;
  botUsername: string | null;
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
    botToken: data?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || null,
    botUsername: data?.telegram_bot_username || process.env.TELEGRAM_BOT_USERNAME || null,
  };
}
