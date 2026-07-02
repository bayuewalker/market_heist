import type { SignalBias } from "@/lib/supabase/types";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

export type SignalInput = {
  pair: string;
  market?: string | null;
  timeframe?: string;
  notes?: string;
};

export type GeneratedSignal = {
  bias: SignalBias;
  entry: number | null;
  target: number | null;
  stop: number | null;
  confidence: number | null;
  technique: string;
  rationale: string;
};

const BIASES: SignalBias[] = ["long", "short", "neutral"];

function toNumberOrNull(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replace(/[^0-9.\-]/g, "")) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractJson(content: string): Record<string, unknown> {
  const cleaned = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        throw new Error("Could not parse a signal from the AI response.");
      }
    }
    throw new Error("Could not parse a signal from the AI response.");
  }
}

/**
 * Ask the NVIDIA-hosted model to act as "Mentor Heister" and return a
 * structured, educational trading signal. The prompt is constrained to avoid
 * profit guarantees.
 */
export async function generateSignal(input: SignalInput): Promise<GeneratedSignal> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY is not configured.");
  const model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;

  const system =
    "You are Mentor Heister, a tactical AI market analyst for the Market Heist community. " +
    "You produce educational technical-analysis signals using the FIBOLUTION technique. " +
    "You never promise profit and never claim certainty. " +
    "Respond with ONLY a strict JSON object, no markdown, using exactly these keys: " +
    'bias (one of "long", "short", "neutral"), entry (number), target (number), stop (number), ' +
    "confidence (number between 0 and 1), technique (string), rationale (string, max 55 words).";

  const user =
    `Pair: ${input.pair}\n` +
    `Market: ${input.market ?? "unspecified"}\n` +
    `Timeframe: ${input.timeframe ?? "4H"}\n` +
    `Trader notes: ${input.notes || "none"}\n\n` +
    "Give one educational signal. Keep the rationale concise and risk-aware.";

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
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`NVIDIA API error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);

  const rawBias = String(parsed.bias ?? "neutral").toLowerCase() as SignalBias;
  const confidence = toNumberOrNull(parsed.confidence);

  return {
    bias: BIASES.includes(rawBias) ? rawBias : "neutral",
    entry: toNumberOrNull(parsed.entry),
    target: toNumberOrNull(parsed.target),
    stop: toNumberOrNull(parsed.stop),
    confidence: confidence === null ? null : Math.min(1, Math.max(0, confidence)),
    technique: String(parsed.technique || "FIBOLUTION").slice(0, 60),
    rationale: String(parsed.rationale || "").slice(0, 600),
  };
}
