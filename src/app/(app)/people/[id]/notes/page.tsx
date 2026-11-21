import { notFound } from "next/navigation";
import { PersonNotesPage } from "@/components/notes/PersonNotesPage";
import { isUuid } from "@/lib/utils";

/**
 * No owner data in this render (a client shell): each id is rendered once and cached (ISR)
 * instead of on every navigation. The proxy still gates every request; paths that can't be an id
 * are a 404 before anything is cached.
 */
export function generateStaticParams() {
  return [];
}

/** All of one person's notes (the same section the person page shows, on its own). */
export default async function Page({ params }: PageProps<"/people/[id]/notes">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <PersonNotesPage personId={id} />;
}
