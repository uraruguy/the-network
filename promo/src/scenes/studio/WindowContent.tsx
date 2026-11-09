import { DUE } from "../../data/demo";
import { EASE, SPRINGS, progress, springAt, tween, typed } from "../../kit/motion";
import { Globe } from "../../ui/common/Globe";
import { ChatPage, QUESTION, type Pill } from "../../ui/desktop/Chat";
import { GlobePage } from "../../ui/desktop/GlobePage";
import { HL_COUNT, ImportSheet, PROPOSALS } from "../../ui/desktop/ImportSheet";
import { PeoplePage, ROWS, matches } from "../../ui/desktop/People";
import { DesktopShell } from "../../ui/desktop/Shell";
import { TodayPage, Toast } from "../../ui/desktop/Today";
import { COUNTER_LANDS } from "./Bloom";
import type { Theme } from "./World";

const SEARCH = "lisbon";
const TYPE_AT = 670;
const TYPE_CPS = 13;
const ASK_TYPE_AT = 1086;
const ASK_CPS = 40;
/** Page switches happen inside whip moves (peak motion blur). */
const TO_PEOPLE = 660;
const TO_GLOBE = 798;
const TO_CHAT = 1098;

/** Globe page geometry (main-area space) and rotation; shared with the cursor and the flip. */
export const GLOBE = { w: 1204, h: 900, cx: 520, cy: 500, r: 400 };
export function globeRotate(frame: number): [number, number] {
  const a = tween(frame, [TO_GLOBE, 852], [0, 1], EASE.inOut);
  const drift = tween(frame, [852, 1110], [0, 1], (t) => t);
  return [40 + (-5 - 40) * a - 6 * drift, -25 + (-40 + 25) * a + 2 * drift];
}
export const LISBON = { lng: -9.1393, lat: 38.7223 };
const ARCS: [string, number][] = [
  ["New York City", 928],
  ["Toronto", 932],
  ["Cape Town", 936],
  ["Dubai", 940],
  ["Copenhagen", 944],
  ["Delhi", 948],
];
export const arcsAt = (frame: number) => ARCS.map(([to, at]) => ({ to, progress: tween(frame, [at, at + 40], [0, 1], EASE.inOut) }));

/** People count: 285, then 286 once the import's new person lands in the tile. */
const peopleAt = (frame: number) => (frame >= 606 ? 286 : 285);

function navIndex(frame: number) {
  return frame < TO_PEOPLE ? 0 : frame < TO_GLOBE ? 1 : frame < TO_CHAT ? 2 : 3;
}

function importState(frame: number) {
  const open = springAt(frame, 370, SPRINGS.smooth) - tween(frame, [578, 596], [0, 1], EASE.in);
  return {
    open: Math.max(0, Math.min(1, open)),
    hl: Array.from({ length: HL_COUNT }, (_, i) => progress(frame, 392 + i * 8, 12, EASE.out)),
    reading: frame >= 388 && frame < 446,
    // One name in the air at a time.
    lift: PROPOSALS.map((_, i) => progress(frame, 446 + i * 16, 16, EASE.inOut)),
    text: progress(frame, 450, 12, EASE.in),
    cards: progress(frame, 464, 16, EASE.out),
    savePress: Math.max(0, 1 - Math.abs(frame - 570) / 6),
    file: PROPOSALS.map((_, i) => progress(frame, 576 + i * 6, 30, EASE.inOut)),
    frame,
  };
}

function peopleCollapse(frame: number) {
  // Each row folds away the moment the typed prefix stops matching it.
  const out: Record<string, number> = {};
  for (const p of ROWS) {
    let stop = -1;
    for (let k = 1; k <= SEARCH.length; k++) {
      if (!matches(p, SEARCH.slice(0, k))) {
        stop = TYPE_AT + Math.ceil(((k - 1) / TYPE_CPS) * 60);
        break;
      }
    }
    out[p.name] = stop < 0 ? 0 : progress(frame, stop + 2, 14, EASE.ios);
  }
  return out;
}

/** What the app window shows at `frame`: pages, the import sheet and toasts. */
export function WindowContent({ frame, theme }: { frame: number; theme: Theme }) {
  const sara = { check: progress(frame, 290, 18, EASE.out), collapse: progress(frame, 316, 24, EASE.ios) };
  const due = 3 - (sara.collapse > 0.5 ? 1 : 0);
  const people = peopleAt(frame);
  const bump = Math.max(0, Math.sin(Math.PI * tween(frame, [604, 628], [0, 1], (t) => t)));
  const saved = tween(frame, [596, 612], [0, 1], EASE.out) - tween(frame, [652, 662], [0, 1], EASE.in);

  const query = frame < TYPE_AT ? "" : typed(SEARCH, frame, TYPE_AT, TYPE_CPS);
  const rot = globeRotate(frame);

  const sent = springAt(frame, 1142, SPRINGS.smooth);
  const pills: { p: Pill; appear: number }[] = [];
  if (frame >= 1150) pills.push({ p: { label: frame < 1166 ? "Searching people" : "Searched people", detail: "3 people", state: frame < 1166 ? "running" : "done" }, appear: springAt(frame, 1150, SPRINGS.snappy) });
  if (frame >= 1160) pills.push({ p: { label: frame < 1178 ? "Reading notes" : "Read notes", detail: "4 notes", state: frame < 1178 ? "running" : "done" }, appear: springAt(frame, 1160, SPRINGS.snappy) });
  const answer = frame >= 1180 ? { lead: springAt(frame, 1180, SPRINGS.smooth), rows: [1188, 1198, 1208].map((a) => springAt(frame, a, SPRINGS.smooth)), tail: springAt(frame, 1222, SPRINGS.smooth) } : null;

  const page = navIndex(frame);
  return (
    <DesktopShell active={page} overlay={frame >= 364 && frame < 640 ? <ImportSheet s={importState(frame)} /> : null}>
      {page === 0 && <TodayPage rows={{ [DUE[0]!.name]: sara }} stats={{ people, cities: 79, due }} peopleBump={bump} hidePeople={frame < COUNTER_LANDS} imported={frame >= 600} />}
      {page === 1 && (
        <PeoplePage
          total={people}
          query={query}
          caret={frame < 760 && Math.floor(frame / 30) % 2 === 0}
          focused={frame < 770}
          filter={1}
          collapse={peopleCollapse(frame)}
        />
      )}
      {page === 2 && (
        <GlobePage
          count={`${people} people · 79 cities`}
          panel={springAt(frame, 856, SPRINGS.smooth)}
          panelWidth={300}
          globe={
            <div className="absolute inset-0" style={{ filter: theme === "light" ? "saturate(1.45) contrast(1.08)" : undefined }}>
              <Globe
                width={GLOBE.w}
                height={GLOBE.h}
                radius={GLOBE.r}
                center={[GLOBE.cx, GLOBE.cy]}
                rotate={rot}
                theme={theme}
                home="Lisbon"
                reveal={tween(frame, [802, 850], [0, 1], (t) => t)}
                focus={frame >= 852 ? "Lisbon" : undefined}
                clusterRadius={46}
                arcs={arcsAt(frame)}
              />
            </div>
          }
        />
      )}
      {page === 3 && <ChatPage showEmpty={false} typed={typed(QUESTION, frame, ASK_TYPE_AT, ASK_CPS)} caret={frame < 1142 && Math.floor(frame / 24) % 2 === 0} sent={sent} pills={pills} answer={answer} frame={frame} sendPress={Math.max(0, 1 - Math.abs(frame - 1140) / 5)} />}
      {saved > 0 && (
        <Toast
          icon="success"
          title="Saved to Inês Sampaio"
          description="1 new person · 1 reminder"
          action="Open note"
          style={{ right: "auto", left: "50%", bottom: 40, opacity: saved, transform: `translateX(-50%) translateY(${(1 - saved) * 24}px) scale(${1.5 * (0.96 + 0.04 * saved)})`, transformOrigin: "50% 100%" }}
        />
      )}
    </DesktopShell>
  );
}
