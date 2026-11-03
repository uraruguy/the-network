import { withOwner } from "@/lib/api-server";
import { listDeletedPeople } from "@/lib/data/people";

/** GET → DeletedPerson[]: Recently deleted, newest first (merged duplicates say where they went). */
export const GET = withOwner(async ({ ownerId }) => listDeletedPeople(ownerId));
