import { AbsoluteFill } from "remotion";
import { EASE, tween } from "../../kit/motion";
import { Bloom, BloomCounter } from "./Bloom";
import { CAM } from "./camKeys";
import { Outro } from "./Outro";
import { BigGlobe, EmailOverlay, PasteKeys, PhoneOverlay, TerminalOverlay } from "./Overlays";
import { StudioStage } from "./Stage";
import { Title, type Seg } from "./Title";
import { WindowContent } from "./WindowContent";
import { WindowLayer } from "./WindowLayer";

export type Theme = "light" | "dark";

type TitleSpec = { at: number; out: number; kicker?: string; lines: Seg[][]; size?: number; top?: number };
const A = (text: string): Seg => ({ text, accent: true });
const T = (text: string): Seg => ({ text });

/** Titles in the top band. Kickers carry information, not nav labels. */
const TITLES: TitleSpec[] = [
  { at: -60, out: 98, lines: [[T("Everyone you've met.")], [T("…and who "), A("introduced you.")]], size: 96, top: 30 },
  { at: 122, out: 350, kicker: "3 due today", lines: [[T("Follow-ups that "), A("find you.")]] },
  { at: 362, out: 650, kicker: "1 note → 4 people", lines: [[T("Paste anything. AI "), A("files it.")]] },
  { at: 664, out: 798, kicker: "286 people · 79 cities", lines: [[T("Type a city. "), A("Get your people.")]] },
  { at: 806, out: 986, kicker: "7 people in Lisbon", lines: [[T("Landing in Lisbon? "), A("Know who's there.")]] },
  { at: 994, out: 1108, kicker: "iPhone · Mac · offline", lines: [[T("Installs like an app. "), A("Works offline.")]] },
  { at: 1116, out: 1312, kicker: "Your own Anthropic or OpenRouter key", lines: [[T("Ask your "), A("network.")]] },
  { at: 1322, out: 1612, kicker: "13 MCP tools", lines: [[T("…or ask "), A("Claude.")]] },
];

/** Everything except the cursor, in one theme. Rendered twice (light + dark) during the flip. */
export function World({ frame, theme }: { frame: number; theme: Theme }) {
  const dark = theme === "dark";
  const chat = frame >= 1100;
  const windowOpacity = chat ? 1 : tween(frame, [84, 96], [0, 1]) * (1 - tween(frame, [996, 1012], [0, 1], EASE.in));
  const fadeForMcp = 1 - tween(frame, [1304, 1318], [0, 1], EASE.in);
  const windowOn = frame >= 84 && frame < 1320 && !(frame >= 1012 && frame < 1100);
  // Chat: the page arrives full-frame behind a soft bottom-up wipe (no hard edges).
  const wipe = frame >= 1100 && frame < 1130 ? tween(frame, [1100, 1128], [0, 1], EASE.inOut) : undefined;
  const planetOnTop = frame < 1050;
  return (
    <StudioStage theme={theme}>
      <Bloom frame={frame} />
      {dark && !planetOnTop && <BigGlobe frame={frame} />}
      {windowOn && (
        <WindowLayer frame={frame} keys={CAM} dark={dark} opacity={Math.min(1, windowOpacity) * fadeForMcp} wipe={wipe} blurId={`mb-${theme}`}>
          <WindowContent frame={frame} theme={theme} />
        </WindowLayer>
      )}
      {dark && planetOnTop && <BigGlobe frame={frame} />}
      <BloomCounter frame={frame} />
      <EmailOverlay frame={frame} />
      <PasteKeys frame={frame} />
      {dark && <PhoneOverlay frame={frame} />}
      <TerminalOverlay frame={frame} />
      {TITLES.map((h, i) =>
        frame >= h.at - 10 && frame < h.out + 16 ? (
          <AbsoluteFill key={i} style={{ alignItems: "center", paddingTop: h.top ?? 30 }}>
            <Title at={h.at} out={h.out} kicker={h.kicker} lines={h.lines} size={h.size ?? 77} dark={dark} />
          </AbsoluteFill>
        ) : null,
      )}
      <Outro frame={frame} theme={theme} />
    </StudioStage>
  );
}
