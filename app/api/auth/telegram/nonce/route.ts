import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { TELEGRAM_LOGIN_STATE_COOKIE } from "@/lib/telegram-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NONCE_MAX_AGE_SECONDS = 600; // 10 minutes — long enough to complete the Telegram auth popup

/**
 * Mints a one-time nonce bound to this browser via an HttpOnly cookie, and
 * echoes it back so `TelegramLoginButton` can carry it as `state` in the
 * widget's `data-auth-url`. The callback route then requires the redirected
 * `state` to match this cookie — see `TELEGRAM_LOGIN_STATE_COOKIE`'s doc
 * comment for why that matters.
 */
export async function GET() {
  const nonce = randomBytes(24).toString("hex");
  const res = NextResponse.json({ nonce });
  res.cookies.set(TELEGRAM_LOGIN_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: NONCE_MAX_AGE_SECONDS,
  });
  return res;
}
