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
      title: "ELEVEN SECONDS",
      lines: [
        {
          text: "Someone fired up the Chronos Engine. No clearance. No name.",
          delay: 0,
          color: "#aabbcc",
          size: 16,
        },
        { text: "The experiment ran for eleven seconds.", delay: 2600, color: "#ffcc88", size: 16 },
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
          text: "You: {AGENT}. Cadet. Wearing a prototype nobody signed for.",
          delay: 0,
          color: "#00ffcc",
          size: 20,
        },
        { text: "Whoever built it knows you have it.", delay: 2700, color: "#ffffff", size: 22 },
      ],
      particles: "glow",
      duration: 6000,
    },
    {
      bg: "dark",
      art: "hero_armed",
      title: "MISSION ORDERS",
      lines: [
        { text: "Work the scene.", delay: 0, color: "#00ffcc", size: 18 },
        { text: "Reach the Paradox Core.", delay: 900, color: "#ffcc00", size: 22 },
        { text: "Find out who did this.", delay: 2100, color: "#ff2244", size: 26 },
      ],
      flash: "#00ccff",
      duration: 5500,
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
          text: "V̷—̵: \"Stay three steps ahead. The timeline punishes—\"",
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
      voice: "voss",
      lines: [
        {
          text: "V̷—̵: \"Ambush point is here. Miss the window and—\"",
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
      voice: "miri",
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
      voice: "kai",
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
      art: "unknown_recording",
      lines: [
        {
          text: "A cracked monitor loops a recording. The face is pure static.",
          delay: 0,
          color: "#aabbcc",
          size: 14,
        },
        {
          text: "UNKNOWN: \"Stay three steps ahead. The timeline punishes improvisation.\"",
          delay: 2700,
          color: "#4488cc",
          size: 15,
        },
        {
          text: "ARIA: \"That phrase. Your memory fragment. Same voice.\"",
          delay: 5600,
          color: "#00ffdd",
          size: 14,
        },
        {
          text: "ARIA: \"Author field's wiped. Someone's cleaning up after him.\"",
          delay: 7900,
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
          text: "\"Prisoner logs keep mentioning 'the Doctor.' Never a name.\"",
          delay: 4800,
          color: "#00ffdd",
          size: 14,
        },
        {
          text: "\"Your sealed record has one redacted name. Same clearance code.\"",
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
      art: "redacted_file",
      voice: "aria",
      lines: [
        {
          text: "\"Mainframe access. Give me a second to commit a few felonies.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Running the voice from that recording against personnel.\"",
          delay: 2700,
          color: "#00ffdd",
          size: 14,
        },
        {
          text: "\"Every file on him is redacted. Every file but one.\"",
          delay: 5400,
          color: "#ffcc00",
          size: 15,
        },
      ],
      duration: 9500,
    },
    {
      bg: "dark",
      art: "portrait_voss",
      flash: "#cc44ff",
      lines: [
        { text: "DR. ELIAS VOSS", delay: 0, color: "#cc44ff", size: 24 },
        {
          text: "\"The voice on the tape. 'The Doctor.' The name blacked out of your file.\"",
          delay: 1300,
          color: "#ffcc00",
          size: 15,
        },
        {
          text: "\"Official status: DECEASED. Three years ago.\"",
          delay: 4600,
          color: "#ff4444",
          size: 16,
        },
        { text: "\"Somebody forgot to tell him.\"", delay: 6800, color: "#ff8844", size: 16 },
      ],
      duration: 10500,
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
        {
          text: "\"And your dilation module's sealed. Even I can't get in there. I don't love that.\"",
          delay: 7200,
          color: "#00ffdd",
          size: 14,
          emotion: "worried",
        },
      ],
      duration: 11500,
    },
    {
      bg: "dark",
      art: "redacted_file",
      voice: "unknown",
      emotion: "urgent",
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
        { text: "ARIA: Decrypting the rest of Voss's file...", delay: 0, color: "#00ffdd", size: 14 },
        {
          text: "DR. ELIAS VOSS — PROJECT LEAD, CHRONOS DIVISION",
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
      voice: "aria",
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
      lines: [
        { text: "A note taped to the bench, in a careful hand:", delay: 0, color: "#8899aa", size: 15 },
        { text: "C-0017 — GOVERNOR MANDATORY. THE SHARD SINGS.", delay: 1900, color: "#cc88ff", size: 17 },
        { text: "Your suit hums, as if it heard its name.", delay: 4100, color: "#00ccff", size: 15 },
      ],
      particles: "sparks",
      duration: 7000,
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
      // Her own words, in her own voice: the player meets her in Act II.
      voice: "lyra",
      emotion: "calm",
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

  // ── Voss Confrontation (III-4, in his laboratory) ─────────────────
  voss_confrontation: [
    {
      bg: "boss_lair",
      art: "villain_form2",
      flash: "#cc44ff",
      lines: [
        { text: "\"You read my file.\"", delay: 0, color: "#cc44ff", size: 20 },
        {
          text: "\"Then you know I wasn't wrong. Just early.\"",
          delay: 1000,
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
          text: "\"Reckless. Unauthorised. A disaster. Their words.\"",
          delay: 0,
          color: "#ff6644",
          size: 15,
        },
        {
          text: "\"Eleven seconds, and I held all of time in my hands.\"",
          delay: 2200,
          color: "#cc44ff",
          size: 16,
        },
        {
          text: "\"Seven years of proposals. Seven years of 'no.'\"",
          delay: 4600,
          color: "#ff4422",
          size: 15,
        },
        {
          text: "\"I was always three steps ahead of them.\"",
          delay: 6800,
          color: "#cc88ff",
          size: 16,
        },
        { text: "\"Now I'm ahead of everyone.\"", delay: 8700, color: "#ff0088", size: 22 },
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
          text: "\"I didn't become this overnight, Cadet.\"",
          delay: 0,
          color: "#ff88aa",
          size: 16,
        },
        {
          text: "\"I've rewound that night ten thousand times.\"",
          delay: 1900,
          color: "#ff2266",
          size: 18,
        },
        {
          text: "\"The station dies every time. So I stopped trying to save it.\"",
          delay: 4000,
          color: "#ff4488",
          size: 15,
        },
      ],
      particles: "embers",
      duration: 8000,
    },
  ],

  // IV-4's pre-brief: the Nexus left Act I (spec decision 8). Its ARIA line
  // about the stubborn idiot moved into paradox_core_briefing; the quip from
  // the retired level2_briefing moved here.
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
          text: "\"Temporal readings in there are frankly rude.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Try not to die. I'm getting used to the company.\"",
          delay: 2100,
          color: "#00ffdd",
          size: 14,
          emotion: "tender",
        },
      ],
      duration: 6000,
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
          text: "\"Come in, Cadet. Let's see what my suit sees in you.\"",
          delay: 4000,
          color: "#ff2244",
          size: 18,
        },
      ],
      particles: "embers",
      duration: 8500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"He built it. He knows every weak point.\"",
          delay: 0,
          color: "#ffcc00",
          size: 15,
        },
        {
          text: "\"He's never met the stubborn idiot inside it. That's our edge.\"",
          delay: 2100,
          color: "#00ffdd",
          size: 16,
          emotion: "warm",
        },
      ],
      duration: 6500,
    },
  ],

  // III-7, the Core's second visit: the Lord's parable, aimed at the Voss who
  // chose the other way (voss_3), before Form 2. act2_level9 follows.
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
        { text: "Second visit. This time you brought backup.", delay: 900, color: "#ff4488", size: 16 },
      ],
      particles: "embers",
      shake: 3,
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: "\"All of you. All this way, just for me?\"",
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
      art: "villain_form2",
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
      art: "villain_form2",
      lines: [
        {
          text: "\"And since you'll be dust in a minute...\"",
          delay: 0,
          color: "#cc4466",
          size: 15,
        },
        { text: "\"...indulge an old god. A story.\"", delay: 1900, color: "#cc4466", size: 15 },
      ],
      particles: "embers",
      duration: 5500,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: "\"There was a man who taught time to sit and stay.\"",
          delay: 0,
          color: "#ff6688",
          size: 15,
        },
        {
          text: "\"He could stop a fall halfway down.\"",
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
      art: "villain_form2",
      lines: [
        {
          text: "\"His own equation ate him alive. Poetic.\"",
          delay: 0,
          color: "#cc88aa",
          size: 15,
        },
        {
          text: "\"He could save anyone. Except himself.\"",
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
      art: "villain_form2",
      lines: [
        {
          text: "\"You've met him, haven't you? In your little fragments.\"",
          delay: 0,
          color: "#ff88aa",
          size: 15,
          emotion: "curious",
        },
        {
          text: "\"The good doctor. He threw himself into the paradox to hold me still.\"",
          delay: 2400,
          color: "#cc88aa",
          size: 15,
        },
        {
          text: "\"Ten thousand takes later, I'm still here. He's the one who's stuck.\"",
          delay: 5200,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 9000,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
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
          text: "PARADOX LORD: \"...There. I felt that.\"",
          delay: 3300,
          color: "#ff88aa",
          size: 16,
          emotion: "curious",
        },
        {
          text: "PARADOX LORD: \"My eleven seconds. In someone else's hands.\"",
          delay: 5400,
          color: "#ff4466",
          size: 16,
          emotion: "curious",
        },
      ],
      duration: 9000,
      particles: "glow",
    },
    {
      bg: "boss_lair",
      shake: 4,
      lines: [
        {
          text: "The suit vents raw time and hurls you clear.",
          delay: 0,
          color: "#00aaff",
          size: 16,
        },
        { text: "You live. Barely. Mostly out of spite.", delay: 2300, color: "#ffffff", size: 18 },
      ],
      duration: 5500,
      particles: "glow",
    },
    {
      bg: "dark",
      lines: [
        { text: "END OF ACT I", delay: 0, color: "#334455", size: 28 },
        { text: "— THE FALL —", delay: 800, color: "#00ccff", size: 18 },
      ],
      duration: 4000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT II — THE GATHERING
  // The hero recovers, finds allies, trains together
  // Like Goku gathering the Z-Fighters / Chief rallying Spartans
  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // ACT II — THE GATHERING (on screen: THE BONDS)
  // One recruit per chapter: Lyra, Rook, Nova, Kael. Each tagline appears
  // once, in that person's own scene, and nobody is introduced twice. Party
  // frames name who is there; nobody stands in the lineup before joining.
  // ═══════════════════════════════════════════════════════════════════

  /** Act II opener, after the flipbook: out of the Core on a stranger's word. */
  gathering_extraction: [
    {
      bg: "boss_lair",
      shake: 3,
      lines: [
        { text: "The Core is still coming down.", delay: 0, color: "#ff8844", size: 18 },
        {
          text: "Under the rubble, your suit reboots one system at a time.",
          delay: 1600,
          color: "#aabbcc",
          size: 15,
        },
        { text: "Legs. Lungs. Then a voice that isn't ARIA's.", delay: 3900, color: "#8899aa", size: 16 },
      ],
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "dark",
      art: "redacted_file",
      voice: "unknown",
      emotion: "urgent",
      lines: [
        { text: "[ENCRYPTED CHANNEL — SOURCE UNKNOWN]", delay: 0, color: "#556677", size: 13 },
        { text: "\"Found you. Don't talk. Breathe, then move.\"", delay: 1500, color: "#4488ff", size: 16 },
        {
          text: "\"Service shaft, left of the reactor ring. It's still standing. For now.\"",
          delay: 3900,
          color: "#4488ff",
          size: 15,
        },
        { text: "\"There's a lift at the bottom. Get to it.\"", delay: 6700, color: "#4488ff", size: 15 },
      ],
      duration: 9500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"Encrypted six ways. Whoever that is, they're good.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
          emotion: "worried",
        },
        {
          text: "\"They also know this station better than its own maps.\"",
          delay: 2300,
          color: "#00ffdd",
          size: 15,
          emotion: "curious",
        },
        {
          text: "\"I don't love trusting a stranger. I love the ceiling even less. Go.\"",
          delay: 4800,
          color: "#ffcc00",
          size: 16,
          emotion: "urgent",
        },
      ],
      duration: 8500,
    },
    {
      bg: "reactor",
      art: "hero_fallen",
      lines: [
        { text: "A minute ago you were winning.", delay: 0, color: "#8899aa", size: 16 },
        {
          text: "Now you're running on a cracked rib and a stranger's word.",
          delay: 1700,
          color: "#00ffcc",
          size: 17,
        },
      ],
      particles: "embers",
      duration: 5500,
    },
  ],

  /** II-1 → II-2. The lift, and a face at last: Analyst L.M. */
  gathering_lyra: [
    {
      bg: "station",
      shake: 2,
      lines: [
        { text: "The lift doors close on the hunters.", delay: 0, color: "#aabbcc", size: 16 },
        {
          text: "Something hits them from the other side. Twice. Then nothing.",
          delay: 1800,
          color: "#ff8844",
          size: 15,
        },
      ],
      duration: 5000,
    },
    {
      bg: "station",
      art: "lyra",
      emotion: "calm",
      lines: [
        {
          text: "A woman at the controls. Bureau jacket. No rank pins.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        { text: "LYRA — Analyst. Right three times. Deleted three times.", delay: 2400, color: "#ffaa44", size: 16 },
        { text: "\"Marsden. L.M., on the file you found.\"", delay: 4700, color: "#ffaa44", size: 16 },
        {
          text: "\"I've been steering this case from inside Bureau ops since before you put the suit on.\"",
          delay: 6600,
          color: "#ffcc88",
          size: 15,
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
          text: "\"The crate with your name on it. That was me.\"",
          delay: 0,
          color: "#ffaa44",
          size: 16,
          emotion: "calm",
        },
        {
          text: "\"I watched your readings for months. They don't drift.\"",
          delay: 2400,
          color: "#ffaa44",
          size: 16,
          emotion: "curious",
        },
        {
          text: "\"Everyone else saw a beat cop. I saw the one thing he can't predict.\"",
          delay: 4900,
          color: "#ffcc88",
          size: 16,
          emotion: "tender",
        },
      ],
      particles: "glow",
      duration: 9500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"Voiceprint check. Same voice as the channel at the reactor.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
          emotion: "curious",
        },
        {
          text: "\"'I've seen how this ends.' That was you.\"",
          delay: 2600,
          color: "#00ffdd",
          size: 16,
        },
      ],
      duration: 5500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        { text: "\"The reactor?\"", delay: 0, color: "#ffaa44", size: 16, emotion: "curious" },
        { text: "She goes very still.", delay: 1300, color: "#aabbcc", size: 15 },
        {
          text: "\"I never sent you anything from the reactor.\"",
          delay: 2800,
          color: "#ffaa44",
          size: 16,
          emotion: "worried",
        },
        {
          text: "\"...It's my voice, though. I'll work out when.\"",
          delay: 5200,
          color: "#ffcc88",
          size: 15,
          emotion: "curious",
        },
      ],
      particles: "glow",
      duration: 9000,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: "\"Anyone else who did what you did in there would have come apart.\"",
          delay: 0,
          color: "#ffaa44",
          size: 15,
          emotion: "calm",
        },
        {
          text: "\"You don't drift. You're a fixed point. I'll explain when we're not in a lift.\"",
          delay: 2800,
          color: "#ffaa44",
          size: 15,
          emotion: "calm",
        },
        {
          text: "\"And stop shifting unless you have to. Every time you do, you ring a bell he built.\"",
          delay: 6000,
          color: "#ff8844",
          size: 15,
          emotion: "worried",
        },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: "The lift drops through the dark. She doesn't let go of the rail.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "\"Three reports on Voss. You're the first person who read to the end.\"",
          delay: 2400,
          color: "#ffaa44",
          size: 16,
          emotion: "tender",
        },
        { text: "\"I'm not a field agent.\"", delay: 5200, color: "#ffcc88", size: 15, emotion: "tender" },
        { text: "\"I'm coming anyway.\"", delay: 6600, color: "#ffaa44", size: 18, emotion: "calm" },
      ],
      particles: "glow",
      duration: 9500,
    },
  ],

  /** II-2 briefing: the Salvage Deck, and a man protecting his doors. */
  gathering_rook: [
    {
      bg: "station",
      lines: [
        { text: "SALVAGE DECK — DOCKING RING", delay: 0, color: "#00ccff", size: 20 },
        { text: "Scrap, turrets, and one very locked door.", delay: 1300, color: "#aabbcc", size: 16 },
      ],
      duration: 4000,
    },
    {
      bg: "station",
      art: "lyra",
      emotion: "calm",
      lines: [
        {
          text: "\"Your armour split in the Core. Nothing on this ring can fix it.\"",
          delay: 0,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "\"One man could. Engine maintenance crew, before the incident.\"",
          delay: 2600,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "\"He doesn't want visitors. He's been very clear about that.\"",
          delay: 5100,
          color: "#ffcc88",
          size: 15,
        },
      ],
      duration: 8500,
    },
    {
      bg: "station",
      art: "rook",
      voice: "rook",
      lines: [
        {
          text: "A scrap hangar, walled in with turrets. Someone inside is welding the blast doors shut.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        { text: "ROOK — Engineer. Builds anything. Trusts nobody.", delay: 2800, color: "#44ff88", size: 16 },
        {
          text: "\"Don't thank me. I'm protecting the doors, not you.\"",
          delay: 5000,
          color: "#44ff88",
          size: 15,
          emotion: "angry",
        },
        {
          text: "Looters coming up the dock. He doesn't stop welding.",
          delay: 7400,
          color: "#aabbcc",
          size: 15,
        },
      ],
      particles: "sparks",
      duration: 10000,
    },
    {
      bg: "station",
      art: "rook",
      voice: "rook",
      lines: [
        { text: "\"You want that suit fixed, hold my hangar.\"", delay: 0, color: "#44ff88", size: 16 },
        {
          text: "\"Crane on the far dock has a power coupling. Bring it back in one piece.\"",
          delay: 2200,
          color: "#44ff88",
          size: 15,
        },
        { text: "He hands you a spare battery anyway.", delay: 5200, color: "#aabbcc", size: 15 },
        { text: "\"It's not a gift. It's a deposit.\"", delay: 6900, color: "#44ff88", size: 15 },
      ],
      particles: "sparks",
      duration: 9500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: "\"Looters are led by a Shield Commander. Same trick as Containment: flank it.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Grumpy, armed, and right about the doors. I like him already.\"",
          delay: 2800,
          color: "#00ffdd",
          size: 15,
          emotion: "happy",
        },
      ],
      duration: 6000,
    },
  ],

  /** II-2 → II-3. Rook opens the suit and finds the storm inside it. */
  gathering_rook_shard: [
    {
      bg: "station",
      art: "rook",
      voice: "rook",
      lines: [
        { text: "The hangar holds. Rook finally looks at your suit.", delay: 0, color: "#aabbcc", size: 15 },
        {
          text: "\"Who fitted this module? It's not on any spec I ever signed.\"",
          delay: 2000,
          color: "#44ff88",
          size: 15,
          emotion: "curious",
        },
        {
          text: "He opens your chest plate like a man defusing something.",
          delay: 4600,
          color: "#aabbcc",
          size: 15,
        },
      ],
      particles: "sparks",
      duration: 7500,
    },
    {
      bg: "dark",
      art: "rook",
      voice: "rook",
      emotion: "worried",
      flash: "#44ff88",
      shake: 1,
      lines: [
        { text: "\"This isn't a battery. It's a piece of the Engine.\"", delay: 0, color: "#44ff88", size: 16 },
        { text: "\"Eleven seconds, bottled.\"", delay: 2300, color: "#ffcc44", size: 18 },
        {
          text: "\"Somebody put a storm in your chest and called it a feature.\"",
          delay: 3900,
          color: "#44ff88",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 8000,
    },
    {
      bg: "dark",
      art: "aria",
      emotion: "sad",
      lines: [
        {
          text: "\"There was a governor on it. A lid. I burned it out in the Core to save you.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Every time he finds us, that's on me.\"",
          delay: 3000,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"I'd do it again. I just want you to know I know.\"",
          delay: 5000,
          color: "#ffffff",
          size: 16,
        },
      ],
      duration: 9000,
    },
    {
      bg: "station",
      art: "rook",
      voice: "rook",
      lines: [
        { text: "\"Can't put the lid back. It's slag.\"", delay: 0, color: "#44ff88", size: 15, emotion: "neutral" },
        { text: "\"Can make it quieter.\"", delay: 1900, color: "#44ff88", size: 16, emotion: "calm" },
        {
          text: "He starts laying out tools. It's the first time he's turned his back on you.",
          delay: 3600,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "\"There's audio buried under the firmware. Old. You want to hear it?\"",
          delay: 6400,
          color: "#44ff88",
          size: 15,
          emotion: "curious",
        },
      ],
      particles: "sparks",
      duration: 10000,
    },
  ],
  /** II-3 → II-4. The Transit Loop, and the fastest thing on the station. */
  gathering_nova: [
    {
      bg: "station",
      lines: [
        { text: "TRANSIT LOOP — MONORAIL RING", delay: 0, color: "#00ccff", size: 20 },
        {
          text: "The trains still run, on a schedule nobody wrote.",
          delay: 1300,
          color: "#aabbcc",
          size: 16,
        },
      ],
      duration: 4000,
    },
    {
      bg: "station",
      art: "nova",
      voice: "nova",
      lines: [
        { text: "Something blurs past. Three looters are already down.", delay: 0, color: "#aabbcc", size: 15 },
        { text: "NOVA — Striker. Fastest thing on the station.", delay: 2400, color: "#ff4488", size: 16 },
        {
          text: "\"Keep up or keep out of my way. Your call.\"",
          delay: 4500,
          color: "#ff4488",
          size: 16,
          emotion: "happy",
        },
      ],
      particles: "sparks",
      duration: 7500,
    },
    {
      bg: "station",
      art: "lyra",
      emotion: "calm",
      lines: [
        {
          text: "\"She knows the ring. Every junction, every train. We need the far side.\"",
          delay: 0,
          color: "#ffaa44",
          size: 15,
        },
        { text: "\"She won't wait for us.\"", delay: 2800, color: "#ffcc88", size: 15 },
      ],
      duration: 5500,
    },
    {
      bg: "station",
      art: "nova",
      voice: "nova",
      lines: [
        { text: "\"Squads are slow.\"", delay: 0, color: "#ff4488", size: 16, emotion: "neutral" },
        {
          text: "\"Tell you what. Beat me to the junction and I'll run with you.\"",
          delay: 1700,
          color: "#ff4488",
          size: 15,
          emotion: "excited",
        },
        { text: "\"For now.\"", delay: 4300, color: "#ff88aa", size: 16, emotion: "happy" },
        { text: "She's gone before you can answer.", delay: 5400, color: "#aabbcc", size: 15 },
      ],
      particles: "sparks",
      duration: 8000,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: "\"Beasts on the rails. Shift and they get faster, not slower.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
          emotion: "worried",
        },
        { text: "\"Don't lean on it. Just run.\"", delay: 2600, color: "#ffcc00", size: 16, emotion: "urgent" },
      ],
      duration: 5500,
    },
  ],

  /** II-4 → II-5. Somewhere green. Miri comes back. */
  gathering_greenhouse: [
    {
      bg: "station",
      lines: [
        { text: "THE GREENHOUSE — HYDROPONICS RING", delay: 0, color: "#44ff88", size: 20 },
        { text: "The only warm light left on the station.", delay: 1400, color: "#aaccbb", size: 16 },
      ],
      particles: "glow",
      duration: 4500,
    },
    {
      bg: "station",
      art: "party",
      party: ["lyra", "you", "nova", "rook"],
      lines: [
        { text: "Nova made the junction first. She'd like everyone to know by how much.", delay: 0, color: "#aabbcc", size: 15 },
        { text: "\"Four seconds. I counted.\"", delay: 2600, color: "#ff4488", size: 16, voice: "nova", emotion: "happy" },
        { text: "Rook is asleep sitting up, wrench still in his hand.", delay: 4400, color: "#44ff88", size: 15 },
        {
          text: "Lyra runs numbers under a grow lamp. Water drips somewhere, patient.",
          delay: 6600,
          color: "#ffcc88",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 10000,
    },
    {
      bg: "dark",
      art: "fragment_green",
      flash: "#003322",
      lines: [
        { text: "[MEMORY RECONSTRUCTION: MIRI — 25% → 50%]", delay: 0, color: "#44cc88", size: 12 },
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
          text: "The warmth comes back first. Then the face.",
          delay: 0,
          color: "#aaccbb",
          size: 15,
        },
        {
          text: "MIRI — Medic. Steady hands. Terrible jokes.",
          delay: 2000,
          color: "#44ff88",
          size: 17,
        },
        {
          text: "She spent her last dose on you. She wanted a clinic somewhere green.",
          delay: 4000,
          color: "#88ccaa",
          size: 15,
        },
        { text: "Somewhere like this.", delay: 6700, color: "#ffffff", size: 16 },
      ],
      particles: "sparks",
      duration: 9500,
    },
    {
      bg: "station",
      art: "aria",
      emotion: "tender",
      lines: [
        { text: "\"You were humming just now.\"", delay: 0, color: "#00ffdd", size: 15 },
        { text: "\"I don't know the song. I think I'd like to.\"", delay: 2000, color: "#00ffdd", size: 15 },
      ],
      particles: "glow",
      duration: 5500,
    },
  ],

  /**
   * II-5 → II-6, the mid-act turn: the Lord on every screen, the Hound
   * through the glass, and Nova, who runs, and comes back the other way.
   */
  hound_attack: [
    {
      bg: "station",
      lines: [
        { text: "EVERY SCREEN, ONE FACE", delay: 0, color: "#ff2244", size: 22 },
        {
          text: "Every monitor on the ring lights up at once.",
          delay: 1200,
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
        { text: "\"Oh. You found some strays.\"", delay: 0, color: "#ff4466", size: 18 },
        { text: "\"How sentimental.\"", delay: 1400, color: "#ff6688", size: 16 },
        {
          text: "\"I've watched you die in a thousand timelines. Always alone.\"",
          delay: 2600,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "\"And you keep ringing my bell, Cadet. I hear every one.\"",
          delay: 5300,
          color: "#ff4466",
          size: 16,
          emotion: "curious",
        },
        {
          text: "\"Friends just give me more to break.\"",
          delay: 8000,
          color: "#ff2244",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 11000,
    },
    {
      bg: "station",
      art: "party",
      party: ["lyra", "you", "nova", "rook"],
      lines: [
        { text: "Rook yanks the monitor's power. Then the next one's.", delay: 0, color: "#44ff88", size: 15 },
        {
          text: "\"He talks a lot for a guy who's winning.\"",
          delay: 2200,
          color: "#ff4488",
          size: 15,
          voice: "nova",
          emotion: "happy",
        },
        { text: "Lyra doesn't look up from her data.", delay: 4400, color: "#ffcc88", size: 15 },
        { text: "\"He's rattled.\"", delay: 6000, color: "#ffaa44", size: 17, voice: "lyra", emotion: "calm" },
      ],
      duration: 8500,
    },
    {
      bg: "station",
      flash: "#ffffff",
      shake: 6,
      lines: [
        { text: "Then the glass wall comes in.", delay: 0, color: "#ffffff", size: 20 },
        {
          text: "Something steps through the shards. A suit, standing. Nobody in it.",
          delay: 1500,
          color: "#ffd79a",
          size: 16,
        },
        {
          text: "It stutters, a few frames behind itself. Its empty helmet turns toward you. Listening.",
          delay: 4200,
          color: "#ff8844",
          size: 15,
        },
      ],
      particles: "sparks",
      duration: 8000,
    },
    {
      bg: "station",
      art: "nova",
      voice: "nova",
      emotion: "afraid",
      lines: [
        { text: "Nova is already running.", delay: 0, color: "#ff4488", size: 17 },
        { text: "\"No. No, no, no—\"", delay: 1400, color: "#ff88aa", size: 16 },
        { text: "She's gone before the glass stops falling.", delay: 2900, color: "#aabbcc", size: 15 },
      ],
      shake: 3,
      duration: 5500,
    },
    {
      bg: "dark",
      shake: 8,
      flash: "#ff4488",
      lines: [
        { text: "The claw comes down.", delay: 0, color: "#ff4444", size: 20 },
        { text: "Then a blur. Backwards.", delay: 1400, color: "#ff88aa", size: 18 },
        {
          text: "Nova is there, three seconds ago, dragging you out of where you were about to be.",
          delay: 2800,
          color: "#ffffff",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 7000,
    },
    {
      bg: "station",
      art: "nova",
      voice: "nova",
      lines: [
        { text: "\"Not this time.\"", delay: 0, color: "#ff4488", size: 20, emotion: "urgent" },
        {
          text: "The suit loses you. It listens a while longer. Then it walks back into the dark, patient.",
          delay: 1600,
          color: "#aabbcc",
          size: 15,
        },
      ],
      particles: "sparks",
      duration: 6500,
    },
    {
      bg: "station",
      art: "party",
      party: ["lyra", "you", "nova", "rook"],
      lines: [
        { text: "Later. Nobody's slept.", delay: 0, color: "#8899aa", size: 15 },
        { text: "Nova sits with her back to the wall. Her hands won't stop shaking.", delay: 1600, color: "#aabbcc", size: 15 },
        {
          text: "\"Last time the world ended, I ran. Everyone I left stayed gone.\"",
          delay: 4000,
          color: "#ff4488",
          size: 16,
          voice: "nova",
          emotion: "sad",
        },
        {
          text: "\"Turns out I can run the other way too.\"",
          delay: 7300,
          color: "#ff88aa",
          size: 17,
          voice: "nova",
          emotion: "happy",
        },
      ],
      particles: "glow",
      duration: 10500,
    },
  ],

  /** II-6 briefing: the Precinct, and the man who won't come down from it. */
  gathering_kael: [
    {
      bg: "locker_room",
      lines: [
        { text: "CHRONOS PD — TEMPORAL CRIMES DIVISION", delay: 0, color: "#00ccff", size: 20 },
        { text: "Where you clocked in, three days ago.", delay: 1500, color: "#aabbcc", size: 16 },
      ],
      duration: 4500,
    },
    {
      bg: "locker_room",
      lines: [
        { text: "The locker room. The range. The Supervisor's office.", delay: 0, color: "#8899aa", size: 16 },
        { text: "Barricaded. Dark. Somebody's been holding it.", delay: 2200, color: "#aabbcc", size: 16 },
        { text: "Somebody alone.", delay: 4400, color: "#4488ff", size: 17 },
      ],
      duration: 7000,
    },
    {
      bg: "dark",
      art: "kael",
      voice: "kael",
      emotion: "calm",
      lines: [
        {
          text: "On the mezzanine: a man in heavy plate. Shield up. Rifle down.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        { text: "KAEL — Vanguard. Lost a squad once. Not doing it twice.", delay: 2500, color: "#4488ff", size: 16 },
        { text: "\"Badge eleven-two-three-five.\"", delay: 4800, color: "#4488ff", size: 16 },
        {
          text: "\"You're on his duty board. Third row. Never once on time.\"",
          delay: 6600,
          color: "#88aaff",
          size: 15,
        },
      ],
      duration: 10000,
    },
    {
      bg: "dark",
      art: "portrait_supervisor",
      lines: [
        {
          text: "A handset on his chest strap. The Supervisor's.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "He thumbs it. The last transmission plays. You heard it live, the morning it happened.",
          delay: 2200,
          color: "#8899aa",
          size: 15,
        },
        {
          text: "SUPERVISOR: \"Breach — every sector — they're already insi—\"",
          delay: 5000,
          color: "#ccaa77",
          size: 16,
          emotion: "urgent",
        },
        { text: "[STATIC]", delay: 7600, color: "#556677", size: 14 },
      ],
      duration: 10000,
    },
    {
      bg: "dark",
      art: "kael",
      voice: "kael",
      lines: [
        { text: "\"My squad was upstairs. I had the door.\"", delay: 0, color: "#4488ff", size: 16, emotion: "sad" },
        { text: "\"I waited one second too long to open it.\"", delay: 2400, color: "#4488ff", size: 16, emotion: "sad" },
        { text: "\"I held this door once. I held it wrong.\"", delay: 5000, color: "#88aaff", size: 16, emotion: "sad" },
        { text: "\"I don't do squads anymore.\"", delay: 7400, color: "#4488ff", size: 18, emotion: "angry" },
      ],
      duration: 10500,
    },
    {
      bg: "locker_room",
      art: "party",
      party: ["lyra", "you", "nova", "rook"],
      lines: [
        {
          text: "\"He won't come down. So we hold his line without him.\"",
          delay: 0,
          color: "#ffaa44",
          size: 15,
          voice: "lyra",
          emotion: "calm",
        },
        { text: "\"Lobby first. Then his door.\"", delay: 2600, color: "#44ff88", size: 15, voice: "rook" },
        {
          text: "\"He's watching. Let's give him something to watch.\"",
          delay: 4400,
          color: "#ff4488",
          size: 15,
          voice: "nova",
          emotion: "excited",
        },
      ],
      particles: "glow",
      duration: 8000,
    },
  ],

  /** II-6 → II-7. The door holds. Kael comes down. */
  gathering_kael_joins: [
    {
      bg: "locker_room",
      shake: 4,
      lines: [
        { text: "The wave breaks through the lobby.", delay: 0, color: "#ff8844", size: 17 },
        { text: "You hold the door. His door.", delay: 1700, color: "#00ffcc", size: 18 },
        {
          text: "Something hits it from the other side. Then everything does.",
          delay: 3400,
          color: "#ff4444",
          size: 16,
        },
      ],
      particles: "sparks",
      duration: 6500,
    },
    {
      bg: "locker_room",
      art: "kael",
      voice: "kael",
      emotion: "calm",
      flash: "#4488ff",
      lines: [
        { text: "A shield slams into the gap beside yours.", delay: 0, color: "#4488ff", size: 17 },
        { text: "He came down.", delay: 1900, color: "#aabbcc", size: 16 },
        { text: "\"You're holding it wrong.\"", delay: 3300, color: "#4488ff", size: 16 },
        { text: "\"...Better than I did.\"", delay: 5000, color: "#88aaff", size: 16 },
      ],
      shake: 2,
      duration: 8000,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        { text: "The precinct's screens flicker. The face again.", delay: 0, color: "#cc4466", size: 15 },
        {
          text: "\"A policeman. How quaint. He'll hesitate, Cadet. He always does.\"",
          delay: 2000,
          color: "#ff4466",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 6500,
    },
    {
      bg: "locker_room",
      art: "kael",
      voice: "kael",
      lines: [
        {
          text: "Kael steps between you and the screen like it can swing.",
          delay: 0,
          color: "#4488ff",
          size: 16,
        },
        { text: "\"You talk too much.\"", delay: 2400, color: "#4488ff", size: 18, emotion: "angry" },
        { text: "One round. The screen goes dark. He doesn't look at it again.", delay: 3900, color: "#aabbcc", size: 15 },
        {
          text: "\"Hold it with me, then. Not for me.\"",
          delay: 6300,
          color: "#88aaff",
          size: 17,
          emotion: "calm",
        },
      ],
      shake: 3,
      duration: 9500,
    },
    {
      bg: "station",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        {
          text: "Kael takes the front. Nova takes the flank. Rook takes the complaints.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        { text: "Lyra takes the map, and puts her finger on the Foundry.", delay: 2600, color: "#ffcc88", size: 15 },
        {
          text: "\"The C-series suits were built there. It came from there.\"",
          delay: 4800,
          color: "#ffaa44",
          size: 15,
          voice: "lyra",
          emotion: "calm",
        },
        { text: "\"Then we go and knock.\"", delay: 7300, color: "#4488ff", size: 17, voice: "kael", emotion: "calm" },
      ],
      particles: "glow",
      duration: 10000,
    },
  ],

  /** II-7 briefing: into the Hound's den, all five of you. */
  hound_intro: [
    {
      bg: "reactor",
      lines: [
        { text: "THE FOUNDRY — C-SERIES FABRICATION", delay: 0, color: "#ffaa44", size: 20 },
        { text: "Where your suit was built. And the one before it.", delay: 1400, color: "#cc8844", size: 16 },
      ],
      particles: "embers",
      duration: 4500,
    },
    {
      bg: "reactor",
      lines: [
        { text: "Empty suit frames hang on the racks, row after row.", delay: 0, color: "#aabbcc", size: 15 },
        { text: "C-0014. C-0015. A gap where C-0016 should be.", delay: 2200, color: "#ffd79a", size: 16 },
        {
          text: "For the first time since the Core, you're the one doing the hunting.",
          delay: 4600,
          color: "#00ffcc",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 8000,
    },
    {
      bg: "dark",
      art: "lyra",
      emotion: "worried",
      lines: [
        {
          text: "\"It hunts by the sound of the Engine. It'll hear you shift.\"",
          delay: 0,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "\"It isn't a person. It isn't even his. It's what that suit does with nobody in it.\"",
          delay: 2600,
          color: "#ffcc88",
          size: 15,
        },
      ],
      duration: 7000,
    },
    {
      bg: "dark",
      art: "aria",
      emotion: "worried",
      lines: [
        { text: "\"C-0016. The suit before yours.\"", delay: 0, color: "#00ffdd", size: 16 },
        {
          text: "\"If Lyra's right, that's what you'd be without the fixed point.\"",
          delay: 2000,
          color: "#00ffdd",
          size: 15,
        },
        { text: "\"I'd rather not meet that version of you.\"", delay: 4700, color: "#ffffff", size: 15 },
      ],
      duration: 7500,
    },
    {
      bg: "boss_lair",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      flash: "#ffd79a",
      lines: [
        { text: "The tick comes first. Then the footprints, scorched into the floor.", delay: 0, color: "#ffd79a", size: 15 },
        {
          text: "Kael's shield locks in beside you. It doesn't feel like backup. It feels like a wall.",
          delay: 2600,
          color: "#4488ff",
          size: 15,
        },
        { text: "\"On you, Cadet.\"", delay: 5600, color: "#4488ff", size: 18, voice: "kael", emotion: "calm" },
      ],
      shake: 2,
      particles: "sparks",
      duration: 8500,
    },
  ],

  /** Act II outro: the empty suit falls, and the people next to you. */
  gathering_finale: [
    {
      bg: "boss_lair",
      flash: "#ffd79a",
      shake: 4,
      lines: [
        { text: "The empty suit falls open.", delay: 0, color: "#ffd79a", size: 20 },
        { text: "Nothing inside. There never was.", delay: 1600, color: "#aabbcc", size: 16 },
      ],
      particles: "sparks",
      duration: 5000,
    },
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        { text: "\"You took my first draft apart.\"", delay: 0, color: "#ff4466", size: 17 },
        { text: "\"How rude.\"", delay: 1900, color: "#ff6688", size: 16 },
        { text: "\"How... interesting.\"", delay: 3100, color: "#ff88aa", size: 18, emotion: "curious" },
      ],
      particles: "embers",
      duration: 6500,
    },
    {
      bg: "station",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        { text: "Nobody gives a speech. Nobody has to.", delay: 0, color: "#aabbcc", size: 16 },
        {
          text: "Kael teaches you to hold a line. You teach him he doesn't hold it alone.",
          delay: 1700,
          color: "#4488ff",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 7500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        { text: "And Lyra...", delay: 0, color: "#ffcc88", size: 16 },
        {
          text: "She runs calculations past midnight. You bring her coffee.",
          delay: 700,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "She tells you about timelines she's watched die. You listen.",
          delay: 3300,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "\"Nobody ever listens to the end.\"",
          delay: 5900,
          color: "#ffcc88",
          size: 18,
          emotion: "tender",
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
        { text: "The Lord thinks this is a numbers game.", delay: 0, color: "#aabbcc", size: 16 },
        { text: "He's counting wrong.", delay: 1800, color: "#00ffcc", size: 18 },
        {
          text: "He never counted the people next to you.",
          delay: 2900,
          color: "#ffffff",
          size: 22,
        },
      ],
      particles: "sparks",
      duration: 7000,
    },
    {
      bg: "dark",
      lines: [
        { text: "END OF ACT II", delay: 0, color: "#334455", size: 28 },
        { text: "— THE BONDS —", delay: 800, color: "#ffaa44", size: 18 },
      ],
      duration: 4000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT III — THE HUNT (re-slotted scenes)
  // These act2_* scenes kept their keys when they moved (spec §11);
  // src/data/campaign/acts.js is the one place that says where each plays.
  // ═══════════════════════════════════════════════════════════════════

  /** III-1, the squad's first operation together. */
  act2_level2: [
    {
      bg: "station",
      lines: [
        { text: "THE REWRITTEN WING", delay: 0, color: "#00ccff", size: 20 },
        {
          text: "Security wing. Same corridors. Better company.",
          delay: 1000,
          color: "#aabbcc",
          size: 16,
        },
      ],
      duration: 3500,
    },
  ],

  /** III-4, after the confrontation: your tactician's face comes back. */
  act2_level3: [
    {
      bg: "dark",
      art: "fragment_blue",
      flash: "#003366",
      lines: [
        { text: "[MEMORY RECONSTRUCTION: VOSS — 50% → 75%]", delay: 0, color: "#4488cc", size: 12 },
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
          text: "The static clears. A face from your squad comes back.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "VOSS — your tactician. Younger. Kinder eyes.",
          delay: 2400,
          color: "#00ccff",
          size: 17,
        },
        {
          text: "The same face as the Doctor's personnel file.",
          delay: 4400,
          color: "#88aacc",
          size: 15,
        },
        {
          text: "ARIA: \"Signature match to the Lord: 67%. Same man. Different choice.\"",
          delay: 6500,
          color: "#00ffdd",
          size: 13,
          emotion: "sad",
        },
      ],
      particles: "sparks",
      duration: 9500,
    },
  ],

  /** III-2: the Server Farm again, and Kai comes back. */
  act2_level5: [
    {
      bg: "dark",
      art: "fragment_amber",
      flash: "#332200",
      lines: [
        { text: "[MEMORY RECONSTRUCTION: KAI — 50% → 75%]", delay: 0, color: "#ccaa44", size: 12 },
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
          text: "Grease and solder. The smell arrives before the face.",
          delay: 0,
          color: "#ccbbaa",
          size: 15,
        },
        {
          text: "KAI — Engineer. Could fix anything except the odds.",
          delay: 2400,
          color: "#ffcc44",
          size: 17,
        },
        {
          text: "Kai held a door shut from the wrong side. You walked out.",
          delay: 4700,
          color: "#ccaa88",
          size: 15,
        },
      ],
      particles: "sparks",
      duration: 7500,
    },
    {
      bg: "station",
      lines: [
        { text: "SERVER FARM SIEGE", delay: 0, color: "#00ccff", size: 20 },
        {
          text: "Where you learned his name. Now it's his vault.",
          delay: 1000,
          color: "#aabbcc",
          size: 16,
        },
      ],
      duration: 3500,
    },
    {
      bg: "station",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        { text: "Rook cracks his knuckles.", delay: 0, color: "#44ff88", size: 15 },
        {
          text: "\"Every rack we burn, he loses a century of stolen timelines.\"",
          delay: 1300,
          color: "#44ff88",
          size: 15,
          voice: "rook",
        },
        { text: "Nova grins.", delay: 4000, color: "#ff4488", size: 15 },
        {
          text: "\"Then let's bankrupt him.\"",
          delay: 5000,
          color: "#ff4488",
          size: 16,
          voice: "nova",
          emotion: "happy",
        },
      ],
      particles: "glow",
      duration: 8000,
    },
  ],

  /** III-3: Reactor Overload. Kael takes the blast doors, and it sticks. */
  act2_level6: [
    {
      bg: "reactor",
      lines: [
        { text: "REACTOR OVERLOAD", delay: 0, color: "#ffaa00", size: 20 },
        {
          text: "He's cooking the core. Trying to burn you out of his station.",
          delay: 900,
          color: "#cc8844",
          size: 16,
        },
      ],
      shake: 2,
      duration: 3500,
    },
    {
      bg: "reactor",
      art: "aria",
      lines: [
        {
          text: "\"Core temperature climbing. He's feeding it raw rift energy.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
          emotion: "worried",
        },
        {
          text: "\"If it blows, this sector loops. Same explosion. Every day. Forever.\"",
          delay: 2700,
          color: "#ff4444",
          size: 15,
          emotion: "urgent",
        },
        {
          text: "\"Kael has the blast doors. You get the coolant valves.\"",
          delay: 5700,
          color: "#00ffdd",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 8500,
    },
  ],

  /**
   * III-4, the mid-act turn: his rewind logs, the one take where the station
   * survives, and Lyra closing the screen on it. Her silence is Act IV's fuse.
   */
  act2_level7: [
    {
      bg: "boss_lair",
      lines: [
        { text: "THE LORD'S LABORATORY", delay: 0, color: "#ff2244", size: 20 },
        {
          text: "Where a man turned himself into something else.",
          delay: 1100,
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
          text: "Rewind logs everywhere. The same eleven seconds. Thousands of takes.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Every one ends the same way. Station gone.",
          delay: 2900,
          color: "#ff6688",
          size: 15,
        },
        { text: "Except one.", delay: 5200, color: "#ff2244", size: 18 },
      ],
      particles: "sparks",
      duration: 7000,
    },
    {
      bg: "dark",
      art: "lyra",
      lines: [
        { text: "Lyra finds it first. You watch her read it twice.", delay: 0, color: "#ffcc88", size: 15 },
        {
          text: "On the screen: the Core, the station still standing, and one figure walking in. Alone.",
          delay: 2400,
          color: "#aabbcc",
          size: 15,
        },
        { text: "She closes it before you can see whose face it is.", delay: 5600, color: "#ffaa44", size: 16 },
        { text: "She says nothing.", delay: 7800, color: "#ffffff", size: 17 },
      ],
      particles: "glow",
      duration: 10500,
    },
  ],

  /** IV-4, the Nexus: Nova meets her own running echo. nova_decoy follows. */
  act2_level8: [
    {
      bg: "temporal_rift",
      lines: [
        { text: "TEMPORAL NEXUS", delay: 0, color: "#9944ff", size: 20 },
        { text: "Where every stolen timeline crosses.", delay: 800, color: "#bb88ff", size: 16 },
      ],
      particles: "glow",
      duration: 4500,
    },
    {
      bg: "temporal_rift",
      art: "party",
      party: ["lyra", "you", "nova", "rook"],
      lines: [
        {
          text: "Echoes of the squad flicker past. Old attempts. Old failures.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Nova stops. One echo is her — running. Always running.",
          delay: 2700,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "She watches it fade. Then turns around.",
          delay: 5100,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "\"Still not this time.\"",
          delay: 6900,
          color: "#ff4488",
          size: 18,
          voice: "nova",
          emotion: "calm",
        },
      ],
      particles: "glow",
      duration: 9500,
    },
  ],

  /** III-7, after the parable (level3_briefing): Form 2. */
  act2_level9: [
    {
      bg: "boss_lair",
      art: "villain_form2",
      lines: [
        {
          text: "\"You brought them to watch. Thoughtful.\"",
          delay: 0,
          color: "#ff4466",
          size: 16,
        },
        {
          text: "\"I've run this fight ten thousand ways, Cadet.\"",
          delay: 1900,
          color: "#ff6688",
          size: 15,
        },
        {
          text: "\"There is no timeline where you win.\"",
          delay: 4000,
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
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        { text: "Kael raises his shield.", delay: 0, color: "#44aaff", size: 15 },
        {
          text: "\"Then we'll make one.\"",
          delay: 1100,
          color: "#44aaff",
          size: 17,
          voice: "kael",
          emotion: "calm",
        },
        { text: "Nobody waits for an order.", delay: 2900, color: "#aabbcc", size: 15 },
        { text: "Four weapons come up at once.", delay: 4200, color: "#ffffff", size: 20 },
      ],
      particles: "glow",
      duration: 7000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT III VICTORY — Form 2 falls, the bonds hold, the Lord transforms
  // ═══════════════════════════════════════════════════════════════════
  act2_victory: [
    {
      bg: "boss_lair",
      flash: "#00ffcc",
      lines: [
        { text: "Form Two cracks. The Lord staggers.", delay: 0, color: "#00ffcc", size: 18 },
        { text: "For the first time, he looks hurt.", delay: 1700, color: "#aaddff", size: 16 },
      ],
      particles: "glow",
      duration: 5000,
    },
    {
      bg: "boss_lair",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        {
          text: "Kael's shield held. Nova's standing. Rook is grinning, which is new.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        { text: "Nobody carried this alone.", delay: 2900, color: "#00ffcc", size: 18 },
        {
          text: "And the Lord is staring at something he can't compute:",
          delay: 4200,
          color: "#aaddff",
          size: 15,
        },
        {
          text: "People who take a hit for each other. On purpose.",
          delay: 6600,
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
        { text: "\"...interesting. You actually hurt me.\"", delay: 0, color: "#ff6688", size: 16 },
        {
          text: "\"Not with strength. With something I can't model.\"",
          delay: 1800,
          color: "#ff88aa",
          size: 15,
        },
        { text: "\"I'll need to... revise.\"", delay: 4000, color: "#ff2244", size: 18 },
      ],
      particles: "embers",
      duration: 7500,
    },
    {
      bg: "boss_lair",
      flash: "#ffffff",
      shake: 10,
      lines: [
        { text: "The chamber erupts in light.", delay: 0, color: "#ff88aa", size: 16 },
        {
          text: "Something old wakes up inside the rift.",
          delay: 1400,
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
      shake: 8,
      lines: [
        { text: "\"ENOUGH.\"", delay: 0, color: "#ff0044", size: 28 },
        {
          text: "\"I stopped being a man eleven seconds into that experiment.\"",
          delay: 700,
          color: "#ff2266",
          size: 18,
        },
        { text: "\"Meet what I became.\"", delay: 3300, color: "#ffffff", size: 24 },
      ],
      particles: "embers",
      duration: 7000,
    },
    {
      bg: "dark",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        { text: "Lyra grabs your hand. Just for a second.", delay: 0, color: "#ffaa44", size: 16 },
        {
          text: "\"We can do this. Us.\"",
          delay: 1900,
          color: "#ffcc88",
          size: 17,
          voice: "lyra",
          emotion: "tender",
        },
        { text: "Not 'I believe in you.' Us.", delay: 3000, color: "#ffffff", size: 18 },
      ],
      particles: "glow",
      duration: 7500,
    },
    {
      bg: "dark",
      lines: [
        { text: "END OF ACT III", delay: 0, color: "#334455", size: 28 },
        { text: "— THE HUNT —", delay: 800, color: "#556677", size: 18 },
      ],
      duration: 4000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // LYRA REVEAL — The Chrono-Analyst's Awakening
  // Death Note energy — she figured out what nobody else could
  // Solo Leveling energy — the hero was always powerful, she proves it
  // Kaiju No. 8 — the nobody who changes everything
  // Closes Act II, after gathering_finale: the fixed point, in full.
  // ═══════════════════════════════════════════════════════════════════
  lyra_reveal: [
    {
      bg: "station",
      art: "lyra",
      lines: [
        { text: "The squad patches its wounds. Lyra works.", delay: 0, color: "#aabbcc", size: 16 },
        {
          text: "Timelines cascade around her in amber light.",
          delay: 1900,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: "She's been mapping his choices since the collapse.",
          delay: 3900,
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
          text: "\"Everyone studies the fights. I study the gaps.\"",
          delay: 0,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "\"He sees everything he expects. Nothing he doesn't.\"",
          delay: 2200,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "Perfect information. Perfect blind spot.",
          delay: 4500,
          color: "#ff8866",
          size: 14,
        },
        { text: "\"We live in that blind spot.\"", delay: 6400, color: "#ffffff", size: 18 },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "dark",
      art: "lyra",
      lines: [
        {
          text: "She turns to you. Amber eyes. No blinking.",
          delay: 0,
          color: "#ffcc88",
          size: 16,
        },
        {
          text: "\"Your readings don't match any baseline.\"",
          delay: 1900,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "\"Not temporal. Not anti-temporal. Something else.\"",
          delay: 3800,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "\"It was there on day one. You just didn't have the suit for it.\"",
          delay: 6000,
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
          text: "\"You're a fixed point. Time bends around you. It can't bend you.\"",
          delay: 0,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "\"That's why you remember a squad nobody else does.\"",
          delay: 2800,
          color: "#ffcc44",
          size: 16,
        },
        { text: "\"That's why the suit took to you.\"", delay: 5100, color: "#ffaa44", size: 15 },
        {
          text: "\"Voss built C-0017 for a fixed point. Never found one. Until you.\"",
          delay: 6700,
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
          text: "\"Confirmed. Zero temporal drift across every recorded loop.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Statistically speaking, you are impossible.\"",
          delay: 2600,
          color: "#00ffdd",
          size: 16,
        },
        {
          text: "\"He can rewrite anyone. Anything. Except you.\"",
          delay: 4700,
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
          text: "Something clicks. Past the damage. Past the doubt.",
          delay: 0,
          color: "#00ffcc",
          size: 16,
        },
        {
          text: "She didn't hand you power. She showed you where it was.",
          delay: 2200,
          color: "#ffcc88",
          size: 16,
        },
        {
          text: "The cadet who kept showing up was the anchor all along.",
          delay: 4600,
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
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        {
          text: "Kael grips his cracked shield. \"So we fight.\"",
          delay: 0,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "Nova rolls her shoulders. \"Wouldn't miss it.\"",
          delay: 2100,
          color: "#ff4488",
          size: 15,
        },
        {
          text: "Rook boots his last turret. \"Systems nominal. Mostly.\"",
          delay: 4200,
          color: "#44ff88",
          size: 15,
        },
        {
          text: "Lyra closes her screens. \"I'll find your opening.\"",
          delay: 6600,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "Your squad. Your people. You know what comes next.",
          delay: 8800,
          color: "#ffffff",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 11500,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT III — THE HUNT (new connective scenes)
  // One squad, on the offensive, back through every place he hurt you.
  // ═══════════════════════════════════════════════════════════════════

  /** Act III opener, after lyra_reveal. */
  hunt_intro: [
    {
      bg: "station",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        { text: "For the first time, the squad plans an offensive.", delay: 0, color: "#aabbcc", size: 16 },
        {
          text: "Kael marks the doors. Rook marks what's behind them. Nova marks the fastest way between.",
          delay: 1900,
          color: "#8899aa",
          size: 15,
        },
        { text: "Lyra marks the one place none of them wants to go.", delay: 4800, color: "#ffcc88", size: 15 },
        {
          text: "\"The Core. Eventually. First, everything he built on the way.\"",
          delay: 7000,
          color: "#ffaa44",
          size: 16,
          voice: "lyra",
          emotion: "calm",
        },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "station",
      art: "aria",
      lines: [
        {
          text: "\"He's been rewriting the station since the Core. Same wings. New architecture. Nobody built it.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
          emotion: "worried",
        },
        {
          text: "\"Every place you've been, changed. Watch your corners. Then watch them again.\"",
          delay: 3400,
          color: "#ffcc00",
          size: 15,
        },
      ],
      duration: 7000,
    },
  ],

  /** III-4 → III-5. Where he keeps his takes. */
  archive_briefing: [
    {
      bg: "station",
      lines: [
        { text: "THE ARCHIVE OF REWINDS", delay: 0, color: "#cc88ff", size: 20 },
        { text: "Where he keeps his takes.", delay: 1300, color: "#aabbcc", size: 16 },
      ],
      particles: "glow",
      duration: 4000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"Ran the Voss match again with what we pulled from his lab. Ninety-four percent.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
          emotion: "calm",
        },
        {
          text: "\"Your Voss and the Lord. The same man. One of them made a different choice.\"",
          delay: 3200,
          color: "#ffcc00",
          size: 15,
          emotion: "sad",
        },
      ],
      duration: 7000,
    },
    {
      bg: "station",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        { text: "Room after room replays the same eleven seconds.", delay: 0, color: "#aabbcc", size: 15 },
        { text: "Some of the versions have you in them.", delay: 2100, color: "#cc88ff", size: 16 },
        { text: "You watch yourself lose. Again. Again.", delay: 4000, color: "#ff88aa", size: 16 },
        {
          text: "\"Don't look too long. They aren't you. You don't drift.\"",
          delay: 6100,
          color: "#ffaa44",
          size: 15,
          voice: "lyra",
          emotion: "tender",
        },
      ],
      particles: "glow",
      duration: 9500,
    },
  ],

  /** III-5 → III-6. The Engine hall, stopped at T-00:00:11. */
  engine_briefing: [
    {
      bg: "temporal_rift",
      lines: [
        { text: "THE CHRONOS ENGINE — T-00:00:11", delay: 0, color: "#00ccff", size: 20 },
        { text: "The hall where it started, stopped where it started.", delay: 1500, color: "#aaddff", size: 16 },
      ],
      particles: "glow",
      duration: 4500,
    },
    {
      bg: "temporal_rift",
      art: "rift",
      lines: [
        { text: "Voss at the console, one hand on the lever, frozen mid-breath.", delay: 0, color: "#aabbcc", size: 15 },
        { text: "In the stasis you see what nobody else can:", delay: 2400, color: "#aaddff", size: 15 },
        { text: "Two of him.", delay: 4300, color: "#ffffff", size: 20 },
        {
          text: "One reaching for the lever. One reaching to stop him.",
          delay: 5400,
          color: "#cc88ff",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 9000,
    },
    {
      bg: "dark",
      art: "lyra",
      emotion: "sad",
      lines: [
        { text: "\"Same man. Different choice.\"", delay: 0, color: "#ffaa44", size: 17 },
        { text: "\"You're standing in the second it split.\"", delay: 2000, color: "#ffcc88", size: 16 },
      ],
      particles: "glow",
      duration: 5500,
    },
    {
      bg: "temporal_rift",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        { text: "\"Wardens on the Engine. A lot of them.\"", delay: 0, color: "#4488ff", size: 15, voice: "kael" },
        {
          text: "\"He's guarding a memory. Let's go be rude to it.\"",
          delay: 2000,
          color: "#44ff88",
          size: 15,
          voice: "rook",
        },
      ],
      particles: "sparks",
      duration: 5500,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT IV — THE SACRIFICE
  // The hero realizes the cost. Sacrifices everything.
  // Gets the girl. Redeems himself. The act3_* keys kept their names when
  // the act moved (spec §11).
  // ═══════════════════════════════════════════════════════════════════
  act3_intro: [
    {
      bg: "deep_space",
      lines: [
        { text: "ACT IV", delay: 0, color: "#ff2244", size: 28 },
        { text: "— THE SACRIFICE —", delay: 600, color: "#ff8866", size: 18 },
      ],
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      lines: [
        { text: "The Paradox Lord. Final form.", delay: 0, color: "#ff4466", size: 18 },
        {
          text: "He's rewound this war more times than you've breathed.",
          delay: 1400,
          color: "#ff6688",
          size: 15,
        },
        {
          text: "Every plan you make, he's already countered.",
          delay: 3800,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "Every move your team makes, he's already watched.",
          delay: 5800,
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
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        {
          text: "Kael's shield is cracked. Nova is limping.",
          delay: 0,
          color: "#8899aa",
          size: 15,
        },
        {
          text: "Rook's turrets are scrap. Lyra's screens flicker.",
          delay: 1900,
          color: "#aabbcc",
          size: 15,
        },
        { text: "Still standing. All of them.", delay: 4100, color: "#aabbcc", size: 16 },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: "Lyra pulls you aside. Her voice isn't steady.",
          delay: 0,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "\"The take I closed in his lab. The one where the station lives.\"",
          delay: 2100,
          color: "#ffaa44",
          size: 16,
          emotion: "sad",
        },
        {
          text: "\"I should have shown you. Someone walks into the Core alone.\"",
          delay: 4600,
          color: "#ffaa44",
          size: 15,
          emotion: "sad",
        },
        {
          text: "\"And the Core rewrites whoever walks in.\"",
          delay: 7200,
          color: "#ffcc88",
          size: 15,
          emotion: "worried",
        },
        {
          text: "She doesn't finish. She doesn't have to.",
          delay: 9100,
          color: "#aabbcc",
          size: 16,
        },
      ],
      particles: "glow",
      duration: 13000,
    },
    {
      bg: "dark",
      art: "hero_armed",
      flash: "#00ffcc",
      lines: [
        { text: "You already know who's going.", delay: 0, color: "#00ffcc", size: 18 },
        {
          text: "The fixed point. The one thing he can't rewrite.",
          delay: 1400,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "A badge means you stand between them and it.",
          delay: 3600,
          color: "#ffffff",
          size: 18,
        },
        { text: "Whatever it costs.", delay: 5600, color: "#ffcc00", size: 22 },
      ],
      shake: 4,
      particles: "embers",
      duration: 9000,
    },
  ],

  act3_level2: [
    {
      bg: "station",
      lines: [
        { text: "THE ENTRY — LAST BRIEFING", delay: 0, color: "#ff2244", size: 22 },
        {
          text: "Six wings to the Core. You walk the last one alone.",
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
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        {
          text: "\"You're not going alone.\"",
          delay: 0,
          color: "#4488ff",
          size: 16,
          voice: "kael",
          emotion: "angry",
        },
        {
          text: "\"I'm faster. Send me.\"",
          delay: 1800,
          color: "#ff4488",
          size: 16,
          voice: "nova",
          emotion: "urgent",
        },
        { text: "\"My turrets could—\"", delay: 3500, color: "#44ff88", size: 16, voice: "rook" },
        {
          text: "You look at each of them. Long enough to remember.",
          delay: 5000,
          color: "#aabbcc",
          size: 16,
        },
        {
          text: "\"You're my people. That's why it's me.\"",
          delay: 7200,
          color: "#00ffcc",
          size: 18,
          voice: "player",
          emotion: "calm",
        },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        { text: "Lyra is the last one in your way.", delay: 0, color: "#ffcc88", size: 16 },
        { text: "\"Don't you DARE.\"", delay: 1600, color: "#ffaa44", size: 22, emotion: "angry" },
        { text: "Her eyes are wet. She'd deny it.", delay: 2600, color: "#ffcc88", size: 15 },
        {
          text: "\"I just found you. You don't get to—\"",
          delay: 4100,
          color: "#ffaa44",
          size: 16,
          emotion: "sad",
        },
        { text: "You take her hand. Hold it. Let go.", delay: 5800, color: "#ffffff", size: 18 },
        {
          text: "\"I'm coming back. I promise.\"",
          delay: 7500,
          color: "#00ffcc",
          size: 20,
          voice: "player",
          emotion: "tender",
        },
      ],
      particles: "glow",
      duration: 13000,
    },
  ],

  act3_boss: [
    {
      bg: "station",
      art: "villain_final",
      shake: 3,
      lines: [
        {
          text: "HIS VOICE ON EVERY SPEAKER",
          delay: 0,
          color: "#ff0044",
          size: 22,
        },
        { text: "He isn't here. He doesn't need to be.", delay: 1900, color: "#ff4466", size: 16 },
      ],
      particles: "embers",
      duration: 4000,
    },
    {
      bg: "boss_lair",
      art: "villain_final",
      lines: [
        { text: "\"Still clinging to them, Cadet?\"", delay: 0, color: "#ff4466", size: 18 },
        {
          text: "\"I'll take them from you one wing at a time.\"",
          delay: 1500,
          color: "#ff6688",
          size: 16,
        },
        {
          text: "\"And save you for last. Out of respect.\"",
          delay: 3600,
          color: "#ff88aa",
          size: 16,
        },
      ],
      particles: "embers",
      duration: 6500,
    },
    {
      bg: "station",
      art: "hero_armed",
      flash: "#00ffcc",
      shake: 6,
      lines: [
        {
          text: "They're not bait. They're why you're still standing.",
          delay: 0,
          color: "#00ffcc",
          size: 16,
        },
        {
          text: "He can see every move. He can't see why.",
          delay: 2300,
          color: "#ffffff",
          size: 18,
        },
        { text: "That's his blind spot.", delay: 4200, color: "#ffcc00", size: 24 },
      ],
      particles: "embers",
      duration: 7000,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT IV BRIEFINGS — one ally stays behind at a time, last in, last out
  // ═══════════════════════════════════════════════════════════════════
  act3_level4: [
    {
      bg: "station",
      lines: [
        { text: "CONTAINMENT — LAST STAND", delay: 0, color: "#ff4444", size: 20 },
        { text: "The walls bleed rift light.", delay: 1200, color: "#cc6666", size: 16 },
      ],
      shake: 3,
      duration: 3500,
    },
    {
      bg: "station",
      art: "kael",
      voice: "kael",
      lines: [
        {
          text: "Kael stops you in the corridor. His shield is split down the middle.",
          delay: 0,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "A shockwave finishes it off. He kicks the pieces aside.",
          delay: 2900,
          color: "#ff6644",
          size: 15,
        },
        {
          text: "\"Didn't need it anyway. I'm holding the blast doors.\"",
          delay: 5300,
          color: "#4488ff",
          size: 17,
          emotion: "calm",
        },
        {
          text: "You start to argue. He puts a hand on your shoulder.",
          delay: 7700,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "\"I lost my last squad because I hesitated. Not today.\"",
          delay: 10000,
          color: "#4488ff",
          size: 17,
          emotion: "calm",
        },
        {
          text: "Then he smiles. First real one you've seen.",
          delay: 12400,
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
          text: "\"He's dragging this whole sector toward the rift. Reality's thinning.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "\"Kael's on the doors. He knows the math.\"",
          delay: 3000,
          color: "#44aaff",
          size: 15,
        },
        { text: "\"Make it count, {AGENT}.\"", delay: 4900, color: "#00ffdd", size: 16 },
      ],
      particles: "embers",
      duration: 8000,
    },
  ],

  /** IV-4: Nova runs one more time, toward them. */
  nova_decoy: [
    {
      bg: "temporal_rift",
      art: "nova",
      voice: "nova",
      lines: [
        { text: "The hunters are closing on all four corridors.", delay: 0, color: "#aabbcc", size: 15 },
        { text: "Nova checks her blades. Then checks them again.", delay: 2000, color: "#ff88aa", size: 15 },
        {
          text: "\"I've got an idea, and you're going to hate it.\"",
          delay: 4000,
          color: "#ff4488",
          size: 16,
          emotion: "happy",
        },
      ],
      duration: 7000,
    },
    {
      bg: "temporal_rift",
      art: "nova",
      voice: "nova",
      emotion: "excited",
      lines: [
        { text: "\"They follow noise. I'm the loudest thing on this station.\"", delay: 0, color: "#ff4488", size: 15 },
        {
          text: "\"I pull them off your path. You go. Don't look back, it'll embarrass us both.\"",
          delay: 2700,
          color: "#ff4488",
          size: 15,
        },
      ],
      duration: 6500,
    },
    {
      bg: "temporal_rift",
      art: "party",
      party: ["lyra", "you", "nova", "rook"],
      lines: [
        { text: "\"Nova—\"", delay: 0, color: "#ffaa44", size: 16, voice: "lyra", emotion: "worried" },
        {
          text: "\"Race you. Spoiler: I already won.\"",
          delay: 1300,
          color: "#ff4488",
          size: 17,
          voice: "nova",
          emotion: "happy",
        },
        { text: "She runs. Toward them, this time.", delay: 3600, color: "#ffffff", size: 17 },
        { text: "Every hunter on the level turns to follow her.", delay: 5300, color: "#ff88aa", size: 15 },
      ],
      particles: "sparks",
      duration: 8500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "\"Her signal's moving fast. Away from us. On purpose.\"",
          delay: 0,
          color: "#00ffdd",
          size: 15,
          emotion: "sad",
        },
        {
          text: "\"...Go, {AGENT}. She bought you the whole level.\"",
          delay: 2600,
          color: "#ffffff",
          size: 16,
          emotion: "urgent",
        },
      ],
      duration: 6000,
    },
  ],

  act3_level5: [
    {
      bg: "station",
      lines: [
        { text: "THE ARCHIVE — SCORCHED EARTH", delay: 0, color: "#ff6600", size: 20 },
        {
          text: "He's wiping everything. Every file. Every copy of every day.",
          delay: 1400,
          color: "#cc8844",
          size: 16,
        },
      ],
      shake: 2,
      duration: 3500,
    },
    {
      bg: "station",
      art: "rook",
      voice: "rook",
      lines: [
        {
          text: "Rook is wiring charges to the archive cores. Humming.",
          delay: 0,
          color: "#44ff88",
          size: 15,
        },
        {
          text: "\"Fry his data cores and he loses the precognition.\"",
          delay: 2200,
          color: "#44ff88",
          size: 15,
        },
        { text: "\"For once, he won't see us coming.\"", delay: 4500, color: "#44ff88", size: 16 },
        {
          text: "\"Kept his machines running for six years. Time I unbuilt some.\"",
          delay: 6400,
          color: "#44ff88",
          size: 15,
          emotion: "calm",
        },
        { text: "\"Cover me. And plug your ears.\"", delay: 9200, color: "#44ff88", size: 16, emotion: "happy" },
      ],
      particles: "sparks",
      duration: 12000,
    },
  ],

  act3_level6: [
    {
      bg: "reactor",
      lines: [
        { text: "THE CHRONOS ENGINE — AWAKE", delay: 0, color: "#ff2200", size: 22 },
        { text: "It's waking up. It shouldn't be able to.", delay: 1000, color: "#ff6644", size: 16 },
      ],
      shake: 5,
      particles: "embers",
      duration: 3500,
    },
    {
      bg: "reactor",
      art: "lyra",
      lines: [
        { text: "Lyra's hands shake over the console.", delay: 0, color: "#ffaa44", size: 15 },
        {
          text: "\"The Engine fires once. Enough to crack his armour.\"",
          delay: 1700,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "\"Someone stays behind to pull the trigger. That's me.\"",
          delay: 4000,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "You open your mouth. She doesn't let you use it.",
          delay: 6400,
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
        { text: "ORIGINS", delay: 0, color: "#9944ff", size: 20 },
        {
          text: "Before the Lord, a man with a proposal nobody would sign.",
          delay: 1200,
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
          text: "His private logs. Thousands of entries. One subject.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "He rewound the eleven seconds. Again. And again.",
          delay: 2300,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "The station died every time. So he decided nobody gets to keep it.",
          delay: 4500,
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
        { text: "Voss. Miri. Kai. You lost people too.", delay: 0, color: "#aabbcc", size: 16 },
        {
          text: "A recording glitches: your Voss's voice. The Lord's cadence.",
          delay: 1700,
          color: "#cc88ff",
          size: 14,
        },
        {
          text: "Same grief. Same fuel. You could have become him.",
          delay: 4300,
          color: "#ff88aa",
          size: 15,
        },
        {
          text: "You found new people. He burned the rest down.",
          delay: 6500,
          color: "#ffffff",
          size: 16,
        },
        {
          text: "That's the difference. That was always the difference.",
          delay: 8600,
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
      bg: "temporal_rift",
      lines: [
        { text: "THE ENGINE — THE BLIND SPOT", delay: 0, color: "#ff44ff", size: 20 },
        {
          text: "Lyra's window opens once. It won't open twice.",
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
      bg: "temporal_rift",
      art: "lyra",
      lines: [
        {
          text: "Nova went quiet two levels back. Rook's charges went off an hour ago.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        { text: "Lyra stays at the console. You go to the door.", delay: 2600, color: "#ffcc88", size: 15 },
        {
          text: "Her voice in your ear: coordinates, then your name.",
          delay: 4600,
          color: "#ffaa44",
          size: 15,
        },
        {
          text: "She gets you to the door. The rest is yours.",
          delay: 6800,
          color: "#ffffff",
          size: 18,
        },
      ],
      particles: "sparks",
      duration: 9500,
    },
  ],

  act3_level9: [
    {
      bg: "boss_lair",
      lines: [
        { text: "THE PARADOX CORE — ENDGAME", delay: 0, color: "#ff0044", size: 24 },
        { text: "You walk in alone.", delay: 1300, color: "#ff4466", size: 18 },
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
          text: "\"Just you. It always ends with just you.\"",
          delay: 0,
          color: "#ff2244",
          size: 16,
        },
        {
          text: "\"Everything you've lived, I've already rewound.\"",
          delay: 1900,
          color: "#ff4466",
          size: 15,
        },
        { text: "\"And I will take it all back.\"", delay: 4100, color: "#ff0044", size: 18 },
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
          text: "The comms go quiet. You're not alone anyway.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Voss taught you to plan: \"Three steps ahead.\"",
          delay: 2000,
          color: "#4488cc",
          size: 15,
        },
        {
          text: "The Lord uses the same words. Same man. Different choice.",
          delay: 4100,
          color: "#cc88ff",
          size: 14,
        },
        {
          text: "Miri taught you to endure. Kai taught you to hold a door.",
          delay: 6600,
          color: "#44cc88",
          size: 15,
        },
        {
          text: "Kael, Nova, Rook and Lyra got you to this one.",
          delay: 9100,
          color: "#ccaa44",
          size: 15,
        },
        {
          text: "You don't need to see the future. Just be the part he can't change.",
          delay: 11200,
          color: "#00ffcc",
          size: 17,
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
        { text: "The Final Form shatters.", delay: 0, color: "#ffffff", size: 22 },
        {
          text: "And the Core starts coming down with you inside it.",
          delay: 1200,
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
        { text: "\"Im...possible. I ran every version.\"", delay: 0, color: "#ff6688", size: 16 },
        {
          text: "\"You walked in knowing you wouldn't walk out.\"",
          delay: 1700,
          color: "#ff88aa",
          size: 15,
        },
        { text: "\"That was never... in the math.\"", delay: 3800, color: "#cc4466", size: 16 },
      ],
      particles: "glow",
      duration: 8000,
    },
    {
      bg: "dark",
      art: "hero_armed",
      lines: [
        { text: "The chamber tears itself apart.", delay: 0, color: "#ff4444", size: 16 },
        { text: "Every timeline flashes past at once.", delay: 1500, color: "#ff6644", size: 16 },
        {
          text: "In the ones that matter, your people make it home.",
          delay: 3200,
          color: "#aaddff",
          size: 16,
        },
        { text: "That's enough.", delay: 5400, color: "#ffffff", size: 18 },
        { text: "That was always enough.", delay: 6200, color: "#00ffcc", size: 18 },
      ],
      particles: "embers",
      shake: 6,
      duration: 10500,
    },
    {
      bg: "dark",
      lines: [
        { text: "Darkness.", delay: 0, color: "#334455", size: 20 },
        { text: "Silence.", delay: 700, color: "#334455", size: 20 },
        { text: "...", delay: 1900, color: "#556677", size: 24 },
      ],
      duration: 6500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        { text: "\"WAKE UP.\"", delay: 0, color: "#ffaa44", size: 28 },
        { text: "Lyra's voice. Close. Cracking.", delay: 700, color: "#ffcc88", size: 16 },
        {
          text: "\"You promised, you absolute idiot. You PROMISED.\"",
          delay: 2200,
          color: "#ffaa44",
          size: 16,
        },
        { text: "Her hand on your face. Warm. Real.", delay: 4400, color: "#ffcc88", size: 16 },
        { text: "You open your eyes.", delay: 6000, color: "#ffffff", size: 20 },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "station",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        {
          text: "The medbay. Same bed as last time. This time the room is full.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "Kael's in the next bed, bandaged, trying not to cry. Losing.",
          delay: 2700,
          color: "#4488ff",
          size: 15,
        },
        {
          text: "Nova dragged him out of the blast doors herself. Won't shut up about it.",
          delay: 5300,
          color: "#ff4488",
          size: 14,
        },
        {
          text: "Rook just nods at you. From Rook, that's a parade.",
          delay: 8400,
          color: "#44ff88",
          size: 15,
        },
        { text: "And Lyra hasn't let go of your hand.", delay: 10600, color: "#ffaa44", size: 17 },
      ],
      particles: "glow",
      duration: 15000,
    },
    {
      bg: "deep_space",
      lines: [
        { text: "The Chronos Engine goes quiet.", delay: 0, color: "#00ccff", size: 18 },
        { text: "The rift seals. The timelines settle.", delay: 1500, color: "#aaddff", size: 16 },
        { text: "Tomorrow is going to happen after all.", delay: 3200, color: "#00ffcc", size: 20 },
      ],
      particles: "stars",
      duration: 7000,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        { text: "Later. The station is quiet.", delay: 0, color: "#aabbcc", size: 15 },
        {
          text: "Lyra finds you on the observation deck.",
          delay: 1400,
          color: "#ffcc88",
          size: 15,
        },
        { text: "\"You're an idiot. You know that?\"", delay: 3200, color: "#ffaa44", size: 16 },
        { text: "\"Yeah.\"", delay: 4800, color: "#00ffcc", size: 16, voice: "player", emotion: "warm" },
        { text: "\"...my idiot.\"", delay: 5800, color: "#ffaa44", size: 20 },
        {
          text: "She kisses you. The stars look closer than they used to.",
          delay: 6600,
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
          text: "You think about the ones who didn't make it here.",
          delay: 0,
          color: "#8899aa",
          size: 15,
        },
        {
          text: "Voss, who always had a plan. Even for the end.",
          delay: 2200,
          color: "#4488cc",
          size: 15,
        },
        {
          text: "Miri, whose hands never stopped working.",
          delay: 4300,
          color: "#44cc88",
          size: 15,
        },
        { text: "Kai, who held the door.", delay: 6200, color: "#ccaa44", size: 15 },
        { text: "You carry them. You always will.", delay: 7400, color: "#ffffff", size: 18 },
      ],
      particles: "glow",
      duration: 13000,
    },
    {
      bg: "deep_space",
      art: "party",
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        { text: "Kael. Nova. Rook. Lyra. You.", delay: 0, color: "#aaddff", size: 16 },
        { text: "Not a unit. Not a file.", delay: 1400, color: "#00ccff", size: 18 },
        { text: "The ones who stayed.", delay: 2600, color: "#00ffcc", size: 18 },
        { text: "The ones who got back up.", delay: 3700, color: "#ffcc00", size: 22 },
        { text: "The ones who won.", delay: 5000, color: "#ffffff", size: 26 },
      ],
      particles: "glow",
      duration: 10500,
    },
    {
      bg: "dark",
      lines: [
        { text: "TIMELINE RESTORED", delay: 0, color: "#00ffcc", size: 28 },
        { text: "— FIN —", delay: 1000, color: "#ffffff", size: 22 },
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
        { text: "The rift tears open again.", delay: 0, color: "#cc88ff", size: 20 },
        { text: "It isn't finished with you.", delay: 1300, color: "#aaddff", size: 16 },
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
          text: "You've been here before. The echoes remember.",
          delay: 2400,
          color: "#88ccff",
          size: 15,
        },
        { text: "So do the enemies. They've adapted.", delay: 4500, color: "#ff8866", size: 15 },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "station",
      art: "hero_armed",
      lines: [
        { text: "Your hands know the weapon before you do.", delay: 0, color: "#aabbcc", size: 15 },
        { text: "Again, then.", delay: 2200, color: "#00ffcc", size: 18 },
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
        { text: "The timeline fractures.", delay: 0, color: "#cc88ff", size: 22 },
        {
          text: "You thought it was over. So did everyone.",
          delay: 1200,
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
          text: "ARIA: Paradox residue in your neural pattern.",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "His death left an echo. It's rewinding the station.",
          delay: 2100,
          color: "#88ccff",
          size: 15,
        },
        {
          text: "Everything resets. Everything except you.",
          delay: 4400,
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
          text: "You remember all of it. The fights. The faces. The cost.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "You're stronger this time. So are they.",
          delay: 2500,
          color: "#ff4444",
          size: 16,
        },
        { text: "TIMELINE LOOP 1: THE ECHO", delay: 4300, color: "#cc88ff", size: 22 },
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
        { text: "The rift. The medbay. The beginning.", delay: 700, color: "#ff8888", size: 16 },
      ],
      particles: "embers",
      duration: 4500,
    },
    {
      bg: "dark",
      art: "lyra",
      lines: [
        { text: "LYRA: This isn't a glitch.", delay: 0, color: "#ffaa44", size: 15 },
        {
          text: "Something is still rewinding. Out of habit.",
          delay: 1300,
          color: "#ffcc88",
          size: 15,
        },
        {
          text: "Every pass, reality wears thinner. The enemies get meaner.",
          delay: 3300,
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
          text: "Your hands shake. Déjà vu doesn't cover this.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "But somewhere in the repeats is a way out.",
          delay: 2100,
          color: "#00ffcc",
          size: 16,
        },
        { text: "TIMELINE LOOP 2: THE RECURSION", delay: 4000, color: "#ff4466", size: 22 },
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
        { text: "This pass is the last one.", delay: 1000, color: "#ff4444", size: 20 },
      ],
      particles: "embers",
      duration: 4500,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        {
          text: "ARIA: Every timeline is converging on this one.",
          delay: 0,
          color: "#00ffdd",
          size: 15,
        },
        {
          text: "Fail here and the loop locks. Permanently.",
          delay: 2100,
          color: "#ff4444",
          size: 16,
        },
        { text: "No more echoes. No more second tries.", delay: 4000, color: "#ff8866", size: 15 },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "dark",
      art: "lyra",
      lines: [
        { text: "LYRA: I ran the odds three hundred times.", delay: 0, color: "#ffaa44", size: 15 },
        { text: "They're terrible.", delay: 1900, color: "#ffcc88", size: 15 },
        { text: "You've never once cared.", delay: 2900, color: "#ffaa44", size: 16 },
      ],
      particles: "glow",
      duration: 5500,
    },
    {
      bg: "station",
      art: "hero_armed",
      lines: [
        {
          text: "Every scar. Every name. Every save and every miss.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        { text: "All of it points here.", delay: 2200, color: "#ffffff", size: 18 },
        { text: "FINAL TIMELINE: THE CONVERGENCE", delay: 3400, color: "#ffcc00", size: 22 },
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
        { text: "The Paradox Lord falls for the last time.", delay: 0, color: "#ffffff", size: 22 },
        { text: "No rift opens.", delay: 1900, color: "#aaddff", size: 18 },
        { text: "No echo. No loop.", delay: 2700, color: "#00ffcc", size: 18 },
      ],
      particles: "glow",
      duration: 7000,
    },
    {
      bg: "dark",
      art: "aria",
      lines: [
        { text: "ARIA: Temporal signature... zero. Clean.", delay: 0, color: "#00ffdd", size: 16 },
        {
          text: "No residue. Nothing rewinding. Nothing left to rewind.",
          delay: 1900,
          color: "#88ccff",
          size: 15,
        },
        { text: "You broke it. You actually broke it.", delay: 4300, color: "#00ffcc", size: 18 },
      ],
      particles: "glow",
      duration: 6500,
    },
    {
      bg: "station",
      art: "lyra",
      lines: [
        {
          text: "Lyra doesn't say anything. She just holds on.",
          delay: 0,
          color: "#ffcc88",
          size: 16,
        },
        {
          text: "Tight. Like letting go is how the loops start.",
          delay: 2100,
          color: "#ffaa44",
          size: 16,
        },
        {
          text: "\"You remember all of them? Every pass?\"",
          delay: 4200,
          color: "#ffaa44",
          size: 15,
        },
        { text: "\"Every single one.\"", delay: 6000, color: "#00ffcc", size: 16 },
        {
          text: "\"...Then you heard every time I said I love you.\"",
          delay: 7000,
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
      party: ["kael", "lyra", "you", "nova", "rook"],
      lines: [
        {
          text: "The squad gathers. Not to fight. Just to share a room.",
          delay: 0,
          color: "#aabbcc",
          size: 15,
        },
        {
          text: "And three people who shouldn't be here are.",
          delay: 2400,
          color: "#aaddff",
          size: 16,
        },
        {
          text: "Your Voss raises a glass. \"To the one who remembered us.\"",
          delay: 4400,
          color: "#00ccff",
          size: 15,
        },
        {
          text: "Miri rolls her eyes. \"To the idiot I patched up four times.\"",
          delay: 6900,
          color: "#aaffcc",
          size: 15,
        },
        {
          text: "Kai grins. \"To the door that finally stayed open.\"",
          delay: 9500,
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
        { text: "Four passes. Three acts each. One cadet.", delay: 0, color: "#aaddff", size: 16 },
        {
          text: "You've seen every version of this story.",
          delay: 1900,
          color: "#00ccff",
          size: 16,
        },
        { text: "In every one, you got back up.", delay: 3800, color: "#00ffcc", size: 18 },
        { text: "That's not a loop. That's who you are.", delay: 5300, color: "#ffffff", size: 20 },
      ],
      particles: "stars",
      duration: 10500,
    },
    {
      bg: "dark",
      lines: [
        { text: "THE LOOP IS BROKEN", delay: 0, color: "#ffcc00", size: 28 },
        { text: "TRUE ENDING", delay: 1000, color: "#00ffcc", size: 24 },
        { text: "Thank you for playing.", delay: 2200, color: "#ffffff", size: 18 },
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
          caption: "Chronos Station. 06:47. A routine shift.",
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
          caption: "Show up. Do the job. Go home. Repeat until retirement.",
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
          caption: "\"NOT TODAY.\"",
          captionPos: "center",
          captionColor: "#ffcc00",
          captionBg: "rgba(0,0,0,0.95)",
          captionSize: 18,
        },
      ],
      duration: 9000,
    },
  ],

  // The recording Rook finds in the suit's memory (II-2 → II-3). The Alpha
  // candidates who "washed out" wore the earlier C-series suits and drifted.
  the_hunt_begins: [
    {
      bg: "dark",
      art: "voss_recording",
      emotion: "calm",
      lines: [
        { text: "[SUIT MEMORY — AUDIO LOG, PRE-INCIDENT]", delay: 0, color: "#556677", size: 13 },
        { text: "\"C-series, candidate seventeen. Log begins.\"", delay: 1500, color: "#88aacc", size: 15 },
        {
          text: "\"Sixteen suits. Sixteen candidates. Every one of them drifted out of it within the hour.\"",
          delay: 3600,
          color: "#88aacc",
          size: 15,
        },
      ],
      particles: "glow",
      duration: 8000,
    },
    {
      bg: "dark",
      art: "voss_recording",
      lines: [
        { text: "\"The others broke so easily.\"", delay: 0, color: "#cc88ff", size: 17, emotion: "menacing" },
        { text: "\"If this is playing, you put on the suit.\"", delay: 2200, color: "#cc88ff", size: 16, emotion: "calm" },
        {
          text: "\"And you're still in it. I'd very much like to meet you.\"",
          delay: 4400,
          color: "#ff4466",
          size: 16,
          emotion: "curious",
        },
        { text: "[LOG ENDS]", delay: 7400, color: "#556677", size: 13 },
      ],
      particles: "glow",
      duration: 9500,
    },
    {
      bg: "station",
      art: "rook",
      voice: "rook",
      lines: [
        { text: "Rook kills the playback. Nobody says anything for a while.", delay: 0, color: "#aabbcc", size: 15 },
        { text: "\"Alpha candidates. The ones who washed out.\"", delay: 2400, color: "#44ff88", size: 15 },
        { text: "\"They didn't wash out. They drifted.\"", delay: 4600, color: "#44ff88", size: 16, emotion: "sad" },
      ],
      duration: 7500,
    },
    {
      bg: "station",
      art: "party",
      party: ["lyra", "you", "rook"],
      lines: [
        { text: "Rook shoulders a pack of tools. Nobody asked him to come.", delay: 0, color: "#44ff88", size: 15 },
        {
          text: "\"The Spine's a kilometre of fans and pistons. You'll want someone who knows where they bite.\"",
          delay: 2300,
          color: "#44ff88",
          size: 15,
          voice: "rook",
        },
        { text: "Lyra doesn't say anything. She moves over to make room.", delay: 5600, color: "#ffcc88", size: 15 },
      ],
      particles: "glow",
      duration: 8500,
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
          text: "The night-shift log has a page torn out.",
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
          text: "Supervisor's note: \"You're up. Don't ask who built it.\"",
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
          text: "Let's see what this thing can do.",
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
          tagline: "ONE CADET. NO BACKUP.",
        },
        pages: [
          {
            hold: 1600,
            flipMs: 650,
            panel: {
              bg: "station",
              caption: "CHRONOS STATION — 06:47. One lab light never went off.",
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
              caption: "Something came through. The alarms stopped first.",
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
              caption: "They called it the Paradox Lord. Survivors stopped talking.",
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
              caption: "{AGENT}. Suit up. Nobody else is coming.",
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
  // ACT II TRANSITION — Out of the Core
  // Flipbook page-turn bridging Acts I → II
  // ═══════════════════════════════════════════════════════════════════
  act2_transition_fb: [
    {
      bg: "dark",
      flipbook: {
        spineSide: "left",
        paperTint: "#0a0800",
        pages: [
          { hold: 1400, flipMs: 600, panel: { bg: "station", caption: "Static. Then a heartbeat. The Core is still falling.", captionPos: "top", captionColor: "#ff8844", captionSize: 13, halftone: 0.12 } },
          { hold: 1200, flipMs: 500, panel: { bg: "reactor", art: "rift", caption: "Below decks, the rift keeps widening. Nobody's patching it.", captionPos: "bottom", captionColor: "#ffaa00", captionSize: 13, sfx: "BREACH", sfxColor: "#ff6622", sfxSize: 32, sfxX: 0.7, sfxY: 0.35, sfxRot: -8, action: true } },
          { hold: 1300, flipMs: 550, panel: { bg: "reactor", caption: "ARIA: \"Vitals back. Suit's wrecked. You're alive. Don't waste it.\"", captionPos: "center", captionColor: "#1a1208", captionSize: 12 } },
          { hold: 1100, flipMs: 500, panel: { bg: "boss_lair", art: "villain", caption: "He let you live. He wants an audience.", captionPos: "bottom", captionColor: "#a01010", captionSize: 13, action: true, halftone: 0.16 } },
          { hold: 1400, flipMs: 550, panel: { bg: "reactor", art: "hero_armed", caption: "This time, you don't walk back in alone.", captionPos: "center", captionColor: "#1a1208", captionSize: 14 } },
          { hold: 1800, flipMs: 0, panel: { bg: "reactor", caption: "ACT II — THE BONDS", captionPos: "center", captionColor: "#ff8844", captionSize: 20 } },
        ],
      },
      title: "ACT II",
      duration: 9400,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT III TRANSITION — The Hunt
  // Flipbook page-turn bridging Acts II → III
  // ═══════════════════════════════════════════════════════════════════
  hunt_transition_fb: [
    {
      bg: "dark",
      flipbook: {
        spineSide: "left",
        paperTint: "#0a0610",
        pages: [
          { hold: 1400, flipMs: 600, panel: { bg: "reactor", art: "rift", caption: "The Foundry burns behind you. For once, you lit it.", captionPos: "top", captionColor: "#ffaa44", captionSize: 13, halftone: 0.12, action: true } },
          { hold: 1300, flipMs: 550, panel: { bg: "station", caption: "Five people. One map. Every place he ever hurt you, marked in red.", captionPos: "center", captionColor: "#1a1208", captionSize: 12 } },
          { hold: 1200, flipMs: 500, panel: { bg: "boss_lair", art: "villain_form2", caption: "He's hunted you since the Core.", captionPos: "bottom", captionColor: "#a01010", captionSize: 13, halftone: 0.16 } },
          { hold: 1400, flipMs: 550, panel: { bg: "station", art: "hero_armed", caption: "Now it's the other way round.", captionPos: "center", captionColor: "#1a1208", captionSize: 14, sfx: "KLAK", sfxColor: "#00ffcc", sfxSize: 32, sfxX: 0.72, sfxY: 0.36, sfxRot: -8, action: true } },
          { hold: 1800, flipMs: 0, panel: { bg: "temporal_rift", caption: "ACT III — THE HUNT", captionPos: "center", captionColor: "#cc88ff", captionSize: 20, halftone: 0.12 } },
        ],
      },
      title: "ACT III",
      duration: 8900,
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ACT IV TRANSITION — The Final Fracture
  // Flipbook page-turn bridging Acts III → IV
  // ═══════════════════════════════════════════════════════════════════
  act3_transition_fb: [
    {
      bg: "dark",
      flipbook: {
        spineSide: "right",
        paperTint: "#0a0010",
        pages: [
          { hold: 1500, flipMs: 650, panel: { bg: "temporal_rift", art: "rift", caption: "The Final Form tears the Core wide open.", captionPos: "top", captionColor: "#ff2244", captionSize: 14, action: true, halftone: 0.14 } },
          { hold: 1200, flipMs: 550, panel: { bg: "deep_space", caption: "Every timeline he's stolen starts pulling toward one point.", captionPos: "center", captionColor: "#1a1208", captionSize: 12 } },
          { hold: 1300, flipMs: 600, panel: { bg: "boss_lair", art: "villain_form2", sfx: "CRACK", sfxColor: "#ff0066", sfxSize: 36, sfxX: 0.65, sfxY: 0.4, sfxRot: -10, caption: "The Paradox Lord sheds his skin.", captionPos: "bottom", captionColor: "#a01010", captionSize: 13, action: true } },
          { hold: 1400, flipMs: 550, panel: { bg: "temporal_rift", caption: "ARIA: \"Your squad's Voss and the Lord. Same signature. 94 percent.\"", captionPos: "center", captionColor: "#1a1208", captionSize: 12 } },
          { hold: 1100, flipMs: 500, panel: { bg: "deep_space", art: "villain_final", caption: "Not a monster. A mirror.", captionPos: "top", captionColor: "#ff4466", captionSize: 14, halftone: 0.18, action: true } },
          { hold: 1500, flipMs: 600, panel: { bg: "temporal_rift", art: "hero_armed", caption: "One way in. Only one of you goes.", captionPos: "center", captionColor: "#1a1208", captionSize: 14 } },
          { hold: 2000, flipMs: 0, panel: { bg: "boss_lair", caption: "ACT IV — THE SACRIFICE", captionPos: "center", captionColor: "#ff2244", captionSize: 20, halftone: 0.12 } },
        ],
      },
      title: "ACT IV",
      duration: 11800,
    },
  ],
};
