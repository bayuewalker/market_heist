import { redirect } from "next/navigation";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGenesisEligibility, GENESIS_POINTS_THRESHOLD } from "@/lib/genesis";
import JoinGenesisButton from "@/components/dashboard/JoinGenesisButton";

export const dynamic = "force-dynamic";

export default async function GenesisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { checklist, isEligible, reservationId } = await syncGenesisEligibility(admin, user.id);

  const items = [
    { label: "Telegram linked", met: checklist.telegramLinked, href: "/dashboard/account" },
    { label: "Profile completed", met: checklist.profileCompleted, href: "/dashboard/account" },
    { label: "Broker UID submitted", met: checklist.brokerUidSubmitted, href: "/dashboard/broker" },
    { label: "Broker UID verified", met: checklist.brokerUidVerified, href: "/dashboard/broker" },
    { label: `≥${GENESIS_POINTS_THRESHOLD.toLocaleString()} Heist Points`, met: checklist.pointsThresholdMet, href: "/dashboard/missions" },
    { label: "Joined the Genesis campaign", met: checklist.joinedCampaign, href: null },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Genesis Pass</h1>
        <p className="text-sm text-muted">
          An off-chain eligibility checklist for the Genesis campaign — no NFT minting yet, that&apos;s a future
          phase.
        </p>
      </header>

      {isEligible && reservationId ? (
        <div className="gradient-border flex flex-col gap-2 rounded-2xl border border-accent/40 bg-surface-2 p-6">
          <p className="text-sm font-medium text-accent-strong">You&apos;re eligible for the Genesis Pass</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{reservationId}</p>
          <p className="text-xs text-muted">
            This reservation ID is yours to keep — it won&apos;t be revoked even if your point balance changes
            later.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/40 p-6">
          <p className="text-sm font-medium text-foreground">Not yet eligible</p>
          <p className="mt-1 text-sm text-muted">Complete every requirement below to reserve your Genesis Pass.</p>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  item.met ? "bg-accent/15 text-accent-strong" : "bg-white/5 text-muted"
                }`}
              >
                {item.met ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
              <p className="text-sm text-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {!checklist.joinedCampaign && <JoinGenesisButton />}
    </div>
  );
}
