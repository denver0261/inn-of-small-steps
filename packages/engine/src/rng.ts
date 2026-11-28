/** A seeded generator. The engine never calls Math.random: every draw comes from a seed. */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, so a seed can come from stable strings like a player id and a date. */
export function hashSeed(...parts: readonly string[]): number {
  let h = 0x811c9dc5;
  for (const ch of parts.join("|")) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A generator seeded from stable strings; the same parts always draw the same numbers. */
export function seeded(...parts: readonly string[]): Rng {
  return mulberry32(hashSeed(...parts));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick from an empty list");
  return items[Math.floor(rng() * items.length)] as T;
}
