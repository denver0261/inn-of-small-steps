/**
 * The Inn home scene, drawn in the same pixel style as the characters (decision 0020).
 * The scene is an 80×60 grid: night sky above row 44, the street below. Each piece is a
 * rectangle or a small text drawing; upgrades add their pieces on top of the run-down house.
 */

export const SCENE_WIDTH = 80;
export const SCENE_HEIGHT = 60;
/** First row of the street. */
export const GROUND_ROW = 44;

export const INN_PALETTE: Readonly<Record<string, string>> = {
  W: "#6b5a48", // plaster
  w: "#54463a", // plaster in shade
  T: "#3b2a1e", // timber
  R: "#6e3226", // roof tiles
  r: "#4f241c", // roof edge
  D: "#4a3526", // door
  d: "#2e2116", // door planks
  Y: "#f7c45a", // lamplit window
  y: "#a8742a", // a dim, late lamp
  N: "#1b2230", // dark glass
  B: "#7a5232", // boards
  S: "#5f6a78", // stone
  s: "#444c58", // dark stone
  K: "#8a93a0", // smoke
  Q: "#c9a052", // straw
  q: "#8a6a3e", // post
  G: "#3f6b33", // leaves
  g: "#6f9e4e", // young leaves
  F: "#cfe8ff", // a flower that hums at night
  O: "#5b86c5", // the door's blue
  k: "#14110f", // outline
  V: "#5a4a6e", // a traveler's cloak
  v: "#3f3350", // cloak in shade
  n: "#e8b48a", // a face under a hood
  m: "#e9e4d8", // the moon
};

export const SKY = { top: "#0b1020", horizon: "#22304a" };
export const STREET = { base: "#2a2622", stone: "#353029", seam: "#1f1b18" };
export const STARS: readonly (readonly [number, number])[] = [
  [4, 3], [11, 9], [17, 2], [26, 6], [33, 1], [45, 3], [57, 8], [61, 1], [74, 6], [77, 14], [6, 17], [70, 20], [14, 24], [3, 30], [75, 27],
];

export type InnPiece =
  | { rect: readonly [x: number, y: number, w: number, h: number]; color: string }
  | { art: readonly string[]; at: readonly [x: number, y: number] };

const rect = (x: number, y: number, w: number, h: number, color: string): InnPiece => ({ rect: [x, y, w, h], color });

/** A steep tiled roof over walls from x 22 to 57. */
function roof(): InnPiece[] {
  const out: InnPiece[] = [];
  for (let r = 0; r < 14; r++) {
    const half = 4 + Math.round(r * 1.25);
    out.push(rect(40 - half, 8 + r, half * 2, 1, r === 0 || r === 13 ? "r" : "R"));
    out.push(rect(40 - half, 8 + r, 1, 1, "r"), rect(39 + half, 8 + r, 1, 1, "r"));
  }
  return out;
}

/** A framed window: timber frame, then the glass. */
const windowAt = (x: number, y: number, w: number, h: number, glass: string): InnPiece[] => [rect(x, y, w + 2, h + 2, "T"), rect(x + 1, y + 1, w, h, glass)];

/** The house you arrive to: two cleared rooms, one lamp, boarded glass. */
export const INN_BASE: readonly InnPiece[] = [
  ...roof(),
  rect(22, 22, 36, 22, "W"),
  rect(55, 22, 3, 22, "w"),
  rect(22, 22, 36, 1, "T"),
  rect(22, 32, 36, 1, "T"),
  rect(22, 22, 1, 22, "T"),
  rect(57, 22, 1, 22, "T"),
  // The sign over the door, and the door.
  rect(35, 29, 10, 3, "B"),
  rect(36, 33, 8, 11, "T"),
  rect(37, 34, 6, 10, "D"),
  rect(39, 34, 1, 10, "d"),
  rect(41, 39, 1, 1, "Y"),
  // Windows: dark below, boarded on the right, one dim lamp upstairs where you sleep.
  ...windowAt(25, 33, 7, 6, "N"),
  ...windowAt(46, 33, 7, 6, "N"),
  rect(46, 35, 9, 1, "B"),
  rect(46, 38, 9, 1, "B"),
  ...windowAt(26, 24, 6, 6, "N"),
  rect(26, 27, 8, 1, "B"),
  ...windowAt(46, 24, 6, 6, "y"),
];

/** What each upgrade adds to the scene, drawn in ladder order. */
export const INN_UPGRADE_ART: Readonly<Record<string, readonly InnPiece[]>> = {
  cots: [],
  kitchen: [
    rect(49, 5, 4, 9, "S"),
    rect(52, 5, 1, 9, "s"),
    rect(48, 5, 6, 1, "s"),
    { art: ["..KK..", ".KKKK.", "..KK..", "...K.."], at: [48, 0] },
    ...windowAt(25, 33, 7, 6, "Y"),
    rect(29, 34, 1, 6, "T"),
    rect(26, 36, 7, 1, "T"),
  ],
  yard: [
    {
      art: ["..kkk..", ".kQQQk.", ".kQqQk.", ".kQQQk.", "kkkqkkk", "kQQQQQk", "kQQQQQk", ".kQQQk.", "..kqk..", "..kqk..", "..kqk..", "..kqk..", "..kqk..", ".kkqkk."],
      at: [71, 34],
    },
  ],
  shed: [rect(3, 30, 16, 1, "r"), rect(3, 31, 16, 3, "R"), rect(4, 34, 14, 10, "w"), rect(8, 37, 5, 7, "D"), rect(10, 37, 1, 7, "d")],
  garden: [{ art: [".g.G.F.g.G.g.", "gGgGgGgGgGgGg", "GGGGGGGGGGGGG"], at: [4, 41] }],
  guest_room: [
    ...windowAt(26, 24, 6, 6, "Y"),
    ...windowAt(46, 33, 7, 6, "Y"),
    rect(50, 34, 1, 6, "T"),
    rect(36, 33, 8, 11, "O"),
    rect(37, 34, 6, 10, "D"),
    rect(39, 34, 1, 10, "d"),
    rect(41, 39, 1, 1, "O"),
  ],
};

export const MOON: InnPiece = { art: [".mmm.", "mmmmm", "mmmmm", "mmmmm", ".mmm."], at: [66, 4] };

/** A hooded traveler waiting at the door, 8 wide and 18 tall. */
export const VISITOR_ART: readonly string[] = [
  "..kkkk..",
  ".kVVVVk.",
  "kVVVVVVk",
  "kVvnnvVk",
  "kVvnnvVk",
  "kVvvvvVk",
  ".kVVVVk.",
  "kVVVVVVk",
  "kVVvVVVk",
  "kVVvVVVk",
  "kVVvVVVk",
  "kVVvVVVk",
  "kVVvVVVk",
  "kVVvVVVk",
  "kVVvVVVk",
  "kVVVVVVk",
  ".kvvvvk.",
  ".kk..kk.",
];

/** Where people stand: the two of you either side of the door, a visitor off to the right. */
export const INN_SPOTS = {
  players: [
    [19, 38],
    [45, 38],
  ],
  visitor: [62, 40],
} as const;
