// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { listenPinch, lockPageZoom, pinchFactor, pinchZoom, zoomAroundCenter } from "./gestures";

/** Safari's GestureEvent isn't in other engines: a cancelable Event with its fields is the same to the handlers. */
function gesture(type: string, fields: { scale?: number; clientX?: number; clientY?: number } = {}) {
  return Object.assign(new Event(type, { bubbles: true, cancelable: true }), { scale: 1, clientX: 0, clientY: 0, ...fields });
}

describe("pinch maths", () => {
  it("maps a pinch scale to zoom levels (log2) within bounds", () => {
    expect(pinchZoom(3, 2, 0, 18)).toBe(4);
    expect(pinchZoom(3, 0.5, 0, 18)).toBe(2);
    expect(pinchZoom(17.5, 8, 0, 18)).toBe(18);
    expect(pinchZoom(0.5, 0.25, 0, 18)).toBe(0);
    expect(pinchZoom(3, 0, 0, 18)).toBe(3);
    expect(pinchZoom(3, Number.NaN, 0, 18)).toBe(3);
  });

  it("scales linear zoom factors within bounds", () => {
    expect(pinchFactor(2, 1.5, 0.3, 6)).toBe(3);
    expect(pinchFactor(2, 10, 0.3, 6)).toBe(6);
    expect(pinchFactor(1, 0.1, 0.3, 6)).toBe(0.3);
    expect(pinchFactor(2, -1, 0.3, 6)).toBe(2);
  });

  it("keeps the point under the fingers in place", () => {
    // Zooming 1 → 2 around (10, 0) with the view centred on (0, 0): the centre moves halfway there.
    expect(zoomAroundCenter({ x: 0, y: 0 }, { x: 10, y: 0 }, 1, 2)).toEqual({ x: 5, y: 0 });
    // Zooming around the centre itself doesn't move it.
    expect(zoomAroundCenter({ x: 4, y: 7 }, { x: 4, y: 7 }, 1, 3)).toEqual({ x: 4, y: 7 });
  });
});

describe("listenPinch", () => {
  let stop: (() => void) | undefined;
  afterEach(() => stop?.());

  it("reports a trackpad pinch and keeps it from zooming the page", () => {
    const el = document.createElement("div");
    const onStart = vi.fn();
    const onChange = vi.fn();
    const onEnd = vi.fn();
    stop = listenPinch(el, { onStart, onChange, onEnd });

    const start = gesture("gesturestart");
    el.dispatchEvent(start);
    const change = gesture("gesturechange", { scale: 1.5, clientX: 40, clientY: 60 });
    el.dispatchEvent(change);
    const end = gesture("gestureend");
    el.dispatchEvent(end);

    expect(onStart).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ scale: 1.5, clientX: 40, clientY: 60 });
    expect(onEnd).toHaveBeenCalledOnce();
    expect([start, change, end].every((e) => e.defaultPrevented)).toBe(true);
  });

  it("leaves touch pinches to the canvas library", () => {
    const el = document.createElement("div");
    const onChange = vi.fn();
    stop = listenPinch(el, { onChange });
    const touch = Object.assign(new Event("touchstart"), { touches: [{}, {}] });
    el.dispatchEvent(touch);
    el.dispatchEvent(gesture("gesturestart"));
    const change = gesture("gesturechange", { scale: 2 });
    el.dispatchEvent(change);
    expect(onChange).not.toHaveBeenCalled();
    expect(change.defaultPrevented).toBe(true);
  });

  it("stays out of the way when the pinch also arrives as ctrl+wheel", () => {
    const el = document.createElement("div");
    const onChange = vi.fn();
    stop = listenPinch(el, { onChange });
    el.dispatchEvent(Object.assign(new Event("wheel"), { ctrlKey: true }));
    el.dispatchEvent(gesture("gesturestart"));
    el.dispatchEvent(gesture("gesturechange", { scale: 2 }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stops listening when disposed", () => {
    const el = document.createElement("div");
    const onChange = vi.fn();
    listenPinch(el, { onChange })();
    el.dispatchEvent(gesture("gesturestart"));
    el.dispatchEvent(gesture("gesturechange", { scale: 2 }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("lockPageZoom", () => {
  it("cancels page pinches and ctrl+wheel, but not plain scrolling, until released", () => {
    const release = lockPageZoom(document);
    const pinch = gesture("gesturestart");
    document.body.dispatchEvent(pinch);
    const ctrlWheel = Object.assign(new Event("wheel", { bubbles: true, cancelable: true }), { ctrlKey: true });
    document.body.dispatchEvent(ctrlWheel);
    const scroll = Object.assign(new Event("wheel", { bubbles: true, cancelable: true }), { ctrlKey: false });
    document.body.dispatchEvent(scroll);
    expect(pinch.defaultPrevented).toBe(true);
    expect(ctrlWheel.defaultPrevented).toBe(true);
    expect(scroll.defaultPrevented).toBe(false);

    release();
    const after = gesture("gesturestart");
    document.body.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});
