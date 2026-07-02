-- Market Heist — restrict self-service plan changes
-- Run this in the Supabase SQL Editor after 0001_init.sql.
--
-- The original "update own profile" policy let a client set plan_id to any
-- value, including 'elite' (signal_limit = null = unlimited), which would let
-- users self-upgrade entitlements and bypass the daily signal limit.
--
-- This policy allows a user to update their own profile as long as the
-- resulting plan_id is either a non-privileged self-service tier
-- ('basic'/'pro') OR unchanged from their current plan. That prevents
-- self-upgrades to privileged tiers (e.g. an admin-assigned 'elite') while
-- still letting those users edit other profile fields.

drop policy if exists "update own profile" on public.profiles;

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (
      plan_id in ('basic', 'pro')
      or plan_id = (select p.plan_id from public.profiles p where p.id = auth.uid())
    )
  );
