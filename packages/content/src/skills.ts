import { SkillDef } from "@inn/schema";
import { z } from "zod";

/**
 * The Skill catalog: the mechanics the rules can grant. When a slot opens, the domain a
 * player did most in the last 14 days picks the theme, and one of that theme's entries
 * is granted (or upgraded, if they already hold a Skill in that theme). Claude names it.
 *
 * Numbers per tier are FLAGGED (decision 0007). All XP bonuses together cap at +50%
 * (`Tuning.skillXpCap`).
 */
export const SKILL_CATALOG: readonly SkillDef[] = z.array(SkillDef).parse([
  // Home
  { id: "clean_sweep", theme: "home", type: "triggered", effect: { kind: "after_miss_bonus", domains: ["home"], percent: [25, 35, 50] }, fallbackNames: ["[Clean Sweep]", "[Thorough Sweep]", "[Spotless Sweep]"], summary: "The first Home log after a missed day earns +{n}% XP." },
  { id: "everything_in_place", theme: "home", type: "passive", effect: { kind: "xp_bonus", domains: ["home"], percent: [10, 15, 20] }, fallbackNames: ["[Basic Cleaning]", "[Advanced Cleaning]", "[Everything in Its Place]"], summary: "+{n}% XP on Home habits." },
  // Nourish
  { id: "hearty_portions", theme: "nourish", type: "passive", effect: { kind: "xp_bonus", domains: ["nourish"], percent: [10, 15, 20] }, fallbackNames: ["[Hearty Portions]", "[Generous Portions]", "[Feast Portions]"], summary: "+{n}% XP on Nourish habits." },
  { id: "iron_stomach", theme: "nourish", type: "triggered", effect: { kind: "after_miss_bonus", domains: ["nourish"], percent: [25, 35, 50] }, fallbackNames: ["[Iron Stomach]", "[Steel Stomach]", "[Unshakable Stomach]"], summary: "The first Nourish log after a missed day earns +{n}% XP." },
  // Endurance
  { id: "second_wind", theme: "endurance", type: "active", effect: { kind: "grace_day", domains: ["endurance", "strength", "recovery"], chargesPerWeek: [1, 1, 2] }, fallbackNames: ["[Second Wind]", "[Third Wind]", "[Endless Wind]"], summary: "{n} a week: mark a missed workout or PT day done." },
  { id: "long_road", theme: "endurance", type: "passive", effect: { kind: "xp_bonus", domains: ["endurance"], percent: [10, 15, 20] }, fallbackNames: ["[Long Road]", "[Longer Road]", "[Road Remembers]"], summary: "+{n}% XP on Endurance habits." },
  // Strength
  { id: "strong_back", theme: "strength", type: "passive", effect: { kind: "xp_bonus", domains: ["strength"], percent: [10, 15, 20] }, fallbackNames: ["[Strong Back]", "[Stronger Back]", "[Unbowed Back]"], summary: "+{n}% XP on Strength habits." },
  { id: "steady_grip", theme: "strength", type: "triggered", effect: { kind: "after_miss_bonus", domains: ["strength"], percent: [25, 35, 50] }, fallbackNames: ["[Steady Grip]", "[Firm Grip]", "[Iron Grip]"], summary: "The first Strength log after a missed session earns +{n}% XP." },
  // Recovery
  { id: "limber", theme: "recovery", type: "passive", effect: { kind: "xp_bonus", domains: ["recovery", "endurance"], percent: [5, 10, 15] }, fallbackNames: ["[Limber]", "[Limber Stride]", "[Flowing Stride]"], summary: "+{n}% XP on Recovery and Endurance habits." },
  { id: "mend", theme: "recovery", type: "active", effect: { kind: "grace_day", domains: ["recovery"], chargesPerWeek: [1, 1, 2] }, fallbackNames: ["[Mend]", "[Greater Mend]", "[Mend the Long Hurt]"], summary: "{n} a week: mark a missed Recovery day done." },
  // Mind
  { id: "quick_study", theme: "mind", type: "passive", effect: { kind: "xp_bonus", domains: ["mind"], percent: [10, 15, 20] }, fallbackNames: ["[Quick Study]", "[Quicker Study]", "[Perfect Recall]"], summary: "+{n}% XP on Mind habits." },
  // Craft
  { id: "deft_hands", theme: "craft", type: "passive", effect: { kind: "xp_bonus", domains: ["craft"], percent: [10, 15, 20] }, fallbackNames: ["[Deft Hands]", "[Deft Fingers]", "[Masterful Hands]"], summary: "+{n}% XP on Craft habits." },
  // Spirit
  { id: "calm_mind", theme: "spirit", type: "passive", effect: { kind: "xp_bonus", domains: ["spirit", "rest"], percent: [5, 10, 15] }, fallbackNames: ["[Calm Mind]", "[Still Mind]", "[Quiet Mind]"], summary: "+{n}% XP on Spirit and Rest habits." },
  // Bonds
  { id: "warm_welcome", theme: "bonds", type: "passive", effect: { kind: "xp_bonus", domains: ["bonds"], percent: [10, 15, 20] }, fallbackNames: ["[Warm Welcome]", "[Warmer Welcome]", "[Hearth Welcome]"], summary: "+{n}% XP on Bonds habits." },
  // Rest
  { id: "well_rested", theme: "rest", type: "triggered", effect: { kind: "after_miss_bonus", domains: ["rest"], percent: [25, 35, 50] }, fallbackNames: ["[Well Rested]", "[Deeply Rested]", "[Restored]"], summary: "The first Rest log after a missed night earns +{n}% XP." },
]);

/** Qualifiers for the Level 10 class evolution, by the domain it comes from. */
export const EVOLUTION_QUALIFIERS: Readonly<Record<string, string>> = {
  home: "Hearth",
  nourish: "Well-Fed",
  endurance: "Long Road",
  strength: "Iron-Backed",
  recovery: "Mended",
  mind: "Lamplit",
  craft: "Tinkering",
  spirit: "Quiet",
  bonds: "Shared-Table",
  rest: "Dawn",
};

export function skillDef(id: string): SkillDef {
  const d = SKILL_CATALOG.find((s) => s.id === id);
  if (!d) throw new Error(`unknown skill: ${id}`);
  return d;
}
