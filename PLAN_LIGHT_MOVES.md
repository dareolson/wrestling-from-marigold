# Light moves: fix the trash, add a toehold, make each kit its own

2026-11-07 · Claude (Opus) plan, Sonnet executes · Derek judges every visual result.
2026-11-10 · Derek: "i want all those moves": kick, toehold, kit slots, plus body slam, whip-return attacks and the grapple snapmare (Stages 5-7). Opus is project manager again (reviews at every STOP, writes contracts, pushes when asked); Sonnet executes; Codex builds art.
Replaces PLAN_FINISHERS as the next front (Derek 2026-11-07: "i don't think i want to do finishers next... i want to work on lighter moves"). PLAN_FINISHERS is parked, not dropped.

## Progress

(Sonnet: one line per task: id, commit, result, misses. ≤ 3 lines. Gate lines are written by Opus/Derek only.)

- T2.1 (sha below): measured, no code change ([json](research/animation/light-moves-2026-11/t2-1-ankle-lock-measure.json), `tools/debug/ankle_lock_measure.mjs`). Held 0.6-2.8 s, best hand to trapped boot: Lou→George mean 85 px (min 78), George→Lou mean 59 px (min 50); bar is 6.
  Misses: leg only 11-50° off the mat; attacker ankle slide up to 3.1-3.7 px/frame (bar 1.5); body overlap under the belt on all 186 frames (1224-1360 px); trapped knee flex only 0.05-0.1 rad; no knee goes negative.
- T2.2 (sha below): `ankleLockV2` under `?light=v1` ([json](research/animation/light-moves-2026-11/t2-2-ankle-lock-v2-measure.json)). Held 0.6-2.7 s, hand to its own grip target (heel / toes): max 3.1 / 5.9 px, 0 frames over 6, both pairings and facings; planted 0.3-2.7 s slide 0 frames over 1.5; attacker knees via lShin, drawn flex 0-1.5 (none negative).
  Misses: body overlap under the belt is worse, 2.3-2.4k px every frame (was 1.2-1.4k; T2.3); he steps in 80 px over the grab (4-5 px/frame) and out over the release (up to 8); leg now 66-82° off the mat, a big change from the old 11-50°; l/r hand = near/far assumes Lou/George (Kowalski, Guido unchecked); heel/toe targets are shin-fraction proxies, not art anchors.
- T2.2c (sha below): ankleLockV2 re-staged, [page](research/animation/light-moves-2026-11/t2-2c/index.html) (6abf871 vs new, loops + stills, `tools/debug/ankle_lock_audit.mjs`). Held 0.6-2.7 s: palm to heel/toe max 0 / 0.43 px, 0 frames over 6; 0 seam frames past idle (6abf871 also 0: the ink-gap check cannot see what Derek saw), 0 pinned (6abf871: 186, victim knees at -0.10), planted slide <= 0.51, below-belt max 824 / 1170 (was 1341 / 1381), boot in front of torso 127/127, bend .25.
  Misses: trapped leg still passes through his legs in the first 0.5 s (max 479 / 663 px) and last 0.3 s (the lying leg rises from the mat); the victim's hips lift 40 px and the body slopes head-down (new, unjudged); he is dragged 82 px in and out (4.5 px/frame); no sell added; Kowalski/Guido unchecked.
- T2.2d (sha below): layer order `victim free leg, far arm, torso, head, far leg, near leg, trapped leg, near arm`; trapped leg raised while he is still 210 px out, then slid in (0.3-0.6 s) and out (2.7-3.1 s), [page](research/animation/light-moves-2026-11/t2-2d/index.html). Depth, 127/127 held frames both pairings: far upper arm behind torso, both thighs and shins over torso, near forearm over boot. Trapped leg through his legs 0 frames (was 45 / 43); below-belt max 636 / 598 (was 824 / 1170), held 626 / 586; palm 0 / 0.43 px, 0 seams, 0 pinned.
  Misses: the drag is faster, ~8 px/frame in and ~6 out (was 4.5; 170 and 190 px apart still cross); the victim's hips lift and head-down slope unjudged; no sell; Kowalski/Guido unchecked. Derek judges the art.
- T2.2f (sha below): downed man's far arm behind his torso, near arm in front (127/127 held frames, 4 cases; 64aa65b 0/127); he starts, grabs and ends 205 px (hips) from the man, ankle gap +69/+48/+73 Lou, +74/+64/+77 George, legs on legs 0 px at all three, entries 50/70/150/210; trapped leg on his legs 8 f / 438 px Lou, 21 f / 460 George (was 48 / 905, 45 / 924), [page](research/animation/light-moves-2026-11/t2-2f/index.html).
  Misses: first frame pops him back up to 155 px at a 50 px entry (no lead-in); trapped leg still crosses his legs at 0.37-0.48 s (Lou) and 0.08-0.27, 0.32-0.45 s (George); palm in the lift 5.67 px (bar 6, 6.8 at a 145 mid gap); deep pickup crouch unjudged (George curls over the boot at 0.3 s).
- **T2.2f staging: approved by Derek 2026-11-07** ("it looks good now", bb449b6). Polish list: the 50 px entry pops him 105 px back on frame 1 (no lead-in); trapped leg still crosses his legs 8 / 21 frames; deep pickup crouch. Next T2.3 (sell), then T2.4 (bent-boot contract, Opus).
- T2.3 (sha below): downed man sells the squeezes (head +20 to +24 px at each squeeze vs bb449b6 (peaks 51-69 px above the mat), near hand reaches 91 / 104 px (Lou / George), slaps down to 15 / 5 px above the mat, free knee draws in between), lead-in 0.2 s: worst hip step at entries 50/70/150/210 is 11.6/10.1/7.1/7.1 px/frame (was 139/121/49/7), [page](research/animation/light-moves-2026-11/t2-3/index.html). Bars: palm lift 5.67, held 0, 0 seams, 0 pinned, slide 0, travel 0.
  Misses: free leg's silhouette on his legs 762 / 747 px (was 654 / 635; drawn behind them 127/127); a close entry now starts standing on his shins for 0.2 s (legs on legs 1059 / 942 px at 50 / 70, 255 at 150, 0 at 210); free ankle 2 px above the mat at the draw-in; the rope is not drawn, the reach points past his head.
- **T2.3 sell: approved by Derek 2026-11-07** ("it looks good", d780c58). Polish adds: free leg silhouette on his legs 747-762 px, close entry stands on the shins for the 0.2 s lead-in, rope not drawn. Next T2.4 (Opus).
- T2.6b (sha below): G2 [page](research/animation/light-moves-2026-11/t2-6b/index.html) (5dde20c base shin vs 4825c75, loops + stills + close-ups, `tools/debug/ankle_lock_t26b_page.mjs`, plus armBar as is). Lou trapped draws ankleTwist 150 of 186 frames, both facings; every audit number identical before/after: palm held 0 / 0 px, 0 seams, 0 pinned, slide 0, boot over torso 127/127; swap 0 px above ankle row 395.
  Misses: George has no ankleTwist art (base shin in both columns); two grey wisps on the bent boot's shaft edge in the art; in-play stills too small/grainy to show the boot, judge from the loops; armBar unmeasured; polish items from T2.2f/T2.3 unchanged.
- **T2.6b G2 bent boot: approved by Derek 2026-11-10** ("ankle lock looks good", 0d2e0da). Polish: two grey wisps on the bent boot's shaft edge; George's `ankleTwist` art (Codex T2.5). Derek rejected the old `armBar` at G2 and chose a kneeling wrestling arm bar.
- armBarV2 candidate (Codex, sha below, committed unapproved by Opus): kneeling arm bar under `?light=v1`, [page](research/animation/light-moves-2026-11/armbar-v2/index.html). Palm to wrist / forearm < 0.001 px held, 0/216 pinned, held ankle slide 0, 4 cases; flag off plays the old clip.
  Misses (Opus): his near shin over George's hips (Lou, 1.4 s), George's thigh on Lou's belly (1.95 s), arms straight out at 0.3 s; overlap, knee-to-mat and entry/exit speed unmeasured. T2.7 fixes.

- T1.1 (sha below): measured frontKick, 4 attackers, both facings ([json](research/animation/light-moves-2026-11/t1-1/old.json), `tools/debug/front_kick_audit.mjs`). Kicking knee drawn backward 23 of 40 frames (worst -1.55 rad, at its limit 13 in a row); support sole slides up to 24.5-27.6 px/frame (16-17 frames over 1.5) and sinks to y 474-486 (mat 400); hips fall to 37 px above the mat; impact boot 54-63 px up, his belly ~144.
  Misses: none open; this is the baseline.
- T1.2 + T1.3 (sha below): `frontKickV2` under `?light=v1` ([page](research/animation/light-moves-2026-11/t1-3/index.html), 6 stills + loops, Lou and Kowalski on George, both facings): 0 backward-fold frames, 0 saturated, same 0.68 s and impact 0.3 s; support plant `kneeRestart` (opt-in in MoveRuntime, other clips unchanged: ankle audit identical). Support sole slide worst 1.09 px/frame, 0 over 1.5 (Lou), 3.6 / 9 frames (Kowalski); impact boot 99 / 123 px up, 4.4 / -15.1 px short of the belly.
  Misses: George 4.3 (6 frames) and Guido 15.9 px/frame (13 frames, sole to y 414) over the slide bar; Kowalski's boot passes his belly by 15 px; the plant start/hit edge; the clip is not in clip_knee_audit (V2 clips are flag-gated), covered by the new audit instead; Derek judges the art.

- T1.3 round 2 (sha below): Codex's stomach-kick revision of `frontKickV2` folded in (standoff 128, leg higher, `sellGut` fold-forward sell, 10-unit recoil, canvas thump; impact 0.3 s and damage unchanged), [page](research/animation/light-moves-2026-11/t1-4/index.html) (old | first pass | revised, Lou and Kowalski on George). Lou: sole within 1.7 / 1.8 px of his belly midpoint, 0 backward or pinned knees, support slide 1.09 px/frame (0 over 1.5), receiver bends 0.95 rad.
  Misses: George / Kowalski / Guido slide 4.9 / 5.2 / 5.2 px/frame (14-22 frames over 1.5); Kowalski's sole 26 px above his belly, George's 18.5 px short; unjudged by Derek.

- T1.3 round 3 (sha below): Derek: keep Kowalski's first-pass stomp, give Lou the same, George sells it like a gut kick. `frontKickV2` = the stomp again (Kowalski unchanged); Lou has `frontKickV2Lou` (same stomp, thigh higher; `Wrestler.rigId`); receiver `GUT_STAGGER` (bend 0.6, was 0.95; stumbles back, knees give via crouch, holds ~1.0 s, straightens), [page](research/animation/light-moves-2026-11/t1-5/index.html). Sole vs belly at impact Lou -24.9 / +12.9 px, Kowalski -29.3 / +11.3; Lou support slide 1.09 (0 over 1.5), 0 backward knees.
  Misses: Kowalski slide 3.6 (9 frames), George 4.3 (6), Guido 15.9 (13) over the bar; Lou's support knee 2.02 rad (deep sink, cap 2.55); sell timings are my guess at "a couple beats"; unjudged by Derek.
  Opus review 2026-11-10: diff clean, flag off unchanged, `kneeRestart` opt-in, 104/104 focused tests. Stills: Lou's boot hidden inside George's belly at impact, Lou leans far back, George's hands land on Lou's chest at 1.1 s. Awaiting Derek.
- **T1.3 round 3 G1 front kick: approved by Derek 2026-11-10** (8d084c4). Polish: Lou's boot hidden in George's belly at impact (-24.9 px) and he leans far back; Lou's support knee 2.02 rad; George's hands on Lou's chest at 1.1 s; support slide Kowalski 3.6 / George 4.3 / Guido 15.9 px/frame. Next T2.7 (Sonnet).

## Order and roles (2026-11-10)

2026-11-10 · Derek: make Lou's kick a working stomach kick, with weight into the mat and the receiver bending forward. Codex uncommitted revision: [old/new loops](research/animation/light-moves-2026-11/kick-working/index.html). Lou both facings: painted sole within 1.68 px horizontally / 1.76 px vertically of the neutral belly midpoint at impact, 0 backward/saturated knees, support slide max 1.09 px/frame. `sellGut` peaks at .95 rad forward, short 10-unit recoil, light canvas thump; impact .3 s and damage unchanged. Wider-rig misses: George/Kowalski/Guido support-slide max 4.93/5.15/5.20 px/frame; Kowalski's contact is 26 px above the belly. This is Lou's review candidate, not a roster-wide pass; no gate approval or commit.

Do these in order. Every **STOP**: Sonnet commits locally, writes its Progress line and stops. Derek tells Opus "review T-x", and Opus checks the diff, tests and numbers before Derek sees the page. Opus writes the Progress gate line after Derek's verdict. Nobody pushes unless Derek asks; Opus pushes.

1. **T2.6b** G2 page for the ankle lock (the wiring is in 4825c75; no page yet). George has no `ankleTwist` art, so he shows the base shin: say so on the page. Codex can draw George's later (T2.5).
2. **Stage 1** front kick: T1.1 → T1.3, STOP at G1.
2b. **T2.7** kneeling arm bar fixes (after G1).
3. **Stage 3** step-over toehold: T3.0 first asks Derek for footage.
4. **Stage 4** leg-hold slot per kit, G4.
5. **Stage 5** body slam, **Stage 6** whip-return attacks, **Stage 7** snapmare from the tie-up.
6. **GP** promote `light`.

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
- **T2.2e (Codex, 64aa65b, Opus-reviewed):** the attacker picks the boot up off the mat; the receiver keeps his entry position (per-play `ankleLockEntryClip`); the receiver's torso is in the layer chain.
- **T2.2f (Sonnet).** Derek on 64aa65b: the downed man's arm draws over his own torso (Codex lists his `rArm`, `lArm` after his torso, so both are in front). Opus on the frames: at a close entry the attacker starts and ends standing on the man's shins; the trapped leg overlaps the attacker's legs 45-48 frames.
  1. Layers: the downed man's far arm behind his torso, near arm in front (`farArm` / `nearArm`, not `rArm` / `lArm`). Add a held-frame depth check for it, both facings.
  2. The attacker starts past the man's boots: if the entry is too close, he steps back before the pickup (no standing on the shins at the first and last frame; report his soles vs the man's boots, px).
  3. The trapped leg comes up beside his near leg, not between his legs; report the overlap frames.
  4. Page vs 64aa65b, normal-speed loops and stills, both pairings and facings. **STOP for Derek.**
- **T2.3 Layering and sell.** The trapped boot in front of the attacker's torso, his near arm in front of the boot, per frame and both facings. The victim sells with what we have: arms reach for the rope or slap the mat, head up on each squeeze, the free leg kicking (reuse the falls sell offsets).
- **T2.4 Bent-boot contract (Opus + Codex, no art yet).** Boots are baked into the shin PNG (CHARACTER_PART_INVENTORY: boot not yet separate), so the bent boot is a **shin variant**: `variants.shin.ankleTwist` in each character file, same pattern as `variants.forearm.*` (own PNG, `semanticAnchors` for the heel and toe the hands grip). Runtime: the trapped leg wears it while the hold is on (from the grab, swap timed like the clasps so it doesn't pop); a rig without it keeps its normal shin, so no wrestler breaks. Opus writes the contract: pose of the foot (toe pointed and turned in; the angle taken from T2.2's held frames), canvas, anchors, knee pivot identical to the base shin.
- **T2.4 contract (written 2026-11-08, Sonnet; Derek 2026-11-08: no Opus, Sonnet and Codex only).** Plumbing already exists: `variants.shin.<name>` is a valid family (`SHARED_VARIANT_FAMILIES` in src/rig/partVariants.js), `mergeVariantEntry` inherits `box`, `jointPivotFrac`, `pivotOffsetFrac`, `soleAnchorFrac` from the base shin, and `resolvePartSelection` / the certification validator already accept it. No runtime change in T2.4.
  1. **Name and slot:** `variants.shin.ankleTwist` on `thesz-procreate-v1` and `george-roster-v1` (Kowalski, Guido later; a rig without it keeps the base shin). File `shin_ankle_twist.png`, key `<rig>_shin_ankle_twist`. Worn on the trapped leg's shin only (nearShin in all 4 pairings/facings measured, but wiring T2.6 must resolve the side like `lChannelSide` does for arms, not hardcode near).
  2. **Canvas and pivots:** the same pixel canvas as that rig's `shin.png` (Lou box 43.716 x 101.028); do NOT override `box`, `jointPivotFrac`, `pivotOffsetFrac`, `soleAnchorFrac` (the validator rejects a differing box). Pixel swap check, as clasps T2.0b: changed px above the ankle row ≈ 0 (knee end and shaft untouched). Gate: <= 5 px above the ankle row, counted by script on each rig.
  3. **Foot pose:** toe pointed (plantar-flexed) and turned in, as a foot looks when cranked. The rig has no ankle joint, so the angle lives in the art, not the clip: the base boot points about 90 deg off the shaft; draw the pointed boot about 30-40 deg further toward the sole side, with the toe foreshortened/narrowed for the turn-in. Held-frame facts from `ankle_lock_measure.mjs` (LIGHT=1, 2026-11-08): the trapped leg is 74-88 deg off the mat (mean 82, near vertical), knee bend 0.45-0.5 rad, so the shin hangs almost straight down with the boot toward the attacker's chest; draw the foot readable at that attitude. Art direction is Derek's to judge; this angle is a starting figure.
  4. **Anchors:** declare `semanticAnchors: { heel, toe }` on the variant (override, since the boot moved). Names unchanged so `ankleLockV2`'s grips (`anchor: 'heel'` / `'toe'`, `palm: 'clutch'`) work without edits. Base values for reference: Lou heel (0.21, 0.89), toe (0.82, 0.90). Bar after art: palm to heel/toe <= 6 px held on the variant (the T2.2b measure).
  5. **Swap timing (T2.6):** on at the grab while the hands are moving (reuse the clasp speed rule, `claspStep` in src/animation/clasps.js, constants CLASP_FAST etc. as the starting point), off after the release; no pop.
  6. **Done when:** contract committed; Codex T2.5 can start from items 1-4 with no questions.
- **T2.5 Art (Codex, per rig).** Lou first (`thesz-procreate-v1`, the bar), then George; Kowalski and Guido later. Each drawn from that rig's own shin and boot so the swap changes only the foot (pixel swap check like clasps T2.0b: changed px above the ankle ≈ 0). Sonnet reviews before anything is committed (Derek 2026-11-08: no Opus, to save tokens).
- **T2.6 Wire and G2 page.** Swap on, both pairings, both facings: old vs new, a normal-speed loop strip, numbers beside each, plus pixel swap counts and still close-ups of the bent boot. Include `armBar` as it is today so Derek can say if it is trash too. **STOP at G2.**
- **T2.7 Kneeling arm bar (`armBarV2`, Codex's candidate; Derek 2026-11-10 agreed with Opus's review).** Keep the kneel, the grips (wrist + forearm at 0.55, painted palm) and the timing. Fix: (1) the attacker kneels **beside** the man, both knees on the mat on the camera side, no shin or thigh drawn over his hips, legs or belly (D12 masks: below-belt and torso overlap per held frame, report px vs the candidate); (2) knee-to-mat px for the kneeling knee on held frames (bar ≤ 6); (3) no arms stuck out straight at shoulder height while he is still walking in (0-0.6 s): hands low until the reach; (4) entry and exit hip step px/frame at entries 50/70/150/210 (the T2.3 measure). Tools: `tools/debug/arm_bar_frames.mjs` (LIGHT=0 for the old clip), `tools/debug/arm_bar_review_page.mjs`. Page: candidate vs new, both pairings and facings, normal-speed loops and stills. **STOP for Derek.**

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
- **G4 then Stages 5-7.** Promotion moves to the end (GP below).

## Stage 5: body slam (Derek 2026-11-10: "comically too much")

`bodySlam` ([clip](src/animation/clips/bodySlam.js)) reads as a powerbomb (MOVE_CATALOG note). Kits: Lou, Kowalski. Reference Bret 120-121, 322-328.

- **T5.1 Measure now.** Lou on George and George on Lou if George's kit allows (else force it in the harness, say so), both facings: the victim's peak height over the attacker's head (px and as a fraction of the attacker's height), hang time at the top (frames within 10 px of the peak), drop speed px/frame, the victim's body angle at the peak and at impact, landing spot vs the attacker, knee signs and saturation on both men. One normal-speed strip. No code change.
- **T5.2 `bodySlamV2`** under `?light=v1` (D2). A real slam: the attacker scoops (one arm through the crotch, one over the shoulder: grips per D5 if the rig has them, else say which points you aim at), lifts the man horizontal at the attacker's chest/shoulder height, not above his head; brief turn; the victim drops flat onto his back in front of him. Shorter hang, the lift slower than the drop. Same damage, sell and landing type unless the measure shows a reason. Bars: peak no higher than the attacker's shoulder + 10%; victim horizontal (±20°) at the peak; attacker soles planted (D4) through the lift; D3 knees. Report every number vs T5.1.
- **T5.3 G5 page**, old vs new, both pairings and facings, loops and stills, numbers beside each. **STOP at G5.**

## Stage 6: attacks on a man coming back off the ropes (Derek 2026-11-10)

Today `tryAction` (src/Wrestler.js:1996) answers a returning runner with `clothesline`, or `backBodyDrop` when Up is held. Both are pose sequences, unverified. Derek wants a pool.

- **T6.1 Measure and map.** The current back body drop and clothesline vs a runner, both pairings and facings: timing window, contact frame, the runner's path through the move (does he stop dead, keep momentum?), knee signs, landing spot. List every kit's runner answers. Proposal for Derek (Opus fills in at the review, Derek decides): Action = clothesline, Up + Action = back body drop, Down + Action = drop toe hold, Power = hip toss or arm drag off the whip (kit picks, like the lockup slot). No code change. **STOP for Derek's input map.**
- **T6.2 `backBodyDropV2` clip** under `?light=v1` (first move). Reference Bret 184-193. The attacker ducks low, head down, as the runner arrives; the runner's momentum carries him up over the attacker's back, the attacker stands up into him and the runner flips and lands flat on his back behind the attacker. The runner keeps his speed into the contact (no stop before the flip). Bars: D3, D4, landing inside the ring (reuse a landing-room check like `snapmareFits`), no body overlap through the flip (D12 masks), runner speed at contact vs his run speed (report).
- **T6.3 Runner hip toss and arm drag.** Reuse the `hipToss` clip and `_doArmDrag` with a runner entry: the attacker catches the arm as the man arrives and his momentum carries the throw. Measure the handoff step (part steps px/frame at the first frame, the `partSteps` measure) so the entry doesn't teleport.
- **T6.4 Drop toe hold (new move).** The attacker drops to the mat and hooks the runner's ankles, the runner falls forward onto his face/chest. Registry entry (kit-gated, `antiRunner`), damage near `armDrag`, sell `chest`. Ask Derek for footage first; else hand-posed stills on Lou for his OK.
- **T6.5 Kits and AI.** Wire Derek's map, `KIT_AI_ODDS` (`antiRunner`), `npm run moves:kits -- --write`, kit checks. Each wrestler gets at least two answers and no two kits the same pair.
- **T6.6 G6 page:** every runner answer, both pairings and facings, normal-speed loop and stills. **STOP at G6.**

## Stage 7: snapmare from the tie-up (Derek 2026-11-10)

Today the snapmare only fires as the reversal of the atomic drop (`?waistlock=v1`, Arena._beginSnapmare). Codex 2026-11-05 ([note](AI_HANDOFF_ENTRIES/2026-11-05-codex-snapmare-preview-correction.md)) found the face-to-face version only in a preview harness, and it defied physics. Derek's fix: the attacker **pivots** out of the tie-up into the reversal's orientation (his back to the man's chest, same facing), takes the head and plays the existing clip. Don't author a second flip.

- **T7.1 Contract.** Input slot from the lockup (proposal: Lockup + Power with Back held; Derek decides at the STOP), the pivot (a turn under the man's arm or a step-through, about 0.3-0.4 s; facing flips once, at the hidden moment), where both men stand when the clip starts (copy the reversal's start: read `_beginSnapmare` and `snapmareFits`), the rope check (deny if the landing is past the ropes, as the reversal does). Kit-gated; works without `waistlock=v1` but under `light=v1`. **STOP for Derek's slot.**
- **T7.2 Build the pivot and the handoff into the clip.** Bars: first-frame part step at the handoff ≤ the clip's own max step (no teleport); hands on the head per the reversal's `snapmareHeadGrip`; D3, D4.
- **T7.3 G7 page**, both pairings, both facings, the reversal beside the new entry. **STOP at G7.**

## GP: promote `light` (Derek)

Default on, `=off` disables. Full suite, build, coverage before.

## Later (not in this plan)

- The §2b opener batch: club blow / forearm smash, running forearm, shoulder block, backward roll; then wristlock, headlock takeover (the snapmare is Stage 7). The spinning toehold.
- A triage strip of every built light move and hold for Derek to mark keep/polish/trash.
- `armBar` if G2 trashes it.
