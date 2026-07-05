import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTelegramBotConfig } from "@/lib/telegram-settings";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import FooterCTA from "@/components/FooterCTA";

// Reading character_configs via the cookie-aware server client makes this
// page dynamic (it calls the implicitly-dynamic cookies() API) — declared
// explicitly, matching the same pattern on every other data-fetching page
// in this codebase, rather than leaving the static->dynamic switch implicit.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Telegram Login is additive — only render the widget when the bot is
  // actually configured (admin-set via /admin/settings, or the env-var
  // fallback). `bot_settings` has no RLS policy for any role, so this read
  // needs the service-role client, not the cookie-aware one below.
  const admin = createAdminClient();
  const { botToken, botUsername } = await getTelegramBotConfig(admin);
  const telegramBotUsername = botToken && botUsername ? botUsername : undefined;

  // The Playmaker persona, admin-editable via /admin/character. Defensive by
  // design: if no row is active (or the query fails), Hero just renders
  // without the persona callout — a missing/inactive config can't break the
  // landing page.
  const supabase = await createClient();
  const { data: character } = await supabase
    .from("character_configs")
    .select("character_name, tagline")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero
          telegramBotUsername={telegramBotUsername}
          playmakerName={character?.character_name ?? null}
          playmakerTagline={character?.tagline ?? null}
        />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
      </main>
      <FooterCTA />
    </div>
  );
}
