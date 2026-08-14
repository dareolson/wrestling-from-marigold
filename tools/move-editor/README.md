# Move Editor

Dev-only connected-rig clip editor. It reuses the production `Skeleton`,
character configs, part-variant contract, and `AnimationClip` sampler.

Run the normal Vite server and open `/tools/move-editor/`.

## Current MVP

- Attacker and defender previewed on one stage.
- The standards-compliant procedural reference rig is the default for both
  roles and exercises two-anchor bindings, independent hands/boots, pelvis
  layers, and real variants. George and Lou remain selectable as explicitly
  labelled legacy comparisons.
- Wrist and ankle handles solve connected two-bone chains. Forearms and shins
  are never freely detached from their parent joints.
- Canonical local elbow and knee controls, shoulder/hip controls, actor root
  offsets, both facings, easing, playback, looping, and scrubbing.
- Capture, replace, duplicate, and delete keyframes on synchronized role
  tracks.
- Per-keyframe part variants discovered directly from each character's
  `textures.variants` contract.
- Timeline event markers.
- Contact snap that brings the selected actor into solvable range and solves a
  connected wrist/ankle chain onto the other wrestler's structural anchor.
  The resulting root transform and pose are baked when the keyframe is
  captured; it is deliberately not represented as a hidden runtime constraint.
- JSON draft import and generated JavaScript clip export.
- `window.__MOVE_EDITOR` automation seam for smoke tests.
- Live certification badge powered by the same pure invariant kernel as
  `npm run rig:certify`. A legacy character with missing structural anchors is
  reported as `UNVERIFIED`, never as a false pass.

## Deliberate boundaries

- Actor `transform.x/y` is previewed and exported, but the live Wrestler
  `applyAnimationSample` path does not consume clip transforms yet. Paired
  executors currently own staging. Do not remove that warning until the game
  runtime seam is implemented and tested.
- The editor authors marker names/times; move executors own damage, legality,
  state changes, reversals, and cleanup.
- Persistent contact constraints, onion skinning, and draft recovery are
  subsequent milestones. Live per-pose certification is already available;
  the full `npm run rig:certify` matrix remains the release acceptance gate.
  The current contact command is an explicit snap-and-bake operation.
- Flat, pinned, possum, dropkick-front, airborne/held, and other primitive
  render states are intentionally not exposed. They currently bypass the
  modular Skeleton and will be added only after the game migrates them onto
  the connected grounded path.
- George and Lou currently define no production variant families, so the
  variant panel explains that it will populate when standardized art exists.
