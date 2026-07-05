-- Market Heist — QA-A1 (MVP V1 launch readiness): surface AI Mentor Heist as a
-- first-run activation hook. Seeds a "Consult the Mentor" mission that completes
-- the first time a member uses Mentor Heister (i.e. has any ai_chat_sessions
-- row). The trigger_type `use_ai_mentor` is detected in lib/missions.ts'
-- isMissionSatisfied() — same pull-based pattern as the other missions.

insert into public.missions (mission_key, public_name, description, points_reward, trigger_type, sort_order) values
  ('consult_the_mentor', 'Consult the Mentor', 'Ask Mentor Heister before your first setup.', 100, 'use_ai_mentor', 9)
on conflict (mission_key) do update set
  public_name   = excluded.public_name,
  description   = excluded.description,
  points_reward = excluded.points_reward,
  trigger_type  = excluded.trigger_type,
  sort_order    = excluded.sort_order;
