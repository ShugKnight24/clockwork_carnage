/**
 * Badge symbols in a -5..5 box. `fg` is the raised metal (or thread, or
 * light), `bg` punches detail back into it. No ids, no gradients: the finish
 * decides how the colours are treated.
 */
const f = (n) => Math.round(n * 100) / 100;

const STAR = (() => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 2 : 4.8;
    d += `${i ? "L" : "M"}${f(Math.cos(a) * r)},${f(Math.sin(a) * r + 0.3)} `;
  }
  return d + "Z";
})();

const chevrons = (n, fg) => {
  let d = "";
  for (let i = 0; i < n; i++) {
    const y = 3.2 - i * 1.9;
    d += `<path d="M-3.8,${f(y - 1.6)} L0,${f(y)} L3.8,${f(y - 1.6)}" fill="none" stroke="${fg}" stroke-width="1.05" stroke-linejoin="round"/>`;
  }
  return d;
};

const gear = (r, teeth) => {
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i * Math.PI) / teeth;
    const rr = i % 2 ? r : r + 1;
    d += `${i ? "L" : "M"}${f(Math.cos(a) * rr)},${f(Math.sin(a) * rr)} `;
  }
  return d + "Z";
};

const S = {
  // Classic (moved from agent-rig.js badgeIcon, unchanged)
  shield: (fg, bg) => `<path d="M0,-4.8 L4,-3.3 C4,0.8 2.4,3.4 0,4.8 C-2.4,3.4 -4,0.8 -4,-3.3 Z" fill="${fg}"/><path d="M-2,-0.6 L0,1.6 L2,-0.6" fill="none" stroke="${bg}" stroke-width=".9"/>`,
  skull: (fg, bg) => `<path d="M-3.8,0.8 C-4.8,-4.8 4.8,-4.8 3.8,0.8 L2.6,1.8 L2.6,4 L-2.6,4 L-2.6,1.8 Z" fill="${fg}"/><g fill="${bg}"><circle cx="-1.6" cy="-0.6" r="1.1"/><circle cx="1.6" cy="-0.6" r="1.1"/><rect x="-.3" y="2.2" width=".6" height="1.8"/></g>`,
  clock: (fg) => `<circle r="4.2" fill="none" stroke="${fg}" stroke-width="1.1"/><path d="M0,-2.8 L0,0 L2,1.4" fill="none" stroke="${fg}" stroke-width=".9" stroke-linecap="round"/>`,
  star: (fg) => `<path d="${STAR}" fill="${fg}"/>`,
  bolt: (fg) => `<path d="M1.2,-5 L-3,0.8 L-0.4,0.8 L-1.4,5 L3,-1 L0.4,-1 Z" fill="${fg}"/>`,
  eye: (fg, bg) => `<path d="M-4.8,0 Q0,-4.2 4.8,0 Q0,4.2 -4.8,0 Z" fill="${fg}"/><circle r="1.6" fill="${bg}"/>`,
  rift: (fg) => `<path d="M0,-5 L1.8,0 L0,5 L-1.8,0 Z" fill="${fg}"/><path d="M-4.2,-2.4 C-2,-4 2.2,-3.6 3.6,-1 M4.2,2.4 C2,4 -2.2,3.6 -3.6,1" fill="none" stroke="${fg}" stroke-width=".8" stroke-linecap="round"/>`,
  // Factions
  corps: (fg, bg) => `<path d="${gear(3.4, 8)}" fill="${fg}"/><circle r="1.9" fill="${bg}"/><path d="M0,-1.3 L0,0 L0.9,0.6" fill="none" stroke="${fg}" stroke-width=".55" stroke-linecap="round"/>`,
  aegis: (fg, bg) => `<path d="M0,-4.8 L4,-3.3 C4,0.8 2.4,3.4 0,4.8 C-2.4,3.4 -4,0.8 -4,-3.3 Z" fill="none" stroke="${fg}" stroke-width=".9"/><path d="M-2.6,-1 L0,-2.6 L2.6,-1 L0,3 Z" fill="${fg}"/><path d="M0,-2.6 L0,3" stroke="${bg}" stroke-width=".5"/>`,
  walkers: (fg) => `<path d="M-4,3.6 L-1.4,-3.8 L0,-1 L1.4,-3.8 L4,3.6" fill="none" stroke="${fg}" stroke-width="1" stroke-linejoin="round"/><circle cy="1.6" r="1.1" fill="${fg}"/>`,
  deadsquad: (fg, bg) => `${S.skull(fg, bg)}<path d="M-4.6,4.6 L4.6,-4.6 M-4.6,-4.6 L4.6,4.6" stroke="${fg}" stroke-width=".7" opacity=".85"/>`,
  guard: (fg, bg) => `<path d="${gear(3.8, 10)}" fill="${fg}"/><circle r="2.4" fill="${bg}"/><path d="M-1.3,-1.6 L1.3,-1.6 L1.3,0.4 C1.3,1.4 0,2 0,2 C0,2 -1.3,1.4 -1.3,0.4 Z" fill="${fg}"/>`,
  hunters: (fg) => `<circle r="3.4" fill="none" stroke="${fg}" stroke-width=".8"/><path d="M0,-5 L0,-2 M0,2 L0,5 M-5,0 L-2,0 M2,0 L5,0" stroke="${fg}" stroke-width=".9"/><circle r=".9" fill="${fg}"/>`,
  crew: (fg) => `<path d="M-4.2,1.2 L0,-3.6 L4.2,1.2" fill="none" stroke="${fg}" stroke-width="1.1" stroke-linejoin="round"/><path d="M-3,3.6 L3,3.6" stroke="${fg}" stroke-width="1.1" stroke-linecap="round"/><circle cy="0.6" r="1" fill="${fg}"/>`,
  aria: (fg) => `<path d="M-4.4,0 C-2.6,-3 2.6,-3 4.4,0 C2.6,3 -2.6,3 -4.4,0 Z" fill="none" stroke="${fg}" stroke-width=".8"/><path d="M-2.4,0.9 L-1.2,-0.9 L0,0.9 L1.2,-0.9 L2.4,0.9" fill="none" stroke="${fg}" stroke-width=".7" stroke-linejoin="round"/>`,
  // Ranks: chevrons, bars and stars
  rank1: (fg) => chevrons(1, fg),
  rank2: (fg) => chevrons(2, fg),
  rank3: (fg) => chevrons(3, fg),
  rank4: (fg) => `<rect x="-1" y="-4.2" width="2" height="8.4" rx=".3" fill="${fg}"/>`,
  rank5: (fg) => `<rect x="-2.6" y="-4.2" width="1.8" height="8.4" rx=".3" fill="${fg}"/><rect x=".8" y="-4.2" width="1.8" height="8.4" rx=".3" fill="${fg}"/>`,
  rank6: (fg) => `<g transform="scale(.62) translate(0,-2)"><path d="${STAR}" fill="${fg}"/></g>${chevrons(1, fg)}`,
  // Act emblems: the Paradox Lord's mask behind 1-3 bars
  act1: (fg, bg) => actMask(fg, bg, 1),
  act2: (fg, bg) => actMask(fg, bg, 2),
  act3: (fg, bg) => actMask(fg, bg, 3),
  // Earned
  lordslayer: (fg, bg) => `${actMask(fg, bg, 0)}<path d="M-4.6,4.4 L4.4,-4.6" stroke="${fg}" stroke-width="1.1" stroke-linecap="round"/>`,
  untouchable: (fg) => `<circle r="4.2" fill="none" stroke="${fg}" stroke-width=".7" stroke-dasharray="1.2 .9"/><path d="${STAR}" fill="${fg}" transform="scale(.55)"/>`,
  centurion: (fg, bg) => `<path d="M-4.4,1.6 C-4.4,-3.6 4.4,-3.6 4.4,1.6 Z" fill="${fg}"/><path d="M-3,-3.4 C-1.6,-5.2 1.6,-5.2 3,-3.4" fill="none" stroke="${fg}" stroke-width="1.1"/><path d="M-1.2,1.6 L-1.2,4.4 L1.2,4.4 L1.2,1.6" fill="${fg}"/><path d="M-2.6,-0.6 L2.6,-0.6" stroke="${bg}" stroke-width=".6"/>`,
  speeddemon: (fg) => `<path d="M-4.8,-1.6 L2,-1.6 M-4,0.4 L2.8,0.4 M-4.8,2.4 L1.6,2.4" stroke="${fg}" stroke-width=".8" stroke-linecap="round"/><path d="M1.4,-4.4 L-0.6,0.4 L1.2,0.4 L0.2,4.6 L4.4,-1 L2.4,-1 Z" fill="${fg}"/>`,
  veteran: (fg) => `<path d="${gear(3.8, 12)}" fill="none" stroke="${fg}" stroke-width=".6"/><path d="M-2.2,-2.6 L2.2,-2.6 L2.2,0.8 C2.2,2.6 0,3.4 0,3.4 C0,3.4 -2.2,2.6 -2.2,0.8 Z" fill="${fg}"/>`,
  firstblood: (fg) => `<path d="M0,-4.8 C2.6,-1.2 3.6,0.6 3.6,2 C3.6,4 2,5 0,5 C-2,5 -3.6,4 -3.6,2 C-3.6,0.6 -2.6,-1.2 0,-4.8 Z" fill="${fg}"/>`,
  dronehunter: (fg, bg) => `<rect x="-2" y="-1.4" width="4" height="2.8" rx=".8" fill="${fg}"/><circle cx="-3.6" cy="-2.6" r="1.3" fill="none" stroke="${fg}" stroke-width=".6"/><circle cx="3.6" cy="-2.6" r="1.3" fill="none" stroke="${fg}" stroke-width=".6"/><circle r=".7" fill="${bg}"/><path d="M-4.6,4.6 L4.6,-4.6" stroke="${fg}" stroke-width=".7"/>`,
  phantom: (fg, bg) => `<path d="M-3.6,4.6 L-3.6,-1 C-3.6,-5.4 3.6,-5.4 3.6,-1 L3.6,4.6 L2.2,3.4 L1,4.6 L0,3.4 L-1,4.6 L-2.2,3.4 Z" fill="${fg}"/><circle cx="-1.3" cy="-1" r=".8" fill="${bg}"/><circle cx="1.3" cy="-1" r=".8" fill="${bg}"/>`,
  tamer: (fg) => `<path d="M-3.8,-3.8 C-1,-1.6 1,-1.6 3.8,-3.8 M-4.4,0 C-1.4,1.8 1.4,1.8 4.4,0 M-3.8,3.8 C-1,1.6 1,1.6 3.8,3.8" fill="none" stroke="${fg}" stroke-width=".8" stroke-linecap="round"/>`,
  scoremaster: (fg) => `<path d="M-4,4 L-4,1 M-1.4,4 L-1.4,-1 M1.2,4 L1.2,-2.6 M3.8,4 L3.8,-4.4" stroke="${fg}" stroke-width="1.2" stroke-linecap="round"/>`,
  graduate: (fg) => `<path d="M-4.8,-1 L0,-3.4 L4.8,-1 L0,1.4 Z" fill="${fg}"/><path d="M-2.8,0.2 L-2.8,2.6 C-1.4,3.8 1.4,3.8 2.8,2.6 L2.8,0.2" fill="${fg}"/><path d="M4,-0.6 L4,2.8" stroke="${fg}" stroke-width=".5"/>`,
  survivor: (fg) => `<path d="M-4.2,-2.8 L0,-4.6 L4.2,-2.8 L4.2,0.6 C4.2,3 0,4.8 0,4.8 C0,4.8 -4.2,3 -4.2,0.6 Z" fill="none" stroke="${fg}" stroke-width=".8"/><path d="M-1.8,0 L-0.4,1.4 L2,-1.4" fill="none" stroke="${fg}" stroke-width=".9" stroke-linecap="round"/>`,
};

function actMask(fg, bg, bars) {
  let m = `<path d="M-3.4,-3.4 C-3.4,-5.2 3.4,-5.2 3.4,-3.4 L3,1 C2.2,2.8 -2.2,2.8 -3,1 Z" fill="${fg}"/><path d="M-2.2,-1.6 L-0.6,-1.2 M2.2,-1.6 L0.6,-1.2" stroke="${bg}" stroke-width=".7" stroke-linecap="round"/>`;
  for (let i = 0; i < bars; i++) m += `<rect x="${f(-3.4 + i * 2.5)}" y="3.4" width="1.8" height="1.2" fill="${fg}"/>`;
  return m;
}

export function symbolMarkup(id, fg, bg) {
  const s = S[id];
  return s ? s(fg, bg) : "";
}
