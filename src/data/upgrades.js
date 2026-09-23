// Arena Upgrades
export const UPGRADES = {
  maxHealth: {
    name: "Temporal Armor",
    description: "+25 Max Health",
    baseCost: 200,
    costScale: 1.6,
    maxLevel: 8,
    apply: (player) => {
      player.maxHealth += 25;
      player.health = Math.min(player.health + 25, player.maxHealth);
    },
  },
  damage: {
    name: "Chrono Amplifier",
    description: "+15% Damage",
    baseCost: 300,
    costScale: 1.7,
    maxLevel: 8,
    apply: (player) => {
      player.damageMultiplier = (player.damageMultiplier || 1) + 0.15;
    },
  },
  speed: {
    name: "Phase Boots",
    description: "+10% Movement Speed",
    baseCost: 250,
    costScale: 1.5,
    maxLevel: 5,
    apply: (player) => {
      player.moveSpeed *= 1.1;
    },
  },
  ammo: {
    name: "Ammo Synthesizer",
    description: "+20 Ammo Capacity",
    baseCost: 150,
    costScale: 1.4,
    maxLevel: 8,
    apply: (player) => {
      player.ammo = Math.min(player.ammo + 20, 999);
    },
  },
  regen: {
    name: "Temporal Regeneration",
    description: "Regenerate 0.5 HP/sec",
    baseCost: 400,
    costScale: 2.2,
    maxLevel: 5,
    apply: (player) => {
      player.regenRate = (player.regenRate || 0) + 0.5;
    },
  },
  armor: {
    name: "Chrono Plating",
    description: "+10 Armor (reduces damage)",
    baseCost: 250,
    costScale: 1.6,
    maxLevel: 8,
    apply: (player) => {
      player.armor = (player.armor || 0) + 10;
    },
  },
  critChance: {
    name: "Rift Precision",
    description: "+8% Critical Hit Chance",
    baseCost: 350,
    costScale: 1.8,
    maxLevel: 6,
    apply: (player) => {
      player.critChance = (player.critChance || 0) + 0.08;
    },
  },
  lifeSteal: {
    name: "Temporal Drain",
    description: "Heal 3% of damage dealt",
    baseCost: 600,
    costScale: 2.4,
    maxLevel: 5,
    apply: (player) => {
      player.lifeSteal = (player.lifeSteal || 0) + 0.03;
    },
  },
  explosiveRounds: {
    name: "Quantum Splash",
    description: "Attacks deal 10% splash damage",
    baseCost: 600,
    costScale: 2.4,
    maxLevel: 4,
    apply: (player) => {
      player.splashDamage = (player.splashDamage || 0) + 0.1;
    },
  },
  fireRate: {
    name: "Overclock Chamber",
    description: "+12% Fire Rate",
    baseCost: 275,
    costScale: 1.6,
    maxLevel: 6,
    apply: (player) => {
      player.fireRateMultiplier = (player.fireRateMultiplier || 1) + 0.12;
    },
  },
  dodgeChance: {
    name: "Temporal Reflex",
    description: "+6% Dodge Chance",
    baseCost: 350,
    costScale: 1.9,
    maxLevel: 5,
    apply: (player) => {
      player.dodgeChance = (player.dodgeChance || 0) + 0.06;
    },
  },
  shield: {
    name: "Rift Barrier",
    description: "+20 Rechargeable Shield",
    baseCost: 450,
    costScale: 2.0,
    maxLevel: 5,
    apply: (player) => {
      player.maxShield = (player.maxShield || 0) + 20;
      player.shield = player.maxShield;
    },
  },
  multiShot: {
    name: "Quantum Split",
    description: "+1 Projectile per shot",
    baseCost: 700,
    costScale: 2.5,
    maxLevel: 3,
    apply: (player) => {
      player.multiShot = (player.multiShot || 1) + 1;
    },
  },
  thorns: {
    name: "Paradox Thorns",
    description: "Reflect 12% damage to attackers",
    baseCost: 325,
    costScale: 1.8,
    maxLevel: 5,
    apply: (player) => {
      player.thorns = (player.thorns || 0) + 0.12;
    },
  },
  maxStamina: {
    name: "Rift Endurance",
    description: "+25 Max Stamina",
    baseCost: 200,
    costScale: 1.5,
    maxLevel: 5,
    apply: (player) => {
      player.maxStamina = (player.maxStamina || 100) + 25;
      player.stamina = Math.min(player.stamina + 25, player.maxStamina);
    },
  },
  staminaRegen: {
    name: "Chrono Fuel",
    description: "+30% Stamina Recovery",
    baseCost: 275,
    costScale: 1.6,
    maxLevel: 4,
    apply: (player) => {
      player.staminaRegenRate = (player.staminaRegenRate || 1) + 0.3;
    },
  },
  dashPower: {
    name: "Rift Step",
    description: "Dash farther, costs -4 stamina",
    baseCost: 350,
    costScale: 1.8,
    maxLevel: 4,
    apply: (player) => {
      player.dashDistMult = (player.dashDistMult || 1) + 0.25;
      player.dashStaminaCost = (player.dashStaminaCost || 20) - 4;
    },
  },
  sprintEfficiency: {
    name: "Phase Stride",
    description: "-15% Sprint stamina drain",
    baseCost: 250,
    costScale: 1.6,
    maxLevel: 4,
    apply: (player) => {
      player.sprintDrainMult = (player.sprintDrainMult || 1) - 0.15;
    },
  },
};
