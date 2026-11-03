// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReorderList } from "./ReorderList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Item = { id: string; name: string };
const ITEMS: Item[] = [
  { id: "a", name: "Football" },
  { id: "b", name: "Climbing" },
  { id: "c", name: "Chess" },
];

let root: Root;
let host: HTMLElement;

function render(onReorder: (ids: string[]) => unknown) {
  act(() =>
    root.render(
      createElement(ReorderList<Item>, {
        items: ITEMS,
        getId: (i) => i.id,
        getLabel: (i) => i.name,
        onReorder,
        renderItem: (i, { handle }) => createElement("div", null, handle, i.name),
        "aria-label": "Activities",
      }),
    ),
  );
}

function key(el: Element, k: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("ReorderList", () => {
  it("keeps the handle as the only keyboard stop: rows are not focusable", () => {
    render(vi.fn());
    const rows = host.querySelectorAll("li");
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.hasAttribute("tabindex")).toBe(false);
  });

  it("moves a row one place per arrow key on its handle and commits the new order", () => {
    const onReorder = vi.fn();
    render(onReorder);
    key(host.querySelector('button[aria-label="Reorder Football"]')!, "ArrowDown");
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(["b", "a", "c"]);
  });
});
