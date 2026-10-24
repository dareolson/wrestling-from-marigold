# PLAN: suplex receiver, planted rise (Opus plan, Sonnet executes)

2026-10-24 · Opus · base `361d9bb` + Codex's uncommitted `?sellart=v1` work
Revised 2026-10-24 (rev 2) after Codex's review of Stages 0–1 through `451361f`:
[2026-10-24-codex-review-of-claude-suplex-rise.md](AI_HANDOFF_ENTRIES/2026-10-24-codex-review-of-claude-suplex-rise.md).
Section 1b and the rev-2 tasks (marked **rev 2**) take precedence over older text.

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
- Everything new stays behind `?sellart=v1`. With the flag off, behaviour must
  not change. Claim only what tests prove: T0.2 covers four query forms for
  rise context and appearance writes. T2.0 adds a pose snapshot test.
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

## 1b. Codex review of Stages 0–1 (rev 2)

Accepted. Each item maps to a task:

| # | Codex point | Plan response |
|---|---|---|
| 1 | "No flicker" ≠ continuous acting: Lou lies ~4217 ms with the near hand off the back (fist) between clutch end and rise start | New **D4** + Stage 4 covers the lying gap as well as the standing gap. Do not just hold the grip art: the art follows measured contact |
| 2 | Off vs on changes two flags | **T1.3** adds `aft` config (`aftermath=v2` only). Attribute sellart effects as `aft` vs `on` |
| 3 | Sheet is static | **T5.1** adds synchronized playback at real speed driven by manifest game time (+ 30 fps mp4 if `ffmpeg` exists) |
| 4 | Raw strips are local/untracked | **T5.1** documents regeneration commands. The G4 artifact must be self-contained: committed downscaled strips or mp4s, not links into untracked folders |
| 5 | Wrist plant is geometry only | D1 stands as a **prototype**. T2.3 also reports min reach, hinge direction and extension. Palm contact is measured only after Codex registers `support` art (Stage 3 → re-run T2.3) |
| 6 | Flag-off claim too broad | Ground rule reworded; **T2.0** pose snapshot test |
| 7 | AI_HANDOFF.md stale | **T2.0** updates the Status summary now; T5.2 again at G4 |

Also: interruption/fallback checks (**T2.2f**, **T4.4**).

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

### D4. One motif, impact to standing (rev 2)

Measure first: one curve, near-hand-to-backWaist distance (px) and near-hand
texture key per strip frame, impact → recovery +2 s (T4.1). Then make the
motif continuous in two places, both visual-only, under `sellart=v1`:

- **Lying gap (clutch release → rise start).** After a back clutch lets go,
  the near hand does not return to a neutral rest. It settles to a **low hold**:
  a reach to `backWaist` at weight `HOLD_W` (start .5, from measurement: the
  lowest weight that keeps the hand ≤ 15 px from backWaist). Add small authored
  breathing (≤ ±.08 weight, period ~1.6 s, a pure function of time since
  release), not a frozen pose. Implemented as a sell-plan tail in
  `Wrestler`/`sells.js` sampling, not a timer change: down duration, sell plan
  durations and rise start time are unchanged. Other sells (writhe, roll,
  kick) still own the hands when they play; the hold applies only while no
  other sell is active and the last clutch was `part: 'back'`.
- **Rise start.** `backRiseWeight(t)` starts at the hold weight instead of 0
  when entered from a hold: `w(t) = max(hold·(1 − smooth(t/.18)), current)`
  → effectively hold → full reach without a dip. Pass the hold value in the
  pain context (`_backRiseContext()` → `{ ..., from: holdW }`), so it stays a
  pure function of `(t, from)`.
- **Standing.** D3 Option A as written.
- **Art.** `_syncSellAppearance` selects grip when the measured contact
  distance is ≤ 15 px (computed from the solved pose, not from phase names),
  with a 100 ms hysteresis so it cannot flicker. This replaces "grip at any
  t > 0" in `backRiseParts`.

If the hold reads as a frozen hand in the T4.3 strip, report that; do not
add more motion than the breathing above. Derek judges.

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

- **T1.3 (rev 2) `aft` config.** Add `aft: 'aftermath=v2'` to `CONFIGS` in
  `aftermath_film.mjs`; `aftermath_pair.mjs` accepts any two configs
  (`--a off --b on` default; G4 uses `aft` vs `on`). Film `aft` for `suplex` and
  `suplexReverse` (+Flip). Commit tool change only.

### Stage 2: plant the support hand (D1)

- **T2.0 (rev 2) Housekeeping + flag-off snapshot.**
  1. Commit Codex's review entry
     `AI_HANDOFF_ENTRIES/2026-10-24-codex-review-of-claude-suplex-rise.md` and this plan rev.
  2. Update the AI_HANDOFF.md Status summary. The sell-art candidate is committed
     (`b07484d`). Link this plan + Progress and Codex's review. Add an index line.
  3. New test `tests/sellArtFlagOff.test.js`: build Lou's skeleton the way
     existing `backRisePerformance.test.js` does. With pain context `null`,
     snapshot every part's world `x,y,rotation` from `updateGetUp` at t = 0,
     .1, …, 1 (supine, both facings) and from `_recoveryPose` back at w = .5, 1.
     Write the fixture **before** any Stage 2 code change and commit it, so the
     comparison runs against the pre-change behaviour. Tolerance 1e-9.

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
  (d) both facings; (e) flag off unchanged (T2.0 snapshot passes);
  (f) **rev 2 interruption:** a rise interrupted mid-plant (state leaves
  `gettingUp`, `_activeMove` starts, choreo starts) leaves no plant weight
  and no support selection on the next draw. Seeking t backwards gives the same pose.
- **T2.3 Film** with T1.1, `sellart=v1&aftermath=v2`. Report max hand slide
  (px) inside the plant window, elbow fold range (min and max), min
  shoulder–contact distance vs `lu+lf`, and whether the elbow hinge points
  the anatomical way in every sampled frame (both facings). Label it a **geometry
  prototype**. The wrist is not the palm and nothing here proves weight-bearing.
  Commit a small JSON + one 3× crop per facing at t0, mid and tLift.

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

### Stage 4: one motif, impact to standing (D3 Option A + D4, rev 2)

- **T4.0 (rev 2) Curve tool.** Extend `aftermath_pair.mjs` (or a sibling
  `motif_curve.mjs`) to record, per strip frame, the near-hand contact point
  → `backWaist` distance and the near-hand texture key. Capture it in page
  with `skeleton.jointAttachmentPoints` / `imageAnchorPoint` during the T1.1
  stepping, then save the manifest. Output a JSON + SVG plot. Run on current
  `on` and `aft` first: this is the baseline that shows the lying and standing gaps in ms.
- **T4.0b Lying hold (D4).** Implement the hold, the `from` rise entry and
  the contact-driven grip with hysteresis. Tests: hold weight is a pure fn of
  time since release; rise weight continuous at t = 0 when `from` is set and
  unchanged when it is not; no grip→fist→grip under 250 ms in a synthetic
  distance trace that hovers at 15 px; other sells still own the hands;
  T2.0 snapshot passes.

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
- **T4.3 Film + curve.** T1.1 run + T4.0 curve, **impact → recovery +2 s**
  (not only rise .55 onward). Report the ms with distance > 15 px in each window:
  clutch release → rise start, rise, rise → standing, standing → +2 s. Commit.
  Do not attempt Option B unless Derek asks.
- **T4.4 (rev 2) Interruption/fallback.** Unit tests plus one film run each,
  where the harness allows: (a) receiver picked up / pinned while in the
  lying hold → hold and grip released on the next draw; (b) hit during
  recovery → recovery motif and grip released; (c) `pain.until` expiry
  mid-recovery → motif ramps out, no snap > 1 frame; (d) rig without
  `backWaist` (George) → falls back to the `nearHip` behaviour already in the
  candidate, and no lying hold. Report results; fix only what fails.

### Stage 5: G4 package, then STOP

- **T5.1** `research/animation/suplex-rise-2026-10/README.md` + `viewer.html`:
  `aft` vs `on` (and `off` as a third column), both facings, event close-ups,
  manifest numbers (plant slide, elbow range/hinge/extension, gap ms per
  window, R1 result) and the T4.3 curve.
  **rev 2 playback:** the viewer plays the strips in sync at **1× real time**
  from manifest game ms (requestAnimationFrame + performance.now, frame =
  last strip frame ≤ elapsed), with play/pause, 0.5×, scrub and event jump
  buttons. If `ffmpeg` is on PATH, also encode a 30 fps side-by-side mp4 per
  facing. **Portability:** commit downscaled strips (≤ 480 px wide, WebP or
  JPEG q80, target < 25 MB total; report the size) under
  `research/animation/suplex-rise-2026-10/g4/` so the viewer works on a clean
  checkout. README lists exact regeneration commands (Node 22, dev server,
  `WFM_PROCREATE=1 WFM_GEORGE=george-roster-v1`, tool invocations).
- **T5.2** Write `AI_HANDOFF_ENTRIES/2026-10-2x-claude-suplex-rise-g4.md`
  (what changed, measurements, what is not claimed) + index line. Commit.
- **STOP. G4 questions for Derek:**
  1. At 1× playback: does impact → clutch → lying hold → rise → stance read as
     one hurt action, or as separate moves? Does the lying hold look alive or frozen?
  2. Does the far hand look like it takes weight (even with the fist art)?
  3. Is the hand returning to the back on his feet right, too much, or a dip?
  4. Promote `sellart=v1` to default for Lou, or keep iterating?
  5. Next: port to George (Stage 6) or ask Codex for the open-palm art first?

### Stage 6 (only after G4 approval; plan again before starting)

George roster: measure his `backWaist` on his own torso, request his own grip
and support forearms from Codex (Codex's George packet: 426×439, proximal/distal
locks), then repeat Stages 2–5. Never scale Lou's donors onto George.

## 4. Sessions

1. **Done:** Stage 0 + Stage 1 (T0.1–T1.2).
2. **Next (rev 2):** T2.0 → T1.3 → T2.1 → T2.2 → T2.3 → T3.1. Stop after T3.1,
   or earlier at the Stage 2 stop condition. Stage 3 hands Codex the art request,
   so Codex can work in parallel with session 3.
3. Stage 4 (T4.0 → T4.0b → T4.1 → T4.2 → T4.3 → T4.4).
4. Stage 5 → STOP at G4. If Codex's support art is registered by then, re-run
   T2.3 with the painted `support` anchor before T5.1.
