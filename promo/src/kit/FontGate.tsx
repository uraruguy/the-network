import { useEffect, useState, type ReactNode } from "react";
import { continueRender, delayRender } from "remotion";

const FACES = [
  '400 20px "Inter Variable"',
  '600 20px "Inter Variable"',
  '700 80px "Inter Variable"',
  '500 20px "JetBrains Mono Variable"',
];

/** Holds the first frame until the bundled fonts are decoded, so no frame renders in a fallback face. */
export function FontGate({ children }: { children: ReactNode }) {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(FACES.map((f) => document.fonts.load(f)))
      .then(() => document.fonts.ready)
      .finally(() => continueRender(handle));
  }, [handle]);
  return <>{children}</>;
}
