import { Suspense } from "react";
import { PersonDetail } from "@/components/people/PersonDetail";

export const metadata = { title: "Person" };

/**
 * No owner data in this render (a client shell): each id is rendered once and cached (ISR)
 * instead of on every navigation. The proxy still gates every request.
 */
export function generateStaticParams() {
  return [];
}

/**
 * Client-rendered on purpose: the profile reads the offline cache first (instant, works without a
 * network) and the API re-verifies the session. `useSearchParams` (?reminder=1) needs Suspense.
 */
export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <PersonDetail key={id} id={id} />
    </Suspense>
  );
}
