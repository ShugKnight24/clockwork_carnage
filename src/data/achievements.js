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
