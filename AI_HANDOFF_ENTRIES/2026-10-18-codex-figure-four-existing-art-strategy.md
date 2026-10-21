# George's figure-four: improve the hold before ordering replacement parts

2026-10-18 · Codex · requested by Derek after reviewing the current figure-four.
Documentation and preserved review evidence only; no move or runtime edits.

## Direction

Use the current limbs to establish one readable, mechanically coherent locked
hold first. Then build purchase, threading, pressure and release around it.
Decide replacement art from the remaining specific silhouette failures.
This makes the earlier [entanglement assignment](2026-10-15-codex-entanglement-and-deep-move-review.md)
concrete; it does not supersede it or claim its renderer work already exists.
Also follow the [joint direction/limiter audit](2026-10-18-codex-joint-direction-and-limit-audit.md):
do not force knees backward or stretch limbs to satisfy contact targets.

## What was actually inspected

Nine sampled poses from `tools/move-editor/drafts/figurefour.json`, original
George attacking Procreate Lou: 0, .6, .95, 1.3, 1.6, 2.1, 2.6, 3.4, 3.75 s.
[Pose sheet](../research/animation/figure-four-review-2026-10-18/baseline-poses.png)
and [sampled joints/outlines](../research/animation/figure-four-review-2026-10-18/baseline-samples.json)
are preserved. The source is the existing draft/clip from
`tools/move-editor/author_figurefour.mjs`; the current working tree has unrelated
roster/story changes. This is an editor pose review, not executor film, a new
roster-rig review, or validation of live floor placement/contact.

In the samples the entry hands are extended without readable ankle purchase;
the locked pose reads as several raised overlapping legs; a clearly trapped
ankle and distinct straight/bent receiver legs are difficult to identify.
The pressure beats mainly raise/lower the receiver's arms and upper body.
These are reasons to improve the arrangement before treating the problem as
missing paint. No new replacement family is approved by this review.

## 1. Block the locked tableau, independently of the entry

Start a separate comparison draft at the locked beat (~1.6 s), preserving the
live version for comparison. Temporarily remove rocking and free-arm acting.
Use existing reference sheets; check actual figure-four mechanics against a
suitable visual reference before finalizing anatomical roles. The plan below
is a blocking checklist, not a new authoritative anatomical reference.

Name four leg roles explicitly: receiver straight leg, receiver bent/crossing
leg, George's trapping leg and George's bracing leg. Preserve those identities
through facing changes; near/far are render slots, not anatomical identities.
Color-coded skeleton/debug labels can help authoring, but judge the final
silhouette with all overlays hidden.

Place pelvises first, then the thighs, then calves/boots. Adjust the actors'
separation and small ring-depth offset so the crossing is visible. Lower or
separate the current cluster of raised knees/boots as the chosen reference
requires. Keep the receiver's straight leg visibly distinct from the folded
one. Identify the contact that traps the bent leg's ankle across the other leg
and the contact by which George closes that trap; inspect both knees' directions.

Use hip rotation and knee flex within plausible ranges. Preserve bone lengths,
joint attachment and body proportions. If a foot cannot reach the required
contact, move the pelvis/stance or revise the tableau rather than forcing it.
If a clear still cannot be achieved with current art and valid joints, stop and
record the exact obstructing segment: that is already useful donor evidence.

## 2. Prove contacts and over/under order

Record named contact points/windows for the locked ankle/calf/knee surfaces,
George's trap/brace and any hand purchase. Specify allowed sliding and pressure
motion instead of welding every joint. Check painted contact surfaces as well
as joint coordinates; the end of the current shin/boot is not an independent
articulated foot. Existing runtime arm-grip IK does not solve a leg entanglement.

The hold needs cross-actor **part** order. List the required over/under
relationships at each crossing and use the smallest clip-scoped renderer
extension from the earlier brief. Whole-wrestler depth changes and current
per-rig far-leg/torso flags cannot encode arbitrary leg interleaving. Keep a
stable, non-contradictory order and preserve joint-cap coverage. Switch order at
an authored crossing, rather than sorting limbs by screen position every frame.

If the same painted segment must be in front at one crossing and behind at
another, one depth value cannot do it. First change the tableau to expose the
crossing. If still necessary, document a small render split/mask or a replacement
piece for that exact crossing; avoid expanding into a general renderer rewrite.

**Checkpoint:** one still should let Derek point to the straight leg, folded
leg, trapped ankle, trapping leg and George's support without explanatory arrows.
Compare both facings at gameplay size. Do not animate a confusing lock.

## 3. Animate into the solved hold

Work backward from the lock and author distinct beats:

1. George acquires the ankle/lower leg with a visible hand connection.
2. He lifts/positions it while his support foot stays on the mat.
3. He steps and turns through the gap; the trapped leg follows the purchase.
4. He arranges the crossed leg and closes the trapping leg.
5. He lowers himself into the brace, keeping the connection intact.

Acknowledge limb length and reach throughout the turn. Avoid feet teleporting
through one another or hips sliding merely to preserve a solved wrist.
Use working `bend` for the crouch/reach where appropriate: the current entry's
`lean` intent is inactive. Coordinate hip lowering and support-foot placement;
adding explicit knee flex alone can lift the boots off the mat.

Reuse useful current timings and reference poses, but re-time phases if needed
for readability in the comparison. Do not silently move the three live squeeze
markers (2.0, 2.6, 3.2 s), damage, eligibility or vulnerability windows. Review any
necessary gameplay timing change explicitly after seeing the comparison.

## 4. Make pressure visible through the trap

Keep the trapped contact while George braces and makes a small purposeful hip/
torso effort. The receiver reacts a fraction later: turns or curls toward the
hurt knee, reaches with one hand, then drops back into a quieter strained pause.
Keep the other leg's motion consistent with being controlled. Avoid symmetric
arm pumping and a cluster of four boots bouncing independently.

Give each squeeze a readable build, effort and relief. Small displacement against
a stable brace can look stronger than large leg swings. Keep submission foley
silent; judge the picture muted. Hurt heads can add expression later, after the
pressure and resistance already read through the bodies.

## 5. Show release, then the consequence

George visibly opens the trap, withdraws the crossing leg and lets the receiver's
leg clear before sitting up or standing. Author the layer changes and release
windows along with those crossings. The receiver can clutch the knee and make
an uneasy recovery using the shared selling work; verify the submission release
actually tags/starts that aftermath rather than assuming registry metadata does.
Preserve existing down time for the first comparison. Do not force a snap to a
flat pose just to start the sell; prove the clip/grounded/get-up handoffs.

## 6. Decide art from the comparison

Deliver the best existing-art still and entry/hold/release strip next to the
baseline. For each remaining failure, mark the exact role, time, limb, desired
view and joint anchors. Likely donors are the receiver's turned crossing thigh/
calf and George's trapping calf/boot, but they remain hypotheses until this pass.
A half-reclined torso or bracing hand is lower priority if the existing rig can
already communicate support. No whole-body regeneration is implied.

## Verification / next-session acceptance

- Real executor film at normal and slow speed, both facings and role orders;
  original George/Procreate Lou as the baseline, then the selected roster rigs
  through a supported runtime path. Editor currently offers only the older rigs.
- Check support, anatomical knee direction, continuous trapped contacts and
  crossings between keys, center and near both ropes. Record contact residuals;
  no forced hyperextension to get a zero gap.
- Test cancel during purchase/threading/lock/release, replacement, pin/pickup
  where legal and shutdown: no stale cross-actor depth, grip, pose or actor lock.
- Check the second after release and the full get-up; no handoff pop, instant
  disappearance of pain or unexplained recovery to neutral.
- Run relevant tests/build and participation proof when implementing. A logged
  figure-four event, valid export or clean ink joins alone does not certify a
  mechanically readable hold.

This handoff update adds strategy and preserves already captured evidence; no
new runtime behavior or tests were introduced, so no runtime test rerun is
claimed for this documentation-only change.
