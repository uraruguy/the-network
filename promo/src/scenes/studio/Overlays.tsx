import { Globe2, MessageCircle, Moon, Settings, Share2, Sun, SunMoon, Users } from "lucide-react";
import { AbsoluteFill } from "remotion";
import { IPhone, PHONE_H, PHONE_W } from "../../devices/IPhone";
import { EASE, SPRINGS, clamp01, progress, springAt, tween } from "../../kit/motion";
import { Globe } from "../../ui/common/Globe";
import { DigestEmail } from "../../ui/desktop/DigestEmail";
import { Terminal, type TermLine } from "../../ui/desktop/Terminal";
import { FLIP } from "./timeline";
import { globeRotate } from "./WindowContent";

/* ---------- Digest e-mail (scene 1) ---------- */

export const EMAIL = { left: 1090, top: 372, done: { x: 97, y: 288 } };
/** Screen position of Sara's Done button (the push scales around it, so it stays put). */
export const EMAIL_DONE = { x: EMAIL.left + EMAIL.done.x, y: EMAIL.top + EMAIL.done.y };

export function EmailOverlay({ frame }: { frame: number }) {
  if (frame < 392 || frame > 520) return null;
  const enter = springAt(frame, 394, SPRINGS.sheet);
  const exit = tween(frame, [488, 516], [0, 1], EASE.in);
  const push = tween(frame, [430, 462], [0, 1], EASE.inOut);
  const done = progress(frame, 466, 10, EASE.out);
  const press = Math.max(0, 1 - Math.abs(frame - 462) / 5);
  const x = (1 - enter) * 760 + exit * 900;
  return (
    <AbsoluteFill style={{ perspective: 2200 }}>
      <div
        style={{
          position: "absolute",
          left: EMAIL.left,
          top: EMAIL.top - 44,
          opacity: clamp01(enter * 1.5) * (1 - exit),
          transform: `translateX(${x}px) rotateY(${(1 - enter) * -24}deg) scale(${1 + 0.34 * push})`,
          transformOrigin: `${EMAIL.done.x}px ${EMAIL.done.y + 44}px`,
        }}
      >
        <div style={{ height: 44, display: "flex", alignItems: "center", gap: 8, font: '500 15px "JetBrains Mono Variable", monospace', letterSpacing: "0.12em", color: "#0b7f86", textTransform: "uppercase" }}>
          <span style={{ width: 8, height: 8, borderRadius: 9, background: "#0fb5ba", boxShadow: "0 0 0 4px rgba(15,181,186,0.18)" }} /> Daily digest · 07:00
        </div>
        <DigestEmail done={{ "Sara Rossi": done }} press={{ "Sara Rossi": press }} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Keycaps (scene 2) ---------- */

function Key({ k, wide }: { k: string; wide?: boolean }) {
  return (
    <span
      style={{
        minWidth: wide ? 64 : 52,
        height: 52,
        padding: "0 12px",
        display: "grid",
        placeItems: "center",
        borderRadius: 12,
        background: "linear-gradient(#ffffff, #eef3f4)",
        boxShadow: "0 0 0 1px rgba(10,40,50,0.12), 0 3px 0 rgba(10,40,50,0.14), 0 10px 20px -8px rgba(10,40,50,0.25)",
        font: '600 24px "Inter Variable", sans-serif',
        color: "#0d1a1c",
      }}
    >
      {k}
    </span>
  );
}

export function Keycaps({ frame, at, out, keys, label }: { frame: number; at: number; out: number; keys: string[]; label: string }) {
  if (frame < at || frame > out + 12) return null;
  const a = springAt(frame, at, SPRINGS.pop) - tween(frame, [out, out + 12], [0, 1], EASE.in);
  const press = Math.max(0, 1 - Math.abs(frame - (at + 12)) / 6);
  return (
    <div
      style={{
        position: "absolute",
        left: 960,
        top: 968,
        transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * clamp01(a)}) translateY(${(1 - clamp01(a)) * 30}px)`,
        opacity: clamp01(a),
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 20px 12px 14px",
        borderRadius: 22,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(18px) saturate(1.6)",
        boxShadow: "0 0 0 1px rgba(10,40,50,0.08), 0 20px 50px -16px rgba(0,40,50,0.35)",
      }}
    >
      {keys.map((k) => (
        <span key={k} style={{ transform: `translateY(${press * 3}px)` }}>
          <Key k={k} wide={k.length > 1} />
        </span>
      ))}
      <span style={{ marginLeft: 6, font: '600 22px "Inter Variable", sans-serif', letterSpacing: "-0.01em", color: "#0d1a1c" }}>{label}</span>
    </div>
  );
}

/* ---------- Appearance toggle (scene 4): the theme flip starts here ---------- */

export const APPEARANCE = { left: 1250, top: 786, scale: 1.55 };
const SEG = 121;
/** Screen position of the "Dark" segment (the flip's origin). */
export const DARK_SEG = { x: APPEARANCE.left + (8 + SEG * 2.5) * APPEARANCE.scale, y: APPEARANCE.top + (8 + 28 + 22) * APPEARANCE.scale };

export function AppearanceToggle({ frame, dark }: { frame: number; dark: boolean }) {
  if (frame < 1206 || frame > 1290) return null;
  const a = springAt(frame, 1208, SPRINGS.smooth) - tween(frame, [1270, 1288], [0, 1], EASE.in);
  const thumb = 1 + springAt(frame, FLIP.click, SPRINGS.snappy);
  const items = [
    { icon: <SunMoon size={18} />, label: "Auto" },
    { icon: <Sun size={18} />, label: "Light" },
    { icon: <Moon size={18} />, label: "Dark" },
  ];
  return (
    <div
      className={dark ? "dark" : undefined}
      style={{ position: "absolute", left: APPEARANCE.left, top: APPEARANCE.top, transformOrigin: "0 0", transform: `scale(${APPEARANCE.scale * (0.94 + 0.06 * clamp01(a))}) translateY(${(1 - clamp01(a)) * 26}px)`, opacity: clamp01(a) }}
    >
      <div className="glass-thick specular elevation-e3 rounded-xl p-2 text-fg" style={{ width: 380 }}>
        <div className="px-2 pt-1 pb-1.5 text-footnote font-medium tracking-[0.02em] text-fg-3 uppercase">Appearance</div>
        <div className="relative flex h-11 items-center rounded-full bg-fill-2 p-0.5">
          <span className="absolute top-0.5 bottom-0.5 rounded-full bg-segment-thumb shadow-e1" style={{ left: 2, width: SEG - 2, transform: `translateX(${thumb * SEG}px)` }} />
          {items.map((it, i) => (
            <span key={it.label} className="relative z-[1] inline-flex h-full flex-1 items-center justify-center gap-1.5 text-subhead font-medium" style={{ color: Math.round(thumb) === i ? "var(--fg)" : "var(--fg-2)" }}>
              {it.icon} {it.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- iPhone with the same globe (scene 4, dark) ---------- */

function PhoneGlobe({ frame }: { frame: number }) {
  const offline = frame >= 1318 && frame < 1356;
  const synced = frame >= 1356;
  const pill = springAt(frame, 1318, SPRINGS.smooth) - tween(frame, [1372, 1388], [0, 1], EASE.in);
  const tabs = [Users, Globe2, MessageCircle, Settings];
  return (
    <div className="absolute inset-0">
      <Globe width={PHONE_W} height={PHONE_H} radius={186} center={[PHONE_W / 2, 470]} rotate={globeRotate(frame)} theme="dark" focus="Lisbon" uiScale={0.85} />
      <div className="absolute inset-x-0 top-0 px-3" style={{ paddingTop: 60 }}>
        <div className="flex items-start justify-between gap-2">
          <div className="glass-map specular rounded-lg px-4 py-2">
            <div className="text-title3 leading-tight text-fg">Globe</div>
            <div className="text-footnote text-fg-2">285 people · 79 cities</div>
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
      {pill > 0 && (
        <div className="absolute inset-x-0 flex justify-center" style={{ top: 140, opacity: clamp01(pill), transform: `translateY(${(1 - clamp01(pill)) * -12}px) scale(${0.96 + 0.04 * clamp01(pill)})` }}>
          <span className="glass-thick specular flex h-8 items-center gap-2 rounded-full px-3.5 text-footnote font-medium text-fg">
            <span className="size-2 rounded-full" style={{ background: offline ? "var(--warm-dormant)" : synced ? "var(--success)" : "var(--accent)" }} />
            {offline ? "Offline · 2 changes waiting" : "Synced"}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 px-4" style={{ paddingBottom: 18 }}>
        <div className="glass-thick specular relative mx-auto flex h-[62px] items-stretch rounded-full p-1">
          <span className="absolute top-1 bottom-1 left-1 rounded-full bg-accent-soft" style={{ width: "calc((100% - 8px) / 5)", transform: "translateX(200%)" }} />
          {[Sun, ...tabs].map((Icon, i) => {
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

export function PhoneOverlay({ frame }: { frame: number }) {
  if (frame < 1300 || frame > 1396) return null;
  const enter = springAt(frame, 1308, SPRINGS.sheet);
  const exit = tween(frame, [1364, 1394], [0, 1], EASE.in);
  return (
    <AbsoluteFill style={{ perspective: 2200 }}>
      <div
        style={{
          position: "absolute",
          left: 1250,
          top: 300,
          transformOrigin: "0 0",
          transform: `translateX(${(1 - enter) * 700 + exit * 760}px) rotateY(${(1 - enter) * -30 + exit * -16}deg) scale(0.8)`,
          opacity: clamp01(enter * 1.4) * (1 - exit),
        }}
      >
        <IPhone dark rim="rgba(95,240,244,0.18)">
          <PhoneGlobe frame={frame} />
        </IPhone>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Terminal + MCP (scene 5) ---------- */

const CMD1 = 'claude mcp add --transport http --scope user network https://your-network/api/mcp --header "Authorization: Bearer ntk_…"';

export function TerminalOverlay({ frame }: { frame: number }) {
  if (frame < 1524 || frame > 1700) return null;
  const enter = springAt(frame, 1526, SPRINGS.sheet);
  const exit = tween(frame, [1638, 1664], [0, 1], EASE.in);
  const push = tween(frame, [1552, 1640], [0, 1], EASE.inOut);
  const lines: TermLine[] = [
    { kind: "cmd", text: CMD1, shown: tween(frame, [1550, 1572], [0, 1], (t) => t) },
    { kind: "out", text: "Added HTTP MCP server network with URL: https://your-network/api/mcp to user config", shown: frame >= 1576 ? 1 : 0 },
    { kind: "cmd", text: "claude mcp list", shown: tween(frame, [1582, 1590], [0, 1], (t) => t) },
    { kind: "dim", text: "Checking MCP server health…", shown: frame >= 1592 ? 1 : 0 },
    { kind: "ok", text: "network: https://your-network/api/mcp (HTTP) - ✓ Connected", shown: frame >= 1600 ? 1 : 0 },
  ];
  const tools = tween(frame, [1604, 1630], [0, 13], (t) => t);
  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      <div
        style={{
          position: "absolute",
          left: 800,
          top: 300,
          transformOrigin: "50% 40%",
          transform: `translateY(${(1 - enter) * 260 + exit * 140}px) rotateX(${(1 - enter) * 16}deg) rotateY(${-8 + 4 * push}deg) scale(${(0.94 + 0.06 * enter) * (1 + 0.04 * push) * (1 - 0.1 * exit)})`,
          opacity: clamp01(enter * 1.4) * (1 - exit),
        }}
      >
        <Terminal lines={lines} tools={tools} caretOn={Math.floor(frame / 16) % 2 === 0} width={1060} />
      </div>
    </AbsoluteFill>
  );
}
