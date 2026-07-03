-- Market Heist — fix admin-role review findings
-- Run in the Supabase SQL Editor after 0005.
--
-- 0004's "update own profile" policy only pinned plan_id/plan_expires_at via
-- a self-referencing WITH CHECK subquery — it never mentioned `role` at all,
-- so any authenticated user could UPDATE their own profile and set
-- role = 'admin', instantly granting themselves admin-scoped RLS access.
-- Self-referencing subqueries in WITH CHECK are also fragile/ambiguous for
-- "this column must not change" checks. This migration replaces that
-- approach with a BEFORE UPDATE trigger, which gets true OLD/NEW row values
-- and is the reliable way to enforce column immutability regardless of which
-- RLS policy authorized the row-level access.

-- ---------------------------------------------------------------------------
-- Trigger: block non-admins from changing plan_id / plan_expires_at / role,
-- no matter which policy let the UPDATE through. Service-role writes (used by
-- payment confirmation and the admin API route, both already gated by
-- application-level checks) bypass this guard.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if new.plan_id is distinct from old.plan_id
     or new.plan_expires_at is distinct from old.plan_expires_at
     or new.role is distinct from old.role
  then
    raise exception 'Only an admin can change plan_id, plan_expires_at, or role.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_fields on public.profiles;
create trigger profiles_guard_privileged_fields
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();

-- Now that the trigger is the enforcement point, simplify the self-update
-- policy back to a plain "own row" check (no more fragile subqueries).
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Aggregate confirmed USDT revenue server-side instead of the admin overview
-- page fetching every confirmed payment row to sum client-side. security
-- invoker (default) so RLS still applies: an admin sees the true total
-- (their "read all payments" policy), a regular member would only see their
-- own (harmless — nothing calls this outside the admin-guarded page).
-- ---------------------------------------------------------------------------
create or replace function public.admin_confirmed_revenue()
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(amount_usdt), 0) from public.payments where status = 'confirmed';
$$;
