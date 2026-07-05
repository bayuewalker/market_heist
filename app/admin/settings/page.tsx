import { createAdminClient } from "@/lib/supabase/admin";
import BotSettingsForm from "@/components/admin/BotSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  // bot_settings has no RLS policy for any role, so this read (like the
  // admin API route) always goes through the service-role client — this
  // page itself is already admin-gated by app/admin/layout.tsx.
  const admin = createAdminClient();
  const { data } = await admin
    .from("bot_settings")
    .select("telegram_bot_username, telegram_bot_token")
    .eq("id", true)
    .maybeSingle();

  const envFallbackConfigured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted">Configure integrations without a redeploy.</p>
      </header>

      <BotSettingsForm
        initialUsername={data?.telegram_bot_username ?? null}
        hasToken={!!data?.telegram_bot_token}
        envFallbackConfigured={envFallbackConfigured}
      />
    </div>
  );
}
