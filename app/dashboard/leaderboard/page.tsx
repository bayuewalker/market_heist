import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeaderboardBoard } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const BOARDS: { key: LeaderboardBoard; label: string; requiresVerifiedUid: boolean; format: (score: number) => string }[] = [
  {
    key: "volume",
    label: "Volume",
    requiresVerifiedUid: true,
    format: (s) => `${s.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT`,
  },
  {
    key: "reward",
    label: "Reward",
    requiresVerifiedUid: true,
    format: (s) => `${s.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`,
  },
  { key: "discipline", label: "Discipline", requiresVerifiedUid: false, format: (s) => s.toFixed(3) },
  { key: "captain", label: "Captain", requiresVerifiedUid: true, format: (s) => `${s} referred` },
  { key: "points", label: "Points", requiresVerifiedUid: false, format: (s) => `${s.toLocaleString()} HP` },
];

function displayName(profile: { full_name: string | null } | undefined, userId: string) {
  return profile?.full_name?.trim() || `Heister ${userId.slice(0, 4)}`;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { board: boardKey } = await searchParams;
  const activeBoard = BOARDS.find((b) => b.key === boardKey) ?? BOARDS[0];

  const { data: rawEntries } = await supabase
    .from("leaderboard_entries")
    .select("user_id, score, rank, metrics")
    .eq("board", activeBoard.key)
    .eq("period", "all_time")
    .order("rank", { ascending: true })
    .limit(20);
  // leaderboard_entries.score is a Postgres numeric — PostgREST can return
  // numeric columns as strings to avoid float precision loss, so coerce
  // before any arithmetic/formatting.
  const entries = (rawEntries ?? []).map((e) => ({ ...e, score: Number(e.score) }));

  const { data: rawOwnEntry } = await supabase
    .from("leaderboard_entries")
    .select("score, rank")
    .eq("board", activeBoard.key)
    .eq("period", "all_time")
    .eq("user_id", user.id)
    .maybeSingle();
  const ownEntry = rawOwnEntry ? { ...rawOwnEntry, score: Number(rawOwnEntry.score) } : null;

  // profiles' RLS only allows reading your own row, so a cross-user name
  // lookup needs the service role — full_name isn't sensitive and this is
  // the one field this query selects.
  const admin = createAdminClient();
  const userIds = [...new Set(entries.map((e) => e.user_id))];
  const { data: profiles } =
    userIds.length > 0 ? await admin.from("profiles").select("id, full_name").in("id", userIds) : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const ownRankShown = entries.some((e) => e.user_id === user.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted">
          Volume, Reward, and Captain boards require a verified broker UID (real trading activity).
          Discipline and Points are open to every signed-in Heister.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {BOARDS.map((b) => (
          <Link
            key={b.key}
            href={b.key === BOARDS[0].key ? "/dashboard/leaderboard" : `/dashboard/leaderboard?board=${b.key}`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              b.key === activeBoard.key
                ? "border-accent/50 bg-accent/10 text-accent-strong"
                : "border-border-subtle text-muted hover:border-accent/30 hover:text-foreground"
            }`}
          >
            {b.label}
          </Link>
        ))}
      </nav>

      {activeBoard.requiresVerifiedUid && (
        <p className="text-xs text-muted">
          Ranked members have a verified broker UID.{" "}
          <Link href="/dashboard/broker" className="text-accent-strong hover:underline">
            Verify yours
          </Link>{" "}
          to be eligible.
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-2">
        {entries && entries.length > 0 ? (
          entries.map((entry) => {
            const isSelf = entry.user_id === user.id;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                  isSelf ? "bg-accent/10 ring-1 ring-inset ring-accent/25" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-muted">
                    {entry.rank}
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {displayName(profileById.get(entry.user_id), entry.user_id)}
                    {isSelf && <span className="ml-1.5 text-xs text-accent-strong">(you)</span>}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-foreground">{activeBoard.format(entry.score)}</p>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Trophy className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="text-sm text-muted">No ranked members yet on this board.</p>
          </div>
        )}
      </div>

      {!ownRankShown && ownEntry && (
        <p className="text-sm text-muted">
          Your rank: <span className="font-semibold text-foreground">#{ownEntry.rank}</span> ·{" "}
          {activeBoard.format(ownEntry.score)}
        </p>
      )}

      <p className="text-xs text-muted">
        Boards recompute periodically — scores may lag your latest activity by a few hours.
      </p>
    </div>
  );
}
