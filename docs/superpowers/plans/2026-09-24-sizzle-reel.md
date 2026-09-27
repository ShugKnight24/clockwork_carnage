# Sizzle Reel and Campaign Lore Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An in-engine director that plays scripted shot timelines — a 75 s sizzle reel (title attract loop, Watch Trailer, exported 1080p60 MP4/WebM) and a 40 s campaign lore video (first new campaign, before the flipbook, replayable from the Archive).

**Architecture:** A pure timeline module evaluates beats-based reel data (shots, captions, narration, music cues, events). A director runtime owns a new `GameState.CINEMATIC`, builds each shot's scene through small adapters that borrow and restore game fields (the settings showcase's discipline), drives the camera and events, and draws a cinematic overlay on the HUD canvas. The same director runs on a real-time clock in game and a fixed 1/60 s clock for recording; a Node script records frames and audio and muxes them with ffmpeg.

**Tech Stack:** Vanilla JS ES modules (unbundled on GitHub Pages: literal `import()` paths only), Canvas 2D + the existing WebGL hybrid renderer, Web Audio, vitest (node) for units, Playwright for browser checks and recording, ffmpeg (Homebrew, installed only with the user's approval).

**Spec:** `docs/superpowers/specs/2026-09-24-sizzle-reel-design.md`

## Global Constraints

- No new npm dependencies. `ffmpeg` is a system tool; the recording task asks the user before `brew install ffmpeg`.
- Reels are authored in **beats**; the reel's `bpm` converts beats to seconds everywhere (one clock).
- At most **3 flashes per second** (white flash or full-screen glitch) regardless of script. Reduced motion (`matchMedia("(prefers-reduced-motion: reduce)")`) removes shake, glitch and flash and replaces cuts into/out of lore beats with dissolves.
- Nothing a reel does may reach saves, stats, achievements, unlocks, analytics, ARIA/squad comms history, or progression: every adapter restores exactly what it borrowed. The only new storage write is `cc_seen_lore_video`.
- Skip: attract — any key/click/touch/pad button exits immediately to TITLE; Watch Trailer — exits to MODE_SELECT; lore — first press shows "Hold <skip glyph> to skip", holding 0.8 s skips to the flipbook.
- Late-game bosses (hound, boss_form2, boss_form3) appear only as silhouettes or title cards; the lore reel shows Act I only.
- Attract loop: 30 fps cap, honours Battery Saver, paused while `document.hidden`. Before any user gesture the attract plays muted with captions.
- Every random choice inside a shot uses a seeded PRNG (seed = reel id + shot id) so live and recorded playback match.
- Exported files: `docs/media/sizzle.mp4` (H.264 + AAC, `-movflags +faststart`, yuv420p), `docs/media/sizzle.webm` (VP9 + Opus), `docs/media/sizzle-poster.png`; each ≤ 25 MB; overwrite in place.
- Match surrounding code style; comments explain why. Browser tests use GPU flags (`--use-gl=angle --use-angle=metal --enable-gpu --ignore-gpu-blocklist`) and `CC_TEST_PORT=5173`. Conventional Commits, no AI attribution.

## Review Focus

1. **A reel ending or skipped while Chrono Shift slow-motion is active** — expected: `game.timeScale` is back to 1, `player.chronoActive` false, desaturation off, music tempo restored; the title/mode select is exactly as before. Test in Task 5.
2. **Skip pressed while a shot's scene is still being built (mid-install)** — expected: the build is abandoned, nothing half-installed remains, state returns to the opener. Test in Task 3.
3. **Tab hidden mid-reel, then shown** — expected: the reel pauses (clock does not advance, music paused) and resumes at the same beat without skipping shots or double-firing events. Test in Task 3.
4. **The attract loop triggering while something else owns the screen** (analytics consent card open, a toast, the settings deck preloading, audio not yet initialised) — expected: the idle timer only runs on the plain title screen, and a first attract before any gesture is silent with captions and no errors. Test in Task 4.
5. **The lore video when the player skipped the character creator (Back) or has the default agent** — expected: the agent close-up shows whatever character is current (default look included) and the flow still goes lore → flipbook → prologue; a second new campaign skips lore. Test in Task 8.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/cinematic/timeline.js` (new) | Pure: beats↔seconds, `stateAt`, `eventsBetween`, caption/letterbox/transition state, flash-rate cap, `validateReel`. |
| `src/cinematic/seeded.js` (new) | Pure: small seeded PRNG (`mulberry32`) and `seedFor(reelId, shotId)`. |
| `src/cinematic/overlay.js` (new) | Canvas drawing of letterbox, captions, title cards, logo, transitions; pure `overlayLayout(w, h, state, opts)` for geometry. |
| `src/cinematic/director.js` (new) | Runtime: `playReel(game, reel, { returnTo, clock, muted })`, `stopReel(game)`, per-frame `updateDirector(game, dt)` / `renderDirector(game, ctx, hctx)`, skip handling, scene adapter lifecycle, beat-true music. |
| `src/cinematic/scenes/campaign.js`, `art.js`, `creator.js`, `meltdown.js`, `forge.js`, `title.js` (new) | Scene adapters: `build(game, spec, rng)`, `update(game, dt, t)`, `event(game, ev)`, `teardown(game)`; each restores what it borrowed. |
| `src/cinematic/reels/sizzle.js`, `reels/campaign-lore.js` (new) | The two reels as data. |
| `src/types.js`, `js/state-manager.js`, `src/rendering/render-pipeline.js`, `js/main.js`, `src/systems/input-dispatch.js`, `js/game.js` (modify) | CINEMATIC state, render/update hooks, attract idle timer, Watch Trailer, campaign hand-off, skip input. |
| `index.html`, `style.css` (modify) | Watch Trailer button in mode select. |
| `src/ui/archive-screen.js` (modify) | FILMS tab. |
| `js/audio.js` (modify) | `onBeat(fn)` subscription, `recordTap()` for the audio pass, `setMuted(bool)`. |
| `scripts/reel/record.mjs` (new, tracked; update `.gitignore` to allow `scripts/reel/`) | Video pass + audio pass + ffmpeg mux. |
| `docs/media/` (outputs), `README.md` (poster link) | Exported films. |

---

### Task 1: Timeline core (pure)

**Files:**
- Create: `src/cinematic/timeline.js`, `src/cinematic/seeded.js`
- Test: `tests/unit/cinematic-timeline.test.js`

**Interfaces:**
- Produces:
  - `beatsToSec(reel, beats) → number`, `secToBeats(reel, sec) → number`
  - `reelDuration(reel) → number` (seconds)
  - `stateAt(reel, t) → { shot: Shot|null, shotIndex: number, local: number /*sec into shot*/, shotLen: number /*sec*/, captions: Caption[], narration: Line|null, letterbox: number /*0..1*/, transition: { kind, progress }|null }`
  - `eventsBetween(reel, t0, t1) → { shotId, ev }[]` — half-open `(t0, t1]`, in time order, across shot boundaries; `t1 < t0` (loop) returns `[]`
  - `capFlashes(times: number[], maxPerSec = 3) → number[]` — drops flashes closer than 1/3 s to the previous kept one
  - `validateReel(reel) → string[]` (empty when valid)
  - `mulberry32(seed) → () => number`, `seedFor(reelId, shotId) → number`
- Reel shape (all times in beats):

```js
/**
 * @typedef {{ id: string, bpm: number, bars: number, beatsPerBar?: 4,
 *   music: { at: number, track?: string, sting?: boolean, stop?: boolean }[],
 *   narration: { at: number, len: number, text: string, voice?: string }[],
 *   captions: { at: number, len: number, text: string, kind?: "caption"|"title"|"card", sub?: string }[],
 *   letterbox?: { in: number, out: number },
 *   shots: { id: string, at: number, len: number, scene: object, camera?: object,
 *            events?: { at: number, type: string, [k: string]: any }[],
 *            transitionOut?: "cut"|"flash"|"glitch"|"fade" }[] }} Reel
 */
```

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/cinematic-timeline.test.js
import { describe, it, expect } from "vitest";
import { beatsToSec, secToBeats, reelDuration, stateAt, eventsBetween, capFlashes, validateReel } from "../../src/cinematic/timeline.js";
import { mulberry32, seedFor } from "../../src/cinematic/seeded.js";

const reel = {
  id: "t", bpm: 120, bars: 4,
  music: [{ at: 0, track: "campaign" }],
  narration: [{ at: 2, len: 4, text: "Someone broke time." }],
  captions: [{ at: 4, len: 4, text: "Bend time." }],
  letterbox: { in: 2, out: 2 },
  shots: [
    { id: "a", at: 0, len: 8, scene: { kind: "art", bg: "deep_space" }, events: [{ at: 1, type: "flash" }], transitionOut: "fade" },
    { id: "b", at: 8, len: 8, scene: { kind: "art", bg: "temporal_rift" }, events: [{ at: 0, type: "glitch" }, { at: 4, type: "shake" }] },
  ],
};

describe("cinematic timeline", () => {
  it("converts beats and seconds at the reel's tempo", () => {
    expect(beatsToSec(reel, 4)).toBe(2);
    expect(secToBeats(reel, 3)).toBe(6);
    expect(reelDuration(reel)).toBe(8); // 16 beats at 120 bpm
  });

  it("finds the active shot and its local time", () => {
    expect(stateAt(reel, 0.5)).toMatchObject({ shotIndex: 0, local: 0.5, shotLen: 4 });
    expect(stateAt(reel, 4.25)).toMatchObject({ shotIndex: 1, local: 0.25 });
    expect(stateAt(reel, 99).shot).toBeNull();
  });

  it("reports captions and narration only inside their window", () => {
    expect(stateAt(reel, 1.9).captions).toEqual([]);
    expect(stateAt(reel, 2.1).captions.map((c) => c.text)).toEqual(["Bend time."]);
    expect(stateAt(reel, 1.1).narration?.text).toBe("Someone broke time.");
  });

  it("eases the letterbox in and out", () => {
    expect(stateAt(reel, 0).letterbox).toBe(0);
    expect(stateAt(reel, 1).letterbox).toBe(1);
    expect(stateAt(reel, 7.99).letterbox).toBeLessThan(0.05);
  });

  it("reports the fade transition across the last beat of a shot", () => {
    const tr = stateAt(reel, 3.9).transition;
    expect(tr.kind).toBe("fade");
    expect(tr.progress).toBeGreaterThan(0.5);
  });

  it("returns events in (t0, t1] across shot boundaries, in order", () => {
    const evs = eventsBetween(reel, 0, 4.1).map((e) => `${e.shotId}:${e.ev.type}`);
    expect(evs).toEqual(["a:flash", "b:glitch"]);
    expect(eventsBetween(reel, 0.5, 0.5)).toEqual([]);
    expect(eventsBetween(reel, 4.1, 0.2)).toEqual([]);
  });

  it("caps flashes at three per second", () => {
    expect(capFlashes([0, 0.1, 0.2, 0.34, 0.5, 0.7, 1.04])).toEqual([0, 0.34, 0.7, 1.04]);
  });

  it("validates reel data", () => {
    expect(validateReel(reel)).toEqual([]);
    const gap = { ...reel, shots: [reel.shots[0], { ...reel.shots[1], at: 9 }] };
    expect(validateReel(gap)[0]).toMatch(/gap|contiguous/i);
    const late = { ...reel, captions: [{ at: 15, len: 4, text: "x" }] };
    expect(validateReel(late)[0]).toMatch(/caption/i);
  });

  it("seeded randomness is repeatable per shot", () => {
    const a = mulberry32(seedFor("sizzle", "combat"));
    const b = mulberry32(seedFor("sizzle", "combat"));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seedFor("sizzle", "combat")).not.toBe(seedFor("sizzle", "chrono"));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/cinematic-timeline.test.js` → FAIL (modules missing).

- [ ] **Step 3: Implement**

```js
// src/cinematic/seeded.js
/** Small, fast, repeatable PRNG for shot set-up (same seed → same shot). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over "reel/shot". */
export function seedFor(reelId, shotId) {
  let h = 0x811c9dc5;
  for (const ch of `${reelId}/${shotId}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return h >>> 0;
}
```

```js
// src/cinematic/timeline.js
/**
 * Reels are written in beats so cuts land on the music; everything here is
 * pure so the director, the recorder and the tests read the same timeline.
 */

const beatsPerBar = (reel) => reel.beatsPerBar ?? 4;
export const beatsToSec = (reel, beats) => (beats * 60) / reel.bpm;
export const secToBeats = (reel, sec) => (sec * reel.bpm) / 60;
export const reelDuration = (reel) => beatsToSec(reel, reel.bars * beatsPerBar(reel));

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// The last beat of a shot carries its transition out.
const TRANSITION_BEATS = 1;

export function stateAt(reel, t) {
  const b = secToBeats(reel, t);
  const i = reel.shots.findIndex((s) => b >= s.at && b < s.at + s.len);
  const shot = i >= 0 ? reel.shots[i] : null;
  const within = (x) => b >= x.at && b < x.at + x.len;
  const total = reel.bars * beatsPerBar(reel);
  const lb = reel.letterbox ?? { in: 0, out: 0 };
  const letterbox = Math.min(lb.in ? smooth(b / lb.in) : 1, lb.out ? smooth((total - b) / lb.out) : 1);
  let transition = null;
  if (shot?.transitionOut && shot.transitionOut !== "cut") {
    const into = b - (shot.at + shot.len - TRANSITION_BEATS);
    if (into >= 0) transition = { kind: shot.transitionOut, progress: into / TRANSITION_BEATS };
  }
  return {
    shot,
    shotIndex: i,
    local: shot ? beatsToSec(reel, b - shot.at) : 0,
    shotLen: shot ? beatsToSec(reel, shot.len) : 0,
    captions: reel.captions.filter(within),
    narration: reel.narration.find(within) ?? null,
    letterbox,
    transition,
  };
}

export function eventsBetween(reel, t0, t1) {
  if (!(t1 > t0)) return [];
  const b0 = secToBeats(reel, t0), b1 = secToBeats(reel, t1);
  const out = [];
  for (const shot of reel.shots) {
    for (const ev of shot.events ?? []) {
      const at = shot.at + ev.at;
      if (at > b0 && at <= b1) out.push({ shotId: shot.id, ev, at });
    }
  }
  // Events at beat 0 of the reel fire on the first update from t0 = -epsilon.
  return out.sort((a, b) => a.at - b.at).map(({ shotId, ev }) => ({ shotId, ev }));
}

export function capFlashes(times, maxPerSec = 3) {
  const gap = 1 / maxPerSec;
  const kept = [];
  for (const t of [...times].sort((a, b) => a - b)) if (!kept.length || t - kept.at(-1) >= gap - 1e-9) kept.push(t);
  return kept;
}

export function validateReel(reel) {
  const errs = [];
  const total = reel.bars * beatsPerBar(reel);
  let at = 0;
  for (const s of reel.shots) {
    if (Math.abs(s.at - at) > 1e-9) errs.push(`shot ${s.id} starts at ${s.at}: gap or overlap (shots must be contiguous from ${at})`);
    if (!(s.len > 0)) errs.push(`shot ${s.id} has no length`);
    if (!s.scene?.kind) errs.push(`shot ${s.id} has no scene kind`);
    for (const ev of s.events ?? []) if (ev.at < 0 || ev.at > s.len) errs.push(`shot ${s.id} event ${ev.type} outside the shot`);
    at = s.at + s.len;
  }
  if (Math.abs(at - total) > 1e-9) errs.push(`shots end at ${at}, reel is ${total} beats`);
  for (const c of reel.captions) if (c.at < 0 || c.at + c.len > total) errs.push(`caption "${c.text}" outside the reel`);
  for (const n of reel.narration) if (n.at < 0 || n.at + n.len > total) errs.push(`narration "${n.text}" outside the reel`);
  return errs;
}
```

Note on the first test's `eventsBetween(reel, 0, 4.1)`: `a:flash` is at beat 1 (0.5 s) and `b:glitch` at beat 8 (4 s), both inside `(0, 4.1]`; `b:shake` is at beat 12 (6 s), outside. The director starts its clock at `-1e-6` so beat-0 events fire.

- [ ] **Step 4: Run tests** → `npx vitest run tests/unit/cinematic-timeline.test.js` PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cinematic/timeline.js src/cinematic/seeded.js tests/unit/cinematic-timeline.test.js
git commit -m "feat(cinematic): add the beat-based reel timeline"
```

---

### Task 2: Cinematic overlay

**Files:**
- Create: `src/cinematic/overlay.js`
- Test: `tests/unit/cinematic-overlay.test.js`

**Interfaces:**
- Consumes: `stateAt()` output (Task 1).
- Produces:
  - `overlayLayout(w, h, { letterbox, fontScale = 1, safe = 0 }) → { barH: number, caption: { x, y, maxW, size }, title: { x, y, size }, card: { x, y, w, h } }` (pure; bars aim at 2.39:1 when `letterbox === 1`)
  - `drawOverlay(ctx, w, h, state, { profile: "legacy"|"modern"|"realistic", reducedMotion: boolean, fontScale: number, flash: number /*0..1*/, glitch: number /*0..1*/, logo: HTMLImageElement|null, now: number })`
  - `drawSkipHint(ctx, w, h, text, progress)` (lore hold-to-skip)

- [ ] **Step 1: Failing test (layout only; drawing is checked visually in Task 4)**

```js
// tests/unit/cinematic-overlay.test.js
import { describe, it, expect } from "vitest";
import { overlayLayout } from "../../src/cinematic/overlay.js";

describe("overlay layout", () => {
  it("letterboxes 16:9 to 2.39:1 when fully in", () => {
    const { barH } = overlayLayout(1920, 1080, { letterbox: 1 });
    expect(Math.round(1080 - 2 * barH)).toBe(Math.round(1920 / 2.39));
  });
  it("has no bars when the letterbox is out", () => {
    expect(overlayLayout(1920, 1080, { letterbox: 0 }).barH).toBe(0);
  });
  it("keeps captions inside the picture, above the bottom bar", () => {
    const l = overlayLayout(1440, 900, { letterbox: 1 });
    expect(l.caption.y).toBeLessThan(900 - l.barH);
    expect(l.caption.x).toBeGreaterThan(0);
  });
  it("scales caption size with font scale", () => {
    expect(overlayLayout(1440, 900, { letterbox: 1, fontScale: 1.5 }).caption.size).toBeGreaterThan(overlayLayout(1440, 900, { letterbox: 1 }).caption.size);
  });
  it("never letterboxes a picture already wider than 2.39:1", () => {
    expect(overlayLayout(2400, 900, { letterbox: 1 }).barH).toBe(0);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `overlayLayout` exactly to satisfy the tests (bar height = `max(0, (h - w / 2.39) / 2) * letterbox`; caption bottom-left at `x = w * 0.06`, `y = h - barH - h * 0.08`, size `clamp(h * 0.034, 16, 44) * fontScale`; title centred at `h * 0.5`, size `clamp(h * 0.09, 36, 120)`; boss/squad card centred, `w * 0.46` wide). Then `drawOverlay`:
  - bars: solid `#000`;
  - fade: black rectangle alpha = `smooth(progress)`; flash: white alpha = `flash` (skipped when `reducedMotion`); glitch: 3–6 horizontal slices of the canvas redrawn offset by ±`w*0.01*glitch` with red/cyan channel copies at 0.35 alpha (skipped when `reducedMotion`);
  - captions: `kind: "caption"` bold condensed (use `src/ui/design-tokens.js` `FONT` and the art profile: Legacy uses the neon monospace with cyan glow via layered translucent fills — no `shadowBlur`; Comic uses the ink outline + fill pass; Modern off-white with a thin rule), slide in over 250 ms from `x - 24` with alpha, out the same; `kind: "title"` centred large (the logo slam uses `logo` image when present, drawn at 60 % width, scale-punched 1.08 → 1 over 200 ms unless reduced motion); `kind: "card"` a panel with `text` + `sub` (boss / squad cards; reuse the look of `src/ui/hud.js` `drawBossNameCard` — read it first);
  - narration: a subtitle line centred above the bottom bar, smaller than captions.
  Cache font strings per size (no per-frame string building beyond the text itself).

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cinematic/overlay.js tests/unit/cinematic-overlay.test.js
git commit -m "feat(cinematic): draw letterbox, captions, cards and transitions"
```

---

### Task 3: Director runtime, CINEMATIC state, `art` and `campaign` scenes

**Files:**
- Create: `src/cinematic/director.js`, `src/cinematic/scenes/art.js`, `src/cinematic/scenes/campaign.js`
- Modify: `src/types.js` (add `CINEMATIC: "cinematic"`), `js/state-manager.js:29` (transitions TITLE/MODE_SELECT/CHARACTER_CREATE/ARCHIVE ↔ CINEMATIC, CINEMATIC → CUTSCENE), `js/main.js:517` gameLoop (call `updateDirector` in CINEMATIC; the game's own `update` does not run AI there), `src/rendering/render-pipeline.js:382` (`renderFrame` CINEMATIC branch → `renderDirector`), `src/systems/input-dispatch.js` + `js/game.js` pointer/touch/pad paths (any input → `directorInput`)
- Test: `tests/unit/cinematic-director.test.js`, `tests/cinematic.spec.js`

**Interfaces:**
- Consumes: Task 1, Task 2; `src/systems/showcase-path.js` (`buildShowcasePath`, `samplePath`); `src/systems/showcase.js` (read it for the snapshot/restore pattern, `SHOWCASE_FIELDS`, staged install over frames, act palette, idle enemy posing — reuse helpers by exporting them from `showcase.js` rather than copying); `drawCutsceneBg(ctx, w, h, bg, t)` (`js/cutscene.js:3183`) and `drawCutsceneArt(ctx, w, h, art, t, isTouch)` (`src/rendering/cutscene-art.js:20`).
- Produces:
  - `playReel(game, reel, { returnTo: "title"|"menu"|"campaign"|"archive", clock: "real"|"fixed" = "real", muted = false, onEnd })` → `Promise<void>` (resolves when the reel ends or is skipped)
  - `stopReel(game, { skipped = false })`
  - `updateDirector(game, dt)`, `renderDirector(game, gctx, hctx, w, h)`, `directorInput(game, kind: "key"|"pointer"|"pad", { down: boolean, code?: string })`
  - `stepFixed(game)` (advance exactly 1/60 s — used by the recorder)
  - `directorState(game) → { reelId, t, shotId, paused } | null` (tests/recorder)
  - Scene adapter contract: `{ build(game, spec, rng) → Promise<void>|void, update(game, dt, local), event(game, ev), teardown(game) }`; the director calls `teardown` for the previous shot before `build` of the next, and on stop.
  - `SCENES = { art, campaign }` registry (later tasks add kinds).

- [ ] **Step 1: Failing unit test for director bookkeeping (fake game, fake scenes)**

```js
// tests/unit/cinematic-director.test.js
import { describe, it, expect, vi } from "vitest";
import { playReel, stopReel, updateDirector, directorInput, directorState, registerScene } from "../../src/cinematic/director.js";

function fakeGame() {
  return { state: "title", timeScale: 1, player: { chronoActive: false }, audio: { startTrack: vi.fn(), stopMusic: vi.fn(), musicSting: vi.fn(), speak: vi.fn(), setMuted: vi.fn() } };
}
const log = [];
registerScene("fake", {
  build: (g, spec) => log.push(`build:${spec.n}`),
  update: () => {},
  event: (g, ev) => log.push(`ev:${ev.type}`),
  teardown: () => log.push("teardown"),
});
const reel = {
  id: "r", bpm: 120, bars: 2, music: [{ at: 0, track: "campaign" }], narration: [], captions: [],
  shots: [
    { id: "s1", at: 0, len: 4, scene: { kind: "fake", n: 1 }, events: [{ at: 0, type: "go" }] },
    { id: "s2", at: 4, len: 4, scene: { kind: "fake", n: 2 }, events: [{ at: 2, type: "boom" }] },
  ],
};

describe("director", () => {
  it("builds each shot, fires events once, tears down, and restores the opener", async () => {
    log.length = 0;
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "title" });
    for (let i = 0; i < 300; i++) updateDirector(g, 1 / 60);
    await done;
    expect(log).toEqual(["build:1", "ev:go", "teardown", "build:2", "ev:boom", "teardown"]);
    expect(g.state).toBe("title");
    expect(directorState(g)).toBeNull();
  });

  it("any input skips and restores", async () => {
    log.length = 0;
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "menu" });
    updateDirector(g, 0.1);
    directorInput(g, "key", { down: true, code: "KeyA" });
    await done;
    expect(g.state).toBe("modeSelect");
    expect(log.at(-1)).toBe("teardown");
  });

  it("skip during an async build abandons it cleanly", async () => {
    log.length = 0;
    let release;
    registerScene("slow", { build: () => new Promise((r) => (release = r)), update() {}, event() {}, teardown: () => log.push("slow-teardown") });
    const g = fakeGame();
    const done = playReel(g, { ...reel, shots: [{ ...reel.shots[0], scene: { kind: "slow" } }, reel.shots[1]] }, { returnTo: "title" });
    updateDirector(g, 0.01);
    directorInput(g, "pointer", { down: true });
    release();
    await done;
    expect(g.state).toBe("title");
    expect(log).toContain("slow-teardown");
  });

  it("restores time scale and chrono state when stopped mid slow-motion", async () => {
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "title" });
    updateDirector(g, 0.1);
    g.timeScale = 0.3;
    g.player.chronoActive = true;
    stopReel(g, { skipped: true });
    await done;
    expect(g.timeScale).toBe(1);
    expect(g.player.chronoActive).toBe(false);
  });

  it("does not advance while paused (tab hidden) and never double-fires events", async () => {
    log.length = 0;
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "title" });
    updateDirector(g, 0.5);
    const before = directorState(g).t;
    g._cinematicHidden = true;
    for (let i = 0; i < 60; i++) updateDirector(g, 1 / 60);
    expect(directorState(g).t).toBe(before);
    g._cinematicHidden = false;
    for (let i = 0; i < 300; i++) updateDirector(g, 1 / 60);
    await done;
    expect(log.filter((x) => x === "ev:boom")).toHaveLength(1);
  });
});
```

(`_cinematicHidden` is set by a `visibilitychange` listener the director installs only when `document` exists, and removes on stop; the test sets the flag directly.)

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement the director**

Key rules (write the code to these; keep functions short):
- `playReel` validates the reel (`validateReel`; throw on errors in dev), stores `game._cinematic = { reel, t: -1e-6, returnTo, clock, shotIndex: -1, scene: null, building: null, token: {}, resolve, saved: { state, timeScale, chronoActive } }`, sets `game.state = GameState.CINEMATIC`, applies `muted`, starts music cues at `t = 0` through `audio.startTrack(track, reel.bpm)`.
- `updateDirector(game, dt)`: return if no session or `game._cinematicHidden`; on `clock === "fixed"` ignore `dt` (only `stepFixed` advances); else `t1 = t0 + dt`. If the active shot index changed: `teardown` the previous scene, then `build` the next with `mulberry32(seedFor(reel.id, shot.id))`; if `build` returns a promise, set `building` and hold `t` at the shot start until it resolves (the recorder relies on this); a stop during `building` sets `token.cancelled` and the resolved build is torn down immediately. Fire `eventsBetween(reel, t0, t1)`: director-level event types (`flash`, `glitch`, `shake`, `sting`, `music`) handled here (flashes pass through `capFlashes` state: skip a flash within 1/3 s of the previous one), everything else goes to `scene.event`. Narration lines call `audio.speak(text, voice ?? "aria", { channel: "comms" })` once when their window starts. When `t >= reelDuration` → `stopReel(game)`.
- `stopReel`: tear down the current scene (and any in-flight build), `audio.stopMusic()`, restore `timeScale = 1`, `player.chronoActive = false` and any chrono visual flag (read `src/rendering/chrono-fx.js` for the flag name), restore music for the opener (`startTrack("menu")` + `startAmbient("menu")` for title/menu), set state by `returnTo` (`title` → TITLE and show `#titleScreen`; `menu` → MODE_SELECT via the same path `onSettingsDeckClose("menu")` uses; `campaign` → leave state to the `onEnd` callback; `archive` → ARCHIVE), clear `game._cinematic`, resolve the promise.
- `directorInput`: attract/trailer (`returnTo` title/menu/archive) — any `down` skips. Campaign lore — first `down` shows the hold hint (`game._cinematic.hint = now`), holding the skip action 0.8 s skips; release before that hides the hint after 2 s.
- `renderDirector`: the active scene draws the world (the `campaign` scene sets up `game.map`/`game.player` so `renderFrame`'s normal world path draws it — call the same world-render function the PLAYING path uses; the `art` scene draws `drawCutsceneBg`/`drawCutsceneArt` onto the game canvas); then `drawOverlay` on the HUD canvas with `stateAt(reel, t)`, flash/glitch envelopes (decay over 180 ms), profile from `document.documentElement.dataset.artProfile`, `reducedMotion` from `matchMedia`, `fontScale` from settings.
- `stepFixed(game)`: advances exactly 1/60 s through the same code path as `updateDirector` (ignoring `_cinematicHidden`).

Scenes:
- `scenes/art.js`: `build` stores `{ bg, art }` from spec; `renderDirector` asks the scene to `draw(gctx, w, h, local)` → `drawCutsceneBg(gctx, w, h, bg, local)` then `drawCutsceneArt(gctx, w, h, art, local, false)` if `art`; supports a slow `pan: { from: [x, y, zoom], to: [...] }` via `gctx.setTransform` around the draw. No game fields borrowed.
- `scenes/campaign.js`: reuse `showcase.js` internals — export from `showcase.js` a function `installLevelScene(game, { act, level, enemies, rng }) → restore()` that does exactly what `startShowcase` does minus the camera loop and the deck-specific framing, and make `startShowcase` call it (no behaviour change for the deck; its tests must stay green). `build` calls it with the shot's act/level and returns after the staged install (await `nextFrame` stages as the showcase does); `camera` spec is `{ kind: "path" }` (use `buildShowcasePath` + `samplePath` + heading smoothing from showcase) or `{ kind: "keys", keys: [[beat, x, y, angle], ...] }` (linear interpolation with smoothstep easing between keys) or `{ kind: "fixed", x, y, angle }`; `teardown` calls the returned `restore()`.

- [ ] **Step 4: Browser test `tests/cinematic.spec.js`**

```js
import { test, expect } from "@playwright/test";
test.use({ launchOptions: { args: ["--use-gl=angle", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } });

const testReel = {
  id: "spec", bpm: 120, bars: 4, music: [], narration: [], captions: [{ at: 1, len: 6, text: "Bend time." }],
  letterbox: { in: 1, out: 1 },
  shots: [
    { id: "a", at: 0, len: 8, scene: { kind: "art", bg: "deep_space" } },
    { id: "b", at: 8, len: 8, scene: { kind: "campaign", act: 1, level: 5, camera: { kind: "path" } } },
  ],
};

test("a reel plays art then a live level and returns to the menu untouched", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter");
  const before = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
  const done = page.evaluate(async (reel) => {
    const { playReel } = await import("/src/cinematic/director.js");
    await playReel(window.ccDebug.game, reel, { returnTo: "menu" });
  }, testReel);
  await page.waitForFunction(() => window.ccDebug.game.state === "cinematic");
  await page.waitForTimeout(5000);
  await done;
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
  expect(await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])))).toBe(before);
  expect(errors).toEqual([]);
});

test("any key skips; skipping during the level build leaves nothing behind", async ({ page }) => {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter");
  const map = await page.evaluate(() => window.ccDebug.game.map?.name ?? null);
  await page.evaluate(async (reel) => {
    const { playReel } = await import("/src/cinematic/director.js");
    playReel(window.ccDebug.game, { ...reel, shots: [{ ...reel.shots[1], at: 0, len: 16 }] }, { returnTo: "menu" });
  }, testReel);
  await page.keyboard.press("Space");
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
  expect(await page.evaluate(() => window.ccDebug.game.map?.name ?? null)).toBe(map);
});
```

- [ ] **Step 5: Run** `npx vitest run tests/unit/cinematic-director.test.js tests/unit/showcase.test.js` and `CC_TEST_PORT=5173 npx playwright test tests/cinematic.spec.js tests/settings-deck.spec.js` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/cinematic src/types.js js/state-manager.js js/main.js src/rendering/render-pipeline.js src/systems/input-dispatch.js js/game.js src/systems/showcase.js tests/unit/cinematic-director.test.js tests/cinematic.spec.js
git commit -m "feat(cinematic): add the director and the cinematic game state"
```

---

### Task 4: Title attract loop, Watch Trailer, first sizzle draft

**Files:**
- Create: `src/cinematic/reels/sizzle.js` (draft: the lore opening and logo as `art`/`campaign` shots, montage shots as `campaign` placeholders with captions — Task 7 completes it)
- Modify: `js/main.js` (idle timer on TITLE; `#btnTrailer` handler; key binding), `index.html` (mode-select "Watch Trailer" button in the same markup pattern as the others, with its number-key/pad hint), `style.css`, `js/audio.js` (`setMuted(bool)`; `onBeat(fn) → unsubscribe` wrapping `_dispatchBeat`)
- Test: `tests/cinematic.spec.js`, `tests/unit/cinematic-reels.test.js`

**Interfaces:**
- Consumes: `playReel` (Task 3).
- Produces: `SIZZLE` reel export; `startAttract(game)` / `ATTRACT_IDLE_MS = 25000`; `audio.setMuted`, `audio.onBeat`.

- [ ] **Step 1: Failing tests**
  - Unit: `validateReel(SIZZLE)` is `[]`; its duration is 70–80 s; it has a `title` caption shot with the logo between 14 and 20 s; late-boss shots use `kind: "card"` or a silhouette flag.
  - Browser: (a) title idle — use `page.clock.install()` then `page.clock.fastForward(26000)` on the plain title → state `cinematic`; press any key → TITLE, `#titleScreen` visible, no errors. (b) With the analytics consent card forced open (find how it is shown in `js/analytics.js`), fast-forward 26 s → still TITLE. (c) Before any gesture the attract is muted (`audio.setMuted` called with true, or master gain 0) and captions still draw. (d) Mode select → Watch Trailer → cinematic with sound → press B/Escape → MODE_SELECT with focus on `#btnTrailer`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** The idle timer resets on every input and only counts while `game.state === TITLE`, `#titleScreen` is visible, no modal/toast is open (`document.querySelector("#cc-analytics-modal")` hidden, no `.unlock-toast` visible), and `document.visibilityState === "visible"`. The attract calls `playReel(game, SIZZLE, { returnTo: "title", muted: !game.audio.ctx || game.audio.ctx.state !== "running" })` and restarts the idle timer when it ends. Attract frame cap: while `game._cinematic?.returnTo === "title"`, pass cap 30 to the frame pacer (read `src/systems/frame-pacer.js` / `js/main.js` loop for where the cap is chosen; Battery Saver already caps at 30).
- [ ] **Step 4: Run** unit + `tests/cinematic.spec.js` → PASS. Screenshot the draft reel at 0 s, 4 s, 10 s, 16 s, 30 s in all three art styles into `scratch/cinematic/` and look at them.
- [ ] **Step 5: Commit**

```bash
git add src/cinematic/reels/sizzle.js js/main.js index.html style.css js/audio.js tests/cinematic.spec.js tests/unit/cinematic-reels.test.js
git commit -m "feat(cinematic): play the sizzle reel on title idle and from Watch Trailer"
```

---

### Task 5: Combat, Chrono and card events

**Files:**
- Modify: `src/cinematic/scenes/campaign.js` (events), `src/cinematic/director.js` (restore list)
- Test: `tests/unit/cinematic-events.test.js`, `tests/cinematic.spec.js`

**Interfaces:**
- Consumes: `Enemy` (`js/entities.js:190`), AI states `idle|chase|windup|attack|pain|dead` and `beginWindup(e, time)` (`src/systems/ai.js:46`), player weapons (`js/entities.js`, `src/data/weapons.js` ids 0 pistol, 1 shotgun), Chrono (`js/game.js:2192-2253` time scale, `src/systems/chrono-powers.js:607` `tryRewind`, `:634` `tryTimeLock`), `drawBossNameCard` look (`src/ui/hud.js:229`).
- Produces `campaign` scene events:
  - `{ type: "spawn", enemy, at: [x, y] | "ahead", count, spread }`
  - `{ type: "attack", target: "nearest" }` — puts enemies into `windup` → `attack` toward the camera (damage to the player is disabled: set `player.invulnerable` / god-mode flag for the shot and restore)
  - `{ type: "fire", weapon: 0|1|…, dur }` — the player fires the given weapon (switch without the switch animation delay, `isFiring` for `dur` beats), aimed along the camera
  - `{ type: "chrono", on: boolean }` — Chrono Shift slow-mo through the same code path the key uses (so desaturation and time scale behave exactly as in play)
  - `{ type: "rewind" }`, `{ type: "timeLock" }` — call the powers with the powers temporarily granted for the shot
  - `{ type: "freeze", target }` — the Time-Lock visual on one enemy mid-leap
  - director-level `{ type: "card", title, sub, silhouette?: boolean }` — drawn by the overlay as a boss/squad card
  - `{ type: "squad", members: ["lyra","rook","nova","kael"] }` — four portrait cards in sequence (reuse squad portrait art: find it via `src/ui/portrait*.js` / cast models)

- [ ] **Step 1: Failing tests**
  - Unit: a fake game + `campaign` scene: `chrono on` sets `chronoActive` and the time scale target; director `stopReel` mid-chrono restores `timeScale === 1`, `chronoActive === false`, powers and invulnerability restored (**Review Focus 1**).
  - Browser: a two-shot test reel with `spawn` + `attack` + `fire` + `chrono` plays with no page errors; after it, `ccDebug.getPlayer()` equals the pre-reel player (health, weapons, powers), `timeScale` is 1.
- [ ] **Step 2–4:** implement, run, screenshot `chrono` and `fire` moments in Comic and Modern.
- [ ] **Step 5: Commit** `feat(cinematic): script combat, Chrono powers and cards in reels`.

---

### Task 6: Meltdown, Forge, creator and title scenes

**Files:**
- Create: `src/cinematic/scenes/meltdown.js`, `forge.js`, `creator.js`, `title.js`
- Test: `tests/unit/cinematic-scenes.test.js`, `tests/cinematic.spec.js`

**Interfaces:**
- Consumes: `game.startMeltdown(heroKey, ironman)` (`js/game.js:1331`) and `_meltdownUpgradeChoices` (`:261`); `game.startBuilder()` (`js/game.js:3168`), `builder.cameraFor()` (`js/forge.js:1039/1104`), world `setBlock` (as `js/testing/debug-bridge.js:92` does), `drawVoxelScene` (`src/rendering/render-pipeline.js:281`); `buildAgentSvg(character, opts)` (`src/rendering/svg-art/agent-rig.js`) + `getLayerImage` (`src/rendering/svg-art/raster.js`); logo `assets/brand/{legacy,comic,modern}/logotype.svg`.
- Produces scene kinds:
  - `meltdown`: sandboxed Meltdown field (no run record, no stats): shows the upgrade-card overlay for `spec.pickBeats` then a swarm; teardown restores everything `startMeltdown` touched (read it; snapshot those fields).
  - `forge`: a sandbox voxel world (never the player's saved worlds — do not touch Forge storage keys) with a scripted build timelapse (`spec.build: "tower" | "bridge"` → a list of block placements released over the shot), camera orbit; teardown disposes the voxel scene state it created.
  - `creator`: draws the current `game.character` (or `spec.looks[]` switched on beat events `{ type: "look", index }`) with `buildAgentSvg` onto the game canvas, full-body or bust; used by the sizzle (suit/hair/badge flips) and the lore video (the player's own agent close-up with a `visor` event that brightens the visor).
  - `title`: the logo (per art style) on a starfield/backdrop; used for the logo slam and the end card.
  - Director event `{ type: "artStyle", style: 0|1|2 }`: switches the art style for the rest of the shot through `setArtStyle` **without persisting** it, and restores the player's style at shot teardown/stop.
- [ ] **Step 1: Failing tests** — unit: each scene's teardown restores every field it borrows (fake game capturing assignments); `artStyle` event never calls `game.saveSettings` and restores the style. Browser: a reel with one shot of each kind plays in all three art styles without errors; afterwards the Forge storage keys, `cc_character`, stats and `cc_settings.artStyle` are byte-identical.
- [ ] **Step 2–4:** implement, run, screenshot each scene in the three styles.
- [ ] **Step 5: Commit** `feat(cinematic): add Meltdown, Forge, creator and title reel scenes`.

---

### Task 7: The full sizzle reel

**Files:**
- Modify: `src/cinematic/reels/sizzle.js`
- Test: `tests/unit/cinematic-reels.test.js`, contact sheet

**Interfaces:**
- Consumes: every scene kind and event from Tasks 3–6.
- Produces: the final `SIZZLE` reel matching spec §2's table (15 shots; ~75 s; bpm 120 so 1 bar = 2 s — the table's times map to bars: 0:00 = bar 0, 0:15 = bar 7.5, …).

- [ ] **Step 1:** Unit: `validateReel(SIZZLE)` is `[]`; duration 72–78 s; the logo `title` lands on a bar line; every montage cut lands on a beat; no more than 3 flash/glitch events per second after `capFlashes`; captions match the spec table text exactly; late-boss shots use cards/silhouettes.
- [ ] **Step 2:** Author the reel data. Beat-true music: `music` cues start the `campaign` track at bar 0 at bpm 120 muted-down (low layer), a `sting` + track switch to `boss` (bpm 120 override) on the logo slam, `stop` before the end card, and a final `sting`.
- [ ] **Step 3:** Contact sheet: a script (`scratch/cinematic/sheet.mjs`) that plays the reel on the fixed clock (`?record` not required — call `stepFixed` via `page.evaluate`) and screenshots the middle of every shot in Legacy, Comic and Modern at 1440×900, then tiles them. Look at it; fix framing (nothing staring into a wall, subject readable, captions not over faces).
- [ ] **Step 4: Commit** `feat(cinematic): complete the sizzle reel`.

---

### Task 8: Campaign lore video, hand-off and Archive FILMS

**Files:**
- Create: `src/cinematic/reels/campaign-lore.js`
- Modify: `js/main.js:201-212` (campaign chain), `src/ui/archive-screen.js` (`ARCHIVE_TABS` → `["BESTIARY", "MEMORIES", "FILMS"]`, entries "Trailer" and "Chrono-Corp: Origins" that play the reels with `returnTo: "archive"`), `src/systems/input-dispatch.js` ARCHIVE branch
- Test: `tests/unit/cinematic-reels.test.js`, `tests/cinematic.spec.js`

**Interfaces:**
- Produces: `CAMPAIGN_LORE` reel (spec §2 second table; Act I art only; the agent close-up is a `creator` shot using `game.character`); `playLoreThen(cb)` in `js/main.js`.

- [ ] **Step 1: Failing tests**
  - Unit: `validateReel(CAMPAIGN_LORE)` is `[]`, 36–44 s, only Act I levels/backdrops, captions/narration exact.
  - Browser: fresh storage → Campaign → creator Save & Deploy → state cinematic (lore) → hold skip 1 s → flipbook cutscene → … ; `cc_seen_lore_video` set; a second Campaign skips lore (creator → flipbook). Creator Back (no save) also leads to lore with the default look (**Review Focus 5**). Archive → FILMS lists both films; playing one returns to the Archive with the FILMS tab selected.
- [ ] **Step 2–3:** Implement the chain `playCreatorThen(() => playLoreThen(() => playIntroFlipbookThen(() => game.showCampaignPrompt())))`, where `playLoreThen` plays only when `cc_seen_lore_video` is absent and sets it when the reel ends or is skipped.
- [ ] **Step 4:** Run tests; contact sheet of the lore reel in three styles.
- [ ] **Step 5: Commit** `feat(cinematic): open new campaigns with the lore video`.

---

### Task 9: Export pipeline and outputs

**Files:**
- Create: `scripts/reel/record.mjs`; Modify: `.gitignore` (un-ignore `scripts/reel/`), `README.md` (poster image linking to the Pages-hosted `docs/media/sizzle.mp4`), `js/main.js` (`?record=<reelId>` boot: skip title, init audio, start the reel on the fixed clock, expose `window.ccReel = { step, frame, done, duration }`), `js/audio.js` (`recordTap()` → a `MediaStreamAudioDestinationNode` fed from the limiter output)
- Outputs: `docs/media/sizzle.mp4`, `docs/media/sizzle.webm`, `docs/media/sizzle-poster.png` (and `lore.*` with `--reel lore`)

**Interfaces:**
- `node scripts/reel/record.mjs [sizzle|lore] [--frames N] [--out docs/media]`

- [ ] **Step 1: Ask the user before installing ffmpeg.** Stop and request approval for `brew install ffmpeg` (the only system change in this plan). Do not proceed with Steps 3–5 until approved.
- [ ] **Step 2: Smoke test first.** `--frames 10` must produce a 10-frame 1920×1080 MP4 whose `ffprobe` reports 60 fps, h264, yuv420p.
- [ ] **Step 3: Video pass.** Playwright Chromium, GPU flags, viewport 1920×1080, DPR 1, `cc_settings` forced to Ultra / render scale 100 / art style = current default, `?record=sizzle`. Loop: `await page.evaluate(() => window.ccReel.step())` (advances 1/60 s and renders), then grab the composited frame: `page.evaluate(() => window.ccReel.frame())` returns a PNG data URL of an offscreen canvas composited from `#gameCanvas` and `#hudCanvas` at 1920×1080 → decode base64 → write to `ffmpeg -f image2pipe -framerate 60 -i - -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p video.mp4` stdin. Wait on `step()` promises that resolve after a scene build completes (the director holds time while building).
- [ ] **Step 4: Audio pass.** A second page load with `?record=sizzle&audio=1`, real-time clock, `--autoplay-policy=no-user-gesture-required`; `audio.recordTap()` + `MediaRecorder` (audio/webm;codecs=opus) from reel start to end; return the blob as base64 → `audio.webm`. If headless audio capture fails, rerun this pass with `headless: false` and say so in the report.
- [ ] **Step 5: Mux + outputs.** `ffmpeg -i video.mp4 -i audio.webm -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest docs/media/sizzle.mp4`; `ffmpeg -i video.mp4 -i audio.webm -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -c:a libopus -b:a 128k docs/media/sizzle.webm`; poster = the logo frame (`ccReel.posterFrame()`). Verify sizes ≤ 25 MB (raise CRF in steps of 2 if over), durations within 0.1 s of `reelDuration`, audio/video in sync at the logo sting (±40 ms by `ffprobe` packet times vs expected beat).
- [ ] **Step 6: README.** Add near the top: poster image linking to `https://shugknight24.github.io/clockwork_carnage/docs/media/sizzle.mp4` with alt text "Clockwork Carnage — 75-second trailer".
- [ ] **Step 7: Commit**

```bash
git add scripts/reel/record.mjs .gitignore README.md js/main.js js/audio.js docs/media/sizzle.mp4 docs/media/sizzle.webm docs/media/sizzle-poster.png
git commit -m "feat(cinematic): export the sizzle reel to MP4 and WebM"
```

---

## Self-Review Notes

- Spec coverage: §1 structure → Tasks 1–3; §2 content → Tasks 4, 7 (sizzle), 8 (lore); §3 beat-true, transitions, flash cap, captions, skip rules, settings, autoplay, determinism, cost → Tasks 1–5, 7; §4 export → Task 9; Delivery phases → Tasks 3–4 (phase 1), 5–7 (phase 2), 8 (phase 3), 9 (phase 4); Testing list → per-task tests; Risks → Review Focus 1–5, Task 6 (sandboxing Forge/Meltdown), Task 9 (headed fallback, size budget).
- Types checked across tasks: `playReel(game, reel, { returnTo, clock, muted, onEnd })`, scene adapter `{ build, update, event, teardown }` (+ optional `draw` for canvas-drawn scenes), `stepFixed(game)`, `directorState(game)`, `installLevelScene(game, opts) → restore`, `audio.setMuted`, `audio.onBeat`, `audio.recordTap`, `window.ccReel.{step, frame, posterFrame, done, duration}`.
