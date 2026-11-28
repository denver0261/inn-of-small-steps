-- Access rules for the M3 house tables. Ana and Ben share a house; Cy is a stranger.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cy@example.test');
insert into public.households (id, name) values ('00000000-0000-0000-0000-0000000000d1', 'Liscor house');
insert into public.players (id, household_id, display_name, time_zone, started_on) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1', 'Ana', 'America/Chicago', '2026-11-23'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000d1', 'Ben', 'America/Chicago', '2026-11-23'),
  ('00000000-0000-0000-0000-00000000000c', null, 'Cy', 'America/Chicago', '2026-11-23');

select lives_ok($$ select public.record_house_night('00000000-0000-0000-0000-0000000000d1', '2026-11-23', '{"version":1}', '[]', '{}') $$, 'the job records a house night');
select lives_ok($$ select public.record_house_night('00000000-0000-0000-0000-0000000000d1', '2026-11-23', '{"version":1}', '[]', '{}') $$, 'recording it again overwrites');

create function pg_temp.act_as(who text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000' || who, 'role', 'authenticated')::text, true)
$$;
set local role authenticated;

select pg_temp.act_as('a');
select is((select count(*) from public.house_states)::int, 1, 'housemates see the house');
select lives_ok($$ insert into public.outings (date, index) values (public.game_date('America/Chicago'), 0) $$, 'a player starts an outing');
select lives_ok($$ update public.outings set choices = '{1}' where index = 0 $$, 'and plays it');
select lives_ok($$ insert into public.house_orders (date, kind, ref) values (public.game_date('America/Chicago'), 'build', 'kitchen') $$, 'and orders an upgrade');
select throws_ok($$ select public.record_house_night('00000000-0000-0000-0000-0000000000d1', '2026-11-24', '{}', '[]', '{}') $$, '42501', null, 'players cannot record house nights');

select pg_temp.act_as('b');
select is((select count(*) from public.outings)::int, 1, 'housemates see each other''s outings');
select is((select count(*) from public.house_orders)::int, 1, 'and the house''s orders');
select throws_ok($$ insert into public.outings (player_id, date, index) values ('00000000-0000-0000-0000-00000000000a', public.game_date('America/Chicago'), 1) $$, '42501', null, 'nobody starts an outing for their partner');

select pg_temp.act_as('c');
select is((select count(*) from public.house_states)::int + (select count(*) from public.outings)::int, 0, 'strangers see nothing');

-- After sleep, the day's outings and orders lock.
select pg_temp.act_as('a');
select public.go_to_sleep();
select throws_ok($$ insert into public.house_orders (date, kind, ref) values (public.game_date('America/Chicago'), 'craft', 'stew') $$, '42501', null, 'orders lock when the day closes');

select * from finish();
rollback;
