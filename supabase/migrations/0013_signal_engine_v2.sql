-- Market Heist — Signal Engine v2 + Signal Archive
-- Run in the Supabase SQL Editor after 0012.
--
-- Extends `signals` to the exact field/status set from Blueprint V1.1 §12.1
-- and adds `signal_updates` for lifecycle history. Signals in this codebase
-- are per-member AI-generated recommendations (not admin-curated broadcasts
-- — that's a bigger, pre-existing architectural choice from M0/M1, out of
-- scope to change here), so "signal archive" is a status filter over each
-- member's own signal history, not a separate table or a public feed.

-- ---------------------------------------------------------------------------
-- New v2 fields.
-- ---------------------------------------------------------------------------
alter table public.signals
  add column if not exists invalidation numeric,
  add column if not exists tp1 numeric,
  add column if not exists tp2 numeric,
  add column if not exists tp3 numeric,
  add column if not exists risk_level text check (risk_level in ('low', 'medium', 'high')),
  add column if not exists setup_reason text,
  add column if not exists ai_note text;

-- Migrate the old single `target` into `tp1` (first take-profit), then drop
-- it — tp1/tp2/tp3 supersede it, no reason to keep both concepts.
update public.signals set tp1 = target where tp1 is null and target is not null;
alter table public.signals drop column if exists target;

-- ---------------------------------------------------------------------------
-- Widen the status lifecycle to the exact §12.1 set. Existing rows: 'active'
-- stays 'active'; 'closed' becomes 'manual_closed' (the safest generic
-- mapping since the old column didn't record *why* a signal was closed).
-- ---------------------------------------------------------------------------
alter table public.signals drop constraint if exists signals_status_check;
update public.signals set status = 'manual_closed' where status = 'closed';
alter table public.signals
  alter column status set default 'active',
  add constraint signals_status_check
    check (status in ('pending', 'active', 'hit_tp1', 'hit_tp2', 'hit_tp3', 'invalidated', 'expired', 'manual_closed'));

-- ---------------------------------------------------------------------------
-- Non-negotiable rule (§12.1): every signal must be archived, including
-- losses and invalidated calls. A member being able to delete their own
-- signal history would violate that, so self-delete is removed — status
-- transitions (self-tracking outcomes) are still allowed via the existing
-- "update own signals" policy.
-- ---------------------------------------------------------------------------
drop policy if exists "delete own signals" on public.signals;

-- ---------------------------------------------------------------------------
-- Guard trigger: "update own signals" is a row-level policy (auth.uid() =
-- user_id) with no column granularity, so without this a member could
-- rewrite entry/stop/tp*/rationale after the fact — undermining the archive
-- integrity this whole milestone exists for. Restrict every updater
-- (member self-tracking AND admin transitions) to the mutable status field.
-- ---------------------------------------------------------------------------
create or replace function public.guard_signals_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.pair is distinct from old.pair
     or new.market is distinct from old.market
     or new.timeframe is distinct from old.timeframe
     or new.bias is distinct from old.bias
     or new.entry is distinct from old.entry
     or new.stop is distinct from old.stop
     or new.invalidation is distinct from old.invalidation
     or new.tp1 is distinct from old.tp1
     or new.tp2 is distinct from old.tp2
     or new.tp3 is distinct from old.tp3
     or new.risk_level is distinct from old.risk_level
     or new.confidence is distinct from old.confidence
     or new.technique is distinct from old.technique
     or new.setup_reason is distinct from old.setup_reason
     or new.ai_note is distinct from old.ai_note
     or new.rationale is distinct from old.rationale
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Only a signal''s status may be changed after creation.';
  end if;
  return new;
end;
$$;

drop trigger if exists signals_guard_immutable_fields on public.signals;
create trigger signals_guard_immutable_fields
  before update on public.signals
  for each row execute function public.guard_signals_immutable_fields();

-- ---------------------------------------------------------------------------
-- signal_updates: lifecycle/status-change history. Same ownership model as
-- signals — the owning member can read/insert their own signal's updates
-- (self-tracking outcomes), admins see everything.
-- ---------------------------------------------------------------------------
create table if not exists public.signal_updates (
  id            uuid primary key default gen_random_uuid(),
  signal_id     uuid not null references public.signals (id) on delete cascade,
  update_text   text,
  status_change text,
  created_at    timestamptz not null default now()
);

create index if not exists signal_updates_signal_idx on public.signal_updates (signal_id, created_at desc);

alter table public.signal_updates enable row level security;

drop policy if exists "read own signal updates" on public.signal_updates;
create policy "read own signal updates"
  on public.signal_updates for select
  using (exists (select 1 from public.signals s where s.id = signal_id and s.user_id = auth.uid()));

drop policy if exists "admin read all signal updates" on public.signal_updates;
create policy "admin read all signal updates"
  on public.signal_updates for select
  using (public.is_admin());

drop policy if exists "insert own signal updates" on public.signal_updates;
create policy "insert own signal updates"
  on public.signal_updates for insert
  with check (exists (select 1 from public.signals s where s.id = signal_id and s.user_id = auth.uid()));
