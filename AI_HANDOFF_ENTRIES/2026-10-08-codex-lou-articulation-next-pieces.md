# 2026-10-08 — Lou articulation: current direction and first donors

## Derek's direction

Derek is mainly happy with the current Lou. Preserve that character's visual
direction; a Procreate finishing pass may follow. Start additional pieces that
improve articulation during moves.

## Current implementation, checked in files

- `src/characters/thesz_procreate_v1.js` is the current opt-in Lou candidate,
  selected with `?p1=thesz-procreate-v1&p2=george`. Shipped `thesz` remains the
  default. Derek's acceptance of the direction is not a default promotion.
- Six runtime paintings: head, torso/trunks, upper arm, forearm/fist, thigh,
  shin/boot. Both arms share the upper-arm and forearm paintings; both legs
  share the thigh and shin paintings. The source PSD also preserves far-side
  donor layers.
- Current config has per-character bone lengths, hip sockets, its own idle,
  `shinUnderThigh: true`, and `heightScale: 0.7907`. These are observed values,
  not independently certified measurements.
- The Oct 7 integration report was followed by an explicit audit/repair brief.
  Current code contains subsequent Oct 8 corrections. Do not treat earlier
  screenshots, scale claims, or mechanical passes as proof of today's appearance.
- `CHARACTER_PART_INVENTORY.md` predates this candidate. Its statements that no
  replacement body is accepted and only a provisional head exists are historical.
- `Skeleton.js` supports separate near/far hands; `partVariants.js` maps
  `workingHand` across facings. Hammerlock requests `grip` during the hold and
  falls back to base art for characters without the hand family.

## First generation: hands

**Correction after Derek's follow-up:** The Oct 6 independent audit explicitly
revised Priority 0 to a whole `forearm.grip` replacement, preserving the baked
forearm/hand contract. I missed that revision when proposing separate hands.
The generated sheet is unmeasured exploratory donor material only. Separate
hands are an optional later experiment, not the current implementation plan.
The immediate targets are a far forearm with an inward/palm-facing hand and a
whole forearm/grip variant for hammerlock. Match the current forearm's canvas,
elbow pivot, bone axis, rendered scale and limb length; measure these before
binding. A reversed back-of-hand painting does not supply a palm view.

Generate a non-destructive donor sheet using the current forearm painting and
the source master composite as visual references: near/far closed fist, open
reach, and grip. Match outline weight, skin/shadow palette, anatomy and view.
Keep wrists at the top and hands pointing downward for neutral-axis authoring.
This sheet is donor art, not normalized or runtime-ready. An image generator
cannot guarantee identical wrist anchors just because the prompt requests them.

Superseded separate-hand experiment (retain for context, not the next task):

1. Review the six silhouettes, particularly far-side thumb/finger orientation.
2. Split the existing forearm/fist at the actual anatomical wrist, preserving
   the approved combined limb length and appearance. Keep painted overlap at
   the wrist; do not append a hand to the existing baked fist.
3. Normalize hands onto a common canvas and exact wrist anchor. Give grip its
   measured contact point. Preserve elbow geometry on the handless forearm.
4. Bind in a sibling articulation candidate first. Prove neutral/jab fist,
   reaching open hand, and hammerlock grip at game scale in both facings.
5. Verify release, interruption and cancellation restore the base hand.

## Following pieces

Only add elbow/shoulder or hip/knee replacement paintings when a named move
frame shows the rotated base part fails. Separate boots come after hands unless
a specific foot pose becomes the immediate blocker. True torso twists need
changing sockets/view support; a paint swap alone cannot establish that geometry.

No runtime code or current Lou asset was changed during this familiarization.
No new runtime tests were run: the deliverables are a brief and generated donors.

## PSD-grounded follow-up

At Derek's instruction, extracted `R Lower Arm` and `L Arm` directly from the
unchanged PSD, independently measured the near elbow overlap, and saved the exact
current runtime forearm as the geometry template. Generated whole palm/grip
forearm donors, plus palm correction trials. Art and fit measurements are in
`Sprite sheets/AI Pilot/Lou/articulation-donors/2026-10-08-forearm-variants-v1/`.
The first palm/grip outputs drifted 15–19 base-equivalent pixels on the upper
forearm despite preserve-geometry instructions. They are donors, not swappable
parts. A strict single-reference palm retry is also measured there. Preserve the
template's upper forearm during normalization; do not treat matching aspect ratio
or inherited anchors as proof of unchanged anatomy. No runtime integration done.
