import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeJournalStats } from "@/lib/journal";
import JournalForm from "@/components/dashboard/JournalForm";
import JournalList from "@/components/dashboard/JournalList";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trades } = await supabase
    .from("trade_journals")
    .select("*")
    .eq("user_id", user.id)
    .order("traded_at", { ascending: false });

  const stats = computeJournalStats(trades ?? []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Trade journal</h1>
        <p className="text-sm text-muted">Log your trades to track discipline and spot overtrading early.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-subtle bg-surface p-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted">Discipline score</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {stats.disciplineScore !== null ? `${stats.disciplineScore}%` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface p-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted">Trades logged</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{stats.totalTrades}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-border-subtle bg-surface p-4 text-center sm:col-span-1">
          <p className="text-[10px] uppercase tracking-wide text-muted">Trades today</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{stats.tradesToday}</p>
        </div>
      </div>

      {stats.overtrading && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="text-sm text-amber-200">
            You&apos;ve logged more than 5 trades in a single day recently — a common sign of overtrading.
            Consider asking Mentor Heister for a gut-check.
          </p>
        </div>
      )}

      <JournalForm />
      <JournalList trades={trades ?? []} />
    </div>
  );
}
