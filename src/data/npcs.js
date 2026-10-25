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
  /** The same officers in heavy armour, kitted up for the Engine level. */
  officerKit: {
    name: "Chronos PD Officer",
    color1: "#4b5568",
    color2: "#161b24",
    speed: 1.6,
  },
  /**
   * Lt. Rasczak kitted up: the same C-series, blacked out and made his own.
   * A command whip and an arm-mounted tech module, the shotgun he signs out.
   */
  rasczakKit: {
    name: "Lt. Rasczak",
    color1: "#3a3f4a",
    color2: "#0b0d12",
    speed: 1.6,
  },
  /** Sgt. Kael kitted up: the squad's wall, in the heaviest plate and behind a breacher shield. */
  kaelKit: {
    name: "Sgt. Kael",
    color1: "#4a5672",
    color2: "#111622",
    speed: 1.5,
  },
  supervisor: {
    name: "Supervisor Simon",
    color1: "#3b4150",
    color2: "#1a1d24",
    speed: 1.4,
  },
  /**
   * The Supervisor in his own heavy plate, after 06:47: the C-series in its
   * dress finish, polished navy and gold, the plate he usually wears on parade.
   */
  supervisorKit: {
    name: "Supervisor Simon",
    color1: "#4e5f8c",
    color2: "#101830",
    speed: 1.8,
  },
  /**
   * The office floor's civilians, two looks each (js/npc.js `look`): a lab
   * tech in a white coat or an engineer in coveralls; a clerk in a cardigan
   * or a blazer. Both wear an ID lanyard. Besides walking, pointing and the
   * raised hand, they have poses for the horror beats: "cower", "frozen"
   * (caught mid-motion by a time freeze) and "slumped" (sat against a wall).
   */
  staff: {
    name: "Station Staff",
    color1: "#d9dee4",
    color2: "#4a6266",
    speed: 1.3,
  },
  clerk: {
    name: "Station Clerk",
    color1: "#a85a62",
    color2: "#36333a",
    speed: 1.25,
  },
};
