import { renderDrone } from "./drone.js";
import { renderPhantom } from "./phantom.js";
import { renderBeast } from "./beast.js";
import { renderBoss } from "./boss.js";
import { renderCorruptCop } from "./corrupt-cop.js";
import { renderSentinel } from "./sentinel.js";
import { renderGlitchling } from "./glitchling.js";
import { renderShieldCommander } from "./shield-commander.js";
import { renderTemporalSummoner } from "./temporal-summoner.js";
import { renderChronoBomber } from "./chrono-bomber.js";
import { renderHenchman } from "./henchman.js";
import { renderPhaseStalker } from "./phase-stalker.js";
import { renderTimeWarden } from "./time-warden.js";
import { renderEchoDrone } from "./echo-drone.js";
import { renderRiftLeaper } from "./rift-leaper.js";
import { renderTemporalEngineer } from "./temporal-engineer.js";
import { renderHound } from "./hound.js";

export const ENEMY_RENDERERS = {
  drone: renderDrone,
  phantom: renderPhantom,
  beast: renderBeast,
  boss: renderBoss,
  boss_form2: renderBoss,
  boss_form3: renderBoss,
  corruptCop: renderCorruptCop,
  sentinel: renderSentinel,
  glitchling: renderGlitchling,
  shieldCommander: renderShieldCommander,
  temporalSummoner: renderTemporalSummoner,
  chronoBomber: renderChronoBomber,
  henchman: renderHenchman,
  phaseStalker: renderPhaseStalker,
  timeWarden: renderTimeWarden,
  echoDrone: renderEchoDrone,
  riftLeaper: renderRiftLeaper,
  temporalEngineer: renderTemporalEngineer,
  hound: renderHound,
};
