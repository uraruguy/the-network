// @vitest-environment happy-dom
import { act, createElement, lazy, Suspense, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Mounted } from "./mounted";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("fires once, after the lazy sibling in its Suspense boundary has mounted", async () => {
  let resolve!: (m: { default: ComponentType }) => void;
  const Sheet = lazy(() => new Promise<{ default: ComponentType }>((r) => (resolve = r)));
  const onMount = vi.fn();
  const host = document.createElement("div");
  const root = createRoot(host);
  const render = () => root.render(createElement(Suspense, { fallback: null }, createElement(Sheet), createElement(Mounted, { onMount })));

  act(render);
  expect(onMount).not.toHaveBeenCalled();

  await act(async () => resolve({ default: () => createElement("p", null, "sheet") }));
  expect(host.textContent).toBe("sheet");
  expect(onMount).toHaveBeenCalledTimes(1);

  act(render);
  expect(onMount).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});
