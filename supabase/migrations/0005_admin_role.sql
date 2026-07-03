-- Market Heist — admin role + admin-scoped RLS
-- Run in the Supabase SQL Editor after 0004.

-- ---------------------------------------------------------------------------
-- Role column on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'member' check (role in ('member', 'admin'));

-- ---------------------------------------------------------------------------
-- is_admin(): security-definer helper so RLS policies can check the caller's
-- role without recursing into the profiles RLS they're themselves guarding.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Admins can read/update every profile (not just their own). Regular users
-- keep their existing self-only policies (from 0002/0003/0004) — this ADDS an
-- admin-only policy alongside them; Postgres RLS OR's permissive policies.
-- ---------------------------------------------------------------------------
drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "admin update all profiles" on public.profiles;
create policy "admin update all profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Admins can read every signal / payment (still can't impersonate writes as
-- another user — inserts remain self-only via the existing policies).
-- ---------------------------------------------------------------------------
drop policy if exists "admin read all signals" on public.signals;
create policy "admin read all signals"
  on public.signals for select
  using (public.is_admin());

drop policy if exists "admin read all payments" on public.payments;
create policy "admin read all payments"
  on public.payments for select
  using (public.is_admin());
