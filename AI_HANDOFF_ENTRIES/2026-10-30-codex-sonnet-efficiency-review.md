# Opus / Sonnet: make the leg repair smaller and the proof more useful

2026-10-30 · Codex · requested by Derek. Reviewed HEAD `eb2485f`, the uncommitted
Stage 1c instructions in PLAN_GRAPPLES, recent source/tool changes and run
entries. Recommendations only: I have not rewritten the active plan under the
other session or changed runtime. No new visual approval.

## Assessment

The work has improved materially: buffered direction is implemented, flag-off
proof includes poses, contact errors are separated from reachability, and the
body-clearance checks caught the original spacing problem. The new D13 scope
correctly takes Derek's leg report seriously without reopening Skeleton or
joint limits globally. Preserve those improvements.

The expensive pattern is building and packaging downstream work before the
base pose has passed a small whole-body review. The unattended expansion was
authorized, not a permission error, but the run explicitly expected rework.
Now a changed stance requires checking the already-built exits and endings.
Do not repeat that ordering for Stage 1c while Derek is available.

## Highest-value changes to the instructions

### 1. Put a small feasibility checkpoint between T1.11 and the full sweep

The proposed grid has bend × crouch × thigh combinations × tilt × gap, then
pairs/facings/poses. Before that search, prove one stance on Lou with a short
engage/hold/break loop in both facings, plus a George check. Show a hip crop and
one normal-speed whole-body strip. Run cheap numeric checks without screenshots
while tuning. Only expand to the full matrix when the stance is worth pursuing.

This is the existing “strip before package” rule applied at the point where it
saves work. T1.14 currently puts the review strip after knock-on work; that is
too late to reject a bad base. No need for an extra long handoff or full suite
at the small checkpoint.

### 2. Replace the multidimensional search with a staged search

Keep the last viable gap as a starting point, not a sacred value. First choose
joint ownership and solve knee direction. Then solve stance separation and
trunks. Then re-evaluate gap/reach. Finally test transitions and steps. Change
one family of parameters at a time and retain a tiny Pareto shortlist instead
of making a page for every cell.

There is direct evidence for this ordering: the earlier sweep had a dead
`lean` axis because the renderer uses `bend`. A quick sensitivity check on each
candidate channel would have caught that before the full sweep. For each axis,
verify that changing it changes the intended rendered joint/part and measure
what else moves.

Tilt is not a free torso substitute. `bodyPlacementWeight` is already .33 at
.1 rad tilt and .67 at .2, and `_applyBodyTilt` rotates the whole body about the
hip. It can change planting and soles. Start with tilt 0; only add that axis
if simpler stance changes cannot pass, then measure its foot effects explicitly.
No change to the global renderer is recommended.

### 3. Make the new metrics reproducible before treating them as gates

T1.11 is a useful list, but several definitions are incomplete:

- Knee line: define signed perpendicular distance from the hip-to-ankle line,
  with forward sign resolved by facing. Specify behavior for a degenerate
  hip/ankle segment. Normalize to scale 1. Keep the underlying signed flex
  angle alongside it: silhouette/joint geometry and joint angle answer
  different questions. Check idle on both rigs before declaring a threshold.
- Stagger: say whether ankle/knee spread is horizontal or Euclidean, signed
  or absolute, and normalize it. A wide horizontal spread alone does not prove
  a useful lead/rear relationship. “Two readable legs” remains Derek's judgment.
- Hip angle: use wrapped angle differences, a defined world coordinate frame,
  and consistent facing treatment. Raw subtraction can create a fake 2π jump.
- Trunks: define the below-waist torso mask, alpha cutoff, denominator and
  baseline for each rig/facing. “10 points” should mean percentage points.
  Count overlap with this wrestler's own thighs, not the other actor; existing
  inter-actor clearance masks do not measure this directly. Preserve frame and
  part identity in the saved worst-case record.
- Soles: use the actual painted sole anchor or a documented fallback, and
  compare at matching root y/scale. Say which foot should be planted in each
  phase. A step's moving foot and its support foot need different expectations.

State scope honestly: geometry sampled every frame versus masks sampled at
selected phases. Do not claim an every-frame pixel pass from a sparse sample.
Before hard enforcement, establish whether starting idle and the transition
endpoints themselves pass 20 px ankle / 14 px knee separation. If they fail,
report the conflict rather than retuning unrelated idle or silently exempting
frames. These numeric thresholds are proposed proxies for D13, not independent
proof of correct anatomy.

### 4. Test rendered direction and lifecycle, not just absence of a key

A test that no key has positive `lKnee` can pass while the legs are still wrong.
Keep a cheap data guard if useful, but add a meaningful rendered check with the
real Lou/George channel conventions in both facings. The tool must fail when
it sees the specific backward-knee or collapsed-stance regression.

The brief correctly says one articulation owner. Make the lifecycle explicit:
remove conflicting knee/shin channels on entry; ensure the engage's `g.from`
and blending path do not resurrect them; preserve intended ownership through
steal and ending poses; restore the move/idle owner's state on exit. Existing
`mergeArticulatedPose` encodes paired-channel ownership, but absence from an
ordinary Object.assign does not delete a stale key. Don't widen the patch to
all poses or change global limits to make this task pass.

## Reduce tool and packaging cost

`grapples_assert.mjs` launches a browser and waits 2.5 seconds for nearly every
scenario. Reuse a browser/page for cases with the same rig pair and flag, reset
state between them, and wait for actual readiness rather than a fixed delay.
Do this only with a reset that clears scene state, tweens, pending inputs,
spies, lead-ins and RNG. Prove case-order independence (A/B versus B/A) before
relying on reuse. This is a small change to the existing harness, not a new
framework. The current unused `wantLock` parameter and hardcoded row indices
also suggest a small cleanup when that tool is touched, not a separate task.

Use one capture/measurement manifest, then generate the strip, worst-frame
crops, and tables from it. Include commit + dirty indication, rigs, flags,
seed, constants and frame/phase for every maximum. Generate “misses” from data;
`grapples_stage_page.mjs` currently includes hand-written numerical misses,
which can go stale after a stance repair. Reuse old baselines only when their
measurement definitions match; otherwise remeasure old source with the new
metric and label it.

Run focused tests while editing. One final full suite/build/coverage for the
coherent G1c gate is enough. The old unattended instructions requested full
gates at G1b, G3, G4a/end; do not carry that repetition into this smaller block.
Run per-exit measurements once after stance is accepted, rather than recapturing
all exits for every parameter change.

## Important open issue beyond the legs

The Stage 3 lead-in blends the drawing while the move clock, hit logic and
real positions continue underneath. First-frame jumps improved to 3–6 px, but
the run correctly notes that a fast hit can land before the picture catches
up. Whip's turn was measured at 119–121 px/frame, worse than flag off. This is
not resolved by a passing first-frame metric.

Keep these as explicit limitations, not reasons to expand Stage 1c. Before
promotion, measure impact/marker frames against drawn contact and the frame
where the lead-in releases facing; decide whether a short per-move authored
transition is needed. Don't promise the universal .14 s cosmetic blend fixes
every exit, and don't add a new timing system during the leg repair.

## Suggested replacement execution brief

1. Read Status, D13 and T1.11–T1.14 only; open the named runtime seams as needed.
   No old completed-stage instructions or archives on startup.
2. Define the leg metrics and record the G1b baseline, including endpoint
   feasibility. Confirm proposed channels actually move the intended parts.
3. Prototype one stance with clean articulation ownership; no Skeleton/global
   limit edits. Produce a short Lou/George strip in both facings. If no viable
   Lou stance exists, show two best candidates and stop as already instructed.
4. After Derek accepts the direction, expand to drive/steal/stall/rope/shove,
   preserving D12 and reporting contact trade-offs. Recheck all exits from the
   accepted stance once; repair only regressions caused by this change.
5. Run focused tests + browser assertions and flag-off comparison, then one
   full G1c gate. Return: selected parameters, worst miss/frame, what changed,
   what remains, one clickable page. Stop; grapples stay opt-in.

Opus's next brief should have a short current contract and the above sequence,
with historical revisions linked elsewhere. PLAN_GRAPPLES now mixes original
D9/.22 s/lean instructions with later fixed-gap/.30 s/bend choices and completed
unattended “do not stop” sections. The latest section revokes unattended mode,
but Sonnet should not have to reconcile the whole history to start. A short
supersedes/current-values block is enough; don't rewrite the live plan mid-run.

One model-routing check: the latest run entry explicitly says Opus executed the
Sonnet tasks. A document saying “Sonnet executes” does not switch models.
Use Opus for the bounded planning/review decision and actually run execution in
the intended Sonnet session. No savings percentage is claimed; track capture
runs, rejected packages and usage to see whether this workflow helps.

## Verification

Fresh Node 22.23.1: `node --test tests/lockup.test.js tests/grapplesFlag.test.js`
**22/22 passed**. The 1057/1057 full suite and other gate results are the prior
run's recorded results, not rerun here. `git diff --check` passed. Review was
source/instructions/evidence-metadata only; no fresh film or visual judgment.
Existing story edits, live Stage 1c draft, and other research left intact.
