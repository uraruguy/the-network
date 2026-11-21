import { NotePage } from "@/components/notes/NotePage";

/**
 * No owner data in this render (a client shell): each id is rendered once and cached (ISR)
 * instead of on every navigation. The proxy still gates every request.
 */
export function generateStaticParams() {
  return [];
}

export default async function Page({ params }: PageProps<"/people/[id]/notes/[noteId]">) {
  const { id, noteId } = await params;
  // Keyed by note: each note gets fresh editor + autosave state.
  return <NotePage key={noteId} personId={id} noteId={noteId} />;
}
