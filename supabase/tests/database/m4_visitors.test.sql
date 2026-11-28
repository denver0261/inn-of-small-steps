-- M4: visitor answers and Inn evenings are orders; one Inn evening a day.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'ana@example.test');
insert into public.households (id, name) values ('00000000-0000-0000-0000-0000000000d1', 'Liscor house');
insert into public.players (id, household_id, display_name, time_zone, started_on)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1', 'Ana', 'America/Chicago', '2026-11-23');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;

select lives_ok($$ insert into public.house_orders (date, kind, ref) values (public.game_date('America/Chicago'), 'accept', 'gnoll_butcher:2026-11-24') $$, 'a player accepts a visitor''s quest');
select lives_ok($$ insert into public.house_orders (date, kind, ref) values (public.game_date('America/Chicago'), 'inn', 'inn') $$, 'and spends the evening at the Inn');
select throws_ok($$ insert into public.house_orders (date, kind, ref) values (public.game_date('America/Chicago'), 'inn', 'inn') $$, '23505', null, 'once a day');
select throws_ok($$ insert into public.house_orders (date, kind, ref) values (public.game_date('America/Chicago'), 'bribe', 'x') $$, '23514', null, 'unknown orders are refused');

select * from finish();
rollback;
