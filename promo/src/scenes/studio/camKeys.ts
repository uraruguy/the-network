import { EASE } from "../../kit/motion";
import type { Key } from "./camera";

/**
 * The single camera over the Mac window (window space: 1440×938, the main area starts at x 236,
 * y 38). One establishing shot (Today); after that it goes push-in to push-in with fast whip
 * moves (the motion blur hides page changes). Pushes keep content ≥ 220 px from the top so
 * nothing sits under the headline band.
 */
const EST = { fx: 720, fy: 469, zoom: 0.8, sx: 960, sy: 650, rx: 0, ry: 0, rz: 0 };
const WHIP = (t: number) => EASE.inOut(t);

export const CAM: Key[] = [
  // Hook → Today: the window surfaces where the network implodes, then settles.
  { f: 90, cam: { ...EST, zoom: 0.06, sy: 640, rx: 20 } },
  { f: 132, cam: { ...EST }, ease: EASE.out },
  { f: 150, cam: {} },
  // The digest arrives: the window steps left and turns towards it.
  { f: 174, cam: { zoom: 0.6, sx: 560, sy: 660, ry: 14 } },
  { f: 262, cam: { zoom: 0.58, sx: 540, ry: 15 } },
  // Whip onto Sara's row: it checks itself off (synced from the e-mail).
  { f: 282, cam: { fx: 560, fy: 452, zoom: 2.2, sx: 960, sy: 620, ry: 0 }, ease: WHIP },
  { f: 362, cam: { fx: 570, fy: 456, zoom: 2.24 } },
  // Import: whip up into the pasted note, then onto the cards, then down to Save.
  { f: 386, cam: { fx: 720, fy: 318, zoom: 2.05, sx: 960, sy: 624 }, ease: WHIP },
  { f: 440, cam: { fx: 720, fy: 322, zoom: 2.1 } },
  { f: 484, cam: { fx: 720, fy: 352, zoom: 1.92, sx: 960, sy: 664 } },
  { f: 548, cam: { fx: 720, fy: 356, zoom: 1.95 } },
  { f: 564, cam: { fx: 740, fy: 540, zoom: 1.3, sx: 960, sy: 650 } },
  { f: 574, cam: {} },
  // Cards fly into the People tile: tiles + the toast in one frame.
  { f: 604, cam: { fx: 560, fy: 600, zoom: 1.4, sx: 960, sy: 640 } },
  { f: 652, cam: { fx: 562, fy: 602, zoom: 1.42 } },
  // Search: whip-pan (Today → People hides in the blur): the count, the field and all seven
  // Lisbon rows in one frame; "Show on globe" is in that frame too.
  { f: 668, cam: { fx: 838, fy: 417, zoom: 1.25, sx: 960, sy: 670 }, ease: WHIP },
  { f: 790, cam: { fx: 840, fy: 417, zoom: 1.27 } },
  // Globe: whip from "Show on globe" onto the planet and the Lisbon panel.
  { f: 812, cam: { fx: 930, fy: 520, zoom: 1.42, sx: 960, sy: 650 }, ease: WHIP },
  { f: 856, cam: { fx: 930, fy: 524, zoom: 1.45 } },
  // Push onto the Lisbon pin and its panel (the payoff, both fully in frame), hold, then back
  // out for the arcs and the flip.
  { f: 878, cam: { fx: 1048, fy: 392, zoom: 1.6, sx: 960, sy: 640 } },
  { f: 930, cam: { fx: 1052, fy: 396, zoom: 1.63 } },
  { f: 954, cam: { fx: 920, fy: 524, zoom: 1.48, sx: 960, sy: 650 } },
  { f: 960, cam: {} },
  // (dark) the planet outgrows the window, which falls back and fades.
  { f: 1004, cam: { fx: 900, fy: 520, zoom: 1.1, sy: 700, rx: 18 } },
  // Chat: the window rises over the dimmed planet, tight on the composer…
  { f: 1100, cam: { fx: 830, fy: 862, zoom: 2.4, sx: 960, sy: 1500, rx: 22 } },
  { f: 1128, cam: { fx: 830, fy: 862, zoom: 2.4, sx: 960, sy: 470, rx: 0 }, ease: EASE.out },
  { f: 1142, cam: {} },
  // …whips up to the conversation, then pushes into the answer card.
  { f: 1160, cam: { fx: 838, fy: 330, zoom: 1.58, sx: 960, sy: 640 }, ease: WHIP },
  { f: 1232, cam: { fx: 838, fy: 336, zoom: 1.6 } },
  { f: 1272, cam: { fx: 838, fy: 380, zoom: 2.2, sx: 960, sy: 640 } },
  { f: 1304, cam: { fx: 838, fy: 384, zoom: 2.24 } },
  // MCP: the window falls back behind the terminal.
  { f: 1346, cam: { fx: 720, fy: 469, zoom: 0.62, sx: 600, sy: 760, rx: 16, ry: 18 } },
];
