/**
 * How tall each enemy is drawn on a grid level: [top, bottom] of the figure,
 * in world units from the player's eye line (+ up), at the renderer's
 * projection (the floor is 0.5 below the eye, the ceiling 0.5 above).
 *
 * A grid level's shot is tested against the figure you can see, so a shot at
 * a drawn head is a headshot (rayEnemyHit in src/systems/combat.js). Measured
 * from the Modern sprites (ccDebug.measureEnemyArt() regenerates the table):
 * the sprite's box, less its few pixels of ink and contact-shadow margin.
 */
export const ENEMY_ART_SPAN = {
  drone: [0.53, -0.25],
  phantom: [0.66, -0.5],
  beast: [0.46, -0.5],
  boss: [1.16, -0.5],
  boss_form2: [0.75, -0.5],
  boss_form3: [0.41, -0.5],
  hound: [0.79, -0.5],
  corruptCop: [0.6, -0.5],
  sentinel: [0.7, -0.5],
  glitchling: [0.33, -0.25],
  shieldCommander: [0.59, -0.5],
  temporalSummoner: [0.71, -0.5],
  henchman: [0.58, -0.5],
  chronoBomber: [0.74, -0.5],
  phaseStalker: [0.76, -0.5],
  timeWarden: [0.57, -0.5],
  echoDrone: [0.36, -0.24],
  riftLeaper: [0.68, -0.5],
  temporalEngineer: [0.58, -0.5],
};

/** A figure the table doesn't know: a person standing on the floor. */
export const DEFAULT_ART_SPAN = [0.58, -0.5];
