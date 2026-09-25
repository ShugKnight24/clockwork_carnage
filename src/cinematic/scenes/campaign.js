/**
 * `campaign` shots: a live campaign level seen through the game's own
 * first-person renderer. The level is the settings showcase's
 * (installLevelScene: the act's level, props and idle enemies, swapped in for
 * SHOWCASE_FIELDS and put back exactly by its restore), so no campaign
 * loader, save, stat or comms path is reachable from here.
 *
 * spec: { act, level (0-based within the act), enemies = true, camera }
 * camera:
 *   { kind: "path", from = 0, loop = 40 }  the showcase's loop through the
 *     level (start at `from` of the loop, `loop` seconds a lap), heading
 *     spring-smoothed as in the showcase;
 *   { kind: "keys", keys: [[beat, x, y, angle], ...] }  eased between keys
 *     (beats from the shot's start);
 *   { kind: "fixed", x, y, angle }.
 */
import { beatsToSec } from "../timeline.js";
import { installLevelScene, targetHeading, stepHeading, updateAmbience, LOOP_SECONDS } from "../../systems/showcase.js";
import { samplePath } from "../../systems/showcase-path.js";

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const fovOf = (game) => game.settings?.fov ?? 75;

export const campaign = {
  // Drawn by the render pipeline's world pass, not by the scene.
  world: true,

  async build(game, spec, rng, { live = () => true, reel, handle }) {
    const level = await installLevelScene(game, { act: spec.act ?? 1, level: spec.level ?? 0, live, enemies: spec.enemies !== false });
    if (!level) return;
    // Per-shot state rides on the director's handle for this shot.
    const cam = spec.camera ?? { kind: "path" };
    const state = { level, cam, rng, reel, heading: 0, vel: 0 };
    handle.level = state;
    if (cam.kind === "path") state.heading = targetHeading(level.path, pathTime(cam, 0), fovOf(game), 0);
    placeCamera(game, state, 0, 0);
  },

  update(game, dt, local, handle) {
    const state = handle.level;
    if (!state) return;
    placeCamera(game, state, local, dt);
    updateAmbience(game, state.level.emitters, dt, state.rng);
  },

  event() {},

  teardown(game, handle) {
    handle.level?.level.restore();
    handle.level = null;
  },
};

/** Seconds along the showcase loop at shot time `local`. */
function pathTime(cam, local) {
  const loop = cam.loop ?? LOOP_SECONDS;
  return ((cam.from ?? 0) * LOOP_SECONDS + local * (LOOP_SECONDS / loop)) % LOOP_SECONDS;
}

function placeCamera(game, state, local, dt) {
  const p = game.player;
  const { cam, level } = state;
  if (cam.kind === "fixed") {
    p.x = cam.x;
    p.y = cam.y;
    p.angle = cam.angle ?? 0;
  } else if (cam.kind === "keys" && cam.keys?.length) {
    const [x, y, angle] = sampleKeys(state.reel, cam.keys, local);
    p.x = x;
    p.y = y;
    p.angle = angle;
  } else {
    const t = pathTime(cam, local);
    if (dt > 0) stepHeading(state, targetHeading(level.path, t, fovOf(game), 0), dt);
    const s = samplePath(level.path, t / LOOP_SECONDS);
    p.x = s.x;
    p.y = s.y;
    p.angle = state.heading;
  }
}

/** [x, y, angle] at shot time `local` from `[[beat, x, y, angle], ...]`, smoothstep-eased per span. */
function sampleKeys(reel, keys, local) {
  const at = (k) => (reel ? beatsToSec(reel, k[0]) : k[0]);
  if (local <= at(keys[0])) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (local > at(b)) continue;
    const k = smooth((local - at(a)) / Math.max(1e-6, at(b) - at(a)));
    // The shorter way round for the angle.
    const da = Math.atan2(Math.sin(b[3] - a[3]), Math.cos(b[3] - a[3]));
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + da * k];
  }
  return keys.at(-1).slice(1);
}
