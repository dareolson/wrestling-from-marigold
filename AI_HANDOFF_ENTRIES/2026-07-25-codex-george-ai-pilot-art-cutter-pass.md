# Codex focused art/cutter pass — George AI pilot

Date: 2026-07-25

## Outcome

Built and tested a versioned `v2-hinge` candidate without replacing the
existing `george-ai-pilot` assets. The candidate fixes the exposed generated
hip-cap defect and proves that source-only, internal-pivot limb art can keep
its painted joints connected. It does **not** yet pass the live movement gate:
the scissor/“emu” gait remains, and distinct projected near/far shins expose a
4.90px idle grounding mismatch under the current shared pose/ground contract.

Therefore:

- do not replace `george-ai-pilot` with v2 yet;
- do not replace shipped George or wire expression states;
- keep `?p1=george-ai-pilot-v2&p2=george` as a reversible comparison preset;
- treat the remaining locomotion problem as a gait/pose-geometry follow-up now
  that hinge-ready, nub-free art has actually been tested.

## Baseline capture that was missing before

Added `tools/debug/george_pilot_art_review.mjs`. It captured 130 baseline PNGs
and 130 v2 PNGs through the real Phaser renderer:

- 16 live keyboard-walk frames plus 5 braking frames in each direction;
- 24 dense gait phases in each facing;
- real 180ms idle-to-lockup tweens in both facings from four retained
  `walkPhase` values, with four transition/final samples each.

Evidence is under:

- `tools/debug/shots/george-pilot-art-review/baseline/`
- `tools/debug/shots/george-pilot-art-review/v2-hinge/`
- `v2-hinge/baseline-v2-gait-closeups.png`
- `v2-hinge/baseline-v2-lockup-closeups.png`

The v2 lockup samples show no exposed magenta hip ellipse/wedge at any sampled
transition or retained phase. The dense gait closeups still show crossing,
overextended legs.

## Cutter/art changes

Reworked the isolated gitignored cutter:

`Sprite sheets/AI Pilot/George/tools/prepare_rig_assets.py`

It now preserves the original v1 outputs and writes only to:

`Sprite sheets/AI Pilot/George/candidates/v2-hinge/`

The v2 cutter:

- draws no hidden caps, ellipses, bridges, pegs, or replacement skin;
- retains real source pixels lengthwise above/below internal pivots;
- uses 36 source pixels of transparent projection padding around aligned limbs;
- keeps the clean far thigh shared because the approved gameplay master’s near
  thigh is occluded by the near hand from hip to mid-thigh (a distinct clean
  near thigh cannot be extracted without a ghost hand or invented contour);
- exports clean, distinct near and far shins/boots from the gameplay master;
- removes disconnected neighboring-body fragments selected by broad masks;
- emits a clean torso/trunks silhouette with no source thighs baked into it;
- emits `pelvis_overlay.png` from only the master’s real magenta costume pixels,
  antialiasing, and black ink edge;
- gives that overlay the torso’s exact 294×530 canvas and crop.

The source-only runtime copies live under the new namespace
`src/assets/wrestlers/george-ai-pilot-v2/`. Existing
`src/assets/wrestlers/george-ai-pilot/`, shipped `src/assets/wrestlers/george/`,
and `src/characters/george.js` were not changed.

## Black-stroke intersection measurement

`candidates/v2-hinge/diagnostics/rig-validation.json` now records dark master
pixels within three source pixels of each raw polygon transition, plus the
subset just outside the mask. This quantifies the old cutter’s contour risk.

| part | v1 boundary / excluded | v2 boundary / excluded |
|---|---:|---:|
| torso | 1496 / 998 | 863 / 239 |
| upper arm | 298 / 86 | 276 / 109 |
| forearm | 291 / 117 | 584 / 342 |
| thigh | 476 / 168 | 254 / 132 |
| near shin | v1 shared shin: 761 / 319 | 46 / 21 |
| far shin | v1 shared shin: 761 / 319 | 49 / 24 |

These are raw polygon-neighborhood counts, so the v2 forearm number includes
nearby thigh/hand ink that the new largest-component filter discards. The
standalone contact sheet is the intended-contour check; it shows the forearm’s
actual side/finger ink preserved with no exported neighboring fragment.

## Phaser integration

Added opt-in support for:

- `nearShin` / `farShin` texture entries, each falling back to legacy `shin`;
- optional `pelvisOverlay`, placed with the torso’s exact position, rotation,
  scale, facing, and grounded rotation;
- overlay depth above both thigh roots and below the near arms.

The v2 config also corrects a scale issue missed by the prior “one scale” pass:
`_placePart` grows both axes by `1/(1-jointPivotFrac)`, but v1 folded the pivot
factor into height only. V2 folds it into both stored box axes, so the final
displayed canvas has the same `0.24861350162554982` source-pixel scale in X and
Y for upper arm, forearm, thigh, near shin, and far shin. No X/Y repair offsets
were added.

## Verification

Passes:

- cutter validation/contact sheet;
- `npm test`: 57/57;
- `npm run build`;
- `npm run debug:play -- all`: 16/16;
- `joint_attachment_audit.mjs george-ai-pilot-v2`: all samples 0–1px;
- `torso_socket_sweep.mjs george-ai-pilot-v2`: 1.41px worst case;
- 130-frame baseline and v2 real-render review sets.

Known failing gate:

- `sole_grounding_sweep.mjs george-ai-pilot-v2`: 4.90px worst planted error,
  at idle on the near sole; dense gait’s smallest swing clearance is 0.00px.

The distinct projected source legs have different hip-to-sole screen lengths
(the near gameplay-master foot is visibly lower/closer than the far foot),
while the current idle FK solves one shared pelvis translation. Averaging the
two required translations cannot seat both soles. More cutter padding or
another cap cannot fix that without violating uniform scale. Likewise, the
dense gait images keep continuous joint ink but retain the crossing/extended
leg geometry. The next decision is either an approved gameplay master with an
unoccluded near thigh and compatible projected leg lengths, or an authored
near/far pose/gait geometry pass; do not hide either issue with screen offsets.
