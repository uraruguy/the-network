import { DUE } from "../../data/demo";
import { EASE, SPRINGS, progress, springAt, tween, typed } from "../../kit/motion";
import { Globe } from "../../ui/common/Globe";
import { ANSWER_LEN, ChatPage, QUESTION, type Pill } from "../../ui/desktop/Chat";
import { GlobePage } from "../../ui/desktop/GlobePage";
import { HL_COUNT, ImportSheet, PROPOSALS } from "../../ui/desktop/ImportSheet";
import { PeoplePage, ROWS, matches } from "../../ui/desktop/People";
import { PersonPage } from "../../ui/desktop/Person";
import { DesktopShell } from "../../ui/desktop/Shell";
import { TodayPage, Toast } from "../../ui/desktop/Today";
import type { Theme } from "./World";

export const SEARCH = "lisbon";
export const TYPE_AT = 852;
export const TYPE_CPS = 11;
export const ASK_TYPE_AT = 1402;
export const ASK_CPS = 54;

/** Globe page geometry (main-area space) and rotation over time; shared with the cursor. */
export const GLOBE = { w: 1204, h: 900, cx: 640, cy: 480, r: 330 };
export function globeRotate(frame: number): [number, number] {
  const a = tween(frame, [1084, 1178], [0, 1], EASE.inOut);
  const drift = tween(frame, [1178, 1400], [0, 1], (t) => t);
  return [-14 + (9.14 + 14) * a - 3 * drift, -44 + (44 - 38.7) * a + 1 * drift];
}

const fade = (frame: number, a: number, b: number) => tween(frame, [a, b], [0, 1], EASE.out);

/** Nav pill index over time (springs between items on each sidebar click). */
function navIndex(frame: number) {
  return springAt(frame, 812, SPRINGS.smooth) + springAt(frame, 1080, SPRINGS.smooth) + springAt(frame, 1386, SPRINGS.smooth);
}

function importState(frame: number) {
  const open = springAt(frame, 506, SPRINGS.smooth) - tween(frame, [756, 772], [0, 1], EASE.in);
  const hl = Array.from({ length: HL_COUNT }, (_, i) => progress(frame, 606 + i * 8, 12, EASE.out));
  return {
    open: Math.max(0, Math.min(1, open)),
    step: (frame < 596 ? "paste" : frame < 662 ? "reading" : "review") as "paste" | "reading" | "review",
    pasted: progress(frame, 556, 12, EASE.out),
    scan: tween(frame, [600, 652], [0, 1], EASE.inOut),
    hl,
    morph: progress(frame, 660, 20, EASE.ios),
    cards: PROPOSALS.map((_, i) => springAt(frame, 668 + i * 11, SPRINGS.smooth)),
    scroll: tween(frame, [700, 742], [0, 300], EASE.inOut),
    savePress: Math.max(0, 1 - Math.abs(frame - 752) / 6),
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
    out[p.name] = stop < 0 ? 0 : progress(frame, stop + 2, 16, EASE.ios);
  }
  return out;
}

/** What the app window shows at `frame`: pages, page transitions, dialogs and toasts. */
export function WindowContent({ frame, theme }: { frame: number; theme: Theme }) {
  const max = { check: progress(frame, 330, 20, EASE.out), collapse: progress(frame, 352, 24, EASE.ios) };
  const sara = { check: progress(frame, 466, 16, EASE.out), collapse: progress(frame, 484, 24, EASE.ios) };
  const done = (max.collapse > 0.5 ? 1 : 0) + (sara.collapse > 0.5 ? 1 : 0);
  const doneToast = fade(frame, 352, 372) - tween(frame, [430, 446], [0, 1], EASE.in);
  const savedToast = fade(frame, 772, 792) - tween(frame, [846, 862], [0, 1], EASE.in);

  const todayOut = tween(frame, [814, 830], [0, 1], EASE.out);
  const peopleIn = tween(frame, [818, 836], [0, 1], EASE.out);
  const push = tween(frame, [904, 930], [0, 1], EASE.ios);
  const personOut = tween(frame, [1082, 1098], [0, 1], EASE.out);
  const globeIn = tween(frame, [1084, 1104], [0, 1], EASE.out);
  const globeOut = tween(frame, [1388, 1404], [0, 1], EASE.out);
  const chatIn = tween(frame, [1390, 1408], [0, 1], EASE.out);

  const query = frame < TYPE_AT ? "" : typed(SEARCH, frame, TYPE_AT, TYPE_CPS);
  const collapse = peopleCollapse(frame);

  const offline = frame >= 1318 && frame < 1356;
  const sync = offline ? "Offline · 2 changes waiting to sync" : frame >= 1356 && frame < 1372 ? "Syncing 2 changes…" : "Synced";
  const syncTone = offline ? "offline" : frame >= 1356 && frame < 1372 ? "waiting" : "ok";

  const askTyped = typed(QUESTION, frame, ASK_TYPE_AT, ASK_CPS);
  const sent = springAt(frame, 1448, SPRINGS.smooth);
  const pills: { p: Pill; appear: number }[] = [];
  if (frame >= 1456) pills.push({ p: { label: frame < 1474 ? "Searching people" : "Searched people", detail: "3 people", state: frame < 1474 ? "running" : "done" }, appear: springAt(frame, 1456, SPRINGS.snappy) });
  if (frame >= 1468) pills.push({ p: { label: frame < 1486 ? "Reading notes" : "Read notes", detail: "4 notes", state: frame < 1486 ? "running" : "done" }, appear: springAt(frame, 1468, SPRINGS.snappy) });
  const answer = Math.round(tween(frame, [1488, 1532], [0, ANSWER_LEN], (t) => t));

  const rot = globeRotate(frame);
  const arc = (to: string, at: number) => ({ to, progress: tween(frame, [at, at + 44], [0, 1], EASE.inOut) });

  return (
    <DesktopShell active={navIndex(frame)} sync={sync} syncTone={syncTone}>
      {frame < 832 && (
        <div className="absolute inset-0" style={{ opacity: 1 - todayOut }}>
          <TodayPage rows={{ [DUE[1]!.name]: max, [DUE[0]!.name]: sara }} stats={{ people: 285, cities: 79, due: 3 - done }} />
        </div>
      )}
      {frame >= 816 && frame < 932 && (
        <div className="absolute inset-0" style={{ opacity: peopleIn * (1 - push * 0.6), transform: `translateX(${-push * 30}%) scale(${0.985 + 0.015 * peopleIn})` }}>
          <PeoplePage query={query} caret={frame >= 846 && frame < 900 && Math.floor(frame / 30) % 2 === 0} focused={frame >= 846 && frame < 904} filter={1} collapse={collapse} hoverRow={{ name: "Inês Sampaio", v: tween(frame, [886, 896], [0, 1]) }} />
        </div>
      )}
      {frame >= 904 && frame < 1100 && (
        <div className="absolute inset-0" style={{ opacity: 1 - personOut, transform: `translateX(${(1 - push) * 100}%)`, boxShadow: push < 1 ? "-20px 0 40px -20px rgba(0,30,40,0.25)" : undefined }}>
          <PersonPage scroll={tween(frame, [958, 1040], [0, 560], EASE.inOut)} avatarIn={1} />
        </div>
      )}
      {frame >= 1082 && frame < 1406 && (
        <div className="absolute inset-0" style={{ opacity: globeIn * (1 - globeOut) }}>
          <GlobePage
            panel={springAt(frame, 1180, SPRINGS.smooth)}
            globe={
              <Globe
                width={GLOBE.w}
                height={GLOBE.h}
                radius={GLOBE.r}
                center={[GLOBE.cx, GLOBE.cy]}
                rotate={rot}
                theme={theme}
                reveal={tween(frame, [1088, 1150], [0, 1], (t) => t)}
                focus={frame >= 1176 ? "Lisbon" : undefined}
                arcs={[arc("Lisbon", 1186), arc("London", 1192), arc("New York City", 1198), arc("Copenhagen", 1204)]}
              />
            }
          />
        </div>
      )}
      {frame >= 1388 && (
        <div className="absolute inset-0" style={{ opacity: chatIn, transform: `scale(${0.985 + 0.015 * chatIn})` }}>
          <ChatPage typed={askTyped} caret={frame >= 1396 && frame < 1448 && Math.floor(frame / 24) % 2 === 0} sent={sent} pills={pills} answer={answer} frame={frame} sendPress={Math.max(0, 1 - Math.abs(frame - 1446) / 5)} />
        </div>
      )}
      {frame >= 500 && frame < 776 && <ImportSheet s={importState(frame)} />}
      {doneToast > 0 && (
        <Toast title="Done ·" who="Max Larsen" description="Ask how the Copenhagen move went" action="Undo" style={{ opacity: doneToast, transform: `translateY(${(1 - doneToast) * 24}px) scale(${0.96 + 0.04 * doneToast})` }} />
      )}
      {savedToast > 0 && (
        <Toast icon="success" title="Saved to Inês Sampaio" description="1 new person · 1 reminder" action="Open note" style={{ opacity: savedToast, transform: `translateY(${(1 - savedToast) * 24}px) scale(${0.96 + 0.04 * savedToast})` }} />
      )}
    </DesktopShell>
  );
}
