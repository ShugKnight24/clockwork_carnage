/**
 * `meltdown` shots: a Meltdown run as the mode looks in play (its reactor
 * corridor, its enemies, the SYSTEM UPGRADE cards and the heat glow),
 * without being one. The run is a MeltdownMode of the shot's own: the
 * game's `meltdown` never starts, so no run record, best score, stat or
 * unlock is written (game.startMeltdown is never called; the corridor comes
 * from the run's own start() and the cards from its own roll). The shot's
 * fields are swapped in and put back exactly at teardown, and its fight runs
 * through the campaign scene's combat sandbox.
 *
 * spec: { hero = "agent", pickBeats = 4, pick = 1, speed = 4 (tiles/s),
 *         heat: [from, to] = [20, 60], cardScale = 1 }
 *   The shot opens on the upgrade cards (the run paused behind them, as in
 *   play): the highlight steps across them on the beat and settles on
 *   `pick`; then the agent runs the corridor and the heat climbs.
 *   `cardScale` draws the cards that much larger, pushing in a little
 *   further while they are up (the game's overlay is sized for play, and
 *   reads small in a letterboxed trailer frame).
 * Events: the campaign scene's combat events (spawn, attack, fire, chrono,
 * rewind, timeLock, freeze), timed from the shot's start as always.
 */
import { beatsToSec, secToBeats } from "../timeline.js";
import { mulberry32, seedFor } from "../seeded.js";
import { borrowCombat, simulate, withRandom, EVENTS, warmEnemies, idle } from "./campaign.js";
import { swayWeapon } from "../../systems/showcase.js";
import { Player } from "../../../js/entities.js";
import { isPassable } from "../../systems/physics.js";
import { particlePool } from "../../utils/particle-pool.js";
import { generateModernEnv } from "../../rendering/textures.js";
import { isModernArt, isRealisticArt } from "../../rendering/art-style.js";

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

let hud = null; // src/ui/hud.js, for the upgrade cards (loaded with the first shot)

/** Every game field a Meltdown shot swaps, and what the shot starts it at. */
const MELTDOWN_FIELDS = (staged) => ({
  map: staged.map,
  entities: staged.entities,
  player: staged.player,
  meltdown: staged.mm,
  world: null,
  projectiles: [],
  exitEntity: null,
  dustMotes: null,
  tracers: [],
  lights: [],
  damageNumbers: [],
  bossNameCard: null,
  objectiveWaypoint: null,
  screenShake: 0,
  glitchEffect: 0,
  slowMoTimer: 0,
  _hudDisabledUntil: 0,
  _meltdownUpgradeChoices: null,
  _meltdownUpgradeSel: 0,
  _meltdownAriaText: null,
  _meltdownAriaTimer: 0,
  meltdownLockAngle: true,
});

/** Swap `values` in for the game's own; the returned function puts back exactly what was there. */
function borrowFields(game, values) {
  const saved = Object.keys(values).map((k) => [k, Object.hasOwn(game, k), game[k]]);
  Object.assign(game, values);
  return () => {
    for (const [k, own, v] of saved) {
      if (own) game[k] = v;
      else delete game[k];
    }
  };
}

export const meltdown = {
  world: true,

  preload(game, spec, { live = () => true } = {}) {
    const r = game.renderer;
    if (!r?.offerEnv || !isModernArt()) return null;
    const realistic = isRealisticArt();
    return idle().then(() => {
      if (!live()) return;
      corridorEnv = generateModernEnv(r._actPalette || 1, r._visualStyle === 1, r._envLevel ?? null, { realistic });
      corridorEnv.realistic = realistic;
    });
  },

  release() {
    corridorEnv = null;
  },

  /** The run staged ahead of the cut: the corridor, its enemies and the cards, decoded. */
  prepare(game, spec, { live = () => true, shot, reel } = {}) {
    const prep = { staged: null, done: null };
    prep.done = stage(game, spec, shot, reel, live, idle).then((s) => (prep.staged = live() ? s : null));
    return prep;
  },

  build(game, spec, rng, { live = () => true, reel, shot, handle, prepared = null }) {
    if (prepared?.staged) {
      start(game, prepared.staged, spec, rng, reel, shot, handle);
      return;
    }
    return (async () => {
      const staged = (prepared && (await prepared.done)) || (await stage(game, spec, shot, reel, live));
      if (!staged || !live()) return;
      start(game, staged, spec, rng, reel, shot, handle);
    })();
  },

  update(game, dt, local, handle) {
    const st = handle.run;
    if (!st) return;
    const picking = local < st.pickEnd;
    game._meltdownUpgradeChoices = picking ? st.choices : null;
    if (picking) {
      game._meltdownUpgradeSel = selection(st, local);
      return; // the run waits behind the cards, as in play
    }
    const k = smooth((local - st.pickEnd) / Math.max(0.001, st.shotLen - st.pickEnd));
    st.mm.heat = st.heat[0] + (st.heat[1] - st.heat[0]) * k;
    withRandom(st.rng, () => {
      run(game, st, dt);
      simulate(game, st, dt, local);
      swayWeapon(game.player, { t: local, vel: st.speed }, dt);
    });
  },

  event(game, ev, handle) {
    const st = handle.run;
    const fn = EVENTS[ev.type];
    if (!st || !fn) return;
    withRandom(st.rng, () => fn(game, ev, st));
  },

  teardown(game, handle) {
    const st = handle.run;
    if (!st) return;
    handle.run = null;
    st.combat.restore();
    for (const p of game.player?.particles ?? []) particlePool.release(p);
    st.restore();
  },

  /** The heat glow over the corridor and, while they are up, the upgrade cards. */
  hud(ctx, w, h, local, { game, handle }) {
    const st = handle.run;
    if (!st) return;
    const heat = st.mm.heat;
    if (heat >= 10) {
      // MeltdownMode.getHeatOverlay's tint, pulsing on the reel's clock.
      const intensity = Math.min(0.4, (heat / 100) * 0.4);
      const pulse = 1 + Math.sin(local * 4) * 0.15 * (heat / 100);
      ctx.fillStyle = `rgba(255, ${Math.floor(60 - heat * 0.5)}, 0, ${(intensity * pulse).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (!game._meltdownUpgradeChoices || !hud) return;
    // The game's overlay laid out on a smaller page, scaled up about the centre.
    const s = st.cardScale * (1 + 0.06 * smooth(local / Math.max(0.001, st.pickEnd)));
    ctx.translate(w / 2, h / 2);
    ctx.scale(s, s);
    ctx.translate(-w / (2 * s), -h / (2 * s));
    hud.renderMeltdownUpgradeOverlay(game, ctx, w / s, h / s);
  },
};

/**
 * The heavy half, with no effect on what is shown: the run's corridor, its
 * enemies and pickups, three upgrade cards, and the enemy sprites decoded.
 * Its draws come from a PRNG of its own, so a staged run and one built at
 * the cut are the same run.
 */
async function stage(game, spec, shot, reel, live, wait) {
  const [{ MeltdownMode }, spawner, hudMod] = await Promise.all([
    import("../../../js/meltdown.js"),
    import("../../systems/spawner.js"),
    import("../../ui/hud.js"),
  ]);
  hud = hudMod;
  if (!live()) return null;
  const rng = mulberry32(seedFor(reel?.id ?? "reel", `${shot?.id ?? "meltdown"}:stage`));
  const mm = new MeltdownMode();
  const diff = game.getDifficultyMultipliers?.() ?? { healthMul: 1, speedMul: 1, damageMul: 1 };
  const staged = withRandom(rng, () => {
    const map = mm.start(spec.hero ?? "agent");
    return {
      mm,
      map,
      choices: mm._rollUpgradeChoices(3),
      entities: [...spawner.createMeltdownEnemies(map.enemySpawns, diff), ...spawner.createMeltdownPickups(map.pickupSpawns)],
    };
  });
  // The run's own ARIA lines stay in the run: the shot shows none.
  mm.ariaQueue.length = 0;
  const spawns = (shot?.events ?? []).filter((ev) => ev.type === "spawn").map((ev) => ev.enemy ?? "drone");
  const types = staged.entities.filter((e) => e.type === "enemy").map((e) => e.enemyType);
  await warmEnemies(game, [...types, ...spawns], live, wait);
  return live() ? staged : null;
}

// The corridor is drawn in whatever palette the renderer holds (the run sets
// none), which between shots is the menu's: its environment art (80-150 ms
// in Modern) is built by preload as the reel opens and handed over at the cut.
let corridorEnv = null;

function start(game, staged, spec, rng, reel, shot, handle) {
  const { map } = staged;
  const r = game.renderer;
  if (corridorEnv && r && corridorEnv.act === (r._actPalette || 1) && corridorEnv.level === (r._envLevel ?? null)) r.offerEnv?.(corridorEnv);
  const player = new Player(map.playerStart.x, map.playerStart.y, map.playerStart.dir);
  const restore = borrowFields(game, MELTDOWN_FIELDS({ ...staged, player }));
  const combat = borrowCombat(game);
  const pickBeats = spec.pickBeats ?? 4;
  handle.run = {
    mm: staged.mm,
    choices: staged.choices,
    restore,
    combat,
    rng,
    reel,
    shot,
    pickBeats,
    pickEnd: beatsToSec(reel, pickBeats),
    pick: Math.min(staged.choices.length - 1, Math.max(0, spec.pick ?? 1)),
    shotLen: beatsToSec(reel, shot.len),
    speed: spec.speed ?? 4,
    heat: spec.heat ?? [20, 60],
    cardScale: spec.cardScale ?? 1,
    // The campaign combat sandbox's per-shot state.
    time0: game.time ?? 0,
    fireUntil: null,
    back: 0,
    heading: player.angle,
    vel: 0,
  };
  staged.mm.heat = handle.run.heat[0];
}

/** The highlight steps one card a beat, then rests on the pick for the last beat. */
function selection(st, local) {
  const beat = Math.floor(secToBeats(st.reel, local));
  if (beat >= st.pickBeats - 1) return st.pick;
  return beat % st.choices.length;
}

const open = (map, x, y) => isPassable(map, Math.floor(x), Math.floor(y));

/**
 * The auto-run: forward (+y) at the shot's pace, drifting across to the
 * nearest open lane when the corridor ahead is blocked, head swaying a
 * little as a runner's does.
 */
function run(game, st, dt) {
  const p = game.player;
  const map = game.map;
  const ahead = p.y + 1.4;
  if (!open(map, p.x, ahead) || !open(map, p.x, ahead + 1)) {
    let best = p.x;
    let bestD = Infinity;
    for (let x = 1; x < map.width - 1; x++) {
      const cx = x + 0.5;
      if (!open(map, cx, ahead) || !open(map, cx, ahead + 1)) continue;
      const d = Math.abs(cx - p.x);
      if (d < bestD) {
        bestD = d;
        best = cx;
      }
    }
    st.laneX = best;
  }
  if (st.laneX != null) {
    const dx = st.laneX - p.x;
    const step = Math.sign(dx) * Math.min(Math.abs(dx), 4 * dt);
    if (open(map, p.x + step, p.y)) p.x += step;
    if (Math.abs(dx) < 0.05) st.laneX = null;
  }
  const move = st.speed * dt;
  if (open(map, p.x, p.y + move + 0.3)) p.y += move;
  st.t = (st.t ?? 0) + dt;
  p.angle = Math.PI / 2 + Math.sin(st.t * 1.3) * 0.06;
}
