-- Apple Health sleep: a habit can be logged by nightly sleep duration (only the total
-- minutes asleep are used, never stages or samples). Sleep logs carry 'sleep:YYYY-MM-DD'
-- as their Apple Health id, so each night logs once per player.
alter table public.habits drop constraint habits_health_type_check;
alter table public.habits add constraint habits_health_type_check check (health_type in ('cycling', 'strength', 'sleep'));
