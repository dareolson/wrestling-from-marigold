# Get-up library: authored rises with variations

2026-10-27 · Claude (Opus) plan, Sonnet executes · Derek judges every visual result.
**Starts now** (Derek 2026-10-27: do the get-ups first, no more tinkering on George). [PLAN_GEORGE_TRANSFER.md](PLAN_GEORGE_TRANSFER.md)
is parked at G10a; its Rev 4b / Stage 13 (the turn inside today's rise) is replaced by this plan and was never built.

## Progress

(Sonnet: one line per task: id, commit, result, misses. Gate lines are written by Opus/Derek only.)

- T1.0: `planSells({ noRoll })`, `getups=v1` flag in Wrestler; 1000 seeded theatrical plans (supine, prone) have no roll, control plans still roll; sells.test.js 45/45. Misses: none; no film.
- T1.1-T1.3: 21442f0 (+ flip fix, next commit): getUps.js, `updateGetUp(entry, flipped)`, `_tickRiseFlip` + pivot hold; getUps.test.js 12/12, rise tests 96/96. Finding: negated angles + flipped facing (the roll's swap) keep the world body, so a turn is the SAME channels with the facing flipped (a reflection); fixed.
- T2.1: pose sheet + rough strips `research/animation/getups-2026-10/g1a/index.html` (tools/debug/getups_film.mjs). Rough keys, no measuring pass; flip is a reflection at t .46 about the near knee, other foot not measured. ⛔ G1a waits for Derek.
- T2.1b: knee tuck by flex (`setKneeTuck`, URL `?getups=v1&kneeTuck=6|10|14`, `&kneeOrder=thigh`), off unless asked; page `research/animation/getups-2026-10/g1b/index.html`. Gap px (r 8, rise t .1-.8) Lou near/far L 63/93 -> 22/37 at 14; George 53/92 -> 27/40 (min at 10: 23/23). Bound art (George) needed both binding anchors slid. Full suite 967/967 (Node 22). ⛔ G1b waits for Derek.
- T2.2-T2.3: `backKneeHurt` + `Back` variants, far-hand push as data, films+measures (`tools/debug/getups_t22.mjs`), [strip](research/animation/getups-2026-10/g1-strip.html), [viewer](research/animation/getups-2026-10/g1-viewer.html), entry `2026-10-27-claude-getups-g1.md`. Misses: flip moves far ankle 57-79 px and near ankle 52-75 (target 3); George push hand 17 px off the knee; near knee drifts 6-8 px. Faces opponent at stand 8/8, rise 917 ms = today. ⛔ G1 waits for Derek.
- T2.4-T2.5: [g1-rev](research/animation/getups-2026-10/g1-rev/index.html), entry `2026-10-28-claude-getups-g1-rev.md`. T2.4: drawn forearm size is constant through the flip (49.26 px box, 37.95 elbow->wrist), cause not found, no fix; asks which frame/arm. T2.5: 6 George candidates (waist-height via, elbow out .4/.6/.8, `aroundVia.phase`): hand still 8-12.5 px below the trunks edge on the route (B 10.3, best P3 8.3); via unreachable as asked (8.5-9.9 px). ⛔ G1-rev waits for Derek.
- T2.6-T2.7: [g1-rev2](research/animation/getups-2026-10/g1-rev2/index.html), entry `2026-10-28-claude-getups-g1-rev2.md`. T2.6: `aroundVia.path` + per-frame IK for the standing release: hand 8.3 px ABOVE the hem on every frame behind the body (today 8.8 below), IK err <= .23, wrist step <= 1.2. Misses: 12 frames still touch a thigh's art (today 47), one 36.5 px hand-end jump (frame 139, latch), runtime patch only. T2.7: union mask + fail-closed clearance (`?getups=v1`, `&handUnion=off`); it changes 1 frame (9 px) on the new route. ⛔ G1-rev2 waits for Derek.
- T2.8: 4747b66 painted-pixel evidence, [g1-rev2 page](research/animation/getups-2026-10/g1-rev2/index.html#verified), entry `2026-10-28-claude-getups-t28.md`. R: lowest painted hand pixel 5.2-9.9 px above the hem, 0 visible px over a thigh (153 frames); union mask copies lacked alpha/parent transform (fixed, `syncUnionCopy`). Misses: the 36.5 px jump is the IK elbow branch flipping (not latch/art/depth); wrist jumps 15.3 px on the first standing frame (frame 55); turn feet 57-76 px as before.
- T2.9: 794cfd1 George's R route registered (`aroundVia` u -.4772 / v .6358, via pose -.45 / -1.8, `path`) in SPECS, `george_roster_v1.js` and the agreement test; scope: IK in the standing release above `standW` only. Applies with `getups` OFF too (the route code is not flag-gated): George's lying back-clutch reach step goes 4.0 -> 8.3 px/frame (compact clutch 8.6 -> 17.4), hold margin .48 -> .09 px at holdW .7; release depth swap clearance 15.8 -> 32.7 px. Full suite 981/981.
- T3.1-T3.2: eabce3f (keys) / 733161f (page): rough `frontKnee` (turn + straight) and `backTuck` keys, `?getups=v1&getup=<family>` dev override (default picks unchanged), [G2a page](research/animation/getups-2026-10/g2a/index.html) (Bret refs, keys on Lou/George both facings, 1x loops today | new). Rise 867 ms both; largest part step frontKnee 17.3 (Lou) / 19.3 (George), backTuck 21.5 / 21.9 (today 18.5). Misses: no measuring pass, mat-point push-up hand target not built. G2a approved (Derek 2026-10-28).
- T3.3: e1c6d72 George's T2.9 route behind `?getups=v1` (`aroundVia.getups` overlay, one reader `resolveAroundVia`, flag passed in); fixture `georgeClutchFlagOff` recorded from 794cfd1^. Getups off again: clutch step 4.02 / compact 8.61 px, hold margin .48, release swap clearance 15.8; focused tests 81/81.
  Getups on: 8.27 / 17.4, clearance 32.69, hold margin .09 px (worst 14.91 of 15; same at hurt 0/.5/1 and both facings, hurt does not enter the hold). Misses: none over contactPx; fixture is Node-bounded (reach weight + hand goal, not drawn wrist px).
- T3.4: 167af7a `hands.<side>` = phase or ordered array (validator, hand-over, flip/interruption reset, no family names); frontKnee mat push t .12-.46 (release to .58 near / .62 far) then far knee .62-.82; backTuck mat .08-.50 (release to .66) then both knees .66-.84; tests 35/35, focused set 108/108.
  Browser (drawn wrist, mat push): Lou slip <= 1.4 px (backTuck far 4.9, reach limit); George misses: wrist 9-29 px off the target (arm 52 px vs keyed shoulder 47-77 px above the mat). Wrist-to-knee max: Lou 9-20 px, George 25-35.
- T3.5: 1602de2 `frontKneeBack` / `frontKneeBackStraight` (same keys, far schedule only), `usesNearHand` / `eligibleForBackSell`; override picks the Back variant when back-selling, refuses `backTuck` (legacy rise + console.warn); focused set 99/99.
  Misses: the real `_backRiseContext` needs a supine wrestler, so the override also counts a rise-phase back pain on a prone one; no Skeleton reach for a prone back sell yet.
- T3.4b: 2d0397c `_worldHandLift` (0.97 x arm from the posed joints, checked from push start); tLift t/ms: Lou frontKnee near .36/150 far none, backTuck .48/250 and .09/0; George frontKnee .13/0 and .28/100, backTuck .20/83 and .09/0. Slip planted Lou <=.14 px, George 0; focused 109/109.
  Misses: George frontKnee near and both backTuck far hands lift at push start (never planted); lift wrist step 7-25 px/frame (Lou 15-25, George 7-21); wrist-to-knee max Lou 9-20, George 25-35.
- T3.6a: 2e8e924 page research/animation/getups-2026-10/g2-strip/index.html (keys hands-off via dev `&handsOff=1` | T3.4b, Lou and George, frontKnee turn + backTuck, both facings) + wrist-step table.
  Never plant: Lou backTuck far, George frontKnee near, George backTuck far (slip 5.3 px on its one frame). Lift step T3.4b vs keys: 10.5-25.0 vs 3.7-15.0 px. Stopped for Derek.
- T3.6: 7a5b9d5 [G2 page](research/animation/getups-2026-10/g2/index.html) (tools/debug/getups_g2.mjs, drawn frames, today | new, both rigs and facings). Slip planted Lou <=.14, George 0 (backTuck far 5.3-5.8 on 1 frame); last rise->standing 2.5 px George / .6 Lou (today 45 / 56 turn).
  Misses: face-down landing near forearm hold->rise Lou 31.5 (today 31.5), George 47.6 (today 40.1, target 3); flip feet jump 52-93 px; wrist-to-knee George 25-35; frontKneeBack George elbow step 34.9 px in the standing recovery. Gates: 1000/1000, build ok, coverage 22 gaps.
- T3b.1: 6d9e253 fatigue stall (one tween, held stretch); focused 122/122 (getUps 52). Droop sign -1 (shoulder y = hipY + cos(torso)·torsoH, both stall keys in (π/2, π)). Hands AT the stall (schedule math from T3.4b tLift): Lou frontKnee (t .42) near lifting w .50, far planted w 1; George near released (lift .13), far w .04 (lift .28); backKneeHurt far at the knee w 1.
  Misses: Lou's half-lifted near hand through the stall (G2b Q2), not fixed; real-rig numbers come with the T3b.2 films.
- T3b.2: f4017a5 [G2b page](research/animation/getups-2026-10/g2b/index.html) + [strip](research/animation/getups-2026-10/g2b/strip.html), 36 films (Lou, George; 100/25/5 %; bkh, fk, fkb; both facings). Gates: 1012/1012, build ok, coverage 22 gaps.
  Misses: Lou frontKnee near hand half-lifted through the stall (w .62, reach ratio .96-1.01, cannot reach at the breath extreme); droop is torso + sag only; enter/leave steps 7-14 px/frame, below the unstalled rise's own. Stopped at G2b.
- T4.0: f9fbfc3 `chooseGetUp` + `GETUP_WEIGHTS` in getUps.js (C1-C3: families, order lying / noTurn / nearHandReserved / noStall, fallback to legacy, repeat avoidance); getUps.test.js 58/58 (6 new).
  Misses: none known; not wired yet (T4.1).
- T4.1: 18489d7 wired (snapshot, `_backSellRiseState`, `_getUpLog`); [G3 page](research/animation/getups-2026-10/g3/index.html) + [strip](research/animation/getups-2026-10/g3/strip.html), 10 seeds, 124 rises (backTuck 55, backKneeHurt* 67, frontKnee 2). Gates 1023/1023, build ok, coverage 22.
  Misses: 4 rises step 35-63 px into standing, 16 change pose >5 px on the AI's next action, 19 start steps >10 px (backTuck), no natural stamina 20-30 % rise. Stopped at G3.
- T4.2: 19ab04f probe + eased separation (`_riseStandAt`, 6*s px per 1/60 s for 250 ms, flag on only), b1249e6 [snap strip](research/animation/getups-2026-10/g3/snap-strip.html). Hypothesis confirmed only with a NON-standing opponent: first standing frame jumps exactly 80*s - dist (63.83 / 33.83 px at gap 0 / 30, both rigs, both facings); standing opponent and 150 px control 0. After: 4.79 px, ends 63.83 apart; flag off still 33.83. 85/85 focused.
  Misses: the plan's standing-opponent overlap case cannot show the snap (the opponent separates itself on frame 0), so the busy case (`elbowDropping`) is the test; the 4 real G3 steps not re-checked (no recapture); the pair still overlaps for ~11 frames while easing; 16 AI-action and 19 start steps untouched. Derek approved the ease from the strip 2026-10-29 (ease kept, not push-the-opponent).
- T4.3: audit 34b3d71 (every supine lying pose and backKneeHurt/backTuck hold the knee +0.15..0.18 rad past straight; frontKnee none), cc01585 clamp in `_applyGrounded` (shin to the thigh's angle, flag on only), b6d3bca [knee strip](research/animation/getups-2026-10/knee/knee-strip.html). Drawn knee past straight 0 in all 24 forced runs (was .15/.18); 90/90 focused. Ankles move 3.95-6.71 px; no foot lifts (0), feet come DOWN 8.6-10.9 px to the body's lowest point, none below it.
  Misses: the seeded 0.22-0.45 spikes were not reproduced or named (the table's only sell that can do it is the roll, +0.7 at turnover, +0.95 forced with amp 1.3, and `getups=v1` never plans one); legacy rises and flag-off unchanged by design; upright limit still -0.10. Stopped for Derek.

## Why (Derek 2026-10-27)

"george should switch directions while he's getting up ... facing lou by the time he stands up, right now he kind of wills
himself up in an antigravity way" and "maybe we need established getting up animations, we can make a few variations".

Today there is one rise from the back (`Skeleton.GETUP_SUPINE_POSES`, 4 keys) and one from the front (`Skeleton.GETUP_POSES`),
plus the quick rise. Measured problems they cause:
- The wrestler stands up facing away and mirrors on a standing frame (H5, [PLAN_RISE_HANDOFF.md](PLAN_RISE_HANDOFF.md)).
- From the crouch the hips go straight up, torso upright, no hand pushes anything: no visible weight.
- The front (prone) path has no hand route: George's near forearm steps 33-37 px at the roll swap and 40-44 px at
  hold → rise (T10.3 films, `research/animation/george-transfer-2026-10/g10a/rows.json`).
Reference: [MOVE_CATALOG.md](MOVE_CATALOG.md) line 80, Bret sheet frames 64-68 (from the back) and 244-258 (from the front).

## Amendments after Codex's review (Opus 2026-10-27; these override the text below)

[Codex review](AI_HANDOFF_ENTRIES/2026-10-27-codex-getups-review.md). Decisions:
- **B1. Two kinds of comparison.** (a) *Behaviour*: old vs new full scenario; the sell plans differ on purpose (D7 removes
  rolls) and the viewer labels that. (b) *Rise only*: identical starting pose, hold offsets, pain and stamina, forced rise
  (the `rise_handoff_probe` way), old route vs new. Every gate shows both. Keep a direct face-down landing case (a fall that
  lands prone): no rolls means fewer prone rises, not a fixed prone route. The old roll-swap number is history, not a target.
- **B2. Route frozen at rise start.** `chooseGetUp` picks the entry, and `needsTurn` is decided once, at rise start; neither
  changes during the rise. This replaces the "re-decided until `flipAt`" text in D4. If the opponent crosses during the rise,
  the normal `move()` re-face happens after standing: the one accepted exception to "ends facing the opponent". Tests: cross
  once, cross twice, opponent inside the 12 px deadband at start, opponent moving into it.
- **B3. Quick rise unchanged this round.** `_startQuickRise` (160 ms) keeps the legacy route; no authored entry is squeezed
  into it, and its vulnerability window does not change. Authored entries use today's `_startRiseUp` timing
  (850 + 750 × hurt ms). Report real milliseconds in every film, not only t.
- **B4. The pivot moves the wrestler, not just the drawing.** At `flipAt` the mirror would move the planted knee; the
  correction is applied to the Wrestler's x (one write, in the flip), so collision, opponent distance and rope bounds follow
  and the skeleton never carries a lasting offset. If ring bounds clamp it, report the clamp. Measure BOTH planted contacts
  (knee and other foot) across the flip. Tests: a frame step that jumps over `flipAt` without landing on it; interruption
  right after the correction.
- **B5. Support hands are data.** Each entry's `hands`: `{ near|far: { target, space: 'world'|'thighLocal', push: [t0, t1],
  w, release: [t1, t2] } }`, where `target` is a mat point (world, fixed at push start) or a thigh-local anchor. In a `backSell`
  variant the near hand belongs to the carried back reach and must not appear in `hands` (the validator rejects it); the far
  hand supports. Measure the DRAWN frames (after IK, knee limits, masks, contact state): hold → first rise frame, push
  window, last rise frame → standing.
- **B6. Selection never forces a bad route.** `chooseGetUp(ctx, prevId, rand)` filters eligibility first, avoids `prevId`
  only when another eligible entry remains, ignores `nearRopes` this round (there is no rope route), and falls back to the
  legacy entry for that lying when nothing is eligible. Tests: zero, one and several eligible entries.
- **B7. Order: prototype first.** Stage 1 is only T1.1-T1.3. Selection (T1.4) moves to Stage 4. At G1a Derek sees the pose
  sheet AND a normal-speed strip of a rough `backKneeHurt` (both facings, turn and no turn), because weight and the turn
  can only be judged in motion. George's lying leg peaks and the thigh/trunks overlap stay separate observations at G4: a
  new rise can't show them fixed.

## Decisions (Opus defaults; Derek can overrule at any gate)

- **D1. Get-ups are grounded keypose tables, not MoveRuntime clips.** Clips pose the upright channels (`lLeg, crouch, lean,
  tilt, lift`); every rise system built so far works on the grounded channels (`hip, torso, *Thigh, *Shin, *Arm, *Fore`):
  `updateGetUp`, risefix's `standingChannels` end, the hold carry (`riseHoldCarry`), the carried back hand. So a get-up is a
  table in a new module `src/animation/getUps.js`, the same shape as `SELLS` in `sells.js`: `{ id, from: 'supine'|'prone',
  duration (s at full stamina), keys: [{ t, ...channels }], flipAt?, after?, hands?, tags }`. The last key is always the
  standing key, so risefix's last-segment solve keeps working unchanged.
- **D2. Every get-up ends facing the opponent.** A get-up that needs a turn mirrors INSIDE the rise at `flipAt`, the way the
  roll already does (`SELLS.supine.roll`: `swapAt`, `after`, keys built so the two halves draw the same body). The flip is put
  where the body is compact and on a knee, and is mirrored about the planted knee/foot, not about the hip.
- **D3. Weight.** Every get-up has a push: a hand on the mat, on the knee or on the ropes, with a hand-contact target
  (the clutch's reach machinery, `updateGroundedReach`). The torso goes forward over the feet before the hips lift.
- **D4. Selection.** `chooseGetUp(ctx)` is pure: ctx = { lying, needsTurn, hurt (0-1 from stamina), soldPart, nearRopes,
  rig capabilities }. It filters eligible get-ups, then picks with a seeded weighted random, never the same one twice in a
  row for one wrestler. `needsTurn` uses the opponent's x at rise start with a 12 px deadband, re-decided until `flipAt`,
  then frozen until standing (same policy as the George plan's A6).
- **D5. Back sell compatible.** A get-up tagged `backSell` keeps the near hand on the back the whole way (today's carried hand)
  and pushes with the far hand. Lou's and George's back-sell numbers (`holdW`, recovery) must not change.
- **D7. Sell on the back, turn over only to get up (Derek 2026-10-27).** "I wanted him to sell longer on his back rather
  than just flip on his stomach right away, he can flip right before he gets up". Under `?getups=v1`, `planSells` never plans
  a `roll` (today `theatrical` picks it first 20% of the time, `SELL_STYLES` in `sells.js`); its weight goes to `writhe` and
  `clutch`. A supine wrestler stays supine through every sell and the hold; turning over is part of the get-up
  (`backKneeHurt` turns onto the knee). Kind-2 (prone) trips to the mat from a fall that lands face down are unchanged.
- **D8. A fatigue stall (Derek 2026-10-27: "a mid getup prone state for times of severe fatigue").** Each authored entry
  names one `stall` key: its most stable halfway pose (`frontKnee`: on all fours; `backKneeHurt`: on one knee, hand on the
  knee). When the wrestler is badly worn (stamina ≤ 25 %), the rise stops at that key for a `stallMs` scaled by fatigue
  (600 ms at 25 % up to 1400 ms at 0 %): breathing on the torso (the `HOLD_BREATH` motion), head down, no hand moving off
  its target. It is a pause inside `gettingUp`, not a new state: the facing lock, the frozen route (B2) and every rule above
  hold through it. Not used by the quick rise (B3).
  Gameplay (Opus default, Derek can overrule): today nothing in the game attacks a `gettingUp` wrestler, so the stall
  makes him safe for longer. This round it is a look only, capped at 1400 ms extra. Letting the opponent attack a stalled
  wrestler (a kick to the ribs, a front facelock) is gameplay work for a later plan (Derek 2026-10-27: "we'll make it punishable later").
- **D6. Behind a flag** `?getups=v1` until Derek approves the set; off = today byte-identical (the `riseFixFlagOff` fixture
  must not change).

## The set (first round)

| id | from | turn | push | notes |
|---|---|---|---|---|
| `backKneeHurt` | supine | yes or no | far hand on front knee | sit up, roll onto the near knee facing the opponent, push off the knee, stand. Derek's description. |
| `backTuck` | supine | no | both hands on the mat behind, then lean | today's rise with the lean and push added; fresh wrestlers. |
| `frontKnee` | prone | yes or no | both hands (push-up), then hand on knee | push up, one knee under, stand (Bret 244-258). Replaces the prone path with no hand route. |
| `backKneeHurt` + `frontKnee`, `backSell` variants | | | far hand only | near hand stays on the back. |

Later, not this plan: rope pull-up, kip-up, climbing the opponent.

## Rules

- Node 22. Focused tests per task; full suite, build and `moves:coverage -- --check` only at gates. One commit per task, id first.
  Never push.
- Work on Procreate Lou (`thesz-procreate-v1`) and `george-roster-v1`. Ignore `thesz` and `thesz-front3q-r1`.
- Never claim a get-up "reads" or "looks right". Report measurements and misses first; Derek judges.
- Films: same seed AND the same logged sell plan for before and after (compare the manifests; mismatch = re-film).
- New raw film folders: add them to `.git/info/exclude` (raw frames are not committed; VS Code's 10k item limit).

## Stage 1: the table and the runner (no new look yet)

- **T1.0 (D7)** Under `?getups=v1`, drop `roll` from `planSells` (weights renormalised over the rest); flag off byte-identical.
  Tests: 1000 seeded plans for `theatrical` supine contain no roll with the flag on, and equal today's plans with it off.

- **T1.1** `src/animation/getUps.js`: the schema (D1), a validator (`validateGetUp`), and today's two rises re-expressed as
  `legacySupine` / `legacyProne` entries that sample to exactly `GETUP_SUPINE_POSES` / `GETUP_POSES`. Tests: validator
  rejects a missing standing key, a `flipAt` without `after`, keys out of order; the legacy entries sample byte-identical.
- **T1.2** `Skeleton.updateGetUp` takes a get-up entry instead of choosing the table by `lying`; with `?getups` off it is
  handed the legacy entry. `riseFixFlagOff` fixture and every rise test unchanged.
- **T1.3** The flip: when `t` crosses `flipAt`, `Wrestler` flips `facing` once and the skeleton samples `after`, mirrored about
  the planted point named by the entry (`pivot: 'nearKnee' | 'farFoot' | ...`). `move()` does not re-face during a get-up
  (it is already in `GROUNDED_FACING_LOCK`) or on its first standing frame when the get-up already turned. Tests: one flip,
  at `flipAt`; pivot point within 1 px across the flip (Node stub rig); interruption (pin, pickup, reset) restores facing,
  hand and depth state; no double flip.
- *(T1.4 moved to Stage 4 by B7.)*

## Stage 2: `backKneeHurt`, then STOP (G1)

- **T2.1** Pose sheet first: draw the reference frames (Bret 64-68) next to Lou and George posed by the proposed keys, both
  facings, at `t` of each key, as one page `research/animation/getups-2026-10/g1a/index.html`. Plus (B7) a rough
  normal-speed strip of those keys running in the game under `?getups=v1`, Lou and George, both facings, turn and no turn,
  forced rise (B1b). Rough means untuned: no measuring pass yet.
  **⛔ G1a: Derek OKs the keys** before anything is tuned.

G1a — Derek 2026-10-27: **keys OK** ("it mostly looks good"). Miss: "sometimes around the knees there's some art issues ... on Lou
especially ... nudging the lower leg a little closer during the transition". Opus, from `frames/new/lou-l-behind` s0018-s0026
and s0030-s0034: at deep knee flex (sitting up onto the knee, and the push up) the thigh's cut end and the shin's top separate
at the knee. `RIG.KNEE_OVERLAP` is a constant 18 px (Skeleton.js), so the overlap that hides the joint standing is too
little when the knee is folded.

- **T2.1b Knee tuck by flex (all rigs, under `?getups=v1` first).** In the grounded leg (`Skeleton._applyGrounded`'s `leg`
  closure) and `updateUpright`, the shin's pull-up becomes `KNEE_OVERLAP + KNEE_FLEX_TUCK × smoothstep(f0, f1, flex)`,
  flex = thigh angle − shin angle. Rig data can override per rig (`kneeFlexTuck`, in the generator SPECS + generated file
  like other rig data). The ankle chain does not move (render only: the shin image slides up its own axis into the thigh,
  same as `KNEE_OVERLAP`). Candidates: tuck 0 (today) / 6 / 10 / 14 px, f0 .6, f1 1.6 rad. Also report the knee's draw
  order at deep flex (thigh over shin or shin over thigh) and try the other order as one extra column if the gap is on the
  thigh's side. Measure: a probe that counts background pixels inside the knee's convex hull (thigh end ∪ shin top) per
  frame, Lou and George, both facings, through `backKneeHurt`. Page: the G1a strips with each candidate side by side at 1×,
  and a 3× crop of the knee. **⛔ G1b: Derek picks.** Standing poses must not change for flex < f0 (test).

G1b — Derek 2026-10-27: **E** ("e looks the best"), from a simplified page (`g1b/decide.html`: the three worst moments,
A-E side by side). Opus check afterwards: **E is the same as A (today).** Both rigs already carry `shinUnderThigh: true`, so
`kneeOrder=thigh` changed nothing; A vs E frames differ only by film grain (same pixel counts as frame 0, 2 px at s0034).
So Derek preferred today's knee to every tuck amount (Derek: "A also looked the best, the other ones were all jacked up ... there's a gap, but i'm not that worried"). **Decision: no knee tuck.** `kneeTuck` / `kneeOrder` stay in the code,
off unless asked for (URL only). The knee break Derek saw at G1a is not fixed by this; it is parked in IDEAS.md (bent-knee
variant art, or bendable limbs). Next: T2.2.
- **T2.2** Implement `backKneeHurt` and its `backSell` variant. Film Lou and George, suplex receiver, opponent behind (turn)
  and in front (no turn), 1×, both facings, from the last down frame to 2 s standing. Before = today.
  Report misses first: largest per-part step anywhere in the rise and at the flip; both feet's world displacement while
  planted (target ≤ 3 px); push hand's distance to its target inside its push window; the back-sell hand's waist-contact
  error; frames between the flip and standing; any re-face on a standing frame (target 0); rise duration vs today.
- **T2.3** Normal-speed loop strip in both facings first (CLAUDE.md), then the viewer
  `research/animation/getups-2026-10/g1-viewer.html` (today | new, per row) and a handoff entry.
- **⛔ G1 questions:** 1. Does he face the opponent by the time he stands? 2. Does he still rise "antigravity"? 3. Keep?

G1 — Derek 2026-10-27: **not approved yet, two fixes** (turn and weight not objected to).
1. Lou: "his forearm is too small in the first position, then abruptly is bigger when it changes, which makes it more obvious,
   try to match it to the size of the second forearm". Opus, `g1/frames/new/lou-l-behind` s0016-s0025 vs s0026+: the back-sell
   forearm before the flip (t < .46) draws visibly shorter than after it; the change lands on the flip frame.
2. George: "his hand goes below his trunks and shows under there above his leg ... pull his elbow out while he pulls his hand
   from his back to his front so that he doesn't have to reach so low to get around his torso". That is George's
   `aroundVia` route (candidate B, chosen at G8a: 1.5 hand lengths BELOW and outboard of `backWaist`), used when the hand
   leaves the back after the rise.
Open, not yet raised by Derek: the flip moves both feet 52-79 px (Sonnet's entry, miss 1). Ask at G1-rev.

- **T2.4 Lou's forearm size across the flip.** First find the cause, no fix yet. Per frame across `backKneeHurtBack`
  (Lou, both facings): the near forearm's texture key (base / grip), drawn length on screen (image height × scaleY, and
  elbow → wrist distance), any two-anchor binding stretch, and which forearm object (near / far) holds the back reach.
  Report the frame where it changes and by how much. Likely causes to rule in or out: the grip variant swapping on the
  flip; the reflection drawing the far forearm (smaller art box) on the back before the flip; foreshortening from the reach.
  Fix: before the flip, it draws at the size it has after the flip (Derek: "match it to the size of the second forearm"),
  with no size change at the flip frame (target: drawn forearm length changes ≤ 2 % frame to frame). Lou fixture: report any
  change; any change outside the get-up = STOP.
- **T2.5 George: elbow out, not hand low.** New route for the hand leaving the back (`recoveryVia` / the standing release
  through `aroundVia`): the elbow flares out to the side first (the upper arm swings away from the body, raised), then the
  forearm swings the hand around the hip at waist height and to the front. The hand stays above the trunks' bottom edge.
  Rig data on George only: `aroundVia.elbowOut` (an upper-arm/elbow offset pose for the via, like `recoveryArm` /
  `recoveryElbow`) plus a higher via point. Propose 3 candidates (elbow out about 0.4 / 0.6 / 0.8 rad, via at waist
  height, 1.0-1.5 hand lengths outboard), each filmed at 1× in both facings through the G1 get-up and the standing
  recovery, next to today's B. Measure the hand's lowest point relative to the trunks' bottom edge (target: never below)
  and its distance outside the torso ∪ thighs silhouette at the depth swap (> 0, fail closed as in the George plan A4).
  Page `research/animation/getups-2026-10/g1-rev/index.html` with T2.4's before/after for Lou.
- **⛔ G1-rev (Derek):** 1. Lou's forearm the same size all the way? 2. Which George elbow-out candidate? 3. The feet jump at
  the turn: does it show at 1×?

G1-rev — Derek 2026-10-28: "really liking the movement", but George's hand still goes below the trunks: "we need to not let his
hand cross below his trunks because it is stacked above the upper leg and shows through". No candidate adopted (all dip
8.3-12.5 px below the hem, T2.5). Lou's forearm: Derek accepts it as is ("i knew it didn't change, but i just accepted it"): closed, no fix. The feet jump not raised again.

Why the candidates failed (Opus): the route is a blend of arm CHANNELS between poses, so the hand's path between the poses
is not controlled and swings down. A via point can't fix that. The route must be a path for the HAND, solved by IK each frame.

- **T2.6 George: a hand path that never goes below the hem.** For a `handUnder` rig, the hand leaving (and entering) the
  back follows a path in torso-image space (u, v): from `backWaist`, outboard around the hip, to the front rest, with every
  point's v at least 3 px (game) above the trunks' lower edge (T2.5's hem line). Each frame, the hand target = that path at
  the route's progress, IK solves the arm (the existing reach, `updateGroundedReach` / the standing recovery reach). Where
  IK can't reach a path point, the path moves INWARD toward the body (never down) for that rig, decided once when the path
  is built, not per frame. The elbow is whatever IK gives (no channel blend). Rig data: `aroundVia.path` (2-4 (u, v) points,
  George only), replacing the via + channel offsets for George; Lou unchanged.
  Measure every drawn frame, both facings, through the G1 get-up and the standing recovery: the hand's lowest drawn pixel
  vs the hem (target ≥ 0 px above, every frame), the IK reach error at each frame, the per-frame hand step (≤ 2.5 px),
  and the distance outside torso ∪ thighs at the depth swap (> 0, fail closed).
- **T2.7 Backstop: hide the hand behind the thighs too.** The parked George plan D13 (mask by torso ∪ near thigh ∪ far
  thigh, with its A3/A4 rules) is done here for `handUnder` rigs, so if any frame still dips it is hidden behind the leg
  instead of drawn over it. Report the frames where it acts (target: none after T2.6).
- Page `g1-rev2/index.html`: George today | T2.6 | T2.6 + T2.7, 1×, both facings. **⛔ G1-rev2 (Derek).**

T2.6-T2.7 done at 11f2f36 as a runtime patch (George's rig data unchanged). [Codex review](AI_HANDOFF_ENTRIES/2026-10-28-codex-current-getups-advice.md)
says the numbers aren't proven yet. Opus accepts all six points. Derek can judge G1-rev2 by eye now; T2.8 runs either way,
and its result goes next to his verdict.

- **T2.8 Evidence pass (no new candidates, no tuning).**
  1. *Painted pixels, not samples.* `getups_route.mjs` measures hand samples (wrist, contact, distal, tip centroid). On the
     worst 10 frames per facing, render the near hand + forearm alone, losslessly (PNG, not the JPEG films), and report the
     lowest painted pixel vs the hem, and painted hand pixels over each thigh's painted pixels (visible ones, after masks).
     Relabel the existing numbers "sampled geometry".
  2. *Union mask control.* Render the mask source alone, and a forced hand-over-thigh pose with torso-only vs union masks,
     both thighs, both facings. Confirm parents are identity on current rigs, make the copies carry alpha (A3), test a
     parent transform if any rig has one. Measure active-mask cost: median and p95 ms per frame after a 2 s warmup, including
     `solveRouteHand`'s extra `updateUpright` calls.
  3. *IK residual of the drawn pose.* `solveRouteHand` reports the error from before its last pass. Re-measure on the pose it
     returns.
  4. *No missing steps.* Report world displacement for every consecutive frame (steps are now dropped when x changes, then
     summarised as 0); body-relative steps separately; count missing values, never fill them with 0. Re-report the turn's
     feet jump (52-79 px) and the knee drift (6-8 px) with this.
  5. *The 36.5 px hand-end jump (frame 138 → 139).* Log variant key, handUnder, contact anchor, wrist and tip on both frames;
     re-run with the art frozen, then with depth frozen. Say which one causes it, and whether the new route exposes it more
     than today's. Don't tune the latch.
  6. *Scope.* State at the gate: IK covers the standing release above `standW` only; below it and in the rise the via/channel
     route still runs.
  Write the results into the G1-rev2 page as a "verified" section, misses first.
G1-rev2 — Derek 2026-10-28: **approved** ("it's good"), the T2.6 hand path (R column). Scope: IK in the standing release
above `standW` only; the rise and below `standW` still use the via/channel route. T2.7 union mask kept as a candidate (G4).
**G1 (backKneeHurt) approved** with G1-rev2. The turn's feet jump (52-79 px on the flip frame): Derek "cant really tell" at 1×,
so accepted, not fixed. Keep reporting it (T2.8 item 4 and every later get-up with a turn); if a later get-up makes it
visible, it comes back.

- **T2.9 (after T2.8) Register it.** Derek accepted G1-rev2: register `route.json` in George's data (generator SPECS + generated file + agreement test),
  record the scope (6), and keep direct prone landing, no-turn, both facings, and the two IK blend-in/out frames in every
  later check.

## Stage 3: `frontKnee` and `backTuck`, then STOP (G2)

Same pattern as Stage 2 (pose sheet ⛔ G2a, implement, film, viewer). `frontKnee` must also report the near forearm's step at
hold → rise on George from a direct face-down landing (today 40-44 px; target ≤ 3 px). There is no sell roll under
`?getups=v1` (D7), so the roll-swap number is history only (B1).

### Rev 3 (Opus 2026-10-28, after [Codex's planning note](AI_HANDOFF_ENTRIES/2026-10-28-codex-stage3-planning-advice.md))

Opus accepts the note. G1 / G1-rev2 stay approved and closed. Order: **T3.3 now** (does not touch G2a); T3.4-T3.6 after
Derek's G2a verdict (key changes he asks for go in first, as T3.3b); then the G2 package.

- **E1. Rollout boundary (decision).** T2.9 changed George with getups OFF (lying back-clutch reach 4.0 → 8.3 px/frame,
  compact 8.6 → 17.4, hold margin .48 → .09 px). That breaks D6. Opus default: **the new route lives behind `?getups=v1`**;
  getups off draws George exactly as before 794cfd1. The route becomes George's default only when `getups` is promoted (G3).
  Derek can overrule ("make George's route default now"), in which case D6 is restated as "flag-off = today, except
  George's approved route".
- **E2. Support hands are a schedule.** One target per side is not enough: `frontKnee` pushes on the mat, then the hand moves
  to the knee. `hands.<side>` may be one entry (today) or an ordered array of non-overlapping phases. A `space: 'world'` target
  is captured once at that phase's push start and held fixed in world space until release; the next phase acquires from the
  hand's DRAWN position. No family-name conditionals in Skeleton or Wrestler; everything is data.
- **E3. Near hand reserved.** A `backSell` entry never uses the near hand (validator already rejects `hands.near`). `backTuck`
  is two-handed, so it is ineligible for a back sell; there is no `backTuckBack`. `frontKnee` gets `frontKneeBack` /
  `frontKneeBackStraight`: far hand only, mat then knee.
- **E4. Not scheduled: two solver candidates.** (a) elbow branch continuity (the 36.5 px jump at frames 138-139),
  (b) one contact point through the rise → standing boundary (the 15.3 px wrist jump, frame 55). Both are approved-as-is at
  1×. Each becomes a bounded task only if Derek asks or a G2 film shows it; Codex's note has the method. Keep reporting both
  numbers at every gate.

- **T3.3 Gate George's route behind `getups` (E1). Start now.**
  1. Restore George's pre-794cfd1 `aroundVia` (u -.25 / v .9069, recoveryArm -.6 / recoveryElbow -.4, approach .4, no `path`)
     as the base data. Put the T2.9 values in an overlay, `aroundVia.getups: { u, v, recoveryArm, recoveryElbow, path }`, in
     SPECS + the generated `george_roster_v1.js` + the agreement test. Validate the overlay in `src/rig/backSell.js` the same
     way as the base.
  2. One reader picks the overlay when `getups` is on (pass the flag in; don't read `location` inside `src/rig/`). Every
     current `aroundVia` reader (Skeleton 2439-2550, Wrestler 1114 / 1930 / 3118, `recoveryVia`) goes through it.
  3. New fixture test `tests/georgeClutchFlagOff.test.js`: George, compact and normal back clutch, both facings, getups off:
     per-frame wrist / hand positions equal 794cfd1^ (record the fixture from that commit, say so in the test). Check that
     `riseFixFlagOff` passes unchanged.
  4. With getups on, report (don't tune) the hold margin across the real range: holdW .7 at hurt 0 / .5 / 1 and each hold
     offset, both facings. Today's single number is .09 px. If any case goes over `contactPx`, it's a miss; stop and say so.
  5. Focused tests: backSell*, aroundRoute, riseFixFlagOff, the new fixture. Progress line: sha, the getups-off step numbers
     (should be 4.0 / 8.6 / .48 again), the getups-on margin table's worst case.

- **T3.3b (only if Derek's G2a verdict changes keys).** Apply his notes to `frontKnee` / `backTuck`, refilm the G2a page,
  stop again. If he approves the keys as they are, skip.

G2a — Derek 2026-10-28: **approved** ("they look great"), `frontKnee` and `backTuck` keys as filmed. T3.3b skipped.

- **T3.4 Support-hand schedule (E2).**
  1. `getUps.js`: `hands.<side>` accepts an object or an ordered array of phases `{ target, space, push, w, release }`;
     validator rejects overlapping phases and a second phase that starts before the first one's release starts. Tests.
  2. Skeleton/Wrestler: capture a `world` target once at its push start (wrestler-independent world point on the mat line),
     hold it through the push, blend out over `release`; the next phase blends in from the drawn hand position. Reset on
     interruption (pin, pickup, reset), facing flip (re-capture after the flip, not before), and rise end.
  3. Data: `frontKnee`: both hands on the mat (world) for the push-up, then the far hand to `farKnee` (thighLocal) as now.
     `backTuck`: both hands on the mat behind him, then both to the knees. Use the G2a keys' timing; write the t values in
     the progress line.
  4. Tests: a world target doesn't move in world space during its push (Lou and George, both facings, with a frame step that
     jumps over push start); interruption mid-push clears it; old single-object entries (`backKneeHurt`) are byte-identical.

- **T3.4b Hand lifts at full reach (Derek 2026-10-28, after T3.4: George's 52 px arm can't hold the mat while the keys lift
  his shoulder 47-77 px; wrist 9-29 px off).** One rule for every rig, keys unchanged:
  1. Skeleton, `world` phases only: each frame, shoulder → held target distance vs that arm's length (upper + fore, from the
     rig). Over `0.97 × arm` the phase lifts: record `tLift` in the hold (once; reset with the hold), then the phase weight is
     multiplied by `1 − ease((t − tLift) / releaseSpan)` with releaseSpan = the phase's own `release` length. Once lifted it
     stays lifted (no re-plant, no oscillation). A hand-over to the next phase blends from the drawn hand as now.
  2. No rig or family names; Lou keeps his numbers where he can reach.
  3. Tests: a stand-in with a short arm lifts once and never re-plants; a long arm never lifts (output identical to T3.4);
     a frame step over the reach crossing gives `tLift` within one step; the hold reset clears `tLift`.
  4. Browser, Lou and George, both facings, frontKnee (near, far) and backTuck (near, far): `tLift` as t and real ms from push
     start, wrist slip while planted (target ≤ 1 px), largest wrist step in the lift. Also report wrist-to-knee max in the knee
     phase (T3.4: George 25-35 px) without fixing it.

- **T3.5 Back-sell variants and eligibility (E3).**
  1. `frontKneeBack` and `frontKneeBackStraight`: same keys, tags + `backSell`, far-hand schedule only. Add them to the family
     table and `GETUPS`.
  2. Pure helper `usesNearHand(entry)` and `eligibleForBackSell(entry)` in `getUps.js` (T4.0's `chooseGetUp` will use them).
     Tests: `backTuck` is not eligible with a back sell; every `backSell` entry has no near-hand phase; the `?getup=<family>`
     override picks the Back variant when the wrestler is back-selling, and refuses `backTuck` (falls back to the legacy entry
     and logs why).
  3. Lou's and George's back-sell numbers (`holdW`, recovery) unchanged (D5): existing tests.

- **E5 (Opus 2026-10-28, from T3.5).** No back reach is drawn while prone (Skeleton's back reach is supine-only), so in
  `frontKneeBack` the near hand just follows the keys. T3.6 films it and says so at G2; Derek decides if a prone back reach is
  needed.

- **T3.6a Loop strip first (Opus 2026-10-28, after T3.4b).** T3.4b: some hands never plant (backTuck far on both rigs, George
  frontKnee near: the keyed shoulder is past reach at push start) and the wrist moves 7-25 px/frame in the lift. Before the
  full measuring pass: one page `research/animation/getups-2026-10/g2-strip/index.html`, 1× loops, both facings, Lou and George,
  `frontKnee` (turn) and `backTuck`, columns T3.2 keys (hands off) | T3.4b; plus, per hand, the largest wrist step of the KEYED
  arm (no hand targets) next to the T3.4b lift step, so Derek sees how much the lift adds. **⛔ Stop for Derek** before T3.6.

G2-strip — Derek 2026-10-28: **option A of Opus's four (A fine as is / B lower the shoulders / C drop mat contact / D other), not a page column**: the right-hand column, T3.4b (2d0397c, hand lifts at full reach), is kept; hands that never plant and the lift steps accepted for now. Go to T3.6.

- **T3.6 Measuring pass + G2 package.** Cases: `frontKnee` (turn, straight, Back), `backTuck`; Lou and George; both facings;
  direct face-down landing and no-turn included (B1 rise-only comparison, forced rise). Report from the DRAWN frames:
  1. Support hand slip in WORLD space during each mat contact (target ≤ 1 px), and hand → knee distance during knee contact.
  2. Elbow residual after limits on every support hand.
  3. Steps at hold → first rise frame, phase hand-overs, last rise frame → standing (all parts; near forearm on George from a
     face-down landing: today 40-44 px, target ≤ 3 px).
  4. The flip: both planted contacts (B4), feet jump (as T2.8 item 4).
  5. The E4 numbers (elbow branch jump, first-standing wrist jump) wherever a back-sell variant runs.
  6. Real ms of each phase.
  Page `research/animation/getups-2026-10/g2/index.html`: misses first, then 1× loops today | new, both facings, then the
  numbers. Before the full page, one normal-speed loop strip in both facings for Derek (CLAUDE.md). **⛔ G2 (Derek).**

G2 — Derek 2026-10-28: **approved**. frontKnee and backTuck have weight, keep them; George's face-down hold → rise forearm
step (47.6 px) not noticed; backTuck's mat → knee hand-over "seamless"; frontKneeBack with the near hand on the keys "looks
good" (E5: no prone back reach needed). Go forward to Stage 3b.

## Stage 3b: the fatigue stall (D8), then STOP (G2b)

### Rev 5: T3b execution brief (Opus 2026-10-28; replaces the earlier T3b.1 / T3b.2 text, Rev 3 and Rev 4 points are folded in)

Decisions for this stage (Derek can overrule at G2b):
- **S1. Which entries stall.** `backKneeHurt*` at its flip key (KNEEL, t .46; Rev 3), `frontKnee*` at all fours (ALLFOURS,
  t .42; D8), so the four Back variants get it too through the spread. `backTuck` and the legacy entries get **no** stall:
  backTuck is the fresh-wrestler rise (The set), and T4.0 must not choose it at stamina ≤ 25 % (added to T4.0 below).
- **S2. One tween, a held stretch inside it.** Today's rise is one Phaser tween on `riseT` (`_startRiseUp`, 850 + 750 × hurt
  ms, `Sine.easeInOut`). With a stall it is still ONE tween, `duration = today's + stallMs`, with a custom ease that is
  today's curve before the stall, exactly `stall` t through it, and today's curve after it. So `riseT` is monotonic, it never
  runs backwards (that resets the hand hold, `_getUpHandHold`), it lands exactly on the stall key, the total time is fixed at
  rise start (recovering stamina can't shorten it), and there is no second tween to go stale. No stall (flag off, stamina
  > 25 %, entry without `stall`) = today's tween config unchanged, byte for byte.
- **S3. Support state is frozen with t.** The breath and head-down are drawn on top of the stall pose; the hand checks
  (`_worldHandTarget`, `_worldHandLift`) keep seeing the key pose without the breath. So no target is re-taken, no new `tLift`
  is recorded, nothing re-plants during the stall; a lift already running stays where it is until t moves again.
- **S4. Head down** has no grounded channel (grounded channels are hip, torso, thighs, shins, arms, fores). Use a small
  torso droop toward the mat plus a hip sag. Do not add a head channel; if it doesn't show, say so at G2b.

- **T3b.1** Code + node tests. One commit `T3b.1: ...`.
  1. `src/animation/getUps.js`:
     - `export const STALL = Object.freeze({ staminaPct: 25, minMs: 600, maxMs: 1400, easeMs: 200, droop: 0.10, sag: 3 })`.
     - `export function stallMs(staminaPct)`: 0 above 25; `600 + 800 × (25 − s) / 25` for s in [0, 25] (clamp s to 0).
     - Entry field `stall` (a t). `validateGetUp`: if present it must be in (0, 1) and equal the `t` of a key in `keys`
       (with a flip, `stall ≤ flipAt`, so it is always in `keys`). Add `stall: KNEEL.t` to `backKneeHurtBase` and
       `stall: ALLFOURS.t` to `frontKneeBase`. Nothing on backTuck or legacy.
     - `export function stallTimeline(stallT, durMs, stallMs, ease)` (pure; `ease` = the base curve, passed in): returns
       `{ totalMs, startMs, riseAt(k), stallElapsedMs(k) }` where `startMs = durMs × inverse(ease)(stallT)` (for Sine.InOut,
       `acos(1 − 2·stallT) / π`; compute the inverse for that curve only, document it). `riseAt(k)`, k = 0..1 over totalMs:
       `ease(ms / durMs)` before startMs, `stallT` in [startMs, startMs + stallMs], `ease((ms − stallMs) / durMs)` after.
       `stallElapsedMs(k)` = ms into the stall, or null outside it.
     - `export function stallOffsets(elapsedMs, totalStallMs)` (pure): env = smooth(e / easeMs) × smooth((S − e) / easeMs)
       (0 at both ends, so entering and leaving the stall has no step); returns `{ torso: (HOLD_BREATH.torso × sin(2π e /
       HOLD_BREATH.periodSec) + droop × sign) × env, hip: −sag × env }` with `sign` chosen so the chest goes toward the mat
       (find it with a node check on the drawn neck/head joint y at ALLFOURS and at KNEEL, both facings; write the sign down).
       Import `HOLD_BREATH` from `backRisePerformance.js`.
  2. `src/Wrestler.js` `_startRiseUp`: after `_pickGetUp`, if `this._getUp?.stall !== undefined` and `stallMs(pct) > 0`
     (pct = stamina / STAMINA_MAX × 100, read once here), build the timeline with Phaser's own Sine.InOut (check the name
     under Phaser 4.1: `Phaser.Math.Easing.Sine.InOut`; assert in a test that it equals `0.5 × (1 − cos πk)`), and add the
     tween with `duration: tl.totalMs, ease: (k) => { this._riseK = k; return tl.riseAt(k); }`. Store
     `this._riseStall = { tl, ms }` and `this._riseTween` (the returned tween). Same `onComplete` as today, plus a token
     check (`this._riseTween === tween`) so a stale tween never stands up a later rise. Else: today's `tweens.add` call,
     untouched; `_riseStall = null`.
  3. Interruption: in `_tickRiseFlip`'s not-`gettingUp` branch (where `_getUp` is cleared), stop `_riseTween` if it is a stall
     tween and clear `_riseStall` / `_riseK`. Facing and x go back exactly as T1.3 does.
  4. Draw (`state === 'gettingUp'` in the draw code): `const so = this._riseStall ? stallOffsets(...) : null` from
     `tl.stallElapsedMs(this._riseK)`; pass it to `skeleton.updateGetUp` as a new last parameter `stallOffsets = null`.
     `Skeleton.updateGetUp`: `pose` = `poseAt(t)` then, if `stallOffsets`, `limitKnees(applyOffsets(pose, stallOffsets))`;
     keep the un-breathed pose and pass THAT to `_worldHandLift` (S3). Thigh-local targets read the drawn pose (the hand
     follows the knee as it breathes). With `stallOffsets` null the function is unchanged.
  5. `_startQuickRise` untouched (B3).
  6. Tests (extend `tests/getUps.test.js`; its fake scene's `tweens.add() {}` becomes a recorder for these tests):
     `stallMs` 0 at 26/100, 600 at 25, 1400 at 0, monotonic; validator rejects a stall that is not a key t, accepts the
     shipped ones; `stallTimeline`: riseAt monotonic, equals the base curve outside the stall (shifted), equals stallT inside,
     totalMs = dur + stall, startMs lands on stallT within 1e-9; `stallOffsets` 0 at both ends; stamina 100 → the recorded
     tween config deep-equals today's (`duration` 850, `ease: 'Sine.easeInOut'`), and the same with `?getups` off at
     stamina 5 (no stall without the flag); stamina 5 → duration = 850 + 750 × .95 + stallMs(5); backKneeHurt turning at
     stamina 5: one flip on arriving at .46, pivot held as before, no second flip after the stall; a stall-tween `ease` k that
     jumps from before startMs to after the stall end still flips once and finishes; pin / pickup / reset during the stall:
     facing and x restored, hands cleared, tween stopped, its onComplete does nothing; frontKnee and frontKneeBack through
     the stall on a real Skeleton (the riseFix/getUps test rig): the world targets object and `hold.lift` are identical at
     stall start and stall end, no hand weight rises after its tLift (no re-plant), frontKneeBack schedules only the far hand;
     a skipped frame across push start (.12) and release (.46) gives the same target and at most one tLift per phase; a 30 Hz
     vs 60 Hz walk of k gives the same set of lifted phases and the same ownership (lift t may differ by one frame).
     Focused set: getUps, riseFix, riseFixFlagOff, lockedGetUp, carriedRise, plantedRise, backRisePerformance, backSell*.
  7. Progress line: sha, focused counts, the droop sign, and each hand's state AT the stall for Lou and George (planted /
     lifting with weight w / released), from the node rig. Known going in (T3.4b numbers): Lou's frontKnee near hand starts
     lifting at .36 so it is half-lifted (w ≈ .5) through the whole stall; George's frontKnee near never plants and his far
     hand lifts at .28. Report these, do not fix them (G2b question).
- **T3b.2** Film + page. One commit `T3b.2: ...`.
  - Extend `tools/debug/getups_g2.mjs` (or a sibling `getups_g2b.mjs`) with a stamina option set before `_startRiseUp`
    (it resets stamina to 100 today). Forced rise (B1b), `?getups=v1&getup=<family>`: `backKneeHurt` (turn) and `frontKnee`
    (turn), plus `frontKneeBack` at 5 %, stamina 100 / 25 / 5, Lou (`thesz-procreate-v1`) and George, both facings, 1×.
    Add new raw film folders to `.git/info/exclude`.
  - First the normal-speed loop strip, both facings (CLAUDE.md), then the page
    `research/animation/getups-2026-10/g2b/index.html`: misses first; 1× loops 100 | 25 | 5 per row; then a table per film:
    real ms of each phase (before stall, stall, after), total vs today + stallMs, the largest per-part step entering and
    leaving the stall (px/frame AND px/s), each hand's state through the stall, and the reach ratio (shoulder → held target
    ÷ arm) at the breath's extremes for every world hand still weighted (> .97 = would lift if checked; > 1 = can't reach).
  - Full suite, build, `moves:coverage -- --check` (gate). Handoff entry in `AI_HANDOFF_ENTRIES/`, Status ≤ 40 lines.
- **⛔ G2b (Derek):** (1) Is the stall the right length (600-1400 ms)? (2) Lou's frontKnee near hand half-lifted through the
  stall: keep, move frontKnee's stall to the push-up key (t .22, both Lou hands planted), or let a running lift finish on
  the stall clock? (3) Is the droop enough for "head down"? (4) Punishable later (gameplay plan), confirmed as look only now?

G2b — Derek 2026-10-28: **approved** ("they look great"). Taken as approved as filmed: stall length as built (600-1400 ms),
Lou's half-lifted frontKnee near hand kept, the droop is enough for head down, the stall stays look-only (punishing it is
a later gameplay plan). Go forward to Stage 4.

## Stage 4: selection on, then STOP (G3)

### Rev 6: Stage 4 execution brief (Opus 2026-10-28; replaces the earlier T4.0 / T4.1 text, Rev 4 and Rev 5 points folded in)

Decisions (Derek can overrule at G3):
- **C1. Families, not ids.** Selection picks a family from `GETUP_SETS` (`backKneeHurt`, `backTuck` from the back;
  `frontKnee` from the front), then the variant: turn or straight from `needsTurn`, Back or plain from the back-sell state.
  "Never the same twice in a row" compares families (backKneeHurt then backKneeHurtStraight counts as a repeat).
- **C2. Eligibility, in this order, each refusal logged by name:** `from` ≠ lying → `lying`; needs a turn and the family has
  no turning variant (backTuck) → `noTurn` (D2: every get-up ends facing the opponent); near hand reserved and the family
  has no Back variant (backTuck) → `nearHandReserved`; stamina ≤ 25 % and the family has no `stall` (backTuck) → `noStall`
  (Rev 5 S1). `nearRopes` is ignored this round (B6). No rig capability filter: both rigs play every family (G2a/G2).
- **C3. Weights (seeded, Opus default):** with h = 1 − stamina%/100, `backTuck` = 1 − h (fresh), `backKneeHurt` = .2 + h,
  `frontKnee` = 1 (alone from the front). Then avoid the wrestler's previous family when another eligible family remains.
  Nothing eligible → the legacy entry for that lying, reason `fallback:<refusals>`. Today that can't happen (backKneeHurt and
  frontKnee are always eligible); it is tested with a forced empty context.
- **C4. One back-sell state.** `Wrestler._backSellRiseState()` → `{ reserved, drawnReach, reason }`: `reserved` = the rise
  carries back pain (`_pain.phase === 'rise'`, part back, severity > 0) or `_backRiseContext()` is set; `drawnReach` =
  `!!_backRiseContext()` (supine only: no prone back reach, Derek G2/E5). Both `chooseGetUp` and the `?getup=` override read
  `reserved` from it (replace the inline `backSelling` in `_pickGetUp`); the Skeleton's reach keeps reading
  `_backRiseContext()` + the `backSell` tag as now. So a prone back sell plays `frontKneeBack` with the near arm on its keys,
  and the log says `drawnReach: false`.
- **C6. One rise-start snapshot** ([Codex G2b note](AI_HANDOFF_ENTRIES/2026-10-28-codex-fatigue-stall-review.md)): `_startRiseUp`
  reads stamina %, the back-sell state and `needsTurn` once into `this._riseSnap`; `chooseGetUp`, the stall length and the
  log all use that snapshot (no second stamina read for `stallMs`).
- **C7. Parked, not built:** Codex's candidate for Lou's half-lifted hand (finish a release already under way on the stall
  clock, never re-plant). Derek accepted the stall as filmed; build it only if he asks.
- **C5. What stays.** The `?getup=<family>` override still wins (films stay reproducible). `_startQuickRise` keeps the legacy
  route (B3). The route is chosen once at rise start (B2). Flag off: `_pickGetUp` returns null before any of this.

- **T4.0** `chooseGetUp` (pure) + tests. One commit `T4.0: ...`.
  1. `src/animation/getUps.js`: `export function chooseGetUp(ctx, prevFamily, rand)`, ctx = `{ lying, needsTurn,
     staminaPct, nearHandReserved }`. Returns `{ entry, family, reason, eligible: [family...], refused: { family: reason } }`;
     `reason` is `pick`, `onlyEligible`, `avoidedRepeat` or `fallback:...`. Weights and order exactly as C2 / C3, in a
     frozen `GETUP_WEIGHTS` so Derek can tune them by number.
  2. Tests (`tests/getUps.test.js`): zero eligible (forced: e.g. a `families` override argument for tests only, or a ctx with
     an unknown lying) → legacy + `fallback`; one eligible (supine, needsTurn) → backKneeHurt every draw, repeats allowed;
     several (supine, no turn, fresh) → both appear over 1000 seeded draws and none repeats when `prevFamily` is passed each
     time; reserved → `backKneeHurtBack*` / `frontKneeBack*`, never backTuck; stamina 25 → never backTuck, 26 → can be;
     prone → frontKnee (turn/straight by needsTurn); every returned entry validates and has `from === lying`.
- **T4.1** Wire it + seeded reel. One commit for the code (`T4.1: ...`), one for the page.
  1. `Wrestler._pickGetUp`: after the override block, `chooseGetUp({ lying, needsTurn: turn, staminaPct,
     nearHandReserved: this._backSellRiseState().reserved }, this._lastGetUpFamily, Math.random)`; set
     `this._lastGetUpFamily`; push `{ t: scene.time.now, id, family, reason, refused, staminaPct, needsTurn, lying,
     drawnReach }` onto `this._getUpLog` (keep the last 50). The prone `return null` (legacy prone rise) goes away under the
     flag: prone now plays frontKnee. Log the quick rise too (`{ quick: true }` from `_startQuickRise`, no behaviour change).
     Update the B2 / deadband / override tests that assumed prone → null.
  2. Focused set as T3b.1 plus sells. Flag-off fixtures (`riseFixFlagOff`, `georgeClutchFlagOff`) must pass unchanged.
  3. Tool `tools/debug/getups_g3.mjs` built on `live_match_check.mjs` (both sides AI) and the gait film's seeding
     (mulberry32 installed before game init): 10 seeds, Lou (`thesz-procreate-v1`) vs George, `?getups=v1`, each match until
     6 rises per wrestler or 180 s of game time. Read both `_getUpLog`s; film every rise at 1× from rise start to standing
     plus .3 s (raw frames in `.git/info/exclude`). Record also: how he got down (move / fall kind), direct face-down
     landings, rises interrupted (pin, pickup) and stalls. The 25 % stall threshold adds 600 ms in one step (an authored tier,
     do not smooth it): list natural rises on both sides of it (stamina 20-30 %); if the seeds give none, say so.
  4. First a normal-speed loop strip of 4 rises (one per family plus a stall), both facings (CLAUDE.md). Then the page
     `research/animation/getups-2026-10/g3/index.html`: misses first; the reel (every rise, 1×, labelled seed / wrestler /
     entry / reason / stamina); then the table: count per entry and rig, quick vs full, repeats of a family in a row per
     wrestler (with whether an alternative was eligible), fallbacks, prone rises (natural count), interruptions, stall count,
     the largest per-part step at rise start, entering and leaving a stall (joint named, the two adjacent frames linked) and at
     standing per entry. The same 10 seeds with `getups` off for the counts
     only (how often each lying and the quick rise happen), labelled B1a: the sell plans differ on purpose (no rolls).
  5. Gates: full suite, build, `moves:coverage -- --check`. Handoff entry, Status ≤ 40 lines, Progress lines.
### Rev 7: T4.2 the snap into standing (Opus 2026-10-29, after [Codex's G3 review](AI_HANDOFF_ENTRIES/2026-10-29-codex-review-for-new-opus.md))

The 4 standing steps of 35-63 px (seed 2 George r2, seed 8 George r3, seed 10 George r5, seed 10 Lou r4) are **not** a facing
flip: all four record facing -1 → -1, needsTurn false. In all four the opponent is standing over the riser (elbowDrop ×3,
dropkick ×1), and the root moves: the G3 crop follows root x/y and the whole background jumps ~70 px at
`seed10/w1-r04` s0057 → s0058. Opus hypothesis: `Wrestler.move()` returns early while not standing (Wrestler.js ~902), so
the separation block (~1003-1018, `dist < 80 * s` → set x/y to exactly `minDist` away) never runs during the rise, then
snaps the riser out in one frame on the first standing frame. **Prove it before fixing it.**

- **T4.2** One commit for the probe + fix (`T4.2: ...`), one for the strip.
  1. **Probe** (new `tools/debug/getups_snap.mjs`; reuse `getups_g3.mjs`'s sampler, do not refactor it). Forced, not
     seeded: put a wrestler supine, place the opponent standing at the same x/y (overlap), start a full backTuck rise and
     step to standing +20 frames. Log per frame for both wrestlers: state, facing, x, y, riseT, and `dist`/`depthDiff`
     between them. Cases: Lou rising, George rising; each in both facings; each with the opponent overlapping AND with the
     opponent standing 150 px clear (control). Also record `other.x`/`other.y` in `getups_g3.mjs`'s sample (`otherSide` is
     always null today); no recapture of G3.
  2. **Confirmed** = in the overlap cases the root x/y jumps by ≈ `80 * s - dist` on the first standing frame and the
     control shows no jump. If not confirmed: stop, report the per-frame log and the frame where the jump happens, no fix.
  3. **Fix (default, Derek can switch to "push the opponent" at the gate):** under `getUpsCandidate()` only, for 250 ms
     after a rise reaches standing (`_riseSwapAt`, or a stamp set where the state becomes standing), the hard separation
     snap becomes an ease: move toward the separated x/y by at most 6 * s px per frame. Flag off byte-identical.
     Do not touch the rise keys, AI timing or the half-depth ease branch.
  4. **Tests** (focused): a new case in `tests/getUps.test.js` (or a new `tests/riseSeparation.test.js`): overlap rise →
     no frame-to-frame root step > 6 * s px in the 250 ms window, and wrestlers are ≥ `80 * s` apart by its end; control
     case unchanged; flag off → same snap as today. Run that file, `getUps`, `riseFix`, `riseFixFlagOff`,
     `georgeClutchFlagOff`. Full suite/build/coverage are NOT needed (not a gate).
  5. **Strip:** one normal-speed loop strip (both facings, Lou and George, overlap case before/after) next to the G3 page:
     `research/animation/getups-2026-10/g3/snap-strip.html`. Report the before/after root step per case.
  6. Progress line (≤ 3 lines: sha, result, misses), handoff entry, Status line. **STOP for Derek.** The 16 other >5 px
     steps (AI's next action) and the 19 backTuck start steps are not this task.
### Rev 8: T4.3 knees past straight on the ground (Opus 2026-10-29, after Derek's G3 "gumby legs" and audit 34b3d71)

Audit (34b3d71, `tools/debug/getups_knee.mjs`, `getups_knee_match.mjs`): knee = shin channel − thigh channel as
`_applyGrounded` is handed them. Every supine lying pose holds the knee 0.15 rad past straight (authored, e.g. Skeleton.js
~2102: farThigh −1.45 / farShin −1.60), backKneeHurt and backTuck carry 0.15-0.18 through the rise, sells reach 0.45 on a far
leg; frontKnee never. Upright is already held at `JOINT_LIMITS.knee.min` (−0.10). Nothing limits the grounded path.

- **T4.3** One clamp, one place, flag on only. One commit for code + tests (`T4.3: ...`), one for the strip.
  1. In `Skeleton._applyGrounded` (every lying, sell and rise frame passes through it; the audit wrapped it and saw all
     of them), under `getUpsCandidate()`-equivalent flag check: for each leg, if the knee is past straight, set the shin
     channel to the thigh channel (knee exactly straight, 0 rad). The thigh keeps its angle; only the shin moves. Use the
     same sign convention as `getups_knee.mjs` (past straight = its positive `v`, after its facing handling): derive it
     from that tool, don't guess, and assert it in a test for both facings. Do not edit authored keys, sells or
     `JOINT_LIMITS`; do not touch the upright path. Flag off byte-identical.
  2. Re-run `getups_knee.mjs` (forced, both rigs, both facings) into `knee/knee-audit-after.json`: every case `over` 0.
     Report the largest boot/ankle move the clamp causes per case (px) and whether any boot now leaves the mat (lying
     pose: foot y vs ankle ground line). A boot lifted > 3 px is a miss to report, not something to fix here.
  3. Focused tests: a new `tests/groundedKnee.test.js` (clamp on, both facings, a bent knee untouched, flag off untouched)
     plus `getUps`, `riseFix`, `riseFixFlagOff`, `georgeClutchFlagOff`, `riseSeparation`. No full suite (not a gate).
  4. Strip: one normal-speed loop, both facings, Lou and George, before/after side by side: lying + backTuck rise, and
     the worst sell from the audit (the 0.45 far leg; name the sell). `research/animation/getups-2026-10/knee/knee-strip.html`.
  5. Progress line (≤ 3 lines; record the audit 34b3d71 in it too), handoff entry, Status line. **STOP for Derek**: does a
     straight knee read better, or does he want a slight bend (e.g. clamp at 0.05 rad flexed) instead?
- **⛔ G3 (Derek):** watch the reel. (1) Is the mix right (weights C3)? (2) Promote `getups` to default (legacy stays as
  `getups=off`)? (3) Anything in the reel that looks wrong, even if the numbers don't show it.

## Stage 5: re-check George's parked items, then STOP (G4)

- **T5.1** Re-film George's back sell (`suplex`, `suplexFlip`, both kinds) with `?getups=v1` on, same seed and sell plan, and
  put it beside the G9 films. Report the parked George misses again: peak knee flex, near forearm/hand pixels over the thighs
  or trunks while the hand is behind him, the near-forearm step at the rise start.
- **⛔ G4 (Derek):** does George still need `legScale` (G10a)? Keep or promote the torso ∪ thighs mask built at T2.7 (it
  replaces the George plan's Stage 11)? Anything still needed goes back to PLAN_GEORGE_TRANSFER as Rev 5.

## Done means

Under `?getups=v1` every rise from `_startRiseUp` is one of the authored get-ups (the quick rise stays legacy, B3), ends
facing the opponent with no standing-frame mirror, and has a visible push; Derek approved G1-G3; flag-off is byte-identical
to before this plan, George's back sell included (T3.3 restores it; until T3.3 lands, 794cfd1 breaks this).
