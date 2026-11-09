/**
 * Every key moment of the Pocket film (frames @60 fps). Scene cuts sit on the 30-frame grid:
 * hook 0–150 · follow-ups 150–390 · capture 390–660 · card 660–930 · search 930–1110 ·
 * globe 1110–1380 · ask 1380–1620 · end 1620–1800. Headlines overlap the camera moves.
 */
export const B = {
  // Hook
  hookSharp: 58,
  hookStream: 74,
  // Follow-ups
  saraTap: 212,
  saraDone: 216,
  saraFold: 242,
  toast: 252,
  // Capture
  lift: 376,
  typeFrom: 398,
  typeTo: 452,
  send: 456,
  highlight: 474,
  chipLaunch: 482,
  chipStep: 8,
  filed: 534,
  pushToCard: 560,
  cardOut: 590,
  /** Chips leave the stack for Nik's card sections, in this order. */
  toCard: 600,
  toCardStep: 4,
  toCardFlight: 24,
  // Card
  calloutA: 700,
  calloutB: 816,
  popToPeople: 896,
  // Search
  searchTap: 924,
  typeAt: [930, 935, 940, 945, 950],
  hint: 956,
  globeTap: 1060,
  globeSwap: 1064,
  // Globe
  breakout: 1118,
  globeExit: 1330,
  /** The globe is back inside the Globe screen; then the Chat tab is tapped and swaps in. */
  globeHome: 1362,
  chatTap: 1366,
  chatSwap: 1370,
  // Ask
  askType: 1374,
  askSend: 1418,
  askSent: 1422,
  answer: 1476,
  // End
  end: 1600,
} as const;

/** Section each filed chip lands in on Nik's card, in flight order. */
export const LANDING = ["moving", "padel", "intro", "note"] as const;
export const landAt = (i: number) => B.toCard + i * B.toCardStep + B.toCardFlight;
