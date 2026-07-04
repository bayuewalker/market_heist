import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTelegramLoginPayload } from "@/lib/telegram-login";
import { writeAuditLog } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginError(request: Request, code: string) {
  return NextResponse.redirect(new URL(`/login?telegram_error=${code}`, request.url));
}

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
  const payload = verifyTelegramLoginPayload(url.searchParams);
  if (!payload) return loginError(request, "invalid");

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_id", payload.id)
    .maybeSingle();
  if (!link) return loginError(request, "not_linked");

  const { data: profile } = await admin.from("profiles").select("email").eq("id", link.user_id).maybeSingle();
  if (!profile?.email) return loginError(request, "no_email");

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
  if (linkError || !tokenHash) return loginError(request, "session_failed");

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (verifyError) return loginError(request, "session_failed");

  await writeAuditLog(admin, {
    actorId: link.user_id,
    action: "auth.telegram_login",
    targetType: "profile",
    targetId: link.user_id,
    meta: { telegram_id: payload.id },
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
