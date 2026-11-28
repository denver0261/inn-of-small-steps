-- Access rules for the M1 tables, checked as real signed-in users.
-- Ana and Ben share a house; Cy is a stranger. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cy@example.test');

create function pg_temp.act_as(who text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000' || who, 'role', 'authenticated')::text, true)
$$;

set local role authenticated;

-- Ana sets up the house and invites Ben ------------------------------------------
select pg_temp.act_as('a');
insert into public.players (id, display_name, time_zone, started_on)
  values ('00000000-0000-0000-0000-00000000000a', 'Ana', 'America/Chicago', '2026-11-23');
select lives_ok($$ select public.create_household('Liscor house') $$, 'a player can found a house');
select throws_ok($$ select public.create_household('Second house') $$, 'P0001', null, 'a player in a house cannot found another');
create temp table invite on commit drop as select public.create_invite() as code;
grant select on invite to authenticated;
insert into public.rooms (id, name) values ('00000000-0000-0000-0000-0000000000f1', 'Kitchen');
insert into public.habits (id, name, domain, tier, tiny_version)
  values ('00000000-0000-0000-0000-0000000000a1', 'Tidy', 'home', 'normal', 'one surface');
insert into public.habits (id, name, domain, tier, tiny_version, health_type, allow_tap)
  values ('00000000-0000-0000-0000-0000000000a2', 'Ride', 'endurance', 'normal', '10 min spin', 'cycling', false);
insert into public.goals (habit_id, period, target, start_date)
  values ('00000000-0000-0000-0000-0000000000a1', 'day', 1, '2026-11-23');
insert into public.health_workouts (id, type, start_at, end_at, duration_min, from_garmin)
  values ('w1', 'cycling', '2026-11-23T13:00Z', '2026-11-23T13:40Z', 40, true);
insert into public.pauses (start_date, end_date, reason) values ('2026-12-01', '2026-12-03', 'PT setback');

select throws_ok(
  $$ update public.players set household_id = null where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'a player cannot change their house directly');

-- Ben joins with the invite -------------------------------------------------------
select pg_temp.act_as('b');
insert into public.players (id, display_name, time_zone, started_on)
  values ('00000000-0000-0000-0000-00000000000b', 'Ben', 'America/Chicago', '2026-11-23');
select throws_ok($$ select public.accept_invite('not-a-code') $$, 'P0001', null, 'a made-up invite code is refused');
select lives_ok($$ select public.accept_invite((select code from invite)) $$, 'the partner joins by invite');
select is((select count(*) from public.players)::int, 2, 'housemates see each other');
select is((select count(*) from public.habits)::int, 2, 'housemates see each other''s habits');
select is((select count(*) from public.goals)::int, 1, 'housemates see each other''s goals');
select is((select count(*) from public.health_workouts)::int, 0, 'workouts are private to their owner');
select is((select count(*) from public.pauses)::int, 0, 'pauses are private to their owner');
select throws_ok(
  $$ insert into public.habits (player_id, name, domain, tier, tiny_version)
     values ('00000000-0000-0000-0000-00000000000a', 'Fake', 'home', 'tiny', 'x') $$,
  '42501', null, 'nobody adds habits for their partner');
select throws_ok(
  $$ insert into public.habit_logs (habit_id, date, kind, source)
     values ('00000000-0000-0000-0000-0000000000a1', '2026-11-23', 'full', 'tap') $$,
  '42501', null, 'nobody logs their partner''s habits');
select lives_ok(
  $$ insert into public.chores (id, title, room_id, size, repeat_kind, repeat_every_days, created_on, assignee)
     values ('00000000-0000-0000-0000-0000000000c1', 'Dishes', '00000000-0000-0000-0000-0000000000f1', 'normal', 'every', 1, '2026-11-23',
             '00000000-0000-0000-0000-00000000000a') $$,
  'either housemate adds chores to a shared room, for either of them');
select throws_ok($$ select public.accept_invite((select code from invite)) $$, 'P0001', null, 'an invite works once');

-- Logging and closed days -----------------------------------------------------------
select pg_temp.act_as('a');
select is((select count(*) from public.chores)::int, 1, 'chores are shared by the house');
select lives_ok(
  $$ insert into public.habit_logs (id, habit_id, date, kind, source, chore_id)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', '2026-11-23', 'full', 'tap',
             '00000000-0000-0000-0000-0000000000c1') $$,
  'a player logs their own habit on an open day');
select throws_ok(
  $$ insert into public.habit_logs (habit_id, date, kind, source)
     values ('00000000-0000-0000-0000-0000000000a2', '2026-11-23', 'full', 'tap') $$,
  '42501', null, 'rides cannot be tapped in');
select lives_ok(
  $$ insert into public.habit_logs (habit_id, date, kind, tier, source, health_workout_id)
     values ('00000000-0000-0000-0000-0000000000a2', '2026-11-23', 'full', 'big', 'apple_health', 'w1') $$,
  'rides come in from Apple Health');
select throws_ok(
  $$ insert into public.habit_logs (habit_id, date, kind, tier, source, health_workout_id)
     values ('00000000-0000-0000-0000-0000000000a2', '2026-11-23', 'full', 'big', 'apple_health', 'w1') $$,
  '23505', null, 'one workout logs once');
select throws_ok(
  $$ insert into public.day_closes (player_id, date) values ('00000000-0000-0000-0000-00000000000a', '2026-11-23') $$,
  '42501', null, 'players cannot close their own days');

reset role;
insert into public.day_closes (player_id, date) values ('00000000-0000-0000-0000-00000000000a', '2026-11-23');
set local role authenticated;
select pg_temp.act_as('a');

select throws_ok(
  $$ insert into public.habit_logs (habit_id, date, kind, source)
     values ('00000000-0000-0000-0000-0000000000a1', '2026-11-23', 'tiny', 'tap') $$,
  '42501', null, 'a closed day takes no new logs');
select is_empty(
  $$ update public.habit_logs set kind = 'tiny' where id = '00000000-0000-0000-0000-0000000000e1' returning id $$,
  'a closed day''s logs cannot be edited');
select is_empty(
  $$ delete from public.habit_logs where id = '00000000-0000-0000-0000-0000000000e1' returning id $$,
  'a closed day''s logs cannot be removed');
select lives_ok(
  $$ insert into public.habit_logs (habit_id, date, kind, source)
     values ('00000000-0000-0000-0000-0000000000a1', '2026-11-24', 'full', 'tap') $$,
  'the next day is still open');

-- A stranger sees nothing ----------------------------------------------------------
reset role;
create temp table ana_house on commit drop as select household_id as id from public.players where display_name = 'Ana';
grant select on ana_house to authenticated;
set local role authenticated;
select pg_temp.act_as('c');
insert into public.players (id, display_name, time_zone, started_on)
  values ('00000000-0000-0000-0000-00000000000c', 'Cy', 'Europe/London', '2026-11-23');
select is((select count(*) from public.players)::int, 1, 'a stranger sees only themself');
select is(
  (select count(*) from public.habits)::int + (select count(*) from public.habit_logs)::int
    + (select count(*) from public.chores)::int + (select count(*) from public.rooms)::int,
  0, 'a stranger sees no habits, logs, chores or rooms');
select throws_ok(
  $$ insert into public.chores (household_id, title, room_id, size, created_on)
     values ((select id from ana_house), 'Snoop', '00000000-0000-0000-0000-0000000000f1', 'tiny', '2026-11-23') $$,
  '42501', null, 'a stranger cannot add chores to another house');
select throws_ok($$ select public.accept_invite((select code from invite)) $$, 'P0001', null, 'a used invite does not let a stranger in');

-- Deleting an account deletes its data ---------------------------------------------
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select count(*) from public.habits where player_id = '00000000-0000-0000-0000-00000000000a')::int
    + (select count(*) from public.health_workouts)::int + (select count(*) from public.pauses)::int,
  0, 'deleting an account removes its habits, workouts and pauses');

select * from finish();
rollback;
