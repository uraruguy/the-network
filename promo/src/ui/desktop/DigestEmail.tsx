import { Logo } from "../../kit/Logo";
import { DUE, OWNER, TODAY_LABEL } from "../../data/demo";

const ROLE: Record<string, string> = {
  "Sara Rossi": "Designer, Studio Mono",
  "Max Larsen": "Founder, Wise",
  "Valentina Dubois": "Designer",
};

const SANS = '"Inter Variable", -apple-system, sans-serif';

/**
 * The daily digest (src/lib/email/digest.ts) inside a mail viewer: same palette (#0b2426 text,
 * #0fb5ba Done, #e6f8f8 Snooze), 520 px card with 24 px radius. `done` (0..1) per row name shows
 * the one-tap Done being pressed and confirmed.
 */
export function DigestEmail({ done = {}, press = {} }: { done?: Record<string, number>; press?: Record<string, number> }) {
  return (
    <div style={{ width: 620, borderRadius: 22, overflow: "hidden", background: "#fff", boxShadow: "0 0 0 1px rgba(11,36,38,0.08), 0 30px 80px -20px rgba(0,40,50,0.35), 0 12px 30px -12px rgba(0,40,50,0.2)", fontFamily: SANS }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderBottom: "1px solid rgba(11,36,38,0.07)", background: "#fbfefe" }}>
        <Logo size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ font: `600 15px ${SANS}`, color: "#0b2426" }}>The Network</span>
            <span style={{ font: `400 13px ${SANS}`, color: "#7a9295" }}>07:00</span>
          </div>
          <div style={{ font: `500 14px ${SANS}`, color: "#0b2426", marginTop: 1 }}>3 follow-ups today</div>
          <div style={{ font: `400 12.5px ${SANS}`, color: "#7a9295", marginTop: 1 }}>To: {OWNER}</div>
        </div>
      </div>
      <div style={{ background: "#f4fbfb", padding: "22px 26px" }}>
        <div style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(11,36,38,0.08)", borderRadius: 24, padding: "26px 26px 22px" }}>
          <div style={{ font: `700 22px ${SANS}`, letterSpacing: "-0.02em", color: "#0b2426" }}>Good morning, {OWNER}</div>
          <div style={{ font: `400 14px ${SANS}`, color: "#3f5a5c", marginTop: 4 }}>{TODAY_LABEL} · 3 to follow up</div>
          <div style={{ padding: "22px 0 6px", font: `600 12px ${SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "#7a9295" }}>Today</div>
          {DUE.map((r) => {
            const d = done[r.name] ?? 0;
            const p = press[r.name] ?? 0;
            return (
              <div key={r.name} style={{ padding: "14px 0", borderTop: "1px solid rgba(11,36,38,0.08)", opacity: 1 - 0.35 * d }}>
                <div style={{ font: `600 16px ${SANS}`, color: "#0b2426" }}>{r.name}</div>
                <div style={{ font: `400 14px ${SANS}`, color: "#3f5a5c", marginTop: 2 }}>
                  {r.text} · <span style={{ color: "#7a9295" }}>{ROLE[r.name]}</span>
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      font: `600 13px ${SANS}`,
                      color: "#fff",
                      background: d > 0.5 ? "#12a594" : "#0fb5ba",
                      padding: "8px 14px",
                      borderRadius: 999,
                      transform: `scale(${1 - 0.08 * p})`,
                      boxShadow: d > 0.5 ? "0 0 0 4px rgba(18,165,148,0.16)" : undefined,
                    }}
                  >
                    {d > 0.5 ? "✓ Marked done" : "Done ✓"}
                  </span>
                  <span style={{ font: `600 13px ${SANS}`, color: "#0a949a", background: "#e6f8f8", padding: "8px 14px", borderRadius: 999, opacity: 1 - d }}>Snooze a week</span>
                  <span style={{ font: `500 13px ${SANS}`, color: "#3f5a5c", padding: "8px 10px" }}>Open →</span>
                </div>
              </div>
            );
          })}
          <div style={{ paddingTop: 18, font: `400 12px ${SANS}`, color: "#a9bcbe" }}>
            Sent by <span style={{ color: "#0a949a" }}>The Network</span>. Change the time or turn this off in <span style={{ color: "#0a949a" }}>Settings</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
