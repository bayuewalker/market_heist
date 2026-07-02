-- Market Heist — on-chain USDT payments + membership expiry
-- Run in the Supabase SQL Editor after 0001 and 0002.

-- ---------------------------------------------------------------------------
-- Membership expiry on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists plan_expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- payments: one row per checkout order (on-chain USDT)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  plan_id      text not null references public.plans (id),
  period       text not null check (period in ('monthly', 'annual')),
  amount_usdt  numeric(18, 6) not null,
  address      text not null,
  network      text not null default 'tron-trc20',
  status       text not null default 'pending' check (status in ('pending', 'confirmed', 'expired')),
  tx_hash      text unique,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  confirmed_at timestamptz
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_pending_idx on public.payments (status, address, amount_usdt);

-- ---------------------------------------------------------------------------
-- RLS: users may only READ their own payments. All writes (create order,
-- confirm) happen server-side with the service role, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.payments enable row level security;

drop policy if exists "read own payments" on public.payments;
create policy "read own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Lock down plan changes: users can update their profile but NOT change
-- plan_id (plan changes only happen server-side after a verified payment).
-- This supersedes the 0002 policy.
-- ---------------------------------------------------------------------------
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and plan_id = (select p.plan_id from public.profiles p where p.id = auth.uid())
  );
