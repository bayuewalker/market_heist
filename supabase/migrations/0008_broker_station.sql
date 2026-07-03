-- Market Heist — Broker Station + UID verification
-- Run in the Supabase SQL Editor after 0007.
--
-- Introduces the broker partner registry (`brokers`) and each member's
-- broker-linked account (`broker_accounts`), including the UID verification
-- workflow from the blueprint (submitted -> under_review -> verified /
-- rejected / duplicate / inactive). Verified broker accounts are the
-- eligibility gate for the reward engine and leaderboard (built in later
-- migrations).

-- ---------------------------------------------------------------------------
-- brokers: partner metadata + referral base URL (reference data)
-- ---------------------------------------------------------------------------
create table if not exists public.brokers (
  id                 text primary key,
  name               text not null,
  referral_base_url  text not null,
  markets            text[] not null default '{}',
  active             boolean not null default true,
  sort               integer not null default 0
);

alter table public.brokers enable row level security;

-- Public sees only active brokers; admins see everything (so an admin can
-- audit a broker before flipping it active).
drop policy if exists "brokers readable by everyone" on public.brokers;
create policy "brokers readable by everyone"
  on public.brokers for select
  using (active or public.is_admin());

-- ---------------------------------------------------------------------------
-- broker_accounts: one row per (user, broker) — the member's submitted UID
-- and its verification status.
-- ---------------------------------------------------------------------------
create table if not exists public.broker_accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  broker_id    text not null references public.brokers (id),
  uid          text not null,
  status       text not null default 'submitted'
               check (status in ('submitted', 'under_review', 'verified', 'rejected', 'duplicate', 'inactive')),
  note         text,
  verified_at  timestamptz,
  verified_by  uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, broker_id)
);

-- Lets admins spot the same UID submitted under multiple accounts.
create index if not exists broker_accounts_broker_uid_idx on public.broker_accounts (broker_id, uid);
create index if not exists broker_accounts_status_idx on public.broker_accounts (status);

alter table public.broker_accounts enable row level security;

drop policy if exists "read own broker accounts" on public.broker_accounts;
create policy "read own broker accounts"
  on public.broker_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "admin read all broker accounts" on public.broker_accounts;
create policy "admin read all broker accounts"
  on public.broker_accounts for select
  using (public.is_admin());

drop policy if exists "insert own broker account" on public.broker_accounts;
create policy "insert own broker account"
  on public.broker_accounts for insert
  with check (
    auth.uid() = user_id
    and status = 'submitted'
    and note is null
    and verified_at is null
    and verified_by is null
  );

drop policy if exists "update own broker account" on public.broker_accounts;
create policy "update own broker account"
  on public.broker_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "admin update all broker accounts" on public.broker_accounts;
create policy "admin update all broker accounts"
  on public.broker_accounts for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Guard trigger: verification status and admin-owned fields are
-- admin/service-only. A member may only edit their own row's `uid` (e.g. fix
-- a typo) while it's still 'submitted', or resubmit after a 'rejected'
-- verdict (which flips status back to 'submitted'). Once it's
-- under_review/verified/duplicate/inactive the row is locked to the member.
-- `note`, `broker_id`, and `created_at` are never member-editable — `note` is
-- the admin's review reason, `broker_id` identifies the row (a member wanting
-- a different broker submits a new row), and `created_at` is an audit field.
-- Mirrors the profiles privileged-field guard in 0006_fix_admin_review.sql.
-- ---------------------------------------------------------------------------
create or replace function public.guard_broker_account_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();

  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'rejected' and new.status = 'submitted')
  then
    raise exception 'Only an admin can change broker account status.';
  end if;

  if new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
     or new.note is distinct from old.note
     or new.broker_id is distinct from old.broker_id
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Only an admin can change broker account status.';
  end if;

  if old.status not in ('submitted', 'rejected') then
    raise exception 'This broker account is locked and cannot be edited.';
  end if;

  return new;
end;
$$;

drop trigger if exists broker_accounts_guard_privileged_fields on public.broker_accounts;
create trigger broker_accounts_guard_privileged_fields
  before update on public.broker_accounts
  for each row execute function public.guard_broker_account_privileged_fields();

-- ---------------------------------------------------------------------------
-- Seed broker partners (§4 of the blueprint). Referral URLs below are
-- placeholders — replace with your real partner referral links before
-- launch.
-- ---------------------------------------------------------------------------
insert into public.brokers (id, name, referral_base_url, markets, active, sort) values
  ('bitget', 'Bitget', 'https://www.bitget.com/referral/register?from=marketheist', array['crypto'], true, 1),
  ('kucoin', 'KuCoin', 'https://www.kucoin.com/r/rf/marketheist', array['crypto'], true, 2),
  ('bingx', 'BingX', 'https://bingx.com/invite/marketheist', array['crypto'], true, 3)
on conflict (id) do update set
  name              = excluded.name,
  referral_base_url = excluded.referral_base_url,
  markets           = excluded.markets,
  active            = excluded.active,
  sort              = excluded.sort;
