import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import FooterCTA from "@/components/FooterCTA";

export default function Home() {
  const telegramBotUsername =
    process.env.TELEGRAM_BOT_USERNAME && process.env.TELEGRAM_BOT_TOKEN
      ? process.env.TELEGRAM_BOT_USERNAME
      : undefined;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero telegramBotUsername={telegramBotUsername} />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
      </main>
      <FooterCTA />
    </div>
  );
}
