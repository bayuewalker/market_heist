-- Market Heist — Unified Leaderboard + Captain Network v1 + Genesis Pass Eligibility
-- Run in the Supabase SQL Editor after 0014.
--
-- Blueprint V1.1 §11.2 #16-17/#19, §22, §23, §12.7. Data model per the
-- founder-approved table in WORKING_PLAN.md §4.

-- ---------------------------------------------------------------------------
-- Widen profiles.role to add 'captain' — a self-service status (any member
-- can generate a referral code and become a captain), not an admin-granted
-- privilege like 'admin'. Existing guard trigger (0006) already allows any
-- value change only via admin/service-role, so this is safe to widen.
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('member', 'admin', 'captain'));

-- ---------------------------------------------------------------------------
-- referral_codes: Captain Code V1 — one stable code per captain. Public read
-- (needed to validate a code exists before signup); writes are server-side
-- only (POST /api/captain/code), never a direct client insert.
-- ---------------------------------------------------------------------------
create table if not exists public.referral_codes (
  code        text primary key,
  captain_id  uuid not null references auth.users (id) on delete cascade,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists referral_codes_captain_idx on public.referral_codes (captain_id);

alter table public.referral_codes enable row level security;

drop policy if exists "referral codes readable by everyone" on public.referral_codes;
create policy "referral codes readable by everyone"
  on public.referral_codes for select
  using (true);

-- ---------------------------------------------------------------------------
-- captain_networks: captain <-> referred-member link, one row per referred
-- member (first-attribution wins — member_id is unique). Written by
-- handle_new_user() below at signup time, never directly by a client.
-- ---------------------------------------------------------------------------
create table if not exists public.captain_networks (
  id             uuid primary key default gen_random_uuid(),
  captain_id     uuid not null references auth.users (id) on delete cascade,
  member_id      uuid not null unique references auth.users (id) on delete cascade,
  referral_code  text not null references public.referral_codes (code),
  joined_at      timestamptz not null default now()
);

create index if not exists captain_networks_captain_idx on public.captain_networks (captain_id);

alter table public.captain_networks enable row level security;

drop policy if exists "captain reads own branch" on public.captain_networks;
create policy "captain reads own branch"
  on public.captain_networks for select
  using (auth.uid() = captain_id);

drop policy if exists "admin reads all captain networks" on public.captain_networks;
create policy "admin reads all captain networks"
  on public.captain_networks for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- leaderboard_entries: unified snapshot for all 5 board types (§22). Public
-- read (motivational, not sensitive) — writes are server-side only, via the
-- periodic recompute job (POST /api/leaderboard/recompute).
-- ---------------------------------------------------------------------------
create table if not exists public.leaderboard_entries (
  id           uuid primary key default gen_random_uuid(),
  board        text not null check (board in ('volume', 'reward', 'discipline', 'captain', 'points')),
  period       text not null default 'all_time',
  user_id      uuid not null references auth.users (id) on delete cascade,
  score        numeric not null default 0,
  rank         integer,
  metrics      jsonb not null default '{}'::jsonb,
  computed_at  timestamptz not null default now(),
  unique (board, period, user_id)
);

create index if not exists leaderboard_entries_board_idx on public.leaderboard_entries (board, period, rank);

alter table public.leaderboard_entries enable row level security;

drop policy if exists "leaderboard entries readable by everyone" on public.leaderboard_entries;
create policy "leaderboard entries readable by everyone"
  on public.leaderboard_entries for select
  using (true);

-- ---------------------------------------------------------------------------
-- genesis_eligibility: off-chain Genesis Pass eligibility tracker (§12.7).
-- Sticky by design — once eligible_at is set, it's never cleared even if the
-- member later drops below a threshold (e.g. an admin points deduction);
-- a "reservation" is not meant to be revocable that way. Written server-side
-- only, pull-based (checked on /dashboard/genesis page load, mirrors
-- syncMissionCompletions()'s pattern from M8).
-- ---------------------------------------------------------------------------
create table if not exists public.genesis_eligibility (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  campaign_key      text not null default 'genesis',
  is_eligible       boolean not null default false,
  reservation_id    text unique,
  requirements_json jsonb not null default '{}'::jsonb,
  eligible_at       timestamptz,
  exported_at       timestamptz,
  unique (user_id, campaign_key)
);

alter table public.genesis_eligibility enable row level security;

drop policy if exists "read own genesis eligibility" on public.genesis_eligibility;
create policy "read own genesis eligibility"
  on public.genesis_eligibility for select
  using (auth.uid() = user_id);

drop policy if exists "admin read all genesis eligibility" on public.genesis_eligibility;
create policy "admin read all genesis eligibility"
  on public.genesis_eligibility for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles.genesis_joined_at: self-service "I want to join the Genesis
-- campaign" opt-in, same class as risk_profile/ai_consent_at — not
-- guard-triggered, a member sets this on themselves directly.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists genesis_joined_at timestamptz;

-- ---------------------------------------------------------------------------
-- Referral attribution at signup: extend the existing new-user trigger to
-- also record captain_networks when the signup carried a ref code in
-- auth.users.raw_user_meta_data (set by the signup form). A captain can't
-- refer themselves, and an inactive/unknown code is silently ignored rather
-- than blocking account creation.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref_code   text;
  v_captain_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  v_ref_code := new.raw_user_meta_data ->> 'ref_code';
  if v_ref_code is not null then
    select captain_id into v_captain_id
      from public.referral_codes
      where code = v_ref_code and active and captain_id != new.id;

    if v_captain_id is not null then
      insert into public.captain_networks (captain_id, member_id, referral_code)
      values (v_captain_id, new.id, v_ref_code)
      on conflict (member_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;
