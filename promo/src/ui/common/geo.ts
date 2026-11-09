import { geoCentroid, geoDistance, geoRotation } from "d3-geo";
import type { FeatureCollection, LineString, MultiLineString, MultiPolygon, Polygon } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";
import world50 from "world-atlas/countries-50m.json";

type World = Topology<{ countries: GeometryCollection; land: GeometryCollection }>;
type Pos = [number, number];
/** A piece of geometry with a bounding cap on the sphere (centre + angular radius), for culling. */
type Piece<G> = { geom: G; c: Pos; r: number };
type Shapes = { land: Piece<Polygon>[]; borders: Piece<LineString>[] };

function cap(points: Pos[]): { c: Pos; r: number } {
  const c = geoCentroid({ type: "MultiPoint", coordinates: points }) as Pos;
  let r = 0;
  for (const p of points) r = Math.max(r, geoDistance(c, p));
  return { c, r };
}

/** Drops vertices closer than `tol` degrees to the last kept one (radial-distance simplification). */
function thin(ring: Pos[], tol: number): Pos[] {
  if (tol <= 0 || ring.length < 8) return ring;
  const out: Pos[] = [ring[0]!];
  for (let i = 1; i < ring.length - 1; i++) {
    const [x, y] = ring[i]!;
    const [px, py] = out.at(-1)!;
    if (Math.abs(x - px) > tol || Math.abs(y - py) > tol) out.push(ring[i]!);
  }
  out.push(ring.at(-1)!);
  return out.length >= 4 ? out : ring;
}

function shapes(topo: World, tol = 0): Shapes {
  const landFc = feature(topo, topo.objects.land) as FeatureCollection<Polygon | MultiPolygon>;
  const land: Piece<Polygon>[] = [];
  for (const f of landFc.features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const rings of polys) {
      const coordinates = rings.map((r) => thin(r as Pos[], tol));
      land.push({ geom: { type: "Polygon", coordinates }, ...cap(coordinates[0]!) });
    }
  }
  const mesh0 = mesh(topo, topo.objects.countries, (a, b) => a !== b);
  const borders = mesh0.coordinates.map((line) => {
    const coordinates = thin(line as Pos[], tol);
    return { geom: { type: "LineString", coordinates } as LineString, ...cap(coordinates) };
  });
  return { land, borders };
}

const W110 = shapes(world110 as unknown as World);
let W50: Shapes | null = null;

/**
 * The world for one frame: coarse shapes for a small globe, detailed ones once the sphere is big,
 * keeping only the pieces that can be on screen (front hemisphere, inside the viewport's reach).
 */
export function visibleWorld(rotate: [number, number], radius: number, cx: number, cy: number, width: number, height: number) {
  let world = W110;
  if (radius > 800) world = W50 ??= shapes(world50 as unknown as World, 0.04);
  const centre: Pos = [-rotate[0], -rotate[1]];
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(width - cx, cy), Math.hypot(cx, height - cy), Math.hypot(width - cx, height - cy));
  const reach = far >= radius ? Math.PI / 2 : Math.asin(far / radius);
  const keep = (p: { c: Pos; r: number }) => geoDistance(p.c, centre) - p.r < reach + 0.02;
  const land: FeatureCollection<Polygon> = {
    type: "FeatureCollection",
    features: world.land.filter(keep).map((p) => ({ type: "Feature", properties: {}, geometry: p.geom })),
  };
  const borders: MultiLineString = { type: "MultiLineString", coordinates: world.borders.filter(keep).map((p) => p.geom.coordinates) };
  return { land, borders };
}

export type Pt = { x: number; y: number; z: number };

/**
 * Orthographic projection by hand (same maths as d3.geoOrthographic) that also returns depth:
 * z > 0 is the visible hemisphere. `lift` raises the point off the surface (1 = surface).
 */
export function projector(rotate: [number, number], radius: number, cx: number, cy: number) {
  const rot = geoRotation([rotate[0], rotate[1], 0]);
  return (lng: number, lat: number, lift = 1): Pt => {
    const [l, p] = rot([lng, lat]);
    const lr = (l * Math.PI) / 180;
    const pr = (p * Math.PI) / 180;
    const cp = Math.cos(pr);
    return { x: cx + radius * lift * cp * Math.sin(lr), y: cy - radius * lift * Math.sin(pr), z: cp * Math.cos(lr) };
  };
}

/** Angular distance (radians) between a lng/lat and the centre of view. */
export function fromCentre(rotate: [number, number], lng: number, lat: number) {
  return geoDistance([lng, lat], [-rotate[0], -rotate[1]]);
}

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Damped-spring overshoot easing (0 → 1 with a small bounce), as a pure function of t. */
export function pop(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-6.5 * t) * Math.cos(9.5 * t) * (1 - t);
}

/** Country labels: hand-placed like the app's basemap (rank 1 always, 2 from mid zoom, 3 when close). */
export const COUNTRY_LABELS: { name: string; lng: number; lat: number; rank: 1 | 2 | 3 }[] = [
  { name: "Greenland", lng: -41, lat: 72.5, rank: 1 },
  { name: "Russia", lng: 96, lat: 61.5, rank: 1 },
  { name: "Canada", lng: -104, lat: 58, rank: 1 },
  { name: "United States", lng: -99, lat: 39.5, rank: 1 },
  { name: "Brazil", lng: -52, lat: -10, rank: 1 },
  { name: "China", lng: 103, lat: 34.5, rank: 1 },
  { name: "India", lng: 78.5, lat: 22, rank: 1 },
  { name: "Australia", lng: 134, lat: -25, rank: 1 },
  { name: "Kazakhstan", lng: 67, lat: 48, rank: 1 },
  { name: "Argentina", lng: -65, lat: -35, rank: 1 },
  { name: "Algeria", lng: 2.6, lat: 28, rank: 2 },
  { name: "Libya", lng: 17.5, lat: 27, rank: 2 },
  { name: "Egypt", lng: 30, lat: 26.5, rank: 2 },
  { name: "Saudi Arabia", lng: 44.5, lat: 24, rank: 2 },
  { name: "Mongolia", lng: 103, lat: 46.5, rank: 2 },
  { name: "Mexico", lng: -102, lat: 24, rank: 2 },
  { name: "Nigeria", lng: 8, lat: 9.6, rank: 2 },
  { name: "Ethiopia", lng: 39.5, lat: 8.6, rank: 2 },
  { name: "Angola", lng: 17.6, lat: -12.3, rank: 2 },
  { name: "Tanzania", lng: 34.8, lat: -6.4, rank: 2 },
  { name: "South Africa", lng: 24, lat: -30, rank: 2 },
  { name: "Madagascar", lng: 46.8, lat: -19.5, rank: 2 },
  { name: "Iran", lng: 54, lat: 32.5, rank: 2 },
  { name: "Turkey", lng: 35, lat: 39, rank: 2 },
  { name: "Morocco", lng: -6.5, lat: 31.6, rank: 2 },
  { name: "Mauritania", lng: -10.5, lat: 20.5, rank: 2 },
  { name: "Peru", lng: -75, lat: -9.5, rank: 2 },
  { name: "Colombia", lng: -73, lat: 4, rank: 2 },
  { name: "Indonesia", lng: 117, lat: -1.5, rank: 2 },
  { name: "Japan", lng: 138.5, lat: 37.3, rank: 2 },
  { name: "Spain", lng: -3.6, lat: 40.2, rank: 3 },
  { name: "France", lng: 2.4, lat: 46.6, rank: 3 },
  { name: "Germany", lng: 10.4, lat: 51.1, rank: 3 },
  { name: "Italy", lng: 12.8, lat: 42.6, rank: 3 },
  { name: "Poland", lng: 19.4, lat: 52.1, rank: 3 },
  { name: "Ukraine", lng: 31.2, lat: 49, rank: 3 },
  { name: "Belarus", lng: 28, lat: 53.6, rank: 3 },
  { name: "Sweden", lng: 15.5, lat: 62.5, rank: 3 },
  { name: "Norway", lng: 9, lat: 61.5, rank: 3 },
  { name: "Finland", lng: 26, lat: 63.5, rank: 3 },
  { name: "United Kingdom", lng: -2.2, lat: 53.6, rank: 3 },
  { name: "Portugal", lng: -8.2, lat: 39.7, rank: 3 },
  { name: "Greece", lng: 22.5, lat: 39.4, rank: 3 },
  { name: "Romania", lng: 25, lat: 45.9, rank: 3 },
  { name: "Pakistan", lng: 69.3, lat: 29.8, rank: 3 },
  { name: "Thailand", lng: 101, lat: 15.5, rank: 3 },
];
