import type { MarketKind } from "@/lib/supabase/types";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

export type GeneratedTrend = {
  headline: string;
  summary: string;
};

function extractJson(content: string): Record<string, unknown> {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        throw new Error("Could not parse a trend update from the AI response.");
      }
    }
    throw new Error("Could not parse a trend update from the AI response.");
  }
}

/**
 * Ask the NVIDIA-hosted model for a short, educational daily trend overview
 * for a market category. Deliberately broader/less specific than a signal —
 * no entry/target/stop, no single-pair call.
 */
export async function generateTrendUpdate(market: MarketKind): Promise<GeneratedTrend> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY is not configured.");
  const model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;

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

  const response = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      top_p: 0.9,
      max_tokens: 220,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`NVIDIA API error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);

  return {
    headline: String(parsed.headline || "Market update").slice(0, 120),
    summary: String(parsed.summary || "").slice(0, 500),
  };
}
