import { cn } from "@/lib/utils";

/**
 * Soft turquoise planet shown while the map chunk, the data or the first tiles load, and, with a
 * `caption` on it, while a map that lost its graphics context comes back.
 */
export function GlobeSkeleton({ className, caption }: { className?: string; caption?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 grid place-items-center pb-[var(--chrome-bottom)]", className)}
      role="status"
      aria-label={caption ?? "Loading the globe"}
    >
      <div className="col-start-1 row-start-1 size-[min(68vmin,560px)] animate-pulse rounded-full bg-[radial-gradient(circle_at_38%_34%,var(--accent-100),var(--accent-200)_55%,var(--accent-300))] opacity-50 shadow-e3 motion-reduce:animate-none dark:bg-[radial-gradient(circle_at_38%_34%,var(--accent-800),var(--accent-900)_55%,var(--accent-950))]" />
      {caption && (
        <p className="glass-map specular col-start-1 row-start-1 rounded-full px-3.5 py-1.5 text-footnote font-medium text-fg-2">{caption}</p>
      )}
    </div>
  );
}
