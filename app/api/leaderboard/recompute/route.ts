import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeAndStoreLeaderboards } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const header = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || header === secret;
}

async function isAdminAuthorized(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin";
}

async function recompute() {
  const admin = createAdminClient();
  try {
    const counts = await recomputeAndStoreLeaderboards(admin);
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
  return recompute();
}

/** Vercel Cron, or a signed-in admin triggering a manual "Recompute now" refresh. */
export async function POST(request: Request) {
  if (!isCronAuthorized(request) && !(await isAdminAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return recompute();
}
