/**
 * Memory Fragments — collectible story pieces from the Dead Squad.
 * 4 fragments per member (Voss, Miri, Kai), one in each of Acts I-IV, each
 * placed with the recruit or place that echoes it (spec §8). All twelve, on
 * an NG+ run, earn the true ending (NG_PLUS in src/data/campaign/acts.js).
 *
 * `act` is the campaign act (an ACTS id in src/data/campaign/acts.js) and
 * `level` the 1-based level within that act; the game looks fragments up with
 * (campaign.act, campaign.level + 1). Hidden fragments are found behind a
 * secret wall on that level's map; visible ones are awarded when the level is
 * completed, so they cannot sit on an act's boss level, which ends on the
 * kill rather than an exit. tests/unit/archive.test.js pins every tag to a
 * real slot.
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
    level: 6,
    hidden: true,
  },
  {
    id: 'voss_3',
    member: 'Voss',
    title: 'Ninety-Four Percent',
    text: 'The last scan leaves no room for doubt: Voss\'s signature and the Paradox Lord\'s overlap at 94%. The same man, split by one choice. One ran the experiment. One joined a squad. Voss didn\'t buy the team time by fighting. He fed himself into the paradox and became the anchor pinning his other self in place. Not just brave. The equation balancing itself.',
    ariaReaction: 'He didn\'t die buying us time. He died becoming the cage. Whatever\'s left of him is still in there, holding the door shut from the inside.',
    act: 3,
    level: 4,
    hidden: false,
  },
  {
    // IV-2, The Loop: the flat held still behind the tenement wall.
    id: 'voss_4',
    member: 'Voss',
    title: 'The Other Choice',
    text: 'A room held still at one instant. Your Voss sits on a supply crate with a mug going cold, the squad asleep around him. On his slate: PROJECT PARADOX. ELEVEN SECONDS. One signature short. He reads it once, all the way to the end. Then he wipes it, turns the slate face down, and pulls a blanket over Kai. "Not tonight. They need a tactician more than time needs a master."',
    ariaReaction: 'Same proposal. Same man. One of him signed it. This one tucked a blanket round Kai and went back to his map. That\'s the whole difference, and it\'s the size of a blanket.',
    act: 4,
    level: 2,
    hidden: true,
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
    level: 5,
    hidden: false,
  },
  {
    id: 'miri_3',
    member: 'Miri',
    title: 'Last Breath, Longest Reach',
    text: 'Miri empties her last temporal stabilizer into your arm. There\'s none left for her, and she knows it. The decay starts at her edges; her voice begins to echo. "You survive this. That\'s an order from your medic." She fades into light, still reaching for you.',
    ariaReaction: 'She spent everything keeping us alive. At the end, she spent herself. I carry her work in every heartbeat.',
    act: 3,
    level: 5,
    hidden: false,
  },
  {
    // IV-3, Containment: the field medbay behind the intake wall.
    id: 'miri_4',
    member: 'Miri',
    title: 'The Lullaby',
    text: 'A flooded corridor, the lights out. You\'re across Miri\'s knees with a fever you don\'t remember having. This time she doesn\'t hum it. She sings it, low, the words at last: "Sleep now, the stars keep time. / The dark keeps watch, and I keep you. / And if the morning\'s late, my love, / I\'ll wait the way the lamplights do." Her voice breaks on the last line. She sings it again anyway.',
    ariaReaction: 'Those are the words. I\'ve been humming the wrong notes around them since the day I came online. I\'m keeping them. All of them.',
    act: 4,
    level: 3,
    hidden: true,
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
    level: 3,
    hidden: true,
  },
  {
    id: 'kai_3',
    member: 'Kai',
    title: 'The Door Holds',
    text: 'Kai welds the blast door shut from the wrong side, one arm pinned under fallen scaffolding. Something hammers the steel from the other side. "Go. This door holds as long as I do." The torch flickers. Kai doesn\'t look back. The door holds.',
    ariaReaction: 'I heard the torch cut out over comms. Then nothing. That door never opened again.',
    act: 3,
    level: 6,
    hidden: false,
  },
  {
    // IV-5, the Archive: Rook hands it over before he stays to burn it.
    id: 'kai_4',
    member: 'Kai',
    title: 'The Anchor',
    text: 'Rook\'s hands, not Kai\'s, closing the last seam on a fist-sized cylinder of brass and glass. Kai\'s handwriting runs round its collar, copied line for line from a blueprint folded too many times. Under "I checked it twice," a new line in Rook\'s blocky capitals: CHECKED IT A THIRD TIME. HE WAS RIGHT. He closes your fingers over it. "Holds a door from the inside. That\'s what it was always for."',
    ariaReaction: 'Two engineers who never met, a timeline apart, and the machine still works. Kai would have been insufferable about it.',
    act: 4,
    level: 5,
    hidden: false,
  },
];
