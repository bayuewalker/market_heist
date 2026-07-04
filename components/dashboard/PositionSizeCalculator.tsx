"use client";

import { useState, type FormEvent } from "react";
import { Calculator, Loader2 } from "lucide-react";
import type { PositionSizeResult } from "@/lib/mentor";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function PositionSizeCalculator() {
  const [accountSize, setAccountSize] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PositionSizeResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/mentor/position-size", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountSize: Number(accountSize),
          riskPct: Number(riskPct),
          entry: Number(entry),
          stop: Number(stop),
          takeProfit: takeProfit ? Number(takeProfit) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Calculation failed.");
      setResult(data as PositionSizeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25">
          <Calculator className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Position size calculator</h2>
          <p className="text-xs text-muted">Risk-based sizing — instant, no AI call needed.</p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="accountSize" className="text-sm font-medium text-foreground">Account size</label>
          <input id="accountSize" required type="number" min="0" step="any" value={accountSize}
            onChange={(e) => setAccountSize(e.target.value)} placeholder="10000" className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="riskPct" className="text-sm font-medium text-foreground">Risk %</label>
          <input id="riskPct" required type="number" min="0" max="100" step="any" value={riskPct}
            onChange={(e) => setRiskPct(e.target.value)} placeholder="1" className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entry" className="text-sm font-medium text-foreground">Entry</label>
          <input id="entry" required type="number" min="0" step="any" value={entry}
            onChange={(e) => setEntry(e.target.value)} placeholder="65000" className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stop" className="text-sm font-medium text-foreground">Stop</label>
          <input id="stop" required type="number" min="0" step="any" value={stop}
            onChange={(e) => setStop(e.target.value)} placeholder="63500" className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="takeProfit" className="text-sm font-medium text-foreground">
            Take profit <span className="text-muted">(optional)</span>
          </label>
          <input id="takeProfit" type="number" min="0" step="any" value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)} placeholder="68000" className={fieldClass} />
        </div>

        {error && <p role="alert" className="text-sm text-rose-300 sm:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#06120d] transition-colors hover:bg-accent-strong disabled:opacity-50 sm:col-span-2 sm:w-auto sm:self-start"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Calculate
        </button>
      </form>

      {result && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border-subtle bg-background/50 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted">Position size</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {result.positionSize.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-background/50 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted">Risk amount</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {result.riskAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-background/50 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted">Risk/reward</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {result.riskRewardRatio !== null ? `${result.riskRewardRatio.toFixed(2)}x` : "—"}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted">{result.note}</p>
        </div>
      )}
    </div>
  );
}
