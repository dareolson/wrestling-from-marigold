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

G6a — (Derek's pick goes here.)

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

G6 — (Derek's verdict goes here.)

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
