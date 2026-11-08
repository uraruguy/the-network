"use client";
/**
 * Pinch-to-zoom for the canvases (globe, graph) without the browser zooming the page.
 *
 * Chrome and Firefox report a trackpad pinch as `wheel` events with `ctrlKey`, which MapLibre and
 * d3-zoom already turn into zoom. Safari reports it as its own GestureEvents (gesturestart /
 * gesturechange / gestureend, carrying a cumulative `scale`) and, unless they are cancelled,
 * magnifies the whole page instead: the app chrome slides off screen and every layer is redrawn at
 * that scale, which on a large display can cost the map its graphics context.
 */
import { useEffect, useEffectEvent } from "react";

/**
 * Root classes for a full-screen canvas page (globe, graph): drags never select the labels around
 * the canvas, while text fields stay selectable.
 */
export const CANVAS_PAGE = "select-none [&_input]:select-text [&_textarea]:select-text";

export type Pinch = { scale: number; clientX: number; clientY: number };
export type PinchHandlers = { onStart?: () => void; onChange: (p: Pinch) => void; onEnd?: () => void };

/**
 * A ctrl+wheel this recent means the browser also reports the pinch as wheel events, which the
 * canvas library already handles: zooming on the gesture too would double it.
 */
const WHEEL_OVERLAP_MS = 250;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const validScale = (scale: number) => Number.isFinite(scale) && scale > 0;

/** Map zoom levels are log2 of the scale: pinching out to 2× is one level in. */
export function pinchZoom(startZoom: number, scale: number, min: number, max: number): number {
  return validScale(scale) ? clamp(startZoom + Math.log2(scale), min, max) : startZoom;
}

/** Linear zoom factors (the graph): the factor follows the fingers. */
export function pinchFactor(start: number, scale: number, min: number, max: number): number {
  return validScale(scale) ? clamp(start * scale, min, max) : start;
}

type XY = { x: number; y: number };

/**
 * The view centre after zooming from `k0` to `k1` so the content under the fingers stays put
 * (centre and point in content coordinates).
 */
export function zoomAroundCenter(center: XY, point: XY, k0: number, k1: number): XY {
  const r = k0 / k1;
  return { x: point.x + (center.x - point.x) * r, y: point.y + (center.y - point.y) * r };
}

type GestureLike = Event & Partial<Pinch>;

/**
 * Turns Safari's trackpad pinches on `el` into `handlers` calls and keeps them from zooming the
 * page. Touch pinches stay with the canvas library: iOS sends GestureEvents alongside the touches.
 */
export function listenPinch(el: HTMLElement, handlers: PinchHandlers): () => void {
  let touches = 0;
  let lastCtrlWheel = -Infinity;
  let active = false;
  const onTouch = (e: TouchEvent) => {
    touches = e.touches.length;
  };
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) lastCtrlWheel = performance.now();
  };
  const ours = () => touches === 0 && performance.now() - lastCtrlWheel > WHEEL_OVERLAP_MS;
  const start = (e: Event) => {
    e.preventDefault();
    active = ours();
    if (active) handlers.onStart?.();
  };
  const change = (e: GestureLike) => {
    e.preventDefault();
    if (!active || !ours()) return;
    handlers.onChange({ scale: e.scale ?? 1, clientX: e.clientX ?? 0, clientY: e.clientY ?? 0 });
  };
  const end = (e: Event) => {
    e.preventDefault();
    if (!active) return;
    active = false;
    handlers.onEnd?.();
  };
  const passive = { capture: true, passive: true } as const;
  el.addEventListener("touchstart", onTouch, passive);
  el.addEventListener("touchend", onTouch, passive);
  el.addEventListener("touchcancel", onTouch, passive);
  el.addEventListener("wheel", onWheel, passive);
  el.addEventListener("gesturestart", start);
  el.addEventListener("gesturechange", change);
  el.addEventListener("gestureend", end);
  return () => {
    el.removeEventListener("touchstart", onTouch, passive);
    el.removeEventListener("touchend", onTouch, passive);
    el.removeEventListener("touchcancel", onTouch, passive);
    el.removeEventListener("wheel", onWheel, passive);
    el.removeEventListener("gesturestart", start);
    el.removeEventListener("gesturechange", change);
    el.removeEventListener("gestureend", end);
  };
}

/**
 * While locked, no pinch (Safari GestureEvents, or ctrl+wheel elsewhere) zooms the page itself:
 * on a full-screen canvas page the gesture means "zoom the canvas", never "magnify the app".
 */
export function lockPageZoom(target: Document): () => void {
  const prevent = (e: Event) => e.preventDefault();
  const wheel = (e: WheelEvent) => {
    if (e.ctrlKey) e.preventDefault();
  };
  target.addEventListener("gesturestart", prevent);
  target.addEventListener("gesturechange", prevent);
  target.addEventListener("wheel", wheel, { passive: false });
  return () => {
    target.removeEventListener("gesturestart", prevent);
    target.removeEventListener("gesturechange", prevent);
    target.removeEventListener("wheel", wheel);
  };
}

/** `lockPageZoom` for as long as the component is mounted. */
export function usePageZoomLock() {
  useEffect(() => lockPageZoom(document), []);
}

/** `listenPinch` on `el` (once it exists), with handlers that always see the latest props. */
export function usePinch(el: HTMLElement | null, handlers: PinchHandlers) {
  const onStart = useEffectEvent(() => handlers.onStart?.());
  const onChange = useEffectEvent((p: Pinch) => handlers.onChange(p));
  const onEnd = useEffectEvent(() => handlers.onEnd?.());
  useEffect(() => {
    if (!el) return;
    return listenPinch(el, { onStart: () => onStart(), onChange: (p) => onChange(p), onEnd: () => onEnd() });
  }, [el]);
}
