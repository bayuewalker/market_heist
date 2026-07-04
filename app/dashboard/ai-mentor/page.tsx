import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeJournalStats } from "@/lib/journal";
import { MENTOR_PLAN_RANK } from "@/lib/mentor";
import AiConsentGate from "@/components/dashboard/AiConsentGate";
import MentorChat from "@/components/dashboard/MentorChat";
import PositionSizeCalculator from "@/components/dashboard/PositionSizeCalculator";
import BotTemplateGenerator from "@/components/dashboard/BotTemplateGenerator";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function MentorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id, plan_expires_at, ai_consent_at")
    .eq("id", user.id)
    .single();

  const expired = !!profile?.plan_expires_at && new Date(profile.plan_expires_at).getTime() < new Date().getTime();
  const planId = !profile || expired ? "basic" : profile.plan_id;
  const isProPlus = (MENTOR_PLAN_RANK[planId] ?? 0) >= MENTOR_PLAN_RANK.pro;

  if (!isProPlus) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Mentor Heister</h1>
          <p className="text-sm text-muted">Your interactive AI trading mentor.</p>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-border-subtle bg-surface/40 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-muted ring-1 ring-inset ring-border-subtle">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-foreground">Mentor Heister is a Pro+ feature</p>
              <p className="text-sm text-muted">Upgrade to chat, review trades, and size positions with Mentor.</p>
            </div>
          </div>
          <Button href="/dashboard/billing" size="md">Upgrade</Button>
        </div>
      </div>
    );
  }

  if (!profile?.ai_consent_at) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Mentor Heister</h1>
          <p className="text-sm text-muted">Your interactive AI trading mentor.</p>
        </header>
        <AiConsentGate />
      </div>
    );
  }

  const [{ data: latestSignal }, { data: journalRows }, { count: verifiedBrokerCount }] = await Promise.all([
    supabase
      .from("signals")
      .select("pair, bias, entry, stop, invalidation, rationale, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("trade_journals")
      .select("pair, direction, outcome, followed_plan, traded_at")
      .eq("user_id", user.id)
      .order("traded_at", { ascending: false })
      .limit(20),
    supabase
      .from("broker_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "verified"),
  ]);

  const latestSignalContext = latestSignal
    ? `Member's latest signal — pair: ${latestSignal.pair}, bias: ${latestSignal.bias}, entry: ${latestSignal.entry ?? "n/a"}, ` +
      `stop: ${latestSignal.stop ?? "n/a"}, invalidation: ${latestSignal.invalidation ?? "n/a"}, status: ${latestSignal.status}, ` +
      `rationale: ${latestSignal.rationale ?? "n/a"}.`
    : null;

  const journalSummaryContext =
    journalRows && journalRows.length > 0
      ? `Member's last ${journalRows.length} journaled trades: ` +
        journalRows.map((t) => `${t.pair} ${t.direction} (${t.outcome ?? "open"}, followed plan: ${t.followed_plan})`).join("; ")
      : null;

  const stats = journalRows ? computeJournalStats(journalRows) : null;
  const overtradingContext = stats
    ? `Member has logged ${stats.totalTrades} trades, discipline score ${stats.disciplineScore ?? "n/a"}%, ` +
      `${stats.tradesToday} trades today. Overtrading flagged: ${stats.overtrading ? "yes" : "no"}.`
    : null;

  const brokerContext = `Member has ${verifiedBrokerCount ?? 0} verified broker account(s).`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Mentor Heister</h1>
        <p className="text-sm text-muted">
          Chat, review a trade, calculate position size, or sketch a paper bot template — all educational,
          never a promise.
        </p>
      </header>

      <MentorChat
        latestSignalContext={latestSignalContext}
        journalSummaryContext={journalSummaryContext}
        overtradingContext={overtradingContext}
        brokerContext={brokerContext}
      />
      <PositionSizeCalculator />
      <BotTemplateGenerator />
    </div>
  );
}
