"use client";
import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { memo, type CSSProperties, type MouseEvent } from "react";
import { Avatar } from "@/components/glass/Avatar";
import { AvatarTransition, NAV_FORWARD } from "@/components/shell/transitions";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useNow } from "@/lib/clock";
import type { PeopleRow } from "@/lib/filters/people-filters";
import { rememberListPosition } from "@/lib/people/list-memory";
import { cn, flag, WARMTH_META } from "@/lib/utils";

/** Fixed row height (px) — the virtualizer relies on it. */
export const PERSON_ROW_HEIGHT = 68;

export type PersonRowProps = {
  p: PeopleRow;
  /** Activity emoji by id (only the first three of the person's activities are shown). */
  emojiById: ReadonlyMap<string, string>;
  /** Right-hand detail: time since the last interaction (default), the next follow-up, or when they were added. */
  detail?: RowDetail;
  /** Select mode: the row toggles selection instead of opening the profile. */
  selecting?: boolean;
  selected?: boolean;
  /** Toggle handler for select mode (`range`: shift-click extends from the last toggled row). */
  onToggle?: (p: PeopleRow, range: boolean) => void;
  /** The person opened last from this list: a steady tint, so you see where you were. */
  lastOpened?: boolean;
  /** Just came back from their profile: a short glow on top of the tint. */
  returning?: boolean;
  className?: string;
  style?: CSSProperties;
};

export type RowDetail = "last" | "followup" | "added";

const DAY = 86_400_000;

/** "now", "5m", "3h", "Yesterday", "4d", "3w", "5mo", "2y" — compact like Mail. */
export function compactAgo(date: Date, now: number): string {
  const diff = Math.max(0, now - date.getTime());
  const min = diff / 60_000;
  if (min < 1) return "now";
  if (min < 60) return `${Math.floor(min)}m`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}h`;
  const days = Math.floor(diff / DAY);
  if (days < 2) return "Yesterday";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

/** "Today", "Tomorrow", "in 3d", "in 2w", "2d overdue" for a follow-up date. */
export function compactDue(date: Date, now: number): string {
  const startOf = (t: number) => new Date(new Date(t).toDateString()).getTime();
  const days = Math.round((startOf(date.getTime()) - startOf(now)) / DAY);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${-days}d overdue`;
  if (days < 14) return `in ${days}d`;
  if (days < 60) return `in ${Math.round(days / 7)}w`;
  return `in ${Math.round(days / 30)}mo`;
}

/**
 * The profile route is dynamic, so a default prefetch stops at its loading.tsx skeleton and the
 * navigation would commit that skeleton — no avatar to morph into. Prefetch the page itself (a
 * tiny payload: the profile renders from the cached index).
 */
const FULL_PREFETCH = { kind: "full" as PrefetchKind };

const isOverdue = (d: string | Date | null, now: number) => !!d && new Date(d).getTime() < new Date(new Date(now).toDateString()).getTime();

/**
 * One person in the list: avatar, name + warmth, "City · Role, Company", up to three activity
 * emoji and the last interaction. Opening a row remembers your place in the list (list-memory).
 * In select mode it's a checkbox instead of a link. Memoized — rows only re-render when their
 * person or their selection/highlight changes.
 */
export const PersonRow = memo(function PersonRow({ p, emojiById, detail = "last", selecting, selected, onToggle, lastOpened, returning, className, style }: PersonRowProps) {
  const router = useRouter();
  const now = useNow();
  const href = `/people/${p.id}`;
  // Prefetch on intent rather than on visibility: a fast scroll through 1,000 rows shouldn't fire 1,000 prefetches.
  const prefetch = () => router.prefetch(href, FULL_PREFETCH);

  const rowClass = cn(
    "group/row relative flex w-full items-center gap-3 pr-4 pl-4 text-left outline-none select-none",
    "transition-colors duration-150 active:bg-fill-2 focus-visible:bg-fill-1 focus-visible:shadow-[inset_0_0_0_2px_var(--focus-ring)] [@media(hover:hover)]:hover:bg-fill-1",
    // Inset separator from the text column; the list hides it on the last row.
    "after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-[0.5px] after:bg-separator group-data-[last]/item:after:hidden",
    selecting && "after:left-[106px]",
    selected && "bg-accent-soft [@media(hover:hover)]:hover:bg-accent-soft",
    // Where you were: a steady tint and an accent edge (a short glow when you've just come back).
    !selecting && lastOpened && "bg-accent-soft/60 before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-accent",
    !selecting && returning && "person-row-return",
    className,
  );
  const content = (
    <>
      {selecting && (
        <span
          aria-hidden
          className={cn(
            "person-row-check grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150",
            selected ? "border-transparent bg-accent-fill text-accent-fg" : "border-fg-4 bg-surface",
          )}
        >
          {selected && <Check size={14} strokeWidth={3} />}
        </span>
      )}
      <RowBody p={p} emojiById={emojiById} detail={detail} now={now} />
    </>
  );

  if (selecting) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={!!selected}
        aria-label={p.displayName}
        data-person-id={p.id}
        onClick={(e: MouseEvent) => onToggle?.(p, e.shiftKey)}
        style={{ height: PERSON_ROW_HEIGHT, ...style }}
        className={rowClass}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      transitionTypes={NAV_FORWARD}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      onClick={() => rememberListPosition(p.id)}
      data-person-id={p.id}
      aria-current={lastOpened ? "true" : undefined}
      draggable={false}
      style={{ height: PERSON_ROW_HEIGHT, ...style }}
      className={rowClass}
    >
      {content}
    </Link>
  );
});

/** Avatar, name + warmth, "City · Role, Company", activity emoji and the right-hand detail. */
function RowBody({ p, emojiById, detail, now }: { p: PeopleRow; emojiById: ReadonlyMap<string, string>; detail: RowDetail; now: number }) {
  const work = [p.headline, p.company].filter(Boolean).join(", ");
  const city = p.homeLocation ? `${flag(p.homeLocation.countryCode)} ${p.homeLocation.name}`.trim() : "";
  const sub = [city, work].filter(Boolean).join(" · ");
  const emoji = p.activityIds
    .map((id) => emojiById.get(id))
    .filter(Boolean)
    .slice(0, 3)
    .join("");
  const when = detail === "followup" ? p.nextFollowupAt : detail === "added" ? p.createdAt : p.lastInteractionAt;
  const warmth = WARMTH_META[p.warmth];
  return (
    <>
      <span className="shrink-0">
        <AvatarTransition personId={p.id}>
          <Avatar name={p.displayName} src={p.avatarUrl} size={44} />
        </AvatarTransition>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-headline text-fg">{p.displayName}</span>
          <span role="img" aria-label={warmth.label} title={warmth.label} className="size-2 shrink-0 rounded-full" style={{ background: warmth.color }} />
        </span>
        {sub && <span className="mt-0.5 truncate text-footnote text-fg-2">{sub}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 self-stretch justify-center pl-1">
        {when ? (
          <RelativeTime
            date={when}
            format={detail === "followup" ? compactDue : compactAgo}
            className={cn("text-footnote tabular-nums", detail === "followup" && isOverdue(when, now) ? "text-danger" : "text-fg-3")}
          />
        ) : (
          <span aria-hidden className="text-footnote text-fg-4">
            {detail === "followup" ? "—" : ""}
          </span>
        )}
        {emoji && (
          <span aria-hidden className="text-footnote leading-none tracking-[0.08em]">
            {emoji}
          </span>
        )}
      </span>
    </>
  );
}
