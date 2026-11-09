/** A macOS Terminal window (dark, SF Mono-like JetBrains Mono) with typed/printed lines. */
export type TermLine = { kind: "cmd" | "out" | "ok" | "dim" | "tools"; text: string; shown: number };

export const MCP_TOOLS = [
  "search_people",
  "get_person",
  "list_notes",
  "recent_interactions",
  "search_notes",
  "people_by_place",
  "due_followups",
  "list_taxonomy",
  "add_note",
  "create_person",
  "update_person",
  "create_followup",
  "complete_followup",
];

export function Terminal({ lines, tools, caretOn, width = 980 }: { lines: TermLine[]; tools: number; caretOn: boolean; width?: number }) {
  const mono = '"JetBrains Mono Variable", ui-monospace, monospace';
  return (
    <div style={{ width, borderRadius: 14, overflow: "hidden", background: "rgba(14,22,24,0.94)", boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 40px 100px -20px rgba(0,0,0,0.6), 0 16px 40px -16px rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}>
      <div style={{ height: 34, display: "flex", alignItems: "center", padding: "0 14px", position: "relative", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", font: `500 13px "Inter Variable", sans-serif`, color: "rgba(255,255,255,0.55)" }}>alex — zsh — 120×32</div>
      </div>
      <div style={{ padding: "18px 22px 22px", font: `450 20px/1.55 ${mono}`, color: "#d7e6e6", minHeight: 300 }}>
        {lines.map((l, i) => {
          if (l.shown <= 0) return null;
          const text = l.text.slice(0, Math.ceil(l.text.length * Math.min(1, l.shown)));
          const typing = l.kind === "cmd" && l.shown < 1;
          if (l.kind === "tools") return null;
          return (
            <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", color: l.kind === "ok" ? "#8ef0c8" : l.kind === "dim" ? "rgba(215,230,230,0.5)" : l.kind === "out" ? "#b9cccd" : "#eef7f7" }}>
              {l.kind === "cmd" && <span style={{ color: "#5ff0f4" }}>❯ </span>}
              {text}
              {typing && caretOn && <span style={{ background: "#5ff0f4", color: "transparent" }}>▌</span>}
            </div>
          );
        })}
        {tools > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {MCP_TOOLS.map((t, i) => {
              const a = Math.max(0, Math.min(1, tools - i));
              if (a <= 0) return null;
              const write = i >= 8;
              return (
                <span
                  key={t}
                  style={{
                    font: `500 16px ${mono}`,
                    padding: "5px 11px",
                    borderRadius: 8,
                    color: write ? "#ffd58a" : "#7fe6ea",
                    background: write ? "rgba(255,190,90,0.10)" : "rgba(95,240,244,0.09)",
                    border: `1px solid ${write ? "rgba(255,190,90,0.22)" : "rgba(95,240,244,0.22)"}`,
                    opacity: a,
                    transform: `translateY(${(1 - a) * 8}px) scale(${0.9 + 0.1 * a})`,
                  }}
                >
                  {t}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
