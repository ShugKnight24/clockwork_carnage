/**
 * Reel director: plays a timeline (timeline.js) in GameState.CINEMATIC.
 *
 * Each shot's scene comes from an adapter in SCENES, built when the shot
 * starts and torn down when it ends or the reel stops; every adapter puts
 * back whatever game fields it borrowed. The director itself only borrows
 * the state, time scale, chrono flag and music, and restores them on stop.
 *
 * One clock serves both uses: "real" advances by frame time (in game),
 * "fixed" only by stepFixed()'s exact 1/60 s (the recorder). While a scene
 * builds asynchronously the clock holds at the shot's first frame, so a slow
 * level load delays the reel instead of skipping into it.
 */
import { GameState } from "../types.js";
import { beatsToSec, secToBeats, reelDuration, stateAt, eventsBetween, validateReel } from "./timeline.js";
import { mulberry32, seedFor } from "./seeded.js";
import { drawOverlay, drawSkipHint, overlayLayout, squadLayout } from "./overlay.js";
import { activeDevice, glyph } from "../ui/input-glyphs.js";
import { getArtStyle, setArtStyle } from "../rendering/art-style.js";
import { logoFor } from "./brand.js";
import { art } from "./scenes/art.js";
import { campaign } from "./scenes/campaign.js";
import { meltdown } from "./scenes/meltdown.js";
import { forge } from "./scenes/forge.js";
import { creator } from "./scenes/creator.js";
import { title } from "./scenes/title.js";

/**
 * Scene adapters by `scene.kind`:
 *   build(game, spec, rng, { live, shot, reel, handle, prepared }) → void | Promise
 *     (`live()` turns false once the shot is abandoned; `handle` is this
 *     shot's own object, for per-shot state; `prepared` is what the
 *     adapter's prepare returned for this shot, or null)
 *   optional prepare(game, spec, { live, shot, reel }) → anything: called
 *     once for the next shot while the current one plays, for heavy work
 *     that shows and borrows nothing (so the cut's build can be quick)
 *   optional discard(game, prepared): a prepare whose shot never builds
 *     (the reel stopped first) is handed back, to free what it holds
 *   optional early: true | (spec, shot) => boolean: prepare this shot when
 *     the reel starts instead, holding the clock on the opening black until
 *     every early prepare's `done` settles (a few seconds at most). For work
 *     too heavy to hide under any shot's frames (a GL context and its
 *     atlas bake, environment art in several finishes).
 *   optional preload(game, spec, { live, shot, reel }) → Promise | null: called for
 *     every shot as the reel starts, under the same hold, for shared work
 *     kept by the adapter (not the shot) until release(game), which the
 *     director calls once per adapter when the reel stops.
 *   update(game, dt, local, handle), event(game, ev, handle), teardown(game, handle)
 *   and either draw(gctx, w, h, local, { game, shotLen, handle }) to paint
 *   the game canvas, or `world: true` to have the game's first-person view
 *   drawn (spec `weapon: false` leaves the viewmodel out);
 *   optional hud(hctx, w, h, local, { game, shotLen, handle, profile, dpr,
 *     letterbox, fontScale, reducedMotion }) paints the HUD canvas under the
 *     overlay, at full resolution (type, logos, the agent).
 */
export const SCENES = { art, campaign, meltdown, forge, creator, title };

export function registerScene(kind, adapter) {
  SCENES[kind] = adapter;
}

const STEP = 1 / 60;
// The first frame of a reel sits just before 0 so events on beat 0 fire.
const T_START = -1e-6;
// Flashes and glitches: at most 3 a second, each decaying over 180 ms.
const FLASH_GAP = 1 / 3;
const FLASH_DECAY = 0.18;
const SHAKE_DECAY = 0.35;
const HOLD_TO_SKIP_MS = 800;
// The longest the opening black waits on the early prepares.
const EARLY_MAX_MS = 5000;
const HINT_LINGER_MS = 2000;
// A frame longer than this (a stall, or the first frame back in a tab) only
// moves the reel this far, so it never jumps over a shot.
const MAX_DT = 0.1;

const RETURN_STATE = { title: GameState.TITLE, menu: GameState.MODE_SELECT, archive: GameState.ARCHIVE };
const SCREEN_FOR = { title: "titleScreen", menu: "modeSelect" };

/**
 * Play `reel`. Resolves when it ends or is skipped, after the opener is
 * restored. returnTo: "title" | "menu" | "archive" set that state back;
 * "campaign" leaves the state to `onEnd` (the lore video hands off to the
 * flipbook) and makes skipping a hold rather than any press.
 */
export function playReel(game, reel, { returnTo = "title", clock = "real", muted = false, onEnd = null } = {}) {
  const errs = validateReel(reel);
  if (errs.length) throw new Error(`[cinematic] invalid reel "${reel.id}": ${errs.join("; ")}`);
  if (game._cinematic) stopReel(game);
  let resolve;
  const done = new Promise((r) => (resolve = r));
  const audio = game.audio;
  const sess = {
    reel,
    duration: reelDuration(reel),
    t: T_START,
    carry: 0,
    returnTo,
    clock,
    onEnd,
    resolve,
    shotIndex: -1,
    current: null,
    building: null,
    pending: [],
    flashAt: -Infinity,
    glitchAt: -Infinity,
    lastFlash: -Infinity,
    shakeAt: -Infinity,
    shakeAmp: 0,
    held: new Set(),
    // Director-level cards and the squad roll call (reel beats).
    cards: [],
    squad: null,
    // The next shot's prepare: { index, value }.
    prep: null,
    holdSince: null,
    hintUntil: 0,
    muted: !!muted,
    saved: {
      timeScale: game.timeScale,
      chronoActive: game.player?.chronoActive,
      track: audio?._currentTrack ?? null,
      tempo: audio?._trackTempo,
      ambient: audio?._ambientType ?? null,
      focus: typeof document !== "undefined" ? document.activeElement : null,
      consent: hideConsentCard(),
    },
  };
  game._cinematic = sess;
  game.state = GameState.CINEMATIC;
  audio?.stopSpeech?.();
  if (muted) audio?.setMuted?.(true);
  watchVisibility(game, sess);
  loadSquadArt(game, reel);
  prepareEarly(game, sess);
  return done;
}

/** End the reel now: tear down the scene, restore what the director borrowed, resolve playReel. */
export function stopReel(game, { skipped = false } = {}) {
  const sess = game._cinematic;
  if (!sess) return;
  delete game._cinematic;
  leaveShot(game, sess);
  dropPrep(game, sess);
  dropEarly(game, sess);
  sess.unwatch?.();
  delete game._cinematicHidden;
  const { saved } = sess;
  game.timeScale = saved.timeScale ?? 1;
  if (game.player) game.player.chronoActive = saved.chronoActive ?? false;
  // A Chrono Shift's pitch-down and duck, whatever frame the reel ended on.
  game.audio?.setTimeScale?.(game.timeScale);
  restoreAudio(game.audio, sess);
  if (saved.consent) saved.consent.el.style.display = saved.consent.display;
  const to = RETURN_STATE[sess.returnTo];
  if (to) {
    game.state = to;
    // main.js's loop swaps the screens on the state change next frame; the
    // menu is shown now so the button the reel was started from takes focus.
    const id = SCREEN_FOR[sess.returnTo];
    if (id && typeof document !== "undefined") document.getElementById(id)?.classList.remove("hidden");
    saved.focus?.focus?.({ preventScroll: true });
  }
  sess.onEnd?.({ skipped });
  sess.resolve();
}

/** Advance by one frame's real time (ignored on the fixed clock or while the tab is hidden). */
export function updateDirector(game, dt) {
  const sess = game._cinematic;
  if (!sess) return;
  checkHoldSkip(game, sess);
  if (game._cinematic !== sess || game._cinematicHidden || sess.clock === "fixed") return;
  advance(game, sess, Math.min(MAX_DT, Math.max(0, dt)));
}

/**
 * Advance exactly 1/60 s through the same path as updateDirector. Resolves
 * once time has moved (after waiting out any scene build that holds it), or
 * the reel has ended.
 */
export async function stepFixed(game) {
  for (;;) {
    const sess = game._cinematic;
    if (!sess) return;
    if (sess.building) {
      await sess.building.settled;
      continue;
    }
    if (sess.early?.hold) {
      await sess.early.settled;
      continue;
    }
    const before = sess.t;
    advance(game, sess, STEP);
    if (sess.t !== before || game._cinematic !== sess) return;
  }
}

export function directorState(game) {
  const sess = game._cinematic;
  if (!sess) return null;
  const b = secToBeats(sess.reel, sess.t);
  return {
    reelId: sess.reel.id,
    t: sess.t,
    shotId: sess.current?.shot.id ?? null,
    paused: !!game._cinematicHidden || !!sess.building || !!sess.early?.hold,
    hint: performanceNow() < sess.hintUntil || sess.holdSince != null,
    card: activeCards(sess, b)[0]?.text ?? null,
    squad: squadMember(sess.squad, b)?.id ?? null,
  };
}

/**
 * Any key, click, touch or pad button. The attract loop, Watch Trailer and
 * Archive replays skip on the first press; the campaign's lore video shows a
 * "hold to skip" hint and skips once a press is held long enough.
 */
export function directorInput(game, kind, { down = true, code } = {}) {
  const sess = game._cinematic;
  if (!sess) return;
  const id = kind === "key" ? `key:${code}` : kind;
  if (sess.returnTo !== "campaign") {
    if (down) stopReel(game, { skipped: true });
    return;
  }
  const now = performanceNow();
  if (down) {
    if (sess.held.has(id)) return; // key repeat
    sess.held.add(id);
    sess.holdSince ??= now;
    sess.hintUntil = now + HINT_LINGER_MS;
    return;
  }
  sess.held.delete(id);
  if (!sess.held.size) {
    sess.holdSince = null;
    sess.hintUntil = now + HINT_LINGER_MS;
  }
}

// ─── Clock ────────────────────────────────────────────────────────────────

function advance(game, sess, dt) {
  if (sess.building || sess.early?.hold) return;
  const { reel } = sess;
  // Enter the shot the clock has reached (t < 0 reads as the first shot).
  const idx = stateAt(reel, sess.t).shotIndex;
  if (idx >= 0 && idx !== sess.shotIndex) {
    enterShot(game, sess, idx);
    if (sess.building || game._cinematic !== sess) {
      sess.carry = 0; // the clock holds here until the build lands
      return;
    }
  }
  flushPending(game, sess);
  if (game._cinematic !== sess) return;
  if (sess.current?.ready) prepareNext(game, sess);

  // Never cross more than one cut per step: the next shot has to be built
  // before any of its time runs. Time cut off at the cut carries over.
  const shot = sess.current?.shot;
  const cut = shot ? beatsToSec(reel, shot.at + shot.len) : sess.duration;
  const t0 = sess.t;
  const t1 = Math.min(t0 + dt + sess.carry, cut);
  sess.carry = Math.max(0, t0 + dt + sess.carry - t1);
  sess.t = t1;

  fireCues(game, sess, t0, t1);
  for (const { shotId, ev } of eventsBetween(reel, t0, t1)) {
    if (shotId === shot?.id) fire(game, sess, ev);
    else sess.pending.push({ shotId, ev }); // on the cut: belongs to the next shot
  }
  if (game._cinematic !== sess) return;
  const cur = sess.current;
  if (cur?.ready) cur.scene.update?.(game, t1 - t0, localTime(sess), cur);
  if (t1 >= sess.duration - 1e-9) stopReel(game);
}

function localTime(sess) {
  const shot = sess.current?.shot;
  return shot ? Math.max(0, sess.t - beatsToSec(sess.reel, shot.at)) : 0;
}

function flushPending(game, sess) {
  if (!sess.pending.length || !sess.current?.ready) return;
  const id = sess.current.shot.id;
  const due = sess.pending.filter((p) => p.shotId === id);
  sess.pending = sess.pending.filter((p) => p.shotId !== id);
  for (const { ev } of due) fire(game, sess, ev);
}

// ─── Shots ────────────────────────────────────────────────────────────────

function enterShot(game, sess, index) {
  const prev = sess.current?.shot;
  leaveShot(game, sess);
  const shot = sess.reel.shots[index];
  sess.shotIndex = index;
  // A flash or glitch cut out of the previous shot lands on the new shot's
  // first frame, once it is built (not over the black of a held build).
  if (prev?.transitionOut === "flash" || prev?.transitionOut === "glitch") sess.pending.push({ shotId: shot.id, ev: { type: prev.transitionOut } });
  const scene = SCENES[shot.scene.kind];
  const handle = { shot, scene, ready: false, abandoned: false, settled: null };
  sess.current = handle;
  if (!scene) {
    console.warn(`[cinematic] no scene adapter for "${shot.scene.kind}"`);
    return;
  }
  const live = () => game._cinematic === sess && sess.current === handle;
  let result;
  const early = sess.early?.values.get(index);
  let prepared = sess.prep?.index === index ? sess.prep.value : null;
  if (sess.prep?.index === index) sess.prep.used = true;
  else dropPrep(game, sess);
  if (early !== undefined) {
    sess.early.values.delete(index);
    prepared = early;
  }
  try {
    result = scene.build(game, shot.scene, mulberry32(seedFor(sess.reel.id, shot.id)), { live, shot, reel: sess.reel, handle, prepared });
  } catch (err) {
    console.warn(`[cinematic] shot "${shot.id}" failed to build`, err);
    failBuild(game, handle);
    return;
  }
  if (!result || typeof result.then !== "function") {
    handle.ready = true;
    return;
  }
  sess.building = handle;
  // Settle in the build's own reaction, not a chained one: a stop that
  // abandoned the build tears it down before anyone awaiting the reel runs.
  const settle = (ok) => {
    if (sess.building === handle) sess.building = null;
    if (!ok) failBuild(game, handle);
    else if (handle.abandoned) handle.scene.teardown?.(game, handle);
    else handle.ready = true;
  };
  handle.settled = new Promise((r) => {
    result.then(
      () => (settle(true), r()),
      (err) => {
        console.warn(`[cinematic] shot "${shot.id}" failed to build`, err);
        settle(false);
        r();
      },
    );
  });
}

/**
 * A build that threw may have put up part of its scene (a level installed,
 * fields borrowed) before it failed: the teardown takes down whatever it
 * finds on the handle. The shot stays dark.
 */
function failBuild(game, handle) {
  try {
    handle.scene.teardown?.(game, handle);
  } catch (err) {
    console.warn(`[cinematic] shot "${handle.shot.id}" failed to tear down`, err);
  }
}

/**
 * Once the current shot is up, let the next shot's adapter do its heavy,
 * invisible work (a level's bake and path) while this one plays, so the cut
 * does not stall on it. Only ever one prepare, and it never installs.
 */
function prepareNext(game, sess) {
  const index = sess.shotIndex + 1;
  const shot = sess.reel.shots[index];
  if (!shot || sess.prep?.index === index) return;
  sess.prep = { index, value: null };
  if (sess.early?.values.has(index)) return; // prepared when the reel started
  const scene = SCENES[shot.scene.kind];
  if (!scene?.prepare) return;
  try {
    sess.prep.value = scene.prepare(game, shot.scene, { live: () => game._cinematic === sess, shot, reel: sess.reel }) ?? null;
  } catch (err) {
    console.warn(`[cinematic] shot "${shot.id}" failed to prepare`, err);
  }
}

/**
 * Start the prepares of the shots whose adapters ask to be prepared early,
 * and hold the clock on the opening black until they settle.
 */
function prepareEarly(game, sess) {
  const values = new Map();
  sess.reel.shots.forEach((shot, index) => {
    const scene = SCENES[shot.scene.kind];
    const early = typeof scene?.early === "function" ? scene.early(shot.scene, shot) : !!scene?.early;
    if (!early || !scene.prepare) return;
    try {
      values.set(index, scene.prepare(game, shot.scene, { live: () => game._cinematic === sess, shot, reel: sess.reel }) ?? null);
    } catch (err) {
      console.warn(`[cinematic] shot "${shot.id}" failed to prepare`, err);
    }
  });
  const loads = [];
  for (const shot of sess.reel.shots) {
    const scene = SCENES[shot.scene.kind];
    if (!scene?.preload) continue;
    try {
      const load = scene.preload(game, shot.scene, { live: () => game._cinematic === sess, shot, reel: sess.reel });
      if (load) loads.push(Promise.resolve(load).catch(() => {}));
    } catch (err) {
      console.warn(`[cinematic] shot "${shot.id}" failed to preload`, err);
    }
  }
  if (!values.size && !loads.length) return;
  const early = { values, hold: true, settled: null };
  sess.early = early;
  const all = Promise.all([...loads, ...[...values.values()].map((v) => Promise.resolve(v?.done).catch(() => {}))]);
  const cap = new Promise((r) => setTimeout(r, EARLY_MAX_MS));
  early.settled = Promise.race([all, cap]).then(() => {
    early.hold = false;
  });
}

/** Early prepares whose shots never built (the reel stopped first), then every adapter's preloads. */
function dropEarly(game, sess) {
  for (const kind of new Set(sess.reel.shots.map((s) => s.scene.kind))) {
    try {
      SCENES[kind]?.release?.(game);
    } catch (err) {
      console.warn(`[cinematic] "${kind}" failed to release`, err);
    }
  }
  const early = sess.early;
  if (!early) return;
  early.hold = false;
  for (const [index, value] of early.values) {
    if (value == null) continue;
    try {
      SCENES[sess.reel.shots[index]?.scene.kind]?.discard?.(game, value);
    } catch (err) {
      console.warn("[cinematic] an early prepare failed to discard", err);
    }
  }
  early.values.clear();
}

/** A prepare whose shot never built: its adapter frees what it holds. */
function dropPrep(game, sess) {
  const prep = sess.prep;
  if (!prep || prep.used || prep.value == null) return;
  prep.used = true;
  const scene = SCENES[sess.reel.shots[prep.index]?.scene.kind];
  try {
    scene?.discard?.(game, prep.value);
  } catch (err) {
    console.warn("[cinematic] a prepared shot failed to discard", err);
  }
}

/**
 * Tear down the current scene (one still building is torn down when its
 * build lands), then put back the player's art style if the shot flipped it.
 */
function leaveShot(game, sess) {
  const h = sess.current;
  sess.current = null;
  if (h) {
    if (h.ready) h.scene.teardown?.(game, h);
    else if (sess.building === h) {
      h.abandoned = true;
      sess.building = null;
    }
  }
  restoreArtStyle(game, sess);
}

// ─── Art style flips ──────────────────────────────────────────────────────

/**
 * `{ type: "artStyle", style }` switches the style for the rest of the shot.
 * The game saves any style change as the player's setting (its
 * onArtStyleChange listener in js/game.js); `game._reelArtStyle` tells that
 * listener to stand aside, so cc_settings never sees a flip. The restore
 * clears the flag first: going back to the player's own style then runs the
 * listener as any change does (Legacy hands back the Modern bitmaps) and
 * finds the setting already matching, so it saves nothing.
 */
function flipArtStyle(game, sess, style) {
  if (!sess.style) {
    sess.style = { saved: getArtStyle() };
    game._reelArtStyle = true;
  }
  setArtStyle(style);
}

function restoreArtStyle(game, sess) {
  const s = sess.style;
  if (!s) return;
  sess.style = null;
  delete game._reelArtStyle;
  setArtStyle(s.saved);
}

// ─── Events, music and narration ──────────────────────────────────────────

/** Director-level events; everything else is the scene's. */
function fire(game, sess, ev) {
  const audio = game.audio;
  switch (ev.type) {
    case "flash":
    case "glitch":
      // Flashes and glitches share the 3-per-second budget.
      if (sess.t - sess.lastFlash < FLASH_GAP - 1e-9) return;
      sess.lastFlash = sess.t;
      if (ev.type === "flash") sess.flashAt = sess.t;
      else sess.glitchAt = sess.t;
      return;
    case "shake":
      sess.shakeAt = sess.t;
      sess.shakeAmp = ev.amount ?? 1;
      return;
    case "sting":
      audio?.musicSting?.();
      return;
    case "music":
      playCue(audio, sess.reel, ev);
      return;
    case "card":
      sess.cards.push({
        kind: "card",
        text: ev.title ?? ev.text ?? "",
        sub: ev.sub,
        tone: ev.tone ?? "boss",
        silhouette: !!ev.silhouette,
        at: eventBeat(sess, ev),
        len: ev.len ?? 4,
      });
      return;
    case "squad":
      sess.squad = rollCall(ev, eventBeat(sess, ev));
      return;
    case "artStyle":
      flipArtStyle(game, sess, ev.style);
      return;
  }
  const cur = sess.current;
  if (cur?.ready) cur.scene.event?.(game, ev, cur);
}

/** An event's reel beat (events are timed from their shot's start). */
const eventBeat = (sess, ev) => (sess.current?.shot.at ?? 0) + (ev.at ?? 0);

const activeCards = (sess, b) => sess.cards.filter((c) => b >= c.at && b < c.at + c.len);

// The squad in their own colours (the Legacy lineup's), each with the power
// they bring (src/systems/chrono-powers.js).
const SQUAD = {
  lyra: { name: "Lyra", sub: "Chrono-Analyst · Foresight", color: "#ffaa44" },
  rook: { name: "Rook", sub: "Engineer · Chrono Dash", color: "#44ff88" },
  nova: { name: "Nova", sub: "Striker · Rewind", color: "#ff4488" },
  kael: { name: "Kael", sub: "Vanguard · Time-Lock", color: "#4488ff" },
};

function rollCall(ev, at) {
  const ids = (ev.members ?? Object.keys(SQUAD)).filter((id) => SQUAD[id]);
  const len = ev.len ?? 2 * ids.length;
  const seg = len / Math.max(1, ids.length);
  const members = ids.map((id, i) => ({
    id,
    color: SQUAD[id].color,
    card: { kind: "card", tone: "squad", text: SQUAD[id].name, sub: SQUAD[id].sub, at: at + i * seg, len: seg },
  }));
  return { at, len, members };
}

function squadMember(squad, b) {
  if (!squad || b < squad.at || b >= squad.at + squad.len) return null;
  return squad.members[Math.floor(((b - squad.at) / squad.len) * squad.members.length)] ?? null;
}

function playCue(audio, reel, cue) {
  if (!audio) return;
  if (cue.stop) audio.stopMusic?.();
  if (cue.track) audio.startTrack?.(cue.track, cue.bpm ?? reel.bpm);
  if (cue.sting) audio.musicSting?.();
}

/** Music cues and narration lines whose start falls in (t0, t1]. */
function fireCues(game, sess, t0, t1) {
  const { reel } = sess;
  const b0 = secToBeats(reel, t0);
  const b1 = secToBeats(reel, t1);
  // Back-to-back windows share an edge, so a cue on it fires exactly once.
  const due = (at) => at > b0 && at <= b1;
  for (const cue of reel.music) if (due(cue.at)) playCue(game.audio, reel, cue);
  for (const line of reel.narration) {
    if (due(line.at)) game.audio?.speak?.(line.text, line.voice ?? "aria", { channel: "comms" });
  }
}

function restoreAudio(audio, sess) {
  if (!audio) return;
  const { saved } = sess;
  audio.stopSpeech?.();
  audio.stopMusic?.();
  if (sess.suspended) audio.ctx?.resume?.();
  if (sess.muted) audio.setMuted?.(false);
  // Whatever was playing under the opener (the title plays nothing).
  if (saved.track) audio.startTrack?.(saved.track, saved.tempo);
  if (saved.ambient) audio.startAmbient?.(saved.ambient);
}

/**
 * The analytics consent card (js/analytics.js) floats over every screen. A
 * reel hides it and puts it back as it was when it ends, still unanswered, so
 * it can be asked later; no choice is recorded.
 */
function hideConsentCard() {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("cc-analytics-modal");
  if (!el) return null;
  const display = el.style.display;
  el.style.display = "none";
  return { el, display };
}

// ─── Visibility and skip ──────────────────────────────────────────────────

/**
 * A hidden tab pauses the reel: the clock stops (updateDirector reads the
 * flag) and so does the audio clock, which the music scheduler books beats
 * against, so both resume on the same beat.
 */
function watchVisibility(game, sess) {
  if (typeof document === "undefined") return;
  const sync = () => {
    game._cinematicHidden = document.hidden;
    const ctx = game.audio?.ctx;
    if (document.hidden && ctx?.state === "running") {
      sess.suspended = true;
      ctx.suspend?.();
    } else if (!document.hidden && sess.suspended) {
      sess.suspended = false;
      ctx?.resume?.();
    }
  };
  document.addEventListener("visibilitychange", sync);
  sess.unwatch = () => document.removeEventListener("visibilitychange", sync);
  sync();
}

function checkHoldSkip(game, sess) {
  if (sess.holdSince != null && performanceNow() - sess.holdSince >= HOLD_TO_SKIP_MS) stopReel(game, { skipped: true });
}

const performanceNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

// ─── Drawing ──────────────────────────────────────────────────────────────

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const envelope = (since, t) => (t >= since && t - since < FLASH_DECAY ? 1 - (t - since) / FLASH_DECAY : 0);

/**
 * Draw the shot on the game canvas and the overlay on the HUD canvas.
 * `drawWorld({ weapon })` renders the game's own first-person view (the
 * render pipeline's world pass) for scenes that install a level
 * (`world: true`); scenes with `draw` paint the game canvas themselves.
 */
export function renderDirector(game, gctx, hctx, w, h, drawWorld = null) {
  const sess = game._cinematic;
  if (!sess) return;
  const reduced = reducedMotion();
  const cur = sess.current;
  const st = stateAt(sess.reel, sess.t);
  const b = secToBeats(sess.reel, Math.max(0, sess.t));
  const cards = activeCards(sess, b);
  const member = squadMember(sess.squad, b);
  const shake = reduced ? 0 : sess.shakeAmp * Math.max(0, 1 - (sess.t - sess.shakeAt) / SHAKE_DECAY);
  gctx.save();
  if (shake > 0) gctx.translate(Math.sin(sess.t * 97) * 10 * shake, Math.sin(sess.t * 71) * 6 * shake);
  if (cur?.ready && cur.scene.draw) {
    gctx.fillStyle = "#000";
    gctx.fillRect(0, 0, w, h);
    cur.scene.draw(gctx, w, h, localTime(sess), { game, shotLen: beatsToSec(sess.reel, cur.shot.len), handle: cur });
  } else if (cur?.ready && cur.scene.world && drawWorld) {
    // A card, a title or the roll call covers the picture: a gun hanging
    // under it reads as a HUD left on, not as the agent.
    const covered = cards.length > 0 || !!member || st.captions.some((c) => c.kind === "card" || c.kind === "title");
    drawWorld({ weapon: cur.shot.scene.weapon !== false && !covered });
  } else {
    // Nothing built yet (the clock is holding): black, under the letterbox.
    gctx.fillStyle = "#000";
    gctx.fillRect(0, 0, w, h);
  }
  gctx.restore();

  const hw = game.hudW || w;
  const hh = game.hudH || h;
  hctx.clearRect(0, 0, hw, hh);
  const profile = (typeof document !== "undefined" && document.documentElement.dataset.artProfile) || "modern";
  const opts = {
    profile,
    reducedMotion: reduced,
    fontScale: (game.settings?.fontScale || 100) / 100,
    flash: envelope(sess.flashAt, sess.t),
    glitch: envelope(sess.glitchAt, sess.t),
    logo: logoFor(profile),
    now: Math.max(0, sess.t),
    bpm: sess.reel.bpm,
    source: gctx.canvas,
    dpr: game.dpr,
    safe: safeInset(game),
  };
  if (cur?.ready && cur.scene.hud) {
    hctx.save();
    cur.scene.hud(hctx, hw, hh, localTime(sess), {
      game,
      shotLen: beatsToSec(sess.reel, cur.shot.len),
      handle: cur,
      profile,
      dpr: game.dpr,
      letterbox: st.letterbox ?? 0,
      fontScale: opts.fontScale,
      reducedMotion: reduced,
    });
    hctx.restore();
  }
  if (cards.length) st.captions = st.captions.concat(cards);
  if (member) {
    if (!squadArt) loadSquadArt(game, sess.reel);
    st.squad = sess.squad;
    opts.portrait = drawPortrait;
  }
  drawOverlay(hctx, hw, hh, st, opts);
  const now = performanceNow();
  if (sess.returnTo === "campaign" && (sess.holdSince != null || now < sess.hintUntil)) {
    const progress = sess.holdSince != null ? (now - sess.holdSince) / HOLD_TO_SKIP_MS : 0;
    const alpha = sess.holdSince != null ? 1 : Math.min(1, (sess.hintUntil - now) / 300);
    drawSkipHint(hctx, hw, hh, skipText(game), progress, { profile, dpr: game.dpr, safe: opts.safe, alpha });
  }
}

// ─── Squad portraits ──────────────────────────────────────────────────────

let squadArt = null; // the cutscene art chunk, loaded when a reel has a roll call
let squadArtFor = null; // the reel it was last loaded (and warmed) for

/**
 * A reel with a roll call loads the cutscene art (the squad's models) up
 * front and starts decoding Modern's bitmaps at the size the panel draws
 * them, so the first member does not open on the procedural fallback.
 * Drawing asks again (once per reel) in case the reel was started from
 * another copy of this module.
 */
function loadSquadArt(game, reel) {
  if (squadArtFor === reel) return;
  squadArtFor = reel;
  const ids = [...new Set(reel.shots.flatMap((s) => (s.events ?? []).filter((e) => e.type === "squad").flatMap((e) => e.members ?? Object.keys(SQUAD))))];
  if (!ids.length || typeof document === "undefined") return;
  Promise.all([import("../rendering/cutscene-art.js"), import("../rendering/svg-art/index.js")]).then(([art, svg]) => {
    squadArt = art;
    const ctx = game.hudCtx;
    const w = game.hudW;
    const h = game.hudH;
    if (!ctx || !w || !h) return;
    const P = squadLayout(w, h, overlayLayout(w, h, { letterbox: 1 })).panel;
    svg.warmSvgArt(ids, [], ctx, P.w, P.h * PORTRAIT_FRAME);
  }, (err) => console.warn("[cinematic] squad art failed to load", err));
}

// The figure is drawn as if into a picture this much taller than the panel,
// raised by PORTRAIT_LIFT of the panel, so the panel frames head to waist.
const PORTRAIT_FRAME = 2.8;
const PORTRAIT_LIFT = 0.19;

function drawPortrait(ctx, id, x, y, w, h, t) {
  if (!squadArt) return;
  ctx.translate(x, y - h * PORTRAIT_LIFT);
  // Past the models' 1.2 s entrance: the panel's own slide is the entrance.
  squadArt.drawCutsceneArt(ctx, w, h * PORTRAIT_FRAME, id, 1.2 + t, false);
}

function skipText(game) {
  const device = activeDevice(game);
  if (device === "touch") return "Hold to skip";
  return `Hold ${glyph(game, device === "gamepad" ? "skip" : "skipAll", device).text} to skip`;
}

function safeInset(game) {
  const sa = game.touchControls?.safeArea;
  return sa ? Math.max(sa.left || 0, sa.bottom || 0) : 0;
}
