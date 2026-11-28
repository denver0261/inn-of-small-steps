-- M4 Visitors and quests: answering a visitor and spending an evening at the Inn are
-- orders too, settled in the house's night like building and cooking.
--   accept / decline / serve: ref is a visitor offer id from the house state
--   inn: an evening at the Wandering Inn, at most once a day per player

alter table public.house_orders drop constraint house_orders_kind_check;
alter table public.house_orders add constraint house_orders_kind_check
  check (kind in ('build', 'craft', 'meal', 'accept', 'decline', 'serve', 'inn'));

create unique index house_orders_one_inn_a_day on public.house_orders (player_id, date) where kind = 'inn';
