"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PlanRow } from "@/lib/supabase/types";

function priceLabel(plan: PlanRow) {
  if (plan.price_monthly === null) return "—";
  if (plan.price_monthly === 0) return "Free";
  return `$${plan.price_monthly}/mo`;
}

export default function AccountPlanForm({
  userId,
  currentPlanId,
  plans,
}: {
  userId: string;
  currentPlanId: string;
  plans: PlanRow[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(currentPlanId);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(planId: string) {
    if (planId === current || planId === "elite") return;
    setSaving(planId);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ plan_id: planId })
      .eq("id", userId);
    if (updateError) {
      setError(updateError.message);
      setSaving(null);
      return;
    }
    setCurrent(planId);
    setSaving(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const active = plan.id === current;
          const comingSoon = plan.id === "elite";
          return (
            <div
              key={plan.id}
              className={`flex flex-col gap-3 rounded-2xl border p-5 transition-colors ${
                active ? "border-accent/50 bg-surface-2" : "border-border-subtle bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{plan.name}</h3>
                {active && <Check className="h-4 w-4 text-accent-strong" aria-hidden="true" />}
              </div>
              <p className="text-2xl font-bold text-foreground">{priceLabel(plan)}</p>
              <ul className="flex flex-1 flex-col gap-1.5 text-xs text-muted">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent-strong" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => choose(plan.id)}
                disabled={active || comingSoon || saving !== null}
                className={`mt-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "cursor-default bg-white/5 text-muted"
                    : comingSoon
                      ? "cursor-not-allowed bg-white/5 text-muted"
                      : "bg-accent text-[#06120d] hover:bg-accent-strong disabled:opacity-60"
                }`}
              >
                {saving === plan.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {active ? "Current plan" : comingSoon ? "Coming soon" : "Switch"}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">
        No payment required during beta — plan changes apply instantly. Billing (Stripe) comes later.
      </p>
    </div>
  );
}
