import type { MarketKind } from "@/lib/supabase/types";

const BINANCE_DATA = "https://data-api.binance.vision/api/v3/ticker/24hr";

export type MarketContext = {
  symbol: string;
  price: number;
  high24h: number;
  low24h: number;
  changePct: number;
};

/**
 * Best-effort live price context for a pair, so the model can anchor its
 * entry/target/stop to reality instead of inventing numbers. Uses Binance's
 * public market-data endpoint (no key). Returns null for forex/commodity or
 * any symbol Binance doesn't list — the signal then stays directional.
 */
export async function getMarketContext(
  pair: string,
  market: MarketKind | null,
): Promise<MarketContext | null> {
  if (market === "forex" || market === "commodity") return null;

  const symbol = pair.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!symbol) return null;

  try {
    const res = await fetch(`${BINANCE_DATA}?symbol=${symbol}`, { cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    const price = Number(j.lastPrice);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      symbol,
      price,
      high24h: Number(j.highPrice),
      low24h: Number(j.lowPrice),
      changePct: Number(j.priceChangePercent),
    };
  } catch {
    return null;
  }
}
