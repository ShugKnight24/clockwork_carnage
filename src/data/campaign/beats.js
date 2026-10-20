/**
 * Narrative beats: the story told while you play, not between levels.
 *
 * Each level of an act can carry beats, fired once each by the level's own
 * progress (src/systems/level-beats.js):
 *   { at: "start", delay }   seconds after the level begins
 *   { at: "time", s }         seconds into the level
 *   { at: "kills", frac }     a share of the level's enemies down
 *   { at: "cell", n }         the n-th power cell found
 *   { at: "exit" }            the exit within a few steps
 * and doing any of:
 *   lines: [[speaker, text, emotion?]]   said in order, after anything else said
 *   event: "flicker" | "tremor"          the lights stutter, the floor shudders
 *
 * Act I follows the morning of the prologue down through the station: the
 * squads the Supervisor sent to the Engine level went this way first, and
 * their trail (Rasczak's radio logs, the insignia on the officers firing at you,
 * Simon's badge) is how you learn what the Engine did at 06:47, and to whom.
 * Keyed by act id, then by the level's map id (src/data/campaign/acts.js).
 */

const ARIA = "ARIA";
const PA = "PA";
const LOG = "RASCZAK (LOG)";
const LAB = "LAB LOG";
const WHISPER = "UNKNOWN";

export const LEVEL_BEATS = {
  1: {
    entry: [
      { at: "start", delay: 4, lines: [[ARIA, "The Engine level is four floors down. Everything between us and it is quiet. I don't like quiet.", "worried"]] },
      { at: "kills", frac: 0.3, lines: [[LOG, "Rasczak, unit four, entry stair. Lights are doing something strange down here. The clocks are... wrong. All of them.", "worried"]] },
      { at: "cell", n: 1, lines: [[PA, "Good morning, Chronos Station. Good morning, Chronos Station. Good morning, Chron—", "calm"]] },
      { at: "kills", frac: 0.7, event: "tremor", lines: [[ARIA, "Feel that? The Engine is pulling power in waves. Every wave, it gets worse up here.", "worried"]] },
      { at: "exit", lines: [[ARIA, "Stairwell down to Security. Rasczak's squads went this way. So do we.", "calm"]] },
    ],
    checkpoint: [
      { at: "start", delay: 3, lines: [[ARIA, "Security wing. If Rasczak made it to the Engine level, he came through here first.", "calm"]] },
      { at: "kills", frac: 0.25, lines: [
        [ARIA, "Cadet... those officers. Look at the shoulder patches. Unit four.", "afraid"],
        [ARIA, "They're Rasczak's people. Whatever came up out of that chamber, it turned them around.", "afraid"],
      ] },
      { at: "kills", frac: 0.6, event: "flicker", lines: [[LOG, "Something walked out of the Engine chamber. It spoke to us. It asked us to stand still. Some of us... stood still.", "afraid"]] },
      { at: "exit", lines: [
        [ARIA, "There. By the turnstile, on the floor. A badge. Simon's.", "sad"],
        [ARIA, "He got this far. Further than his people did. I'm keeping it on file, {AGENT}. Someone should.", "tender"],
      ] },
    ],
    research: [
      { at: "start", delay: 3, lines: [[PA, "Containment protocols engaged. Please remain calm. Containment protocols engaged. Please remain c—", "calm"]] },
      { at: "kills", frac: 0.4, lines: [[ARIA, "The phantoms. Research staff, I think. Some of them still have their badges clipped on.", "sad"]] },
      { at: "cell", n: 1, lines: [[LAB, "Six forty-six. Engine at one hundred and forty percent. The Doctor's proxy is running the sequence and we cannot lock it out. Someone stop—", "afraid"]] },
      { at: "time", s: 150, event: "tremor" },
      { at: "exit", lines: [[ARIA, "Six forty-six. One minute before the breach. They saw it coming, and they couldn't stop it.", "worried"]] },
    ],
    containment: [
      { at: "start", delay: 3, lines: [[ARIA, "Detention. Every cell on this level opened at the same second. Six forty-seven.", "worried"]] },
      { at: "kills", frac: 0.5, event: "flicker", lines: [[LOG, "I can hear it in the walls. It knows our names. It keeps counting to eleven.", "afraid"]] },
      { at: "exit", lines: [[ARIA, "Rasczak's beacon was last seen two floors down. The server farm. If anyone wrote down what happened, it's there.", "calm"]] },
    ],
    server_farm: [
      { at: "start", delay: 3, lines: [[ARIA, "The data center. Every system on the station logs here. Let me look while you shoot.", "curious"]] },
      { at: "cell", n: 1, lines: [
        [ARIA, "Got it. The Engine's access log for this morning. One session. It ran from six forty-seven and zero seconds...", "curious"],
        [ARIA, "...to six forty-seven and eleven. Eleven seconds, {AGENT}. Everything you've seen happened in eleven seconds.", "afraid"],
      ] },
      { at: "kills", frac: 0.7, lines: [
        [LOG, "Simon, if you're hearing this, don't come down. Don't bring anyone. It's not a breach, it's a door, and it's still op—", "afraid"],
        [ARIA, "That's the last thing Rasczak logged.", "sad"],
      ] },
    ],
    reactor: [
      { at: "start", delay: 2, event: "tremor", lines: [[PA, "Warning. Temporal containment at nine percent. Warning. Temporal containment at nine percent.", "calm"]] },
      { at: "kills", frac: 0.5, lines: [[ARIA, "Your suit and that reactor have the same signature. It's like walking into my own reflection, and it's smiling.", "worried"]] },
      { at: "exit", event: "flicker", lines: [[ARIA, "His lab is past the reactor. Whatever Voss became, I think he knows we're coming.", "worried"]] },
    ],
    voss_lab: [
      { at: "start", delay: 3, lines: [[ARIA, "His lab. Notes on every surface. Some of them are about you, {AGENT}. Dated before you were given the suit.", "afraid"]] },
      { at: "kills", frac: 0.5, event: "flicker", lines: [[WHISPER, "You're early. You're always early.", "menacing"]] },
      { at: "exit", lines: [[ARIA, "The Core is next. My readings stop meaning anything past that door. Stay close to me.", "afraid"]] },
    ],
  },
};
