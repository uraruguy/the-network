"use client";
import { ArchiveRestore, Check, CheckCircle2, ChevronLeft, ChevronRight, Merge, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Avatar } from "@/components/glass/Avatar";
import { GlassButton } from "@/components/glass/GlassButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/SearchField";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { useNow } from "@/lib/clock";
import type { DeletedPerson } from "@/lib/data/people";
import { formatRelative } from "@/lib/format";
import { listReturnHref } from "@/lib/people/list-memory";
import { useDeletedPeople, usePersonWrites } from "@/lib/queries/people";
import { fold } from "@/lib/text";
import { cn } from "@/lib/utils";
import { SelectionBar } from "./SelectionBar";

const noSubscribe = () => () => {};

/** Search shows up once the list is long enough to need it. */
const SEARCH_FROM = 12;

/**
 * Recently deleted: everyone removed from the network, newest first, with their notes and
 * follow-ups intact. Restore one (the row's button) or many (Select). Nothing here expires.
 * Merged duplicates are listed for transparency but point to the person they went into.
 */
export function DeletedPeople() {
  const router = useRouter();
  const now = useNow();
  const deleted = useDeletedPeople();
  const writes = usePersonWrites();
  // The list you came from (its filters); "/people" on the server, read after hydration.
  const backHref = useSyncExternalStore(noSubscribe, listReturnHref, () => "/people");
  const [q, setQ] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());

  const all = useMemo(() => deleted.data ?? [], [deleted.data]);
  const rows = useMemo(() => {
    const needle = fold(q.trim());
    return needle ? all.filter((p) => fold([p.displayName, p.headline, p.company].filter(Boolean).join(" ")).includes(needle)) : all;
  }, [all, q]);
  const restorable = useMemo(() => rows.filter((p) => !p.mergedInto), [rows]);
  const chosen = useMemo(() => all.filter((p) => selected.has(p.id) && !p.mergedInto).map((p) => p.id), [all, selected]);

  const exitSelect = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  useEffect(() => {
    if (!selecting) return;
    const root = document.documentElement;
    root.dataset.selecting = "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !(e.target as HTMLElement | null)?.closest("input, [role=dialog], [role=alertdialog]") && exitSelect();
    window.addEventListener("keydown", onKey);
    return () => {
      delete root.dataset.selecting;
      window.removeEventListener("keydown", onKey);
    };
  }, [selecting, exitSelect]);

  const restoreOne = async (p: DeletedPerson) => {
    setBusy((b) => new Set(b).add(p.id));
    try {
      await writes.restore(p.id);
      toast({ title: `${p.displayName} restored`, action: { label: "Open", onClick: () => router.push(`/people/${p.id}`) } });
    } catch {
      setBusy((b) => {
        const next = new Set(b);
        next.delete(p.id);
        return next;
      });
    }
  };

  const restoreChosen = async () => {
    const ids = chosen;
    if (!ids.length) return;
    exitSelect();
    try {
      const back = await writes.restoreMany(ids);
      const n = back.length || ids.length;
      toast({ title: n === 1 ? `${all.find((p) => p.id === ids[0])?.displayName ?? "1 person"} restored` : `${n.toLocaleString("en")} people restored` });
    } catch {
      // The mutation's own toast explains the failure.
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = restorable.length > 0 && restorable.every((p) => selected.has(p.id));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 flex h-11 items-center justify-between">
        <Link
          href={backHref}
          transitionTypes={["nav-back"]}
          className="pressable -ml-1 inline-flex h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-body text-accent-text hover:bg-accent-soft"
        >
          <ChevronLeft size={24} strokeWidth={2.4} aria-hidden />
          People
        </Link>
        {restorable.length > 0 &&
          (selecting ? (
            <div className="flex items-center gap-1">
              <GlassButton variant="plain" onClick={() => setSelected(allSelected ? new Set() : new Set(restorable.map((p) => p.id)))}>
                {allSelected ? "Deselect all" : "Select all"}
              </GlassButton>
              <GlassButton variant="soft" onClick={exitSelect}>
                Done
              </GlassButton>
            </div>
          ) : (
            <GlassButton variant="plain" onClick={() => setSelecting(true)}>
              <CheckCircle2 size={18} strokeWidth={2.2} aria-hidden /> Select
            </GlassButton>
          ))}
      </div>

      <header className="mb-4">
        <h1 className="text-large-title text-fg">Recently deleted</h1>
        <p className="mt-1 text-subhead text-balance text-fg-2">
          People you remove stay here with their notes and follow-ups. Restore anyone, anytime: nothing is erased.
        </p>
      </header>

      {all.length >= SEARCH_FROM && <SearchField value={q} onChange={setQ} placeholder="Search deleted people" className="mb-3" />}

      {deleted.isPending ? (
        <div className="surface overflow-hidden rounded-lg" role="status" aria-label="Loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/5 rounded-full" />
                <Skeleton className="h-3 w-3/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : deleted.isError && !all.length ? (
        <EmptyState
          icon={<SearchX />}
          title="Couldn’t load deleted people"
          description="Check your connection and try again."
          action={
            <GlassButton variant="soft" onClick={() => deleted.refetch()}>
              Try again
            </GlassButton>
          }
        />
      ) : !all.length ? (
        <EmptyState icon={<Trash2 />} title="Nothing deleted" description="People you remove land here, with their notes and follow-ups, so you can bring them back anytime." />
      ) : !rows.length ? (
        <EmptyState compact icon={<SearchX />} title={`No one matches “${q.trim()}”`} />
      ) : (
        <ul aria-label="Recently deleted people" className="surface overflow-hidden rounded-lg">
          {rows.map((p) => (
            <li key={p.id} className="group/item">
              <DeletedRow
                p={p}
                now={now}
                selecting={selecting}
                selected={selected.has(p.id)}
                busy={busy.has(p.id)}
                onToggle={() => toggle(p.id)}
                onRestore={() => void restoreOne(p)}
                onOpenMerged={(id) => router.push(`/people/${id}`)}
              />
            </li>
          ))}
        </ul>
      )}

      {selecting && (
        <SelectionBar
          count={chosen.length}
          label="people"
          actionLabel="Restore"
          actionIcon={<ArchiveRestore size={17} strokeWidth={2.2} aria-hidden />}
          variant="primary"
          onAction={() => void restoreChosen()}
          onCancel={exitSelect}
        />
      )}
    </div>
  );
}

function DeletedRow({
  p,
  now,
  selecting,
  selected,
  busy,
  onToggle,
  onRestore,
  onOpenMerged,
}: {
  p: DeletedPerson;
  now: number;
  selecting: boolean;
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onOpenMerged: (id: string) => void;
}) {
  const role = [p.headline, p.company].filter(Boolean).join(", ");
  const sub = p.mergedInto
    ? `Merged into ${p.mergedInto.displayName}`
    : [`Removed ${formatRelative(p.deletedAt, now)}`, p.notesCount ? `${p.notesCount} ${p.notesCount === 1 ? "note" : "notes"}` : null, role || null].filter(Boolean).join(" · ");
  const rowClass = cn(
    "relative flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left",
    "after:absolute after:right-0 after:bottom-0 after:left-[68px] after:h-[0.5px] after:bg-separator group-last/item:after:hidden",
  );
  const body = (
    <>
      <Avatar name={p.displayName} src={p.avatarUrl} size={40} className={cn("shrink-0", !selected && "opacity-75 grayscale-[35%]")} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-headline text-fg">{p.displayName}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-footnote text-fg-2">
          {p.mergedInto && <Merge size={13} strokeWidth={2.2} aria-hidden className="shrink-0 text-fg-3" />}
          <span className="truncate">{sub}</span>
        </span>
      </span>
    </>
  );

  if (selecting && !p.mergedInto) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={p.displayName}
        onClick={onToggle}
        className={cn(rowClass, "pressable transition-colors duration-150", selected ? "bg-accent-soft" : "[@media(hover:hover)]:hover:bg-fill-1")}
      >
        <span
          aria-hidden
          className={cn(
            "grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150",
            selected ? "border-transparent bg-accent-fill text-accent-fg" : "border-fg-4 bg-surface",
          )}
        >
          {selected && <Check size={14} strokeWidth={3} />}
        </span>
        {body}
      </button>
    );
  }

  return (
    <div className={rowClass}>
      {body}
      {p.mergedInto ? (
        <button
          type="button"
          onClick={() => onOpenMerged(p.mergedInto!.id)}
          aria-label={`Open ${p.mergedInto.displayName}`}
          className="pressable hit-44 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-fg-3 hover:bg-fill-1"
        >
          <ChevronRight size={18} strokeWidth={2.4} aria-hidden />
        </button>
      ) : (
        !selecting && (
          <GlassButton variant="soft" size="sm" onClick={onRestore} disabled={busy} aria-label={`Restore ${p.displayName}`}>
            Restore
          </GlassButton>
        )
      )}
    </div>
  );
}
