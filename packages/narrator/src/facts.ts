import { skillDef } from "@inn/content";
import { tierValue, type LevelEvent, type PlayerState } from "@inn/engine";
import type { Habit, SkillDef } from "@inn/schema";
import type { PlayerNight } from "./schema.ts";

/** Fills a catalog summary's {n} with the tier's number. */
export function skillSummary(def: SkillDef, tier: number): string {
  const e = def.effect;
  const n = e.kind === "grace_day" ? tierValue(e.chargesPerWeek, tier) : tierValue(e.percent, tier);
  return def.summary.replace("{n}", String(n));
}

export function fallbackSkillName(def: SkillDef, tier: number): string {
  return def.fallbackNames[Math.min(tier, def.fallbackNames.length) - 1] ?? def.fallbackNames[0]!;
}

export interface PlayerInfo {
  playerId: string;
  name: string;
  /** The class as shown, evolution included. */
  className: string;
  habits: readonly Habit[];
  /** Names already given to held Skills, by `${defId}:${tier}`. */
  skillNames: Readonly<Record<string, string>>;
}

/** Turns one player's night (engine events and the new state) into the facts Claude narrates. */
export function playerNight(info: PlayerInfo, state: PlayerState, events: readonly LevelEvent[], doneHabitIds: readonly string[]): PlayerNight {
  const habitName = (id: string) => info.habits.find((h) => h.id === id)?.name ?? "a habit";
  const nameOf = (defId: string, tier: number) => info.skillNames[`${defId}:${tier}`] ?? fallbackSkillName(skillDef(defId), tier);
  const night: PlayerNight = {
    playerId: info.playerId,
    name: info.name,
    className: info.className,
    level: state.progress.level,
    levelsGained: [],
    skillsGained: [],
    skillChoice: [],
    evolutionOffer: [],
    habitsDone: [...new Set(doneHabitIds.map(habitName))],
    graced: [],
    skillsHeld: state.skills.map((s) => nameOf(s.defId, s.tier)),
  };
  for (const e of events) {
    if (e.type === "level_up") night.levelsGained.push(e.level);
    if (e.type === "skill_granted") {
      const { skill } = e.grant;
      const def = skillDef(skill.defId);
      night.skillsGained.push({
        defId: skill.defId,
        tier: skill.tier,
        theme: skill.theme,
        summary: skillSummary(def, skill.tier),
        fallbackName: fallbackSkillName(def, skill.tier),
        ...(e.grant.kind === "upgrade" ? { upgradedFrom: { tier: e.grant.fromTier, name: nameOf(skill.defId, e.grant.fromTier) } } : {}),
      });
    }
    if (e.type === "skill_choice_offered") {
      night.skillChoice = e.options.map((g) => {
        const def = skillDef(g.skill.defId);
        return { defId: def.id, tier: g.skill.tier, theme: g.skill.theme, summary: skillSummary(def, g.skill.tier), fallbackName: fallbackSkillName(def, g.skill.tier) };
      });
    }
    if (e.type === "evolution_offered") night.evolutionOffer = e.options.map((o) => ({ optionId: o.id, domain: o.domain, fallbackName: o.fallbackName }));
    if (e.type === "evolution_chosen") night.evolutionChosen = e.option.fallbackName;
    if (e.type === "grace") night.graced.push(habitName(e.habitId));
    if (e.type === "comeback") night.comebackAfterDays = e.daysAway;
  }
  return night;
}
