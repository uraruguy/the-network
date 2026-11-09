import { AbsoluteFill } from "remotion";
import { Headline, type Line } from "../../kit/Headline";
import { DarkStage, LightStage } from "../../kit/Stage";
import { Bloom } from "./Bloom";
import { CAM } from "./camKeys";
import { AppearanceToggle, EmailOverlay, Keycaps, PhoneOverlay, TerminalOverlay } from "./Overlays";
import { Outro } from "./Outro";
import { WindowContent } from "./WindowContent";
import { WindowLayer } from "./WindowLayer";

export type Theme = "light" | "dark";

type HeadlineSpec = { at: number; out?: number; kicker?: string; lines: Line[]; sub?: string; top?: number; size?: number };
/** Headlines in the top band, in order. */
const HEADLINES: HeadlineSpec[] = [
  { at: -4, out: 172, lines: ["Everyone you've met."], top: 64, size: 84 },
  { at: 66, out: 172, lines: [[{ text: "Connected.", accent: true }]], top: 156, size: 84 },
  { at: 200, out: 486, kicker: "Today", lines: [[{ text: "Follow-ups that " }, { text: "find you.", accent: true }]] },
  { at: 512, out: 786, kicker: "Import", lines: [[{ text: "Paste anything. AI " }, { text: "files it.", accent: true }]] },
  { at: 806, out: 1064, kicker: "People", lines: [[{ text: "Find anyone " }, { text: "in a second.", accent: true }]] },
  { at: 1094, out: 1240, kicker: "Globe", lines: [[{ text: "Your world, " }, { text: "mapped.", accent: true }]] },
  { at: 1266, out: 1378, kicker: "Works like an app", lines: [[{ text: "Light, dark, " }, { text: "offline.", accent: true }]] },
  { at: 1396, out: 1520, kicker: "AI assistant", lines: [[{ text: "Ask your " }, { text: "network.", accent: true }]] },
  { at: 1532, out: 1636, kicker: "MCP server", lines: [[{ text: "…or ask " }, { text: "Claude.", accent: true }]], sub: "The same tools in Claude, ChatGPT and Cursor." },
];

/** Everything except the cursor, in one theme. Rendered twice (light + dark) during the flip. */
export function World({ frame, theme }: { frame: number; theme: Theme }) {
  const dark = theme === "dark";
  const Stage = dark ? DarkStage : LightStage;
  const windowOn = frame >= 168 && frame < 1700;
  const windowFade = 1 - Math.min(1, Math.max(0, (frame - 1638) / 32));
  return (
    <Stage>
      <Bloom frame={frame} theme={theme} />
      {windowOn && (
        <WindowLayer frame={frame} keys={CAM} dark={dark} maskTop={150} opacity={windowFade} blurId={`mb-${theme}`}>
          <WindowContent frame={frame} theme={theme} />
        </WindowLayer>
      )}
      <EmailOverlay frame={frame} />
      <Keycaps frame={frame} at={540} out={584} keys={["⌘", "V"]} label="Paste" />
      <Keycaps frame={frame} at={588} out={630} keys={["⌘", "↩"]} label="Find people" />
      <AppearanceToggle frame={frame} dark={dark} />
      {dark && <PhoneOverlay frame={frame} />}
      <TerminalOverlay frame={frame} />
      {HEADLINES.map((h, i) =>
        frame >= h.at - 10 && (h.out === undefined || frame < h.out + 20) ? (
          <AbsoluteFill key={i} style={{ alignItems: "center", paddingTop: h.top ?? 58 }}>
            <Headline at={h.at} out={h.out} kicker={h.kicker} lines={h.lines} sub={h.sub} size={h.size ?? 74} theme={theme} align="center" />
          </AbsoluteFill>
        ) : null,
      )}
      <Outro frame={frame} theme={theme} />
    </Stage>
  );
}
