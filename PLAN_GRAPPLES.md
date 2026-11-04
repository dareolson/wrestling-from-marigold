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
- T3.1-T3.3: 5b21d3e + next commit, 907fd53 one drawn lead-in for all exits. First-frame step 62-102 -> 3-6. [G3 page](research/animation/grapples-2026-10/g3/index.html).
  Misses: whip's turn 119-121 at frame 9 (today 99-108); arm drag first frame 5.5 (today .01), worst better.
- T4a.1-2: 907fd53 rope break, shove-off; assert 17/17, suite 1057/1057, build, coverage 22, flag-off identical. [G4a page](research/animation/grapples-2026-10/g4a/index.html).
  Misses: rope break slide 2.93 / 2.53; break overlap 5-105 px. [Run entry](AI_HANDOFF_ENTRIES/2026-10-30-claude-grapples-run.md).
- T1.11: c8ab31b `grapples_legs.mjs` (+ run, sensitivity, film and sweep): G1b baseline knee line -6.4..-11.0, attacker ankle stagger 0.04-0.85 in the drive, knee stagger 6.1; idle passes every threshold.
  Sensitivity: `bend` moves only the hip angle (1:1); `crouch` shifts both legs together; `tilt` .1 moves the soles 7-12 px (left at 0). Misses: trunks share never moved (<= 3.4 points, Lou break 12.3), so the stack Derek sees is the stagger.
- T1.12: 8740c33 one owner (absolute `lShin`/`rShin`), natural knees, solved stagger, per-rig leg gain, clean hand-back; [G1c-a page](research/animation/grapples-2026-10/g1c-a/index.html). Knee line >= 1.8, ankles >= 20.8, knees >= 24.2, planted slide 1.2-1.5.
  Misses: Lou's planted sole 1.9 px off idle (1.5); George's collar 9.0 px (unchanged); D12 body overlap engage frames 0-12 (George 53-187 px, G1b 135-368) and break 85-87. STOPPED at G1c-a.
- T1.13: 8de0472 steal, stall, rope break, shove through the legs measures: 0 knee/stagger misses, trunks <= 5.9 (f102 was 12.3 at G1b), hip step 0.171 -> 0.090 (`breakBendRelease` .22). Leaks fixed: lockup shins left on whip/headlock/arm drag (24 exits clean), far thigh over Lou's torso (layers).
  Misses: Lou's planted sole 1.5-1.9 px; D12 overlap break 34-147 px (the release trade). T1.14: [G1c page](research/animation/grapples-2026-10/g1c/index.html), suite 1060/1060, build, coverage, flag-off identical. STOPPED at G1c.
- **G1c: approved by Derek 2026-10-31** after watching the G1c material and a live Lou vs George match on the flag. Current values stand (1.4 s, default layering, far hand on the forearm, .22 s torso release) until he says otherwise. `grapples` stays opt-in.
- T3b.1-T3b.3: e830e98 + next commit, no game code changed. Settle: no move keeps a lockup shin (assert 38/38), knee/stagger equal the move's own; first-frame step from the settle is up to +30 px over idle at 0 ms. Hit timing: clip moves land at 533 ms or later; headlock, whip (+0) and arm drag (+0, sell +83 ms, 17.3 px off true) act inside the 0.14 s lead-in.
  Misses: whip turn 120.5 / 118.7 at +8 (today 98.6 / 108.4) is the flip alone; turning at +0 gives Lou 126, George 103.6, so left for Derek. [G3b page](research/animation/grapples-2026-10/g3b/index.html), [entry](AI_HANDOFF_ENTRIES/2026-10-31-claude-grapples-g3b.md). STOPPED at G3b.
- T3c.0a: a4ba0e1 (includes Codex's candidate), release 183 / 250 ms, direction 8/8, at most 1 still frame, first-run peak 55.2 / 47.9 (Lou on George), 65.0 / 36.1 (George on Lou), rechecked by Opus. Beat gone in the numbers; Derek to judge.
  Misses (Opus review): the 74 px pop moved to 583 ms (58.7 px) when the lock ends, past the proof table's 550 ms; attacker faces away from the throw until then; lock can stick if the attacker is interrupted. See T3c.0b.
- T3c.0b: d22ec32, cross-body flip on the release frame (250 ms, attacker 69.5 Lou / 68.2 George), largest attacker step after it 10.1 / 11.9, no late pop, direction 8/8, whip tests 6/6, rechecked by Opus.
  Misses: the 69 px step is a one-frame flip, not a drawn turn; arm follow-through peaks 50 ms after the flip; cross-body hips still overlap (3c.0); no wrist contact.
- **Whip: approved by Derek 2026-10-31** ("it looks good now") after watching the viewer. Hip overlap and wrist contact go on the polish list.
- T3c.1-T3c.4: 1f8efce, 8e16101, b22e520, 80917cf. Corner runs 16/16, worst miss 0.05 px, arrival 1200-1450 ms; clothesline connects 60 px off line. Opus reran: suite 1080/1080, build, coverage 22, flag-off identical.
  Misses: a diagonal press in a lockup is now a whip, not the suplex or headlock; corner hit is a stand-in. [Strip](research/animation/whip-2026-10/corners.html).
- **G3c: approved by Derek 2026-10-31** ("starting to look really great"). Notes: sell the rope hit, stuck in the corner, running attack. Next T3c.5, stop at G3d.
- T3c.5: 70c7fe3, rope hit copies the corner hit (no flip, first stagger step, then turn): recoil 117 / 133 / 150 / 167 / 183 ms (rock to outOnFeet), flip-frame pose step 12-27 px, focused tests 36/36, flag-off identical. [Strip](research/animation/whip-2026-10/rope.html).
  Misses: travel is 14.8-17.4 px for every type (the 40·s clamp in `_runStaggerSteps`); in the press 6-8 frames, at half or more 3-4, out of it by the last frame or two. Front-on hit, Derek's first note said back-first. STOPPED at G3d.
- **G3d: not approved** (Derek 2026-10-31, "a little better"): he wants his back into the rope, the rope taut, then sprung forward, and noticeable. Next T3c.5b, stop at G3d-2.
- Codex review 2026-10-31 ([note](AI_HANDOFF_ENTRIES/2026-10-31-codex-corner-rebound-review-for-opus.md)): return line misses the attacker by 62+ px; folded in as T3c.4b and guards in T3c.6-T3c.7. T3c.5's flip step is raw 99.8-139.7, mirrored 12.2-23.1.
- T3c.4b: 6bafbf1, return passes through the attacker's snapshot x and y: worst y error 0.000 px at the crossing over 192 cases (x, y, both ropes, both gaits), clothesline test kept, flag-off identical.
  Misses: 52 slope-limited cases land on the 0.5 line, up to 107.5 px off his y; behind him or within 60·s px in x is the old single line.
- T3c.5b: 6bed0b8, back into the rope: 31 px past the rope point (34·s, 22.5-33.7 by depth), middle strand bow 32.7-37 px, return peak 1.66x, contact to launch 350 ms (400 worn), no strand draws in front of him, suite 1092/1092, flag-off identical. [Strip](research/animation/whip-2026-10/rope.html), normal and quarter.
  Misses: launch frame steps 30-80 px raw (pose to run gait, no flip there); turn frame 77-137 raw, 7.6-15.7 mirrored; hands not put on the top rope; far depth bow is perspective-light. STOPPED at G3d-2.
- **G3d-2: approved by Derek 2026-10-31** ("the lean back against the ropes, that's what i was envisioning"). Opus reran at f0e4771: suite 1092/1092, build, coverage 22, flag-off identical. The corner now uses the same lean. Next T3c.6-T3c.7, stop at G3e.
- T3c.6: a96c34f (one commit with T3c.7), stuck in the corner: back in 12·s px (11.8 near, 7.1 far, never past it), no spring, daze 1517 ms (rock, stumble) / 1917 reel / 2417 buckle / 3017 out on feet, exit step 29.6 px near / 17.8 far (30·s). Hands reach the top rope at both points, 0.0 px miss, all 4 corners, both kits. Near corners: he draws behind the post (25.17 vs 25.7) and near rope (25.5), no side strand in front. [Strip](research/animation/whip-2026-10/corner-daze.html), normal and quarter.
  Misses: frames local (36 MB, not committed); the exit step has no walk cycle; `stepForwardPx` 18 in the results is net of the 12 px load, in units of s.
- T3c.7: a96c34f, running attack: charge 900-1433 ms over 249-493 px, stops 45.4 near / 27.3 far (46·s) short, hit 100 ms after arrival, 14 drain, daze +0.6 s once, one damage event; miss runs on and corners the attacker, 0 damage. AI real match: Lou 6/6 charged, 3 hit, 2 missed; George 1/5 charged, 0 hit. Suite 1108/1108, build, flag off identical A/B against HEAD.
  Misses: coverage 23 gaps, not 22 (new move, baselined); a 1.5 s daze ends before most charges land from far; the committed flag-off fixture already differed at HEAD (re-recorded A/B identical). STOPPED at G3e.
- **G3e note from Derek 2026-10-31:** corner stance should be arms down, hands up reads as guarding. Opus reran at a81b802: suite 1108/1108, coverage 23, flag-off identical. Next T3c.6b, stop at G3e-2.
- T3c.6b: d7bb349, arms down: hands off the rope, near arm -.1 / far .02, elbows .25 (14 deg bend), fall 297 ms after the load, daze 2217 ms (rock, stumble, reel), 2417 buckle, 3017 out on feet. Charges land inside it: 8/8, 433-967 ms of daze left at impact. Wrist vs hip (px, + = below): George near wrist +1 to +3, far wrist -8 to -15; Lou near +17 to +29, far +3 to +8; none within 10·s of the hip. Focused tests 60/60, flag off identical (A/B). [Strip](research/animation/whip-2026-10/corner-daze.html), normal and quarter.
  Misses: George's wrists sit at hip height (his arm art is short), his wrist is inside the coarse torso-sprite box; frames local. George charged 5 of 8 at 2.2 s (1 of 5 at 1.5 s), Lou 8 of 8: his stall/showboat timers and 2-2.2 s taunt cooldowns gate `_chooseAction`; AI untouched. STOPPED at G3e-2.
- **G3e-2: approved by Derek 2026-10-31** ("i like what we have so far"). Note: the charge should put him down, falling forward, then sell the face or stomach. Opus reran at 4554a94: suite 1108/1108, flag-off identical. Next T3c.8, stop at G3f.
- T3c.8: dc73b78, the charge puts him down: 150 ms reaction, fall forward 483 ms (face) / kneesForward 733 ms (stomach), lands prone facing in, 12.6-24.9 px inside the rope (hips 120·s in), forced sell on all 16 runs (clutch 1.38 s George / 0.96 s Lou in 5.88 s down), one damage event, get-up frontKneeStraight, no episode or `_charge` left. Wrist to target: stomach 0-0.4 px, face 3.3-5.4 px Lou, 11.4-18.9 px George. Suite 1110/1110, build, coverage 23, flag-off identical (A/B). [Strip](research/animation/whip-2026-10/corner-knockdown.html).
  Misses: mid-fall the body swings 12.4-13.4 px past the rope at near corners (standing there is -27); face sell is the near hand only (a far hand changes every prone head sell, and the sell-art test); George's hand 11-19 px short of the head; attacker 65-107 px from the head sprite. STOPPED at G3f.
- **G3f: approved by Derek 2026-10-31** ("i like it"). Opus reran at 1dcffb4: suite 1110/1110, build, coverage 23, flag-off identical. Stage 3c done through T3c.8. Polish list adds: body past the rope mid-fall at near corners, George's face sell 11-19 px short, face sell one hand.
- Whip candidate (Codex, now in a4ba0e1, under `grapples=v1`): release at 310 ms, cross-body pull at 400 ms, real-input direction 8/8, defender peak 55-66 px/frame. [Viewer](research/animation/whip-2026-10/index.html), [entry](AI_HANDOFF_ENTRIES/2026-10-31-codex-irish-whip-direction.md).
  Misses (Opus review): cross-body pull fuses the bodies at about 300 ms, about 20 px of depth apart, against D12; receiver's arms go to idle, so no wrist contact. See Stage 3c.
- T5.1: c4d657d, the AI's open-ring whip (George, Thesz, Kowalski; Guido's brawler has none) also holds up or down on `cornerWhipOdds` .35, toward the nearer corner; the ropes-escape whip stays flat. Soak: 46 corner / 199 flat whips (96 at the ropes), .188 of all, .309 of the rest. The low charge does reach `tryRun`: 11 stomach, 13 face, 2 misses.
  Misses: below .35 for George and Lou pairs (.26); George charged in 2 of 12 corner chains he sent, Lou 10 of 12, Kowalski 12 of 22 (his stall and showboat gates).
- T5.2: be87a8f + recheck: `grapples_soak.mjs`, 8 flag-on soaks (4 pairs, both gaits) each reached 3 full chains, 0 page errors, no stuck state, no leftover field, ring excess 14 px. Recheck with the mat sell sampled (the first monitor's "sell" was the 150 ms reaction): 17 of 17 charged chains planned the forced head or gut clutch, 11 ran it whole (1.36-1.38 s), 6 were cut short at 0.03-0.42 s by a pin, ankle lock or elbow drop. Forced hit in reaction, fall, get-up and pin: 19 of 20 clean; keyboard 4 of 4, both directions.
  Misses: 2 `orphanRescue` at the 10:00 limit in a lockup, reproduced with `=off` too (`_endMatch` clears `lockupState`; both men back to standing after 0.6 s), not fixed; Guido pairs' matches 1.4-1.5x longer flag on; Guido's collar 19.9 px short (T1.3b) not re-measured; one browser closed mid-run once (cause unknown, rerun passed); page clock ran slower than wall on some runs (4 browsers).
- T5.3: aa0532f, `grapples` on by default, `=off` the old lockup. Suite 1115/1115, build, coverage 23 baselined, `grapples_assert` all passed, flag-off identical (60 frames; a default launch differs, `=off` matches). Live: no flag, Lou vs George, 19 of 19 lockups carry the new tie-up. STOPPED at G5.
  Misses: `MOVE_CATALOG.md` edited, not committed (another session's changes in it); AI chains: George rarely follows a corner whip with the charge.
- **G5: approved by Derek 2026-11-01** ("it's good enough to keep moving forward") after a no-flag match on Procreate Lou and `george-roster-v1`. Current values stand: match pace, `CORNER_CHARGE.backOff` 330 px, the diagonal press, polish list parked. Opus reran at ca9bca5: suite 1115/1115, build, coverage 23, `grapples_assert`, `=off` identical. Next T6.1-T6.3, stop at G6.
- T4b.1-T4b.2: 452805f, 76b0de4. Hold 0 / 0 px overlap below the belt / torso on both rigs; George's near hand 3.67 px short.
  Misses: the circle overlaps (up to 3806 px below the belt), ankles slide 6.6-8.1 px/frame, facing-flip pop 44-53 px; let-go turn 57-59 px/frame.
- **G4b-a: approved by Derek 2026-11-03** ("good enough to move forward"): the A-frame hold, W4 layering and the circle as built stand. The circle's overlap stays reported (D12 is not waived for other moves). Polish list adds Codex's circle recipe: stepping footwork (plant/swing), an authored turn, a staged route (clear in depth, cross behind, close in) with ring-edge handling. Next T4b.2b, then T4b.3-T4b.5, stop at G4b.
- T4b.2b: a20ef04. Match-end leak fixed (`_endWaistlock`; `waistlock_cleanup.mjs` failed 9 of 12 before, passes 12 of 12: circle, hold, let-go); W4 stack only from the grip ramp; defender keeps his facing 300 ms after the let-go (first 8 frames standing 56.6 -> 10.3 px/frame).
  Misses: the turn itself is one frame, 91 px/frame (an idle flip measures 96.5); the circle overlap is unchanged (2807 / 1247 px, every frame now); the depth order flips at the grip ramp; ankle movement not support-classified.
- T4b.3: bfc4184. Endings: switch (defender's `action`, 0.12 s hitch, swaps back, no chaining), shove-off (attacker's `action` or the 1.6 s timeout), rope break (either man within 34 px of a rope at the close, or no room behind the man a switch would go behind); `waistlock_assert.mjs` 15 checks pass, 15 pure tests.
  Misses: a go-behind whose spot is past the ropes is denied (tie-up goes on), not a rope break; rope break walks the defender off the rope (the attacker is against it); switch flips the new attacker's facing in one frame.
- T4b.4-T4b.5: (this commit). `goBehind` in the registry (slot `lockupPowerDir`) and the Lou and George kits; AI go-behind (Lou .20, George .10) and reversal (.30, .15), AI never ends a hold early. Soak (3x, one pair at a time): Lou on George 8 go-behinds, 1 switch, 8 timeouts; George on Lou 7, 2, 5 timeouts + 1 rope break; 0 failures, 0 page errors. Suite 1139/1139, build, coverage 24 (goBehind baselined), kits check, `grapples_assert`, `grapples_flagoff`, `waistlock_assert`, `waistlock_cleanup`. STOPPED at G4b.
  Misses: the circle's overlap, slide and flip are unchanged (polish list); George's near hand 3.7 px short; AI odds are first drafts; two soaks at once lost both browsers at about 3 min (cause unknown, discarded); one `grapples_assert` crash under load, rerun passed.
- **G4b: approved by Derek 2026-11-03** ("I really like what I see"). `waistlock` stays opt-in. Derek picked Stage 4c's first pair: the atomic drop from the hold, and its reversal into a snapmare that front-flips the attacker. Next T4c.1-T4c.4, stop at G4c-a.
- T4c.1-T4c.3: 2d3fa8b, 0eb52f1, e2d6a1e. `waistlockThrows.js`; atomic drop (attacker's power in the hold, damage 12, back sell carried on his feet); snapmare (defender's power inside 0.20 s of the lift, flip 1 turn + 270 degrees, damage 16, denied at the ropes). `waistlock_throws_assert` 36/36, `waistlock_cleanup` 28/28, `grapples_flagoff` identical, coverage 26.
  Misses: lead-in first frame steps 45 px vs the tie-up's 32.7 (knee beats shin, tried two fixes, reverted); D12 overlap in every beat and the flip; soles over 2.5 px/frame; hands to the head up to 32 px.
- T4c.4: (this commit). [G4c-a page](research/animation/grapples-2026-10/g4c-a/index.html), four strips, misses first. STOPPED at G4c-a: Derek judges the drop, the flip (`SNAPMARE.turns` 1 or 0) and the A7 frames.
- **G4c-a: notes from Derek 2026-11-03, not approved:** the atomic drop should lift higher; the snapmare flips twice, want once (`SNAPMARE.turns` 0); layering is off, e.g. George's arm after the snap. Opus saw more on the same frames (snapmare-lou-george-r): see T4c.4b. Next T4c.4b, then straight on to 4d (Derek's order); T4c.5-T4c.6 after G4c-a passes.
- T4c.4b: d248c04 (with Codex's local repairs: knee bridge in `exitBlendPose`, grip redraw before `undoBlend`, head lowered with the pull). Lift 80 (chest 58.3 px over pelvis), one flip 267 deg, arms down by +0.2 s, boot 41.5 px clear (`landFwd` 215). Opus reran the suite on Node 22: 1158/1158. [G4c-a r2](research/animation/grapples-2026-10/g4c-a2/index.html).
  Misses: lead-in step 36.4 px (drop) vs 32.8; D12 overlap (drop 758, snapmare 1519 below the belt, 89 torso); `grapples_assert` not run after Codex's `lockup.js` change, which reaches the default game.
- **Derek on r2 (2026-11-03):** after the snapmare Lou's far (back) arm pops in front of his torso for a moment. Cause (Opus): the snapmare's `layers` windows list `lArm`, `rArm` after each man's own torso, so whichever is the far arm in that facing draws over his body until the window ends at `D`. T4c.4c.
- **Derek on r2 (2026-11-03): George's legs "go gumby" when he is lifted; it breaks the art, fix it and prevent it.** Opus, from `g4c-a2/frames/drop-lou-george-r` 84-105: his shins swing forward of his knees through the lift (knees bent backward). Same trap as G1b: on the upright path a positive `lKnee` puts the ankle forward of the knee (`limb_limits_audit.mjs` header), and `JOINT_LIMITS` clamps the number, not the drawn bend. T4c.4d.
- T4c.4c-T4c.4f: (this commit). [G4c-a r3](research/animation/grapples-2026-10/g4c-a3/index.html): far arm 0 px over his torso (was 541-643, with a pop at the end), knees fixed + `clip_knee_audit` (baseline lists 14 shipped moves, not fixed), snapmare 1.5x shipped (2x beside it, `landFwd` 260), fridge lift. Gates: `waistlock_throws_assert`, `grapples_assert`, `waistlock_cleanup`, `grapples_flagoff`, focused tests 71/71.
  Misses: locked arms 26/16 px drift along his torso; D12 overlap; lead-in step 36.6 / 40.7 px; reverse window is now 48% of the lift. Derek picks 1.5x or 2x.
- T6.1-T6.3: 4774ed4, 3454930, de33540. Default fighters Procreate Lou and `george-roster-v1`; `rosterKits.js` is the one kit file; `moves:kits` table and kit checks. Suite 1124/1124, build, coverage 23, kits, `grapples_assert` all passed. STOPPED at G6.
  Misses: Guido has no `hammerlockOdds` or `cornerWhipOdds` (allow-listed, not retuned); no shadowed moves; `grapples_flagoff` with no `WFM_URL` (self-started server) prints DIFFERENT at frame 0 (about 1e-5 in pose) also on the code before T6.1, identical with `WFM_URL=http://localhost:5173` (flagoff now pins `thesz`/`george`).

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
- **No knee bends backward, ever** (Derek 2026-11-03: "we break the art"). From T4c.4d on, `clip_knee_audit` passes before any strip goes to Derek; a positive `lKnee` on the upright path is a hyperextension, whatever the clamp allows. Run `WFM_URL=... node tools/debug/clip_knee_audit.mjs`; the baseline lists the old failures (`research/animation/grapples-2026-10/knee-audit-first-run.txt`).

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

## Stage 1c: legs that are legs (D13): stance check G1c-a, then G1c

Derek's G1b note 2026-10-30, after the unattended run: better, but the legs are wrong, on many frames. On George attacking Lou
(daylight 15.3, under the belt 285, torso 0) George's leg hyperextends, "gumby legs". On Lou attacking George (daylight 40.1,
under the belt 82, torso 0) both of Lou's legs suddenly stack over his trunks. Those caption numbers are the worst engage frames
and describe neither fault: nothing in the film measures a knee, the stance or the trunks. That gap is why the run reported clean.

Opus measured the held poses (hip, knee, ankle in px at s = 1, along the facing, both rigs, both facings):
- **The knees bend backward.** In `_updateUprightCore`, shin = thigh + facing * lKnee, and the thigh channel is positive toward
  the facing, so a positive `lKnee` swings the shin forward and leaves the knee behind the hip-ankle line. The knee's offset from
  that line is +0.1 to +0.5 px at idle, and in the held poses -2.1 to -11.1 px on every leg (worst: attacker near leg, George
  -11.1, Lou -9.5; shin 16 px forward of the knee). Every `leadKnee` / `rearKnee` in `LOCKUP_POSES` is positive. The natural
  direction is negative, which `JOINT_LIMITS.knee.min` stops at -0.10 even though the same table treats positive as flex.
  With no knee channel the crouch path bends the shin back; Lou's idle uses the absolute `lShin: -0.11`.
- **The stance collapsed.** Near and far ankles are 34.6 px apart at idle, and 2.2 px apart in Lou's attacker pose (19.0 even,
  35.8 defender). Far hip and near hip stay 16 px apart, so the attacker's legs converge to one column.
- **Trunks.** Lou's trunks are painted in the torso image. `bend` .38 rotates that image about the hip, but crouch adds forward
  angle to the thighs, so they come out about -.15 rad rather than -.4, and they cover what the rotated trunks left behind.

- **D13. Legs (Derek 2026-10-30).** Every frame of a grapple, both rigs, both facings, all phases including engage and break:
  a knee never sits behind the hip-ankle line, and the two legs stay readable as two legs, a real stagger. The trunks stay in
  place over the thighs. D12 still holds. Lou is the bar. Do not touch `JOINT_LIMITS`, `Skeleton`, or anything flag off.

**Current values (these replace the older numbers above):** `bend` carries the torso pitch (`lean` is not drawn), gap 80 fixed for
all pairs (D9 gone), engage .30 s, `elbowCup` -.6, timeout 1.4 s. Unattended mode is over: Derek is back. Read D12, D13, the Rules
and this stage; skip the finished stages unless a task names one.

**Two sign-offs, in this order.** Stance first (G1c-a), then the expansion (G1c). Nothing downstream is built or recaptured until
Derek accepts the stance. Codex's review: [efficiency review](AI_HANDOFF_ENTRIES/2026-10-30-codex-sonnet-efficiency-review.md).

### T1.11 Leg measures, defined, with the baseline

Add to `grapples_film.mjs` and the sweep. All px at s = 1, along the facing, per leg, worst per phase, with the frame and leg saved.
Geometry is every frame; masks are sampled phases, and the page says which. Report G1b and idle on both rigs first. If idle or the
frames walking in fail a threshold, report that conflict; do not retune idle and do not silently exempt frames. The thresholds
stand in for D13; Derek's eye decides it.
- **Knee line:** signed perpendicular distance from the knee to the hip-ankle line, positive toward the facing. If hip to ankle is
  under 1 px, record null. Keep the signed flex (shin minus thigh, wrapped to +-pi, times facing) beside it. Pass: at least -0.5 px.
- **Stagger:** signed horizontal lead-minus-rear offset for ankles and knees, absolute value tested. Pass: ankles at least 20 px,
  knees at least 14 px (idle: Lou 34.6 / 28.1, George 34.8 / 25.0).
- **Hip angle:** torso pitch minus thigh pitch, world frame, wrapped, sign by facing. Report only, with idle as the reference.
- **Trunks:** torso image px with alpha at least 128 below the waist line (define the line per rig, in the image), share covered by
  the same man's own thighs, as percentage points against that rig and facing at idle. Pass: within 10 points. Sampled phases.
- **Feet:** sole y from the painted sole anchor, or say which fallback you used, at the same root y and scale as idle. Pass: support
  foot within 1.5 px. The stepping foot in the drive is exempt, and the page says so. Planted-foot x stays under 2.5 px/frame.
- **Sensitivity first:** before using a channel, change it alone and report what moves in the render. The dead `lean` axis cost a sweep.

### T1.12 One stance, then STOP (G1c-a)

Solve in this order, one family at a time. Tune with numbers, no screenshots, and keep the best two or three candidates only.
1. **Joint owner.** Remove `lKnee` / `rKnee` from the lockup channels (`leadKnee`, `rearKnee` go). Author the bend through the crouch path
   or absolute `lShin` / `rShin`, as Lou's idle does. One owner per joint (`ARTICULATION_CHANNEL_PAIRS`).
2. **Lifecycle.** `_tickGrapple` writes with a plain assign, so a stale key survives: delete the losing channel on entry. It blends
   `from[key] ?? 0`, so a channel the entry pose lacks starts from 0, not from the drawn angle, and pops: seed `from` with the angle
   actually drawn (George has no `lShin` at idle, Lou does). Keep ownership through steal and endings, and hand the pose back clean at exit.
3. **Stagger and trunks.** Lead foot under or ahead of the hip, rear foot behind it, in all three keys. The attacker is the worst
   today. Then lower `bend` or match the thighs to it until the trunks pass. Leave `tilt` at 0: `bodyPlacementWeight` is already .33 at
   .1 rad and it moves the feet. Add tilt only if nothing simpler passes, and measure the feet.
4. **Gap and reach, last.** Start from 80, not a sacred value. D12 and D13 beat the hands: if the arms cannot reach, report the miss.
5. **Transition.** Derek said "suddenly". Report the largest frame-to-frame change of hip angle and knee line through engage and
   break, and ramp whatever snaps.

Scope: engage, even, drive and break only, Lou and George both attacking, both facings. Tests: a rendered check in
`grapples_assert` on real Lou and George, both facings, that fails on a backward knee or collapsed stance, plus a small data guard
if useful. A missing key alone proves nothing.

**Checkpoint page** `research/animation/grapples-2026-10/g1c-a/index.html`: normal-speed strips first (G1b | new), a 3x hip crop of
the held pose beside idle for each man, then the misses, generated from the data. Focused tests and `grapples_assert` only; no
full suite here. Commit, give Derek a clickable link, **STOP**. If no candidate passes on Lou, show the best two and stop the same way.

### T1.13 After Derek accepts the stance: the rest of the phases

Extend to steal, stall, rope break and shove with D12 and D13 held. Then re-measure the exits once from the accepted stance, and
repair only what this change broke. No new exit work, and no per-parameter recaptures.

### T1.14 G1c, then STOP

- Page `research/animation/grapples-2026-10/g1c/index.html` from one manifest: commit plus dirty flag, rigs, flags, seed, constants,
  and frame and phase of each maximum. Strips first, misses from data, then the table. Re-measure a baseline if a metric's
  definition changed; old numbers do not carry over.
- Gates, once: focused tests, `grapples_assert`, flag-off, full suite, `npm run build`, `npm run moves:coverage -- --check`.
- Entry `AI_HANDOFF_ENTRIES/<date>-claude-grapples-g1c.md`: chosen values, worst misses with frames, what remains. Progress lines.
  Give Derek a clickable link and **STOP**. Ask the run entry's open questions again.

Not this stage (polish list): sharing a browser across `grapples_assert` cases, and removing `wantLock`. Touch them only if a task
already needs that code.

## Stage 3b: exit checks before promotion, then STOP (G3b)

Codex's recommendation, accepted by Opus 2026-10-31: the G1c stance is approved, so stop retuning it. **Do not change `LOCKUP_POSES`,
the gap or the hold.** This stage measures three open risks and fixes only a real failure, the smallest way, behind the flag. Lou and
George both attacking, both facings. Tool: extend `grapples_assert.mjs` or `grapples_film.mjs`; no new framework, no full G-package.

- **T3b.1 A move inside the break's 220 ms settle.** Start each standing move the kit allows at 0, 60, 120 and 200 ms into the settle.
  Report any leftover `lShin` / `rShin` / `lKnee`, knee-line miss, stagger miss and first-frame part step. Assert the leftovers.
- **T3b.2 Hit timing against the picture.** For each of the eight exits, find the move's impact or marker frame and the frame the
  0.14 s lead-in releases. At the impact frame, report the distance between the drawn contact parts, and the drawn pose's distance from
  the true pose. Flag any impact inside the lead-in. If a move fails, try a per-move `LOCKUP.exitBlend` entry first. Do not change hit
  timing or damage, and do not add a timing system.
- **T3b.3 The whip turn.** Find what moves 119-121 px/frame at frame 9 (today 99-108), and report whether it is the flip alone. Fix it
  only if a per-move change gets it to today's number or better. Otherwise report the options and leave it for Derek.

Stop rule: if a fix needs a new system or a change outside the flag, leave it and report it.
Page `research/animation/grapples-2026-10/g3b/index.html`: normal-speed strips of anything changed or failing, then the misses from the
data, then the table. Gates, once: focused tests, `grapples_assert`, flag-off, full suite, `npm run build`,
`npm run moves:coverage -- --check`. Entry `AI_HANDOFF_ENTRIES/<date>-claude-grapples-g3b.md`, Progress lines. Clickable link, **STOP**.
Never promote `grapples`.

## Stage 4b: the go-behind waistlock (Derek 2026-11-02 picked it first), stop at G4b-a, then G4b

Written in full, for Sonnet. From the tie-up the attacker slips round and takes a rear waistlock. It is the base for the back
suplex, German suplex and rollup later (Stage 4c, Derek picks). This stage builds the go-behind, the hold and its endings, no throw.

**Decisions (Opus; Derek can overrule at G4b-a):**
- **W1. Flag** `?waistlock=v1`, **opt-in** (`grapples` is promoted, so the new branch must not change a default match). Add
  `waistlockCandidate` beside `grapplesCandidate` (`src/Wrestler.js:123`), opt-in like `?plant=1`: on only for `v1`, off in Node with no
  `location`. Flag off is byte-identical: `grapples_flagoff.mjs` (default launch, its fixture) still passes unchanged.
- **W2. Input.** In the lockup, the attacker's `power` with up or down held = go-behind. `power` with no up or down stays the kit's
  hip toss / arm drag. Up circles round the far side, down the near (camera) side. Read the AI's `power` presses in a lockup first:
  if any can hold up or down by accident, report it and make it explicit.
- **W3. D12 holds** (Derek 2026-10-30): no pelvis, thigh, shin or foot of one man overlaps the other, in any frame, and no torso through
  a torso. So this is an A-frame waistlock: same facing, the attacker a step behind and a little upstage (smaller y, so he draws
  behind on whole-body depth), hips back, bent at the waist, arms reaching round the defender's waist. The circle travels on a
  depth lane (y offset) so it never walks through him. If D12 and a hand on the waist can't both be met, D12 wins: report the
  hand miss in px. Derek judges at G4b-a whether the A-frame shape is a waistlock at all.
- **W4. Layering** (D8's `layerDepths`, resolved per facing), back to front: attacker far arm, defender far arm, attacker body,
  defender body, defender near arm, attacker near arm (his near hand shows across the defender's belly).
- **W5. Contacts** use `holdGrips` with `at` points (D7): both attacker hands at the defender's waist, the near on his front, the far
  hidden behind him. The defender's near hand goes to the attacker's near wrist (prying). Lou is the bar; tune for Lou and report George.
- **W6. Endings** (T4b.3): (a) **switch**: the defender's `action` reverses it, he goes behind with the same go-behind, roles swap,
  with the steal's hitch (`LOCKUP.stealHitch`) so it can't chain every frame; (b) **shove-off**: the attacker's `action`, or the hold's
  timeout (1.6 s, a constant), pushes the defender away forward: reuse T4a.2's stumble, no damage, no stamina change; (c) **rope break**:
  the defender within the rope reach of T4a.1 breaks it cleanly, reuse T4a.1. A throw from the waistlock is Stage 4c.
- **W7. Kits and AI.** New registry id `goBehind`, in the Lou and George kits only (`rosterKits.js`), slot `lockupPowerDir` (no
  conflict with `lockupPower`; add it to `KIT_SLOTS`). Personalities: `goBehindOdds` Lou .20, George .10; `switchOdds` (defender)
  Lou .30, George .15. Add both to `KIT_AI_ODDS`. Regenerate the `moves:kits` block in `MOVE_CATALOG.md` with `git add -p` (other
  sessions' edits are in that file). The coverage baseline goes from 23: report the new count, don't fix the gap here.
- **W8. Arena state** `waistlockState`, like `headlockState`: cleared in `_endMatch` (`Arena.js:3989`), known to `_orphanWatchdog`
  (`:3512`) so no `orphanRescue` fires during a hold or at the 10:00 limit in one.

**Measures** (numbers, not judgements; px/frame at 60 fps): `grapples_masks.mjs` `belowBody` and `torso` overlap, every frame (want 0);
attacker hands to the defender's waist points (px); the go-behind's first-frame max part step against the same exit's from the tie-up;
planted soles against the 2.5 px/frame limit; the circle's closest approach below the belt.

- **T4b.1 Pure data and math.** `src/animation/waistlock.js` + `tests/waistlock.test.js`: the go-behind path (lane y, x, the time
  along it, both sides, both facings), the hold spacing, the hold pose keys, the timeout and the W4 layer list. Pure, like `lockup.js`.
- **T4b.2 The go-behind and the hold, flag on, then STOP (G4b-a).** Arena branch (W2), `waistlockState` (W8), the contacts (W5), the
  layering (W4). Lou on George and George on Lou, both facings, both sides. The hold just times out and lets go with the T4a.2
  stumble (no other endings yet). Measures above. One normal-speed loop strip per attacker in both facings,
  `research/animation/grapples-2026-10/g4b-a/index.html`, misses first, then the numbers. Focused tests, `grapples_flagoff`.
  Commit locally, **STOP at G4b-a**: Derek judges the shape (W3) and the layering (W4) before any more is built.
- **T4b.2b Repairs before the endings** (Codex review `AI_HANDOFF_ENTRIES/2026-11-02-codex-waistlock-review-for-opus.md`, Opus's cut;
  Derek 2026-11-03: "good enough to move forward"). No switch, rope break, AI or kits here.
  1. **Cleanup.** One `_endWaistlock(reason)` helper, used by the timeout and `_endMatch`: clear both `_facingLock`, null the state, put a
     man still in `lockup` back to standing with `_lockupLegsHome`; never overwrite a down, selling or move state. `_tickWaistlock`
     bails to it if either man is no longer in `lockup`. At match end, leave no callback that can touch the next match. Browser
     test: end the match in the circle, the hold and the release; after the reset both locks are false, no `orphanRescue`, and
     crossing the opponent turns each man as normal.
  2. **Layering by phase.** Apply `waistlockLayerOrder` only once the hold's grips are on (the `gripRamp` start); before that, the
     whole-body order from depth, so the near-side pass draws the attacker in front.
  3. **The let-go turn.** After the release the defender keeps his facing for a beat and turns with the game's normal turn, not a
     one-frame flip: whole-body step for 8 frames after `done` reported raw, want under the tie-up's worst after the engage (32.6 px).
  4. **Honest measures.** Masks every frame. Rename `circleClosestLow` to what it is (closest x between joint pairs). Label the
     slide numbers "ankle movement, both feet, no support classification".
  One Lou-on-George strip, far side, both facings, through the release plus 8 standing frames, on the G4b-a page above the old
  strips. Focused tests, `grapples_flagoff`. Commit locally; **no stop**, go on to T4b.3.
- **T4b.3 Endings** (W6), after Derek accepts G4b-a. Each ending a test; the switch can swap back.
- **T4b.4 Kits and AI** (W7). The AI attacker goes behind on `goBehindOdds`; the AI defender switches on `switchOdds`. A short
  `grapples_soak.mjs` run with `waistlock=v1` on Lou vs George, both orders: go-behinds, switches, shove-offs, rope breaks counted;
  fail on page errors, `orphanRescue`, stuck states.
- **T4b.5 G4b page** `research/animation/grapples-2026-10/g4b/index.html`: normal-speed loop strips of each ending, both attackers,
  both facings; then the table, misses first. Gates: focused tests, `grapples_assert`, `grapples_flagoff`, full suite, build,
  coverage, `moves:kits -- --check`. Progress lines, Status. Commit locally, do not push, **STOP at G4b**. Never promote `waistlock`.

## Stage 4c: the atomic drop and the snapmare reversal (Derek 2026-11-03), stop at G4c-a, then G4c

Written in full, for Sonnet. Derek's spot: from the waistlock the attacker lifts the defender and drops him tailbone-first on
his knee (atomic drop). If the defender reverses it during the lift, he lands on his feet, reaches back for the attacker's head
and snapmares him over his shoulder; the attacker turns a **full front flip** in the toss and lands hard. Derek: "really
impactful", "no new parts". Everything stays behind `?waistlock=v1` (opt-in, never promoted here). Back suplex, German suplex,
rollup and Derek's other waistlock ideas come after G4c, in an order he picks.

**Decisions (Opus; Derek can overrule at G4c-a):**
- **A1. Input.** In the hold (`ws.phase === 'hold'`, grips closed), the attacker's `power` = atomic drop. The defender's `power`
  during the lift window (A3) = the snapmare reversal. `action` keeps the Stage 4b endings (attacker shove-off, defender switch).
  Read `_waistlockEndings` first and route the new inputs through it, so one place owns every way out of the hold.
- **A2. The atomic drop** (`src/animation/clips/atomicDrop.js`, a two-track clip like `suplex.js`, run by MoveRuntime from the
  hold pose with the Stage 3 lead-in, 0.14 s). Beats: (a) **lift**, about 0.30 s: the attacker straightens from the A-frame,
  the defender rises with `lift`, legs hanging, the attacker's hands stay at his waist (`holdGrips`, W5's points); (b) **drop**,
  about 0.12 s: the defender comes down seated; the attacker's near knee comes up (the `kneeLift` pose, `knee_chamber` parts as
  `kneeLift` uses them) so the defender's pelvis meets it on the impact frame; (c) **sell**: the defender pops forward off the knee,
  hands to his backside, and stumbles forward on his feet (reuse T4a.2's stumble or `staggers.js`; read which one fits first). He
  stays standing: it is a middle-tier move, not a knockdown. Damage `atomicDrop: 12` in `STAMINA_DRAIN`, sell `{ part: 'back',
  intensity: 0.7 }`. The hold ends through `_endWaistlock` when the clip takes over (state no longer `lockup`).
- **A3. The reversal window.** From the lift's start until 0.20 s in (a constant, `ATOMIC.reverseWindow`), before the defender
  is past the top. Late input does nothing. The attacker can't chain the drop: one try per hold.
- **A4. The snapmare** (`src/animation/clips/snapmare.js`, roles swapped: the old defender is the clip's attacker). Beats:
  (a) **land and reach**, about 0.15 s: the lift reverses, his feet come down, both hands go back over his shoulders to the
  attacker's head (`holdGrips` at the head; Stage 2's hand art is not made, so use the base hands and report the contact in px);
  (b) **the pull**: he drops to his near knee and pulls the head down over his near shoulder; (c) **the flip**: the thrown man
  goes over in a forward whole-body rotation (the `tilt` track, like the suplex defender's 0 -> 4.76, but forward: one full turn
  plus the landing angle), path arcing **above** the thrower's shoulder line, not through his torso; (d) **landing**: flat on his
  back in front of the thrower, on the thrower's facing side, into the existing down state with a forced back sell
  (`{ part: 'back', intensity: 1.0 }`). Damage `snapmare: 16` (a reversal is a big spot, more than the drop it stopped).
  The thrower gets up from the knee with the existing rise. No new parts: base parts rotated only. If a beat can't be posed
  without a new part, report the frame and what is missing; no art request without Derek.
- **A5. Layering.** The thrown man starts upstage (behind, W3). Use `clipLayers` windows: whole body behind the thrower until the
  flip's top, in front after it. Near arm over the shoulder in front of the thrower's head through the pull.
- **A6. Room.** The snapmare lands the man about one body length forward. If that spot is past the ropes
  (`behindSpotFits`-style check on the landing x, both facings), the reversal is denied and the drop completes. Report how often.
- **A7. D12 during the flip.** D12 (no overlap) was written for standing contact. A body flipping over a shoulder may cross the
  thrower's head or shoulder in screen space. Measure masks every frame and report the overlap frames raw; do not waive D12 and
  do not claim draw order fixes it. Derek judges the exact frames at G4c-a.
- **A8. Kits and AI** (T4c.5, after G4c-a). Registry ids `atomicDrop` (slot `waistlockPower`) and `snapmare` (slot
  `waistlockReverse`), both in `KIT_SLOTS`, in the Lou and George kits. Odds in `KIT_AI_ODDS`: `atomicDropOdds` Lou .25,
  George .30; `snapmareOdds` (defender, rolled once per drop) Lou .25, George .10. First drafts.

**Measures** (numbers, not judgements; px/frame at 60 fps, both facings, both attackers):
the lead-in's first-frame max part step against the tie-up's worst (32.6 px); the defender's pelvis to the attacker's raised knee
on the impact frame (px); the snapmare hands to the head (px); the flip's total rotation (rad) and the landing frame; the landing
x against the ring bounds; `grapples_masks.mjs` overlap every frame, flip frames listed separately; planted soles of the
standing man against the 2.5 px/frame limit.

- **T4c.1 Pure data.** `ATOMIC` constants (beat times, `reverseWindow`, damage keys) and the landing-room check in
  `src/animation/waistlock.js` (or a sibling `waistlockThrows.js` if it gets long), with tests. Pure, like `lockup.js`.
- **T4c.2 The atomic drop**, flag on: input (A1), the clip (A2), damage and sell, `_endWaistlock` handoff. Browser check: the
  drop from the hold on both rigs, both facings; a match end mid-clip leaves no state (rerun `waistlock_cleanup.mjs` plus a
  drop case). Focused tests. Commit locally; no stop.
- **T4c.3 The snapmare reversal**: window (A3), clip (A4), layering (A5), room (A6). Browser check: reversal inside the window,
  late press ignored, denied near the ropes. Focused tests, `grapples_flagoff`. Commit locally; no stop.
- **T4c.4 G4c-a page** `research/animation/grapples-2026-10/g4c-a/index.html`: one normal-speed loop strip per move, Lou on
  George, both facings (four strips), each through 8 frames after the man is back up or down; misses first, then the
  measures. Commit locally, **STOP at G4c-a**: Derek judges the drop, the flip and the A7 frames.
- **T4c.4b G4c-a fixes (Derek 2026-11-03).** Frame numbers below are `g4c-a/frames/snapmare-lou-george-r` (George throws Lou).
  1. **Lift higher.** The drop's lift peaks at `lift: 55` (`atomicDrop.js`, key at `L`). Raise it so the defender's pelvis rises to
     about the attacker's chest (try ~100; report the pelvis height over the attacker's pelvis at the top, both rigs). Lengthen `L`
     only if the speed looks wrong to you; `reverseWindow` stays 0.20. The snapmare starts from the drop's lift **at the moment of
     the reversal** (today its first key assumes `lift: 20`): read the live value, so a higher lift doesn't pop. Report the first-frame step.
  2. **One flip.** `SNAPMARE.turns = 0` (270 degrees, flat on his back). Keep the flip's duration; report the peak and rad/frame.
     Lower `PEAK` only if the single turn looks floaty at 110; say what you chose.
  3. **The thrower's arms over the thrown man** (Derek's note), frames ~124-132: George's near forearm and hand draw in front of
     Lou's inverted torso and face during the flip and the landing, and in 132 his arm crosses Lou's chest up to his own chin. The
     A5 window puts the thrower behind from mid-pull, so find why the arms escape it (an arm part missing from `order`, `holdGrips`
     stacking after the clip, or the arm segments drawn by a different key) and report the cause before the fix. Through the flip
     and landing the thrower's arms draw behind the thrown man.
  4. **His arms hang out after the snap** (Opus, same frames): from the landing (~136) to ~150 the thrower's arms stay stretched
     forward at the fallen man. Once the head grip lets go, the arms follow through and drop to his sides within 0.2 s as he rises.
  5. **His boot lands on the man's head** (Opus, frame ~150): the thrower's rise from the knee plants his near boot over Lou's head.
     Report the boot-to-head distance after the landing; the rise steps clear (or the landing goes a little further: `landFwd`).
  Redo the four strips on the G4c-a page (keep the old ones below, labelled), misses first, these five measured. Focused tests,
  `waistlock_throws_assert`, `grapples_flagoff`. Commit locally, then go straight on to Stage 4d (Derek's order).
- **T4c.4c The far arm (Derek 2026-11-03).** In `snapmare.js` `layers`, each man's arms are listed anatomically (`lArm`, `rArm`) after
  his own torso, so his far arm draws in front of his body, in one facing or the other, until the window ends and normal stacking puts
  it back: Derek's "Lou's back arm pops in front of his torso". Rebuild both windows per facing like W4 (`waistlockLayerOrder`
  resolves near/far): each man is far arm, far leg, torso, head, near leg, near arm, and the window order between the two men stays
  as A5. Lying on his back after the landing, the thrown man's far arm stays behind his torso to the end of the clip and after it (no
  pop at `D`). This is very likely also r2's "his own arms crossing his chest" (item 3): recheck that frame after the fix, don't
  change the tuck. Measure: far-arm pixels drawn over his own torso, every frame, both men, both facings (want 0), and the
  depth order on the last clip frame vs the first frame after. Read the atomic drop for the same pattern (it has no `layers` today:
  say what its arms do). Gates: focused tests, `waistlock_throws_assert`, `grapples_flagoff`, and **`grapples_assert`** (Codex's
  `exitBlendPose` change reaches every default tie-up exit). Add the strips to the r2 page as r3, commit locally, then on to 4d.
- **T4c.4d Knees bend the right way, and a guard so no move breaks one again (Derek 2026-11-03, before 4d).**
  1. **Fix the lift.** The lifted man's legs hang: thighs a little forward, knees softly bent with the heels *behind* the knees,
     the way a man's legs hang when he is lifted by the waist. Fix the atomic drop's defender keys (`lKnee`/`rKnee` 0.35 / 0.30
     at `L`, 0.6 at `I`, and the rest) by the rendered result, not the sign you expect. Check the snapmare's flip tuck (`lKnee`
     0.4 -> 1.6) and the thrower's kneel (`rKnee` 1.4) the same way.
  2. **The guard, a permanent check.** `tools/debug/clip_knee_audit.mjs`, built on `limb_limits_audit.mjs`'s rendered-joint
     reading (flex off the drawn hip, knee and ankle, front taken from the torso, so it holds lying or upside down): for **every
     clip in `src/animation/clips/index.js`** plus the waistlock hold, the sleeper's poses when they exist, and the get-ups, sample
     every frame at 60 fps, both facings, on Procreate Lou and `george-roster-v1`. Fail on any knee hyperextended past -0.25 rad
     or flexed past 2.55; also report elbows the same way. Print each failure as move, rig, facing, frame, joint and angle.
     First run: report every existing failure in the shipped moves as a list for Opus, and **don't fix those here** except the
     two waistlock throws. Add a baseline file like the coverage one so old failures are listed but new ones fail.
  3. **Make it a gate.** Add `clip_knee_audit` to the gates of every G-package from now on (T4c.6, T4d, all later stages) and to
     the Rules section's checks. A move that bends a knee backward doesn't go to Derek.
  Write the convention down once, where an author will see it: a comment block at the top of `src/animation/clips/index.js`
  (which sign of `lKnee`/`rKnee` folds the heel back on the upright path, and that the clamp doesn't protect the art). Strips of
  the fixed lift both facings on the r2 page as r3 (with T4c.4c), knee angles listed per frame. Commit locally, then on to 4d.
- **T4c.4e Snapmare faster, Lou carried further (Derek 2026-11-03).** "Lou should travel a little more with the snapmare and it
  should probably be 2x speed, or 1.5x." Put the speed in one constant (`SNAPMARE.speed`, scaling reach, pull and flip; the
  thrower's rise after the landing can stay as is) and the travel in `landFwd` (215 today: try about 260, keep A6's ring check
  and the boot clearance of T4c.4b). Make the r3 snapmare strips at **both 1.5x and 2x**, side by side, both facings, and list for
  each the flip's rad/frame, the peak, the landing x and the boot-to-head gap. Derek picks; ship 1.5x in code until he does.
- **T4c.4f The lift is a fridge lift, not a toddler lift (Derek 2026-11-03).** "Lou lifts him like he's a toddler; normally they
  wrap them up and lift them kind of like a fridge, meaning it's more back than arms." Today the attacker's arms rise (`lArm` 0.7 ->
  1.0) while his body only straightens. Rebuild the drop's first beats:
  - **Wrap** (in the lead-in): he steps in from the A-frame, chest to the defender's back, both arms locked tight round the waist
    (forearms level across the belly, hands together in front), and **sits into a squat** (knees bent the right way: T4c.4d's audit).
  - **Lift with legs and back:** the knees drive straight, the hips come forward and the torso **leans back**, and the defender rises
    *with* his chest, pressed to it. The arms stay locked: shoulder and elbow fixed relative to his torso through the lift (the arms
    don't do the lifting). His feet stay planted. It is heavy: slower off the floor, a small hitch at the top before the drop. Keep
    `reverseWindow` 0.20 s from the lift's start; say if the new lift's timing makes that window feel wrong on the strips.
  - The defender's legs **kick up** as he goes up (Derek 2026-11-03: "George's legs would kick up higher too"): as his weight tips
    back onto the attacker's chest his feet swing forward and up, thighs well forward of his hips at the top (knees bent the right
    way, T4c.4d), then they drop for the seat on the knee. Report his thigh angle from vertical and his feet's height over the mat
    at the top of the lift.
  - Check first which sign of `bend` leans the torso back on this rig (`lean` isn't drawn); read it off the render.
  - **D12:** a wrap is chest to back. Keep the attacker's hips a half step back as long as possible (lean, don't step under early)
    and report below-the-belt and torso overlap per beat; Derek judges those frames (A7). Don't hide them with layering.
  Measures: his hands' position relative to his own torso through the lift (want near constant: locked arms); his torso angle from
  vertical at the top; the gap from his chest to the defender's back (px); his planted soles against 2.5 px/frame; the knee audit.
  On the r3 page with the other fixes, old lift strip beside the new one.
- **T4c.5 Kits, AI, soak** (A8), after G4c-a. `grapples_soak.mjs` with `waistlock=v1`, one pair at a time (two at once crashed in
  T4b.4): drops, reversals, denied reversals counted; fail on page errors, `orphanRescue`, stuck states.
- **T4c.6 G4c page**: strips of both moves, both attackers, both facings; table, misses first. Gates: focused tests,
  `grapples_assert`, `grapples_flagoff`, `waistlock_assert`, `waistlock_cleanup`, full suite, build, coverage (report the new
  count), `moves:kits -- --check` (regenerate the `MOVE_CATALOG.md` block with `git add -p`; other sessions' edits are in it).
  Progress lines, Status. Commit locally, do not push, **STOP at G4c**. Never promote `waistlock`.

## Stage 4d: a real sleeper from the waistlock, and the small snapmare (Derek 2026-11-03), stop at G4d-a, then G4d

Written in full, for Sonnet. **Order (Derek 2026-11-03): Sonnet starts T4d.1 as soon as 4c stops at G4c-a, without waiting for
the G4c-a verdict.** When Derek's G4c-a answer arrives, its changes come first, then T4c.5-T4c.6, then back to 4d. Derek: "our current sleeper hold is not a sleeper hold at all."
Today `_doSleeperHold` (`src/Wrestler.js:2897`) is applied **from the front** (finisher input, 120 px reach), and `_tickSleeper`
pins the attacker 50 px in front of the defender's face with two pose tweens. A sleeper is a rear hold: the attacker behind,
his near arm round the neck (crook of the elbow under the chin), the other hand pushing the head into it, and the defender sinking.
The waistlock already gets the attacker behind, so the sleeper starts from there. Stays behind `?waistlock=v1`; flag off
byte-identical (the old front sleeper remains for flag off).

**Decisions (Opus; Derek can overrule at G4d-a):**
- **S1. Input.** In the waistlock hold, the attacker's **finisher** input = sleeper (the key the old sleeper uses; `power` is the
  atomic drop, `action` the shove-off). With the flag on, the front sleeper in `tryFinisher` is **off**: the sleeper only comes
  from behind. Read `tryFinisher` and the AI's `_attack('finisher')` (`AIHandler.js:475`) first and report every path that reaches
  `_doSleeperHold`.
- **S2. Keep the gameplay, replace the look.** `_tickSleeper`'s drain (4.5/s), z text, `tryEscape` mash, `_comeback`, rope
  break and the slump to `down` stay as they are. What changes is the entry (from the hold, through `_endWaistlock`), the spacing
  (behind, like W3, not 50 px in front) and the pose.
- **S3. The pose** (pose keys in `waistlock.js` beside `WAISTLOCK_POSES`). Attacker: chest close behind the
  defender's upper back, near arm over the near shoulder and round the neck, far hand at the back of the head.
  **The wrap needs new art (Derek 2026-11-03):** the choking forearm runs across the throat *into depth*, perpendicular to the
  picture, and a side-painted forearm rotated in 2D can't show that. So the near arm is the base upper arm (along the near side
  of the defender's neck, elbow under his chin) plus a new **`forearm.sleeper_wrap`** variant: the elbow crook under the chin,
  the forearm foreshortened going away from the camera across the throat, the hand hidden behind the far side of the neck.
  Made like `forearm_grip.png` (`src/characters/thesz_procreate_v1.js` `variants.forearm`): same 117x351 canvas and elbow
  pivot as `forearm.png`, so it swaps in by variant with no rig change. **One drawing for every rig (Derek 2026-11-03):** it is
  mostly the elbow crook and a short foreshortened stub, so one master is fitted to each rig's forearm canvas, not regenerated.
  Lou and George both at G4d-a. T4d.0. Defender: chin up, both hands up pulling at the choking forearm, knees soft. D12 still holds below
  the belt: the attacker stays upstage and a half step back at the hips (lean in with `bend`, not the feet). The torso can't keep
  the A-frame's gap and still reach the neck: measure torso overlap every frame and report it; if it can't be 0, show Derek the
  frame at G4d-a and ask, as A7.
- **S3b. The defender's arms fight, flail, then go limp (Derek 2026-11-03).** In Codex's T4d.0 still, George's far arm is
  folded into his own torso ("all mangled"): that is a miss, in the still and in any game frame. The arms tell the story of the hold:
  - `z` **fight**: both hands up at the choking forearm, prying (the near hand on it, the far hand reaching up behind it on the
    far side), elbows out, small fast tugs.
  - `zz` **flail**: the grip breaks; the arms swing and reach, uneven and off-beat, a hand slapping at the forearm or the
    attacker's head, then slower each time. Authored loops with a seeded pick per swing so it never repeats in step, not one
    sine.
  - `zzz` **limp**: the hands slide down and the arms hang dead from the shoulders, swaying with the body's sink.
  - An escape tick brings them back up one stage (limp -> flail -> fight), so the mash shows in the arms first.
  Far arm rule: the far upper arm and forearm stay outside his own torso outline (the G8 forearm-in-torso count, want 0
  pixels) or are hidden behind the attacker; never folded into his chest. Measure that every frame, both facings, both rigs.
- **S4. The sink.** The z stages drive it: `z` standing, `zz` the defender's knees bend and his hands slow, `zzz` he is down to his
  knees (get-ups' `KNEEL` key as the target) and the attacker follows him down into a crouch. An escape mash rises him back a stage
  (one stage per successful `tryEscape` tick, no instant pop). The final slump to `down` (prone) goes from the knees.
- **S5. Layering.** W4's order, except the attacker's near arm draws in front of the defender's head and neck; his far hand behind
  the head.
- **S6. Reversal: the small snapmare.** The defender's `power` while at `z` or `zz` (not `zzz`: too far gone). He grabs the arm at
  his neck, drops to a knee and snaps the attacker over the shoulder. **Small** = not 4c's flip: about a half turn, the thrown man
  lands **seated** (`pileSit`-like, legs forward, back to the thrower), stays seated a beat (0.8 s), then rises with the existing
  get-up. Build it from 4c's snapmare clip with one option (`flip: 'full' | 'small'`), not a second copy. Damage `snapmareSmall: 7`,
  sell `{ part: 'back', intensity: 0.5 }`. A6's room check applies. While he is seated, the thrower gets one free move:
  later stages fill it (a rear chinlock, a kick to the back); for now he just gets up first.
- **S7. AI.** The attrition AI used to sleeper from the front; with the flag on, its sleeper hunt goes tie-up -> go-behind ->
  sleeper. `snapmareSmallOdds` (defender, rolled each z stage) Lou .20, George .10. Registry: `sleeperHold` gets a second trigger
  line for the flag; `snapmareSmall` in the Lou and George kits, slot `sleeperReverse`.

**Measures:** the attacker's near hand to the far side of the defender's neck (px), every frame of the hold; below-belt and torso
overlap every frame; the step from the waistlock hold into the sleeper (first frame, max part) against 32.6 px; the sink's knee
angles at each z stage; the small snapmare's rotation (rad), seat landing frame and landing x against the ring.

- **T4d.0 (Codex, art; can run now, alongside 4c)** `forearm.sleeper_wrap` per S3, **one master, fitted to each rig**:
  1. Generate one master donor (Lou's style is the bar), saved with a REPORT.md under
     `Sprite sheets/AI Pilot/shared/articulation-donors/2026-11-03-sleeper-wrap-v1/`.
  2. A fit script, like `tools/debug/build_george_grip.mjs`: per rig, scale the master whole-canvas onto that rig's `forearm.png`
     canvas (Procreate Lou 117x351, `george-roster-v1` 426x439; never a tight bbox), line the crook up with the rig's elbow pivot,
     keep the rig's own elbow-cap pixels (as the George grip kept its original elbow), and match the line weight and tone to the
     rig's base forearm. Output `forearm_sleeper_wrap.png` beside each rig's `forearm.png`. One command rebuilds both.
  3. Stills: Lou choking George and George choking Lou, base upper arm, both facings (four), at 1x and 3x. The defender's arms
     in the S3b `z` fight pose (near hand prying the forearm, far hand up behind it), never folded into his torso. List misses
     (seams at the elbow, line weight, tone) in px; no "reads" claims.
  If George's fit fails Derek's eye, then and only then a George-specific donor. Derek approves before it is wired
  (T4d.2b: `variants.forearm.sleeperWrap`, `semanticAnchors.crook` at the inside of the elbow, per rig). Art and the fit script only: no
  game code, don't commit on top of Sonnet's work, don't push.
- **T4d.1** Pure data: sleeper pose keys and spacing, the z-stage sink targets, `flip: 'small'` option values, tests.
- **T4d.2** The sleeper from the hold (S1-S5) and the defender's arms (S3b), flag on, flag-off identity. **The wrap art is not
  approved yet: build with each rig's base forearm**, the pose asking for `workingHand`/variant `sleeperWrap` so it falls back to the
  base forearm when no such variant is registered. Don't install or register Codex's PNGs. Browser checks: escape, rope break, slump, match end
  mid-hold leaves no state (`waistlock_cleanup.mjs` gets a sleeper case). Commit locally; no stop.
- **T4d.2b** Only once Derek has approved the T4d.0 art (it will be in the Status): register `sleeperWrap` per rig from the fit
  script's output, measure the crook to the defender's neck (px) both facings, commit. If not approved by T4d.4, skip it and
  say so on the page; the G4d-a strips then show the base forearm.
- **T4d.3** The small snapmare (S6), after 4c's snapmare clip (T4c.3). Commit locally; no stop.
- **T4d.4** G4d-a page `research/animation/grapples-2026-10/g4d-a/index.html`: normal-speed loops, Lou on George, both facings:
  sleeper through the sink to the slump; sleeper escaped; small snapmare. Misses first. **STOP at G4d-a.**
- **T4d.5-T4d.6** after G4d-a: AI and kits (S7) and a one-pair soak; G4d page and the full gates as T4c.6. **STOP at G4d.**

## Stage 4e: wristlock chains (Derek 2026-11-03), outline, written in full after G4d

Derek: the sleeper "could be reversed into ... longer wrist locks that can lead to a follow-up or reversal." The idea is a chain of
standing holds that pass back and forth, the 1950s technical style (Lou is the bar).
- **Entry:** the defender in a sleeper (or waistlock) peels the arm off and turns out into a **wristlock** on it. Likely also from
  the tie-up later (`MOVE_CATALOG.md` 2b lists wristlock and arm wringer as lockup transitions).
- **The hold:** longer than the waistlock (a working hold, a few seconds), the held man bent, selling the arm, stamina drain.
- **Follow-ups for the holder:** into `hammerlock` (built), `armDrag` (built), an arm wringer, later the mat `armBar`.
- **Reversals for the held man:** roll/turn through and take a wristlock back (roles swap, like the switch, with the steal hitch so
  it can't chain every frame); maybe a reversal into a go-behind, which closes the loop to the waistlock.
- **Questions for Derek before it is written:** how long a wristlock may last; how many swaps a chain may run before someone has
  to break it; which follow-ups first; whether the held man can strike out of it (a back elbow).

## Stage 4f: the German suplex, then the bridging German (Derek 2026-11-03), outline, written in full after G4c

Derek picked the German from 4b's "later" list (back suplex and rollup still wait). Behind `?waistlock=v1`, from the hold.
- **Input:** to decide when written; the hold's `power` is the atomic drop, so likely `power` with up held, or the finisher key
  once the sleeper (4d) has its own. Settle it with 4d's S1 so the keys don't collide.
- **4f-1, the German (release):** the attacker keeps his waistlock grip, drops his hips and arches back; the defender goes over
  backward, a full rotation like the suplex clip's defender `tilt` (0 -> 4.76) but from behind, and lands on his shoulders and
  upper back, then flat into the down state with a big back sell. The attacker lets go at the top of the arch and rolls or sits
  back out of it. Damage near `suplex` (20); a late-match move (MOVE_CATALOG 2b tiers: earned by wear-down).
  New `germanSuplex.js` clip, two tracks, base parts. Reversal window like A3 if Derek wants one (back elbows, or landing on his feet).
- **4f-2, the bridging German ("eventually"):** the same throw, but the attacker doesn't let go: he holds the arch as a bridge
  (head and feet on the mat, belly up) with the defender's shoulders pinned, and the count goes straight in through
  `Arena.startPin` (`Arena.js:3283`, the Thesz press's path) with a bridge pose in place of `pinHold`. The kick-out breaks the
  bridge: both men fall flat.
- **Risk to check first:** a full bridge (torso upside down, head on the mat, knees bent) has never been posed on these rigs. `bend`
  is the only torso pitch that draws (`lean` isn't drawn), so the bridge likely needs whole-body `tilt` plus `bend` plus knee
  angles. 4f-2 starts with a one-pose spike on Procreate Lou, both facings, shown to Derek before any throw is built on it. If base
  parts can't hold a bridge, report the frame and what's missing; no art request without Derek.
- **D12 during the throw:** as A7: overlap frames reported raw, Derek judges.

## Later stages (outline, written in full after G1)

- **Stage 2: hands and the steal.** A Codex art request from Derek's G1 hand list. Likely: a hand gripping the back of a
  neck, partly hidden; a hand cupping an elbow; a forearm across the collarbone. Lou's `sellart` grip may cover some of
  these. Then the steal as a visible shove, with a re-grip if Derek wants D5 changed.
- **Stage 3: every exit starts from the tie-up.** Headlock, whip, suplex, hip toss / arm drag, hammerlock, and
  piledriver / slam each get a lead-in from the Stage 1 pose. The (e) jumps are the work list.
- **Stage 3c: whip routes (Derek 2026-10-31: "eventually").** Corner whips and diagonal runs that land where they were aimed.
  Whip direction, timing and diagonals approved by Derek 2026-10-31. T3c.6-T3c.7 done, stopped at G3e (Derek judges the corner strip). All of it stays under `grapples=v1`; flag off stays identical.
  - **T3c.0a The beat before the run (Derek 2026-10-31: "he does the motion, then there's a beat, then George runs"; written in
    full, ready for Sonnet).** Measured Lou on George, facing right: both men's big motion ends by 133 ms, the exit blend's end
    (`LOCKUP.exitBlend.default`, 140 ms). Attacker peak part step is then under 5 px/frame, defender's falls to 0 at 250-300 ms,
    and the run starts at 317 ms: 184 ms with almost no motion. Cross-body shows the same gap before its 400 ms release, plus a
    one-frame pop at 267 ms (attacker 74.0, defender 47.5 px): both auto-face as the receiver passes (`move()`,
    `src/Wrestler.js:911`).
    In `_doIrishWhipLeadIn` (`src/Wrestler.js`, Codex's uncommitted candidate):
    1. Build the throw so the arm snap lands as the exit blend ends: start from whipGrab 60, whipLoad 60, whipRelease 60,
       whipFollow 120 ms for this path only, leaving `MOVE_DEFS.irishWhip` as it is (flag off must not change). Cross-body adds
       60 ms to whipLoad. Name the two release times as constants: same-side about 170 ms, cross-body about 240 ms.
    2. Fit the rest to them: the receiver's `tweenPose('idle', 220)` and the attacker's 220 ms y step to at most the same-side
       release, and the receiver's cross-body x tween already follows `releaseAt`.
    3. Fix the pop: skip the auto-face at line 911 while `this._whip` is set. Only this candidate sets `_whip`, so flag off is safe.
       Check the attacker still ends up facing the right way once the sequence ends.
    4. Update `tests/irish-whip.test.js` (it asserts 310 and 400), then rerun `tools/debug/whip_direction_proof.mjs`. Add a
       frame table to it: attacker and defender peak `partSteps` per frame from the press to 300 ms after release.
    Done when: direction proof 8/8; release at most 183 ms same-side and 250 ms cross-body; no more than 3 frames in a row between
    press and release with both men under 3 px/frame; no pop after the blend (nothing over 30 px between blend end and release).
    Report the new first-run peak (54.6-65.8 now): the turn gets closer to the exit blend, so it may rise. Flag-off check identical,
    focused tests only. If the throw now feels rushed, try 200 / 270 before anything else. Commit locally, then STOP for Derek.
  - **T3c.0b The attacker's turn on the cross-body whip (Opus review of a4ba0e1; written in full, ready for Sonnet).** The facing
    lock did not remove the 74 px pop, it moved it: Lou on George cross-body, the attacker stays facing the old way, arms reaching
    away from the receiver, until `_whip` clears at the end of the sequence, then flips in one frame at 583 ms (58.7 px). The proof's
    frame table stops at 550 ms, so T3c.0a's check could not see it. In `_doIrishWhipLeadIn` (`src/Wrestler.js`):
    1. Derek 2026-10-31: "he should flip just as George is running away to make it look like he generated the force with his
       flip, rather than throwing him, standing a beat, then flipping." The flip is what throws him. On cross-body, set
       `this.facing = dir` inside the release callback, in the branch that sends the receiver running, so the turn shares the
       frame with the run's own first-frame step and `whipFollow` reaches after him. Check the attacker's and receiver's flips are
       on the same frame, and that the arm's follow-through keeps moving after the flip with no hold. Same-side needs no turn.
    2. The lock can stick: the sequence's `onDone` is the only thing clearing the attacker's `_whip`, and a superseding `tweenPose`
       kills it, leaving him never auto-facing again. Change the check at `move()` so the lock only holds while the state is
       `slamming` or `grabbed`, and add a test: interrupt the attacker, then confirm auto-face works.
    3. Extend the proof's frame table to 800 ms after the press, and report the largest attacker step after release.
    Done when: direction proof 8/8; after release, no attacker step over 30 px except on the release frame; report that frame's
    value; 4 existing whip tests plus the new one pass; flag-off check run and reported (a4ba0e1 does not mention it). Commit locally, STOP.
  - **3c.0 Cross-body pull: on the polish list (Derek 2026-10-31 "it looks good now").** The hip overlap and missing wrist contact
    stand unless he raises them. Do not work on them now.
  - **T3c.1 A run follows a line (full task, Sonnet).** All of T3c.1-T3c.4 sit behind `grapplesCandidate()`; flag off stays identical.
    In `src/Wrestler.js`: add `runTargetY` (null = today's flat run). In `tickRun`, when it is set, keep x at today's speed and
    set y from x progress between the run's start and target, so the line is straight and the foot lock, which reads x travel, is
    untouched. Mid-ring to a corner is 12-19 degrees on screen, so the two facings hold; facing stays the sign of x.
    Steep case: if |dy| / |dx| is over 0.5, slow x so y never moves faster than 0.5 x speed; the line stays straight. If dx is
    0, use the chosen direction's sign. Read the rope's x at the target y (`ringBoundsAtY`), not the start y: the side ropes slant.
    Unit tests: end point reached exactly, straight line, both slopes, the steep case, null is the old path. Check both
    gaits (default and `?gait=v2`).
  - **T3c.2 Depth gates (full task, Sonnet).** Do this before any diagonal can happen in play. These test x only and work only
    because a runner shares the attacker's y: clothesline and back body drop (`tryAction`, `src/Wrestler.js:1409`), double axe
    handle (`tryRunningAttack`), dropkick's impact, and the AI's rebound check (`src/AIHandler.js:430`). Flag on, also
    require `Math.abs(other.y - this.y) < 48` (the code's existing half-depth figure; the whip's own 22·s step must pass). Search for any other
    x-only test on a `running` target and list it in the report. Test: runner 100 px away in depth is not hit; same depth still is.
  - **T3c.3 Diagonal input and the corner route (full task, Sonnet).** In `Arena` `_tickLockup`'s follow-up chain
    (`src/scenes/Arena.js`, the `goDown` / `goUp` branches), before those branches, flag on: up or down held with left or right,
    and the kit has `irishWhip`, calls `_doIrishWhip(defender, dir, depth)` with depth -1 for up, +1 for down. Plain up, down, left and
    right keep today's moves. Stored buffer input already holds all four (T1.9). The AI holds one direction, so it is unaffected.
    Risk to report: a player walking diagonally now gets a whip, not the suplex or headlock.
    `_doIrishWhipLeadIn` gets `depth`. The same-side / cross-body logic and release times are unchanged. At release, a non-zero
    depth sets the target to that corner: y = `RING.farLeft.y + 6` or `RING.nearLeft.y - 6`, x = rope at that y, 20 px in, and
    `runPhase = 'toCorner'`. Move the corner table out of `_nearCorner` so both share it. In `tickRun`, arrival at `toCorner`
    logs `cornerHit`, calls `triggerRopeBounce` on the far or near side as fits, and for now calls `startStagger()` as a stand-in for
    the daze. Direction proof: 2 rigs, 2 facings, 4 corners, real input; each must end within 2 px of its corner point.
  - **T3c.4 Runs and rebounds on a line (full task, Sonnet).** `toRope` arrival flag on: `returning` gets `runTargetY` = the
    attacker's y at that moment, clamped to the ring, x read at that y, so the return meets him wherever he stepped. A run with no
    opponent move is unchanged: same y means a flat line. `tryRun` flag on: up or down held aims the rope point 70·s px up or down the
    ring, clamped. Test the clothesline on the return with the attacker 60 px off the runner's y. Then a normal-speed strip, both
    facings, all four corners and a rope rebound, on the whip viewer. Full suite, build, coverage at this gate. Commit locally,
    **STOP at G3c** for Derek: does the diagonal read, and is up/down + left/right the right input.
  - **T3c.5 Rope hit (full task, Sonnet; flag on only).** Derek 2026-10-31: "hitting the ropes is actually painful ... rather than
    just switch running directions"; then "the way they presently hit the turnbuckle is also how they should hit the ropes". The
    current corner hit is the reference: he arrives with no flip, still facing his run, and plays the first step of
    `staggerFor(this.stamina)`, the pose plus its `dx` travel back off the rope, so harder hits show on a worn man.
    In `tickRun`'s `toRope` arrival: do not flip. Set `runPhase = 'ropeRecoil'` and play that first step, with `_choreoUntil` set
    as `_runStaggerSteps` does so the run gait does not draw over it. The x tween stops if the state leaves `running`. While
    `ropeRecoil`, `tickRun` only counts down and returns. At the end, run today's flip block: `runFacing`, `facing`, the walkPhase mirror,
    `runTarget`, `returning`, `_setRunLine` to the attacker, then `moveBlend = 0`. Self-started runs use the same path. `ropeRecoil`
    is not `returning`, so nobody can clothesline him during it. Side ropes already bow through `_ropePresses`: confirm he is
    still inside the press during the hit. No stamina cost. Flag off identical.
    Tests: recoil before the flip, return line reads the attacker's y at the end of the recoil, dropkick during the recoil leaves
    no stuck phase. Report recoil length per stagger type and the flip-frame step. Strip: Lou and George, both ropes, fresh
    and worn, normal speed. Focused tests. Commit locally, **STOP at G3d**. Note for Derek: this hit is front-on, his first note said back-first.
  - **T3c.4b The return passes through the attacker (full task, Sonnet; flag on only; Codex review 2026-10-31).** T3c.4 was specified
    wrong: `_setRunLine` aims at the OPPOSITE ROPE at the attacker's y, so the runner reaches that depth at the rope, not at the attacker's x.
    Reproduced: receiver at y 300, attacker y 430, x 400: 62.3 px off at the crossing, outside the 48 px gate; x 600: 100.7 px.
    `tests/rebound-line.test.js` passes because 60 px at x 300 fits the gate. Fix:
    1. At launch off the rope, snapshot the attacker's x AND y once. Do not home on him; a sidestep after that must still work.
    2. Two segments: launch point to the snapshot point, then flat at that y to the rope (`_setRunLine`). Add a one-shot waypoint in
       `tickRun`: arrival at it starts the second segment instead of ending the run. Phase stays `returning` throughout.
    3. Limits: slope over 0.5 clamps the waypoint's y toward the runner to a slope of 0.5, so the run keeps its speed and a man far off
       in depth and close in x can be missed. Attacker behind the runner, or within 60·s px in x: today's single line, no waypoint.
    4. Same y stays the old flat run, flag off identical. `_setRunLine`, `_runLineSlow` and corner runs are unchanged.
    Tests: vary attacker x AND y, both ropes, both gaits, and assert y error at the frame crossing the attacker's x (under 3 px within
    the slope limit), not at the endpoint or through an attack window. Replace the weak T3c.4 test. Clothesline connecting is a separate test.
    Each commit message and report gives what the check proves. Commit locally, no stop: go on to T3c.5b.
  - **T3c.5b Back into the rope, taut, sprung out (full task, Sonnet; flag on only). Replaces T3c.5's `ropeRecoil`.** Derek at G3d:
    "a little better... he needs to hit the rope with his back then the rope kind of gets taut, then it springs him forward, it needs
    to be noticeable." This overrides the front-on hit for ropes. Why T3c.5 was weak: he travels 15-17 px for 117-183 ms, and the side
    rope bows 8 px at most (`warpX`, `src/scenes/Arena.js:2412`). The body and the rope both need to move much further.
    Put the timeline in a pure module, `src/animation/ropeHit.js`, with tests: `ropeHitAt(ms, stamina)` returns body offset, tension
    and phase. All values are starting points, in rig px times `this.s`; drive it from a timer in `tickRun`, not tweens, so an
    interruption cannot strand it. Phases:
    1. **Turn:** 40·s px before `runTarget`, flip to face away from the rope using today's flip block (walkPhase mirror included)
       and carry on at run speed, so his back arrives first. Report the flip-frame step BOTH ways: raw and mirrored (T3c.5's raw was 99.8-139.7 px, mirrored 12.2-23.1; the mirrored number alone does not show a smooth turn).
    2. **Load, 170 ms:** at `runTarget` he keeps going, 34·s px past it, easing out as the rope takes his weight (`Cubic.easeOut`).
       Tension 0 to 1. Pose: `bend` back into the rope, arms flung out; hands to the top rope through `holdGrips` `at` if they reach.
    3. **Taut, 70 ms (110 ms worn, stamina under 45):** full depth, tension 1, a 1 px tremble, nothing else moves.
    4. **Spring, 110 ms:** tension releases and he is thrown back to `runTarget` with `Cubic.easeIn`, pose `bend` forward, arms trailing.
       The rope overshoots inward about 10 px and rings out over about 400 ms: use a spring like `_updateRopes`' sag, per side.
    5. **Launch:** at `runTarget` start `returning` on the T3c.4b route (snapshot taken here, at launch), with `moveBlend` from .7, not 0, and
       `_runBoost` from 1.7 down to 1 over 260 ms. The boost must reach `travel` as well as x, or the feet skate under `?gait=v2`.
    Rope: `_ropePresses` reads the tension only while `state === 'running'` in these phases, so an interrupted hit clears itself. Side bow
    becomes `(8 + 30 * tension)`, so the middle strand reaches about 38 px around him. Keep flag-off values identical. He must stay
    drawn against the rope, not through it: check all 3 strands, both sides, near and far on the rope. Clothesline stays impossible until
    `returning`. No stamina cost. Corners keep the current hit for now.
    Done when: body past `runTarget` at least 30·s px; middle-strand bow at least 30 px at full tension; return speed peak at least 1.6x;
    hit about 350 ms from contact to launch; both sides; focused tests; flag-off identical. Strip with normal AND quarter speed, Lou and
    George, both ropes, fresh and worn, framed tight enough to see the rope. Commit locally, **STOP at G3d-2**.
  - **T3c.6 Stuck in the corner (full task, Sonnet; flag on only).** Derek: lean against it in a daze for a bit, "out of it and
    stuck", the set-up for a running attack. Derek approved the rope's lean back at G3d-2 ("that's what i was envisioning"), so the corner hit changes to match
    and `startStagger()` goes: reuse T3c.5b's turn and load (`_turnBack` 40·s px short, `ropeHitAt` / `ropeHitPose` through load and taut,
    the corner's inward facing from `RING_CORNERS`), but no spring: he stays in the lean as new state `cornered`, easing from the load pose
    into the daze. Give the corner its own smaller load depth, starting at 12·s px past the corner point, so he never draws through the
    post, and stop the side-rope spring from ringing him out. New pose `cornerDaze`: slumped, feet planted, knees soft, head loose with a slow sway. Only `bend` pitches the
    torso, `lean` is not drawn. Hands on the top rope through `holdGrips` `at` before any art request; report if they cannot reach.
    Length `Math.max(1.5, staggerFor(stamina).seconds)`; Derek sets it by eye. Timer in the tick at `src/Wrestler.js:1083`.
    End: tween to idle and step forward about 30·s px. Do not use `startStagger`, its backward travel goes into the post.
    Add `cornered` to the strikable lists (`Wrestler.js` 1729, 1795, 1833, 2499, 2529) and list any others found. A grapple on him
    does nothing for now. Add the state to the state comment and fix the stale `grabbed` comment. Check the near corners first: he
    draws behind the post and near ropes (depth 25.7). `triggerRopeBounce` stays as it is.
    **Episode guards (Codex):** give each corner stay a small id, `_cornerEpisode`. `_doSell` callbacks, the return-to-corner move and the exit
    step all check it, so a fall, new move, reset or escape cancels a pending restore. The daze clock keeps running through a sell; a
    restore keeps the remaining time. Any exit clears the rope grips and pose ownership: a fallen man must not keep a hand pinned to
    the rope.
    Tests: full timeline, no input, sold strike leaves no stuck state, facing inward in all 4 corners, grips clear after a fall.
    Build one episode first, Lou at a near corner, then expand to both kits and all corners.
  - **T3c.7 Running attack into the corner (full task, Sonnet; flag on only).** Run key with `_lastOther` in `cornered` and more than
    120·s px away: `tryRun` charges at him instead of running to the rope behind. `runPhase = 'charge'`, a new `_setRunSegment(x, y)` to a point
    `CORNER_HIT_GAP` short of him (start 46·s px, arm's reach, no hip contact, D12); `_setRunLine` cannot do this, it always ends at a rope.
    Same-x: under 40·s px of x gap there is no charge, the run key behaves as usual; never reuse the dx-0 y snap. Arrival with him still cornered: new `_doCornerCharge`,
    the `clothesline` pose sequence, `STAMINA_DRAIN.cornerCharge` 14, the `sellChest` pose back to `cornerDaze`, camera shake as the
    clothesline, and the daze extended by 0.6 s, once per episode (latched: two hits in a row test). Before damage, recheck target, episode, range and depth at impact. He is still dazed when the attacker backs off. Arrival with him gone: the attacker runs
    on to the corner point and takes `toCorner` himself: the miss is free. Register `cornerCharge` in `src/moves/registry.js`, in
    the Lou and George kits and the heat table (`Arena.js`, near line 3290), and keep `moves:coverage` at 22 gaps. AI: add the corner branch in
    `_chooseAction` BEFORE its standing/blocking rejection, and make the movement decision close on a cornered man instead of backing off.
    Beyond 120·s px press run at about 0.6 odds, per decision beat through `_attack` and the offense cooldown; closer, an explicit strike. Real-input proof: Lou near corner first (arrive, hold, hit, restore, escape, miss after he escapes; one damage event, at most one extension, no stale callback or grip), then 2 rigs, 4 corners.
    Full suite, build, coverage, flag-off at this gate. Normal-speed strip. Commit locally, **STOP at G3e**.
  - **T3c.6b Arms down in the corner (full task, Sonnet; flag on only).** Derek at G3e: "his dazed in the corner stance should probably be
    arms down, he looks like he's ready to defend himself." Cause: T3c.6 raises both hands to the top rope beside his head (`holdCornerGrips`)
    on `lArm` .95 / `rArm` .85. Nothing else in the hit or the charge changes.
    1. Remove the hands from the rope: delete `holdCornerGrips`, its call (`src/scenes/Arena.js:3501`), `gripMiss`, `CORNER.handsMs`,
       `handSpread`, and their tests and proof fields. Search for other uses.
    2. `CORNER_DAZE_POSE` arms hang as dead weight at his sides: `lArm` .06, `rArm` .02. In `_tickCorner` (the `lElbow` / `rElbow` line) ease
       the elbows to a limp `CORNER.elbow` .25, not the idle .7. Read how the rig takes the near and far arm in this facing, in all 4 corners,
       and make sure neither hand crosses the trunks or rests on the hip.
    3. The arms fall: they drop from the load's flung pose over about 320 ms, slower than the torso's 200 ms `settleMs`, with no
       bounce. A small lag of the torso sway in the arms is fine; they never lift on their own.
    4. Raise `CORNER.minDazeS` from 1.5 to 2.2. T3c.7 reports a 1.5 s daze ending before most charges from far land (charge up to 1433 ms
       plus the press). Derek still sets the final length by eye; keep it one constant.
    Measure both wrists' height against the hip at the end of the fall, all 4 corners, both kits, and the elbow bend. Report any trunk or hip
    overlap. Tests and proof updated, hit and miss still pass. Rerun the corner strip at normal and quarter speed. Focused tests, flag-off.
    Also report why George charged only 1 of 5 real-match chances against Lou's 6 of 6; do not change the AI. Commit locally, **STOP at G3e-2**.
  - **T3c.8 The charge puts him down, face or stomach (full task, Sonnet; flag on only).** Derek at G3e-2: "the charge hit should cause
    them to fall forward and down, instead of remaining standing, then they should sell whether they got hit in the face or stomach."
    Replaces the charge's outcome in `_doCornerCharge`; the charge itself, the miss, the daze and the rope hit do not change.
    1. **Where it lands (Opus's choice, Derek can overrule).** Press and impact stay as they are by default: the clothesline, high, `part: 'head'`,
       the face. `down` held at the run press gives the low version, a dropped-shoulder pose (new `cornerShoulder`, `crouch` and `bend`
       forward, no hip contact, D12), `part: 'gut'`. Store it on `_charge` at the press. The AI rolls 50/50 per charge. `_hurt` needs a `part` override next to `limb`.
    2. **The hit.** At impact, after the existing rechecks, drop the daze extension (`extendCorner`, `extendS`, the latch and its tests: he no
       longer stays). End the episode through a one-way path, so `startStagger` and `_restoreCorner` cannot put him back. Then a short reaction,
       about 150 ms: head: head and torso snap back into the buckle (`bend` back); gut: folds over (`bend` forward, arms in).
    3. **The fall.** `startFall` with a forward variant from `Skeleton.FALL_VARIANTS.forward`, read which ones suit a fall away from the post. He lands
       `prone`, head toward the ring, `facing` = the corner's inward facing, `state: 'down'`. Downed bodies are about 200·s long, so
       move him inward over the fall until `downMargin` (60·s, see `startClotheslineFall`) clears both ropes at his y; he must not hang through a rope or post.
    4. **The attacker** backs off far enough at impact that the falling body does not land on him: raise `CORNER_CHARGE.backOff`, measure the gap on landing.
    5. **The sell.** It must always happen and name the place. `pain` carries the part; `planSells` can pick no clutch, so for this move
       force a clutch first, at the part, whatever the style. Severity at or above `COMPACT_MIN_SEVERITY` .6, and make sure `downTime` leaves
       the budget: `DOWN_SEC` plus what the clutch needs. Face: `clutch.head` prone exists, near hand to the head; try the far hand too if the
       rig reaches, and read it first in `PRONE_CLUTCH`. Stomach: new `gut` in `SUPINE_CLUTCH` and `PRONE_CLUTCH`, a new `gut` target in
       Skeleton's clutch-target lookup (`src/Skeleton.js:2660`, where `chest` is .35 of neck to hip; start `gut` at .72; `CLUTCH_TARGETS` is only a comment), near hand under him to the stomach, curled up off the mat, knee drawn. It must not look like `chest`:
       measure the wrist against the target on both rigs. Registry: `cornerCharge`'s `sell.part` default head.
    6. Lifecycle: interrupted fall, a pin on him while he sells, the get-up after a prone sell (`getups` routes), no leftover episode or `_charge`.
    Tests: both parts reach the clutch, one damage event, no daze extension, never back in `cornered`, landing inside margins in 4 corners, the
    attacker clear. Full suite, build, coverage, flag-off. Strip at normal and quarter speed: Lou and George, near and far, face and stomach. Commit locally, **STOP at G3f**.
  - **Later (Derek picks):** running splash, corner strikes, grapple in the corner, whip reversals.
- **Stage 4: the lockup vocabulary**, so more moves can grow from it: rope break (clean break / cheap shot), shove-off,
  go-behind waistlock, wrist lock / arm wringer, side headlock takeover. Derek picks the order.
- **Stage 5: integrate `grapples` (Derek 2026-10-31: "let's get the grapples integrated"). Written in full, for Sonnet; stop at G5.**
  Exit timing from the old outline was measured at G3b and the whip has since been rebuilt, so it is closed. Order matters: fix the gap, prove the flow, then flip.
  - **T5.1 The AI uses the corner.** Today the chain only happens with a player attacking: the AI's whips (`src/AIHandler.js:592`, `:618`) hold
    left or right only, so it never sends anyone to a corner in a real match, and T3c.7's AI proof forced the corner by hand. Flag on: at `:618`, about 35% of
    whips also `_hold` up or down, whichever corner is nearer the receiver, a `_cfg` value per style so George and Lou can differ. Leave the ropes-escape whip at `:592`
    alone. Check the AI's low charge from T3c.8 really reaches `tryRun`; the code has no `down` hold for it that I could find. Fix it if not. Tests.
  - **T5.2 The live soak.** New `tools/debug/grapples_soak.mjs` on `?grapples=v1`, real time, both sides AI, real AI input, nothing placed by hand. Pairs from the four roster
    rigs (`thesz-procreate-v1`, `george-roster-v1`, `kowalski-roster-v1`, `guido-roster-v1`; read the real keys in `src/characters`), both facings as they fall, default gait and
    `?gait=v2`. Run until each pair has at least 3 full chains: whip, corner, charge, down and sell, then a pin or a recovery. Fail on: any page error; non-finite x, y or pose;
    `facing` 0; `orphanRescue`; a state unchanged past its limit (`grabbed` 1 s, `cornered` 4 s, `running` 6 s); a leftover `_cornerEp`, `_charge`, `_whip` or `_returnVia` once standing or down; x or y out of the ring
    beyond the known fall swing. Interrupted cases: force a hit during the reaction, the fall, and the get-up, and a pin during the sell. Add one real-input run: keyboard
    through the same chain, driven through the input object, both directions. Report per pair: chains, moves used, lockups per minute, match length against `grapples=off`, charge
    hit and miss counts, George's gap. Keep frames out; keep JSON. Guido's collar was 19.9 px short at T1.3b: report it, fix nothing cosmetic.
    A crash, stuck state or lost match flow blocks T5.3: stop and report. A look issue goes on the polish list.
  - **T5.3 Flip it.** `grapplesCandidate = () => defaultOnFlag('grapples', 'v1')`, as 6bfb66c did for getups: on in the game, any other value off, Node with no `location` off.
    Update the comment at D1's flag, `tests/grapplesFlag.test.js` (absent, `=v1`, `=off`, `=1`, no location), and `tests/support/promotedFlags.js` `onlyListed`. Every tool that meant "flag off" by leaving it out
    must now say `grapples=off`: `grapples_flagoff.mjs`, `grapples_film.mjs`, `grapples_3b*.mjs`, `grapples_contacts.mjs`, and search for others. `grapples_flagoff.mjs` then proves `=off` matches
    the fixture. Docs: add the corner whip, charge and face / stomach sell to `MOVE_CATALOG.md` and `MOVES.md` with their inputs, in small edits, as those files hold other sessions' changes;
    Status "Feature flags". Keep the `=off` path; no code deletion in this stage.
    Live check: dev server, no query string, Lou vs George, confirm lockups run the new tie-up. Full suite, build, coverage, `grapples_assert.mjs`, flag-off. Commit locally, do not push, **STOP at G5**: Derek plays a match with no flag.
    G5 asks him: match pace, the attacker's long retreat after the charge (`CORNER_CHARGE.backOff` 330 px), the diagonal press replacing a suplex or headlock, and the polish list.
- **Stage 6: real fighters by default, and one record for kits (Derek 2026-10-31: moves must be "interchangeable and easily migrated from wrestler to wrestler"). Written in full, for Sonnet; stop at G6.** No move, pose, timing or AI behaviour changes. `MOVE_CATALOG.md` holds another session's edits: small edits only, and commit it only as T6.3 says.
  - **T6.1 Default fighters.** In `Arena.js`, the `PRESETS` fallback becomes `thesz-procreate-v1` for p1 and `george-roster-v1` for p2 (Opus's call from the G5 recommendation; Derek can overrule). `?p1=thesz` and `?p2=george` still load the old rigs; do not fix or retire them. Check `FrontDoor`'s Exhibition path reaches the same fighters, and list any tool or test that relied on the old fallback by omitting `p1` / `p2`; make those say the rig they mean. `grapples_flagoff.mjs` compares a fixture, so confirm it still names its rigs. Live check: plain launch, Exhibition, both fighters' texture keys are the new rigs, one lockup runs.
  - **T6.2 One kit file.** `src/characters/rosterKits.js` becomes the one place the four roster kits are decided. Write all four lists out literally, with no spread, so a change to Lou no longer changes Kowalski, and drop its imports of `thesz` and `george`. Contents must not change: assert before and after that each of the four has the same ids as today. In `Arena.js`, the presets `thesz-procreate-v1`, `george-roster-v1`, `kowalski-roster-v1` and `guido-roster-v1` read `ROSTER_KITS`. Today the first two read their character files, so editing `ROSTER_KITS.george` does nothing. Leave `thesz.moveSet`, `george.moveSet`, the generated `*_roster_v1.js` files and the old presets alone. Add a comment at `moveSet` in `prepare-roster-character.py`'s template that the game reads kits from `rosterKits.js`. Update `rosterKits.js`'s header. Move `tests/moveRegistry.test.js`'s identity checks to read `ROSTER_KITS` where they mean the roster.
  - **T6.3 Kit checks and the table.**
    1. **Slot conflicts.** Add `KIT_SLOTS` data to `src/moves/registry.js`, from the code and not from memory: `lockupPower` `['hipToss', 'armDrag']` (`Arena.js:3959`) and `grapple` `['piledriver', 'bodySlam']` (`Wrestler.js:1844`, `Arena.js:3944`). Read every `moveSet.includes` in `Wrestler.js`, `Arena.js`, `logic/` and `AIHandler.js` for others of the same shape: a move that can never run while another is in the kit. `figureFour` / `armBar` / `ankleLock` are not one if Up and Down still pick each; confirm it. Add `shadowedMoves(kit)` beside `orphanedMoves`, test it on hit and miss, and fail the suite if a roster kit holds a shadowed move. Report any found today; do not change a kit.
    2. **AI reach.** Add `KIT_AI_ODDS` to the registry: `figureFour` `figureFourOdds`, `kneeDrop` `kneeDropOdds`, `kneeLift` `kneeLiftOdds`, `frontKick` `frontKickOdds`, `theszPress` `pressHuntAt`, plus any others found by reading `AIHandler.js`. Export `PERSONALITIES` if it is not exported. A test reads each roster kit and that preset's personality: a listed move with a missing or 0 value fails unless named in an explicit allow list with a reason. This is the check that a migrated move gets its AI setting. If it fails today, put the case on the allow list and report it; do not retune.
    3. **The table.** New `npm run moves:kits` (`tools/move-critic/kits.mjs`) prints, for every registry id: kit-gated or not, the four kits holding it, its slot and its coverage status. `--check` compares it with a marked block in `MOVE_CATALOG.md`, and a test runs the same compare. Replace the hand-kept "Who has it" column with that block; add a line under it on how to move a move: edit `rosterKits.js`, set its AI value, run `moves:kits`. Correct the "Portable" paragraph: measured for lying flat, sitting and held up, not for grips or contacts, so a move given to a new wrestler gets its own check on that wrestler. In `MOVES.md`, replace the stale sizes and the "neither kit" paragraph with a pointer to that block.
    `MOVE_CATALOG.md` commit: use `git add -p`, or stop and tell Opus if your hunks cannot be separated from the other session's.
    Full suite, build, coverage, `grapples_assert`, `grapples_flagoff`. No strip: nothing moves on screen except the default fighters. Progress lines, Status "Feature flags" unchanged. Commit locally, do not push, **STOP at G6**.
