import { GameState } from "../game.js";
import { CAMPAIGN_LEVELS, UPGRADES } from "../data.js";

const VALID_STATES = new Set(Object.values(GameState));
const PLAYER_DEFS = {
  scout: {
    label: "Scout",
    chaos: 0,
    godMode: true,
    allWeapons: true,
    skipCutscenes: true,
    clearCombat: true,
    useChrono: true,
  },
  striker: {
    label: "Striker",
    chaos: 0.2,
    godMode: true,
    allWeapons: true,
    skipCutscenes: true,
    clearCombat: true,
    useChrono: true,
  },
  gremlin: {
    label: "Gremlin",
    chaos: 0.65,
    godMode: true,
    allWeapons: true,
    skipCutscenes: true,
    clearCombat: true,
    useChrono: true,
  },
};
const DEFAULT_PLAYERS = ["scout", "striker", "gremlin"];
const DEFAULT_MODES = ["tutorial", "campaign", "arena", "meltdown", "builder", "customize"];

export function createPlaytestGate(game, tools) {
  const t = tools;

  function run(options = {}) {
    const players = normalizeList(options.players, DEFAULT_PLAYERS);
    const modes = normalizeList(options.modes, DEFAULT_MODES);
    const ctx = {
      maxTicks: options.maxTicksPerScenario ?? 18_000,
      stuckTicks: options.stuckTicks ?? 900,
      sampleEvery: options.sampleEvery ?? 120,
      runs: [],
      failures: [],
    };

    for (const playerId of players) {
      const player = PLAYER_DEFS[playerId] || PLAYER_DEFS.scout;
      for (const mode of modes) runScenario(ctx, playerId, player, mode);
    }

    return {
      ok: ctx.failures.length === 0,
      players,
      modes,
      runs: ctx.runs,
      failures: ctx.failures,
    };
  }

  function runScenario(ctx, playerId, player, mode) {
    const run = {
      player: playerId,
      playerLabel: player.label,
      mode,
      seed: hashSeed(`${playerId}:${mode}`),
      ok: false,
      ticks: 0,
      snapshots: [],
      issues: [],
    };

    try {
      t.resetGame(game);
      resetModeResidue();
      game.audio.init();
      game.clearArenaSave?.();
      game.clearCampaignSave?.();
      enterScenario(mode, player);
      preparePlayer(player);
      assertSnapshot(run, "entered");

      switch (mode) {
        case "tutorial": playTutorial(run, ctx, player); break;
        case "campaign": playCampaign(run, ctx, player); break;
        case "arena": playArena(run, ctx, player); break;
        case "meltdown": playMeltdown(run, ctx, player); break;
        case "builder": playBuilder(run, ctx, player); break;
        case "customize": playCustomize(run, ctx, player); break;
        default: throw new Error(`Unknown playtest mode: ${mode}`);
      }

      if (run.issues.length === 0) run.ok = true;
    } catch (err) {
      run.issues.push({ severity: "critical", reason: err?.message || String(err), snapshot: snapshotGame(game) });
    }

    if (!run.ok && run.issues.length === 0) {
      run.issues.push({ severity: "critical", reason: "Scenario did not satisfy completion condition", snapshot: snapshotGame(game) });
    }
    if (!run.ok) ctx.failures.push(...run.issues.map((issue) => ({ player: playerId, mode, ...issue })));
    ctx.runs.push(run);
  }

  function enterScenario(mode) {
    if (mode === "tutorial") game.startTutorial();
    else if (mode === "campaign") startCampaignLevel(0);
    else if (mode === "arena") game.startArena();
    else if (mode === "meltdown") game.startMeltdown("agent", true);
    else if (mode === "builder") game.startBuilder();
    else if (mode === "customize") {
      game.creatorReturnState = GameState.MODE_SELECT;
      game.state = GameState.CHARACTER_CREATE;
    }
  }

  function resetModeResidue() {
    if (!game.meltdown) return;
    game.meltdown.distance = 0;
    game.meltdown.maxDistance = 0;
    game.meltdown.upgradesPending = null;
    game._meltdownUpgradeChoices = null;
  }

  function preparePlayer(player) {
    if (player.allWeapons) game.player.weapons = [0, 1, 2, 3, 4, 5, 6, 7];
    game.player.currentWeapon = 0;
    game.player.ammo = 999;
    game.player.chronoEnergy = game.player.maxChronoEnergy;
    if (player.godMode) {
      game.player.maxHealth = Math.max(game.player.maxHealth, 9999);
      game.player.health = game.player.maxHealth;
      game.player.ammo = 999;
    }
    game.mouse.locked = true;
  }

  function playTutorial(run, ctx, player) {
    skipCutscenes(run, ctx, player);
    for (let guard = 0; guard < 80 && game.state !== GameState.TUTORIAL_COMPLETE; guard++) {
      if (game.state === GameState.CUTSCENE) skipCutscenes(run, ctx, player);
      if (game.mode !== "tutorial") throw new Error(`Tutorial left tutorial mode: ${game.mode}`);
      driveTutorialStep(run, ctx, player);
      checkProgress(run, ctx, player, "tutorial");
    }
    if (game.state !== GameState.TUTORIAL_COMPLETE) throw new Error(`Tutorial stuck at step ${game.tutorialStep}, state ${game.state}`);

    game.tutorialMenuSelection = 1;
    game.handleKeyPress("Enter");
    skipCutscenes(run, ctx, player);
    if (game.state === GameState.CUTSCENE) game.endCutscene();
    stepAndWatch(run, ctx, player, 30, "tutorial campaign handoff");
    assertState(run, [GameState.PLAYING, GameState.CUTSCENE], "tutorial should hand off to campaign or story");
  }

  function driveTutorialStep(run, ctx, player) {
    const step = game.tutorialStep;
    if (step === 0) {
      game.tutorialStepTime = performance.now() - 3000;
      stepAndWatch(run, ctx, player, 5, "tutorial boot");
    }
    else if (step === 1) withInput(() => { game.mouse.dx = 40; }, run, ctx, player, 120, "look around");
    else if (step === 2) t.walkTo(game, 17, 43.5, 240);
    else if (step === 3) {
      openDoorAt(26, 41, 0);
      stepAndWatch(run, ctx, player, 5, "open door");
    }
    else if (step === 4) pathWalkTo(38.5, 42.5, 500);
    else if (step === 5) {
      game.tutorialStepTime = performance.now() - 500;
      fireBurst(run, ctx, player, 30);
    }
    else if (step === 6) withInput(() => { game.player.isAiming = true; }, run, ctx, player, 10, "ads");
    else if (step === 7) {
      openDoorAt(33, 41, Math.PI);
      pathWalkTo(43.5, 42.5, 700);
      game.handleKeyPress(game.keybinds.weapon1);
      game.handleKeyPress(game.keybinds.weapon2);
      stepAndWatch(run, ctx, player, 5, "weapon switch");
    } else if (step === 8) withInput(() => {
      game.keys[game.keybinds.sprint] = true;
      game.keys[game.keybinds.moveForward] = true;
    }, run, ctx, player, 60, "sprint");
    else if (step === 9) withInput(() => { game.keys[game.keybinds.crouch] = true; }, run, ctx, player, 20, "crouch");
    else if (step === 10) withInput(() => {
      game.playerUpdateSystem._prevCrouchKey = false;
      game.keys[game.keybinds.sprint] = true;
      game.keys[game.keybinds.moveForward] = true;
      game.keys[game.keybinds.crouch] = true;
    }, run, ctx, player, 30, "slide");
    else if (step === 11) {
      game.triggerDash(game.keybinds.moveForward, 0, -1);
      stepAndWatch(run, ctx, player, 30, "dash");
    } else if (step === 12) withInput(() => {
      game.tutorialStepTime = performance.now() - 500;
      game.player.chronoEnergy = game.player.maxChronoEnergy;
      game.player.chronoActive = false;
      game.keys[game.keybinds.chronoShift] = true;
    }, run, ctx, player, 20, "chrono");
    else if (step === 13) {
      openDoorAt(46, 19, Math.PI / 2);
      game.entityGrid.clear();
      game.entityGrid.insertAll(game.entities);
      pathWalkTo(44.5, 21.5, 800);
      game.player.x = 44.5;
      game.player.y = 21.5;
      game.entityGrid.clear();
      game.entityGrid.insertAll(game.entities);
      stepAndWatch(run, ctx, player, 5, "resupply pickup");
    }
    else if (step === 14) {
      t.clearInput(game);
      game.player.chronoActive = false;
      game.timeScale = 1;
      game.tutorialStepTime = performance.now() - 3000;
      stepAndWatch(run, ctx, player, 5, "alert");
    }
    else if (step === 15 || step === 16) {
      t.clearInput(game);
      game.player.chronoActive = false;
      game.timeScale = 1;
      preparePlayer(player);
      stepAndWatch(run, ctx, player, 1, "tutorial wave spawn");
      killEnemiesDirectly();
      stepAndWatch(run, ctx, player, 20, "tutorial wave clear");
    } else if (step === 17) {
      t.clearInput(game);
      game.player.chronoActive = false;
      game.timeScale = 1;
      game.tutorialStepTime = performance.now() - 3000;
      stepAndWatch(run, ctx, player, 5, "tutorial completion");
    }
    else if (step === 18) game.state = GameState.TUTORIAL_COMPLETE;
    else throw new Error(`Unhandled tutorial step ${step}`);
    t.clearInput(game);
    game.player.isAiming = false;
  }

  function playCampaign(run, ctx, player) {
    const levelsToRun = CAMPAIGN_LEVELS.length;
    const bossLevel = CAMPAIGN_LEVELS.findIndex((l) => l?.isBossLevel);

    // Every level in act 1, then the boss once per act: each act replays the
    // nine levels, and only the act-3 boss ends the campaign.
    for (let level = 0; level < levelsToRun; level++) {
      if (level === bossLevel) continue;
      runCampaignLevel(run, ctx, player, level);
    }
    for (const act of [1, 2, 3]) {
      startCampaignLevel(bossLevel, act);
      preparePlayer(player);
      stepAndWatch(run, ctx, player, 10, `act ${act} boss start`);
      killBossDirectly();
      skipCutscenes(run, ctx, player);
      if (act < 3) {
        if (game.campaign.act !== act + 1 || game.campaign.level !== 0) {
          throw new Error(
            `act ${act} boss should open act ${act + 1} at level 0, got act ${game.campaign.act} level ${game.campaign.level}`,
          );
        }
      } else {
        assertState(run, [GameState.VICTORY], "act 3 boss should end the campaign");
      }
    }
  }

  function runCampaignLevel(run, ctx, player, level) {
    startCampaignLevel(level);
    preparePlayer(player);
    stepAndWatch(run, ctx, player, 10, `campaign ${level} start`);

    killEnemiesDirectly();
    if (!game.exitEntity) throw new Error(`Campaign level ${level} has no exit`);
    game.player.x = game.exitEntity.x;
    game.player.y = game.exitEntity.y;
    stepAndWatch(run, ctx, player, 5, `campaign ${level} exit`);
    assertState(run, [GameState.LEVEL_COMPLETE], `campaign level ${level} should complete`);
  }

  function playArena(run, ctx, player) {
    for (let round = 0; round < 3; round++) {
      preparePlayer(player);
      killEnemiesDirectly();
      game.arenaTimer = 0;
      stepAndWatch(run, ctx, player, 5, `arena round ${round + 1} clear`);
      assertState(run, [GameState.UPGRADE], "arena should reach upgrade screen");
      game.upgradeSelection = Object.keys(UPGRADES).length;
      game.handleKeyPress("Enter");
      stepAndWatch(run, ctx, player, 10, `arena round ${round + 1} continue`);
      assertState(run, [GameState.PLAYING], "arena should start next round");
    }
  }

  function playMeltdown(run, ctx, player) {
    const startY = game.player.y;
    for (let i = 0; i < 1200; i++) {
      game.player.health = game.player.maxHealth;
      if (game._meltdownUpgradeChoices) {
        game.meltdown.selectUpgrade(0);
        game._meltdownUpgradeChoices = null;
      }
      game.keys[game.keybinds.moveLeft] = false;
      game.keys[game.keybinds.moveRight] = false;
      if (game.player.x < 5.5) game.keys[game.keybinds.moveRight] = true;
      else if (game.player.x > 9.5) game.keys[game.keybinds.moveLeft] = true;
      else if (player.chaos && Math.random() < player.chaos * 0.04) {
        game.keys[Math.random() < 0.5 ? game.keybinds.moveLeft : game.keybinds.moveRight] = true;
      }
      stepAndWatch(run, ctx, player, 1, "meltdown run");
      if (game.meltdown.distance >= 80) break;
    }
    t.clearInput(game);
    if (game.player.y <= startY + 20 || game.meltdown.distance < 50) {
      throw new Error(`Meltdown made insufficient progress: distance=${game.meltdown.distance.toFixed(1)}`);
    }
  }

  function playBuilder(run, ctx, player) {
    assertState(run, [GameState.BUILDER], "builder should enter");
    stepAndWatch(run, ctx, player, 30, "builder render");
    game.startBuilderPlayTest();
    preparePlayer(player);
    assertState(run, [GameState.PLAYING], "builder playtest should enter gameplay");
    killEnemiesDirectly();
    stepAndWatch(run, ctx, player, 150, "builder playtest clear");
    assertState(run, [GameState.BUILDER, GameState.PLAYING], "builder playtest should remain playable or return to builder");
    if (game.state === GameState.PLAYING) game.exitBuilderPlayTest();
    game.pauseGame(GameState.BUILDER);
    game.handleKeyPress("KeyQ");
    assertState(run, [GameState.TITLE], "builder quit should return title");
    if (game.mode !== null) throw new Error(`Builder quit left stale mode: ${game.mode}`);
  }

  function playCustomize(run, ctx, player) {
    assertState(run, [GameState.CHARACTER_CREATE], "customize should enter creator");
    for (let i = 0; i < 8; i++) game.handleKeyPress(i % 2 ? "ArrowRight" : "ArrowLeft");
    game.handleKeyPress("Enter");
    stepAndWatch(run, ctx, player, 5, "creator save");
    assertState(run, [GameState.MODE_SELECT], "creator should return to mode select");
  }

  function startCampaignLevel(level, act = 1) {
    game.mode = "campaign";
    game.campaignLevel = level;
    game.campaignAct = act;
    game.player.reset();
    game.loadCampaignLevel(level);
    game.state = GameState.PLAYING;
    game.mouse.locked = true;
  }

  function killEnemiesDirectly() {
    let killed = 0;
    for (const e of game.entities) {
      if (e.type !== "enemy" || !e.active || e.state === "dead") continue;
      e.health = 1;
      game.damageEnemy(e, 999999, { name: "body", mult: 1 });
      killed++;
    }
    return killed;
  }

  function killBossDirectly() {
    const boss = game.entities.find((e) => e.type === "enemy" && e.active && e.enemyType?.startsWith("boss"));
    if (!boss) throw new Error("Boss level has no active boss");
    boss.health = 1;
    game.damageEnemy(boss, 999999, { name: "body", mult: 1 });
  }

  function skipCutscenes(run, ctx, player) {
    for (let i = 0; i < 40 && game.state === GameState.CUTSCENE; i++) {
      game.endCutscene();
      stepAndWatch(run, ctx, player, 5, "cutscene skip");
    }
  }

  function fireBurst(run, ctx, player, ticks) {
    withInput(() => { game.player.isFiring = true; }, run, ctx, player, ticks, "fire");
    game.player.isFiring = false;
  }

  function openDoorAt(x, y, angle) {
    game.player.x = x - Math.cos(angle) * 0.75;
    game.player.y = y - Math.sin(angle) * 0.75;
    game.player.angle = angle;
    game.interact();
  }

  function pathWalkTo(tx, ty, maxTicks = 800) {
    const path = findPath(game.map, game.player.x, game.player.y, tx, ty);
    if (!path) throw new Error(`No path to ${tx.toFixed(1)},${ty.toFixed(1)}`);
    let ticks = 0;
    for (const [cx, cy] of path.slice(1)) {
      ticks += t.walkTo(game, cx + 0.5, cy + 0.5, Math.max(20, maxTicks - ticks));
      if (ticks >= maxTicks) break;
    }
    ticks += t.walkTo(game, tx, ty, Math.max(20, maxTicks - ticks));
    return ticks;
  }

  function findPath(map, sx, sy, tx, ty) {
    const start = [Math.floor(sx), Math.floor(sy)];
    const goal = [Math.floor(tx), Math.floor(ty)];
    const key = (x, y) => `${x},${y}`;
    const passable = (x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height && (map.grid[y][x] === 0 || map.grid[y][x] === 5);
    if (!passable(goal[0], goal[1])) return null;
    const queue = [start];
    const cameFrom = new Map([[key(start[0], start[1]), null]]);
    for (let qi = 0; qi < queue.length; qi++) {
      const [x, y] = queue[qi];
      if (x === goal[0] && y === goal[1]) break;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const k = key(nx, ny);
        if (!passable(nx, ny) || cameFrom.has(k)) continue;
        cameFrom.set(k, [x, y]);
        queue.push([nx, ny]);
      }
    }
    const goalKey = key(goal[0], goal[1]);
    if (!cameFrom.has(goalKey)) return null;
    const path = [];
    for (let cur = goal; cur; cur = cameFrom.get(key(cur[0], cur[1]))) path.push(cur);
    return path.reverse();
  }

  function withInput(setup, run, ctx, player, ticks, label) {
    setup();
    stepAndWatch(run, ctx, player, ticks, label);
    t.clearInput(game);
  }

  function stepAndWatch(run, ctx, player, ticks, label) {
    for (let i = 0; i < ticks; i++) {
      if (player.chaos && nextRandom(run) < player.chaos * 0.01) chaosInput(run);
      t.stepGame(game, 1);
      run.ticks++;
      if (run.ticks % ctx.sampleEvery === 0) assertSnapshot(run, label);
      if (run.ticks > ctx.maxTicks) throw new Error(`Exceeded tick budget during ${label}`);
    }
    assertSnapshot(run, label);
  }

  function chaosInput(run) {
    const keys = ["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "Digit1", "Digit2"];
    const code = keys[(nextRandom(run) * keys.length) | 0];
    game.keys[code] = !game.keys[code];
    game.mouse.dx += (nextRandom(run) - 0.5) * 80;
    game.mouse.dy += (nextRandom(run) - 0.5) * 20;
  }

  function assertState(run, states, reason) {
    if (!states.includes(game.state)) throw new Error(`${reason}; got ${game.state}`);
  }

  function checkProgress(run, ctx, player, label) {
    if (run.snapshots.length < 2) return;
    const latest = run.snapshots[run.snapshots.length - 1];
    const prior = run.snapshots[Math.max(0, run.snapshots.length - 1 - Math.ceil(ctx.stuckTicks / ctx.sampleEvery))];
    if (!prior) return;
    if (latest.tick - prior.tick < ctx.stuckTicks) return;
    const moved = Math.hypot(latest.player.x - prior.player.x, latest.player.y - prior.player.y) > 0.5;
    const progressed = latest.progressKey !== prior.progressKey;
    if (!moved && !progressed) throw new Error(`No progress for ${ctx.stuckTicks} ticks during ${label}`);
  }

  function assertSnapshot(run, label) {
    const snap = snapshotGame(game);
    snap.tick = run.ticks;
    snap.label = label;
    run.snapshots.push(snap);
    if (run.snapshots.length > 8) run.snapshots.shift();
    const issue = detectProblemState(snap);
    if (issue) throw new Error(`${issue}: ${JSON.stringify(snap)}`);
  }

  return { run };
}

export function snapshotGame(game) {
  const player = game.player || {};
  return {
    state: game.state,
    mode: game.mode,
    player: {
      x: player.x,
      y: player.y,
      angle: player.angle,
      health: player.health,
      alive: player.alive,
    },
    map: game.map ? { width: game.map.width, height: game.map.height, tile: tileAt(game.map, player.x, player.y) } : null,
    entities: game.entities?.filter((e) => e.active).length ?? 0,
    enemies: game.entities?.filter((e) => e.active && e.type === "enemy").length ?? 0,
    progress: {
      tutorialStep: game.tutorialStep,
      campaignLevel: game.campaignLevel,
      arenaRound: game.arenaRound,
      killedEnemies: game.killedEnemies,
      totalEnemies: game.totalEnemies,
      meltdownDistance: game.meltdown?.distance ?? 0,
    },
    progressKey: [
      game.state,
      game.mode,
      game.tutorialStep,
      game.campaignLevel,
      game.arenaRound,
      game.killedEnemies,
      Math.floor(game.meltdown?.distance ?? 0),
    ].join(":"),
  };
}

export function detectProblemState(snap) {
  if (!VALID_STATES.has(snap.state)) return `invalid state ${snap.state}`;
  for (const [key, value] of Object.entries(snap.player)) {
    if (typeof value === "number" && !Number.isFinite(value)) return `non-finite player.${key}`;
  }
  if (snap.map) {
    if (snap.player.x < 0 || snap.player.y < 0 || snap.player.x >= snap.map.width || snap.player.y >= snap.map.height) {
      return "player outside map";
    }
    if (snap.state === GameState.PLAYING && snap.map.tile == null) return "player tile unreadable";
    if (snap.state === GameState.PLAYING && snap.map.tile > 0) return `player inside solid tile ${snap.map.tile}`;
  }
  if (snap.state === GameState.PLAYING && snap.player.alive === false) return "dead player still in playing state";
  return null;
}

function normalizeList(value, fallback) {
  if (!value || value === "all") return [...fallback];
  return Array.isArray(value) ? value : [value];
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(run) {
  run.seed = Math.imul(run.seed + 0x6d2b79f5, 1);
  let t = run.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function tileAt(map, x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return null;
  return map.grid?.[ty]?.[tx];
}
