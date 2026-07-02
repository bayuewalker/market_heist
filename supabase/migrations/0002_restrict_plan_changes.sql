-- Market Heist — restrict self-service plan changes
-- Run this in the Supabase SQL Editor after 0001_init.sql.
--
-- The original "update own profile" policy let a client set plan_id to any
-- value, including 'elite' (signal_limit = null = unlimited), which would let
-- users self-upgrade entitlements and bypass the daily signal limit. This
-- restricts self-service plan changes to the non-privileged 'basic'/'pro'
-- tiers. Privileged tiers (e.g. 'elite') must be assigned server-side with the
-- service role or by an admin.

drop policy if exists "update own profile" on public.profiles;

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and plan_id in ('basic', 'pro'));
