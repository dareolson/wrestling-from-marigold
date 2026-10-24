# PLAN: suplex receiver, planted rise (Opus plan, Sonnet executes)

2026-10-24 · Opus · base `361d9bb` + Codex's uncommitted `?sellart=v1` work

Continues [PLAN_MOVE_PERFORMANCE.md](PLAN_MOVE_PERFORMANCE.md) Stage 4. Source handoff:
[2026-10-24-codex-sell-art-and-protected-rise.md](AI_HANDOFF_ENTRIES/2026-10-24-codex-sell-art-and-protected-rise.md).
Read that entry, then this plan. Read nothing else unless a task names it.

## Progress

(Executor: append one line per finished task: `T#.# <sha> <one-line result>`.)

- T0.1 — 800/800 tests, build, rig:validate (6 rigs), `git diff --check` clean; `play.mjs suplex`/`suplexReverse` PASS with and without `sellart=v1&aftermath=v2` (Procreate Lou + george-roster-v1).
- T0.2 b07484d — existing tests covered flag-off appearance writes while down only; added one test for a flag-off back-pain rise (context null, no writes, four non-v1 query forms).
- T0.3 b07484d — Codex's candidate committed locally (PLAN_SUPLEX_RISE.md included).
- T1.1 ea61369 — `tools/debug/aftermath_film.mjs`: suplex log hook sleeps the loop, then `game.step` at fixed 1/60 s (tween clock pinned, Math.random seeded in page); strip every 1/30 s named by ms from impact, event close-ups, manifest. 4 scenarios (suplex, suplexReverse, +Flip variants for the other facing) x off/on. No `timeScale` used; stepping replaces it.
- T1.2 03b0a0a — `aftermath_pair.mjs` -> `pair-sheet.html`, `hand-art-check.json`. **R1 flicker does not occur**: Lou's grip holds 367-1300 ms, fist for ~4217 ms lying, grip returns 33 ms (2 steps) after rise start, drops at rise ~.85. 0 grip-fist-grip runs under 250 ms in all 4 scenarios; no fix made. George (receiver in `suplex`/`suplexFlip`) never shows grip (R4).

## Goal

The suplex receiver on Procreate Lou reads as one continuous hurt performance:
impact → back clutch → **planted** supine rise → guarded stance, with the hurt
hand never dropping the motif and the support hand never sliding. Lou only;
George follows after Derek approves (Stage 6).

## Ground rules for the executor

- **Node 22 only.** `export PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH` in
  every shell. Default `node` is v25/v19 and silently breaks PNG checksums.
- Dev server for Chrome tools: `127.0.0.1:5173` (or set `WFM_URL`). macOS has
  no `timeout`.
- Everything new stays behind `?sellart=v1`. With the flag off, the game
  must be byte-for-byte the current behaviour (tests prove it, T0.2).
- No changes to damage, down timers, input locks or get-up duration.
- **Not in scope:** figure four (parked), hammerlock (Derek's authored clip),
  prone rise, quick rise, faces, George art. Do not touch them.
- Codex owns new art generation. You may write art *requests*, never images.
- Commit locally on `story/marigold-opening`, one commit per task. **Do not push.**
- Do not claim anything "reads" or "looks hurt". Report measurements; Derek
  judges pictures. Stop at G4.
- Large frame folders (`proof/`, `proof-waist/`, raw film frames) stay
  untracked, like `aftermath-g3/off|on`. Commit viewers, sheets, JSON.

## 1. Verified state (Opus read the diff, 2026-10-24)

Codex's working tree adds, all gated by `?sellart=v1`:

| Piece | Where | Note |
|---|---|---|
| Appearance owner | `src/animation/sellAppearance.js`; `Wrestler._syncSellAppearance` | Sets `forearm: grip` on the clutching hand(s) for back/head clutches, and on the near hand during a back rise. Released on clip prepare, `tweenPose`, rise start, non-`down` state. |
| Painted contact | `Skeleton.imageAnchorPoint`; grip donor `semanticAnchors.clutch` (57,279 on 117×351) | Reach IK solves the painted cup, not the wrist endpoint, and reserves the off-axis angle from the elbow cap. |
| Back target | Lou torso `semanticAnchors.backWaist` (.22,.60) | Lou only. Other rigs fall back to `nearHip`. |
| Protected rise | `backRisePerformance.js` `backRiseWeight(t)`; `updateGetUp(..., pain)` | Near hand reaches backWaist: ramps 0→1 by t .18, holds to .55, out by .85. Endpoints unchanged. |

Opus review findings (none blocking; each becomes a check below):

- **R1 hand-art flicker at clutch→rise.** If a back clutch's release ends
  (`clutchArtPhase` → `rest`, fist) shortly before `_startRiseUp`, the near
  hand goes grip → fist → grip within a few frames. `backRiseParts` switches to
  grip at any t > 0, when reach weight is still ≈ 0. Verify in T1.2 film.
- **R2 far hand slides.** The far (support) hand follows generic keypose angles
  through the rise. This is the main defect left (Stage 2).
- **R3 motif drops at the handoff.** Back protection is 0 from t .85; the
  `?aftermath=v2` recovery overlay adds only `bend`, ramped from 0. The hand
  leaves the back and never comes back (Stage 4).
- **R4 Lou-only target.** George's candidate still reaches the hip.
  Expected; Stage 6.
- Codex's evidence is paused-scene stills, not film. Two of Codex's briefs ask
  for event-aligned film. Nothing gets to Derek without it (Stage 1).

## 2. Design decisions

### D1. The plant is a pure function of rise progress, not frame history

Root `x,y` do not move during `gettingUp`. So a planted hand is a fixed
**body-local** point, computed from the *base* supine keyposes:

1. `P_local` = the far contact point (painted `support` anchor if the far
   forearm variant has one, else the far `Wrist`) in the base pose sampled at
   `PLANT.t0`, with its y clamped to the mat line. Express it in units of `s`,
   mirrored by `facing`.
2. For `t` in `[PLANT.t0, tLift]`, the far arm is IK-solved so the contact
   sits on `P = root + P_local`, through the same `updateGroundedReach` path
   (add a reach entry with an explicit point target, e.g. `{ at: {x,y}, w }`).
3. `tLift = min(PLANT.t1, first t where |shoulder − P| ≥ 0.98·(lu+lf))`. The
   hand leaves the mat when the arm has fully pushed, which is the push-off.
   Compute it by sampling the base keyposes once per rig (cache on the
   Skeleton); still deterministic.
4. Weight envelope: smoothstep in over the 0.05 after `t0` (the hand arrives),
   out over the 0.08 after `tLift`.

Seekable, no history, same answer when scrubbed. Constants live in
`backRisePerformance.js` as `PLANT = { t0, t1 }`; you pick `t0`/`t1` in T2.1
from measurement, not by eye.

### D2. Support art: hook now, art later

Runtime reads an optional `semanticAnchors.support` on whatever far-forearm
texture is active. None exists today, so the base wrist is used. Codex's
`open-palm-donor-v2.png` is **not registered** (proportions changed); do not
load it. Stage 3 writes the measured request so Codex can register it.

### D3. Handoff to standing: measure first, two options

The rise must end on the unchanged upright pose (t = 1, weight 0), so a
continuous hand is impossible in the IK path alone. Default **Option A**:
standing recovery (`_recoveryPose`, back) gains a near-arm motif in upright
FK channels that puts the near hand at the back waist, ramped over
`RECOVERY_RAMP_MS`, and `backRiseWeight` eases out late (from .70 to 1.0)
instead of .55→.85. Gate it by measuring the hand-to-backWaist distance curve
across the handoff. **Option B** (only if Derek sees the dip at G4): solve the
IK pose once at t = 1 with weight 1 and feed those arm angles as the
recovery motif's start, so both sides of the handoff match.

## 3. Ordered tasks

### Stage 0: land Codex's candidate

- **T0.1 Verify.** Node 22: `npm test` (expect 800/800), `npm run build`,
  rig-contract validation, `git diff --check`. Run
  `node tools/debug/play.mjs suplex` and `suplexReverse` with
  `sellart=v1&aftermath=v2`, `WFM_PROCREATE=1 WFM_GEORGE=george-roster-v1`.
  Any failure: stop and report; do not fix Codex's code silently.
- **T0.2 Flag-off guard test.** Add one test asserting that with
  `sellart` absent, `_syncSellAppearance` never calls `setPartVariants` and
  `updateGetUp` takes the `_applyGrounded` path (pain context null). Skip if an
  existing test in `tests/sellAppearance.test.js` already proves both.
- **T0.3 Commit.** Stage only: `src/`, `tests/sellAppearance.test.js`,
  `tests/backRisePerformance.test.js`, `tools/debug/sell_art_proof.mjs`,
  `AI_HANDOFF.md`, `AI_HANDOFF_ENTRIES/2026-10-24-*.md`,
  `CHARACTER_PART_INVENTORY.md`, `research/art/lou-open-palm-2026-10-24/`,
  and the viewer `index.html` + `review-viewer.png`. Message:
  `Sell art candidate (?sellart=v1): grip contact, back-waist target, protected rise (Codex; reviewed by Claude)`.
  Check `git branch --show-current` first.

### Stage 1: event-aligned film (the evidence everything else is judged by)

- **T1.1 `tools/debug/aftermath_film.mjs`.** Drive the existing `play.mjs`
  suplex scenario (P2 is the unmoving keyboard dummy, so it is
  reproducible). In-page, record `scene.time.now` for these events on the
  receiver: impact (state→down), clutch peak (`_sell` clutch at u .35),
  rise start (`_startRiseUp`), rise t .20/.34/.55/.85, first `standing`
  frame, recovery +0.2/+1/+2 s. Wrap the methods in page context; do not add
  hooks to `src/`.
  - **Close-ups:** at each event, set `scene.time.timeScale` /
    `tweens.timeScale` to 0, screenshot a crop around the receiver at 2×, resume.
  - **Normal-speed strip:** one muted frame per game 1/30 s from impact to
    recovery +2 s, filename = game ms relative to impact.
  - Manifest JSON: commit sha, rig ids, URL flags, every event time,
    every frame's game time.
  - Run twice per config: flags `off` and `sellart=v1&aftermath=v2`; both
    facings (`suplex`, `suplexReverse`). Output
    `research/animation/suplex-rise-2026-10/<config>/<scenario>/`.
- **T1.2 Pairing sheet + R1 check.** Script builds a side-by-side sheet
  pairing off/on by **event-relative game time**, not frame index. Plot the
  near-hand texture key per frame across clutch end → rise start; record
  whether R1's grip→fist→grip flicker occurs and for how many ms. If it does,
  fix in `sellAppearance.js`: hold the grip from a back clutch's release
  through into a back rise (one rule, tested). Commit tool + sheet + fix.

### Stage 2: plant the support hand (D1)

- **T2.1 Measure.** Extend `sell_art_proof.mjs` (or a sibling) to sample the
  base supine rise at t = 0…1 step .02 for both facings and record per t:
  far wrist world point, distance to mat line, shoulder–wrist distance vs
  `lu+lf`. Pick `PLANT.t0` = first t where the far wrist is within ~3 px of the
  mat line (or the closest approach if it never is); `PLANT.t1` ≤ .70 (the
  hip-lift keypose). Write the numbers in the Progress line.
- **T2.2 Implement** D1 in `Skeleton.updateGetUp` and `updateGroundedReach`
  (point target), gated by the same pain context `_backRiseContext()`
  already provides. Unit tests: (a) contact world point constant within
  0.5 px across `[t0+0.05, tLift]` when reachable; (b) t = 0 and t = 1 poses
  unchanged; (c) elbow fold never exceeds `JOINT_LIMITS.elbow.max`;
  (d) both facings; (e) flag off unchanged.
- **T2.3 Film** with T1.1, `sellart=v1&aftermath=v2`. Report max hand slide
  (px) inside the plant window and the elbow fold range. Commit.

If the IK straightens the far arm into an unnatural lock or the shoulder
visibly pulls away from the plant before `tLift`, **stop** and report with
stills; do not retune the keyposes (that is a Derek-level choreography call).

### Stage 3: support-hand art request to Codex (doc only)

- **T3.1** Write `AI_HANDOFF_ENTRIES/2026-10-2x-claude-open-support-request.md`
  following Codex's asset protocol (performance brief, "Claude ↔ Codex asset
  request protocol"): rig `thesz-procreate-v1`, far forearm, both facings,
  rise phase t0..tLift; game-scale screenshot + 3× crop at t0 and mid-plant
  from T2.3; source `far_forearm.png` dimensions + sha256 (measure; do not
  copy numbers from older entries); registration from
  `thesz_procreate_v1.js`; the palm contact patch you want marked as
  `semanticAnchors.support`; why IK cannot fix it (the base far hand is a
  `palm_side_fist`, no weight-bearing palm). Point to
  `research/art/lou-open-palm-2026-10-24/open-palm-donor-v2.png` as starting
  material and repeat Codex's own warning: no uniform rescale onto 117×351.
  Also add the AI_HANDOFF.md index line. Commit.

### Stage 4: carry the motif onto the feet (D3, Option A)

- **T4.1 Probe.** In a paused scene, Lou standing `idle` + `bend` at
  `_recoveryPose` back weight 1: find the upright near-arm channel values
  (read `updateUpright`'s pose keys; do not guess names) that put the near
  hand within ~6 px of `backWaist` in both facings. Record values.
- **T4.2 Implement.** `_recoveryPose` back branch adds those arm offsets × w,
  only when `sellArtCandidate()` (keep `aftermath=v2`-only behaviour
  unchanged otherwise). Move `backRiseWeight` ease-out to .70→1.0; update its
  tests (endpoints still 0). The near hand's grip art carries into recovery
  through `_syncSellAppearance` (add a `recover` branch; released by the same
  rules plus `pain.until`).
- **T4.3 Film + curve.** T1.1 run; plot near-hand-to-backWaist distance vs game
  time from rise .55 to recovery +2 s. Report the gap (ms with distance > 15 px)
  across the handoff. Commit. Do not attempt Option B unless Derek asks.

### Stage 5: G4 package, then STOP

- **T5.1** `research/animation/suplex-rise-2026-10/README.md` + `viewer.html`:
  off vs candidate, both facings, normal-speed strip and event close-ups,
  manifest numbers (plant slide, elbow range, handoff gap, R1 result). Same
  style as `aftermath-g3/`.
- **T5.2** Write `AI_HANDOFF_ENTRIES/2026-10-2x-claude-suplex-rise-g4.md`
  (what changed, measurements, what is not claimed) + index line. Commit.
- **STOP. G4 questions for Derek:**
  1. Does the back clutch → rise read as one hurt action, or as separate moves?
  2. Does the far hand look like it takes weight (even with the fist art)?
  3. Is the hand returning to the back on his feet right, too much, or a dip?
  4. Promote `sellart=v1` to default for Lou, or keep iterating?
  5. Next: port to George (Stage 6) or ask Codex for the open-palm art first?

### Stage 6 (only after G4 approval; plan again before starting)

George roster: measure his `backWaist` on his own torso, request his own grip
and support forearms from Codex (Codex's George packet: 426×439, proximal/distal
locks), then repeat Stages 2–5. Never scale Lou's donors onto George.

## 4. Suggested first Sonnet session

Stage 0 + Stage 1 (T0.1–T1.2). That lands Codex's work and builds the film
tool everything else is measured with. Stop there if the session runs long;
Stage 2 is a clean start point.
