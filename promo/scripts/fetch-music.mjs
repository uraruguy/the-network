/**
 * Downloads the launch videos' background music from Mixkit into public/music/.
 *
 *   node scripts/fetch-music.mjs                 # the tracks picked for the phone + desktop videos
 *   node scripts/fetch-music.mjs --all           # every candidate in scripts/music.json
 *   node scripts/fetch-music.mjs deep-urban …    # specific track ids
 *
 * The Mixkit Stock Music Free License (https://mixkit.co/license/#musicFree) allows the music in
 * social-media videos but not redistributing the audio files, so public/music/ is git-ignored and
 * this script is how anyone reproduces the scored videos. Files are checked against the sha256 in
 * music.json: score.mjs's offsets were measured on those exact files.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(path.join(root, "scripts/music.json"), "utf8"));
const args = process.argv.slice(2);
const ids = args.includes("--all")
  ? Object.keys(config.tracks)
  : args.length
    ? args.map((a) => config.picks[a] ?? a)
    : [...new Set(Object.values(config.picks))];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

for (const id of ids) {
  const track = config.tracks[id];
  if (!track) {
    console.error(`unknown track "${id}"; one of: ${Object.keys(config.tracks).join(", ")}`);
    process.exitCode = 1;
    continue;
  }
  const dest = path.join(root, track.file);
  if (existsSync(dest) && sha256(readFileSync(dest)) === track.sha256) {
    console.log(`ok     ${id}  ${track.file} (already there)`);
    continue;
  }
  const res = await fetch(track.url);
  if (!res.ok) {
    console.error(`failed ${id}  ${track.url}: HTTP ${res.status}`);
    process.exitCode = 1;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(`${dest}.part`, buf);
  renameSync(`${dest}.part`, dest);
  const digest = sha256(buf);
  if (track.sha256 && digest !== track.sha256) {
    console.error(`CHANGED ${id}: sha256 ${digest} ≠ music.json; the upstream file changed, re-measure offset/bpm before scoring`);
    process.exitCode = 1;
  } else {
    console.log(`fetched ${id}  ${track.file} (${(buf.length / 1e6).toFixed(1)} MB) — "${track.title}" by ${track.artist}, ${track.page}`);
  }
}
