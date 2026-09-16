# 2026-09-13 — Claude: joint articulation harness, and two defects in the gate it replaces

Derek asked for the measured half of the front3q acceptance work: the proofs and
comparisons that turn "better limbs" into something checkable, built
independently of whoever produces the art. This records what was built, the two
defects found in the validator `NEW_ASSETS_SPEC.md` names as the automated gate,
and one correction to my own first assumption.

## What was built

`tools/wrestler-cutter/measure-joint-articulation.mjs`, `npm run art:measure-joints`.

It composites a parent and child part through a joint's articulation range in
both facings and measures the three properties `NEW_ASSETS_SPEC.md` already
names — `interior_bg_px`, `sharpest_deg`, `straight_run_px` — reporting the
worst frame per joint.

Advisory by default, exits 0 whatever it finds; `--strict` makes the thresholds
blocking. No Node pin, for the reason `measure-art-contract.mjs` documents: it
writes no artifact and records no hash, so every number reproduces on any Node.

It replicates the runtime's `jointPivotFrac` attachment path, which is the path
this art takes — `Skeleton.js:818-821` returns the joint point unchanged when the
child carries `_jointPivotFrac`, so for parts authored to this spec the pivot is
the joint and there is no overlap backoff to model. `localToWorld` is pinned
against `Skeleton.js`'s `_end` at five angles. If the harness posed limbs
differently from the runtime, every number it printed would describe a body the
game never draws.

`tests/jointArticulationMeasure.test.js` — 27 tests. Every metric is pinned
against synthetic art whose answer is known by construction, following the
precedent `tests/artContractMeasure.test.js` set after three of its metrics
shipped wrong.

## Two defects in `validate_joints.py`

`NEW_ASSETS_SPEC.md` names this script as the automated gate and instructs that
it be "repointed at the assembled new parts." **It should not be.** Both defects
are in the measurement, not the thresholds.

### 1. It measures its own crop

`validate_joints.py:134` crops a square region around the joint
(`region_alpha`, radii 55/48/60/52 per joint) and measures that crop. The figure
always overruns such a crop — the torso is larger than any joint region — so the
silhouette is clipped by the crop rectangle, and the contour walk then follows
that rectangle's own perfectly straight edge.

Measured on capsule-and-ellipse fixtures, `straight_run_px` by crop radius:

| crop radius | 20 | 28 | 36 | 48 | 64 |
| --- | ---: | ---: | ---: | ---: | ---: |
| straight_run_px | 34 | 46 | 60 | 80 | 92 |

Identical at every joint angle tested, including rest. The number tracks the
crop size and nothing else. Against a threshold of 18, this fails every limb
ever authored while looking like a working gate.

The first version of the new harness inherited this exactly, because it was
written to mirror the Python's semantics so the two could cross-check. Fixed by
measuring the full frame and filtering contour points by distance to the joint,
which keeps the silhouette intact. Pinned by
`sharpestAndStraight: a clipped silhouette does not fabricate a straight run`.

### 2. It ranks the worst pose by the wrong metric

`validate_joints.py:139` keeps the worst pose by `interior_bg_px` alone. For a
limb rotating outward from the torso, the wedge that opens is open to the
background on at least one axis, so `interior_bg_px` stays 0 through the whole
sweep while the flat authored attachment face swings into view and
`straight_run_px` goes to 38-41 against a limit of 18.

Ranking on `interior_bg_px` therefore reports the cleanest frame of a failing
sweep as that sweep's worst case. The new harness scores each frame by how far
past its threshold each of the three metrics sits, normalised by that threshold,
and reports the frame with the largest single exceedance.

## A correction to my own assumption

I built this believing `interior_bg_px` was the metric that fails first, because
the old sources failed it at 51-102px and `NEW_ASSETS_SPEC.md` leads with it.
On these fixtures it is not. For an outward-rotating limb `interior_bg_px` stays
0 and `straight_run_px` is the metric that registers a flat cut face.
`interior_bg_px` catches holes and genuinely enclosed wedges — a limb crossing
back over the body — which is a real case but not the common one.

Both facts are now pinned, so a future change cannot quietly drop the metric
that is actually load-bearing while still appearing to gate.

## Structural note: the named gate is untracked

`Sprite sheets/` is gitignored in full (`.gitignore:3`). `validate_joints.py`,
the script `NEW_ASSETS_SPEC.md` names as the automated gate, is therefore not in
version control, not reviewable in a diff, and not runnable in CI. That is the
reason the replacement was built as tracked Node tooling under `tools/` rather
than by repointing the Python, and it is an argument against citing that
validator as a gate in future documents.

## The proof renderer

`tools/wrestler-cutter/render-articulation-proofs.mjs`, `npm run art:proofs`.
Emits the neutral assembly, a broadcast-treated neutral, an articulation contact
sheet per limb segment through its full range in both facings, and the Pass-A
comparison at 265/209/154. `tests/articulationProofs.test.js` — 21 tests.

Proven end to end against a synthetic twelve-part set before any real art
exists: parts written as actual PNGs, run through the CLI, output images
inspected. That inspection found two defects no assertion had caught.

**The head was never drawn.** It is in `FRONT3Q_DEPTH_ORDER` but was missing
from the chain table, so it received no placement and was silently skipped —
while the tool still printed `12/12 parts rendered`, because the part had loaded
fine and merely had nowhere to go. Now pinned: dropping a part from the depth
order must change the assembled figure.

**The pelvis layers inherited the torso's pivot.** They correctly share the
torso's box and placement (george.js:37-47 — one box object, or the trunks
outline doubles and drifts), but each must keep its own declared pivot.
Inheriting the torso's silently misregisters any layer whose pivot differs.

Two treatment details are pinned because they are easy to get wrong and would
quietly flatter the art. Scanlines are applied in **screen** space at a fixed 2px
pitch, as `Arena.js:2877-2886` generates them — a renderer that scaled scanlines
with the figure would show every size receiving the same number of lines and
hide the whole reason small scale is hard. And downscaling is a premultiplied
box filter, so transparent pixels do not drag the silhouette edge toward black
and 1px detail survives as grey instead of vanishing.

## Verification

`npm test` — 466/466 on Node 22.23.1 at the time of writing.

**Correction (2026-09-14).** This section originally claimed "the only edit to an
existing file is one additive line in `tests/pipelineParameterization.test.js`."
That was wrong: `package.json` gained two npm scripts and `AI_HANDOFF.md` gained
this entry's summary. Three existing files, not one. Codex caught it.

The proof renderer described above was also **not fit to judge Lou**, and its
real-data failures are recorded in the 2026-09-14 entry. Read that before
relying on anything in the proof-renderer section here.

Nothing in `src/`, no manifest, no landmark, no art and no runtime file was
changed. Codex's in-flight uncommitted work was left untouched.
