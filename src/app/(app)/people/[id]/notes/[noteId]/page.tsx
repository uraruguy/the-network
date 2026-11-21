import { notFound } from "next/navigation";
import { NotePage } from "@/components/notes/NotePage";
import { isUuid } from "@/lib/utils";

/**
 * No owner data in this render (a client shell): each id is rendered once and cached (ISR)
 * instead of on every navigation. The proxy still gates every request; paths that can't be an id
 * are a 404 before anything is cached.
 */
export function generateStaticParams() {
  return [];
}

export default async function Page({ params }: PageProps<"/people/[id]/notes/[noteId]">) {
  const { id, noteId } = await params;
  if (!isUuid(id) || !isUuid(noteId)) notFound();
  // Keyed by note: each note gets fresh editor + autosave state.
  return <NotePage key={noteId} personId={id} noteId={noteId} />;
}
