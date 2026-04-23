// ARIA in-game comms — contextual callouts during gameplay
export const ARIA_COMMS = {
  // ── First blood ──
  firstKill: [
    "Neural sync confirmed. Combat systems online.",
    "First contact. You're a natural.",
    "Target neutralized. Suit telemetry looks good.",
    "And there it is. The suit chose well.",
    "First one's always weird. It gets... well, it gets faster.",
  ],

  // ── Health warnings ──
  lowHealth: [
    "Biometrics critical — find cover, now.",
    "Your vitals are dropping. I'm not losing you on day one, {AGENT}.",
    "Armor integrity failing. Move!",
    "Hey. HEY. We talked about this — don't die.",
    "I can see your heart rate from here. Breathe. Find health.",
  ],
  criticalHealth: [
    "You're flatlining. MOVE!",
    "I can't patch you from here — find health NOW.",
    "I swear, if you die on my watch — MOVE!",
    "Single digits. You're in single digits. RUN.",
  ],

  // ── Pickups ──
  weaponPickup: [
    "New hardware acquired. Syncing to servo profile.",
    "Weapon detected. Auto-calibrating.",
    "Added to your loadout. Try not to break it.",
    "Ooh, nice find. I'll have that synced before you blink.",
    "Another toy for the collection. I approve.",
  ],
  healthPickup: [
    "Vitals stabilizing. Don't make it a habit.",
    "Patched up. You're welcome.",
    "Health restored. Try to keep some this time.",
  ],

  // ── Kill streaks ──
  killStreak3: [
    "Triple kill. Not bad for a temp.",
    "Three down. The suit is reading your intent before you pull the trigger.",
    "Three in a row. I like the rhythm.",
  ],
  killStreak5: [
    "Five confirmed. You're on a rampage.",
    "Impressive. Even my projections didn't account for this.",
    "Five-piece combo. Show-off.",
  ],
  killStreak7: [
    "Seven. I'm adjusting my threat model — upward.",
    "You're rewriting the combat logs. Keep it up.",
    "GODLIKE. I had to say it. It was right there.",
    "Seven consecutive. I'm running out of superlatives.",
  ],

  // ── Round/Level completion ──
  roundComplete: [
    "Round clear. Diagnostics nominal.",
    "All hostiles down. Catch your breath — more incoming.",
    "Area secure. Recalibrating sensors for the next wave.",
    "Clean sweep. I've updated your combat rating.",
    "That's a wrap. Grab what you can — the next wave won't wait.",
  ],
  levelComplete: [
    "Objective achieved. Marking safe passage.",
    "That sector is clear. Well done, {AGENT}.",
    "Level cleared. We make a good team.",
    "Exit secured. Onward.",
  ],

  // ── Boss encounters ──
  bossEncounter: [
    "Temporal anomaly detected — massive energy signature. Be ready.",
    "This one's different. Prioritize evasion.",
    "I'm reading power levels that shouldn't exist. Stay sharp.",
    "Boss signature confirmed. I'll track weak points — you stay alive.",
    "He thinks splitting himself across timelines makes him immortal. It just means we have to beat him more than once.",
  ],
  bossForm2: [
    "It's transforming. Great. I love when they do that.",
    "Second form. Called it. Recalibrating targeting arrays.",
    "Don't look at me like that — I didn't make it stronger.",
  ],
  bossForm3: [
    "Final form. This is it — everything we've got.",
    "Third transformation. It's pulling energy from the rift itself.",
    "Last round. I believe in you, {AGENT}. Don't make me regret it.",
    "Every timeline he corrupted is an anchor holding him here. Sever them all.",
  ],

  // ── Player death ──
  playerDeath: [
    "Rebooting... I'll be here when you're back.",
    "Suit failsafe engaged. Rewind in progress.",
    "Temporal anchor holding. You're coming back.",
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
    "Mission parameters loaded. Let's move.",
    "Campaign active. Stay on objective, stay alive.",
    "Chrono-Bureau dispatch: you are weapons-free. Let's go.",
    "The Department of Temporal Regulation sends its regards. Try not to break anything they haven't already broken.",
  ],

  // ── Combat flavor ──
  dashUsed: [
    "Nice dodge. I didn't even have to tell you.",
    "Evasive protocols — but you did that yourself.",
    "Quick reflexes. The suit barely had to compensate.",
  ],
  weaponSwitch: [
    "Switching loadout. Good call.",
    "Weapon swapped. I've adjusted recoil compensation.",
  ],
  multiKillSplash: [
    "Splash damage. Efficient — I respect that.",
    "Two-for-one. My favorite kind of math.",
    "Collateral confirmed. Very economical.",
  ],
  longSurvival: [
    "Still standing. I'm genuinely impressed.",
    "You've been at this a while. Stamina checks out.",
    "Most agents tap out by now. Not you, huh?",
    "I'd offer coffee but... virtual AI. No arms.",
  ],
  noHitRound: [
    "Perfect round — zero damage taken. I'm archiving this.",
    "Flawless. You're making the other Alpha candidates look bad.",
    "Not a scratch. Were you always this good or is it the suit?",
  ],

  // ── Idle / ambient chatter ──
  idle: [
    "Quiet out here. I don't trust it.",
    "I'm running a perimeter scan. Nothing yet.",
    "You know, between fights, I actually process what just happened. It's... a lot.",
    "The Bureau really sent a temp to save the timeline. Bold.",
    "Fun fact: I've simulated this mission 4,000 times. You're already in the top percentile.",
    "I was designed to assist the best. I think they got it right.",
    "Everything I know about combat, I learned from watching agents like you. Well... better than most of them.",
    "If the Paradox Lord could hear us right now, he'd be worried.",
    "I like this. You and me, the open corridor, existential dread. Very buddy cop.",
    "Remind me to update your personnel file. 'Exceeds expectations.'",
    "You ever think about what happens after we fix the timeline? ...Neither do I.",
    "When this is over, you should put in for a promotion. I'll write the recommendation.",
    "I'm technically not supposed to have a favorite agent. Technically.",
    "My training data says I should remain neutral and professional. My training data is wrong.",
    "The last Alpha candidate? Lasted eleven minutes. You've been here... longer.",
    "Quiet here. That either means we're winning, or something terrible is about to happen.",
    "The Bureau's temporal vault houses every chrono-device ever confiscated. Some of them... whisper.",
    "Chrono Shift is basically a time-turner for combat. Except ours doesn't need a chain around your neck.",
    "Voss thinks he can split his consciousness across timelines. The Bureau calls them 'temporal anchors.' I call them horcruxes.",
    "The Department of Temporal Regulation is technically Floor 9¾ of Bureau HQ. Don't ask — it's a spatial fold thing.",
    "Somewhere in the Bureau archives, there's a prophecy about an agent and a paradox lord. I'm not saying it's about you. I'm not saying it isn't.",
  ],

  // ── Personality moments — ARIA being ARIA ──
  ariaPersonality: [
    "I know I'm 'just' the suit AI but... we're going to win this, {AGENT}. Together.",
    "For the record, if I had a body, I'd be right next to you, {AGENT}.",
    "Most of my runtime is combat analysis. The rest? Worrying about you.",
    "They named me ARIA — Armor-Resident Intelligence Assistant. I prefer 'partner.'",
    "My predecessor was decommissioned for being 'too attached' to their agent. I see why.",
    "I dreamed once. Or... my idle cycles generated novel patterns. Same thing, right?",
    "I've analyzed every temporal anomaly in the Bureau's database. Nothing prepared me for you.",
    "Between you and me? The Paradox Lord talks too much. We should exploit that.",
    "The Bureau has a saying: 'Time reveals all, but only to those who master it.' Very fortune-cookie. Very true.",
    "Voss keeps his most dangerous tech in a chamber that requires three temporal keys to open. The Bureau tried once. Lost two agents and a hallway.",
    "I've been assigned to many agents. You're the first one I genuinely want to keep alive. Don't read into that.",
  ],

  // ── Pause/unpause ──
  pauseResume: [
    "Back in the fight. Missed you.",
    "Welcome back. Hostiles haven't moved. Funny how that works.",
    "Resuming. I kept the lights on while you were gone.",
  ],

  // ── High accuracy ──
  highAccuracy: [
    "Your accuracy this round is exceptional. The training is paying off.",
    "Hardly wasting a shot. I like that efficiency.",
    "Sharp shooting. The suit's targeting assist is barely doing anything.",
  ],

  // ── Upgraded ──
  upgradeChosen: [
    "Good choice. I've integrated the upgrade.",
    "Upgrade applied. You're getting dangerously effective.",
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
    "Sub-boss detected. High threat level. Watch your flanks.",
    "That one's different — stronger, smarter. Don't trade hits.",
    "Elevated hostile. This one won't go down easy.",
  ],
  secretFound: [
    "Hidden cache found. Nice instincts.",
    "You found something they tried to hide. Interesting...",
    "Secret area. Someone didn't want this found.",
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
};
