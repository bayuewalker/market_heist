import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeAndStoreLeaderboards } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recomputes all 5 leaderboard boards and replaces the stored snapshot.
 * Callable by:
 * - Vercel Cron, authenticated with CRON_SECRET (periodic schedule).
 * - A signed-in admin, for a manual "Recompute now" refresh.
 */
async function isAuthorized(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const header = request.headers.get("x-cron-secret");
    if (auth === `Bearer ${secret}` || header === secret) return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin";
}

async function handle(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const counts = await recomputeAndStoreLeaderboards(admin);

  return NextResponse.json({ computed_at: new Date().toISOString(), counts });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
