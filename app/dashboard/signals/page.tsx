import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SignalCard from "@/components/dashboard/SignalCard";
import SignalActions from "@/components/dashboard/SignalActions";
import Button from "@/components/ui/Button";
import type { SignalStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; statuses: SignalStatus[] | null }[] = [
  { key: "all", label: "All", statuses: null },
  { key: "active", label: "Active", statuses: ["pending", "active"] },
  { key: "wins", label: "Wins", statuses: ["hit_tp1", "hit_tp2", "hit_tp3"] },
  { key: "losses", label: "Losses", statuses: ["invalidated", "expired"] },
  { key: "closed", label: "Closed", statuses: ["manual_closed"] },
];

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { filter: filterKey } = await searchParams;
  const activeFilter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];

  let query = supabase.from("signals").select("*").eq("user_id", user.id);
  if (activeFilter.statuses) query = query.in("status", activeFilter.statuses);
  const { data: signals } = await query.order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your signals</h1>
          <p className="text-sm text-muted">
            Every signal Mentor Heister has generated for you — the full archive, wins and losses included.
          </p>
        </div>
        <Button href="/dashboard/request">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          New signal
        </Button>
      </header>

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/dashboard/signals" : `/dashboard/signals?filter=${f.key}`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              f.key === activeFilter.key
                ? "border-accent/50 bg-accent/10 text-accent-strong"
                : "border-border-subtle text-muted hover:border-accent/30 hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {signals && signals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} actions={<SignalActions signal={signal} />} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/50 p-10 text-center">
          <p className="font-medium text-foreground">No signals yet</p>
          <p className="mt-1 text-sm text-muted">
            Head to{" "}
            <Link href="/dashboard/request" className="text-accent-strong hover:underline">
              Request signal
            </Link>{" "}
            to get started.
          </p>
        </div>
      )}
    </div>
  );
}
