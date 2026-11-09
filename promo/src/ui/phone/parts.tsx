import type { CSSProperties, ReactNode } from "react";
import { Check, Globe2, MessageCircle, Settings, Sun, Undo2, Users, type LucideIcon } from "lucide-react";
import { PHONE_H, PHONE_W } from "../../devices/IPhone";
import { clamp01, mix } from "../../kit/motion";

/** iPhone Pro safe areas, as the app sees them (env(safe-area-inset-*)). */
export const SAT = 56;
export const SAB = 34;
/** Height of the floating tab bar incl. its safe-area padding (--chrome-bottom). */
export const CHROME_BOTTOM = 64 + SAB;

/** Root of a phone screen: the app's CSS variables for a 402×874 pt viewport. */
export function Screen({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={
        {
          position: "absolute",
          inset: 0,
          width: PHONE_W,
          height: PHONE_H,
          overflow: "hidden",
          "--sat": `${SAT}px`,
          "--sab": `${SAB}px`,
          "--page-px": "16px",
          "--page-pt": `${12 + SAT}px`,
          "--chrome-bottom": `${CHROME_BOTTOM}px`,
          // Backdrop blur can't render under the camera's filter/mask, so glass gets a near-opaque fill.
          "--surface-3": "oklch(0.99 0.003 200 / 0.94)",
          "--surface-4": "oklch(0.99 0.003 200 / 0.96)",
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/** The app's ambient wash (.app-bg), sized for the phone viewport instead of vmax of the video. */
export function AppBg() {
  const vmax = PHONE_H;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--bg)", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 0.8 * vmax,
          height: 0.8 * vmax,
          left: -0.28 * vmax,
          top: -0.36 * vmax,
          borderRadius: 9999,
          background: "radial-gradient(closest-side, var(--accent-200), transparent)",
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 0.6 * vmax,
          height: 0.6 * vmax,
          right: -0.24 * vmax,
          bottom: -0.3 * vmax,
          borderRadius: 9999,
          background: "radial-gradient(closest-side, var(--accent-100), transparent)",
          opacity: 0.3,
        }}
      />
    </div>
  );
}

const NAV: { label: string; icon: LucideIcon }[] = [
  { label: "Today", icon: Sun },
  { label: "People", icon: Users },
  { label: "Globe", icon: Globe2 },
  { label: "Chat", icon: MessageCircle },
  { label: "Settings", icon: Settings },
];

/**
 * The floating glass tab bar (AppShell TabBar + shell.css .tab-pill). `active` may be fractional
 * while the pill slides between tabs; the highlighted label follows the nearest tab.
 */
export function TabBar({ active, y = 0 }: { active: number; y?: number }) {
  const on = Math.round(active);
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 px-4" style={{ paddingBottom: SAB, transform: `translateY(${y}px)` }}>
      <div className="glass-thick specular relative mx-auto flex h-[62px] max-w-[440px] items-stretch rounded-full p-1">
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-1 rounded-full bg-accent-soft"
          style={{ width: "calc((100% - 8px) / 5)", transform: `translateX(${active * 100}%)` }}
        />
        {NAV.map((item, i) => (
          <span key={item.label} className={`relative z-[1] flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full ${i === on ? "text-accent-text" : "text-fg-3"}`}>
            <item.icon size={22} strokeWidth={i === on ? 2.3 : 1.9} aria-hidden />
            <span className="text-caption2 font-medium">{item.label}</span>
          </span>
        ))}
      </div>
    </nav>
  );
}

/** The home indicator pill at the bottom edge. */
export function HomeIndicator({ dark = false }: { dark?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        left: "50%",
        width: 140,
        height: 5,
        marginLeft: -70,
        borderRadius: 3,
        background: dark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.82)",
        zIndex: 40,
      }}
    />
  );
}

/**
 * The follow-up checkbox (FollowUps.tsx ReminderItem): `t` 0→1 runs the keyframed pop
 * (scale 1 → 1.22 → 1), the fill and the check's spring.
 */
export function CheckCircle({ t, size = 24 }: { t: number; size?: number }) {
  const on = t > 0.02;
  const pop = t < 0.38 ? mix(1, 1.22, t / 0.38) : mix(1.22, 1, clamp01((t - 0.38) / 0.62));
  const check = clamp01((t - 0.15) / 0.5);
  const checkScale = 0.5 + 0.5 * check + 0.16 * Math.sin(check * Math.PI);
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full">
      <span
        className="grid place-items-center rounded-full border-[1.5px]"
        style={{
          width: size,
          height: size,
          transform: `scale(${on ? pop : 1})`,
          borderColor: on ? "var(--accent-fill)" : "var(--fg-4)",
          background: on ? `color-mix(in oklab, var(--accent-fill) ${Math.round(clamp01(t * 3) * 100)}%, transparent)` : "transparent",
          color: "var(--accent-fg)",
        }}
      >
        <span style={{ transform: `scale(${checkScale})`, opacity: check, display: "grid" }}>
          <Check size={14} strokeWidth={3} aria-hidden />
        </span>
      </span>
    </span>
  );
}

/** Display chip (glass/Chip.tsx). */
export function Chip({ children, color, size = "md", className = "" }: { children: ReactNode; color?: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${size === "sm" ? "h-6 px-2.5 text-caption" : "h-8 px-3 text-footnote"} ${color ? "" : "bg-fill-2 text-fg-2"} ${className}`}
      style={color ? { background: `color-mix(in oklab, ${color} 16%, transparent)`, color: `color-mix(in oklab, ${color} 62%, var(--fg))` } : undefined}
    >
      {children}
    </span>
  );
}

/** Grouped list with an uppercase header (ui/InsetGroup.tsx). */
export function InsetGroup({ header, action, children }: { header?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      {(header || action) && (
        <div className="flex items-end justify-between gap-3 px-4">
          {header && <h3 className="text-footnote font-medium tracking-[0.02em] text-fg-3 uppercase">{header}</h3>}
          {action && <div className="text-footnote">{action}</div>}
        </div>
      )}
      <div className="surface overflow-hidden rounded-lg">{children}</div>
    </section>
  );
}

/** The undo toast (ui/Toast.tsx) at the toast viewport above the tab bar. `t` 0→1 enters. */
export function UndoToast({ t, title, who, description }: { t: number; title: string; who: string; description?: string }) {
  return (
    <div
      className="absolute inset-x-0 z-40 mx-auto"
      style={{ bottom: CHROME_BOTTOM + 4, width: PHONE_W - 24, opacity: clamp01(t * 1.6), transform: `translateY(${(1 - t) * 26}px) scale(${0.94 + 0.06 * t})` }}
    >
      <div className="specular rounded-xl text-fg" style={{ background: "oklch(0.995 0.002 200 / 0.97)", border: "0.5px solid var(--hairline)", boxShadow: "inset 0 1px 0 var(--highlight), var(--shadow-e3)" }}>
        <div className="flex min-h-[52px] items-center gap-3 py-2 pr-2 pl-4">
          <span className="grid shrink-0 place-items-center">
            <Undo2 size={18} className="text-fg-3" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1 py-1">
            <div className="truncate text-subhead font-semibold">
              {title} · <span className="font-normal text-fg-2">{who}</span>
            </div>
            {description && <div className="line-clamp-2 text-footnote text-fg-2">{description}</div>}
          </div>
          <span className="grid h-9 shrink-0 place-items-center rounded-full bg-accent-soft px-4 text-subhead font-semibold text-accent-text">Undo</span>
        </div>
      </div>
    </div>
  );
}

/**
 * iOS-style touch indicator: a soft disc that presses in, then a ring that ripples out on release.
 * `t` is frames since the touch began; `hold` is how long the finger stays down.
 */
export function Tap({ x, y, t, hold = 8 }: { x: number; y: number; t: number; hold?: number }) {
  if (t < -6 || t > hold + 26) return null;
  const appear = clamp01((t + 6) / 6);
  const release = clamp01((t - hold) / 18);
  const press = t < 0 ? 1 : t < hold ? 0.86 : mix(0.86, 1.05, clamp01((t - hold) / 6));
  const disc = appear * (1 - release);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, zIndex: 80, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 46,
          height: 46,
          left: -23,
          top: -23,
          borderRadius: 99,
          background: "radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.45) 60%, rgba(255,255,255,0.15) 100%)",
          boxShadow: "0 0 0 1.5px rgba(10,40,50,0.18), 0 4px 14px rgba(0,30,40,0.22)",
          transform: `scale(${press})`,
          opacity: disc,
        }}
      />
      {release > 0 && release < 1 && (
        <div
          style={{
            position: "absolute",
            width: 46,
            height: 46,
            left: -23,
            top: -23,
            borderRadius: 99,
            border: "2px solid rgba(255,255,255,0.9)",
            boxShadow: "0 0 0 1px rgba(10,143,150,0.35)",
            transform: `scale(${1 + release * 1.4})`,
            opacity: (1 - release) * 0.9,
          }}
        />
      )}
    </div>
  );
}

/** Blinking text caret (steps on a 30-frame cycle so it reads as iOS, not a fade). */
export function Caret({ frame, visible = true, height = 22 }: { frame: number; visible?: boolean; height?: number }) {
  if (!visible) return null;
  const on = Math.floor(frame / 16) % 2 === 0;
  return <span style={{ display: "inline-block", width: 2, height, marginLeft: 1, marginBottom: -4, borderRadius: 1, background: "var(--accent)", opacity: on ? 1 : 0 }} />;
}

export function Flag({ children }: { children: ReactNode }) {
  return <span aria-hidden>{children}</span>;
}
