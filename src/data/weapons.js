// Weapon definitions. Mechanics are flags the combat code reads:
//   phasesShields  pellets pass front shields and energy shields
//   slowOnHit      { ms, factor }: a hit that does not kill slows the target
//   bounces        projectile rounds ricochet off walls this many times
//   projectileSpeed  a projectile round's speed (units/s, default 12)
//   falloff        [full, far, floor]: full damage out to `full` tiles, easing
//                  to `floor` × damage at `far` and beyond
//   chains         a round that hits an enemy and has a bounce left flies on
//                  to the nearest other enemy in sight
//   piercesArmor   ignores front shields, armour plates and energy shields
//                  (not a boss's carapace) and carries on, at `pierceMult`, into
//                  the next enemy in line
//   headStagger    ms a headshot staggers a non-boss enemy: its telegraphed
//                  attack is cancelled and it reels
// Ammo: each gun carries its own rounds, up to `maxAmmo`; it comes with
// `startAmmo`, and an ammo crate adds `pickupAmmo` to every gun carried. The
// sidearm (`infiniteAmmo`) never spends any.
// Aim: `spread` is the hip-fire cone (radians, half-angle) every round is
// scattered across, drawn as the crosshair's spread brackets; `adsSpread` is
// the cone with the sights up. `adsZoom` is the sight's magnification and
// `adsSens` the look speed while aimed. A `scope` swaps the sights for the
// sniper scope (src/ui/crosshair.js drawScope); `headshotMult` multiplies a
// head zone's damage on top of the enemy's own.
// Sustained damage (every round landing, inside falloff), for balance:
// pistol 50, ricochet 56 (84 / 126 after one / two banks), shotgun 83 out to
// 10 m, cannon 80 + splash, rifle 110, scattergun 120 within 3 m (44 at 6 m),
// sniper 77 (115 a body shot through any shield, 575 a headshot), EMP 29 +
// disable.
export const WEAPONS = [
  {
    id: 0,
    name: "Chrono Pistol",
    damage: 15,
    fireRate: 300, // ms between shots
    ammoPerShot: 1,
    maxAmmo: 999,
    startAmmo: 999,
    infiniteAmmo: true,
    spread: 0.012,
    adsSpread: 0.003,
    adsZoom: 1.25,
    range: 50,
    type: "hitscan",
    color: "#00ffcc",
    description: "Standard issue temporal sidearm",
  },
  {
    id: 1,
    name: "Temporal Shotgun",
    damage: 9,
    pellets: 6,
    fireRate: 650,
    ammoPerShot: 1,
    maxAmmo: 40,
    startAmmo: 20,
    pickupAmmo: 10,
    // A choked barrel: a tight pattern that still lands most of its pellets
    // across a room, slug-like at mid range.
    spread: 0.035,
    adsSpread: 0.02,
    adsZoom: 1.15,
    range: 22,
    falloff: [10, 20, 0.5],
    type: "hitscan",
    color: "#ff8800",
    description: "Tight choke: a slug-like pattern that carries across a room",
  },
  {
    id: 2,
    name: "Phase Rifle",
    damage: 22,
    fireRate: 200,
    ammoPerShot: 1,
    maxAmmo: 120,
    startAmmo: 60,
    pickupAmmo: 30,
    spread: 0.014,
    adsSpread: 0.003,
    adsZoom: 1.5,
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
    startAmmo: 20,
    pickupAmmo: 10,
    spread: 0.006,
    adsSpread: 0,
    adsZoom: 1.3,
    range: 100,
    type: "projectile",
    color: "#ff0044",
    description: "Devastating quantum payload",
  },
  {
    id: 4,
    name: "Phase Scattergun",
    damage: 9,
    pellets: 10,
    phasesShields: true,
    fireRate: 750,
    ammoPerShot: 1,
    maxAmmo: 24,
    startAmmo: 12,
    pickupAmmo: 6,
    // A wall of pellets that is devastating at arm's length and spent past
    // about six metres.
    spread: 0.15,
    adsSpread: 0.11,
    adsZoom: 1.1,
    range: 10,
    falloff: [3, 7, 0.15],
    type: "hitscan",
    color: "#ff66cc",
    description: "Devastating at arm's length, spent past six metres — phases through shields",
  },
  {
    id: 5,
    name: "Temporal Sniper",
    // The answer to shield bearers at range: the bolt goes through plate and
    // shield into whatever stands behind, and a headshot (×2.5 ×2) drops
    // anything short of a boss and staggers what it does not. A body shot
    // drops nothing bigger than a henchman. Few rounds, a long rechamber.
    damage: 115,
    piercesArmor: true,
    pierceMult: 0.7,
    headStagger: 900,
    slowOnHit: { ms: 2500, factor: 0.4 },
    fireRate: 1500,
    ammoPerShot: 1,
    maxAmmo: 8,
    startAmmo: 4,
    pickupAmmo: 1,
    spread: 0.06,
    adsSpread: 0,
    adsZoom: 4,
    adsSens: 0.75,
    scope: true,
    headshotMult: 2,
    range: 300,
    type: "hitscan",
    color: "#66ccff",
    description: "Scoped bolt that pierces shields and armour into the next target. Wild from the hip.",
  },
  {
    id: 6,
    name: "Ricochet Pistol",
    // Cheap rounds that get better off a wall: each bank hits half again as
    // hard, and a round that hits with a bounce left chains to the next enemy.
    damage: 14,
    bounces: 2,
    chains: true,
    fireRate: 250,
    ammoPerShot: 1,
    maxAmmo: 240,
    startAmmo: 90,
    pickupAmmo: 40,
    spread: 0.02,
    adsSpread: 0.005,
    adsZoom: 1.25,
    range: 60,
    type: "projectile",
    // A pistol round, not a lob: at the default 12 u/s a 12 m shot was a
    // second in flight and every strafing target stepped out of its way.
    projectileSpeed: 30,
    color: "#ffee66",
    description: "Cheap rounds that bank off walls harder and chain between targets.",
  },
  {
    id: 7,
    name: "EMP Launcher",
    damage: 40,
    fireRate: 1400,
    ammoPerShot: 2,
    maxAmmo: 16,
    startAmmo: 8,
    pickupAmmo: 4,
    spread: 0.01,
    adsSpread: 0,
    adsZoom: 1.3,
    range: 40,
    type: "projectile",
    projectileSpeed: 22,
    color: "#88ffff",
    description: "Explosive EMP rounds that briefly disable shields and drones.",
  },
];
