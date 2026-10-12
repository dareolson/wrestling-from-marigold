# Generation prompt — Lou Thesz `front3q`, eight-part legacy-rig delivery, v1

Status: **RETIRED — DO NOT EXECUTE.** On 2026-09-27 Derek corrected the record:
he never requested the broader/stockier/more-compact body direction in §2. That
requirement was introduced by an AI and falsely attributed to him across the
September 15–26 documentation chain. Any earlier approval did not validate that
invented requirement. Lou's intended body remains tall and relatively lanky.
This file is preserved as provenance for the still-useful mechanical rules, not
as authorization to generate another full sheet.

The approval gate this prompt passed through, and the ten-requirement
traceability table in §10 that it was reviewed against, were both required by
Codex's addendum to
`AI_HANDOFF_ENTRIES/2026-09-26-next-session-brief-generation-prompt.md`. Read that
brief before generating.

Supersedes `prompts/history/2026-09-13-codex-front3q-prompt.md`, which predates
Derek's 2026-09-15 verdict and contradicts requirements 1, 8, 9 and 10 of it.
That file is kept byte-identical as evidence; do not generate from it.

**Which track this is.** The shipped legacy rig, eight parts, one view
(`front3q`). The five-view canonical-v2 runtime and its seven
`runtimePrerequisites` are **paused**. `templates/GENERATION_PROMPT_TEMPLATE.md`
and `templates/CANONICAL_CHARACTER_SHEET_V2.md` describe that paused track —
read them for house style if useful, but **do not inherit their five-view
master, their 4096x4096 guide template, their 530px crown-to-sole contract, or
their Pass-A/Pass-B structure.** None of it applies here.

---

## 1. Identity source

`Sprite sheets/AI Pilot/Lou/v2-layer-standardization/references/lou-canonical-chroma-v1.png`
is the authority for face, hair, costume, palette and style. It is the file named
as approved in the sibling `REPORT.md`. **Do not substitute another Lou image**,
and specifically do not pick the largest or most detailed file in that directory
— that mistake has already produced a moustached Lou once.

**Lou is clean-shaven.** No moustache, no beard, no stubble, no sideburn
extension. A moustached Lou reference exists in this repository and is
quarantined. If the face you produce has facial hair you have used the wrong
source and the delivery is rejected without further review.

For **proportions only**, the authority is the `front3q` panel of the frozen
Pass-A master:

```
Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png
sha256 ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb
```

Panel rect `x 864, y 64, w 768, h 960`, as declared at
`sourceSheet.masterPanels.front3q` in
`templates/rig-source-manifest.v2.example.json`. That panel holds **58,072
painted pixels** at alpha > 16, and the figure in it is 534 rows tall. Check the
SHA before measuring anything against it.

The same file and the same SHA are pinned in that manifest as
`production.passASheet` / `production.passASha256`, so the prompt and the
pipeline can be cross-checked against each other. If they ever disagree, the
manifest is right and this prompt is stale.

**Do not use `pass-a/thesz-canonical-v2.png`.** Despite its name and its listing
in `pass-a/SHA256SUMS.txt`, that file is a **completely transparent** 4096x4096
PNG — zero pixels above alpha 16, in the `front3q` panel and everywhere else.
Anything measured against it silently measures nothing. An earlier draft of this
prompt named it; that was caught in review on 2026-09-26.

Take identity and style from the canonical chroma reference; take **build** from
the v3 `front3q` panel. Where the two differ on body mass, the panel wins.

---

## 2. The build — requirement 1, and the reason three generations have failed it

**Match the broader, more compact Pass-A `front3q` proportions.** This is not an
instruction to make Lou generically "broad"; it is an instruction to land on a
specific reference figure's proportions.

Derek's verdict, 2026-09-15: the candidate "only partially looks like Lou — the
face carries identity; the body is noticeably too lean and too tall," and the
next candidate "should be broader and more compact, closer to the Pass-A
reference."

Explicitly prohibited:

- **A torso that reads leaner than the Pass-A master** beside it at game scale.
- **Legs that are a larger fraction of total figure height than the master's.**
- An **exaggerated modern-bodybuilder silhouette** — no inflated lats, no
  wasp waist, no vascularity, no shredded definition. Lou is a thick,
  broad-chested, heavy-limbed 1950s shooter, not a contemporary physique
  competitor.

Measured on the rejected v5 draft against the v3 `front3q` panel, for
calibration — these are the numbers to move. Both are scale-invariant and
neither depends on where you sample, which is what makes them usable at all:

| | v5 draft (rejected) | Pass-A v3 master | direction |
| --- | ---: | ---: | --- |
| widest clean central torso run, as % of figure height | 22.2% | **23.2%** | **wider** |
| legs as % of figure height | 42.8% | **40.4–41.7%** | **shorter** |

Torso width is taken on the **central run** — the rows where the arms are
cleanly separated and the silhouette reads as three runs. A width taken across
the whole silhouette reads `[arm, torso, arm]` as one run and measures arm
position instead of build. The leg fraction comes from the **longest two-run band
through the lower body**; scanning down for the *first* two-run row finds the arm
gap and reports 68.5% legs on a figure whose true value is 42.8%.

The master's leg fraction is a **range, not a point**: it moves 40.4–41.7% as the
alpha threshold goes 8 to 128, so do not quote a single figure for it. The
candidate's 42.8% is stable across that whole range, as is its widest run.

**Do not compare torso width at a fixed fraction of figure height.** It looks
like the obvious measure and it is not sound: a longer-legged figure has its
torso compressed into a smaller fraction of total height, so the same station
lands on different anatomy in each figure. Concretely — the v3 master's arms do
not separate cleanly from its torso until **43%** down, while the v5 draft's
separate at **34%**, so a "40% station" comparison silently reads the master at
43% and the candidate at 40%. At a genuinely common station the ordering
reverses (43%: master 18.9%, candidate 19.2%), which is an artefact of the
confound and not evidence that the candidate is broad. The two rows in the table
above are the ones to work to.

**There is no automated gate on this requirement.** It is
`npm run art:proofs --compare` plus **Derek's eye, which is the sole approval
authority** on build unless he authorizes numerical thresholds. Do not treat the
table above as a pass/fail boundary you may sit just inside; treat it as evidence
of how far the last attempt missed.

Everything else in the previous rejection — the pale caps, the notched arm, the
15-of-16 failing joint facings — was fixable paint. Leanness was the finding that
required regeneration, and it survived v3, v4 and v5 unchanged.

---

## 3. The delivery — exactly eight parts

The shipped rig can consume exactly these, and no others:

| # | part | contains | notes |
| --- | --- | --- | --- |
| 1 | `head` | head **and its full neck cylinder** | the neck belongs to the head, not the torso |
| 2 | `torso` | chest, back, shoulders, trunks | **headless** — see below |
| 3 | `upper_arm` | one shoulder-to-elbow painting | **ONE painting, used for BOTH arms** |
| 4 | `thigh` | one hip-to-knee painting | **ONE painting, used for BOTH legs** |
| 5 | `near_forearm` | elbow to and including a **complete closed fist** | near-side depth and perspective |
| 6 | `far_forearm` | elbow to and including a **complete closed fist** | far-side depth and perspective |
| 7 | `near_shin` | knee to and including a **complete boot** | near-side depth and perspective |
| 8 | `far_shin` | knee to and including a **complete boot** | far-side depth and perspective |

**There is no pelvis layer.** No `pelvis_overlay`, no `pelvis_underlay`, no
`pelvis_mask`, no separate hip piece of any kind. Shipped Lou keeps his trunks in
the torso, and the shipped legacy rig does not place pelvis art. Requirement 8.
Hip-span and pelvis-registration work is explicitly out of scope; do not attempt
it and do not deliver art that assumes it.

**There are no separate hand or boot parts.** The fist is painted onto each
forearm; the boot is painted onto each shin.

**No whole arm and no whole leg.** Delivering shoulder-to-hand or hip-to-boot as
one painting is worse than wasted work — it is unusable, because the rig
articulates the elbow and the knee independently on both sides and no offset
bends a single painting in the middle. The six-part `production-limb-redesign/v1`
board did exactly this and maps only 2 of its 6 parts.

### Why `upper_arm` and `thigh` are shared, and forearms and shins are not

The distinction is what the runtime can tell apart, and it was got wrong in both
directions by earlier briefs. Verified in source:

- **Shared.** `src/Skeleton.js:355,373` assigns both arms from `textures.upperArm` with no
  near/far opt-in, and `BASE_PART_FILES` (`src/rig/partVariants.js:1-16`) has no
  filename for a split thigh. Shipped Lou paints each **once** and places it
  twice with its own offsets, tilt and scale. Authoring `near_upper_arm` and
  `far_upper_arm`, or `near_thigh` and `far_thigh`, is work the rig throws away
  — `npm run art:map-candidate` prints those as the `SHARED-ONLY` row, and
  front3q v3 delivered twelve parts of which four were discarded.
- **Split.** `src/Skeleton.js:1556-1565` attaches `farForearm` at the far elbow with
  its own angle and `RIG.ELBOW_OVERLAP`; `src/Skeleton.js:1461-1470` does the same
  for `farShin` at the far knee. The rig reads these through an established
  opt-in fallback (`textures.farForearm ?? textures.forearm` and the same for
  the shin), so separately authored near/far forearms and shins genuinely are
  consumed. **Do not mirror one side and reuse it** for these four: in a
  three-quarter view the near and far limbs sit at different distances and
  different angles to camera, and a mirrored piece reads wrong at exactly the
  moment the limb moves.

For the shared `upper_arm` and `thigh`, paint the piece so it reads correctly in
**both** placements. It is nearer the camera on one side than the other, so
resolve toward the near-side reading and keep the interior modelling
side-agnostic — no anatomical detail that is only true of one arm.

### The torso is headless — requirement 10

`torso.png` contains **no face, no hair, no skull, no jaw, no ear, and no
duplicate head of any kind.** It ends in a **short neck stub** above the
shoulders, and the rig places `head.png` separately at the torso's own declared
neck socket.

The v5 draft delivered a full **bust** — head, neck and shoulders in one
painting. Wired up as eight parts it draws Lou's head twice, and it is unbindable
regardless of what anyone thinks of the build. It could not be repaired by
erasing the head, because that leaves a hole where the chest and shoulders were
never drawn behind it.

This is checked mechanically, from the silhouette alone, with no landmarks
needed: `npm run art:map-candidate` reads the per-row ink width down the torso
canvas and reports the **neck pinch** — a local minimum between a head maximum
and a shoulder maximum. **HEAD BAKED INTO TORSO past 3%.** Every headless torso
measured (shipped Lou, shipped George, the v4 control, `thesz-front3q-r1`) reads
**exactly 0.0%** at every smoothing window from 3 rows to 21. The v5 bust read
10.2%. There is no middle ground to aim for: paint no head on the torso and the
number is zero.

---

## 4. The source plate — the cutter reads position, not filenames

Deliver the eight parts as **one straight-alpha RGBA source plate**, laid out
`4 x 2`, because `cut-front3q-modular-board.mjs` assigns identities by
**row-major reading order** and never by filename:

```
row 1:   head        torso        upper_arm     thigh
row 2:   near_forearm far_forearm near_shin     far_shin
```

The cutter's constraints are hard, and a plate that breaks one is a generation to
re-roll rather than a part set to fix:

- **Exactly 8 connected components** at alpha > 16 of **500 pixels or more**.
  Isolated marks *below* 500 pixels are ignored by the cutter, so a small speck
  or a stray dot is harmless. A **large** stray mark — a smudge, a signature, a
  guide mark, a dropped-in ninth piece — counts as a component and makes the
  count wrong, and so does a missing piece. Either way the cut throws rather than
  guessing.
- **No two parts may touch or overlap.** Anything that connects becomes one
  component, and the count is then 7.
- **Exactly 4 components per row**, each component's vertical centre inside its
  own half of the canvas height. A piece drifting across the midline throws.
- Every part on a **fully transparent background**, baked **facing RIGHT**, in a
  **neutral straight-limb pose**.

Also deliver the uncropped layered/source master and the keyed straight-alpha
version, both preserved at full size. If the plate arrives with alpha already
burned in rather than on a chroma key, run `npm run art:key-plate` before the
cutter; if it arrives on a chroma key, `remove-chroma-key.mjs` handles it.

---

## 5. Neutral bone axes — requirement 3

Every limb painting's **bone must run straight down its canvas.** No baked elbow
flex, no baked knee flex, no baked shoulder or hip angle.

The rig places a limb with its pivot on the joint and rotates it by the **pose
angle alone**. An angle already in the painting therefore adds to every pose, and
the limb is wrong in every frame the game draws. v3's four arms measured 9.3 to
19.6 degrees of bake and had to be mechanically rotated into v4.

Checked by `npm run art:map-candidate --landmarks`: **BAKED BENT past 3
degrees.** The axis is taken from the declared distal anchor where one exists,
from the **declared ankle** for shins, and only then from the distal ink — so
**each shin must declare an `ankle` landmark** (see section 7). A booted shin
measured on its distal ink reads as bent because the toe juts forward; the far
shin of the control measured 0.0 degrees on its ankle and 5.2 on its boot mass.

---

## 6. Joint construction — requirements 4, 5, 6, 7

**Painted overlap through every joint.** Author each segment with generous
anatomically painted material **extending through** the joint — every shoulder,
elbow, hip and knee, on both sides. When a segment rotates it must reveal
continuous flesh and clothing: not transparency, not a flat cut edge, not a
mechanical cap, not a circle, not a disconnected outline.

**The overlap region is interior art that happens to be hidden at rest.** Draw it
as continuing anatomy — the humerus mass continuing into the elbow, the
quadriceps continuing into the knee — and never as a finished edge. A finished
exterior outline on an overlap face is precisely what produces the "disconnected
part" read when the joint opens. Do not place finished outlines, seams, holes,
mechanical caps, circles or checkerboard patterns across a hidden attachment
face.

**Not a flat fill disc either.** The approved profile torso
(`profile-torso-trunks-v3-alpha.png`) has a flat, hard-edged inpainted disc over
the shoulder with no outline; it reads as a pale blob at gameplay scale and is
still an open defect. Concealed anatomy must be *modelled* anatomy — deltoid,
pectoral insertion, hip crest — with the same value structure as the visible
paint.

**Fully paint the hidden shoulder anatomy on the torso, both shoulders**, near
and far, beneath where the movable upper arms rest. Because there is no pelvis
layer, **the torso also carries the hidden hip anatomy** beneath where the thighs
rest, both hips.

**Rounded proximal caps throughout.** No flat slice, no pointed spear. Checked as
`sharpest_deg` >= 35 and `straight_run_px` <= 18.

**No baked trunks material on limb pieces.** The black trunk band belongs to the
torso. Baked onto the top of a thigh it double-draws at the hip when the legs
separate. Checked as the dark fraction of a part's top rows: **TRUNKS BAKED ON
past 20%.** The six-part board measured 52–74%; front3q v3 measured 3–5% and
passes.

**Clean near/far perspective differences** on the four separately authored
pieces, judged visually on the assembled proof.

### Design the overlap to these ranges

These supersede the narrower ranges in `NEW_ASSETS_SPEC.md` (shoulder -30..+45,
hip -30..+50, elbow/knee 0..-90), which exclude overhead attacks, rope taunts,
backward arm travel, knee lifts and procedural gait extremes.

| joint | `interior_bg_px` | `sharpest_deg` | `straight_run_px` | range |
| --- | ---: | ---: | ---: | --- |
| shoulder | <= 8 | >= 35 | <= 18 | -120 .. +190 |
| hip | <= 8 | >= 35 | <= 18 | -60 .. +125 |
| elbow (local flex) | <= 8 | >= 35 | <= 18 | -10 .. +160 |
| knee (local flex) | <= 8 | >= 35 | <= 18 | -10 .. +150 |
| neck | <= 8 | — | <= 18 | both facings |

Every range is tested in **both facings**.

**These are stress-test ranges, not pose references.** The art does not have to
look like a natural pose at every angle in them. What it must do at every angle
is stay connected, stay opaque, and expose no finished attachment edge. They
exist to size the painted overlap and the concealed coverage: a shoulder that
holds to +190 has enough paint behind it for anything the game will ask. The
practical consequence is that the torso's concealed shoulder and hip coverage
must extend considerably further than the rest pose suggests — paint to the full
swept area, not to the neutral silhouette plus a margin.

Plus, on every part: `green_fringe_px = 0`, no interior alpha holes, complete
extremities (a closed fist on each forearm, a complete boot on each shin, a
complete jaw and ear on the head).

**Do not use `validate_joints.py` as your gate**, and disregard
`NEW_ASSETS_SPEC.md` where it names that script as the automated gate. It has two
non-cosmetic defects: it measures a square crop the figure always overruns, so
the contour walks the crop rectangle's own straight edge and `straight_run_px`
comes out at 34/46/60/80/92px for crop radii of 20/28/36/48/64 — identical at
every joint angle including rest, failing every limb ever authored while
appearing to work; and it ranks its worst pose by `interior_bg_px` alone
(`validate_joints.py:139`), which for a limb rotating away from the torso stays 0
while the real defect registers in `straight_run_px`, so it reports the cleanest
frame of a failing sweep as that sweep's worst case. The corrected harness is
`npm run art:measure-joints`, pinned against known-answer synthetic fixtures.
The thresholds above are right; the measurement under them was wrong.

---

## 7. Landmarks — read off the pixels, never invented

Deliver a `landmarks.json` in the format of
`production-front3q-modular/v2/landmarks.json`: fractions of each exported part
canvas, with a `sourcePixel` record of the actual opaque pixel inspected for
each. **Eight parts, so eight entries** — the shared `upper_arm` and `thigh` get
one entry each, not one per side.

| part | required |
| --- | --- |
| `head` | `headAnchorFrac {u,v}`, `headScale`, `sourcePixel.neckBase` |
| `torso` | `sockets`: `neck`, `nearShoulder`, `farShoulder`, `nearHip`, `farHip` — **each landing on painted torso** |
| `upper_arm` | `jointPivotFrac` (shoulder), `distalAnchorFrac {u,v}` (elbow), `pivotOffsetFrac` |
| `thigh` | `jointPivotFrac` (hip), `distalAnchorFrac {u,v}` (knee), `thighHSourcePx`, `shinHSourcePx` |
| `near_forearm`, `far_forearm` | `jointPivotFrac` (elbow), `pivotOffsetFrac` |
| `near_shin`, `far_shin` | `jointPivotFrac` (knee), `soleAnchorFrac {u,v}`, and `sourcePixel.knee` **and `sourcePixel.ankle`** |

The `ankle` on each shin is not optional: requirement 3's bake-axis check prefers
the declared ankle and falls back to the boot ink without it, which makes a
straight leg read as bent.

Also deliver `parts-index.json` in the format `cut-front3q-modular-board.mjs`
already emits — per part `sourceBounds`, `exportRect`, `width`, `height`.

---

## 8. Deliver

Into a **new versioned directory** under
`Sprite sheets/AI Pilot/Lou/production-front3q-modular/`, following the
`v5-generated-draft` shape (`source/`, `parts/`, `reference/`):

1. The uncropped layered/source master and the keyed straight-alpha plate, both
   at full size.
2. The eight transparent-background part exports, each on its own canvas, named
   exactly `head.png`, `torso.png`, `upper_arm.png`, `thigh.png`,
   `near_forearm.png`, `far_forearm.png`, `near_shin.png`, `far_shin.png`.
3. `parts-index.json`.
4. `landmarks.json`, per section 7.
5. A `GENERATION.md` recording what was generated, from what, and against which
   requirements — following `v4-straightened/GENERATION.md`.

**Do not produce the proofs.** The neutral assembled proof, the extreme
articulation proofs and the scale comparison are built by a measured harness on
the review side, and the point of that harness is that it runs independently of
whoever made the art. Deliver 1–5 and stop.

**The approval image must be the delivered parts.** A separately generated
whole-body reference does not count as proof of this delivery and will not be
accepted as one — a bust with a head on it looks like a person, which is exactly
why the v5 head-in-torso defect survived a visual review. The image Derek
approves must be **assembled from the eight delivered paintings**, or be
demonstrably identical to an assembly of them. If you supply a whole-figure
reference for proportion discussion, label it as a reference and not as the
delivery.

---

## 9. Do not

- Do not run or attempt to satisfy `validate-pass-a`.
- Do not rescale the figure to the old 530px crown-to-sole contract.
- Do not apply Pass-A v3's landmarks, its 226 coordinate pairs, its skeleton
  spans, or its approval SHA. A new master requires a new landmark contract,
  authored **after** the artwork is visually approved.
- Do not change `src/Skeleton.js`, `partVariants.js`, or anything else in `src/`.
  Nothing in `src/` changes until Derek approves the art.
- Do not touch production Lou, `production-front3q-modular/v4-straightened` (the
  frozen diagnostic control), or the `thesz-front3q-r1` comparison character.
- Do not activate any canonical-v2 `runtimePrerequisite`.
- Do not repoint `validate_joints.py` at anything.
- Do not revert or fold in the working tree's paused in-flight work.

---

## 10. Traceability — the ten requirements against this prompt's language

Derek's 2026-09-15 requirements, each mapped to the exact section and wording
that carries it, and to the check that catches it.

| # | requirement | where this prompt says it | check |
| --- | --- | --- | --- |
| 1 | A broader, stockier Lou silhouette | §2, "**Match the broader, more compact Pass-A `front3q` proportions**"; the three prohibitions (leaner torso, longer legs, bodybuilder silhouette); §1, "take **build** from the v3 `front3q` panel… the panel wins", with that panel pinned by SHA | `art:proofs --compare` at 265/209/154 **plus Derek's eye, the sole authority**. No numerical gate. |
| 2 | A true three-quarter head matching the body | §3 part 1, `head` is a delivered part authored for this `front3q` body; §1 takes identity from the canonical reference and build from the `front3q` panel | Removes the `crossViewPartReuse` entry for `head`/`front3q`. Until the art exists the borrow stays declared. |
| 3 | Limb paintings on neutral, straight bone axes | §5 entire: "the **bone must run straight down its canvas**… no baked elbow flex, no baked knee flex"; §4, "baked **facing RIGHT**, in a **neutral straight-limb pose**"; §7 requires the shin `ankle` so the check measures the bone | `art:map-candidate --landmarks` — **BAKED BENT past 3 degrees** |
| 4 | Generous unoutlined overlap on both sides of every elbow and knee | §6, "**Painted overlap through every joint**… extending **through** the joint"; "**the overlap region is interior art**… never as a finished edge"; the stress-test range table and "paint to the full swept area" | `art:measure-joints` — `interior_bg_px` <= 8 at articulation extremes |
| 5 | Rounded anatomical joint transitions, no pale caps or flat faces | §6, "**Rounded proximal caps throughout.** No flat slice, no pointed spear"; "**Not a flat fill disc either**" with the named `profile-torso-trunks-v3-alpha.png` defect | `art:measure-joints` — `sharpest_deg` >= 35, `straight_run_px` <= 18, plus the full-resolution assembled proof |
| 6 | Clean near/far perspective differences | §3, "**Do not mirror one side and reuse it**" for the four split pieces, with the reason; §6, "**Clean near/far perspective differences**"; §3 also says how to resolve the two **shared** pieces | Visual, on the assembled proof |
| 7 | No baked trunks material on limb pieces | §6, "**No baked trunks material on limb pieces.** The black trunk band belongs to the torso… double-draws at the hip when the legs separate" | `art:map-candidate` — dark fraction of the part's top rows, **TRUNKS BAKED ON past 20%** |
| 8 | No pelvis layers | §3, "**There is no pelvis layer.** No `pelvis_overlay`, no `pelvis_underlay`, no `pelvis_mask`, no separate hip piece of any kind"; §6 moves the hidden hip anatomy onto the torso as the consequence; §9 rules out hip-span work | `art:map-candidate` — no pelvis part delivered |
| 9 | The same modular decomposition the existing rig can consume | §3's eight-row table and its three negatives (no pelvis, no separate hand/boot, **no whole arm or leg**); "Why `upper_arm` and `thigh` are shared" with the `Skeleton.js` evidence on both sides; §4's plate layout and §8.2's exact filenames | `art:map-candidate` — every delivered part **MAPPED**, and no `SHARED-ONLY` row |
| 10 | A headless torso ending in a short neck stub | §3, "**The torso is headless**… no face, no hair, no skull, no jaw, no ear, and no duplicate head of any kind… ends in a **short neck stub**"; §3 part 1 also puts the **full neck cylinder on the head**, not the torso | `art:map-candidate` — torso **neck pinch**, **HEAD BAKED INTO TORSO past 3%**. Every headless torso reads exactly 0.0%. |

---

## Environment note for whoever runs the checks

The default `node` on this machine is 25.8.1 and `.nvmrc` pins 22; the production
commands refuse to run off-pin.

```sh
export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"
```
