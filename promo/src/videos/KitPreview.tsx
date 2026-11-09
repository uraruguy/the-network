import { AbsoluteFill } from "remotion";
import { Avatar } from "../kit/Avatar";
import { Headline } from "../kit/Headline";
import { Logo } from "../kit/Logo";
import { DarkStage } from "../kit/Stage";
import { IPhone } from "../devices/IPhone";
import { DUE } from "../data/demo";

/** Smoke test for the kit: tokens, fonts, Tailwind utilities, device frame, avatar, headline. */
export function KitPreview() {
  return (
    <DarkStage>
      <AbsoluteFill style={{ padding: 120, flexDirection: "row", alignItems: "center", gap: 120 }}>
        <div>
          <Logo size={96} />
          <Headline at={0} kicker="01 · Follow-ups" lines={["Never forget", [{ text: "to " }, { text: "reach out.", accent: true }]]} sub="Today shows who's due and who you haven't talked to in a while." />
        </div>
        <div style={{ transform: "scale(1.05)" }}>
          <IPhone>
            <div className="app-bg" style={{ position: "absolute" }} />
            <div className="px-4 pt-[64px]">
              <div className="text-footnote font-semibold tracking-wide text-fg-3 uppercase">Friday 30 October</div>
              <div className="text-large-title text-fg">Good afternoon, Alex</div>
              <div className="surface mt-4 rounded-lg p-1.5">
                {DUE.map((f) => (
                  <div key={f.name} className="flex items-center gap-3 rounded-md px-3 py-2.5">
                    <span className="size-[22px] rounded-full border-[1.5px] border-fg-4" />
                    <Avatar name={f.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between"><span className="text-headline text-fg">{f.name}</span><span className="text-footnote text-accent-text">{f.when}</span></div>
                      <div className="truncate text-subhead text-fg-2">{f.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="glass specular mt-4 rounded-full px-4 py-3 text-body text-fg-3">Who did you meet? Jot it down…</div>
            </div>
          </IPhone>
        </div>
      </AbsoluteFill>
    </DarkStage>
  );
}
