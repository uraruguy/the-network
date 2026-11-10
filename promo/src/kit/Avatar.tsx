import type { CSSProperties } from "react";

/** Same hue table and string hash as the app (src/lib/constants/palette.ts → paletteFor). */
const HUES = [194, 235, 270, 305, 350, 28, 58, 85, 128, 158] as const;

export function hueFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length]!;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function avatarGradient(name: string) {
  const hue = hueFor(name);
  return `linear-gradient(145deg, oklch(var(--avatar-l1) var(--avatar-c) ${hue}), oklch(var(--avatar-l2) var(--avatar-c) ${(hue + 18) % 360}))`;
}

/** The app's initials avatar (glass/Avatar.tsx), pixel-for-pixel. */
export function Avatar({ name, size = 40, style, ring = true }: { name: string; size?: number; style?: CSSProperties; ring?: boolean }) {
  return (
    <span
      className={ring ? "relative inline-block shrink-0 overflow-hidden rounded-full ring-[0.5px] ring-hairline" : "relative inline-block shrink-0 overflow-hidden rounded-full"}
      style={{ width: size, height: size, ...style }}
    >
      <span
        className="grid h-full w-full place-items-center font-semibold text-white select-none"
        style={{ fontSize: Math.round(size * 0.4), letterSpacing: "-0.01em", background: avatarGradient(name) }}
      >
        {initials(name)}
      </span>
    </span>
  );
}
