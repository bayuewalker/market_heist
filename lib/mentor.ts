import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

// Cost guard: at most this many Mentor calls per user per rolling minute,
// mirrored from the same guard on POST /api/signals/generate.
const MENTOR_PER_MINUTE_LIMIT = 8;

export const MENTOR_PLAN_RANK: Record<string, number> = { basic: 0, pro: 1, elite: 2 };
const MENTOR_MIN_PLAN_RANK = MENTOR_PLAN_RANK.pro;

export type MentorAccessCheck =
  | { ok: true }
  | { ok: false; error: string; status: number; code?: "plan_gated" | "consent_required" };

/**
 * Shared gate for every /api/mentor/* route: Pro+ plan (§12.2) and the AI
 * Data consent gate (§19) recorded on profiles.ai_consent_at.
 */
export function checkMentorAccess(profile: {
  plan_id: string;
  plan_expires_at: string | null;
  ai_consent_at: string | null;
} | null): MentorAccessCheck {
  const expired = !!profile?.plan_expires_at && new Date(profile.plan_expires_at).getTime() < Date.now();
  const planId = !profile || expired ? "basic" : profile.plan_id;
  const rank = MENTOR_PLAN_RANK[planId] ?? 0;

  if (rank < MENTOR_MIN_PLAN_RANK) {
    return { ok: false, error: "Mentor Heister is a Pro+ feature. Upgrade to unlock it.", status: 403, code: "plan_gated" };
  }
  if (!profile?.ai_consent_at) {
    return { ok: false, error: "Accept the AI data consent gate before using Mentor Heister.", status: 403, code: "consent_required" };
  }
  return { ok: true };
}

export async function isUnderMentorRateLimit(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("ai_chat_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneMinuteAgo);
  return (count ?? 0) < MENTOR_PER_MINUTE_LIMIT;
}

const MENTOR_SYSTEM_PROMPT =
  "You are Mentor Heister, a tactical AI trading mentor for the Market Heist community. " +
  "You never promise profit, never claim certainty, and never use words like 'guaranteed', " +
  "'passive income', 'managed fund', or 'risk-free'. Every answer must include: a clear " +
  "answer, a risk note, a suggested action, an invalidation point where relevant, and " +
  "position sizing guidance where relevant. If asked to build a trading bot, you only ever " +
  "describe a paper-trading or backtest template in plain language — never auto-execution " +
  "code, live-broker API wiring, or instructions to place real orders automatically. Keep " +
  "answers concise and actionable, under 200 words unless the user asks for more detail.";

/** Strip invisible Unicode formatting characters, same guard as lib/nvidia.ts. */
function sanitizeApiKey(key: string): string {
  return key.replace(/[​-‏‪-‮﻿]/g, "").trim();
}

async function callMentorModel(messages: { role: "system" | "user"; content: string }[]): Promise<{
  content: string;
  tokenUsage: number;
}> {
  const rawApiKey = process.env.NVIDIA_API_KEY;
  if (!rawApiKey) throw new Error("NVIDIA_API_KEY is not configured.");
  const apiKey = sanitizeApiKey(rawApiKey);
  const model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;

  const response = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`NVIDIA API error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const tokenUsage: number = Number(data?.usage?.total_tokens ?? 0);
  return { content: content.trim(), tokenUsage: Number.isFinite(tokenUsage) ? tokenUsage : 0 };
}

export async function mentorChat(input: {
  message: string;
  context?: string;
}): Promise<{ answer: string; tokenUsage: number }> {
  const user = input.context ? `${input.context}\n\nMember's question: ${input.message}` : input.message;
  const { content, tokenUsage } = await callMentorModel([
    { role: "system", content: MENTOR_SYSTEM_PROMPT },
    { role: "user", content: user },
  ]);
  return { answer: content, tokenUsage };
}

export async function mentorBotTemplate(input: {
  strategyDescription: string;
}): Promise<{ answer: string; tokenUsage: number }> {
  const user =
    `Describe a PAPER-TRADING / BACKTEST-ONLY bot template for this strategy idea — plain-language ` +
    `rules a member could track by hand or backtest, never auto-execution code or live order placement:\n\n` +
    input.strategyDescription;
  const { content, tokenUsage } = await callMentorModel([
    { role: "system", content: MENTOR_SYSTEM_PROMPT },
    { role: "user", content: user },
  ]);
  return { answer: content, tokenUsage };
}

export async function mentorTradeReview(input: {
  pair: string;
  direction: string;
  entry: number | null;
  exitPrice: number | null;
  outcome: string | null;
  followedPlan: boolean;
  notes: string | null;
}): Promise<{ answer: string; tokenUsage: number }> {
  const user =
    `Review this journaled trade and give discipline feedback (what went well, what to improve):\n` +
    `Pair: ${input.pair}\nDirection: ${input.direction}\n` +
    `Entry: ${input.entry ?? "unspecified"}\nExit: ${input.exitPrice ?? "unspecified"}\n` +
    `Outcome: ${input.outcome ?? "unspecified"}\nFollowed trading plan: ${input.followedPlan ? "yes" : "no"}\n` +
    `Member notes: ${input.notes || "none"}`;
  const { content, tokenUsage } = await callMentorModel([
    { role: "system", content: MENTOR_SYSTEM_PROMPT },
    { role: "user", content: user },
  ]);
  return { answer: content, tokenUsage };
}

export type PositionSizeResult = {
  positionSize: number;
  riskAmount: number;
  riskRewardRatio: number | null;
  note: string;
};

/**
 * Deterministic position-size calculator — no LLM call needed for pure
 * arithmetic, keeping this Mentor function instant and zero-cost (in the
 * spirit of this milestone's AI cost-control goal).
 */
export function calculatePositionSize(input: {
  accountSize: number;
  riskPct: number;
  entry: number;
  stop: number;
  takeProfit?: number | null;
}): PositionSizeResult {
  const riskAmount = input.accountSize * (input.riskPct / 100);
  const stopDistance = Math.abs(input.entry - input.stop);
  const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
  const riskRewardRatio =
    input.takeProfit && stopDistance > 0 ? Math.abs(input.takeProfit - input.entry) / stopDistance : null;

  const note =
    `Risking ${input.riskPct}% of a ${input.accountSize.toLocaleString()} account is ` +
    `${riskAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} on this trade. ` +
    `Invalidation is the stop at ${input.stop} — if price reaches it, the idea is structurally wrong ` +
    `and the position should be closed, not averaged down.`;

  return { positionSize, riskAmount, riskRewardRatio, note };
}
