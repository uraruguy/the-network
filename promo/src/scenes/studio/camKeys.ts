import { EASE } from "../../kit/motion";
import type { Key } from "./camera";

/**
 * The single camera over the Mac window for the whole film (window space: 1440×938, the main
 * area starts at x 236, y 38). Each key inherits the previous one's fields; the segment ending
 * at a key uses that key's ease (default: a long cinematic glide).
 */
const EST = { fx: 720, fy: 469, zoom: 0.8, sx: 960, sy: 660, rx: 0, ry: 0, rz: 0 };

export const CAM: Key[] = [
  // 1 · Today: the window rises out of the bloom, tilted, and settles.
  { f: 168, cam: { ...EST, zoom: 0.5, sy: 1340, rx: 36 } },
  { f: 250, cam: { ...EST }, ease: EASE.out },
  { f: 266, cam: {} },
  // Push into Due for the check-off.
  { f: 312, cam: { fx: 560, fy: 500, zoom: 1.5, sx: 930, sy: 660, ry: -3 } },
  { f: 372, cam: { fx: 600, fy: 520, zoom: 1.42, sx: 940, sy: 650, ry: -2 } },
  // Pull back and swing left to make room for the digest e-mail.
  { f: 418, cam: { fx: 720, fy: 469, zoom: 0.66, sx: 600, sy: 660, ry: 15 } },
  { f: 486, cam: { zoom: 0.64, sx: 590, ry: 16 } },
  // 2 · Paste: square up on the import dialog, then into the note.
  { f: 532, cam: { fx: 720, fy: 405, zoom: 1.12, sx: 960, sy: 650, ry: 0 } },
  { f: 556, cam: {} },
  { f: 592, cam: { fx: 720, fy: 300, zoom: 1.55, sx: 960, sy: 640 } },
  { f: 652, cam: { fx: 720, fy: 308, zoom: 1.58 } },
  // Review cards, then down to the footer for Save.
  { f: 690, cam: { fx: 720, fy: 470, zoom: 1.2, sy: 640 } },
  { f: 722, cam: {} },
  { f: 748, cam: { fx: 760, fy: 690, zoom: 1.24, sy: 650 } },
  // 3 · People: back to the whole window for the sidebar click.
  { f: 800, cam: { ...EST, zoom: 0.84, sy: 650 } },
  { f: 822, cam: {} },
  { f: 858, cam: { fx: 616, fy: 268, zoom: 1.42, sx: 920, sy: 560, ry: -2 } },
  { f: 900, cam: { fx: 620, fy: 280, zoom: 1.44 } },
  // Person page: onto Inês's header, then ride the scroll.
  { f: 938, cam: { fx: 838, fy: 300, zoom: 1.34, sx: 960, sy: 600, ry: 0 } },
  { f: 1040, cam: { fx: 838, fy: 320, zoom: 1.3 } },
  // 4 · Globe.
  { f: 1074, cam: { ...EST, zoom: 0.86, sy: 650 } },
  { f: 1092, cam: {} },
  { f: 1140, cam: { fx: 880, fy: 520, zoom: 1.16, sx: 930, sy: 640 } },
  { f: 1176, cam: { fx: 900, fy: 520, zoom: 1.2 } },
  { f: 1214, cam: { fx: 1010, fy: 500, zoom: 1.06, sx: 880, sy: 630 } },
  { f: 1258, cam: { fx: 1010, fy: 500, zoom: 1.04 } },
  // After the flip: the window steps left for the phone.
  { f: 1306, cam: {} },
  { f: 1346, cam: { fx: 720, fy: 469, zoom: 0.62, sx: 640, sy: 660, ry: 14 } },
  { f: 1364, cam: { zoom: 0.62 } },
  // 5 · Ask: back, then onto the composer, then the answer.
  { f: 1392, cam: { ...EST, zoom: 0.86, sy: 650 } },
  { f: 1426, cam: { fx: 838, fy: 760, zoom: 1.42, sx: 960, sy: 700 } },
  { f: 1446, cam: {} },
  { f: 1486, cam: { fx: 838, fy: 300, zoom: 1.4, sx: 960, sy: 560 } },
  { f: 1520, cam: { fx: 838, fy: 320, zoom: 1.38 } },
  // The terminal takes the stage; the window steps back left.
  { f: 1556, cam: { fx: 720, fy: 469, zoom: 0.66, sx: 560, sy: 660, ry: 16 } },
  { f: 1650, cam: { zoom: 0.64, sx: 540, ry: 18 } },
  // 6 · Outro: the window falls away.
  { f: 1700, cam: { zoom: 0.42, sx: 520, sy: 900, rx: 24, ry: 22 }, ease: EASE.in },
];
