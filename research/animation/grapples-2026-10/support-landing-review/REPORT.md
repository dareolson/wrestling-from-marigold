# Current move progress: George's planting and the atomic-drop landing

2026-11-03 · Codex · Review of 27f06ba, including the torso carry added at 8731cd0. Requested by Derek: George's feet must plant for the snapmare; the atomic drop resembles a kick between the legs and needs a more articulated landing.

## Main finding: the new knee keys are saturated

The current clips use negative local-knee values to fold the heel backward: -0.2, -0.6, -0.9, -1.4 and beyond. But src/rig/articulation.js still clamps local knees to [-0.10,2.55]. Skeleton passes these values through childAngleFromLocalFlex in both upright branches.

Fresh real-rig draw probe: holding all other channels constant and changing both knee requests among -0.1, -0.6, -0.9 and -1.4 produces **0 px difference in the drawn knee and ankle positions**, on Procreate Lou and george-roster-v1, both facings. See [knee-saturation.json](knee-saturation.json).

This is a control-contract failure, not an insufficient number of keyframes. The knee audit can reject hyperextension while still failing to establish that a requested deeper fold actually happens. Its pass does not prove that the heel tucks or the shin articulates.

**First task for Sonnet:** establish one functioning knee convention for these clips. Verify a small rendered range sweep with visibly distinct straight, moderate and deep folds. One bounded route is to author these tracks with the existing absolute-shin representation, converting the intended thigh-relative bend consistently and keeping one owner for the entire track. If the local convention is repaired instead, audit its other callers; do not globally flip the sign or widen a clamp and assume every move remains correct.

## What has progressed

The torso carry is a useful structural advance: the lifted receiver follows the lifter's body rather than an independent vertical lift track. Keep that mechanism. The shortened single-flip snapmare and relative limb layering also address earlier requests.

The next work is support and contact through release/impact. More lift height or a faster throw will not supply those relationships.

## George's snapmare: plant support, not just leg angles

The clip still moves the thrower from x=0 to 12/14 while changing his leg pose, with no foot-plant anchors. Existing floorContacts only supports the crown; merely listing a sole there is not an implemented foot-plant feature.

Fresh playback, Lou starts the drop and George reverses it, both facings, default 1.5x snapmare speed. Painted sole anchors were projected through the actual recorded shin-image quads, including mirroring:

| George's foot | Excursion from reach-end to landing | Largest single-frame displacement |
| --- | ---: | ---: |
| Near sole | about 85.1 px | about 15.2 px |
| Far sole | about 57.1 px | about 10.5 px |

These are raw game pixels, not normalized s=1 values. Near-foot travel includes a legitimate transfer toward kneeling; it should not all be called sliding. The far support sole nevertheless has no stable contact owner. See [support-summary.json](support-summary.json).

Author these support phases explicitly:

1. **Land and set:** the man reversing the lift regains the mat. Capture sole targets when the feet actually arrive, not while they are airborne.
2. **Pull:** keep the far support sole at its world-space target while the near knee lowers. The near foot is allowed to roll/lift as its knee takes weight.
3. **Throw:** support the body on the far sole and the near knee. Do not try to pin both soles throughout a kneel; that creates conflicting constraints.
4. **Rise:** retain the knee/sole contacts until the weight transfers back to the rising stance, then release or step deliberately.

Use the existing leg-IK mathematics or an explicit supported pose solver, with actual painted sole anchors. Let the pelvis adjust within the leg reach; freezing the root alone is not a plant. Resolve support before the carry and arm grips, and make sure later redraws retain the solved pose. Measure far-sole drift only during its declared plant, near-knee height at contact, foot release timing, and the transition out. Target roughly 1–2 px contact stability at s=1; keep the project's 2.5 px/frame gate as an upper bound rather than the goal.

## Atomic drop: why it resembles a kick

At impact the attacker's near thigh swings to lLeg=1.4 while lKnee=-0.9 is clamped to -0.1. The thigh rises almost horizontally but the shin receives almost no requested fold. That is a largely extended leg moving toward the receiver's crotch.

At the same time, the torso carry fades out during [T,T+0.10], and the impact is T+0.12. The receiver returns to independent pose/x/lift keys; there is no landing contact linking his seat to the knee. Both the rising leg and the descending receiver keep changing through the same short beat.

### Rebuild the landing in this order

1. **Make the knee a platform.** Correct the knee control first. Chamber the near thigh, with the shin hanging down and the heel beneath/behind the knee. Establish that shape before the receiver reaches it. The supporting leg stays planted.
2. **Continue the carried body's arc.** Capture the receiver's actual release pose from the carry. Guide the pelvis forward and down toward the knee through a continuous path; do not cut back to an unrelated lift value. Use the painted seat/tailbone contact offset, not just a hip midpoint blindly snapped onto the knee.
3. **Show weight arriving.** The pelvis contacts the platform while the receiver's shoulders lag and his hips/torso compress. The lifter gives slightly through the supporting stance. Retain contact for a short 2–3-frame beat to review, rather than letting the knee sweep through him.
4. **Separate the recoil.** Only after that contact does the receiver arch/pop forward, bring his hand to his backside, and catch his weight with a step. Use distinct impact, compression, recoil and recovery poses. Keep the 0.60 s damage marker aligned with the actual first contact.

This preserves the fridge-lift/carry work and changes what happens when that weight comes down. The key silhouette is a man deposited on a bent knee, not two independently animated bodies crossing.

## Small proof before another full packet

For each move, make one Lou/George loop in both facings, normal speed, before expanding:
- George's snapmare with the planted sole and knee targets marked.
- The atomic drop from the hitch through impact, compression and first recovery step, with the seat/knee contact marked.

Compare a few held pictures at actual grayscale game size. List contact misses, support drift and raw D12 overlap beside them. Planting and landing contact do not waive the existing overlap requirement.

Do not regenerate art, retune speed, promote flags, or move on to extra move variants to solve this pass.

## Evidence and scope

The review used current source, r4 frames around the drop, and fresh stepped browser playback. The new read-only probe is tools/debug/throw_support_review.mjs; knee-saturation.json and support-summary.json are its results. Original ankle diagnostics remain labeled separately from actual painted soles.

No gameplay code, character art, plan approval or feature promotion changed in this review. No commits or pushes.
