"use client";

import { motion } from "framer-motion";
import { Bot, Radar, TrendingUp } from "lucide-react";

export default function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-6 h-40 w-40 rounded-full bg-accent/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -left-6 h-48 w-48 rounded-full bg-accent-dark/50 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="bg-grid relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-b from-surface-2 via-surface to-background p-6 shadow-[0_0_0_1px_rgba(47,226,138,0.12),0_30px_80px_-30px_rgba(47,226,138,0.45)]"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-background/60 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-xs font-medium tracking-wide text-accent-strong">
              AI ANALYST ONLINE
            </span>
          </div>
          <Radar className="h-5 w-5 text-muted" aria-hidden="true" />
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-background/50 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-dark shadow-[0_0_24px_-4px_rgba(47,226,138,0.7)]">
            <Bot className="h-7 w-7 text-[#06120d]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Mentor Heister</p>
            <p className="text-xs text-muted">Scanning BTC/USDT, XAU/USD, EUR/USD…</p>
          </div>
        </div>

        <div className="relative mt-6 h-44 w-full overflow-hidden rounded-2xl border border-border-subtle bg-background/50 p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-accent-strong">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              Signal strength: High
            </span>
            <span>4H</span>
          </div>
          <svg
            viewBox="0 0 300 100"
            className="h-24 w-full"
            fill="none"
            aria-hidden="true"
          >
            <motion.path
              d="M0 78 L20 70 L40 74 L60 55 L80 60 L100 40 L120 46 L140 30 L160 34 L180 20 L200 26 L220 12 L240 18 L260 8 L280 14 L300 4"
              stroke="#2fe28a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.6, ease: "easeInOut", delay: 0.3 }}
            />
            <motion.path
              d="M0 78 L20 70 L40 74 L60 55 L80 60 L100 40 L120 46 L140 30 L160 34 L180 20 L200 26 L220 12 L240 18 L260 8 L280 14 L300 4 L300 100 L0 100 Z"
              fill="url(#chart-fill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
            />
            <defs>
              <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2fe28a" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#2fe28a" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {["Entry", "Target", "Stop"].map((label, i) => (
            <div
              key={label}
              className="rounded-xl border border-border-subtle bg-background/50 px-3 py-2 text-center"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
              <p
                className={`text-sm font-semibold ${
                  i === 1 ? "text-accent-strong" : "text-foreground"
                }`}
              >
                {i === 0 ? "62,450" : i === 1 ? "64,900" : "61,300"}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
