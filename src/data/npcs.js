/**
 * Friendly characters: the people of Chronos Station. They are drawn on the
 * same sprite rig as the enemies (src/rendering/svg-art/sprites/humanoids.js),
 * but they are not enemies: no AI, no hit box, nothing to shoot. A scene moves
 * them (js/npc.js): walk to a mark, face someone, salute, point the way.
 *
 * Kept apart from ENEMY_TYPES so nothing that lists the enemies (the arena,
 * the Forge, the bestiary, balance checks) ever finds a policeman in it.
 */
export const NPC_TYPES = {
  officer: {
    name: "Chronos PD Officer",
    color1: "#2c4a7a",
    color2: "#121d36",
    speed: 1.6,
  },
  supervisor: {
    name: "Supervisor Hale",
    color1: "#3b4150",
    color2: "#1a1d24",
    speed: 1.4,
  },
};
