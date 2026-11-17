# Scale consistency: one perspective, no size pops

2026-11-16 · Claude (Opus) plan, Sonnet executes · Derek judges every visual result.
Derek 2026-11-16: "during matches sometimes the scale can be inconsistent… audit our current setup for weaknesses and ways we can harden our scale consistency, while maintaining the depth illusion we have."
Runs alongside the Stage 12 move refinement (PLAN_LIGHT_MOVES). Don't touch move clips, rigs or art here.

## Progress

(Sonnet: one line per task: id, sha, result, misses. ≤ 3 lines. Gate lines are written by Opus/Derek only.)

- S0 (T0.1+T0.2): tool `tools/debug/scale_pop_soak.mjs`; 646 game-s, 58 flags >1.5% = 5.4/min (3.6-7.6 by pair). Causes: separation push of stacked down bodies 13 (60-87 px y jump, 13-20% size, not in audit's list as a down-body case), paired-move entry snap 13 (lockup/down→piledriver, hammerlock, armBar, hipTossRunner; 8-52 px), clip-authored y 14 (mountedPunches, halfBostonCrab; 1.6-2.8%), slam carry 8 (-1.6..-4.3%), standing sep/band 5. Misses: ran ~33 fps game frames (4 parallel), so per-frame % is ~2× a 60 fps frame; ordinary standing p99 ≈1%, running p99 ≤1.75%, so 1.5% is inside real run motion.

## Rules

- Everything new goes behind `?scale=v1` (`scaleCandidate()`, same shape as `lightCandidate()` in Wrestler.js:229, with a `typeof location` guard so node tests run). Flag off must be byte-identical: same `y`, same draw scale, every frame.
- Each task: focused tests, local commit, one Progress line. Never push. Before every commit, check you're on `story/marigold-opening` and `git status` shows only your files; if another session touched the tree, hard-stop.
- **STOP** means: commit, write the Progress line, stop. Derek tells Opus "review S-x".
- Measure with Procreate Lou (`thesz-procreate-v1`) and the roster rigs (`george-roster-v1`, `kowalski-roster-v1`, `guido-roster-v1`). Ignore `thesz` and `thesz-front3q-r1`.
- Report numbers and misses. Don't say the result "reads" or "looks" right; Derek judges.

## What the audit found (Opus, from the code; not yet measured in play)

Size is one formula: `perspectiveScale(y)` (constants.js:26), read through `Wrestler.s` (Wrestler.js:695) and drawn at `s * _heightScale` (Wrestler.js:4806). Airborne height uses the pose's `lift`, not `y`, and turnbuckle climbs lock size to the corner's `matY`. Those parts are sound. The weak spots:

1. **Pops: depth `y` is written in one frame, so size jumps in one frame.** About 0.22% of body size per px of `y` (0.42 / 187).
   - Separation push (Wrestler.js:1268-1290): bodies under 26 px apart in depth are put 80·s apart along the line between them. Stacked close in x, most of that lands on `y`: a 30-50 px snap is a 7-11% size pop. Eased only in the get-up window.
   - 26-48 px band (Wrestler.js:1302): stacked standers drift apart in `y` at up to 90 px/s, so they grow or shrink while standing still.
   - Thesz press cover (Wrestler.js:3821): `other.y = this.y`.
2. **The wrestlers' perspective doesn't match the ring's.** The ring's side edges meet at y ≈ −39 (far/near width 540/880 = 0.614; rope heights 0.597-0.615). `perspectiveScale` runs 1.0 → 0.58, which puts its vanishing point at y ≈ 0. At the back row a wrestler is 5.5% small against the ropes and posts (−3.7% at y 300, −1.9% at 360, 0 at the front).
3. **Depth thresholds are in screen px, not ring depth.** `STRIKE_DEPTH_TOLERANCE` 26, `RUNNER_DEPTH_GATE` 48 and the separation bands are fixed px. At the back, a px covers ~2.5× the real depth it covers at the front (screen y ∝ 1/z, so px per unit of depth ∝ s²). Clip depth offsets (`dy * scale`, clipStaging.js:228) scale by s, not s². This affects feel more than size. Parked (S4).
4. **No single draw-scale function.** `s * _heightScale` is calculated inline at Wrestler.js:2616, 3462, 4089, 4121, 4806 and in the ground-attack route (3444).
5. **No guards.** No test ties wrestler scale to the ring, no soak flags pops, no test pins the roster's relative heights.

## S0: baseline measurement (no src change)

- **T0.1 Pop soak tool.** `tools/debug/scale_pop_soak.mjs`, built on `g12_soak.mjs` and `harness.mjs`. AI vs AI, `?light=v1` (plus `&scale=v1` when `SCALE=1`). Every `postupdate`, per wrestler: draw scale `perspectiveScale(y) * _heightScale` (or the corner `matY` scale while on the ropes, as in `draw()`), `y`, state, active clip id. Flag any frame where |Δscale / scale| > 1.5%. Per flag, record time, who, state before and after, clip id, Δy and the other wrestler's dx/dy, so the cause can be named. Also write the distribution of ordinary per-frame Δscale (walk, run lines, whips) so the bar can be checked against real motion. Output JSON + a short summary table: pops per minute, by cause.
- **T0.2 Baseline runs.** 150 s game-time per pairing: lou-george, lou-kowalski, george-guido, kowalski-guido. Flag off. Put the summary in `research/scale-2026-11/s0/` (JSON committed; no frame dumps). Progress line: pops per minute and the top three causes with counts. If a cause isn't in the audit list above, name it. **STOP for Opus review.** Opus sets the final pop bar from the motion distribution.

## S1: kill the pops (`?scale=v1`)

- **T1.1 Separation pushes in x.** Under the flag, in the separation block (Wrestler.js:1268-1305): push along x only and leave `y` alone. Dead-centred (dx 0): step back opposite own facing, as now. Clamp to ring bounds at the current `y`. In the 26-48 band, nudge x apart instead of drifting `y`, with the same 60·s x-gate and a gentle rate. Keep the light-v1 ground-clearance and `_lungeUntil` exceptions. Test: two standers at dx 0-40, dy 0-47, both facings; `y` unchanged every frame under the flag, flag off unchanged.
- **T1.2 Cover snap.** Thesz press (Wrestler.js:3821) and any other single-frame `y` write the S0 soak named: ease `y` to the target over ≥ 120 ms, or skip the write when |Δy| < 3 px. Use whichever keeps the pin's body contact; report contact before and after.
- **T1.3 Re-soak.** T0.2 runs with `SCALE=1`. Bar: zero pops above the Opus-set bar outside named intended snaps (list them). If a cause remains that isn't fixable at its source, write it as a miss; don't add a global slew cap (Opus decides if one is needed). Make one normal-speed loop strip, both facings, of two wrestlers stacked in depth (the old pop case), flag off | on. **STOP for Opus, then Derek.**

## S2: one perspective (`?scale=v1`)

- **T2.1 Horizon from the ring.** In constants.js, derive `HORIZON_Y` from the two ring side edges (the intersection of nearLeft→farLeft and nearRight→farRight: ≈ −39). Under the flag, `perspectiveScale(y) = (y − HORIZON_Y) / (RING.nearLeft.y − HORIZON_Y)`, with the same clamp to the ring rows. The front row stays 1.000; the back goes 0.580 → 0.614. Flag off returns the old 0.58 + 0.42t. Test: under the flag, scale is within 0.5% of the ring width ratio `(right − left) / 880` from `ringBoundsAtY` at every row 258-445.
- **T2.2 One draw-scale method.** Add `Wrestler.drawScale()` (the corner `matY` rule while on the ropes, then × `_heightScale`) and route every inline `s * _heightScale` / `perspectiveScale(...) * _heightScale` site through it (list in the audit, item 4). The ground-attack route's `scaleAt(y)` (3462) keeps its follow-the-body behaviour but calls the same helper. Pure refactor: flag off byte-identical. Prove it with a recorded clip run (any one move, both facings) before and after: every `x`, `y`, draw scale and part transform equal.
- **T2.3 Knock-on check.** Movement, reach and hit ranges read `this.s`, so the flag makes the back row ~6% more generous in reach and walk speed. List every gate that reads `this.s` near the back row and run the S0 soak plus `g12_soak.mjs` with the flag: report moves played, whiffs and stuck states vs flag off. A move whose contact breaks at the back row is a miss to write down, not to retune here.
- **T2.4 G page for Derek.** Page `research/scale-2026-11/g2/index.html`: Lou and George idle, then one approved move (`wristlockHammerlock`), at the back, middle and front rows, flag off | on, with the top rope and post drawn. Under each still: draw scale, body height in px and body height as a fraction of the post height at that row. Plus the normal-speed loop strip, both facings (CLAUDE.md). **STOP for Opus, then Derek.**

## S3: guards (after Derek approves S1 and S2)

- **T3.1 Ring-match test** (node): the T2.1 test, plus a check that `HORIZON_Y` is recomputed from `RING` (so a moved ring corner can't silently break it).
- **T3.2 Pop check.** `scale_pop_soak.mjs --check`: one short soak per pairing; exits non-zero on a pop over the bar outside the named list. Document it next to `moves:coverage` in CLAUDE.md's Commands. Runs at gates, not per task.
- **T3.3 Height ladder.** Tool that measures each roster rig's painted-ink standing height (alpha ≥ 128, the method in thesz_procreate_v1.js's heightScale note) at the front row, idle, and writes `research/scale-2026-11/height-ladder.json`. A node test pins the ratios to Lou within 1%, so an art or `heightScale` change that shifts the line-up fails loudly. Record today's ratios in the Progress line; Derek judges whether they're right.
- **T3.4 Debug overlay.** `?scaleDebug=1`: at each wrestler's root, a thin reference bar at their expected standing height for that row, and a red flash on any frame the pop check would flag. Render-only, off by default.
- **Gate GS:** full suite, build, `moves:coverage -- --check`, and the pop check. Promoting `scale` is Derek's call.

## S4: parked (Derek's call)

- Depth gates in ring depth instead of px (audit item 3): compare depths as `1/s` differences, and scale clip `dy` by s² instead of s. This changes who can hit whom at the back row, so it needs its own soak and Derek's sign-off. Don't start it without his go-ahead.
