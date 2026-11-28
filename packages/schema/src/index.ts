/** Row types generated from supabase/migrations by `pnpm db:types`. Do not edit by hand. */
export type { Database, Json } from "./database.ts";

import { z } from "zod";

/** A calendar day in the player's own timezone, `YYYY-MM-DD`. Never a timestamp. */
export const LocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
export type LocalDate = z.infer<typeof LocalDate>;

export const Domain = z.enum([
  "home",
  "nourish",
  "endurance",
  "strength",
  "recovery",
  "mind",
  "craft",
  "spirit",
  "bonds",
  "rest",
]);
export type Domain = z.infer<typeof Domain>;

export const Tier = z.enum(["tiny", "normal", "big"]);
export type Tier = z.infer<typeof Tier>;

/** 0 = Monday … 6 = Sunday. Weeks run Monday to Sunday. */
export const Weekday = z.number().int().min(0).max(6);
export type Weekday = z.infer<typeof Weekday>;

export const Habit = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: Domain,
  /** The tier a full log earns unless the log names its own (e.g. a 45+ min lift is big). */
  tier: Tier,
  tinyVersion: z.string().min(1),
});
export type Habit = z.infer<typeof Habit>;

/**
 * One goal period. Changing a goal adds a new row with a later startDate; each day
 * is judged against the row active on it, so a lowered goal never rewrites history.
 */
export const Goal = z.object({
  habitId: z.string().min(1),
  period: z.enum(["day", "week"]),
  /** Day goals: sessions per scheduled day (normally 1). Week goals: sessions per week. */
  target: z.number().int().min(1),
  /** Day goals only: which weekdays are scheduled. Omitted = every day. */
  days: z.array(Weekday).optional(),
  startDate: LocalDate,
  endDate: LocalDate.optional(),
  /** Prescribed goals (PT) are never raised, and sessions past target earn reduced XP. */
  prescribed: z.boolean(),
});
export type Goal = z.infer<typeof Goal>;

export const HabitLog = z.object({
  habitId: z.string().min(1),
  date: LocalDate,
  kind: z.enum(["full", "tiny"]),
  /** Overrides the habit's tier for a full log (workout length, deep clean, sleep hours). */
  tier: Tier.optional(),
  source: z.enum(["tap", "apple_health"]),
  healthWorkoutId: z.string().optional(),
  /** Set when the log came from checking off a chore. */
  choreId: z.string().optional(),
  /** The real day it happened, when that differs from `date` (a workout that synced after its day closed). */
  performedOn: LocalDate.optional(),
});
export type HabitLog = z.infer<typeof HabitLog>;

/** Paused days are neither done nor missed. `habitIds` omitted = every habit. */
export const Pause = z.object({
  habitIds: z.array(z.string().min(1)).optional(),
  startDate: LocalDate,
  endDate: LocalDate,
});
export type Pause = z.infer<typeof Pause>;

export const ClassPath = z.object({
  id: z.string().min(1),
  name: z.string().regex(/^\[.+\]$/, "class names are bracketed, e.g. [Rider]"),
  focusDomains: z.array(Domain).min(1),
  blurb: z.string().min(1),
});
export type ClassPath = z.infer<typeof ClassPath>;

/** When a chore comes back: N days after it was last done, or on set weekdays. */
export const RepeatRule = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("every"), days: z.number().int().min(1) }),
  z.object({ kind: z.literal("weekly"), days: z.array(Weekday).min(1) }),
]);
export type RepeatRule = z.infer<typeof RepeatRule>;

/** One item on the shared house chore list. Checking it off writes a Home HabitLog. */
export const Chore = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  roomId: z.string().min(1),
  /** Sets the tier of the log it writes. */
  size: Tier,
  /** Omitted = a one-off chore, gone once done. */
  repeat: RepeatRule.optional(),
  /** A player id. Omitted = either player. */
  assignee: z.string().min(1).optional(),
  createdOn: LocalDate,
  lastDoneOn: LocalDate.optional(),
  lastDoneBy: z.string().min(1).optional(),
});
export type Chore = z.infer<typeof Chore>;

/**
 * A workout as read from Apple Health. Only these fields exist: no heart rate, no samples.
 * `fromGarmin` is used on the phone to pick between duplicate records of one session.
 */
export const HealthWorkout = z.object({
  id: z.string().min(1),
  type: z.enum(["cycling", "strength"]),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  durationMin: z.number().nonnegative(),
  distanceKm: z.number().nonnegative().optional(),
  fromGarmin: z.boolean(),
});
export type HealthWorkout = z.infer<typeof HealthWorkout>;

/** What a Skill does. Every number is per tier (index 0 = tier 1), so an upgrade is a lookup. */
export const SkillEffect = z.discriminatedUnion("kind", [
  /** Passive: +percent XP on logs in these domains. */
  z.object({ kind: z.literal("xp_bonus"), domains: z.array(Domain).min(1), percent: z.array(z.number().positive()).min(1) }),
  /** Triggered: the first log in these domains after a missed scheduled day earns +percent. */
  z.object({ kind: z.literal("after_miss_bonus"), domains: z.array(Domain).min(1), percent: z.array(z.number().positive()).min(1) }),
  /** Active: tap to mark a missed habit in these domains done for the day; charges refill each Monday. */
  z.object({ kind: z.literal("grace_day"), domains: z.array(Domain).min(1), chargesPerWeek: z.array(z.number().int().positive()).min(1) }),
]);
export type SkillEffect = z.infer<typeof SkillEffect>;

/**
 * A Skill mechanic from the catalog. The rules pick one when a slot opens; Claude only
 * names it. `fallbackNames[tier - 1]` is used when narration fails.
 */
export const SkillDef = z.object({
  id: z.string().min(1),
  /** The domain whose habits lead to this Skill. */
  theme: Domain,
  type: z.enum(["passive", "triggered", "active", "house", "partner", "expedition"]),
  effect: SkillEffect,
  fallbackNames: z.array(z.string().regex(/^\[.+\]$/)).min(1),
  /** One line for the character sheet, with {n} for the tier's number. */
  summary: z.string().min(1),
});
export type SkillDef = z.infer<typeof SkillDef>;

/** A Skill a player holds. Skills are never lost; a second Skill in the same theme raises the tier. */
export const SkillInstance = z.object({
  defId: z.string().min(1),
  theme: Domain,
  tier: z.number().int().min(1),
  grantedLevel: z.number().int().min(1),
});
export type SkillInstance = z.infer<typeof SkillInstance>;

/** One of the class evolutions offered at Level 10: base class plus a qualifier from a domain. */
export const EvolutionOption = z.object({
  id: z.string().min(1),
  /** The domain the qualifier comes from; the evolved class adds it to its focus domains. */
  domain: Domain,
  fallbackName: z.string().regex(/^\[.+\]$/),
});
export type EvolutionOption = z.infer<typeof EvolutionOption>;

// M3: the house in Liscor -------------------------------------------------------

/** The four shared currencies. Stamina is per player and lives in PlayerState. */
export const Resource = z.enum(["coins", "supplies", "mana", "goodwill"]);
export type Resource = z.infer<typeof Resource>;
export const Resources = z.partialRecord(Resource, z.number().int().min(0));
export type Resources = z.infer<typeof Resources>;

/** Things that land in the shared stash. */
export const ItemDef = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["bulk", "consumable", "food", "trophy"]),
  description: z.string().min(1),
  /** Food: stamina for whoever eats it (at the next close). */
  stamina: z.number().int().positive().optional(),
  /** Goodwill when served to visitors (M4). */
  goodwill: z.number().int().positive().optional(),
});
export type ItemDef = z.infer<typeof ItemDef>;

export const Loot = z.object({
  resources: Resources.optional(),
  items: z.record(z.string(), z.number().int().positive()).optional(),
});
export type Loot = z.infer<typeof Loot>;

/** One rung of the house upgrade ladder. Built overnight once ordered and affordable. */
export const Upgrade = z.object({
  id: z.string().min(1),
  /** Position on the ladder; each needs the one before it. */
  step: z.number().int().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  cost: Resources,
  /** A Skill theme someone in the house must hold (the garden needs a Spirit Skill). */
  needsSkillTheme: Domain.optional(),
  /** One line for the house scene once it's built. */
  scene: z.string().min(1),
});
export type Upgrade = z.infer<typeof Upgrade>;

export const Recipe = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Cookfire works from day one; the kitchen needs its upgrade. */
  station: z.enum(["cookfire", "kitchen"]),
  cost: Resources,
  output: z.object({ itemId: z.string().min(1), qty: z.number().int().positive() }),
  description: z.string().min(1),
});
export type Recipe = z.infer<typeof Recipe>;

/** A Tier 1 expedition event: a setup and 2-3 choices, each a d20 check helped by a Skill theme. */
export const ExpeditionEvent = z.object({
  id: z.string().min(1),
  tier: z.literal(1),
  place: z.string().min(1),
  setup: z.string().min(1),
  choices: z
    .array(
      z.object({
        label: z.string().min(1),
        /** Holding a Skill in this theme adds to the roll. */
        theme: Domain,
        /** The d20 total needed to succeed. */
        difficulty: z.number().int().min(2).max(20),
        success: z.object({ text: z.string().min(1), loot: Loot }),
        failure: z.object({ text: z.string().min(1), loot: Loot }),
      }),
    )
    .min(2)
    .max(3),
});
export type ExpeditionEvent = z.infer<typeof ExpeditionEvent>;

// M4: visitors and quests --------------------------------------------------------

/**
 * What a quest asks, measured from logs the players already make. `domain_count`: N logs
 * in a domain within the window. `daily_domain`: a log in the domain on each of N days in
 * a row. `chores`: N chores checked off. Co-op quests count both players.
 */
export const QuestSpec = z.object({
  kind: z.enum(["domain_count", "daily_domain", "chores"]),
  domain: Domain.optional(),
  target: z.number().int().min(1),
  /** Days the quest runs once accepted, starting the next day. */
  days: z.number().int().min(1).max(14),
  coop: z.boolean(),
  /** One line, the visitor's ask in plain words. */
  ask: z.string().min(1),
});
export type QuestSpec = z.infer<typeof QuestSpec>;

/** Someone who knocks on the house's door with a quest. */
export const VisitorTemplate = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** How they arrive and what they say, for the house screen. Original prose. */
  line: z.string().min(1),
  rarity: z.enum(["common", "uncommon", "rare"]),
  /** An upgrade the house needs before they'll come (the yard draws the Watch). */
  needsUpgrade: z.string().min(1).optional(),
  /** Only arrives after an evening at the Wandering Inn, or once the door is built. */
  fromInn: z.boolean(),
  quest: QuestSpec,
  reward: z.object({ resources: z.partialRecord(z.enum(["coins", "supplies", "mana", "goodwill"]), z.number().int().min(0)), recruit: z.string().min(1).optional() }),
  /** What they say when the quest is done. */
  thanks: z.string().min(1),
});
export type VisitorTemplate = z.infer<typeof VisitorTemplate>;

/** Someone who stays on after a quest and helps around the house every night. */
export const Recruit = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  perNight: z.partialRecord(z.enum(["coins", "supplies", "mana", "goodwill"]), z.number().int().min(0)),
});
export type Recruit = z.infer<typeof Recruit>;

/** A short evening at the Wandering Inn, shown at once. */
export const InnScene = z.object({ id: z.string().min(1), text: z.string().min(1) });
export type InnScene = z.infer<typeof InnScene>;
