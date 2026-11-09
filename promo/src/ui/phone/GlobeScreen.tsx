import { ChevronDown, Globe2, Home, Info, MapPinOff, Minus, Plus, Search, Share2 } from "lucide-react";
import { STATS } from "../../data/demo";
import { Globe } from "../common/Globe";
import { HomeIndicator, SAT, Screen, TabBar } from "./parts";
import { PHONE_W } from "../../devices/IPhone";

/** Where the in-phone globe sits (screen pt), so a scene can lift it out of the phone exactly. */
export const PHONE_GLOBE = { cx: PHONE_W / 2, cy: 512, r: 218 };

export type GlobeScreenProps = {
  rotate: [number, number];
  reveal?: number;
  /** Hide the in-phone globe (a canvas-level globe has taken its place). */
  globeHidden?: boolean;
  /** 0→1: the map chrome fades away (the globe is about to break out). */
  chromeOut?: number;
  tab?: number;
};

/** The Globe tab on a phone (GlobeView: MapHeader, ViewSwitch, map FilterBar, controls), faithful to docs/screenshots/globe.jpg. */
export function GlobeScreen({ rotate, reveal = 1, globeHidden = false, chromeOut = 0, tab = 2 }: GlobeScreenProps) {
  const c = 1 - chromeOut;
  return (
    <Screen style={{ background: "var(--bg)" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 45%, var(--bg) 0%, var(--bg-2) 100%)" }} />
      {!globeHidden && (
        <Globe width={402} height={874} radius={PHONE_GLOBE.r} center={[PHONE_GLOBE.cx, PHONE_GLOBE.cy]} rotate={rotate} theme="light" reveal={reveal} labels uiScale={0.92} atmosphere={0.7} />
      )}
      <div className="absolute inset-x-0 top-0 z-10 px-3" style={{ paddingTop: SAT + 10 - 24, opacity: c, transform: `translateY(${-14 * chromeOut}px)` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="glass-map specular min-w-0 rounded-lg px-4 py-2">
            <h1 className="text-title3 leading-tight text-fg">Globe</h1>
            <p className="truncate text-footnote text-fg-2 tabular-nums">
              {STATS.people} people · {STATS.cities} cities
            </p>
          </div>
          <div className="glass-map specular flex rounded-full p-1">
            <span className="grid h-9 w-11 place-items-center rounded-full bg-[var(--segment-thumb)] text-fg shadow-e1">
              <Globe2 size={18} />
            </span>
            <span className="grid h-9 w-11 place-items-center rounded-full text-fg-2">
              <Share2 size={18} />
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-col items-start gap-2">
          <div className="glass-map flex w-full min-w-0 flex-col gap-2 rounded-lg p-2">
            <div className="relative flex h-9 w-full items-center rounded-sm bg-fill-2">
              <Search size={17} strokeWidth={2.2} className="absolute left-3 text-fg-3" />
              <span className="pl-[38px] text-body text-fg-3">Search people</span>
            </div>
            <div className="flex gap-1.5 overflow-hidden">
              {["Category", "Warmth", "Activities", "Tags"].map((l) => (
                <span key={l} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-fill-2 px-3 text-footnote font-medium text-fg-2">
                  {l}
                  <ChevronDown size={14} strokeWidth={2.6} className="-mr-0.5 opacity-70" />
                </span>
              ))}
            </div>
          </div>
          <span className="glass-map inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-footnote font-medium text-fg-2">
            <MapPinOff size={14} strokeWidth={2.2} /> 11 people without a city
          </span>
        </div>
      </div>
      <div className="absolute right-3 z-10 flex flex-col gap-2" style={{ bottom: 98 + 36, opacity: c }}>
        <div className="glass-map specular flex flex-col rounded-full">
          <span className="grid h-11 w-11 place-items-center text-fg-2">
            <Plus size={20} />
          </span>
          <span className="mx-2.5 h-[0.5px] bg-separator" />
          <span className="grid h-11 w-11 place-items-center text-fg-2">
            <Minus size={20} />
          </span>
        </div>
        <div className="glass-map specular flex flex-col rounded-full">
          <span className="grid h-11 w-11 place-items-center text-fg-3">
            <Home size={19} />
          </span>
          <span className="mx-2.5 h-[0.5px] bg-separator" />
          <span className="grid h-11 w-11 place-items-center text-fg-2">
            <Globe2 size={19} />
          </span>
        </div>
      </div>
      <div className="absolute left-2 z-10 inline-flex items-center gap-1.5 rounded-full px-1.5 text-caption2 text-fg-3" style={{ bottom: 98 + 6, opacity: c * 0.9 }}>
        <Info size={13} /> OpenFreeMap © OpenMapTiles Data from OpenStreetMap
      </div>
      {tab >= 0 && <TabBar active={tab} />}
      {tab >= 0 && <HomeIndicator />}
    </Screen>
  );
}
