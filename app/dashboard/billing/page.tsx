import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Checkout from "@/components/dashboard/Checkout";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function BillingPage() {
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

  const { data: plans } = await supabase.from("plans").select("*").order("sort", { ascending: true });
  const currentPlan = plans?.find((p) => p.id === (profile?.plan_id ?? "basic"));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted">Upgrade your membership by paying in USDT (TRON / TRC20).</p>
      </header>

      <section className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface p-5">
        <div>
          <p className="text-xs text-muted">Current plan</p>
          <p className="text-lg font-semibold text-foreground">{currentPlan?.name ?? "Market Heister Basic"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Renews / expires</p>
          <p className="text-sm text-foreground">
            {profile?.plan_expires_at ? fmtDate(profile.plan_expires_at) + " UTC" : "—"}
          </p>
        </div>
      </section>

      <Checkout plans={plans ?? []} />
    </div>
  );
}
