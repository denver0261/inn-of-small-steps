# 0015: M4 visitor orders and quest activity in the nightly job

Date: 2026-11-27
Status: accepted

## Decisions

**Answering a visitor is an order.** `house_orders.kind` now also takes `accept`, `decline` and `serve` (with the visitor offer's id) and `inn` (an evening at the Wandering Inn). A unique index allows one Inn evening per player per day. The house's night settles them with the rest, as decision 0014 describes. pgTAP covers the new kinds and the once-a-day rule.

**Quest progress comes from the logs.** For a house's night the job gathers every housemate's logs from the earliest running quest's start through tonight. It counts them by habit domain, plus chores (logs that came from a chore), and passes that to the engine.

**The morning hears about visitors.** Arrivals ("A Gnoll butcher from the market will be at the door this morning."), finished quests (the visitor's thanks) and evenings at the Inn go into `houseNews`.

## Verified

A job test runs the loop end to end over four nights: Sam accepts the Gnoll butcher's bet while Kyle spends the evening at the Inn, which brings an Inn regular to the door. Sam eats well three days running, and on the third night the quest pays out, the house's goodwill rises, and the morning carries the butcher's thanks.
