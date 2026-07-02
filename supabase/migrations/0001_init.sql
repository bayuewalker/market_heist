-- Market Heist — initial schema
-- Run this in the Supabase SQL Editor (project: tcrerqdfvpbbyshvsaqm)
-- Safe to re-run: uses IF NOT EXISTS / idempotent policies where possible.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- plans: public membership tiers (reference data)
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id            text primary key,
  name          text not null,
  price_monthly integer,
  signal_limit  integer,               -- null = unlimited
  features      text[] not null default '{}',
  badge         text,
  sort          integer not null default 0
);

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  plan_id    text not null default 'basic' references public.plans (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- signals: request context + AI-generated output, one row per request
-- ---------------------------------------------------------------------------
create table if not exists public.signals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  pair       text not null,
  market     text check (market in ('crypto','forex','commodity')),
  timeframe  text,
  bias       text not null default 'neutral' check (bias in ('long','short','neutral')),
  entry      numeric,
  target     numeric,
  stop       numeric,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  technique  text,
  rationale  text,
  status     text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now()
);

create index if not exists signals_user_created_idx
  on public.signals (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.plans    enable row level security;
alter table public.profiles enable row level security;
alter table public.signals  enable row level security;

-- plans: readable by anyone (anon + authenticated)
drop policy if exists "plans are readable by everyone" on public.plans;
create policy "plans are readable by everyone"
  on public.plans for select
  using (true);

-- profiles: a user can read and update only their own row
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- signals: a user can read/insert/update/delete only their own rows
drop policy if exists "read own signals" on public.signals;
create policy "read own signals"
  on public.signals for select
  using (auth.uid() = user_id);

drop policy if exists "insert own signals" on public.signals;
create policy "insert own signals"
  on public.signals for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own signals" on public.signals;
create policy "update own signals"
  on public.signals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own signals" on public.signals;
create policy "delete own signals"
  on public.signals for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Seed membership plans
-- ---------------------------------------------------------------------------
insert into public.plans (id, name, price_monthly, signal_limit, features, badge, sort) values
  (
    'basic',
    'Market Heister Basic',
    0,
    3,
    array[
      'Daily trend updates',
      '3 signal pair recommendations',
      'Weekly live trade session & mentoring'
    ],
    null,
    1
  ),
  (
    'pro',
    'Market Heist Pro',
    32,
    10,
    array[
      'Daily trend updates',
      '10 signal pair recommendations',
      'Crypto, forex & commodity market signals',
      'Live trade session & mentoring every weekday'
    ],
    'Popular',
    2
  ),
  (
    'elite',
    'Market Heist Elite',
    null,
    null,
    array[
      'Daily trend updates',
      'Signal requests unlocked for any market pair',
      'Live trade session & mentoring every weekday',
      'Commodity, crypto & forex market signals',
      'Monthly workshop for Elite members only'
    ],
    'Coming soon',
    3
  )
on conflict (id) do update set
  name          = excluded.name,
  price_monthly = excluded.price_monthly,
  signal_limit  = excluded.signal_limit,
  features      = excluded.features,
  badge         = excluded.badge,
  sort          = excluded.sort;
