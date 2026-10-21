# Elbow/knee direction audit and limiter strategy

2026-10-18 · Codex · requested by Derek after the selling review.

Derek reports elbows and knees sometimes folding the wrong way and wants
limits to prevent broken-joint / bird-leg silhouettes. This audit confirms
coverage gaps and identifies concrete review cases. No production joint limits,
Derek-authored poses, or animation timing were changed. The selling solutions
from the conversation have also been added to the resume audit.

## Fresh evidence

Reproducible diagnostic: `tools/debug/joint_direction_audit.mjs`.
[Rendered sweep](../research/animation/joint-limits-2026-10-18/rendered-sweep.json).
Run under Node 22 with local Vite and system Chrome:

```sh
WFM_URL=http://127.0.0.1:5173 node tools/debug/joint_direction_audit.mjs /tmp/joint-direction.json
```

88,032 rendered joint-chain measurements, three editor-supported rigs (original
Lou, Procreate Lou, original George), both facings. All 15 registered clips at
60 Hz, all exported legacy poses, supine/prone get-ups, and grounded sells at
61 normalized samples. Sells use amplitude 1.3: the theatrical maximum, not
Lou's normal economical setting. That maximum is reachable for George at
intensity 1; not every stress-sampled sell is naturally selected by the planner.
Runtime cast identity is checked; the editor does not offer the four new roster
rigs, so this is **not** proof for those candidates.

Angles below are signed child-minus-parent angles from rendered joint points,
normalized to facing. They describe a 2D projection, not a medical joint range.
Body rotation cancels from that difference. The sweep isolates poses from
executor travel, combat/run blends and post-draw paired grip IK; it does include
grounded clutch IK. It is not a full-speed gameplay film or visual sign-off.

| Measured case (Procreate Lou diagnostic) | Result | Interpretation |
| --- | --- | --- |
| `sell:supine:clutch:knee`, amplitude 1.3 | Knee reaches about -177.6° | Nearly fully folded chain; amplitude can drive a reasonable donor pose into an excessive fold. Strong candidate for a limiter and re-pose. |
| Prone/supine head clutches, amplitude 1.3 | Elbow approaches 180°; signed angle crosses the wrap boundary | Reach solver permits almost total folding. The wrap alone is not proof of a visible snap; inspect continuity and choose a stable allowed branch. |
| Explicit knee poses in most clips | Positive bends: dropkick up to ~91.6°, piledriver attacker ~80.1° | Opposite sign to crouch/get-up knee bends. Verify intended anatomical bend/perspective, then reconcile the contract before enforcing limits. |
| Pose-driven crouch / knee drop | Crouch legacy poses reach ~-75.2°; kneeDrop clip ~-45.9° | Ordinary bent knees already bypass the explicit local knee limit, which only allows -5.7° on this side. A blanket clamp would straighten legitimate crouches. |
| Live hammerlock defender | Elbow down to ~-172.1° | Intentional existing behind-back projection; preserve Derek's draft and separate this exception from ordinary elbows. |

## Confirmed source problems

1. **Limits exist but are not anatomical guarantees.** `src/rig/articulation.js`
   allows elbow -3.0..2.75 rad (~-172..158°), knee -0.10..2.55 rad
   (~-5.7..146°). The elbow range was deliberately widened globally for the
   hammerlock's shoulder-rotation approximation. The test named “prevent
   hyperextension” checks saturation at these constants; it does not establish
   normal elbow anatomy or rendered bend direction.
2. **Several paths bypass them.** Explicit local `l/rElbow` and `l/rKnee`
   call the clamp. Legacy absolute forearm/shin overrides and derived crouch
   knees do not. Grounded `_applyGrounded` places absolute limb angles directly,
   including falls/get-ups/sells. Guard/run blending occurs after upright elbow
   limiting. Therefore narrowing the constants alone cannot protect every path.
3. **The knee sign contract is inconsistent across paths.** Derived crouch
   subtracts knee bend; explicit local knee adds it. Get-up knees also bend in
   the subtracting direction. This is a source-confirmed representation mismatch;
   determining which positive-fold poses need art/perspective exceptions still
   requires visual review. Do not describe every positive projection as injury.
4. **Grounded clutch IK optimizes elbow height, not joint safety.** It chooses
   whichever of two elbow solutions has smaller screen Y, independently each
   sample. Reach is bounded almost straight to almost fully folded, without
   anatomical flex bounds or branch continuity. It can produce a deep reverse
   projection, a near-total fold, or change branches as targets move.
5. **Paired grip IK also has no anatomical range constraint.** It chooses the
   elbow nearest the current one, then updates pose angles and redraws. The
   explicit clamp can prevent the intended grip solution without reporting its
   contact residual. This needs joint limits inside the solve, not only after it.
6. **Pose amplitude scales angle offsets independently.** A thigh and shin
   driven in opposite directions accumulate relative flex. The 1.3 theatrical
   knee clutch illustrates this; scaling each channel is not a safe joint budget.
7. **Editor constraints are narrower than runtime in some places, but incomplete.**
   Wrist drag uses a normal floor of -0.12 and preserves an already reverse-folded
   elbow branch. Typed/slider elbow values still access the broad global range;
   knee drag uses the positive-flex range. These controls need the same explicit
   convention and exception policy as playback.

## Recommended limiters: small staged implementation

**First, define the coordinate contract and repair content.** Establish canonical
anatomical flex (zero straight, increasing flex bends the allowed way) separately
from projected screen angle. Map upright/crouched, prone/supine and turned-arm
views into that contract. Preserve anatomical limb identity through facing and
rolls. Fix a comparison set of knee poses on both sides of the current sign
mismatch before changing production semantics. Do not simply negate every knee
channel: some clips may have been posed around the existing convention.

**Then use one shared constraint function at every producer.** Local channels,
legacy conversion, grounded angles, editor drag, procedural poses, and IK should
resolve through the same policy. Limit the final composed chain after guard/run
contributions as well. Apply leg limits before solving hip height / painted sole
placement, or the limit itself will lift/slip the boot. Preserve exact segment
length and shared elbow/knee anchors.

Use normal elbow/knee ranges with a small visual extension margin and a soft
approach to the maximum fold, then a hard final bound. Choose the exact ranges
from a side-by-side pose sheet on the actual art, rather than claiming universal
medical degrees for this projected rig. Return the requested angle, resolved
angle and residual so the editor/critic can highlight affected frames. Keep
unclamped measurements: the current pose seed helper clamps recorded local flex,
so it cannot alone report the original violation.

**Exceptions must be explicit, narrow and visible.** A hammerlock is shoulder
rotation, not an elbow bending backward. Preserve Derek's existing draft as a
compatibility case while proving a turned upper-arm/forearm donor or shoulder
view that produces the same silhouette with a normal elbow. Any temporary
reverse-projection permission should name actor, joint and phase, reset on all
exit paths, and never widen the range for every ordinary elbow. Similar
perspective exceptions need evidence; no blanket “submission mode.”

**Constrain IK before committing it.** Evaluate both branches against the allowed
bend direction and flex range; keep the previous valid branch through motion.
For unreachable clutch/grip targets, stop at the nearest valid configuration and
report the remaining gap. Move the target, torso, shoulder or stance to regain
contact; never hyperextend or overfold a joint to get a zero-gap score. In the
editor show the constrained reach envelope and mark an unreachable target.

**Budget sell amplitude in relative joint space.** Cap the knee-clutch fold before
scaling and preserve thigh/shin phase relationships. Bigger acting can come
from torso curl, a free-leg kick, head timing or a second action separated by a
pause, rather than folding one joint farther. Pilot the supine knee clutch and
head clutch before widening this to the whole library.

## First implementation slice / acceptance

1. Record a before/after pose strip for squat, dropkick tuck, knee-drop,
   figure-four, supine knee clutch and head clutch; include both facings and
   the planned roster-art benchmark. This audit's exact times/extrema are in JSON.
2. Resolve knee sign semantics and add normal-vs-explicit-projection joint policy.
   Prove a constrained grounded knee/head clutch, then upright and editor parity.
   Keep Derek's hammerlock untouched as the compatibility control.
3. Extend measurement to real executor motion, post-draw grips, procedural
   walk/run, interruption, clip→grounded→get-up transitions, and the four new
   rigs. Fit contacts around constrained poses; do not fix joints by breaking
   hand contact, soles or ring staging.
4. Acceptance: no unintended reverse bend or excessive fold, stable IK branch,
   no hard-limit chatter, no joint/sole pop, preserved segment lengths and
   grip residuals explicitly measured. Sample between keys and at large dt.
   Verify exception cleanup on completion/cancel/replacement/pin/pickup/shutdown.
5. Add behavior tests that measure final rendered flex and branch continuity,
   not merely that a clamp returns its configured constants. Keep the existing
   joint-ink coverage proof as a separate check: attached pieces can still bend
   unnaturally.

Validation for this documentation/diagnostic pass: Node 22, existing
`articulation`, `sells`, `referenceThrows`, `partVariants` suites **99/99 pass**.
That green result coexists with the measured issues above. No production
animation fixes or full certification are claimed.
