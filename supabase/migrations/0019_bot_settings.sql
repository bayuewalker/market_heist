-- Market Heist — QA-A2 (MVP V1 launch readiness): let an admin update the
-- Telegram bot's token/username from /admin/settings instead of only via
-- Vercel env vars, so rotating or first-configuring the bot doesn't require
-- a redeploy.
--
-- Singleton table: `id boolean primary key default true` + a check that it's
-- always `true` means there can only ever be one row, updated in place via
-- `upsert(..., { onConflict: "id" })`.
--
-- No select/insert/update policy is defined for any role — RLS defaults to
-- deny, so anon and authenticated (including admin, in their own session)
-- can never read this table directly; only the service-role admin API route
-- (POST/PATCH from an admin-checked request) and server-side config readers
-- (which always use the service-role client) ever touch it. This mirrors
-- cross-cutting rule #8: bot secrets are server-only, never exposed to the
-- client bundle — storing the token here doesn't change that, it's still
-- only ever read by service-role server code.
create table if not exists public.bot_settings (
  id                    boolean primary key default true,
  telegram_bot_token    text,
  telegram_bot_username text,
  updated_at            timestamptz not null default now(),
  constraint bot_settings_singleton check (id)
);

alter table public.bot_settings enable row level security;

create or replace function public.set_bot_settings_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bot_settings_set_updated_at on public.bot_settings;
create trigger bot_settings_set_updated_at
  before update on public.bot_settings
  for each row execute function public.set_bot_settings_updated_at();
