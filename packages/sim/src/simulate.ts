import { EVOLUTION_QUALIFIERS, SKILL_CATALOG } from "@inn/content";
import { addDays, closeDay, DEFAULT_TUNING, NEW_PLAYER_STATE, weekday, type NightChoices, type Tuning } from "@inn/engine";
import { dayLogs, FOCUS, goals, HABITS, mulberry32, PROFILES, type Profile } from "./profiles.ts";

/** A Monday, so simulated weeks line up with the engine's Monday-to-Sunday weeks. */
export const START = "2027-01-04";
export const DAYS = 365;
const SEED = 0x1a5c0;

export interface ProfileResult {
  id: string;
  description: string;
  /** Level at the end of each 30-day month, 12 entries. */
  levelByMonth: number[];
  /** Day number (1-based) each level was reached, for Levels 1 to 10. */
  dayReached: Record<number, number>;
  /** Average XP per day over the first 49 days (the design's 7-week target). */
  xpPerDayFirst7Weeks: number;
  skillSlotsByLevel10: number;
  /** Skills held the night after Level 10 (the capstone pick included), as "id tier". */
  skillsAtLevel10: string[];
  /** The evolution taken at Level 10. */
  evolution: string;
  finalLevel: number;
  totalXp: number;
}

export function simulateProfile(profile: Profile, tuning: Tuning = DEFAULT_TUNING, seed = SEED): ProfileResult {
  const rng = mulberry32(seed);
  const sleepStart = addDays(START, 14);
  const allGoals = goals(START, sleepStart);
  let state = NEW_PLAYER_STATE;
  const levelByMonth: number[] = [];
  const dayReached: Record<number, number> = {};
  let xpFirst7Weeks = 0;
  let skillSlotsByLevel10 = 0;
  let skillsAtLevel10: string[] = [];
  let evolution = "-";

  for (let n = 0; n < DAYS; n++) {
    const date = addDays(START, n);
    const logs = dayLogs(profile, n, date, weekday(date), date >= sleepStart, rng);
    // At the capstone the simulated player takes the first Skill and the first evolution offered.
    const choices: NightChoices = {};
    if (state.pendingSkillChoice) choices.skill = state.pendingSkillChoice.options[0]?.skill.defId ?? "";
    if (state.pendingEvolution) choices.evolution = state.pendingEvolution.options[0]?.id ?? "";
    const r = closeDay(
      state,
      { date, focusDomains: FOCUS, habits: HABITS, goals: allGoals, pauses: [], logs, playerId: profile.id, className: "[Rider]", catalog: SKILL_CATALOG, qualifiers: EVOLUTION_QUALIFIERS, choices },
      tuning,
    );
    for (const e of r.events) {
      if (e.type === "level_up" && e.level <= 10) dayReached[e.level] = n + 1;
      if (e.type === "skill_slot" && e.level <= 10) skillSlotsByLevel10 += 1;
    }
    if (n < 49) xpFirst7Weeks += r.state.progress.totalXp - state.progress.totalXp;
    state = r.state;
    if (dayReached[10] !== undefined && dayReached[10] < n + 1 && skillsAtLevel10.length === 0) {
      skillsAtLevel10 = state.skills.map((k) => `${k.defId} ${k.tier}`);
      evolution = state.evolution?.fallbackName ?? "-";
    }
    if ((n + 1) % 30 === 0 && levelByMonth.length < 12) levelByMonth.push(state.progress.level);
  }

  return {
    id: profile.id,
    description: profile.description,
    levelByMonth,
    dayReached,
    xpPerDayFirst7Weeks: Math.round(xpFirst7Weeks / 49),
    skillSlotsByLevel10,
    skillsAtLevel10,
    evolution,
    finalLevel: state.progress.level,
    totalXp: state.progress.totalXp,
  };
}

export function simulateAll(tuning: Tuning = DEFAULT_TUNING): ProfileResult[] {
  return PROFILES.map((p) => simulateProfile(p, tuning));
}

/** The report `pnpm sim` prints. Plain text, so a balance change shows up as a diff. */
export function report(results: readonly ProfileResult[]): string {
  const pad = (s: string | number, w: number) => String(s).padStart(w);
  const lines: string[] = [];
  lines.push(`Inn of Small Steps: level curve, ${DAYS} simulated days of a [Rider] from ${START}`);
  lines.push("");
  lines.push(`level at end of month   ${results.map((r) => pad(r.id, 8)).join("")}`);
  for (let m = 0; m < 12; m++) lines.push(`  month ${pad(m + 1, 2)}             ${results.map((r) => pad(r.levelByMonth[m] ?? "-", 8)).join("")}`);
  lines.push("");
  lines.push(`day Level reached       ${results.map((r) => pad(r.id, 8)).join("")}`);
  for (let l = 2; l <= 10; l++) lines.push(`  Level ${pad(l, 2)}             ${results.map((r) => pad(r.dayReached[l] ?? "-", 8)).join("")}`);
  lines.push("");
  lines.push(`XP/day, first 7 weeks   ${results.map((r) => pad(r.xpPerDayFirst7Weeks, 8)).join("")}   (design target: ~75)`);
  lines.push(`week Level 10 reached   ${results.map((r) => pad(r.dayReached[10] ? (r.dayReached[10] / 7).toFixed(1) : "-", 8)).join("")}   (design target: ~7)`);
  lines.push(`Skill slots by L10      ${results.map((r) => pad(r.skillSlotsByLevel10, 8)).join("")}`);
  lines.push("");
  lines.push("Skills and evolution at Level 10 (the simulated player takes the first option)");
  for (const r of results) lines.push(`  ${pad(r.id, 7)} ${r.evolution}: ${r.skillsAtLevel10.join(", ")}`);
  lines.push("");
  for (const r of results) lines.push(`  ${r.id}: ${r.description}`);
  lines.push("");
  lines.push("Levels past 10 are out of scope (docs/design.md, Later) and shown only for the shape of the curve.");
  return lines.join("\n");
}
