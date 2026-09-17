/**
 * Memory Fragments — collectible story pieces from the Dead Squad.
 * 3 fragments per member (Voss, Miri, Kai), one per act.
 *
 * `act` is the campaign loop (1-3): the nine maps are replayed three times with
 * escalating rosters. `level` is the 1-based map number (1-9) within a loop, so
 * any act can use any map. Hidden fragments are found behind a secret wall on
 * that map; visible ones are awarded when the map is completed, so they cannot
 * sit on map 9, which ends on the boss kill rather than an exit.
 */
export const MEMORY_FRAGMENTS = [
  // ─── VOSS (Tactician) ─────────────────────────────────────────────
  {
    id: 'voss_1',
    member: 'Voss',
    title: 'The Last Briefing',
    text: 'Voss at the holotable, carving routes through enemy lines with one steady finger. "We don\'t win every fight. We win the right ones." He taps a blinking node on the map. Everyone at the table knows it\'s a one-way trip. Nobody says it.',
    ariaReaction: 'I remember this briefing. I shouldn\'t — I came online this morning. He kept looking at me like he was memorizing my face.',
    act: 1,
    level: 3,
    hidden: false,
  },
  {
    id: 'voss_2',
    member: 'Voss',
    title: 'Echoes in the Signal',
    text: 'A corrupted recording, half-static: Voss arguing with someone off-screen about temporal readings. "The signature is mine — or close enough to be. If the Paradox Lord is using my pattern, then I\'m the key to stopping it." The feed cuts to snow.',
    ariaReaction: 'He knew. He knew what he was before any of us did, and he said nothing.',
    act: 2,
    level: 5,
    hidden: true,
  },
  {
    id: 'voss_3',
    member: 'Voss',
    title: 'Ninety-Four Percent',
    text: 'The final scan results are undeniable: Voss\'s temporal signature and the Paradox Lord\'s overlap at 94%. Voss bought the team time not by fighting, but by feeding himself into the paradox — becoming the anchor that holds the Lord in place. His sacrifice wasn\'t just brave. It was the equation balancing itself.',
    ariaReaction: 'He didn\'t die buying us time. He died becoming the cage. And whatever\'s left of him is still in there, holding the door shut from the inside.',
    act: 3,
    level: 7,
    hidden: false,
  },

  // ─── MIRI (Medic) ─────────────────────────────────────────────────
  {
    id: 'miri_1',
    member: 'Miri',
    title: 'Field Sutures',
    text: 'Miri stitches a wound by flashlight, humming an old lullaby while the ceiling shakes dust down on both of you. "Hold still. I didn\'t drag you out of that crater so an infection could have you." She ties off the last knot and smiles like the world isn\'t ending. It is.',
    ariaReaction: 'She always hummed that song. I never learned the words. I wish I had.',
    act: 1,
    level: 4,
    hidden: true,
  },
  {
    id: 'miri_2',
    member: 'Miri',
    title: 'The Promise',
    text: 'Miri sits across from the player in a bombed-out chapel, sharing the last ration bar. "When this is over, I\'m opening a clinic somewhere green. No guns, no clocks, no time loops. You\'re my first patient — mandatory checkup, no excuses." She breaks the bar perfectly in half.',
    ariaReaction: 'She meant it. Every word. That\'s what makes it unbearable.',
    act: 2,
    level: 4,
    hidden: false,
  },
  {
    id: 'miri_3',
    member: 'Miri',
    title: 'Last Breath, Longest Reach',
    text: 'Miri injects her entire reserve of temporal stabilizer into the player\'s arm, knowing there\'s nothing left for herself. The chrono-decay starts immediately — her edges blur, her voice echoes. "You survive this. That\'s an order from your medic." She dissolves into light, still reaching forward.',
    ariaReaction: 'She spent everything keeping us alive. And in the end, she spent herself. I carry her work in every heartbeat.',
    act: 3,
    level: 6,
    hidden: false,
  },

  // ─── KAI (Engineer) ────────────────────────────────────────────────
  {
    id: 'kai_1',
    member: 'Kai',
    title: 'Impossible Machines',
    text: 'Kai crouches in a nest of scrap, welding parts that don\'t fit into a machine that shouldn\'t work. "Physics is a suggestion when you\'re desperate enough." The thing coughs, then hums to life. For a second, Kai\'s grin outshines the sparks.',
    ariaReaction: 'Kai could build a star out of garbage. I understood maybe half of it. The half that mattered always worked.',
    act: 1,
    level: 2,
    hidden: false,
  },
  {
    id: 'kai_2',
    member: 'Kai',
    title: 'Blueprint for Tomorrow',
    text: 'A crumpled schematic found wedged behind a wall panel — Kai\'s handwriting, rushed but precise. It\'s a design for a temporal anchor, something that could stabilize a rift permanently. In the margins: "If I don\'t make it, someone finish this. The math is right. I checked it twice."',
    ariaReaction: 'They left us the answer. Folded it up and hid it like a letter, hoping the right person would find it.',
    act: 2,
    level: 6,
    hidden: true,
  },
  {
    id: 'kai_3',
    member: 'Kai',
    title: 'The Door Holds',
    text: 'Kai welds the blast door shut from the wrong side, one arm already crushed under fallen scaffolding. The horde hammers against the steel. "Go — this door holds as long as I do." The welding torch flickers, and Kai doesn\'t look back. The door holds.',
    ariaReaction: 'I heard the torch go out through the comm channel. Then silence. Then nothing. That door never opened again, and neither did anything behind it.',
    act: 3,
    level: 8,
    hidden: false,
  },
];
