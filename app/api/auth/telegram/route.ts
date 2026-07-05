import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TELEGRAM_LOGIN_STATE_COOKIE, timingSafeEqualStrings, verifyTelegramLoginPayload } from "@/lib/telegram-login";
import { getTelegramBotConfig } from "@/lib/telegram-settings";
import { writeAuditLog } from "@/lib/rewards";
import { resolvePostLoginPath } from "@/lib/post-login-redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Telegram Login Widget callback (`data-auth-url`) — Telegram redirects the
 * browser here with a signed payload after the user authorizes in-app.
 *
 * This is additive to (never a replacement for) Supabase email/password
 * auth (§2/M13): it only ever signs in a user who already linked their
 * Telegram account via the M7 bot flow (`telegram_links`) — it never
 * creates a new account, so there's no path to a duplicate profile.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(TELEGRAM_LOGIN_STATE_COOKIE)?.value;

  // The nonce cookie is single-use regardless of outcome, so every response
  // path below goes through this helper rather than a bare redirect.
  function respond(path: string) {
    const res = NextResponse.redirect(new URL(path, request.url));
    res.cookies.delete(TELEGRAM_LOGIN_STATE_COOKIE);
    return res;
  }
  function loginError(code: string) {
    return respond(`/login?telegram_error=${code}`);
  }

  // Telegram's HMAC signature only proves Telegram issued this payload, not
  // that this browser is the one the user authorized from — without this
  // check, a captured/leaked callback URL could be replayed on a different
  // device within the payload's freshness window to hijack a session.
  const providedState = url.searchParams.get("state");
  if (!expectedState || !providedState || !timingSafeEqualStrings(expectedState, providedState)) {
    return loginError("invalid_state");
  }

  const admin = createAdminClient();
  const { botToken } = await getTelegramBotConfig(admin);
  const payload = verifyTelegramLoginPayload(url.searchParams, botToken);
  if (!payload) return loginError("invalid");

  const { data: link, error: linkLookupError } = await admin
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_id", payload.id)
    .maybeSingle();
  if (linkLookupError) return loginError("session_failed");
  if (!link) return loginError("not_linked");

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email")
    .eq("id", link.user_id)
    .maybeSingle();
  if (profileError) return loginError("session_failed");
  if (!profile?.email) return loginError("no_email");

  // Passwordless sign-in for an already-verified user: mint a one-time magic
  // link server-side (admin API, never exposed to the client), then
  // immediately redeem it against the request-scoped, cookie-bound client so
  // the resulting session is a real Supabase session — issued exactly the
  // same way the email/password path issues one.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) return loginError("session_failed");

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (verifyError) return loginError("session_failed");

  await writeAuditLog(admin, {
    actorId: link.user_id,
    action: "auth.telegram_login",
    targetType: "profile",
    targetId: link.user_id,
    meta: { telegram_id: payload.id },
  });

  return respond(await resolvePostLoginPath(supabase, link.user_id));
}
