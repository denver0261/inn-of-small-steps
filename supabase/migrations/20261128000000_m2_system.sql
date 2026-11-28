-- M2 The System: the nightly close's saved state and output, the player's choices, and
-- "Go to sleep". The nightly job (packages/night) writes with the service role, and only
-- through record_night / record_story, so a crashed run never leaves half a night behind.
--
-- Access rules:
--   * A player's engine state and raw events are theirs alone.
--   * The morning (story, System messages, Skill and class names) is the house's: one
--     story features both players.
--   * Choices (Level 10 picks, grace days) are written by their player while the day is open.

-- Closing a day -------------------------------------------------------------------

-- 'sleep' = the player pressed "Go to sleep"; 'auto' = the job closed it at 4:00.
alter table public.day_closes add column source text not null default 'auto' check (source in ('sleep', 'auto'));
-- Set when the engine has run for the day. A closed, unprocessed day is waiting for the job.
alter table public.day_closes add column processed_at timestamptz;
create index day_closes_unprocessed_idx on public.day_closes (player_id, date) where processed_at is null;

-- The player's game day: days roll over at 4:00 local (packages/engine clock.ts).
create function public.game_date(tz text, at timestamptz default now()) returns date
language sql stable set search_path = ''
as $$
  select ((at at time zone tz) - interval '4 hours')::date
$$;

-- "Go to sleep": closes today now, so the morning can come early. Logs lock at once.
create function public.go_to_sleep() returns date
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  today date;
begin
  select public.game_date(time_zone) into today from public.players where id = me;
  if today is null then raise exception 'create your player first'; end if;
  insert into public.day_closes (player_id, date, source) values (me, today, 'sleep')
    on conflict (player_id, date) do nothing;
  return today;
end;
$$;

-- Saved engine state ------------------------------------------------------------

create table public.player_states (
  player_id uuid primary key references public.players (id) on delete cascade,
  -- packages/engine PlayerState; `version` inside it drives migrateState.
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.level_events (
  player_id uuid not null references public.players (id) on delete cascade,
  date date not null,
  -- packages/engine LevelEvent[] for the day, and the state right after it.
  events jsonb not null,
  state_after jsonb not null,
  primary key (player_id, date)
);

-- What the player picked in the app today; read when the day closes.
create table public.night_choices (
  player_id uuid not null default auth.uid() references public.players (id) on delete cascade,
  date date not null,
  skill text,
  evolution text,
  reroll_evolution boolean not null default false,
  grace text[] not null default '{}',
  primary key (player_id, date)
);

-- The morning -------------------------------------------------------------------

create table public.story_entries (
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  scene text not null check (length(scene) between 1 and 2000),
  -- 'claude' or 'template' (the fallback), and why Claude's text wasn't used.
  source text not null check (source in ('claude', 'template')),
  error text,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  primary key (household_id, date)
);

create table public.system_messages (
  player_id uuid not null references public.players (id) on delete cascade,
  date date not null,
  messages text[] not null,
  primary key (player_id, date)
);

-- Names the System gave a player's Skills, per tier, and their Level 10 evolution options.
create table public.skill_names (
  player_id uuid not null references public.players (id) on delete cascade,
  def_id text not null,
  tier int not null check (tier >= 1),
  name text not null check (name ~ '^\[[^]0-9]{1,38}\]$'),
  text text not null,
  primary key (player_id, def_id, tier)
);

create table public.evolution_names (
  player_id uuid not null references public.players (id) on delete cascade,
  option_id text not null,
  name text not null check (name ~ '^\[[^]0-9]{1,38}\]$'),
  text text not null,
  primary key (player_id, option_id)
);

-- Writing a night (service role only) --------------------------------------------

-- Saves one player's closed day atomically: state, events, processed.
create function public.record_night(p uuid, d date, new_state jsonb, day_events jsonb) returns void
language plpgsql set search_path = ''
as $$
begin
  insert into public.player_states (player_id, state, updated_at) values (p, new_state, now())
    on conflict (player_id) do update set state = excluded.state, updated_at = excluded.updated_at;
  insert into public.level_events (player_id, date, events, state_after) values (p, d, day_events, new_state)
    on conflict (player_id, date) do update set events = excluded.events, state_after = excluded.state_after;
  update public.day_closes set processed_at = now() where player_id = p and date = d;
end;
$$;

-- Saves one household's morning atomically. `players` is
-- [{player_id, messages: text[], skill_names: [{def_id, tier, name, text}], evolution_names: [{option_id, name, text}]}].
create function public.record_story(house uuid, d date, scene text, src text, err text, version text, players jsonb) returns void
language plpgsql set search_path = ''
as $$
declare
  pl jsonb;
  item jsonb;
begin
  insert into public.story_entries (household_id, date, scene, source, error, prompt_version)
    values (house, d, scene, src, nullif(err, ''), version)
    on conflict (household_id, date) do nothing;
  if not found then return; end if;
  for pl in select * from jsonb_array_elements(players) loop
    insert into public.system_messages (player_id, date, messages)
      values ((pl->>'player_id')::uuid, d, array(select jsonb_array_elements_text(pl->'messages')))
      on conflict (player_id, date) do update set messages = excluded.messages;
    for item in select * from jsonb_array_elements(pl->'skill_names') loop
      insert into public.skill_names (player_id, def_id, tier, name, text)
        values ((pl->>'player_id')::uuid, item->>'def_id', (item->>'tier')::int, item->>'name', item->>'text')
        on conflict (player_id, def_id, tier) do nothing;
    end loop;
    for item in select * from jsonb_array_elements(pl->'evolution_names') loop
      insert into public.evolution_names (player_id, option_id, name, text)
        values ((pl->>'player_id')::uuid, item->>'option_id', item->>'name', item->>'text')
        on conflict (player_id, option_id) do update set name = excluded.name, text = excluded.text;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.record_night(uuid, date, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.record_story(uuid, date, text, text, text, text, jsonb) from public, anon, authenticated;

-- Grants and row-level security ----------------------------------------------------

grant select on public.player_states, public.level_events, public.story_entries,
  public.system_messages, public.skill_names, public.evolution_names to authenticated;
grant select, insert, update on public.night_choices to authenticated;

alter table public.player_states enable row level security;
alter table public.level_events enable row level security;
alter table public.night_choices enable row level security;
alter table public.story_entries enable row level security;
alter table public.system_messages enable row level security;
alter table public.skill_names enable row level security;
alter table public.evolution_names enable row level security;

create policy "my state" on public.player_states for select to authenticated
  using (player_id = (select auth.uid()));
create policy "my events" on public.level_events for select to authenticated
  using (player_id = (select auth.uid()));
create policy "my choices" on public.night_choices for select to authenticated
  using (player_id = (select auth.uid()));
create policy "choose while the day is open" on public.night_choices for insert to authenticated
  with check (player_id = (select auth.uid()) and public.day_is_open(player_id, date));
create policy "change my choice while the day is open" on public.night_choices for update to authenticated
  using (player_id = (select auth.uid()) and public.day_is_open(player_id, date))
  with check (player_id = (select auth.uid()) and public.day_is_open(player_id, date));
create policy "house story" on public.story_entries for select to authenticated
  using (household_id = public.my_household());
create policy "house messages" on public.system_messages for select to authenticated
  using (public.can_see_player(player_id));
create policy "house skill names" on public.skill_names for select to authenticated
  using (public.can_see_player(player_id));
create policy "house evolution names" on public.evolution_names for select to authenticated
  using (public.can_see_player(player_id));
