"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import Button from "./ui/Button";
import Container from "./ui/Container";
import HeroVisual from "./HeroVisual";
import BackgroundFX from "./BackgroundFX";
import VideoModal from "./VideoModal";

const tickerItems = [
  "BTC/USDT",
  "XAU/USD",
  "EUR/USD",
  "ETH/USDT",
  "GBP/USD",
  "USOIL",
  "SOL/USDT",
  "US30",
];

const stats = [
  { value: "3", label: "Markets covered" },
  { value: "24/7", label: "AI monitoring" },
  { value: "2%", label: "Donated to kids" },
];

export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section id="top" className="relative overflow-hidden pt-14 pb-20 sm:pt-20 sm:pb-28">
      <BackgroundFX />

      <Container className="relative grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center text-center lg:items-start lg:text-left"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent-strong">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Tactical AI trading companion
          </span>

          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Meet Mentor Heister:
            <br />
            <span className="text-shimmer">Your Personal AI Analyst &amp; Assistant</span>
          </h1>

          <p className="mt-6 max-w-xl text-balance text-base text-muted sm:text-lg">
            Market Heist AI is an AI assistant for market heisters. It acts as a tactical AI
            companion for market signals, analyses, and trading-pair requests.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="#pricing" size="lg">
              Access now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setDemoOpen(true)}
              aria-haspopup="dialog"
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              See Demo
            </Button>
          </div>

          <dl className="mt-10 grid w-full max-w-md grid-cols-3 gap-4 border-t border-border-subtle pt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <dt className="order-2 text-xs text-muted">{stat.label}</dt>
                <dd className="order-1 text-2xl font-bold text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <HeroVisual />
        </motion.div>
      </Container>

      {/* Live pair ticker marquee */}
      <div className="relative mt-16 border-y border-border-subtle bg-surface/40 py-3 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
        <div className="flex overflow-hidden">
          <div className="animate-ticker flex shrink-0 items-center gap-8 pr-8">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <VideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}
