import { redirect } from "next/navigation";
import { Bitcoin, Coins, DollarSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RefreshTrendsButton from "@/components/dashboard/RefreshTrendsButton";
import type { MarketKind } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const TREND_LIMIT = 30;

const marketMeta: Record<MarketKind, { label: string; icon: LucideIcon }> = {
  crypto: { label: "Crypto", icon: Bitcoin },
  forex: { label: "Forex", icon: DollarSign },
  commodity: { label: "Commodity", icon: Coins },
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function TrendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  const { data: trends } = await supabase
    .from("trend_updates")
    .select("*")
    .order("for_date", { ascending: false })
    .order("market", { ascending: true })
    .limit(TREND_LIMIT);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily trend updates</h1>
          <p className="text-sm text-muted">
            A quick, educational read on crypto, forex, and commodity mood — updated daily.
          </p>
        </div>
        {profile?.role === "admin" && <RefreshTrendsButton />}
      </header>

      {trends && trends.length > 0 ? (
        <div className="flex flex-col gap-4">
          {trends.map((t) => {
            const meta = marketMeta[t.market];
            const Icon = meta.icon;
            return (
              <article
                key={t.id}
                className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-strong">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted">{fmtDate(t.for_date)}</span>
                </div>
                <h2 className="text-base font-semibold text-foreground">{t.headline}</h2>
                <p className="text-sm leading-relaxed text-muted">{t.summary}</p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/50 p-10 text-center">
          <p className="font-medium text-foreground">No trend updates yet</p>
          <p className="mt-1 text-sm text-muted">Check back soon — new updates post daily.</p>
        </div>
      )}
    </div>
  );
}
