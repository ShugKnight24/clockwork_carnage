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
      title: "CHRONOS EVENT / T-00:00:11",
      lines: [
        { text: "THE YEAR IS 2181.", delay: 0, color: "#99aacc", size: 14 },
        { text: "Time is broken.", delay: 1000, color: "#00e5ff", size: 24 },
        { text: "Somebody broke it on purpose.", delay: 2200, color: "#ffffff", size: 15 },
      ],
      particles: "stars",
      duration: 5500,
    },
    {
      bg: "deep_space",
      title: "PROJECT PARADOX",
      lines: [
        {
          text: "Dr. Elias Voss fired up the Chronos Engine. No clearance.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        { text: "The experiment ran for eleven seconds.", delay: 2500, color: "#ffcc88", size: 16 },
        {
          text: "Then past, present and future hit the same wall.",
          delay: 4300,
          color: "#ff6644",
          size: 18,
        },
      ],
      art: "rift",
      particles: "embers",
      duration: 8500,
    },
    {
      bg: "station",
      title: "LAST ANCHOR",
      lines: [
        {
          text: "Chronos Station. Humanity's last anchor in time.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Its halls now crawl with things from the wrong century.",
          delay: 2200,
          color: "#ff8844",
          size: 16,
        },
        {
          text: "Security. Research. Containment. Every wing's a crime scene.",
          delay: 4600,
          color: "#ffcc88",
          size: 16,
        },
      ],
      art: "station",
      particles: "sparks",
      duration: 9500,
    },
    {
      bg: "dark",
      art: "hero",
      title: "BADGE 11235 / SUIT C-0017",
      lines: [
        {
          text: "You: {AGENT}. Cadet. Wearing Voss's first prototype.",
          delay: 0,
          color: "#00ffcc",
          size: 20,
        },
        { text: "He built it. He'll want it back.", delay: 2400, color: "#ffffff", size: 22 },
      ],
      particles: "glow",
      duration: 6000,
    },
    {
      bg: "dark",
      art: "hero_armed",
      title: "MISSION: RESTORE THE CLOCK",
      lines: [
        { text: "Work the scene.", delay: 0, color: "#00ffcc", size: 18 },
        { text: "Reach the Paradox Core.", delay: 900, color: "#ffcc00", size: 22 },
        { text: "Bring Voss in. Or bring him down.", delay: 2100, color: "#ff2244", size: 26 },
      ],
      flash: "#00ccff",
      duration: 5500,
    },
  ],

  level2_briefing: [
    {
      bg: "station",
      lines: [
        { text: "CHRONOS STATION — SECTOR 2", delay: 0, color: "#00ccff", size: 20 },
        { text: "The Temporal Nexus", delay: 1300, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "temporal_rift",
      lines: [
        {
          text: "The deep corridors pulse like a bad heartbeat.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Time frays here. Enemies flicker in and out.",
          delay: 2100,
          color: "#ff8844",
          size: 16,
        },
        { text: "Stay sharp. Stay alive. In that order.", delay: 4100, color: "#ffcc00", size: 18 },
      ],
      art: "rift",
      particles: "embers",
      duration: 8000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        { text: "A voice at the back of your skull. ARIA.", delay: 0, color: "#8899aa", size: 15 },
        {
          text: "\"Temporal readings in there are frankly rude.\"",
          delay: 1900,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Try not to die. I'm getting used to the company.\"",
          delay: 4000,
          color: "#00ffdd",
          size: 14,
        },
      ],
      duration: 8500,
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
        { text: "SYSTEMS: Rebooting...", delay: 0, color: "#8899aa", size: 14 },
        {
          text: "WARNING: MEMORY CORRUPTED — FRAGMENTS ONLY",
          delay: 1100,
          color: "#ff4444",
          size: 12,
        },
      ],
      particles: "glow",
      duration: 1800,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        { text: "ARIA: You're back online. Mostly.", delay: 0, color: "#00ffdd", size: 18 },
        {
          text: "Your memory's in pieces. I'm sweeping up what I can.",
          delay: 1600,
          color: "#88ccff",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 3200,
    },
    {
      bg: "dark",
      art: "fragment_blue",
      lines: [
        {
          text: "V̷O̶—̵: \"Stay three steps ahead. The timeline punishes—\"",
          delay: 0,
          color: "#4488cc",
          size: 15,
        },
        {
          text: "[MEMORY CORRUPTED — IDENTITY UNRESOLVED]",
          delay: 2500,
          color: "#334466",
          size: 12,
        },
      ],
      particles: "sparks",
      duration: 2000,
    },
    {
      bg: "dark",
      art: "fragment_green",
      lines: [
        {
          text: "M̶—̵I: \"...you're bleeding out. Hold still, damn it—\"",
          delay: 0,
          color: "#66ccaa",
          size: 15,
        },
        {
          text: "[MEMORY CORRUPTED — IDENTITY UNRESOLVED]",
          delay: 2400,
          color: "#336644",
          size: 12,
        },
      ],
      particles: "sparks",
      duration: 2000,
    },
    {
      bg: "dark",
      art: "fragment_amber",
      lines: [
        {
          text: "K̵—̶: \"...reactor's going critical. Thirty seconds, tops—\"",
          delay: 0,
          color: "#ccaa66",
          size: 15,
        },
        {
          text: "[MEMORY CORRUPTED — IDENTITY UNRESOLVED]",
          delay: 2600,
          color: "#664422",
          size: 12,
        },
      ],
      particles: "sparks",
      duration: 2000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: Reconstruction at 12%. The fragments won't hold.",
          delay: 0,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: "Your service record says no squad. Your memory disagrees.",
          delay: 2400,
          color: "#88ccff",
          size: 15,
        },
        {
          text: "One of them is lying. We'll find out which.",
          delay: 4900,
          color: "#88ccff",
          size: 15,
        },
        {
          text: "Press ENTER to continue — or any key to skip.",
          delay: 6900,
          color: "#8899aa",
          size: 14,
        },
      ],
      particles: "stars",
      duration: 0,
    },
  ],

  // Extended memory fragment (longer fragments + ARIA diagnostic)
  intro_memory_01_extended: [
    {
      bg: "dark",
      flash: "#001122",
      lines: [
        { text: "SYSTEMS: Rebooting...", delay: 0, color: "#8899aa", size: 14 },
        {
          text: "WARNING: MEMORY CORRUPTED — 88% DATA LOSS",
          delay: 1100,
          color: "#ff4444",
          size: 12,
        },
      ],
      particles: "glow",
      duration: 1800,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: Welcome back. Vitals stable. I checked twice.",
          delay: 0,
          color: "#00ffdd",
          size: 18,
        },
        {
          text: "Your memory core took a beating. I'm salvaging what I can.",
          delay: 2300,
          color: "#88ccff",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 3200,
    },
    {
      bg: "dark",
      art: "fragment_blue",
      lines: [
        {
          text: "V̷O̶—̵: \"Ambush point is here. Miss the window and—\"",
          delay: 0,
          color: "#4488cc",
          size: 15,
        },
        { text: "\"—everybody dies. So don't miss.\"", delay: 2300, color: "#3366aa", size: 14 },
        {
          text: "[IDENTITY RECONSTRUCTION: 8% — INSUFFICIENT]",
          delay: 3900,
          color: "#334466",
          size: 12,
        },
      ],
      particles: "sparks",
      duration: 2800,
    },
    {
      bg: "dark",
      art: "fragment_green",
      lines: [
        {
          text: "M̶—̵I: \"I said HOLD STILL. You're leaking faster than I can patch—\"",
          delay: 0,
          color: "#66ccaa",
          size: 15,
        },
        { text: "\"—trust me. I haven't lost one yet.\"", delay: 2900, color: "#44aa88", size: 14 },
        {
          text: "[IDENTITY RECONSTRUCTION: 11% — INSUFFICIENT]",
          delay: 4600,
          color: "#336644",
          size: 12,
        },
      ],
      particles: "sparks",
      duration: 2800,
    },
    {
      bg: "dark",
      art: "fragment_amber",
      lines: [
        {
          text: "K̵—̶: \"Whoever built this reactor was a genius or suicidal—\"",
          delay: 0,
          color: "#ccaa66",
          size: 15,
        },
        { text: "\"—why not both.\"", delay: 2600, color: "#aa8844", size: 14 },
        {
          text: "[IDENTITY RECONSTRUCTION: 14% — INSUFFICIENT]",
          delay: 3500,
          color: "#664422",
          size: 12,
        },
      ],
      particles: "sparks",
      duration: 2800,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: HEALTH 85% — CHRONO 42% — MEMORY 12%",
          delay: 0,
          color: "#00ffdd",
          size: 14,
        },
        {
          text: "Three voices. No names. You knew them once. You will again.",
          delay: 1900,
          color: "#88ccff",
          size: 15,
        },
        {
          text: "Press ENTER to continue, or ESC to skip.",
          delay: 4500,
          color: "#8899aa",
          size: 14,
        },
      ],
      particles: "stars",
      duration: 0,
    },
  ],

  // Spanish localized variant (fragmented)
  intro_memory_01_es: [
    {
      bg: "dark",
      flash: "#001122",
      lines: [
        {
          text: "SISTEMA: Reiniciando...",
          delay: 0,
          color: "#8899aa",
          size: 14,
        },
        {
          text: "AVISO: Bancos de memoria corruptos",
          delay: 800,
          color: "#ff4444",
          size: 12,
        },
      ],
      particles: "glow",
      duration: 1800,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: Estás de vuelta. Apenas.",
          delay: 0,
          color: "#00ffdd",
          size: 18,
        },
        {
          text: "Tu memoria está fragmentada. Recuperaré lo que pueda.",
          delay: 1600,
          color: "#88ccff",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 3200,
    },
    {
      bg: "dark",
      art: "fragment_green",
      lines: [
        {
          text: 'M̶—̵I: "¡Quédate quieto! Estás perdiendo sangre—"',
          delay: 0,
          color: "#66ccaa",
          size: 15,
        },
        {
          text: "[MEMORIA CORRUPTA — IDENTIDAD NO RESUELTA]",
          delay: 900,
          color: "#336644",
          size: 12,
        },
      ],
      particles: "sparks",
      duration: 2000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: Reconstrucción de memoria al 12%. Fragmentos inestables.",
          delay: 0,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: "Pulsa ENTER para continuar o cualquier tecla para omitir.",
          delay: 1800,
          color: "#8899aa",
          size: 14,
        },
      ],
      particles: "stars",
      duration: 0,
    },
  ],

  // ── New Level Transition Briefings (Dr. Voss narrative) ──────────

  security_briefing: [
    {
      bg: "station",
      lines: [
        { text: "CHRONOS STATION — SECURITY WING", delay: 0, color: "#00ccff", size: 20 },
        { text: "Security Checkpoint", delay: 1500, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: "\"Security wing. These officers swore to protect the station.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Now they shoot anything that moves. That includes you.\"",
          delay: 2700,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"They know the layout. You know how to duck. Duck.\"",
          delay: 5200,
          color: "#ffcc00",
          size: 16,
        },
      ],
      duration: 10000,
    },
  ],

  research_briefing: [
    {
      bg: "station",
      lines: [
        { text: "CHRONOS STATION — RESEARCH DIVISION", delay: 0, color: "#00ccff", size: 20 },
        { text: "Research Wing", delay: 1700, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: "\"Research wing. Whatever they studied here, it studied back.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"The glass broke outward. Something walked through it.\"",
          delay: 2700,
          color: "#ff8844",
          size: 15,
        },
        {
          text: "\"Phantoms. They pass through walls. Cover is a suggestion.\"",
          delay: 5100,
          color: "#ffcc00",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 10000,
    },
    {
      bg: "station",
      art: "voss_recording",
      lines: [
        { text: "A cracked monitor loops a recording.", delay: 0, color: "#aabbcc", size: 14 },
        {
          text: "VOSS: \"Stay three steps ahead. The timeline punishes improvisation.\"",
          delay: 1700,
          color: "#4488cc",
          size: 15,
        },
        {
          text: "ARIA: \"That phrase. Your memory fragment. Same cadence.\"",
          delay: 4600,
          color: "#00ffdd",
          size: 14,
        },
        {
          text: "ARIA: \"Could be nothing. It's never nothing. File it.\"",
          delay: 7100,
          color: "#00ffdd",
          size: 13,
        },
      ],
      duration: 12000,
    },
  ],

  containment_briefing: [
    {
      bg: "dark",
      lines: [
        { text: "CHRONOS STATION — DETENTION LEVEL", delay: 0, color: "#00ccff", size: 20 },
        { text: "Containment Block", delay: 1600, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "dark",
      lines: [
        {
          text: "The cells are open. The prisoners are gone.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        { text: "Something else checked in.", delay: 2400, color: "#ff8844", size: 15 },
      ],
      duration: 5500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"Heavy contact ahead. Armored, big, probably grumpy.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Shield Commander. Don't shoot the shield — flank it.\"",
          delay: 2400,
          color: "#ffcc00",
          size: 16,
        },
        {
          text: "\"The prisoner logs keep naming one man. Dr. Voss.\"",
          delay: 4800,
          color: "#00ffdd",
          size: 14,
        },
        {
          text: "\"Same name's flagged in your record. The redacted part.\"",
          delay: 7000,
          color: "#ffcc00",
          size: 14,
        },
      ],
      duration: 12000,
    },
  ],

  server_briefing: [
    {
      bg: "station",
      lines: [
        { text: "CHRONOS STATION — DATA CENTER", delay: 0, color: "#00ccff", size: 20 },
        { text: "Server Farm", delay: 1400, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: "\"Mainframe access. Give me a second to commit a few felonies.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Dr. Elias Voss. Lead temporal physicist. Omega clearance.\"",
          delay: 2700,
          color: "#ffcc00",
          size: 16,
        },
        {
          text: "\"Official status: DECEASED. Three years ago.\"",
          delay: 5300,
          color: "#ff4444",
          size: 16,
        },
        {
          text: "\"Somebody forgot to tell his temporal signature.\"",
          delay: 7400,
          color: "#ff8844",
          size: 14,
        },
      ],
      duration: 12000,
    },
  ],

  reactor_briefing: [
    {
      bg: "reactor",
      lines: [
        { text: "CHRONOS STATION — REACTOR LEVEL", delay: 0, color: "#ff8844", size: 20 },
        { text: "Reactor Access", delay: 1500, color: "#ffffff", size: 16 },
      ],
      particles: "embers",
      duration: 3500,
    },
    {
      bg: "reactor",
      shake: 1,
      lines: [
        {
          text: "Energy readings off the scale. The scale quit.",
          delay: 0,
          color: "#ff8844",
          size: 16,
        },
        {
          text: "Scorch marks. Temporal residue. A failed experiment.",
          delay: 2100,
          color: "#aabbcc",
          size: 14,
        },
        { text: "Or a very successful one.", delay: 4800, color: "#ff4444", size: 16 },
      ],
      particles: "embers",
      duration: 8000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"This reactor fed something called Project PARADOX.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Voss built a suit that drinks temporal energy. Ring a bell?\"",
          delay: 2300,
          color: "#ffcc00",
          size: 16,
        },
        {
          text: "\"Your suit. Serial C-0017. His design.\"",
          delay: 5000,
          color: "#ff4444",
          size: 16,
        },
      ],
      duration: 9000,
    },
    {
      bg: "dark",
      art: "redacted_file",
      lines: [
        { text: "[ENCRYPTED CHANNEL — SOURCE UNKNOWN]", delay: 0, color: "#556677", size: 13 },
        {
          text: "\"Agent. Don't touch the reactor. I've seen how this ends.\"",
          delay: 1700,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "\"Keep moving. I'll find you. I always do.\"",
          delay: 4300,
          color: "#4488ff",
          size: 15,
        },
      ],
      duration: 8500,
    },
  ],

  voss_lab_briefing: [
    {
      bg: "dark",
      art: "portrait_voss",
      lines: [
        { text: "ARIA: Pulling his personnel file...", delay: 0, color: "#00ffdd", size: 14 },
        {
          text: "DR. ELIAS VOSS — LEAD RESEARCHER, CHRONOS DIVISION",
          delay: 1700,
          color: "#cc44ff",
          size: 17,
        },
      ],
      duration: 6000,
    },
    {
      bg: "dark",
      art: "portrait_voss",
      lines: [
        { text: "\"Three doctorates by twenty-eight.\"", delay: 0, color: "#8899aa", size: 14 },
        {
          text: "\"Temporal physics. Quantum engineering. Xenobiology.\"",
          delay: 1700,
          color: "#8899aa",
          size: 14,
        },
        {
          text: "\"Smartest man on the station. Made sure everyone knew it.\"",
          delay: 4100,
          color: "#aaddff",
          size: 15,
        },
      ],
      duration: 9000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"Seven years ago, he pitched Project PARADOX.\"",
          delay: 0,
          color: "#8899aa",
          size: 14,
        },
        {
          text: "\"Wire a human mind into the Chronos Engine. His, specifically.\"",
          delay: 2100,
          color: "#cc44ff",
          size: 14,
        },
        {
          text: "\"Command called it reckless. Buried the proposal.\"",
          delay: 4900,
          color: "#ff8844",
          size: 14,
        },
        { text: "\"Twice.\"", delay: 7600, color: "#ff4422", size: 18 },
      ],
      duration: 10000,
    },
    {
      bg: "dark",
      shake: 1,
      lines: [
        {
          text: "\"The night of the incident, he ran it anyway.\"",
          delay: 0,
          color: "#cc44ff",
          size: 16,
        },
        {
          text: "\"Alone. No authorisation. No fail-safes.\"",
          delay: 2100,
          color: "#ff6644",
          size: 15,
        },
        { text: "\"Eleven seconds.\"", delay: 4000, color: "#8899aa", size: 14 },
        {
          text: "\"You know the rest. You're standing in it.\"",
          delay: 5300,
          color: "#ff2244",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 9500,
    },
    {
      bg: "dark",
      shake: 2,
      lines: [
        { text: "CHRONOS STATION — RESTRICTED LEVEL", delay: 0, color: "#cc44ff", size: 20 },
        { text: "Dr. Voss' Personal Laboratory", delay: 1600, color: "#ffffff", size: 16 },
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
          text: "\"Voss's private lab. Rift dead center. Cozy.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"These readings match the Paradox Lord's signature.\"",
          delay: 2100,
          color: "#ff4444",
          size: 16,
        },
        { text: "\"Not a match. The same man.\"", delay: 4800, color: "#ff2244", size: 18 },
      ],
      duration: 8000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        { text: "Elias Voss didn't die.", delay: 0, color: "#cc44ff", size: 18 },
        { text: "He climbed into the storm he made.", delay: 1200, color: "#cc44ff", size: 18 },
        { text: "He became the Paradox Lord.", delay: 3100, color: "#ff2244", size: 22 },
      ],
      particles: "embers",
      shake: 2,
      duration: 6500,
    },
    {
      bg: "dark",
      art: "redacted_file",
      lines: [
        {
          text: "[STATION ARCHIVE — FLAGGED BY ANALYST L.M.]",
          delay: 0,
          color: "#556677",
          size: 13,
        },
        {
          text: "\"Filed three reports on Voss. All three deleted.\"",
          delay: 2000,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "\"If you're reading this, you got closer than anyone.\"",
          delay: 4200,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: "\"Come find me. I have what you're missing.\"",
          delay: 6600,
          color: "#ffaa44",
          size: 16,
        },
      ],
      duration: 10500,
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
          text: '"But I was always three steps ahead."',
          delay: 6500,
          color: "#cc88ff",
          size: 16,
        },
        {
          text: '"Now look at me."',
          delay: 8200,
          color: "#ff0088",
          size: 22,
        },
      ],
      particles: "embers",
      shake: 3,
      duration: 10500,
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
          text: "\"I became this the moment they told me 'no'.\"",
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
        { text: "CHRONOS STATION — SECTOR 7", delay: 0, color: "#00ccff", size: 20 },
        { text: "The Temporal Nexus", delay: 1300, color: "#ffffff", size: 16 },
      ],
      duration: 3500,
    },
    {
      bg: "temporal_rift",
      art: "rift",
      lines: [
        {
          text: "The deep corridors pulse like a bad heartbeat.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Time frays here. Enemies flicker in and out.",
          delay: 2100,
          color: "#ff8844",
          size: 16,
        },
        { text: "The Core is close. So is he.", delay: 4100, color: "#ffcc00", size: 18 },
      ],
      particles: "embers",
      duration: 7500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"Voss knows you're wearing his prototype.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"He built it. He knows every weak point.\"",
          delay: 1900,
          color: "#ffcc00",
          size: 15,
        },
        {
          text: "\"He's never met the stubborn idiot inside it. That's our edge.\"",
          delay: 3800,
          color: "#00ffdd",
          size: 16,
        },
      ],
      duration: 9000,
    },
  ],

  paradox_core_briefing: [
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        { text: "Your chronal scanner starts screaming.", delay: 0, color: "#00ccff", size: 16 },
        { text: "Distortion climbing. Fast.", delay: 1800, color: "#aabbcc", size: 15 },
        { text: "200... 800... 3,600... 9,001...", delay: 3100, color: "#ffcc00", size: 18 },
      ],
      particles: "sparks",
      duration: 6500,
    },
    {
      bg: "boss_lair",
      lines: [
        { text: "THE PARADOX CORE", delay: 0, color: "#ff2244", size: 22 },
        { text: "Where Elias Voss stopped being a man.", delay: 900, color: "#cc4466", size: 16 },
      ],
      particles: "embers",
      shake: 2,
      duration: 4500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      shake: 3,
      lines: [
        {
          text: "A voice. Not in the room. Inside your helmet.",
          delay: 0,
          color: "#ff6644",
          size: 16,
        },
        {
          text: "Your visor cracks. Static eats the HUD.",
          delay: 2100,
          color: "#ff4444",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 6000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        { text: "\"Ah. You're wearing my suit.\"", delay: 0, color: "#ff4466", size: 18 },
        {
          text: "\"I know every circuit in it. I soldered the ones that fail.\"",
          delay: 1400,
          color: "#ff4466",
          size: 16,
        },
        {
          text: "\"Come in, little clock. Let's see how long you run.\"",
          delay: 4000,
          color: "#ff2244",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 8500,
    },
  ],

  level3_briefing: [
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        { text: "Your chronal scanner starts screaming.", delay: 0, color: "#00ccff", size: 16 },
        { text: "Distortion climbing. Fast.", delay: 1800, color: "#aabbcc", size: 15 },
        { text: "300... 1,200... 4,500...", delay: 3100, color: "#ffcc00", size: 18 },
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
        { text: "The needle pins. Then snaps.", delay: 0, color: "#aabbcc", size: 15 },
        { text: "ERROR: TEMPORAL OVERFLOW", delay: 1400, color: "#ff4444", size: 22 },
        { text: "...well, that's not great.", delay: 3000, color: "#8899aa", size: 14 },
      ],
      particles: "embers",
      duration: 6000,
    },
    {
      bg: "boss_lair",
      lines: [
        { text: "THE PARADOX CORE", delay: 0, color: "#ff2244", size: 22 },
        { text: "Ground zero of the collapse.", delay: 900, color: "#cc4466", size: 16 },
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
          text: "A voice. Not in the room. Inside your helmet.",
          delay: 0,
          color: "#ff6644",
          size: 16,
        },
        {
          text: "Your visor cracks. Static eats the HUD.",
          delay: 2100,
          color: "#ff4444",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 6000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: "\"Little agent. All this way, just for me?\"",
          delay: 0,
          color: "#ff4466",
          size: 18,
        },
        {
          text: "\"I've watched you walk through that door a thousand times.\"",
          delay: 1900,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: "\"Think of time as a book I've already read.\"",
          delay: 0,
          color: "#ff6688",
          size: 15,
        },
        { text: "\"Every page. Every ending.\"", delay: 2000, color: "#ff6688", size: 15 },
        { text: "\"Including this one...\"", delay: 3400, color: "#ff4466", size: 16 },
        { text: "\"...where you lose.\"", delay: 4900, color: "#ff2244", size: 17 },
      ],
      particles: "embers",
      duration: 8000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: "\"I've seen every outcome of this fight.\"",
          delay: 0,
          color: "#ff4466",
          size: 16,
        },
        {
          text: "\"And since you'll be dust in a minute...\"",
          delay: 1900,
          color: "#cc4466",
          size: 15,
        },
        { text: "\"...indulge an old god. A story.\"", delay: 3800, color: "#cc4466", size: 15 },
      ],
      particles: "embers",
      duration: 7500,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: "\"There was a man who taught time to sit and stay.\"",
          delay: 0,
          color: "#ff6688",
          size: 15,
        },
        {
          text: "\"He could catch a falling second mid-air.\"",
          delay: 2200,
          color: "#cc88aa",
          size: 14,
        },
        {
          text: "\"He could unmake an accident before it happened.\"",
          delay: 4100,
          color: "#cc88aa",
          size: 14,
        },
        {
          text: "\"The only thing he feared was running out of it.\"",
          delay: 6300,
          color: "#ff4466",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 11000,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: "\"His own equation ate him alive. Poetic.\"",
          delay: 0,
          color: "#cc88aa",
          size: 15,
        },
        {
          text: "\"He could save anyone from the clock. Except himself.\"",
          delay: 1900,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: "\"And now I'm monologuing. How very mortal of me.\"",
          delay: 0,
          color: "#ffaa88",
          size: 14,
        },
        { text: "\"Eternity gets quiet. Carry on.\"", delay: 2200, color: "#ffcc88", size: 14 },
      ],
      particles: "embers",
      duration: 5500,
    },
    {
      bg: "boss_lair",
      art: "villain",
      flash: "#ff0000",
      lines: [
        { text: "\"COME, THEN.\"", delay: 0, color: "#ff2244", size: 22 },
        {
          text: "\"You have no idea what you're walking into.\"",
          delay: 800,
          color: "#ff4466",
          size: 16,
        },
        { text: "\"But by all means — try.\"", delay: 2800, color: "#ff6644", size: 15 },
      ],
      shake: 3,
      particles: "embers",
      duration: 6000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA cuts through the static. Quieter now.",
          delay: 0,
          color: "#8899aa",
          size: 14,
        },
        {
          text: "\"Hey. I know that look. Don't you dare quit on me.\"",
          delay: 1900,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: "\"We didn't come this far for you to die looking dramatic.\"",
          delay: 4200,
          color: "#00ffdd",
          size: 15,
        },
      ],
      duration: 9000,
    },
    {
      bg: "boss_lair",
      art: "hero_armed",
      flash: "#ff2200",
      lines: [
        { text: "Enough talk.", delay: 0, color: "#00ffcc", size: 20 },
        { text: "End this. NOW.", delay: 800, color: "#ffffff", size: 28 },
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
        { text: "The Paradox Lord crumbles.", delay: 0, color: "#00ffcc", size: 20 },
        { text: "Done. Case closed. The timeline is—", delay: 1300, color: "#aaddff", size: 18 },
      ],
      particles: "glow",
      duration: 5000,
    },
    {
      bg: "boss_lair",
      flash: "#ff0000",
      shake: 6,
      lines: [
        { text: "...oh, hell.", delay: 0, color: "#ff4444", size: 24 },
      ],
      duration: 2500,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      flash: "#ff0044",
      shake: 8,
      lines: [
        { text: "\"Did you really think that was me?\"", delay: 0, color: "#ff2266", size: 20 },
        { text: "\"That was a shell. A rehearsal.\"", delay: 1700, color: "#ff4488", size: 16 },
        { text: "\"And you barely passed.\"", delay: 3500, color: "#ff2244", size: 18 },
      ],
      particles: "embers",
      duration: 6500,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: "\"I don't fight battles, little agent. I remember them.\"",
          delay: 0,
          color: "#ff6688",
          size: 16,
        },
        {
          text: "\"You see one move. I see the whole board.\"",
          delay: 2400,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "\"Every timeline. Every way you lose.\"",
          delay: 4300,
          color: "#ff4466",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 8000,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      flash: "#ff0088",
      shake: 6,
      scanner: true,
      lines: [
        {
          text: "\"You measured me, little clock soldier...\"",
          delay: 0,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "\"YOUR SCANNER LIED. I AM BEYOND MEASURE.\"",
          delay: 1900,
          color: "#ff0044",
          size: 26,
        },
        {
          text: "\"And this body? THIS ISN'T EVEN MY FINAL FORM.\"",
          delay: 3800,
          color: "#ff2266",
          size: 20,
        },
      ],
      particles: "embers",
      duration: 8000,
    },
    {
      bg: "dark",
      flash: "#ffffff",
      shake: 10,
      lines: [
        {
          text: "A temporal shockwave rips through the Core.",
          delay: 0,
          color: "#ff8844",
          size: 18,
        },
        {
          text: "Your rifle shatters. Your armor splits.",
          delay: 2000,
          color: "#ff4444",
          size: 18,
        },
        { text: "You hit the far wall. Hard.", delay: 3800, color: "#ff2222", size: 20 },
      ],
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "dark",
      art: "hero_fallen",
      lines: [
        { text: "Everything goes dark.", delay: 0, color: "#445566", size: 20 },
        { text: "Should've brought friends.", delay: 1600, color: "#667788", size: 16 },
      ],
      duration: 5000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        { text: "Fading. Cold. Then—", delay: 0, color: "#445566", size: 14 },
        { text: "\"Don't you DARE flatline on me.\"", delay: 1000, color: "#00ffdd", size: 18 },
        {
          text: "\"CRITICAL DAMAGE. OVERRIDING SAFETY LIMITS.\"",
          delay: 2500,
          color: "#ff0000",
          size: 16,
        },
        {
          text: "\"CHRONO SHIFT — NOW. HOLD ON TO SOMETHING.\"",
          delay: 4500,
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
        { text: "Time slams to a halt.", delay: 0, color: "#00ccff", size: 24 },
        {
          text: "The killing blow hangs an inch from your visor.",
          delay: 1100,
          color: "#00aaff",
          size: 16,
        },
        {
          text: "The suit vents raw time and hurls you clear.",
          delay: 3200,
          color: "#00aaff",
          size: 16,
        },
        { text: "You live. Barely. Mostly out of spite.", delay: 5600, color: "#ffffff", size: 18 },
      ],
      duration: 9500,
      particles: "glow",
    },
    {
      bg: "dark",
      lines: [
        { text: "END OF ACT I", delay: 0, color: "#334455", size: 28 },
        { text: "— THE SHIFT —", delay: 800, color: "#00ccff", size: 18 },
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
          text: "KAEL — The Vanguard. Lost his squad. Swore he'd never lose anyone again.",
          delay: 0,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "And you. The Temporal Agent. The one who came back.",
          delay: 3000,
          color: "#00ffcc",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 6000,
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
          text: "A blur of motion. Someone is already in the training arena.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "NOVA — The Striker. Fastest thing alive.",
          delay: 2000,
          color: "#ff4488",
          size: 16,
        },
        {
          text: "\"I don't do introductions. If you can't keep up, I'll know.\"",
          delay: 4500,
          color: "#ff4488",
          size: 15,
        },
      ],
      particles: "sparks",
      duration: 7000,
    },
    {
      bg: "station",
      art: "party",
      lines: [
        {
          text: "You train together. She doesn't talk much.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "Late that night, she finally stops running laps.",
          delay: 2500,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: '"I lost everyone I ever cared about. So I ran."',
          delay: 5000,
          color: "#ff4488",
          size: 16,
        },
        {
          text: '"Not this time."',
          delay: 7500,
          color: "#ff4488",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 9500,
    },
  ],

  act2_level3: [
    {
      bg: "dark",
      art: "fragment_blue",
      flash: "#003366",
      lines: [
        {
          text: "[MEMORY RECONSTRUCTION: 8% → 67%...]",
          delay: 0,
          color: "#4488cc",
          size: 12,
        },
      ],
      particles: "glow",
      duration: 1200,
    },
    {
      bg: "dark",
      art: "portrait_voss",
      flash: "#0066cc",
      lines: [
        {
          text: "The face sharpens. The name returns.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "VOSS — Tactician. Sharp tongue, sharper plans.",
          delay: 1800,
          color: "#00ccff",
          size: 17,
        },
        {
          text: "He died buying you time. You remember now.",
          delay: 3800,
          color: "#88aacc",
          size: 15,
        },
        {
          text: 'ARIA flickers: "Temporal signature... partial match to the Paradox Lord. 67%."',
          delay: 5500,
          color: "#00ffdd",
          size: 13,
        },
      ],
      particles: "sparks",
      duration: 8000,
    },
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
  // ACT II BRIEFINGS — Levels 3-8 (team deepening, Lord's fortress)
  // ═══════════════════════════════════════════════════════════════════
  act2_level4: [
    {
      bg: "station",
      lines: [
        { text: "CONTAINMENT BREACH", delay: 0, color: "#ff8844", size: 20 },
        {
          text: "The cells are open. Something got out.",
          delay: 1500,
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
          text: "A stocky figure is already welding blast doors shut.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "ROOK — The Engineer. Builds anything. Trusts no one.",
          delay: 2000,
          color: "#44ff88",
          size: 16,
        },
        {
          text: "\"Don't thank me. I'm not doing this for you.\"",
          delay: 4500,
          color: "#44ff88",
          size: 15,
        },
        {
          text: "He's been watching you work. That counts for something.",
          delay: 6500,
          color: "#aabbcc",
          size: 15,
        },
      ],
      particles: "sparks",
      duration: 8500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: '"Nova is clearing the east wing. Rook\'s got the doors."',
          delay: 0,
          color: "#00ccff",
          size: 15,
        },
        {
          text: '"You take the west. Don\'t let anything reach the civilians."',
          delay: 2500,
          color: "#00ccff",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 5000,
    },
  ],

  act2_level5: [
    {
      bg: "dark",
      art: "fragment_green",
      flash: "#003322",
      lines: [
        {
          text: "[MEMORY RECONSTRUCTION: 12% → 71%...]",
          delay: 0,
          color: "#44cc88",
          size: 12,
        },
      ],
      particles: "glow",
      duration: 1200,
    },
    {
      bg: "dark",
      art: "portrait_miri",
      flash: "#00cc66",
      lines: [
        {
          text: "The warmth returns first. Then the face.",
          delay: 0,
          color: "#aaccbb",
          size: 15,
        },
        {
          text: "MIRI — Medic. Warm hands, warmer heart.",
          delay: 1800,
          color: "#44ff88",
          size: 17,
        },
        {
          text: "She died keeping you alive. You remember the cost.",
          delay: 3800,
          color: "#88ccaa",
          size: 15,
        },
      ],
      particles: "sparks",
      duration: 6000,
    },
    {
      bg: "station",
      lines: [
        { text: "SERVER FARM SIEGE", delay: 0, color: "#00ccff", size: 20 },
        {
          text: "The Lord's data fortress. He keeps his secrets here.",
          delay: 1500,
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
          text: "Rook cracks his knuckles.",
          delay: 0,
          color: "#44ff88",
          size: 15,
        },
        {
          text: '"Every server we take down, he loses another century of stolen timelines."',
          delay: 2000,
          color: "#44ff88",
          size: 15,
        },
        {
          text: 'Nova grins. "Then let\'s bankrupt him."',
          delay: 4500,
          color: "#ff4488",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 7000,
    },
  ],

  act2_level6: [
    {
      bg: "dark",
      art: "fragment_amber",
      flash: "#332200",
      lines: [
        {
          text: "[MEMORY RECONSTRUCTION: 5% → 73%...]",
          delay: 0,
          color: "#ccaa44",
          size: 12,
        },
      ],
      particles: "glow",
      duration: 1200,
    },
    {
      bg: "dark",
      art: "portrait_kai",
      flash: "#cc8800",
      lines: [
        {
          text: "Grease and solder. The smell hits before the image.",
          delay: 0,
          color: "#ccbbaa",
          size: 15,
        },
        {
          text: "KAI — Engineer. Could fix anything but the odds.",
          delay: 1800,
          color: "#ffcc44",
          size: 17,
        },
        {
          text: "He died holding the door. You walked through it.",
          delay: 3800,
          color: "#ccaa88",
          size: 15,
        },
      ],
      particles: "sparks",
      duration: 6000,
    },
    {
      bg: "station",
      lines: [
        { text: "REACTOR OVERLOAD", delay: 0, color: "#ffaa00", size: 20 },
        {
          text: "He's destabilizing the core. Trying to burn us out.",
          delay: 1500,
          color: "#cc8844",
          size: 16,
        },
      ],
      shake: 2,
      duration: 3500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: '"Reactor temperature climbing. He\'s feeding it temporal energy."',
          delay: 0,
          color: "#00ccff",
          size: 15,
        },
        {
          text: '"If it blows, this entire sector folds into a time loop. Forever."',
          delay: 2500,
          color: "#ff4444",
          size: 15,
        },
        {
          text: '"Kael is holding the blast doors. You need to reach the coolant valves."',
          delay: 5000,
          color: "#00ccff",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 7500,
    },
  ],

  act2_level7: [
    {
      bg: "boss_lair",
      lines: [
        { text: "THE LORD'S LABORATORY", delay: 0, color: "#ff2244", size: 20 },
        {
          text: "Where he made himself. Where he'll try to unmake you.",
          delay: 1500,
          color: "#cc4466",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 3500,
    },
    {
      bg: "boss_lair",
      art: "villain",
      lines: [
        {
          text: "Logs scattered everywhere. Failed experiments. Dead timelines.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Hundreds of versions of himself. All failures.",
          delay: 2500,
          color: "#ff6688",
          size: 15,
        },
        {
          text: "Except one.",
          delay: 5000,
          color: "#ff2244",
          size: 18,
        },
      ],
      particles: "sparks",
      duration: 7000,
    },
  ],

  act2_level8: [
    {
      bg: "boss_lair",
      lines: [
        { text: "TEMPORAL NEXUS", delay: 0, color: "#9944ff", size: 20 },
        {
          text: "The crossroads of every stolen timeline.",
          delay: 1500,
          color: "#bb88ff",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "boss_lair",
      art: "party",
      lines: [
        {
          text: "You see echoes of yourselves. Past attempts. Past failures.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Nova stops. One of the echoes is her — running. Always running.",
          delay: 2500,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "She watches it vanish. Then turns forward.",
          delay: 5000,
          color: "#ff4488",
          size: 15,
        },
        {
          text: '"Not this time."',
          delay: 7000,
          color: "#ff4488",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 9000,
    },
  ],

  act2_level9: [
    {
      bg: "boss_lair",
      lines: [
        { text: "THE PARADOX CORE", delay: 0, color: "#ff0066", size: 22 },
        {
          text: "His throne room. The heart of stolen time.",
          delay: 1500,
          color: "#ff4488",
          size: 16,
        },
      ],
      shake: 3,
      particles: "embers",
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: '"You brought friends this time. How sentimental."',
          delay: 0,
          color: "#ff4466",
          size: 16,
        },
        {
          text: "\"Do they know you've already lost? I've seen every outcome.\"",
          delay: 2500,
          color: "#ff6688",
          size: 15,
        },
        {
          text: '"There is no timeline where you win."',
          delay: 5000,
          color: "#ff2244",
          size: 18,
        },
      ],
      particles: "embers",
      shake: 4,
      duration: 7500,
    },
    {
      bg: "boss_lair",
      art: "party",
      lines: [
        {
          text: 'Kael raises his shield. "Then we\'ll make a new one."',
          delay: 0,
          color: "#44aaff",
          size: 16,
        },
        {
          text: "Everyone draws their weapons.",
          delay: 2500,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Together.",
          delay: 4000,
          color: "#ffffff",
          size: 20,
        },
      ],
      particles: "glow",
      duration: 6500,
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
      art: "lyra",
      lines: [
        {
          text: "\"You're not temporal. You're not anti-temporal.\"",
          delay: 0,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "\"You're a fixed point. A constant. Time flows around you but it can't change you.\"",
          delay: 2500,
          color: "#ffcc44",
          size: 16,
        },
        {
          text: "\"That's why the loop doesn't erase your memories. That's why the suit bonded to YOU.\"",
          delay: 5500,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: '"Voss designed it for a fixed point. He just couldn\'t find one... until you."',
          delay: 8500,
          color: "#cc88ff",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 11500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: '"CONFIRMED. Your neural patterns show zero temporal drift across all recorded loops."',
          delay: 0,
          color: "#00ccff",
          size: 15,
        },
        {
          text: '"You are, statistically speaking, impossible."',
          delay: 2800,
          color: "#00ccff",
          size: 16,
        },
        {
          text: '"The Paradox Lord can rewrite anyone. Anything. Except you."',
          delay: 5200,
          color: "#ffffff",
          size: 17,
        },
      ],
      particles: "sparks",
      duration: 8000,
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
  // ACT III BRIEFINGS — Levels 3-8 (sacrifice, last stand, final push)
  // ═══════════════════════════════════════════════════════════════════
  act3_level4: [
    {
      bg: "station",
      lines: [
        {
          text: "CONTAINMENT — LAST STAND",
          delay: 0,
          color: "#ff4444",
          size: 20,
        },
        {
          text: "The walls are bleeding temporal energy.",
          delay: 1500,
          color: "#cc6666",
          size: 16,
        },
      ],
      shake: 3,
      duration: 3500,
    },
    {
      bg: "station",
      art: "party",
      lines: [
        {
          text: "Kael stops you in the corridor. His shield is cracked down the middle.",
          delay: 0,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "A temporal shockwave hits. The shield shatters — fragments scatter across the floor.",
          delay: 2200,
          color: "#ff6644",
          size: 15,
        },
        {
          text: "He stares at the pieces. Then kicks them aside.",
          delay: 4200,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: '"I don\'t need it anymore."',
          delay: 6000,
          color: "#4488ff",
          size: 18,
        },
        {
          text: '"I\'m staying at the blast doors."',
          delay: 8000,
          color: "#4488ff",
          size: 16,
        },
        {
          text: "You start to argue. He puts a hand on your shoulder.",
          delay: 10000,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: '"You taught me what a badge means. Let me show you I learned."',
          delay: 12000,
          color: "#4488ff",
          size: 17,
        },
        {
          text: "He smiles. It's the first real one you've seen from him.",
          delay: 14500,
          color: "#aabbcc",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 17000,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: '"The Lord is collapsing dimensions into this sector. Reality is thinning."',
          delay: 0,
          color: "#00ccff",
          size: 15,
        },
        {
          text: '"Kael is holding the blast doors. He knows what that means."',
          delay: 3000,
          color: "#44aaff",
          size: 15,
        },
        {
          text: '"Make it count, {AGENT}."',
          delay: 5500,
          color: "#00ccff",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 8000,
    },
  ],

  act3_level5: [
    {
      bg: "station",
      lines: [
        {
          text: "SERVER FARM — SCORCHED EARTH",
          delay: 0,
          color: "#ff6600",
          size: 20,
        },
        {
          text: "He's deleting everything. Every timeline. Every memory.",
          delay: 1500,
          color: "#cc8844",
          size: 16,
        },
      ],
      shake: 2,
      duration: 3500,
    },
    {
      bg: "station",
      art: "party",
      lines: [
        {
          text: "Rook is wiring charges to the mainframe.",
          delay: 0,
          color: "#44ff88",
          size: 15,
        },
        {
          text: '"If I can overload his data cores, he loses his precognition."',
          delay: 2000,
          color: "#44ff88",
          size: 15,
        },
        {
          text: '"He won\'t see us coming. For the first time ever."',
          delay: 4500,
          color: "#44ff88",
          size: 16,
        },
        {
          text: '"Cover me. This is going to be loud."',
          delay: 6500,
          color: "#44ff88",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 8500,
    },
  ],

  act3_level6: [
    {
      bg: "station",
      lines: [
        { text: "REACTOR — CRITICAL", delay: 0, color: "#ff2200", size: 22 },
        {
          text: "The heart of the station is failing.",
          delay: 1500,
          color: "#ff6644",
          size: 16,
        },
      ],
      shake: 5,
      particles: "embers",
      duration: 3500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: "Lyra's hands are shaking over the console.",
          delay: 0,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: '"The reactor can be weaponized. One shot. Enough to crack his armor."',
          delay: 2500,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: '"But someone has to stay behind to fire it."',
          delay: 5000,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "She looks at you. You both know who it has to be.",
          delay: 7000,
          color: "#aabbcc",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 9500,
    },
  ],

  act3_level7: [
    {
      bg: "boss_lair",
      lines: [
        {
          text: "THE LABORATORY — ORIGINS",
          delay: 0,
          color: "#9944ff",
          size: 20,
        },
        {
          text: "Before he was the Lord, he was just a man who lost everything.",
          delay: 1500,
          color: "#bb88ff",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      lines: [
        {
          text: "In his personal logs, you find the truth.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "He didn't steal time to rule. He stole it to bring someone back.",
          delay: 2500,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "And when he couldn't... he decided nobody deserved time at all.",
          delay: 5000,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 7500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        {
          text: "Voss. Miri. Kai. You lost them too.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "A lab recording glitches on screen — Voss's voice. Your Voss. Same cadence as the Lord.",
          delay: 2200,
          color: "#cc88ff",
          size: 14,
        },
        {
          text: "You could have become him. Rage. Grief. The same fuel.",
          delay: 4500,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "But you chose to build a new family. He chose to burn everything down.",
          delay: 7000,
          color: "#ffffff",
          size: 16,
        },
        {
          text: "That's the difference. That was always the difference.",
          delay: 9500,
          color: "#00ffcc",
          size: 17,
        },
      ],
      particles: "glow",
      duration: 12000,
    },
  ],

  act3_level8: [
    {
      bg: "boss_lair",
      lines: [
        {
          text: "TEMPORAL NEXUS — THE BLIND SPOT",
          delay: 0,
          color: "#ff44ff",
          size: 20,
        },
        {
          text: "Lyra found his weakness. This is the moment he can't predict.",
          delay: 1500,
          color: "#dd88ff",
          size: 16,
        },
      ],
      particles: "glow",
      shake: 2,
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "party",
      lines: [
        {
          text: "Nova takes point. No hesitation. No running.",
          delay: 0,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "Rook's last turret locks and loads.",
          delay: 2000,
          color: "#44ff88",
          size: 15,
        },
        {
          text: "Lyra whispers coordinates into your ear.",
          delay: 4000,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: '"Now. Before he sees us."',
          delay: 6000,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "sparks",
      duration: 8000,
    },
  ],

  act3_level9: [
    {
      bg: "boss_lair",
      lines: [
        {
          text: "THE PARADOX CORE — ENDGAME",
          delay: 0,
          color: "#ff0044",
          size: 24,
        },
        {
          text: "Everything ends here.",
          delay: 1500,
          color: "#ff4466",
          size: 18,
        },
      ],
      shake: 6,
      flash: "#ff0044",
      particles: "embers",
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      lines: [
        {
          text: '"You cannot kill time, Agent. I AM time."',
          delay: 0,
          color: "#ff2244",
          size: 16,
        },
        {
          text: '"Every second you\'ve ever lived belongs to me."',
          delay: 2500,
          color: "#ff4466",
          size: 15,
        },
        {
          text: '"And I will take them all back."',
          delay: 5000,
          color: "#ff0044",
          size: 18,
        },
      ],
      shake: 8,
      particles: "embers",
      duration: 7500,
    },
    {
      bg: "boss_lair",
      art: "hero_armed",
      lines: [
        {
          text: "You raise your weapon. Behind you, your team raises theirs.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: 'Voss taught you to plan. You hear his voice: "Three steps ahead."',
          delay: 2200,
          color: "#4488cc",
          size: 15,
        },
        {
          text: "The same voice the Paradox Lord uses. Three timelines. Same man. Same grief.",
          delay: 4000,
          color: "#cc88ff",
          size: 14,
        },
        {
          text: "Miri taught you to endure. Her hands kept you alive.",
          delay: 6200,
          color: "#44cc88",
          size: 15,
        },
        {
          text: "Kai taught you to hold the line. The door is still open.",
          delay: 8400,
          color: "#ccaa44",
          size: 15,
        },
        {
          text: "You don't need to see the future.",
          delay: 10600,
          color: "#ffffff",
          size: 16,
        },
        {
          text: "You fight for everyone who believed you could.",
          delay: 12600,
          color: "#00ffcc",
          size: 18,
        },
      ],
      particles: "glow",
      duration: 15500,
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
          text: "Kael is in the next bed. Bandaged head to toe. His shield in pieces on the floor.",
          delay: 3800,
          color: "#4488ff",
          size: 14,
        },
        {
          text: "Nova dragged him from the blast doors. Barely. Shield shattered, spine cracked, but breathing.",
          delay: 6000,
          color: "#ff4488",
          size: 14,
        },
        {
          text: "He's trying not to cry. Failing.",
          delay: 8500,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "Nova is laughing through tears. Rook just nods. That's enough from him.",
          delay: 10500,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "And Lyra... hasn't let go of your hand.",
          delay: 12500,
          color: "#ffaa44",
          size: 17,
        },
      ],
      particles: "glow",
      duration: 15000,
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
      bg: "dark",
      lines: [
        {
          text: "You think of the ones who didn't make it here.",
          delay: 0,
          color: "#8899aa",
          size: 15,
        },
        {
          text: "Voss, who always had a plan. Even for dying.",
          delay: 2500,
          color: "#4488cc",
          size: 15,
        },
        {
          text: "Miri, whose hands never stopped healing. Not even at the end.",
          delay: 5000,
          color: "#44cc88",
          size: 15,
        },
        {
          text: "Kai, who held the door so you could walk through.",
          delay: 7500,
          color: "#ccaa44",
          size: 15,
        },
        {
          text: "You carry them. You always will.",
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
  // NEW GAME PLUS — Timeline loop cutscenes
  // ═══════════════════════════════════════════════════════════════════

  /** Generic NG+ intro (fallback if cycle-specific script missing) */
  ng_plus_intro: [
    {
      bg: "dark",
      art: "rift",
      flash: "#4400ff",
      shake: 8,
      lines: [
        {
          text: "The rift tears open again.",
          delay: 0,
          color: "#cc88ff",
          size: 20,
        },
        {
          text: "Time is not done with you.",
          delay: 2200,
          color: "#aaddff",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 5000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: Temporal signature detected. It's... recursive.",
          delay: 0,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: "You've done this before. The echoes remember.",
          delay: 2000,
          color: "#88ccff",
          size: 15,
        },
        {
          text: "But the enemies are stronger now. They've learned.",
          delay: 4000,
          color: "#ff8866",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "station",
      art: "hero_armed",
      lines: [
        {
          text: "You grip your weapon. Muscle memory from a life you've already lived.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Again. You'll do it again.",
          delay: 2500,
          color: "#00ffcc",
          size: 18,
        },
      ],
      particles: "sparks",
      duration: 5000,
    },
  ],

  /** NG+ Cycle 1 — "The Echo" */
  ng_plus_cycle_1: [
    {
      bg: "dark",
      art: "rift",
      flash: "#4400ff",
      shake: 8,
      lines: [
        {
          text: "The timeline fractures.",
          delay: 0,
          color: "#cc88ff",
          size: 22,
        },
        {
          text: "You thought it was over.",
          delay: 2000,
          color: "#ff8866",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 4500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: Paradox residue detected in your neural pattern.",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "The Paradox Lord's death created a temporal echo.",
          delay: 2000,
          color: "#88ccff",
          size: 15,
        },
        {
          text: "Everything resets. Everything EXCEPT you.",
          delay: 4000,
          color: "#ffcc00",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "station",
      art: "hero_armed",
      lines: [
        {
          text: "You remember everything. The fights. The faces. The cost.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "This time, you're stronger. But so are they.",
          delay: 2500,
          color: "#ff4444",
          size: 16,
        },
        {
          text: "TIMELINE LOOP 1: THE ECHO",
          delay: 5000,
          color: "#cc88ff",
          size: 22,
        },
      ],
      particles: "sparks",
      duration: 7500,
    },
  ],

  /** NG+ Cycle 2 — "The Recursion" */
  ng_plus_cycle_2: [
    {
      bg: "dark",
      flash: "#ff0044",
      shake: 10,
      lines: [
        { text: "Not again.", delay: 0, color: "#ff4466", size: 24 },
        {
          text: "The rift. The loop. The beginning.",
          delay: 2000,
          color: "#ff8888",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 4500,
    },
    {
      bg: "dark",
      art: "lyra",
      lines: [
        {
          text: "LYRA: The data's clear. This isn't a glitch.",
          delay: 0,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "Someone — or something — is forcing the loop.",
          delay: 2000,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: "Each iteration, reality degrades. The enemies evolve.",
          delay: 4000,
          color: "#ff6644",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "station",
      art: "hero_armed",
      lines: [
        {
          text: "Your hands shake. Déjà vu is too gentle a word for this.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "But somewhere in this recursion lies an answer.",
          delay: 2500,
          color: "#00ffcc",
          size: 16,
        },
        {
          text: "TIMELINE LOOP 2: THE RECURSION",
          delay: 5000,
          color: "#ff4466",
          size: 22,
        },
      ],
      particles: "sparks",
      duration: 7500,
    },
  ],

  /** NG+ Cycle 3 — "The Convergence" */
  ng_plus_cycle_3: [
    {
      bg: "dark",
      flash: "#ffffff",
      shake: 14,
      lines: [
        { text: "The loop tightens.", delay: 0, color: "#ffffff", size: 28 },
        {
          text: "This is the last time.",
          delay: 2000,
          color: "#ff4444",
          size: 20,
        },
      ],
      particles: "embers",
      duration: 4500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: All timelines are converging on THIS iteration.",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "If you fail now, the loop becomes permanent.",
          delay: 2000,
          color: "#ff4444",
          size: 16,
        },
        {
          text: "No more chances. No more echoes.",
          delay: 4000,
          color: "#ff8866",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "dark",
      art: "lyra",
      lines: [
        {
          text: "LYRA: I've calculated it three hundred times.",
          delay: 0,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "The odds are terrible.",
          delay: 1800,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: "But you've never cared about odds.",
          delay: 3500,
          color: "#ffaa44",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 5500,
    },
    {
      bg: "station",
      art: "hero_armed",
      lines: [
        {
          text: "Every scar. Every memory. Every life you've saved and lost.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "They all lead here.",
          delay: 2500,
          color: "#ffffff",
          size: 18,
        },
        {
          text: "FINAL TIMELINE: THE CONVERGENCE",
          delay: 5000,
          color: "#ffcc00",
          size: 22,
        },
      ],
      particles: "sparks",
      duration: 7500,
    },
  ],

  /** True Ending — plays after completing NG+ cycle 3 */
  ng_plus_true_ending: [
    {
      bg: "dark",
      flash: "#ffffff",
      shake: 12,
      lines: [
        {
          text: "The Paradox Lord falls for the last time.",
          delay: 0,
          color: "#ffffff",
          size: 22,
        },
        {
          text: "But this time... no rift.",
          delay: 2500,
          color: "#aaddff",
          size: 18,
        },
        { text: "No echo. No loop.", delay: 4500, color: "#00ffcc", size: 18 },
      ],
      particles: "glow",
      duration: 7000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: Temporal signature... zero. Clean.",
          delay: 0,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: "No paradox residue. No recursive patterns.",
          delay: 2000,
          color: "#88ccff",
          size: 15,
        },
        {
          text: "You broke the loop. You actually broke it.",
          delay: 4000,
          color: "#00ffcc",
          size: 18,
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
          text: "Lyra runs to you. No words this time.",
          delay: 0,
          color: "#ffcc88",
          size: 16,
        },
        {
          text: "Just arms around you, tight, refusing to let go.",
          delay: 2000,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: '"You remember all of them? All the loops?"',
          delay: 4500,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: '"Every single one."',
          delay: 6500,
          color: "#00ffcc",
          size: 16,
        },
        {
          text: '"...Then you remember every time I said I love you."',
          delay: 8500,
          color: "#ffaa44",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 11000,
    },
    {
      bg: "station",
      art: "party",
      lines: [
        {
          text: "The team gathers. Not to fight. Not to plan.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Just to be together. In a timeline that finally holds.",
          delay: 2000,
          color: "#aaddff",
          size: 16,
        },
        {
          text: 'Voss raises a glass. "To the agent who lived four lifetimes."',
          delay: 4500,
          color: "#00ccff",
          size: 15,
        },
        {
          text: 'Miri rolls her eyes. "To the idiot I had to patch up four times."',
          delay: 6500,
          color: "#aaffcc",
          size: 15,
        },
        {
          text: 'Kai grins. "To the legend."',
          delay: 8500,
          color: "#ffcc88",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 11000,
    },
    {
      bg: "deep_space",
      lines: [
        {
          text: "Four timelines. Three acts each. One agent.",
          delay: 0,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "You've seen every version of this story.",
          delay: 2500,
          color: "#00ccff",
          size: 16,
        },
        {
          text: "And in every one, you chose to fight.",
          delay: 5000,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "That's not a loop. That's who you are.",
          delay: 7500,
          color: "#ffffff",
          size: 20,
        },
      ],
      particles: "stars",
      duration: 10500,
    },
    {
      bg: "dark",
      lines: [
        { text: "THE LOOP IS BROKEN", delay: 0, color: "#ffcc00", size: 28 },
        { text: "TRUE ENDING", delay: 2000, color: "#00ffcc", size: 24 },
        {
          text: "Thank you for playing.",
          delay: 4500,
          color: "#ffffff",
          size: 18,
        },
      ],
      duration: 7000,
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
          caption: "Chronos Station. 06:47. Nothing ever happens.",
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
          caption: "Badge 11235. Beat cop. Bad coffee.",
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
          caption: "Clock in. Do the job. Go home. Repeat until retirement.",
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
          caption: "Reality folded like cheap paper.",
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
          caption: "Everybody ran.",
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
          caption: "Command went dark. Comms: static.",
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
            "Not bravery. Just world-class stubbornness.",
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
          caption: "Temporal Combat Armor. Serial C-0017.",
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
          caption: "Helmet on. Visor down. Rifle hot.",
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
          caption: "\"CLOCK'S TICKING. SO AM I.\"",
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
          text: "Training's over. Reality doesn't grade on a curve.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "The other Alpha candidates washed out. All of them.",
          delay: 2200,
          color: "#aabbcc",
          size: 16,
        },
        { text: "You're what's left.", delay: 4800, color: "#00ccff", size: 17 },
      ],
      duration: 7500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        {
          text: "Something's wrong with time. The armor feels it first.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Chronal readings on your HUD: spiking. Hard.",
          delay: 2400,
          color: "#ff8844",
          size: 16,
        },
      ],
      duration: 6500,
    },
    {
      bg: "boss_lair",
      art: "villain",
      flash: "#ff2244",
      shake: 2,
      lines: [
        { text: "A voice. Not in the room. In your skull.", delay: 0, color: "#ff6644", size: 17 },
        {
          text: "\"There you are. I've enjoyed your little program.\"",
          delay: 1900,
          color: "#ff2244",
          size: 18,
        },
        {
          text: "\"The others broke so easily. You put on the suit.\"",
          delay: 4100,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 8500,
    },
    {
      bg: "dark",
      art: "rift",
      shake: 1,
      lines: [
        {
          text: "The lights stutter. The wall clock runs backwards.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        { text: "Then everything goes sideways.", delay: 2200, color: "#ff4444", size: 18 },
      ],
      particles: "embers",
      duration: 5500,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#ffffff",
      lines: [
        { text: "Alpha program: down to one. You.", delay: 0, color: "#aabbcc", size: 16 },
        {
          text: "Whatever that thing is, it just made this personal.",
          delay: 1500,
          color: "#00ccff",
          size: 18,
        },
        { text: "The hunt begins.", delay: 4100, color: "#00ffcc", size: 22 },
      ],
      particles: "glow",
      duration: 6500,
    },
  ],

  clocking_in: [
    {
      bg: "station",
      art: "station",
      lines: [
        { text: "06:47. Chronos Station.", delay: 0, color: "#556677", size: 14 },
        { text: "Coffee's burnt. Lift's busted.", delay: 1200, color: "#8899aa", size: 16 },
        {
          text: "Nothing ever happens on the morning shift.",
          delay: 2700,
          color: "#aabbcc",
          size: 16,
        },
      ],
      duration: 7000,
    },
    {
      bg: "dark",
      art: "hero_at_desk",
      lines: [
        { text: "Badge 11235. The scanner thinks about it.", delay: 0, color: "#8899aa", size: 16 },
        { text: "Front desk doesn't look up. Never has.", delay: 1900, color: "#aabbcc", size: 16 },
        { text: "\"Morning.\" Nothing. Love you too.", delay: 3700, color: "#667788", size: 15 },
      ],
      duration: 7500,
    },
    {
      bg: "dark",
      art: "hero_human",
      lines: [
        { text: "Three years at the Bureau. Still a cadet.", delay: 0, color: "#8899aa", size: 16 },
        {
          text: "Alpha exam: failed. Retook it. Failed faster.",
          delay: 1900,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "\"Too slow. Too stubborn.\" Only one of those is fixable.",
          delay: 4000,
          color: "#887766",
          size: 15,
        },
      ],
      duration: 9000,
    },
    {
      bg: "locker_room",
      lines: [
        {
          text: "Locker room. Third row, second from the left.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Opened it a thousand times. Mostly socks.",
          delay: 2100,
          color: "#aabbcc",
          size: 16,
        },
        { text: "Today, it's humming.", delay: 4300, color: "#00ccff", size: 17 },
      ],
      duration: 7000,
    },
    {
      bg: "locker_room",
      art: "armor_crate",
      lines: [
        {
          text: "An R&D crate. Your name stencilled on the lid.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "TEMPORAL COMBAT ARMOR — ALPHA PROTOTYPE",
          delay: 2100,
          color: "#00ccff",
          size: 18,
        },
        {
          text: "Supervisor's note: \"You're up. Don't scratch the paint.\"",
          delay: 3900,
          color: "#ccaa77",
          size: 16,
        },
      ],
      duration: 9000,
    },
    {
      bg: "dark",
      art: "hero",
      particles: "sparks",
      lines: [
        {
          text: "It fits. That's the first suspicious thing.",
          delay: 0,
          color: "#8899aa",
          size: 16,
        },
        {
          text: "Helmet on. Visor down. The HUD wakes up.",
          delay: 2000,
          color: "#00ffcc",
          size: 18,
        },
        {
          text: "Everything's sharper. Including the dread.",
          delay: 3900,
          color: "#00ccff",
          size: 16,
        },
      ],
      duration: 8000,
    },
    {
      bg: "dark",
      art: "aria",
      flash: "#00ddff",
      lines: [
        {
          text: "[ A.R.I.A. — ARMOR-RESIDENT INTELLIGENCE ASSIST — ONLINE ]",
          delay: 0,
          color: "#00aacc",
          size: 12,
        },
        {
          text: "\"Good morning, {AGENT}. I'm ARIA. I live in your suit now.\"",
          delay: 2600,
          color: "#00ffdd",
          size: 17,
        },
        {
          text: "\"Neural link solid. Vitals nominal. Posture, less so.\"",
          delay: 5200,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "A voice in your head. Calm. Annoyingly reassuring.",
          delay: 7600,
          color: "#8899aa",
          size: 16,
        },
      ],
      duration: 12000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"Heart rate just spiked. Nerves, or the coffee?\"",
          delay: 0,
          color: "#00ffdd",
          size: 17,
        },
        {
          text: "She can read your pulse. Of course she can.",
          delay: 2200,
          color: "#8899aa",
          size: 15,
        },
        {
          text: "\"I read a lot of things. Relax — I'm on your side.\"",
          delay: 4200,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: "\"You're my favourite cadet, {AGENT}. Sample size: one.\"",
          delay: 6500,
          color: "#00ffdd",
          size: 15,
        },
      ],
      duration: 11500,
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
          text: "ARIA: \"Opinions and excellent taste. You're welcome.\"",
          delay: 1900,
          color: "#00ffdd",
          size: 15,
        },
        { text: "Okay. Maybe today won't suck.", delay: 4300, color: "#8899aa", size: 16 },
      ],
      duration: 7500,
    },
    {
      bg: "locker_room",
      art: "hero_armed",
      flash: "#00ccff",
      lines: [
        {
          text: "Temporal rifle. Heavier than it looks. Most things are.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "ARIA: \"Tuned to your servos. Faster legs, harder hits.\"",
          delay: 2400,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "ARIA: \"Nobody drives it off the lot untrained. Range first.\"",
          delay: 4800,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "Time to find out what this thing can do.",
          delay: 7400,
          color: "#00ffcc",
          size: 18,
        },
      ],
      duration: 11500,
    },
  ],

  // Marvel-style flipbook intro — full-bleed page-turn pacing.
  // Each entry is one frame whose `flipbook.pages` array drives auto-paging.
  // Opens on a closed comic whose cover swings open onto page 1.
  intro_flipbook: [
    {
      bg: "dark",
      flipbook: {
        spineSide: "left",
        paperTint: "#0a0814",
        requireAction: true,
        cover: {
          bg: "boss_lair",
          art: "hero_armed",
          title: "CLOCKWORK CARNAGE",
          issue: "#1",
          tagline: "EVERY SECOND IS EVIDENCE",
        },
        pages: [
          {
            hold: 1600,
            flipMs: 650,
            panel: {
              bg: "station",
              caption: "CHRONOS STATION — 06:47. A quiet morning. The last one.",
              captionPos: "top",
              captionColor: "#1a1208",
              captionSize: 14,
              halftone: 0.18,
            },
          },
          {
            hold: 1600,
            flipMs: 650,
            panel: {
              bg: "dark",
              art: "hero_at_desk",
             
              caption: "Badge 11235. Beat cop. Nobody's idea of a hero.",
              captionPos: "bottom",
              captionColor: "#1a1208",
              captionSize: 13,
            },
          },
          {
            hold: 1500,
            flipMs: 650,
            panel: {
              bg: "deep_space",
              art: "rift",
              caption: "Then somebody broke the sky.",
              captionPos: "top",
              captionColor: "#a01010",
              captionSize: 16,
              sfx: "KRAA-KOOM",
              sfxColor: "#ffcc00",
              sfxSize: 36,
              sfxX: 0.7,
              sfxY: 0.45,
              sfxRot: -10,
              action: true,
              halftone: 0.12,
            },
          },
          {
            hold: 1500,
            flipMs: 650,
            panel: {
              bg: "boss_lair",
              art: "villain",
              caption: "Something came through. It took its time.",
              captionPos: "bottom",
              captionColor: "#1a1208",
              captionSize: 14,
              action: true,
            },
          },
          {
            hold: 1700,
            flipMs: 650,
            panel: {
              bg: "deep_space",
              art: "villain_final",
              caption: "The Paradox Lord. Older than clocks. Never late.",
              captionPos: "top",
              captionColor: "#a01010",
              captionSize: 13,
              halftone: 0.18,
            },
          },
          {
            hold: 1700,
            flipMs: 650,
            panel: {
              bg: "station",
              art: "hero_human",
             
              caption: "Command went dark. Everybody ran. One cadet didn't.",
              captionPos: "center",
              captionColor: "#1a1208",
              captionSize: 13,
              halftone: 0.12,
            },
          },
          {
            hold: 2000,
            flipMs: 0,
            panel: {
              bg: "dark",
              art: "hero_armed",
              caption: "{AGENT}. Suit up. The world ends on your shift.",
              captionPos: "center",
              captionColor: "#1a1208",
              captionSize: 16,
              prompt: "PRESS SPACE / CLICK TO BEGIN TRAINING",
              promptColor: "#00ffcc",
              promptSize: 18,
              promptY: 0.78,
              halftone: 0.15,
            },
          },
        ],
      },
      title: "ISSUE #1",
      duration: 12200,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT II TRANSITION — Entering the Reactor Core
  // Flipbook page-turn bridging Acts I → II
  // ═══════════════════════════════════════════════════════════════════
  act2_transition_fb: [
    {
      bg: "dark",
      flipbook: {
        spineSide: "left",
        paperTint: "#0a0800",
        pages: [
          { hold: 1400, flipMs: 600, panel: { bg: "station", caption: "Security protocols failing. Sector 7 breached.", captionPos: "top", captionColor: "#ff8844", captionSize: 13, halftone: 0.12 } },
          { hold: 1200, flipMs: 500, panel: { bg: "reactor", art: "rift", caption: "The reactor's chronal shielding is destabilizing.", captionPos: "bottom", captionColor: "#ffaa00", captionSize: 13, sfx: "BREACH", sfxColor: "#ff6622", sfxSize: 32, sfxX: 0.7, sfxY: 0.35, sfxRot: -8, action: true } },
          { hold: 1300, flipMs: 550, panel: { bg: "reactor", caption: "ARIA: \"Temporal readings are off the charts. Whatever's down there — it's awake.\"", captionPos: "center", captionColor: "#1a1208", captionSize: 12 } },
          { hold: 1100, flipMs: 500, panel: { bg: "boss_lair", art: "villain", caption: "His voice again. Closer now.", captionPos: "bottom", captionColor: "#a01010", captionSize: 13, action: true, halftone: 0.16 } },
          { hold: 1400, flipMs: 550, panel: { bg: "reactor", art: "hero_armed", caption: "Deeper into the station. Deeper into the fracture.", captionPos: "center", captionColor: "#1a1208", captionSize: 14 } },
          { hold: 1800, flipMs: 0, panel: { bg: "reactor", caption: "ACT II — THE REACTOR", captionPos: "center", captionColor: "#ff8844", captionSize: 20 } },
        ],
      },
      title: "ACT II",
      duration: 9400,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT III TRANSITION — The Final Fracture
  // Flipbook page-turn bridging Acts II → III
  // ═══════════════════════════════════════════════════════════════════
  act3_transition_fb: [
    {
      bg: "dark",
      flipbook: {
        spineSide: "right",
        paperTint: "#0a0010",
        pages: [
          { hold: 1500, flipMs: 650, panel: { bg: "temporal_rift", art: "rift", caption: "Reality is coming apart at the seams.", captionPos: "top", captionColor: "#ff2244", captionSize: 14, action: true, halftone: 0.14 } },
          { hold: 1200, flipMs: 550, panel: { bg: "deep_space", caption: "The loop is tightening. Every timeline converging.", captionPos: "center", captionColor: "#1a1208", captionSize: 12 } },
          { hold: 1300, flipMs: 600, panel: { bg: "boss_lair", art: "villain_form2", sfx: "CRACK", sfxColor: "#ff0066", sfxSize: 36, sfxX: 0.65, sfxY: 0.4, sfxRot: -10, caption: "The Paradox Lord sheds his skin.", captionPos: "bottom", captionColor: "#a01010", captionSize: 13, action: true } },
          { hold: 1400, flipMs: 550, panel: { bg: "temporal_rift", caption: "ARIA: \"His temporal signature... it matches Voss. 94 percent.\"", captionPos: "center", captionColor: "#1a1208", captionSize: 12 } },
          { hold: 1100, flipMs: 500, panel: { bg: "deep_space", art: "villain_final", caption: "Not a monster. A mirror.", captionPos: "top", captionColor: "#ff4466", captionSize: 14, halftone: 0.18, action: true } },
          { hold: 1500, flipMs: 600, panel: { bg: "temporal_rift", art: "hero_armed", caption: "One shot. One timeline. No second chances.", captionPos: "center", captionColor: "#1a1208", captionSize: 14 } },
          { hold: 2000, flipMs: 0, panel: { bg: "boss_lair", caption: "ACT III — THE PARADOX CORE", captionPos: "center", captionColor: "#ff2244", captionSize: 20, halftone: 0.12 } },
        ],
      },
      title: "ACT III",
      duration: 11800,
    },
  ],
};
