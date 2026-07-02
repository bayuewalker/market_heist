import Link from "next/link";
import { redirect } from "next/navigation";
import { Radar, Sparkles, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SignalCard from "@/components/dashboard/SignalCard";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan_id")
    .eq("id", user.id)
    .single();

  const { data: plan } = await supabase
    .from("plans")
    .select("name, signal_limit")
    .eq("id", profile?.plan_id ?? "basic")
    .single();

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [{ count: totalCount }, { count: todayCount }, { data: recent }] = await Promise.all([
    supabase.from("signals").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("signals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("signals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const limit = plan?.signal_limit ?? null;
  const usedToday = todayCount ?? 0;
  const remaining = limit === null ? "∞" : Math.max(0, limit - usedToday);
  const greetingName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Heister";

  const stats = [
    { label: "Total signals", value: String(totalCount ?? 0), Icon: Radar },
    { label: "Today", value: String(usedToday), Icon: TrendingUp },
    { label: "Remaining today", value: String(remaining), Icon: Sparkles },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted">Welcome back,</p>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{greetingName}</h1>
        <p className="text-sm text-muted">
          You&rsquo;re on the <span className="text-accent-strong">{plan?.name ?? "Basic"}</span> plan.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25">
              <stat.Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent signals</h2>
          <Link href="/dashboard/signals" className="text-sm font-medium text-accent-strong hover:underline">
            View all
          </Link>
        </div>

        {recent && recent.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {recent.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border-subtle bg-surface/50 p-8">
            <div>
              <p className="font-medium text-foreground">No signals yet</p>
              <p className="text-sm text-muted">
                Ask Mentor Heister for your first pair recommendation.
              </p>
            </div>
            <Button href="/dashboard/request">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Request a signal
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
