#!/usr/bin/env node
/**
 * Export a film (the sizzle reel or the campaign lore video) to video files.
 *
 *   node scripts/reel/record.mjs [sizzle|lore] [--frames N] [--out docs/media]
 *     [--crf N] [--webm-crf N] [--audio-latency S]
 *
 * 1. Video pass: Chromium (GPU flags) at 1920x1080, DPR 1, Ultra, on
 *    ?record=<id>. The director runs on its fixed clock; each frame steps
 *    1/60 s, the page composites the game and HUD canvases, and the PNG goes
 *    to ffmpeg over a pipe.
 * 2. Audio pass: a second load (&audio=1) plays the film in real time and
 *    records the master bus (audio.recordTap()) with MediaRecorder.
 * 3. Mux: <id>.mp4 (H.264 + AAC, faststart) and <id>.webm (VP9 + Opus), plus
 *    <id>-poster.png from the closing logo card. Each file is kept under
 *    25 MB by raising the CRF.
 *
 * Uses the Vite dev server on CC_TEST_PORT (default 5173), starting one if
 * nothing is listening there. Needs ffmpeg on PATH.
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const localBrowsers = path.join(ROOT, ".playwright");
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(localBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
}
const { chromium } = await import("playwright");

const W = 1920;
const H = 1080;
const FPS = 60;
const MAX_BYTES = 25_000_000;
const GPU_ARGS = ["--use-gl=angle", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];

// ─── Arguments ────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const positional = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const reelId = opt("reel", positional[0] ?? "sizzle");
const maxFrames = opt("frames") ? Number(opt("frames")) : Infinity;
const outDir = path.resolve(ROOT, opt("out", "docs/media"));
const baseCrf = { mp4: Number(opt("crf", 24)), webm: Number(opt("webm-crf", 38)) };
const smoke = Number.isFinite(maxFrames);
// The tap → MediaRecorder path records every sound this late (measured: the
// logo sting's onset at +58..68 ms in both reels); trimmed off in the mux.
const audioLatency = Number(opt("audio-latency", 0.06));
const port = Number(process.env.CC_TEST_PORT ?? 5173);
const base = `http://localhost:${port}`;

const work = fs.mkdtempSync(path.join(os.tmpdir(), `cc-reel-${reelId}-`));
const log = (...a) => console.log(`[reel:${reelId}]`, ...a);

// ─── Dev server ───────────────────────────────────────────────────────────

const listening = () =>
  new Promise((resolve) => {
    const s = net.connect(port, "localhost");
    s.once("connect", () => (s.destroy(), resolve(true)));
    s.once("error", () => resolve(false));
  });

let server = null;
async function ensureServer() {
  if (await listening()) return;
  log(`starting vite on ${port}`);
  server = spawn("npx", ["vite", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", detached: true });
  for (let i = 0; i < 100; i++) {
    if (await listening()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`vite did not come up on ${port}`);
}

// ─── Browser ──────────────────────────────────────────────────────────────

async function openPage(browser, query) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    // Ultra (preset 5); the art style stays the game's default.
    localStorage.setItem("cc_settings", JSON.stringify({ graphicsPreset: 5, renderScale: 100, batterySaver: false }));
    localStorage.setItem("cc_analytics_consent", "declined");
  });
  // Cut Vite's HMR socket off: an edit saved mid-take would otherwise reload
  // the page and lose the recording. The socket opens but hears nothing.
  await context.routeWebSocket(/.*/, () => {});
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}/?record=${reelId}${query}`);
  await page.waitForFunction(() => window.ccReel, null, { timeout: 30_000 });
  return { page, context, errors };
}

// ─── Video pass ───────────────────────────────────────────────────────────

function ffmpeg(args, { input } = {}) {
  const p = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: [input ? "pipe" : "ignore", "inherit", "inherit"] });
  const done = new Promise((resolve, reject) => {
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${args.join(" ")}`))));
  });
  return { proc: p, done };
}

async function videoPass(browser) {
  const { page, context, errors } = await openPage(browser, "");
  const { duration, posterAt } = await page.evaluate(() => ({ duration: window.ccReel.duration, posterAt: window.ccReel.posterAt }));
  const total = Math.min(Math.round(duration * FPS), maxFrames);
  const posterFrame = Math.round(posterAt * FPS);
  await page.evaluate(() => void window.ccReel.start());
  log(`video: ${total} frames (${(total / FPS).toFixed(2)} s of ${duration.toFixed(2)} s)`);

  // Lossless-enough intermediate; the deliverables re-encode from it.
  const video = path.join(work, "video.mp4");
  const enc = ffmpeg(["-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p", video], { input: true });
  const write = (buf) =>
    new Promise((resolve, reject) => (enc.proc.stdin.write(buf, (e) => (e ? reject(e) : resolve()))));

  // The opening holds on black until its first scenes have built.
  await page.waitForFunction(() => !window.ccReel.state()?.paused, null, { timeout: 60_000 });
  const t0 = Date.now();
  let posterPng = null;
  let written = 0;
  for (let i = 0; i < total; i++) {
    if (await page.evaluate(() => window.ccReel.done)) break;
    const url = await page.evaluate(() => window.ccReel.frame());
    const png = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
    await write(png);
    written++;
    if (i === posterFrame) posterPng = png;
    await page.evaluate(() => window.ccReel.step());
    if (i % 300 === 0) {
      const st = await page.evaluate(() => window.ccReel.state());
      log(`  frame ${i}/${total} t=${st?.t.toFixed(2)} shot=${st?.shotId} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }
  enc.proc.stdin.end();
  await enc.done;
  await context.close();
  if (written < total) log(`video: reel ended after ${written} of ${total} frames`);
  return { video, posterPng, duration, frames: written, errors };
}

// ─── Audio pass ───────────────────────────────────────────────────────────

async function audioPass(browser) {
  const { page, context, errors } = await openPage(browser, "&audio=1");
  // Start recording, then the reel. The recorder steps the director's fixed
  // clock up to the audio clock every frame, so a scene build that holds the
  // clock is caught up at once instead of leaving the picture behind the
  // music for the rest of the film. The recording's head (before the reel's
  // t=0) is trimmed off so t=0 lines up with the video's first frame.
  const result = await page.evaluate(async () => {
    const reel = window.ccReel;
    const stream = reel.tap();
    const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 256_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const started = new Promise((r) => (rec.onstart = r));
    const stopped = new Promise((r) => (rec.onstop = r));
    rec.start(1000);
    await started;
    const recStart = reel.audioTime();
    reel.start();
    await reel.step(); // waits out the opening hold
    const t0 = reel.audioTime() - reel.state().t;
    const offset = t0 - recStart;
    let maxLag = 0;
    let shot = null;
    const drift = [];
    while (!reel.done) {
      await new Promise((r) => requestAnimationFrame(r));
      const st = reel.state();
      if (!st) break;
      const lag = reel.audioTime() - t0 - st.t;
      maxLag = Math.max(maxLag, lag);
      if (st.shotId !== shot) {
        shot = st.shotId;
        drift.push(`${shot}:${Math.round(lag * 1000)}`);
      }
      while (!reel.done && reel.state() && reel.state().t < reel.audioTime() - t0) await reel.step();
    }
    // Let the last sting ring out before stopping.
    await new Promise((r) => setTimeout(r, 1500));
    rec.stop();
    await stopped;
    const buf = new Uint8Array(await new Blob(chunks, { type: "audio/webm" }).arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { b64: btoa(bin), offset, maxLag, drift };
  });
  await context.close();
  const audio = path.join(work, "audio.webm");
  fs.writeFileSync(audio, Buffer.from(result.b64, "base64"));
  log(`audio: ${fs.statSync(audio).size} bytes, reel t=0 at ${result.offset.toFixed(3)} s, worst lag ${(result.maxLag * 1000).toFixed(0)} ms`);
  // How far the reel's clock trailed the audio clock (ms) on the first frame
  // of each shot, before the catch-up: scene builds that held it.
  log(`audio: lag at each cut (ms) ${result.drift.join(" ")}`);
  return { audio, offset: Math.max(0, result.offset + audioLatency), errors };
}

// ─── Mux ──────────────────────────────────────────────────────────────────

async function encodeUnderBudget(label, file, argsFor, crf) {
  for (;;) {
    await ffmpeg(argsFor(crf)).done;
    const size = fs.statSync(file).size;
    log(`${label}: crf ${crf} → ${(size / 1e6).toFixed(2)} MB`);
    if (size <= MAX_BYTES || crf >= 51) return { crf, size };
    crf += 2;
  }
}

function probe(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height,r_frame_rate,pix_fmt", "-of", "json", file]);
  return JSON.parse(out);
}

async function main() {
  await ensureServer();
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: [...GPU_ARGS, "--autoplay-policy=no-user-gesture-required"] });
  try {
    const v = await videoPass(browser);
    if (smoke) {
      const out = path.join(os.tmpdir(), `cc-${reelId}-smoke.mp4`);
      fs.copyFileSync(v.video, out);
      log("smoke:", JSON.stringify(probe(out)));
      return;
    }
    const a = await audioPass(browser);
    const mp4 = path.join(outDir, `${reelId}.mp4`);
    const webm = path.join(outDir, `${reelId}.webm`);
    const audioIn = ["-ss", a.offset.toFixed(3), "-i", a.audio];
    const len = ["-t", v.duration.toFixed(3)];
    // Pad the audio with silence if the recording ran short, so -t decides the length.
    const af = ["-af", "apad"];
    await encodeUnderBudget("mp4", mp4, (crf) => [
      "-i", v.video, ...audioIn, "-map", "0:v", "-map", "1:a",
      "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-pix_fmt", "yuv420p", "-r", String(FPS),
      ...af, "-c:a", "aac", "-b:a", "192k", ...len, "-movflags", "+faststart", mp4,
    ], baseCrf.mp4);
    await encodeUnderBudget("webm", webm, (crf) => [
      "-i", v.video, ...audioIn, "-map", "0:v", "-map", "1:a",
      "-c:v", "libvpx-vp9", "-crf", String(crf), "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", "-r", String(FPS),
      ...af, "-c:a", "libopus", "-b:a", "128k", ...len, webm,
    ], baseCrf.webm);
    const poster = path.join(outDir, `${reelId}-poster.png`);
    if (v.posterPng) fs.writeFileSync(poster, v.posterPng);
    for (const f of [mp4, webm]) log(path.relative(ROOT, f), JSON.stringify(probe(f)));
    const errors = [...new Set([...v.errors, ...a.errors])];
    if (errors.length) log("page errors:", errors);
  } finally {
    await browser.close();
    fs.rmSync(work, { recursive: true, force: true });
  }
}

try {
  await main();
} finally {
  // npx runs vite as a child: signal the whole group.
  if (server) process.kill(-server.pid);
}
