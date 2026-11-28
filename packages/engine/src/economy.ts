import type { Habit, HabitLog, Resource, Resources } from "@inn/schema";
import type { Tuning } from "./tuning.ts";

export interface Earnings {
  /** For the shared house. */
  resources: Required<Resources>;
  /** For the player who logged. */
  stamina: number;
}

export const NO_RESOURCES: Required<Resources> = { coins: 0, supplies: 0, mana: 0, goodwill: 0 };

/** What one log earns: coins always, the rest by domain, all by the log's tier. */
export function logEarnings(log: HabitLog, habit: Habit, tuning: Tuning): Earnings {
  const tier = log.kind === "tiny" ? "tiny" : (log.tier ?? habit.tier);
  const { perTier, domains } = tuning.economy;
  const by = (r: keyof typeof domains) => (domains[r].includes(habit.domain) ? perTier[r][tier] : 0);
  return {
    resources: { coins: perTier.coins[tier], supplies: by("supplies"), mana: by("mana"), goodwill: by("goodwill") },
    stamina: by("stamina"),
  };
}

/** A day's earnings across logs. Logs for unknown habits earn nothing. */
export function dayEarnings(logs: readonly HabitLog[], habits: readonly Habit[], tuning: Tuning): Earnings {
  const out: Earnings = { resources: { ...NO_RESOURCES }, stamina: 0 };
  for (const log of logs) {
    const habit = habits.find((h) => h.id === log.habitId);
    if (!habit) continue;
    const e = logEarnings(log, habit, tuning);
    out.resources = addResources(out.resources, e.resources);
    out.stamina += e.stamina;
  }
  return out;
}

export function addResources(a: Required<Resources>, b: Resources): Required<Resources> {
  return { coins: a.coins + (b.coins ?? 0), supplies: a.supplies + (b.supplies ?? 0), mana: a.mana + (b.mana ?? 0), goodwill: a.goodwill + (b.goodwill ?? 0) };
}

export function canAfford(have: Required<Resources>, cost: Resources): boolean {
  return (Object.keys(cost) as Resource[]).every((r) => have[r] >= (cost[r] ?? 0));
}

export function spend(have: Required<Resources>, cost: Resources): Required<Resources> {
  if (!canAfford(have, cost)) throw new Error("can't afford it");
  return { coins: have.coins - (cost.coins ?? 0), supplies: have.supplies - (cost.supplies ?? 0), mana: have.mana - (cost.mana ?? 0), goodwill: have.goodwill - (cost.goodwill ?? 0) };
}
