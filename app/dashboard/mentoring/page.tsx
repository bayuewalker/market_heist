import { redirect } from "next/navigation";
import { CalendarClock, Lock, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Button from "@/components/ui/Button";
import { weeklySchedule, eliteWorkshop } from "@/data/mentoring";

export const dynamic = "force-dynamic";

const PLAN_RANK: Record<string, number> = { basic: 0, pro: 1, elite: 2 };

export default async function MentoringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id, plan_expires_at")
    .eq("id", user.id)
    .single();

  const expired =
    !!profile?.plan_expires_at &&
    new Date(profile.plan_expires_at).getTime() < new Date().getTime();
  const planId = !profile || expired ? "basic" : profile.plan_id;
  const userRank = PLAN_RANK[planId] ?? 0;

  const joinLink = process.env.NEXT_PUBLIC_MENTORING_LINK || "mailto:Info@marketheist.com";
  const isElite = userRank >= PLAN_RANK.elite;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Live trade & mentoring</h1>
        <p className="text-sm text-muted">
          Join Mentor Heister and the crew live. Basic members get the weekly Friday session; Pro and
          Elite unlock every weekday.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {weeklySchedule.map((session) => {
          const requiredRank = PLAN_RANK[session.minPlan];
          const unlocked = userRank >= requiredRank;
          return (
            <div
              key={session.day}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
                unlocked ? "border-border-subtle bg-surface" : "border-dashed border-border-subtle bg-surface/40"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ${
                    unlocked
                      ? "bg-accent/10 text-accent-strong ring-accent/25"
                      : "bg-white/5 text-muted ring-border-subtle"
                  }`}
                >
                  {unlocked ? (
                    <CalendarClock className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Lock className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {session.day} · {session.time}
                  </p>
                  <p className="text-sm text-muted">{session.topic}</p>
                </div>
              </div>

              {unlocked ? (
                <Button href={joinLink} size="md" target="_blank" rel="noopener noreferrer">
                  Join session
                </Button>
              ) : (
                <Button href="/dashboard/billing" variant="secondary" size="md">
                  Upgrade to unlock
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div
        className={`gradient-border flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
          isElite ? "border-accent/40 bg-surface-2" : "border-dashed border-border-subtle bg-surface/40"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ${
              isElite
                ? "bg-accent/10 text-accent-strong ring-accent/25"
                : "bg-white/5 text-muted ring-border-subtle"
            }`}
          >
            {isElite ? <Sparkles className="h-5 w-5" aria-hidden="true" /> : <Lock className="h-5 w-5" aria-hidden="true" />}
          </div>
          <div>
            <p className="font-medium text-foreground">{eliteWorkshop.cadence} Elite workshop</p>
            <p className="text-sm text-muted">{eliteWorkshop.topic}</p>
          </div>
        </div>
        <span className="rounded-full border border-border-subtle px-3 py-1 text-xs font-medium text-muted">
          Elite — coming soon
        </span>
      </div>

      <p className="text-xs text-muted">
        Session times are in UTC and may shift around holidays — announcements go out ahead of time.
      </p>
    </div>
  );
}
