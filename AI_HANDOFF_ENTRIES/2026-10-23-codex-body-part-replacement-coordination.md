# Body-part replacements: shared art and animation work brief

2026-10-23 · Codex · Derek's new direction, addressed to Claude

Derek suggests coordinating body-part replacements, including better bent
elbows, and using unconventional solutions where ordinary parts cannot carry
the move. Treat this as authorization to develop and compare small candidate
solutions. The earlier phrase "no whole-arm replacement justified yet" is a
review finding, not a prohibition on trying one. We can investigate art and
choreography together; we do not have to exhaust every numerical tweak first.
No new images or runtime changes are included in this entry.

## What we are working on

The immediate performance pilot is **the receiver after a suplex**: impact,
settle, back protection, supported rise and guarded standing recovery. Grounded
head/arm/knee clutches also exposed elbow silhouette and reach problems while
we tested the shared selling system. They are reusable diagnostic poses, not
evidence that all those holds are the active production assignment.

Hammerlock is a useful existing bent-arm/grip comparison, but preserve Derek's
authored move and work on a separate candidate if auditioning changes. Figure
four remains parked; this instruction does not resume it. No blanket roster
redesign is requested.

## Proposed first comparison: one character, one arm, three treatments

Use Procreate Lou, whose geometry and existing grip donors are already known.
Once a treatment works, adapt it to George's own art and proportions. Do not
scale Lou's forearm onto George as a shortcut. Claude should choose and record
the exact sell phase and side before commissioning an asset; the source rig
must be the rig shown in the proof.

| Treatment | What changes | Why try it | Renderer status |
| --- | --- | --- | --- |
| A: two articulated pieces with flex paint | A matched upper arm and forearm donor: compressed biceps, elbow crease, clean outside elbow, no inked cut line | Retains moving elbow/wrist and gives a real folded-arm silhouette | Existing per-part variant swaps can carry registered art; coordinated selection still needs authoring |
| B: localized elbow skin patch | Small painted joint patch bridges the crease while both bones still move | Repairs the cutout seam without replacing a whole arm | Proposed extension: elbow-local attachment, rotation and depth; no arbitrary elbow-overlay slot exists today |
| C: one pre-bent arm drawing | Shoulder-to-hand painting replaces the visible arm during a short held pose | Gives the artist control of forearm overlap, foreshortening and muscle compression | Proposed extension: composite-arm visibility, binding and transition rules; ordinary forearm swaps do not provide this |

Begin with A. If the defining shape needs C, use C: a brief authored drawing is
a valid animation technique. Compare B only if the defect is confined to the
joint seam. This is a three-option design, not a requirement to build all three.

## Exact first asset request Claude should return

For treatment A, provide two or three reference poses from the actual renderer:
moderate bend around 60–90 degrees, tight bend around 120–145 degrees, and the
chosen working pose. Those ranges are art samples, not new runtime joint limits.
Record measured joint flex rather than relying on a misleading torso-front score.

- Character/rig, anatomical arm, near/far render side, facing and actual view.
- Named suplex-aftermath/clutch phase and timestamp; elbow/wrist coordinates,
  contact target, floor line and over/under order on an annotated reference.
- Base upper-arm and forearm PNGs, hashes, full source canvases and actual
  registration settings. Keep dimensions, bone spans and original files fixed.
- Matched pose paint: biceps compression at the inside bend; a clear outside
  elbow; forearm crossing in front/behind as the pose requires; no round peg,
  dark joint ring or doubled outline. Preserve Lou's lanky proportions.
- Choose the hand from its function: cupped for clutching, palm for supporting
  weight, fist only where intended. A closed fist placed near a knee does not
  depict a grasp.
- Preserve enough hidden paint under overlaps. The registration layer carries
  labels; exported art is transparent, unlabelled and free of guide marks.

Lou forearm's normalized output stays **117×351 RGBA**, box `23.003×69.008`,
`jointPivotFrac=.116194`, `pivotOffsetFrac=-.012388`. Use the base upper-arm
PNG's own dimensions and source metadata, not the forearm's. The earlier
`.487612` source-u value was corrected in the performance brief; use actual
settings and measure the final assembly. Near and far paintings may differ.

Suggested donor-edit wording, with the source and chosen pose attached:

> Repaint this wrestler's supplied upper arm and forearm as a matched flexed
> pair for the attached pose. Preserve his likeness, limb length, slim athletic
> proportions, view, ink style and shading. Show compressed flesh at the inner
> elbow, a natural outer elbow and the forearm's intended overlap. Keep the
> attachment regions and supplied geometry guides aligned; leave hidden overlap
> paint continuous, with no outlined cut edge. Use a cupped hand for the shown
> contact. Export isolated transparent parts without labels or scenery.

Generation makes donors, not guaranteed anchor-perfect outputs. Normalize and
compare on the rig. Audition the existing `forearm_grip.png` and October 8 donor
files first, and retain every candidate separately from the base.

## When a whole bent arm is the right tool

A bent painting contains **three** relevant landmarks: shoulder, elbow and
wrist, plus the hand's contact patch. One rigid transform cannot independently
fit all three to arbitrary animated joints. Claude must pick a specific held
pose family and fit the skeleton to that approved pose, or use controlled
deformation with demonstrated limits. Do not stretch it freely or score only
the shoulder while the hand floats away.

For C, use a new full-arm canvas with explicit measured shoulder/elbow/wrist
landmarks, not a bent arm squeezed into the current forearm canvas. Hide the
covered upper arm/forearm/hand to avoid duplicate limbs; restore them on exit,
cancel and interruption. Keep logical joints for contact and diagnostics.
Switch at matched poses or behind a justified occlusion. A crossfade can hide
neither a wrong joint nor a doubled silhouette automatically.

Foreshortened arms, a combined thigh-and-calf for a tightly folded knee,
compressed/arched torso variants, short pose-specific body drawings and local
occlusion masks are also valid candidates. They need named use cases and
explicit bindings/visibility. Torso variants that move sockets need variant
socket data; a paint-only swap does not relocate shoulders or hips. A mask can
clarify an overlap but cannot create a missing contact.

## Integration and review contract

The existing clip `parts` and `Skeleton.setPartVariants` are useful seams.
Grounded sells currently do not return/select these artwork variants; add one
clear appearance owner for sell/rise and reset it on completion, roll, pickup,
pin, move takeover, cancel and reset. Do not let an independent artwork loop
overwrite an active move's selections. A missing donor must fall back to base.

Use authored phase/angle bands with deliberate transitions. For angle-based
selection, sample both entering and leaving the band to catch visible popping;
do not flicker near the threshold or add hidden frame-history dependencies to
seekable clips. Replacement paint must not silently change collision, damage,
input locks or down timing.

Acceptance: same-scale A/B at normal speed, close-up of the elbow/contact,
both facings, meaningful near/far views, intermediate frames, and interrupted
exit. Check silhouette, limb count, hand contact, joint alignment, floor/support
and pain acting separately. Smoothness alone cannot approve anatomy. Derek
judges the visual result before promotion.

## Coordination loop

1. Claude replies here with the named pose, side, reference crops, proposed A/B/C
   choice and exact asset request. This can be a low-cost existing-donor audition.
2. Codex checks binding, contact and switching requirements, and sharpens the
   generation/edit packet. Record unresolved tradeoffs instead of claiming agreement.
3. Produce the smallest donor set, normalize it and put it into one candidate
   move path. Compare with the current art; preserve failures as evidence.
4. Show Derek the comparison and expand to another character or move only when
   the first treatment earns it.

This is a shared repository message for Claude's next session, not a live reply
or a claim that the new artwork/runtime support already exists.
