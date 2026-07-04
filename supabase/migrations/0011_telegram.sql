-- Market Heist — Telegram Bot + identity linking
-- Run in the Supabase SQL Editor after 0010.
--
-- Telegram is the acquisition/notification layer (Blueprint V1.1 §21).
-- Auth stays Supabase email/password — these tables link a Telegram
-- identity to an existing profiles row, they do not replace login.

-- ---------------------------------------------------------------------------
-- telegram_links: one Telegram account <-> one Market Heist account
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_links (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  telegram_id        bigint not null,
  telegram_username  text,
  linked_at          timestamptz not null default now(),
  unique (user_id),
  unique (telegram_id)
);

alter table public.telegram_links enable row level security;

drop policy if exists "read own telegram link" on public.telegram_links;
create policy "read own telegram link"
  on public.telegram_links for select
  using (auth.uid() = user_id);

drop policy if exists "admin read all telegram links" on public.telegram_links;
create policy "admin read all telegram links"
  on public.telegram_links for select
  using (public.is_admin());

-- All writes (link, unlink) happen server-side via the service role (the
-- dashboard link-start route and the bot webhook), so there is no
-- insert/update/delete policy for regular users — RLS defaults to deny.

-- ---------------------------------------------------------------------------
-- telegram_link_codes: short-lived one-time codes for the /start <code>
-- linking handshake (dashboard "Link Telegram" button -> deep link -> bot).
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_link_codes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  code         text not null unique,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  consumed_at  timestamptz
);

create index if not exists telegram_link_codes_user_idx on public.telegram_link_codes (user_id, created_at desc);

alter table public.telegram_link_codes enable row level security;

drop policy if exists "read own telegram link codes" on public.telegram_link_codes;
create policy "read own telegram link codes"
  on public.telegram_link_codes for select
  using (auth.uid() = user_id);

-- Writes (create code, consume code) happen server-side via the service role.

-- ---------------------------------------------------------------------------
-- bot_events: Telegram bot audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.bot_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id),
  event_type  text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists bot_events_user_idx on public.bot_events (user_id, created_at desc);
create index if not exists bot_events_type_idx on public.bot_events (event_type);

alter table public.bot_events enable row level security;

-- Admin-only. Written exclusively by the service role (webhook handler), so
-- there is no insert policy for regular users — RLS defaults to deny.
drop policy if exists "admin read bot events" on public.bot_events;
create policy "admin read bot events"
  on public.bot_events for select
  using (public.is_admin());
