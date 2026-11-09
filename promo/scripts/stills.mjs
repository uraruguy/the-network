/**
 * Fast frame inspection: bundles once, renders the given frames of a composition as JPEGs and
 * tiles them into one contact sheet.
 *
 *   node scripts/stills.mjs <Composition> <frame> [frame…] [--cols=4] [--scale=0.5] [--out=name]
 *   node scripts/stills.mjs Pocket 0 60 120 180 --cols=4
 *   node scripts/stills.mjs Pocket 180-420:30        # range with a step
 *
 * Writes out/stills/<name>/<frame>.jpg and out/stills/<name>.jpg (the sheet, frame numbers burnt in).
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const [id, ...specs] = args.filter((a) => !a.startsWith("--"));
if (!id || !specs.length) throw new Error("usage: node scripts/stills.mjs <Composition> <frame|a-b:step>…");
const frames = specs.flatMap((s) => {
  const m = s.match(/^(\d+)-(\d+)(?::(\d+))?$/);
  if (!m) return [Number(s)];
  const [a, b, step = 30] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 30)];
  return Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);
});
const name = opt.out ?? `${id}-${frames[0]}-${frames.at(-1)}`;
const scale = Number(opt.scale ?? 0.5);
const cols = Number(opt.cols ?? Math.min(4, frames.length));
const dir = path.resolve("out/stills", name);
mkdirSync(dir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), webpackOverride: (c) => enableTailwind(c) });
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id, browserExecutable });
const files = [];
for (const frame of frames) {
  const output = path.join(dir, `${String(frame).padStart(4, "0")}.jpg`);
  await renderStill({ composition, serveUrl, frame, output, imageFormat: "jpeg", jpegQuality: 88, scale, browserExecutable, chromiumOptions: { gl: "angle" } });
  files.push(output);
}
if (files.length > 1) {
  const sheet = path.resolve("out/stills", `${name}.jpg`);
  const inputs = files.flatMap((f) => ["-i", f]);
  const label = (i) => `[${i}:v]drawtext=text='${frames[i]}':x=12:y=12:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6[v${i}]`;
  const rows = Math.ceil(files.length / cols);
  const filter = [
    ...files.map((_, i) => label(i)),
    `${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${files
      .map((_, i) => `${(i % cols) === 0 ? "0" : Array.from({ length: i % cols }, () => "w0").join("+")}_${Math.floor(i / cols) === 0 ? "0" : Array.from({ length: Math.floor(i / cols) }, () => "h0").join("+")}`)
      .join("|")}:fill=black[out]`,
  ].join(";");
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filter, "-map", "[out]", "-q:v", "3", sheet]);
  console.log(`sheet: ${sheet} (${rows}×${cols})`);
} else {
  console.log(`still: ${files[0]}`);
}
