-- Market Heist — daily trend updates
-- Run in the Supabase SQL Editor after 0006.

create table if not exists public.trend_updates (
  id         uuid primary key default gen_random_uuid(),
  market     text not null check (market in ('crypto', 'forex', 'commodity')),
  for_date   date not null default current_date,
  headline   text not null,
  summary    text not null,
  created_at timestamptz not null default now(),
  unique (market, for_date)
);

create index if not exists trend_updates_date_idx on public.trend_updates (for_date desc);

alter table public.trend_updates enable row level security;

-- Readable by any signed-in member (all plans get "daily trend updates" per
-- the pricing copy). Writes only happen server-side via the service role
-- (cron / admin trigger), so there is no insert/update/delete policy here —
-- RLS defaults to deny, and service-role requests bypass RLS entirely.
drop policy if exists "read trend updates" on public.trend_updates;
create policy "read trend updates"
  on public.trend_updates for select
  using (auth.uid() is not null);
