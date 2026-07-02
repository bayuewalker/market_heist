"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import Button from "./ui/Button";
import Container from "./ui/Container";
import HeroVisual from "./HeroVisual";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(47,226,138,0.18),transparent)]"
      />
      <Container className="relative grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center text-center lg:items-start lg:text-left"
        >
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent-strong">
            Tactical AI trading companion
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Meet Mentor Heister:
            <br />
            <span className="bg-gradient-to-r from-accent-strong to-accent bg-clip-text text-transparent">
              Your Personal AI Analyst &amp; Assistant
            </span>
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
            <Button href="#how-it-works" variant="secondary" size="lg">
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              See Demo
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <HeroVisual />
        </motion.div>
      </Container>
    </section>
  );
}
