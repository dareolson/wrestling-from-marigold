# Claude's reach repair: inspected, extended and filmed

2026-10-23 · Codex · base HEAD `803478f` plus Claude's uncommitted
`Skeleton.solveReachArm` extraction and two added sell tests.

Derek asked for direct help solving the current work. I preserved Claude's
reachable-annulus repair and tests, then repaired two remaining discontinuities
in the actual grounded clutch path. No commits or pushes made.

## What Claude fixed

The projected target now drives both bones. The old overfold reproduction is
fixed and the two new tests pass. The starting tree passed 780 tests. This
supersedes the previous handoff's still-unfixed cap finding for this working tree.

## What still broke, and the implementation added

1. **Elbow branch flips.** The torso-front selection changes which of the two
   IK solutions it chooses when the hand crosses the shoulder/torso axis.
   Reproduction: equal 50px bones, target radius 60, target angle −0.001 →
   +0.001 radians, torso front `(1,0)`: target moves 0.12px, elbow moves 80.06px.
   The real Procreate Lou arm clutch reproduces an 81.38px jump in 1/240 of a
   sell while the wrist moves 1.40px.

   **Fix:** `updateGroundedReach` supplies an explicit signed hinge branch
   (`-facing`) to `solveReachArm`. The branch mirrors with the actor, rather
   than being chosen anew from the target slope. The optional existing front
   argument remains compatible with Claude's helper tests. This change is
   confined to grounded reaching; it does not change hammerlock posing or
   global articulation limits.

2. **The hand crosses the shoulder's unreachable inner disk.** Once branch
   flipping is fixed, Lou's head clutch still has a 17.69px maximum adjacent
   elbow displacement. Straight wrist→head interpolation passes close to the
   shoulder. Projecting those points radially onto the inner reach circle
   swings the arm sharply around the shoulder.

   **Fix:** `blendReachTarget` interpolates the hand's polar position around
   the shoulder, preserving start/end targets and shortest angular travel.
   The bone solver still projects to feasible reach and preserves its lengths.
   A follow-up Kowalski/Guido sweep exposed the shortest-path seam at opposite
   start/target directions (Kowalski's head clutch: 30.54px elbow step). Head
   reaches now explicitly choose their mirrored turn direction, so crossing
   that seam cannot switch the hand to the other side of the shoulder.
   This is a hand trajectory, not interpolation of joint angles. No longer
   require a hand to travel through its own shoulder to reach the head.

## Reproducible rendered evidence

New tool: `tools/debug/clutch_continuity_audit.mjs`. Actual `_sellPose` and
`updateGroundedReach`, 241 samples per clutch, 80 combinations: George roster
and Procreate Lou × both lyings × both facings × five hurt parts × both limb
identities. `limb` only affects clutch slot selection where relevant; the rows
for other parts are not independent artwork variants. Samples are pose sweeps,
not recordings of an uninterrupted match.

| Version | Worst elbow step | Cases above 10px | Head-clutch worst |
| --- | ---: | ---: | ---: |
| Claude's working-tree annulus repair | 81.38px | 28 / 80 | 80.85px |
| Plus fixed hinge branch | 17.69px | 12 / 80 | 17.69px |
| Plus curved hand trajectory | **5.24px** | **0 / 80** | **4.59px** |

Artifacts under `research/animation/codex-2026-10-23-audit/`:
`continuity/`, `continuity-fixed/`, `continuity-arc/`; each has JSON and
before/after full-frame images of its own worst transition. `continuity-final/`
and `continuity-final-kowalski-guido/` include the explicit head direction fix;
the latter has a 3.60px worst step, versus 30.54px in the shortest-path trial
`continuity-arc-kowalski-guido/`. The worst case
changes between versions; do not compare the images as identical phases.

Run with Node 22:

```sh
WFM_P1=george-roster-v1 WFM_P2=thesz-procreate-v1 node tools/debug/clutch_continuity_audit.mjs research/animation/codex-2026-10-23-audit/continuity-arc
```

Four new tests in `tests/clutchReachContinuity.test.js` cover branch stability,
bone-fold cap through the crossing, endpoint accuracy, the shoulder-avoiding
trajectory, facing symmetry, finite shoulder-target handling and the antipodal
head-path seam. Verification results are recorded below.

## Remaining work for Claude

- The residual ~5px maximum is near the start of reach, where the originally
  posed near-straight arm hands over to constrained IK. Inspect that short
  activation interval; the current result is an improvement, not certification
  of a perfectly smooth or anatomical animation.
- Head reaches have an authored mirrored direction. Other targets retain the
  shortest path; expand those per-sell direction rules only if future poses
  demonstrate a crossing. Preserve deterministic seeking rather than adding
  frame-history state.
- Head/arm contact targets, palm geometry, floor clearance and support still
  need artistic judgment. The current floor/torso diagnostic has known sign
  ambiguity; do not claim all anatomical violations are resolved.
- Keep the get-up/performance task separate: this fixes grounded reaching,
  not injury-aware rising. Use the prior asset packet only for remaining
  demonstrated painting failures. Do not regenerate limbs to repair these
  solved kinematic discontinuities.
- Do not resume the parked figure four or promote the aftermath flag on the
  strength of this fix. Full-speed performance remains Derek's visual call.

This is a shared repository handoff; no live Claude response was available.

Final verification: **784/784 tests pass**, production build passes, all eight
registered rig contracts validate, and `git diff --check` is clean. Final rendered
sweeps cover Procreate Lou and all four roster rigs: George/Lou 5.24px maximum,
Kowalski/Guido 3.60px, roster Lou/George 3.82px. Each final pair samples 80
combinations at 241 frames. The final roster Lou evidence is in
`continuity-final-roster-lou/`. No claim of full-speed visual approval or a full
catalog audit is implied by these measurements.
