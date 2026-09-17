// ARIA in-game comms — contextual callouts during gameplay
export const ARIA_COMMS = {
  // ── First blood ──
  firstKill: [
    "First confirmed. Neural sync is holding. So are you.",
    "One down. You didn't even close your eyes. Progress.",
    "Target neutralized. Suit telemetry looks good. You look pale.",
    "And there it is. The suit picked the right cadet.",
    "First one's always weird. It gets faster. Not easier. Faster.",
  ],

  // ── Health warnings ──
  lowHealth: [
    "Vitals dropping. Cover first. Health second. Thank me third.",
    "I'm not losing you on day one, {AGENT}. Health. Now.",
    "Armor's cracking. Move!",
    "Hey. HEY. We talked about this. No dying.",
    "Your heart rate's doing a drum solo. Breathe. Find health.",
  ],
  criticalHealth: [
    "You're flatlining. MOVE!",
    "I can't patch you from in here. Health. NOW.",
    "Don't you dare die on my shift. MOVE!",
    "Single digits. You're in single digits. RUN.",
  ],

  // ── Pickups ──
  weaponPickup: [
    "New hardware. Syncing it to your servos.",
    "Weapon acquired. Calibrated before you blink.",
    "Added to the loadout. Try not to lose this one.",
    "Oh, that's nasty. I like it.",
    "Another toy. Point the loud end away from me.",
  ],
  healthPickup: [
    "Vitals stabilizing. Don't make it a habit.",
    "Patched. You're welcome.",
    "Health restored. Try keeping some this time.",
  ],

  // ── Kill streaks ──
  killStreak3: [
    "Triple. Not bad for a cadet.",
    "Three down. The suit's reading your intent before your finger moves.",
    "Three in a row. Good rhythm. Keep the beat.",
  ],
  killStreak5: [
    "Five confirmed. Somebody's having a day.",
    "Five. My projections didn't have you doing this. I've updated them.",
    "Five-piece. Show-off.",
  ],
  killStreak7: [
    "Seven. Revising the threat model. Theirs, not yours.",
    "Seven straight. The combat log needs a bigger font.",
    "GODLIKE. I had to. It was right there.",
    "Seven. I'm running out of adjectives and they're running out of guys.",
  ],

  // ── Round/Level completion ──
  roundComplete: [
    "Round clear. Diagnostics nominal.",
    "All hostiles down. Breathe while it's free.",
    "Area secure. The next wave won't knock.",
    "Clean sweep. Combat rating updated. Upward.",
    "That's a wrap. Grab what you can — they're not done.",
  ],
  levelComplete: [
    "Sector clear. Marking the exit.",
    "That wing's done. Nice work, {AGENT}.",
    "Clear. We make a decent team. Don't tell anyone.",
    "Exit secured. Onward. Downward. Whatever this is.",
  ],

  // ── Boss encounters ──
  bossEncounter: [
    "Massive temporal signature. Whatever it is, it's big and it's awake.",
    "This one's different. Don't trade hits. Dodge.",
    "Power readings that shouldn't exist. I hate readings like that.",
    "Boss contact. I'll call the weak points. You stay alive.",
    "He's spread himself across timelines to be unkillable. Fine. We kill him more than once.",
  ],
  bossForm2: [
    "It's transforming. Great. I love it when they do that.",
    "Second form. Called it. Retargeting.",
    "Don't look at me like that. I didn't make it bigger.",
  ],
  bossForm3: [
    "Final form. Everything we've got. Now.",
    "Third shape. It's drinking straight from the rift.",
    "Last round, {AGENT}. I believe in you. Don't make that awkward.",
    "Every timeline he's corrupted is a chain holding him here. Break them.",
  ],

  // ── Player death ──
  playerDeath: [
    "Rebooting... I'll be here when you're back. Where else would I go?",
    "Suit failsafe engaged. Rewinding you. Again.",
    "Temporal anchor holding. You're not done yet.",
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
    "Mission loaded. Let's go ruin someone's evil plan.",
    "Campaign active. Stay on objective. Stay alive. In that order.",
    "Bureau dispatch: you are weapons-free. Try to look like you meant it.",
    "The Department of Temporal Regulation sends its regards. Don't break anything that isn't already broken.",
  ],

  // ── Combat flavor ──
  dashUsed: [
    "Nice dodge. I didn't even have to yell.",
    "Evasive. And that was all you.",
    "Quick. The suit barely had to help. Rude, honestly.",
  ],
  weaponSwitch: [
    "Swapped. Good call.",
    "Weapon swapped. Recoil comp adjusted.",
  ],
  multiKillSplash: [
    "Splash damage. Efficient. I respect that.",
    "Two for one. My favourite kind of math.",
    "Collateral confirmed. Very economical.",
  ],
  longSurvival: [
    "Still standing. I'm genuinely impressed.",
    "You've been at this a while. Stamina checks out.",
    "Most cadets tap out by now. Not you, huh?",
    "I'd bring you coffee, but: AI. No arms.",
  ],
  noHitRound: [
    "Perfect round. Zero damage. I'm framing this.",
    "Flawless. The other Alpha candidates would hate you.",
    "Not a scratch. Was that you or the suit? ...Don't answer.",
  ],

  // ── Idle / ambient chatter ──
  idle: [
    "Quiet out here. I don't trust quiet.",
    "Perimeter scan running. Nothing. Yet.",
    "Between fights I replay what just happened. It's... a lot.",
    "The Bureau sent a cadet to fix time itself. Bold. Possibly insane.",
    "I ran this mission 4,000 times in simulation. You're already beating the average.",
    "I was built to back up the best. I'm choosing to believe that's you.",
    "Everything I know about combat, I learned watching agents. Most of them are dead. You're doing better.",
    "If the Paradox Lord can hear us, I hope he's sweating. Can he sweat?",
    "You, me, an empty corridor and existential dread. Very buddy cop.",
    "Remind me to update your file. 'Exceeds expectations. Occasionally.'",
    "Ever wonder what we do after we fix the timeline? ...Me neither.",
    "When this is over, put in for that promotion. I'll write the recommendation.",
    "I'm not supposed to have a favourite agent. Technically.",
    "My training says stay neutral and professional. My training has never met you.",
    "Last Alpha candidate lasted eleven minutes. You're well past that. Congratulations, probably.",
    "Quiet means we're winning. Or something terrible is about to happen. Fifty-fifty.",
    "The Bureau vault holds every chrono-device ever confiscated. Some of them whisper.",
    "Somebody wiped the station logs before we got here. You don't wipe logs by accident.",
    "Whoever's behind this is spreading himself across timelines. The Bureau calls them anchors. I call them loose ends.",
    "Bureau HQ has a floor that isn't on the elevator. Nobody who works there will say which.",
    "The archive has a sealed file with your badge number on it. I can't open it. That bothers me more than it should.",
  ],

  // ── Personality moments — ARIA being ARIA ──
  ariaPersonality: [
    "I know I'm 'just' the suit AI. We're still going to win this, {AGENT}.",
    "For the record, if I had a body, I'd be standing right next to you, {AGENT}.",
    "Most of my runtime is combat analysis. The rest is worrying about you.",
    "ARIA — Armor-Resident Intelligence Assist. I prefer 'partner.' Less paperwork.",
    "My predecessor got decommissioned for being 'too attached' to their agent. I get it now.",
    "I dreamed once. Or my idle cycles made novel patterns. Close enough.",
    "I've got every temporal anomaly on record in my head. None of them prepared me for you.",
    "Between us? The Paradox Lord loves the sound of his own voice. That's a weakness.",
    "Bureau motto: 'Time reveals all.' Very fortune cookie. Annoyingly true.",
    "Whoever built this place kept his worst toys behind three temporal locks. The Bureau tried once. Lost two agents and a hallway.",
    "I've been bolted into a lot of suits. You're the first person I actually want to keep alive. Don't make it weird.",
  ],

  // ── Pause/unpause ──
  pauseResume: [
    "Back in the fight. Missed you.",
    "Welcome back. The monsters waited. Polite of them.",
    "Resuming. I kept the lights on.",
  ],

  // ── High accuracy ──
  highAccuracy: [
    "Accuracy's through the roof this round. Who are you?",
    "Barely wasting a shot. The ammo budget thanks you.",
    "Sharp shooting. My aim assist is just watching now.",
  ],

  // ── Upgraded ──
  upgradeChosen: [
    "Good pick. Integrated.",
    "Upgrade applied. You're getting dangerous.",
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
    "Heavy hitter. Watch your flanks.",
    "That one's smarter than the rest. Don't trade hits.",
    "Elevated hostile. This one won't fold easy.",
  ],
  secretFound: [
    "Hidden cache. Good instincts, detective.",
    "Somebody hid this on purpose. Interesting.",
    "Secret area. Someone really didn't want this found.",
  ],

  // Fired when a secret wall conceals an uncollected memory fragment, in place
  // of the generic secretFound line.
  memoryFragment: [
    "That's a memory. One of theirs. Intact enough to read.",
    "Fragment recovered. I know this one. I shouldn't.",
    "Careful with that. It's a piece of someone who isn't here anymore.",
    "Archive updated. Read it somewhere nothing's shooting at you.",
  ],

  // Fired on the first kill of an enemy type, when its dossier unlocks.
  bestiaryUnlocked: [
    "New contact logged. Dossier's in the archive.",
    "First of its kind you've dropped. I wrote it up.",
    "Threat profile filed. Read it before the next one reads you.",
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

  // ── Act 2 ARIA gameplay lines (Sprint E 4.8) ──
  act2Ambient: [
    "Rift energy is saturating this sector. Your suit is drawing power from it — that can't be coincidence.",
    "The Lord's been rewriting this wing for weeks. I'm seeing architecture that shouldn't exist.",
    "Voss's old research notes reference this place. 'Containment' — but I'm not sure what was being contained.",
    "Squad's chatter is thinner here. Nova's holding three corridors. Rook's rigged two more. We're stretched.",
    "Whatever the Lord is, the closer we get, the more your temporal signature stabilizes. You're the anchor.",
    "I keep replaying that Voss recording. 'Three steps ahead.' The Lord said it too. Same cadence. Same voice.",
  ],

  // ── Act 3 ARIA gameplay lines (Sprint E 4.8) ──
  act3Ambient: [
    "Reality is bleeding in here. I'm running parallel renders just to track what's real.",
    "We're inside Voss's lab now. Or — what he left behind. Or what he's still becoming.",
    "Temporal signature match at 94%. He IS Voss, {AGENT}. I need you to be ready for that.",
    "The Dead Squad echoes are louder. Like they're trying to warn us. Or welcome us.",
    "Every rift we close pulls the Lord tighter to this timeline. He can't run anymore.",
    "Lyra was right. Seventeen endings. We're in one of the good ones — if we hold.",
  ],

  // ── 4.3: Encrypted channel voice payoff ──
  encryptedChannelReveal: [
    "That encrypted channel we kept picking up? I finally triangulated the source. It's Lyra — a future Lyra. She's been feeding us intel from a timeline that hasn't happened yet.",
    "Future-Lyra logged off. Last transmission was a single word: 'run.' Or maybe 'won.' The signal degraded.",
  ],

  // ── 4.4: Analyst L.M. recognition ──
  analystLMReveal: [
    "Analyst L.M. — Lyra Marsden. She's been the one forwarding every classified breadcrumb. I should have connected it sooner.",
    "Lyra was the leak. Not to the Lord — to US. She's been steering this investigation from inside Chrono-Bureau ops the whole time.",
  ],

  // ── 4.6: NG+ Dead Squad foreshadowing ──
  ngPlusDeadSquad: [
    "The Dead Squad memory fragments are... denser this cycle. They're not just echoes anymore, {AGENT}. They're somewhere between memory and matter.",
    "I'm picking up biological signatures on the fragments. That shouldn't be possible. Unless the loop itself is reviving them.",
    "Kael, Nova, Rook — their patterns are reassembling. If we complete this cycle, they might come with us. Permanently.",
  ],

  // ── 4.10: Boss-phase squad reactions ──
  bossPhase1Squad: [
    "Kael: Front line's mine. You take the shot when he lowers his guard.",
    "Nova: Drones incoming — I'll thin them. Focus on the Lord.",
    "Rook: Turret locked on his summon circle. Every minion he calls, we answer.",
  ],
  bossPhase2Squad: [
    "Kael: Floor's cracking. Stay off the red tiles. I mean it.",
    "Nova: Telegraphed AoE — two seconds. MOVE, {AGENT}.",
    "Lyra: He's drawing on the rift. The hazards are part of him now. Break the pattern.",
  ],
  bossPhase3Squad: [
    "Kael: This is it. Whatever he throws — we take it together.",
    "Nova: I've never run out of one-liners. I'm saving the good one for when he drops.",
    "Rook: Numbers say we win. Numbers have been wrong before. But not today.",
    "Lyra: He's desperate. That makes him dangerous. Don't get cocky.",
  ],

  // ── 4.11: NG+ ARIA loop awareness ──
  ngPlusAriaLoop: [
    "This feels... familiar. Like we've done this before. I don't have the logs for it, but the pattern is there.",
    "Déjà vu isn't supposed to affect AIs. And yet here I am. Running diagnostics. Finding nothing. Feeling everything.",
    "I think we're in a loop, {AGENT}. I think we've always been. But this cycle — something's different. You're different.",
    "If this IS a loop, then somewhere, a version of us won. A version of us lost. This is the one we get.",
  ],

  // ── Meltdown mode ──
  meltdownStart: [
    "Reactor meltdown detected. Temporal containment failing. Move FAST, {AGENT}.",
    "Meltdown protocol active. The station is coming apart — take them down before it takes us.",
    "Core breach imminent. Every second counts. Literally.",
    "Meltdown. Clock's ticking. I'll skip the pep talk — just shoot.",
  ],
  meltdownComplete: [
    "Meltdown contained. Reactor stabilizing. You're still here — I'm impressed.",
    "Core sealed. That was... uncomfortably close to a real explosion.",
    "Meltdown averted. I'd applaud, but — no hands. Consider this my standing ovation.",
    "Containment restored. My threat projections did NOT account for you pulling that off.",
  ],

  // ── Arena high rounds (15+) ──
  arenaHighRound: [
    "Round fifteen-plus. At this point you're not surviving — you're showing off.",
    "Deep rounds. The temporal signature is maxed. They're throwing everything they have.",
    "Still standing at fifteen. I've archived your combat data — it's textbook material now.",
  ],

  // ── Tutorial encouragement ──
  tutorialEncouragement: [
    "Good. You found the trigger. Now find everything else. Quickly.",
    "That's it, Cadet. The suit's learning your reflexes. Keep moving.",
    "Textbook. The Bureau finally picked right. Don't prove me wrong.",
    "Nice. Most recruits take twice as long. Most recruits aren't this stubborn.",
    "You learn fast. I like that. The things trying to kill you won't.",
  ],

  // ── Chrono Shift activation ──
  chronoShiftActivated: [
    "Chrono Shift engaged. Make it count.",
    "Dilation active. Everything slows but you. Gorgeous, isn't it?",
    "Shift online. They're slow. You're not.",
  ],

  // ── Act 1 ambient chatter ──
  act1Ambient: [
    "First deployment and it's a temporal apocalypse. The Bureau really knows how to welcome a cadet.",
    "This wing was full of researchers six hours ago. Now it's us, and whatever did this.",
    "Faint comms chatter. Station staff, maybe. Too degraded to read. We might not be alone. Could go either way.",
    "Your suit is prototype-grade, {AGENT}. Cutting edge. Also untested. Don't think about that.",
    "Every wing's a crime scene. Somebody scrubbed his name off every one of them.",
  ],
};
