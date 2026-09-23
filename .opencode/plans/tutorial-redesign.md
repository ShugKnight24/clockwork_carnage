# Tutorial Redesign + Fix Plan

## Status: READY TO EXECUTE

## Problem Summary
The tutorial has 5 bugs, 2 of which are game-breaking:
1. **Door 2 is unreachable from Room B** — solid wall separates them
2. **Door 2 can only be opened from Room C** (the room it leads to) — chicken-and-egg
3. Step 2 requires weapon behind Door 1, but door instruction is step 5
4. Step 3/5 waypoints point to unreachable coords near Door 2
5. Step 1 waypoint is on Door 1's wall tile

## Solution: Complete tutorial overhaul

### 1. New TUTORIAL_MAP (`data.js`)

Linear 4-room layout, all doors centered on cols 10-11:

```
Room A "Locker Room"    rows 1-5,   cols 8-14   (spawn 11.5, 3.5)
  Door 1                row 6,      cols 10-11
Room B "Armory"         rows 7-10,  cols 7-15   (pistol 11.5, 8.5)
  Door 2                row 11,     cols 10-11
Room C "Training Hall"  rows 12-15, cols 4-18   (shotgun 6.5, 13.5)
  Door 3                row 16,     cols 10-11
Room D "Combat Yard"    rows 17-21, cols 2-20   (health 6.5,19.5 / ammo 15.5,19.5)
```

### 2. New Step Sequence (14 steps, 0-13)

| Step | Type | Title | ARIA Dialogue | Trigger |
|------|------|-------|---------------|---------|
| 0 | Auto 2s | HUD CALIBRATION | *(HUD boot animation, no text box)* | Timer 2s |
| 1 | Manual | SYSTEMS ONLINE | "Neural link active. Biometrics nominal. Take a look around — get used to the augmented feed." | Mouse look (cumulative angle > 2 rad) |
| 2 | Manual | MOVE | "That alarm isn't on the schedule. I'm running a diagnostic — walk it off, get a feel for the suit." | Move > 2.5 units |
| 3 | Auto 2.5s | ALERT | "We have an active intrusion, multiple sectors compromised. No time for pleasantries — open that door, we need to move." + alarm SFX + screen shake | Timer 2.5s |
| 4 | Manual | BREACH — OPEN THE DOOR | "Sealed bulkhead. Face it and press E — override the magnetic lock." / mobile: "Face it and tap USE" | tutorialDoorOpened |
| 5 | Manual | ARM YOURSELF | "Weapon crate ahead. Walk over it — this is no longer a drill." | tutorialWeaponPickedUp |
| 6 | Manual | CONFIRM TARGETING | "CLICK to fire. Confirm your targeting system is live." / mobile: "Tap FIRE." | tutorialFired (after 0.1s) |
| 7 | Manual | SPRINT AND DASH | "SHIFT to sprint. Double-tap a direction to phase-dash. You'll need both." / mobile: "RUN to sprint. Double-tap to dash." | sprint 0.4s + dash |
| 8 | Auto 2.5s | TEMPORAL ANOMALY | "The Chronos Engine is destabilizing. Brace yourself." + screen shake | Timer 2.5s |
| 9 | Manual | CHRONO SHIFT | "Time-dilation module is active. Press Q. The next few seconds matter." / mobile: "Hold SLOW." | tutorialChronoUsed (after 0.1s) |
| 10 | Manual | RESUPPLY | "Health and ammo on the ground. Grab everything — the station is in lockdown." | tutorialPickedUp |
| 11 | Manual | HOSTILE CONTACT | "Hostile drone. This is live. Put it down." | Kill 1 drone |
| 12 | Auto 2s | CALIBRATION COMPLETE | "Suit fully integrated. Proceeding to agent deployment array." | Timer → Character Creator |
| 13 | Sandbox | *(no overlay)* | *(training dummies, completion menu)* | — |

### 3. Step Counter
Show `X/11` for steps 1-11 (11 instructional steps).

### 4. Hardcoded Step Index Updates

| Old reference | New reference | Location |
|---|---|---|
| `tutorialStep === 11` (sandbox check) | `tutorialStep === 13` | game.js ~line 799, 2918 |
| `tutorialStep < 11` (pause guard) | `tutorialStep < 13` | game.js ~line 813 |
| `tutorialStep < 8` (pickup gating) | `tutorialStep < 10` | game.js ~line 6190 |
| `tutorialStep === 8` (pickup flag ×2) | `tutorialStep === 10` | game.js ~lines 6203, 6211 |
| `tutorialStep > 0 && < 10` (counter) | `tutorialStep > 0 && < 12` | game.js ~line 2902 |
| `X/9` counter text | `X/11` | game.js ~line 2903 |

### 5. New: HUD Boot Animation (step 0)

In `renderTutorialOverlay()`, when step === 0:
- Skip the normal text box
- Render scan lines sweeping vertically
- Flash hex readouts: "NEURAL LINK... OK", "BIOMETRICS... NOMINAL", "CHRONO MODULE... STANDBY"
- Teal/cyan color scheme matching ARIA
- 2-second duration, fade in

### 6. New: `alarmKlaxon()` in `audio.js`

Public one-shot method reusing the meltdown klaxon pattern:
- Two alternating square-wave tones (600Hz/800Hz)
- Short duration (~1.6s)
- Called at step 3 transition (the alarm moment)

### 7. Tutorial Angle Tracking (step 1)

The existing `tutorialCumulativeAngle` and `tutorialPrevAngle` fields (already initialized in `initTutorialLevel()`) will be used in step 1:
- Each frame: compute delta = abs(player.angle - tutorialPrevAngle), wrap to [-pi, pi], accumulate
- When cumulative > 2 radians (~115 degrees), advance
- Also advance on mobile if touch look input detected for > 1 second

### 8. Files to Change

1. **`data.js`** — Replace TUTORIAL_MAP grid, pickups, playerStart
2. **`audio.js`** — Add `alarmKlaxon()` method
3. **`game.js`** — Rewrite `updateTutorial()`, `renderTutorialOverlay()`, update step indices, add angle tracking in update, add alarm trigger at step 3
