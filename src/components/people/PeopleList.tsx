"use client";
import { CheckCircle2, ChevronRight, Globe2, Plus, SearchX, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Avatar } from "@/components/glass/Avatar";
import { buttonVariants, GlassButton } from "@/components/glass/GlassButton";
import { FilterBar } from "@/components/filters/FilterBar";
import { FollowUpSheet } from "@/components/followups/FollowUpSheet";
import { confirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { activeFacetCount, hrefWithFilters, type PeopleRow } from "@/lib/filters/people-filters";
import { indexLetter } from "@/lib/filters/sort";
import { replaceSearchParams, usePeopleFilters, usePeopleSort } from "@/lib/filters/usePeopleFilters";
import { readListMemory, sameListHref, saveListPosition } from "@/lib/people/list-memory";
import { usePersonWrites } from "@/lib/queries/people";
import { NOTE_SEARCH_MIN, usePeopleList, usePeopleNoteSearch } from "@/lib/queries/people-index";
import { useActivities } from "@/lib/queries/taxonomy";
import type { NoteSearchHit } from "@/lib/queries/types";
import { cn } from "@/lib/utils";
import { DuplicateSuggestions } from "./DuplicateSuggestions";
import { PeopleVirtualList, type PeopleVirtualListHandle } from "./PeopleVirtualList";
import { compactAgo, PERSON_ROW_HEIGHT } from "./PersonRow";
import { SelectionBar } from "./SelectionBar";
import { NewPersonSheet } from "./PersonSheet";

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

/**
 * People: large title + counts, sticky search and facet pills (URL-synced), a virtualized list of
 * everyone matching, and — while searching — matching notes underneath.
 */
export function PeopleList() {
  const params = useSearchParams();
  const { filters, setFilters, clear } = usePeopleFilters();
  const [sort, setSort] = usePeopleSort();
  const list = usePeopleList(filters, sort);
  const { data: activities } = useActivities();
  const emojiById = useMemo(() => new Map((activities ?? []).flatMap((a) => (a.emoji ? [[a.id, a.emoji] as const] : []))), [activities]);
  const peopleById = useMemo(() => new Map(list.all.map((p) => [p.id, p])), [list.all]);

  // `?new=1` (from the tab bar / Today) opens the new-person sheet once, then leaves the URL.
  const wantsNew = params.get("new") === "1";
  const [newOpen, setNewOpen] = useState(wantsNew);
  const [sawNew, setSawNew] = useState(wantsNew);
  if (wantsNew !== sawNew) {
    setSawNew(wantsNew);
    if (wantsNew) setNewOpen(true);
  }
  useEffect(() => {
    if (wantsNew) replaceSearchParams((p) => p.delete("new"));
  }, [wantsNew]);

  const [followUp, setFollowUp] = useState<{ open: boolean; person: PeopleRow | null }>({ open: false, person: null });
  const openFollowUp = useCallback((person: PeopleRow) => setFollowUp({ open: true, person }), []);

  // Where you were (list-memory): read once per visit. The person you opened last stays tinted;
  // the scroll offset comes back only for the same list (same filters, search and sort).
  const href = `/people${params.toString() ? `?${params}` : ""}`;
  const [memory] = useState(() => (typeof window === "undefined" ? null : readListMemory()));
  // Compared with the router's URL, not window.location: after router.replace (removing someone)
  // this renders before the address bar changes.
  const [restore] = useState(() => (memory && sameListHref(memory.href, href) ? { scrollY: memory.scrollY, personId: memory.personId } : null));
  // Leaving the list any other way (tab bar, a note hit) keeps the spot too. Tracked while here and
  // saved on unmount in a layout cleanup, before the next page scrolls the window.
  const hrefRef = useRef(href);
  useEffect(() => {
    hrefRef.current = href;
  }, [href]);
  useLayoutEffect(() => {
    const mountedAt = Date.now();
    let y = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // Once the URL has moved on, the next page is scrolling the window: not our offset.
        if (window.location.pathname === "/people") y = window.scrollY;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      const m = readListMemory();
      const same = !!m && sameListHref(m.href, hrefRef.current);
      // A row opened during this visit saved its own snapshot (exact offset, who): it wins, however
      // long the profile took to open.
      if (same && m && m.at >= mountedAt) return;
      saveListPosition({ href: hrefRef.current, scrollY: y, personId: same ? m!.personId : null });
    };
  }, []);

  // Select mode: rows become checkboxes, a bar replaces the tab bar with "Delete".
  const writes = usePersonWrites();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const anchor = useRef<number | null>(null);
  const rowsRef = useRef<readonly PeopleRow[]>([]);
  useEffect(() => {
    rowsRef.current = list.rows;
  }, [list.rows]);
  const toggle = useCallback((p: PeopleRow, range: boolean) => {
    const rows = rowsRef.current;
    const index = rows.findIndex((r) => r.id === p.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const from = anchor.current;
      if (range && from !== null && index >= 0 && from < rows.length) {
        const on = !prev.has(p.id);
        for (let i = Math.min(from, index); i <= Math.max(from, index); i++) {
          if (on) next.add(rows[i]!.id);
          else next.delete(rows[i]!.id);
        }
      } else if (next.has(p.id)) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
    anchor.current = index;
  }, []);
  const exitSelect = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
    anchor.current = null;
  }, []);
  const chosen = useMemo(() => [...selected].filter((id) => peopleById.has(id)), [selected, peopleById]);
  const allShownSelected = list.rows.length > 0 && list.rows.every((r) => selected.has(r.id));
  const selectAll = useCallback(() => setSelected(new Set(rowsRef.current.map((r) => r.id))), []);

  useEffect(() => {
    if (!selecting) return;
    const root = document.documentElement;
    root.dataset.selecting = "";
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable=true], [role=dialog], [role=alertdialog]")) return;
      if (e.key === "Escape") exitSelect();
      else if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        selectAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      delete root.dataset.selecting;
      window.removeEventListener("keydown", onKey);
    };
  }, [selecting, exitSelect, selectAll]);

  const removeChosen = async () => {
    const ids = chosen;
    if (!ids.length) return;
    const label = ids.length === 1 ? peopleById.get(ids[0]!)!.displayName : plural(ids.length, "person", "people");
    const ok = await confirm({
      title: `Remove ${label}?`,
      message: "Their notes and follow-ups stay with them. Undo right after, or restore them anytime from Recently deleted.",
      confirmLabel: ids.length === 1 ? "Remove" : `Remove ${ids.length}`,
      destructive: true,
    });
    if (!ok) return;
    writes.removeMany(ids);
    exitSelect();
    toast.undo(`${label} removed`, () => void writes.restoreMany(ids).catch(() => {}), { description: "They’re in Recently deleted." });
  };

  // "/" focuses the search field (desktop habit).
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const listHandle = useRef<PeopleVirtualListHandle>(null);
  const total = list.all.length;
  const shown = list.rows.length;
  const searching = filters.q.trim().length >= NOTE_SEARCH_MIN;
  const alphaIndex = sort === "name" && !filters.q.trim() && shown > 40;
  const summary = list.isPending
    ? null
    : selecting
      ? `${chosen.length.toLocaleString("en")} selected`
      : list.filtered
        ? `${shown.toLocaleString("en")} of ${plural(total, "person", "people")}`
        : plural(total, "person", "people");

  return (
    <>
      <header className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-large-title text-fg">People</h1>
          <p className="mt-0.5 min-h-5 text-subhead text-fg-2 tabular-nums" aria-live="polite">
            {summary && (
              <>
                {summary}
                {!selecting && list.cityCount > 0 && <span className="text-fg-3"> · {plural(list.cityCount, "city", "cities")}</span>}
              </>
            )}
          </p>
        </div>
        {selecting ? (
          <div className="flex shrink-0 items-center gap-1 pb-1">
            <GlassButton variant="plain" onClick={allShownSelected ? () => setSelected(new Set()) : selectAll}>
              {allShownSelected ? "Deselect all" : list.filtered ? `Select all ${shown}` : "Select all"}
            </GlassButton>
            <GlassButton variant="soft" onClick={exitSelect}>
              Done
            </GlassButton>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2 pb-1">
            {total > 0 && (
              <GlassButton variant="glass" onClick={() => setSelecting(true)} aria-label="Select people" title="Select people to remove" className="max-sm:w-11 max-sm:px-0">
                <CheckCircle2 size={18} strokeWidth={2.2} aria-hidden />
                <span className="max-sm:hidden">Select</span>
              </GlassButton>
            )}
            <Link
              href={hrefWithFilters("/globe", filters)}
              aria-label="Show on globe"
              title="Show these people on the globe"
              className={cn(buttonVariants({ variant: "glass", size: "md" }), "max-sm:w-11 max-sm:px-0")}
            >
              <Globe2 size={18} strokeWidth={2.2} aria-hidden />
              <span className="max-sm:hidden">Show on globe</span>
            </Link>
            <GlassButton variant="primary" onClick={() => setNewOpen(true)} aria-label="New person" className="max-sm:w-11 max-sm:px-0">
              <Plus size={18} strokeWidth={2.6} aria-hidden />
              <span className="max-sm:hidden">New person</span>
            </GlassButton>
          </div>
        )}
      </header>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        people={list.all}
        sort={sort}
        onSortChange={setSort}
        searchRef={searchRef}
        searchPlaceholder="Search name, role, company, city"
      />

      <div className="mt-2">
        {list.isPending ? (
          <ListSkeleton />
        ) : list.isError && total === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="Couldn’t load your people"
            description="Check your connection and try again."
            action={
              <GlassButton variant="soft" onClick={() => list.refetch()}>
                Try again
              </GlassButton>
            }
          />
        ) : total === 0 ? (
          <EmptyState
            icon={<UserPlus />}
            title="Your network starts here"
            description="Add the first person you want to remember."
            action={
              <GlassButton variant="primary" onClick={() => setNewOpen(true)}>
                <Plus size={18} strokeWidth={2.6} aria-hidden /> Add a person
              </GlassButton>
            }
          />
        ) : shown === 0 ? (
          <EmptyState
            compact={searching}
            icon={<SearchX />}
            title={filters.q.trim() ? `No one matches “${filters.q.trim()}”` : "No one matches these filters"}
            description={activeFacetCount(filters) > 0 ? "Try removing a filter." : "Try a different spelling, or search notes below."}
            action={
              <GlassButton variant="soft" onClick={() => clear({ keepQuery: activeFacetCount(filters) > 0 })}>
                Clear {activeFacetCount(filters) > 0 ? "filters" : "search"}
              </GlassButton>
            }
          />
        ) : (
          <>
            {/* Always mounted, so the virtual list re-measures its offset when suggestions come and go. */}
            <div>{!list.filtered && <DuplicateSuggestions people={list.all} />}</div>
            <PeopleVirtualList
              people={list.rows}
              emojiById={emojiById}
              detail={sort === "followup" ? "followup" : "last"}
              onFollowUp={openFollowUp}
              stale={list.isStale}
              handleRef={listHandle}
              selecting={selecting}
              selectedIds={selected}
              onToggle={toggle}
              lastOpenedId={memory?.personId ?? null}
              restore={restore}
              // Room for the A–Z index along the right edge.
              className={alphaIndex ? "max-lg:mr-3.5" : undefined}
            />
            {alphaIndex && !selecting && <AlphaIndex rows={list.rows} onJump={(i) => listHandle.current?.scrollToIndex(i)} />}
          </>
        )}
      </div>

      {!selecting && !searching && !list.isPending && (
        <Link
          href="/people/deleted"
          transitionTypes={["nav-forward"]}
          className="pressable hit-44 mx-auto mt-6 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-footnote font-medium text-fg-3 hover:bg-fill-1 hover:text-fg-2"
        >
          <Trash2 size={14} strokeWidth={2.2} aria-hidden /> Recently deleted
          <ChevronRight size={14} strokeWidth={2.4} aria-hidden className="-mr-1 text-fg-4" />
        </Link>
      )}

      {selecting && (
        <SelectionBar
          count={chosen.length}
          label="people"
          actionLabel="Delete"
          actionIcon={<Trash2 size={17} strokeWidth={2.2} aria-hidden />}
          onAction={() => void removeChosen()}
          onCancel={exitSelect}
        />
      )}

      {searching && <NoteHits query={filters.q} peopleById={peopleById} />}

      <NewPersonSheet open={newOpen} onClose={() => setNewOpen(false)} />
      <FollowUpSheet
        open={followUp.open}
        onOpenChange={(open) => setFollowUp((f) => ({ ...f, open }))}
        personId={followUp.person?.id ?? ""}
        personName={followUp.person?.displayName ?? ""}
      />
    </>
  );
}

/* ---------- loading ---------- */

function ListSkeleton({ rows = 9 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading people" className="surface ui-skeleton-reveal overflow-hidden rounded-lg">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4" style={{ height: PERSON_ROW_HEIGHT }}>
          <Skeleton reveal={false} className="size-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton reveal={false} className="h-3.5 rounded-full" style={{ width: `${38 + ((i * 17) % 30)}%` }} />
            <Skeleton reveal={false} className="h-3 rounded-full" style={{ width: `${46 + ((i * 23) % 34)}%` }} />
          </div>
          <Skeleton reveal={false} className="h-3 w-8 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------- "In notes" ---------- */

const NOTES_COLLAPSED = 5;

function NoteHits({ query, peopleById }: { query: string; peopleById: ReadonlyMap<string, PeopleRow> }) {
  const search = usePeopleNoteSearch(query);
  const [expanded, setExpanded] = useState(false);
  const hits = search.hits;
  const shown = expanded ? hits : hits.slice(0, NOTES_COLLAPSED);
  const loadingFirst = search.isUpdating && hits.length === 0;

  return (
    <section aria-labelledby="people-note-hits" className="mt-7 space-y-1.5">
      <div className="flex min-h-5 items-center justify-between gap-3 px-4">
        <h2 id="people-note-hits" className="text-footnote font-medium tracking-[0.02em] text-fg-3 uppercase">
          In notes
        </h2>
        {search.isUpdating && <Spinner size={14} className="text-fg-3" />}
      </div>
      {loadingFirst ? (
        <div className="surface overflow-hidden rounded-lg">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 px-4 py-3">
              <Skeleton className="h-3.5 w-2/5 rounded-full" />
              <Skeleton className="h-3 w-4/5 rounded-full" />
            </div>
          ))}
        </div>
      ) : search.isError && hits.length === 0 ? (
        <p className="px-4 text-subhead text-fg-3">Note search is unavailable offline.</p>
      ) : hits.length === 0 ? (
        !search.isUpdating && <p className="px-4 text-subhead text-fg-3">No notes mention “{search.query}”.</p>
      ) : (
        <>
          <ul className={cn("surface overflow-hidden rounded-lg transition-opacity duration-200", search.isUpdating && "opacity-70")}>
            {shown.map((hit) => (
              <li key={hit.id} className="group/item">
                <NoteHitRow hit={hit} avatarUrl={peopleById.get(hit.personId)?.avatarUrl ?? null} />
              </li>
            ))}
          </ul>
          {hits.length > NOTES_COLLAPSED && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="pressable hit-44 ml-2 h-8 rounded-full px-2 text-footnote font-medium text-accent-text hover:bg-accent-soft"
            >
              {expanded ? "Show fewer" : `Show all ${hits.length} notes`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function NoteHitRow({ hit, avatarUrl }: { hit: NoteSearchHit; avatarUrl: string | null }) {
  return (
    <Link
      href={`/people/${hit.personId}/notes/${hit.id}`}
      transitionTypes={["nav-forward"]}
      className={cn(
        "relative flex gap-3 px-4 py-3 outline-none transition-colors duration-150 active:bg-fill-2 focus-visible:bg-fill-1 [@media(hover:hover)]:hover:bg-fill-1",
        "after:absolute after:right-0 after:bottom-0 after:left-[60px] after:h-[0.5px] after:bg-separator group-last/item:after:hidden",
      )}
    >
      <Avatar name={hit.personName} src={avatarUrl} size={32} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-subhead">
            <span className="font-semibold text-fg">{hit.personName}</span>
            {hit.title && <span className="text-fg-2"> · {hit.title}</span>}
          </span>
          <RelativeTime date={hit.occurredAt} format={compactAgo} className="shrink-0 text-footnote text-fg-3 tabular-nums" />
        </span>
        <span className="mt-0.5 line-clamp-2 text-footnote text-fg-2">
          <Highlighted text={hit.snippet} />
        </span>
      </span>
    </Link>
  );
}

/** Renders `**match**` fragments from the search snippet as <mark>. */
function Highlighted({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-accent-soft font-semibold text-fg [box-decoration-break:clone]">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/* ---------- A–Z index (phones, name sort) ---------- */

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

function AlphaIndex({ rows, onJump }: { rows: readonly PeopleRow[]; onJump: (index: number) => void }) {
  const firstIndex = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((p, i) => {
      const l = indexLetter(p.displayName);
      if (!m.has(l)) m.set(l, i);
    });
    return m;
  }, [rows]);
  const [active, setActive] = useState<string | null>(null);
  const last = useRef<string | null>(null);

  const jumpAt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.min(LETTERS.length - 1, Math.max(0, Math.floor(((e.clientY - box.top) / box.height) * LETTERS.length)));
    const letter = LETTERS[i]!;
    if (letter === last.current) return;
    last.current = letter;
    setActive(letter);
    // Letters without people jump to the next one that has some.
    const target = LETTERS.slice(i).find((l) => firstIndex.has(l)) ?? [...LETTERS.slice(0, i)].reverse().find((l) => firstIndex.has(l));
    if (target) onJump(firstIndex.get(target)!);
  };
  const end = () => {
    last.current = null;
    setActive(null);
  };

  return (
    <>
      <div
        aria-hidden
        className="fixed top-1/2 right-0.5 z-20 flex -translate-y-1/2 touch-none flex-col items-center py-1 select-none lg:hidden"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          jumpAt(e);
        }}
        onPointerMove={(e) => e.buttons > 0 && jumpAt(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {LETTERS.map((l) => (
          <span key={l} className={cn("grid h-3.5 w-6 place-items-center text-caption2 font-semibold", firstIndex.has(l) ? "text-accent-text" : "text-fg-4")}>
            {l}
          </span>
        ))}
      </div>
      {active && (
        <div aria-hidden className="glass-thick pointer-events-none fixed top-1/2 left-1/2 z-40 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg text-large-title text-fg lg:hidden">
          {active}
        </div>
      )}
    </>
  );
}
