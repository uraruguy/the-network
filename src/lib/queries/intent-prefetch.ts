"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { prefetchNote } from "./notes";
import { prefetchPerson } from "./people";

/**
 * People and note routes are dynamic, so a default prefetch stops at their loading.tsx skeleton
 * and the navigation would commit that skeleton (no avatar to morph into). Prefetch the page
 * itself: a tiny payload, the page renders from the query cache.
 */
const FULL_PREFETCH = { kind: "full" as PrefetchKind };

/**
 * Link handlers that prefetch on intent rather than on visibility — a fast scroll through 1,000
 * rows shouldn't fire 1,000 prefetches. Pointing at or touching a link prefetches the page (cheap,
 * cached by the router); focusing or tapping it also starts the data the page waits for (a person
 * link's detail, a note link's note), in parallel with the push transition instead of after it.
 * Not on touch: on a phone every scroll gesture starts with one.
 */
export function useIntentPrefetch(href: string, target: { personId?: string; noteId?: string } = {}) {
  const router = useRouter();
  const qc = useQueryClient();
  const page = () => router.prefetch(href, FULL_PREFETCH);
  const data = () => {
    page();
    if (target.noteId) prefetchNote(qc, target.noteId);
    else if (target.personId) prefetchPerson(qc, target.personId);
  };
  return { onPointerEnter: page, onTouchStart: page, onFocus: data, onClick: data };
}
