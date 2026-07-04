import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * Validates a Telegram Login Widget payload
 * (https://core.telegram.org/widgets/login#checking-authorization). The
 * widget's `hash` field is an HMAC-SHA256 of every other field (sorted,
 * `key=value` joined by `\n`), keyed by SHA-256(bot token) — this proves the
 * payload actually came from Telegram and wasn't forged or tampered with,
 * since only Telegram and us know the bot token.
 *
 * `auth_date` freshness is checked separately so a captured/replayed old
 * payload can't be reused indefinitely.
 */
const MAX_AUTH_AGE_SECONDS = 86400; // 24h — Telegram's own recommended staleness bound
const MAX_FUTURE_SKEW_SECONDS = 60; // tolerate small clock drift, but an auth_date far in the future is never legitimate

/**
 * Cookie name for the one-time nonce that binds a Telegram Login redirect to
 * the browser that started it (see `app/api/auth/telegram/nonce/route.ts`).
 * Telegram's HMAC signature only proves Telegram issued the payload, not
 * that the browser presenting it is the one the user authorized from — a
 * captured/leaked callback URL could otherwise be replayed on a different
 * device within the freshness window to hijack a session.
 */
export const TELEGRAM_LOGIN_STATE_COOKIE = "tg_login_state";

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export type TelegramLoginPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
};

export function verifyTelegramLoginPayload(params: URLSearchParams): TelegramLoginPayload | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const hash = params.get("hash");
  const id = params.get("id");
  const authDate = params.get("auth_date");
  if (!hash || !id || !authDate) return null;

  const entries: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash" || key === "state") continue;
    entries.push(`${key}=${value}`);
  }
  entries.sort();
  const dataCheckString = entries.join("\n");

  const secretKey = createHash("sha256").update(token).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (!/^[0-9a-f]+$/i.test(hash) || !timingSafeEqualStrings(computedHash, hash.toLowerCase())) return null;

  const authDateNum = Number(authDate);
  if (!Number.isFinite(authDateNum)) return null;
  const ageSeconds = Date.now() / 1000 - authDateNum;
  if (ageSeconds > MAX_AUTH_AGE_SECONDS || ageSeconds < -MAX_FUTURE_SKEW_SECONDS) return null;

  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return null;

  return {
    id: idNum,
    first_name: params.get("first_name") ?? undefined,
    last_name: params.get("last_name") ?? undefined,
    username: params.get("username") ?? undefined,
    photo_url: params.get("photo_url") ?? undefined,
    auth_date: authDateNum,
  };
}
