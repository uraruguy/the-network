"use client";
/**
 * The MapLibre globe. Loaded with `next/dynamic` (ssr: false) so maplibre-gl and its CSS only
 * ship with /globe. Owns the Map in a ref and exposes an imperative camera API through `handle`.
 *
 * - Theme change → `setStyle(buildStyle(…), { diff: true })`, carrying the people sources over.
 * - Data change → `source.setData` (never a remount).
 * - Idle auto-rotation at planet zoom; rests on interaction, a hidden or unfocused window and
 *   reduced motion.
 * - Safari trackpad pinch zooms the map (it would otherwise magnify the whole page, see
 *   lib/gestures).
 * - Lost WebGL context → MapLibre restores it, or the map is rebuilt in place where it was
 *   (recovery.ts). The fallback card is for WebGL missing, a render crash, or a context that keeps
 *   getting lost.
 */
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AttributionControl,
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type PaddingOptions,
  type StyleSpecification,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { useReducedMotion } from "motion/react";
import {
  Component,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from "react";
import { useResolvedTokens } from "@/lib/design/useResolvedTokens";
import { pinchZoom, usePinch } from "@/lib/gestures";
import { cn } from "@/lib/utils";
import { CityPins } from "./CityPins";
import { GlobeSkeleton } from "./GlobeSkeleton";
import { MapFallback } from "./MapFallback";
import { planetZoom, type ArcCollection, type CityCollection, type CityGroup, type LngLatPair } from "./globe-data";
import { buildStyle, LAYER, MAP_TOKENS, OVERLAY_SOURCES, SRC } from "./map-style";
import { planRebuild, RESTORE_WAIT_MS } from "./recovery";
import styles from "./globe.module.css";

export type MapHandle = {
  /** Fly to a point, never zooming out (zoom ≥ `zoom`). */
  flyToCity: (target: { lng: number; lat: number }, opts: { zoom?: number; padding: PaddingOptions }) => void;
  /** Frame a bounding box (people's cities). */
  fitPeople: (bounds: [LngLatPair, LngLatPair], opts: { padding: PaddingOptions; maxZoom?: number }) => void;
  /** Back out to the whole planet and resume the idle rotation. */
  resetPlanet: (center: LngLatPair, padding: PaddingOptions) => void;
  zoomBy: (delta: number) => void;
};

export type MapCanvasProps = {
  handle: RefObject<MapHandle | null>;
  cities: CityCollection;
  groups: ReadonlyMap<string, CityGroup>;
  arcs: ArcCollection | null;
  home: { lat: number; lng: number } | null;
  selectedId: string | null;
  initialCenter: LngLatPair;
  /** Insets of the overlay chrome; the camera centres within what is left. */
  padding: PaddingOptions;
  /** Hold the idle rotation (e.g. while a panel is open). */
  rotationPaused?: boolean;
  onCityPress: (locationId: string) => void;
  onMovingChange: (moving: boolean) => void;
  onReady?: () => void;
  className?: string;
};

type Failure = "unsupported" | "lost" | "crashed";

/** Where the camera was, so a rebuilt map opens exactly there (and keeps spinning if it was). */
type SavedCamera = { center: LngLatPair; zoom: number; bearing: number; pitch: number; padding: PaddingOptions; spinning: boolean };

type InnerProps = MapCanvasProps & {
  /** Written by the map once it has loaded, and when it goes away. */
  cameraRef: RefObject<SavedCamera | null>;
  onFail: (f: Failure) => void;
  /** The lost context didn't come back: rebuild the map. */
  onRebuild: () => void;
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };
/** Idle rotation speed: one turn in ~2.5 minutes. */
const DEG_PER_MS = 360 / 150_000;
const ROTATE_MAX_ZOOM = 4;

let workerReady = false;
/** maplibre-gl 6 derives its worker URL from `import.meta.url`, which a bundled chunk breaks; point it at the emitted asset. */
function configureWorker() {
  if (workerReady) return;
  workerReady = true;
  setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
}

const pointData = (p: { lat: number; lng: number } | null): FeatureCollection =>
  p ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lng, p.lat] } }] } : EMPTY;

/** Keep the live people sources (and their data) when the theme swaps the style. */
function keepOverlay(prev: StyleSpecification | undefined, next: StyleSpecification): StyleSpecification {
  if (!prev) return next;
  const sources = { ...next.sources };
  for (const id of OVERLAY_SOURCES) if (prev.sources[id]) sources[id] = prev.sources[id]!;
  return { ...next, sources };
}

function withData(style: StyleSpecification, data: Record<string, FeatureCollection>): StyleSpecification {
  const sources = { ...style.sources };
  for (const [id, fc] of Object.entries(data)) {
    const s = sources[id];
    if (s?.type === "geojson") sources[id] = { ...s, data: fc };
  }
  return { ...style, sources };
}

const subscribeFocus = (cb: () => void) => {
  window.addEventListener("focus", cb);
  window.addEventListener("blur", cb);
  return () => {
    window.removeEventListener("focus", cb);
    window.removeEventListener("blur", cb);
  };
};
/** Whether this window has focus: the idle spin rests (and spares the GPU) while you're in another app. */
const useWindowFocused = () => useSyncExternalStore(subscribeFocus, () => document.hasFocus(), () => true);

export default function MapCanvas(props: MapCanvasProps) {
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<Failure | null>(null);
  const camera = useRef<SavedCamera | null>(null);
  const rebuilds = useRef<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  /** A fresh map (and WebGL context) in place, unless rebuilding keeps failing. */
  const rebuild = () => {
    clearTimeout(timer.current);
    const plan = planRebuild(rebuilds.current, Date.now());
    rebuilds.current = plan.history;
    if (!plan.ok) {
      console.warn("[globe] the map keeps losing its graphics context");
      setFailure("lost");
      return;
    }
    timer.current = setTimeout(() => setAttempt((a) => a + 1), plan.delay);
  };
  const onFail = (f: Failure) => {
    // A map that has drawn before isn't unsupported: its new context just couldn't be made yet.
    if (f === "unsupported" && camera.current) rebuild();
    else setFailure(f);
  };
  const retry = () => {
    clearTimeout(timer.current);
    rebuilds.current = [];
    setFailure(null);
    setAttempt((a) => a + 1);
  };
  return (
    <div className={cn("absolute inset-0", props.className)}>
      {failure ? (
        <MapFallback kind={failure} onRetry={retry} />
      ) : (
        <MapErrorBoundary key={attempt} onError={() => setFailure("crashed")}>
          <MapCanvasInner {...props} cameraRef={camera} onFail={onFail} onRebuild={rebuild} />
        </MapErrorBoundary>
      )}
    </div>
  );
}

class MapErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[globe] map crashed", error, info.componentStack);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function MapCanvasInner({
  handle,
  cities,
  groups,
  arcs,
  home,
  selectedId,
  initialCenter,
  padding,
  rotationPaused,
  onCityPress,
  onMovingChange,
  onReady,
  cameraRef,
  onFail,
  onRebuild,
}: InnerProps) {
  const tokens = useResolvedTokens(MAP_TOKENS);
  const mode = tokens.theme;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const appliedMode = useRef<string | null>(null);
  const resumeAfterFly = useRef(false);
  const pinchFrom = useRef(0);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [spinning, setSpinning] = useState(true);
  /** Fade the canvas in once the first tiles are drawn, so it never flashes a blank planet. */
  const [revealed, setRevealed] = useState(false);
  /** The browser took the WebGL context away: MapLibre restores it, or `onRebuild` replaces the map. */
  const [lost, setLost] = useState(false);
  const reducedMotion = useReducedMotion();
  const focused = useWindowFocused();

  const homeKey = home ? `${home.lng},${home.lat}` : "";
  const homeData = pointData(home);

  const initial = useEffectEvent(() => ({
    style: withData(buildStyle({ mode, tokens }), { [SRC.cities]: cities, [SRC.arcs]: arcs ?? EMPTY, [SRC.home]: homeData }),
    mode,
    center: initialCenter,
    padding,
    // A rebuilt map (after a lost context) opens where the previous one was.
    saved: cameraRef.current,
  }));
  const applyAllData = useEffectEvent((m: MapLibreMap) => {
    (m.getSource(SRC.cities) as GeoJSONSource | undefined)?.setData(cities);
    (m.getSource(SRC.arcs) as GeoJSONSource | undefined)?.setData(arcs ?? EMPTY);
    (m.getSource(SRC.home) as GeoJSONSource | undefined)?.setData(homeData);
  });
  const syncTheme = useEffectEvent((m: MapLibreMap) => {
    // While the context is lost there is no style to diff; the restore calls this again.
    if (!m.style || appliedMode.current === mode) return;
    appliedMode.current = mode;
    m.setStyle(buildStyle({ mode, tokens }), { diff: true, transformStyle: keepOverlay });
  });
  const remember = useEffectEvent((m: MapLibreMap) => {
    cameraRef.current = {
      center: m.getCenter().toArray() as LngLatPair,
      zoom: m.getZoom(),
      bearing: m.getBearing(),
      pitch: m.getPitch(),
      padding: m.getPadding(),
      spinning: spinning || resumeAfterFly.current,
    };
  });
  const emitMoving = useEffectEvent((moving: boolean) => onMovingChange(moving));
  const emitReady = useEffectEvent(() => onReady?.());
  const pressCity = useEffectEvent((id: string) => onCityPress(id));
  const fail = useEffectEvent((f: Failure) => onFail(f));
  const rebuild = useEffectEvent(() => onRebuild());

  /* ---------- create / destroy ---------- */
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const { style, mode: styleMode, center, padding: pad, saved } = initial();
    let m: MapLibreMap;
    try {
      configureWorker();
      const w = el.clientWidth - (pad.left ?? 0) - (pad.right ?? 0);
      const h = el.clientHeight - (pad.top ?? 0) - (pad.bottom ?? 0);
      m = new MapLibreMap({
        container: el,
        style,
        center: saved?.center ?? center,
        zoom: saved?.zoom ?? planetZoom(w, h, { lat: center[1], containerHeight: el.clientHeight }),
        bearing: saved?.bearing ?? 0,
        pitch: saved?.pitch ?? 0,
        pixelRatio: Math.min(2, window.devicePixelRatio || 1),
        attributionControl: false,
        maplibreLogo: false,
        maxPitch: 60,
        maxZoom: 18.5,
        fadeDuration: 180,
        cancelPendingTileRequestsWhileZooming: true,
        validateStyle: process.env.NODE_ENV !== "production",
      });
    } catch (err) {
      console.error("[globe] could not create the map", err);
      fail("unsupported");
      return;
    }
    mapRef.current = m;
    appliedMode.current = styleMode;
    let loaded = false;
    // Apply the overlay insets without shifting the planet off its centre (setPadding would).
    m.jumpTo({ center: saved?.center ?? center, padding: saved?.padding ?? pad });
    m.addControl(new AttributionControl({ compact: true }), "bottom-left");

    let idle: ReturnType<typeof setTimeout> | undefined;
    m.on("movestart", () => {
      clearTimeout(idle);
      emitMoving(true);
    });
    m.on("moveend", () => {
      clearTimeout(idle);
      idle = setTimeout(() => emitMoving(false), 160);
      if (resumeAfterFly.current) {
        resumeAfterFly.current = false;
        setSpinning(true);
      }
    });

    const onTarget = (e: MapLayerMouseEvent) => e.originalEvent.target === m.getCanvas();
    m.on("click", LAYER.cluster, async (e) => {
      const f = e.features?.[0];
      if (!f || !onTarget(e)) return;
      const src = m.getSource(SRC.cities) as GeoJSONSource | undefined;
      const id = f.properties?.cluster_id as number | undefined;
      if (!src || id === undefined) return;
      setSpinning(false);
      const zoom = await src.getClusterExpansionZoom(id);
      const [lng, lat] = (f.geometry as Point).coordinates as LngLatPair;
      m.easeTo({ center: [lng, lat], zoom: Math.min(zoom + 0.4, 17), duration: 650 });
    });
    m.on("click", LAYER.cityDot, (e) => {
      const id = e.features?.[0]?.properties?.locationId as string | undefined;
      if (id && onTarget(e)) pressCity(id);
    });
    for (const layer of [LAYER.cluster, LAYER.cityDot]) {
      m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
    }

    m.on("load", () => {
      loaded = true;
      applyAllData(m);
      setMap(m);
      if (saved) setSpinning(saved.spinning);
      remember(m);
      emitReady();
    });
    const reveal = () => setRevealed(true);
    m.once("idle", reveal);
    m.on("sourcedata", (e) => {
      if (e.sourceId === SRC.basemap && e.tile && m.isSourceLoaded(SRC.basemap)) reveal();
    });
    const revealAnyway = setTimeout(reveal, 8000);
    // Memory pressure, sleep, a GPU process restart, or (MapLibre's own signal) workers ended in the
    // background. MapLibre snapshots the style and rebuilds it when the context comes back; the live
    // data and theme are put back on top. If it doesn't come back, the lost effect below rebuilds.
    m.on("webglcontextlost", () => {
      setLost(true);
      m.once("style.load", () => {
        applyAllData(m);
        syncTheme(m);
      });
    });
    m.on("webglcontextrestored", () => setLost(false));
    m.on("error", (e) => console.warn("[globe]", e.error?.message ?? e));

    // Any direct manipulation ends the idle spin.
    const stop = () => {
      resumeAfterFly.current = false;
      setSpinning(false);
    };
    el.addEventListener("pointerdown", stop, { passive: true });
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("keydown", stop);

    return () => {
      clearTimeout(idle);
      clearTimeout(revealAnyway);
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("wheel", stop);
      el.removeEventListener("keydown", stop);
      if (loaded) remember(m);
      mapRef.current = null;
      setMap(null);
      m.remove();
    };
  }, []);

  /* ---------- lost context ---------- */
  useEffect(() => {
    if (!lost) return;
    let wait: ReturnType<typeof setTimeout> | undefined;
    // Only a visible page waits: a hidden one usually gets its context back when it returns.
    const arm = () => {
      clearTimeout(wait);
      if (document.visibilityState === "visible") wait = setTimeout(() => rebuild(), RESTORE_WAIT_MS);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      clearTimeout(wait);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [lost]);

  /* ---------- theme ---------- */
  useEffect(() => {
    if (mapRef.current) syncTheme(mapRef.current);
  }, [mode, tokens]);

  /* ---------- data ---------- */
  useEffect(() => {
    (mapRef.current?.getSource(SRC.cities) as GeoJSONSource | undefined)?.setData(cities);
  }, [cities]);
  useEffect(() => {
    (mapRef.current?.getSource(SRC.arcs) as GeoJSONSource | undefined)?.setData(arcs ?? EMPTY);
  }, [arcs]);
  useEffect(() => {
    (mapRef.current?.getSource(SRC.home) as GeoJSONSource | undefined)?.setData(homeData);
    // homeData is derived from homeKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeKey]);

  /* ---------- idle rotation ---------- */
  const rotate = !!map && spinning && !rotationPaused && !reducedMotion && !lost && focused;
  useEffect(() => {
    if (!rotate || !map) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last); // a backgrounded tab resumes without a jump
      last = now;
      if (!document.hidden && map.getZoom() < ROTATE_MAX_ZOOM && !map.isMoving()) {
        const c = map.getCenter();
        map.jumpTo({ center: [c.lng - dt * DEG_PER_MS, c.lat] });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [map, rotate]);

  /* ---------- Safari trackpad pinch (Chrome's ctrl+wheel pinch is MapLibre's scroll zoom) ---------- */
  usePinch(map?.getContainer() ?? null, {
    onStart: () => {
      if (!map) return;
      resumeAfterFly.current = false;
      setSpinning(false);
      pinchFrom.current = map.getZoom();
    },
    onChange: ({ scale, clientX, clientY }) => {
      if (!map || lost) return;
      const box = map.getContainer().getBoundingClientRect();
      map.easeTo({
        zoom: pinchZoom(pinchFrom.current, scale, map.getMinZoom(), map.getMaxZoom()),
        around: map.unproject([clientX - box.left, clientY - box.top]),
        duration: 0,
      });
    },
  });

  /* ---------- camera API ---------- */
  useImperativeHandle(
    handle,
    () => ({
      flyToCity: ({ lng, lat }, { zoom = 10.5, padding: pad }) => {
        const m = mapRef.current;
        if (!m) return;
        resumeAfterFly.current = false;
        setSpinning(false);
        m.flyTo({ center: [lng, lat], zoom: Math.max(zoom, m.getZoom()), padding: pad, speed: 1.5, curve: 1.45, maxDuration: 2800 });
      },
      fitPeople: (bounds, { padding: pad, maxZoom = 6 }) => {
        const m = mapRef.current;
        if (!m) return;
        resumeAfterFly.current = false;
        setSpinning(false);
        m.fitBounds(bounds, { padding: pad, maxZoom, duration: 1400 });
      },
      resetPlanet: (center, pad) => {
        const m = mapRef.current;
        if (!m) return;
        const el = m.getContainer();
        const zoom = planetZoom(el.clientWidth - (pad.left ?? 0) - (pad.right ?? 0), el.clientHeight - (pad.top ?? 0) - (pad.bottom ?? 0), { lat: center[1], containerHeight: el.clientHeight });
        setSpinning(false);
        resumeAfterFly.current = true;
        m.flyTo({ center, zoom, pitch: 0, bearing: 0, padding: pad, speed: 1.3, curve: 1.6, maxDuration: 3000 });
      },
      zoomBy: (delta) => {
        const m = mapRef.current;
        if (!m) return;
        resumeAfterFly.current = false;
        setSpinning(false);
        m.easeTo({ zoom: m.getZoom() + delta, duration: 320 });
      },
    }),
    [],
  );

  return (
    <>
      {(!revealed || lost) && <GlobeSkeleton caption={lost ? "Bringing the globe back…" : undefined} />}
      <div
        ref={container}
        className={cn("absolute inset-0 h-full w-full transition-opacity duration-500 ease-out", styles.map, revealed && !lost ? "opacity-100" : "opacity-0")}
        aria-label="Map of where your people live"
        role="region"
      />
      {map && !lost && <CityPins map={map} groups={groups} selectedId={selectedId} onPress={onCityPress} />}
    </>
  );
}
