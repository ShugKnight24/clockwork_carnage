# Audio Pass 1 — Babble Voices, a Real Mixer, and Forge Sounds

Date: 2026-09-22
Status: Built (uncommitted), awaiting a listen
Scope: the first audio pass. Recorded voice lines come later; this pass is
built so they can drop in without touching the call sites.

## Goal

Give the game's audio the same care the graphics got. Every character who
speaks should sound like someone, the voice picked in the character creator
should matter, and the mix should hold together when a fight gets loud.

Success looks like:

- Cutscene dialogue, ARIA and squad radio lines are voiced as the text types.
- Each of the four creator voices (Rookie, Veteran, Calm, Synthetic) sounds
  different, in the creator preview and in play.
- Enemies call out when they spot you and cry out when they die.
- Placing, mining and breaking a Forge block sounds like the material.
- Music keeps time when a frame runs long.
- Stacked gunfire, music and a voice line never clip.

## What shipped

### Voices (`src/audio/voice.js`)

Babble voices in the style of Animal Crossing and Undertale. The words are not
intelligible; the rhythm, pitch and timbre are the character.

- **Planning is pure.** `planUtterance(text, voice, {charsPerSec})` splits
  text into syllables (vowel groups, a silent trailing *e*), gives each a
  vowel class and an onset consonant class, and lays them out so every
  character costs `1/charsPerSec` seconds. That is the cutscene typewriter's
  own pace (18 chars/s), so the voice starts and stops with the text.
  Sentences drift down in pitch, questions rise at the end, exclamations and
  all-caps words are louder. It is seeded from the text, so a line always
  sounds the same.
- **Synthesis is one graph per line.** A glottal oscillator runs through
  three band-pass formant filters (F1–F3) whose frequencies are scheduled per
  syllable; a looping noise source through a band-pass supplies consonants.
  Optional per-voice vibrato, amplitude modulation (radio/robot grit), an
  octave-down sub (the Paradox Lord), and waveshaper drive. Everything is
  scheduled up front, and a handle can fade the line out early.
- **Voices.** ARIA, the Paradox Lord, Voss, Lyra, Rook, Nova, Kael, Miri, Kai,
  the Supervisor, UNKNOWN, system readouts, and enemy voices (henchman, drone,
  beast, phantom). Four player voices map to the creator's `VOICE_PROFILES`.
  All voices are calibrated to the same loudness (about 0.03 RMS offline).
- **Who is speaking.** `voiceKeyFor` picks, in order: a `voice` field on the
  line, a `voice` field on the frame, a printed `SPEAKER:` label, and — for
  quoted lines only — the frame's art (`lyra`, `villain*`, `portrait_voss`,
  `hero*` for the player). Narration stays silent. New story scenes should
  set `voice` explicitly on lines where the art does not say who talks.

### Where voices play

- **Cutscenes** (`js/cutscene.js` `_voiceLines`): each line is voiced when its
  delay passes. Clicking to reveal the whole frame silences the voice rather
  than racing it; advancing or ending the cutscene cuts the line.
- **ARIA and squad comms** (`src/systems/aria-comms.js` `_voice`): spoken
  when a message becomes active, paced to fit 80% of the time it stays up.
- **Player grunts:** hurt, death, slide and now dash use the creator voice
  (hurt is throttled to one per 0.3 s).
- **Creator preview:** the voice button speaks a short line, then grunts.
- **Enemy barks** (`AudioManager.enemyBark`): an alert line on idle-to-chase
  and a death cry, panned and attenuated by distance, on the SFX bus, with a
  global gap so a room does not shout in unison.

### Mixer (`js/audio.js`)

- A limiter (DynamicsCompressor, −6 dB threshold, 12:1) on the master.
- A voice bus beside music, SFX and ambient. Music ducks while someone speaks.
- New settings: **Master Volume** (100) and **Voice Volume** (80). The master
  slider used to be dead: `setTimeScale` rewrote the master gain every frame.
  It now schedules only when slow-mo starts or stops, and respects the slider.
- Noise buffers are made once per length and reused. Every shot, hi-hat,
  snare and ambient pulse used to fill a fresh buffer with `Math.random()`.
- **Music is look-ahead scheduled:** a 25 ms timer books every beat due in the
  next 120 ms at its exact audio-clock time. Measured beat spacing is now exact
  (e.g. 0.4615 s at 130 BPM).

### Forge (`src/audio/block-sounds.js`)

Seven materials — stone, soft, sand, wood, metal, glass, energy — each with a
place, chip and break sound. Mining plays a chip every 0.24 s while the pick
works. The Forge used to reuse the menu click for all of it.

## Recorded voices later

When lines are recorded, give each voiced line a stable `id` in the script
data and add a lookup in `AudioManager.speak`: if a clip exists for the id,
play it; otherwise babble. Call sites do not change.

## Not in this pass

- Adaptive music (combat intensity layers, per-act themes, stingers).
- Distinct weapon sound redesign and per-enemy footsteps.
- A reverb send per environment.
- Subtitles/captions toggle for voiced lines (the text is already on screen,
  so this is low priority).

## Testing

- `tests/unit/voice.test.js` (17 tests): syllables, duration matches typing,
  determinism, time order, question rise, scale snapping, speaker mapping,
  distinct player voices, barks.
- Offline render of every voice in headless Chromium: no NaN, no clipping,
  equal loudness. The render script also writes WAVs for listening.
- In-game spies confirmed: cutscene lines voiced (narration silent), ARIA and
  squad comms voiced, enemy alert and death barks, per-material Forge sounds,
  clock-scheduled music with no untimed notes.
