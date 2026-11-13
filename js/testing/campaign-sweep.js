/**
 * Campaign fighting sweep: a bot plays campaign levels the way a player
 * does, with real inputs (aim, fire, move, reload, Chronos powers), dies,
 * and comes back through the real Retry Level path (CampaignManager
 * .retryLevel), up to a per-level attempt cap.
 *
 * Where the playtest gate (playtest-gate.js) kills enemies directly and
 * teleports to the exit to prove a level *runs*, this proves it can be
 * *won*: the exit reached on foot, the power cells and set-piece stations
 * walked to, teach rooms passed with the power they teach, bosses shot down.
 *
 * Per level it records each attempt: how it ended (cleared, died, stuck,
 * timed out), what killed the player, sim time and what the bot was after.
 * An attempt played after the honest ones ran out is "assisted" (1000 HP)
 * and counted apart from an honest clear: it says the level can be finished,
 * not that a player would finish it.
 *
 *   ccTest.sweep({ seed: 3, aim: "body", act: 2 })
 *   ccTest.sweep({ from: [3, 0], to: [3, 6] })
 *
 * The objective-led player is the Act I loop driver (scratch/loop, Oct 2026)
 * generalised to Acts II-IV: set-piece objectives, teach goals, loops and
 * chrono hazards.
 */
import { GameState } from "../game.js";
import { ACTS, getActLevel } from "../../src/data/campaign/acts.js";
import { campaignMap } from "../../src/data/levels/campaign.js";
import { hasLineOfSight } from "../../src/systems/physics.js";
import { LOOP_REWIND_WINDOW, collapseFront, collapseStepAt } from "../../src/systems/chrono-hazards.js";
import { SeededRNG } from "../../src/utils/seeded-rng.js";

const TICKS_PER_S = 60;
const r2 = (v) => Math.round(v * 100) / 100;
const cellIn = (rect, x, y) => x >= rect[0] && x < rect[2] + 1 && y >= rect[1] && y < rect[3] + 1;
const rectCentre = (rect) => ({ x: (rect[0] + rect[2] + 1) / 2, y: (rect[1] + rect[3] + 1) / 2 });

/** Every level of the campaign as [act, level], in play order. */
export function campaignSlots() {
  return ACTS.flatMap((a) => a.levels.map((_, i) => [a.id, i]));
}

/** "II-3" for act 2, level index 2. */
export function slotLabel(act, level) {
  return `${["", "I", "II", "III", "IV", "V"][act] ?? act}-${level + 1}`;
}

/**
 * The slots a sweep covers: one `act`, a `from`/`to` range of [act, level]
 * (inclusive), or the whole campaign.
 */
export function sweepSlots({ act = null, from = null, to = null } = {}) {
  const all = campaignSlots();
  const key = ([a, l]) => a * 1000 + l;
  return all.filter((s) => {
    if (act != null && s[0] !== act) return false;
    if (from && key(s) < key(from)) return false;
    if (to && key(s) > key(to)) return false;
    return true;
  });
}

/**
 * The guns every level before (act, level) lays out: the kit a player
 * starting there would have picked up on the way.
 */
export function kitBefore(act, level) {
  const ids = new Set([0]);
  let levels = 0;
  for (const [a, l] of campaignSlots()) {
    if (a > act || (a === act && l >= level)) break;
    levels++;
    for (const e of campaignMap(getActLevel(a, l))?.entities ?? []) if (e.type === "weapon" && e.weaponId != null) ids.add(e.weaponId);
  }
  return { weapons: [...ids], levels };
}

/**
 * @param {object} game
 * @param {object} t - harness helpers: stepGame, clearInput, aimAt,
 *   pathSteps, stepToward, clearPathCache, aimAtZone, pickWeapon, botReload,
 *   kite, flank, shieldFacing, shotReaches, liveEnemy
 */
export function createCampaignSweep(game, t) {
  // ─── The player ────────────────────────────────────────
  // opts: aim "head"|"body", chrono (shift when pressed), flank (circle shields)
  function makePlayer(opts) {
    const o = { aim: "head", chrono: true, flank: true, ...opts };
    const st = { focus: null, reposition: 0, stuck: 0, unstick: 0, lx: 0, ly: 0, i: 0, obj: null, flank: {} };

    const near = (pred, lim) => {
      let best = null;
      let bd = lim;
      for (const e of game.entities) {
        if (!e.active || !pred(e)) continue;
        const d = t.pathSteps(game, e.x, e.y);
        if (d >= 0 && d < bd) {
          bd = d;
          best = e;
        }
      }
      return best;
    };

    const reachable = (pt) => pt && t.pathSteps(game, pt.x, pt.y) >= 0;

    /** A floor cell the player can walk to, nearest to `pt` (within `r` cells), from which `pt` is in sight. */
    function standNear(pt, r = 7, wantLos = true) {
      const g = game.map.grid;
      let best = null;
      let bd = Infinity;
      for (let y = Math.floor(pt.y) - r; y <= Math.floor(pt.y) + r; y++) {
        for (let x = Math.floor(pt.x) - r; x <= Math.floor(pt.x) + r; x++) {
          if (g[y]?.[x] !== 0) continue;
          const c = { x: x + 0.5, y: y + 0.5 };
          const d = Math.hypot(c.x - pt.x, c.y - pt.y);
          if (d < 2.5 || d >= bd) continue;
          if (wantLos && !hasLineOfSight(game.map, c.x, c.y, pt.x, pt.y)) continue;
          if (!reachable(c)) continue;
          bd = d;
          best = c;
        }
      }
      return best;
    }

    /** A turret's line of fire, a few cells out: where a Time-Lock catches its rounds. */
    function inStream(h) {
      const a = h.angle ?? 0;
      for (let k = 3; k <= Math.min(9, (h.range ?? 10) - 1); k++) {
        const c = { x: Math.floor(h.x + Math.cos(a) * k) + 0.5, y: Math.floor(h.y + Math.sin(a) * k) + 0.5 };
        if (game.map.grid[Math.floor(c.y)]?.[Math.floor(c.x)] === 0 && reachable(c)) return c;
      }
      return null;
    }

    function teachTarget(hz) {
      const tc = hz?.teach;
      if (!tc || tc.done) return null;
      const g = tc.goal;
      if (g.kind === "reach") {
        const c = rectCentre(g.rect);
        return reachable(c) ? { ...c, why: "teach:reach" } : null;
      }
      if (g.kind === "shiftKills") {
        const e = near((x) => x._teach && t.liveEnemy(x), 1e9);
        return e ? { x: e.x, y: e.y, why: "teach:shiftKills" } : null;
      }
      const turrets = hz.hazards.filter((h) => h.type === "gate" && h.kind === "turret" && !h.stopped);
      if (g.kind === "catches") {
        const h = turrets.find((x) => tc.stopOnDone?.includes(x.id)) ?? turrets[0];
        const c = h && inStream(h);
        return c ? { ...c, why: "teach:catches", turret: h } : null;
      }
      if (g.kind === "rewind") {
        const h = turrets.find((x) => x.aim === "player") ?? turrets[0];
        const c = h && standNear(h, Math.min(8, (h.range ?? 10) - 2));
        return c ? { ...c, why: "teach:rewind", turret: h } : null;
      }
      return null;
    }

    function objective() {
      const p = game.player;
      const hz = game.chronoHazards;
      // Detours a player takes: an unowned gun close by, health when hurt, ammo when low.
      const gun = near((e) => e.type === "weapon" && !p.weapons.includes(e.weaponId), 14);
      if (gun) return { x: gun.x, y: gun.y, why: "weapon" };
      if (p.health < p.maxHealth * 0.6) {
        const m = near((e) => e.type === "health", 18);
        if (m) return { x: m.x, y: m.y, why: "health" };
      }
      const low = p.weapons.some((id) => id !== 0 && p.reserveOf(id) <= p.ammoCapOf(id) * 0.25);
      if (low && p.weapons.length > 1) {
        const a = near((e) => e.type === "ammo", 18);
        if (a) return { x: a.x, y: a.y, why: "ammo" };
      }
      const enemies = game.entities.filter(t.liveEnemy);
      const huntNearest = () => {
        let best = null;
        let bd = 1e9;
        for (const e of enemies) {
          const d = t.pathSteps(game, e.x, e.y);
          if (d >= 0 && d < bd) {
            bd = d;
            best = e;
          }
        }
        best ??= enemies[0];
        return best ? { x: best.x, y: best.y, why: best.def?.boss ? "boss" : "hunt" } : null;
      };
      // The level's own business first: the teach room, then the stations.
      const teach = teachTarget(hz);
      if (teach) return teach;
      const ob = hz?.objective;
      if (ob && !ob.done) {
        const left = ob.stations.filter((s) => !ob.cleared.includes(s.id));
        const cand = ob.order ? left.slice(0, 1) : left;
        let best = null;
        let bd = Infinity;
        for (const s of cand) {
          const c = rectCentre(s.rect);
          const d = t.pathSteps(game, c.x, c.y);
          if (d >= 0 && d < bd) {
            bd = d;
            best = { ...c, why: "station", rect: s.rect };
          }
        }
        if (best) return best;
      }
      const ex = game.exitEntity;
      if (!ex) return huntNearest();
      if (ex.sealed) {
        const cell = near((e) => e.type === "powerCell", 1e9);
        if (cell) return { x: cell.x, y: cell.y, why: "cell" };
        const h = huntNearest();
        if (h) return h;
      }
      if (!reachable(ex)) return huntNearest() ?? { x: ex.x, y: ex.y, why: "exit" };
      return { x: ex.x, y: ex.y, why: "exit" };
    }

    /** Chronos the level asks for: loops, teach goals, rotors. */
    function powers(obj, seen) {
      const p = game.player;
      const kb = game.keybinds;
      const hz = game.chronoHazards;
      const cp = game.chronoPowers;
      if (!hz?.piece || !cp) return;
      const shift = (min = 20) => {
        if (p.chronoActive ? p.chronoEnergy > 4 : p.chronoEnergy >= min) game.keys[kb.chronoShift] = true;
      };
      for (const h of hz.hazards) {
        if (h.type === "loop" && hz.triggers[h.id] == null && cellIn(h.rect, p.x, p.y)) {
          if ((h.breaksOn ?? "shift") === "shift") shift();
          else if (hz._loopedAt?.[h.id] != null && hz._simTime - hz._loopedAt[h.id] < LOOP_REWIND_WINDOW - 0.5) game.chronoRewind();
        }
        if (h.type === "blade" && !h.stopped && Math.hypot(h.x - p.x, h.y - p.y) < (h.radius ?? 1.5) + 1.6) {
          shift();
          if (p.chronoActive && cp.has("dash") && !seen.length) game.dashFromKeys();
        }
        // A collapse at your heels: shift as the front closes, as the level's
        // card teaches. Walking it, the rubble lands a fifth of a tile short
        // of each landing forever (a catch never kills).
        if (h.type === "collapse" && hz.triggers[h.id] != null) {
          const at = collapseStepAt(h, p.x, p.y);
          if (at >= 0 && at - collapseFront(h, hz.clock, hz.triggers[h.id]) <= 6) shift();
        }
      }
      if (!obj) return;
      if (obj.why === "teach:shiftKills" && seen.some((e) => e._teach)) shift(10);
      if (obj.why === "teach:catches" || obj.why === "teach:rewind") {
        const h = obj.turret;
        const close = Math.hypot(obj.x - p.x, obj.y - p.y) < 1.2;
        if (close && !seen.length) {
          p.angle = Math.atan2(h.y - p.y, h.x - p.x);
          for (const k of [kb.moveForward, kb.moveBack, kb.moveLeft, kb.moveRight]) game.keys[k] = false;
        }
        if (obj.why === "teach:catches" && close && !cp.lock) game.chronoLock();
        if (obj.why === "teach:rewind" && cp.buffer?.maxHealth?.() - p.health >= (hz.teach.goal.damage ?? 20) + 1) game.chronoRewind();
      }
    }

    function tick() {
      const p = game.player;
      const kb = game.keybinds;
      st.i++;
      game.mouse.locked = true;
      t.clearInput(game);
      const enemies = game.entities.filter(t.liveEnemy);
      const dist = (e) => Math.hypot(e.x - p.x, e.y - p.y);
      const seen = enemies
        .filter((e) => dist(e) < 20 && hasLineOfSight(game.map, p.x, p.y, e.x, e.y) && t.shotReaches(game, e))
        .sort((a, b) => dist(a) - dist(b));
      const hurt = p.health < p.maxHealth * 0.35;
      const pressed = seen.length >= 2 || (seen.length && p.health < p.maxHealth * 0.5);
      if (o.chrono && pressed && (p.chronoActive ? p.chronoEnergy > 8 : p.chronoEnergy >= 40)) game.keys[kb.chronoShift] = true;
      const obj = objective();
      st.obj = obj;
      // Holding a station: stay in it, shooting what comes.
      const holding = obj?.why === "station" && cellIn(obj.rect, p.x, p.y);
      if (st.unstick > 0) {
        st.unstick--;
        game.keys[kb.moveRight] = true;
        game.keys[kb.moveForward] = true;
        p.isFiring = seen.length > 0;
        if (seen.length) t.aimAt(game, seen[0].x, seen[0].y);
      } else if (seen.length) {
        const open = seen.filter((e) => !t.shieldFacing(e, p));
        const keep = st.focus && seen.includes(st.focus) && (open.includes(st.focus) || !open.length);
        if (!keep) st.focus = open[0] ?? seen[0];
        const tg = st.focus;
        const face = Math.atan2(tg.y - p.y, tg.x - p.x);
        // Firing and nothing landing (a corner the shots clip): move until the angle changes.
        const toll = tg.health + (tg._shield || 0);
        if (tg._sweepToll !== toll) {
          tg._sweepToll = toll;
          tg._sweepTollAt = st.i;
        } else if (st.i - tg._sweepTollAt > 120) {
          tg._sweepTollAt = st.i;
          st.reposition = 75;
        }
        t.pickWeapon(game, dist(tg));
        t.aimAtZone(game, tg, o.aim);
        p.isFiring = true;
        p.angle = face;
        const close = enemies.filter((e) => dist(e) < 4);
        const med = hurt && obj?.why === "health" ? obj : null;
        const swing = enemies.find((e) => e.state === "windup" && e.def.attackType === "melee" && dist(e) < e.def.attackRange * 1.3);
        if (holding) {
          // stand and shoot
        } else if (st.reposition > 0) {
          st.reposition--;
          t.stepToward(game, tg.x, tg.y, face);
        } else if (swing) t.kite(game, [swing], face) || (game.keys[kb.moveBack] = true);
        else if (!open.length && o.flank) t.flank(game, tg, face, st.flank);
        else if (!open.length) {
          const d = dist(tg);
          if (d > 9) t.stepToward(game, tg.x, tg.y, face);
          else if (d < 5.5) t.kite(game, [tg], face) || (game.keys[kb.moveBack] = true);
        } else if (close.length) t.kite(game, close, face);
        else if (med) t.stepToward(game, med.x, med.y, face);
        else if (hurt) t.kite(game, seen, face);
        else if (dist(tg) > 8) t.stepToward(game, tg.x, tg.y, face);
        else if (obj && obj.why !== "hunt" && obj.why !== "boss" && dist(tg) > 5) t.stepToward(game, obj.x, obj.y, face);
      } else if (obj && !holding) {
        p.lookShiftY = 0;
        if (!t.stepToward(game, obj.x, obj.y)) {
          t.aimAt(game, obj.x, obj.y);
          game.keys[kb.moveForward] = true;
        }
      }
      powers(obj, seen);
      t.botReload(game, seen.length > 0);
      t.stepGame(game, 1);
      const moved = Math.hypot(p.x - st.lx, p.y - st.ly);
      st.lx = p.x;
      st.ly = p.y;
      const trying = [kb.moveForward, kb.moveBack, kb.moveLeft, kb.moveRight].some((k) => game.keys[k]);
      st.stuck = trying && moved < 0.002 ? st.stuck + 1 : 0;
      if (st.stuck > 45) {
        st.stuck = 0;
        st.unstick = 20;
      }
    }
    return { tick, objective, st };
  }

  // ─── Instrumentation ───────────────────────────────────
  /** Who hurt the player last: an enemy type, a turret, a hazard. */
  function watchDamage() {
    const rec = { last: null };
    const dp = game.damagePlayer;
    const hz = game.chronoHazards;
    const hit = hz?._hit;
    const train = hz?._trainHit;
    let hazard = null;
    if (hz) {
      hz._hit = function (g, h) {
        hazard = h;
        try {
          return hit.call(this, g, h);
        } finally {
          hazard = null;
        }
      };
      if (train) {
        hz._trainHit = function (g, h) {
          hazard = h;
          try {
            return train.call(this, g, h);
          } finally {
            hazard = null;
          }
        };
      }
    }
    game.damagePlayer = function (amount, attacker) {
      const p = game.player;
      const before = p.health;
      const r = dp.call(this, amount, attacker);
      if (p.health < before) {
        let src = "hazard";
        if (hazard) src = `hazard:${hazard.type}`;
        else if (attacker?.enemyType) src = attacker.enemyType;
        else if (attacker && typeof attacker.x === "number") {
          // A round hands back a point behind it: blame the nearest ranged
          // enemy, or a set-piece turret if one is nearer.
          let best = null;
          let bd = 1e9;
          for (const e of game.entities) {
            if (!t.liveEnemy(e) || e.def?.attackType === "melee") continue;
            const d = Math.hypot(e.x - attacker.x, e.y - attacker.y);
            if (d < bd) {
              bd = d;
              best = e.enemyType;
            }
          }
          for (const h of game.chronoHazards?.hazards ?? []) {
            if (h.kind !== "turret") continue;
            const d = Math.hypot(h.x - attacker.x, h.y - attacker.y);
            if (d < bd) {
              bd = d;
              best = "hazard:turret";
            }
          }
          src = best ?? "projectile";
        }
        rec.last = src;
      }
      return r;
    };
    rec.restore = () => {
      game.damagePlayer = dp;
      if (hz) {
        hz._hit = hit;
        if (train) hz._trainHit = train;
      }
    };
    return rec;
  }

  // ─── Flow ──────────────────────────────────────────────
  const inScene = () => game.state === GameState.CUTSCENE || game.state === GameState.CINEMATIC;

  function skipScenes() {
    for (let i = 0; i < 200 && inScene(); i++) {
      if (game.state === GameState.CUTSCENE) game.endCutscene();
      else game.handleKeyPress?.("Escape");
      t.stepGame(game, 5);
    }
  }

  /** Into (act, level) cold, with the kit the levels before it lay out. */
  function enterSlot(act, level, keepPlayer) {
    const cm = game.campaign;
    game.mode = "campaign";
    game.ariaEnabled = true;
    cm.act = act;
    cm.level = level;
    cm.ngPlusCycle = 0;
    cm.missedWeapons = [];
    if (!keepPlayer) {
      game.player.reset();
      game.applyLoadoutBonuses?.();
      const kit = kitBefore(act, level);
      for (const id of kit.weapons) {
        if (!game.player.weapons.includes(id)) game.player.weapons.push(id);
        game.player.reserveOf(id);
      }
      if (kit.levels) game.player.addAmmoPacks?.(Math.min(kit.levels, 4));
    }
    game.player.alive = true;
    game.player.health = game.player.maxHealth;
    cm.loadLevel(level);
  }

  /** A grid signature, so a seal, rewrite or collapse rebuilds the path fields. */
  function gridStamp() {
    let h = 0;
    for (const row of game.map.grid) for (let x = 0; x < row.length; x++) h = (Math.imul(h, 31) + row[x] * (x + 1)) | 0;
    return h;
  }

  function progressKey(bot) {
    const hz = game.chronoHazards;
    return [
      game.killedEnemies,
      game.powerCells?.found ?? 0,
      hz?.objective?.cleared?.length ?? 0,
      hz?.teach?.progress ?? 0,
      hz?.teach?.done ? 1 : 0,
      bot.st.obj?.why ?? "",
    ].join("|");
  }

  /** One attempt at the loaded level: play until it ends, the player dies, or nothing moves on. */
  function playAttempt(bot, cfg, dmg) {
    const p = game.player;
    const startAct = game.campaign.act;
    let ticks = 0;
    let stamp = gridStamp();
    let key = progressKey(bot);
    let keyAt = 0;
    let bestPath = Infinity;
    let end = "timeout";
    while (ticks < cfg.levelCapS * TICKS_PER_S) {
      if (game.state !== GameState.PLAYING) {
        end = "left";
        break;
      }
      if (!p.alive) {
        end = "died";
        break;
      }
      if (ticks % 15 === 0) {
        const s = gridStamp();
        if (s !== stamp) {
          stamp = s;
          t.clearPathCache();
        }
      }
      bot.tick();
      ticks++;
      // Progress: anything counted moved on, or the bot got nearer its target.
      const k = progressKey(bot);
      const obj = bot.st.obj;
      const d = obj ? t.pathSteps(game, obj.x, obj.y) : -1;
      if (k !== key) {
        key = k;
        keyAt = ticks;
        bestPath = d >= 0 ? d : Infinity;
      } else if (d >= 0 && d < bestPath - 1) {
        bestPath = d;
        keyAt = ticks;
      }
      if (ticks - keyAt > cfg.stuckS * TICKS_PER_S) {
        end = "stuck";
        break;
      }
    }
    if (end === "left" || (end === "died" && game.state !== GameState.PLAYING)) {
      // A boss kill hands over to the outro and the next act; the exit to LEVEL_COMPLETE.
      if (p.alive && (game.state === GameState.LEVEL_COMPLETE || inScene() || game.state === GameState.VICTORY)) end = "cleared";
      else if (!p.alive) end = "died";
    }
    const obj = bot.st.obj;
    const A = {
      end,
      t: r2(ticks / TICKS_PER_S),
      killer: end === "died" ? dmg.last : null,
      hp: Math.round(p.health),
      kills: game.killedEnemies,
      total: game.totalEnemies,
      cells: game.powerCells ? `${game.powerCells.found}/${game.powerCells.total}` : null,
      after: obj?.why ?? null,
      at: { x: r2(p.x), y: r2(p.y) },
      target: obj ? { x: r2(obj.x), y: r2(obj.y), path: t.pathSteps(game, obj.x, obj.y) } : null,
      exitPath: game.exitEntity ? t.pathSteps(game, game.exitEntity.x, game.exitEntity.y) : null,
      sealed: !!game.exitEntity?.sealed,
    };
    const hz = game.chronoHazards;
    if (hz?.teach) A.teach = hz.teach.done ? "done" : `${hz.teach.progress}/${hz.teach.goal.count ?? 1}`;
    if (hz?.objective) A.stations = `${hz.objective.cleared.length}/${hz.objective.stations.length}`;
    const boss = game.entities.find((e) => e.type === "enemy" && e.def?.boss);
    if (boss) A.boss = { type: boss.enemyType, hp: Math.max(0, Math.round(boss.health)), max: Math.round(boss.maxHealth) };
    if (A.end === "cleared" && inScene()) skipScenes();
    if (game.campaign.act !== startAct || game.state === GameState.VICTORY) A.end = "cleared";
    return A;
  }

  /**
   * Run the sweep.
   * @param {object} [opts]
   * @param {number} [opts.seed=1] - Math.random's seed for the whole run
   * @param {"head"|"body"} [opts.aim="head"]
   * @param {boolean} [opts.chrono=true] - shift when outnumbered or hurt
   * @param {number} [opts.act] - one act only
   * @param {[number, number]} [opts.from] - first [act, level index]
   * @param {[number, number]} [opts.to] - last [act, level index], inclusive
   * @param {number} [opts.attempts=3] - honest attempts per level
   * @param {boolean} [opts.assist=true] - one more, at `assistHp`, if they all fail
   * @param {number} [opts.assistHp=1000]
   * @param {number} [opts.levelCapS=600] - sim seconds per attempt
   * @param {number} [opts.stuckS=90] - sim seconds without progress before an attempt is called stuck
   * @param {string} [opts.difficulty="normal"]
   */
  function run(opts = {}) {
    const cfg = {
      seed: 1, aim: "head", chrono: true, flank: true, attempts: 3, assist: true, assistHp: 1000,
      levelCapS: 600, stuckS: 90, difficulty: "normal", ...opts,
    };
    const slots = sweepSlots(cfg);
    const out = { opts: cfg, levels: [] };
    if (!slots.length) return out;
    const rng = new SeededRNG(cfg.seed);
    const random = Math.random;
    Math.random = () => rng.next();
    const difficulty = game.settings.difficulty;
    game.settings.difficulty = cfg.difficulty;
    const dmg = watchDamage();
    const cm = game.campaign;
    try {
      game.audio.init();
      const bot = makePlayer(cfg);
      let chained = false;
      for (const [act, level] of slots) {
        const entry = getActLevel(act, level);
        // Carry on from the last level when the campaign got here by itself;
        // otherwise (first slot, or the last one was not cleared) load it cold.
        if (!(chained && cm.act === act && cm.level === level && game.state === GameState.PLAYING)) enterSlot(act, level, chained);
        t.clearPathCache();
        const L = {
          slot: slotLabel(act, level), act, level, map: entry.map, boss: !!entry.boss,
          enemies: game.totalEnemies, cells: game.powerCells?.total ?? 0, lockdown: game.lockdown?.need ?? 0,
          setPiece: entry.setPiece ?? null,
          startExitPath: game.exitEntity ? t.pathSteps(game, game.exitEntity.x, game.exitEntity.y) : null,
          weapons: [...game.player.weapons],
          attempts: [],
        };
        const baseHp = game.player.maxHealth;
        const tries = cfg.attempts + (cfg.assist ? 1 : 0);
        for (let a = 0; a < tries; a++) {
          const assisted = a >= cfg.attempts;
          if (assisted) game.player.maxHealth = game.player.health = cfg.assistHp;
          bot.st.unstick = 0;
          bot.st.reposition = 0;
          dmg.last = null;
          const A = playAttempt(bot, cfg, dmg);
          A.assisted = assisted;
          L.attempts.push(A);
          if (A.end === "cleared" || A.end === "stuck" || A.end === "timeout") break;
          // Died: Retry Level, as the game-over screen offers it.
          t.stepGame(game, 120);
          cm.retryLevel();
          t.clearPathCache();
        }
        const last = L.attempts.at(-1);
        L.cleared = last.end === "cleared";
        L.honest = L.cleared && !last.assisted;
        L.assisted = L.cleared && last.assisted;
        L.deaths = L.attempts.filter((x) => x.end === "died").length;
        L.time = r2(L.attempts.reduce((s, x) => s + x.t, 0));
        L.blocked = L.cleared ? null : last.end;
        out.levels.push(L);
        if (last.assisted) {
          game.player.maxHealth = baseHp;
          game.player.health = Math.min(game.player.health, baseHp);
        }
        chained = L.cleared;
        if (!L.cleared) continue;
        if (game.state === GameState.LEVEL_COMPLETE) {
          cm.nextLevel();
          skipScenes();
        }
        if (game.state === GameState.VICTORY) break;
      }
    } catch (err) {
      out.error = String(err?.stack || err);
    } finally {
      dmg.restore();
      Math.random = random;
      game.settings.difficulty = difficulty;
      t.clearInput(game);
    }
    return out;
  }

  return { run, makePlayer };
}

/**
 * Pool sweep results (many seeds and aims) into one row per level: honest
 * clears, assisted clears, deaths, time, the top killer, and where a run got
 * stuck.
 */
export function summariseSweeps(results) {
  const rows = new Map();
  for (const res of results) {
    for (const L of res.levels) {
      const r = rows.get(L.slot) ?? {
        slot: L.slot, act: L.act, level: L.level, map: L.map, runs: 0, honest: 0, assisted: 0, failed: 0, deaths: 0, time: 0, clearTime: 0,
        killers: {}, blocked: {}, stuck: [],
      };
      r.runs++;
      if (L.honest) r.honest++;
      else if (L.assisted) r.assisted++;
      else r.failed++;
      r.deaths += L.deaths;
      r.time += L.time;
      for (const a of L.attempts) if (a.end === "died" && a.killer) r.killers[a.killer] = (r.killers[a.killer] || 0) + 1;
      if (L.blocked) {
        r.blocked[L.blocked] = (r.blocked[L.blocked] || 0) + 1;
        const a = L.attempts.at(-1);
        r.stuck.push({ seed: res.opts.seed, aim: res.opts.aim, end: a.end, after: a.after, at: a.at, target: a.target, exitPath: a.exitPath, sealed: a.sealed, cells: a.cells, kills: `${a.kills}/${a.total}` });
      }
      rows.set(L.slot, r);
    }
  }
  return [...rows.values()].map((r) => {
    const top = Object.entries(r.killers).sort((a, b) => b[1] - a[1])[0];
    return {
      slot: r.slot, act: r.act, level: r.level, map: r.map, runs: r.runs, honest: r.honest, assisted: r.assisted, failed: r.failed,
      avgDeaths: r2(r.deaths / r.runs), avgTime: Math.round(r.time / r.runs),
      topKiller: top ? `${top[0]} (${top[1]})` : "-", blocked: r.blocked, stuck: r.stuck,
    };
  });
}
