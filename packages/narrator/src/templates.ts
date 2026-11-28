import { FALLBACK_SCENES } from "@inn/content";
import { pick, seeded } from "@inn/engine";
import type { NarrationOutput, NarrationRequest, PlayerNight } from "./schema.ts";

const bare = (name: string) => name.replace(/^\[|\]$/g, "");

/** The System's messages for one player's night, straight from the facts. Always correct, never pretty. */
export function templateMessages(p: PlayerNight): string[] {
  const cls = bare(p.className);
  const out: string[] = [];
  for (const level of p.levelsGained) out.push(level === 1 ? `[${cls} Class obtained!]` : `[${cls} Level ${level}!]`);
  for (const s of p.skillsGained) {
    out.push(s.upgradedFrom ? `[Skill Change – ${bare(s.upgradedFrom.name)} → ${bare(s.fallbackName)}!]` : `[Skill – ${bare(s.fallbackName)} obtained!]`);
  }
  if (p.skillChoice.length > 0) out.push(`[Skill choice: ${p.skillChoice.map((s) => bare(s.fallbackName)).join(" or ")}]`);
  if (p.evolutionOffer.length > 0) out.push("[Class evolution available!]");
  if (p.evolutionChosen) out.push(`[Class – ${bare(p.evolutionChosen)} obtained!]`);
  for (const habit of p.graced) out.push(`[Grace – ${habit} kept]`);
  return out;
}

function joinNames(names: readonly string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** A whole night's narration without Claude: template messages, fallback names, a hand-written scene. */
export function templateNarration(req: NarrationRequest): NarrationOutput {
  const anyLevels = req.players.some((p) => p.levelsGained.length > 0 || p.skillsGained.length > 0);
  const comeback = req.players.some((p) => p.comebackAfterDays !== undefined);
  const pool = comeback ? FALLBACK_SCENES.comeback : anyLevels ? FALLBACK_SCENES.levels : FALLBACK_SCENES.quiet;
  const scene = pick(seeded(req.householdName, req.date), pool)
    .replaceAll("{names}", joinNames(req.players.map((p) => p.name)))
    .replaceAll("{house}", req.householdName);
  return {
    players: req.players.map((p) => ({
      playerId: p.playerId,
      levelMessages: templateMessages(p),
      skillNames: [...p.skillsGained, ...p.skillChoice].map((s) => ({ defId: s.defId, tier: s.tier, name: s.fallbackName, text: s.summary })),
      evolutionNames: p.evolutionOffer.map((o) => ({ optionId: o.optionId, name: o.fallbackName, text: `A path shaped by ${o.domain}.` })),
    })),
    morningScene: scene,
  };
}
