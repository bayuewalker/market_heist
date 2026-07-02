"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Activity, Cpu, TrendingUp } from "lucide-react";
import { asset } from "@/lib/asset";

const pairs = [
  { symbol: "BTC/USDT", value: "+2.4%" },
  { symbol: "XAU/USD", value: "+0.8%" },
  { symbol: "EUR/USD", value: "-0.3%" },
];

function Corner({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-6 w-6 border-accent/70 ${className}`}
    />
  );
}

export default function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Halo */}
      <div
        aria-hidden="true"
        className="animate-pulse-glow absolute inset-4 rounded-[2rem] bg-accent/20 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="gradient-border relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-b from-surface-2 via-surface to-background p-3 shadow-[0_0_0_1px_rgba(47,226,138,0.12),0_40px_100px_-30px_rgba(47,226,138,0.5)]"
      >
        {/* HUD top bar */}
        <div className="mb-3 flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-background/60 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-accent-strong">
              AI ANALYST ONLINE
            </span>
          </div>
          <Cpu className="animate-flicker h-4 w-4 text-accent/70" aria-hidden="true" />
        </div>

        {/* Robot analyst in a scanned viewport */}
        <div className="relative overflow-hidden rounded-2xl border border-border-subtle">
          <Image
            src={asset("/assets/hero-analyst.png")}
            alt="Mentor Heister, the Market Heist AI analyst — a hooded cybernetic figure with a chrome mask and glowing green eyes"
            width={810}
            height={543}
            loading="eager"
            sizes="(max-width: 768px) 90vw, 420px"
            className="h-auto w-full"
          />

          {/* Scanning line sweeping over the analyst */}
          <span
            aria-hidden="true"
            className="animate-scan pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(to_bottom,transparent,rgba(92,255,176,0.35),transparent)]"
          />
          {/* Fine scan grid + vignette */}
          <span className="bg-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(4,8,6,0.65))]"
          />

          {/* HUD corner brackets */}
          <Corner className="left-2 top-2 border-l-2 border-t-2 rounded-tl-md" />
          <Corner className="right-2 top-2 border-r-2 border-t-2 rounded-tr-md" />
          <Corner className="bottom-2 left-2 border-b-2 border-l-2 rounded-bl-md" />
          <Corner className="bottom-2 right-2 border-b-2 border-r-2 rounded-br-md" />

          {/* Live signal chip */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-accent/30 bg-background/80 px-2.5 py-1.5 backdrop-blur-sm">
            <TrendingUp className="h-3.5 w-3.5 text-accent-strong" aria-hidden="true" />
            <span className="text-[11px] font-medium text-foreground">Signal: High</span>
          </div>
        </div>

        {/* Pair ticker */}
        <div className="mt-3 flex items-center gap-2 px-1">
          <Activity className="h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
          <div className="grid flex-1 grid-cols-3 gap-2">
            {pairs.map((pair) => (
              <div
                key={pair.symbol}
                className="rounded-lg border border-border-subtle bg-background/50 px-2 py-1.5 text-center"
              >
                <p className="text-[10px] font-medium tracking-wide text-muted">{pair.symbol}</p>
                <p
                  className={`text-xs font-semibold tabular-nums ${
                    pair.value.startsWith("-") ? "text-rose-400" : "text-accent-strong"
                  }`}
                >
                  {pair.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating orbiting chips */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="animate-floaty absolute -right-3 top-16 hidden rounded-xl border border-accent/30 bg-background/80 px-3 py-2 backdrop-blur-md sm:block"
      >
        <p className="text-[10px] uppercase tracking-wide text-muted">Technique</p>
        <p className="text-sm font-semibold text-accent-strong">FIBOLUTION</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.65, duration: 0.6 }}
        className="animate-floaty-slow absolute -left-4 bottom-24 hidden rounded-xl border border-accent/30 bg-background/80 px-3 py-2 backdrop-blur-md sm:block"
      >
        <p className="text-[10px] uppercase tracking-wide text-muted">Engine</p>
        <p className="text-sm font-semibold text-accent-strong">S.A.I</p>
      </motion.div>
    </div>
  );
}
