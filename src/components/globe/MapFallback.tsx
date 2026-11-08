"use client";
import Link from "next/link";
import { Globe2, RotateCcw } from "lucide-react";
import { buttonVariants, GlassButton } from "@/components/glass/GlassButton";
import { EmptyState } from "@/components/ui/EmptyState";

const COPY = {
  unsupported: {
    title: "The globe can’t start here",
    description: "This browser or device has WebGL turned off, which the map needs. Your people are all still in the list.",
  },
  // Only after the map was brought back several times in a row and kept dropping out.
  lost: {
    title: "The map keeps dropping out",
    description: "Your device is short on graphics memory right now. Closing a few tabs or apps usually helps. Your people are all still in the list.",
  },
  crashed: {
    title: "Something went wrong with the map",
    description: "Reloading it usually helps. Your people are all still in the list.",
  },
} as const;

/** Shown in place of the map when WebGL is unavailable, the map crashed, or recovery gave up. */
export function MapFallback({ kind, onRetry }: { kind: keyof typeof COPY; onRetry: () => void }) {
  const copy = COPY[kind];
  return (
    <div className="absolute inset-0 grid place-items-center bg-bg px-4 pb-[var(--chrome-bottom)]">
      <div className="glass-map specular w-full max-w-sm rounded-xl px-5">
        <EmptyState
          compact
          icon={<Globe2 />}
          title={copy.title}
          description={copy.description}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {kind !== "unsupported" && (
                <GlassButton variant="primary" size="sm" onClick={onRetry}>
                  <RotateCcw className="size-4" /> Reload map
                </GlassButton>
              )}
              <Link href="/people" className={buttonVariants({ variant: "soft", size: "sm" })}>
                Open People
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
