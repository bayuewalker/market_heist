-- Market Heist — Trust & Compliance Layer (M12)
-- Run in the Supabase SQL Editor after 0015.
--
-- Blueprint V1.1 §15, §24.1. Adds the Donation Ledger's data source — the
-- rest of M12 (Trust pages, audit-log backfill, compliance-copy audit) is
-- application code, not schema.

-- ---------------------------------------------------------------------------
-- donation_ledger: admin-curated record of confirmed donation-bucket payouts
-- (blueprint §5 "Backend Pool Allocation" donation share), shown on the
-- public Donation Ledger transparency page. Genuinely public data (unlike
-- leaderboard_entries/referral_codes, which are member-only) — a
-- transparency report is meant to be readable by anyone, signed in or not.
-- Writes are admin-only via the service-role client
-- (POST/DELETE /api/admin/donations); there is no insert/update/delete
-- policy below because RLS only needs to gate the anon/authenticated roles
-- the API surfaces, not the service role, which bypasses RLS entirely.
-- ---------------------------------------------------------------------------
create table if not exists public.donation_ledger (
  id          uuid primary key default gen_random_uuid(),
  period      text not null,
  amount      numeric(18, 6) not null,
  description text not null,
  proof_url   text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists donation_ledger_period_idx on public.donation_ledger (period);

alter table public.donation_ledger enable row level security;

drop policy if exists "donation ledger readable by everyone" on public.donation_ledger;
create policy "donation ledger readable by everyone"
  on public.donation_ledger for select
  using (true);
