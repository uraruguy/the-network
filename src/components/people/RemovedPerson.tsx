"use client";
import { ArchiveRestore, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassButton } from "@/components/glass/GlassButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { useNow } from "@/lib/clock";
import type { DeletedPerson } from "@/lib/data/people";
import { formatRelative } from "@/lib/format";
import { useDeletedPeople, usePersonWrites } from "@/lib/queries/people";

/**
 * A profile link to someone who isn't in the network any more. When they're in Recently deleted,
 * say when they were removed and offer Restore right here (a note link, an old tab, a bookmark);
 * a merged duplicate points to the person it went into.
 */
export function RemovedPerson({ id, onRestored, onAll }: { id: string; onRestored: () => void; onAll: () => void }) {
  const router = useRouter();
  const deleted = useDeletedPeople();
  const writes = usePersonWrites();
  const now = useNow();
  // Restoring drops them from Recently deleted at once; keep this card up until the profile is back.
  const [restoring, setRestoring] = useState<DeletedPerson | null>(null);
  const removed = restoring ?? deleted.data?.find((p) => p.id === id);

  const restore = async () => {
    if (!removed) return;
    setRestoring(removed);
    try {
      await writes.restore(id);
      toast({ title: `${removed.displayName} restored` });
      onRestored();
    } catch {
      setRestoring(null);
    }
  };

  if (removed && !removed.mergedInto) {
    return (
      <EmptyState
        icon={<ArchiveRestore />}
        title={`${removed.displayName} was removed`}
        description={`Removed ${formatRelative(removed.deletedAt, now)}. ${removed.notesCount ? `Their ${removed.notesCount === 1 ? "note" : `${removed.notesCount} notes`} and follow-ups come back with them.` : "Their follow-ups come back with them."}`}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <GlassButton variant="primary" onClick={() => void restore()} disabled={!!restoring}>
              <ArchiveRestore size={17} strokeWidth={2.2} aria-hidden /> Restore
            </GlassButton>
            <GlassButton variant="soft" onClick={onAll}>
              All people
            </GlassButton>
          </div>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<UserRound />}
      title="Not in your Network"
      description={removed?.mergedInto ? `This card was merged into ${removed.mergedInto.displayName}.` : "This person was removed, or the link is wrong."}
      action={
        removed?.mergedInto ? (
          <GlassButton variant="soft" onClick={() => router.push(`/people/${removed.mergedInto!.id}`)}>
            Open {removed.mergedInto.displayName}
          </GlassButton>
        ) : (
          <GlassButton variant="soft" onClick={onAll}>
            All people
          </GlassButton>
        )
      }
    />
  );
}
