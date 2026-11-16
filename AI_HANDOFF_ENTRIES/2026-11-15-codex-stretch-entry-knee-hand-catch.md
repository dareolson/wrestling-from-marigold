# Stretch: arm entry, knee seam and instinctive hand catch

Continues the outside-hook revision in `/Users/home/Documents/wfm-stage12`, `moves/stage12`. Work remains uncommitted; no merge or push. Preview: http://127.0.0.1:5233/tools/mat-preview/?move=abdominalStretch&att=kowalski-roster-v1&def=thesz-procreate-v1

Derek reported an arm lingering through the torso while passing behind, clarified that the hooked misalignment was at the thigh/calf knee seam, then requested the victim catch the shove with his hands.

- Entry: the attacker's near arm stays behind the victim until .72s; the calf stays behind until .64s, after swinging outward. Added a temporary outer-shoulder grip (.43–.72s), transitioning to neck control (.6–.84s), so the controlling hand approaches around the shoulder instead of emerging through the chest. Existing hold and shove timing remain.
- Knee seam: `legContacts[].kneeOverlap:3` tucks the rigid calf/boot artwork three scaled rig pixels toward the thigh, blended with contact weight. Painted sole/foot anchors follow that art offset. The physical leg solve, lengths, and knee/ankle contact joints stay unchanged. Only this stretch declares the extra overlap. Upper thigh remains behind the victim; calf remains in front. Tried cap overlays but removed them entirely: no extra sprites, mask filters, frame crops or generated art remain.
- Fall: two self-targeted `Floor` hand grips reach down from 3.7s, plant by 3.85s, hold through 4s, and release by 4.22s. Targets capture once at contact, so the palms stay put while the body falls and elbows buckle. Wrist targets are seven scaled pixels above the floor to accommodate the baked hand artwork. Near/far mapping works for both rig channel conventions and facings. The existing mat impact remains at 4s, with no added damage, and the receiver finishes prone.

`AnimationClip` validates the Floor self-target/ahead value and painted knee-overlap range. `MoveRuntime._applyGrips` supplies fixed world floor points through the existing arm solver; only grips declaring Floor use the new path. `Skeleton.reachLeg` applies the optional art tuck without scaling the images or modifying the other moves' zero-offset behavior.

Validation: 57 focused tests pass, including transition depth timing and stable two-hand plants in both facings/channel mappings. Build and whitespace checks pass. Full test-directory suite: 1380 pass, 4 skip, same five existing art/fixture failures. Real executor runs with Kowalski attacking each of the four receiver rigs in both facings: eight finish standing/down-prone, no invalid joints or browser errors. At 3.95s, both wrist contacts reach their planted targets within floating-point tolerance. Visual checks include entry frames and enlarged hook views on all four attackers.

Evidence/scripts: `research/animation/stretch-entry-smoothing-2026-11-15/`. In runtime logs, the leg-contact error at fall samples is the last release sample retained after the hook ended; it is not a current hand-contact error. No broad roster art changes. Wristlock pain detail is still pending.

Changed this pass: `src/animation/clips/matMoves.js`, `src/animation/MoveRuntime.js`, `src/animation/AnimationClip.js`, `src/Skeleton.js`, `tests/legContacts.test.js`, `tests/clipLayers.test.js`. Preserve prior authorized move work.
