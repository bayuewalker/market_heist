import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTrendUpdate } from "@/lib/trends";
import type { MarketKind } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MARKETS: MarketKind[] = ["crypto", "forex", "commodity"];

/**
 * Generates (or regenerates) today's trend update for each market and
 * upserts them. Callable by:
 * - Vercel Cron, authenticated with CRON_SECRET (daily schedule).
 * - A signed-in admin, for a manual "Generate now" refresh.
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

  return NextResponse.json({ date: today, generated, failed });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
