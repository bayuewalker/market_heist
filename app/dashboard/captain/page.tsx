import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCaptainTier } from "@/lib/captain";
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

  const { data: referralCode } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("captain_id", user.id)
    .maybeSingle();

  const { data: referred } = await supabase
    .from("captain_networks")
    .select("member_id, joined_at")
    .eq("captain_id", user.id)
    .order("joined_at", { ascending: false });

  const memberIds = [...new Set((referred ?? []).map((r) => r.member_id))];
  const { data: profiles } =
    memberIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", memberIds) : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const tier = getCaptainTier(referred?.length ?? 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Captain Network</h1>
          <p className="text-sm text-muted">Grow the community and earn a Captain Reward on the trades they make.</p>
        </div>
        {referralCode && (
          <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-strong">
            {tier}
          </span>
        )}
      </header>

      <CaptainCodeCard
        code={referralCode?.code ?? null}
        link={referralCode ? appUrl(`/signup?ref=${referralCode.code}`) : null}
      />

      {referralCode && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Your branch ({referred?.length ?? 0})
          </h2>
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
      )}
    </div>
  );
}
