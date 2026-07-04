import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCaptainTier, getOrCreateReferralCode } from "@/lib/captain";
import { appUrl } from "@/lib/telegram";
import CaptainCodeCard from "@/components/dashboard/CaptainCodeCard";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export default async function CaptainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "captain") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Captain Network</h1>
          <p className="text-sm text-muted">Grow the community and earn a Captain Reward on the trades they make.</p>
        </header>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-border-subtle bg-surface/40 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-muted ring-1 ring-inset ring-border-subtle">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-foreground">The captain role is admin-assigned</p>
            <p className="text-sm text-muted">Ask an admin to promote you to Captain to get your referral link.</p>
          </div>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  // Pull-based, mirrors syncMissionCompletions/syncGenesisEligibility: a
  // captain's code is normally created the moment an admin promotes them
  // (app/api/admin/users/[id]/route.ts), this is just a defensive fallback.
  const codeResult = await getOrCreateReferralCode(admin, user.id);
  const code = "code" in codeResult ? codeResult.code : null;

  const { data: referred } = await supabase
    .from("captain_networks")
    .select("member_id, joined_at")
    .eq("captain_id", user.id)
    .order("joined_at", { ascending: false });

  // profiles' RLS only allows reading your own row, so looking up referred
  // members' names needs the service role — full_name isn't sensitive and
  // it's the one field this query selects.
  const memberIds = [...new Set((referred ?? []).map((r) => r.member_id))];
  const { data: profiles } =
    memberIds.length > 0 ? await admin.from("profiles").select("id, full_name").in("id", memberIds) : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const referredCount = referred?.length ?? 0;
  const tier = getCaptainTier(referredCount);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Captain Network</h1>
          <p className="text-sm text-muted">Grow the community and earn a Captain Reward on the trades they make.</p>
        </div>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-strong">
          {tier ? `${tier.name} · ${(tier.rewardRate * 100).toFixed(0)}%` : "Unranked"}
        </span>
      </header>

      {!tier && (
        <p className="text-xs text-muted">
          Reach 5 referred members to unlock Scout tier and start earning Captain Reward on their trades.
        </p>
      )}

      <CaptainCodeCard code={code} link={code ? appUrl(`/signup?ref=${code}`) : null} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your branch ({referredCount})</h2>
        {referred && referred.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-2">
            {referred.map((r) => (
              <div key={r.member_id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
                <p className="text-sm font-medium text-foreground">
                  {profileById.get(r.member_id)?.full_name?.trim() || `Heister ${r.member_id.slice(0, 4)}`}
                </p>
                <p className="text-xs text-muted">Joined {fmtDate(r.joined_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/50 p-10 text-center">
            <p className="font-medium text-foreground">No referrals yet</p>
            <p className="mt-1 text-sm text-muted">Share your link above to start your branch.</p>
          </div>
        )}
      </div>
    </div>
  );
}
