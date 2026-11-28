import { ITEMS, ROOM_LOOKS, TIER1_EVENTS, UPGRADES } from "@inn/content";
import { outingSeed, planOuting, resolveOuting, roomLook, type HouseState, type OutingResult, type PlayerState, type Tuning } from "@inn/engine";
import type { Chore, LocalDate } from "@inn/schema";

export const RARE_POOL = ITEMS.filter((i) => i.kind === "trophy").map((i) => i.id);

/** The house as a few lines of text: what's built, then how each real room looks. */
export function sceneLines(house: HouseState, rooms: readonly { id: string; name: string }[], chores: readonly Chore[], today: LocalDate): string[] {
  const built = UPGRADES.filter((u) => house.upgrades.includes(u.id)).map((u) => u.scene);
  const looks = rooms.map((r) => ROOM_LOOKS[roomLook(chores, r.id, today)].replace("{room}", r.name.toLowerCase()));
  return [...built, ...looks];
}

/** Stamina left today: last night's balance less what today's outings already spent. */
export function staminaLeft(state: PlayerState, outingsToday: number, tuning: Tuning): number {
  return Math.max(0, state.stamina - outingsToday * tuning.expedition.staminaCost);
}

export interface OutingPreview {
  index: number;
  eventIds: string[];
  choices: number[];
  result: OutingResult;
  finished: boolean;
}

/**
 * Today's outings as the nightly job will pay them: each replayed from its seed, in order,
 * with bad-luck protection carried from one to the next.
 */
export function previewOutings(
  state: PlayerState,
  playerId: string,
  date: LocalDate,
  outings: readonly { index: number; choices: number[] }[],
  tuning: Tuning,
): OutingPreview[] {
  let pity = state.pity;
  return [...outings]
    .sort((a, b) => a.index - b.index)
    .map((o) => {
      const seed = outingSeed(playerId, date, o.index);
      const eventIds = planOuting(seed, TIER1_EVENTS, tuning);
      const result = resolveOuting({ seed, eventIds, choices: o.choices }, TIER1_EVENTS, { level: state.progress.level, skills: state.skills, pity }, RARE_POOL, tuning);
      pity = result.pity;
      return { index: o.index, eventIds, choices: o.choices, result, finished: o.choices.length >= eventIds.length };
    });
}

/** "12 coins, 3 supplies, Floodplain herbs ×2" */
export function describeLoot(loot: { resources?: Partial<Record<string, number>>; items?: Record<string, number> }): string {
  const parts = Object.entries(loot.resources ?? {})
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([r, n]) => `${n} ${r}`);
  for (const [id, n] of Object.entries(loot.items ?? {})) parts.push(`${ITEMS.find((i) => i.id === id)?.name ?? id}${n > 1 ? ` ×${n}` : ""}`);
  return parts.length ? parts.join(", ") : "nothing but the story";
}
