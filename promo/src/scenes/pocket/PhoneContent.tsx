import type { ReactNode, Ref } from "react";
import { PHONE_W } from "../../devices/IPhone";
import { ASK } from "../../data/demo";
import { EASE, clamp01, progress, springAt, SPRINGS, tween, typed } from "../../kit/motion";
import { ChatScreen } from "../../ui/phone/ChatScreen";
import { GlobeScreen } from "../../ui/phone/GlobeScreen";
import { HomeIndicator, Tap, TabBar } from "../../ui/phone/parts";
import { PeopleScreen } from "../../ui/phone/PeopleScreen";
import { PersonScreen } from "../../ui/phone/PersonScreen";
import { TodayScreen } from "../../ui/phone/TodayScreen";
import { BREAK_AT, globeRotation } from "./GlobeBreakout";

/** iOS push: `from` slides 30% left and dims, `to` slides in from the right with an edge shadow. */
function Push({ t, from, to, reverse = false }: { t: number; from: ReactNode; to: ReactNode; reverse?: boolean }) {
  // reverse = pop: `from` (the detail) slides out to the right, `to` (the list) comes back from -30%.
  const a = reverse
    ? { transform: `translateX(${t * PHONE_W}px)`, boxShadow: `-12px 0 30px rgba(0,30,40,${0.18 * (1 - t)})` }
    : { transform: `translateX(${-0.3 * t * PHONE_W}px)`, filter: `brightness(${1 - 0.06 * t})` };
  const b = reverse
    ? { transform: `translateX(${-0.3 * (1 - t) * PHONE_W}px)`, filter: `brightness(${1 - 0.06 * (1 - t)})` }
    : { transform: `translateX(${(1 - t) * PHONE_W}px)`, boxShadow: `-12px 0 30px rgba(0,30,40,${0.18 * t})` };
  return (
    <>
      <div style={{ position: "absolute", inset: 0, zIndex: reverse ? 2 : 1, ...a }}>{from}</div>
      <div style={{ position: "absolute", inset: 0, zIndex: reverse ? 1 : 2, ...b }}>{to}</div>
    </>
  );
}

export const TODAY_SARA_CHECK: [number, number] = [44, 435];
export const PEOPLE_SEARCH: [number, number] = [150, 165];
export const PERSON_BACK: [number, number] = [52, 82];
export const QUERY = "aljaz";
export const QUERY_AT = [1012, 1020, 1028, 1036, 1044];

/** The screen of the phone at any frame: which screen, its animation state, in-app transitions. */
export function PhoneContent({ frame, personRef, personScroll }: { frame: number; personRef?: Ref<HTMLDivElement>; personScroll: number }) {
  // ---- Today (0–735) ------------------------------------------------------
  const today = (
    <TodayScreen
      tab={-1}
      stats={progress(frame, 196, 60, EASE.out)}
      done={progress(frame, 305, 22, EASE.out)}
      fold={progress(frame, 330, 24, EASE.ios)}
      toast={springAt(frame, 342, SPRINGS.snappy) * (1 - progress(frame, 432, 14, EASE.in))}
      captureLifted={frame >= 424 && frame < 700 ? 1 : 0}
    />
  );
  const person = <PersonScreen tab={-1} scrollY={personScroll} rootRef={personRef} />;

  let screen: ReactNode;
  let tab = 0;
  if (frame < 700) {
    screen = today;
  } else if (frame < 736) {
    const t = progress(frame, 700, 34, EASE.ios);
    screen = <Push t={t} from={today} to={person} />;
    tab = t;
  } else if (frame < 972) {
    screen = person;
    tab = 1;
  } else if (frame < 1006) {
    const t = progress(frame, 972, 32, EASE.ios);
    screen = <Push reverse t={t} from={person} to={people(frame)} />;
    tab = 1;
  } else if (frame < 1160) {
    screen = people(frame);
    tab = 1;
  } else if (frame < 1182) {
    const t = progress(frame, 1160, 20, EASE.out);
    screen = (
      <>
        {people(frame)}
        <div style={{ position: "absolute", inset: 0, opacity: t }}>{globe(frame)}</div>
      </>
    );
    tab = 1 + progress(frame, 1158, 22, EASE.ios);
  } else if (frame < 1400) {
    screen = globe(frame);
    tab = 2;
  } else {
    screen = chat(frame);
    tab = 3;
  }

  const barOut = frame >= 1236 && frame < 1400 ? progress(frame, 1236, 30, EASE.in) : 0;
  return (
    <>
      {screen}
      <TabBar active={tab} y={barOut * 120} />
      <HomeIndicator />
      <Tap x={TODAY_SARA_CHECK[0]} y={TODAY_SARA_CHECK[1]} t={frame - 298} hold={9} />
      <Tap x={PERSON_BACK[0]} y={PERSON_BACK[1]} t={frame - 962} hold={8} />
      <Tap x={PEOPLE_SEARCH[0]} y={PEOPLE_SEARCH[1]} t={frame - 1000} hold={7} />
      <Tap x={362} y={740} t={frame - 1519} hold={6} />
    </>
  );
}

function people(frame: number) {
  let query = "";
  let prev = "";
  let k = 1;
  QUERY_AT.forEach((f, i) => {
    if (frame >= f) {
      prev = QUERY.slice(0, i);
      query = QUERY.slice(0, i + 1);
      k = progress(frame, f, 12, EASE.ios);
    }
  });
  return <PeopleScreen tab={-1} frame={frame} query={query} prevQuery={prev} k={k} caret={frame >= 1004} focused={progress(frame, 1002, 8)} />;
}

function globe(frame: number) {
  return (
    <GlobeScreen
      tab={-1}
      rotate={globeRotation(frame)}
      reveal={progress(frame, 1176, 46, EASE.out)}
      globeHidden={frame >= BREAK_AT}
      chromeOut={progress(frame, 1226, 26, EASE.in)}
    />
  );
}

function chat(frame: number) {
  const q = ASK.question;
  const draft = frame < 1524 ? typed(q, frame, 1480, 52) : "";
  const pills = [
    { label: "Searching people", doneLabel: "Searched people", detail: "3 people", t: clamp01((frame - 1538) / 8), done: frame >= 1570 },
    { label: "Reading notes", doneLabel: "Read notes", detail: "4 notes", t: clamp01((frame - 1552) / 8), done: frame >= 1584 },
  ];
  return (
    <ChatScreen
      tab={-1}
      frame={frame}
      draft={draft}
      caret={frame >= 1472 && frame < 1524}
      sent={springAt(frame, 1524, SPRINGS.snappy)}
      tools={frame >= 1538 ? pills : []}
      answer={progress(frame, 1580, 14, EASE.out)}
      chars={Math.floor(Math.max(0, frame - 1584) * 1.8)}
      rows={tween(frame, [1600, 1636], [0, 3], (t) => t)}
    />
  );
}
