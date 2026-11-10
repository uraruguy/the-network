/** One transcript line. `shown` 0..1 types a command / reveals output. `person` = the answer, in bright text. */
export type TermLine = { kind: "cmd" | "out" | "ok" | "dim" | "person" | "gap"; text: string; shown: number };

const COLOR = { cmd: "#eef7f7", out: "#a9bfc0", ok: "#8ef0c8", dim: "rgba(215,230,230,0.5)", person: "#f4fbfb", gap: "transparent" } as const;

/**
 * A macOS Terminal window (dark glass, JetBrains Mono) showing a plain shell transcript. Big type
 * on purpose: it has to read on a phone. Long commands wrap; nothing is cropped.
 */
export function Terminal({ lines, caretOn, width = 1720, size = 30 }: { lines: TermLine[]; caretOn: boolean; width?: number; size?: number }) {
  const mono = '"JetBrains Mono Variable", ui-monospace, monospace';
  return (
    <div style={{ width, borderRadius: 18, overflow: "hidden", background: "rgba(10,18,20,0.95)", boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 0 90px -20px rgba(52,219,227,0.35), 0 40px 100px -20px rgba(0,0,0,0.6)" }}>
      <div style={{ height: 42, display: "flex", alignItems: "center", padding: "0 18px", position: "relative", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 9 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", font: `500 16px "Inter Variable", sans-serif`, color: "rgba(255,255,255,0.55)" }}>alex — zsh</div>
      </div>
      <div style={{ padding: "22px 30px 28px", font: `450 ${size}px/1.5 ${mono}`, letterSpacing: "-0.01em" }}>
        {lines.map((l, i) => {
          if (l.shown <= 0) return null;
          if (l.kind === "gap") return <div key={i} style={{ height: size * 0.5 }} />;
          const text = l.text.slice(0, Math.ceil(l.text.length * Math.min(1, l.shown)));
          const typing = l.kind === "cmd" && l.shown < 1;
          const reveal = l.kind === "cmd" ? 1 : Math.min(1, l.shown);
          return (
            <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: COLOR[l.kind], opacity: reveal, transform: `translateY(${(1 - reveal) * 8}px)`, display: "flex", gap: "0.6em" }}>
              {l.kind === "cmd" && <span style={{ color: "#5ff0f4" }}>❯</span>}
              <span style={{ minWidth: 0 }}>
                {l.kind === "cmd" ? text : l.text}
                {typing && caretOn && <span style={{ background: "#5ff0f4", color: "transparent" }}>▌</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
