import { PersonNotesPage } from "@/components/notes/PersonNotesPage";

/**
 * No owner data in this render (a client shell): each id is rendered once and cached (ISR)
 * instead of on every navigation. The proxy still gates every request.
 */
export function generateStaticParams() {
  return [];
}

/** All of one person's notes (the same section the person page shows, on its own). */
export default async function Page({ params }: PageProps<"/people/[id]/notes">) {
  const { id } = await params;
  return <PersonNotesPage personId={id} />;
}
