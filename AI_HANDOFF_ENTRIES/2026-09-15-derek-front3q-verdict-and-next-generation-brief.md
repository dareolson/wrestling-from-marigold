# 2026-09-15 — Derek: front3q verdict, and the brief for the next generation

**Start here before generating any more Lou limb art.**

## The verdict

**Accept the engineering work. Reject this art as the production candidate.**

The instrumentation and the reversible comparison character are valuable and are
kept. `production-front3q-modular/v4-straightened` is **not** the production
candidate and will not be tuned or repainted further. It is retained as the
**diagnostic control**: it proved the pipeline end to end and it is what exposed
the requirements below.

Derek's answers to the four open questions:

1. **It only partially looks like Lou.** The face carries identity; the body is
   noticeably too lean and too tall.
2. **The profile head on a three-quarter body is acceptable for testing, not for
   final approval.**
3. **The next candidate should be broader and more compact**, closer to the
   Pass-A reference.
4. **Start from a revised generation prompt rather than repainting this
   candidate.** With 15 of 16 joint-facings failing, pale caps at every joint, a
   notched arm, proportion drift and no three-quarter head, this is more than a
   paint cleanup.

## Derek's correction to the previous report

**The hip-span disagreement is NOT in this brief.** The 8.2% torso-to-pelvis
hip-span disagreement and the unregistered `pelvis_overlay` belong to pelvis
layers the shipped legacy rig does not use. While the production track stays on
that rig, they are not art requirements and must not be carried into the
generation prompt. (The previous evidence README listed them alongside defects
that do need new artwork; that was misleading and is corrected.)

## What the next generation must satisfy

Derek's nine requirements. Where a check exists it is named, because a
requirement that can be measured and is not is one the next generation will miss
the way this one did — the bent arms went unnoticed until they were wired into
the running game.

| # | requirement | how it is checked |
| --- | --- | --- |
| 1 | A broader, stockier Lou silhouette | `art:proofs --compare` against the Pass-A master at 265/209/154, plus Derek's eye. The candidate must not read leaner than the master beside it. |
| 2 | A true three-quarter head matching the body | Removes the `crossViewPartReuse` entry for `head`/`front3q`. Until the art exists that entry stays and the borrow stays declared. |
| 3 | Limb paintings on neutral, straight bone axes — no baked elbow or knee flex | `art:map-candidate --landmarks` reports the bone axis per part; **BAKED BENT past 3 degrees**. v3's arms measured 13.4–19.6. The axis comes from the declared distal anchor where one exists, the declared ankle for shins, and only then from the distal ink — see the correction below for why the ink is wrong for a booted shin. |
| 4 | Generous unoutlined overlap material on both sides of every elbow and knee | `art:measure-joints` — `interior_bg_px` at articulation extremes. |
| 5 | Rounded anatomical joint transitions, no pale caps or flat attachment faces | `art:measure-joints` — `sharpest_deg` ≥ 35 and `straight_run_px` ≤ 18, plus the assembled proof at full resolution, where the pale caps are plainly visible. |
| 6 | Clean near/far perspective differences | Visual, on the assembled proof. |
| 7 | **No baked trunks material on limb pieces** | `art:map-candidate` — dark fraction of the part's top rows; **TRUNKS BAKED ON past 20%**. The six-part board measured 52–74%; front3q v3 measured 3–5% and passes. |
| 8 | No pelvis layers unless the shipped track will actually use it | `art:map-candidate`. Shipped Lou keeps his trunks in the torso, so on this track the answer is none. |
| 9 | The same modular decomposition the existing rig can consume | `art:map-candidate` must report every delivered part MAPPED. |

### Requirement 9, concretely: author EIGHT parts, not twelve

This is the specification the last two generations both missed, in different
ways. The shipped rig can consume exactly these, and no others:

```
head.png          torso.png          (torso carries the trunks)
upper_arm.png     ONE painting, drawn for BOTH arms
thigh.png         ONE painting, drawn for BOTH legs
near_forearm.png  far_forearm.png    (separately authored; the rig keeps these apart)
near_shin.png     far_shin.png       (separately authored; the rig keeps these apart)
```

Shipped Lou paints the upper arm and the thigh **once** and places each twice
with its own offsets, tilt and scale. Separately authoring a near and a far
upper arm or thigh is wasted work: `Skeleton.js` assigns both arms from
`textures.upperArm` with no near/far opt-in, and `BASE_PART_FILES` has no
filename for a split thigh. front3q v3 delivered twelve parts and four were
discarded.

Delivering a **whole** far arm or far leg is worse than wasted — it is
unusable. The rig articulates the far elbow and far knee independently, and no
offset bends a single painting in the middle. That is what the six-part
`production-limb-redesign/v1` board did, and it maps only 2 of its 6 parts.

### Correction (2026-09-22): the control does NOT fail requirement 3

This section previously said `far_shin` measured a 5.2-degree bake and that the
control still failed the neutral-bake requirement. **That was my measurement
error, not a defect in the art.**

The check fell back to averaging the distal ink for any part with no declared
distal anchor. For a shin that ink is the BOOT, whose toe juts well forward, so
a perfectly straight shin reads as bent. Measured on the declared ankle instead:

| part | knee->ankle (the bone) | knee->boot mass | knee->sole |
| --- | ---: | ---: | ---: |
| near_shin | -1.6 | 2.4 | 7.1 |
| far_shin | **0.0** | 5.2 | 10.3 |

`far_shin` is the straightest segment in the entire candidate. The check now
prefers the declared ankle for shins and only falls back to the ink for the
forearms, which declare no distal anchor and whose fist does sit roughly on the
bone axis. All eight of the control's parts now read neutral.

The requirement itself stands unchanged, and v3's four bent arms are still
correctly flagged at 9.3-18.3 degrees.

## Before binding the next generation to the rig

Read **`RIG_AND_MOVE_PIPELINE.md`, "Binding art to the rig"**. It holds the two
pieces of arithmetic this session got wrong, both of which apply to any
character and neither of which is visible from the config:

- `box.w` and `box.h` are both scaled by `growth = 1/(1-jointPivotFrac)`.
  Matching a limb's on-screen width to another character's means solving that
  whole expression on both sides; dividing by the fill fraction alone leaves the
  art too wide by exactly `growth`.
- Measure a bone on its declared joints. The distal-ink fallback is wrong for a
  booted shin, whose toe makes a straight leg read as bent.

It also states the eight-part decomposition in requirement 9 below, from the
runtime rather than from a document.

## What is preserved

- `npm run art:measure-joints`, `art:proofs`, `art:map-candidate`,
  `art:straighten-limbs`.
- `thesz-front3q-r1`, the removable comparison character, and
  `tools/debug/front3q_candidate_comparison.mjs`.
- `FRONT3Q_CANDIDATE_EVIDENCE/` as the record of what was measured.
- `production-front3q-modular/v4-straightened` as the frozen diagnostic control.

## What is NOT wanted

- Further tuning or repainting of v4-straightened.
- A rig-tuner pass on `thesz-front3q-r1`'s zeroed offsets. That work only makes
  sense on art that is going to ship, and this art is not.
- Hip-span or pelvis-registration work, per Derek's correction above.
- Repointing `validate_joints.py` at anything. Still broken, still untracked.

## Verification at the point of the verdict

- `npm test` — 506/506 on Node 22.23.1, 0 skipped, real-art tests RAN
  (505/505 at the time of the verdict; one test added by the 2026-09-22
  correction above).
- `npm run build` — clean.
- `npm run rig:validate` — clean for george, thesz, thesz-front3q-r1.
- `npm run rig:certify` — **exit 0, no architecture-class findings.** `refrig`
  CERTIFIED as the control, so the run is trustworthy. george and thesz report
  UNVERIFIED on unmeasurable chains (legacy art declares no binding anchors),
  which is the pre-existing state and unchanged by this work.
  `thesz-front3q-r1` is not in `certify.mjs`'s character list and was not
  certified; it is a rejected review candidate, so it should not be added.
- Production Lou's art, config and Derek's locked forearm offsets are unchanged.
  No canonical-v2 runtime prerequisite is activated; all seven stay `pending`.
