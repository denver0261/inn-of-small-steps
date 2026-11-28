-- Access and write rules for the M2 System tables. Ana and Ben share a house; Cy is a stranger.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cy@example.test');
insert into public.households (id, name) values ('00000000-0000-0000-0000-0000000000d1', 'Liscor house');
insert into public.players (id, household_id, display_name, time_zone, started_on) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1', 'Ana', 'America/Chicago', '2026-11-23'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000d1', 'Ben', 'America/Chicago', '2026-11-23'),
  ('00000000-0000-0000-0000-00000000000c', null, 'Cy', 'America/Chicago', '2026-11-23');
insert into public.habits (id, player_id, name, domain, tier, tiny_version)
  values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Tidy', 'home', 'normal', 'one surface');

-- The job (service role) records Ana's night and the house's morning.
select lives_ok($$ select public.record_night('00000000-0000-0000-0000-00000000000a', '2026-11-23', '{"version":1}', '[{"type":"level_up","level":1}]') $$, 'the job records a night');
select lives_ok($$ select public.record_night('00000000-0000-0000-0000-00000000000a', '2026-11-23', '{"version":1,"again":true}', '[]') $$, 'recording a night twice overwrites, it never duplicates');
select is((select count(*) from public.level_events)::int, 1, 'one events row per player and day');
select lives_ok($$ select public.record_story('00000000-0000-0000-0000-0000000000d1', '2026-11-23', 'A quiet morning.', 'template', 'no key', 'system-v1',
  '[{"player_id":"00000000-0000-0000-0000-00000000000a","messages":["[Rider Class obtained!]"],"skill_names":[{"def_id":"long_road","tier":1,"name":"[Long Road]","text":"Roads remember."}],"evolution_names":[]}]') $$, 'the job records a morning');
select lives_ok($$ select public.record_story('00000000-0000-0000-0000-0000000000d1', '2026-11-23', 'A different morning.', 'claude', null, 'system-v1', '[]') $$, 'a second morning for the same night is ignored');
select is((select scene from public.story_entries), 'A quiet morning.', 'the first morning stands');
select throws_ok($$ insert into public.skill_names values ('00000000-0000-0000-0000-00000000000a', 'x', 1, '[Road 2]', 't') $$, '23514', null, 'Skill names carry no digits');

create function pg_temp.act_as(who text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000' || who, 'role', 'authenticated')::text, true)
$$;
set local role authenticated;

select pg_temp.act_as('b');
select is((select count(*) from public.story_entries)::int, 1, 'housemates share the morning');
select is((select count(*) from public.system_messages)::int, 1, 'housemates see each other''s System messages');
select is((select count(*) from public.skill_names)::int, 1, 'housemates see each other''s Skill names');
select is((select count(*) from public.player_states)::int, 0, 'engine state is private');
select is((select count(*) from public.level_events)::int, 0, 'raw events are private');
select throws_ok($$ select public.record_night('00000000-0000-0000-0000-00000000000b', '2026-11-23', '{}', '[]') $$, '42501', null, 'players cannot record their own nights');

select pg_temp.act_as('c');
select is((select count(*) from public.story_entries)::int, 0, 'strangers see no story');

-- Going to sleep closes today and locks the day's logs and choices.
select pg_temp.act_as('a');
select lives_ok($$ insert into public.night_choices (date, grace) values (public.game_date('America/Chicago'), '{tidy}') $$, 'a choice can be made while the day is open');
select public.go_to_sleep();
select throws_ok(
  $$ insert into public.habit_logs (habit_id, date, kind, source)
     values ('00000000-0000-0000-0000-0000000000a1', public.game_date('America/Chicago'), 'full', 'tap') $$,
  '42501', null, 'after going to sleep, today''s logs are locked');

select * from finish();
rollback;
