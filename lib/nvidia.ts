import type { RiskLevel, SignalBias } from "@/lib/supabase/types";
import { callNvidiaChat, extractJson } from "@/lib/nvidia-client";

export type SignalInput = {
  pair: string;
  market?: string | null;
  timeframe?: string;
  notes?: string;
  live?: {
    price: number;
    high24h: number;
    low24h: number;
    changePct: number;
  } | null;
};

export type GeneratedSignal = {
  bias: SignalBias;
  entry: number | null;
  stop: number | null;
  invalidation: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  riskLevel: RiskLevel | null;
  confidence: number | null;
  technique: string;
  setupReason: string;
  aiNote: string;
  rationale: string;
};

const BIASES: SignalBias[] = ["long", "short", "neutral"];
const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];

function toNumberOrNull(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replace(/[^0-9.\-]/g, "")) : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Ask the NVIDIA-hosted model to act as "Mentor Heister" and return a
 * structured, educational trading signal. The prompt is constrained to avoid
 * profit guarantees.
 */
export async function generateSignal(input: SignalInput): Promise<GeneratedSignal> {
  const system =
    "You are Mentor Heister, a tactical AI market analyst for the Market Heist community. " +
    "You produce educational technical-analysis signals using the FIBOLUTION technique. " +
    "You never promise profit and never claim certainty. Every signal must include reasoning and " +
    "an invalidation level — never omit them. " +
    "Respond with ONLY a strict JSON object, no markdown, using exactly these keys: " +
    'bias (one of "long", "short", "neutral"), entry (number), stop (number), invalidation (number, ' +
    "the price level at which the idea is structurally wrong), tp1, tp2, tp3 (numbers, take-profit " +
    'levels in order), risk_level (one of "low", "medium", "high"), confidence (number between 0 and 1), ' +
    "technique (string), setup_reason (string, max 40 words, the structural/technical reason for the " +
    "setup), ai_note (string, max 30 words, a short mentor tip), rationale (string, max 55 words).";

  const liveBlock = input.live
    ? `Live market data (use these to anchor your levels):\n` +
      `- Current price: ${input.live.price}\n` +
      `- 24h high: ${input.live.high24h}, 24h low: ${input.live.low24h}\n` +
      `- 24h change: ${input.live.changePct}%\n`
    : `No live price available — give a directional read and keep levels illustrative.\n`;

  const user =
    `Pair: ${input.pair}\n` +
    `Market: ${input.market ?? "unspecified"}\n` +
    `Timeframe: ${input.timeframe ?? "4H"}\n` +
    `Trader notes: ${input.notes || "none"}\n` +
    liveBlock +
    "\nGive one educational signal. Entry/stop/invalidation/tp1-3 must be consistent with the current " +
    "price when provided. Keep the rationale concise and risk-aware.";

  const { content } = await callNvidiaChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.3, maxTokens: 400 },
  );
  const parsed = extractJson(content, "Could not parse a signal from the AI response.");

  const rawBias = String(parsed.bias ?? "neutral").toLowerCase() as SignalBias;
  const rawRisk = String(parsed.risk_level ?? "").toLowerCase() as RiskLevel;
  const confidence = toNumberOrNull(parsed.confidence);

  return {
    bias: BIASES.includes(rawBias) ? rawBias : "neutral",
    entry: toNumberOrNull(parsed.entry),
    stop: toNumberOrNull(parsed.stop),
    invalidation: toNumberOrNull(parsed.invalidation),
    tp1: toNumberOrNull(parsed.tp1),
    tp2: toNumberOrNull(parsed.tp2),
    tp3: toNumberOrNull(parsed.tp3),
    riskLevel: RISK_LEVELS.includes(rawRisk) ? rawRisk : null,
    confidence: confidence === null ? null : Math.min(1, Math.max(0, confidence)),
    technique: String(parsed.technique || "FIBOLUTION").slice(0, 60),
    setupReason: String(parsed.setup_reason || "").slice(0, 300),
    aiNote: String(parsed.ai_note || "").slice(0, 200),
    rationale: String(parsed.rationale || "").slice(0, 600),
  };
}
