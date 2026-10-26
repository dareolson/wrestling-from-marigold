# Gait plan: walk and run (Opus plan, 2026-10-25)

Derek: "their gait and run gait are still bad." Gait is shared (every wrestler, every match),
so one fix reaches the whole roster. Sonnet executes; Opus reviews at gates; Derek judges every visual.

## Progress
(one line per task: `- T1.1 <sha>: result; misses`)
- T1.1 ec718f6: tools/debug/gait_film.mjs (+gait_pack.py, harness WFM_INIT_SCRIPT); 12 runs (2 rigs x 2 facings x walk/run/whip), seed before init. Miss: lean not measurable (torso.rotation reads 0); whip is started with `_doIrishWhip`.
- T1.2 039e74a: A-G confirmed (F's ~5% was ~9%); new H: gait phase uses s but the rig draws at s*_heightScale, so Lou's planted foot creeps 21% of body speed at a walk (George 1%). Viewer research/animation/gait-2026-10/g1.html. STOP at G1.
- T2.0 f2d5445: flag-off fixture (tests/gaitFlagOff.test.js, `footGait` exported); browser compare flag-off vs old src: 6 runs, 0 differing values.
- T2.1 544b795: foot lock behind ?gait=v2. Drift/stance walk+run: Lou 9.1/18.5 -> 0, George 0.5/9.6 -> 0 px. Misses: stop still snaps at the idle-FK switch (27 px Lou, 41 George, same as v1); cadence rises (Lou walk 3.36, run 8.46; George run 6.44 steps/s); rope turn untouched.
- T2.2 544b795: lean via `bend` .10 walk / .25 run (+/-.06 accel); measured .10/.25 rad, arm segment lengths unchanged (0 px). T2.3 5da5a03: A/B page research/animation/gait-2026-10/g2.html (v1 + 4 columns, Lou walk+run, URL knobs). STOP at G2.

## Rules
- Rigs: Procreate Lou (`thesz-procreate-v1`) and `george-roster-v1`, both facings. Ignore `thesz`, `thesz-front3q-r1`.
- New behavior lives behind `?gait=v2` until Derek promotes it. Flag off = today's numbers, byte for byte
  (add a fixture test for `footGait`, hip height and the arm angles over one cycle, flag off).
- Focused tests per task; full suite/build/coverage at gates only.
- Never say it "looks" right. Report the numbers and misses; Derek judges.
- Quick loop before packages: at each gate, first show Derek one normal-speed loop. Build anything bigger only if he asks.
- Do not touch move/choreography leg poses (`useGait` false path) or the rise/sell work.

## What the code says today (to verify on film, not conclusions)
| # | Where | Observation |
|---|---|---|
| A | `Wrestler.tickRun` | phase advances at `WALK_FREQ * 0.8`: planted foot drifts ~20% of run speed (~14 px per step) |
| B | `GAIT` (Skeleton.js:214) | run uses walk STRIDE 56 / STANCE .55: no flight phase; cadence ~5.3 steps/s (walk ~2.75) |
| C | `_updateUprightCore` hip | run bob uses walk model (hip highest mid-stance); a run is lowest mid-stance, highest in flight |
| D | `Wrestler.draw` lean | lean `0.07 * gaitBlend` for both walk and run |
| E | `Wrestler.move` | on stop, `walkPhase *= 0.85^…` with no travel: feet move while the body stands still (likely slide) |
| F | `GAIT.STANCE` .55 | walk double support ~5%: reads as a light trot, not a heavyweight walk |
| G | global `GAIT` | one gait for every body; no per-rig leg length or weight class |

## Stage 1: measure (no gameplay change)
- T1.1 `tools/debug/gait_film.mjs`. Reuse `aftermath_film.mjs` page/clock setup. Install the seed BEFORE
  game init and record it in the manifest (efficiency plan Phase 3). Scenarios: `walk` (walk across, stop, reverse,
  stop), `run` (run to ropes, rebound, back), `whip` (Irish-whipped run). Output per rig and facing:
  a normal-speed WebP loop, a 12-frame one-cycle strip, and `metrics.json`:
  - per stance: planted-foot world-x drift (px)
  - cadence (steps/s)
  - stance fraction and flight fraction (both feet up)
  - hip bob amplitude and its phase vs mid-stance
  - lean
  - foot drift during the stop/reverse frames
- T1.2 Run it at HEAD on both rigs. Put the numbers next to table A–G (confirmed / not confirmed).
  Build a viewer at `research/animation/gait-2026-10/g1.html`: loops side by side and the metrics table.
- **G1 (Derek):** watch the loops and name what's bad, in his words, ranked. Possible items: skating, too fast or
  scurrying, no weight, knees, arms, run = fast walk, lean, starts/stops, turnaround at ropes. Only the issues he
  names go forward; drop the rest.

## G1 verdict (Derek 2026-10-25, recorded by Opus)
1. **More forward lean in every gait, more in the run.** "He's 90 degrees": the body is dead vertical.
   Cause (Opus, from source): `lean` is passed to `updateUpright` but never drawn (Skeleton.js:1174, the torso is
   a rigid upright block; the old shoulder shift was removed). D's 0.07 has done nothing. The existing pitch is
   `bend` (`_applyTorsoBend`, upper body about the hip pivot, used by moves).
2. **"Something about the gait is still a little off."** He hasn't named it. Opus's read of the strips: stride short
   for the leg, knees nearly straight, run looks like walking in place. Treat as a hypothesis; answer it with the A/B in T2.2.
3. Mechanical faults go in regardless (Opus): H, A, E, R. Feet must not slide.

## Stage 2: lean + foot lock (behind `?gait=v2`), Derek's #1 first
- T2.1 Foot lock: phase advance uses the DRAW scale (`this.s * this._heightScale`) in walk and run (H).
  Run phase from travel and `_walkPhaseDir`, no `* 0.8` (A). Stop: no phase decay while still; finish the
  swing foot to plant, then blend to idle (E). Target: drift ≤ 1 px per stance on both rigs, walk/run/stop.
- T2.2 Lean through `bend`. In `Wrestler.draw`, with the flag on, add a gait bend to the pose passed to the skeleton:
  `bend += GAIT_LEAN.walk * gaitBlend * (1 - runBlend) + GAIT_LEAN.run * runBlend`.
  - Start values: walk .10, run .25 rad.
  - Accel/brake: lean scales with |accel| (into a start, back on a brake), at most ±.06 extra.
  - Facing-relative like the rest of `bend`. Copy the pose; never mutate `this.pose`.
  - Leave the old `lean` arg alone when the flag is off.
  - Hips stay over the planted feet (bend pitches above the hip, so feet/IK are untouched; check foot drift is still ≤ 1 px).
  - Arms and head ride the bend (UPPER_BODY_PARTS); check the shoulder joints don't open.
- T2.3 A/B page for item 2: four columns, each in a normal-speed loop on Lou:
  - v2 lean only
  - plus stride ×1.3 (WALK_FREQ re-derived, so cadence drops)
  - plus knee flex (more crouch while moving, ~.1)
  - plus all three
  - Same for the run. Use URL params for the knobs (`&gaitStride=`, `&gaitKnee=`, `&leanWalk=`, `&leanRun=`) so Derek can scrub values himself.
- **G2 (Derek):** pick the lean values and which A/B column fixes "a little off". Open the page in his browser
  (`open <path>`) and give a `file:///` link.

## Stage 2b: walk weight (only what G2 picks)
Candidates and their knobs:
- Weight: STANCE .55 → ~.62 (real double support), slower cadence by longer STRIDE (re-derive WALK_FREQ; keep foot lock).
  Start from measured leg length; SPEED stays 140 unless Derek asks.
- Stop slide (E): settle the feet to idle by planting, not by decaying the phase. Finish the current swing,
  then blend the hip to stand; planted foot drift ≤ 1 px.
- Weight shift: small hip drop/torso roll over the planted leg (amplitude from film; ≤ a few px).
- Arms: counter-swing amplitude tied to stride, not a constant.
- Checks: foot drift ≤ 1 px per stance at steady walk, accel and brake; reversal still drift-free (existing VX_EPS logic).
- **G2 (Derek):** quick loop, v1 vs v2, both rigs.

## Stage 3: run as its own gait (behind `?gait=v2`)
- `RUN_GAIT = { STRIDE, STANCE < .5, LIFT }` with its own derived frequency. Blend walk→run gait params by `runBlend`.
- A: remove the `* 0.8`; advance the phase from actual travel and direction like the walk (`_walkPhaseDir`).
- C: run hip model, lowest at mid-stance and highest in flight (flight fraction from STANCE).
- D: run lean = G2's value (T2.2); arm pump stays (RUN_ELBOW), amplitude from stride. Knee drive (swing knee higher) if G2 picked knee flex.
- Rope rebound: the turn at the ropes keeps one foot planted through the bounce (measure drift).
- Checks: drift ≤ 1 px per stance, flight fraction > 0, cadence target agreed at G1 (big-man run ~3–3.5 steps/s).
- **G3 (Derek):** quick loop, v1 vs v2, run + whip + rebound.

## Stage 4: transitions
- walk → run start, run → stop (whip-reversal, clothesline catch), and moves that start from a run
  (dropkick v2 run-up, clothesline). These must not snap: max per-frame step for foot and hip ≤ 3 px.
- **G4 (Derek):** quick loop of each transition. Then the promote decision (b8b274b pattern: flag becomes default,
  flag-off branch removed in a separate commit).

## Stage 5 (only if Derek asks at G4): per-wrestler gait
- `gait` block in the roster kit (stride/stance/lean scale) so George and Lou can walk differently. G (table) stays global until then.

## Not doing
- No new animation architecture, no clip-authored walk cycle, no change to move leg poses, no art changes.
