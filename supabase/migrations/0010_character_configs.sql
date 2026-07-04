-- Market Heist — The Playmaker character layer
-- Run in the Supabase SQL Editor after 0009.
--
-- Admin-editable persona config (Blueprint V1.1 §9, "The Playmaker"). Copy,
-- avatar, dashboard note, signal prefix, and bot intro live here so brand
-- voice can change without a deploy. Only one row is expected to be active
-- at a time in the MVP (the app reads "the active config"), but the schema
-- doesn't hard-enforce a single active row — admin discipline + a simple
-- admin UI keep that true in practice.

create table if not exists public.character_configs (
  id                    uuid primary key default gen_random_uuid(),
  character_key         text not null unique,
  character_name        text not null,
  role                  text,
  tagline               text,
  avatar_url            text,
  banner_url            text,
  bot_intro_message     text,
  signal_prefix         text,
  dashboard_note_title  text,
  dashboard_note_body   text,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.character_configs enable row level security;

-- Public sees only the active persona (or personas, if more than one is ever
-- active); admins see everything for editing.
drop policy if exists "character configs readable by everyone" on public.character_configs;
create policy "character configs readable by everyone"
  on public.character_configs for select
  using (is_active or public.is_admin());

-- All writes happen server-side via the service role (the admin
-- character-config route), so there is no insert/update policy for regular
-- authenticated users — RLS defaults to deny, and service-role requests
-- bypass RLS entirely.

create or replace function public.set_character_configs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists character_configs_set_updated_at on public.character_configs;
create trigger character_configs_set_updated_at
  before update on public.character_configs
  for each row execute function public.set_character_configs_updated_at();

-- ---------------------------------------------------------------------------
-- Seed The Playmaker (MVP V1 Final Build Module Decision, Module 12).
-- `character_key` is the stable seed identifier so re-running this migration
-- updates the same row instead of inserting a duplicate persona.
-- ---------------------------------------------------------------------------
insert into public.character_configs (
  character_key, character_name, role, tagline, bot_intro_message, signal_prefix,
  dashboard_note_title, dashboard_note_body, is_active
) values (
  'the-playmaker',
  'The Playmaker',
  'Market intelligence operator',
  'Don''t chase the market. Heist it.',
  'Welcome to MARKET HEIST. I am The Playmaker. Your first mission is ready.',
  'PLAYMAKER SIGNAL ALERT',
  'Playmaker Note',
  'Stay disciplined. Read the signal, manage your risk, and let the process work.',
  true
)
on conflict (character_key) do update set
  character_name       = excluded.character_name,
  role                 = excluded.role,
  tagline              = excluded.tagline,
  bot_intro_message    = excluded.bot_intro_message,
  signal_prefix        = excluded.signal_prefix,
  dashboard_note_title = excluded.dashboard_note_title,
  dashboard_note_body  = excluded.dashboard_note_body;
