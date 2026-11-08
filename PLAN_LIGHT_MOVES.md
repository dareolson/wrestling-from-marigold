# Light moves: fix the trash, add a toehold, make each kit its own

2026-11-07 · Claude (Opus) plan, Sonnet executes · Derek judges every visual result.
Replaces PLAN_FINISHERS as the next front (Derek 2026-11-07: "i don't think i want to do finishers next... i want to work on lighter moves"). PLAN_FINISHERS is parked, not dropped.

## Progress

(Sonnet: one line per task: id, commit, result, misses. ≤ 3 lines. Gate lines are written by Opus/Derek only.)

- T2.1 (sha below): measured, no code change ([json](research/animation/light-moves-2026-11/t2-1-ankle-lock-measure.json), `tools/debug/ankle_lock_measure.mjs`). Held 0.6-2.8 s, best hand to trapped boot: Lou→George mean 85 px (min 78), George→Lou mean 59 px (min 50); bar is 6.
  Misses: leg only 11-50° off the mat; attacker ankle slide up to 3.1-3.7 px/frame (bar 1.5); body overlap under the belt on all 186 frames (1224-1360 px); trapped knee flex only 0.05-0.1 rad; no knee goes negative.
- T2.2 (sha below): `ankleLockV2` under `?light=v1` ([json](research/animation/light-moves-2026-11/t2-2-ankle-lock-v2-measure.json)). Held 0.6-2.7 s, hand to its own grip target (heel / toes): max 3.1 / 5.9 px, 0 frames over 6, both pairings and facings; planted 0.3-2.7 s slide 0 frames over 1.5; attacker knees via lShin, drawn flex 0-1.5 (none negative).
  Misses: body overlap under the belt is worse, 2.3-2.4k px every frame (was 1.2-1.4k; T2.3); he steps in 80 px over the grab (4-5 px/frame) and out over the release (up to 8); leg now 66-82° off the mat, a big change from the old 11-50°; l/r hand = near/far assumes Lou/George (Kowalski, Guido unchecked); heel/toe targets are shin-fraction proxies, not art anchors.

## Why

- Derek saw two moves that are trash: the **front kick** ("gumby legs and no planted foot") and the **ankle lock** (he called it the toe hold). Both are first-pass clips nobody refined.
- The match is meant to escalate (MOVE_CATALOG §2b): the opening needs low-impact moves that work. Mat leg holds are mid-match moves in that ladder.
- Moves will spread to other wrestlers. Derek: "if every guy is kinda unique that helps." Stage 4 decides who gets what.

## What is wrong now (read from the clips, not yet measured drawn; T1.1 and T2.1 measure)

- `frontKick` ([clip](src/animation/clips/frontKick.js), 5f52e2d, 2026-10-21, before the knee rule): the kicking leg chambers with `lKnee` 1.55 and recoils with 1.3. Upright, a positive `lKnee` hyperextends (memory "no backward knees"; tests/aftermathRecovery.test.js:66), so the knee folds backward twice. The support leg is `rKnee` 0 in all 8 keys: straight, no weight, nothing holds the sole. Kits: Kowalski, Guido.
- `ankleLock` (Derek: "the wrestler isn't even holding his foot"; [clip](src/animation/clips/ankleLock.js), c148936, rescaled d5c42b0): 9 keys per actor over 3.1 s, no grips declared, poses close to the old `ankleLock*` pose-sequence entries (Wrestler.js:378-381). Kits: Lou, Kowalski. `armBar` is the same vintage; not in scope unless Derek trashes it at G2.

## Decisions

- D1. Work on Procreate Lou (`thesz-procreate-v1`) vs `george-roster-v1`, both facings, Lou attacking and defending. Old Lou rigs don't count.
- D2. Rebuilds are new clip ids beside the old ones (the `dropkickV2` precedent), picked when `?light=v1` is set. Flag off is byte-identical (fixture recorded before the first change). Promote at G5.
- D3. Knees: bend on `lShin`/`rShin` only, never a positive `lKnee`/`rKnee` upright. Every task runs the saturation check (no joint pinned at its cap for more than 2 frames).
- D4. A planted foot is world-locked: support-sole slide ≤ 1.5 px/frame (the grapples bar), with knee flex taking the weight (the `plant` gain, Wrestler.js:445, or the gait foot lock; read them before reusing, say which one and why).
- D5. Hands on a foot use the clip grip channel (`AnimationClip` grips → `MoveRuntime` → `Wrestler.holdGrips`, the same path the clasps use), measured at the right moment: hand-to-target px on every held frame and past the move end, raw numbers shown.
- D6. Report measurements and misses first. Never claim a move reads or sells. Derek's eye wins over a passing number.
- D7. Before each gate's page: one normal-speed loop strip, both facings, for Derek to glance at.

## Stage 1: front kick (one actor, the cheap one)

- **T1.1 Measure now.** Lou, Kowalski, Guido, both facings: drawn knee angle per frame (sign shows a backward fold), support-sole slide px/frame, saturation frames. One strip of the current kick at normal speed. No code change.
- **T1.2 Rebuild as `frontKickV2`** under `?light=v1`. Shape (Bret 171-175 stays the pose reference): weight shifts onto the support leg, which bends (soft knee, sole locked); the kicking knee chambers up with the shin hanging (`lShin` negative), the leg extends flat-footed into the gut (push kick, not a snap), retracts through the chamber, sets down. Keep the 0.68 s timing and the gut hit frame unless the measure says the hit moved. Tests: no positive upright knee, sole slide bound, hit frame unchanged, flag-off identical.
- **T1.3 G1 page.** Old vs new side by side, both facings, Lou + Kowalski, numbers beside each. **STOP at G1.**

## Stage 2: ankle lock fix

Derek 2026-11-07: **improve the current ankle lock, don't replace it.** Keep its staging and timing; the main fault is "the wrestler isn't even holding his foot." Plus a bent boot for the trapped foot, drawn per wrestler.

- **T2.1 Measure now.** Lou attacking George and George attacking Lou, both facings: hand-to-ankle and hand-to-boot px on every frame from the grab to the release (expect large, Derek's report), attacker sole slide, knee signs, body overlap (D12 masks), the trapped leg's angle off the mat. Which leg is trapped and which side carries it per facing. No code change.
- **T2.2 Hands on the foot** (`ankleLockV2`, a copy of the current clip, under `?light=v1`): declare grips in the clip (D5) so both hands land on the trapped boot (one at the heel/Achilles, one over the toes) from the grab to the release, with the attacker's `grip` forearm where his rig has one (Lou does, with a `clutch` anchor; read `variants.forearm` and `clasps.js` before reusing). Adjust the clip's poses only where the grip can't reach (raise the trapped leg toward the hands rather than stretching arms). Fix knees (D3) and the planted base (D4) on both men. Same damage and events (`squeeze` × 3). Bar: hand-to-target ≤ 6 px on every held frame, both pairings, both facings.
- **T2.2b (Codex, 6abf871, Opus-reviewed):** heel/toe points painted onto Lou's and George's boot art; the grip forearm's painted palm (not the wrist) is aimed at them. be60b72's 5.9 px pass was wrist-to-shin-proxy, not hand-on-boot. Staging changed (no step-in, torso bend .75, depth +20).
- **T2.2c Another crack at the staging (Sonnet).** Derek 2026-11-07 on 6abf871's stills: leg overlap, art breaking; the boot is hidden behind the attacker, his fists read as at his chest. Keep Codex's palm/heel/toe grips; change the poses.
  1. **Motion first:** a normal-speed loop of 6abf871, both pairings, both facings, so Derek sees it moving (motion may hide some of it). Per frame, both men: joint seam gaps at hip, knee, ankle, shoulder, elbow (px between the drawn parts, the checks the certification tests use; read them), saturated joints, below-belt overlap. List each frame where art breaks.
  2. **Re-stage:** the attacker stands taller (torso bend ≤ .3) and leans back on a planted base; the trapped leg comes up in front of him so the boot sits at his chest/armpit height, in front of his torso, near arm in front of the boot (the layer channel the grapples use; read it first). The trapped leg does not pass through his legs. The victim's trapped knee bends the natural way.
  3. **Bars:** palm to heel/toe ≤ 6 px held (Codex's measure); seam gaps no worse than the man's own idle; 0 saturated frames; below-belt overlap reported (target under 6abf871's 1341-1381 px).
  4. **Page:** 6abf871 vs new, normal-speed loop and stills, both pairings and facings, numbers beside each. Do T2.3's sell here only if it is free. **STOP for Derek.**
- **T2.3 Layering and sell.** The trapped boot in front of the attacker's torso, his near arm in front of the boot, per frame and both facings. The victim sells with what we have: arms reach for the rope or slap the mat, head up on each squeeze, the free leg kicking (reuse the falls sell offsets).
- **T2.4 Bent-boot contract (Opus + Codex, no art yet).** Boots are baked into the shin PNG (CHARACTER_PART_INVENTORY: boot not yet separate), so the bent boot is a **shin variant**: `variants.shin.ankleTwist` in each character file, same pattern as `variants.forearm.*` (own PNG, `semanticAnchors` for the heel and toe the hands grip). Runtime: the trapped leg wears it while the hold is on (from the grab, swap timed like the clasps so it doesn't pop); a rig without it keeps its normal shin, so no wrestler breaks. Opus writes the contract: pose of the foot (toe pointed and turned in; the angle taken from T2.2's held frames), canvas, anchors, knee pivot identical to the base shin.
- **T2.5 Art (Codex, per rig).** Lou first (`thesz-procreate-v1`, the bar), then George; Kowalski and Guido later. Each drawn from that rig's own shin and boot so the swap changes only the foot (pixel swap check like clasps T2.0b: changed px above the ankle ≈ 0). Opus reviews before anything is committed.
- **T2.6 Wire and G2 page.** Swap on, both pairings, both facings: old vs new, a normal-speed loop strip, numbers beside each, plus pixel swap counts and still close-ups of the bent boot. Include `armBar` as it is today so Derek can say if it is trash too. **STOP at G2.**

## Stage 3: step-over toehold (new move)

- **T3.0 Reference.** The move: the man is on his back. The attacker grabs one ankle, lifts it, steps his near leg over the shin and turns to face the man's feet, so the trapped leg is bent at the knee and wrapped around the attacker's thigh, foot in front of the attacker's hip. He holds the toes with both hands and leans forward to crank the ankle and knee. The Funks' spinning toehold is this hold entered with spins (later). Our sheets have no frame of it; ask Derek for footage, else hand-posed stills on Lou for his OK first. The victim's foot reuses the T2.4 bent-boot variant if it fits the crank, else a second variant.
- **T3.1 Registry and slot.** `stepOverToehold`: hold (mat), kit-gated, `damageKey` and `STAMINA_DRAIN` near the ankle lock (5 per squeeze), AI field `groundHoldOdds`, added to `GROUND_HOLDS`. Slot: see Stage 4; until G4 it fills the Finisher + Down slot only when a kit holds it instead of `ankleLock`. Kit checks and `npm run moves:kits -- --write` pass.
- **T3.2 Clip** under `?light=v1` (the new move needs the flag anyway): grab, lift, step over (the attacker's leg passes over the shin; per-frame layer order for both legs), turn, crank × 3, step back out. Grips on the ankle and foot (D5), planted base (D4), no backward knees on either man (the victim's trapped knee bends the natural way, measured).
- **T3.3 The victim sells it,** as T2.3.
- **T3.4 G3 page,** both pairings, both facings. **STOP at G3.**

## Stage 4: spreading moves so each wrestler is his own

Today the Finisher-next-to-a-downed-man slot is Up = `armBar`, Down = `ankleLock`, nothing = the kit's first of `figureFour`/`ankleLock`/`armBar`. Proposal: treat the Down input as one **leg-hold slot** each kit fills with one move, like Lockup + Power is `hipToss` or `armDrag`. Opus's suggested fill, for Derek to change:

| Wrestler | Leg hold | Why |
|---|---|---|
| Lou | `stepOverToehold` | Thesz-era shooter, classic 1950s mat hold |
| Kowalski | `ankleLock` | power man, leans back on it |
| George | `figureFour` (parked art) or `ankleLock` until it is fixed | heel showman |
| Guido | `ankleLock` | |

- **T4.1** Wire the slot and Derek's table: kits, `KIT_AI_ODDS`, `moves:kits --write`, kit checks. Each wrestler's distinct moves listed in one table on the page.
- **T4.2 G4:** a match per pairing with `?light=v1`, soak for stuck states. **STOP at G4.**
- **G5 (Derek): promote `light`** (default on, `=off` disables).

## Later (not in this plan)

- The §2b opener batch: club blow / forearm smash, running forearm, shoulder block, backward roll; then wristlock, snapmare, headlock takeover. The spinning toehold.
- A triage strip of every built light move and hold for Derek to mark keep/polish/trash.
- `armBar` if G2 trashes it.
