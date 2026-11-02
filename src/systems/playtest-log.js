/**
 * The playtest log: what a playtester's session looked like, kept on their
 * device (localStorage `cc_playtest_log`) until they choose to send it. It
 * sends nothing anywhere itself; Copy / Download session and the F8 bug
 * report (src/systems/playtest-export.js) hand it to the player.
 *
 *   session   build, device tier, input, art and HUD style, difficulty and
 *             the settings that change how the game plays or runs
 *   levels    per campaign level: attempts, deaths (killer and position),
 *             time, retries, quits, completions, debrief grade, average and
 *             worst fps
 *   prologue  the step reached and the time to the first shot
 *   events    the session's last few hundred events, in order
 *
 * The game calls in from one line at each hook (CampaignManager.retryLevel,
 * Game.beginLevelLog, the exit, the death timer, the quit paths). Listeners
 * (js/analytics.js) hear each event; whether they send it is theirs to decide.
 */
import { BUILD } from "../build-info.js";
import { activeDevice } from "../ui/input-glyphs.js";

export const PLAYTEST_LOG_KEY = "cc_playtest_log";
/** Sessions kept, newest last; the oldest go first. */
export const MAX_SESSIONS = 12;
/** The stored log's size cap, in characters of JSON. */
export const MAX_BYTES = 200_000;
/** Events kept per session. */
export const MAX_EVENTS = 300;
/** How often a running level samples the frame rate, in seconds. */
const FPS_SAMPLE_SEC = 1;

/** The settings worth knowing when reading a tester's session. */
const SETTING_KEYS = [
  "difficulty", "artStyle", "hudStyle", "visualStyle", "viewMode", "graphicsPreset", "renderMode",
  "renderScale", "frameTarget", "batterySaver", "effectsQuality", "postProcessing", "gpuPostFx",
  "sensitivity", "fov", "invertY", "aimToggle", "aimAssist", "gyroAim", "autoFire", "touchSensitivity",
  "voices", "readingSpeed", "fontScale", "hudScale", "colorblind", "cutsceneAutoAdvance",
];

const listeners = new Set();
let log = null; // { version, sessions } once read
let session = null; // this page's session, once something happened
let current = null; // the level entry being played
let attempt = null; // { at, played, fps } for the current attempt
let pendingRetry = false;
let lastHit = null;
let sampleClock = 0;

const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const round1 = (n) => Math.round(n * 10) / 10;

function storage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch (_) {
    return null;
  }
}

function readLog() {
  if (log) return log;
  let parsed = null;
  try {
    parsed = JSON.parse(storage()?.getItem(PLAYTEST_LOG_KEY) || "null");
  } catch (_) {}
  log = parsed && Array.isArray(parsed.sessions) ? parsed : { version: 1, sessions: [] };
  return log;
}

/** Store the log, dropping the oldest sessions (then this one's oldest events) past the caps. */
function persist() {
  const l = readLog();
  while (l.sessions.length > MAX_SESSIONS) l.sessions.shift();
  let json = JSON.stringify(l);
  while (json.length > MAX_BYTES && l.sessions.length > 1) {
    l.sessions.shift();
    json = JSON.stringify(l);
  }
  while (json.length > MAX_BYTES && session?.events.length > 20) {
    session.events.splice(0, Math.ceil(session.events.length / 4));
    json = JSON.stringify(l);
  }
  try {
    storage()?.setItem(PLAYTEST_LOG_KEY, json);
  } catch (_) {}
}

function deviceTier(game) {
  const s = typeof screen !== "undefined" ? screen : null;
  const w = typeof window !== "undefined" ? window : null;
  return {
    tier: game?.isTouchDevice ? "touch" : "desktop",
    screen: s ? `${s.width}x${s.height}` : null,
    viewport: w ? `${w.innerWidth}x${w.innerHeight}` : null,
    dpr: w?.devicePixelRatio ?? null,
  };
}

function pickSettings(settings = {}) {
  const out = {};
  for (const k of SETTING_KEYS) if (settings[k] !== undefined) out[k] = settings[k];
  return out;
}

function ensureSession(game) {
  if (session) return session;
  const l = readLog();
  session = {
    id: Math.random().toString(36).slice(2, 10),
    startedAt: new Date().toISOString(),
    build: { ...BUILD },
    device: deviceTier(game),
    input: activeDevice(game),
    settings: pickSettings(game?.settings),
    levels: [],
    prologue: null,
    events: [],
  };
  l.sessions.push(session);
  return session;
}

/** Settings and input move during a session: keep the latest. */
function refresh(game) {
  const s = ensureSession(game);
  s.input = activeDevice(game);
  s.settings = pickSettings(game?.settings);
  s.updatedAt = new Date().toISOString();
  return s;
}

function where(game) {
  const c = game?.campaign;
  if (game?.mode === "campaign" && c) return { act: c.act, level: (c.level ?? 0) + 1 };
  return {};
}

function record(game, type, data = {}) {
  const s = refresh(game);
  const event = {
    t: round1((Date.now() - Date.parse(s.startedAt)) / 1000),
    type,
    mode: game?.mode ?? null,
    ...where(game),
    ...data,
  };
  s.events.push(event);
  if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
  persist();
  for (const fn of listeners) {
    try {
      fn(event, s);
    } catch (_) {}
  }
  return event;
}

/** Fold the running attempt's play time and frame rate into its level. */
function closeAttempt() {
  if (!current || !attempt) return 0;
  const played = attempt.played;
  current.timeSec = round1(current.timeSec + played);
  const f = attempt.fps;
  if (f.n) {
    const fps = current.fps;
    const total = (fps.avg ?? 0) * (fps.samples ?? 0) + f.sum;
    fps.samples = (fps.samples ?? 0) + f.n;
    fps.avg = round1(total / fps.samples);
    fps.worst = round1(Math.min(fps.worst ?? Infinity, f.worst));
    fps.worstFrame = round1(Math.min(fps.worstFrame ?? Infinity, f.worstFrame));
  }
  attempt = null;
  return played;
}

function prologueState(game) {
  const t = game?.tutorial;
  if (!t) return null;
  const firstShot = t.firstShotAt != null && t.suitedAt != null ? round1(t.firstShotAt - t.suitedAt) : null;
  return {
    step: t.def?.id ?? null,
    index: t.step ?? null,
    firstShotSec: firstShot,
    chapterSec: t.runClock != null ? round1(t.runClock) : null,
  };
}

function updatePrologue(game) {
  if (game?.mode !== "tutorial") return;
  const p = prologueState(game);
  if (!p) return;
  const s = ensureSession(game);
  s.prologue = { ...s.prologue, ...p, firstShotSec: p.firstShotSec ?? s.prologue?.firstShotSec ?? null };
}

// ── Hooks ───────────────────────────────────────────────────────

/** CampaignManager.retryLevel: the next level start is a retry. */
export function noteRetry(game) {
  pendingRetry = true;
  record(game, "level_retry");
}

/** Game.beginLevelLog: a campaign level (or a retry of it) begins. */
export function noteLevelStart(game) {
  closeAttempt();
  const s = refresh(game);
  const { act, level } = where(game);
  if (act == null) return;
  let entry = s.levels.find((l) => l.act === act && l.level === level);
  if (!entry) {
    entry = {
      act, level, name: game.map?.name ?? "",
      attempts: 0, deaths: [], retries: 0, quits: 0, completions: 0,
      timeSec: 0, clearSec: null, grade: null, bestGrade: null, fps: {},
    };
    s.levels.push(entry);
  }
  entry.attempts++;
  if (pendingRetry) entry.retries++;
  pendingRetry = false;
  current = entry;
  attempt = { at: nowMs(), played: 0, fps: { n: 0, sum: 0, worst: Infinity, worstFrame: Infinity } };
  lastHit = null;
  sampleClock = 0;
  record(game, "level_start", { attempt: entry.attempts });
}

/** Game.damagePlayer: who hit the player last, for the death that may follow. */
export function noteHit(game, attacker) {
  const killer = attacker?.enemyType ?? attacker?.from ?? (attacker ? "blast" : "hazard");
  lastHit = { killer, at: nowMs() };
}

/** The death timer runs out: the player is down for good (or back to a prologue checkpoint). */
export function noteDeath(game) {
  const p = game?.player ?? {};
  const death = {
    killer: lastHit?.killer ?? "unknown",
    x: round1(p.x ?? 0),
    y: round1(p.y ?? 0),
  };
  if (game?.mode === "campaign" && current) {
    death.atSec = round1(attempt?.played ?? 0);
    current.deaths.push(death);
    closeAttempt();
  }
  updatePrologue(game);
  lastHit = null;
  record(game, "level_death", death);
}

/** _checkExitReached, with the debrief it built: the level is cleared. */
export function noteLevelComplete(game, debrief) {
  const letter = debrief?.grade?.letter ?? null;
  if (current) {
    closeAttempt();
    current.completions++;
    current.clearSec = debrief?.seconds != null ? round1(debrief.seconds) : current.clearSec;
    current.grade = letter;
    if (letter && (!current.bestGrade || gradeRank(letter) > gradeRank(current.bestGrade))) current.bestGrade = letter;
  }
  record(game, "level_complete", { grade: letter, seconds: debrief?.seconds != null ? round1(debrief.seconds) : null });
  current = null;
}

/** A quit to the title, from the pause menu or the game-over screen. */
export function noteQuit(game, from) {
  if (game?.mode === "campaign" && current) {
    current.quits++;
    closeAttempt();
  }
  updatePrologue(game);
  record(game, "level_quit", { from, state: game?.state ?? null });
  current = null;
}

/** TutorialSystem._enter: the prologue reached a new step. */
export function notePrologueStep(game) {
  updatePrologue(game);
  record(game, "prologue_step", { step: game?.tutorial?.def?.id ?? null });
}

/**
 * From the playing update, every frame: play time for the attempt, and once a
 * second the frame rate (the AdaptiveQuality's rolling history).
 */
export function sample(game, dt) {
  if (!attempt || !(dt > 0)) return;
  attempt.played += dt;
  sampleClock += dt;
  if (sampleClock < FPS_SAMPLE_SEC) return;
  sampleClock = 0;
  const hist = game?.quality?.history;
  if (!hist?.length) return;
  let sum = 0;
  let min = Infinity;
  for (const f of hist) {
    sum += f;
    if (f < min) min = f;
  }
  const avg = sum / hist.length;
  const f = attempt.fps;
  f.n++;
  f.sum += avg;
  f.worst = Math.min(f.worst, avg);
  f.worstFrame = Math.min(f.worstFrame, min);
}

const GRADES = ["D", "C", "B", "A", "S"];
function gradeRank(letter) {
  return GRADES.indexOf(letter);
}

// ── Readers ─────────────────────────────────────────────────────

/** Hear every event as it is logged: `fn(event, session)`. Returns the unsubscribe. */
export function onPlaytestEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Log something that is not a hook above (a bug report, say). */
export function logEvent(game, type, data) {
  return record(game, type, data);
}

/** The last `n` events of this session. */
export function recentEvents(n = 20) {
  return session ? session.events.slice(-n) : [];
}

/** This session as a file: everything above, as of now. */
export function exportSession(game) {
  const s = refresh(game);
  updatePrologue(game);
  // The level being played counts the time so far without ending the attempt.
  const levels = s.levels.map((l) => (l === current && attempt ? { ...l, timeSec: round1(l.timeSec + attempt.played) } : l));
  return {
    format: "clockwork-carnage-playtest/1",
    exportedAt: new Date().toISOString(),
    session: { ...s, levels },
    earlierSessions: readLog().sessions.length - 1,
  };
}

/** All stored sessions, as stored. */
export function readPlaytestLog() {
  return readLog();
}

/** Tests: forget this page's session and re-read storage. */
export function resetPlaytestLog() {
  log = null;
  session = null;
  current = null;
  attempt = null;
  pendingRetry = false;
  lastHit = null;
  sampleClock = 0;
}
