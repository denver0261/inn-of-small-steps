import { NarrationOutput, type NarrationRequest, type PlayerNight } from "./schema.ts";
import { templateNarration } from "./templates.ts";

const NUMBER = /\d+(?:[.,]\d+)?/g;

/** Every number Claude may write for this player: the facts' own numbers, nothing else. */
function allowedNumbers(p: PlayerNight): Set<string> {
  const out = new Set<string>([String(p.level), ...p.levelsGained.map(String)]);
  for (const s of [...p.skillsGained, ...p.skillChoice]) {
    out.add(String(s.tier));
    for (const n of s.summary.match(NUMBER) ?? []) out.add(n);
  }
  if (p.comebackAfterDays !== undefined) out.add(String(p.comebackAfterDays));
  return out;
}

function strayNumbers(text: string, allowed: ReadonlySet<string>): string[] {
  return (text.match(NUMBER) ?? []).filter((n) => !allowed.has(n));
}

export class NarrationRejected extends Error {}

/**
 * Checks Claude's output against the request and merges it over the template, so a
 * missing name falls back instead of losing the night. Throws `NarrationRejected` when
 * the output is the wrong shape, names the wrong players, or writes a number the
 * engine didn't produce.
 */
export function validateNarration(req: NarrationRequest, raw: unknown): NarrationOutput {
  const parsed = NarrationOutput.safeParse(raw);
  if (!parsed.success) throw new NarrationRejected(`bad shape: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  const out = parsed.data;
  const ids = (xs: readonly { playerId: string }[]) => xs.map((x) => x.playerId).sort().join(",");
  if (ids(out.players) !== ids(req.players)) throw new NarrationRejected("players don't match the request");

  const template = templateNarration(req);
  const everyAllowed = new Set<string>();
  const players = req.players.map((p) => {
    const allowed = allowedNumbers(p);
    allowed.forEach((n) => everyAllowed.add(n));
    const got = out.players.find((x) => x.playerId === p.playerId)!;
    const fallback = template.players.find((x) => x.playerId === p.playerId)!;
    const texts = [...got.levelMessages, ...got.skillNames.flatMap((s) => [s.name, s.text]), ...got.evolutionNames.flatMap((e) => [e.name, e.text])];
    const stray = texts.flatMap((t) => strayNumbers(t, allowed));
    if (stray.length > 0) throw new NarrationRejected(`invented numbers for ${p.name}: ${stray.join(", ")}`);
    if (got.levelMessages.some((m) => !/^\[.*\]$/.test(m))) throw new NarrationRejected("level messages must be [bracketed]");

    // Claude's messages replace the template only when there are at least as many of them.
    const levelMessages = got.levelMessages.length >= fallback.levelMessages.length ? got.levelMessages : fallback.levelMessages;
    const skillNames = fallback.skillNames.map((f) => got.skillNames.find((s) => s.defId === f.defId && s.tier === f.tier) ?? f);
    const evolutionNames = fallback.evolutionNames.map((f) => got.evolutionNames.find((e) => e.optionId === f.optionId) ?? f);
    return { playerId: p.playerId, levelMessages, skillNames, evolutionNames };
  });

  const stray = strayNumbers(out.morningScene, everyAllowed);
  if (stray.length > 0) throw new NarrationRejected(`invented numbers in the scene: ${stray.join(", ")}`);
  const paragraphs = out.morningScene.split(/\n\s*\n/).filter((x) => x.trim());
  if (paragraphs.length > 4) throw new NarrationRejected("the scene runs past 4 paragraphs");
  return { players, morningScene: out.morningScene };
}
