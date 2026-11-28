-- M3 Your house: the shared house state, its nightly events, outings and orders.
--
-- Everything shared changes in the nightly job (packages/night, service role) through
-- record_house_night. During the day players only add rows: an outing's choices, an
-- order to build, craft or eat. Each is checked again at night.
--
-- Access rules:
--   * The house state and its nightly events belong to the house.
--   * Outings: everyone in the house can see them; a player adds and plays their own,
--     only while their day is open. The seed and events are never stored: the job derives
--     them from (player, date, index), so a row can't be edited into a better outing.
--   * Orders: the house sees them; a player adds or cancels their own while their day is open.

create table public.house_states (
  household_id uuid primary key references public.households (id) on delete cascade,
  -- packages/engine HouseState; `version` inside it.
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.house_events (
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  -- packages/engine HouseEvent[], and what the night settled per player (stamina, pity).
  events jsonb not null,
  players jsonb not null,
  primary key (household_id, date)
);

create table public.outings (
  player_id uuid not null default auth.uid() references public.players (id) on delete cascade,
  date date not null,
  -- 0 for the day's first outing, then 1, 2...
  index int not null check (index >= 0),
  -- The choice picked at each event so far.
  choices int[] not null default '{}' check (cardinality(choices) <= 5),
  created_at timestamptz not null default now(),
  primary key (player_id, date, index)
);

create table public.house_orders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household() references public.households (id) on delete cascade,
  player_id uuid not null default auth.uid() references public.players (id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('build', 'craft', 'meal')),
  -- An upgrade, recipe or item id from packages/content.
  ref text not null check (length(ref) between 1 and 60),
  created_at timestamptz not null default now()
);
create index house_orders_house_date_idx on public.house_orders (household_id, date);

-- Saves a house's night atomically (service role only).
create function public.record_house_night(house uuid, d date, new_state jsonb, night_events jsonb, night_players jsonb) returns void
language plpgsql set search_path = ''
as $$
begin
  insert into public.house_states (household_id, state, updated_at) values (house, new_state, now())
    on conflict (household_id) do update set state = excluded.state, updated_at = excluded.updated_at;
  insert into public.house_events (household_id, date, events, players) values (house, d, night_events, night_players)
    on conflict (household_id, date) do update set events = excluded.events, players = excluded.players;
end;
$$;
revoke execute on function public.record_house_night(uuid, date, jsonb, jsonb, jsonb) from public, anon, authenticated;

grant select on public.house_states, public.house_events to authenticated;
grant select, insert, update on public.outings to authenticated;
grant select, insert, delete on public.house_orders to authenticated;

alter table public.house_states enable row level security;
alter table public.house_events enable row level security;
alter table public.outings enable row level security;
alter table public.house_orders enable row level security;

create policy "house state" on public.house_states for select to authenticated
  using (household_id = public.my_household());
create policy "house events" on public.house_events for select to authenticated
  using (household_id = public.my_household());
create policy "house outings" on public.outings for select to authenticated
  using (public.can_see_player(player_id));
create policy "start my outing while the day is open" on public.outings for insert to authenticated
  with check (player_id = (select auth.uid()) and public.day_is_open(player_id, date));
create policy "play my outing while the day is open" on public.outings for update to authenticated
  using (player_id = (select auth.uid()) and public.day_is_open(player_id, date))
  with check (player_id = (select auth.uid()) and public.day_is_open(player_id, date));
create policy "house orders" on public.house_orders for select to authenticated
  using (household_id = public.my_household());
create policy "order while my day is open" on public.house_orders for insert to authenticated
  with check (player_id = (select auth.uid()) and household_id = public.my_household() and public.day_is_open(player_id, date));
create policy "cancel my order while my day is open" on public.house_orders for delete to authenticated
  using (player_id = (select auth.uid()) and public.day_is_open(player_id, date));
