/** Scene ranges are in STORYBOARD.md (Studio); camera keys in camKeys.ts. */

/** The light → dark flip: circle grows from the click over these frames. */
export const FLIP = { click: 1252, start: 1254, end: 1302 } as const;

/** Window-space offset of the main area (sidebar 236, title bar 38). */
export const MAIN = { x: 236, y: 38 } as const;
export const main = (x: number, y: number) => ({ x: MAIN.x + x, y: MAIN.y + y });
