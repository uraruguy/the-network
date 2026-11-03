import { z } from "zod";
import { parseBody, withOwner } from "@/lib/api-server";
import { deletePeople, restorePeople } from "@/lib/data/people";
import { BULK_MAX } from "@/lib/people/bulk";

const bulk = z.object({
  action: z.enum(["delete", "restore"]),
  ids: z.array(z.string().uuid()).min(1).max(BULK_MAX),
});

/**
 * POST { action: "delete" | "restore", ids } → { action, ids }: soft-deletes (or restores) several
 * people in one statement. Returns the ids that changed; replays and unknown ids are no-ops, so a
 * queued offline request can safely run twice.
 */
export const POST = withOwner(async ({ ownerId, req }) => {
  const { action, ids } = await parseBody(req, bulk);
  const unique = [...new Set(ids)];
  return { action, ids: action === "delete" ? await deletePeople(ownerId, unique) : await restorePeople(ownerId, unique) };
});
