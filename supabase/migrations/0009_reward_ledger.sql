-- Market Heist — Commission import + Reward Ledger + audit log
-- Run in the Supabase SQL Editor after 0008.
--
-- Implements the cash reward engine (blueprint §5/§14): admin imports a
-- broker's commission CSV for a period, rows are matched against verified
-- broker_accounts, and the matched backend commission is split into a
-- reward_ledger — the source of truth for member reward payouts.
--
-- `audit_logs` is pulled forward from the M11 plan because M5's approve/
-- mark-paid actions need somewhere to log to; M11 will backfill logging
-- into earlier admin actions (e.g. M4's UID verification).

-- ---------------------------------------------------------------------------
-- commission_imports: one row per (broker, period) CSV import session
-- ---------------------------------------------------------------------------
create table if not exists public.commission_imports (
  id           uuid primary key default gen_random_uuid(),
  broker_id    text not null references public.brokers (id),
  period       text not null,
  source       text not null default 'csv' check (source in ('csv', 'api', 'manual')),
  row_count    integer not null default 0,
  imported_by  uuid references auth.users (id),
  created_at   timestamptz not null default now()
);

create index if not exists commission_imports_broker_period_idx
  on public.commission_imports (broker_id, period);

alter table public.commission_imports enable row level security;

-- Admin-only. All writes happen server-side via the service role (the admin
-- commission-upload route), so there is no insert/update policy — RLS
-- defaults to deny, and service-role requests bypass RLS entirely.
drop policy if exists "admin read commission imports" on public.commission_imports;
create policy "admin read commission imports"
  on public.commission_imports for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- commission_rows: one row per matched (or unmatched) CSV line
-- ---------------------------------------------------------------------------
create table if not exists public.commission_rows (
  id                  uuid primary key default gen_random_uuid(),
  import_id           uuid not null references public.commission_imports (id) on delete cascade,
  broker_id           text not null references public.brokers (id),
  uid                 text not null,
  volume              numeric(18, 2),
  fees                numeric(18, 6),
  backend_commission  numeric(18, 6) not null,
  matched_user_id     uuid references auth.users (id),
  for_period          text not null,
  created_at          timestamptz not null default now()
);

create index if not exists commission_rows_import_idx on public.commission_rows (import_id);
create index if not exists commission_rows_matched_user_idx on public.commission_rows (matched_user_id);

alter table public.commission_rows enable row level security;

drop policy if exists "admin read commission rows" on public.commission_rows;
create policy "admin read commission rows"
  on public.commission_rows for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- reward_ledger: the split of each matched row's backend commission into
-- Member / Captain / Leaderboard / Campaign / Donation / Operation
-- allocations (blueprint §5's "Backend Pool Allocation"). Append-only — a
-- correction is a new row, never an edit of amount/allocation_type.
-- `user_id` is null for house allocations (donation, operation) that have no
-- individual recipient.
-- ---------------------------------------------------------------------------
create table if not exists public.reward_ledger (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users (id),
  source_type        text not null default 'commission_row'
                     check (source_type in ('commission_row', 'manual', 'campaign')),
  allocation_type    text not null
                     check (allocation_type in ('member', 'captain', 'leaderboard', 'campaign', 'donation', 'operation')),
  amount             numeric(18, 6) not null,
  status             text not null default 'pending'
                     check (status in ('estimated', 'pending', 'approved', 'paid')),
  period             text,
  commission_row_id  uuid references public.commission_rows (id),
  created_at         timestamptz not null default now(),
  approved_at        timestamptz,
  approved_by        uuid references auth.users (id),
  paid_at            timestamptz,
  paid_by            uuid references auth.users (id)
);

create index if not exists reward_ledger_user_idx on public.reward_ledger (user_id, created_at desc);
create index if not exists reward_ledger_status_idx on public.reward_ledger (status);
create index if not exists reward_ledger_commission_row_idx on public.reward_ledger (commission_row_id);

alter table public.reward_ledger enable row level security;

drop policy if exists "read own reward ledger" on public.reward_ledger;
create policy "read own reward ledger"
  on public.reward_ledger for select
  using (auth.uid() = user_id);

drop policy if exists "admin read all reward ledger" on public.reward_ledger;
create policy "admin read all reward ledger"
  on public.reward_ledger for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- audit_logs: admin/system action history (pulled forward from M11)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users (id),
  action      text not null,
  target_type text not null,
  target_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_target_idx on public.audit_logs (target_type, target_id);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "admin read audit logs" on public.audit_logs;
create policy "admin read audit logs"
  on public.audit_logs for select
  using (public.is_admin());
