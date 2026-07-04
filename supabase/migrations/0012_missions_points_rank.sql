-- Market Heist — Missions, Heist Points, Heister Rank
-- Run in the Supabase SQL Editor after 0011.
--
-- The retention/gamification engine (Blueprint V1.1 §11.2 #13-15, §12.4-12.6).
-- Runs parallel to the cash reward_ledger (0009) — points never convert to
-- cash. Mission list + point values follow the MVP V1 Final Build Module
-- Decision doc (Module 9), which is the later, fully-pointed spec; it
-- differs slightly from Blueprint V1.1's own §12.4/§12.5 on a few
-- mission-to-action mappings (see issue #21 for the comparison).

-- ---------------------------------------------------------------------------
-- missions: catalog (seeded below)
-- ---------------------------------------------------------------------------
create table if not exists public.missions (
  id             uuid primary key default gen_random_uuid(),
  mission_key    text not null unique,
  public_name    text not null,
  description    text,
  points_reward  integer not null check (points_reward >= 0),
  trigger_type   text not null,
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.missions enable row level security;

drop policy if exists "missions readable by everyone" on public.missions;
create policy "missions readable by everyone"
  on public.missions for select
  using (is_active or public.is_admin());

-- ---------------------------------------------------------------------------
-- user_missions: per-user mission state. `completed_at` is set once the
-- system detects the trigger condition; `claimed_at` is set once the member
-- claims the reward (POST /api/missions/:id/claim), which is what actually
-- writes to heist_points_ledger. Two-step by design (matches the blueprint's
-- claimed_at column and claim endpoint) rather than auto-crediting on detect.
-- ---------------------------------------------------------------------------
create table if not exists public.user_missions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  mission_id    uuid not null references public.missions (id),
  status        text not null default 'pending' check (status in ('pending', 'completed', 'claimed')),
  completed_at  timestamptz,
  claimed_at    timestamptz,
  unique (user_id, mission_id)
);

create index if not exists user_missions_user_idx on public.user_missions (user_id);

alter table public.user_missions enable row level security;

drop policy if exists "read own user missions" on public.user_missions;
create policy "read own user missions"
  on public.user_missions for select
  using (auth.uid() = user_id);

drop policy if exists "admin read all user missions" on public.user_missions;
create policy "admin read all user missions"
  on public.user_missions for select
  using (public.is_admin());

-- All writes (completion detection, claim) happen server-side via the
-- service role, so there is no insert/update policy for regular users.

-- ---------------------------------------------------------------------------
-- heist_points_ledger: append-only, non-cash loyalty ledger (§12.5
-- non-negotiable — never store only a mutable balance). Mirrors
-- reward_ledger's guard-trigger pattern from 0009.
-- ---------------------------------------------------------------------------
create table if not exists public.heist_points_ledger (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  source_type    text not null check (source_type in ('mission', 'manual_adjustment')),
  source_id      uuid,
  points_delta   integer not null,
  balance_after  integer not null,
  reason         text,
  created_at     timestamptz not null default now()
);

create index if not exists heist_points_ledger_user_idx on public.heist_points_ledger (user_id, created_at desc);

alter table public.heist_points_ledger enable row level security;

drop policy if exists "read own heist points" on public.heist_points_ledger;
create policy "read own heist points"
  on public.heist_points_ledger for select
  using (auth.uid() = user_id);

drop policy if exists "admin read all heist points" on public.heist_points_ledger;
create policy "admin read all heist points"
  on public.heist_points_ledger for select
  using (public.is_admin());

create or replace function public.guard_heist_points_ledger_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'heist_points_ledger rows are append-only and cannot be updated or deleted. Insert a correcting row instead.';
end;
$$;

drop trigger if exists heist_points_ledger_guard_update on public.heist_points_ledger;
create trigger heist_points_ledger_guard_update
  before update on public.heist_points_ledger
  for each row execute function public.guard_heist_points_ledger_immutable_fields();

drop trigger if exists heist_points_ledger_guard_delete on public.heist_points_ledger;
create trigger heist_points_ledger_guard_delete
  before delete on public.heist_points_ledger
  for each row execute function public.guard_heist_points_ledger_immutable_fields();

-- ---------------------------------------------------------------------------
-- heister_ranks: thresholds (§12.6). `min_points` is null for campaign-only
-- ranks (Genesis Heister) — the rank lookup ignores null-threshold rows when
-- picking the highest rank a point total qualifies for.
-- ---------------------------------------------------------------------------
create table if not exists public.heister_ranks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  min_points  integer,
  rules_json  jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  sort_order  integer not null default 0
);

alter table public.heister_ranks enable row level security;

drop policy if exists "heister ranks readable by everyone" on public.heister_ranks;
create policy "heister ranks readable by everyone"
  on public.heister_ranks for select
  using (active or public.is_admin());

-- ---------------------------------------------------------------------------
-- Risk Calibration mission needs a data point to check against — a minimal
-- risk profile field on profiles (Blueprint's Intelligence Engine mentions
-- "Risk Profile" as a feature; this is the smallest useful version of it).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists risk_profile text check (risk_profile in ('conservative', 'moderate', 'aggressive'));

-- ---------------------------------------------------------------------------
-- Seed missions (Final Build Module Decision, Module 9).
-- ---------------------------------------------------------------------------
insert into public.missions (mission_key, public_name, description, points_reward, trigger_type, sort_order) values
  ('first_contact',       'First Contact',       'Complete your trader profile.',            100, 'complete_profile',      1),
  ('enter_the_hideout',   'Enter The Hideout',   'Link your Telegram account.',               100, 'join_telegram',         2),
  ('enter_the_station',   'Enter The Station',   'Log in to the dashboard.',                   50, 'login_dashboard',       3),
  ('broker_infiltration', 'Broker Infiltration', 'Submit a broker UID.',                       300, 'submit_broker_uid',     4),
  ('verified_raider',     'Verified Raider',     'Get a broker UID verified.',                 500, 'uid_verified',          5),
  ('signal_intercept',    'Signal Intercept',    'Read your first signal.',                     25, 'read_first_signal',     6),
  ('recruit_heister',     'Recruit Heister',     'Refer one member.',                          250, 'refer_member',          7),
  ('risk_calibration',    'Risk Calibration',    'Complete your risk profile.',                150, 'complete_risk_profile', 8)
on conflict (mission_key) do update set
  public_name   = excluded.public_name,
  description   = excluded.description,
  points_reward = excluded.points_reward,
  trigger_type  = excluded.trigger_type,
  sort_order    = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Seed rank thresholds (§12.6).
-- ---------------------------------------------------------------------------
insert into public.heister_ranks (name, min_points, sort_order) values
  ('Rookie Heister', 0, 1),
  ('Signal Hunter', 250, 2),
  ('Broker Raider', 750, 3),
  ('Tactical Operator', 1500, 4)
on conflict (name) do update set
  min_points = excluded.min_points,
  sort_order = excluded.sort_order;

insert into public.heister_ranks (name, min_points, rules_json, sort_order) values
  ('Genesis Heister', null, '{"assignment": "campaign-only, see Genesis Pass eligibility (M11)"}'::jsonb, 5)
on conflict (name) do nothing;
