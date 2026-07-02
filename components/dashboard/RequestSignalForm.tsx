"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import SignalCard from "@/components/dashboard/SignalCard";
import type { SignalRow } from "@/lib/supabase/types";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

const markets = [
  { value: "", label: "Auto-detect" },
  { value: "crypto", label: "Crypto" },
  { value: "forex", label: "Forex" },
  { value: "commodity", label: "Commodity" },
];

const timeframes = ["15m", "1H", "4H", "1D", "1W"];

export default function RequestSignalForm() {
  const router = useRouter();
  const [pair, setPair] = useState("");
  const [market, setMarket] = useState("");
  const [timeframe, setTimeframe] = useState("4H");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [result, setResult] = useState<SignalRow | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setLimitReached(false);
    setResult(null);

    try {
      const res = await fetch("/api/signals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair, market: market || undefined, timeframe, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "limit_reached") setLimitReached(true);
        throw new Error(data?.error || "Something went wrong.");
      }
      setResult(data.signal as SignalRow);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onSubmit}
        className="gradient-border flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pair" className="text-sm font-medium text-foreground">
              Trading pair
            </label>
            <input
              id="pair"
              required
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              placeholder="BTC/USDT"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="market" className="text-sm font-medium text-foreground">
              Market
            </label>
            <select
              id="market"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className={fieldClass}
            >
              {markets.map((m) => (
                <option key={m.label} value={m.value} className="bg-surface">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Timeframe</span>
          <div className="flex flex-wrap gap-2">
            {timeframes.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                aria-pressed={timeframe === tf}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  timeframe === tf
                    ? "border-accent/50 bg-accent/15 text-accent-strong"
                    : "border-border-subtle text-muted hover:text-foreground"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notes <span className="text-muted">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Anything Mentor Heister should consider…"
            className={`${fieldClass} resize-none`}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
            {limitReached && (
              <>
                {" "}
                <Link href="/dashboard/account" className="font-medium underline">
                  Upgrade your plan
                </Link>
                .
              </>
            )}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto sm:self-start">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate signal
            </>
          )}
        </Button>

        <p className="text-xs text-muted">
          Educational analysis only — not financial advice. No outcome is guaranteed.
        </p>
      </form>

      {result && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Latest signal</h2>
          <SignalCard signal={result} />
        </div>
      )}
    </div>
  );
}
