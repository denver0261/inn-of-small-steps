import { SKILL_CATALOG } from "@inn/content";
import { fallbackSkillName, graceCharges, skillSummary, weekStart, xpToNext, type PlayerState, type Tuning } from "@inn/engine";
import type { Domain, LocalDate, SkillInstance } from "@inn/schema";

export type Names = Record<string, { name: string; text: string }>;

/** The class as shown: the evolved name once chosen, otherwise the base path. */
export function displayClass(baseName: string, state: PlayerState, evolutionNames: Names): string {
  if (!state.evolution) return baseName;
  return evolutionNames[state.evolution.id]?.name ?? state.evolution.fallbackName;
}

export interface SkillView {
  defId: string;
  tier: number;
  name: string;
  /** What it does, with this tier's numbers. */
  summary: string;
  /** The System's line about it, when it named it. */
  flavor?: string;
  type: string;
}

export function skillView(s: Pick<SkillInstance, "defId" | "tier">, names: Names): SkillView {
  const def = SKILL_CATALOG.find((d) => d.id === s.defId);
  if (!def) return { defId: s.defId, tier: s.tier, name: `[${s.defId}]`, summary: "", type: "passive" };
  const named = names[`${s.defId}:${s.tier}`];
  const summary = skillSummary(def, s.tier);
  // The template stores the summary as the flavor; only show flavor the System actually wrote.
  const flavor = named && named.text !== summary ? named.text : undefined;
  return {
    defId: s.defId,
    tier: s.tier,
    name: named?.name ?? fallbackSkillName(def, s.tier),
    summary,
    type: def.type,
    ...(flavor ? { flavor } : {}),
  };
}

/** Progress toward the next level as of the last night. */
export function levelProgress(state: PlayerState, tuning: Tuning): { into: number; need: number; share: number } {
  const need = xpToNext(state.progress.level, tuning);
  const into = state.progress.xpIntoLevel;
  return { into, need, share: need > 0 ? into / need : 0 };
}

/**
 * Grace charges left this week for a habit in `domain`, net of what's already pending in
 * tonight's choices. The engine has the final say when the day closes.
 */
export function graceLeft(state: PlayerState, domain: Domain, today: LocalDate, pendingInDomain: number): number {
  const sources = graceCharges(state.skills, SKILL_CATALOG, domain);
  const sameWeek = state.graceUsed?.weekStart === weekStart(today);
  const left = sources.reduce((n, g) => n + g.charges - (sameWeek ? (state.graceUsed?.byDef[g.defId] ?? 0) : 0), 0);
  return Math.max(0, left - pendingInDomain);
}

/** The first grace Skill a habit in `domain` could draw on, for the button label. */
export function graceSkill(state: PlayerState, domain: Domain): Pick<SkillInstance, "defId" | "tier"> | undefined {
  const g = graceCharges(state.skills, SKILL_CATALOG, domain)[0];
  return g ? state.skills.find((s) => s.defId === g.defId) : undefined;
}

export function roman(n: number): string {
  return ["", "I", "II", "III", "IV", "V"][n] ?? String(n);
}
