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
    member: 'V. [REDACTED]',
    title: 'The Last Briefing',
    text: 'V. at the holotable — the rest of the name burned out of the memory — carving routes through enemy lines with one steady finger. "We don\'t win every fight. We win the right ones." He taps a blinking node on the map. Everyone at the table knows it\'s a one-way trip. Nobody says it.',
    ariaReaction: 'I remember this briefing. I shouldn\'t — I came online this morning. He kept looking at me like he was memorizing my face.',
    act: 1,
    level: 3,
    hidden: false,
  },
  {
    id: 'voss_2',
    member: 'Voss',
    title: 'Echoes in the Signal',
    text: 'A corrupted recording, half static. Voss is arguing with someone off-screen about temporal readings. "That signature is mine. Or close enough to be. If the Paradox Lord is wearing my pattern, then I\'m the key to stopping him." The feed cuts to snow.',
    ariaReaction: 'He knew. He knew what the Doctor was to him before any of us did, and he kept his mouth shut.',
    act: 2,
    level: 5,
    hidden: true,
  },
  {
    id: 'voss_3',
    member: 'Voss',
    title: 'Ninety-Four Percent',
    text: 'The last scan leaves no room for doubt: Voss\'s signature and the Paradox Lord\'s overlap at 94%. The same man, split by one choice. One ran the experiment. One joined a squad. Voss didn\'t buy the team time by fighting. He fed himself into the paradox and became the anchor pinning his other self in place. Not just brave. The equation balancing itself.',
    ariaReaction: 'He didn\'t die buying us time. He died becoming the cage. Whatever\'s left of him is still in there, holding the door shut from the inside.',
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
    text: 'A bombed-out chapel. One ration bar left. Miri breaks it perfectly in half and hands you the bigger piece. "When this is over, I\'m opening a clinic somewhere green. No guns. No loops. You\'re my first patient. Mandatory checkup, no excuses."',
    ariaReaction: 'She meant every word. That\'s what makes it unbearable.',
    act: 2,
    level: 4,
    hidden: false,
  },
  {
    id: 'miri_3',
    member: 'Miri',
    title: 'Last Breath, Longest Reach',
    text: 'Miri empties her last temporal stabilizer into your arm. There\'s none left for her, and she knows it. The decay starts at her edges; her voice begins to echo. "You survive this. That\'s an order from your medic." She fades into light, still reaching for you.',
    ariaReaction: 'She spent everything keeping us alive. At the end, she spent herself. I carry her work in every heartbeat.',
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
    text: 'A crumpled schematic wedged behind a wall panel, in Kai\'s rushed, precise handwriting: a temporal anchor that could seal a rift for good. In the margin: "If I don\'t make it, someone finish this. The math is right. I checked it twice."',
    ariaReaction: 'Kai left us the answer. Folded it up and hid it like a letter, hoping the right person would find it.',
    act: 2,
    level: 6,
    hidden: true,
  },
  {
    id: 'kai_3',
    member: 'Kai',
    title: 'The Door Holds',
    text: 'Kai welds the blast door shut from the wrong side, one arm pinned under fallen scaffolding. Something hammers the steel from the other side. "Go. This door holds as long as I do." The torch flickers. Kai doesn\'t look back. The door holds.',
    ariaReaction: 'I heard the torch cut out over comms. Then nothing. That door never opened again.',
    act: 3,
    level: 8,
    hidden: false,
  },
];
