# Grapples: a lockup that reads as a real collar-and-elbow tie-up

2026-10-29 · Claude (Opus) plan, Sonnet executes · Derek judges every visual result.
Handoff: [2026-10-29-claude-grapples-handoff.md](AI_HANDOFF_ENTRIES/2026-10-29-claude-grapples-handoff.md). Get-ups are closed (promoted 6bfb66c).

## Progress

(Sonnet: one line per task: id, commit, result, misses. ≤ 3 lines. Gate lines are written by Opus/Derek only.)

- T1.0: 72b380a [reference page](research/animation/grapples-2026-10/reference.html): Bret f130-139, f322-326, f345-350 and Haggar f3/f30/f98 beside lockup-now.png, a line per point.
  Misses: all sheets are one wrestler, so no frame shows a hand on a neck or elbow, heads, arrival, drive or a reversal (points 1-3, 6-10); Haggar (f0-179) has no lockup row; other Slam Masters not opened.
- T1.1: 27a1d4e `src/animation/lockup.js` + tests/lockup.test.js 13/13 (grab order, D4 sides both lSide x facing, collar point, step-only travel, stall, steal hitch, break, seeded tugs, 70/30 closure).
  Misses: pure math only, nothing drawn yet; lead leg = the near-side leg by my choice (not measured on a rig until T1.2); `holdGrips` has no `at` yet, so the collar entries (joint 'Neck') do nothing until T1.2.
- T1.2: c190e23 `grapplesCandidate`, `at` in `holdGrips`, Arena `_holdLockupGrips` (grips A,D,A,D,A,D + D8 layers); flag-off fixture tests/fixtures/grapplesFlagOff.json (60 frames, recorded before the change, same after). D9: holdGap 44, arms start lArm .3 / lElbow .7 (1.1/1.0 left Lou's far hand 41-47 px short).
  Held in `even`, 4 cases: hand-to-target 0.0 px on all 4 grips, 0 unreachable frames; attacker collar flex Lou .59 R / 1.09 L, George 1.39 / 1.39; head-centre gap 52-60 px. Misses: poses not compared in the browser check (the tween runs on the wall clock); at gap 52 a debug shot showed the two lead feet crossing (not measured at 44); George flex 1.39 is 0.01 under the 1.4 limit.
- T1.3: 8357303 flag branch `_tickGrapple` in Arena (engage 70/30 + jolt, tugs, step-pulse drive, rope stall, steal without re-grip, break, 1.4 s timeout, input buffered in the engage), AI beat 0.22+0.35..0.9 s, leg offsets so the planted foot holds. Tests lockup 14 + flag 3 green; flag-off x/state identical.
  Planted-foot slide max 0.85 / 1.10 px/frame (Lou/George, both facings, drive; 4.99 before a 0.15 s leg ramp); pair travels 46 px in a 0.85 s drive. Misses: Arena has no Node test (Phaser), the browser film checks it; steal and break slide not measured yet (T1.4); legGain 72/90 is Lou's, George's is 7% lower.
- T1.3b: df660be hold gap from the attacker's arm (D9, `holdGapFor`, 0.7*arm-19): T1.2's fixed 44 was measured on the old `george` pilot; on `george-roster-v1` it left the collar 12.7 px short. Now Lou 42.3 / George 26.6 px: every grip 0.0 px, collar flex Lou .87 / George .59, head-centre gap 53 / 38 px (both facings).
  Misses: Guido (arm 64.7) still 19.9 px short on the far elbow, flex .09 (not a Stage 1 rig); the fit is by eye on 4 rigs.
- T1.4: fe0b6be [G1 page](research/animation/grapples-2026-10/g1/index.html), grapples_film/page tools, 60 runs; suite 1053/1053, build, coverage 22, flag-off identical. Held-pose grips 0.0 px; planted slide 1.98-2.21 px/frame; engage step 56-74 (today 36); +0.3-0.8 ms/step.
  Misses: in the film the attacker hands miss (Lou collar 9-14 px, George 22-27 px, George 54 frames >3 px); case (d) at 60 px never reaches the stall (a 40 px `d2` run does: 7-26 stall frames, x constant); George's feet cross 27 px. Details in the G1 entry.
- T1.5: d9a5b01 `measureArmLength` restores every pose field, test on miss and hit. Engage step 73.6 -> 71.2, 61.7 -> 63.2, 68.6 -> 67.8, 57.0 -> 56.1.
  Misses: the leak was not the cause of the engage step. Helper deleted in T1.7 (one gap, nothing reads arm length).
- T1.6: 4053b8e ankle daylight, silhouette masks, reach apart from contact misses. Baseline: daylight -7 / -27, below the belt 720-1534, torso 0-663; today daylight 16-41, below 82-267 (frame 0 boots).
  Misses: boots reach 25-30 px past the ankle, so daylight 8 does not mean no overlap; added `belowBody` (a leg or pelvis in it).
- T1.7-T1.9: 50b4d13 `lean` is not drawn: A-frame is `bend` .38, lead feet back, gap 80, one for both pairs. Far hand on the forearm (`elbowCup` -.6): cause was the renderer's elbow limit. Engage .30. Buffered direction, real flag-off proof from 910e69f.
  Even, drive, steal, stall 0 under the belt, torso 0 everywhere. Misses: engage 81-368 (frame 0 boots), break 21-139, daylight 6.3 once, George collar 2 frames, Guido/Kowalski torso 50-166.
- T1.10: ea8c542 [G1b page](research/animation/grapples-2026-10/g1b/index.html), `grapples_assert` 13/13, suite 1054/1054, build, coverage 22, flag-off identical.

## Why (Derek 2026-10-29)

"We need to know who grabbed who, who is dominant." And: "I want us to go as far as we can to honor what it means to be
locked up in a wrestling match. This is really important to the mechanics, as every move will emerge from a lockup, well
most moves, so if it looks cheesy, everything will look cheesy."

Today ([frame](research/animation/grapples-2026-10/lockup-now.png)): both wrestlers tween to the same `lockup` pose
(`src/Wrestler.js` ~278: arms 1.57 rad straight out). Their hands meet in the air and nobody touches a body. `_tickLockup`
(`src/scenes/Arena.js` ~3668) holds them at a fixed 100·s gap with no drive. A steal swaps roles and re-tweens the same pose,
so nothing visible changes. The lockup times out at 0.8 s, and the AI decides after 0.15-0.45 s.

## What a real lockup is (the bar)

1. **Someone arrives first.** The grabber steps in and his hands land first. The other man meets him a beat late.
2. **Collision.** Chests meet at the shoulders with a small jolt. Both bodies compress and settle; nobody stands still.
3. **Collar and elbow.** One hand goes behind the opponent's neck, with the forearm across his collarbone. The other hand
   cups the opponent's elbow on that same collar arm. Both men hold the same tie-up mirrored, so each has one hand on a
   neck and one on an elbow.
4. **Heads together.** Each head goes to the side, over the opponent's shoulder: ear to ear, foreheads close.
5. **Base.** Staggered stance with the lead foot forward, knees bent and hips back, so the weight goes into the other man.
6. **Jockeying.** Short irregular tugs and shoves while neither has control: weight shifts and short steps, not a smooth wobble.
7. **Dominance.** The man in control gets lower, his head comes over the other man's shoulder, and he drives with short
   steps. The other man goes upright with his chin up and heels down, and gives ground backward. **The pair travels.**
8. **Feet step, never slide.** The drive moves in pulses, one step each, with planted feet between steps.
9. **The ropes stop it.** Pinned against the ropes, the drive stalls. (A rope break comes in a later stage.)
10. **A reversal is a fight.** The loser drops his level and shoves. There is a hitch, then the drive flips the other way.

## Decisions (Opus; Derek can overrule at G1)

- **D1. Flag** `?grapples=v1`, **opt-in** (like `gait=v2`). Flag off is byte-identical, which a fixture checks. The
  reader is `grapplesCandidate()` beside the others in `Wrestler.js`. Arena imports it or gets it as a method.
- **D2. Longer lockup, flag on only.** The timeout goes from 0.8 to **1.4 s**. Follow-up input during the engage (D4)
  is **buffered** and fires when the engage ends: you can't suplex someone you haven't grabbed. The AI's decision beat
  starts at engage end and runs 0.35-0.9 s, so some lockups show the drive. Derek judges the length at G1. If it plays
  slow, the fallback is shorter phases, not losing them.
- **D3. Roles.** The attacker is the man in control. He drives, and he has the follow-up rights. A steal swaps control.
- **D4. Grabber's arm is the near arm.** The attacker's collar hand is his near (camera-side) arm, on the defender's neck.
  The defender's near hand cups the attacker's near elbow. Away from camera, the attacker's far hand is on the defender's
  far elbow, and the defender's far hand is behind the attacker's neck, mostly hidden by the attacker's head. Seen from
  camera, the attacker's arm reaches to the neck and the defender hangs on to that arm. That is the "who grabbed whom" read.
  Handedness swaps between facings; sprite games cheat this the same way. "Near" always comes from
  `skeleton.lChannelSide(facing)`, never a fixed `l`/`r`.
- **D5. Grips stay through a steal.** A real reversal doesn't re-grip, so the original grabber keeps the near collar arm.
  After a steal, dominance shows through posture and drive direction only. Derek may ask for a re-grip at G1.
- **D6. Phases** (times at 1.4 s; all are constants in `src/animation/lockup.js`):
  - `engage` 0-0.22 s: the attacker closes about 70 % of the distance and the defender about 30 %. Attacker grips land
    (weight 1) at 0.10 s on the collar and 0.13 s on the elbow. Defender grips land at 0.17 s and 0.20 s. The collision
    jolt at about 0.12 s compresses the pair about 3·s px and they rebound.
  - `even` until 0.55 s: seeded tugs. The pair x shifts 2-5·s px, with alternating direction at irregular 0.15-0.30 s
    intervals. The poses go between the even key and a small lean either way.
  - `drive` after that: the attacker's pose and the defender's pose. The pair moves toward the defender's back in step
    pulses, one step about every 0.30 s, roughly 0.35 × walk speed while a step is moving. Each pulse moves one foot per
    wrestler; the other foot stays planted.
  - `stall`: during the drive, if the defender is within `_nearRopes` range of the ropes behind him, the travel stops.
    The poses hold and the push keeps going (a small strain oscillation).
  - `steal`: a 0.12 s hitch where both stop and the stealer drops 0.06 crouch. Then the roles swap and the new attacker's
    drive starts. The poses cross-fade over 0.20 s.
  - `break` (timeout): grip weights ramp to 0 over 0.10 s, then each man takes one step back over 0.25 s, then idle.
- **D7. Contacts use `holdGrips`** (`Wrestler.js` ~643), the same two-bone IK the clips use. It gets an optional `at`
  (world point) in place of a partner joint. The collar point is the partner's `neck` attachment, moved toward the
  partner's back (−partner.facing) and down: two `·s` constants that Sonnet tunes so the hand sits behind the neck.
  The elbow cup is the partner's `${side}Elbow`. Run it after both wrestlers draw, beside `moveRuntime.afterDraw`
  (`Arena.js` ~3470).
- **D8. Layering** uses `layerDepths` from `src/animation/clipLayers.js` with limb names, resolved per facing. Default
  order, back to front: defender far arm, attacker far arm, attacker body, defender body, attacker near arm, defender
  near arm. The film shows the alternative too (defender near arm behind attacker near arm), and Derek picks.
- **D9. Gap from the arm, not a constant.** Pick the hold gap so the attacker's collar elbow bends 0.5-1.4 rad while the
  heads come close. Report the head gap in px. Measure it on Lou vs George. Lou is the bar: if the rigs conflict, tune for
  Lou and report George.
- **D10. Exits are not fixed in Stage 1.** The follow-ups (headlock, suplex, whip, hip toss / arm drag, hammerlock,
  piledriver / slam) start from the new pose, and their first-frame jumps are measured and reported. Stage 3 fixes them.
- **D11. Stage 1 uses existing art** (Lou `thesz-procreate-v1`, George). At G1 Derek names the hands that fail, and that
  becomes the Codex art request in Stage 2.
- **D12. Upper body only (Derek 2026-10-30, overrides D9).** The men touch with hands, forearms and at most shoulders and
  heads. Nothing touches from the belt down, in any frame, in any case: no pelvis, thigh, shin or foot of one man overlaps
  any part of the other, and neither torso passes through the other. Derek's reasons: Lou phases through George, and close
  lower bodies read as too intimate. The shape is an A-frame: heads and hands meet, hips and feet stay apart, each man
  leaning in from his own side. D9's rule (gap from the attacker's arm) goes: spacing now comes from clearing the lower
  bodies, and the arms must reach across that gap. The defender keeps leaning in while he is driven; he does not stand up.

## Rules

- Lou `thesz-procreate-v1` is the bar. Ignore the old rigs `thesz` and `thesz-front3q-r1`.
- Never say a pose "reads" or "looks" right. Report the measurements and the misses; Derek judges.
- Focused tests per task. The full suite, build and coverage run only at the G1 stop. Node 22 (`nvm use`).
- Commit each task locally. Don't push. Keep `STORY_*.md` and `research/story/` out of every commit: another session is
  editing them.
- Use px/frame at 60 fps. The planted-foot limit is 2.5 px/frame (the get-ups' step limit).

## Stage 1: the tie-up, the drive and the steal, then STOP (G1)

### T1.0 Reference page (no code)

Find the lockup / tie-up frames in `Sprite sheets/reference/` (git-ignored, pose reference only, never shipped). Look at
Bret in `wwf-royal-rumble-snes` first: the suplex (357-374) and hip toss (345-356) start from a tie-up, so look just
before them. Then look at any `slam-masters-snes` character. Put the crops on
`research/animation/grapples-2026-10/reference.html` the way the G2a page did its Bret refs
(`tools/debug/getups_g2a_page.mjs`), with frame numbers, next to today's [frame](research/animation/grapples-2026-10/lockup-now.png).
Under each crop, write one line on what it shows for points 1-10 above: hands, heads, stance, which arm is near. Done when
the page opens and lists frame numbers. Don't pose from these yet.

### T1.1 `src/animation/lockup.js` (pure data and math) + `tests/lockup.test.js`

- `LOCKUP` constants: every D6 time, the tug range, the step period, the drive fraction, the steal hitch, the break, the
  hold gap factor, and the two collar-offset factors.
- Pose keys, as data in this module (not in `POSES`, so flag-off is untouched): `even`, `attacker`, `defender`,
  `stealDip`. Legs, knees, lean and crouch only; the arms come from the IK. Starting values to tune by eye on Lou:
  - `attacker`: lean .45, crouch .32, lead leg .35 / knee .45, rear leg −.30 / knee .10.
  - `defender`: lean .02, crouch .14, lead leg .10 / knee .20, rear leg −.15 / knee .30 (weight on the heels).
  - `even`: lean .32, crouch .24 for both.
  Which channel is the lead leg in each facing comes from `lChannelSide`. Record what you find.
- `lockupPhase(state)`: from `{ t, sinceSteal, nearRopes, ... }`, returns `{ phase, pose weights, grip weights per role
  and arm, pair dx this frame, step foot }`. Deterministic from a seed (the tugs use a seeded RNG, seed set at lockup start).
- `lockupGrips(attacker, defender, w)`: the D4 list in `holdGrips` form, near/far resolved per facing, collar entries
  with `at`.
- Tests: the grab order (the attacker's collar and elbow land before the defender's); the D4 sides in both facings; that
  the travel only happens during steps, so feet are planted between pulses; zero travel in the stall; the steal hitch
  then reversed travel; the same seed gives the same tugs.

### T1.2 Contacts on the real rigs

- `grapplesCandidate()` (D1). Add an optional `at` to `holdGrips` list items. Without `at`, the behaviour is unchanged, and
  the existing clip-grip tests prove it.
- In Arena, after `w1.draw(); w2.draw(); moveRuntime.afterDraw()`: if the flag is on and `lockupState` is set, call
  `holdGrips` per role with `lockupGrips`, then the D8 layer order.
- Flag-off fixture: record a forced lockup (pose and x for 60 frames) at the current HEAD, before any change, and assert
  it is identical after.
- Measure on Lou vs George, both facings, held in the `even` pose: hand-to-target px per grip (target ≤ 3 px when
  reachable; report unreachable frames), collar elbow flex, and head gap px. Pick the D9 gap here.

### T1.3 The lockup runs it (Arena + AI, flag on)

- `_tickLockup` flag branch: the engage closure, the phases from `lockupPhase`, the step-pulse travel with `_clamp`, the
  rope stall, the steal (D6) instead of the bare role swap, the break instead of the snap to idle, the 1.4 s timeout, and
  the follow-up input buffered during the engage. Flag off: today's code, untouched.
- The legs step during the pulses: tween the stepping foot's leg channels from back to front over the pulse, so the
  other foot doesn't move. Measure planted-foot slide, which must stay ≤ 2.5 px/frame.
- `AIHandler._handleLockup`: with the flag on, the beat starts at engage end and runs 0.35-0.9 s. The steal odds are unchanged.
- Focused tests: lockup.test.js and the Arena / AI tests you touch. The flag-off fixture stays green.

### T1.4 G1 film + page, then STOP

- `tools/debug/grapples_film.mjs` (start from `research/animation/grapples-2026-10/lockup_shot.mjs`: it sleeps the loop,
  nulls the AIs, forces the lockup). Scripted cases, each in both facings, with Lou as attacker vs George and George as
  attacker vs Lou:
  (a) **even**: no input to the timeout and break; (b) **driving**: from mid-ring; (c) **steal**: at 0.7 s, mid-drive;
  (d) **ropes**: starting 60·s px from the ropes behind the defender; (e) **each exit** the kit has, pressed at 0.8 s.
- Page: `research/animation/grapples-2026-10/g1/index.html`. Top: one **normal-speed loop strip** per case and facing,
  today | new side by side (CLAUDE.md: strip first). Below that, the D8 layering alternative for case (b). Then the
  table, per case and facing:
  - the grab order in ms (attacker collar, attacker elbow, defender collar, defender elbow);
  - hand-to-target px per grip (max over held frames), unreachable frames, collar elbow flex range, and head gap;
  - ring travel px; max planted-foot slide px/frame; max part step px/frame at engage, steal and break;
  - (e) the first-frame max part step into each exit (no target: this is the Stage 3 list);
  - +ms per frame, flag on vs off.
- Gates: full suite, `npm run build`, `npm run moves:coverage -- --check` (baseline 22).
- Handoff entry `AI_HANDOFF_ENTRIES/<date>-claude-grapples-g1.md`, the Progress line, and then **STOP for Derek (G1)**.
  Ask him: is 1.4 s the right length, which hands fail as art, and which layering order he wants.

## Stage 1b: keep the bodies apart (D12), repair Codex's findings, then the G1b page

Derek's G1 note 2026-10-30, on George attacking Lou (locked 1750 ms, travel 37.8 px, feet overlap 27.2 px): Lou phases
through George, and grapples are upper body only. Codex's review:
[2026-10-30-codex-review-for-opus.md](AI_HANDOFF_ENTRIES/2026-10-30-codex-review-for-opus.md). Opus read the code and confirms
Codex's points 1 and 2 by reading; points 3 and 4 are open until measured.

Why it happens (measured from film.json and the code): the held gap is `holdGapFor(attacker's arm)`, Lou 40.3 px and George
24.6 px, against 100 px today. The film's `gapHeld` 54.1 / 38.5 is that gap plus the 14 px break step. The two men's lead
ankles reach about 47-52 px in the current stance, so the feet cross by 7 / 27 px. Locked 1750 ms is not a bug: 1.4 s timeout
+ 0.35 s break.

Order differs from Codex's suggestion on purpose: the George contact diagnosis (T1.8) comes after the spacing change, because
diagnosing hand misses at a gap we are abandoning is wasted. All of Stage 1b is flag-on only. Do not touch the exits (Stage 3),
get-ups, or George Stage 5. Do not retune `timeout`: Derek still owes the G1 length answer.

### T1.5 Side-effect-free arm measure

- `_lockupArmLength` assigns lean, crouch, legs and knees, and restores only the arms, so `g.from` is captured from a changed
  pose on a cache miss, and first use differs from cached use. It also runs before the engage, so it may be part of the 56-74 px
  engage step.
- Move the measure into a helper that takes the wrestler (in `lockup.js`, so a Node stub can test it). Snapshot the whole pose,
  restore every field including key absence, and redraw.
- Test: pose is deep-equal after a cache miss and after a hit, both facings and `lChannelSide` values.
- Report the engage step before and after, for all four attacker/facing runs.

### T1.6 Body-clearance measures

Add these to `grapples_film.mjs`. Do this before any tuning, so T1.7 is judged by them. Report the current build first as the baseline.
- **Ankle daylight:** the existing `footOverlap`, as a worst-frame number over every locked frame, including engage, drive
  steps, steal and break. Label it on the page as daylight (positive = clear).
- **Silhouette overlap:** quads are too loose (transparent margins), so on sampled frames (mid even, mid drive, mid steal if the
  case has one, last frame before the break) render each man alone and AND the two opaque masks. Report overlapping px split
  into below the belt, torso on torso, and above (arms, heads). Belt = the hip height of the man concerned. Save the mask images.
- **Reach:** a separate number for each grip: target distance against the arm's reachable range. Rename the page's
  `unreachable` column to `contact misses (> 3 px)`, since that is what it counts (Codex 3).

### T1.7 The A-frame and the new gap (D12)

- Pull the lead feet back toward or under the hips in `LOCKUP_POSES`, and have both men lean in. Raise the defender's lean
  (.02 today) so he does not stand up in the drive. Check first how `lean` and `crouch` move the shoulders and neck on each rig.
- Replace `holdGapFor(armLen)`. Sweep held poses on Lou vs George and George vs Lou, both facings: gap 52, 60, 68, 76 px by lean
  +0, +.1, +.2 by lead-foot pullback (three values you choose). Save the sweep table.
- **Pick the smallest gap that passes:** below-belt overlap 0 px, torso-on-torso overlap 0 px, ankle daylight at least 8 px on
  every locked frame, every grip within 3 px when held. If no cell passes, Lou is the bar: pass on Lou, and report George's
  misses. Do not tune the misses away by shrinking the gap; D12 beats the contacts.
- One gap for all pairs is preferred. Per-rig is allowed only if the sweep shows one number cannot pass.
- The stepping foot in the drive and the 3 px jolt must not break clearance. If they do, change the step or the jolt.
- Report the numbers for the other two roster rigs, without tuning for them.
- Update `tests/lockup.test.js` for the gap (and any tests pinned to `holdGapFor`).

### T1.8 George's hand misses, on the new spacing (Codex 3)

- One George-attacker run: after each of the six passes in `_holdLockupGrips`, log shoulders, elbows, wrists, target, target
  distance, arm lengths, grip weight and error. Check the solved channels survive the redraw. Keep partial-weight engage frames
  separate from fully held frames. Run Lou as the control.
- Name the cause from this list, with numbers: target moved after the last solve, elbow branch, renderer, or out of reach.
  Only then fix it, the smallest way. Art is not a cause until the other four are ruled out.
- Target: fully held frames at most 3 px on all grips, Lou and George. A miss may stand if you report it.

### T1.9 Buffered input keeps its direction (Codex 2), and the checks

- Decision: a button pressed in the engage stores its direction on the frame it was pressed, and fires once when the engage
  ends, even if the keys are released by then. A break or interruption discards it. Priority between the two men does not
  change, and add no new timing rule. The follow-up branches read the stored direction, not the live one.
- Add `tools/debug/grapples_assert.mjs`, a stepped-browser script that fails nonzero. It covers up+action released before
  .22 s gives the suplex, down and a whip direction likewise, each fires once, a simultaneous press by both men keeps today's
  priority, the pending input dies on a break, steal role rights, break cleanup, and one real stall.
- `grapples_flagoff.mjs`: a length mismatch must fail (today it can pass), and compare poses too, using the film's fixed tween
  delta, so D1's byte-identical claim is really checked (Codex 4). If poses differ flag off, stop and report it.

### T1.10 Strip and G1b page

- Add case (d2) to the film: 40·s px from the ropes, with the stall asserted. Recapture only (a) even, (b) drive, (c) steal and
  (d2), not the exits.
- Page `research/animation/grapples-2026-10/g1b/index.html`: normal-speed loop strips first, Lou attacker and George attacker,
  both facings, today | G1 | new, so the change is visible beside what Derek saw. Then the misses, then the table, including
  the silhouette masks of the worst frame.
- Gates: focused tests, `grapples_assert`, flag-off, then full suite, `npm run build`, `npm run moves:coverage -- --check`.
- Handoff entry `AI_HANDOFF_ENTRIES/<date>-claude-grapples-g1b.md` and Progress lines, misses first. Put the three G1 questions
  again in the entry: length, which hands fail, which layering order. **Do not stop: Derek is away. Go on to Stage 3.**

## Unattended run (Derek 2026-10-30)

Derek is away and wants Stages 1b, 3 and 4a done in one run, with no check-ins. Stage 2 is skipped because it needs his hand list.
Stages 3 and 4a are built on G1b before he has judged it, so keep every value a constant that can be retuned, and expect some rework.

**Decide and go on for:** tuning choices, missed targets that have a reported number, and rigs other than Lou missing.
Write each choice in the handoff entry. Do not ask.

**Stop the whole run and write up where you are if:**
- no T1.7 cell passes on Lou (the spacing is the base of everything after it);
- flag-off x, state or poses differ from the fixture;
- `grapples_assert` or the full suite fails at a gate and you cannot fix it in the task's scope;
- a task needs a change outside the flag, or to `STORY_*`, the get-ups or George Stage 5.

Never judge a look as approved, and never promote `grapples`. All of it stays behind `?grapples=v1`, in local commits, unpushed.

## Stage 3: every exit starts from the tie-up (no stop)

D12 covers the hold. The moves themselves keep their contact; a lead-in must not walk one man through the other before the
move's own contact begins. The G1 first-frame steps are the work list: headlock 99-102, suplex 73-80, whip 82-99, body slam 73,
piledriver 81, hip toss 75, arm drag 82, hammerlock 62-69 px/frame.

- **T3.1 One lead-in mechanism.** Read how each exit starts (`MoveRuntime`, `Wrestler._do*`), then add one shared, flag-on way to
  go from the held pose and gap to the move's first pose and spacing. Prefer data per move over new code per move. Grips ramp off
  over the lead-in. Prove it on the suplex, Lou and George, both facings.
- **T3.2 The rest of the list**, one commit per move or small group: headlock, whip, body slam, piledriver, hip toss, arm drag,
  hammerlock. Re-measure every exit; the new spacing changes all the numbers.
- **Target:** first-frame max part step no worse than the same exit from today's lockup (measure that, flag off), and no pose
  or x pop in the first 0.2 s. Follow-up input, hit timing and damage stay as they are. A move that misses goes in the
  table and you move on: this is the polish-list rule.
- **T3.3 Page** `research/animation/grapples-2026-10/g3/index.html`: normal-speed loop strips of each exit, both attackers, both
  facings, then the table, misses first. Focused tests per task; full gates at the end.

## Stage 4a: the two endings that need no new controls (no stop)

Derek did not pick the Stage 4 order. These two come first because they add no buttons and no story rules.
- **T4a.1 Rope break.** A lockup that ends in the `stall` breaks cleanly: hands off, the attacker steps back with hands
  raised. No cheap shot.
- **T4a.2 Shove-off.** Some timeout breaks away from the ropes become a two-hand shove: the defender stumbles back, and the
  attacker keeps his feet. Seeded, about one in three, no damage, and no stamina change.
- D12 holds through both. Add both to `grapples_assert` and to a page `research/animation/grapples-2026-10/g4a/index.html` (strips first).

## End of the run

Full gates, then one entry `AI_HANDOFF_ENTRIES/<date>-claude-grapples-run.md`: misses first, every choice made, every number
that fell short, and clickable links to the G1b, G3 and G4a pages in the order Derek should watch them. Replace the Status Next line.

## Later stages (outline, written in full after G1)

- **Stage 2: hands and the steal.** A Codex art request from Derek's G1 hand list. Likely: a hand gripping the back of a
  neck, partly hidden; a hand cupping an elbow; a forearm across the collarbone. Lou's `sellart` grip may cover some of
  these. Then the steal as a visible shove, with a re-grip if Derek wants D5 changed.
- **Stage 3: every exit starts from the tie-up.** Headlock, whip, suplex, hip toss / arm drag, hammerlock, and
  piledriver / slam each get a lead-in from the Stage 1 pose. The (e) jumps are the work list.
- **Stage 4: the lockup vocabulary**, so more moves can grow from it: rope break (clean break / cheap shot), shove-off,
  go-behind waistlock, wrist lock / arm wringer, side headlock takeover. Derek picks the order.
- **Stage 5: promote** `grapples` to default after Derek approves a live match.
