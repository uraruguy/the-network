/**
 * macOS arrow pointer with a press dip and a click ripple. Pure: position, press (0..1) and
 * ripple progress (0..1, or null) come from the caller.
 */
export function Cursor({ x, y, scale = 1, press = 0, ripple, opacity = 1, dark = false }: { x: number; y: number; scale?: number; press?: number; ripple?: number | null; opacity?: number; dark?: boolean }) {
  const s = scale * (1 - 0.14 * press);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none", zIndex: 100 }}>
      {ripple != null && ripple > 0 && ripple < 1 && (
        <div
          style={{
            position: "absolute",
            left: -40 * scale,
            top: -40 * scale,
            width: 80 * scale,
            height: 80 * scale,
            borderRadius: 999,
            border: `${2.5 * scale}px solid ${dark ? "rgba(127,230,234,0.9)" : "rgba(10,143,150,0.85)"}`,
            background: dark ? "rgba(127,230,234,0.14)" : "rgba(10,143,150,0.10)",
            transform: `scale(${0.2 + ripple * 0.9})`,
            opacity: 1 - ripple,
          }}
        />
      )}
      <svg
        width={26 * s}
        height={34 * s}
        viewBox="0 0 26 34"
        style={{ position: "absolute", left: -3 * s, top: -2 * s, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.28))", overflow: "visible" }}
      >
        <path d="M3 2 L3 26.5 L8.6 21.1 L12.6 30.6 L16.9 28.8 L12.9 19.5 L20.6 19.5 Z" fill="#111" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
