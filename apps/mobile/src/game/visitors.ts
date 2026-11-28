import { INN_SCENES, VISITORS } from "@inn/content";
import { pick, questProgress, seeded, type ActiveQuest, type DayActivity, type QuestProgress } from "@inn/engine";
import type { LocalDate, Resources } from "@inn/schema";
import type { HabitInfo, LogInfo } from "@inn/schema/rows";

/** Logs as quests see them: per player and day, counted by domain, plus chores. */
export function activityFrom(logs: readonly LogInfo[], habits: readonly HabitInfo[]): DayActivity[] {
  const byKey = new Map<string, DayActivity>();
  for (const log of logs) {
    const key = `${log.playerId}|${log.date}`;
    const a = byKey.get(key) ?? { date: log.date, playerId: log.playerId, domains: {}, chores: 0 };
    const domain = habits.find((h) => h.id === log.habitId)?.domain;
    if (domain) a.domains[domain] = (a.domains[domain] ?? 0) + 1;
    if (log.choreId) a.chores += 1;
    byKey.set(key, a);
  }
  return [...byKey.values()];
}

/** A running quest's progress as of today (tonight's close may still finish it). */
export function questView(quest: ActiveQuest, activity: readonly DayActivity[], today: LocalDate): (QuestProgress & { ask: string; name: string }) | undefined {
  const t = VISITORS.find((v) => v.id === quest.templateId);
  if (!t) return undefined;
  return { ...questProgress(quest, t.quest, activity, today), ask: t.quest.ask, name: t.name };
}

/** The evening's scene at the Inn, the same one all day for a player. */
export function innScene(playerId: string, date: LocalDate): string {
  return pick(seeded(playerId, date, "inn"), INN_SCENES).text;
}

export function describeReward(r: Resources, recruit?: string): string {
  const parts = Object.entries(r)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([k, n]) => `${n} ${k}`);
  if (recruit) parts.push("someone who stays on to help");
  return parts.join(", ");
}
