# George near-arm hair fix — art delivery, 2026-11-15

Requested by `AI_HANDOFF_ENTRIES/2026-11-15-claude-george-hair-arm-brief.md`. Art only; no production registration, commits or pushes.

## Deliverables

| Runtime variant requested | PNG | Canvas |
|---|---|---|
| `upperArm.hairReach` | `upperArm-hairReach-v1.png` | 296 × 410 |
| `forearm.hairFix` | `forearm-hairFix-v1.png` | 426 × 439 |

`anchors.json` contains the existing proximal pivots and new semantic anchors. Upper elbow is **(148.4, 246)** on its canvas: `distalAnchorFrac` **(0.5013513514, 0.6)**. Forearm finger-pad centre is **(250, 359)**: `hairContact` **(0.5868544601, 0.8177676538)**. Forearm wrist anchor remains its original value; hairContact is a separate point.

The upper arm is shorter in projection with overlapping biceps/elbow volumes. The forearm has a palm-down, fingers-together smoothing hand. The optional frustrated rake was not included.

## Sources, packaging and checks

Built-in imagegen was used, with current George upper arm, forearm, hairSmooth and head as references. Exact prompts are in `prompts.json`; untouched generated originals are in `sources/`. `references/` includes copied base art, the original near-arm pose, a geometry experiment, and final pair stills in both facings.

`package-art.mjs` resamples the full generated canvases onto the requested canvas contracts, without alpha-bound cropping. It restores the original shoulder pixels through row 150 and original forearm/elbow pixels through row 233, blending below those rows. `validation.json` verifies dimensions, transparent borders, painted anchor locations, zero changed cap channels, and unchanged production base files. Reproduce with Node 22: `node research/art/george-hair-arm-2026-11-15/validate.mjs`.

## Registration detail for Claude

**A new distalAnchorFrac alone does not shorten George's current bound upper arm.** His base upper-arm entry includes `binding`, and `Skeleton._placeBoundPart` fits it to a normal-length world bone; `nearTrueElbow` then uses that graph endpoint. `mergeVariantEntry` also inherits the base binding when the variant supplies `null`. Simply registering this art and a moved distal anchor can stretch away the intended foreshortening.

The supplied fit was made in a **temporary browser-only trial**, using the original canvas/display dimensions but clearing the near upper arm's `_binding` and honoring its new painted distal point. No engine or character files were changed. Claude should implement an appropriate move-scoped projected-arm placement, preserving the shoulder and new elbow point and restoring normal placement on exit. Do not change George's shared arm length or stretch this piece back to the original elbow. The forearm uses its existing binding and unchanged original elbow cap.

## Pose reference and limits

`preview-pair.mjs` places the actual art on the current rig in both facings. `preview-fit.json` records a central contact pose: lArm 1.64, lElbow 1.44, rArm .15, rElbow .8, lean -.06, bend 0. The rig's near arm is the one being replaced in this trial. The finger-pad anchor is 1.25 world pixels from a forelock target in each facing; sampled eye and mouth points are clear. This is a point/proxy measurement, supported by `references/pair-R.png` and `pair-L.png`, not a production animation approval.

The small smoothing arc sampled by `joint-samples.json` runs from that pose to lArm 1.76/lElbow 1.54, in both facings. Both pieces cover the elbow point through the arc. A wider exploratory sweep crossed the face on its low-angle side (`sources/joint-wide-sweep.json`); do not use that broad interpolation for the approach. Claude still needs to author the lift/release path, swap timing and game registration, and Derek judges the full motion in game.

The initial `near-arm-shortened-surrogate.png` experiment inherited the bound-arm behavior and did not prove actual shortening; use the final pair stills instead.
