import type { ReactNode, Ref } from "react";
import { PHONE_W } from "../../devices/IPhone";
import { ASK } from "../../data/demo";
import { EASE, clamp01, progress, springAt, SPRINGS, tween, typed } from "../../kit/motion";
import { ChatScreen } from "../../ui/phone/ChatScreen";
import { GlobeScreen } from "../../ui/phone/GlobeScreen";
import { HomeIndicator, Tap, TabBar } from "../../ui/phone/parts";
import { PeopleScreen } from "../../ui/phone/PeopleScreen";
import { PersonScreen, type Filed } from "../../ui/phone/PersonScreen";
import { TodayScreen } from "../../ui/phone/TodayScreen";
import { B, LANDING, landAt } from "./beats";
import { CLUSTER_ANGLE, RAISE, arcsAt, globeRotation } from "./GlobeBreakout";

/** iOS push: `from` slides 30% left and dims, `to` slides in from the right with an edge shadow. `reverse` pops. */
function Push({ t, from, to, reverse = false }: { t: number; from: ReactNode; to: ReactNode; reverse?: boolean }) {
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
export const GLOBE_TAB: [number, number] = [201, 809];
export const CHAT_TAB: [number, number] = [273, 809];
export const QUERY = "jose";

/** What has landed on John's card by `frame` (0→1 per section) and how bright its flash is. */
export function filedAt(frame: number): { filed: Filed; glow: Filed } {
  const filed = {} as Filed;
  const glow = {} as Filed;
  LANDING.forEach((k, i) => {
    const land = landAt(i);
    filed[k] = progress(frame, land - 2, 14, EASE.ios);
    glow[k] = frame < land ? 0 : (frame - land) / 12;
  });
  return { filed, glow };
}

/** The phone's screen at any frame: which screen, its animation state, in-app transitions, taps. */
export function PhoneContent({ frame, personRef, personScroll = 0 }: { frame: number; personRef?: Ref<HTMLDivElement>; personScroll?: number }) {
  const today = (
    <TodayScreen
      tab={-1}
      stats={1}
      done={progress(frame, B.saraDone, 22, EASE.out)}
      fold={progress(frame, B.saraFold, 18, EASE.inOut)}
      toast={springAt(frame, B.toast, SPRINGS.snappy)}
      captureLifted={frame >= B.lift - 4 ? 1 : 0}
    />
  );
  const { filed, glow } = filedAt(frame);
  const person = <PersonScreen tab={-1} rootRef={personRef} filed={filed} glow={glow} scrollY={personScroll} />;

  let screen: ReactNode;
  let tab = 0;
  if (frame < B.pushToCard) {
    screen = today;
  } else if (frame < B.pushToCard + 30) {
    const t = progress(frame, B.pushToCard, 30, EASE.ios);
    screen = <Push t={t} from={today} to={person} />;
    tab = t;
  } else if (frame < B.popToPeople) {
    screen = person;
    tab = 1;
  } else if (frame < B.popToPeople + 30) {
    screen = <Push reverse t={progress(frame, B.popToPeople, 30, EASE.ios)} from={person} to={people(frame)} />;
    tab = 1;
  } else if (frame < B.globeSwap) {
    screen = people(frame);
    tab = 1;
  } else if (frame < B.chatSwap) {
    // Tab swaps are instant on the tap's release frame; only the pill slides.
    screen = globe(frame);
    tab = 1 + progress(frame, B.globeSwap, 14, EASE.out);
  } else {
    screen = chat(frame);
    tab = 2 + progress(frame, B.chatSwap, 14, EASE.out);
  }

  // The tab bar slides away while the globe is out of the phone, and back when it returns.
  const barOut = frame >= B.breakout && frame < B.chatSwap ? progress(frame, B.breakout, 30, EASE.in) * (1 - progress(frame, B.globeExit + 6, 24, EASE.out)) : 0;
  return (
    <>
      {screen}
      <TabBar active={tab} y={barOut * 120} />
      <HomeIndicator />
      <Tap x={TODAY_SARA_CHECK[0]} y={TODAY_SARA_CHECK[1]} t={frame - B.saraTap} hold={8} />
      <Tap x={PEOPLE_SEARCH[0]} y={PEOPLE_SEARCH[1]} t={frame - B.searchTap} hold={6} />
      <Tap x={GLOBE_TAB[0]} y={GLOBE_TAB[1]} t={frame - B.globeTap} hold={B.globeSwap - B.globeTap} />
      <Tap x={CHAT_TAB[0]} y={CHAT_TAB[1]} t={frame - B.chatTap} hold={B.chatSwap - B.chatTap} />
      <Tap x={362} y={740} t={frame - B.askSend} hold={5} />
    </>
  );
}

function people(frame: number) {
  let query = "";
  let prev = "";
  let k = 1;
  B.typeAt.slice(0, QUERY.length).forEach((f, i) => {
    if (frame >= f) {
      prev = QUERY.slice(0, i);
      query = QUERY.slice(0, i + 1);
      k = progress(frame, f, 10, EASE.inOut);
    }
  });
  return <PeopleScreen tab={-1} frame={frame} query={query} prevQuery={prev} k={k} caret={frame >= B.searchTap + 4} focused={progress(frame, B.searchTap + 2, 8)} />;
}

function globe(frame: number) {
  return (
    <GlobeScreen
      tab={-1}
      rotate={globeRotation(frame)}
      reveal={progress(frame, B.globeSwap + 4, 40, EASE.out)}
      globeHidden={frame >= B.breakout && frame < B.globeBack}
      globeOpacity={frame >= B.globeBack ? progress(frame, B.globeBack, B.globeHome - B.globeBack, (q) => q) : 1}
      chromeOut={progress(frame, B.breakout - 8, 24, EASE.in) * (1 - progress(frame, B.globeExit + 4, 24, EASE.out))}
      arcs={arcsAt(frame)}
      clusterAngle={CLUSTER_ANGLE}
      raise={RAISE}
    />
  );
}

function chat(frame: number) {
  const p1 = B.askSent + 12;
  const p2 = B.askSent + 24;
  const pills = [
    { label: "Searching people", doneLabel: "Searched people", detail: "3 people", t: clamp01((frame - p1) / 8), done: frame >= p1 + 28 },
    { label: "Reading notes", doneLabel: "Read notes", detail: "4 notes", t: clamp01((frame - p2) / 8), done: frame >= p2 + 28 },
  ];
  return (
    <ChatScreen
      tab={-1}
      frame={frame}
      draft={frame < B.askSent ? typed(ASK.question, frame, B.askType, 52) : ""}
      caret={frame < B.askSent}
      sent={springAt(frame, B.askSent, SPRINGS.snappy)}
      tools={frame >= p1 ? pills : []}
      answer={progress(frame, B.answer, 18, EASE.inOut)}
      chars={Math.floor(Math.max(0, frame - B.answer - 2) * 1.8)}
      rows={tween(frame, [B.answer + 18, B.answer + 54], [0, 3], (t) => t)}
    />
  );
}
