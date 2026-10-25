# George transfer: the back sell on a second rig

2026-10-25 · Claude (Opus) plan, Sonnet executes · Derek judges every visual result.
Step 3 of the Revised sequence in [MOVE_PIPELINE_EVOLUTION.md](MOVE_PIPELINE_EVOLUTION.md).

## Progress

(Sonnet: one line per task: id, commit, result. Gate lines are written by Opus/Derek only.)

- T0.1 82b71a8 risefix default-on via `defaultOnFlag('risefix','1')`; promotedFlags lists it; URL-semantics test (absent/=1 on, =off/=0/no location off); rise_handoff_probe/film pass `risefix=off` for pre-fix configs; aftermath_film CONFIGS untouched (now film with the fix on). 882 tests.
- T0.2 5812e37 capabilities.json `rise-standing-channels`: default promotion recorded (Derek 2026-10-25, 82b71a8); PLAN_RISE_HANDOFF Progress line added. 882 tests.

- T1.1 e8f2734 inventory, no code. **T1.1 table** (rig data = moves to the rig · mechanism = stays shared · tool fix = the tool must stop assuming Lou):

  | # | Where | What it assumes | Mark |
  |---|---|---|---|
  | 1 | `backRisePerformance.js` `HOLD.w` .80 | swept on Lou (`hold_weight_sweep.mjs`, trough .72 keeps grip and fist ≤ 15 px) | **rig data** `holdW` |
  | 2 | same, `HOLD.breath` .08, `periodSec` 1.6 | authored breath; the sweep's trough is `w - breath` | **mechanism** |
  | 3 | `RECOVERY_BACK_HAND` arm -1.2, elbow +1.5 | probed on Lou's live settled pose (`recovery_probe.mjs`), 2.33 px | **rig data** `recoveryArm`, `recoveryElbow` |
  | 4 | `RECOVERY_BACK_HAND_ABS` = .04 + arm, .70 + elbow | the .04 is Lou's idle `lArm` (`POSES.theszProcreateIdle`); the .70 is the elbow `tweenPose('idle')` fills in | `.04` **derived** from the rig's idle pose (so no `settledArm`); `.70` **rig data** `settledElbow` (equals `REST_POSE.lElbow`, pinned by a test) |
  | 5 | `ARM_SETTLE_MS` 300, `backRiseWeight` envelope (.18 / .70), `carriedHandTarget` shape | timing and easing, not geometry | **mechanism** |
  | 6 | `sellAppearance.js` `GRIP_CONTACT_PX` 15 | measured to Lou's painted grip cup | **rig data** `contactPx` |
  | 7 | `GRIP_DWELL_MS`, `GRIP_REFRACTORY_MS`, `GROUNDED_SELL_ART` (donor name `grip`) | latch timing; which donor variant to look for | **mechanism** (a rig without the variant gets `{}` from `supportedHands`) |
  | 8 | `Wrestler.js` 1030 (hold starts), 1050 (`toHold`), 1129 (`ctx.carry`), 1773 (`_recoveryHandWeight`) | "torso has `backWaist`" means "back sell supported" | **mechanism**, 4 scattered gates → one `backSellSupport` |
  | 9 | `Wrestler.js` 1051 `clutchSell(.., HOLD.w)`, 1071 `holdWeight(h.t)`, 1809-1824 `carriedHandTarget` / `RECOVERY_BACK_HAND` | read the module constants | **mechanism**, must read the rig's values |
  | 10 | `Skeleton.js` 2262 (`_solveGroundedReach` back target), 2359 (`backContactDistance`) | use `backWaist` whenever the torso has it; `carriedRiseEndArm` goes through 2262 | **mechanism**: same gate (found, not in the plan's list). A rig with the anchor but no `backSell` must fall back to the hip joint target and report no distance, or George's rise changes at T3.1 |
  | 11 | `Skeleton.backContactDistance` falls back to the wrist when the forearm has no `clutch` patch | an unlabelled proxy | **mechanism**, label it (`contact: 'clutchPatch' \| 'wristProxy'`) |
  | 12 | `Wrestler._backRiseContext` (non-carried rise reach) | NOT gated on `backWaist`: runs on every rig under `sellart` (hip-joint target, no grip art off Lou) | **mechanism**, left as is (gating it would change the game on other rigs) |
  | 13 | `tools/debug/recovery_probe.mjs` | offsets `lArm`/`lElbow` and `lElbow: .7` are hard-coded (it prints `lChannelSide` but never uses it); default rig Lou | **tool fix** (T3.2) |
  | 14 | `tools/debug/hold_weight_sweep.mjs` | `dist <= 15` literal, grip-art criterion, default rig Lou | **tool fix** (T3.2) |
  | 15 | `tools/debug/motif_curve.mjs` `THRESH_PX = 15` | literal | **tool fix** (read `contactPx` from the rig) |
  | 16 | `tests/lyingHold|carriedRise|standingBackHand.test.js` | stub a bare `backWaist` on the torso and expect the sell to run | **test fix**: stubs must carry `backSell` too |
- T1.2 (this commit) `tests/backSellLouFixture.test.js` + `tests/fixtures/backSellLou.json`, committed before any src change: holdWeight 0-3.2 s, backRiseWeight (carry x peak x from x t), carriedHandTarget -50..400 ms, `_recoveryPose` back (2 facings x 2 l-channel owners x elbow/legacy x plain/carried x 7 weights), the grip latch over a sweep, and Lou's values. 1e-9. Test code calls go through one adapter block; the JSON is the contract.
- T1.3 35f2b7d per-rig data. `textures.backSell { holdW, recoveryArm, recoveryElbow, settledElbow, contactPx, evidence }` on Procreate Lou (today's values); new `src/rig/backSell.js` `backSellSupport(skeleton) -> { ok, reason, gripArt: 'painted'|'none', contact: 'clutchPatch'|'wristProxy', data }` replaces the four `backWaist` gates in Wrestler.js and the two in Skeleton.js (`backWaistPoint()`, `backContact() -> { dist, contact }`, `backContactDistance()` kept as a wrapper). **`settledArm` is DERIVED** (Lou's .04 equals `POSES.theszProcreateIdle.lArm`): `settledBackHand(backSell, POSES[idlePose])`; `settledElbow` stays stored (.70 = `REST_POSE.lElbow`, an unspecified idle elbow is filled with .70 by `tweenPose`). `HOLD` -> `HOLD_BREATH` + `holdWeight(sec, holdW)`; `RECOVERY_BACK_HAND*` and `GRIP_CONTACT_PX` removed; `stepGripLatch(state, dist, now, contactPx)` (a missing `contactPx` changes nothing). Lou fixture JSON unchanged (test calls go through the adapter block). New `tests/backSellSupport.test.js` (7). 891 tests.
- T1.4 (this commit) `tests/backSellRigContract.test.js`: Arena's `CHARACTERS` list must equal the test's; every registered character has backWaist AND backSell, or neither, or a `WAIVERS` entry with a reason (a waiver that is no longer needed fails). `WAIVERS` is empty: today only `thesz-procreate-v1` supports the sell; the other seven report `no backWaist anchor` and carry no data. 894 tests.
- Stage 1 done-check (4eb6d18, risefix default on): T1.2 fixture passes unchanged (JSON untouched, 1e-9). `aftermath_film.mjs suplexReverse on` films (Lou receiver, facing -1; clutchEnd 1316.7, riseStart 5516.7, rise85 6283.3, standing 6550). `motif_curve.mjs`, ms > 15 px / span, Session 4 (T4.7) -> now: lying 0/4200 -> 0/4200; rise 0/766.7 -> 0/766.7; handoff 0/266.7 -> 0/266.7; longest run > 15 px across the handoff 0 -> 0 ms; hand-to-back at the swap 0.14 px (Session 4: 0.14-0.16). Standing 900/2000 -> 900/2000. Max per-step contact jump at 6550: 31.22 -> 31.08 px (the facing turn, untouched; risefix on moves it by 0.14 px). Film output not kept (scratchpad).
- T2.1 (this commit) `tools/debug/backwaist_candidates.mjs` + `research/animation/george-transfer-2026-10/backwaist/index.html` (+ 14 PNG, `candidates.json`; 860 KB). Rule is in the tool header: contour = first alpha > 128 per row (art faces right, back = left edge); trunks top at the back = first row with trunk pink (r > 150, r - g > 90) within 40 source px of the contour (row 364); last skin row above the band along the column 24 px inside = 361; candidate row = 6 source px higher = 355 (v .6077); depth = game px inside the contour, read from the torso's displayWidth (45.33 game px for 346 source px, 7.63 source px per game px). George `george_rv1_torso` is 346 x 585. Candidates (u, v): **A on the contour (.2558, .6077)**, **B 3 px inside (.3223, .6077)**, **C 6 px inside (.3887, .6077)**. Pixel under each: A black outline, B and C skin. Supine in game (world px, facing +1): A (374.9, 434.4), B (375.1, 430.8), C (375.3, 427.2), A is the mat side; A-C is 7.19 px on screen for a nominal 6 (the torso is not scaled uniformly). Nothing added to the rig. STOP for G6a. 894 tests.
- T3.1 (this commit) George `backWaist` = { u .3887, v .6077 } (candidate C, 6 px inside; Derek's pick given in chat after de6bdaf, the G6a line itself is left for Opus/Derek). Added to generator `SPECS['george']` (`backWaist=`, written into `textures['torso'].semanticAnchors` by a 1-line hook) and by hand to `george_roster_v1.js`, identically; generator NOT run. `tests/rosterBackWaistAgreement.test.js` (3) pins SPECS == generated file for george/kowalski/guido. `backSellSupport(george)` = `{ ok: false, reason: 'no backSell data' }`; `tests/backSellRigContract.test.js` gets a George waiver. `play.mjs suplex` passes. 897 tests.
- T3.2 (this commit) shared tools fixed, then run on George (`WFM_P1=george-roster-v1`). **Tool fixes:** `recovery_probe.mjs` builds the settled pose with the game's own calls (`tweenPose('idle', 0)` then the six stance channels at the rig's idlePose, as `Wrestler.move` drifts them), takes the near channel per facing from `lChannelSide`, measures with `backContact()`, keeps the elbow inside `JOINT_LIMITS.elbow`, prints a pick (smallest offset, both facings <= 3 px); `hold_weight_sweep.mjs` reads `contactPx` from the rig, sweeps the grip art only where a grip donor exists, finds the first weight from which every larger weight stays inside `contactPx`, and suggests the smallest 0.05 `holdW` whose trough (`holdW - .08`) is past it (STOPs if > 1); `motif_curve.mjs` takes its pass line from the rig; new `backsell_probe_support.mjs` installs provisional `backSell` numbers on the page for a rig that has the anchor but no data (never saved, reported in the output); `Skeleton.backWaistPoint(force)` / `backContact({ force })` read the anchor on an unsupported rig for measuring tools only (the game path never passes it). **Tool validity on Lou (his recorded numbers reproduced):** probe pick arm -1.2 / elbow +1.5 at 2.33 px, flex 125.8 deg; sweep first weight .675 (grip) / .71 (fist) vs recorded .67 / .70, suggested holdW .80 (trough .72) = recorded. **George:** near channel `l` on both facings; settled arm .10 (= `powerIdle.lArm`, derived), settled elbow .70; recovery pick **arm -0.5, elbow +1.0**, wrist proxy 2.39 px from backWaist on both facings, elbow flex 97.4 deg (limit 157.6), 12 solutions within 6 px; hold sweep (fist, wrist proxy, no grip donor): first weight within 15 px = .47 on both facings, suggested **holdW .55** (trough .47: 14.88 px; centre .55: 12.56 px; peak .63: 10.26 px; w 1 = 0 px). `contactPx` kept at 15. Stop condition not tripped (solution exists, holdW <= 1). 898 tests.
- T3.3 (this commit) George's `backSell` { holdW .55, recoveryArm -0.5, recoveryElbow 1.0, settledElbow .70, contactPx 15, evidence: the two tools, aa33af3, 2026-10-25 } in generator `SPECS['george']` (+ 1-line hook) and by hand in `george_roster_v1.js`, identically (generator not run); agreement test now pins `backSell` too; the George waiver in the rig contract test is deleted (he has both). `backSellSupport(george)` = `{ ok: true, gripArt: 'none', contact: 'wristProxy' }`. The sell now runs on George. `play.mjs` suplex and suplexReverse pass. Settled arm is derived from his idle (`powerIdle.lArm` .10). 899 tests.
- T3.4 (this commit) `tests/backSellGeorge.test.js` (5): support result (`ok`, `gripArt: 'none'`, `contact: 'wristProxy'`, data = George's, his holdW/recovery numbers differ from Lou's, stripped data = `no backSell data` with nothing borrowed); lying hold ends the clutch on `holdW .55` and breathes around it; latch uses his `contactPx` (15 on at 14 / off at 16; 10 off at 14 / on at 9) and never selects art (no donor); carried rise carries and lands on `settledBackHand(backSell, powerIdle)` (arm -.40, elbow 1.70), unsupported = not carried; standing back hand offsets x weight on the l-channels, unsupported = bend only. The Lou fixture (T1.2) passes unchanged. 904 tests.
- T3.5 (this commit) George films, `suplex` / `suplexFlip` (Lou throws, George receives), `off` and `on`, before = `aa33af3` (anchor, no `backSell`: unsupported) in a separate worktree + dev server, after = `303ef02`; `motif_curve.mjs` with George's `contactPx` 15 (summary JSON kept in `research/animation/george-transfer-2026-10/t35/motif-curves.json`, films not kept). `aftermath_film.mjs` now also records `latch`, `lying`, `pain`; `motif_curve.mjs` reports latch flips and the shortest gap. **Before (unsupported):** hand-to-backWaist 23.99-26.59 px the whole time: lying > 15 px for 2166.7 / 2283.3 / 2400 ms of the same span, rise, handoff and standing all > 15 px, longest run across the handoff 683.3 ms, no latch. **After, `on`, the sell plan varies per run (three kinds, each repeats exactly):** (1) *last sell a back clutch, receiver stays supine* (`on/suplex` a4, `on/suplexFlip`): lying **0 ms > 15 px** of 2400 / 2166.7 (hold dist 8.48-12.29 / 9.32-13.52 px, hold travel x 3.2-3.5 y 2.2-2.4 px), rise **0**/766.7, handoff **0**/266.7, longest run across the handoff **0 ms**, standing 350/2000, hand within 15 px **0 ms** after standing, hand-to-back at the swap 0 px then 1.1 px 150 ms later; latch 2 flips (on@3233 / on@3466 ms, off@8333 / 8316 ms), nearest flips 5100 / 4850 ms apart; (2) *roll then back clutch* (a2, a5): he is **prone** from 883 ms; the hold still works (lying 0/2750, dist 7.54-10.87 px) but the rise is a prone rise, which has no protected reach (`_backRiseContext` is supine-only, unchanged): rise **766.7/766.7 ms > 15 px (15.8-39.37 px)**, handoff **266.7/266.7**, longest run **300 ms**, the hand is back within 15 px 33.3 ms after standing (the standing recovery picks it up), latch 3 flips, shortest gap 1616.7 ms; (3) *writhe last, no back clutch* (a1, a3): no hold (`lying` window > 15 px throughout, dist 18.19-35.25), rise 216.7/766.7, handoff 0, standing 350/2000. Latch: the art never changes (no donor); the latch state never flipped twice inside 250 ms in any run (shortest gap 1616.7 ms). Contact-through-rise depends on the sell's severity exactly as on Lou (probe, rise from hold .55 / .8: severity 1 reaches 0 px from t .2; severity .6 stays 7.5-17.1 px on George, 17-20 px on Lou). **Stand-up step at the swap:** pose-only (rise_handoff_probe, risefix on, supine-pain, both facings) **2.54 px** (<= 3; risefix off was 58.72); the film's contact step at the swap frame is 13.57 px (a4, facing -1 -> +1) and 14.93 px (suplexFlip, +1 -> -1): the facing turn (waist 13.57, far shoulder 11.89 in the same frame; every other frame <= 0.65 px), which risefix does not touch. 904 tests.
- T3.6 (this commit) `capabilities.json`: George added to `lying-hold`, `contact-latched-art` and `carried-rise` (supported text, fallbacks: no donor = baked fist + `wristProxy`, no `backSell` = unsupported and nothing borrowed; regression adds `backSellGeorge`, `backSellSupport`, `backSellRigContract`, `backSellLouFixture`; gap lines carry the T3.5 numbers incl. the prone-rise miss). Maturity stays `pilot`; a second visual entry per capability is `unverified` (reason: Derek has not seen George, G6). Stale `RECOVERY_BACK_HAND_ABS` / 15 px wording replaced. `moves:coverage -- --check` passes (29 moves, same counts, 22 baselined gaps). 904 tests.
- T4.1 (this commit) `research/animation/george-transfer-2026-10/viewer.html` (20 KB) + `g6/` (2180 frames, 480 px WebP q70, `data.js`; 14.6 MB, 15.5 MB for the whole `george-transfer-2026-10/` dir) built by new `tools/debug/g6_package.py` from `g6-rows.json` (the spec; it names the film runs in the scratchpad, which are not kept). Films: 24 new runs of `on` (after `suplex` x7 and `suplexFlip` x5 at 9230c55 / HEAD; before `suplex` x5 and `suplexFlip` x5 at `aa33af3` in a worktree + second dev server; Lou `suplexReverse` x2). Sell kinds that came up, kind 1 / 2 / 3 (back clutch last, supine / rolled then prone rise / no back clutch last): after `suplex` 3/0/4, after `suplexFlip` 3/2/0, before `suplex` 1/3/1, before `suplexFlip` 1/3/1. **All three kinds exist in the viewer** (kind 2 only came up in `suplexFlip`, never in 7 after-`suplex` runs). Rows (8): before and after kind 1 for `suplex` and for `suplexFlip`, before and after kind 2 (`suplexFlip`), after kind 3 (`suplex`, plan kick + writhe), Lou kind 1. Views: suplex before/after, suplexFlip before/after, prone rise before/after, the three kinds after, Lou next to George after. Checked in Chrome from `file://`: 0 broken images, 0 console errors, 1x playback advanced +1992 ms in 2004 ms wall. Page: misses first (prone rise, facing-turn swap step, writhe-last no hold, severity < 1, thin hold margin), George's hand marked "baked fist, wrist proxy, grip art pending from Codex", per-run numbers table, the T3.5 summary. Lou row: lying 0/4200, rise 0/766.7, handoff 0/266.7, standing 900/2000, longest run 0 ms, i.e. the Session 4 numbers. 904 tests.
- T4.2 (this commit) `AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer.md` (misses first, what ran, T1.1 table, the support rule, George's values against Lou's, what is a proxy, not claimed, G6 questions) + one line at the top of the `AI_HANDOFF.md` Status summary (only my hunk staged). STOPPED for Derek's G6. 904 tests.
- T6.0 (this commit) before-Rev-2 reference films at 98069ef, no src change: George `on/suplex` and `on/suplexFlip` (both kind 1, sell `clutch` last, supine) and Lou `on/suplexReverse` (kind 1). Frames kept in the session scratchpad (`t60/keep/before-*`) for the G7 viewer. `motif_curve.mjs`, ms > 15 px: George suplex lying 0/2400, rise 0/766.7, handoff 0/266.7, standing 350/2000, hold dist 8.48-12.29 px, hold travel x 3.16 y 2.2, latch flips 2 (min gap 5100), max step 13.58 px at 6550 (facing turn); George suplexFlip lying 0/2400, rise 0, handoff 0, standing 350, dist 9.4-13.64, travel x 3.51 y 2.44, flips 2 (gap 5083.3), max step 15.06 at 6550; Lou suplexReverse lying 0/4200, rise 0, handoff 0, standing 900/2000, dist 4.62-10.63, travel x 5.96 y .74, flips 1, max step 31.08 at 6550. 904 tests.
- T6.1 (this commit) D7: `holdWeight(sec, holdW)` returns `holdW` for every input; `HOLD_BREATH = { torso: .04, periodSec: 1.6 }`; new `holdOffsets(sec) -> { torso: .04 sin(2 pi sec / 1.6) }` (0 at the start); `Wrestler._lyingHold()` returns `{ w, offsets }` and the hold draw is `limitKnees(applyOffsets(GROUNDED_POSES[lying], offsets))`; the reach re-solves each frame, so the hand follows the chest. **Lou fixture proof:** regenerated with `WFM_UPDATE_FIXTURE=1`; per-key comparison of the old and new JSON: key order identical; `values`, `backRiseWeight`, `carriedHandTarget`, `recoveryPose`, `gripLatch` identical (`==` on the parsed objects); only `holdWeight` changed (now every sample .8); `git diff -U0` hunks all fall in lines 26-274, inside `holdWeight` (lines 19-288); 60 lines +/-. The adapter keeps `values.hold.breath` = .08 as the recorded retired value so `values` stays byte-identical (nothing reads it). `hold_weight_sweep.mjs` now measures each weight at torso -.04 / 0 / +.04 and scores the worst, suggests the smallest .05 step >= the first passing weight (no trough margin; the weight is constant). On Lou it reproduces first weights .675 grip / .71 fist (unchanged from T3.2; the torso breath moves the contact < .05 px: at holdW .75 worst 11.55 vs rest 11.5 px grip); Lou's `holdW` stays .80 (not touched). Tests: lyingHold hold-weight test rewritten (constant weight, torso offsets pure, 0 at start, peaks +-.04), Lou not-vacuous test checks the weight is constant. 904 tests.
- T6.2 (this commit) D8: exported `HOLD_LEGS` (next to `HOLD_BREATH`): cycle 3.6 s, ramp 400 ms, near window 0-1.4 s, far window 1.8-3.2 s (rests 1.4-1.8 and 3.2-3.6), near `nearThigh .40 / nearShin -.35`, far `farThigh .35 / farShin -.30`, `hip 2` at each peak; each lift a sin^2 bump times `smooth(t / .4)`. `holdOffsets(sec)` now returns `{ torso, nearThigh, nearShin, farThigh, farShin, hip }` (all 0 at sec 0), drawn through `applyOffsets` + `limitKnees` in the `_lyingHold` path. The windows (1.4 / 0.4 s) are mine, the plan gave only the 3.6 s cycle and the order; they are in the one constants object. Tests (2 new in lyingHold): pure in time; 0 at the start (and for -1 / NaN); periodic in the cycle; peaks equal `HOLD_LEGS` at the window middles (after the ramp); one knee at a time; rests are 0; ramp monotone and under the un-ramped bump; knee flex inside -.25..2.55 on supine and prone every 20 ms over 3 cycles; the draw passes the offsets (first frame = the lying pose within 2e-3). 906 tests.
- T6.3 (this commit) rise continuity: `_startRiseUp` keeps the hold's offsets (`_riseHold`, beside `_riseFrom`; the quick rise clears it), `Wrestler.draw` passes them to `Skeleton.updateGetUp(..., holdOffsets)`, which adds `offset x riseHoldCarry(t)` to the sampled rise pose and runs `limitKnees` while the carry is > 0; `riseHoldCarry(t) = 1 - smooth(t / RISE_HOLD_EASE)`, `RISE_HOLD_EASE = .15`, 0 from .15 on (pure). New probe `tools/debug/hold_rise_probe.mjs` (rise_handoff_probe's harness: game stepped by hand, hold stepped for N s, then the game's own `_tickSell` + `_startRiseUp`; per-part corner displacement between the last hold frame and the first rise frame, both facings, with the carry and without it). **Hold -> rise step, px, max over all parts (worst part), measured at HEAD of this commit:** | hold time (what the legs are doing) | Lou carry | Lou no carry | George carry | George no carry | with facings +1 and -1 identical to the 0.01 px. 0.7 s (near knee peak): .23 head | 23.86 nearShin | .24 head | 23.96 nearShin. 1.3 s: .36 nearThigh | 3.33 head | .35 nearThigh | 3.74 head. 2.5 s (far knee peak): .21 head | 20.87 farThigh | .24 head | 20.64 farThigh. 3.1 s: .32 farThigh | 1.42 head | .31 farThigh | 1.59 head. 5.4 s: .17 head | 2.5 head | .18 head | 2.79 head. **Worst with the carry: .36 px (Lou and George, both facings), target <= 3: met, stop condition not tripped.** Natural frame-to-frame motion next to the swap: hold 0.16-.79 px, rise 2.04-2.47 px. Hand-to-back distance across the swap: Lou 7.63 -> 7.63, George 10.53 -> 10.50 (0.7 s). Tests: rise passes the hold offsets (and null with no hold), `riseHoldCarry` shape and purity, quick rise clears. 907 tests.
- T6.4 (this commit) D6. **Mechanism:** `backSell.handUnder` (optional boolean, default false; `backSellSupport` rejects a non-boolean with `invalid backSell data: handUnder`; BACK_SELL doc comment updated). `Wrestler._handUnder()` = sellart on, `_gripLatch.on`, no active move, state `down` / `gettingUp` / `standing`, the sell playing (if any) is a `back` part, and the rig's `handUnder === true`; evaluated every `draw()` and handed to `Skeleton.setHandUnder()` right before `setDepth`, which puts `nearForearm` at `base + .00095` and `nearHand` (if the rig has one) at `base + .00094`, i.e. behind the torso (`+ .001`), after the opt-in depth rules (it wins them); the near upper arm is untouched (`+ .00401`). The depth follows the latch, so it inherits the latch's dwell. **George:** `backWaist` moved to candidate A (u .2558, v .6077) and `handUnder: true`, in generator `SPECS['george']` and `george_roster_v1.js` identically (generator not run; the agreement test now also parses `True`/`False`). **Re-measured at A with the shared tools** (`WFM_P1=george-roster-v1`): `hold_weight_sweep.mjs` (now scores each weight at the 36 `holdOffsets` samples of one ramped leg cycle through `applyOffsets` + `limitKnees`, worst of them; recipe: smallest .05 step >= the first weight whose larger weights all stay inside `contactPx`, since the weight is constant there is no trough margin): first passing weight **.43** both facings (C: .47), suggested **holdW .45** (C: .55); at .45 the contact is **13.99 px at rest / 14.35 px worst over the cycle** (margin to the 15 px line **.65 px**; C: centre 12.56 / trough 14.88; breath and legs move it .36 px); dist at w .5/.6/.7/.8/.9/1 = 13.02 / 10.38 / 7.76 / 5.15 / 2.57 / 0. `recovery_probe.mjs`: settled arm .10 (= `powerIdle.lArm`), settled elbow .70, near channel `l` both facings; 13 solutions within 6 px; pick (smallest offset, both facings <= 3 px) **arm -0.7 / elbow +1.1, wrist proxy 1.94 px both facings, elbow flex 103.1 deg (limit 157.6)** (C: -0.5 / +1.0, 2.39 px, 97.4 deg). Standing target (derived arm + offset, settled elbow + offset): arm -0.60, elbow 1.80 (C: -0.40 / 1.70). `contactPx` kept 15, anchor not moved beyond A, nothing relaxed; no hold weight <= 1 problem, no recovery problem: stop conditions not tripped. Written with `evidence` into `backSell` in both places. Lou on the new sweep: first weights .675 grip / .71 fist (unchanged), his `holdW` .80 untouched. Tests: George's anchor/numbers pin updated, clutch-end weight compared with a tolerance (.45 is not exact in floating point). 907 tests.
- T6.5 (this commit) tests + records. New `tests/handUnder.test.js` (4): `_handUnder()` is true for George in each back-sell phase (back clutch, lying hold, rise, standing recovery) while the latch is on and `draw()` hands the flag to the skeleton; false with sellart off, with no latch, with `handUnder: false`, and for Lou in all four phases (latch on) so his depths are unchanged; the flag is restored on the first draw after the latch goes off or the state leaves the sell (pinned, possum, falling, grabbed, an active move, a sell on another part), and follows the latch frame by frame (on, on, off, off, on); `Skeleton.setDepth` on a part-recording stand-in: `handUnder` false = the existing order exactly, true = `nearForearm` .00095 / `nearHand` .00094 under the torso (.001), above the head, every other part (incl. the near upper arm) unchanged, wins over `_forearmOverUpperArm`, restored exactly when cleared. `tests/backSellRigContract.test.js` (+1): `handUnder` is `undefined` or boolean on every character, George true, Lou undefined, `backSellSupport` rejects `'yes'`, `1`, `null`, `{}` (`invalid backSell data: handUnder`) and accepts `true` / `false` / absent. `capabilities.json`: `lying-hold` (constant weight, chest breath, HOLD_LEGS, rise carry, new regression `handUnder.test.js`, mechanical evidence = the hold_rise_probe numbers, visual `unverified` for George (G6 not approved, Rev 2 pending G7) and for Lou (his approved look gains breath and legs, G7)), `contact-latched-art` (handUnder, anchor A), `carried-rise` (George's new recovery). `moves:coverage -- --check` passes (29 moves, 22 baselined gaps). 912 tests.
- T7.1 (this commit) G7 viewer: `research/animation/george-transfer-2026-10/g7-viewer.html` (24 KB) + `g7/` (1906 frames, 400 px WebP q70, `data.js`; **9.75 MB** total with the page), built by new `tools/debug/g7_package.py` from `g7-rows.json` (the films are in the session scratchpad, not kept). Films at f334b46 (after) vs 98069ef (before), `on`: George `suplex` and `suplexFlip` (kind 1, sell = back clutch only, both before and after), Lou `suplexReverse` (kind 1), one George kind-2 (`suplexFlip`, roll then clutch, after only). Tool changes: `aftermath_film.mjs` samples `handUnder` (1 when the near forearm's real depth is below the torso's); `motif_curve.mjs` reports depth swaps (count, ms and state, shortest gap, ms behind the torso). Views: George suplex before/after, suplexFlip before/after, Lou before/after, prone after. Page: misses first, hold -> rise table (hold_rise_probe, f334b46), George's hold at A vs C, per-run numbers, latch flips and depth swaps. Checked in Chrome from `file://`: 0 console errors, 0 broken images in all 4 views, 1x playback +1993 ms in 2000 ms. **Numbers, after Rev 2 (before in brackets):** George lying > 15 px 0/3783.3 (0/2400), rise 0/766.7, handoff 0/266.7, standing 550/2000 (350/2000); hold dist 11.3-11.85 / 12.41-13.01 px (8.48-12.29 / 9.4-13.64); hold travel x/y 1.17/3.9 and 1.29/4.28 px (3.16/2.2, 3.51/2.44), so the contact still moves ~4 px in the world with the chest and hips, only 0.55-0.6 px relative to the back waist; Lou lying 0/4200, standing 900/2000, dist 7.61-7.65 (4.62-10.63), travel 1.22/2.5 (5.96/.74). **Depth swaps:** George suplex 2 (under@1833.3 in `down`, normal@8133.3 in `standing`), shortest gap 6300 ms; suplexFlip 2 (under@1850, normal@8116.7), 6266.7 ms; prone 4 (under@2883.3, normal@5516.7 at the rise start, under@6800 standing, normal@8116.7), shortest gap 1283.3 ms; Lou 0. No two swaps inside 250 ms (latch gaps 6300 / 6266.7 / 1316.7 ms). **Facing-turn step (NOT unchanged for George):** the contact (= backWaist, hand-to-back 0 px) jumps in the mirror frame 13.58 -> 25.46 px (suplex) and 15.06 -> 27.95 px (suplexFlip); Lou 31.08 -> 31.08. The pose-only stand-up step (rise_handoff_probe, risefix on) is still 2.54 px (George) / .65 (Lou). Cause: the anchor sits on the contour, further from the mirror axis than candidate C. 912 tests.
- T7.2 (this commit) `AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer-rev2.md` (misses first, what changed, G7 questions, not claimed) + one Status summary pointer line in `AI_HANDOFF.md`. STOPPED for Derek's G7. 912 tests.
- T8.0 fe97361 no src change. Before reference for Rev 3 = the G7 `after` frames already committed at `research/animation/george-transfer-2026-10/g7/after-suplex`, `after-flip` (f334b46 films, 400 px WebP). Not re-filmed. 912 tests.
- T8.1 9969c99 `tools/debug/around_via_candidates.mjs` + page `research/animation/george-transfer-2026-10/around/index.html` (self-contained, images inlined, 1.1 MB) + `candidates.json`. **Fist length 21.62 game px**: the forearm art's hand from the wrist row (distalAnchorFrac.v .5298 = row 233 of 439) to the last row with alpha > 128 (398) = 165 source px x .1310 game px per source px (forearm displayHeight / source height). It is an OPEN hand, so wrist-to-fingertip; the widest hand row is 15.46 game px. Placement: from backWaist (u .2558, v .6077) at 45 deg from straight down toward the back contour, k x fist; each point must have no painted pixel (alpha > 0) within 2 game px, else it is pushed left (none needed pushing). **A 1 fist: u -0.0814, v 0.8071** (9.84 game px clear); **B 1.5: u -0.25, v 0.9069** (18.02 clear); **C 2: u -0.4186, v 1.0066** (27.61 clear). All three are off the image's left edge (u < 0); C is also below its bottom (v > 1); imageAnchorPoint does not clamp. Shown on the torso at 4x and on supine and standing frames, both facings. aroundVia NOT added to the rig. STOPPED for G8a. 912 tests.
- T8.2 7682534 D10 clearance gate. New `src/rig/silhouette.js` (pure: `buildSilhouette` = two-pass 3-4 chamfer distance field of the torso alpha >= 128 on a grid padded 256 source px, so points off the image like aroundVia u < 0 have a true distance; `imagePixelPoint` = inverse of `Skeleton.imageAnchorPoint` incl. flips; `silhouetteDistance` in game px, Infinity when unusable; `handClearance(image, samples, silhouette, margin 1 px)` = every sample >= margin; browser seam `silhouetteOf` (cached per texture key) and `handTipOf` = centroid of the lowest 4 opaque rows of the forearm art). `Skeleton.nearHandSamples()` = wrist, contact (clutch patch or wrist), forearm distal midpoint (3/4 elbow to wrist), hand end (the forearm art's last painted point, only on `handInForearm` rigs); `Skeleton.handClearance()`. `Wrestler._handContext()` (today's rule minus the latch), `_handWant()` (context AND latch), `_handUnder()` = want AND (already under OR clear); leaving = not want AND (already out OR clear); out of context resets at once; unmeasurable = not clear; `_handPending` / `_handSkips` count a wanted change that waits / was dropped without clearing. The test of clearance uses the pose LAST drawn (1 frame old, the swap is decided before this frame's skeleton update). Tests: `silhouette.test.js` (5) + 3 D10 tests in `handUnder.test.js`. `aftermath_film.mjs` now samples `clr` (per-sample game px outside the art) and `handWant`. **Measured at HEAD (George suplex kind 1, film at 5fce412 before this commit, so no gate):** the near wrist is ON the painted art (0 px outside) at every one of the 3233 ms latch-on, the whole lying hold (forearm distal 3.4-4.8 px outside, hand end 0) and the whole standing recovery up to the latch release at 8133 ms (wrist 0, hand end 9.7), so with today's latch rule alone the D10 gate would never let the hand swap: the hand has to be brought OUT first (T8.3). Hand end - wrist: the open hand reaches 21.6 px past the wrist (T8.1). 920 tests.
- T8.3 8a816ca D9 around path. **Data** (generator SPECS and `george_roster_v1.js` identically, evidence strings extended): `backSell.aroundVia = { u -0.25, v 0.9069 (G8a B), recoveryArm -0.6, recoveryElbow -0.4, approach 0.4 }`, `holdW .45 -> .7`. `backSellSupport` validates `aroundVia` (optional, finite u,v, only with `handUnder`; `recoveryArm`/`recoveryElbow` both or neither, finite; `approach` in (.05,.45)); agreement test regex now reads a nested `backSell=` object. **Mechanism:** `rig/backSell.js` `aroundGoal` (the grounded reach is a polyline in the reach weight w: posed place -> via over [0, viaW .2], via -> waist over [.2, 1], backwards on the way out; used where `_solveGroundedReach` picks the back-waist target, so the back clutch, the lying hold and the rise all take it; Lou has no `aroundVia`, so his goal is untouched), `aroundChannel` + `recoveryVia` (the standing recovery's channels run start -> start + via offset over hw [0, standW .5] -> target over [.5, 1] in `_recoveryPose`, both the carried and the plain branch), `Skeleton.aroundViaPoint()`, `Skeleton.AROUND` (the tunables, for probes), `clutchSell(..., approach)` (default .25; George's back clutch takes .4). **Three deviations from the plan text, each forced by a measurement:** (1) *the want is not the grip latch.* At HEAD the wrist is within contactPx (15) of the waist only once it is on the art, and the measured clear range ends at 17.4 px (tools/debug/around_path_probe run, deleted after use): the latch can never overlap clearance, so `_handWant()` is the route: grounded/rise = the back reach weight the skeleton solved last draw >= viaW (`Skeleton._backReachW`, consumed by `_handWant`) OR any back clutch item of the plan (between two clutches the weight falls to 0 and must not flip the depth); standing = recovery hand weight >= standW. (2) *holdW .7.* The route is longer than the straight line, so the hold weight that keeps the contact within 15 px moved: `hold_weight_sweep.mjs` first weight within 15 px at every sampled offset .695 both facings, at .7 worst 14.52 px (margin .48 px, was .65), dist at w .5/.6/.7/.8/.9/1 = 24.2/19.36/14.52/9.68/4.84/0; the standing settled contact (hw 1) is exactly the old one (`aroundChannel` returns the target at hw 1; recovery_probe inputs unchanged), so recoveryArm/Elbow are not re-measured. (3) *`approach` .4.* With the .25 key the hand moved up to 3.53 px/frame relative to the back waist in a 1.38 s clutch (baseline straight path 1.89) because the route is ~38 px against 21; at .4 it is 2.21 (`route_probe.mjs`; polyline beat a Bezier at equal approach). The compact clutch (.63 s) stays fast: 4.83 px/frame vs 4.12 straight (baseline already > 2.5). **Standing via pose** from new `tools/debug/around_recovery_probe.mjs` (the recovery_probe method aimed at the via point): arm -0.6 / elbow -0.4, wrist 8.03 px from the via point on both facings, all four samples clear (wrist/contact/forearm 15.96 px, hand end 25.16 px), 30.78 px from the waist; elbow inside its limit. `Wrestler.draw` gives the combat guard up completely until hw < standW for a rig with a via pose (at HEAD the guard x (1 - hw) displaced the arm: the via pose landed on the art, wrist 0 px, until measured). **Measured (new `tools/debug/route_probe.mjs`, the real Wrestler draw frame by frame, both facings identical):** clutch 1.38 s one swap, under at 17 ms (hand clear by 2.82 px), max wrist step rel. waist 2.21 px (after frame 30: .88); clutch .63 s under at 17 ms, 4.83 (after 30: 1.92); standing release one swap, over at 1783 ms at hw .491 with 15.8 px clear, after-30 max step 1.94 (the frame-9 2.97 is the probe's own start-up), 0 skips. **Film (`aftermath_film.mjs` `on/suplex` kind 1, on the T8.3 working tree):** swap in 266.7 ms (clutch, wrist 2.24 / forearm 1.94 / hand end 16.58 px clear), swap out 8333.3 ms (standing; 11.76 / 12.02 / 19.37), 1 swap each way, 0 skips, max step rel. waist 2.43 px at 1533 ms (clutch plateau, body squeeze). Tests: `aroundRoute.test.js` (3), route/validation/agreement additions, `handUnder.test.js` rewritten for the new want. 927 tests.
- T8.4 89cd0fe D11 no bezel. **Method: the torso-alpha mask** (the preferred one), not the elbow cap. Phaser 4.1 per-object filter: `nearForearm` (and a separate `nearHand`) `enableFilters()` + `filters.internal.addMask(torsoImage, invert true, viewCamera = the filter's OWN camera)`; the part keeps its normal depth (George: forearm .00402 over the upper arm .00401, so the elbow shows no bezel) and the mask hides it wherever the torso is painted. Found by experiment (`mask.mjs`, scratchpad): the mask with the default or the main camera as view camera changed 0 px (it lines up with nothing); with the filter's camera it removes the fingers inside the silhouette, at zoom 1 and 3. `Skeleton.setDepth`: `masked = _handUnder && _forearmOverUpperArm && syncHandMask(true)` (masks made on first use, afterwards only `setActive`, an inactive filter is not rendered); a rig without `forearmOverUpperArm`, or a part with no `enableFilters` (a test stand-in), takes the Rev 2 depth order (.00095), and leaving restores everything the next draw. **Probe** `tools/debug/forearm_inside_probe.mjs`: the real `Wrestler.draw` puts the hand behind the body, the canvas is screenshotted with the forearm visible twice (to find the canvas's own speckle) and hidden, the changed pixels are mapped through the camera to world space and looked up in the torso alpha; both modes (mask, and the Rev 2 depth order as control), both facings, six states. **Forearm pixels inside the torso art (alpha >= 128) / in its painted interior (alpha >= 250), mask vs depth control:** hold 10/4 vs 6/2; back clutch u .5 0/0 vs 0/0; rise t .4 24/21 vs 25/22; standing hw 1 62/52 vs 56/46; standing hw .6 and .5: 0 vs 0; the leaked pixels are at the torso's outline, at most 1.56 game px inside the art (control 1.64), i.e. where the forearm's black outline meets the torso's own contour (see the red marks in the probe shots), the same ring the depth order has; none in the interior of the art. So the count is NOT 0 (10 to 62 px of 840 to 3460 visible forearm pixels), it equals the old order's to within a few px. Forearm visible px: mask 3464 vs depth 3098 in the hold (the mask shows the elbow end over the upper arm). **Elbow clearance** (outside the art, all states probed): 16.9 to 22.6 px, so no part of the elbow is ever masked. **Cost** (headless Chrome, software GL, whole `game.step` + both `Wrestler.draw`, two George wrestlers with the hand behind the body, 4 rounds x 200 frames): **9.36 ms mask vs 8.36 ms depth, +1.0 ms/frame**. Tests (+2 in `handUnder.test.js`): mask mode keeps the depth over the upper arm and switches an inverted torso mask (through the filter camera) on and off, reuses it, falls back to depth without `forearmOverUpperArm` or without filters. `silhouetteOf(image, threshold)`. 929 tests.
- T8.5 (this commit) films and metrics, with three fixes the films forced (all in this commit, **superseding T8.3's `approach` and recovery numbers**). **Fixes:** (1) `clutchKeys(approach)`: with the reach taking .4 the squeeze/relax keys sit .1 apart behind it (.5 / .6, was .45 / .70) and the let-go gets the rest (.4), because a clutch that is not the last one lets go back to rest along the same longer route and moved the wrist 3.03 px/frame (.25 default keys unchanged). (2) `AROUND.rampMs` 800: the standing recovery fades in over .8 s (not .2 s) on a rig with a via pose; the entry with no carried rise (after a prone rise) moved the wrist 8.2 px/frame with 400 ms, 3.88 px with 800 ms (straight path, 200 ms: 4.46). (3) the T8.3 probe's `under` read the depth, which D11 no longer changes; it reads the flag the Wrestler hands the skeleton. **Probe, final** (`route_probe.mjs`, real draw, both facings identical; max wrist step relative to the back waist, px/frame): clutch 1.38 s last 2.21, not last 2.21 (straight 1.89 / 1.89), compact .63 s 4.83 (straight 4.12), standing release after frame 30 1.94, entry 3.88. **Films** (`aftermath_film.mjs` `on`, final code; the sell plan is random so kinds were re-rolled until kind 1 / kind 2 came up): `suplex` kind 1 (clutch only), `suplexFlip` kind 1 (writhe then clutch), `suplexFlip` kind 2 (roll then clutch, prone rise). **Swap table** (clearance px outside the art: wrist / contact / forearm distal / hand end; frames from the route weight's via crossing, reach .2 on the mat, hand weight .5 standing, negative = the swap came first): suplex in 266.7 ms clutch, weight 0, 2.24 / 2.24 / 1.94 / 16.58, -16 frames; out 8333.3 ms standing, weight .491, 11.76 / 11.76 / 12.02 / 19.37, 0 frames. suplexFlip in 1966.7 ms clutch, 3.03 / 3.03 / 2.56 / 18.52, -11; out 8333.3 ms, 13.07 / 13.07 / 13.36 / 21.50, 0. prone in 1483.3 ms clutch (weight .059), 5.75 / 5.75 / 5.11 / 19.95, -5; out 6100 ms in the rise (weight 0), 8.37 / 8.37 / 3.67 / 30.23, +34; in 6966.7 ms standing (weight .506), 15.25 / 15.25 / 15.30 / 23.37, 0; out 8333.3 ms, 13.06 / 13.06 / 13.34 / 21.48, 0. All swaps clear (smallest 1.94 px). **Skipped swaps 0 / 0 / 0**; frames a wanted swap waited for clearance 15 (250 ms, at the start of the clutch) / 0 / 39 (566.7 ms, after the prone rise starts); shortest gap between swaps 8066.6 / 6366.6 / 866.7 ms (no flicker). **Max wrist step relative to the back waist, by window** (suplex / suplexFlip / prone): clutch 1.82 / 2.00 / **3.26**, hold .04 / .04 / .05, rise 1.57 / 1.74 / **16.63**, standing 1.61 / 1.56 / **2.85**; at the facing turn the wrist and the waist mirror together (0 px relative). A kick or writhe before the clutch moves the whole body (3.96 px writhe, 9.47 kick in an earlier run) and is not the hand's route. **Not met, prone run only:** the clutch window 3.26 px at 1533 ms (a prone back clutch, the same time in every prone film; supine runs are 1.82-2.00), the prone rise start 16.63 px (G7 film: 9.84 px contact step at the same frame; the hand snaps from the hold to the prone rise's pose, no hand route there, and the hold now sits further from rest because holdW went .45 -> .7), and the standing entry after the prone rise 2.85 px (entry probe 3.88). These are the prone rise's own missing hand (out of scope, Derek's call) made larger by the longer hold route; reported, not tuned. **Forearm pixels visibly inside the torso art** (alpha >= 128 / painted interior alpha >= 250 / deepest, game px), mask runs, at the film's marks (zoom 1): clutchPeak, hold, riseStart, standing, recovery +0.2/+1 s: 0 in the supine films (hold 13 / 10 / 1.28 in the prone one); rise .2 / .34 / .55 / .85: suplex 10 / 29 / 39 / 80 (8.5 deep), suplexFlip 1 / 8 / 47 / 44 (4.9 deep), prone 0-9. **NOT 0.** The control (same suplexFlip scenario, `WFM_DEPTH_CONTROL=1`: the Rev 2 order, forearm physically behind the torso): rise .2 / .34 / .55 / .85 = 2 / 6 / 46 / 52 (4.9 deep), so those pixels are not forearm drawn over the torso: the hidden-forearm diff finds changed pixels that the torso's alpha map says are painted, in a rising torso, with the forearm behind it as well; I could not explain them (the torso hide self-check shows 22% of a torso's own changed pixels fall outside its alpha >= 128 map, an edge ring) and report the control next to them. Cost +1.0 ms/frame (T8.4). Lou: `backSellLouFixture` unchanged, `handUnder.test.js` pins his depths in every phase. 930 tests.


## Goal

The suplex back sell (lying hold, contact-latched grip art, carried rise, standing back hand) runs only
on Procreate Lou (`thesz-procreate-v1`), because it needs a painted `backWaist` and because its numbers
were measured on Lou. Make it run on **`george-roster-v1`** (the new PSD George; NOT `george.js`, whose
art is being replaced) **without copying Lou's numbers and without new art**. That proves the anchor
contract and the declared fallbacks on a distinct rig, and leaves a repeatable recipe for the next rigs.

In the `suplex` film scenario Lou suplexes George, so George is already the receiver there.

## Decisions (Derek 2026-10-25, recorded by Opus)

- D1. Order: promote `risefix` to default first (Stage 0), then the George transfer.
- D2. George's `backWaist` point: **Sonnet proposes it, Derek approves it** (gate G6a) before
  anything is tuned against it.
- D3. No new art in this plan. George has no grip donor; his near hand keeps its baked fist and the
  contact uses the wrist as a labelled proxy. Codex's grip donor for George arrives separately
  (`AI_HANDOFF_ENTRIES/2026-10-25-claude-codex-george-grip-request.md`); dropping it in is Stage 4,
  with no code change expected.
- D4. Ignored for verification: `thesz`, `thesz-front3q-r1` (Derek). Out of scope: `george.js`,
  `thesz-roster-v1`, Kowalski, Guido, the parked plant (`&plant=1`), figure four, `contactTargets.js`,
  the evidence envelope.

## Rules

- Node 22: `export PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH`. `npm test` after every task. Dev server
  for browser tools: `npm run dev` (127.0.0.1:5173), tools read `WFM_URL=http://127.0.0.1:5173`.
- One commit per task, message starts with the task id. Commit locally. **Never push.**
- Don't stage untracked `research/**` dirs that you didn't create in this plan.
- Never claim something "reads", "looks" or "sells" right. Report measurements; Derek judges.
- Don't edit `src/characters/george_roster_v1.js` by hand alone: it is generated by
  `tools/wrestler-cutter/prepare-roster-character.py george`. Any rig data you add goes in the
  generator's `SPECS['george']` AND the generated file, identically. Don't regenerate the file (that can
  overwrite Derek's tuner edits). Add the field by hand to both, and add a test that the two agree.

## Stage 0: risefix becomes the default

G5 was approved ("looks good"). Follow the `b8b274b` pattern exactly (read `git show b8b274b` first).

- **T0.1** `src/Wrestler.js`: `riseFixCandidate = () => defaultOnFlag('risefix', '1')`. Update the comment
  (promoted by Derek 2026-10-25, G5; `?risefix=off` disables; Node without `location` stays off).
  `tests/support/promotedFlags.js` `onlyListed`: add `'risefix'` to the list. Update every test that relied on
  absent = off (start from `grep -rln risefix tests`). Add one test pinning the URL semantics: absent → on,
  `=1` → on, `=off` → off, no location → off.
  Tools: `rise_handoff_film.mjs`, `rise_handoff_probe.mjs` must pass `risefix=off` explicitly for their
  "off" config. `aftermath_film.mjs` `CONFIGS`: leave as is (they now film with the fix on, which is
  the game); note it in the commit message.
- **T0.2** `tools/move-critic/capabilities.json`: on the risefix record (`rise-standing-channels`),
  record the default promotion with date and the G5 reference. `PLAN_RISE_HANDOFF.md` Progress: add
  "PROMOTED to default (Derek 2026-10-25, PLAN_GEORGE_TRANSFER D1), commit <hash>".
  `npm run moves:coverage -- --check` passes.
- Done-check: `npm test` green; `npm run build` green;
  `WFM_URL=... node tools/debug/play.mjs` suplex, suplexReverse and bodySlam scenarios pass
  (same as b8b274b's check).

## Stage 1: separate Lou's numbers from the mechanism (Lou unchanged)

- **T1.1 Inventory.** List every place the back sell assumes Lou. Write the table into this plan's
  Progress section as `T1.1 table`. Known ones (confirm and find any others):
  - `backRisePerformance.js`: `HOLD.w` (swept on Lou, `hold_weight_sweep.mjs`), `RECOVERY_BACK_HAND`
    (probed on Lou, `recovery_probe.mjs`), `RECOVERY_BACK_HAND_ABS` (Lou's settled idle `lArm .04`,
    `lElbow .70` plus offsets).
  - `Wrestler.js`: every `_semanticAnchors?.backWaist` gate (lines near 1027, 1048, 1127, 1771) uses "has
    backWaist" to mean "is supported".
  - `sellAppearance.js` `GRIP_CONTACT_PX = 15`: measured to Lou's painted grip cup.
  - `recovery_probe.mjs`: hard-codes `lElbow/rElbow .7` and "Lou's near hand is the l-channel".
  For each entry, mark it **rig data** (moves to the rig), **mechanism** (stays shared) or **tool fix**.
- **T1.2 Snapshot Lou first** (before any `src` change). Add `tests/backSellLouFixture.test.js` plus a fixture:
  for `thesz-procreate-v1`, record `holdWeight` over 0–3.2 s, `backRiseWeight` over t for from/peak/carry
  combinations, `carriedHandTarget` over 0–400 ms, and `_recoveryPose` back output for both facings at
  several weights (stub the skeleton as the existing tests do). Tolerance 1e-9. Commit it on its own.
- **T1.3 Per-rig back-sell data.** Add one rig-data object, `textures.backSell`, next to the anchor:
  `{ holdW, recoveryArm, recoveryElbow, settledArm, settledElbow, contactPx, evidence }`, with
  `evidence` naming the tool and date that measured it. Give Lou's procreate rig exactly today's values.
  If Lou's `settledArm` 0.04 equals his idle pose's `lArm` in `POSES`, derive it at runtime instead and drop
  the field. Say which you did.
  Mechanism: `backRisePerformance.js` and `Wrestler.js` read these values from the rig.
  **Support rule (the contract):** the back sell runs on a rig only when it has BOTH
  `torso.semanticAnchors.backWaist` AND `backSell`. Replace the scattered `backWaist` checks with one helper,
  e.g. `backSellSupport(skeleton)`, that returns `{ ok, reason }`. A rig with the anchor but no `backSell` is
  `unsupported: 'no backSell data'`: the sell stays off, and Lou's numbers are never used as a default.
  Grip art: `nearGripParts` already returns `{}` when a rig has no `grip` variant. Make that explicit in
  `backSellSupport` (`gripArt: 'painted' | 'none'`), and make `backContactDistance` report which contact it
  measured (`'clutchPatch' | 'wristProxy'`).
- **T1.4 Rig contract test.** Every registered character either has both `backWaist` and `backSell`, or
  neither, or is listed in a waiver in the test with a reason. Today only Lou procreate has them.
- Done-check: the T1.2 fixture passes unchanged. Full `npm test` is green. `node tools/debug/aftermath_film.mjs` `on`
  `suplexReverse` (Lou the receiver) still films. Compare `motif_curve.mjs` output to the Session-4 numbers
  in PLAN_SUPLEX_RISE.md Progress (lying gap 0 ms > 15 px, handoff 0 ms). Any difference: **STOP and report.**

## Stage 2: propose George's backWaist, then STOP (G6a)

- **T2.1 Propose.** The point is on George's torso art (`george_rv1_torso`): the small of the back on
  the back-facing side, above the trunks waistband, at the contour, not inside the body. Lou's is
  `{ u: .22, v: .60 }` on a three-quarter torso. George's torso is a different painting, so
  **don't copy those numbers.** Find it from the art: the torso PNG's alpha contour on the back side,
  at the height of the top of the trunks. Produce:
  - three candidates (e.g. on the contour, 3 px inside, 6 px inside), each with u,v;
  - `research/animation/george-transfer-2026-10/backwaist/`: the torso PNG at 4× with the three points
    and a grid, plus an in-game paused frame of George supine (both facings) with the three points drawn,
    using `Skeleton.imageAnchorPoint`;
  - a `index.html` that shows them side by side, self-contained (images relative to it).
  Commit the tool you write (under `tools/debug/`) and the package.
- **STOP.** Reply to Derek with the three candidates and the page path. Don't add the anchor to the rig
  yet.

G6a — Derek 2026-10-25: candidate **C** (u .3887, v .6077, 6 px inside the contour), given in chat after de6bdaf; applied in 8119db6. Recorded by Opus.

## Stage 3: run it on George (after G6a)

- **T3.1** Add Derek's chosen `backWaist` to George (generator SPECS + generated file, identically, plus the
  agreement test). No `backSell` yet: `backSellSupport` reports `no backSell data`, and the game is unchanged.
- **T3.2 Measure George's numbers with the shared tools** (fix the tools, not the numbers):
  - `recovery_probe.mjs`: read the settled elbow and the near channel from the rig
    (`skeleton.lChannelSide(facing)`, the live settled pose), not constants. Then run it with
    `WFM_P1=george-roster-v1`.
  - `hold_weight_sweep.mjs` with `WFM_P1=george-roster-v1`. George has fist art only, so the criterion is
    the fist (wrist proxy) within `contactPx` of backWaist on both facings at the breathing trough.
  - `contactPx`: keep 15 unless the wrist proxy makes 15 meaningless. If you change it, give the reason
    in `evidence`.
  - **Stop condition:** if no hold weight ≤ 1 puts George's hand within `contactPx` on both facings, or
    the recovery probe finds no solution within the elbow limit, **STOP and report** with the closest
    distances. Don't move the anchor, don't raise the limit, don't relax `contactPx` to make it pass.
- **T3.3** Add George's `backSell` (generator SPECS + generated file) with the measured values and `evidence`.
  Now the sell runs on George.
- **T3.4 Tests.** Extend `lyingHold`, `carriedRise` and `standingBackHand` tests (or add `*.george.test.js`)
  so the mechanism is exercised with George's data and support result (`gripArt: 'none'`,
  `contact: 'wristProxy'`). Lou fixture (T1.2) still passes.
- **T3.5 Film.** Use `aftermath_film.mjs` for `suplex` and `suplexFlip` (George the receiver) in configs
  `off` and `on`, on the commit before T3.3 (`before`) and after (`after`). Run `motif_curve.mjs` on George:
  - lying gap (> `contactPx`);
  - rise → standing handoff gap;
  - grip latch flips (art never changes, but the latch must not chatter);
  - the stand-up pose step at the swap. With risefix default it should stay ≤ 3 px. Report it.
- **T3.6 Capabilities.** In `capabilities.json`, add George as a consumer of the lying hold, contact-latched art
  (fallback: `gripArt none`, `wristProxy`) and carried rise. Mechanical evidence = T3.4 tests + T3.5 numbers.
  Maturity stays `pilot` and visual stays `unverified` until G6. `moves:coverage -- --check` passes.

## Stage 4: G6 package, then STOP

- **T4.1** Build the G6 viewer at `research/animation/george-transfer-2026-10/viewer.html` (`g4_package.py`
  pattern, self-contained, 1× playback). Rows: George before/after for `suplex` and `suplexFlip`, plus Lou
  `suplexReverse` `on` at HEAD as the regression reference. Put the numbers table from T3.5 on the page.
- **T4.2** Write a handoff entry, `AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer.md`: misses first, then
  the T1.1 table, the support rule, George's measured values versus Lou's, what is a proxy, and what is not claimed.
  Add a one-line pointer to it in the `AI_HANDOFF.md` Status summary.
- **STOP. G6 questions for Derek:**
  1. At 1×, does George hold his back while lying, through the rise, and standing?
  2. Does the baked fist on his back work until Codex's grip art arrives?
  3. Approve the transfer?

G6 — Derek 2026-10-25: **not approved.** "He kind of rubs his tummy" (the near hand reads as on the belly, moving), and "he should kick his legs too, if his legs are stiff, it reads weird". Recorded by Opus. Opus's diagnosis: candidate C is 6 px inside the contour of a three-quarter-FRONT torso, so supine it sits on the visible belly. The wrist proxy puts the baked fist even further inward. The hold's breath moves the hand ~3 px, which reads as rubbing. Fix plan pending.

## Rev 2 (2026-10-25, after G6): fix the tummy rub, add leg life

Derek at G6: "he kind of rubs his tummy" and "he should kick his legs too, if his legs are stiff, it reads
weird". Derek approved this fix ("let's do it"), with Opus's defaults: D6 for George only (rig data),
D7 and D8 for every rig, Lou included.

Causes (Opus, from the art and G6 frames):
- (a) George's torso is painted three-quarter FRONT. Supine, his real back is against the mat, so a point
  6 px inside the outline (candidate C) is on the visible belly.
- (b) The wrist proxy aims the wrist at the point, and the baked fist extends past it, further across the
  belly.
- (c) `holdWeight` breathes the REACH (±.08), so the hand slides ~3 px back and forth: a rub.
- (d) The lying hold draws the static `GROUNDED_POSES[lying]` legs.

Decisions:
- **D6. Hand under the body (rig data, George only).** George's `backWaist` moves to candidate **A**
  (u .2558, v .6077, on the contour). A new `backSell.handUnder: true` puts the near forearm (and near hand,
  if the rig has one) BEHIND the torso while the grip latch is on (`_gripLatch.on`), in every back-sell
  phase: back clutch, lying hold, rise, standing recovery. Leave the near upper arm in front. The depth
  swap follows the latch, so it inherits the latch's no-flicker dwell. Lou has no `handUnder`, so his
  draw order is unchanged.
- **D7. Hand still, chest breathes (all rigs).** The hold's reach weight is constant `holdW`. The breath
  moves the torso instead: same period, a grounded `torso` offset `HOLD_BREATH.torso × sin`. Start at
  `torso` .04 and report it. Because the reach re-solves each frame, the hand follows the body.
- **D8. Leg life during the lying hold (all rigs).** A slow, pained alternating knee draw-up: near knee up
  and down, a short rest, far knee up and down, a rest, in a 3.6 s cycle. Peak offsets about half the
  supine `writhe` key: near `nearThigh .40, nearShin -.35`, far `farThigh .35, farShin -.30`, `hip +2`
  at each peak. Smooth in and out, through `limitKnees`. Ramp it in from 0 over the first 400 ms of the hold,
  so the clutch → hold handoff doesn't jump. Put the constants in one exported object, `HOLD_LEGS`,
  next to `HOLD_BREATH`.
- **Rise continuity.** The rise must start from the pose the hold last drew, so the legs and torso don't
  pop at the hold → rise swap. Carry the hold's last offsets into the rise and ease them out over
  t ∈ [0, .15], beside `_riseFrom`. Target: every part ≤ 3 px per frame step at the swap, both rigs,
  both facings.

### Stage 6: implement (no tuning by eye; report numbers)

- **T6.0** Before any src change, re-film George `after` (one kind-1 `suplex`) and Lou `suplexReverse` `on`
  at HEAD as the before-Rev-2 reference, the same way as T3.5. Keep the frames for the G7 viewer.
- **T6.1 (D7)** Make the hold weight constant and move the breath to the torso. The Lou fixture (T1.2)
  will change in `holdWeight` only. Regenerate it deliberately (`WFM_UPDATE_FIXTURE=1`) in this commit,
  and show in the Progress line that every other section of the JSON is byte-identical
  (`git diff --stat` + a per-key comparison). Any other section that changes: STOP.
- **T6.2 (D8)** Add `HOLD_LEGS` and the leg cycle in the `_lyingHold` draw path (Wrestler.js, the
  `updateGroundedReach(..., limitKnees({...GROUNDED_POSES[lying]}) ...)` call) plus the 400 ms ramp-in.
  Unit tests: the cycle is pure in time; offsets are 0 at hold start; peaks equal `HOLD_LEGS`; knees stay
  inside limits.
- **T6.3 (rise continuity)** Carry the hold's last offsets into the rise and ease them out. Measure with
  `rise_handoff_probe.mjs` (or extend it): the per-part step at the hold → rise frame, for Lou and George,
  both facings. Target ≤ 3 px. If it misses: STOP and report.
- **T6.4 (D6)** Add `handUnder` to `backSell` (schema in `rig/backSell.js` + the BACK_SELL doc comment,
  optional boolean, default false). Make the depth swap in `Skeleton.setDepth` (or wherever depth is
  assigned per frame), driven by a flag the Wrestler sets from the latch. Then move George's anchor to
  candidate A (generator SPECS + generated file + the agreement test), set `handUnder: true`, and
  RE-MEASURE George's `holdW` and recovery offsets with the shared tools (T3.2 recipe). The old numbers
  were measured at C, so don't reuse them. Write the new numbers and `evidence` into George's `backSell`.
  Stop condition as in T3.2.
- **T6.5** Tests: `handUnder` puts the near forearm below torso depth only while the latch is on, and
  restores it exactly when the latch goes off or the state leaves the back sell (pin, pickup, move,
  reset). Lou's depths are unchanged in every phase.
  Rig contract test: `handUnder` must be a boolean when present. `capabilities.json`: George's entries
  record `handUnder` and the new anchor; add `lying-hold` leg life and torso breath as a change with
  visual `unverified` (G7). `moves:coverage -- --check` passes.

### Stage 7: G7 package, then STOP

- **T7.1** Build the viewer at `research/animation/george-transfer-2026-10/g7-viewer.html` (copy
  `g6_package.py`, 1×, self-contained, ≤ 20 MB).
  Views:
  - George before-Rev-2 (T6.0) vs after, kind 1, `suplex` and `suplexFlip`;
  - Lou before-Rev-2 vs after (the legs and breath changed his approved look, so show it plainly);
  - one kind-2 (prone) run, after.
  Numbers table, misses first:
  - hold → rise step;
  - George's new hold distances and margin;
  - latch flips and depth swaps (count, shortest gap);
  - the facing-turn step (unchanged).
- **T7.2** Write a handoff entry, `AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer-rev2.md`, and add a Status summary
  pointer.
- **STOP. G7 questions for Derek:**
  1. Is George's hand now under his back, not on his belly (lying, rise, standing)?
  2. Do the legs read as pain, or as too much or too little?
  3. Lou with legs and breath: keep it?
  4. Approve?

G7 — Derek 2026-10-25: **not approved yet** ("ultimately it's not bad"). Two defects: (1) "the hand just
disappears to behind him, but it has to go around his torso, so it should lower then raise and be behind his
back"; (2) "the stack of layers changes ... now it's showing the bezel as the lower arm seems stacked on the upper
arm after that keyframe". Legs and Lou (G7 questions 2-3) not answered yet. Recorded by Opus.

## Rev 3 (2026-10-25, after G7): the hand goes around the body; no elbow bezel

Causes (Opus):
- (1) T6.4 swaps the forearm's depth the moment the latch turns on. At that moment the hand is over the
  painted torso, so it vanishes in place.
- (2) George has `forearmOverUpperArm` (forearm .00402 over upper arm .00401 hides the elbow bezel). handUnder
  puts the forearm at .00095, under the upper arm, and that shows the bezel. "Forearm over upper arm, upper arm
  over torso, torso over forearm" is a cycle, so no single depth order can do it.

Decisions:
- **D9. Around path.** For a `handUnder` rig, every move of the hand to behind the body, or back out, goes via
  a point OUTSIDE the torso silhouette: lower first (toward the mat when supine, down and away from the
  hip when standing), then rise to the anchor. Rig data `backSell.aroundVia: { u, v }` on the torso image,
  outside the painted art, below and outboard of `backWaist`. Sonnet proposes it from the art (same method as
  T2.1, three candidates); Derek picks it at G8a before anything is tuned against it. Path:
  - Going in: target = via, then (at the swap) eases via → anchor.
  - Coming out: anchor → via, swap, then the hand goes on to its rest or idle.
  This applies in the back clutch approach and release, the lying hold entry, and the standing recovery
  release. The rise and the standing carry keep the hand behind and need no path.
- **D10. Swap only when clear.** The depth swap may happen only while the near hand and the distal half of
  the forearm are outside the torso's painted silhouette. Test it with an alpha lookup of the torso texture
  at the wrist, the contact point and the forearm's distal midpoint, inverse-transformed into torso image
  space. Never swap on the latch alone. The latch decides the WANT; the clearance test decides WHEN. If the
  hand never clears (a path bug), don't swap, and count it as a miss in the film metrics.
- **D11. No bezel while behind.** Keep the forearm visually over the upper arm at the elbow while its hand
  half is behind the torso. Preferred: the forearm stays at its `forearmOverUpperArm` depth (.00402), with
  its pixels hidden only where they lie inside the torso silhouette, by a mask from the torso's alpha (Phaser
  4 filters/masks; `arenaLighting.js` already uses a mask). Fallback if Phaser 4 can't do an inverse alpha
  mask per Image at reasonable cost: an elbow-cap copy of the forearm (same texture, cropped to the elbow end)
  at .00402 over the real forearm at .00095, with the crop line kept outside the torso silhouette. Pick one,
  say why, and measure the cost (ms per frame, 2 wrestlers).

### Stage 8: around path, clearance swap, no bezel

- **T8.0** Before any src change, keep the G7 `after` frames as this stage's before reference.
- **T8.1 (D9 propose)** Write `tools/debug/around_via_candidates.mjs`. It gives three `aroundVia` candidates
  for George (outside the contour, below and outboard of anchor A, by about a fist length / 1.5 / 2 fist
  lengths), drawn on the torso at 4× and on supine and standing frames, both facings, plus a page
  `research/animation/george-transfer-2026-10/around/index.html`. **STOP for G8a.**

G8a — Derek 2026-10-25: "looks good" to Opus's recommendation, candidate **B** (u -0.25, v 0.9069; 1.5 hand lengths, 18.0 game px clear of the paint). Recorded by Opus.

- **T8.2 (D10)** Add the clearance test as a pure helper (`rig/backSell.js` or a new
  `rig/silhouette.js`), taking a world point and the torso image plus an alpha lookup, so it's testable in
  Node with a stub. `_handUnder()` becomes: want (today's rule) AND (already under, or clear). Sample the hand's far end too (Opus, after T8.1: George's baked hand is OPEN and reaches 21.6 px past the wrist, so wrist + forearm midpoint alone can call it clear while the fingers are still over the torso): add the hand's distal end, e.g. the forearm image's last-alpha point along its axis, to the samples. Leaving: not
  want AND (already out, or clear).
- **T8.3 (D9)** Add the around path in the grounded reach (`_solveGroundedReach` back target) and in the
  standing recovery release. It's a pure function of the phase weight, and Lou is untouched (no `handUnder`).
  The Lou fixture must stay unchanged.
- **T8.4 (D11)** Remove the bezel using the method you picked. Test: with `handUnder` on and
  `forearmOverUpperArm`, the forearm draws over the upper arm at the elbow, and no forearm pixel draws inside
  the torso silhouette. Write a browser probe that counts forearm pixels inside the torso alpha.
- **T8.5** Film George `suplex` and `suplexFlip` (kind 1) plus one kind 2 (prone). Metrics:
  - depth swaps, and at each swap: the hand's distance outside the silhouette (must be > 0) and frames from
    via arrival;
  - swaps skipped for no clearance;
  - frame-to-frame hand travel (no jump > the rise's own 2.5 px step except at the facing turn);
  - forearm-inside-torso pixel count (must be 0 while under);
  - the per-frame cost of D11.
  Re-run `hold_weight_sweep`/`recovery_probe` only if the path changes the settled contact. It shouldn't.
- **T8.6** Write `capabilities.json` records (around path, clearance swap, bezel fix; visual `unverified`).
  `moves:coverage -- --check` passes.

### Stage 9: G8 package, then STOP

- **T9.1** Build the viewer at `research/animation/george-transfer-2026-10/g8-viewer.html` (the g7 pattern):
  - George G7 vs Rev 3, `suplex`, `suplexFlip`, prone;
  - a slowed (0.25×) close-up row of the going-behind and coming-out moments, labelled as slowed, next to
    the 1× row.
- **T9.2** Write a handoff entry `AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer-rev3.md` and add the
  Status pointer.
- **STOP. G8 questions:**
  1. Does the hand go around his body (lower, then up behind)?
  2. Is the elbow bezel gone?
  3. Legs: pain, too much, too little?
  4. Lou: keep the legs and breath?
  5. Approve?

G8 — (Derek's verdict goes here.)

Still out of scope: legs during a lying wait with no hold (kind 3, writhe last), the prone rise's
missing hand, and the facing turn. Each is a separate call for Derek after G7.

## Stage 5 (later, when Codex delivers George's grip donor)

Register it as `textures.variants.forearm.grip` on George, with its `clutch` anchor, exactly as Lou's is.
`backSellSupport` should then report `gripArt: 'painted'` and `contact: 'clutchPatch'` with no code
change. Re-run T3.2's sweep (the cup moves the contact) and T3.5, then go to Derek. If the drop-in needs a
code change, report that as a contract gap.

## Done means

- `risefix` is on by default.
- The back sell runs on Lou and George from per-rig data with one support rule.
- Lou is unchanged (fixture).
- George's numbers come from the shared tools.
- Any fallback is labelled.
- Derek has the G6 viewer.
