import type { Domain, LocalDate, QuestSpec, VisitorTemplate } from "@inn/schema";
import { addDays, dateRange } from "./dates.ts";
import type { Rng } from "./rng.ts";
import type { Tuning } from "./tuning.ts";

/** A visitor waiting at the house with an offer. */
export interface VisitorOffer {
  /** `${templateId}:${arrivedOn}` */
  id: string;
  templateId: string;
  arrivedOn: LocalDate;
  /** They leave at the end of this day if nobody accepts. */
  leavesOn: LocalDate;
}

/** An accepted quest. It runs from the day after it was accepted through `endDate`. */
export interface ActiveQuest {
  id: string;
  templateId: string;
  acceptedBy: string;
  startDate: LocalDate;
  endDate: LocalDate;
}

/** One player's activity on one day, as quests see it. */
export interface DayActivity {
  date: LocalDate;
  playerId: string;
  /** Logs per domain. */
  domains: Partial<Record<Domain, number>>;
  /** Chores checked off. */
  chores: number;
}

export interface QuestProgress {
  done: number;
  target: number;
  met: boolean;
  /** The last day has passed (as of `asOf`). */
  over: boolean;
}

/**
 * How far a quest has come as of `asOf`, from activity the players logged anyway.
 * Co-op quests count everyone in the house; solo quests only the one who accepted.
 */
export function questProgress(quest: ActiveQuest, spec: QuestSpec, activity: readonly DayActivity[], asOf: LocalDate): QuestProgress {
  const last = asOf < quest.endDate ? asOf : quest.endDate;
  const days = dateRange(quest.startDate, last);
  const mine = activity.filter((a) => spec.coop || a.playerId === quest.acceptedBy);
  const on = (d: LocalDate) => mine.filter((a) => a.date === d);
  let done = 0;
  if (spec.kind === "domain_count") done = days.reduce((n, d) => n + on(d).reduce((m, a) => m + (spec.domain ? (a.domains[spec.domain] ?? 0) : 0), 0), 0);
  if (spec.kind === "chores") done = days.reduce((n, d) => n + on(d).reduce((m, a) => m + a.chores, 0), 0);
  if (spec.kind === "daily_domain") {
    // The longest run of days in a row with a log in the domain.
    let run = 0;
    for (const d of days) {
      const hit = on(d).some((a) => (spec.domain ? (a.domains[spec.domain] ?? 0) : 0) > 0);
      run = hit ? run + 1 : 0;
      done = Math.max(done, run);
    }
  }
  return { done: Math.min(done, spec.target), target: spec.target, met: done >= spec.target, over: asOf >= quest.endDate };
}

/** Starts a quest from an accepted offer: it runs from tomorrow for the template's days. */
export function acceptOffer(offer: VisitorOffer, template: VisitorTemplate, playerId: string, date: LocalDate): ActiveQuest {
  const startDate = addDays(date, 1);
  return { id: offer.id, templateId: offer.templateId, acceptedBy: playerId, startDate, endDate: addDays(startDate, template.quest.days - 1) };
}

export interface ArrivalContext {
  upgrades: readonly string[];
  goodwill: number;
  /** Someone spent tonight at the Wandering Inn. */
  innTonight: boolean;
  /** Templates already waiting or on an active quest; they don't come twice. */
  busy: readonly string[];
}

/** Who may knock: their upgrade is built, and Inn folk only come via the Inn or the door. */
export function eligibleVisitors(templates: readonly VisitorTemplate[], ctx: ArrivalContext, innOnly: boolean): VisitorTemplate[] {
  const door = ctx.upgrades.includes("guest_room");
  return templates.filter(
    (t) =>
      !ctx.busy.includes(t.id) &&
      (t.needsUpgrade === undefined || ctx.upgrades.includes(t.needsUpgrade)) &&
      (innOnly ? t.fromInn : !t.fromInn || door || ctx.innTonight),
  );
}

/** A weighted draw: rare visitors grow more likely as goodwill builds. */
export function drawVisitor(pool: readonly VisitorTemplate[], goodwill: number, rng: Rng, tuning: Tuning): VisitorTemplate | undefined {
  if (pool.length === 0) return undefined;
  const w = tuning.visitors.weights;
  const weight = (t: VisitorTemplate) => (t.rarity === "rare" ? w.rare + goodwill * tuning.visitors.rareWeightPerGoodwill : w[t.rarity]);
  const total = pool.reduce((n, t) => n + weight(t), 0);
  let r = rng() * total;
  for (const t of pool) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return pool.at(-1);
}

/** The chance a visitor knocks on a given roll: grows a little with goodwill, capped. */
export function arrivalChance(goodwill: number, tuning: Tuning): number {
  return Math.min(tuning.visitors.maxChance, tuning.visitors.baseChance + goodwill * tuning.visitors.chancePerGoodwill);
}
