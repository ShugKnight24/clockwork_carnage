// Map legend:
// 0 = empty, 1 = stone, 2 = tech, 3 = metal, 4 = energy, 5 = door, 6 = secret
// 7 = boss wall, 8 = glass, 9 = temporal rift wall

// ── Cutscene Story Scripts ─────────────────────────────────────────
// Each cutscene is an array of frames. Each frame has:
//   bg: background style (color or gradient key)
//   title: large text at top (optional)
//   lines: array of { text, delay(ms), color, size }
//   art: drawing function key (hero, villain, station, explosion, etc.)
//   particles: particle effect key
//   duration: auto-advance time in ms (0 = wait for input)
//   shake: screen shake intensity (optional)
//   flash: flash color on entry (optional)

export const CUTSCENE_SCRIPTS = {
  // ═══════════════════════════════════════════════════════════════════
  // ACT I — THE FALL (Intro → Level 1-3)
  // The hero charges in alone, defeats the "boss"... but it's a trap.
  // ═══════════════════════════════════════════════════════════════════
  intro: [
    {
      bg: "deep_space",
      lines: [
        { text: "THE YEAR IS 2187.", delay: 0, color: "#556677", size: 14 },
        { text: "Time is broken.", delay: 1200, color: "#00ccff", size: 22 },
      ],
      particles: "stars",
      duration: 4000,
    },
    {
      bg: "deep_space",
      lines: [
        {
          text: "The Paradox Lord seized the Chronos Engine —",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "a device that bends the fabric of reality itself.",
          delay: 1500,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Past, present, and future collapsed into one.",
          delay: 3200,
          color: "#ff6644",
          size: 18,
        },
      ],
      art: "rift",
      particles: "embers",
      duration: 6000,
    },
    {
      bg: "station",
      lines: [
        {
          text: "Chronos Station — humanity's last anchor in time.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Its corridors now crawl with temporal abominations.",
          delay: 1800,
          color: "#ff8844",
          size: 16,
        },
        {
          text: "Drones, phantoms, beasts — all glitched into existence.",
          delay: 3600,
          color: "#ff4444",
          size: 16,
        },
      ],
      art: "station",
      particles: "sparks",
      duration: 6500,
    },
    {
      bg: "dark",
      art: "hero",
      lines: [
        {
          text: "You are the last Temporal Agent.",
          delay: 0,
          color: "#00ffcc",
          size: 20,
        },
        {
          text: "Armed. Alone. Out of time.",
          delay: 1800,
          color: "#ffffff",
          size: 24,
        },
      ],
      particles: "glow",
      duration: 4500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        { text: "Fix the timeline.", delay: 0, color: "#00ffcc", size: 18 },
        {
          text: "Kill the Paradox Lord.",
          delay: 1200,
          color: "#ff2244",
          size: 22,
        },
        { text: "Or die trying.", delay: 2400, color: "#ffffff", size: 26 },
      ],
      flash: "#00ccff",
      duration: 5000,
    },
  ],

  level2_briefing: [
    {
      bg: "station",
      lines: [
        {
          text: "CHRONOS STATION — SECTOR 2",
          delay: 0,
          color: "#00ccff",
          size: 20,
        },
        { text: "The Temporal Nexus", delay: 1200, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "station",
      lines: [
        {
          text: "The deeper corridors pulse with unstable energy.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Time itself fractures here — enemies phase in and out.",
          delay: 1800,
          color: "#ff8844",
          size: 16,
        },
        {
          text: "Stay sharp. Stay alive.",
          delay: 3600,
          color: "#ffcc00",
          size: 18,
        },
      ],
      art: "rift",
      particles: "embers",
      duration: 6000,
    },
  ],

  level3_briefing: [
    {
      bg: "boss_lair",
      lines: [
        { text: "THE PARADOX CORE", delay: 0, color: "#ff2244", size: 22 },
        {
          text: "Heart of the temporal collapse.",
          delay: 1500,
          color: "#cc4466",
          size: 16,
        },
      ],
      particles: "embers",
      shake: 2,
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: '"You FOOL. You think you can defeat ME?"',
          delay: 0,
          color: "#ff4466",
          size: 18,
        },
        {
          text: '"I am the master of time itself!"',
          delay: 2000,
          color: "#ff4466",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 5000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: '"In your foolish human terms — imagine Biff Tannen"',
          delay: 0,
          color: "#ff6688",
          size: 15,
        },
        {
          text: '"with the almanac from Back to the Future."',
          delay: 2000,
          color: "#ff6688",
          size: 15,
        },
        {
          text: '"Except instead of sports scores..."',
          delay: 3800,
          color: "#ff4466",
          size: 16,
        },
        {
          text: '"it contains every possible future of this battle."',
          delay: 5600,
          color: "#ff2244",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 8500,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: '"I\'ve seen EVERY outcome. I am always one step ahead."',
          delay: 0,
          color: "#ff4466",
          size: 16,
        },
        {
          text: '"But since I\'m about to end your pathetic life..."',
          delay: 2400,
          color: "#cc4466",
          size: 15,
        },
        {
          text: '"...let me tell you an incredible tale."',
          delay: 4500,
          color: "#cc4466",
          size: 15,
        },
      ],
      particles: "embers",
      duration: 7500,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: '"Have you ever heard the tragedy of Darth Plagueis the Wise?"',
          delay: 0,
          color: "#ff6688",
          size: 15,
        },
        {
          text: '"He was so powerful... he could use the Force"',
          delay: 2500,
          color: "#cc88aa",
          size: 14,
        },
        {
          text: '"to influence time to create... life."',
          delay: 4800,
          color: "#cc88aa",
          size: 14,
        },
        {
          text: '"The only thing he feared was losing his power."',
          delay: 7000,
          color: "#ff4466",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 10000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: '"His apprentice killed him in his sleep. Ironic."',
          delay: 0,
          color: "#cc88aa",
          size: 15,
        },
        {
          text: '"He could save others from death... but not himself."',
          delay: 2500,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 6000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: '"Okay, okay... I\'m monologuing like some corny villain."',
          delay: 0,
          color: "#ffaa88",
          size: 14,
        },
        {
          text: '"Wait — you\'re wearing a CAPE? Heroes stopped wearing capes."',
          delay: 2200,
          color: "#ffcc88",
          size: 14,
        },
        {
          text: '"Who does this guy think he is? Dr. Strange? FFS!"',
          delay: 4400,
          color: "#ffcc88",
          size: 14,
        },
      ],
      particles: "embers",
      duration: 7500,
    },
    {
      bg: "boss_lair",
      art: "villain",
      flash: "#ff0000",
      lines: [
        {
          text: '"THIS ISN\'T EVEN MY FINAL FORM."',
          delay: 0,
          color: "#ff2244",
          size: 22,
        },
        {
          text: '"I have THREE. And trust me..."',
          delay: 1800,
          color: "#ff4466",
          size: 16,
        },
        {
          text: '"the bigger they are is NOT how this works."',
          delay: 3400,
          color: "#ff6644",
          size: 15,
        },
      ],
      shake: 3,
      particles: "embers",
      duration: 6500,
    },
    {
      bg: "boss_lair",
      art: "hero_armed",
      flash: "#ff2200",
      lines: [
        {
          text: "Enough talk.",
          delay: 0,
          color: "#00ffcc",
          size: 20,
        },
        { text: "End this. NOW.", delay: 1200, color: "#ffffff", size: 28 },
      ],
      shake: 4,
      duration: 3500,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // FALSE VICTORY — Plays after "defeating" the boss in Level 3
  // The subversion: you think you won... but the Lord was toying with you
  // ═══════════════════════════════════════════════════════════════════
  false_victory: [
    {
      bg: "boss_lair",
      art: "hero_armed",
      flash: "#00ffcc",
      lines: [
        {
          text: "The Paradox Lord crumbles before you.",
          delay: 0,
          color: "#00ffcc",
          size: 20,
        },
        {
          text: "You did it. The timeline is—",
          delay: 2000,
          color: "#aaddff",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 4500,
    },
    {
      bg: "boss_lair",
      flash: "#ff0000",
      shake: 6,
      lines: [
        {
          text: "...wait.",
          delay: 0,
          color: "#ff4444",
          size: 24,
        },
      ],
      duration: 2500,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      flash: "#ff0044",
      shake: 8,
      lines: [
        {
          text: '"Did you really think that was ME?"',
          delay: 0,
          color: "#ff2266",
          size: 20,
        },
        {
          text: '"That was my FIRST form. A shell. A test."',
          delay: 2200,
          color: "#ff4488",
          size: 16,
        },
        {
          text: '"And you barely passed."',
          delay: 4200,
          color: "#ff2244",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: '"You see, little agent, I grow from the BOTTOM UP."',
          delay: 0,
          color: "#ff6688",
          size: 16,
        },
        {
          text: '"While you scramble to understand one piece of the puzzle..."',
          delay: 2400,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: '"I see the ENTIRE board. Every move. Every timeline."',
          delay: 4800,
          color: "#ff4466",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 7500,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      flash: "#ff0088",
      shake: 5,
      lines: [
        {
          text: '"My power level? As your human cartoons say..."',
          delay: 0,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: '"IT\'S OVER NINE THOUSAND."',
          delay: 2000,
          color: "#ff0044",
          size: 28,
        },
        {
          text: '"And this body? THIS ISN\'T EVEN MY FINAL FORM."',
          delay: 4000,
          color: "#ff2266",
          size: 20,
        },
      ],
      shake: 6,
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "dark",
      flash: "#ffffff",
      shake: 10,
      lines: [
        {
          text: "A wave of temporal energy tears through the station.",
          delay: 0,
          color: "#ff8844",
          size: 18,
        },
        {
          text: "Your weapons shatter. Your armor cracks.",
          delay: 2000,
          color: "#ff4444",
          size: 18,
        },
        {
          text: "You are thrown across the room like a ragdoll.",
          delay: 4000,
          color: "#ff2222",
          size: 20,
        },
      ],
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "dark",
      art: "hero_fallen",
      lines: [
        {
          text: "Everything goes dark.",
          delay: 0,
          color: "#445566",
          size: 20,
        },
        {
          text: "You should have brought friends.",
          delay: 2000,
          color: "#667788",
          size: 16,
        },
      ],
      duration: 5000,
    },
    {
      bg: "dark",
      lines: [
        {
          text: "END OF ACT I",
          delay: 0,
          color: "#334455",
          size: 28,
        },
        {
          text: "— THE FALL —",
          delay: 1500,
          color: "#556677",
          size: 18,
        },
      ],
      duration: 4000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT II — THE GATHERING
  // The hero recovers, finds allies, trains together
  // Like Goku gathering the Z-Fighters / Chief rallying Spartans
  // ═══════════════════════════════════════════════════════════════════
  act2_intro: [
    {
      bg: "deep_space",
      lines: [
        {
          text: "ACT II",
          delay: 0,
          color: "#00ccff",
          size: 28,
        },
        {
          text: "— THE GATHERING —",
          delay: 1500,
          color: "#aaddff",
          size: 18,
        },
      ],
      duration: 4000,
    },
    {
      bg: "station",
      art: "hero_fallen",
      lines: [
        {
          text: "Three days later. Chronos Station medbay.",
          delay: 0,
          color: "#8899aa",
          size: 15,
        },
        {
          text: "You wake up. Broken, but alive.",
          delay: 2000,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "The Paradox Lord left you alive on purpose. A message.",
          delay: 4000,
          color: "#ff8844",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 7000,
    },
    {
      bg: "station",
      lines: [
        {
          text: "But others survived the temporal collapse too.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Scattered across the fractured timelines,",
          delay: 1800,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "warriors who refuse to kneel.",
          delay: 3400,
          color: "#00ffcc",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 6000,
    },
    {
      bg: "dark",
      art: "party",
      lines: [
        {
          text: "It's time to assemble a team.",
          delay: 0,
          color: "#00ffcc",
          size: 20,
        },
        {
          text: "Like Goku gathering warriors before the Cell Games...",
          delay: 2000,
          color: "#ffcc44",
          size: 15,
        },
        {
          text: "like Spartans rallying for one last mission...",
          delay: 4000,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "you'll need every last one of them.",
          delay: 6000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 8500,
    },
    {
      bg: "dark",
      art: "party",
      lines: [
        {
          text: "KAEL — The Vanguard. Shield-bearer. Unbreakable will.",
          delay: 0,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "NOVA — The Striker. Speed demon. Hits like a comet.",
          delay: 2000,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "ROOK — The Engineer. Builds turrets. Master of tech.",
          delay: 4000,
          color: "#44ff88",
          size: 15,
        },
        {
          text: "And you. The Temporal Agent. The one who came back.",
          delay: 6000,
          color: "#00ffcc",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 9000,
    },
    {
      bg: "station",
      art: "hero_armed",
      flash: "#00ccff",
      lines: [
        {
          text: "The Lord thinks this story is over.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "He's wrong. This is where it begins.",
          delay: 2000,
          color: "#00ffcc",
          size: 20,
        },
        {
          text: "Train. Grow. Fight together.",
          delay: 4000,
          color: "#ffffff",
          size: 22,
        },
      ],
      particles: "sparks",
      duration: 7000,
    },
  ],

  act2_level2: [
    {
      bg: "station",
      lines: [
        {
          text: "THE PROVING GROUNDS",
          delay: 0,
          color: "#00ccff",
          size: 20,
        },
        {
          text: "Where warriors are forged.",
          delay: 1400,
          color: "#aabbcc",
          size: 16,
        },
      ],
      duration: 3500,
    },
    {
      bg: "station",
      art: "party",
      lines: [
        {
          text: "The team trains relentlessly.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Each pushes beyond their limits — like saiyans before a saga.",
          delay: 2000,
          color: "#ffcc44",
          size: 15,
        },
        {
          text: "Your power grows. But so does HIS.",
          delay: 4000,
          color: "#ff4444",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 6500,
    },
  ],

  act2_level3: [
    {
      bg: "boss_lair",
      lines: [
        {
          text: "THE LORD'S CATHEDRAL",
          delay: 0,
          color: "#ff2244",
          size: 22,
        },
        {
          text: "His temporal fortress, rebuilt and stronger.",
          delay: 1500,
          color: "#cc4466",
          size: 16,
        },
      ],
      particles: "embers",
      shake: 2,
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: '"Oh? You brought FRIENDS this time?"',
          delay: 0,
          color: "#ff4466",
          size: 18,
        },
        {
          text: '"How... adorable."',
          delay: 2000,
          color: "#ff6688",
          size: 16,
        },
        {
          text: '"Like Vegeta teaming up with Kakarot."',
          delay: 3800,
          color: "#ff88aa",
          size: 14,
        },
        {
          text: '"It didn\'t help them either."',
          delay: 5600,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 7500,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      flash: "#ff0088",
      lines: [
        {
          text: '"Let me show you what FORM TWO looks like."',
          delay: 0,
          color: "#ff2266",
          size: 18,
        },
        {
          text: '"I\'ve absorbed the power of a thousand timelines."',
          delay: 2200,
          color: "#ff4488",
          size: 16,
        },
        {
          text: '"Each one a world I conquered. Each one... FUEL."',
          delay: 4400,
          color: "#ff0044",
          size: 18,
        },
      ],
      shake: 4,
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "boss_lair",
      art: "hero_armed",
      flash: "#00ffcc",
      lines: [
        {
          text: "We're not the same fighters you beat before.",
          delay: 0,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "WE trained too.",
          delay: 1800,
          color: "#ffffff",
          size: 22,
        },
        {
          text: "Let's GO!",
          delay: 3200,
          color: "#ffcc00",
          size: 26,
        },
      ],
      shake: 4,
      duration: 5000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT II VICTORY — Beat Form 2, but the Lord transforms AGAIN
  // ═══════════════════════════════════════════════════════════════════
  act2_victory: [
    {
      bg: "boss_lair",
      flash: "#00ffcc",
      lines: [
        {
          text: "Form Two crumbles. The Lord staggers.",
          delay: 0,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "For the first time... he looks hurt.",
          delay: 2000,
          color: "#aaddff",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 5000,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: '"...impressive. You actually damaged this form."',
          delay: 0,
          color: "#ff6688",
          size: 16,
        },
        {
          text: '"No one has done that across any timeline."',
          delay: 2500,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: '"Perhaps... perhaps you deserve to see IT."',
          delay: 5000,
          color: "#ff2244",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 8000,
    },
    {
      bg: "boss_lair",
      flash: "#ffffff",
      shake: 10,
      lines: [
        {
          text: '"Like Cell reaching his Perfect Form..."',
          delay: 0,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: '"Like Frieza... I have ASCENDED."',
          delay: 2500,
          color: "#ff4488",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 5500,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      flash: "#ff0000",
      shake: 12,
      lines: [
        {
          text: '"THIS... IS MY FINAL FORM."',
          delay: 0,
          color: "#ff0044",
          size: 28,
        },
        {
          text: '"I am no longer bound by time."',
          delay: 2500,
          color: "#ff2266",
          size: 18,
        },
        {
          text: '"I AM time."',
          delay: 4500,
          color: "#ffffff",
          size: 24,
        },
      ],
      shake: 8,
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "dark",
      lines: [
        {
          text: "A power beyond comprehension fills the chamber.",
          delay: 0,
          color: "#ff8844",
          size: 16,
        },
        {
          text: "The station shakes. Reality itself bends.",
          delay: 2000,
          color: "#ff6644",
          size: 16,
        },
        {
          text: "This is the fight that will decide everything.",
          delay: 4000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "dark",
      lines: [
        {
          text: "END OF ACT II",
          delay: 0,
          color: "#334455",
          size: 28,
        },
        {
          text: "— THE GATHERING —",
          delay: 1500,
          color: "#556677",
          size: 18,
        },
      ],
      duration: 4000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT III — THE FINAL STAND
  // All-out war against the Final Form
  // One Punch Man energy — sometimes one hero makes the difference
  // ═══════════════════════════════════════════════════════════════════
  act3_intro: [
    {
      bg: "deep_space",
      lines: [
        {
          text: "ACT III",
          delay: 0,
          color: "#ff2244",
          size: 28,
        },
        {
          text: "— THE FINAL STAND —",
          delay: 1500,
          color: "#ff8866",
          size: 18,
        },
      ],
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      lines: [
        {
          text: "The Paradox Lord, Final Form.",
          delay: 0,
          color: "#ff4466",
          size: 18,
        },
        {
          text: "He dismantled entire civilizations in this state.",
          delay: 2000,
          color: "#ff6688",
          size: 15,
        },
        {
          text: "Not with brute force — with perfect knowledge.",
          delay: 4000,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "He sees every punch before it's thrown.",
          delay: 6000,
          color: "#ff2244",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 8500,
    },
    {
      bg: "station",
      art: "party",
      lines: [
        {
          text: "Kael's shield is cracked. Nova is limping.",
          delay: 0,
          color: "#8899aa",
          size: 15,
        },
        {
          text: "Rook's turrets are slag. But they're still standing.",
          delay: 2000,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "And you...you remember what Saitama taught us.",
          delay: 4000,
          color: "#ffcc44",
          size: 16,
        },
        {
          text: "Sometimes, one serious punch is all it takes.",
          delay: 6000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 8500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#00ffcc",
      lines: [
        {
          text: "He sees the whole puzzle? Good.",
          delay: 0,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "We'll give him a piece he's never seen before.",
          delay: 2000,
          color: "#ffffff",
          size: 18,
        },
        {
          text: "THIS ENDS NOW.",
          delay: 4000,
          color: "#ffcc00",
          size: 28,
        },
      ],
      shake: 4,
      particles: "embers",
      duration: 7000,
    },
  ],

  act3_level2: [
    {
      bg: "boss_lair",
      lines: [
        {
          text: "THE TEMPORAL THRONE",
          delay: 0,
          color: "#ff2244",
          size: 22,
        },
        {
          text: "Where time itself kneels.",
          delay: 1400,
          color: "#cc4466",
          size: 16,
        },
      ],
      particles: "embers",
      shake: 2,
      duration: 3500,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      lines: [
        {
          text: '"You keep coming back. Like a cockroach."',
          delay: 0,
          color: "#ff4466",
          size: 16,
        },
        {
          text: '"In every timeline, I kill you. In every future, you fall."',
          delay: 2400,
          color: "#ff6688",
          size: 15,
        },
        {
          text: '"Why do you persist?"',
          delay: 4800,
          color: "#ff2244",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 7000,
    },
  ],

  act3_boss: [
    {
      bg: "boss_lair",
      art: "villain_final",
      shake: 3,
      lines: [
        {
          text: "THE PARADOX CORE — TRUE HEART",
          delay: 0,
          color: "#ff0044",
          size: 22,
        },
        {
          text: "The Final Form awaits.",
          delay: 1500,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      lines: [
        {
          text: '"This is not a battle you can win, Agent."',
          delay: 0,
          color: "#ff4466",
          size: 16,
        },
        {
          text: '"I have watched you train. I know your limits."',
          delay: 2200,
          color: "#ff6688",
          size: 15,
        },
        {
          text: '"I know how this ends. I always do."',
          delay: 4400,
          color: "#ff2244",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "boss_lair",
      art: "hero_armed",
      flash: "#00ffcc",
      shake: 5,
      lines: [
        {
          text: "Then you know we're not stopping.",
          delay: 0,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "Not until every clock in this station reads ZERO.",
          delay: 2200,
          color: "#ffffff",
          size: 18,
        },
        {
          text: "FOR THE TIMELINE!",
          delay: 4000,
          color: "#ffcc00",
          size: 26,
        },
      ],
      shake: 6,
      particles: "embers",
      duration: 6500,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // TRUE VICTORY — After defeating the Final Form for real
  // ═══════════════════════════════════════════════════════════════════
  true_victory: [
    {
      bg: "boss_lair",
      flash: "#ffffff",
      shake: 10,
      lines: [
        {
          text: "The Final Form shatters.",
          delay: 0,
          color: "#ffffff",
          size: 22,
        },
        {
          text: "Reality screams as the Paradox Lord unravels.",
          delay: 2000,
          color: "#ff8844",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 5500,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      lines: [
        {
          text: '"Im...possible. I saw every timeline."',
          delay: 0,
          color: "#ff6688",
          size: 16,
        },
        {
          text: '"Every outcome led to my victory."',
          delay: 2500,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: '"How... did you create a future I couldn\'t see?"',
          delay: 5000,
          color: "#cc4466",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 8000,
    },
    {
      bg: "dark",
      art: "party",
      lines: [
        {
          text: "Because you saw the puzzle from the top.",
          delay: 0,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "We built ours from the bottom up.",
          delay: 2000,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "Piece by piece. Bond by bond.",
          delay: 4000,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "You can't predict what people do for each other.",
          delay: 6000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 9000,
    },
    {
      bg: "deep_space",
      lines: [
        {
          text: "The Chronos Engine stabilizes.",
          delay: 0,
          color: "#00ccff",
          size: 18,
        },
        {
          text: "Timelines separate. Reality heals.",
          delay: 2000,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "The world doesn't end today.",
          delay: 4000,
          color: "#00ffcc",
          size: 20,
        },
      ],
      particles: "stars",
      duration: 7000,
    },
    {
      bg: "deep_space",
      art: "party",
      lines: [
        {
          text: "Kael. Nova. Rook. You.",
          delay: 0,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "Temporal Agents. The ones who stayed.",
          delay: 2000,
          color: "#00ccff",
          size: 18,
        },
        {
          text: "The ones who fought.",
          delay: 3800,
          color: "#00ffcc",
          size: 20,
        },
        {
          text: "The ones who WON.",
          delay: 5500,
          color: "#ffcc00",
          size: 24,
        },
      ],
      particles: "glow",
      duration: 8000,
    },
    {
      bg: "dark",
      lines: [
        {
          text: "TIMELINE RESTORED",
          delay: 0,
          color: "#00ffcc",
          size: 28,
        },
        {
          text: "— FIN —",
          delay: 2000,
          color: "#ffffff",
          size: 22,
        },
      ],
      duration: 5000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // CLOCKING IN — Post-tutorial pre-campaign origin story
  // A cop. A nobody. Just another shift... until it wasn't.
  // ═══════════════════════════════════════════════════════════════════

  // ── Comic Book Origin Panels ──────────────────────────────────────
  // Plays after tutorial — the hero's journey in panels
  origin_panels: [
    {
      // Page 1: The mundane life
      bg: "dark",
      panels: [
        {
          x: 0,
          y: 0,
          w: 0.55,
          h: 0.5,
          bg: "station",
          art: "station",
          caption: "Chronos Station. 06:47 AM. Another day.",
          captionPos: "top",
          captionColor: "#8899aa",
          captionSize: 11,
          halftone: 0.15,
        },
        {
          x: 0.55,
          y: 0,
          w: 0.45,
          h: 0.3,
          bg: "dark",
          art: "hero",
          caption: "Badge 2187. Just a beat cop.",
          captionPos: "bottom",
          captionColor: "#00ccff",
          captionSize: 11,
        },
        {
          x: 0.55,
          y: 0.3,
          w: 0.45,
          h: 0.2,
          caption: "Nobody special. Nobody watching.",
          captionPos: "center",
          captionColor: "#556677",
          captionBg: "rgba(5,5,15,0.95)",
          captionSize: 13,
        },
        {
          x: 0,
          y: 0.5,
          w: 1.0,
          h: 0.5,
          bg: "station",
          art: "hero",
          caption: "You show up. Clock in. Do the work. Go home. Repeat.",
          captionPos: "bottom",
          captionColor: "#aabbcc",
          captionSize: 12,
          halftone: 0.1,
        },
      ],
      duration: 8000,
    },
    {
      // Page 2: The fracture
      bg: "dark",
      panels: [
        {
          x: 0,
          y: 0,
          w: 1.0,
          h: 0.35,
          bg: "deep_space",
          art: "rift",
          caption: "Then the sky broke.",
          captionPos: "top",
          captionColor: "#ff4444",
          captionSize: 14,
          action: true,
          sfx: "KRAA-KOOM",
          sfxColor: "#ff4444",
          sfxSize: 32,
          sfxX: 0.75,
          sfxY: 0.4,
          sfxRot: -12,
        },
        {
          x: 0,
          y: 0.35,
          w: 0.5,
          h: 0.35,
          bg: "station",
          caption: "Reality folded. Time collapsed.",
          captionPos: "center",
          captionColor: "#ff8844",
          captionBg: "rgba(20,5,5,0.9)",
          captionSize: 12,
          halftone: 0.2,
        },
        {
          x: 0.5,
          y: 0.35,
          w: 0.5,
          h: 0.35,
          bg: "dark",
          art: "villain",
          caption: "Something came through.",
          captionPos: "bottom",
          captionColor: "#ff0066",
          captionSize: 12,
          action: true,
        },
        {
          x: 0,
          y: 0.7,
          w: 1.0,
          h: 0.3,
          caption: "The Paradox Lord. Ancient. Patient. Hungry.",
          captionPos: "center",
          captionColor: "#ff2244",
          captionBg: "rgba(10,0,5,0.95)",
          captionSize: 15,
        },
      ],
      duration: 9000,
    },
    {
      // Page 3: Everyone falls
      bg: "dark",
      panels: [
        {
          x: 0,
          y: 0,
          w: 0.5,
          h: 0.45,
          bg: "station",
          caption: "Most people ran.",
          captionPos: "top",
          captionColor: "#8899aa",
          captionSize: 13,
          halftone: 0.2,
        },
        {
          x: 0.5,
          y: 0,
          w: 0.5,
          h: 0.45,
          bg: "dark",
          caption: "Command went dark. Comms — static.",
          captionPos: "center",
          captionColor: "#556677",
          captionBg: "rgba(5,5,15,0.95)",
          captionSize: 12,
        },
        {
          x: 0,
          y: 0.45,
          w: 0.65,
          h: 0.55,
          bg: "dark",
          art: "hero",
          caption: "You didn't run.",
          captionPos: "bottom",
          captionColor: "#00ffcc",
          captionSize: 14,
        },
        {
          x: 0.65,
          y: 0.45,
          w: 0.35,
          h: 0.55,
          caption:
            "Not because you're brave. Because you're too stubborn to die.",
          captionPos: "center",
          captionColor: "#00ccff",
          captionBg: "rgba(0,10,20,0.95)",
          captionSize: 11,
        },
      ],
      duration: 8000,
    },
    {
      // Page 4: Suiting up - THE moment
      bg: "dark",
      panels: [
        {
          x: 0,
          y: 0,
          w: 0.4,
          h: 0.4,
          bg: "station",
          caption: "The locker. One last time.",
          captionPos: "top",
          captionColor: "#8899aa",
          captionSize: 11,
        },
        {
          x: 0.4,
          y: 0,
          w: 0.6,
          h: 0.4,
          bg: "dark",
          art: "hero_armed",
          caption: "Temporal Combat Armor. Prototype 7.",
          captionPos: "bottom",
          captionColor: "#00ccff",
          captionSize: 12,
          sfx: "KLANK",
          sfxColor: "#00ccff",
          sfxSize: 22,
          sfxX: 0.2,
          sfxY: 0.3,
          sfxRot: 8,
        },
        {
          x: 0,
          y: 0.4,
          w: 1.0,
          h: 0.35,
          bg: "dark",
          art: "hero_armed",
          action: true,
          caption: "Helmet on. Visor down. Rifle loaded.",
          captionPos: "bottom",
          captionColor: "#00ffcc",
          captionSize: 14,
          sfx: "CHKK-CHKK",
          sfxColor: "#00ffcc",
          sfxSize: 24,
          sfxX: 0.8,
          sfxY: 0.25,
          sfxRot: -6,
        },
        {
          x: 0,
          y: 0.75,
          w: 1.0,
          h: 0.25,
          caption: '"I\'M NOT GOING DOWN WITHOUT A FIGHT."',
          captionPos: "center",
          captionColor: "#ffcc00",
          captionBg: "rgba(0,0,0,0.95)",
          captionSize: 18,
        },
      ],
      duration: 9000,
    },
  ],

  clocking_in: [
    {
      bg: "station",
      lines: [
        { text: "06:47 AM.", delay: 0, color: "#556677", size: 14 },
        {
          text: "Same precinct. Same locker. Same coffee.",
          delay: 1200,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "You've done this a thousand times.",
          delay: 3000,
          color: "#aabbcc",
          size: 16,
        },
      ],
      art: "station",
      particles: "sparks",
      duration: 5500,
    },
    {
      bg: "dark",
      art: "hero",
      lines: [
        {
          text: "Badge number 2187. Officer on duty.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "They don't pay you enough for this.",
          delay: 1800,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "But you show up. Every. Single. Day.",
          delay: 3600,
          color: "#00ccff",
          size: 18,
        },
      ],
      duration: 6000,
    },
    {
      bg: "dark",
      art: "hero",
      lines: [
        {
          text: "Some people are born heroes.",
          delay: 0,
          color: "#556677",
          size: 16,
        },
        {
          text: "You weren't.",
          delay: 1500,
          color: "#aabbcc",
          size: 18,
        },
        {
          text: "You were just the guy who didn't quit.",
          delay: 3200,
          color: "#00ffcc",
          size: 20,
        },
      ],
      duration: 5500,
    },
    {
      bg: "station",
      lines: [
        {
          text: "Then the sky cracked open.",
          delay: 0,
          color: "#ff6644",
          size: 18,
        },
        {
          text: "Time folded in on itself like wet paper.",
          delay: 1800,
          color: "#ff4444",
          size: 18,
        },
        {
          text: "And everything you knew... stopped making sense.",
          delay: 3800,
          color: "#ff2244",
          size: 20,
        },
      ],
      art: "rift",
      particles: "embers",
      shake: 3,
      duration: 6500,
    },
    {
      bg: "dark",
      art: "hero",
      lines: [
        {
          text: "The others ran.",
          delay: 0,
          color: "#556677",
          size: 16,
        },
        {
          text: "Command went silent.",
          delay: 1200,
          color: "#778899",
          size: 16,
        },
        {
          text: "The precinct was overrun in minutes.",
          delay: 2800,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "You just stood there.",
          delay: 4500,
          color: "#ffffff",
          size: 18,
        },
      ],
      duration: 6500,
    },
    {
      bg: "dark",
      art: "hero",
      lines: [
        {
          text: "Not because you were brave.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Because you were too stubborn to die.",
          delay: 2000,
          color: "#00ccff",
          size: 20,
        },
      ],
      duration: 5000,
    },
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        {
          text: "You opened your locker one last time.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Pulled out the gear they told you you'd never need.",
          delay: 2000,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Temporal Combat Armor. Experimental prototype.",
          delay: 4200,
          color: "#00ccff",
          size: 18,
        },
      ],
      particles: "sparks",
      duration: 7000,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#00ccff",
      lines: [
        {
          text: "Helmet on. Visor down. Rifle loaded.",
          delay: 0,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "You looked at the door.",
          delay: 2000,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Behind it — every nightmare that ever existed.",
          delay: 3800,
          color: "#ff4444",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 6500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#ffffff",
      shake: 2,
      lines: [
        {
          text: "You kicked it open.",
          delay: 0,
          color: "#ffffff",
          size: 22,
        },
        {
          text: '"I\'M NOT GOING DOWN WITHOUT A FIGHT."',
          delay: 2000,
          color: "#ffcc00",
          size: 26,
        },
      ],
      particles: "glow",
      duration: 5500,
    },
  ],
};

export const WALL_COLORS = {
  1: { r: 80, g: 80, b: 100 }, // Stone - blue-grey
  2: { r: 40, g: 80, b: 120 }, // Tech - dark blue
  3: { r: 100, g: 100, b: 110 }, // Metal - silver
  4: { r: 60, g: 20, b: 120 }, // Energy - purple
  5: { r: 120, g: 80, b: 30 }, // Door - bronze
  6: { r: 78, g: 78, b: 98 }, // Secret - looks like stone
  7: { r: 30, g: 10, b: 60 }, // Boss - dark purple
  8: { r: 100, g: 140, b: 160 }, // Glass - light blue
  9: { r: 20, g: 60, b: 80 }, // Temporal rift
};

// Entity types for map placement
// E = enemy spawn, P = player start, H = health, A = ammo, W = weapon pickup
// K = key, S = secret trigger, D = door trigger, B = boss, X = exit

// TODO: Add additional variety to Arena map... procedurally generate or randomize, otherwise it gets repetitive

export const TUTORIAL_MAP = {
  name: "Temporal Calibration Chamber",
  width: 16,
  height: 16,
  grid: [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  ],
  playerStart: { x: 3.5, y: 3.5, dir: 0 },
  pickups: [
    { x: 12.5, y: 4.5, type: "health" },
    { x: 12.5, y: 6.5, type: "ammo" },
    { x: 8.5, y: 12.5, type: "health" },
  ],
};

export const ARENA_MAP = {
  name: "Temporal Arena",
  width: 24,
  height: 24,
  grid: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
  playerStart: { x: 12.5, y: 12.5, dir: 0 },
  enemySpawns: [
    { x: 1.5, y: 1.5 },
    { x: 22.5, y: 1.5 },
    { x: 1.5, y: 22.5 },
    { x: 22.5, y: 22.5 },
    { x: 12.5, y: 2.5 },
    { x: 12.5, y: 21.5 },
    { x: 2.5, y: 12.5 },
    { x: 21.5, y: 12.5 },
    { x: 6.5, y: 1.5 },
    { x: 17.5, y: 1.5 },
    { x: 6.5, y: 22.5 },
    { x: 17.5, y: 22.5 },
    { x: 10.5, y: 6.5 },
    { x: 13.5, y: 6.5 },
    { x: 10.5, y: 17.5 },
    { x: 13.5, y: 17.5 },
  ],
  pickups: [
    { x: 12, y: 7, type: "health" },
    { x: 12, y: 17, type: "health" },
    { x: 7, y: 12, type: "ammo" },
    { x: 17, y: 12, type: "ammo" },
    { x: 5, y: 5, type: "weapon", weaponId: 1 },
  ],
};

// TODO: Add more campaign levels with different themes, layouts, and enemy types
// TODO: Possibly extract per level
export const CAMPAIGN_LEVELS = [
  {
    name: "Chronos Station - Entry",
    width: 32,
    height: 32,
    grid: [
      [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 2, 2, 0,
        0, 0, 2, 2, 2, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 0, 2, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 5, 1, 1, 0, 0, 1, 1, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 0, 2, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 5, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 5, 1, 1, 0, 0, 0, 0, 0, 4,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 0, 2, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 2, 2, 0,
        0, 0, 2, 2, 2, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 1, 1, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
        1, 5, 1, 1, 1, 1, 1, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0,
        0, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0,
        0, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 5, 3, 3, 0, 0, 0, 0, 3, 0, 0,
        0, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0,
        0, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 1, 6, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3,
        3, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
      ],
    ],
    playerStart: { x: 2.5, y: 2.5, dir: 0 },
    entities: [
      { x: 10.5, y: 3.5, type: "enemy", enemyType: "drone" },
      { x: 14.5, y: 3.5, type: "enemy", enemyType: "glitchling" },
      { x: 5.5, y: 10.5, type: "enemy", enemyType: "corruptCop" },
      { x: 10.5, y: 9.5, type: "enemy", enemyType: "drone" },
      { x: 22.5, y: 6.5, type: "enemy", enemyType: "sentinel" },
      { x: 25.5, y: 2.5, type: "enemy", enemyType: "phantom" },
      { x: 14.5, y: 16.5, type: "enemy", enemyType: "glitchling" },
      { x: 23.5, y: 18.5, type: "enemy", enemyType: "phantom" },
      { x: 5.5, y: 20.5, type: "enemy", enemyType: "beast" },
      { x: 28.5, y: 15.5, type: "enemy", enemyType: "corruptCop" },
      { x: 20.5, y: 21.5, type: "enemy", enemyType: "drone" },
      { x: 5.5, y: 29.5, type: "enemy", enemyType: "phantom" },
      { x: 15.5, y: 29.5, type: "enemy", enemyType: "glitchling" },
      // Pickups
      { x: 2.5, y: 15.5, type: "health" },
      { x: 10.5, y: 7.5, type: "ammo" },
      { x: 22.5, y: 10.5, type: "health" },
      { x: 28.5, y: 6.5, type: "ammo" },
      { x: 14.5, y: 14.5, type: "ammo" },
      { x: 23.5, y: 22.5, type: "health" },
      { x: 10.5, y: 29.5, type: "ammo" },
      // Weapon pickup
      { x: 14.5, y: 8.5, type: "weapon", weaponId: 1 },
      // Secrets
      { x: 2.5, y: 25.5, type: "health" }, // in secret room
      { x: 2.5, y: 24.5, type: "ammo" },
    ],
    exit: { x: 29.5, y: 29.5 },
    secrets: [
      { wallX: 6, wallY: 13, description: "Hidden supply cache" },
      { wallX: 5, wallY: 23, description: "Secret armory" },
    ],
  },
  {
    name: "Temporal Nexus",
    width: 28,
    height: 28,
    grid: [
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4, 4, 0, 0, 4, 4, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 2, 2, 5, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5,
        2, 2, 2, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9, 5, 9, 9, 9, 9, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 4, 4, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 4, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 4,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 4, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 4,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 4, 4, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 9, 9, 9, 9, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 2, 2, 5, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5,
        2, 2, 2, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4, 4, 0, 0, 4, 4, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
    ],
    playerStart: { x: 3.5, y: 2.5, dir: 0 },
    entities: [
      { x: 14.5, y: 5.5, type: "enemy", enemyType: "phantom" },
      { x: 5.5, y: 9.5, type: "enemy", enemyType: "corruptCop" },
      { x: 22.5, y: 9.5, type: "enemy", enemyType: "sentinel" },
      { x: 8.5, y: 14.5, type: "enemy", enemyType: "phantom" },
      { x: 19.5, y: 14.5, type: "enemy", enemyType: "phantom" },
      { x: 5.5, y: 18.5, type: "enemy", enemyType: "glitchling" },
      { x: 22.5, y: 18.5, type: "enemy", enemyType: "beast" },
      { x: 14.5, y: 22.5, type: "enemy", enemyType: "phantom" },
      { x: 3.5, y: 22.5, type: "enemy", enemyType: "beast" },
      { x: 24.5, y: 22.5, type: "enemy", enemyType: "beast" },
      { x: 14.5, y: 1.5, type: "enemy", enemyType: "glitchling" },
      { x: 14.5, y: 26.5, type: "enemy", enemyType: "corruptCop" },
      // Pickups
      { x: 14, y: 13.5, type: "health" },
      { x: 14, y: 14.5, type: "ammo" },
      { x: 2.5, y: 9.5, type: "health" },
      { x: 25.5, y: 9.5, type: "ammo" },
      { x: 2.5, y: 18.5, type: "ammo" },
      { x: 25.5, y: 18.5, type: "health" },
      { x: 24.5, y: 2.5, type: "weapon", weaponId: 2 },
    ],
    exit: { x: 24.5, y: 25.5 },
    secrets: [],
  },
  {
    name: "The Paradox Core",
    width: 32,
    height: 32,
    grid: [
      [
        7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        5, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 7, 7, 5, 7, 7, 7, 7, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0,
        7, 7, 7, 5, 7, 7, 7, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        9, 9, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 5, 4, 4, 4, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 7, 7,
      ],
      [
        7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 7, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 5, 4, 4, 4, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        9, 9, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 7, 7, 5, 7, 7, 7, 7, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0,
        7, 7, 7, 5, 7, 7, 7, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        5, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
      ],
    ],
    playerStart: { x: 3.5, y: 2.5, dir: 0 },
    entities: [
      // Boss in the center
      { x: 15.5, y: 15.5, type: "enemy", enemyType: "boss" },
      // Guards
      { x: 8.5, y: 8.5, type: "enemy", enemyType: "beast" },
      { x: 22.5, y: 8.5, type: "enemy", enemyType: "sentinel" },
      { x: 8.5, y: 22.5, type: "enemy", enemyType: "sentinel" },
      { x: 22.5, y: 22.5, type: "enemy", enemyType: "beast" },
      { x: 15.5, y: 8.5, type: "enemy", enemyType: "phantom" },
      { x: 15.5, y: 22.5, type: "enemy", enemyType: "phantom" },
      { x: 8.5, y: 15.5, type: "enemy", enemyType: "corruptCop" },
      { x: 22.5, y: 15.5, type: "enemy", enemyType: "corruptCop" },
      { x: 3.5, y: 9.5, type: "enemy", enemyType: "glitchling" },
      { x: 28.5, y: 9.5, type: "enemy", enemyType: "glitchling" },
      { x: 3.5, y: 22.5, type: "enemy", enemyType: "drone" },
      { x: 28.5, y: 22.5, type: "enemy", enemyType: "drone" },
      // Pickups
      { x: 3.5, y: 29.5, type: "health" },
      { x: 28.5, y: 29.5, type: "health" },
      { x: 3.5, y: 15.5, type: "ammo" },
      { x: 28.5, y: 15.5, type: "ammo" },
      { x: 15.5, y: 3.5, type: "health" },
      { x: 28.5, y: 2.5, type: "health" },
      { x: 3.5, y: 28.5, type: "ammo" },
      { x: 28.5, y: 28.5, type: "ammo" },
      { x: 15.5, y: 28.5, type: "weapon", weaponId: 3 },
    ],
    exit: null, // Boss level - beat boss to win
    isBossLevel: true,
    secrets: [],
  },
];

// Weapon definitions
// TODO: Add more weapons with unique mechanics (e.g. grenades, beam weapons, etc.)
export const WEAPONS = [
  {
    id: 0,
    name: "Chrono Pistol",
    damage: 15,
    fireRate: 300, // ms between shots
    ammoPerShot: 1,
    maxAmmo: 999,
    spread: 0.02,
    range: 50,
    type: "hitscan",
    color: "#00ffcc",
    description: "Standard issue temporal sidearm",
  },
  {
    id: 1,
    name: "Temporal Shotgun",
    damage: 8,
    pellets: 6,
    fireRate: 600,
    ammoPerShot: 1,
    maxAmmo: 50,
    spread: 0.08,
    range: 15,
    type: "hitscan",
    color: "#ff8800",
    description: "Scatters temporal fragments",
  },
  {
    id: 2,
    name: "Phase Rifle",
    damage: 40,
    fireRate: 150,
    ammoPerShot: 2,
    maxAmmo: 100,
    spread: 0.01,
    range: 100,
    type: "hitscan",
    color: "#8800ff",
    description: "High-energy phase beam",
  },
  {
    id: 3,
    name: "Quantum Cannon",
    damage: 80,
    fireRate: 1000,
    ammoPerShot: 5,
    maxAmmo: 40,
    spread: 0.0,
    range: 100,
    type: "projectile",
    color: "#ff0044",
    description: "Devastating quantum payload",
  },
];

// Enemy definitions
// TODO: Add more enemy types with unique behaviors (e.g. teleporting, summoning minions, etc.)
// TODO: Add different variants of the same enemy type with different stats /colors unique designs for later levels?
export const ENEMY_TYPES = {
  drone: {
    name: "Glitched Drone",
    health: 30,
    speed: 1.5,
    damage: 8,
    attackRate: 1000,
    attackRange: 8,
    sightRange: 12,
    radius: 0.3,
    score: 100,
    color1: "#00ccff",
    color2: "#004466",
    xp: 10,
    attackType: "ranged",
  },
  phantom: {
    name: "Time Phantom",
    health: 60,
    speed: 2.0,
    damage: 15,
    attackRate: 800,
    attackRange: 10,
    sightRange: 16,
    radius: 0.35,
    score: 250,
    color1: "#cc44ff",
    color2: "#440066",
    xp: 25,
    attackType: "ranged",
  },
  beast: {
    name: "Chrono Beast",
    health: 120,
    speed: 1.2,
    damage: 25,
    attackRate: 1500,
    attackRange: 3,
    sightRange: 14,
    radius: 0.45,
    score: 500,
    color1: "#ff4400",
    color2: "#661100",
    xp: 50,
    attackType: "melee",
  },
  boss: {
    name: "Paradox Lord",
    health: 800,
    speed: 1.0,
    damage: 35,
    attackRate: 600,
    attackRange: 15,
    sightRange: 30,
    radius: 0.6,
    score: 5000,
    color1: "#ff0088",
    color2: "#440022",
    xp: 200,
    attackType: "ranged",
    form: 1,
  },
  boss_form2: {
    name: "Paradox Lord — Evolved",
    health: 1600,
    speed: 1.4,
    damage: 50,
    attackRate: 450,
    attackRange: 18,
    sightRange: 30,
    radius: 0.65,
    score: 10000,
    color1: "#ff0066",
    color2: "#660033",
    xp: 400,
    attackType: "ranged",
    form: 2,
  },
  boss_form3: {
    name: "Paradox Lord — Final Form",
    health: 3000,
    speed: 1.8,
    damage: 70,
    attackRate: 350,
    attackRange: 20,
    sightRange: 30,
    radius: 0.7,
    score: 25000,
    color1: "#ff0044",
    color2: "#880022",
    xp: 1000,
    attackType: "ranged",
    form: 3,
  },
  corruptCop: {
    name: "Corrupt SWAT Officer",
    health: 50,
    speed: 1.8,
    damage: 12,
    attackRate: 900,
    attackRange: 10,
    sightRange: 14,
    radius: 0.3,
    score: 200,
    color1: "#ddaa00",
    color2: "#664400",
    xp: 20,
    attackType: "ranged",
  },
  sentinel: {
    name: "Chrono Sentinel",
    health: 180,
    speed: 0.9,
    damage: 30,
    attackRate: 2000,
    attackRange: 2.5,
    sightRange: 12,
    radius: 0.5,
    score: 600,
    color1: "#88aacc",
    color2: "#334466",
    xp: 60,
    attackType: "melee",
  },
  glitchling: {
    name: "Glitchling",
    health: 18,
    speed: 3.0,
    damage: 6,
    attackRate: 500,
    attackRange: 1.8,
    sightRange: 18,
    radius: 0.2,
    score: 75,
    color1: "#00ff44",
    color2: "#004411",
    xp: 8,
    attackType: "melee",
  },
};

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
    description: "Regenerate 1 HP/sec",
    baseCost: 400,
    costScale: 2.2,
    maxLevel: 5,
    apply: (player) => {
      player.regenRate = (player.regenRate || 0) + 1;
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
    description: "Heal 5% of damage dealt",
    baseCost: 500,
    costScale: 2.2,
    maxLevel: 5,
    apply: (player) => {
      player.lifeSteal = (player.lifeSteal || 0) + 0.05;
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

// ── Achievements ───────────────────────────────────────────────────
export const ACHIEVEMENTS = {
  firstBlood: {
    name: "First Blood",
    description: "Eliminate your first enemy",
    icon: "☠",
    category: "combat",
    check: (stats) => stats.totalKills >= 1,
  },
  droneHunter: {
    name: "Drone Hunter",
    description: "Eliminate 10 enemies",
    icon: "🎯",
    category: "combat",
    check: (stats) => stats.totalKills >= 10,
  },
  phantomSlayer: {
    name: "Phantom Slayer",
    description: "Eliminate 25 enemies",
    icon: "👻",
    category: "combat",
    check: (stats) => stats.totalKills >= 25,
  },
  beastTamer: {
    name: "Beast Tamer",
    description: "Eliminate 50 enemies",
    icon: "🐉",
    category: "combat",
    check: (stats) => stats.totalKills >= 50,
  },
  centurion: {
    name: "Centurion",
    description: "Eliminate 100 enemies",
    icon: "💯",
    category: "combat",
    check: (stats) => stats.totalKills >= 100,
  },
  roundSurvivor: {
    name: "Clockwork Survivor",
    description: "Survive 5 arena rounds",
    icon: "⏱",
    category: "arena",
    check: (stats) => stats.highestArenaRound >= 5,
  },
  roundVeteran: {
    name: "Arena Veteran",
    description: "Survive 10 arena rounds",
    icon: "🏟",
    category: "arena",
    check: (stats) => stats.highestArenaRound >= 10,
  },
  campaignClear: {
    name: "Timeline Restored",
    description: "Complete the campaign",
    icon: "🏆",
    category: "campaign",
    check: (stats) => stats.campaignComplete,
  },
  lordSlayer: {
    name: "Lord Slayer",
    description: "Defeat the Paradox Lord",
    icon: "👑",
    category: "campaign",
    check: (stats) => stats.bossKilled,
  },
  speedDemon: {
    name: "Speed Demon",
    description: "Perform 50 dashes",
    icon: "💨",
    category: "movement",
    check: (stats) => stats.totalDashes >= 50,
  },
  tutorialGrad: {
    name: "Calibrated",
    description: "Complete the tutorial",
    icon: "🎓",
    category: "general",
    check: (stats) => stats.tutorialComplete,
  },
  bigSpender: {
    name: "Big Spender",
    description: "Purchase 10 upgrades",
    icon: "💰",
    category: "arena",
    check: (stats) => stats.upgradesBought >= 10,
  },
  scoreMaster: {
    name: "Score Master",
    description: "Reach a score of 10,000",
    icon: "⭐",
    category: "general",
    check: (stats) => stats.highestScore >= 10000,
  },
  untouchable: {
    name: "Untouchable",
    description: "Complete an arena round without taking damage",
    icon: "🛡",
    category: "arena",
    check: (stats) => stats.flawlessRounds >= 1,
  },
  // Placeholder achievements — more coming soon
  _comingSoon1: {
    name: "???",
    description: "More achievements coming soon...",
    icon: "🔒",
    category: "hidden",
    check: () => false,
  },
  _comingSoon2: {
    name: "???",
    description: "More achievements coming soon...",
    icon: "🔒",
    category: "hidden",
    check: () => false,
  },
  _comingSoon3: {
    name: "???",
    description: "More achievements coming soon...",
    icon: "🔒",
    category: "hidden",
    check: () => false,
  },
};
