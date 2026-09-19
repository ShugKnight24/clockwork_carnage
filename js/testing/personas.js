/**
 * Clockwork Carnage — Player Persona Profiles
 *
 * Each persona defines a simulated player behavior pattern.
 * Used by the simulation runner to generate statistical data
 * about difficulty, balance, and engagement.
 *
 * PROPRIETARY — not shipped with the game.
 */

export const PERSONAS = {
  // ── Casual Player ──────────────────────────────────────
  casual: {
    name: "Casual Cory",
    description:
      "Plays for 5-10 minutes. Low accuracy, doesn't optimize upgrades.",
    behavior: {
      aimAccuracy: 0.35, // 35% of shots on target
      reactionTimeMs: 400, // slow reflexes
      dodgeChance: 0.1, // rarely strafes to avoid damage
      upgradeStrategy: "random", // picks random upgrades
      playstyle: "cautious", // hangs back, doesn't rush
      sessionLengthRounds: 3, // gives up after 3 arena rounds
      campaignRetries: 1, // retries once then quits
      usesAbilities: false, // doesn't use sprint/dash
      weaponPreference: null, // uses whatever they have
    },
    expectedMetrics: {
      survivalRounds: [1, 4], // expected range
      campaignProgress: [0, 1], // levels
      avgAccuracy: [0.2, 0.45],
      sessionDurationSec: [60, 300],
    },
  },

  // ── Competitive Grinder ────────────────────────────────
  grinder: {
    name: "Grinder Greg",
    description:
      "Arena focused. Optimizes upgrades for damage. High kill count.",
    behavior: {
      aimAccuracy: 0.65,
      reactionTimeMs: 200,
      dodgeChance: 0.4,
      upgradeStrategy: "damage_first", // prioritizes damage → fire rate → crit
      playstyle: "aggressive",
      sessionLengthRounds: 15,
      campaignRetries: 3,
      usesAbilities: true,
      weaponPreference: "highest_dps",
    },
    expectedMetrics: {
      survivalRounds: [6, 20],
      campaignProgress: [2, 5],
      avgAccuracy: [0.5, 0.8],
      sessionDurationSec: [300, 900],
    },
  },

  // ── Lore Hunter ────────────────────────────────────────
  loreHunter: {
    name: "Lore-Lover Luna",
    description: "Watches every cutscene. Finds secrets. Slow but thorough.",
    behavior: {
      aimAccuracy: 0.5,
      reactionTimeMs: 300,
      dodgeChance: 0.2,
      upgradeStrategy: "balanced",
      playstyle: "explorer", // checks every corner
      sessionLengthRounds: 8,
      campaignRetries: 5, // will replay for secrets
      usesAbilities: true,
      weaponPreference: null,
      watchesCutscenes: true, // doesn't skip
      seekSecrets: true, // actively searches walls
    },
    expectedMetrics: {
      survivalRounds: [3, 10],
      campaignProgress: [0, 5],
      avgAccuracy: [0.35, 0.6],
      secretsFound: [1, 10],
      cutsceneFramesWatched: [20, 200],
    },
  },

  // ── Speedrunner ────────────────────────────────────────
  speedrunner: {
    name: "Speedrun Sam",
    description: "Skips everything. Optimal routing. Minimizes time.",
    behavior: {
      aimAccuracy: 0.75,
      reactionTimeMs: 150,
      dodgeChance: 0.6,
      upgradeStrategy: "speed_first", // movement → fire rate
      playstyle: "rush",
      sessionLengthRounds: 20,
      campaignRetries: 10,
      usesAbilities: true, // heavy sprint/dash usage
      weaponPreference: "highest_dps",
      skipsCutscenes: true,
      ignoresPickups: true,
    },
    expectedMetrics: {
      survivalRounds: [5, 25],
      campaignProgress: [3, 5],
      avgAccuracy: [0.6, 0.85],
      levelCompletionTimeSec: [15, 60],
    },
  },

  // ── Builder/Creator ────────────────────────────────────
  builder: {
    name: "Builder Blake",
    description: "Spends most time in Temporal Forge. Tests own maps.",
    behavior: {
      aimAccuracy: 0.5,
      reactionTimeMs: 250,
      dodgeChance: 0.3,
      upgradeStrategy: "balanced",
      playstyle: "creative",
      sessionLengthRounds: 5,
      campaignRetries: 2,
      timeInBuilder: 0.7, // 70% of session in builder
      usesAbilities: true,
    },
    expectedMetrics: {
      survivalRounds: [2, 8],
      builderSessionSec: [300, 1200],
      mapsCreated: [1, 5],
    },
  },

  // ── Mobile Touch Player ────────────────────────────────
  mobile: {
    name: "Mobile Mia",
    description:
      "Playing on phone. Touch controls. Lower accuracy, shorter sessions.",
    behavior: {
      aimAccuracy: 0.25,
      reactionTimeMs: 500,
      dodgeChance: 0.05,
      upgradeStrategy: "random",
      playstyle: "cautious",
      sessionLengthRounds: 2,
      campaignRetries: 1,
      usesAbilities: false, // touch abilities harder
      isMobile: true,
    },
    expectedMetrics: {
      survivalRounds: [1, 3],
      campaignProgress: [0, 1],
      avgAccuracy: [0.15, 0.35],
      sessionDurationSec: [30, 180],
    },
  },

  // ── Accessibility Player ───────────────────────────────
  accessibility: {
    name: "Adaptive Alex",
    description:
      "Uses keyboard only. No mouse. Relies on aim-assist if available.",
    behavior: {
      aimAccuracy: 0.4,
      reactionTimeMs: 350,
      dodgeChance: 0.15,
      upgradeStrategy: "tank", // survivability (health → armor → regen)
      playstyle: "cautious",
      sessionLengthRounds: 5,
      campaignRetries: 3,
      usesAbilities: true,
      keyboardOnly: true,
    },
    expectedMetrics: {
      survivalRounds: [2, 6],
      campaignProgress: [0, 3],
      avgAccuracy: [0.25, 0.5],
    },
  },

  // ── Stress Tester ──────────────────────────────────────
  stressTester: {
    name: "Stress-Test Steve",
    description:
      "Pushes the engine. Max entities, rapid weapon switching, spam inputs.",
    behavior: {
      aimAccuracy: 0.5,
      reactionTimeMs: 50, // inhuman speed
      dodgeChance: 0.8,
      upgradeStrategy: "multishot_splash", // maximize on-screen projectiles
      playstyle: "chaotic",
      sessionLengthRounds: 30,
      campaignRetries: 0,
      usesAbilities: true,
      rapidWeaponSwitch: true,
      spamFire: true,
    },
    expectedMetrics: {
      survivalRounds: [10, 30],
      peakEntityCount: [50, 200],
      minFps: [15, 60],
      avgFrameTimeMs: [4, 20],
    },
  },
};

// ── Upgrade Strategy Selectors ───────────────────────────

export const UPGRADE_STRATEGIES = {
  random(available) {
    return available[Math.floor(Math.random() * available.length)];
  },
  damage_first(available) {
    const priority = [
      "damage",
      "critChance",
      "fireRate",
      "multiShot",
      "splashDamage",
    ];
    for (const key of priority) {
      if (available.includes(key)) return key;
    }
    return available[0];
  },
  speed_first(available) {
    const priority = ["moveSpeed", "fireRate", "stamina", "damage"];
    for (const key of priority) {
      if (available.includes(key)) return key;
    }
    return available[0];
  },
  tank(available) {
    const priority = [
      "maxHealth",
      "armor",
      "regen",
      "shield",
      "dodge",
      "lifeSteal",
    ];
    for (const key of priority) {
      if (available.includes(key)) return key;
    }
    return available[0];
  },
  balanced(available) {
    // Round-robin through categories
    const categories = [
      ["damage", "critChance"],
      ["maxHealth", "armor"],
      ["moveSpeed", "fireRate"],
    ];
    for (const cat of categories) {
      for (const key of cat) {
        if (available.includes(key)) return key;
      }
    }
    return available[0];
  },
  multishot_splash(available) {
    const priority = ["multiShot", "splashDamage", "fireRate", "damage"];
    for (const key of priority) {
      if (available.includes(key)) return key;
    }
    return available[0];
  },
};
