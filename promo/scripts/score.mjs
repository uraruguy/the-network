/**
 * Lays a beat-aligned, loudness-normalised Mixkit track under a silent 30 s render.
 *
 *   node scripts/score.mjs <video.mp4> <track-id | phone | desktop> <out.mp4>
 *   pnpm score out/the-network-phone.mp4 phone out/the-network-phone-scored.mp4
 *
 * Settings per track come from scripts/music.json (get the audio first: `pnpm fetch:music`).
 * Audio chain: cut the source at `offset` (a downbeat, so a downbeat lands on t=0), `atempo` by
 * `tempo` (= 120 / bpm, so every beat lands on the videos' 0.5 s cut grid), cut to `duration`,
 * two-pass `loudnorm` (pass 1 measures the faded window, pass 2 applies it linearly), resample,
 * fade in/out (the fade-out ends at exactly `duration`), pad/trim to the exact sample count, AAC.
 * The fades come after loudnorm so a dynamic-mode fallback can never pump them back up. The video
 * stream is copied untouched. The result is verified with ffprobe (duration, frame count, audio
 * stream) and an EBU R128 scan (integrated loudness, true peak); any failed check exits 1.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(path.join(root, "scripts/music.json"), "utf8"));
const out = config.output;

const [videoArg, idArg, outArg] = process.argv.slice(2);
if (!videoArg || !idArg || !outArg) {
  console.error("usage: node scripts/score.mjs <video.mp4> <track-id|phone|desktop> <out.mp4>");
  console.error(`tracks: ${Object.keys(config.tracks).join(", ")}; picks: ${JSON.stringify(config.picks)}`);
  process.exit(2);
}
const id = config.picks[idArg] ?? idArg;
const track = config.tracks[id];
if (!track) fail(`unknown track "${idArg}"; one of: ${[...Object.keys(config.picks), ...Object.keys(config.tracks)].join(", ")}`);
const video = path.resolve(videoArg);
const dest = path.resolve(outArg);
const audio = path.join(root, track.file);
if (!existsSync(video)) fail(`missing video ${videoArg}`);
if (!existsSync(audio)) fail(`missing ${track.file}: run \`pnpm fetch:music ${id}\``);
if (dest === video) fail("refusing to overwrite the input video");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.error) fail(`${cmd} not found (install ffmpeg): ${r.error.message}`);
  if (r.status !== 0) fail(`${cmd} failed:\n${r.stderr.split("\n").slice(-15).join("\n")}`);
  return r;
}
function fail(msg) {
  console.error(`score: ${msg}`);
  process.exit(1);
}
const ffmpeg = (args) => run("ffmpeg", ["-hide_banner", "-nostats", ...args]);
const loudnormJson = (stderr) => {
  const blocks = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/g);
  if (!blocks) fail("could not read loudnorm stats");
  return JSON.parse(blocks.at(-1));
};

const D = out.duration;
const samples = Math.round(D * out.sampleRate);
const head = [`atrim=start=${track.offset}`, "asetpts=PTS-STARTPTS", track.tempo !== 1 && `atempo=${track.tempo}`, `atrim=end=${D}`, "asetpts=PTS-STARTPTS"];
const fades = [`afade=t=in:st=0:d=${track.fadeIn}`, `afade=t=out:st=${D - track.fadeOut}:d=${track.fadeOut}`];
const target = `loudnorm=I=${out.integrated}:TP=${out.truePeak}:LRA=${out.lra}`;
const chain = (...parts) => parts.flat().filter(Boolean).join(",");

// Source window must be long enough (offset + 30 s of output at the stretched tempo).
const srcDur = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio]).stdout);
if (track.offset + D * track.tempo > srcDur) fail(`${id}: offset ${track.offset} + ${D}s×${track.tempo} runs past the track end (${srcDur}s)`);

// Pass 1: measure the window exactly as it will sound (stretched, trimmed, faded).
const m = loudnormJson(ffmpeg(["-i", audio, "-af", chain(head, fades, `${target}:print_format=json`), "-f", "null", "-"]).stderr);

// Pass 2: normalise (linear when possible), resample, fade, exact length; copy the video stream.
const norm = `${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
const audioChain = chain(head, norm, `aresample=${out.sampleRate}`, "aformat=sample_fmts=fltp:channel_layouts=stereo", fades, `apad=whole_len=${samples}`, `atrim=end_sample=${samples}`);
const pass2 = ffmpeg([
  "-y", "-i", video, "-i", audio,
  "-filter_complex", `[1:a]${audioChain}[a]`,
  "-map", "0:v:0", "-map", "[a]",
  "-c:v", "copy",
  "-c:a", out.codec, "-b:a", out.bitrate, "-ar", String(out.sampleRate), "-ac", String(out.channels),
  "-movflags", "+faststart", "-shortest", "-t", String(D),
  dest,
]);
const applied = loudnormJson(pass2.stderr);

// Verify.
const probe = (file) => JSON.parse(run("ffprobe", ["-v", "error", "-count_packets", "-show_entries", "format=duration:stream=codec_type,codec_name,nb_read_packets,duration,sample_rate,channels,bit_rate", "-of", "json", file]).stdout);
const src = probe(video).streams.find((s) => s.codec_type === "video");
const res = probe(dest);
const v = res.streams.find((s) => s.codec_type === "video");
const a = res.streams.find((s) => s.codec_type === "audio");
const scan = ffmpeg(["-i", dest, "-map", "0:a:0", "-af", "ebur128=peak=true:framelog=verbose", "-f", "null", "-"]).stderr.split("Summary:").at(-1);
const I = Number(scan.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
const TP = Number(scan.match(/True peak:\s+Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
const checks = [
  [`duration ${Number(res.format.duration).toFixed(3)} s`, Math.abs(res.format.duration - D) < 0.0005],
  [`video ${v?.codec_name} ${v?.nb_read_packets} frames (source ${src.nb_read_packets}), ${Number(v?.duration).toFixed(3)} s`, v && v.nb_read_packets === src.nb_read_packets && Math.abs(v.duration - D) < 0.0005],
  [`audio ${a?.codec_name} ${a?.sample_rate} Hz ${a?.channels} ch ${Math.round(a?.bit_rate / 1000)} kb/s, ${Number(a?.duration).toFixed(3)} s`, a && a.codec_name === out.codec && Number(a.sample_rate) === out.sampleRate && a.channels === out.channels && Math.abs(a.duration - D) < 0.0005],
  [`loudness ${I.toFixed(1)} LUFS (target ${out.integrated})`, Math.abs(I - out.integrated) <= 0.5],
  [`true peak ${TP.toFixed(1)} dBTP (max ${out.maxTruePeak})`, TP <= out.maxTruePeak],
];
console.log(`${path.relative(process.cwd(), dest)}  ←  "${track.title}" by ${track.artist} (${track.page})`);
console.log(`  ${track.bpm} BPM → 120 (atempo ${track.tempo}), source ${track.offset}s–${(track.offset + D * track.tempo).toFixed(3)}s, downbeat at 0, beats every 0.5 s`);
console.log(`  loudnorm: window ${m.input_i} LUFS / ${m.input_tp} dBTP / LRA ${m.input_lra} → ${applied.normalization_type} gain ${(out.integrated - m.input_i).toFixed(2)} dB`);
for (const [label, ok] of checks) console.log(`  ${ok ? "ok  " : "FAIL"} ${label}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
