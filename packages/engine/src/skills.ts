import { Domain, type EvolutionOption, type SkillDef, type SkillInstance } from "@inn/schema";
import { pick, type Rng } from "./rng.ts";

/** Domains by score, highest first, zero scores dropped; ties go to focus domains, then the design's domain order. */
export function domainRanking(
  sessionsByDomain: Readonly<Partial<Record<Domain, number>>>,
  focusDomains: readonly Domain[],
): Domain[] {
  const order = Domain.options;
  return order
    .filter((d) => (sessionsByDomain[d] ?? 0) > 0)
    .sort((a, b) => {
      const diff = (sessionsByDomain[b] ?? 0) - (sessionsByDomain[a] ?? 0);
      if (diff !== 0) return diff;
      const fa = focusDomains.includes(a) ? 0 : 1;
      const fb = focusDomains.includes(b) ? 0 : 1;
      return fa !== fb ? fa - fb : order.indexOf(a) - order.indexOf(b);
    });
}

/** A tier's number from a per-tier list; tiers past the list use the last entry. */
export function tierValue(values: readonly number[], tier: number): number {
  return values[Math.min(tier, values.length) - 1] ?? 0;
}

export function maxTier(def: SkillDef): number {
  const e = def.effect;
  return e.kind === "grace_day" ? e.chargesPerWeek.length : e.percent.length;
}

/**
 * Theme scores for a Skill slot: path-weighted activity (as XP weighs it) divided by
 * 1 + the tier already held in that theme, so what you do most still leads but a
 * theme you've just grown gives the next slot to something else.
 */
export function grantScores(
  activity: Readonly<Partial<Record<Domain, number>>>,
  held: readonly SkillInstance[],
): Partial<Record<Domain, number>> {
  const out: Partial<Record<Domain, number>> = {};
  for (const [domain, score] of Object.entries(activity) as [Domain, number][]) {
    const tier = held.find((s) => s.theme === domain)?.tier ?? 0;
    out[domain] = score / (1 + tier);
  }
  return out;
}

export type SkillGrant =
  | { kind: "new"; skill: SkillInstance }
  | { kind: "upgrade"; skill: SkillInstance; fromTier: number };

/**
 * What a Skill slot gives: the top-ranked theme the player can still grow. Holding a
 * Skill in that theme upgrades it ("same theme upgrades, not stacks"); a maxed theme
 * passes to the next one. Undefined only when every theme is maxed or unknown.
 */
export function planSkillGrant(
  held: readonly SkillInstance[],
  ranking: readonly Domain[],
  catalog: readonly SkillDef[],
  level: number,
  rng: Rng,
  exclude: readonly string[] = [],
): SkillGrant | undefined {
  for (const theme of ranking) {
    const owned = held.find((s) => s.theme === theme);
    if (owned) {
      const def = catalog.find((d) => d.id === owned.defId);
      if (def && owned.tier < maxTier(def) && !exclude.includes(def.id)) {
        return { kind: "upgrade", fromTier: owned.tier, skill: { ...owned, tier: owned.tier + 1 } };
      }
      continue;
    }
    const options = catalog.filter((d) => d.theme === theme && !exclude.includes(d.id));
    if (options.length === 0) continue;
    const def = pick(rng, options);
    return { kind: "new", skill: { defId: def.id, theme, tier: 1, grantedLevel: level } };
  }
  return undefined;
}

export function applyGrant(held: readonly SkillInstance[], grant: SkillGrant): SkillInstance[] {
  return grant.kind === "new" ? [...held, grant.skill] : held.map((s) => (s.defId === grant.skill.defId ? grant.skill : s));
}

/**
 * The XP bonus Skills give one log, as a share (0.1 = +10%), capped at `cap` so Skills
 * speed you up without breaking the level curve. `afterMiss` is true for the first log
 * of a habit that has missed sessions waiting (the same moment the rusty bonus pays).
 */
export function skillXpBonus(
  held: readonly SkillInstance[],
  catalog: readonly SkillDef[],
  domain: Domain,
  afterMiss: boolean,
  cap: number,
): number {
  let total = 0;
  for (const s of held) {
    const e = catalog.find((d) => d.id === s.defId)?.effect;
    if (!e || !e.domains.includes(domain)) continue;
    if (e.kind === "xp_bonus") total += tierValue(e.percent, s.tier) / 100;
    if (e.kind === "after_miss_bonus" && afterMiss) total += tierValue(e.percent, s.tier) / 100;
  }
  return Math.min(cap, total);
}

/** Grace-day charges a player has per week for habits in `domain`, across all their Skills. */
export function graceCharges(held: readonly SkillInstance[], catalog: readonly SkillDef[], domain: Domain): { defId: string; charges: number }[] {
  const out: { defId: string; charges: number }[] = [];
  for (const s of held) {
    const e = catalog.find((d) => d.id === s.defId)?.effect;
    if (e?.kind === "grace_day" && e.domains.includes(domain)) out.push({ defId: s.defId, charges: tierValue(e.chargesPerWeek, s.tier) });
  }
  return out;
}

/**
 * The Level 10 evolution offer: three qualifiers, each from a domain the player actually
 * did, strongest first. A reroll offers the next three. Fewer than three domains are
 * padded from the focus domains so there is always a choice.
 */
export function evolutionOptions(
  ranking: readonly Domain[],
  focusDomains: readonly Domain[],
  className: string,
  qualifiers: Readonly<Record<string, string>>,
  reroll: boolean,
): EvolutionOption[] {
  const pool = [...ranking, ...focusDomains.filter((d) => !ranking.includes(d)), ...Domain.options.filter((d) => !ranking.includes(d) && !focusDomains.includes(d))];
  const chosen = reroll ? pool.slice(3, 6) : pool.slice(0, 3);
  const base = className.replace(/^\[|\]$/g, "");
  return chosen.map((domain) => ({ id: `evo_${domain}`, domain, fallbackName: `[${qualifiers[domain] ?? "Seasoned"} ${base}]` }));
}

/** A catalog summary with its {n} filled in for a tier ("+15% XP on Endurance habits."). */
export function skillSummary(def: SkillDef, tier: number): string {
  const e = def.effect;
  const n = e.kind === "grace_day" ? tierValue(e.chargesPerWeek, tier) : tierValue(e.percent, tier);
  return def.summary.replace("{n}", String(n));
}

/** The name used when the System hasn't named a Skill (or narration failed). */
export function fallbackSkillName(def: SkillDef, tier: number): string {
  return def.fallbackNames[Math.min(tier, def.fallbackNames.length) - 1] ?? def.fallbackNames[0] ?? `[${def.id}]`;
}
