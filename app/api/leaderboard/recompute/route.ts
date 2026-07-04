import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeAndStoreLeaderboards } from "@/lib/leaderboard";
import { writeAuditLog } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const header = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || header === secret;
}

/** Returns the admin's user id if the caller is a signed-in admin, otherwise null. */
async function adminActorId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user.id : null;
}

/**
 * `actorId` is only set when a signed-in admin triggered this manually — the
 * cron-triggered path is expected/routine and would just be noise in the
 * audit log, which exists to record deliberate admin actions.
 */
async function recompute(actorId: string | null) {
  const admin = createAdminClient();
  try {
    const counts = await recomputeAndStoreLeaderboards(admin);
    if (actorId) {
      await writeAuditLog(admin, {
        actorId,
        action: "leaderboard.recompute",
        targetType: "leaderboard_entries",
        meta: { counts },
      });
    }
    return NextResponse.json({ computed_at: new Date().toISOString(), counts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Leaderboard recompute failed." },
      { status: 500 },
    );
  }
}

/** Vercel Cron only — GET is a state-changing action, so it must never accept session-cookie auth (CSRF via cross-site GET navigation). */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return recompute(null);
}

/** Vercel Cron, or a signed-in admin triggering a manual "Recompute now" refresh. */
export async function POST(request: Request) {
  if (isCronAuthorized(request)) return recompute(null);
  const actorId = await adminActorId();
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return recompute(actorId);
}
