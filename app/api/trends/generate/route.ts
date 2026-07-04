import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTrendUpdate } from "@/lib/trends";
import { writeAuditLog } from "@/lib/rewards";
import type { MarketKind } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MARKETS: MarketKind[] = ["crypto", "forex", "commodity"];

/**
 * Generates (or regenerates) today's trend update for each market and
 * upserts them. Callable by:
 * - Vercel Cron, authenticated with CRON_SECRET (daily schedule).
 * - A signed-in admin, for a manual "Generate now" refresh.
 *
 * Returns the admin's user id when a signed-in admin triggered this (so the
 * caller can audit-log it), or null for the cron-triggered path, which is
 * routine and would just be noise in the audit log.
 */
async function authorizedActorId(request: Request): Promise<string | null | undefined> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const header = request.headers.get("x-cron-secret");
    if (auth === `Bearer ${secret}` || header === secret) return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return undefined;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user.id : undefined;
}

async function handle(request: Request) {
  const actorId = await authorizedActorId(request);
  if (actorId === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const results = await Promise.allSettled(
    MARKETS.map(async (market) => {
      const trend = await generateTrendUpdate(market);
      const { error } = await admin
        .from("trend_updates")
        .upsert(
          { market, for_date: today, headline: trend.headline, summary: trend.summary },
          { onConflict: "market,for_date" },
        );
      if (error) throw error;
      return market;
    }),
  );

  const generated = results.filter((r) => r.status === "fulfilled").length;
  const failed = results
    .map((r, i) => (r.status === "rejected" ? MARKETS[i] : null))
    .filter((m): m is MarketKind => m !== null);

  if (actorId) {
    await writeAuditLog(admin, {
      actorId,
      action: "trends.generate",
      targetType: "trend_updates",
      meta: { date: today, generated, failed },
    });
  }

  return NextResponse.json({ date: today, generated, failed });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
