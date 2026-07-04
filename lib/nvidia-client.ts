/**
 * Shared low-level NVIDIA chat-completions call, used by lib/nvidia.ts
 * (signals), lib/trends.ts (daily trend briefings), and lib/mentor.ts
 * (Mentor Heister). Consolidated so timeouts/headers/error-parsing don't
 * drift between the three call sites.
 */

export const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
export const DEFAULT_NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Extract a JSON object from a chat completion that may be wrapped in markdown fences or prose. */
export function extractJson(content: string, errorMessage: string): Record<string, unknown> {
  const cleaned = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (isPlainObject(parsed)) return parsed;
  } catch {
    // fall through to brace-matching below
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (isPlainObject(parsed)) return parsed;
    } catch {
      // fall through to the shared error below
    }
  }
  throw new Error(errorMessage);
}

/** Strip invisible Unicode formatting characters that can sneak in when a key is pasted from some sources. */
export function sanitizeApiKey(key: string): string {
  return key.replace(/[​-‏‪-‮﻿]/g, "").trim();
}

export type NvidiaChatMessage = { role: "system" | "user"; content: string };

export type NvidiaChatResult = { content: string; tokenUsage: number };

export async function callNvidiaChat(
  messages: NvidiaChatMessage[],
  opts?: { temperature?: number; topP?: number; maxTokens?: number },
): Promise<NvidiaChatResult> {
  const rawApiKey = process.env.NVIDIA_API_KEY;
  if (!rawApiKey) throw new Error("NVIDIA_API_KEY is not configured.");
  const apiKey = sanitizeApiKey(rawApiKey);
  const model = process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL;

  const response = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.4,
      top_p: opts?.topP ?? 0.9,
      max_tokens: opts?.maxTokens ?? 500,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`NVIDIA API error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const tokenUsage = Number(data?.usage?.total_tokens ?? 0);
  return { content: content.trim(), tokenUsage: Number.isFinite(tokenUsage) ? tokenUsage : 0 };
}
