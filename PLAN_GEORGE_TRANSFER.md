# George transfer: the back sell on a second rig

2026-10-25 · Claude (Opus) plan, Sonnet executes · Derek judges every visual result.
Step 3 of the Revised sequence in [MOVE_PIPELINE_EVOLUTION.md](MOVE_PIPELINE_EVOLUTION.md).

## Progress

(Sonnet: one line per task: id, commit, result. Gate lines are written by Opus/Derek only.)

- T0.1 82b71a8: risefix default-on via defaultOnFlag('risefix','1'); misses: none noted
- T0.2 5812e37: capabilities.json rise-standing-channels: default promotion recorded (Derek 2026-10-25, 82b71a8); PLAN_RISE_HANDOFF Progress line added. 882 tests; misses: none noted
- T1.1 e8f2734: inventory, no code; misses: none noted
- T1.2 fac661c: tests/backSellLouFixture.test.js + tests/fixtures/backSellLou.json, committed before any src change: holdWeight 0-3.2 s, backRiseWeight; misses: none noted
- T1.3 35f2b7d: per-rig data; misses: see commit
- T1.4 4eb6d18: tests/backSellRigContract.test.js: Arena's CHARACTERS list must equal the test's; misses: see commit
- Stage 1 done-check (4eb6d18, risefix default on): T1.2 fixture passes unchanged (JSON untouched, 1e-9). `aftermath_film.mjs suplexReverse on` films (Lou receiver, facing -1; clutchEnd 1316.7, riseStart 5516.7, rise85 6283.3, standing 6550). `motif_curve.mjs`, ms > 15 px / span, Session 4 (T4.7) -> now: lying 0/4200 -> 0/4200; rise 0/766.7 -> 0/766.7; handoff 0/266.7 -> 0/266.7; longest run > 15 px across the handoff 0 -> 0 ms; hand-to-back at the swap 0.14 px (Session 4: 0.14-0.16). Standing 900/2000 -> 900/2000. Max per-step contact jump at 6550: 31.22 -> 31.08 px (the facing turn, untouched; risefix on moves it by 0.14 px). Film output not kept (scratchpad).
- T2.1 de6bdaf: tools/debug/backwaist_candidates.mjs + research/animation/george-transfer-2026-10/backwaist/index.html; misses: none noted
- T3.1 8119db6: George backWaist = { u .3887, v .6077 }; misses: none noted
- T3.2 aa33af3: shared tools fixed, then run on George (WFM_P1=george-roster-v1); misses: none noted
- T3.3 303ef02: George's backSell { holdW .55, recoveryArm -0.5, recoveryElbow 1.0, settledElbow .70, contactPx 15, evidence: the; misses: none noted
- T3.4 2f290ac: tests/backSellGeorge.test.js (5): support result; misses: none noted
- T3.5 7ad46c3: George films, suplex / suplexFlip (Lou throws, George receives), off and on, before = aa33af3; misses: none noted
- T3.6 eca9015: capabilities.json: George added to lying-hold, contact-latched-art and carried-rise; misses: see commit
- T4.1 d492654: research/animation/george-transfer-2026-10/viewer.html (20 KB) + g6/; misses: see commit
- T4.2 4712c87: AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer.md; misses: see commit
- T6.0 6901bea: before-Rev-2 reference films at 98069ef, no src change: George on/suplex and on/suplexFlip; misses: none noted
- T6.1 66ca9e4: D7: holdWeight(sec, holdW) returns holdW for every input; misses: none noted
- T6.2 0157efd: D8: exported HOLD_LEGS (next to HOLD_BREATH): cycle 3.6 s, ramp 400 ms, near window 0-1.4; misses: none noted
- T6.3 b49a817: rise continuity: _startRiseUp keeps the hold's offsets; misses: none noted
- T6.4 e150469: D6; misses: none noted
- T6.5 f334b46: tests + records; misses: none noted
- T7.1 fb7cacf: G7 viewer: research/animation/george-transfer-2026-10/g7-viewer.html (24 KB) + g7/; misses: see commit
- T7.2 bfb51ca: AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer-rev2.md (misses first, what changed, G7 questions, not claimed) + one Status summary pointer line; misses: see commit
- T8.0 fe97361: no src change; misses: none noted
- T8.1 9969c99: tools/debug/around_via_candidates.mjs + page research/animation/george-transfer-2026-10/around/index.html (self-contained, images inlined, 1.1 MB) + candidates.json; misses: none noted
- T8.2 7682534: D10 clearance gate; misses: none noted
- T8.3 8a816ca: D9 around path; misses: see commit
- T8.4 89cd0fe: D11 no bezel; misses: none noted
- T8.5 7f5e7cc: films and metrics, with three fixes the films forced; misses: see commit
- T8.6 3aa023b: tools/move-critic/capabilities.json: three new records, all pilot, mechanical pass, visual unverified; misses: none noted
- T9.1 2a1ed73: G8 viewer: research/animation/george-transfer-2026-10/g8-viewer.html (28 KB) + g8/; misses: see commit
- T9.2 5724542: AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer-rev3.md; misses: see commit
- T5.1 b0d14cd: build_george_grip.mjs (Node zlib), rows 0-244 byte-exact from forearm.png, 0 differing bytes; misses: none noted
- T5.2 97aff37: forearm.grip registered on George, backSellSupport gripArt painted / contact clutchPatch, no runtime change, Lou fixture unchanged, 942/942; misses: none noted
- T5.3 (this commit): hold sweep unchanged (holdW .7, 14.52 px); films before/after + G9 viewer; misses: CONTRACT GAP, the art latch engages at 367 ms 34 px away and flips 5 times in the standing recovery; clutch hand step 3.3-4.7 px (limit 2.5); G8 forearm-inside miss not fixed

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

Delivered 2026-10-26 ([Codex entry](AI_HANDOFF_ENTRIES/2026-10-26-codex-george-grip-donor.md)): `forearm_grip.png`
426 × 439, `clutch` { u: 254/426, v: 344/439 }. Opus review: canvas, size and bbox match; alpha above row 245
is identical, but 895 edge pixels above 245 differ by ≤ 4 RGB (canvas premultiply round trip), so "zero changed
bytes" is not true against the file on disk. Miss Codex named: darker, flatter finger shading than the base hand.

- **T5.1 Byte-exact elbow end.** Change `tools/debug/build_george_grip.mjs` so rows 0–244 are copied from
  `forearm.png` as raw PNG bytes (decode with `sharp` or `pngjs` in Node, not a browser canvas), blend rows 245–259
  as now. Check: a script compares the two files' RGBA rows 0–244 and prints 0 differing bytes. Commit the tool,
  the PNG and Codex's source folder entry.
- **T5.2 Register.** Add `variants.forearm.grip` to George in the generator SPECS
  (`tools/wrestler-cutter/prepare-roster-character.py`, or wherever George's `textures` come from) and in
  `src/characters/george_roster_v1.js`, matching Lou's block in `src/characters/thesz_procreate_v1.js`:
  `key: 'george_rv1_forearm_grip'`, `file: 'forearm_grip.png'`, `semanticAnchors: { clutch: { u: 254 / 426, v: 344 / 439 } }`.
  Regenerate, then `node tools/rig/validate-character-rigs.mjs`. Check: `backSellSupport` on George reports
  `gripArt: 'painted'`, `contact: 'clutchPatch'` with no runtime code change. Any code change needed = contract gap: stop and report.
  Lou fixture unchanged.
- **T5.3 Re-measure and film.** Re-run T3.2's sweep (`WFM_P1=george-roster-v1`) and T3.5's films (`suplex`, `suplexFlip`,
  George receiving), before = HEAD before T5.2. Report: clutch-to-back distance per frame, swap-in frame, forearm pixels
  inside the torso outline (the G8 miss), max per-frame hand step. Add a G9 column to the G8 viewer: baked fist vs grip, 1× and
  normal speed, both facings. **⛔ G9: Derek judges the hand at 1×.** No promote, no push.

Done 2026-10-26 (Sonnet, after the Opus session was lost): viewer `research/animation/george-transfer-2026-10/g9-viewer.html`
(frames in `g9/`, rows in `g9-rows.json`; baked fist at b0d14cd against grip at 97aff37, same scenarios and sell kinds,
different random rolls). Hold sweep identical (the reach solves the contact onto the path, so distance does not depend on the art).
Registration needed no runtime change, but the film found a runtime problem: with the grip registered the art latch
(`stepGripLatch`, distance of the contact it is showing) engages at 367 ms with the hand 34.4/38.0 px away and flips
five more times in the standing recovery, and the clutch-window hand step is 3.33/3.67/4.68 px (suplex/flip/prone; limit 2.5)
against 1.83/2.02/3.29 with the fist. Any fix is runtime code = a contract gap, so nothing was changed. Opus decides.

G9 — (Derek's verdict goes here.)

## Done means

- `risefix` is on by default.
- The back sell runs on Lou and George from per-rig data with one support rule.
- Lou is unchanged (fixture).
- George's numbers come from the shared tools.
- Any fallback is labelled.
- Derek has the G6 viewer.
