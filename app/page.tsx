import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import FooterCTA from "@/components/FooterCTA";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
      </main>
      <FooterCTA />
    </div>
  );
}
