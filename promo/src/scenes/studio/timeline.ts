/** Scene boundaries (frames at 60 fps), on a 120 BPM grid where it matters. */
export const S = {
  bloom: [0, 200],
  today: [200, 500],
  paste: [500, 800],
  people: [800, 1080],
  globe: [1080, 1380],
  ask: [1380, 1620],
  outro: [1620, 1800],
} as const;

/** The light → dark flip: circle grows from the click over these frames. */
export const FLIP = { click: 1252, start: 1254, end: 1302 } as const;

/** Window-space offset of the main area (sidebar 236, title bar 38). */
export const MAIN = { x: 236, y: 38 } as const;
export const main = (x: number, y: number) => ({ x: MAIN.x + x, y: MAIN.y + y });
