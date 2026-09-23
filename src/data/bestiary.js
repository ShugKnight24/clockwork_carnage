// ── Enemy Bestiary ─────────────────────────────────────────────────
// Lore entries, tactical notes, and ARIA commentary for every enemy
// type on Chronos Station. Keyed by enemy type ID from enemies.js.

export const BESTIARY = {
  drone: {
    name: 'Glitched Drone',
    threat: 'Low',
    description:
      'Mass-produced security drones that once patrolled Chronos Station\'s lower decks. The temporal collapse scrambled their friend-or-foe protocols, locking them into an endless attack loop. They orbit targets in tight strafing patterns, peppering fire from medium range.',
    tacticalNote:
      'Drones freeze completely during Chrono Shift — use the window to line up easy headshots on their exposed core.',
    ariaQuote:
      '"Factory-spec tin cans with a grudge. I\'d feel bad, but they started it."',
  },

  phantom: {
    name: 'Time Phantom',
    threat: 'Moderate',
    description:
      'Echoes of station personnel caught mid-transit when the Chronos Engine fired. They exist across multiple temporal frames simultaneously, allowing them to blink-teleport unpredictably. Their ranged attacks phase through thin cover.',
    tacticalNote:
      'Phantoms resist Chrono Shift slowdown — track their teleport shimmer and lead your shots to where they\'re going, not where they are.',
    ariaQuote:
      '"Half-ghost, half-nuisance, full headache. At least they\'re consistent."',
  },

  beast: {
    name: 'Chrono Beast',
    threat: 'High',
    description:
      'Hulking quadrupeds warped into existence by sustained rift exposure. Their biology is temporally unstable — muscles contract and expand across time-states, giving them terrifying burst speed. They charge with a brief wind-up telegraph before sprinting at three times normal velocity.',
    tacticalNote:
      'Watch for the charge wind-up and sidestep — their momentum carries them past you, exposing the low-set head for a critical shot.',
    ariaQuote:
      '"Time made these things angry. I\'d say \'don\'t make them angrier,\' but that ship has sailed."',
  },

  boss: {
    name: 'Paradox Lord',
    threat: 'Extreme',
    description:
      'Dr. Elias Voss — or what he became when he merged with the Chronos Engine. He exists across three temporal forms simultaneously, each more powerful than the last. His ranged attacks draw energy directly from the rift, and his presence warps local spacetime.',
    tacticalNote:
      'Track ARIA\'s weak-point callouts and prioritize evasion — the Paradox Lord reads your patterns across timelines.',
    ariaQuote:
      '"Three doctorates, zero impulse control. And now he\'s everyone\'s problem."',
  },

  corruptCop: {
    name: 'Corrupt SWAT Officer',
    threat: 'Low-Moderate',
    description:
      'Station security officers whose neural implants were overwritten by the Paradox Lord\'s temporal signal. They retain their tactical training and patrol discipline, making them dangerous in groups despite modest individual stats.',
    tacticalNote:
      'They patrol in predictable routes — ambush them at corridor turns before they can cluster and crossfire.',
    ariaQuote:
      '"Protect and serve, now featuring \'and shoot at you.\' Love the rebrand."',
  },

  sentinel: {
    name: 'Chrono Sentinel',
    threat: 'High',
    description:
      'Massive armored constructs deployed as corridor guardians. Their front-facing temporal shields regenerate over time, absorbing direct fire while they close to devastating melee range. Built from salvaged reactor plating, they are nearly impervious head-on.',
    tacticalNote:
      'Frontal attacks deal minimal damage — flank the Sentinel to bypass its shield and target the exposed rear armor.',
    ariaQuote:
      '"Walking wall with anger issues. Go around it. Trust me on this one."',
  },

  glitchling: {
    name: 'Glitchling',
    threat: 'Low',
    description:
      'Tiny, erratic fragments of corrupted temporal data given physical form. They skitter at blinding speed with chaotic, unpredictable movement patterns. Individually weak, they overwhelm through sheer numbers and disorienting attack angles.',
    tacticalNote:
      'Use splash damage weapons — their erratic movement makes precision shots wasteful.',
    ariaQuote:
      '"Temporal bugs. Literal bugs. The universe has a sick sense of humor."',
  },

  shieldCommander: {
    name: 'Shield Commander',
    threat: 'High',
    description:
      'Sub-boss class officers who once led Chronos Station\'s elite security details. Their front-mounted temporal shields are military-grade, far stronger than a Sentinel\'s. They command from mid-range, coordinating lesser units while laying down suppressive fire.',
    tacticalNote:
      'Circle-strafe to get behind the shield — the Commander\'s slow turn rate is the weak link in its defense.',
    ariaQuote:
      '"Middle management with a force field. Of course they\'re the hardest to kill."',
  },

  temporalSummoner: {
    name: 'Temporal Summoner',
    threat: 'High',
    description:
      'Robed figures who tap directly into rift energy to pull drones from adjacent timelines. They stay at range, summoning reinforcements at regular intervals while peppering targets with temporal bolts. Left unchecked, they flood the field.',
    tacticalNote:
      'Prioritize the Summoner immediately — every eight seconds it lives means three more drones on the field.',
    ariaQuote:
      '"It keeps calling friends. Rude. I wasn\'t even invited to this party."',
  },

  chronoBomber: {
    name: 'Chrono-Bomber',
    threat: 'Moderate',
    description:
      'Modified drone chassis retrofitted with temporal explosive ordnance. They patrol at medium range, dropping time-delayed charges that detonate in a wide radius. The bombs distort local time, making the blast area briefly lethal even after detonation.',
    tacticalNote:
      'Watch the floor — their bomb indicators glow before detonation. Shoot the Bomber\'s core to disable it before it seeds the area.',
    ariaQuote:
      '"It leaves presents. Exploding presents. Worst gift-giver on the station."',
  },

  henchman: {
    name: 'Syndicate Henchman',
    threat: 'Moderate',
    description:
      'Hand-picked agents loyal to whoever ran the Chronos Engine, recruited before the collapse. Unlike the mind-controlled officers, these soldiers chose their side. Fast, aggressive flankers who work in pairs to cut off escape routes and punish stationary targets.',
    tacticalNote:
      'They flank aggressively — keep your back to a wall and eliminate the closest one before the pincer closes.',
    ariaQuote:
      '"Volunteers. They actually signed up for this. I have questions about their judgment."',
  },

  phaseStalker: {
    name: 'Phase Stalker',
    threat: 'Moderate-High',
    description:
      'Assassin-class hostiles that phase between temporal layers to close distance invisibly. They materialize at melee range with a devastating strike, then blink away before retaliation. Their shimmer is the only warning before the blade lands.',
    tacticalNote:
      'Listen for the phase-in audio cue and dash immediately — their strike commits them to a brief vulnerability window.',
    ariaQuote:
      '"Teleporting knife enthusiast. Every timeline has at least one."',
  },

  timeWarden: {
    name: 'Time Warden',
    threat: 'High',
    description:
      'Elite guardians stationed at critical junctions deep within the station. Their front-mounted temporal barriers regenerate rapidly, and their ranged attacks carry enough force to stagger even a suited agent. They hold ground with terrifying patience.',
    tacticalNote:
      'The shield regenerates every five seconds — sustained flanking pressure is the only way to burn through before it recharges.',
    ariaQuote:
      '"Imagine a Sentinel that learned patience. Terrifying concept. You\'re welcome."',
  },

  echoDrone: {
    name: 'Echo Drone',
    threat: 'Moderate',
    description:
      'Advanced drone variants that exploit temporal recursion — when destroyed, they split into a clone pulled from a parallel moment. Fast-moving swarm units that multiply if engaged carelessly, turning a manageable encounter into an overwhelming one.',
    tacticalNote:
      'Kill the clone immediately after the original — hesitation doubles your problem.',
    ariaQuote:
      '"Dies once, comes back. Dies twice, stays dead. Worst subscription model ever."',
  },

  riftLeaper: {
    name: 'Rift Leaper',
    threat: 'High',
    description:
      'Powerful melee strikers that launch themselves through short-range rift tears, closing six meters in an instant. Their leaps are telegraphed by a brief spatial distortion at both origin and landing point, but the window to react is razor-thin.',
    tacticalNote:
      'The rift shimmer appears at the landing zone a half-second before arrival — pre-aim at the shimmer for a point-blank headshot.',
    ariaQuote:
      '"It jumps through holes in spacetime to punch you. Respect the commitment, fear the execution."',
  },

  temporalEngineer: {
    name: 'Temporal Engineer',
    threat: 'High',
    description:
      'Support-class hostiles who disrupt agent systems from range. Their primary attack scrambles HUD readouts for three seconds, stripping away health, ammo, and radar data at the worst possible moment. They prefer long sightlines and retreat when pressured.',
    tacticalNote:
      'Close the gap fast — their HUD disruption is devastating at range but they crumble under close-quarters pressure.',
    ariaQuote:
      '"It hacks MY display. MY display. This is personal now."',
  },
};
