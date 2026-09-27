# Prompt for Codex — Lou Thesz front3q modular master

We are creating production-ready modular character art for Lou Thesz. Treat this
as a fresh task. Supplied candidates are references only and are not approved.

Use the canonical clean-shaven Lou reference
`Sprite sheets/AI Pilot/Lou/v2-layer-standardization/references/lou-canonical-chroma-v1.png`
as the authority for identity, build, costume, proportions, and style. It is the
file named as approved in the sibling REPORT.md — do not substitute another Lou
image. Lou must remain lean, athletic, and period-accurate: not thick, broad, or
bodybuilder-like. Absolutely no moustache, beard, stubble, or other facial hair.
A moustached Lou reference exists in this repo and is quarantined; if the face
you produce has facial hair, you have used the wrong source.

Create a complete front-three-quarter (`front3q`) layered master designed for
articulation.

## Correction to the part decomposition — read this first

An earlier version of this brief asked for the far arm as one continuous piece
from shoulder through hand, and the far leg as one continuous piece from hip
through boot. **That art cannot be animated by the shipped rig.** Verified in
code, not assumed:

- `RENDER_PART_SLOTS` (`src/rig/partVariants.js:18-24`) has no whole-limb slot.
  The far side is `farUpperArm` + `farForearm` + `farHand` and `farThigh` +
  `farShin` + `farBoot`.
- `Skeleton.js:1556-1565` attaches `farForearm` at the far elbow with its own
  angle and `RIG.ELBOW_OVERLAP`. `Skeleton.js:1461-1470` does the same for
  `farShin` at the far knee. **The far arm and far leg bend independently at
  runtime.**

A continuous far limb would have to be re-split at the elbow and knee after
generation, and that re-split is precisely the failure that blocked
`v1-golden-master`: cutting a limb that was drawn continuous leaves the occluded
socket pixels unpainted, because they were never drawn. See
`v1-golden-master/REPORT.md`, RESCUE VERDICT.

So: **every limb segment the rig rotates is authored as its own piece with its
own painted proximal socket.** Both sides split, not just the near side. Every
elbow and knee bends independently. No rigid one-piece limbs anywhere.

## The part set

Author each part separately, each on its own transparent canvas, baked facing
RIGHT, neutral straight-limb pose. Filenames follow the loader's convention in
`BASE_PART_FILES` (`src/rig/partVariants.js:1-16`).

| Part | File | Notes |
|---|---|---|
| head (+ full neck) | `head.png` | neck is NOT in the torso; the head carries its own neck cylinder |
| torso (+ trunks) | `torso.png` | see hidden anatomy below |
| pelvis overlay | `pelvis_overlay.png` | same box as torso; drawn OVER the thigh tops to hide the hip seam |
| pelvis underlay | `pelvis_underlay.png` | same box as torso; drawn UNDER the thigh tops |
| near upper arm | `near_upper_arm.png` | see loader note below |
| far upper arm | `far_upper_arm.png` | see loader note below |
| near forearm (+ complete hand) | `near_forearm.png` | |
| far forearm (+ complete hand) | `far_forearm.png` | |
| near thigh | `near_thigh.png` | |
| far thigh | `far_thigh.png` | |
| near shin (+ complete boot) | `near_shin.png` | |
| far shin (+ complete boot) | `far_shin.png` | |

**Near and far pieces are separately authored for their front3q depth and
perspective. Do not mirror one side and reuse it, and do not author one shared
piece for both sides.** In a three-quarter view the near and far limbs are at
different distances and different angles to camera; a mirrored piece reads as
wrong at exactly the moment the limb moves. Near-side parts must additionally
remain detachable and swappable.

**Loader note, and it affects only the upper arms.** The rig already supports
separately authored near/far art for thigh, shin, forearm, hand and boot via an
established opt-in fallback (`textures.farThigh ?? textures.thigh`, and so on —
`Skeleton.js:335-350`). The upper arm is the one exception: `Skeleton.js:355` and
`Skeleton.js:373` both read `textures.upperArm` directly, with no near/far
fallback, so two separately authored upper arms cannot be loaded today. The
variant layer already anticipates them (`partVariants.js:68-69` declares the
`['farUpperArm','upperArm']` chain), so closing this is a small change following
the pattern the other five pairs already use, plus two new `BASE_PART_FILES`
entries. **That is a rig task, not an art task — you are preparing and testing it
separately. Author both upper arms as distinct pieces regardless; do not change
`Skeleton.js` or `partVariants.js` as part of this job.**

## Hidden anatomy — the part that has failed every previous round

5. **Torso:** fully paint the anatomically correct shoulder anatomy concealed
   beneath the movable upper arms — **both shoulders**, near and far.
6. **Pelvis underlay:** fully paint the anatomically correct hip anatomy
   concealed beneath the movable thighs — both hips.
7. Author each segment with generous anatomically painted overlap **extending
   through** the joint — every shoulder, elbow, hip and knee, on both sides.
   When segments rotate they must reveal continuous flesh and clothing: not
   transparency, not flat cut edges, not mechanical caps, not circles, not
   disconnected outlines.
8. Do not place finished exterior outlines, seams, holes, mechanical caps,
   circles, or checkerboard patterns across hidden attachment faces.

The distinction that matters in 7 and 8: the overlap region is *interior* art
that happens to be hidden at rest. It is drawn as continuing anatomy — the
humerus mass continuing into the elbow, the quadriceps continuing into the knee
— and never as a finished edge. A finished outline on an overlap face is what
produces the "disconnected part" read when the joint opens.

A related defect to avoid specifically: the approved profile torso
(`profile-torso-trunks-v3-alpha.png`) contains a flat, hard-edged inpainted disc
over the shoulder with no outline. It reads as a pale blob at gameplay scale and
is still open. Concealed anatomy must be *painted anatomy* — modelled deltoid,
pectoral insertion, hip crest — not a flat fill disc.

Also: the black trunk band is baked onto the top of both thighs in
`production-limb-redesign/v1`. Check it does not double-draw at the hip when the
legs separate.

## Design to these numbers

`NEW_ASSETS_SPEC.md` defines the acceptance gate. Author toward it rather than
waiting to be measured against it.

**The ranges below supersede the ones in `NEW_ASSETS_SPEC.md`** (shoulder
−30°…+45°, hip −30°…+50°, elbow/knee 0°…−90°). Those were too narrow: they
exclude overhead attacks, rope taunts, backward arm travel, knee lifts, and
procedural gait extremes. These are production articulation ranges derived from
the actual runtime poses and joint limits.

| Joint | interior_bg_px | sharpest_deg | straight_run_px | range |
|---|---|---|---|---|
| shoulder | ≤ 8 | ≥ 35 | ≤ 18 | −120° … +190° |
| hip | ≤ 8 | ≥ 35 | ≤ 18 | −60° … +125° |
| elbow (local flex) | ≤ 8 | ≥ 35 | ≤ 18 | −10° … +160° |
| knee (local flex) | ≤ 8 | ≥ 35 | ≤ 18 | −10° … +150° |
| neck | ≤ 8 | — | ≤ 18 | both facings |

**Every range is tested in both facings.**

**These are stress-test ranges, not pose references.** The art does not need
every angle in them to look like a natural pose. What it must do at every angle
is remain connected, remain opaque, and expose no finished attachment edge. They
exist to size the painted overlap and the underbody coverage — a shoulder that
holds to +190° has enough paint behind it for anything the game will ask.

The practical consequence is that the concealed anatomy on the torso and pelvis
underlay has to extend considerably further than the rest pose suggests. Paint
the shoulder and hip coverage to the full swept area, not to the neutral
silhouette plus a margin.

Plus, every part: `green_fringe_px = 0`, no interior alpha holes, rounded
proximal cap (no flat slice, no pointed spear), complete extremities (closed
fist on each forearm, complete boot on each shin, complete jaw and ear on the
head).

**Do not run `validate_joints.py` as your gate**, and disregard
`NEW_ASSETS_SPEC.md` where it names that script as the automated gate. Two
defects were found in it and neither is cosmetic:

1. It measures a square crop taken around the joint. The figure always overruns
   that crop, so the silhouette is clipped by the crop rectangle and the contour
   then walks that rectangle's own straight edge. Measured, `straight_run_px`
   comes out at 34/46/60/80/92px for crop radii of 20/28/36/48/64 — identical at
   every joint angle including rest. Against a threshold of 18 it fails every
   limb ever authored while appearing to work.
2. It ranks its worst pose by `interior_bg_px` alone (`validate_joints.py:139`).
   For a limb rotating outward from the torso that wedge is open to the
   background on at least one axis, so `interior_bg_px` stays 0 while the real
   defect registers in `straight_run_px`. It reports the cleanest frame of a
   failing sweep as that sweep's worst case.

A corrected harness exists at `tools/wrestler-cutter/measure-joint-articulation.mjs`
(`npm run art:measure-joints`), pinned against known-answer synthetic fixtures.
The thresholds in the table above are correct; it was the measurement underneath
them that was wrong.

## Deliver

1. The uncropped layered/source master, and the keyed straight-alpha version,
   both preserved at full size.
2. Transparent-background exports of every component in the table above, each on
   its own canvas, named by its `PART_FILES` filename.
3. A `parts-index.json` in the format `cut-production-limb-board.mjs` already
   emits — per part: `sourceBounds`, `exportRect`, `width`, `height`.
4. For each part, the fractional landmarks the rig config needs, **read off the
   pixels, not invented** (`NEW_ASSETS_SPEC.md` lists them per part):
   - torso → `sockets`: `neck`, `nearShoulder`, `farShoulder`, `nearHip`,
     `farHip`, each landing on painted torso
   - head → `headAnchorFrac {u,v}`, `headScale`
   - near/far upper arm → `jointPivotFrac` (shoulder), `distalAnchorFrac {u,v}`
     (elbow), `pivotOffsetFrac` — **separately per side**
   - near/far thigh → `jointPivotFrac` (hip), `distalAnchorFrac {u,v}` (knee),
     plus `thighH`, `shinH` — **separately per side**
   - near/far shin → `jointPivotFrac` (knee), `soleAnchorFrac {u,v}`
   - near/far forearm → `jointPivotFrac` (elbow), `pivotOffsetFrac`

   Every one of these is measured per side. Two separately authored pieces do
   not share a pivot just because they are the same bone.

Deliver these into a new versioned directory under
`Sprite sheets/AI Pilot/Lou/` — do not write into `src/assets/`.

**Do not produce the proofs.** The neutral assembled proof, the extreme
articulation proofs, and the Pass-A v3 scale comparison are being built as a
measured harness on the Claude side, and the point of that harness is that it
runs independently of whoever made the art. Deliver items 1–4 and stop.

## Pipeline restrictions

- Do not run or attempt to satisfy `validate-pass-a`.
- Do not rescale the new figure to match the old 530px crown-to-sole contract.
- Do not apply Pass-A v3's landmarks, its 226 coordinate pairs, skeleton spans,
  or approval SHA.
- A new master requires a new landmark contract, authored after the artwork is
  visually approved — not before.
- Do not integrate or overwrite shipped game assets. Nothing in `src/` changes
  until Derek approves the art.
- The working tree is dirty with paused in-flight work. Do not revert it, and do
  not fold it into this task.

**One ruling from Derek, separate from the art task.** The uncommitted change to
`src/characters/thesz.js` zeroes `nearForearmOffsetX/Y` and `farForearmOffsetX/Y`,
and `tests/productionJointConfig.test.js` pins them at zero. Those offsets were
LOCKED to Derek's 2026-07-31 tuner export as an accepted tradeoff: an overhead
elbow gap in exchange for the idle hand seating he wanted. Zeroing them takes the
opposite trade, and the resting pose has to make sense too.

**Derek's call: restore the original offsets and drop the test that pins them at
zero.** Default to the better resting position. This is explicitly deferred, not
settled — the new limbs may change the forearm shape enough that the tradeoff
disappears, and it gets revisited once they land.

## Verify before delivering

Recognizable Lou identity; clean-shaven face; lean proportions; correct front3q
perspective. All eight limb segments authored individually, every elbow and knee
able to bend independently, no rigid one-piece limb anywhere. Near and far
authored separately for their own depth and perspective — not mirrored, not
shared. Anatomically painted torso shoulders and pelvis hips. Overlap extending
through every joint, revealing continuous flesh and clothing when rotated.
Rounded proximal caps throughout. Landmarks measured from pixels, per side,
landing on paint.
