import type { ExpeditionEvent, Loot, SkillInstance } from "@inn/schema";
import { mulberry32, hashSeed, type Rng } from "./rng.ts";
import type { Tuning } from "./tuning.ts";

export interface ExpeditionContext {
  level: number;
  skills: readonly SkillInstance[];
  /** Outings since the last rare find (bad-luck protection). */
  pity: number;
}

/** A recorded outing: the seed fixes every draw, so the app's preview and the nightly replay agree. */
export interface OutingRecord {
  seed: string;
  eventIds: readonly string[];
  /** The choice index picked at each event, in order. Shorter than eventIds if abandoned. */
  choices: readonly number[];
}

export interface OutingStep {
  eventId: string;
  choice: number;
  roll: number;
  bonus: number;
  difficulty: number;
  success: boolean;
  text: string;
  loot: Loot;
}

export interface OutingResult {
  steps: OutingStep[];
  loot: Loot;
  /** A trophy found by the rare roll, if any. */
  rare?: string;
  /** Pity after this outing. */
  pity: number;
}

/** The seed for a player's nth outing on a day. */
export function outingSeed(playerId: string, date: string, index: number): string {
  return `${playerId}|${date}|outing|${index}`;
}

/** Draws an outing's events from the deck, without repeats. */
export function planOuting(seed: string, deck: readonly ExpeditionEvent[], tuning: Tuning): string[] {
  const rng = mulberry32(hashSeed(seed, "plan"));
  const pool = [...deck];
  const out: string[] = [];
  while (out.length < tuning.expedition.events && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]!.id);
  }
  return out;
}

/** What the player adds to a d20: a Skill in the choice's theme (by tier) and a little per few levels. */
export function rollBonus(theme: string, ctx: ExpeditionContext, tuning: Tuning): number {
  const skill = ctx.skills.find((s) => s.theme === theme);
  return (skill ? skill.tier * tuning.expedition.skillBonusPerTier : 0) + Math.floor(ctx.level / tuning.expedition.levelPerBonus);
}

function d20(rng: Rng): number {
  return 1 + Math.floor(rng() * 20);
}

/**
 * Replays an outing. Pure and deterministic: the same record and context always give the
 * same rolls, text and loot. Choices outside an event's range count as the first choice.
 */
export function resolveOuting(record: OutingRecord, deck: readonly ExpeditionEvent[], ctx: ExpeditionContext, rarePool: readonly string[], tuning: Tuning): OutingResult {
  const steps: OutingStep[] = [];
  let loot: Loot = {};
  record.choices.forEach((pick, i) => {
    const event = deck.find((e) => e.id === record.eventIds[i]);
    if (!event) return;
    const choice = event.choices[pick] ?? event.choices[0]!;
    const rng = mulberry32(hashSeed(record.seed, "step", String(i)));
    const roll = d20(rng);
    const bonus = rollBonus(choice.theme, ctx, tuning);
    const success = roll + bonus >= choice.difficulty;
    const outcome = success ? choice.success : choice.failure;
    steps.push({ eventId: event.id, choice: event.choices.indexOf(choice), roll, bonus, difficulty: choice.difficulty, success, text: outcome.text, loot: outcome.loot });
    loot = mergeLoot(loot, outcome.loot);
  });
  // Only a finished outing rolls for a rare find; pity grows by one per finished outing without one.
  const finished = steps.length === record.eventIds.length && steps.length > 0;
  if (!finished || rarePool.length === 0) return { steps, loot, pity: ctx.pity };
  const rng = mulberry32(hashSeed(record.seed, "rare"));
  const chance = tuning.expedition.rareBase + ctx.pity * tuning.expedition.rareStep;
  if (rng() < chance) {
    const rare = rarePool[Math.floor(rng() * rarePool.length)]!;
    return { steps, loot: mergeLoot(loot, { items: { [rare]: 1 } }), rare, pity: 0 };
  }
  return { steps, loot, pity: ctx.pity + 1 };
}

export function mergeLoot(a: Loot, b: Loot): Loot {
  const resources = { ...(a.resources ?? {}) };
  for (const [k, v] of Object.entries(b.resources ?? {})) resources[k as keyof typeof resources] = (resources[k as keyof typeof resources] ?? 0) + (v ?? 0);
  const items = { ...(a.items ?? {}) };
  for (const [k, v] of Object.entries(b.items ?? {})) items[k] = (items[k] ?? 0) + v;
  return { ...(Object.keys(resources).length ? { resources } : {}), ...(Object.keys(items).length ? { items } : {}) };
}
