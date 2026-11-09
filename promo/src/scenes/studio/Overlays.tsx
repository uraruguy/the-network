import { Globe2, MessageCircle, Settings, Share2, Sun, Users } from "lucide-react";
import { AbsoluteFill } from "remotion";
import { IPhone, PHONE_H, PHONE_W } from "../../devices/IPhone";
import { EASE, SPRINGS, clamp01, mix, springAt, tween } from "../../kit/motion";
import { Globe } from "../../ui/common/Globe";
import { DigestEmail } from "../../ui/desktop/DigestEmail";
import { Terminal, type TermLine } from "../../ui/desktop/Terminal";
import { camAt, project } from "./camera";
import { CAM } from "./camKeys";
import { FLIP, main } from "./timeline";
import { BAND } from "./WindowLayer";
import { GLOBE, arcsAt, globeRotate } from "./WindowContent";

const bandMask = `linear-gradient(to bottom, transparent 0px, transparent ${BAND}px, black ${BAND + 30}px)`;

/* ---------- Digest e-mail (Today) ---------- */

/** Card-space position of Sara's Done button (under the 44 px label row). */
const DONE = { x: 97, y: 44 + 288 };
const REST = { x: 1110 + DONE.x, y: 360 + DONE.y };
const PUSHED = { x: 900, y: 650 };
const pushAt = (frame: number) => tween(frame, [176, 200], [0, 1], EASE.inOut);
/** Screen position of Sara's Done button at `frame` (the cursor aims here). */
export const emailDone = (frame: number) => {
  const p = pushAt(frame);
  return { x: mix(REST.x, PUSHED.x, p), y: mix(REST.y, PUSHED.y, p) };
};

export function EmailOverlay({ frame }: { frame: number }) {
  if (frame < 146 || frame > 286) return null;
  const enter = springAt(frame, 148, SPRINGS.sheet);
  const whip = tween(frame, [262, 280], [0, 1], EASE.in);
  const done = tween(frame, [206, 214], [0, 1], EASE.out);
  const press = Math.max(0, 1 - Math.abs(frame - 204) / 5);
  const p = pushAt(frame);
  const at = emailDone(frame);
  const v = whip > 0 && whip < 1 ? 28 * Math.sin(Math.PI * whip) : 0;
  return (
    <AbsoluteFill style={{ perspective: 2200, WebkitMaskImage: bandMask, maskImage: bandMask }}>
      {v > 0 && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="email-whip" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={`${v} 0`} />
          </filter>
        </svg>
      )}
      <div
        style={{
          position: "absolute",
          left: at.x - DONE.x,
          top: at.y - DONE.y,
          opacity: clamp01(enter * 1.5),
          transformOrigin: `${DONE.x}px ${DONE.y}px`,
          transform: `translateX(${(1 - enter) * 760 + whip * 1700}px) rotateY(${(1 - enter) * -24}deg) scale(${1 + 1.1 * p})`,
          filter: v > 0 ? "url(#email-whip)" : undefined,
        }}
      >
        <div style={{ height: 44, display: "flex", alignItems: "center", gap: 8, font: '500 15px "JetBrains Mono Variable", monospace', letterSpacing: "0.12em", color: "#ffffff", textTransform: "uppercase" }}>
          <span style={{ width: 8, height: 8, borderRadius: 9, background: "#7ef3f6", boxShadow: "0 0 0 4px rgba(126,243,246,0.25)" }} /> Daily digest · 07:00
        </div>
        <DigestEmail done={{ "Sara Rossi": done }} press={{ "Sara Rossi": press }} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- ⌘V keycap (Import trigger) ---------- */

function Key({ k }: { k: string }) {
  return (
    <span style={{ minWidth: 128, height: 128, padding: "0 24px", display: "grid", placeItems: "center", borderRadius: 26, background: "linear-gradient(#ffffff, #eef3f4)", boxShadow: "0 0 0 1px rgba(10,40,50,0.12), 0 5px 0 rgba(10,40,50,0.16), 0 18px 34px -10px rgba(0,30,40,0.4)", font: '600 62px "Inter Variable", sans-serif', color: "#0d1a1c" }}>
      {k}
    </span>
  );
}

export function PasteKeys({ frame }: { frame: number }) {
  if (frame < 346 || frame > 382) return null;
  const a = springAt(frame, 346, SPRINGS.pop) - tween(frame, [370, 382], [0, 1], EASE.in);
  const press = Math.max(0, 1 - Math.abs(frame - 362) / 5);
  return (
    <div style={{ position: "absolute", left: 960, top: 640, transform: `translate(-50%, -50%) scale(${0.8 + 0.2 * clamp01(a)})`, opacity: clamp01(a), display: "flex", alignItems: "center", gap: 20, padding: "22px 40px 22px 24px", borderRadius: 40, background: "rgba(255,255,255,0.86)", backdropFilter: "blur(18px) saturate(1.6)", boxShadow: "0 0 0 1px rgba(10,40,50,0.08), 0 30px 70px -20px rgba(0,30,40,0.5)" }}>
      {["⌘", "V"].map((k) => (
        <span key={k} style={{ transform: `translateY(${press * 5}px)` }}>
          <Key k={k} />
        </span>
      ))}
      <span style={{ marginLeft: 8, font: '650 58px "Inter Variable", sans-serif', letterSpacing: "-0.02em", color: "#0d1a1c" }}>Paste</span>
    </div>
  );
}

/* ---------- The dark planet outgrows the window (flip → phone beat) ---------- */

/** Window-space centre of the globe at its page geometry. */
const globeWin = main(GLOBE.cx, GLOBE.cy);
const START = (() => {
  const c = project(camAt(CAM, FLIP.start), globeWin.x, globeWin.y);
  return { x: c.x, y: c.y, r: GLOBE.r * c.k };
})();

export function BigGlobe({ frame }: { frame: number }) {
  if (frame < FLIP.start || frame > 1112) return null;
  const grow = tween(frame, [FLIP.start, 1006], [0, 1], EASE.inOut);
  const settle = tween(frame, [1030, 1062], [0, 1], EASE.inOut);
  const out = tween(frame, [1088, 1110], [0, 1], EASE.in);
  const x = mix(mix(START.x, 960, grow), 600, settle);
  const y = mix(mix(START.y, 790, grow), 860, settle);
  const r = mix(mix(START.r, 720, grow), 560, settle);
  return (
    <AbsoluteFill style={{ opacity: (1 - 0.45 * settle) * (1 - out) }}>
      <Globe width={1920} height={1080} radius={r} center={[x, y]} rotate={globeRotate(frame)} theme="dark" home="Lisbon" reveal={1} focus="Lisbon" arcs={arcsAt(frame)} uiScale={mix(1.2, 1.7, grow)} atmosphere={1.3} />
    </AbsoluteFill>
  );
}

/* ---------- iPhone + Offline → Synced (dark) ---------- */

function PhoneGlobe({ frame }: { frame: number }) {
  const tabs = [Sun, Users, Globe2, MessageCircle, Settings];
  return (
    <div className="absolute inset-0">
      <Globe width={PHONE_W} height={PHONE_H} radius={186} center={[PHONE_W / 2, 470]} rotate={globeRotate(frame)} theme="dark" home="Lisbon" focus="Lisbon" uiScale={0.85} arcs={arcsAt(frame)} />
      <div className="absolute inset-x-0 top-0 px-3" style={{ paddingTop: 60 }}>
        <div className="flex items-start justify-between gap-2">
          <div className="glass-map specular rounded-lg px-4 py-2">
            <div className="text-title3 leading-tight text-fg">Globe</div>
            <div className="text-footnote text-fg-2">286 people · 79 cities</div>
          </div>
          <div className="glass-map specular rounded-full p-1">
            <span className="flex h-9 items-center rounded-full bg-fill-2 p-0.5">
              <span className="grid h-full w-10 place-items-center rounded-full bg-segment-thumb text-fg [&_svg]:size-4">
                <Globe2 />
              </span>
              <span className="grid h-full w-10 place-items-center text-fg-2 [&_svg]:size-4">
                <Share2 />
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4" style={{ paddingBottom: 18 }}>
        <div className="glass-thick specular relative mx-auto flex h-[62px] items-stretch rounded-full p-1">
          <span className="absolute top-1 bottom-1 left-1 rounded-full bg-accent-soft" style={{ width: "calc((100% - 8px) / 5)", transform: "translateX(200%)" }} />
          {tabs.map((Icon, i) => {
            const label = ["Today", "People", "Globe", "Chat", "Settings"][i]!;
            return (
              <span key={label} className="relative z-[1] flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full" style={{ color: i === 2 ? "var(--accent-text)" : "var(--fg-3)" }}>
                <Icon size={22} strokeWidth={i === 2 ? 2.3 : 1.9} />
                <span className="text-caption2 font-medium">{label}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Synced flips in at this frame (Offline before). */
const SYNCED_AT = 1072;

export function PhoneOverlay({ frame }: { frame: number }) {
  if (frame < 1028 || frame > 1112) return null;
  const enter = springAt(frame, 1030, SPRINGS.sheet);
  const exit = tween(frame, [1090, 1110], [0, 1], EASE.in);
  const pill = springAt(frame, 1046, SPRINGS.smooth) - exit;
  const synced = frame >= SYNCED_AT;
  const pop = synced ? 1 + 0.08 * Math.sin(Math.PI * tween(frame, [SYNCED_AT, SYNCED_AT + 14], [0, 1])) : 1;
  return (
    <AbsoluteFill className="dark" style={{ perspective: 2200 }}>
      <div
        style={{
          position: "absolute",
          left: 1190,
          top: 236,
          transformOrigin: "0 0",
          transform: `translateY(${(1 - enter) * 900 + exit * 900}px) rotateX(${(1 - enter) * 18}deg) scale(0.9)`,
          opacity: clamp01(enter * 1.4) * (1 - exit),
        }}
      >
        <IPhone dark rim="rgba(95,240,244,0.2)">
          <PhoneGlobe frame={frame} />
        </IPhone>
      </div>
      <div
        className="glass-thick specular"
        style={{
          position: "absolute",
          right: 1920 - 1120,
          top: 610,
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "22px 36px 22px 30px",
          borderRadius: 999,
          opacity: clamp01(pill),
          transform: `translateY(${(1 - clamp01(pill)) * 30}px) scale(${pop})`,
          transformOrigin: "100% 50%",
          color: "var(--fg)",
          font: '650 44px "Inter Variable", sans-serif',
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 22, height: 22, borderRadius: 99, background: synced ? "var(--success)" : "var(--warm-dormant)", boxShadow: `0 0 0 7px ${synced ? "var(--success-soft)" : "var(--warning-soft)"}` }} />
        {synced ? "Synced" : "Offline · 2 changes waiting"}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Terminal: add the MCP server, then ask Claude through it ---------- */

const CMD_ADD = 'claude mcp add --transport http --scope user network https://your-network/api/mcp --header "Authorization: Bearer ntk_…"';
const CMD_ASK = 'claude -p "Who should I catch up with in Lisbon?"';

export function TerminalOverlay({ frame }: { frame: number }) {
  if (frame < 1316 || frame > 1626) return null;
  const enter = springAt(frame, 1316, SPRINGS.sheet);
  const exit = tween(frame, [1602, 1624], [0, 1], EASE.in);
  const push = tween(frame, [1340, 1600], [0, 1], EASE.inOut);
  const on = (f: number) => (frame >= f ? springAt(frame, f, SPRINGS.snappy) : 0);
  const toolDone = frame >= 1470;
  const lines: TermLine[] = [
    { kind: "cmd", text: CMD_ADD, shown: tween(frame, [1318, 1356], [0.06, 1], (t) => t) },
    { kind: "out", text: "Added HTTP MCP server network with URL: https://your-network/api/mcp to user config", shown: on(1360) },
    { kind: "cmd", text: "claude mcp list", shown: tween(frame, [1368, 1376], [0, 1], (t) => t) },
    { kind: "ok", text: "network: https://your-network/api/mcp (HTTP) - ✓ Connected", shown: on(1382) },
    { kind: "dim", text: "13 tools: search_people · get_person · list_notes · search_notes · add_note · …", shown: on(1392) },
    { kind: "gap", text: "", shown: on(1418) },
    { kind: "cmd", text: CMD_ASK, shown: tween(frame, [1420, 1446], [0, 1], (t) => t) },
    { kind: "tool", text: `network › search_people(city: "Lisbon")${toolDone ? " · 3 people" : ""}`, shown: on(1452), running: !toolDone },
    { kind: "person", name: "Inês Sampaio", text: " — met her at Web Summit today; climbs on Thursdays.", shown: on(1480) },
    { kind: "person", name: "Mateo Fernández", text: " — raising a seed round; wants an intro to Björn.", shown: on(1492) },
    { kind: "person", name: "Valentina Dubois", text: " — introduced you to Inês; you owe her a studio intro.", shown: on(1504) },
  ];
  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 232,
          transformOrigin: "50% 30%",
          transform: `translateY(${(1 - enter) * 900 + exit * 220}px) rotateX(${(1 - enter) * 14}deg) scale(${(0.95 + 0.05 * enter) * (1 + 0.025 * push)})`,
          opacity: 1 - exit,
        }}
      >
        <Terminal lines={lines} caretOn={Math.floor(frame / 16) % 2 === 0} frame={frame} width={1740} size={34} />
      </div>
    </AbsoluteFill>
  );
}
