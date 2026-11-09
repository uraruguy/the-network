import { geoDistance, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { useId, type CSSProperties, type ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { CITIES, crowd, type City } from "../../data/demo";
import { Avatar } from "../../kit/Avatar";
import { COUNTRY_LABELS, pop, projector, smooth, visibleWorld, type Pt } from "./geo";

export type GlobeArc = {
  to: string;
  /** 0..1: how far the arc has travelled from home. */
  progress: number;
  /** 0..1: the destination pin's pop. Defaults to the last 12% of `progress`. */
  pin?: number;
};

export type GlobeProps = {
  width: number;
  height: number;
  radius: number;
  center?: [number, number];
  /** d3-geo rotation [λ, φ] in degrees: to face lng L / lat B use [-L, -B]. */
  rotate: [number, number];
  theme?: "light" | "dark";
  /** 0..1: clusters and pins pop in, staggered by distance from home. */
  reveal?: number;
  home?: string;
  arcs?: GlobeArc[];
  labels?: boolean;
  /** Merge distance in px, measured along the surface (so rotation never flickers clusters). */
  clusterRadius?: number;
  /**
   * Merge distance as an angle (radians) instead of px. Clusters then stay identical while the
   * radius or uiScale animates (no re-clustering during a zoom). Overrides `clusterRadius`.
   */
  clusterAngle?: number;
  /** Seed cities whose markers draw above everything else (e.g. the home cluster). */
  raise?: string[];
  /** Country labels to leave out (e.g. one a callout's leader line would cross). */
  hideLabels?: string[];
  focus?: string;
  /** Scales bubbles, pins, labels and strokes (1 = the app's sizes in pt). */
  uiScale?: number;
  /** Strength of the halo around the planet (0..1.5). */
  atmosphere?: number;
  style?: CSSProperties;
};

const PALETTE = {
  light: {
    water: "oklch(0.868 0.042 211)",
    land: "oklch(0.962 0.006 200)",
    border: "oklch(0.74 0.01 215 / 0.62)",
    label: "oklch(0.56 0.014 215 / 0.92)",
    labelHalo: "oklch(0.962 0.006 200 / 0.88)",
    fill: "oklch(0.62 0.1 195)",
    ring: "oklch(1 0 0)",
    onFill: "oklch(1 0 0)",
    halo: "oklch(0.67 0.1 194 / 0.2)",
    strong: "oklch(0.5 0.08 198)",
    arcHead: "oklch(0.55 0.1 196)",
    arcTail: "oklch(0.67 0.1 194)",
    glow: "oklch(0.67 0.1 194 / 0)",
    atmo: "oklch(0.97 0.02 195)",
    rim: "oklch(1 0 0 / 0.42)",
    shadeHi: "oklch(1 0 0 / 0.16)",
    shadeLo: "oklch(0.35 0.05 215 / 0.2)",
  },
  dark: {
    water: "oklch(0.215 0.034 214)",
    land: "oklch(0.3 0.016 212)",
    border: "oklch(0.5 0.014 212 / 0.55)",
    label: "oklch(0.68 0.014 210 / 0.9)",
    labelHalo: "oklch(0.3 0.016 212 / 0.85)",
    fill: "oklch(0.75 0.095 194)",
    ring: "oklch(0.36 0.016 212)",
    onFill: "oklch(0.2 0.03 210)",
    halo: "oklch(0.75 0.095 194 / 0.24)",
    strong: "oklch(0.83 0.075 194)",
    arcHead: "oklch(0.92 0.08 192)",
    arcTail: "oklch(0.75 0.095 194)",
    glow: "oklch(0.78 0.11 194 / 0.55)",
    atmo: "oklch(0.72 0.11 194)",
    rim: "oklch(0.8 0.1 194 / 0.16)",
    shadeHi: "oklch(1 0 0 / 0.08)",
    shadeLo: "oklch(0 0 0 / 0.45)",
  },
} as const;

const CITY = new Map(CITIES.map((c) => [c.name, c]));

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Up to three faces for a city: its featured person first, then deterministic names. */
export function facesFor(city: City): string[] {
  const extra = crowd(3, hash(city.name));
  return [...(city.face ? [city.face] : []), ...extra].slice(0, Math.min(3, Math.max(1, city.count)));
}

const lerpStops = (stops: [number, number][], x: number) => {
  if (x <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [x1, y1] = stops[i]!;
    const [x0, y0] = stops[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return stops.at(-1)![1];
};
/** The app's cluster sizes (map-style.ts), in pt. */
const bubbleR = (n: number) => lerpStops([[2, 15], [20, 18.5], [100, 23], [500, 29]], n);
const haloR = (n: number) => lerpStops([[2, 23], [20, 28], [100, 35], [500, 43]], n);

type Group = { cities: City[]; count: number; x: number; y: number; z: number; seed: City };

/**
 * The app's people globe, drawn deterministically: orthographic d3-geo sphere with land, borders
 * and country labels, the home marker, great-circle arcs, and count bubbles / avatar pins that
 * merge and split with the zoom (clustered by surface distance, so rotation never flickers them).
 */
export function Globe({
  width,
  height,
  radius,
  center,
  rotate,
  theme = "light",
  reveal = 1,
  home = "Ljubljana",
  arcs = [],
  labels = true,
  clusterRadius,
  clusterAngle,
  raise,
  hideLabels,
  focus,
  uiScale = 1,
  atmosphere = 1,
  style,
}: GlobeProps) {
  const frame = useCurrentFrame();
  const uid = useId().replace(/:/g, "");
  const P = PALETTE[theme];
  const [cx, cy] = center ?? [width / 2, height / 2];
  const project = projector(rotate, radius, cx, cy);
  const world = visibleWorld(rotate, radius, cx, cy, width, height);
  const projection = geoOrthographic()
    .rotate([rotate[0], rotate[1], 0])
    .scale(radius)
    .translate([cx, cy])
    .clipAngle(90)
    .precision(0.7);
  if (radius * 2 > Math.max(width, height)) projection.clipExtent([[-40, -40], [width + 40, height + 40]]);
  const path = geoPath(projection).digits(1);
  const landD = path(world.land) ?? "";
  const borderD = path(world.borders) ?? "";
  const homeCity = CITY.get(home);
  const merge = clusterAngle !== undefined ? clusterAngle * radius : (clusterRadius ?? 44 * uiScale);

  // ---- arcs --------------------------------------------------------------------------------
  const arcEls = homeCity
    ? arcs.flatMap((a, ai) => {
        const dest = CITY.get(a.to);
        if (!dest || a.progress <= 0) return [];
        const from: [number, number] = [homeCity.lng, homeCity.lat];
        const to: [number, number] = [dest.lng, dest.lat];
        const interp = geoInterpolate(from, to);
        const dist = geoDistance(from, to);
        const height = 0.16 * Math.min(1, dist / 1.1 + 0.3);
        const N = 96;
        const pts: Pt[] = [];
        const tEnd = Math.min(1, a.progress);
        for (let i = 0; i <= N; i++) {
          const t = (i / N) * tEnd;
          const [lng, lat] = interp(t);
          pts.push(project(lng, lat, 1 + height * Math.sin(Math.PI * t)));
        }
        const visible = (p: Pt) => p.z > 0 || Math.hypot(p.x - cx, p.y - cy) > radius;
        const CH = 4;
        const segs = [];
        for (let i = 0; i < N; i += CH) {
          const chunk = pts.slice(i, i + CH + 1);
          if (!chunk.every(visible)) continue;
          const k = i / N;
          segs.push(
            <polyline
              key={`${ai}-${i}`}
              points={chunk.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}
              fill="none"
              stroke={`url(#arc${uid})`}
              strokeWidth={(1.6 + 1.4 * k) * uiScale}
              strokeLinecap="round"
              opacity={0.28 + 0.72 * k}
            />,
          );
        }
        const head = pts.at(-1)!;
        const pinT = a.pin ?? smooth(0.88, 1, a.progress);
        const headAlpha = visible(head) ? 1 - pinT : 0;
        const glowPts = pts.filter(visible);
        return [
          <g key={`arc${ai}`}>
            {glowPts.length > 1 && (
              <polyline
                points={glowPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke={P.arcTail}
                strokeWidth={7 * uiScale}
                strokeLinecap="round"
                opacity={theme === "dark" ? 0.22 : 0.14}
                filter={`url(#soft${uid})`}
              />
            )}
            {segs}
            {headAlpha > 0 && (
              <>
                <circle cx={head.x} cy={head.y} r={9 * uiScale} fill={P.arcHead} opacity={0.22 * headAlpha} filter={`url(#soft${uid})`} />
                <circle cx={head.x} cy={head.y} r={3.2 * uiScale} fill={P.arcHead} opacity={headAlpha} />
                <circle cx={head.x} cy={head.y} r={1.5 * uiScale} fill="#fff" opacity={headAlpha} />
              </>
            )}
          </g>,
        ];
      })
    : [];

  // ---- clusters ------------------------------------------------------------------------------
  // Arc destinations seed first (they absorb their neighbours, so a landing pin never overlaps a
  // bubble next door), then the biggest cities. Distance is measured along the surface.
  const destOf = new Map(arcs.map((a) => [a.to, a]));
  const order = [...CITIES].sort(
    (a, b) => Number(destOf.has(b.name)) - Number(destOf.has(a.name)) || b.count - a.count || a.name.localeCompare(b.name),
  );
  const taken = new Set<string>();
  const groups: Group[] = [];
  for (const seed of order) {
    if (taken.has(seed.name)) continue;
    const members = order.filter(
      (c) =>
        !taken.has(c.name) &&
        (c === seed ||
          (!destOf.has(c.name) &&
            (destOf.has(seed.name)
              ? // A landing pin takes in its smaller neighbours (pins are wider than a bubble), never home.
                c.name !== home && c.count <= seed.count && geoDistance([seed.lng, seed.lat], [c.lng, c.lat]) * radius < merge * 1.8
              : geoDistance([seed.lng, seed.lat], [c.lng, c.lat]) * radius < merge))),
    );
    members.forEach((m) => taken.add(m.name));
    let x = 0;
    let y = 0;
    let n = 0;
    for (const m of members) {
      const p = project(m.lng, m.lat);
      x += p.x * m.count;
      y += p.y * m.count;
      n += m.count;
    }
    groups.push({ cities: members, count: n, x: x / n, y: y / n, z: project(seed.lng, seed.lat).z, seed });
  }

  const delayOf = (c: City) => (homeCity ? geoDistance([homeCity.lng, homeCity.lat], [c.lng, c.lat]) / Math.PI : 0);

  type Mark = { key: string; z: number; el: ReactNode };
  const marks: Mark[] = [];
  /** Screen discs the labels must stay clear of. */
  const blockers: { x: number; y: number; r: number }[] = [];
  const t = frame / 60;

  for (const g of groups) {
    if (g.z < 0.02) continue;
    const dest = destOf.get(g.seed.name);
    const isFocus = !!focus && g.cities.some((c) => c.name === focus);
    const lift = isFocus ? 1 : 0;
    const limb = smooth(0.02, 0.2, g.z);
    if (dest) {
      // A landing pin: hidden until its arc arrives, then pops with a ripple.
      const pinT = dest.pin ?? smooth(0.88, 1, dest.progress);
      if (pinT <= 0) continue;
      const p = project(g.seed.lng, g.seed.lat);
      blockers.push({ x: p.x, y: p.y - 22 * uiScale, r: 30 * uiScale });
      marks.push({
        key: `dest-${g.seed.name}`,
        z: g.z + 1,
        el: (
          <div key={`dest-${g.seed.name}`}>
            <Ripple x={p.x} y={p.y} t={pinT} color={P.fill} scale={uiScale} />
            <AvatarPin
              style={{ position: "absolute", left: p.x, top: p.y, opacity: Math.min(1, pinT * 3) * limb }}
              names={facesFor(g.seed)}
              count={g.count}
              scale={uiScale * pop(pinT)}
              lift={lift}
              glow={isFocus}
              theme={theme}
              frame={frame}
            />
          </div>
        ),
      });
      continue;
    }
    const local = Math.min(1, Math.max(0, (reveal - delayOf(g.seed) * 0.55) / 0.45));
    if (local <= 0) continue;
    const s = pop(local);
    const single = g.cities.length === 1 && g.count <= 3;
    const common: CSSProperties = {
      position: "absolute",
      left: g.x,
      top: g.y,
      opacity: Math.min(1, local * 3) * limb,
    };
    if (single) {
      blockers.push({ x: g.x, y: g.y - 22 * uiScale, r: (g.count === 1 ? 24 : 34) * uiScale });
      marks.push({ key: g.seed.name, z: g.z, el: <AvatarPin key={g.seed.name} style={common} names={facesFor(g.seed)} count={g.count} scale={uiScale * s * (0.88 + 0.12 * g.z)} lift={lift} glow={isFocus} theme={theme} frame={frame} /> });
    } else {
      const r = bubbleR(g.count);
      const hr = haloR(g.count);
      blockers.push({ x: g.x, y: g.y, r: r * uiScale + 2 });
      marks.push({
        key: g.seed.name,
        z: g.z,
        el: (
          <div key={g.seed.name} style={{ ...common, transform: `translate(-50%, -50%) translateY(${-8 * lift * uiScale}px) scale(${uiScale * s * (0.88 + 0.12 * g.z) * (1 + 0.14 * lift)})` }}>
            <div style={{ position: "absolute", left: -hr, top: -hr, width: hr * 2, height: hr * 2, borderRadius: 999, background: P.halo, filter: "blur(1.5px)" }} />
            {isFocus && <Pulse r={r} color={P.fill} t={t} />}
            <div
              style={{
                position: "absolute",
                left: -r,
                top: -r,
                width: r * 2,
                height: r * 2,
                borderRadius: 999,
                background: P.fill,
                border: `2.5px solid ${P.ring}`,
                boxSizing: "border-box",
                display: "grid",
                placeItems: "center",
                color: P.onFill,
                fontWeight: 700,
                fontSize: lerpStops([[2, 12.5], [100, 14], [500, 15]], g.count),
                letterSpacing: "-0.01em",
                fontVariantNumeric: "tabular-nums",
                boxShadow: theme === "dark" ? `0 0 ${14 + 10 * lift}px ${P.glow}, 0 2px 6px oklch(0 0 0 / 0.35)` : `0 1px 2px oklch(0.3 0.03 220 / 0.12), 0 4px 10px -4px oklch(0.3 0.03 220 / 0.25)${isFocus ? ", 0 0 22px oklch(0.67 0.1 194 / 0.55)" : ""}`,
              }}
            >
              {g.count}
            </div>
          </div>
        ),
      });
    }
  }
  if (raise?.length) for (const m of marks) if (raise.includes(m.key)) m.z += 2;
  marks.sort((a, b) => a.z - b.z);

  // ---- labels ----------------------------------------------------------------------------------
  // Placed by rank with collision checks against each other and the people marks, like MapLibre.
  const k = radius / (220 * uiScale);
  const labelSize = uiScale * (10.5 + Math.min(1, Math.max(0, (k - 0.8) / 2.2)) * 3);
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const labelEls = labels
    ? COUNTRY_LABELS.filter((l) => !hideLabels?.includes(l.name))
        .sort((a, b) => a.rank - b.rank)
        .flatMap((l) => {
          if ((l.rank === 2 && k < 0.8) || (l.rank === 3 && k < 0.9)) return [];
          const p = project(l.lng, l.lat);
          const o = smooth(0.18, 0.5, p.z);
          if (o <= 0) return [];
          const words = l.name.toUpperCase();
          const lines = words.length > 9 && words.includes(" ") ? words.split(" ") : [words];
          const w = Math.max(...lines.map((ln) => ln.length)) * labelSize * 0.78 * (0.75 + 0.25 * p.z);
          const h = lines.length * labelSize * 1.15;
          const box = { x0: p.x - w / 2 - 4, y0: p.y - h / 2 - 3, x1: p.x + w / 2 + 4, y1: p.y + h / 2 + 3 };
          if (placed.some((b) => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) return [];
          if (blockers.some((b) => Math.hypot(Math.min(Math.max(b.x, box.x0), box.x1) - b.x, Math.min(Math.max(b.y, box.y0), box.y1) - b.y) < b.r)) return [];
          placed.push(box);
          return [
            <text
              key={l.name}
              x={p.x}
              y={p.y - ((lines.length - 1) * labelSize * 1.15) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={labelSize}
              fontWeight={500}
              letterSpacing="0.14em"
              fill={P.label}
              stroke={P.labelHalo}
              strokeWidth={2.4 * uiScale}
              paintOrder="stroke"
              opacity={o * (0.6 + 0.4 * reveal)}
            >
              {lines.map((ln, i) => (
                <tspan key={i} x={p.x} dy={i === 0 ? 0 : labelSize * 1.15}>
                  {ln}
                </tspan>
              ))}
            </text>,
          ];
        })
    : [];

  // ---- home ------------------------------------------------------------------------------------
  const hp = homeCity ? project(homeCity.lng, homeCity.lat) : null;
  const homeEl =
    hp && hp.z > 0.02 ? (
      <g opacity={smooth(0.02, 0.2, hp.z) * Math.min(1, reveal * 4)}>
        <circle cx={hp.x} cy={hp.y} r={(11 + 3 * Math.sin(t * 3)) * uiScale} fill={P.strong} opacity={0.18} />
        <circle cx={hp.x} cy={hp.y} r={5 * uiScale} fill={P.strong} stroke={P.ring} strokeWidth={2 * uiScale} />
      </g>
    ) : null;

  const atmoR = radius * (1 + 0.24 * Math.max(0.2, atmosphere));
  const inner = radius / atmoR;

  return (
    <div className={theme === "dark" ? "dark" : undefined} style={{ position: "relative", width, height, ...style }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <radialGradient id={`atmo${uid}`} cx={cx} cy={cy} r={atmoR} gradientUnits="userSpaceOnUse">
            <stop offset={inner * 0.98} stopColor={P.atmo} stopOpacity={(theme === "dark" ? 0.5 : 0.95) * atmosphere} />
            <stop offset={inner + (1 - inner) * 0.12} stopColor={P.atmo} stopOpacity={(theme === "dark" ? 0.26 : 0.5) * atmosphere} />
            <stop offset={inner + (1 - inner) * 0.45} stopColor={P.atmo} stopOpacity={(theme === "dark" ? 0.08 : 0.14) * atmosphere} />
            <stop offset={1} stopColor={P.atmo} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`shade${uid}`} cx={cx - radius * 0.32} cy={cy - radius * 0.38} r={radius * 1.55} gradientUnits="userSpaceOnUse">
            <stop offset={0} stopColor={P.shadeHi} />
            <stop offset={0.42} stopColor={P.shadeHi} stopOpacity={0} />
            <stop offset={0.78} stopColor={P.shadeLo} stopOpacity={0} />
            <stop offset={1} stopColor={P.shadeLo} />
          </radialGradient>
          <radialGradient id={`rim${uid}`} cx={cx} cy={cy} r={radius} gradientUnits="userSpaceOnUse">
            <stop offset={0.86} stopColor={P.rim} stopOpacity={0} />
            <stop offset={1} stopColor={P.rim} />
          </radialGradient>
          <radialGradient id={`spec${uid}`} cx={cx - radius * 0.42} cy={cy - radius * 0.5} r={radius * 0.5} gradientUnits="userSpaceOnUse">
            <stop offset={0} stopColor="#fff" stopOpacity={theme === "dark" ? 0.1 : 0.28} />
            <stop offset={1} stopColor="#fff" stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`arc${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={P.arcTail} />
            <stop offset="1" stopColor={P.arcHead} />
          </linearGradient>
          <filter id={`soft${uid}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={3 * uiScale} />
          </filter>
        </defs>
        {atmosphere > 0 && <circle cx={cx} cy={cy} r={atmoR} fill={`url(#atmo${uid})`} />}
        <circle cx={cx} cy={cy} r={radius} fill={P.water} />
        <path d={landD} fill={P.land} />
        <path d={borderD} fill="none" stroke={P.border} strokeWidth={Math.max(0.5, 0.75 * uiScale * Math.min(1.6, Math.max(0.8, k / 2)))} />
        <circle cx={cx} cy={cy} r={radius} fill={`url(#shade${uid})`} />
        <circle cx={cx} cy={cy} r={radius} fill={`url(#rim${uid})`} />
        <circle cx={cx} cy={cy} r={radius} fill={`url(#spec${uid})`} />
        {labelEls}
        {arcEls}
        {homeEl}
      </svg>
      <div style={{ position: "absolute", inset: 0 }}>{marks.map((m) => m.el)}</div>
    </div>
  );
}

function Pulse({ r, color, t }: { r: number; color: string; t: number }) {
  const ph = (t * 0.9) % 1;
  const rr = r * (1 + ph * 1.2);
  return <div style={{ position: "absolute", left: -rr, top: -rr, width: rr * 2, height: rr * 2, borderRadius: 999, border: `2px solid ${color}`, opacity: (1 - ph) * 0.7 }} />;
}

function Ripple({ x, y, t, color, scale }: { x: number; y: number; t: number; color: string; scale: number }) {
  if (t <= 0 || t >= 1) return null;
  const r = (8 + 34 * t) * scale;
  return <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: 999, border: `${2 * scale}px solid ${color}`, opacity: (1 - t) * 0.8 }} />;
}

/** The app's AvatarPin (CityPins.tsx): white bubble, avatar stack, head count, a tail at the city. */
function AvatarPin({
  names,
  count,
  scale,
  lift,
  glow,
  theme,
  frame,
  style,
}: {
  names: string[];
  count: number;
  scale: number;
  lift: number;
  glow: boolean;
  theme: "light" | "dark";
  frame: number;
  style: CSSProperties;
}) {
  const single = count === 1;
  const size = single ? 34 : 28;
  const shown = single ? names.slice(0, 1) : names.slice(0, Math.min(3, count));
  const bob = glow ? Math.sin(frame / 14) * 1.5 : 0;
  return (
    <div style={{ ...style, transform: `translate(-50%, -100%) translateY(${(-8 * lift + bob) * scale}px) scale(${scale * (1 + 0.12 * lift)})`, transformOrigin: "50% 100%" }}>
      <div className="relative flex flex-col items-center pb-0.5">
        <span
          className="relative z-[1] flex items-center rounded-full bg-surface-2 p-[3px] ring-[0.5px] ring-hairline specular elevation-e2"
          style={{
            paddingRight: single ? undefined : 10,
            boxShadow: glow
              ? `0 0 0 2px var(--accent), 0 0 24px ${theme === "dark" ? "oklch(0.78 0.11 194 / 0.6)" : "oklch(0.67 0.1 194 / 0.5)"}, var(--shadow-e2)`
              : undefined,
          }}
        >
          <span className="flex">
            {shown.map((n, i) => (
              <span key={n + i} style={{ marginLeft: i ? -10 : 0, borderRadius: 999, boxShadow: "0 0 0 2px var(--surface-solid)", display: "inline-flex" }}>
                <Avatar name={n} size={size} />
              </span>
            ))}
          </span>
          {!single && <span className="ml-1.5 text-footnote font-semibold text-fg tabular-nums">{count}</span>}
        </span>
        <span className="-mt-[7px] size-3 rotate-45 bg-surface-2 shadow-e1" />
      </div>
    </div>
  );
}

export { projector as globeProjector } from "./geo";
