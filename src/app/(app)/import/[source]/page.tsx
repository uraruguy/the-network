import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ReviewScreen } from "@/components/import/review/ReviewScreen";
import { sourceLabel } from "@/components/import/review/text";
import { isUuid } from "@/lib/utils";

const SOURCE = /^[a-z0-9-]{1,40}$/;

/**
 * No owner data in this render (a client shell): each path is rendered once and cached (ISR)
 * instead of on every navigation. The proxy still gates every request.
 */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/import/[source]">) {
  const { source } = await params;
  return { title: SOURCE.test(source) && !isUuid(source) ? `Review · ${sourceLabel(source)}` : "Import" };
}

/** Review screen for one import source; old /import/<jobId> links land on Apple Notes. */
export default async function ImportSourcePage({ params }: PageProps<"/import/[source]">) {
  const { source } = await params;
  if (isUuid(source)) redirect("/import/apple-notes");
  if (!SOURCE.test(source)) notFound();
  return (
    <Suspense>
      <ReviewScreen source={source} />
    </Suspense>
  );
}
