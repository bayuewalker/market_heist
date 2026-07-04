"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MarketKind, TradeDirection, TradeOutcome } from "@/lib/supabase/types";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function JournalForm() {
  const router = useRouter();
  const [pair, setPair] = useState("");
  const [market, setMarket] = useState<MarketKind | "">("");
  const [direction, setDirection] = useState<TradeDirection>("long");
  const [entry, setEntry] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [positionSize, setPositionSize] = useState("");
  const [outcome, setOutcome] = useState<TradeOutcome | "">("");
  const [followedPlan, setFollowedPlan] = useState(true);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in.");
      setPending(false);
      return;
    }

    const { error: insertError } = await supabase.from("trade_journals").insert({
      user_id: user.id,
      pair: pair.trim().toUpperCase(),
      market: market || null,
      direction,
      entry: entry ? Number(entry) : null,
      exit_price: exitPrice ? Number(exitPrice) : null,
      position_size: positionSize ? Number(positionSize) : null,
      outcome: outcome || null,
      followed_plan: followedPlan,
      notes: notes.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      setPending(false);
      return;
    }

    setPair("");
    setMarket("");
    setEntry("");
    setExitPrice("");
    setPositionSize("");
    setOutcome("");
    setFollowedPlan(true);
    setNotes("");
    router.refresh();
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="gradient-border flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
      <h2 className="font-semibold text-foreground">Log a trade</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="j-pair" className="text-sm font-medium text-foreground">Pair</label>
          <input id="j-pair" required value={pair} onChange={(e) => setPair(e.target.value)} placeholder="BTC/USDT" className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="j-market" className="text-sm font-medium text-foreground">Market</label>
          <select id="j-market" value={market} onChange={(e) => setMarket(e.target.value as MarketKind | "")} className={fieldClass}>
            <option value="">—</option>
            <option value="crypto">Crypto</option>
            <option value="forex">Forex</option>
            <option value="commodity">Commodity</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="j-direction" className="text-sm font-medium text-foreground">Direction</label>
          <select id="j-direction" value={direction} onChange={(e) => setDirection(e.target.value as TradeDirection)} className={fieldClass}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="j-outcome" className="text-sm font-medium text-foreground">Outcome</label>
          <select id="j-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as TradeOutcome | "")} className={fieldClass}>
            <option value="">Open / unspecified</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="breakeven">Breakeven</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="j-entry" className="text-sm font-medium text-foreground">Entry</label>
          <input id="j-entry" type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="j-exit" className="text-sm font-medium text-foreground">Exit</label>
          <input id="j-exit" type="number" step="any" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="j-size" className="text-sm font-medium text-foreground">Position size</label>
          <input id="j-size" type="number" step="any" value={positionSize} onChange={(e) => setPositionSize(e.target.value)} className={fieldClass} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={followedPlan} onChange={(e) => setFollowedPlan(e.target.checked)} className="h-4 w-4 rounded border-border-subtle" />
        I followed my trading plan on this trade
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="j-notes" className="text-sm font-medium text-foreground">Notes <span className="text-muted">(optional)</span></label>
        <textarea id="j-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} className={`${fieldClass} resize-none`} />
      </div>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#06120d] transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlusCircle className="h-4 w-4" aria-hidden="true" />}
        Log trade
      </button>
    </form>
  );
}
