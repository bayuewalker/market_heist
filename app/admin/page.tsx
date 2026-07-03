import { CircleDollarSign, Radar, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default async function AdminOverview() {
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [
    { count: totalUsers },
    { count: paidUsers },
    { count: totalSignals },
    { count: signalsToday },
    { data: revenueTotal },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("plan_id", "basic")
      .gt("plan_expires_at", new Date().toISOString()),
    supabase.from("signals").select("id", { count: "exact", head: true }),
    supabase
      .from("signals")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    // Server-side SUM aggregate instead of fetching every confirmed payment row.
    supabase.rpc("admin_confirmed_revenue"),
  ]);

  const revenue = Number(revenueTotal ?? 0);

  const stats = [
    { label: "Total users", value: String(totalUsers ?? 0), icon: Users },
    { label: "Active paid members", value: String(paidUsers ?? 0), icon: TrendingUp },
    { label: "Signals generated", value: String(totalSignals ?? 0), icon: Radar },
    { label: "Confirmed USDT revenue", value: fmtUsd(revenue), icon: CircleDollarSign },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Admin overview</h1>
        <p className="text-sm text-muted">Key metrics across all members.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25">
              <stat.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-5">
        <p className="text-sm text-muted">
          <strong className="text-foreground">{signalsToday ?? 0}</strong> signals generated today
          (UTC).
        </p>
      </div>
    </div>
  );
}
