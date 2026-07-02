-- Market Heist — harden payments (review follow-up)
-- Run in the Supabase SQL Editor after 0003.

-- Throttle on-chain checks driven by client polling.
alter table public.payments
  add column if not exists last_checked_at timestamptz;

-- Lock BOTH plan_id and plan_expires_at from client-side edits. Plan and
-- expiry only change server-side (service role) after a verified payment.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and plan_id = (select p.plan_id from public.profiles p where p.id = auth.uid())
    and plan_expires_at is not distinct from
      (select p.plan_expires_at from public.profiles p where p.id = auth.uid())
  );
