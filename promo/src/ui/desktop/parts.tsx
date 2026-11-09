import type { CSSProperties, ReactNode } from "react";
import { ArrowUp, ChevronDown, Search, Sparkles, Zap } from "lucide-react";

export const cn = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

/**
 * Static recreations of the app's primitives (src/components/glass, src/components/ui) with the
 * same Tailwind classes, minus interactivity. Animation state comes in as plain props.
 */

const BUTTON_VARIANT = {
  primary: "bg-accent-fill text-accent-fg specular elevation-e1",
  glass: "glass specular text-fg",
  surface: "surface text-fg",
  soft: "bg-accent-soft text-accent-text",
  plain: "text-accent-text",
  ghost: "text-fg-2 font-medium",
} as const;
const BUTTON_SIZE = {
  sm: "h-8 px-3.5 text-footnote font-semibold rounded-full",
  md: "h-11 px-5 text-subhead rounded-full",
  lg: "h-[50px] px-6 text-headline rounded-full",
  icon: "h-11 w-11 rounded-full",
} as const;

export function Button({
  variant = "glass",
  size = "md",
  className,
  style,
  children,
}: {
  variant?: keyof typeof BUTTON_VARIANT;
  size?: keyof typeof BUTTON_SIZE;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <span
      className={cn("relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none", BUTTON_VARIANT[variant], BUTTON_SIZE[size], className)}
      style={style}
    >
      {children}
    </span>
  );
}

/** glass/Chip.tsx */
export function Chip({ color, active, size = "md", className, style, children }: { color?: string; active?: boolean; size?: "sm" | "md"; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2.5 text-caption" : "h-8 px-3 text-footnote",
        !color && (active ? "bg-accent-fill text-accent-fg" : "bg-fill-2 text-fg-2"),
        className,
      )}
      style={
        color
          ? { background: active ? color : `color-mix(in oklab, ${color} 16%, transparent)`, color: active ? "white" : `color-mix(in oklab, ${color} 62%, var(--fg))`, ...style }
          : style
      }
    >
      {children}
    </span>
  );
}

/** ui/ToggleChip.tsx */
export function ToggleChip({ pressed, size = "md", icon, color, children, style }: { pressed?: boolean; size?: "sm" | "md"; icon?: ReactNode; color?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap [&_svg]:shrink-0",
        size === "sm" ? "h-7 px-2.5 text-caption [&_svg]:size-3" : "h-8 px-3 text-footnote [&_svg]:size-3.5",
        !color && (pressed ? "bg-accent-fill text-accent-fg" : "bg-fill-2 text-fg-2"),
      )}
      style={
        color
          ? { background: pressed ? color : `color-mix(in oklab, ${color} 14%, transparent)`, color: pressed ? "white" : `color-mix(in oklab, ${color} 62%, var(--fg))`, ...style }
          : style
      }
    >
      {icon}
      {children}
    </span>
  );
}

/** filters/FilterPill.tsx */
export function FilterPill({ icon, label, active, chevron = true }: { icon?: ReactNode; label: string; active?: boolean; chevron?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-footnote font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
        active ? "bg-accent-fill text-accent-fg" : "bg-fill-2 text-fg-2",
      )}
    >
      {icon}
      <span>{label}</span>
      {chevron && <ChevronDown strokeWidth={2.6} className="-mr-0.5 opacity-70" />}
    </span>
  );
}

/** ui/SearchField.tsx (size lg, not glass) with a live caret. */
export function SearchField({ value, placeholder, focused, caret, glass, size = "lg" }: { value: string; placeholder: string; focused?: boolean; caret?: boolean; glass?: boolean; size?: "md" | "lg" }) {
  return (
    <div
      className={cn("relative flex w-full items-center", size === "lg" ? "h-11" : "h-9", glass ? "glass rounded-full" : "rounded-sm bg-fill-2")}
      style={focused ? { boxShadow: "0 0 0 3px var(--focus-ring)" } : undefined}
    >
      <Search size={17} strokeWidth={2.2} className="pointer-events-none absolute left-3 text-fg-3" />
      <div className="flex h-full w-full min-w-0 items-center pr-9 pl-[38px] text-body">
        {value ? <span className="text-fg">{value}</span> : <span className="text-fg-3">{placeholder}</span>}
        {caret && <Caret />}
      </div>
    </div>
  );
}

/** A text caret that blinks on a 1 s cycle (pass the frame to keep it deterministic). */
export function Caret({ on = true, className }: { on?: boolean; className?: string }) {
  return <span className={cn("ml-px inline-block h-[1.15em] w-[2px] translate-y-[1px] rounded-full bg-accent align-middle", className)} style={{ opacity: on ? 1 : 0 }} />;
}

/** ui/InsetGroup.tsx */
export function InsetGroup({ header, headerAction, footer, children, className }: { header?: string; headerAction?: ReactNode; footer?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-1.5", className)}>
      {(header || headerAction) && (
        <div className="flex items-end justify-between gap-3 px-4">
          {header && <h3 className="text-footnote font-medium tracking-[0.02em] text-fg-3 uppercase">{header}</h3>}
          {headerAction && <div className="text-footnote">{headerAction}</div>}
        </div>
      )}
      <div className="surface overflow-hidden rounded-lg">{children}</div>
      {footer && <p className="px-4 text-footnote text-fg-3">{footer}</p>}
    </section>
  );
}

/** ui/ListRow.tsx */
export function ListRow({ label, description, icon, leading, value, chevron, last }: { label: ReactNode; description?: ReactNode; icon?: ReactNode; leading?: ReactNode; value?: ReactNode; chevron?: boolean; last?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex min-h-11 items-center gap-3 px-4",
        !last && "after:absolute after:right-0 after:bottom-0 after:left-4 after:h-[0.5px] after:bg-separator",
      )}
    >
      {leading}
      {icon && <span className="grid size-[30px] shrink-0 place-items-center text-accent-text [&_svg]:size-5">{icon}</span>}
      <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body text-fg">{label}</span>
          {description && <span className="mt-0.5 block truncate text-footnote text-fg-3">{description}</span>}
        </span>
        {value && <span className="max-w-[50%] shrink-0 truncate text-body text-fg-3">{value}</span>}
        {chevron && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="-mr-1 shrink-0 text-fg-4">
            <path d="m9 18 6-6-6-6" />
          </svg>
        )}
      </span>
    </div>
  );
}

/** composer/Composer.tsx: glass message field + round send button (+ optional accessory). */
export function Composer({
  value,
  placeholder,
  leading,
  caret,
  canSend,
  accessory,
  pressed,
}: {
  value: string;
  placeholder: string;
  leading?: ReactNode;
  caret?: boolean;
  canSend?: boolean;
  accessory?: ReactNode;
  pressed?: number;
}) {
  return (
    <div className={cn("glass-thick specular flex items-end gap-2 rounded-xl p-1.5", leading ? "pl-3.5" : "pl-4")}>
      {leading && <span className="grid h-9 shrink-0 place-items-center text-accent-text">{leading}</span>}
      <div className="min-h-9 flex-1 self-center py-[7px] text-body">
        {value ? <span className="text-fg">{value}</span> : <span className="text-fg-4">{placeholder}</span>}
        {caret && <Caret />}
      </div>
      {accessory}
      <span
        className={cn("grid size-9 shrink-0 place-items-center rounded-full", canSend ? "bg-accent-fill text-accent-fg specular" : "bg-fill-2 text-fg-4")}
        style={{ transform: `scale(${1 - 0.1 * (pressed ?? 0)})` }}
      >
        <ArrowUp size={19} strokeWidth={2.6} />
      </span>
    </div>
  );
}

/** SegmentedControl (sm) as the chat composer's model picker uses it. */
export function ModelPicker() {
  return (
    <span className="mb-0.5 inline-flex h-8 items-center rounded-full bg-fill-2 p-0.5 text-caption font-medium">
      <span className="inline-flex h-full items-center gap-1 rounded-full bg-segment-thumb px-2.5 text-fg shadow-e1 [&_svg]:size-3.5">
        <Sparkles /> Smart
      </span>
      <span className="inline-flex h-full items-center gap-1 px-2.5 text-fg-2 [&_svg]:size-3.5">
        <Zap /> Fast
      </span>
    </span>
  );
}

/** ui/Switch.tsx */
export function Switch({ on }: { on: number }) {
  return (
    <span className="relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5" style={{ background: on > 0.5 ? "var(--accent)" : "var(--fill-3)" }}>
      <span className="block size-[27px] rounded-full bg-white shadow-[0_3px_8px_oklch(0_0_0/0.15),0_1px_1px_oklch(0_0_0/0.16)]" style={{ transform: `translateX(${20 * on}px)` }} />
    </span>
  );
}

/** Spinner (ui/Spinner.tsx look): 8 fading ticks, rotation driven by the frame. */
export function Spinner({ size = 16, frame }: { size?: number; frame: number }) {
  const step = Math.floor(frame / 5) % 8;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="text-fg-3" style={{ transform: `rotate(${step * 45}deg)` }}>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="11" y="2" width="2" height="6" rx="1" fill="currentColor" opacity={0.25 + (0.75 * ((i + 8) % 8)) / 8} transform={`rotate(${i * 45} 12 12)`} />
      ))}
    </svg>
  );
}

/** GitHub mark (lucide dropped brand icons). */
export function GithubMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** Warmth dot colours, as WARMTH_META in the app. */
export const WARMTH_COLOR = {
  inner: "var(--warm-inner)",
  active: "var(--warm-active)",
  dormant: "var(--warm-dormant)",
  archive: "var(--warm-archive)",
} as const;

/** Category palette as the default categories map onto it (migrations → paletteVar). */
export const CATEGORY = {
  mentor: { name: "Mentor", color: "var(--palette-violet)" },
  friend: { name: "Friend", color: "var(--palette-coral)" },
  partner: { name: "Business partner", color: "var(--palette-teal)" },
  investor: { name: "Investor", color: "var(--palette-amber)" },
  client: { name: "Client", color: "var(--palette-sky)" },
  founder: { name: "Peer founder", color: "var(--palette-green)" },
  acquaint: { name: "Acquaintance", color: "var(--warm-archive)" },
} as const;
