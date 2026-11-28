-- M1 habit core: players, one shared house, rooms, habits, goals, logs, chores, pauses
-- and Apple Health workouts. Enum values mirror packages/schema (zod).
--
-- Access rules (row-level security on every table):
--   * Housemates see each other's player row, habits, goals and logs (that a habit was done).
--   * Workouts and pauses are visible only to their owner (health details stay private).
--   * Rooms and chores belong to the house; either housemate can change them.
--   * A log can be added, changed or removed only while its day is still open.
--   * Joining a house happens only through create_household / accept_invite.
-- Deleting an auth user deletes everything they own.

-- Households and players --------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  display_name text not null check (length(display_name) between 1 and 40),
  -- IANA name; the app checks it with Intl before saving.
  time_zone text not null check (time_zone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$'),
  sleep_time time not null default '22:30',
  -- A packages/content path id; null until picked on day one.
  class_path_id text,
  -- The player's first game day, in their own time zone. Drives habit slots.
  started_on date not null,
  created_at timestamptz not null default now()
);
create index players_household_idx on public.players (household_id);

-- Helpers ---------------------------------------------------------------------

create function public.my_household() returns uuid
language sql stable security definer set search_path = ''
as $$
  select household_id from public.players where id = (select auth.uid())
$$;

-- Me, or someone in my house.
create function public.can_see_player(p uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p = (select auth.uid())
    or exists (
      select 1 from public.players
      where id = p and household_id is not null and household_id = public.my_household()
    )
$$;

create table public.household_invites (
  code text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid references public.players (id) on delete set null,
  used_at timestamptz
);

-- Rooms and habits -------------------------------------------------------------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households (id) on delete cascade,
  name text not null check (length(name) between 1 and 40),
  sort_order integer not null default 0,
  unique (household_id, name),
  unique (id, household_id)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null default auth.uid() references public.players (id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  domain text not null check (domain in ('home', 'nourish', 'endurance', 'strength', 'recovery', 'mind', 'craft', 'spirit', 'bonds', 'rest')),
  tier text not null check (tier in ('tiny', 'normal', 'big')),
  tiny_version text not null check (length(tiny_version) between 1 and 80),
  -- Which Apple Health workouts log this habit, if any.
  health_type text check (health_type in ('cycling', 'strength')),
  -- False for habits that only ever come from Apple Health (rides and lifting).
  allow_tap boolean not null default true,
  archived_on date,
  created_at timestamptz not null default now(),
  check (allow_tap or health_type is not null)
);
create index habits_player_idx on public.habits (player_id);

-- One row per goal period; a change adds a row, so past weeks keep their target.
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  period text not null check (period in ('day', 'week')),
  target integer not null check (target >= 1),
  -- Day goals only: scheduled weekdays, 0 = Monday. Null = every day.
  days smallint[] check (days <@ '{0,1,2,3,4,5,6}' and cardinality(days) > 0),
  start_date date not null,
  end_date date,
  prescribed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (habit_id, start_date),
  check (period = 'day' or days is null),
  check (end_date is null or end_date >= start_date)
);

-- Days and logs ----------------------------------------------------------------

-- Written only by the nightly job (M2). A log's day is open until a row exists for it or later.
create table public.day_closes (
  player_id uuid not null references public.players (id) on delete cascade,
  date date not null,
  closed_at timestamptz not null default now(),
  primary key (player_id, date)
);

create function public.day_is_open(p uuid, d date) returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.day_closes where player_id = p and date >= d)
$$;

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households (id) on delete cascade,
  title text not null check (length(title) between 1 and 80),
  room_id uuid not null,
  size text not null check (size in ('tiny', 'normal', 'big')),
  repeat_kind text check (repeat_kind in ('every', 'weekly')),
  repeat_every_days integer check (repeat_every_days >= 1),
  repeat_weekdays smallint[] check (repeat_weekdays <@ '{0,1,2,3,4,5,6}' and cardinality(repeat_weekdays) > 0),
  -- Null = either player.
  assignee uuid references public.players (id) on delete set null,
  created_on date not null,
  last_done_on date,
  last_done_by uuid references public.players (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (room_id, household_id) references public.rooms (id, household_id) on delete restrict,
  check (
    (repeat_kind is null and repeat_every_days is null and repeat_weekdays is null)
    or (repeat_kind = 'every' and repeat_every_days is not null and repeat_weekdays is null)
    or (repeat_kind = 'weekly' and repeat_weekdays is not null and repeat_every_days is null)
  )
);
create index chores_household_idx on public.chores (household_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null default auth.uid() references public.players (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  -- The game day the log counts toward.
  date date not null,
  kind text not null check (kind in ('full', 'tiny')),
  tier text check (tier in ('tiny', 'normal', 'big')),
  source text not null check (source in ('tap', 'apple_health')),
  health_workout_id text,
  chore_id uuid references public.chores (id) on delete set null,
  -- The real day, when a late sync moved the log to a later open day.
  performed_on date,
  created_at timestamptz not null default now(),
  unique (player_id, health_workout_id),
  check ((source = 'apple_health') = (health_workout_id is not null)),
  check (kind = 'full' or tier is null),
  check (performed_on is null or performed_on < date)
);
create index habit_logs_player_date_idx on public.habit_logs (player_id, date);

-- Only the fields the design allows: no heart rate, no samples.
create table public.health_workouts (
  player_id uuid not null default auth.uid() references public.players (id) on delete cascade,
  id text not null,
  type text not null check (type in ('cycling', 'strength')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_min numeric not null check (duration_min >= 0),
  distance_km numeric check (distance_km >= 0),
  from_garmin boolean not null,
  primary key (player_id, id),
  check (end_at >= start_at)
);

-- Paused days are neither done nor missed. Null habit_ids = every habit.
create table public.pauses (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null default auth.uid() references public.players (id) on delete cascade,
  habit_ids uuid[] check (cardinality(habit_ids) > 0),
  start_date date not null,
  end_date date not null,
  reason text check (length(reason) <= 200),
  check (end_date >= start_date)
);

-- Grants -----------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on public.rooms, public.habits, public.goals, public.chores,
  public.habit_logs, public.health_workouts, public.pauses to authenticated;
grant select on public.households, public.day_closes to authenticated;
grant select, insert on public.players to authenticated;
-- household_id and started_on change only through the functions below.
grant update (display_name, time_zone, sleep_time, class_path_id) on public.players to authenticated;

-- Row-level security -------------------------------------------------------------

alter table public.households enable row level security;
alter table public.players enable row level security;
alter table public.household_invites enable row level security;
alter table public.rooms enable row level security;
alter table public.habits enable row level security;
alter table public.goals enable row level security;
alter table public.day_closes enable row level security;
alter table public.chores enable row level security;
alter table public.habit_logs enable row level security;
alter table public.health_workouts enable row level security;
alter table public.pauses enable row level security;

create policy "see my house" on public.households for select to authenticated
  using (id = public.my_household());

create policy "see me and my housemates" on public.players for select to authenticated
  using (public.can_see_player(id));
create policy "create my own player" on public.players for insert to authenticated
  with check (id = (select auth.uid()) and household_id is null);
create policy "edit my own player" on public.players for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- household_invites: no policies; reached only through the functions below.

create policy "house rooms" on public.rooms for all to authenticated
  using (household_id = public.my_household()) with check (household_id = public.my_household());

create policy "see house habits" on public.habits for select to authenticated
  using (public.can_see_player(player_id));
create policy "add my habits" on public.habits for insert to authenticated
  with check (player_id = (select auth.uid()));
create policy "edit my habits" on public.habits for update to authenticated
  using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()));
create policy "remove my habits" on public.habits for delete to authenticated
  using (player_id = (select auth.uid()));

create policy "see house goals" on public.goals for select to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id));
create policy "write my goals" on public.goals for all to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.player_id = (select auth.uid())))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.player_id = (select auth.uid())));

create policy "see my closed days" on public.day_closes for select to authenticated
  using (player_id = (select auth.uid()));

create policy "house chores" on public.chores for all to authenticated
  using (household_id = public.my_household())
  with check (household_id = public.my_household() and (assignee is null or public.can_see_player(assignee)));

create policy "see house logs" on public.habit_logs for select to authenticated
  using (public.can_see_player(player_id));
-- Rides and lifting can't be tapped in: a habit with allow_tap = false only takes Apple Health logs.
create policy "add my logs while the day is open" on public.habit_logs for insert to authenticated
  with check (
    player_id = (select auth.uid())
    and public.day_is_open(player_id, date)
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.player_id = (select auth.uid()) and (h.allow_tap or source = 'apple_health')
    )
  );
create policy "edit my logs while the day is open" on public.habit_logs for update to authenticated
  using (player_id = (select auth.uid()) and public.day_is_open(player_id, date))
  with check (
    player_id = (select auth.uid())
    and public.day_is_open(player_id, date)
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.player_id = (select auth.uid()) and (h.allow_tap or source = 'apple_health')
    )
  );
create policy "remove my logs while the day is open" on public.habit_logs for delete to authenticated
  using (player_id = (select auth.uid()) and public.day_is_open(player_id, date));

create policy "my workouts only" on public.health_workouts for all to authenticated
  using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()));

create policy "my pauses only" on public.pauses for all to authenticated
  using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()));

-- Joining a house ----------------------------------------------------------------

create function public.create_household(house_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  house uuid;
begin
  if not exists (select 1 from public.players where id = me and household_id is null) then
    raise exception 'create your player first, and leave any other house';
  end if;
  insert into public.households (name) values (house_name) returning id into house;
  update public.players set household_id = house where id = me;
  return house;
end;
$$;

-- A one-use code, good for 7 days, that the partner opens as an invite link.
create function public.create_invite() returns text
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  house uuid := public.my_household();
  invite_code text := replace(gen_random_uuid()::text, '-', '');
begin
  if house is null then
    raise exception 'you are not in a house';
  end if;
  insert into public.household_invites (code, household_id, created_by, expires_at)
  values (invite_code, house, me, now() + interval '7 days');
  return invite_code;
end;
$$;

create function public.accept_invite(invite_code text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  house uuid;
begin
  if not exists (select 1 from public.players where id = me and household_id is null) then
    raise exception 'create your player first, and leave any other house';
  end if;
  update public.household_invites
    set used_by = me, used_at = now()
    where code = invite_code and used_by is null and expires_at > now()
    returning household_id into house;
  if house is null then
    raise exception 'that invite is not valid';
  end if;
  update public.players set household_id = house where id = me;
  return house;
end;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_household(text), public.create_invite(), public.accept_invite(text),
  public.my_household(), public.can_see_player(uuid), public.day_is_open(uuid, date) to authenticated;
