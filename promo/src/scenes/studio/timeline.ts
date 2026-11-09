/**
 * Studio beats (60 fps, cuts on a 30-frame grid):
 * hook 0–120 · today 120–360 · import 360–660 · search 660–810 · globe + flip 810–1110 ·
 * chat 1110–1320 · claude/mcp 1320–1620 · end 1620–1800. Camera keys live in camKeys.ts.
 */

/** The light → dark flip: a circle wipe from the Lisbon pin, on the beat. */
export const FLIP = { start: 960, end: 1000 } as const;

/** Window-space offset of the main area (sidebar 236, title bar 38). */
export const MAIN = { x: 236, y: 38 } as const;
export const main = (x: number, y: number) => ({ x: MAIN.x + x, y: MAIN.y + y });

/** Window-space anchor on Today: the People tile's number (left edge, middle). */
export const PEOPLE_TILE = main(112, 281);
