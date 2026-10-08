/**
 * Weapon finishes: per-weapon skins, earned with that weapon, plus finishes
 * the player mixes themselves.
 *
 * A finish recolours a weapon model's materials (svg-art/viewmodel/weapons.js)
 * — the main metals to `primary`, dark gunmetal trim to `secondary`, polymer
 * to `grip`, each a five-tone ramp from shadow to highlight — swaps the
 * energy channels to `energy`, and may lay a pattern over the metal. The
 * first-person viewmodel and the HUD icons are built from the same models,
 * so both wear it.
 *
 * The character stores which finish each weapon wears (weaponFinishes:
 * { [weaponId]: finishId }) and up to MAX_CUSTOM finishes of its own
 * (customSkins); a custom finish's id is "custom:<index>".
 */

const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hexRgb = (h) => {
  const n = parseInt(String(h).slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = (c) => "#" + c.map((v) => clampByte(v).toString(16).padStart(2, "0")).join("");
const mixHex = (a, b, t) => {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbHex(A.map((v, i) => v + (B[i] - v) * t));
};

/** A five-tone ramp (deep shadow → specular) around one base colour. */
export function rampOf(base) {
  return [mixHex(base, "#000000", 0.82), mixHex(base, "#000000", 0.55), base, mixHex(base, "#ffffff", 0.35), mixHex(base, "#ffffff", 0.75)];
}

export const SKIN_PATTERNS = [
  { id: "none", name: "Clean" },
  { id: "carbon", name: "Carbon weave" },
  { id: "hex", name: "Hex plate" },
  { id: "camo", name: "Splinter camo" },
  { id: "stripes", name: "Tiger stripe" },
  { id: "digital", name: "Digital" },
];

/**
 * Built-in finishes, in unlock order. `kills` is how many kills with a weapon
 * earn it for that weapon (Counter-Strike style: you show the gun you used).
 * Factory keeps the model's own materials.
 */
export const FINISHES = [
  { id: "default", name: "Factory", desc: "As it left the armoury.", kills: 0 },
  {
    id: "carbon", name: "Carbon Fiber", desc: "Matte black composite, woven.", kills: 15,
    primary: rampOf("#2a2d33"), secondary: rampOf("#17191d"), grip: rampOf("#101114"), pattern: "carbon",
  },
  {
    id: "chrome", name: "Chrome", desc: "Polished plating that throws the light back.", kills: 40,
    primary: ["#1c232b", "#55616e", "#9aa8b6", "#d8e1ea", "#ffffff"], secondary: rampOf("#5a6672"), grip: rampOf("#1c2026"),
  },
  {
    id: "frost", name: "Frostbite", desc: "Cryo-cooled steel, ice-blue cells.", kills: 75,
    primary: rampOf("#7fa6c4"), secondary: rampOf("#34536b"), grip: rampOf("#1a2a3a"), energy: "#9ff0ff", pattern: "digital",
  },
  {
    id: "toxic", name: "Toxic", desc: "Corroded plating, a glow that should not be there.", kills: 120,
    primary: rampOf("#4e6a38"), secondary: rampOf("#243418"), grip: rampOf("#141c0c"), energy: "#7dff4a", pattern: "hex",
  },
  {
    id: "ember", name: "Ember", desc: "Heat-treated to the edge of failure.", kills: 200,
    primary: rampOf("#4a2c20"), secondary: rampOf("#2c1810"), grip: rampOf("#120a06"), energy: "#ff7a2a", pattern: "stripes",
  },
];

export const MAX_CUSTOM = 4;

/** A player-made finish, resolved from its colours. */
export function customFinish(def, index) {
  return {
    id: `custom:${index}`,
    name: def.name || `Custom ${index + 1}`,
    desc: "Your own finish.",
    kills: 0,
    custom: true,
    primary: rampOf(def.primary),
    secondary: rampOf(def.secondary),
    grip: rampOf(mixHex(def.secondary, "#000000", 0.45)),
    energy: def.energy || null,
    pattern: def.pattern && def.pattern !== "none" ? def.pattern : null,
    colors: { primary: def.primary, secondary: def.secondary, energy: def.energy },
  };
}

/** Every finish a weapon could wear: the built-ins, then the character's own. */
export function finishesFor(character) {
  return [...FINISHES, ...(character?.customSkins ?? []).map(customFinish)];
}

/** The finish with this id, built-in or custom, or null. */
export function finishById(character, id) {
  if (typeof id !== "string") return null;
  if (id.startsWith("custom:")) {
    const i = Number(id.slice(7));
    const def = character?.customSkins?.[i];
    return def ? customFinish(def, i) : null;
  }
  return FINISHES.find((f) => f.id === id) ?? null;
}

/** Kills with `weaponId` from the achievement stats. */
export const killsWith = (stats, weaponId) => Number(stats?.weaponKills?.[weaponId]) || 0;

/** Has the player earned `finish` for `weaponId`? Custom finishes are always theirs. */
export function finishUnlocked(finish, weaponId, stats) {
  if (!finish) return false;
  return finish.custom || killsWith(stats, weaponId) >= (finish.kills || 0);
}

/**
 * The finish weapon `weaponId` wears, ready to render — or null for Factory
 * (the model's own materials).
 */
export function finishFor(character, weaponId) {
  const id = character?.weaponFinishes?.[weaponId];
  const f = finishById(character, id);
  return f && f.id !== "default" ? f : null;
}

/** A short stable key for caches: the same look gives the same key. */
export function finishKey(finish) {
  if (!finish) return "";
  if (!finish.custom) return finish.id;
  const c = finish.colors;
  return `c:${c.primary}${c.secondary}${c.energy || ""}${finish.pattern || ""}`;
}

// ── Saved data ──────────────────────────────────────────────────────────────

const HEX = /^#[0-9a-f]{6}$/i;

export function normalizeCustomSkins(list) {
  if (!Array.isArray(list)) return [];
  const patterns = new Set(SKIN_PATTERNS.map((p) => p.id));
  return list.slice(0, MAX_CUSTOM).flatMap((d) => {
    if (!d || !HEX.test(d.primary) || !HEX.test(d.secondary)) return [];
    return [{
      name: typeof d.name === "string" ? d.name.slice(0, 18) : "",
      primary: d.primary.toLowerCase(),
      secondary: d.secondary.toLowerCase(),
      energy: HEX.test(d.energy) ? d.energy.toLowerCase() : null,
      pattern: patterns.has(d.pattern) ? d.pattern : "none",
    }];
  });
}

export function normalizeWeaponFinishes(map, customSkins = []) {
  const out = {};
  if (!map || typeof map !== "object") return out;
  for (const [k, v] of Object.entries(map)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id < 0 || id > 63 || typeof v !== "string") continue;
    if (v.startsWith("custom:")) {
      const i = Number(v.slice(7));
      if (Number.isInteger(i) && i >= 0 && i < customSkins.length) out[id] = v;
    } else if (FINISHES.some((f) => f.id === v)) {
      out[id] = v;
    }
  }
  return out;
}

// ── The live character, for renderers that draw a weapon by id ──────────────

let _character = null;
/** Point weapon renderers at the player's character (kept by reference). */
export function setSkinCharacter(character) {
  _character = character;
}
/** The finish the player's weapon `weaponId` wears now, or null. */
export const activeFinish = (weaponId) => finishFor(_character, weaponId);
