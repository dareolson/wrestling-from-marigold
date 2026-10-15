# Elbow and knee attachment audit and repair plan

2026-10-15 · Codex · Existing characters and moves only

## Decision

Fix attachment before generating more move art. One elbow/knee must be one
shared world-space point for both adjoining parts, at every sampled time.
Fit the artwork to that chain; never move a forearm or shin independently
after fitting it. Verify both geometry and painted coverage on the final render.

This is a repair proposal, not a claim that the current rig is fixed. Finite
sampling cannot prove every possible animation input. The structural invariant
can guarantee anchor coincidence for valid inputs; visual coverage needs an
explicit supported pose range and tested art.

## Confirmed causes and coverage holes

### Measured baseline

Ran the existing named-pose audit and an additional diagnostic sweep of all 15
registered clips, in both starting facings, with each character in both roles.
The clip sweep sampled keys, span midpoints, and a 20Hz grid: 1,236 sample times
per preset, 3,708 total. Raw results and method limitations are preserved in
[research/animation/joint-attachment-2026-10-15.json](research/animation/joint-attachment-2026-10-15.json).

| Preset | Role/joint/clip/facing combinations exceeding old 2.5px ink-gap threshold | Largest measured gap |
|---|---:|---:|
| George | 0 | Within threshold; does not clear the reported defect |
| Original Lou | 31 | 6px |
| Procreate Lou | 0 | Within threshold; does not certify geometry or appearance |

Examples for original Lou: piledriver defender near elbow at .72s (6px in both
facings), and suplex overhead samples around .60–.62s (up to 6px). The simpler
named-pose audit also reproduced 3px far/5px near overhead elbow gaps.

These measurements use actual clip sampling and final rendered parts, but
force a holding-state pose render rather than execute each complete move.
They do not reproduce every state transition, contact, IK history, or blended
gameplay frame. George's severe reported problem remains unresolved by this
metric; the next gate must capture the actual failing silhouette and measure
anchor alignment, coverage area and orientation separately. Do not describe
the zero above as a George fix or a clean bill of health.

### 1. Independent lower-limb translation remains active

`Skeleton._updateUprightCore` first derives a parent joint, then adds fixed
X/Y offsets to the forearm or shin render origin. Those offsets are relative
to the screen/facing, not the rotating limb. Legacy parts use that displaced
origin in `_placeLimbPart` → `_placePart`.

| Config | Near/far forearm offsets (X,Y), rig units | Near/far shin offsets (X,Y) |
|---|---|---|
| George | (-2,3) / (-6,1) | (-2,12) / (3,13) |
| Original Lou (`thesz`) | (-2,-10) / (0,-7) | Audit all inherited leg nudges during migration |
| Procreate Lou (`thesz-procreate-v1`) | No explicit forearm X/Y nudge | (1,-5) / (1,-3) |

George also has facing-left forearm overrides. These settings were intentional
idle/art tuning, not random corruption. Derek's current request changes the
priority: preserve the approved appearance through attached geometry and poses,
rather than retaining offsets that detach limbs. Do not simply zero them all
and declare the resulting changed silhouette approved.

### 2. Rendered knee and geometric knee can disagree

For legacy thighs, `nearTrueKnee/farTrueKnee` comes from the painted distal
anchor. The shin render attaches there plus its nudges, but ankle calculation
and reported knee still use the geometric knee. This creates competing chains:
one for painted placement and another for downstream geometry/diagnostics.
It affects upright rendering and the analogous grounded leg closure.

### 3. The robust binding path already exists but these configs do not use it

`_placeBoundPart` and `solveTwoAnchorBinding` fit a part's measured proximal
and distal anchors exactly to the world bone with a uniform similarity
transform. `_placeLimbPart` uses this when both binding anchors exist; otherwise
it falls back to the legacy positioning path. George, original Lou, and
Procreate Lou currently have no `binding:` entries in their character configs.

Internal `jointPivotFrac` and parent `distalAnchorFrac` are useful calibration
but do not, by themselves, eliminate later independent translation.

### 4. Grounded rendering is a different placement path

The grounded arm/leg closures do not reproduce all upright per-part offsets,
scales, and tilt biases. That can expose different seams or create an apparent
jump at land/get-up boundaries. Both paths must consume the same limb geometry
and calibrated anchors, even when the poses differ.

### 5. Attachment and strange bending are separate defects

A limb can stay connected and still fold the wrong way. The articulation
contract already gives local elbow/knee channels ownership over legacy absolute
child angles. Keep that contract. Check IK branch continuity, unexpected angle
travel, near/far mapping, and abrupt facing changes separately.

The elbow range intentionally permits -3 radians for hammerlock's stylized
behind-the-back fold. A blanket tighter clamp or automatic shortest-angle
interpolation could destroy Derek's authored hold. Treat those extreme poses
as explicit supported choreography, with a controlled entry and exit.

### 6. Existing green checks do not cover the complaint

The existing `joint_attachment_audit.mjs` examines eight named upright poses
and four get-up samples in each facing. It is alpha-aware, which is valuable,
but it does not sweep registered clips or their interpolated spans. Its nearest
ink-pair gap can be zero if a small corner overlaps even when the joint looks
bad. A display rectangle containing the joint is weaker still.

Current certification can report legacy structural chains as unmeasurable,
and its runner allows recorded legacy defects. That is honest historical
reporting, but insufficient acceptance for this repair. These four joints must
be measured, covered, and passing rather than budgeted away.

Whole-body tilt moves rendered pieces and joint points afterward. Attachment
measurements must use the final Image transforms; cached pre-tilt margins or
binding objects are not independent evidence of the final result.

## Repair architecture

### First gate: whole-body scrambling during participation

Derek clarified that a wrestler can become disorganized while performing OR
receiving a move. Treat this as a live choreography/state problem as well as
an attachment problem. A clean isolated pose sweep cannot clear it.

Reproduce with the real executors, starting from idle, walking, running,
blocking, selling, a previous move's recovery, and an interrupted paired move.
Run George→Lou and Lou→George, swapping player slots and starting facings.
Capture several frames before the first distortion, not just its worst frame.

Add a rolling diagnostic trace for each actor: clip ID/handle, attacker or
defender role, gameplay state, facing, pose channels and their latest writer,
active pose/root tweens, move/combat blend, tilt/lift, part variants, and chosen
render path. At the first failed invariant, save the trace and rendered frame.

Audit these mechanisms before adjusting individual move poses:

- **Competing writers:** a clip, old pose tween, gait/guard blend, reaction,
  delayed callback, or AI state update can potentially claim the same channel.
  Prove the existing cancellation/ownership guards work during participation.
  A paired move must release both actors together when interrupted.
- **Inherited pose state:** `applyAnimationSample` merges authored channels;
  omitted channels remain from the previous pose. Test each move from multiple
  histories, especially local elbow/knee versus legacy absolute child angles
  and residual tilt/lift. Define explicit owned-channel initialization where
  history changes the intended pose; do not reset unrelated channels blindly.
- **Facing/role changes:** verify both whole-body facing and semantic near/far
  limb selection on the exact turn frame. An authored facing snap must not
  unexpectedly remap a trapped limb or reverse a bend in the middle of contact.
- **Render handoff:** verify held/airborne → falling/grounded → get-up frames,
  preserving the intended shared joints and body orientation at each boundary.
- **Coupled placement:** keep both actors on one staging context where the clip
  owns their roots; detect surviving root tweens or state updates that reposition
  either actor after that sample.

These are source-supported investigation targets, not proven explanations of
George's specific scramble. Acceptance requires reproducing that symptom and
showing the same scenario clean afterward. The joint repair is incomplete if
the anchors stay attached but the wrestler still twists or snaps incorrectly.

### A. Make a single joint chain authoritative

Solve shoulder → elbow → wrist and hip → knee → ankle once per pose. The end
of the upper part and the beginning of the lower part reference exactly the
same joint object/value. Grounding IK, contact IK, rendering, and reporting
consume that result. No painted-knee versus geometric-knee split remains in a
migrated chain.

Keep authored limb lengths stable across poses. Fit artwork uniformly to those
lengths; do not solve a seam by stretching one axis or shortening a bone every
frame. Handle unreachable IK targets explicitly, with stable bend direction
and a reported residual rather than a detached endpoint.

### B. Measure and migrate the existing art

For every active near/far upper arm, forearm, thigh, and shin, record measured
proximal/distal source anchors and opaque joint coverage. Use the existing
two-anchor binding path; do not build a second solver. Baked-in hands/boots
remain baked in for this repair. A forearm distal anchor can be its painted
wrist even though the texture continues through the hand; shin art can extend
past its ankle through the boot.

Migrate one complete chain at a time, beginning with George's worst reproduced
chain, then his other three, then both supported Lou configs. Partial conversion
must explicitly preserve shared endpoint agreement; do not assume combining a
bound parent with an uncalibrated legacy child is safe.

For migrated chains, reject nonzero post-solve child X/Y offsets. Move legitimate
calibration into measured source anchors, stable bone dimensions, or an authored
joint pose. Keep old values in a reviewable baseline, not as hidden offsets.

Reconcile `faceLeftOverrides` with measured geometry. Both directions must use
the same joint invariant; do not erase the user's head/neck tuning as collateral.

### C. Guarantee paint around the shared joint

Shared anchors guarantee connection of coordinates, not opaque silhouettes.
Inspect parent/child alpha around the measured elbow/knee over the supported
bend range. Preserve a rounded overlap cap with enough paint on both sides of
the pivot and an intentional drawing order. Repair source paint where needed.

Do not use floating skin circles, enlarged parts, camera shake, or pose-specific
translation to cover the problem. Any explicit coverage piece must be an
artist-approved part attached to the same joint, with tested depth and shape.
Maintain Lou's approved lanky silhouette and George's existing proportions.

### D. Keep attachment, orientation, and coverage independently testable

For every final rendered sample report:

- Parent distal anchor to shared joint distance.
- Child proximal anchor to that same joint distance.
- Parent-to-child anchor distance.
- Finite transforms, stable bone lengths, and legal authored flex.
- Opaque overlap/coverage in a small joint-local region, not merely the closest
  pair of painted pixels anywhere in a large neighborhood.
- Boundary continuity when facing changes, art swaps, or posture paths change.

Use independent Image-transform reconstruction (`anchorWorldPoint`) rather
than asserting that a binding solver returned its own requested endpoint.
Measure once after mirroring, whole-body tilt/lift, and the active part variant.

Set the structural coincidence tolerance to 0.1 screen pixel at reference
scale, with numerical precision checks in pure binding tests. For coverage,
require no visible background crack through the joint at gameplay scale;
calibrate the local alpha mask/threshold against approved close-up renders.
Do not retain the old 2.5px ink-gap allowance as the visual quality target.

## Execution order and review gates

1. **Reproduce and preserve evidence.** Pin exact character preset, role,
   facing, clip/draft ID, pose history, time, and art files. Capture the worst
   frames at gameplay size and enlarged without reference overlays. Distinguish
   a real gap, wrong bend, overlap/depth issue, and posture handoff jump.
2. **Build the failing acceptance sweep first.** Extend the existing alpha-aware
   audit to the actual registered clips, both roles and facings, keyframes,
   span midpoints, uniform 60Hz samples, and denser samples near failures.
   Exercise the same runtime sampling and actual render paths. Report failures
   by joint/time and save images, JSON, and repro inputs.
3. **Prove one George chain.** Measure existing source anchors, migrate the
   complete chain, remove its detached translation path, and compare idle plus
   its worst move frames. Pass structure and paint independently. Preserve
   the approved hand/foot location through bone calibration or pose tuning.
4. **Finish George, then Lou.** Apply the proven pattern to the remaining
   elbows/knees. Procreate Lou is a separate supported preset, not equivalent
   to original `thesz`. Include grip forearm variants with their own measured
   anchors if the cut differs; never inherit geometry blindly across new art.
5. **Unify grounded placement and handoffs.** Reuse the same chain placement
   helper for upright, falling, supine/prone, get-up, held and airborne states.
   Check the frames immediately before/after each handoff and interruption.
   Transform the complete body once for tilt/lift; do not rotate only one
   segment or use pre-transform diagnostics afterward.
6. **Resolve remaining weird bends.** Verify one angle owner per joint,
   stable IK branch, deliberate shoulder/internal-rotation illusion for the
   hammerlock, and correct mirrored near/far roles. Add regression cases for
   reproduced wrong bends; do not change angle interpolation globally without
   evidence that the authored winding was unintended.
7. **Make regression impossible to overlook.** Put structural and coverage
   failures for these characters into a required release check, with no legacy
   exemption for repaired elbows/knees. Reject forbidden child translations
   in migrated configs and editor exports. Keep failure artifacts readable.

Additional verification matrix:

- Existing clip moves plus legacy move pose sequences, walk/run, grounded
  falls/get-ups, pin and rope transitions.
- Both actors, both facings, all active limb variants, near/far ring scales.
- Forward playback at 30/60/120Hz, random seek order, direct seek to the worst
  frame, interruption and repeated move transitions.
- Deep squat, overhead, near-straight and deeply folded elbows/knees, negative
  hammerlock elbow range, inverted bodies, and large whole-body rotations.
- Explicit full-speed visual review with ordinary game lighting and no editor
  overlays. Structural pass plus ugly silhouette still fails art acceptance.

Deliverables: reproducible failure report; measured anchor maps; four-chain
George before/after; both Lou presets before/after; automated matrix report;
and a short full-speed reel of the existing moves. This must land before the
expression/twisted-torso expansion in MOVE_REFINEMENT_AUDIT.md.
