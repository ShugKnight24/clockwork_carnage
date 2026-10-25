/**
 * How tall each enemy is drawn on a grid level: [top, bottom] of the figure,
 * in world units from the standing eye line EYE_Z (+ up), at the renderer's
 * projection (the floor is 0.5 below that line, the ceiling 0.5 above).
 *
 * A grid level's shot is tested against the figure you can see, so a shot at
 * a drawn head is a headshot (rayEnemyHit in src/systems/combat.js). Measured
 * off the inked pixels of each figure as the game draws it, idle and facing
 * the camera (ccDebug.measureEnemyArt() regenerates both tables). The sprite's
 * box was measured once instead: its transparent padding stood every hit
 * volume about 0.1 over the drawn head, so a headshot meant aiming at the hair.
 *
 * ENEMY_ART_SPAN is the vector art (Comic and Modern, within 0.01 of each
 * other); LEGACY_ART_SPAN the procedural Legacy figures, which are smaller
 * and stand a little off the floor.
 */
export const ENEMY_ART_SPAN = {
  drone: [0.37, -0.19],
  phantom: [0.47, -0.5],
  beast: [0.32, -0.46],
  boss: [1.16, -0.5],
  boss_form2: [0.75, -0.5],
  boss_form3: [0.41, -0.5],
  hound: [0.57, -0.45],
  corruptCop: [0.46, -0.43],
  sentinel: [0.54, -0.44],
  glitchling: [0.47, -0.04],
  shieldCommander: [0.52, -0.43],
  temporalSummoner: [0.47, -0.46],
  henchman: [0.49, -0.43],
  chronoBomber: [0.42, -0.44],
  phaseStalker: [0.41, -0.44],
  timeWarden: [0.46, -0.44],
  echoDrone: [0.25, -0.12],
  riftLeaper: [0.33, -0.43],
  temporalEngineer: [0.48, -0.43],
};

/** A figure the table doesn't know: a person standing on the floor. */
export const DEFAULT_ART_SPAN = [0.49, -0.43];

export const LEGACY_ART_SPAN = {
  drone: [0.38, -0.21],
  phantom: [0.23, -0.26],
  beast: [0.31, -0.3],
  hound: [0.39, -0.49],
  corruptCop: [0.39, -0.41],
  sentinel: [0.5, -0.44],
  glitchling: [0.15, -0.15],
  shieldCommander: [0.39, -0.37],
  temporalSummoner: [0.36, -0.34],
  henchman: [0.38, -0.35],
  chronoBomber: [0.36, -0.38],
  phaseStalker: [0.35, -0.42],
  timeWarden: [0.38, -0.38],
  echoDrone: [0.19, -0.19],
  riftLeaper: [0.29, -0.33],
  temporalEngineer: [0.44, -0.35],
};

export const LEGACY_DEFAULT_ART_SPAN = [0.38, -0.35];
