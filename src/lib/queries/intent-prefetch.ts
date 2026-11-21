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
 * Link handlers that prefetch on intent (pointer over, focus, touch start) rather than on
 * visibility — a fast scroll through 1,000 rows shouldn't fire 1,000 prefetches. Besides the page,
 * the data it waits for is warmed: a person link's detail, a note link's note (`personId` is then
 * its person, for the same draft fallback as the page).
 */
export function useIntentPrefetch(href: string, target: { personId?: string; noteId?: string } = {}) {
  const router = useRouter();
  const qc = useQueryClient();
  const prefetch = () => {
    router.prefetch(href, FULL_PREFETCH);
    if (target.noteId) prefetchNote(qc, target.noteId, target.personId);
    else if (target.personId) prefetchPerson(qc, target.personId);
  };
  return { onPointerEnter: prefetch, onFocus: prefetch, onTouchStart: prefetch };
}
