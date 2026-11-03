"use client";
import type { ReactNode } from "react";
import { GlassButton } from "@/components/glass/GlassButton";

/**
 * Select mode's bar: takes the tab bar's place while selecting (shell.css hides the tab bar under
 * `:root[data-selecting]`), centred at the bottom on desktop. Count, Cancel and one action.
 */
export function SelectionBar({
  count,
  label,
  actionLabel,
  actionIcon,
  variant = "danger",
  onAction,
  onCancel,
}: {
  count: number;
  /** What's being selected ("people"), for the bar's accessible name. */
  label: string;
  actionLabel: string;
  actionIcon?: ReactNode;
  variant?: "danger" | "primary";
  onAction: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="toolbar" aria-label={`Selected ${label}`} className="selection-bar fixed inset-x-0 bottom-0 z-[var(--z-chrome)] px-4 lg:bottom-6">
      <div className="glass-thick specular mx-auto flex h-[62px] max-w-[440px] items-center gap-2 rounded-full p-1.5 pl-5">
        <span className="min-w-0 flex-1 truncate text-subhead font-medium text-fg tabular-nums" aria-live="polite">
          {count === 0 ? `Select ${label}` : `${count.toLocaleString("en")} selected`}
        </span>
        <GlassButton variant="ghost" onClick={onCancel}>
          Cancel
        </GlassButton>
        <GlassButton variant={variant} onClick={onAction} disabled={count === 0}>
          {actionIcon}
          {actionLabel}
        </GlassButton>
      </div>
    </div>
  );
}
