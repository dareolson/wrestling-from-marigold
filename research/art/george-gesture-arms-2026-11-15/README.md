# George gesture forearms — 2026-11-15

Art-only delivery for `presentPalm` and `dismiss`, per [Claude's brief](../../../AI_HANDOFF_ENTRIES/2026-11-15-claude-george-gesture-arms-brief.md). No runtime assets, variant registrations, rig data or choreography were changed.

## Delivered candidates

- `forearm_presentPalm-v1.png`: open, shallow cupped palm; fingers together, relaxed thumb. Intended for `crowdPresentHold` and `superiorityPresent`.
- `forearm_dismiss-v1.png`: back of hand visible, loose staggered fingers and gently cocked wrist. Intended for `crowdDismissSweep`.

Both are full **426 × 439 RGBA canvases**, in the original forearm's local orientation (elbow above, hand below). One drawing serves both arms/facings; do not rotate it into the contextual screenshot before registering.

## Canvas contract

The original source pixels from rows 0–233 inclusive are preserved exactly, including the elbow cap and forearm through the specified wrist. Joint pivot `.1559` and distal anchor `(.5010, .5298)` remain the existing rig values. Generated wrist/hand art starts below this preserved region with a short transition through row 245. No tight bounding-box crop was used. `package_canvas.py` records deterministic canvas preparation: full-canvas resize, wrist alignment and original proximal-pixel preservation. This is art packaging, not runtime registration. `canvas-check.json` records dimensions and preservation checks.

Neither of these two gestures requests a semantic contact anchor in the brief; `semanticAnchors` is empty. Do not invent a hair-contact anchor for them. `hairSmooth`, `inspect` and `chestTouch` remain separate future requests.

## References and provenance

Generation used only `references/forearm.png`, `references/forearm_grip.png`, and the relevant contextual pose screenshot (`crowdPresentHold_R.png` or `crowdDismissSweep_R.png`). Source screenshots and `poses.json` were supplied by Claude. Generated original PNGs are preserved under `generated/`. Exact prompts, imagegen original paths and output names are in `generation-manifest.json`.

## Review

Both packaged candidates visually inspected, real alpha and exact canvas checked, source elbow/forearm byte equality through row 233 verified. Derek still needs to judge the open palm and dismissive gesture in game. Inspect wrist transition, hand proportion, palm direction and paint overlap across the complete gesture in both facings. These are candidate hand drawings, not a claim of an already certified gesture. Claude owns registration and wiring.

## Second delivery: chestTouch, hairSmooth, inspect

- `forearm_chestTouch-v1.png`: near-arm flat/together fingers for offended upper-chest touch.
- `forearm_hairSmooth-v1.png`: **far-arm** gently curved together fingers for crown smoothing. Contact anchor is on the delivered canvas at pixel **(244, 332)**: `hairContact = {u: 244/426, v: 332/439}`. Exact normalized values and pixel coordinates are in `semantic-anchors.json`, and copied into `canvas-check.json`.
- `forearm_inspect-v1.png`: near-arm visible palm with slightly spread fingers, drawn straight in local source orientation so runtime can rotate it in front of the chin.

All three use the same full-canvas packaging and original pixel preservation through row 233. Prompts, references and generated originals are recorded in `generation-manifest-next.json`; generated sources preserved in `generated/`. The first inspect generation bent the forearm and was rejected; its original path/reason is recorded separately, not delivered as a variant.

The hair-contact anchor is the centre of the curved distal finger-pad area, not the wrist or back of the hand. It is an art landmark, not proof of hair contact under the current pose. Original forearm length remains unchanged. The previously reported far-forearm overlap in front of the face is a staging/depth issue this hand replacement cannot certify away; check the full path in both facings. If overlap persists, evaluate a revised path/depth first; a shorter/bent forearm would be a separate rig/art change. No foreshortened near-arm replacement was made.

No source/runtime assets were replaced and no variant was registered or wired. Derek judges all three in game after Claude's registration. Earlier presentPalm/dismiss deliverables remain untouched.
