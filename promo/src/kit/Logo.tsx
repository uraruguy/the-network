import { useId } from "react";

/** The app icon (site/assets/logo.svg): turquoise tile, an "N" drawn as four connected nodes. */
export function Logo({ size = 64, draw = 1, nodes = 1 }: { size?: number; draw?: number; nodes?: number }) {
  const id = useId().replace(/:/g, "");
  const len = 24 + 33.94 + 24;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`ng${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34dbe3" />
          <stop offset="1" stopColor="#0a8f96" />
        </linearGradient>
        <linearGradient id={`gl${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14.5" fill={`url(#ng${id})`} />
      <rect width="64" height="64" rx="14.5" fill={`url(#gl${id})`} />
      <circle cx="32" cy="32" r="19" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.6" />
      <ellipse cx="32" cy="32" rx="8" ry="19" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.2" />
      <path d="M13 32 H51" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.2" />
      <path
        d="M20 44 V20 L44 44 V20"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - draw)}
      />
      {(
        [
          [20, 44],
          [20, 20],
          [44, 44],
          [44, 20],
        ] as const
      ).map(([cx, cy], i) => {
        const s = Math.min(1, Math.max(0, nodes * 4 - i));
        return (
          <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
            <circle r="4.6" fill="#fff" />
            <circle r="2" fill="#0a8f96" />
          </g>
        );
      })}
    </svg>
  );
}
