import type { MarketKind } from "@/lib/supabase/types";
import { callNvidiaChat, extractJson } from "@/lib/nvidia-client";

export type GeneratedTrend = {
  headline: string;
  summary: string;
};

/**
 * Ask the NVIDIA-hosted model for a short, educational daily trend overview
 * for a market category. Deliberately broader/less specific than a signal —
 * no entry/target/stop, no single-pair call.
 */
export async function generateTrendUpdate(market: MarketKind): Promise<GeneratedTrend> {
  const marketLabel: Record<MarketKind, string> = {
    crypto: "cryptocurrency",
    forex: "forex (FX)",
    commodity: "commodities",
  };

  const system =
    "You are Mentor Heister, writing a short daily market-trend briefing for the Market Heist " +
    "community. This is a broad, educational overview of the current market mood — not a single-pair " +
    "trade signal. Never promise profit or claim certainty. " +
    "Respond with ONLY a strict JSON object, no markdown, with exactly these keys: " +
    "headline (string, max 12 words), summary (string, 2-3 sentences, max 60 words).";

  const user = `Write today's trend briefing for the ${marketLabel[market]} market.`;

  const { content } = await callNvidiaChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.5, maxTokens: 220 },
  );
  const parsed = extractJson(content, "Could not parse a trend update from the AI response.");

  return {
    headline: String(parsed.headline || "Market update").slice(0, 120),
    summary: String(parsed.summary || "").slice(0, 500),
  };
}
