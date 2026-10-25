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
 *   guest: [member]                      someone speaking who isn't in the squad
 *                                        (Kael, from his mezzanine in the Precinct)
 * A squad member speaks only on a level they are present for (acts.js).
 *
 * The thread through all four acts is the one the prologue leaves you with:
 * the Engine chamber logged your badge, 11235, at 06:47, while you were in
 * the range with ARIA, and Supervisor Simon's last call came from in there.
 *
 *   I    The morning, followed down. Rasczak's squads went first; their logs,
 *        the patches on the officers firing at you, and Simon's badge (he ran
 *        down after them, alone) tell you what eleven seconds did, and to whom.
 *   II   Hunted. Something follows the sound of the shard, the strangers who
 *        take you in each lost someone, and Kael tells you how Simon died: he
 *        held the chamber door, and waited one second too long to open it.
 *   III  The hunt turned round. The Lord answers every wound with a taunt
 *        about who he'll take, and in the Engine you hear Simon's last call
 *        whole: he saw a cadet in the chamber. Your badge. Your suit.
 *   IV   The answer. The Core opens onto 06:47; whoever walks in, walks into
 *        that morning. The log was always you, going back. Everyone you
 *        gathered stays behind, one door at a time, so you can.
 *
 * Keyed by act id, then by the level's map id (src/data/campaign/acts.js).
 */

const ARIA = "ARIA";
const PA = "PA";
const LOG = "RASCZAK (LOG)";
const LAB = "LAB LOG";
const WHISPER = "UNKNOWN";
const SIMON = "SIMON (LOG)";
/** Lyra in II-1, before she has a name. */
const STRANGER = "ENCRYPTED";
const LYRA = "LYRA";
const ROOK = "ROOK";
const NOVA = "NOVA";
const KAEL = "KAEL";
const LORD = "PARADOX LORD";

export const LEVEL_BEATS = {
  1: {
    entry: [
      { at: "start", delay: 4, lines: [[ARIA, "The Engine level is four floors down. Everything between us and it is quiet. I don't like quiet.", "worried"]] },
      { at: "kills", frac: 0.3, lines: [[LOG, "Rasczak, unit four, entry stair. Lights are doing something strange down here. The clocks are... wrong. All of them.", "worried"]] },
      { at: "cell", n: 1, lines: [[PA, "Good morning, Chronos Station. Good morning, Chronos Station. Good morning, Chron—", "calm"]] },
      { at: "kills", frac: 0.7, event: "tremor", lines: [[ARIA, "Terminal's still logged in. Last message out: 'Lift's coming back up. I'll wait for it.'", "sad"]] },
      { at: "exit", lines: [[ARIA, "Stairwell down to Security. Rasczak's squads went this way. So do we.", "calm"]] },
    ],
    checkpoint: [
      { at: "start", delay: 3, lines: [[ARIA, "Security wing. If Rasczak made it to the Engine level, he came through here first.", "calm"]] },
      { at: "kills", frac: 0.25, lines: [
        [ARIA, "{AGENT}... that one. Unit four. He told you to mind the coffee this morning.", "afraid"],
        [ARIA, "They're Rasczak's people. Whatever came up out of that chamber, it turned them around.", "afraid"],
      ] },
      { at: "kills", frac: 0.6, event: "flicker", lines: [[LOG, "Something walked out of the Engine chamber. It spoke to us. It asked us to stand still. Some of us... stood still.", "afraid"]] },
      { at: "exit", lines: [
        [ARIA, "There. By the turnstile, on the floor. A badge. Simon's.", "sad"],
        [ARIA, "He told you he had all morning. He didn't stop to pick it up. I'm keeping it on file, {AGENT}.", "tender"],
      ] },
    ],
    research: [
      { at: "start", delay: 3, lines: [[PA, "Containment protocols engaged. Please remain calm. Containment protocols engaged. Please remain c—", "calm"]] },
      { at: "kills", frac: 0.4, lines: [[ARIA, "Research staff. Some of them still have their badges clipped on. Orr had hers on.", "sad"]] },
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
        [ARIA, "The night Voss died, three years ago, his experiment ran eleven seconds too. Same seconds. To the hundredth.", "afraid"],
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

  2: {
    evac_shafts: [
      { at: "start", delay: 4, lines: [[ARIA, "Suit at thirty percent. Shard's cracked. One heartbeat on this whole deck, {AGENT}. Yours.", "worried"]] },
      { at: "kills", frac: 0.35, lines: [[STRANGER, "Keep low. He let you live, and he isn't the kind to forget where he left something.", "calm"]] },
      { at: "kills", frac: 0.7, event: "tremor", lines: [[ARIA, "Something big just moved in the shaft above us. Not a drone. It stopped when we stopped.", "afraid"]] },
      { at: "exit", lines: [[ARIA, "Whoever she is, she knows these shafts better than the crews did. I'm choosing to find that comforting.", "curious"]] },
    ],
    salvage_deck: [
      { at: "start", delay: 3, lines: [[LYRA, "Salvage Deck. Everything the station throws away ends up here. Us included, apparently.", "calm"]] },
      { at: "kills", frac: 0.4, lines: [
        [ARIA, "Lyra. You knew about his governor. You knew my name before I said it. How?", "curious"],
        [LYRA, "I read everything he wrote. Twice. Then they deleted it, and I read it again from memory.", "calm"],
      ] },
      { at: "kills", frac: 0.75, event: "flicker", lines: [[ARIA, "That sound in the vents again. It's following the hum of the shard. It's following us.", "afraid"]] },
      { at: "exit", lines: [[LYRA, "There's a man on the hangar deck who can fix that suit. He'll say no first. Let him.", "calm"]] },
    ],
    maintenance_spine: [
      { at: "start", delay: 3, lines: [[ROOK, "My spine. I kept these fans turning for eight years. Try not to shoot the fans.", "calm"]] },
      { at: "kills", frac: 0.35, lines: [[LYRA, "Sixteen suits before yours. I've been looking for the people who wore them. There's no one to find.", "sad"]] },
      { at: "kills", frac: 0.7, event: "tremor", lines: [[ROOK, "Feel that? Not the station settling. Something heavy is walking the duct above us. Keeping pace.", "worried"]] },
      { at: "exit", lines: [[ARIA, "Sixteen candidates, sixteen drifted. Seventeen is still here, and she'd like that noted.", "warm"]] },
    ],
    transit_loop: [
      { at: "start", delay: 3, lines: [[LYRA, "Somebody's kept these trains on time all week. Nobody's driving them.", "curious"]] },
      { at: "kills", frac: 0.5, lines: [[ROOK, "Track sensors are logging footsteps. Running. Faster than anything I'd call a person.", "curious"]] },
      { at: "exit", lines: [[LYRA, "She ran when the station fell. She'll tell you so herself. She hasn't stopped running since.", "sad"]] },
    ],
    greenhouse: [
      { at: "start", delay: 3, lines: [[NOVA, "Greenhouse. Last time I was in here I stole a tomato. Feels like a hundred years ago.", "happy"]] },
      { at: "kills", frac: 0.4, lines: [[ARIA, "There's a Chronos PD channel still live. Same shift report, every hour, for three days. To no one.", "curious"]] },
      { at: "kills", frac: 0.75, event: "tremor", lines: [[LYRA, "It's moving. Upstairs, toward the Precinct. Toward the only other heartbeat on my map.", "afraid"]] },
      { at: "exit", lines: [[ROOK, "Precinct's right above us. Whoever's holding it, he's going to need more than one door.", "worried"]] },
    ],
    precinct: [
      { at: "start", delay: 4, lines: [[ARIA, "Your locker room. Your range. I taught you to shoot in there. This morning.", "sad"]] },
      { at: "kills", frac: 0.25, lines: [[ARIA, "Unit four's patches again. Rasczak's people. Simon's people. They've come home.", "afraid"]] },
      { at: "kills", frac: 0.5, guest: ["kael"], lines: [[KAEL, "Don't look at their faces, Cadet. I did, the first day. You won't make the door if you look.", "sad"]] },
      { at: "kills", frac: 0.8, event: "flicker", guest: ["kael"], lines: [
        [KAEL, "I was on the chamber door. Simon came running down past me for his people. Told me to hold it.", "sad"],
        [KAEL, "Something on the other side asked me to wait. So I waited. One second. That's all it took.", "sad"],
      ] },
      { at: "exit", lines: [[LYRA, "His door. Whatever comes through, we hold it. All of us, this time.", "calm"]] },
    ],
  },

  3: {
    rewritten_wing: [
      { at: "start", delay: 3, lines: [[ARIA, "He's moved the walls since we left. Every corridor he rewrites costs him. I can hear him getting tired.", "curious"]] },
      { at: "kills", frac: 0.5, event: "flicker", lines: [[LORD, "You walk my halls like you own them, Cadet. You don't even own your own eleven seconds.", "menacing"]] },
      { at: "kills", frac: 0.8, lines: [[KAEL, "Fewer uniforms in his lines every wing. He's spending them. Simon's people, a few at a time.", "angry"]] },
    ],
    server_siege: [
      { at: "start", delay: 3, lines: [[ARIA, "Some of these drives are that morning. The locker room. Simon's in them, giving the same order a thousand times.", "sad"]] },
      { at: "kills", frac: 0.4, lines: [[NOVA, "A thousand takes and he never once let the man just go home. Burn them all.", "angry"]] },
      { at: "kills", frac: 0.75, event: "flicker", lines: [[LORD, "Burn them. I remember all of it anyway. I remember you dying, Cadet. Four thousand, one hundred and six times.", "menacing"]] },
    ],
    reactor_overload: [
      { at: "start", delay: 2, event: "tremor", lines: [[PA, "Warning. Core temperature critical. Warning. Core temperature critical.", "calm"]] },
      { at: "kills", frac: 0.5, lines: [[NOVA, "If this place loops, I'm running in it forever. Not doing that. Turn your valves faster.", "worried"]] },
      { at: "kills", frac: 0.8, event: "flicker", lines: [[LORD, "Your policeman is holding a door again. Ask him how that went last time.", "menacing"]] },
    ],
    lords_lab: [
      { at: "start", delay: 3, lines: [[ARIA, "His lab. The real one. Every screen, the same eleven seconds. He's watched them more than he's lived.", "worried"]] },
      { at: "kills", frac: 0.5, lines: [[ROOK, "Every take's labelled. Failure. Failure. Failure. One label's been scratched out by hand.", "curious"]] },
      { at: "kills", frac: 0.8, event: "flicker", lines: [[LORD, "She's seen it, hasn't she? The one take where it works. Ask her who walks in.", "menacing"]] },
    ],
    archive: [
      { at: "start", delay: 3, lines: [[ARIA, "Every version of that morning he ever tried. Somewhere in here is the first one.", "curious"]] },
      { at: "kills", frac: 0.45, lines: [[ARIA, "Found it. Take one. 06:47. He opens the chamber door... and someone is already inside, waiting for him.", "afraid"]] },
      { at: "kills", frac: 0.8, event: "flicker", lines: [[WHISPER, "Eleven, two, three, five. You're early. You're always early.", "menacing"]] },
    ],
    engine: [
      { at: "start", delay: 3, lines: [[ROOK, "The Chronos Engine. Eight years I opened these doors every morning. It's never been this quiet.", "worried"]] },
      { at: "kills", frac: 0.4, lines: [
        [ARIA, "The chamber recorder. It kept the whole of Simon's last call. The part we never heard.", "worried"],
        [SIMON, "Simon, Engine chamber. Rasczak's down. They're all just standing still. There's a man at the controls.", "afraid"],
      ] },
      { at: "kills", frac: 0.7, event: "flicker", lines: [
        [SIMON, "And a cadet. Our suit. Badge eleven, two, three, five. Kid... how did you get down here before me?", "afraid"],
        [ARIA, "You were in the range with me. I had you the whole time, {AGENT}. I had you.", "afraid"],
      ] },
      { at: "kills", frac: 0.9, lines: [[LYRA, "He saw you there because you're going to be there. I'm sorry. I should have told you sooner.", "sad"]] },
    ],
  },

  4: {
    entry_last: [
      { at: "start", delay: 4, lines: [[ARIA, "The airlock where it started. Running the other way now. It feels smaller.", "tender"]] },
      { at: "kills", frac: 0.4, lines: [[KAEL, "No uniforms left in his lines. Rasczak's people. Simon's. He's spent every one of them.", "sad"]] },
      { at: "kills", frac: 0.75, event: "tremor", lines: [[PA, "Good morning, Chronos Station. Good morning, Chronos Station. Good morn—", "calm"]] },
      { at: "exit", lines: [[LYRA, "Everyone stays on comms. Everyone. That's not a request.", "calm"]] },
    ],
    the_loop: [
      { at: "start", delay: 3, lines: [[ARIA, "He's looping wings shut behind us. One at a time. He wants us to watch the doors close.", "worried"]] },
      { at: "kills", frac: 0.5, event: "flicker", lines: [[LORD, "Which one first, Cadet? The policeman, I think. He's already standing at a door.", "menacing"]] },
      { at: "kills", frac: 0.8, lines: [[NOVA, "Hey. Whatever happens next, I'm not running from it. Just so you know.", "calm"]] },
    ],
    containment_last: [
      { at: "start", delay: 3, lines: [[KAEL, "Detention. Cell doors, blast doors. I know doors, Cadet.", "calm"]] },
      { at: "kills", frac: 0.5, lines: [[KAEL, "Simon told me to hold it, and I held the wrong side. This time I know which side I'm on.", "calm"]] },
      { at: "exit", lines: [[ARIA, "Kael's beacon is still green. I'll keep checking. You don't have to ask.", "sad"]] },
    ],
    nexus_decoy: [
      { at: "start", delay: 3, lines: [[NOVA, "Hey, ARIA. Time me.", "excited"], [ARIA, "Already am.", "warm"]] },
      { at: "kills", frac: 0.6, lines: [[ROOK, "She's pulling every one of them. Every single one. Go, while they're looking at her.", "urgent"]] },
      { at: "exit", lines: [[ARIA, "Nova's beacon is moving. Fast. Away from us. That's her. That's her winning.", "tender"]] },
    ],
    archive_burns: [
      { at: "start", delay: 3, lines: [[ROOK, "Eight years I kept his machines running. Let's see how fast they burn.", "calm"]] },
      { at: "kills", frac: 0.5, event: "flicker", lines: [[LORD, "That archive is all that's left of them. Burn it, and they're mine to rewrite.", "menacing"]] },
      { at: "kills", frac: 0.8, lines: [
        [LYRA, "Rook. Kai's math. Tell me it's right.", "worried"],
        [ROOK, "Checked it twice. Checking it a third time now. Let me.", "calm"],
      ] },
    ],
    engine_firing: [
      { at: "start", delay: 3, lines: [[LYRA, "Just us now. I always thought I'd be the one watching from a screen.", "calm"]] },
      { at: "kills", frac: 0.5, lines: [
        [ARIA, "Lyra. The badge in the chamber log, at 06:47. That was never a mistake, was it?", "afraid"],
        [LYRA, "No. The Core is a door, and it opens onto that morning. Whoever walks in walks into 06:47.", "sad"],
      ] },
      { at: "kills", frac: 0.85, lines: [[LYRA, "Simon wasn't confused. He saw you. You're going back to the second he died, to finish it.", "sad"]] },
    ],
    core_endgame: [
      { at: "start", delay: 30, lines: [
        [ARIA, "06:47 and zero seconds. The chamber door's opening. I can see him at the controls. And I can see you, {AGENT}. Walking in.", "afraid"],
        [ARIA, "Eleven seconds. Let's make them ours.", "tender"],
      ] },
    ],
  },
};
