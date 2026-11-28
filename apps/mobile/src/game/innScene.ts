import { GROUND_ROW, INN_BASE, INN_PALETTE, INN_UPGRADE_ART, MOON, SCENE_HEIGHT, SCENE_WIDTH, SKY, STARS, STREET, UPGRADES, VISITOR_ART, type InnPiece } from "@inn/content";
import type { Pixels } from "./sprite.ts";

function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, "0"));
  return `#${out.join("")}`;
}

function color(key: string): string {
  const c = INN_PALETTE[key];
  if (!c) throw new Error(`no inn color for "${key}"`);
  return c;
}

function stamp(px: Pixels, piece: InnPiece): void {
  if ("rect" in piece) {
    const [x, y, w, h] = piece.rect;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (px[j]?.[i] !== undefined) px[j]![i] = color(piece.color);
    return;
  }
  const [x, y] = piece.at;
  piece.art.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch !== "." && px[y + j]?.[x + i] !== undefined) px[y + j]![x + i] = color(ch);
    });
  });
}

/** The house as it stands: night sky, the street, and every upgrade built so far drawn over the run-down start. */
export function composeInn(upgrades: readonly string[]): Pixels {
  const px: Pixels = Array.from({ length: SCENE_HEIGHT }, (_, y) =>
    Array.from({ length: SCENE_WIDTH }, (_, x) => {
      if (y < GROUND_ROW) return mix(SKY.top, SKY.horizon, y / (GROUND_ROW - 1));
      const row = y - GROUND_ROW;
      if (row % 4 === 0) return STREET.seam;
      return (x + (Math.floor(row / 4) % 2) * 3) % 6 === 0 ? STREET.seam : row % 4 === 1 ? STREET.stone : STREET.base;
    }),
  );
  for (const [x, y] of STARS) px[y]![x] = "#c9d4e8";
  stamp(px, MOON);
  for (const piece of INN_BASE) stamp(px, piece);
  // Ladder order, so later upgrades draw over earlier ones (the guest room's lamps over the boards).
  for (const u of UPGRADES) if (upgrades.includes(u.id)) for (const piece of INN_UPGRADE_ART[u.id] ?? []) stamp(px, piece);
  return px;
}

/** A visitor at the door, as colors. */
export function visitorPixels(): Pixels {
  return VISITOR_ART.map((row) => [...row].map((ch) => (ch === "." ? null : color(ch))));
}
