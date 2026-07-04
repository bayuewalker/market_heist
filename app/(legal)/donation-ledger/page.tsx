import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Donation Ledger",
  description: "Public record of confirmed donations from Market Heist AI's donation pool.",
};

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

/** Defense-in-depth: only ever render an http(s) proof link, even though the admin API already validates on write. */
function safeProofUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default async function DonationLedgerPage() {
  const supabase = await createClient();
  const { data: donations } = await supabase
    .from("donation_ledger")
    .select("*")
    .order("created_at", { ascending: false });

  const total = (donations ?? []).reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <article>
      <h1>Donation Ledger</h1>
      <p>
        A portion of the backend commission Market Heist AI receives from broker partners is set aside
        for a donation pool. This page lists every confirmed donation payout so the community can see
        exactly where it went.
      </p>

      <p className="mt-4 text-sm font-medium text-foreground">
        Total confirmed donations: {fmtUsd(total)}
      </p>

      <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-2">
        {(donations ?? []).map((d) => {
          const proofUrl = safeProofUrl(d.proof_url);
          return (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">{d.description}</p>
                <p className="text-xs text-muted">
                  {d.period}
                  {proofUrl && (
                    <>
                      {" · "}
                      <a href={proofUrl} target="_blank" rel="noopener noreferrer nofollow">
                        Proof
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <p className="text-sm font-semibold tabular-nums text-foreground">{fmtUsd(Number(d.amount))}</p>
                <p className="text-xs text-muted">{fmtDate(d.created_at)}</p>
              </div>
            </div>
          );
        })}
        {(!donations || donations.length === 0) && (
          <p className="px-3 py-8 text-center text-sm text-muted">No confirmed donations yet.</p>
        )}
      </div>
    </article>
  );
}
