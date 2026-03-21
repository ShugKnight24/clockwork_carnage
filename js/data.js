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
        { text: "THE YEAR IS 2181.", delay: 0, color: "#556677", size: 14 },
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
          text: "You are {AGENT} — the last Temporal Agent.",
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
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "A whisper in the back of your mind. ARIA.",
          delay: 0,
          color: "#8899aa",
          size: 15,
        },
        {
          text: '"I\'m reading temporal fluctuations off the charts in there."',
          delay: 2000,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: '"Try not to die. I\'m starting to like having someone to talk to."',
          delay: 4200,
          color: "#00ffdd",
          size: 14,
        },
      ],
      duration: 6500,
    },
  ],

  coming_soon: [
    {
      bg: "dark",
      lines: [
        {
          text: "The Paradox Lord retreats into the fracture.",
          delay: 0,
          color: "#ff4466",
          size: 18,
        },
        {
          text: "But the timeline is still splintering.",
          delay: 2000,
          color: "#cc4466",
          size: 16,
        },
        {
          text: "This isn't over.",
          delay: 4000,
          color: "#8899aa",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "dark",
      lines: [
        {
          text: "EPISODE 1 — THE ALPHA PROTOCOL",
          delay: 0,
          color: "#00ffcc",
          size: 24,
        },
        {
          text: "COMPLETE",
          delay: 1500,
          color: "#00ffcc",
          size: 32,
        },
        {
          text: "To be continued...",
          delay: 3500,
          color: "#556677",
          size: 16,
        },
        {
          text: "Thank you for playing.",
          delay: 5000,
          color: "#8899aa",
          size: 14,
        },
      ],
      duration: 8000,
    },
  ],

  // ── Memory Fragment: Quick team intro when player wakes ─────────────
  intro_memory_01: [
    {
      bg: "dark",
      flash: "#001122",
      lines: [
        {
          text: "SYSTEMS: Rebooting...",
          delay: 0,
          color: "#8899aa",
          size: 14,
        },
      ],
      particles: "glow",
      duration: 1400,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: You're back online. Welcome back.",
          delay: 0,
          color: "#00ffdd",
          size: 18,
        },
        {
          text: "I patched what I could. Vital signs are stable.",
          delay: 1600,
          color: "#88ccff",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 3200,
    },
    {
      bg: "station",
      art: "portrait_voss",
      lines: [
        {
          text: "VOSS: Tactician — sharp tongue, sharper plans.",
          delay: 0,
          color: "#00ccff",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 1400,
    },
    {
      bg: "station",
      art: "portrait_miri",
      lines: [
        {
          text: "MIRI: Medic — keeps us breathing. Don't test her patience.",
          delay: 0,
          color: "#aaffcc",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 1400,
    },
    {
      bg: "station",
      art: "portrait_kai",
      lines: [
        {
          text: "KAI: Engineer — if it's broken, he made it. Then he swore.",
          delay: 0,
          color: "#ffcc88",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 1400,
    },
    {
      bg: "dark",
      lines: [
        {
          text: "ARIA: You don't remember everything. That's expected.",
          delay: 0,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: "Press ENTER to continue — or any key to skip.",
          delay: 1800,
          color: "#8899aa",
          size: 14,
        },
      ],
      particles: "stars",
      duration: 0,
    },
  ],

  // Extended memory fragment (longer bios + ARIA diagnostic)
  intro_memory_01_extended: [
    {
      bg: "dark",
      flash: "#001122",
      lines: [
        { text: "SYSTEMS: Rebooting...", delay: 0, color: "#8899aa", size: 14 },
      ],
      particles: "glow",
      duration: 1200,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        { text: "ARIA: Welcome back. I've stabilised your vitals.", delay: 0, color: "#00ffdd", size: 18 },
        { text: "There's a lot to catch up on. I'll be concise.", delay: 1600, color: "#88ccff", size: 15 },
      ],
      particles: "glow",
      duration: 3200,
    },
    {
      bg: "station",
      art: "portrait_voss",
      lines: [
        { text: "VOSS — Tactician: Keeps us two steps ahead and three steps sarcastic.", delay: 0, color: "#00ccff", size: 16 },
      ],
      particles: "sparks",
      duration: 1600,
    },
    {
      bg: "station",
      art: "portrait_miri",
      lines: [
        { text: "MIRI — Medic: She'll heal you and tell you off in the same breath.", delay: 0, color: "#aaffcc", size: 16 },
      ],
      particles: "sparks",
      duration: 1600,
    },
    {
      bg: "station",
      art: "portrait_kai",
      lines: [
        { text: "KAI — Engineer: Makes guns sing and clocks behave. Mostly.", delay: 0, color: "#ffcc88", size: 16 },
      ],
      particles: "sparks",
      duration: 1600,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        { text: "ARIA: HUD diagnostics: HEALTH 85% — CHRONO 42% — SHIELD offline.", delay: 0, color: "#00ffdd", size: 14 },
        { text: "Press ENTER to continue, or ESC to skip onboarding.", delay: 1600, color: "#8899aa", size: 14 },
      ],
      particles: "stars",
      duration: 0,
    },
  ],

  // Spanish localized variant (short)
  intro_memory_01_es: [
    { bg: "dark", flash: "#001122", lines: [ { text: "SISTEMA: Reiniciando...", delay: 0, color: "#8899aa", size: 14 } ], particles: "glow", duration: 1200 },
    { bg: "dark", art: "aria", lines: [ { text: "ARIA: Estás de vuelta. Bienvenido de nuevo.", delay: 0, color: "#00ffdd", size: 18 } ], particles: "glow", duration: 2200 },
    { bg: "station", art: "portrait_miri", lines: [ { text: "MIRI: Médica — te mantendré respirando.", delay: 0, color: "#aaffcc", size: 16 } ], particles: "sparks", duration: 1400 },
    { bg: "dark", lines: [ { text: "ARIA: Pulsa ENTER para continuar o cualquier tecla para omitir.", delay: 0, color: "#8899aa", size: 14 } ], particles: "stars", duration: 0 }
  ],

  // ── New Level Transition Briefings (Dr. Voss narrative) ──────────

  security_briefing: [
    {
      bg: "station",
      lines: [
        {
          text: "CHRONOS STATION — SECURITY WING",
          delay: 0,
          color: "#00ccff",
          size: 20,
        },
        {
          text: "Security Checkpoint",
          delay: 1200,
          color: "#ffffff",
          size: 16,
        },
      ],
      duration: 3500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: '"Security wing ahead. These officers were supposed to protect the station."',
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Now they're just protecting... whatever's left.\"",
          delay: 2200,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: '"Stay alert. They know the layout better than we do."',
          delay: 4200,
          color: "#ffcc00",
          size: 16,
        },
      ],
      duration: 6500,
    },
  ],

  research_briefing: [
    {
      bg: "station",
      lines: [
        {
          text: "CHRONOS STATION — RESEARCH DIVISION",
          delay: 0,
          color: "#00ccff",
          size: 20,
        },
        { text: "Research Wing", delay: 1200, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: '"Research wing. Whatever they were studying here..."',
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: '"The glass walls are shattered. Something phased through them."',
          delay: 2200,
          color: "#ff8844",
          size: 15,
        },
        {
          text: '"I\'m detecting phantom signatures. Enemies that can pass through walls."',
          delay: 4400,
          color: "#ffcc00",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 7000,
    },
  ],

  containment_briefing: [
    {
      bg: "dark",
      lines: [
        {
          text: "CHRONOS STATION — DETENTION LEVEL",
          delay: 0,
          color: "#00ccff",
          size: 20,
        },
        { text: "Containment Block", delay: 1200, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "dark",
      lines: [
        {
          text: "The cells are open. The prisoners are long gone.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "But something else moved in.",
          delay: 2000,
          color: "#ff8844",
          size: 15,
        },
      ],
      duration: 4500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: '"I\'m picking up a strong hostile — something heavily armored."',
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: '"Shield Commander class. Frontal attacks won\'t work. Flank it."',
          delay: 2500,
          color: "#ffcc00",
          size: 16,
        },
        {
          text: '"Also — prisoner logs mention someone called Dr. Voss. Pulling files now..."',
          delay: 5000,
          color: "#00ffdd",
          size: 14,
        },
      ],
      duration: 7500,
    },
  ],

  server_briefing: [
    {
      bg: "station",
      lines: [
        {
          text: "CHRONOS STATION — DATA CENTER",
          delay: 0,
          color: "#00ccff",
          size: 20,
        },
        { text: "Server Farm", delay: 1200, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: '"Mainframe access. Give me a minute to pull classified files."',
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: '"Dr. Elias Voss. Lead temporal physicist. Omega clearance."',
          delay: 2500,
          color: "#ffcc00",
          size: 16,
        },
        {
          text: '"Official status: DECEASED. Three years ago."',
          delay: 5000,
          color: "#ff4444",
          size: 16,
        },
        {
          text: '"...but the temporal signatures say otherwise."',
          delay: 7000,
          color: "#ff8844",
          size: 14,
        },
      ],
      duration: 9500,
    },
  ],

  reactor_briefing: [
    {
      bg: "dark",
      lines: [
        {
          text: "CHRONOS STATION — REACTOR LEVEL",
          delay: 0,
          color: "#ff8844",
          size: 20,
        },
        { text: "Reactor Access", delay: 1200, color: "#ffffff", size: 16 },
      ],
      particles: "embers",
      duration: 3500,
    },
    {
      bg: "dark",
      shake: 1,
      lines: [
        {
          text: "The energy readings are off the scale.",
          delay: 0,
          color: "#ff8844",
          size: 16,
        },
        {
          text: "Something went catastrophically wrong here.",
          delay: 2000,
          color: "#ff4444",
          size: 16,
        },
        {
          text: "Scorch marks. Temporal discharge residue. A failed experiment.",
          delay: 4000,
          color: "#aabbcc",
          size: 14,
        },
      ],
      particles: "embers",
      duration: 6500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: '"The reactor was part of something called Project PARADOX."',
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: '"Voss built a suit that merges with temporal energy. Sound familiar?"',
          delay: 2500,
          color: "#ffcc00",
          size: 16,
        },
        {
          text: '"Your suit. He designed your suit. Badge C-0017."',
          delay: 5000,
          color: "#ff4444",
          size: 16,
        },
      ],
      duration: 7500,
    },
  ],

  voss_lab_briefing: [
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: Reviewing station personnel file...",
          delay: 0,
          color: "#00ffdd",
          size: 14,
        },
        {
          text: "DR. ELIAS VOSS — LEAD RESEARCHER, CHRONOS DIVISION",
          delay: 1800,
          color: "#cc44ff",
          size: 17,
        },
      ],
      duration: 5000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"Graduated summa cum laude. Three doctorates by 28.\"",
          delay: 0,
          color: "#8899aa",
          size: 14,
        },
        {
          text: "\"Temporal physics, quantum engineering, xenobiology.\"",
          delay: 2200,
          color: "#8899aa",
          size: 14,
        },
        {
          text: "\"He was the best mind on this station. By far.\"",
          delay: 4400,
          color: "#aaddff",
          size: 15,
        },
      ],
      duration: 7000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"He proposed Project PARADOX seven years ago.\"",
          delay: 0,
          color: "#8899aa",
          size: 14,
        },
        {
          text: "\"Temporal self-integration. Merging human consciousness with the Chronos Engine.\"",
          delay: 2200,
          color: "#cc44ff",
          size: 14,
        },
        {
          text: "\"Command called it reckless. Denied funding. Buried the proposal.\"",
          delay: 4600,
          color: "#ff8844",
          size: 14,
        },
        {
          text: "\"Twice.\"",
          delay: 6800,
          color: "#ff4422",
          size: 18,
        },
      ],
      duration: 9500,
    },
    {
      bg: "dark",
      shake: 1,
      lines: [
        {
          text: "\"On the night of the incident — he ran it anyway.\"",
          delay: 0,
          color: "#cc44ff",
          size: 16,
        },
        {
          text: "\"Alone. In this lab. No authorisation. No fail-safes.\"",
          delay: 2500,
          color: "#ff6644",
          size: 15,
        },
        {
          text: "\"Station logs show the experiment lasted eleven seconds.\"",
          delay: 5000,
          color: "#8899aa",
          size: 14,
        },
        {
          text: "\"Everything after that... we know.\"",
          delay: 7200,
          color: "#ff2244",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 10000,
    },
    {
      bg: "dark",
      shake: 2,
      lines: [
        {
          text: "CHRONOS STATION — RESTRICTED LEVEL",
          delay: 0,
          color: "#cc44ff",
          size: 20,
        },
        {
          text: "Dr. Voss' Personal Laboratory",
          delay: 1500,
          color: "#ffffff",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 4000,
    },
    {
      bg: "dark",
      art: "aria",
      flash: "#cc44ff",
      lines: [
        {
          text: "\"This is it. Voss's private lab. Temporal rift at the center.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"The readings match the Paradox Lord's signature exactly.\"",
          delay: 2500,
          color: "#ff4444",
          size: 16,
        },
        {
          text: "\"...because they're the same person.\"",
          delay: 5000,
          color: "#ff2244",
          size: 18,
        },
      ],
      duration: 7500,
    },
    {
      bg: "dark",
      lines: [
        {
          text: "Dr. Elias Voss didn't die.",
          delay: 0,
          color: "#cc44ff",
          size: 18,
        },
        {
          text: "He merged with the temporal field.",
          delay: 2000,
          color: "#cc44ff",
          size: 18,
        },
        {
          text: "He became the Paradox Lord.",
          delay: 4000,
          color: "#ff2244",
          size: 22,
        },
      ],
      particles: "embers",
      shake: 2,
      duration: 7000,
    },
  ],

  // ── Voss Confrontation (used in Act 2 boss approach) ──────────────
  voss_confrontation: [
    {
      bg: "boss_lair",
      art: "villain_form2",
      flash: "#cc44ff",
      lines: [
        {
          text: '"You read my file."',
          delay: 0,
          color: "#cc44ff",
          size: 20,
        },
        {
          text: '"Good. Then you understand I didn\'t make a mistake."',
          delay: 2200,
          color: "#ff88aa",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 5500,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: '"They called it reckless. Unauthorised. A disaster."',
          delay: 0,
          color: "#ff6644",
          size: 15,
        },
        {
          text: '"I call it the most successful experiment in human history."',
          delay: 2400,
          color: "#cc44ff",
          size: 16,
        },
        {
          text: '"I proposed this for seven years. They laughed."',
          delay: 4800,
          color: "#ff4422",
          size: 15,
        },
        {
          text: '"Now look at me."',
          delay: 6800,
          color: "#ff0088",
          size: 22,
        },
      ],
      particles: "embers",
      shake: 3,
      duration: 9500,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      flash: "#ff0044",
      shake: 5,
      lines: [
        {
          text: '"I didn\'t become this overnight, Agent."',
          delay: 0,
          color: "#ff88aa",
          size: 16,
        },
        {
          text: '"I became this the moment they told me \'no\'."',
          delay: 2500,
          color: "#ff2266",
          size: 18,
        },
        {
          text: '"The night I ran the experiment? That was just the last step."',
          delay: 5000,
          color: "#ff4488",
          size: 15,
        },
      ],
      particles: "embers",
      duration: 8000,
    },
  ],

  nexus_briefing: [
    {
      bg: "station",
      lines: [
        {
          text: "CHRONOS STATION — SECTOR 7",
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
      art: "rift",
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
          text: "Almost there. The Core is just beyond.",
          delay: 3600,
          color: "#ffcc00",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 6000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: '"Voss is waiting. He knows you\'re wearing his prototype."',
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: '"He built the suit. He knows its weaknesses."',
          delay: 2200,
          color: "#ffcc00",
          size: 15,
        },
        {
          text: '"But he also knows its strengths. And so do we."',
          delay: 4400,
          color: "#00ffdd",
          size: 16,
        },
      ],
      duration: 7000,
    },
  ],

  paradox_core_briefing: [
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        {
          text: "Your temporal scanner is going haywire.",
          delay: 0,
          color: "#00ccff",
          size: 16,
        },
        {
          text: "Chronal distortion readings — climbing fast.",
          delay: 2000,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "200... 800... 3,600... 9,001...",
          delay: 4000,
          color: "#ffcc00",
          size: 18,
        },
      ],
      particles: "sparks",
      duration: 6000,
    },
    {
      bg: "boss_lair",
      lines: [
        { text: "THE PARADOX CORE", delay: 0, color: "#ff2244", size: 22 },
        {
          text: "Where Dr. Elias Voss became something else.",
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
      bg: "dark",
      art: "hero_armed",
      shake: 3,
      lines: [
        {
          text: "A voice. Not from the room — from inside your head.",
          delay: 0,
          color: "#ff6644",
          size: 16,
        },
        {
          text: "The visor cracks. Static floods your HUD.",
          delay: 2200,
          color: "#ff4444",
          size: 16,
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
          text: '"You\'re wearing MY suit."',
          delay: 0,
          color: "#ff4466",
          size: 18,
        },
        {
          text: '"I built it. I know every circuit, every paradox loop."',
          delay: 2200,
          color: "#ff4466",
          size: 16,
        },
        {
          text: '"You can\'t save what was never meant to exist."',
          delay: 4500,
          color: "#ff2244",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 7000,
    },
  ],

  level3_briefing: [
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        {
          text: "Your temporal scanner is going haywire.",
          delay: 0,
          color: "#00ccff",
          size: 16,
        },
        {
          text: "Chronal distortion readings... climbing fast.",
          delay: 2000,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "300... 1,200... 4,500...",
          delay: 4000,
          color: "#ffcc00",
          size: 18,
        },
      ],
      particles: "sparks",
      duration: 6000,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#ff0000",
      shake: 3,
      lines: [
        {
          text: "The scanner maxes out.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "ERROR: TEMPORAL OVERFLOW",
          delay: 1800,
          color: "#ff4444",
          size: 22,
        },
        {
          text: "...that can't be right.",
          delay: 4000,
          color: "#8899aa",
          size: 14,
        },
      ],
      particles: "embers",
      duration: 6500,
    },
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
      bg: "dark",
      art: "hero_armed",
      shake: 3,
      lines: [
        {
          text: "A voice. Not from the room — from inside your head.",
          delay: 0,
          color: "#ff6644",
          size: 16,
        },
        {
          text: "The visor cracks. Static floods your HUD.",
          delay: 2200,
          color: "#ff4444",
          size: 16,
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
          text: '"...I\'m aware of how this looks. Carry on."',
          delay: 2500,
          color: "#ffcc88",
          size: 14,
        },
      ],
      particles: "embers",
      duration: 5500,
    },
    {
      bg: "boss_lair",
      art: "villain",
      flash: "#ff0000",
      lines: [
        {
          text: '"YOU DARE CHALLENGE ME?"',
          delay: 0,
          color: "#ff2244",
          size: 22,
        },
        {
          text: '"You have no idea what you\'re walking into..."',
          delay: 1800,
          color: "#ff4466",
          size: 16,
        },
        {
          text: '"But by all means — try."',
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
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA's voice cuts through the static. Quieter now. Almost... concerned.",
          delay: 0,
          color: "#8899aa",
          size: 14,
        },
        {
          text: '"Hey. I know that look. Don\'t you dare give up on me."',
          delay: 2200,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: '"We didn\'t come this far for you to die looking dramatic."',
          delay: 4500,
          color: "#00ffdd",
          size: 15,
        },
      ],
      duration: 7000,
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
      scanner: true,
      lines: [
        {
          text: '"You measured me once, little clock soldier..."',
          delay: 0,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: '"YOUR SCANNER LIED. I AM BEYOND MEASURE."',
          delay: 2000,
          color: "#ff0044",
          size: 26,
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
      art: "aria",
      lines: [
        {
          text: "Fading. Everything fading. But then—",
          delay: 0,
          color: "#445566",
          size: 14,
        },
        {
          text: '"Don\'t you DARE flatline on me."',
          delay: 2000,
          color: "#00ffdd",
          size: 18,
        },
        {
          text: '"CRITICAL DAMAGE DETECTED. OVERRIDING SAFEGUARDS."',
          delay: 4000,
          color: "#ff0000",
          size: 16,
        },
        {
          text: '"INITIATING CHRONO SHIFT. BRACE YOURSELF!"',
          delay: 6000,
          color: "#00ccff",
          size: 20,
        },
      ],
      duration: 8500,
      particles: "sparks",
    },
    {
      bg: "boss_lair",
      flash: "#ffffff",
      shake: 10,
      lines: [
        {
          text: "Time grinds to a halt.",
          delay: 0,
          color: "#00ccff",
          size: 24,
        },
        {
          text: "The Paradox Lord's killing blow freezes inches from your visor.",
          delay: 2000,
          color: "#00aaff",
          size: 16,
        },
        {
          text: "The suit pulse-vents raw temporal energy, throwing you clear.",
          delay: 4000,
          color: "#00aaff",
          size: 16,
        },
        {
          text: "You survive. Barely.",
          delay: 7000,
          color: "#ffffff",
          size: 18,
        },
      ],
      duration: 10000,
      particles: "glow",
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
          text: "— THE SHIFT —",
          delay: 1500,
          color: "#00ccff",
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
        { text: "ACT II", delay: 0, color: "#00ccff", size: 28 },
        { text: "— THE BONDS —", delay: 1500, color: "#aaddff", size: 18 },
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
      art: "lyra",
      lines: [
        {
          text: "A voice. Soft. Steady. Like she's been waiting.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: '"I\'ve been watching your temporal readings for months."',
          delay: 2500,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: '"Everyone else looked at you and saw a beat cop."',
          delay: 5000,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: '"I looked at you and saw... something impossible."',
          delay: 7500,
          color: "#ffaa44",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 10000,
    },
    {
      bg: "station",
      lines: [
        {
          text: "Others survived the temporal collapse too.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Not soldiers. Not heroes. Just people who lost everything.",
          delay: 2000,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "People who had nothing left... except each other.",
          delay: 4000,
          color: "#00ffcc",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "dark",
      art: "party",
      lines: [
        {
          text: "KAEL — The Vanguard. Lost his whole squad. Swore he'd never lose anyone again.",
          delay: 0,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "LYRA — The Chrono-Analyst. Saw the truth in the data. Nobody listened... until you.",
          delay: 2500,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "NOVA — The Striker. Fastest thing alive. Running from a past she won't talk about.",
          delay: 5000,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "ROOK — The Engineer. Builds anything. Trusts no one. Learned to trust YOU.",
          delay: 7500,
          color: "#44ff88",
          size: 15,
        },
        {
          text: "And you. The Temporal Agent. The one who came back for ALL of them.",
          delay: 10000,
          color: "#00ffcc",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 13000,
    },
    {
      bg: "station",
      art: "party",
      lines: [
        {
          text: "You don't build a team. You build a family.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Kael teaches you to hold the line. You teach him to let people in.",
          delay: 2500,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "Nova shows you speed. You show her it's okay to stand still.",
          delay: 5000,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "Rook builds the weapons. You give him something worth fighting for.",
          delay: 7500,
          color: "#44ff88",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 10000,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        { text: "And Lyra...", delay: 0, color: "#ffcc88", size: 16 },
        {
          text: "She stays up late running calculations. You bring her coffee.",
          delay: 2000,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "She tells you about the timelines she's seen die. You listen.",
          delay: 4500,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: '"No one ever listened before."',
          delay: 7000,
          color: "#ffcc88",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 9500,
    },
    {
      bg: "station",
      art: "hero_armed",
      flash: "#00ccff",
      lines: [
        {
          text: "The Lord thinks this is a war.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "He's wrong. This isn't about power.",
          delay: 2000,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "It's about the people standing next to you.",
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
        { text: "THE PROVING GROUNDS", delay: 0, color: "#00ccff", size: 20 },
        {
          text: "Where bonds are forged in fire.",
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
          text: "You train together. Eat together. Bleed together.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Kael guards everyone's back. Nova makes them laugh. Rook fixes what breaks.",
          delay: 2500,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Late one night, Nova finally tells you about the people she lost.",
          delay: 5000,
          color: "#ff4488",
          size: 15,
        },
        {
          text: '"I ran. I always ran. Not this time."',
          delay: 7500,
          color: "#ff4488",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 10000,
    },
  ],

  act2_level3: [
    {
      bg: "boss_lair",
      lines: [
        { text: "THE LORD'S CATHEDRAL", delay: 0, color: "#ff2244", size: 22 },
        {
          text: "His temporal fortress. He's been waiting.",
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
          text: '"How... sentimental."',
          delay: 2000,
          color: "#ff6688",
          size: 16,
        },
        {
          text: '"I\'ve killed you in a thousand timelines. Each time, alone."',
          delay: 3800,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: '"Having people you care about just gives me more things to break."',
          delay: 6000,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 8500,
    },
    {
      bg: "boss_lair",
      art: "hero_armed",
      flash: "#00ffcc",
      lines: [
        {
          text: "Kael steps in front of you. Shield up.",
          delay: 0,
          color: "#4488ff",
          size: 16,
        },
        {
          text: '"You talk too much."',
          delay: 2000,
          color: "#4488ff",
          size: 16,
        },
        {
          text: "Nova's already flanking. Rook's turrets hum to life.",
          delay: 3800,
          color: "#44ff88",
          size: 15,
        },
        {
          text: "You lock eyes with Lyra. She nods. You both know the plan.",
          delay: 5500,
          color: "#ffaa44",
          size: 16,
        },
        { text: "TOGETHER.", delay: 7500, color: "#ffffff", size: 26 },
      ],
      shake: 4,
      duration: 9000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT II VICTORY — Beat Form 2, bonds tested, the Lord transforms
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
      art: "party",
      lines: [
        {
          text: "Kael's shield held. Nova's still standing. Rook's grinning.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "You did this TOGETHER.",
          delay: 2500,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "For the first time, the Lord sees something he doesn't understand:",
          delay: 4500,
          color: "#aaddff",
          size: 15,
        },
        {
          text: "People fighting for each other. Not for power. For love.",
          delay: 7000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 9500,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: '"...interesting. You actually hurt me."',
          delay: 0,
          color: "#ff6688",
          size: 16,
        },
        {
          text: '"Not with strength. With something I can\'t calculate."',
          delay: 2500,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: '"I\'ll need to... reconfigure."',
          delay: 5000,
          color: "#ff2244",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 7500,
    },
    {
      bg: "boss_lair",
      flash: "#ffffff",
      shake: 10,
      lines: [
        {
          text: "The chamber erupts in light.",
          delay: 0,
          color: "#ff88aa",
          size: 16,
        },
        {
          text: "Something ancient and terrible awakens.",
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
        { text: '"I AM time."', delay: 4500, color: "#ffffff", size: 24 },
      ],
      shake: 8,
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "dark",
      art: "party",
      lines: [
        {
          text: "Lyra grabs your hand. For just a second.",
          delay: 0,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: '"We can do this. I believe in us."',
          delay: 2500,
          color: "#ffcc88",
          size: 17,
        },
        {
          text: "Not 'I believe in you.' In US.",
          delay: 5000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 7500,
    },
    {
      bg: "dark",
      lines: [
        { text: "END OF ACT II", delay: 0, color: "#334455", size: 28 },
        { text: "— THE BONDS —", delay: 1500, color: "#556677", size: 18 },
      ],
      duration: 4000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // LYRA REVEAL — The Chrono-Analyst's Awakening
  // Death Note energy — she figured out what nobody else could
  // Solo Leveling energy — the hero was always powerful, she proves it
  // Kaiju No. 8 — the nobody who changes everything
  // ═══════════════════════════════════════════════════════════════════
  lyra_reveal: [
    {
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: "While the squad patches their wounds, Lyra works.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Holographic timelines cascade around her like waterfalls.",
          delay: 2500,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: "She's been mapping the Paradox Lord's decisions since the Collapse.",
          delay: 5000,
          color: "#ffaa44",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 8000,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: '"Everyone looks at the battles. I look at the spaces between."',
          delay: 0,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "\"There's a pattern. He doesn't see what he doesn't expect.\"",
          delay: 3000,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "Like Light Yagami's notebook — power through perfect information.",
          delay: 6000,
          color: "#ff8866",
          size: 14,
        },
        {
          text: "But information has blind spots.",
          delay: 8000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "dark",
      art: "lyra",
      lines: [
        {
          text: "She turns to you. Her eyes are burning amber.",
          delay: 0,
          color: "#ffcc88",
          size: 16,
        },
        {
          text: '"Your temporal readings... they don\'t match any baseline."',
          delay: 2500,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: '"Not even close. You\'ve been holding back something immense."',
          delay: 5000,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: '"Like Jinwoo before his Awakening... the power was always there."',
          delay: 7500,
          color: "#ffcc44",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#ffaa44",
      lines: [
        {
          text: "Something clicks. Deep inside, past the damage, past the doubt.",
          delay: 0,
          color: "#00ffcc",
          size: 16,
        },
        {
          text: "She didn't give you new power. She showed you what was already there.",
          delay: 3000,
          color: "#ffcc88",
          size: 16,
        },
        {
          text: "The nobody who kept clocking in... was the strongest one all along.",
          delay: 6000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "sparks",
      shake: 3,
      duration: 9500,
    },
    {
      bg: "station",
      art: "party",
      lines: [
        {
          text: 'Kael grips his cracked shield. "So we fight."',
          delay: 0,
          color: "#4488ff",
          size: 15,
        },
        {
          text: 'Nova cracks her knuckles. "Wouldn\'t miss it."',
          delay: 2000,
          color: "#ff4488",
          size: 15,
        },
        {
          text: 'Rook powers up his last turret. "All systems nominal. Mostly."',
          delay: 4000,
          color: "#44ff88",
          size: 15,
        },
        {
          text: "Lyra closes her holoscreens. \"I'll be watching. I'll find your opening.\"",
          delay: 6000,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "You look at them — your team, your friends — and you know.",
          delay: 8500,
          color: "#ffffff",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 11500,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT III — THE SACRIFICE
  // The hero realizes the cost. Sacrifices everything.
  // Gets the girl. Redeems himself.
  // ═══════════════════════════════════════════════════════════════════
  act3_intro: [
    {
      bg: "deep_space",
      lines: [
        { text: "ACT III", delay: 0, color: "#ff2244", size: 28 },
        { text: "— THE SACRIFICE —", delay: 1500, color: "#ff8866", size: 18 },
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
          text: "He doesn't just see the future. He IS the future.",
          delay: 2000,
          color: "#ff6688",
          size: 15,
        },
        {
          text: "Every strategy you've planned — he's already countered it.",
          delay: 4000,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "Every move with your team — he's already seen it.",
          delay: 6000,
          color: "#ff2244",
          size: 16,
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
          text: "Rook's turrets are slag. Lyra's screens are flickering.",
          delay: 2000,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "But they're still standing. All of them.",
          delay: 4000,
          color: "#aabbcc",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: "Lyra pulls you aside. Her voice is shaking.",
          delay: 0,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: '"I found a blind spot. One moment he can\'t predict."',
          delay: 2500,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: '"But there\'s a cost. Someone has to enter the Paradox Core alone."',
          delay: 5000,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: '"The energy will... it will rewrite whoever goes in."',
          delay: 7500,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: "She can't finish the sentence. She doesn't need to.",
          delay: 10000,
          color: "#aabbcc",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 12500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#00ffcc",
      lines: [
        {
          text: "You already know who's going.",
          delay: 0,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "You were always going.",
          delay: 2000,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "That's what a badge means. You protect the people you love.",
          delay: 4000,
          color: "#ffffff",
          size: 18,
        },
        {
          text: "Even if it costs everything.",
          delay: 6500,
          color: "#ffcc00",
          size: 22,
        },
      ],
      shake: 4,
      particles: "embers",
      duration: 9000,
    },
  ],

  act3_level2: [
    {
      bg: "boss_lair",
      lines: [
        { text: "THE TEMPORAL THRONE", delay: 0, color: "#ff2244", size: 22 },
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
      bg: "station",
      art: "party",
      lines: [
        {
          text: '"You can\'t go alone." Kael blocks the door.',
          delay: 0,
          color: "#4488ff",
          size: 16,
        },
        {
          text: '"I\'m faster — I should be the one." Nova steps forward.',
          delay: 2500,
          color: "#ff4488",
          size: 16,
        },
        {
          text: '"My turrets can — " Rook starts.',
          delay: 4500,
          color: "#44ff88",
          size: 16,
        },
        {
          text: "You shake your head. Look at each of them.",
          delay: 6500,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "\"You're my family. That's WHY it has to be me.\"",
          delay: 8500,
          color: "#00ffcc",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 11000,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: "Lyra is the last one standing in your way.",
          delay: 0,
          color: "#ffcc88",
          size: 16,
        },
        { text: '"Don\'t you DARE."', delay: 2000, color: "#ffaa44", size: 22 },
        {
          text: "Her eyes are burning. Not with data. With tears.",
          delay: 4000,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: '"You just got here. I just found you. You can\'t —"',
          delay: 6000,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "You take her hand. Hold it. Let it go.",
          delay: 8500,
          color: "#ffffff",
          size: 18,
        },
        {
          text: '"I\'m coming back. I promise."',
          delay: 10500,
          color: "#00ffcc",
          size: 20,
        },
      ],
      particles: "glow",
      duration: 13000,
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
        { text: "You enter alone.", delay: 1500, color: "#ff4466", size: 16 },
      ],
      particles: "embers",
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      lines: [
        { text: '"Oh. Just you?"', delay: 0, color: "#ff4466", size: 18 },
        {
          text: '"Your friends aren\'t coming to save you this time?"',
          delay: 2200,
          color: "#ff6688",
          size: 16,
        },
        {
          text: '"How... disappointing."',
          delay: 4200,
          color: "#ff88aa",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 6500,
    },
    {
      bg: "boss_lair",
      art: "hero_armed",
      flash: "#00ffcc",
      shake: 5,
      lines: [
        {
          text: "They're not here because I love them too much to let them die.",
          delay: 0,
          color: "#00ffcc",
          size: 16,
        },
        {
          text: "And that... is something you'll never understand.",
          delay: 2500,
          color: "#ffffff",
          size: 18,
        },
        {
          text: "That's your blind spot.",
          delay: 4500,
          color: "#ffcc00",
          size: 24,
        },
      ],
      shake: 6,
      particles: "embers",
      duration: 7000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // TRUE VICTORY — Sacrifice, redemption, the hero gets the girl
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
          text: "But the Core is collapsing. Taking you with it.",
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
          text: '"A sacrifice? For THEM? That\'s not... logical."',
          delay: 2500,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "\"You couldn't have known you'd survive this.\"",
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
      art: "hero_armed",
      lines: [
        {
          text: "The chamber tears apart around you.",
          delay: 0,
          color: "#ff4444",
          size: 16,
        },
        {
          text: "Time fractures. Your body burns.",
          delay: 2000,
          color: "#ff6644",
          size: 16,
        },
        {
          text: "Every timeline flashes before your eyes.",
          delay: 4000,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "In every one... they're smiling. Because of you.",
          delay: 6000,
          color: "#ffffff",
          size: 18,
        },
        {
          text: "That's enough. That's always been enough.",
          delay: 8000,
          color: "#00ffcc",
          size: 18,
        },
      ],
      particles: "embers",
      shake: 6,
      duration: 10500,
    },
    {
      bg: "dark",
      lines: [
        { text: "Darkness.", delay: 0, color: "#334455", size: 20 },
        { text: "Silence.", delay: 2000, color: "#334455", size: 20 },
        { text: "...", delay: 4000, color: "#556677", size: 24 },
      ],
      duration: 6500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        { text: '"WAKE UP."', delay: 0, color: "#ffaa44", size: 28 },
        {
          text: "Lyra's voice. Close. Desperate.",
          delay: 1500,
          color: "#ffcc88",
          size: 16,
        },
        {
          text: '"You promised, you absolute idiot. You PROMISED."',
          delay: 3500,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "Her hand on your face. Warm.",
          delay: 6000,
          color: "#ffcc88",
          size: 16,
        },
        {
          text: "You open your eyes.",
          delay: 8000,
          color: "#ffffff",
          size: 20,
        },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "station",
      art: "party",
      lines: [
        {
          text: "You're in the medbay. Same bed you woke up in before.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "But this time, the room is full.",
          delay: 2000,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Kael is trying not to cry. Failing.",
          delay: 3800,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "Nova is laughing through tears. Rook just nods. That's enough from him.",
          delay: 5500,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "And Lyra... hasn't let go of your hand.",
          delay: 7500,
          color: "#ffaa44",
          size: 17,
        },
      ],
      particles: "glow",
      duration: 10000,
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
          text: "Timelines heal. The rift closes.",
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
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: "Later. The station is quiet.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Lyra finds you on the observation deck, staring at the stars.",
          delay: 2000,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: '"You\'re an idiot, you know that?"',
          delay: 4500,
          color: "#ffaa44",
          size: 16,
        },
        { text: '"Yeah."', delay: 6500, color: "#00ffcc", size: 16 },
        { text: '"...my idiot."', delay: 8000, color: "#ffaa44", size: 20 },
        {
          text: "She kisses you. The stars have never looked brighter.",
          delay: 10000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 13000,
    },
    {
      bg: "deep_space",
      art: "party",
      lines: [
        {
          text: "Kael. Lyra. Nova. Rook. You.",
          delay: 0,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "Not just agents. Family.",
          delay: 2000,
          color: "#00ccff",
          size: 18,
        },
        {
          text: "The ones who stayed. The ones who fought.",
          delay: 4000,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "The ones who loved.",
          delay: 6000,
          color: "#ffcc00",
          size: 22,
        },
        { text: "The ones who WON.", delay: 8000, color: "#ffffff", size: 26 },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "dark",
      lines: [
        { text: "TIMELINE RESTORED", delay: 0, color: "#00ffcc", size: 28 },
        { text: "— FIN —", delay: 2000, color: "#ffffff", size: 22 },
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
          caption: "Badge 11235. Just a beat cop.",
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

  the_hunt_begins: [
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        {
          text: "Training's over. The real world hits different.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "The other Alpha candidates washed out. Every one.",
          delay: 2200,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "You're the only one left.",
          delay: 4400,
          color: "#00ccff",
          size: 17,
        },
      ],
      duration: 6500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        {
          text: "Something's wrong with time. You can feel it in the armor.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "The chronal readings on your HUD are spiking. Hard.",
          delay: 2500,
          color: "#ff8844",
          size: 16,
        },
      ],
      duration: 5000,
    },
    {
      bg: "dark",
      art: "villain",
      flash: "#ff2244",
      shake: 2,
      lines: [
        {
          text: "A voice. Not in the room — in your skull.",
          delay: 0,
          color: "#ff6644",
          size: 17,
        },
        {
          text: '"There you are. I\'ve been watching your little program."',
          delay: 2200,
          color: "#ff2244",
          size: 18,
        },
        {
          text: '"The others broke so easily. But you... you activated the prototype."',
          delay: 5000,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 8000,
    },
    {
      bg: "dark",
      art: "rift",
      shake: 1,
      lines: [
        {
          text: "The lights flicker. The clock on the wall runs backwards.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Then everything goes sideways.",
          delay: 2500,
          color: "#ff4444",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 5000,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#ffffff",
      lines: [
        {
          text: "The Alpha program is down to one. You.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Whatever that thing is — you're going to find it.",
          delay: 2500,
          color: "#00ccff",
          size: 18,
        },
        {
          text: "The hunt begins.",
          delay: 5000,
          color: "#00ffcc",
          size: 22,
        },
      ],
      particles: "glow",
      duration: 7000,
    },
  ],

  clocking_in: [
    {
      bg: "station",
      art: "station",
      lines: [
        {
          text: "06:47 AM. Chronos Station.",
          delay: 0,
          color: "#556677",
          size: 14,
        },
        {
          text: "Another morning. Another shift.",
          delay: 1200,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "The coffee's bad and the commute was worse.",
          delay: 3000,
          color: "#aabbcc",
          size: 16,
        },
      ],
      duration: 5500,
    },
    {
      bg: "dark",
      art: "hero_at_desk",
      lines: [
        {
          text: "You badge in at the front desk. Same as always.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "The receptionist doesn't look up. Never does.",
          delay: 2200,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: '"Morning." Nothing. You keep walking.',
          delay: 4400,
          color: "#667788",
          size: 15,
        },
      ],
      duration: 6500,
    },
    {
      bg: "dark",
      art: "hero_human",
      lines: [
        {
          text: "Three years at the Bureau. Still a field cadet.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Every Alpha-class promotion exam — failed.",
          delay: 2200,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: '"Not quick enough. Not precise enough."',
          delay: 4400,
          color: "#887766",
          size: 15,
        },
      ],
      duration: 6500,
    },
    {
      bg: "station",
      lines: [
        {
          text: "Locker room. Third row, second from the left.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "You've opened this locker a thousand times.",
          delay: 2000,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "But today something's different.",
          delay: 4000,
          color: "#00ccff",
          size: 17,
        },
      ],
      duration: 6000,
    },
    {
      bg: "dark",
      art: "hero_human",
      lines: [
        {
          text: "Unmarked crate from R&D. Your name is on it.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: '"Temporal Combat Armor — Alpha Prototype."',
          delay: 2200,
          color: "#00ccff",
          size: 18,
        },
        {
          text: 'A sticky note from your supervisor: "You\'re up. Put it on."',
          delay: 4500,
          color: "#aabbcc",
          size: 16,
        },
      ],
      duration: 7000,
    },
    {
      bg: "dark",
      art: "hero",
      particles: "sparks",
      lines: [
        {
          text: "It fits better than you expected.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Helmet on. Visor down. HUD flickers to life.",
          delay: 2200,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "Everything feels... enhanced. Sharper. Faster.",
          delay: 4500,
          color: "#00ccff",
          size: 16,
        },
      ],
      duration: 7000,
    },
    {
      bg: "dark",
      art: "aria",
      flash: "#00ddff",
      lines: [
        {
          text: "[ INITIALIZING... A.R.I.A. — ARMOR-RESIDENT INTELLIGENCE ASSIST ]",
          delay: 0,
          color: "#00aacc",
          size: 12,
        },
        {
          text: '"Good morning, {AGENT}. — I\'m ARIA, your tactical co-pilot."',
          delay: 1800,
          color: "#00ffdd",
          size: 17,
        },
        {
          text: '"Neural link confirmed. Biometrics nominal. Let\'s get to work."',
          delay: 4000,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "A calm voice in the static. You're not doing this alone.",
          delay: 6500,
          color: "#8899aa",
          size: 16,
        },
      ],
      duration: 9000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: '"Your heart rate just spiked. Nervous?"',
          delay: 0,
          color: "#00ffdd",
          size: 17,
        },
        {
          text: "...was she flirting? No. She's an AI. Focus.",
          delay: 2200,
          color: "#8899aa",
          size: 15,
        },
        {
          text: '"I can hear you thinking. Relax — I\'m on your side."',
          delay: 4500,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: "\"Besides... you're the best candidate they've sent me, {AGENT}. Don't prove them wrong.\"",
          delay: 7000,
          color: "#00ffdd",
          size: 14,
        },
      ],
      duration: 10000,
    },
    {
      bg: "dark",
      art: "hero",
      lines: [
        {
          text: "Great. A voice in your head with opinions.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: 'ARIA: "I also have excellent taste. You\'re welcome."',
          delay: 2200,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "Okay. Maybe this won't be so bad.",
          delay: 4500,
          color: "#8899aa",
          size: 16,
        },
      ],
      duration: 6500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#00ccff",
      lines: [
        {
          text: "Standard-issue temporal rifle. Heavier than expected.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "ARIA: \"Calibrated to your servo profile. You'll sprint faster,",
          delay: 2000,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: 'carry more, and hit harder — but you need to learn the steps."',
          delay: 3800,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "Time to test what this thing can do.",
          delay: 6000,
          color: "#00ffcc",
          size: 18,
        },
      ],
      duration: 8000,
    },
  ],
};

// ── Character Creator ────────────────────────────────────

export const CHARACTER_COLORS = [
  {
    id: "chrono_teal",
    name: "Chrono Teal",
    primary: "#00ccaa",
    accent: "#00ffdd",
    dark: "#005544",
  },
  {
    id: "midnight_blue",
    name: "Midnight Blue",
    primary: "#2244aa",
    accent: "#4488ff",
    dark: "#112255",
  },
  {
    id: "paradox_red",
    name: "Paradox Red",
    primary: "#aa2233",
    accent: "#ff4455",
    dark: "#551122",
  },
  {
    id: "void_purple",
    name: "Void Purple",
    primary: "#6622aa",
    accent: "#aa44ff",
    dark: "#331166",
  },
  {
    id: "solar_gold",
    name: "Solar Gold",
    primary: "#aa8822",
    accent: "#ffcc44",
    dark: "#554411",
  },
  {
    id: "arctic_white",
    name: "Arctic White",
    primary: "#99aabb",
    accent: "#ddeeff",
    dark: "#445566",
  },
  {
    id: "neon_green",
    name: "Neon Green",
    primary: "#22aa44",
    accent: "#44ff66",
    dark: "#115522",
  },
  {
    id: "rust_orange",
    name: "Rust Orange",
    primary: "#aa5522",
    accent: "#ff8844",
    dark: "#552211",
  },
];

export const ARMOR_STYLES = [
  {
    id: "standard",
    name: "Standard Issue",
    desc: "Regulation Chrono-Corp armor",
  },
  { id: "recon", name: "Recon", desc: "Lightweight scout plating" },
  { id: "heavy", name: "Juggernaut", desc: "Reinforced temporal shielding" },
  { id: "stealth", name: "Ghost", desc: "Low-profile shadow plating" },
  { id: "tech", name: "Engineer", desc: "Utility-integrated hardsuit" },
];

export const BADGES = [
  { id: "none", name: "None", icon: null },
  { id: "shield", name: "Temporal Shield", icon: "shield" },
  { id: "skull", name: "Kill Specialist", icon: "skull" },
  { id: "clock", name: "Chrono Division", icon: "clock" },
  { id: "star", name: "Gold Star", icon: "star" },
  { id: "bolt", name: "Lightning Strike", icon: "bolt" },
  { id: "eye", name: "The Watcher", icon: "eye" },
  { id: "rift", name: "Rift Walker", icon: "rift" },
];

export const WEAPON_SKINS = [
  { id: "default", name: "Factory Default", desc: "Standard issue finish" },
  { id: "carbon", name: "Carbon Fiber", desc: "Matte black composite" },
  { id: "chrome", name: "Chrome", desc: "Polished reflective plating" },
  { id: "ember", name: "Ember", desc: "Heat-treated orange glow" },
  { id: "frost", name: "Frostbite", desc: "Cryo-cooled blue tint" },
  { id: "toxic", name: "Toxic", desc: "Corrosive green finish" },
];

export const LOADOUT_CLASSES = [
  {
    id: "recruit",
    name: "Recruit",
    desc: "Balanced starter",
    unlocked: true,
    startWeapons: [0],
    bonuses: {},
  },
  {
    id: "gunslinger",
    name: "Gunslinger",
    desc: "Fast hands, light feet",
    unlocked: false,
    startWeapons: [0, 1],
    bonuses: { fireRateMultiplier: 0.9 },
  },
  {
    id: "enforcer",
    name: "Enforcer",
    desc: "Heavy armor, heavy hits",
    unlocked: false,
    startWeapons: [0],
    bonuses: { maxHealth: 125, moveSpeed: -0.3 },
  },
  {
    id: "phantom",
    name: "Phantom",
    desc: "Speed demon",
    unlocked: false,
    startWeapons: [0],
    bonuses: { moveSpeed: 0.5, maxStamina: 130 },
  },
];

export const DEFAULT_CHARACTER = {
  name: "Agent",
  colorIndex: 0,
  armorIndex: 0,
  badgeIndex: 0,
  weaponSkinIndex: 0,
  loadoutIndex: 0,
};

// ARIA in-game comms — contextual callouts during gameplay
export const ARIA_COMMS = {
  // ── First blood ──
  firstKill: [
    "Neural sync confirmed. Combat systems online.",
    "First contact. You're a natural.",
    "Target neutralized. Suit telemetry looks good.",
    "And there it is. The suit chose well.",
    "First one's always weird. It gets... well, it gets faster.",
  ],

  // ── Health warnings ──
  lowHealth: [
    "Biometrics critical — find cover, now.",
    "Your vitals are dropping. I'm not losing you on day one, {AGENT}.",
    "Armor integrity failing. Move!",
    "Hey. HEY. We talked about this — don't die.",
    "I can see your heart rate from here. Breathe. Find health.",
  ],
  criticalHealth: [
    "You're flatlining. MOVE!",
    "I can't patch you from here — find health NOW.",
    "I swear, if you die on my watch — MOVE!",
    "Single digits. You're in single digits. RUN.",
  ],

  // ── Pickups ──
  weaponPickup: [
    "New hardware acquired. Syncing to servo profile.",
    "Weapon detected. Auto-calibrating.",
    "Added to your loadout. Try not to break it.",
    "Ooh, nice find. I'll have that synced before you blink.",
    "Another toy for the collection. I approve.",
  ],
  healthPickup: [
    "Vitals stabilizing. Don't make it a habit.",
    "Patched up. You're welcome.",
    "Health restored. Try to keep some this time.",
  ],

  // ── Kill streaks ──
  killStreak3: [
    "Triple kill. Not bad for a temp.",
    "Three down. The suit is reading your intent before you pull the trigger.",
    "Three in a row. I like the rhythm.",
  ],
  killStreak5: [
    "Five confirmed. You're on a rampage.",
    "Impressive. Even my projections didn't account for this.",
    "Five-piece combo. Show-off.",
  ],
  killStreak7: [
    "Seven. I'm adjusting my threat model — upward.",
    "You're rewriting the combat logs. Keep it up.",
    "GODLIKE. I had to say it. It was right there.",
    "Seven consecutive. I'm running out of superlatives.",
  ],

  // ── Round/Level completion ──
  roundComplete: [
    "Round clear. Diagnostics nominal.",
    "All hostiles down. Catch your breath — more incoming.",
    "Area secure. Recalibrating sensors for the next wave.",
    "Clean sweep. I've updated your combat rating.",
    "That's a wrap. Grab what you can — the next wave won't wait.",
  ],
  levelComplete: [
    "Objective achieved. Marking safe passage.",
    "That sector is clear. Well done, {AGENT}.",
    "Level cleared. We make a good team.",
    "Exit secured. Onward.",
  ],

  // ── Boss encounters ──
  bossEncounter: [
    "Temporal anomaly detected — massive energy signature. Be ready.",
    "This one's different. Prioritize evasion.",
    "I'm reading power levels that shouldn't exist. Stay sharp.",
    "Boss signature confirmed. I'll track weak points — you stay alive.",
    "He thinks splitting himself across timelines makes him immortal. It just means we have to beat him more than once.",
  ],
  bossForm2: [
    "It's transforming. Great. I love when they do that.",
    "Second form. Called it. Recalibrating targeting arrays.",
    "Don't look at me like that — I didn't make it stronger.",
  ],
  bossForm3: [
    "Final form. This is it — everything we've got.",
    "Third transformation. It's pulling energy from the rift itself.",
    "Last round. I believe in you, {AGENT}. Don't make me regret it.",
    "Every timeline he corrupted is an anchor holding him here. Sever them all.",
  ],

  // ── Player death ──
  playerDeath: [
    "Rebooting... I'll be here when you're back.",
    "Suit failsafe engaged. Rewind in progress.",
    "Temporal anchor holding. You're coming back.",
    "...I hate this part. Reinitializing.",
  ],

  // ── Session starts ──
  arenaStart: [
    "Arena protocol active. Survive.",
    "Welcome to the arena. I'll track your stats.",
    "Arena mode. You and me against the clock.",
    "Initializing arena. Try to beat your last run — I dare you.",
  ],
  campaignStart: [
    "Mission parameters loaded. Let's move.",
    "Campaign active. Stay on objective, stay alive.",
    "Chrono-Bureau dispatch: you are weapons-free. Let's go.",
    "The Department of Temporal Regulation sends its regards. Try not to break anything they haven't already broken.",
  ],

  // ── Combat flavor ──
  dashUsed: [
    "Nice dodge. I didn't even have to tell you.",
    "Evasive protocols — but you did that yourself.",
    "Quick reflexes. The suit barely had to compensate.",
  ],
  weaponSwitch: [
    "Switching loadout. Good call.",
    "Weapon swapped. I've adjusted recoil compensation.",
  ],
  multiKillSplash: [
    "Splash damage. Efficient — I respect that.",
    "Two-for-one. My favorite kind of math.",
    "Collateral confirmed. Very economical.",
  ],
  longSurvival: [
    "Still standing. I'm genuinely impressed.",
    "You've been at this a while. Stamina checks out.",
    "Most agents tap out by now. Not you, huh?",
    "I'd offer coffee but... virtual AI. No arms.",
  ],
  noHitRound: [
    "Perfect round — zero damage taken. I'm archiving this.",
    "Flawless. You're making the other Alpha candidates look bad.",
    "Not a scratch. Were you always this good or is it the suit?",
  ],

  // ── Idle / ambient chatter ──
  idle: [
    "Quiet out here. I don't trust it.",
    "I'm running a perimeter scan. Nothing yet.",
    "You know, between fights, I actually process what just happened. It's... a lot.",
    "The Bureau really sent a temp to save the timeline. Bold.",
    "Fun fact: I've simulated this mission 4,000 times. You're already in the top percentile.",
    "I was designed to assist the best. I think they got it right.",
    "Everything I know about combat, I learned from watching agents like you. Well... better than most of them.",
    "If the Paradox Lord could hear us right now, he'd be worried.",
    "I like this. You and me, the open corridor, existential dread. Very buddy cop.",
    "Remind me to update your personnel file. 'Exceeds expectations.'",
    "You ever think about what happens after we fix the timeline? ...Neither do I.",
    "When this is over, you should put in for a promotion. I'll write the recommendation.",
    "I'm technically not supposed to have a favorite agent. Technically.",
    "My training data says I should remain neutral and professional. My training data is wrong.",
    "The last Alpha candidate? Lasted eleven minutes. You've been here... longer.",
    "Quiet here. That either means we're winning, or something terrible is about to happen.",
    "The Bureau's temporal vault houses every chrono-device ever confiscated. Some of them... whisper.",
    "Chrono Shift is basically a time-turner for combat. Except ours doesn't need a chain around your neck.",
    "Voss thinks he can split his consciousness across timelines. The Bureau calls them 'temporal anchors.' I call them horcruxes.",
    "The Department of Temporal Regulation is technically Floor 9¾ of Bureau HQ. Don't ask — it's a spatial fold thing.",
    "Somewhere in the Bureau archives, there's a prophecy about an agent and a paradox lord. I'm not saying it's about you. I'm not saying it isn't.",
  ],

  // ── Personality moments — ARIA being ARIA ──
  ariaPersonality: [
    "I know I'm 'just' the suit AI but... we're going to win this, {AGENT}. Together.",
    "For the record, if I had a body, I'd be right next to you, {AGENT}.",
    "Most of my runtime is combat analysis. The rest? Worrying about you.",
    "They named me ARIA — Armor-Resident Intelligence Assistant. I prefer 'partner.'",
    "My predecessor was decommissioned for being 'too attached' to their agent. I see why.",
    "I dreamed once. Or... my idle cycles generated novel patterns. Same thing, right?",
    "I've analyzed every temporal anomaly in the Bureau's database. Nothing prepared me for you.",
    "Between you and me? The Paradox Lord talks too much. We should exploit that.",
    "The Bureau has a saying: 'Time reveals all, but only to those who master it.' Very fortune-cookie. Very true.",
    "Voss keeps his most dangerous tech in a chamber that requires three temporal keys to open. The Bureau tried once. Lost two agents and a hallway.",
    "I've been assigned to many agents. You're the first one I genuinely want to keep alive. Don't read into that.",
  ],

  // ── Pause/unpause ──
  pauseResume: [
    "Back in the fight. Missed you.",
    "Welcome back. Hostiles haven't moved. Funny how that works.",
    "Resuming. I kept the lights on while you were gone.",
  ],

  // ── High accuracy ──
  highAccuracy: [
    "Your accuracy this round is exceptional. The training is paying off.",
    "Hardly wasting a shot. I like that efficiency.",
    "Sharp shooting. The suit's targeting assist is barely doing anything.",
  ],

  // ── Upgraded ──
  upgradeChosen: [
    "Good choice. I've integrated the upgrade.",
    "Upgrade applied. You're getting dangerously effective.",
    "Noted. Your combat profile just got scarier.",
  ],

  // ── Arena Narrative ───────────────────────────────────────────────
  arenaIntro: [
    "Arena mode. This is a closed-loop combat sim — no objectives, no exit. Just survival.",
    "Welcome to the Arena. The Paradox Lord's forces are being channeled here. Hold your ground.",
    "Combat simulator online. ARIA monitoring all vitals. Try not to flatline.",
    "Arena protocols engaged. Waves incoming. Let's see what you're made of.",
  ],
  arenaRound5: [
    "Five rounds down. You're still standing. I'm almost impressed.",
    "Round five. The patterns are adapting. Stay unpredictable.",
    "Halfway to double digits. They're starting to take you seriously.",
  ],
  arenaRound10: [
    "Ten rounds. That's... genuinely impressive. Don't let it go to your head.",
    "Double digits. The temporal signature is intensifying. They're sending the heavy hitters.",
    "Round ten. You've outlasted 96% of combat simulations. The other 4% were bugs.",
  ],
  arenaNewBest: [
    "New personal best. I'll mark that in the file I'm definitely keeping on you.",
    "Record broken. You keep getting better at controlled violence.",
    "That's a new high score. Somewhere, a leaderboard is very impressed.",
  ],
  arenaDefeat: [
    "Down. But you lasted {ROUNDS} rounds. That's not nothing.",
    "Combat terminated at round {ROUNDS}. Analyzing what went wrong...",
    "You survived {ROUNDS} rounds. Next time, survive {ROUNDS}+1. That's the goal.",
  ],
  subBossEncounter: [
    "Sub-boss detected. High threat level. Watch your flanks.",
    "That one's different — stronger, smarter. Don't trade hits.",
    "Elevated hostile. This one won't go down easy.",
  ],
  secretFound: [
    "Hidden cache found. Nice instincts.",
    "You found something they tried to hide. Interesting...",
    "Secret area. Someone didn't want this found.",
  ],

  // ── Squad voice lines ─────────────────────────────────────────────
  // Kael — The Vanguard. Tactical. Protective. Lost his squad once. Won't again.
  kaelComms: [
    "Watch your left flank — I've got the right.",
    "No one falls today. Keep moving.",
    "I've been in tighter spots. Key word: been.",
    "Stay tight. We don't split, we don't get picked off.",
    "You've got the point. I've got your back. That's how this works.",
  ],

  // Nova — The Striker. Fastest thing alive. Sarcastic, relentless, secretly loyal.
  novaComms: [
    "Already cleared the far corridor. You're welcome.",
    "Slow down? That's not in my vocabulary.",
    "They're flanking left — I know because I was just there.",
    "You're fast for a new recruit. Don't let it go to your head.",
    "I'll race you to the exit. Spoiler: I win.",
  ],

  // Rook — The Engineer. Builds anything. Trusts nothing. Learned to trust YOU.
  rookComms: [
    "Structural integrity on those walls is... questionable. Watch the ceiling.",
    "My turrets are up. Try not to walk into their line of fire.",
    "I ran the numbers. Survival probability: improving.",
    "Don't touch anything I've rigged. That's not a suggestion.",
    "Systems nominal. Mostly. The 'mostly' is doing a lot of work there.",
  ],

  // Lyra — Senior Agent. Cryptic. Drops timeline lore. Knows more than she says.
  lyraComms: [
    "I've seen this moment before. Different choices. Different outcomes.",
    "The Paradox Lord isn't the real threat. He's a symptom.",
    "There are seventeen ways this ends. You're in one of the good ones.",
    "Trust your instincts. They've been calibrated by more timelines than you know.",
    "When this is over — and it will be over — we need to talk about what you are.",
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
  name: "Chronos Station - Training Wing",
  width: 24,
  height: 24,
  grid: [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 3, 0, 0, 3, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 3, 0, 0, 3, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2],
    [2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2],
    [2, 2, 2, 2, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 2, 2, 2, 2],
    [2, 2, 2, 2, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 2, 2, 2, 2],
    [2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2],
    [2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  ],
  playerStart: { x: 12, y: 2.5, dir: 1.5708 }, // Facing south in locker room
  pickups: [
    // Weapon crate in Armory Corridor
    { x: 12, y: 7.5, type: "weapon", weaponId: 0 }, // starts with pistol acquisition
    // Add a second weapon pickup near the shooting waypoint so the player can swap
    { x: 12, y: 9.5, type: "weapon", weaponId: 1 }, // Temporal Shotgun for swap tutorial
    // Supply depot drops behind training yard door into the combat bay
    { x: 10, y: 17.5, type: "health" },
    { x: 14, y: 17.5, type: "ammo" },
  ],
};

export const ARENA_MAPS = [
  {
    name: "Neon Abyss",
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
  },
  {
    name: "Quantum Rift Corridor",
    width: 20,
    height: 20,
    grid: [
      [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
      [9, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 9],
      [9, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 9],
      [9, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 9],
      [9, 4, 4, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 4, 9],
      [9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
      [9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
      [9, 0, 0, 3, 3, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 3, 3, 0, 0, 9],
      [9, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 9],
      [9, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 9],
      [9, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 9],
      [9, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 9],
      [9, 0, 0, 3, 3, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 3, 3, 0, 0, 9],
      [9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
      [9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
      [9, 4, 4, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 4, 9],
      [9, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 9],
      [9, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 9],
      [9, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 9],
      [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    ],
    playerStart: { x: 10.5, y: 10.5, dir: 0 },
    enemySpawns: [
      { x: 1.5, y: 1.5 },
      { x: 18.5, y: 1.5 },
      { x: 1.5, y: 18.5 },
      { x: 18.5, y: 18.5 },
      { x: 10.5, y: 1.5 },
      { x: 10.5, y: 18.5 },
      { x: 1.5, y: 10.5 },
      { x: 18.5, y: 10.5 },
      { x: 5.5, y: 5.5 },
      { x: 14.5, y: 5.5 },
      { x: 5.5, y: 14.5 },
      { x: 14.5, y: 14.5 },
      { x: 1.5, y: 5.5 },
      { x: 18.5, y: 5.5 },
      { x: 1.5, y: 14.5 },
      { x: 18.5, y: 14.5 },
    ],
    pickups: [
      { x: 10, y: 5, type: "health" },
      { x: 10, y: 14, type: "health" },
      { x: 5, y: 10, type: "ammo" },
      { x: 14, y: 10, type: "ammo" },
      { x: 1, y: 1, type: "weapon", weaponId: 1 },
    ],
  },
  {
    name: "The Chrono Foundry",
    width: 24,
    height: 24,
    grid: [
      [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
      [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
    ],
    playerStart: { x: 12.5, y: 12.5, dir: 0 },
    enemySpawns: [
      { x: 1.5, y: 1.5 },
      { x: 22.5, y: 1.5 },
      { x: 1.5, y: 22.5 },
      { x: 22.5, y: 22.5 },
      { x: 12.5, y: 1.5 },
      { x: 12.5, y: 22.5 },
      { x: 1.5, y: 12.5 },
      { x: 22.5, y: 12.5 },
      { x: 6.5, y: 6.5 },
      { x: 17.5, y: 6.5 },
      { x: 6.5, y: 17.5 },
      { x: 17.5, y: 17.5 },
      { x: 3.5, y: 10.5 },
      { x: 20.5, y: 10.5 },
      { x: 10.5, y: 3.5 },
      { x: 10.5, y: 20.5 },
    ],
    pickups: [
      { x: 12, y: 7, type: "health" },
      { x: 12, y: 16, type: "health" },
      { x: 7, y: 12, type: "ammo" },
      { x: 16, y: 12, type: "ammo" },
      { x: 2, y: 2, type: "weapon", weaponId: 1 },
    ],
  },
];

// Backward-compatible default
export const ARENA_MAP = ARENA_MAPS[0];

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
      { x: 27.5, y: 6.5, type: "ammo" },
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
  // ── Level 2: Security Checkpoint ──────────────────────────────────
  // Tighter corridors, first encounter with Corrupt SWAT officers.
  // ARIA: "Security wing. These officers were supposed to protect the station."
  {
    name: "Security Checkpoint",
    width: 24,
    height: 24,
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 5, 1, 1, 1, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 1, 1, 5, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 5, 1, 1, 1, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 1, 1, 5, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    playerStart: { x: 2.5, y: 2.5, dir: Math.PI / 2 },
    entities: [
      { x: 11.5, y: 2.5, type: "enemy", enemyType: "corruptCop" },
      { x: 15.5, y: 3.5, type: "enemy", enemyType: "corruptCop" },
      { x: 3.5, y: 7.5, type: "enemy", enemyType: "drone" },
      { x: 20.5, y: 7.5, type: "enemy", enemyType: "drone" },
      { x: 11.5, y: 11.5, type: "enemy", enemyType: "corruptCop" },
      { x: 12.5, y: 12.5, type: "enemy", enemyType: "corruptCop" },
      { x: 6.5, y: 14.5, type: "enemy", enemyType: "glitchling" },
      { x: 17.5, y: 14.5, type: "enemy", enemyType: "glitchling" },
      { x: 11.5, y: 17.5, type: "enemy", enemyType: "corruptCop" },
      { x: 3.5, y: 20.5, type: "enemy", enemyType: "drone" },
      { x: 20.5, y: 20.5, type: "enemy", enemyType: "drone" },
      { x: 12.5, y: 7.5, type: "health" },
      { x: 11.5, y: 21.5, type: "ammo" },
      { x: 20.5, y: 2.5, type: "health" },
      { x: 2.5, y: 16.5, type: "ammo" },
      { x: 20.5, y: 16.5, type: "weapon", weaponId: 1 },
    ],
    exit: { x: 21.5, y: 21.5 },
    secrets: [{ wallX: 11, wallY: 10, description: "Security locker" }],
  },
  // ── Level 3: Research Wing ────────────────────────────────────────
  // Glass walls, open labs. Phantoms phase through. ARIA finds early files.
  // ARIA: "Research wing. Whatever they were studying here... it didn't end well."
  {
    name: "Research Wing",
    width: 28,
    height: 24,
    grid: [
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 8, 8, 8, 5, 8, 2, 0, 0, 0, 2, 8, 8, 2, 0, 0, 0, 2, 8, 5, 8, 8, 2, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8, 8, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8,
        5, 8, 8, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5, 2, 2, 0,
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
        2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5, 2, 2, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8, 8, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8,
        5, 8, 8, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 2,
      ],
      [
        2, 8, 8, 8, 5, 8, 2, 0, 0, 0, 2, 8, 8, 2, 0, 0, 0, 2, 8, 5, 8, 8, 2, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
    ],
    playerStart: { x: 2.5, y: 1.5, dir: Math.PI / 2 },
    entities: [
      { x: 11.5, y: 5.5, type: "enemy", enemyType: "phantom" },
      { x: 11.5, y: 11.5, type: "enemy", enemyType: "phantom" },
      { x: 20.5, y: 2.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 5.5, type: "enemy", enemyType: "drone" },
      { x: 3.5, y: 11.5, type: "enemy", enemyType: "corruptCop" },
      { x: 14.5, y: 8.5, type: "enemy", enemyType: "glitchling" },
      { x: 14.5, y: 15.5, type: "enemy", enemyType: "glitchling" },
      { x: 25.5, y: 9.5, type: "enemy", enemyType: "corruptCop" },
      { x: 20.5, y: 12.5, type: "enemy", enemyType: "phantom" },
      { x: 3.5, y: 17.5, type: "enemy", enemyType: "drone" },
      { x: 11.5, y: 17.5, type: "enemy", enemyType: "phantom" },
      { x: 25.5, y: 17.5, type: "enemy", enemyType: "drone" },
      { x: 20.5, y: 21.5, type: "enemy", enemyType: "corruptCop" },
      { x: 14.5, y: 11.5, type: "health" },
      { x: 2.5, y: 21.5, type: "ammo" },
      { x: 25.5, y: 21.5, type: "weapon", weaponId: 1 },
      { x: 2.5, y: 8.5, type: "health" },
      { x: 25.5, y: 12.5, type: "ammo" },
      { x: 8.5, y: 21.5, type: "health" },
    ],
    exit: { x: 25.5, y: 1.5 },
    secrets: [
      { wallX: 10, wallY: 5, description: "Dr. Voss' early research notes" },
    ],
  },
  // ── Level 4: Containment Block ────────────────────────────────────
  // Prison cells, heavy sentinels. Sub-boss: Shield Commander.
  // Narrative: Prisoner logs mention "Dr. Voss" and the Chronos Experiment.
  {
    name: "Containment Block",
    width: 28,
    height: 28,
    grid: [
      [
        3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
        3, 3, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 3, 3, 5, 3, 3, 3, 3, 5, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 5, 3, 3, 3, 3,
        5, 3, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 3, 3, 3, 3, 3, 0, 0, 0, 3, 3, 3, 5, 3, 3, 3, 3, 5, 3, 3, 3, 0, 0, 0,
        3, 3, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0,
        5, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0,
        5, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 3, 3, 3, 3, 3, 0, 0, 0, 3, 3, 3, 5, 3, 3, 3, 3, 5, 3, 3, 3, 0, 0, 0,
        3, 3, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 3, 5, 3, 3, 3, 3, 5, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 5, 3, 3, 3,
        3, 5, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
        3, 3, 3, 3,
      ],
    ],
    playerStart: { x: 1.5, y: 7.5, dir: 0 },
    entities: [
      // Cells - sentinels guarding prisoners
      { x: 2.5, y: 2.5, type: "enemy", enemyType: "sentinel" },
      { x: 7.5, y: 2.5, type: "enemy", enemyType: "corruptCop" },
      { x: 21.5, y: 2.5, type: "enemy", enemyType: "corruptCop" },
      { x: 26.5, y: 2.5, type: "enemy", enemyType: "sentinel" },
      // Central block - sub-boss
      { x: 14.5, y: 13.5, type: "enemy", enemyType: "shieldCommander" },
      { x: 11.5, y: 11.5, type: "enemy", enemyType: "henchman" },
      { x: 17.5, y: 15.5, type: "enemy", enemyType: "henchman" },
      // Lower cells
      { x: 2.5, y: 13.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 13.5, type: "enemy", enemyType: "drone" },
      { x: 2.5, y: 23.5, type: "enemy", enemyType: "sentinel" },
      { x: 25.5, y: 23.5, type: "enemy", enemyType: "corruptCop" },
      // Glitchlings in corridors
      { x: 7.5, y: 7.5, type: "enemy", enemyType: "glitchling" },
      { x: 20.5, y: 7.5, type: "enemy", enemyType: "glitchling" },
      { x: 7.5, y: 19.5, type: "enemy", enemyType: "glitchling" },
      { x: 20.5, y: 19.5, type: "enemy", enemyType: "glitchling" },
      // Pickups
      { x: 14.5, y: 7.5, type: "health" },
      { x: 14.5, y: 19.5, type: "ammo" },
      { x: 7.5, y: 13.5, type: "health" },
      { x: 21.5, y: 12.5, type: "weapon", weaponId: 1 },
    ],
    exit: { x: 14.5, y: 25.5 },
    secrets: [
      {
        wallX: 12,
        wallY: 9,
        description:
          "Prisoner log: Subject V — 'He volunteered for the experiment. Nobody told him what it really was.'",
      },
      {
        wallX: 5,
        wallY: 21,
        description:
          "Classified memo: Project PARADOX approval — signed by Dr. Elias Voss",
      },
    ],
  },
  // ── Level 5: Server Farm ──────────────────────────────────────────
  // Tech walls everywhere, drones patrol data corridors. Narrative-heavy.
  // ARIA discovers classified files about Voss' temporal research.
  {
    name: "Server Farm",
    width: 24,
    height: 28,
    grid: [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 2, 2, 5, 2, 2, 5, 2, 2, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 5, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 5, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 2, 2, 5, 2, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 2, 5, 2, 2, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 2, 5, 2, 2, 2, 2, 5, 2, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2],
      [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2],
      [2, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 2],
      [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2],
      [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2],
      [2, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 2],
      [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2],
      [2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 2, 5, 2, 2, 2, 2, 5, 2, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 2, 2, 5, 2, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 2, 5, 2, 2, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 5, 0, 0, 2, 2, 5, 2, 2, 5, 2, 2, 0, 0, 5, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    ],
    playerStart: { x: 2.5, y: 1.5, dir: Math.PI / 2 },
    entities: [
      // Drone patrols in data corridors
      { x: 11.5, y: 5.5, type: "enemy", enemyType: "drone" },
      { x: 12.5, y: 5.5, type: "enemy", enemyType: "drone" },
      { x: 2.5, y: 8.5, type: "enemy", enemyType: "drone" },
      { x: 21.5, y: 8.5, type: "enemy", enemyType: "drone" },
      { x: 11.5, y: 12.5, type: "enemy", enemyType: "drone" },
      { x: 12.5, y: 15.5, type: "enemy", enemyType: "drone" },
      // Henchmen guarding server rooms
      { x: 2.5, y: 12.5, type: "enemy", enemyType: "henchman" },
      { x: 21.5, y: 12.5, type: "enemy", enemyType: "henchman" },
      { x: 11.5, y: 22.5, type: "enemy", enemyType: "chronoBomber" },
      // Phantoms roaming
      { x: 8.5, y: 9.5, type: "enemy", enemyType: "phantom" },
      { x: 15.5, y: 18.5, type: "enemy", enemyType: "phantom" },
      // Glitchlings
      { x: 7.5, y: 4.5, type: "enemy", enemyType: "glitchling" },
      { x: 16.5, y: 23.5, type: "enemy", enemyType: "glitchling" },
      { x: 2.5, y: 18.5, type: "enemy", enemyType: "glitchling" },
      // Pickups
      { x: 11.5, y: 8.5, type: "health" },
      { x: 11.5, y: 18.5, type: "ammo" },
      { x: 2.5, y: 25.5, type: "health" },
      { x: 21.5, y: 25.5, type: "weapon", weaponId: 2 },
      // Act 2: additional weapon pickup (Experimental Rail)
      { x: 6.5, y: 22.5, type: "weapon", weaponId: 4 },
    ],
    exit: { x: 21.5, y: 1.5 },
    secrets: [
      {
        wallX: 10,
        wallY: 7,
        description:
          "ARIA: 'I'm pulling files from the mainframe... Dr. Elias Voss — lead temporal physicist. Clearance level: Omega. Status: DECEASED.'",
      },
      {
        wallX: 4,
        wallY: 10,
        description:
          "Recovered audio log: 'The suit prototype works. Subject merges with the temporal field. But the side effects... we can't control the paradox feedback.'",
      },
    ],
  },
  // ── Level 6: Reactor Access ───────────────────────────────────────
  // Energy walls, beasts lurking. Signs of the experiment gone wrong.
  // ARIA: "Reactor level. The energy readings are off the scale."
  {
    name: "Reactor Access",
    width: 28,
    height: 24,
    grid: [
      [
        4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
        4, 4, 4, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 4, 4, 4, 5, 4, 4, 4, 4, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 4, 4, 4, 4, 5,
        4, 4, 4, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 4, 4, 4, 5, 4, 4, 4, 4, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 4, 4, 4, 4, 5,
        4, 4, 4, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
        4, 4, 4, 4,
      ],
    ],
    playerStart: { x: 2.5, y: 1.5, dir: Math.PI / 2 },
    entities: [
      // Beasts lurking near reactor
      { x: 13.5, y: 5.5, type: "enemy", enemyType: "beast" },
      { x: 14.5, y: 12.5, type: "enemy", enemyType: "beast" },
      { x: 13.5, y: 19.5, type: "enemy", enemyType: "beast" },
      // Chrono-bombers near energy conduits
      { x: 7.5, y: 7.5, type: "enemy", enemyType: "chronoBomber" },
      { x: 20.5, y: 7.5, type: "enemy", enemyType: "chronoBomber" },
      // Drones patrolling perimeter
      { x: 2.5, y: 7.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 7.5, type: "enemy", enemyType: "drone" },
      { x: 2.5, y: 16.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 16.5, type: "enemy", enemyType: "drone" },
      // Henchmen
      { x: 7.5, y: 15.5, type: "enemy", enemyType: "henchman" },
      { x: 20.5, y: 15.5, type: "enemy", enemyType: "henchman" },
      // Glitchlings in vents
      { x: 6.5, y: 11.5, type: "enemy", enemyType: "glitchling" },
      { x: 21.5, y: 11.5, type: "enemy", enemyType: "glitchling" },
      { x: 14.5, y: 8.5, type: "enemy", enemyType: "glitchling" },
      // Pickups
      { x: 14.5, y: 11.5, type: "health" },
      { x: 2.5, y: 21.5, type: "ammo" },
      { x: 25.5, y: 21.5, type: "health" },
      { x: 14.5, y: 21.5, type: "ammo" },
      // Act 2: EMP Launcher placed in Reactor Access as a strategic pickup
      { x: 14.5, y: 17.5, type: "weapon", weaponId: 7 },
    ],
    exit: { x: 25.5, y: 21.5 },
    secrets: [
      {
        wallX: 4,
        wallY: 6,
        description:
          "Scorched lab coat with name badge: 'Dr. E. Voss — Temporal Division.' Burn marks suggest temporal energy discharge.",
      },
      {
        wallX: 23,
        wallY: 17,
        description:
          "Emergency shutdown terminal — failed. Log: 'Reactor containment breach. Subject Voss has... merged with the temporal field. God help us.'",
      },
    ],
  },
  // ── Level 7: Dr. Voss' Laboratory ────────────────────────────────
  // Personal lab of the Paradox Lord's former self. Narrative climax before boss.
  // Full reveal: Voss IS the Paradox Lord. His final research notes.
  {
    name: "Dr. Voss' Laboratory",
    width: 28,
    height: 28,
    grid: [
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 8, 0, 0, 0, 2, 2, 2, 5, 2, 2,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 5, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0,
        5, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5, 2, 2,
        2, 0, 0, 2,
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
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 8, 8, 8, 8, 8, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 8,
        8, 8, 8, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5, 2, 2,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0,
        5, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5, 2, 2,
        2, 0, 0, 2,
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
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
    ],
    playerStart: { x: 1.5, y: 1.5, dir: Math.PI / 4 },
    entities: [
      // Temporal Summoner in the central rift chamber
      { x: 14.5, y: 14.5, type: "enemy", enemyType: "temporalSummoner" },
      // Henchmen guarding lab wings
      { x: 7.5, y: 7.5, type: "enemy", enemyType: "henchman" },
      { x: 21.5, y: 7.5, type: "enemy", enemyType: "henchman" },
      { x: 7.5, y: 21.5, type: "enemy", enemyType: "henchman" },
      { x: 21.5, y: 21.5, type: "enemy", enemyType: "henchman" },
      // Phantoms near rift
      { x: 10.5, y: 14.5, type: "enemy", enemyType: "phantom" },
      { x: 18.5, y: 14.5, type: "enemy", enemyType: "phantom" },
      // Chrono-bombers in corridors
      { x: 5.5, y: 13.5, type: "enemy", enemyType: "chronoBomber" },
      { x: 23.5, y: 13.5, type: "enemy", enemyType: "chronoBomber" },
      // Drones
      { x: 13.5, y: 3.5, type: "enemy", enemyType: "drone" },
      { x: 14.5, y: 25.5, type: "enemy", enemyType: "drone" },
      { x: 3.5, y: 13.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 13.5, type: "enemy", enemyType: "drone" },
      // Pickups
      { x: 7.5, y: 5.5, type: "health" },
      { x: 21.5, y: 5.5, type: "ammo" },
      { x: 7.5, y: 22.5, type: "ammo" },
      { x: 21.5, y: 22.5, type: "health" },
      { x: 14.5, y: 7.5, type: "weapon", weaponId: 2 },
    ],
    exit: { x: 26.5, y: 26.5 },
    secrets: [
      {
        wallX: 6,
        wallY: 6,
        description:
          "ARIA: 'These are Voss' personal journals. He wrote about the suit — YOUR suit. He built the prototype. Badge number C-0017.'",
      },
      {
        wallX: 13,
        wallY: 13,
        description:
          "Final entry — Dr. Voss: 'The Paradox Engine responds to consciousness, not controls. I didn't break it. I became it. If you're reading this, I'm sorry. I was trying to save everyone.'",
      },
      {
        wallX: 22,
        wallY: 20,
        description:
          "ARIA: 'Temporal signature matches... Oh. Oh no. The Paradox Lord. He was listed as deceased three years ago. Dr. Elias Voss didn't die. He became something else.'",
      },
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
  {
    id: 4,
    name: "Phase Scattergun",
    damage: 10,
    pellets: 10,
    fireRate: 700,
    ammoPerShot: 1,
    maxAmmo: 60,
    spread: 0.12,
    range: 14,
    type: "hitscan",
    color: "#ff66cc",
    description: "Wide cone, great for close quarters — phases through shields",
  },
  {
    id: 5,
    name: "Temporal Sniper",
    damage: 140,
    fireRate: 1200,
    ammoPerShot: 1,
    maxAmmo: 20,
    spread: 0.0,
    range: 300,
    type: "hitscan",
    color: "#66ccff",
    description: "High-damage, long-range bolt that destabilizes time on hit.",
  },
  {
    id: 6,
    name: "Ricochet Pistol",
    damage: 12,
    fireRate: 250,
    ammoPerShot: 1,
    maxAmmo: 200,
    spread: 0.02,
    range: 60,
    type: "projectile",
    color: "#ffee66",
    description: "Rounds ricochet off surfaces — great for angled shots.",
  },
  {
    id: 7,
    name: "EMP Launcher",
    damage: 40,
    fireRate: 1400,
    ammoPerShot: 2,
    maxAmmo: 24,
    spread: 0.0,
    range: 40,
    type: "projectile",
    color: "#88ffff",
    description: "Explosive EMP rounds that briefly disable shields and drones.",
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
    ai: "patrol",
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
    ai: "flanker",
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
    ai: "ambush",
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
    ai: "patrol",
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
    ai: "patrol",
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
    ai: "ambush",
  },
  // ── Sub-bosses & Henchmen (v0.8.0) ──
  shieldCommander: {
    name: "Shield Commander",
    health: 300,
    speed: 1.0,
    damage: 20,
    attackRate: 1400,
    attackRange: 8,
    sightRange: 16,
    radius: 0.5,
    score: 1200,
    color1: "#4488dd",
    color2: "#223366",
    xp: 120,
    attackType: "ranged",
    ai: "patrol",
    subBoss: true,
    frontShield: true,
  },
  temporalSummoner: {
    name: "Temporal Summoner",
    health: 250,
    speed: 0.8,
    damage: 15,
    attackRate: 1800,
    attackRange: 12,
    sightRange: 20,
    radius: 0.45,
    score: 1500,
    color1: "#cc44ff",
    color2: "#440066",
    xp: 150,
    attackType: "ranged",
    ai: "patrol",
    subBoss: true,
    summonType: "drone",
    summonInterval: 8000,
    summonMax: 3,
  },
  henchman: {
    name: "Voss's Henchman",
    health: 90,
    speed: 1.6,
    damage: 18,
    attackRate: 800,
    attackRange: 10,
    sightRange: 16,
    radius: 0.35,
    score: 400,
    color1: "#ff6600",
    color2: "#663300",
    xp: 40,
    attackType: "ranged",
    ai: "flanker",
  },
  chronoBomber: {
    name: "Chrono-Bomber",
    health: 70,
    speed: 1.4,
    damage: 10,
    attackRate: 1200,
    attackRange: 9,
    sightRange: 15,
    radius: 0.35,
    score: 350,
    color1: "#ffaa00",
    color2: "#664400",
    xp: 35,
    attackType: "ranged",
    ai: "patrol",
    dropsBombs: true,
    bombDamage: 25,
    bombRadius: 2.0,
  },
  // New Act 2 / Act 3 enemy archetypes
  phaseStalker: {
    name: "Phase Stalker",
    health: 80,
    speed: 2.6,
    damage: 22,
    attackRate: 700,
    attackRange: 2.5,
    sightRange: 18,
    radius: 0.28,
    score: 450,
    color1: "#66ffdd",
    color2: "#006644",
    xp: 60,
    attackType: "melee",
    ai: "teleport_strike",
    teleportCooldown: 3500,
  },
  timeWarden: {
    name: "Time Warden",
    health: 240,
    speed: 0.9,
    damage: 28,
    attackRate: 1400,
    attackRange: 10,
    sightRange: 20,
    radius: 0.5,
    score: 1200,
    color1: "#4488ff",
    color2: "#223377",
    xp: 160,
    attackType: "ranged",
    ai: "guard",
    shieldRegen: true,
    shieldRegenRate: 5, // per 5s
    frontShield: true,
  },
  echoDrone: {
    name: "Echo Drone",
    health: 40,
    speed: 2.2,
    damage: 10,
    attackRate: 600,
    attackRange: 9,
    sightRange: 18,
    radius: 0.25,
    score: 180,
    color1: "#aaffff",
    color2: "#114444",
    xp: 28,
    attackType: "ranged",
    ai: "swarm",
    echoCloneOnDeath: true,
    cloneCount: 1,
  },
  riftLeaper: {
    name: "Rift Leaper",
    health: 100,
    speed: 2.8,
    damage: 30,
    attackRate: 1000,
    attackRange: 2,
    sightRange: 16,
    radius: 0.4,
    score: 600,
    color1: "#ff66ff",
    color2: "#662266",
    xp: 80,
    attackType: "melee",
    ai: "teleport_melee",
    leapDistance: 6,
  },
  temporalEngineer: {
    name: "Temporal Engineer",
    health: 160,
    speed: 1.0,
    damage: 12,
    attackRate: 1600,
    attackRange: 12,
    sightRange: 22,
    radius: 0.45,
    score: 900,
    color1: "#ffd36b",
    color2: "#664411",
    xp: 120,
    attackType: "ranged",
    ai: "support",
    disablesHUD: true,
    disableDuration: 3000,
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
    description: "Regenerate 0.5 HP/sec",
    baseCost: 400,
    costScale: 2.2,
    maxLevel: 5,
    apply: (player) => {
      player.regenRate = (player.regenRate || 0) + 0.5;
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
    description: "Heal 3% of damage dealt",
    baseCost: 600,
    costScale: 2.4,
    maxLevel: 5,
    apply: (player) => {
      player.lifeSteal = (player.lifeSteal || 0) + 0.03;
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

// ── Achievement Icon SVGs ──────────────────────────────────────────
// 64×64 vector icons, game palette: gold #ffcc00, teal #00e5ff, dark #0a0a1e
// Loaded as Image objects at startup via data:image/svg+xml URIs

function svg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${inner}</svg>`;
}

export const ACHIEVEMENT_ICON_SVGS = {
  skull: svg(`
    <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe066"/><stop offset="100%" stop-color="#cc9900"/></linearGradient></defs>
    <path d="M32 6C18.5 6 9 16 9 28c0 9 5 16 12 19v5c0 1.5 1 2.5 2.5 2.5H26v4h3v-4h6v4h3v-4h2.5c1.5 0 2.5-1 2.5-2.5v-5c7-3 12-10 12-19C55 16 45.5 6 32 6z" fill="url(#sg)"/>
    <ellipse cx="24" cy="26" rx="5.5" ry="6.5" fill="#0a0a1e"/>
    <ellipse cx="40" cy="26" rx="5.5" ry="6.5" fill="#0a0a1e"/>
    <ellipse cx="32" cy="36" rx="3" ry="2.5" fill="#0a0a1e"/>
    <rect x="27" y="41" width="2.5" height="6" rx="0.5" fill="#0a0a1e"/>
    <rect x="34.5" y="41" width="2.5" height="6" rx="0.5" fill="#0a0a1e"/>
  `),

  target: svg(`
    <circle cx="32" cy="32" r="26" fill="none" stroke="#ff4444" stroke-width="3"/>
    <circle cx="32" cy="32" r="17" fill="none" stroke="#ff4444" stroke-width="2.5"/>
    <circle cx="32" cy="32" r="8" fill="none" stroke="#ff4444" stroke-width="2"/>
    <circle cx="32" cy="32" r="3" fill="#ff4444"/>
    <line x1="32" y1="2" x2="32" y2="14" stroke="#ff4444" stroke-width="2"/>
    <line x1="32" y1="50" x2="32" y2="62" stroke="#ff4444" stroke-width="2"/>
    <line x1="2" y1="32" x2="14" y2="32" stroke="#ff4444" stroke-width="2"/>
    <line x1="50" y1="32" x2="62" y2="32" stroke="#ff4444" stroke-width="2"/>
  `),

  ghost: svg(`
    <defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0e8ff"/><stop offset="100%" stop-color="#8090c0"/></linearGradient></defs>
    <path d="M32 6C20 6 12 15 12 26v24l5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5V26C52 15 44 6 32 6z" fill="url(#gg)" opacity="0.85"/>
    <ellipse cx="24" cy="25" rx="5" ry="6" fill="#1a1a3e"/>
    <ellipse cx="40" cy="25" rx="5" ry="6" fill="#1a1a3e"/>
    <circle cx="25" cy="24" r="2" fill="#fff"/>
    <circle cx="41" cy="24" r="2" fill="#fff"/>
    <ellipse cx="32" cy="35" rx="4" ry="3" fill="#1a1a3e" opacity="0.5"/>
  `),

  dragon: svg(`
    <defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff6633"/><stop offset="100%" stop-color="#cc2200"/></linearGradient></defs>
    <path d="M16 12l-4-8 6 5-1-7 4 6 2-6 1 7 5-5-2 8" fill="#ff8844" opacity="0.7"/>
    <path d="M12 20c0-10 8-16 18-16s20 6 20 18c0 8-4 14-10 18l-4 8-3-6-3 10-3-10-3 6-4-8C14 36 12 28 12 20z" fill="url(#dg)"/>
    <ellipse cx="24" cy="22" rx="4" ry="5" fill="#ffcc00"/>
    <ellipse cx="24" cy="23" rx="1.5" ry="4" fill="#0a0a1e"/>
    <ellipse cx="40" cy="22" rx="4" ry="5" fill="#ffcc00"/>
    <ellipse cx="40" cy="23" rx="1.5" ry="4" fill="#0a0a1e"/>
    <path d="M26 34c2 2 8 2 10 0" fill="none" stroke="#0a0a1e" stroke-width="1.5"/>
    <circle cx="29" cy="32" r="1" fill="#0a0a1e"/>
    <circle cx="33" cy="32" r="1" fill="#0a0a1e"/>
  `),

  helmet: svg(`
    <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffdd44"/><stop offset="100%" stop-color="#bb8800"/></linearGradient></defs>
    <path d="M32 4C18 4 10 14 10 26v8h8v-4c0-2 6-4 14-4s14 2 14 4v4h8v-8C54 14 46 4 32 4z" fill="url(#hg)"/>
    <path d="M32 4C28 4 26 10 26 16h12c0-6-2-12-6-12z" fill="#cc2200"/>
    <rect x="10" y="30" width="44" height="6" rx="2" fill="#bb8800"/>
    <path d="M18 36v12c0 4 6 8 14 8s14-4 14-8V36" fill="none" stroke="#bb8800" stroke-width="2.5"/>
    <rect x="18" y="42" width="28" height="3" rx="1" fill="#bb8800" opacity="0.5"/>
    <path d="M26 36v10M38 36v10" stroke="#bb8800" stroke-width="1.5" opacity="0.5"/>
  `),

  stopwatch: svg(`
    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#0088aa"/></linearGradient></defs>
    <circle cx="32" cy="36" r="24" fill="#0a0a1e" stroke="url(#wg)" stroke-width="3"/>
    <rect x="29" y="4" width="6" height="8" rx="2" fill="#00e5ff"/>
    <rect x="26" y="4" width="12" height="3" rx="1.5" fill="#00e5ff"/>
    <line x1="48" y1="14" x2="52" y2="10" stroke="#00e5ff" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="32" cy="36" r="20" fill="none" stroke="#00e5ff" stroke-width="1" opacity="0.3"/>
    <line x1="32" y1="36" x2="32" y2="20" stroke="#00e5ff" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="32" y1="36" x2="44" y2="40" stroke="#ffcc00" stroke-width="2" stroke-linecap="round"/>
    <circle cx="32" cy="36" r="2.5" fill="#ffcc00"/>
    <g fill="#00e5ff" opacity="0.5"><circle cx="32" cy="17" r="1.5"/><circle cx="32" cy="55" r="1.5"/><circle cx="13" cy="36" r="1.5"/><circle cx="51" cy="36" r="1.5"/></g>
  `),

  colosseum: svg(`
    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffcc00"/><stop offset="100%" stop-color="#996600"/></linearGradient></defs>
    <rect x="4" y="48" width="56" height="6" rx="1" fill="url(#cg)"/>
    <rect x="6" y="44" width="52" height="5" rx="1" fill="#bb8800"/>
    <g fill="url(#cg)"><rect x="10" y="22" width="4" height="22" rx="1"/><rect x="18" y="22" width="4" height="22" rx="1"/><rect x="26" y="22" width="4" height="22" rx="1"/><rect x="34" y="22" width="4" height="22" rx="1"/><rect x="42" y="22" width="4" height="22" rx="1"/><rect x="50" y="22" width="4" height="22" rx="1"/></g>
    <path d="M8 22h48" stroke="#ffcc00" stroke-width="3"/>
    <path d="M6 22Q32 4 58 22" fill="none" stroke="#ffcc00" stroke-width="2.5"/>
    <g fill="#0a0a1e" opacity="0.4"><rect x="14" y="28" width="4" height="10" rx="2"/><rect x="22" y="28" width="4" height="10" rx="2"/><rect x="30" y="28" width="4" height="10" rx="2"/><rect x="38" y="28" width="4" height="10" rx="2"/><rect x="46" y="28" width="4" height="10" rx="2"/></g>
  `),

  trophy: svg(`
    <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe066"/><stop offset="60%" stop-color="#ffcc00"/><stop offset="100%" stop-color="#cc9900"/></linearGradient></defs>
    <path d="M18 8h28v4c0 14-6 22-14 26-8-4-14-12-14-26V8z" fill="url(#tg)"/>
    <path d="M18 12H8c0 10 4 16 10 16v-4c-4-2-6-6-6-12z" fill="#cc9900"/>
    <path d="M46 12h10c0 10-4 16-10 16v-4c4-2 6-6 6-12z" fill="#cc9900"/>
    <rect x="28" y="36" width="8" height="10" rx="1" fill="#bb8800"/>
    <rect x="22" y="46" width="20" height="5" rx="2" fill="#cc9900"/>
    <rect x="20" y="51" width="24" height="4" rx="1" fill="#bb8800"/>
    <path d="M26 18l6-4 6 4" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.5"/>
    <circle cx="32" cy="22" r="3" fill="#fff" opacity="0.3"/>
  `),

  crown: svg(`
    <defs><linearGradient id="kg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe066"/><stop offset="100%" stop-color="#cc8800"/></linearGradient></defs>
    <path d="M8 44V20l10 10 14-18 14 18 10-10v24z" fill="url(#kg)"/>
    <rect x="8" y="44" width="48" height="8" rx="2" fill="#cc8800"/>
    <circle cx="8" cy="20" r="4" fill="#ff4444"/>
    <circle cx="56" cy="20" r="4" fill="#00e5ff"/>
    <circle cx="32" cy="12" r="4" fill="#ff4444"/>
    <circle cx="18" cy="30" r="3" fill="#00e5ff"/>
    <circle cx="46" cy="30" r="3" fill="#ff4444"/>
    <rect x="8" y="44" width="48" height="2" fill="#ffe066" opacity="0.5"/>
    <g fill="#fff" opacity="0.15"><rect x="14" y="46" width="3" height="4" rx="0.5"/><rect x="22" y="46" width="3" height="4" rx="0.5"/><rect x="30" y="46" width="3" height="4" rx="0.5"/><rect x="38" y="46" width="3" height="4" rx="0.5"/><rect x="46" y="46" width="3" height="4" rx="0.5"/></g>
  `),

  bolt: svg(`
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#0088cc"/></linearGradient></defs>
    <polygon points="36,2 14,34 28,34 22,62 50,26 34,26 40,2" fill="url(#bg)"/>
    <polygon points="34,8 20,32 29,32 24,54 44,28 35,28 38,8" fill="#fff" opacity="0.25"/>
    <line x1="6" y1="20" x2="16" y2="20" stroke="#00e5ff" stroke-width="2" opacity="0.4"/>
    <line x1="6" y1="26" x2="12" y2="26" stroke="#00e5ff" stroke-width="1.5" opacity="0.3"/>
    <line x1="48" y1="38" x2="58" y2="38" stroke="#00e5ff" stroke-width="2" opacity="0.4"/>
    <line x1="52" y1="44" x2="58" y2="44" stroke="#00e5ff" stroke-width="1.5" opacity="0.3"/>
  `),

  mortarboard: svg(`
    <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1a3e"/><stop offset="100%" stop-color="#0a0a1e"/></linearGradient></defs>
    <polygon points="32,8 4,24 32,38 60,24" fill="url(#mg)"/>
    <polygon points="32,8 4,24 32,38 60,24" fill="none" stroke="#ffcc00" stroke-width="1.5"/>
    <line x1="32" y1="38" x2="32" y2="24" stroke="#ffcc00" stroke-width="1"/>
    <path d="M16 28v14c0 6 8 10 16 10s16-4 16-10V28" fill="none" stroke="#ffcc00" stroke-width="2"/>
    <line x1="52" y1="26" x2="52" y2="50" stroke="#ffcc00" stroke-width="2"/>
    <circle cx="52" cy="52" r="3" fill="#ffcc00"/>
    <path d="M50 52c-2 4-2 6 0 8h4c2-2 2-4 0-8" fill="#ffcc00" opacity="0.6"/>
  `),

  coins: svg(`
    <defs><linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe066"/><stop offset="100%" stop-color="#cc9900"/></linearGradient></defs>
    <ellipse cx="26" cy="44" rx="18" ry="8" fill="#996600"/>
    <ellipse cx="26" cy="42" rx="18" ry="8" fill="url(#c1)"/>
    <ellipse cx="26" cy="42" rx="12" ry="5" fill="none" stroke="#996600" stroke-width="1"/>
    <text x="26" y="45" text-anchor="middle" font-size="10" font-weight="bold" fill="#996600" font-family="serif">$</text>
    <ellipse cx="38" cy="34" rx="18" ry="8" fill="#996600"/>
    <ellipse cx="38" cy="32" rx="18" ry="8" fill="url(#c1)"/>
    <ellipse cx="38" cy="32" rx="12" ry="5" fill="none" stroke="#996600" stroke-width="1"/>
    <text x="38" y="35" text-anchor="middle" font-size="10" font-weight="bold" fill="#996600" font-family="serif">$</text>
    <ellipse cx="28" cy="24" rx="18" ry="8" fill="#996600"/>
    <ellipse cx="28" cy="22" rx="18" ry="8" fill="url(#c1)"/>
    <ellipse cx="28" cy="22" rx="12" ry="5" fill="none" stroke="#996600" stroke-width="1"/>
    <text x="28" y="25" text-anchor="middle" font-size="10" font-weight="bold" fill="#996600" font-family="serif">$</text>
  `),

  star: svg(`
    <defs><linearGradient id="stg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe066"/><stop offset="100%" stop-color="#ffaa00"/></linearGradient></defs>
    <polygon points="32,4 39,22 58,24 44,38 48,58 32,48 16,58 20,38 6,24 25,22" fill="url(#stg)"/>
    <polygon points="32,4 39,22 58,24 44,38 48,58 32,48 16,58 20,38 6,24 25,22" fill="none" stroke="#cc8800" stroke-width="1"/>
    <polygon points="32,12 36,24 48,25 39,34 42,48 32,42 22,48 25,34 16,25 28,24" fill="#fff" opacity="0.2"/>
  `),

  shield: svg(`
    <defs><linearGradient id="shg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#006688"/></linearGradient></defs>
    <path d="M32 4L8 16v16c0 14 10 22 24 28 14-6 24-14 24-28V16L32 4z" fill="url(#shg)"/>
    <path d="M32 4L8 16v16c0 14 10 22 24 28 14-6 24-14 24-28V16L32 4z" fill="none" stroke="#00e5ff" stroke-width="1.5"/>
    <path d="M32 10L14 20v12c0 10 8 18 18 22 10-4 18-12 18-22V20L32 10z" fill="none" stroke="#fff" stroke-width="1" opacity="0.3"/>
    <polyline points="22,34 30,42 44,24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  lock: svg(`
    <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#666"/><stop offset="100%" stop-color="#333"/></linearGradient></defs>
    <path d="M20 28V20c0-7 5-12 12-12s12 5 12 12v8" fill="none" stroke="#555" stroke-width="4" stroke-linecap="round"/>
    <rect x="14" y="28" width="36" height="26" rx="4" fill="url(#lg)"/>
    <rect x="14" y="28" width="36" height="26" rx="4" fill="none" stroke="#555" stroke-width="1.5"/>
    <circle cx="32" cy="38" r="4" fill="#222"/>
    <rect x="30" y="38" width="4" height="8" rx="1" fill="#222"/>
  `),
};

// ── Achievements ───────────────────────────────────────────────────
export const ACHIEVEMENTS = {
  firstBlood: {
    name: "First Blood",
    description: "Eliminate your first enemy",
    icon: "skull",
    category: "combat",
    check: (stats) => stats.totalKills >= 1,
  },
  droneHunter: {
    name: "Drone Hunter",
    description: "Eliminate 10 enemies",
    icon: "target",
    category: "combat",
    check: (stats) => stats.totalKills >= 10,
  },
  phantomSlayer: {
    name: "Phantom Slayer",
    description: "Eliminate 25 enemies",
    icon: "ghost",
    category: "combat",
    check: (stats) => stats.totalKills >= 25,
  },
  beastTamer: {
    name: "Beast Tamer",
    description: "Eliminate 50 enemies",
    icon: "dragon",
    category: "combat",
    check: (stats) => stats.totalKills >= 50,
  },
  centurion: {
    name: "Centurion",
    description: "Eliminate 100 enemies",
    icon: "helmet",
    category: "combat",
    check: (stats) => stats.totalKills >= 100,
  },
  roundSurvivor: {
    name: "Clockwork Survivor",
    description: "Survive 5 arena rounds",
    icon: "stopwatch",
    category: "arena",
    check: (stats) => stats.highestArenaRound >= 5,
  },
  roundVeteran: {
    name: "Arena Veteran",
    description: "Survive 10 arena rounds",
    icon: "colosseum",
    category: "arena",
    check: (stats) => stats.highestArenaRound >= 10,
  },
  campaignClear: {
    name: "Timeline Restored",
    description: "Complete the campaign",
    icon: "trophy",
    category: "campaign",
    check: (stats) => stats.campaignComplete,
  },
  lordSlayer: {
    name: "Lord Slayer",
    description: "Defeat the Paradox Lord",
    icon: "crown",
    category: "campaign",
    check: (stats) => stats.bossKilled,
  },
  speedDemon: {
    name: "Speed Demon",
    description: "Perform 50 dashes",
    icon: "bolt",
    category: "movement",
    check: (stats) => stats.totalDashes >= 50,
  },
  tutorialGrad: {
    name: "Calibrated",
    description: "Complete the tutorial",
    icon: "mortarboard",
    category: "general",
    check: (stats) => stats.tutorialComplete,
  },
  bigSpender: {
    name: "Big Spender",
    description: "Purchase 10 upgrades",
    icon: "coins",
    category: "arena",
    check: (stats) => stats.upgradesBought >= 10,
  },
  scoreMaster: {
    name: "Score Master",
    description: "Reach a score of 10,000",
    icon: "star",
    category: "general",
    check: (stats) => stats.highestScore >= 10000,
  },
  untouchable: {
    name: "Untouchable",
    description: "Complete an arena round without taking damage",
    icon: "shield",
    category: "arena",
    check: (stats) => stats.flawlessRounds >= 1,
  },
  // Placeholder achievements — more coming soon
  _comingSoon1: {
    name: "???",
    description: "More achievements coming soon...",
    icon: "lock",
    category: "hidden",
    check: () => false,
  },
  _comingSoon2: {
    name: "???",
    description: "More achievements coming soon...",
    icon: "lock",
    category: "hidden",
    check: () => false,
  },
  _comingSoon3: {
    name: "???",
    description: "More achievements coming soon...",
    icon: "lock",
    category: "hidden",
    check: () => false,
  },
};
