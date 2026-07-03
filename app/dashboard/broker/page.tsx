import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BrokerCard from "@/components/dashboard/BrokerCard";
import type { BrokerAccountRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function BrokerStationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: brokers }, { data: accounts }] = await Promise.all([
    supabase.from("brokers").select("*").order("sort", { ascending: true }),
    supabase.from("broker_accounts").select("*").eq("user_id", user.id),
  ]);

  const accountByBroker = new Map((accounts ?? []).map((a: BrokerAccountRow) => [a.broker_id, a]));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Broker Station</h1>
        <p className="text-sm text-muted">
          Open an account through our partner broker, submit your UID, and get verified to unlock
          trading fee rewards and the leaderboard.
        </p>
      </header>

      {brokers && brokers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {brokers.map((broker) => (
            <BrokerCard key={broker.id} broker={broker} account={accountByBroker.get(broker.id) ?? null} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/50 p-10 text-center">
          <p className="font-medium text-foreground">No brokers available yet</p>
          <p className="mt-1 text-sm text-muted">Check back soon.</p>
        </div>
      )}

      <p className="text-xs text-muted">
        Verification is manual and can take up to 24-48 hours. Rewards vary by broker, plan, and
        confirmed trading activity — see the reward policy for details.
      </p>
    </div>
  );
}
