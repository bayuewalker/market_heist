import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import FooterCTA from "@/components/FooterCTA";

export default async function Home() {
  const telegramBotUsername =
    process.env.TELEGRAM_BOT_USERNAME && process.env.TELEGRAM_BOT_TOKEN
      ? process.env.TELEGRAM_BOT_USERNAME
      : undefined;

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
