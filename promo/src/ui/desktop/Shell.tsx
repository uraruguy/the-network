import type { ReactNode } from "react";
import { Globe2, MessageCircle, Settings, Sun, Users } from "lucide-react";
import { Logo } from "../../kit/Logo";
import { cn } from "./parts";

export const SIDEBAR_W = 236;
export const NAV = [
  { label: "Today", icon: Sun },
  { label: "People", icon: Users },
  { label: "Globe", icon: Globe2 },
  { label: "Chat", icon: MessageCircle },
  { label: "Settings", icon: Settings },
] as const;

/** `.app-bg`: the faint turquoise wash, absolutely positioned so it lives inside the window. */
export function AppBg() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="absolute rounded-full" style={{ width: 1152, height: 1152, left: -403, top: -518, background: "radial-gradient(closest-side, var(--accent-200), transparent)", opacity: 0.35 }} />
      <div className="absolute rounded-full" style={{ width: 864, height: 864, right: -346, bottom: -432, background: "radial-gradient(closest-side, var(--accent-100), transparent)", opacity: 0.3 }} />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(closest-side at 18% 8%, color-mix(in oklab, var(--accent-700) 22%, transparent), transparent 70%), radial-gradient(closest-side at 90% 95%, color-mix(in oklab, var(--accent-800) 18%, transparent), transparent 70%), var(--bg)",
        }}
      />
    </div>
  );
}

/**
 * The ≥lg app frame (`overlay`: viewport-fixed layers such as dialogs, over the sidebar too): glass sidebar (logo, nav with the sliding accent pill, sync status) and the
 * main area. `active` may be fractional while the pill slides between items.
 */
export function DesktopShell({ active, children, overlay, sync = "Synced", syncTone = "ok", bg = true }: { active: number; children: ReactNode; overlay?: ReactNode; sync?: string; syncTone?: "ok" | "offline" | "waiting"; bg?: boolean }) {
  const on = Math.round(active);
  return (
    <div className="absolute inset-0 overflow-hidden text-fg">
      {bg && <AppBg />}
      <aside className="absolute inset-y-0 left-0 z-30 p-4" style={{ width: SIDEBAR_W }}>
        <div className="glass specular flex h-full flex-col rounded-xl p-3">
          <div className="flex items-center gap-2.5 rounded-sm px-2 pt-2 pb-5">
            <Logo size={30} />
            <span className="text-headline text-fg">The Network</span>
          </div>
          <nav className="relative flex flex-col gap-1">
            <span className="absolute inset-x-0 top-0 h-11 rounded-sm bg-accent-soft" style={{ transform: `translateY(${active * 48}px)` }} />
            {NAV.map((item, i) => {
              const sel = i === on;
              const Icon = item.icon;
              return (
                <span key={item.label} className={cn("relative z-[1] flex h-11 items-center gap-3 rounded-sm px-3 text-subhead font-medium", sel ? "text-accent-text" : "text-fg-2")}>
                  <Icon size={20} strokeWidth={sel ? 2.4 : 2} />
                  {item.label}
                </span>
              );
            })}
          </nav>
          <div className="mt-auto px-2 pb-1">
            <div className="flex min-h-6 items-center gap-2 text-caption text-fg-3">
              <span className={cn("size-2 shrink-0 rounded-full", syncTone === "offline" ? "bg-warm-dormant" : syncTone === "waiting" ? "bg-accent" : "bg-success")} />
              <span className="truncate">{sync}</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="absolute inset-y-0 right-0 overflow-hidden" style={{ left: SIDEBAR_W }}>
        {children}
      </main>
      {overlay}
    </div>
  );
}

