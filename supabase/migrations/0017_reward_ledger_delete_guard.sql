-- Market Heist — close the reward_ledger append-only gap found in the M4-M13
-- blueprint compliance audit: heist_points_ledger blocks both UPDATE and
-- DELETE unconditionally (0012), but reward_ledger only ever got an UPDATE
-- guard (0009) that permits the approve/mark-paid status fields to change.
-- There is no legitimate reason to delete a reward_ledger row — a correction
-- is a new row — so DELETE should be blocked unconditionally, the same way
-- heist_points_ledger already blocks it, including for the service role.

create or replace function public.guard_reward_ledger_no_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'reward_ledger rows are append-only and cannot be deleted. Insert a correcting row instead.';
end;
$$;

drop trigger if exists reward_ledger_guard_delete on public.reward_ledger;
create trigger reward_ledger_guard_delete
  before delete on public.reward_ledger
  for each row execute function public.guard_reward_ledger_no_delete();
