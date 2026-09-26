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
| 10 | **A headless torso.** The head is a separate part; the torso ends in a short neck stub | `art:map-candidate` — the torso's **neck pinch**; **HEAD BAKED INTO TORSO past 3%**. Every headless torso measured — shipped Lou, shipped George, the v4 control, `thesz-front3q-r1` — reads exactly 0.0%. The v5 draft reads 10.2%. Added 2026-09-25; see below. |

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

### Requirement 10, added 2026-09-25: the torso must be headless

**The v5 draft's torso has the head baked into it.** It is a full bust — head,
neck and shoulders in one painting. Shipped Lou, shipped George and the v4
diagnostic control all ship a headless torso ending in a short neck stub, and
the rig places `head.png` separately at the torso's own neck socket. Wired up as
eight parts, the v5 torso draws Lou's head **twice**.

It is unbindable as eight parts regardless of what Derek thinks of the build,
and it needs **re-generation rather than a repaint**: erasing the head from the
torso leaves a hole where the chest and shoulders were never drawn behind it.

**Everything else about the plate was sound**, with one claim I could not
reproduce. It cut to exactly 8 clean components in a 4x2 layout and all eight
MAP — both verified here. The part identities were said to have been confirmed
by measurement rather than by eye, "elbow width continuity 0.2% apart as
assigned against 23.6% swapped"; **that method was not recorded and I could not
reproduce those figures.** Measuring the mean silhouette width of the upper
arm's distal band against each forearm's proximal band, on the keyed parts, I
get 92.1px against 96.8px (near, 4.9% apart) and 84.5px (far, 8.6% apart) — so
the assignment is still the better fit on both sides, and the two forearms are
13.6% apart from each other, which is what makes them distinguishable at all.
The conclusion stands; the specific numbers should not be quoted until the
method behind them is written down.

**Why a tenth requirement rather than a tightening of an existing one.** None of
the nine catches this, and the reasons are worth stating because they are the
same reasons a human review missed it:

- **Requirement 9 passes.** `torso.png` is a real file landing in a real slot,
  so the delivery maps 8/8. The decomposition is correct; the *content* of one
  part is not.
- **The joint checks pass.** Every shoulder and hip is present and articulates.
- **A whole-character reference image looks right**, because a bust with a head
  on it is what a person looks like. The defect only exists once the part is a
  PART.

**The check.** Read the per-row ink width down the torso canvas. A headless
torso widens monotonically from its neck stub into its shoulders — above the
shoulders there is nothing but neck. A bust rises to a **head** maximum, narrows
at the **neck**, then widens into the shoulders. That local minimum between two
maxima is the pinch, and it cannot occur in a torso with no head on it:

| torso | neck pinch | head mass / shoulder width |
| --- | ---: | ---: |
| front3q v5 draft | **10.2%** | 42.9% |
| front3q v4 control | 0.0% | 9.6% |
| shipped Lou | 0.0% | 26.6% |
| shipped George | 0.0% | 11.7% |
| `thesz-front3q-r1` | 0.0% | 9.6% |

Every headless torso reads **exactly** zero, at every smoothing window from 3
rows to 21; the v5 bust reads 9.6–11.5% over the same range. The threshold is
3%, in the gap where nothing lives.

Two properties of the check worth knowing before trusting it. It is measured
from the **silhouette only and needs no landmarks**, deliberately — the value of
catching a baked-in head is catching it before anyone measures joints, derives a
config and wires a character around art that cannot be bound. And the search is
**bounded above the widest row**, because a real torso narrows toward the waist
by more than a neck does; searching the whole canvas for "somewhere the
silhouette gets narrower" would fail every torso ever drawn.

The real pinch is **shallow** — the v5 head rests on a thick collar, so the
silhouette goes 147px to 132px to 343px. A threshold picked against a
slender-necked example would sail straight past it, so the test fixture is built
to the v5 proportions rather than to an obvious caricature.

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
