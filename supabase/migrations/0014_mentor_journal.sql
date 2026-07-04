-- Market Heist — GPT Mentor + Trade Journal + AI Privacy/Cost Control
-- Run in the Supabase SQL Editor after 0013.
--
-- The interactive Mentor Heister layer (Blueprint V1.1 §11.2 #12, §12.2,
-- §19, §22). Pro+ only. Every Mentor answer follows the same non-negotiable
-- output standard as signals: a clear answer, a risk note, a suggested
-- action, an invalidation point where relevant, and position sizing
-- guidance — never a guaranteed-profit claim. Bot templates are paper/
-- backtest descriptions only, never auto-execution.

-- ---------------------------------------------------------------------------
-- AI Data consent (§19). A member must accept before their first Mentor
-- call; the full consent-page copy ships with M12's Trust pages, this
-- milestone just needs somewhere to record the timestamp. Not a privileged
-- field (same class as profiles.risk_profile from 0012) — a member sets
-- this on themselves directly, no guard trigger involvement.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists ai_consent_at timestamptz;

-- ---------------------------------------------------------------------------
-- trade_journals: a member's personal, self-logged trade history. Unlike
-- signals/heist_points_ledger/reward_ledger this isn't a shared business
-- ledger — it's private notes the member can freely edit or delete.
-- ---------------------------------------------------------------------------
create table if not exists public.trade_journals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  pair          text not null,
  market        text check (market in ('crypto', 'forex', 'commodity')),
  direction     text not null check (direction in ('long', 'short')),
  entry         numeric,
  exit_price    numeric,
  position_size numeric,
  outcome       text check (outcome in ('win', 'loss', 'breakeven')),
  followed_plan boolean not null default true,
  notes         text,
  traded_at     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists trade_journals_user_idx on public.trade_journals (user_id, traded_at desc);

alter table public.trade_journals enable row level security;

drop policy if exists "read own trade journals" on public.trade_journals;
create policy "read own trade journals"
  on public.trade_journals for select
  using (auth.uid() = user_id);

drop policy if exists "admin read all trade journals" on public.trade_journals;
create policy "admin read all trade journals"
  on public.trade_journals for select
  using (public.is_admin());

drop policy if exists "insert own trade journals" on public.trade_journals;
create policy "insert own trade journals"
  on public.trade_journals for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own trade journals" on public.trade_journals;
create policy "update own trade journals"
  on public.trade_journals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own trade journals" on public.trade_journals;
create policy "delete own trade journals"
  on public.trade_journals for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_chat_sessions: every Mentor call, logged for cost visibility (§17.4's
-- usage dashboards, V2, will later aggregate token_usage from here — no
-- separate table needed yet). Append-only like the other audit-adjacent
-- tables: only the server (service role, after the plan/consent gate
-- checks) writes it, and nothing may edit history after the fact.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_chat_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  function     text not null check (function in ('chat', 'position_size', 'bot_template', 'trade_review')),
  input        jsonb not null default '{}'::jsonb,
  output       text,
  token_usage  integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists ai_chat_sessions_user_idx on public.ai_chat_sessions (user_id, created_at desc);

alter table public.ai_chat_sessions enable row level security;

drop policy if exists "read own ai chat sessions" on public.ai_chat_sessions;
create policy "read own ai chat sessions"
  on public.ai_chat_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "admin read all ai chat sessions" on public.ai_chat_sessions;
create policy "admin read all ai chat sessions"
  on public.ai_chat_sessions for select
  using (public.is_admin());

-- No insert/update/delete policy for regular users — the service role
-- (bypasses RLS) is the only writer, and the guard trigger below blocks
-- edits to history regardless of who's updating.
create or replace function public.guard_ai_chat_sessions_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'ai_chat_sessions rows are append-only and cannot be updated or deleted.';
end;
$$;

drop trigger if exists ai_chat_sessions_guard_update on public.ai_chat_sessions;
create trigger ai_chat_sessions_guard_update
  before update on public.ai_chat_sessions
  for each row execute function public.guard_ai_chat_sessions_immutable();

drop trigger if exists ai_chat_sessions_guard_delete on public.ai_chat_sessions;
create trigger ai_chat_sessions_guard_delete
  before delete on public.ai_chat_sessions
  for each row execute function public.guard_ai_chat_sessions_immutable();
