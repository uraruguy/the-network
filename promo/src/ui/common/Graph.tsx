import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { crowd, INTROS, OWNER, PEOPLE, WARMTH_VAR, type Warmth } from "../../data/demo";
import { Avatar, avatarGradient } from "../../kit/Avatar";
import { rng } from "../../kit/motion";
import { pop, smooth } from "./geo";

type GNode = SimulationNodeDatum & { id: string; depth: number; parent?: string; ambient: boolean; order: number };
type GLink = SimulationLinkDatum<GNode> & { s: string; t: string; ambient: boolean; start: number; seed: number };

const WARMTH = new Map<string, Warmth>(PEOPLE.map((p) => [p.name, p.warmth]));
const warmthOf = (name: string): Warmth =>
  WARMTH.get(name) ?? (["Sara Rossi", "Max Larsen", "Nik Zupan", "Valentina Dubois"].includes(name) ? "inner" : "active");

type Intros = readonly (readonly [string, string])[];

/**
 * A layout, computed once per intro list: BFS from the owner over the list (who introduced whom),
 * ~40 faint ambient acquaintances hung off random people for density, then a seeded d3-force run
 * to rest. The default list is INTROS.
 */
function buildLayout(intros: Intros) {
  const r = rng(20261030);
  const children = new Map<string, string[]>();
  for (const [a, b] of intros) children.set(a, [...(children.get(a) ?? []), b]);

  const nodes = new Map<string, GNode>();
  const links: GLink[] = [];
  const queue = [OWNER];
  nodes.set(OWNER, { id: OWNER, depth: 0, ambient: false, order: 0, x: 0, y: 0, fx: 0, fy: 0 });
  while (queue.length) {
    const id = queue.shift()!;
    const d = nodes.get(id)!.depth;
    for (const c of children.get(id) ?? []) {
      if (nodes.has(c)) continue;
      const a = r() * Math.PI * 2;
      nodes.set(c, { id: c, depth: d + 1, parent: id, ambient: false, order: nodes.size, x: Math.cos(a) * 80 * (d + 1), y: Math.sin(a) * 80 * (d + 1) });
      links.push({ source: id, target: c, s: id, t: c, ambient: false, start: 0, seed: r() });
      queue.push(c);
    }
  }
  const named = [...nodes.values()].filter((n) => n.id !== OWNER);
  for (const name of crowd(44, 31)) {
    if (nodes.has(name)) continue;
    const host = named[Math.floor(r() * named.length)]!;
    const a = r() * Math.PI * 2;
    nodes.set(name, { id: name, depth: host.depth + 1, parent: host.id, ambient: true, order: nodes.size, x: (host.x ?? 0) + Math.cos(a) * 30, y: (host.y ?? 0) + Math.sin(a) * 30 });
    links.push({ source: host.id, target: name, s: host.id, t: name, ambient: true, start: 0, seed: r() });
  }

  const list = [...nodes.values()];
  forceSimulation<GNode>(list)
    .randomSource(rng(42))
    .force(
      "link",
      forceLink<GNode, GLink>(links)
        .id((n) => n.id)
        .distance((l) => (l.ambient ? 36 : 84))
        .strength((l) => (l.ambient ? 0.9 : 0.7)),
    )
    .force("charge", forceManyBody<GNode>().strength((n) => (n.ambient ? -36 : -320)))
    .force("collide", forceCollide<GNode>((n) => (n.id === OWNER ? 54 : n.ambient ? 9 : 34)))
    .force("x", forceX<GNode>(0).strength(0.05))
    .force("y", forceY<GNode>(0).strength(0.07))
    .stop()
    .tick(500);

  // Growth schedule: rings by depth, siblings staggered; ambient edges trail their host's ring.
  const maxDepth = Math.max(...list.map((n) => n.depth));
  const byDepth = new Map<number, GLink[]>();
  for (const l of links) {
    const d = nodes.get(l.t)!.depth;
    byDepth.set(d, [...(byDepth.get(d) ?? []), l]);
  }
  const band = 0.6 / maxDepth;
  for (const [d, ls] of byDepth) {
    ls.sort((a, b) => Number(a.ambient) - Number(b.ambient) || nodes.get(a.t)!.order - nodes.get(b.t)!.order);
    ls.forEach((l, i) => (l.start = 0.05 + (d - 1) * band + (i / ls.length) * band * 1.4 + (l.ambient ? band * 0.4 : 0)));
  }
  const maxX = Math.max(...list.map((n) => Math.abs(n.x ?? 0))) + 30;
  const maxY = Math.max(...list.map((n) => Math.abs(n.y ?? 0))) + 40;
  return { nodes, links, maxX, maxY };
}
type Layout = ReturnType<typeof buildLayout>;
const LAYOUTS = new Map<Intros, Layout>();
function layoutFor(intros: Intros): Layout {
  let l = LAYOUTS.get(intros);
  if (!l) LAYOUTS.set(intros, (l = buildLayout(intros)));
  return l;
}
const LAYOUT = layoutFor(INTROS);

/** An introduction chain from the owner to `name`, as node ids. */
export function chainTo(name: string, layout: Layout = LAYOUT): string[] {
  const out: string[] = [];
  let cur = layout.nodes.get(name);
  while (cur) {
    out.unshift(cur.id);
    cur = cur.parent ? layout.nodes.get(cur.parent) : undefined;
  }
  return out;
}

/** Graph units → px so the whole graph fits the box with a margin (owner at the centre). */
function fitScale(width: number, height: number, layout: Layout = LAYOUT) {
  return Math.min((width * 0.45) / layout.maxX, (height * 0.43) / layout.maxY);
}

/** The `pan` that centres `name` in a `width`×`height` box at `zoom` (camera push-ins). */
export function panTo(name: string, width: number, height: number, zoom = 1): [number, number] {
  const n = LAYOUT.nodes.get(name);
  if (!n) return [0, 0];
  const k = fitScale(width, height) * zoom;
  return [-(n.x ?? 0) * k, -(n.y ?? 0) * k];
}

export type NetworkGraphProps = {
  width: number;
  height: number;
  /** 0..1: edges grow out from the owner ring by ring; nodes pop when their edge arrives. */
  grow: number;
  theme?: "light" | "dark";
  /** Camera zoom (1 = the whole graph fits). Scales positions and node sizes together. */
  zoom?: number;
  /** Camera pan in px, applied after zoom. */
  pan?: [number, number];
  /** Light the introduction chain from the owner to this person; dim the rest. */
  highlight?: string;
  /** 0..1 strength of the highlight (animate it in/out). Defaults to 1 when `highlight` is set. */
  highlightAmount?: number;
  labels?: boolean;
  /** Show the faint ambient acquaintances. */
  ambient?: boolean;
  /** Who introduced whom (default: INTROS). Pass a stable (module-level) array: layouts are cached per array. */
  intros?: Intros;
  style?: CSSProperties;
};

const EDGE_DUR = 0.16;

/**
 * "Who introduced whom" (the app's graph view), as a growing constellation: curved edges draw out
 * from you, avatars pop in with a spring, light pulses run along the introductions.
 */
export function NetworkGraph({ width, height, grow, theme = "light", zoom = 1, pan = [0, 0], highlight, highlightAmount, labels = true, ambient = true, intros = INTROS, style }: NetworkGraphProps) {
  const frame = useCurrentFrame();
  const LAYOUT = layoutFor(intros);
  const dark = theme === "dark";
  const unit = Math.min(width, height) / 1080;
  const fit = fitScale(width, height, LAYOUT);
  const k = fit * zoom;
  const ox = width / 2 + pan[0];
  const oy = height / 2 + pan[1];
  const at = (n: GNode) => ({ x: ox + (n.x ?? 0) * k, y: oy + (n.y ?? 0) * k });
  const s = unit * zoom;

  const chain = highlight ? chainTo(highlight, LAYOUT) : [];
  const hl = highlight ? (highlightAmount ?? 1) : 0;
  const inChain = new Set(chain);
  const chainEdge = (a: string, b: string) => {
    const i = chain.indexOf(a);
    return i >= 0 && chain[i + 1] === b;
  };

  const edgeT = (l: GLink) => Math.min(1, Math.max(0, (grow - l.start) / EDGE_DUR));
  const arrived = new Map<string, number>([[OWNER, pop(Math.min(1, grow / 0.06))]]);
  for (const l of LAYOUT.links) {
    const e = edgeT(l);
    arrived.set(l.t, pop(Math.min(1, Math.max(0, (grow - l.start - EDGE_DUR * 0.8) / 0.1))) * (e > 0 ? 1 : 0));
  }

  const accent = dark ? "oklch(0.75 0.095 194)" : "oklch(0.62 0.1 195)";
  const strong = dark ? "oklch(0.88 0.08 192)" : "oklch(0.5 0.08 198)";

  const edges = LAYOUT.links.flatMap((l) => {
    if (l.ambient && !ambient) return [];
    const e = edgeT(l);
    if (e <= 0) return [];
    const a = at(LAYOUT.nodes.get(l.s)!);
    const b = at(LAYOUT.nodes.get(l.t)!);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const bend = (l.seed > 0.5 ? 1 : -1) * 0.14;
    const c = { x: (a.x + b.x) / 2 - dy * bend, y: (a.y + b.y) / 2 + dx * bend };
    const on = chainEdge(l.s, l.t);
    const dim = on ? 1 : 1 - 0.78 * hl;
    const base = l.ambient ? 0.26 : 0.55;
    const d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    const pulse: ReactNode[] = [];
    if (!l.ambient && e >= 1) {
      const ph = (frame / 75 + l.seed * 7.3) % 1;
      const u = ph;
      const px = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x;
      const py = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y;
      const o = Math.sin(Math.PI * ph) * smooth(0, 0.15, grow - l.start - EDGE_DUR) * dim * (on ? 1 : 0.8);
      pulse.push(
        <circle key="g" cx={px} cy={py} r={(on ? 7 : 5) * s} fill={strong} opacity={0.25 * o} />,
        <circle key="c" cx={px} cy={py} r={(on ? 2.6 : 1.9) * s} fill={dark ? "#fff" : strong} opacity={o} />,
      );
    }
    return [
      <g key={`${l.s}>${l.t}`}>
        {on && hl > 0 && <path d={d} fill="none" stroke={accent} strokeWidth={9 * s} strokeOpacity={0.18 * hl} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - e} />}
        <path
          d={d}
          fill="none"
          stroke={on ? strong : accent}
          strokeOpacity={(on ? base + (1 - base) * hl : base) * dim}
          strokeWidth={(l.ambient ? 1.1 : on ? 2 + 1.8 * hl : 2) * s}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - e}
        />
        {pulse}
      </g>,
    ];
  });

  const nodes = [...LAYOUT.nodes.values()].flatMap((n) => {
    if (n.ambient && !ambient) return [];
    const p = arrived.get(n.id) ?? 0;
    if (p <= 0) return [];
    const { x, y } = at(n);
    const on = inChain.has(n.id);
    const dim = on ? 1 : 1 - 0.72 * hl;
    if (n.ambient) {
      const r = 6 * s;
      return [
        <div
          key={n.id}
          style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: 999, background: avatarGradient(n.id), opacity: 0.5 * dim, transform: `scale(${p})` }}
        />,
      ];
    }
    const me = n.id === OWNER;
    const size = (me ? 66 : 44) * s * (1 + 0.12 * hl * (on && !me ? 1 : 0));
    const ring = me ? "var(--surface-solid)" : WARMTH_VAR[warmthOf(n.id)];
    return [
      <div key={n.id} style={{ position: "absolute", left: x, top: y, width: 0, height: 0, opacity: dim, zIndex: me ? 3 : on ? 2 : 1 }}>
        <div style={{ position: "absolute", left: -size / 2, top: -size / 2, width: size, height: size, transform: `scale(${p})` }}>
          {(me || (on && hl > 0)) && (
            <div
              style={{
                position: "absolute",
                inset: -(me ? 10 : 7) * s,
                borderRadius: 999,
                background: dark ? "oklch(0.75 0.095 194 / 0.22)" : "oklch(0.67 0.1 194 / 0.22)",
                boxShadow: on && hl > 0 ? `0 0 ${26 * s}px oklch(0.75 0.1 194 / ${0.6 * hl})` : undefined,
              }}
            />
          )}
          {me ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: "var(--accent-fill)",
                color: "var(--accent-fg)",
                border: `${2.5 * s}px solid ${ring}`,
                display: "grid",
                placeItems: "center",
                fontWeight: 650,
                fontSize: size * 0.4,
                boxShadow: dark ? "0 0 30px oklch(0.75 0.1 194 / 0.45)" : "0 6px 18px -6px oklch(0.4 0.08 200 / 0.45)",
              }}
            >
              A
            </div>
          ) : (
            <div style={{ position: "absolute", inset: 0, borderRadius: 999, boxShadow: `0 0 0 ${2 * s}px ${ring}, 0 ${3 * s}px ${10 * s}px -${3 * s}px oklch(0.2 0.03 220 / ${dark ? 0.6 : 0.3})` }}>
              <Avatar name={n.id} size={size} ring={false} />
            </div>
          )}
        </div>
        {labels && (
          <div
            style={{
              position: "absolute",
              top: size / 2 + 6 * s,
              left: 0,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              fontSize: (me ? 15 : 13.5) * s,
              fontWeight: me ? 650 : 520,
              letterSpacing: "-0.01em",
              color: "var(--fg)",
              opacity: smooth(0.4, 1, p),
              textShadow: dark ? "0 1px 6px oklch(0.16 0.012 215 / 0.9)" : "0 0 6px oklch(0.985 0.004 200), 0 0 2px oklch(0.985 0.004 200)",
            }}
          >
            {me ? "You" : n.id}
          </div>
        )}
      </div>,
    ];
  });

  return (
    <div className={dark ? "dark" : undefined} style={{ position: "relative", width, height, ...style }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {edges}
      </svg>
      <div style={{ position: "absolute", inset: 0 }}>{nodes}</div>
    </div>
  );
}
