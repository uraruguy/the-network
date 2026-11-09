/** Scene boundaries (frames @60 fps), all on the 30-frame beat grid. */
export const T = {
  hook: [0, 180],
  today: [180, 420],
  capture: [420, 690],
  person: [690, 960],
  search: [960, 1170],
  globe: [1170, 1440],
  ask: [1440, 1650],
  outro: [1650, 1800],
} as const;
