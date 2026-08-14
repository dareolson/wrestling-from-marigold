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
  Capturing the keyframe also records the pair as declarative **draft-only**
  contact metadata, so the readiness sweep can re-measure it between keyframes.
- Production readiness sweep (`Sweep whole clip`) — see below.
- JSON draft import and generated JavaScript clip export.
- `window.__MOVE_EDITOR` automation seam for smoke tests.
- Live certification badge powered by the same pure invariant kernel as
  `npm run rig:certify`. A legacy character with missing structural anchors is
  reported as `UNVERIFIED`, never as a false pass.

## Actor staging reaches gameplay

Actor `transform.x/y` is live. It is authored here in **rig units** (the stage
preview multiplies by its own `SCALE`; every authoring gesture divides by it),
travels the real `AnimationClip` → `MoveRuntime` → `Wrestler` → `Skeleton` path,
and places real wrestlers. `transform.x` is an offset along the *attacker's*
facing at clip start and `transform.y` is un-mirrored ring depth, so a tableau
authored here mirrors rigidly in the ring. The full contract — units, origin
capture, seek determinism, ring clamping, and why the runtime can never end up
with two owners of a wrestler's position — is in
`src/animation/clipStaging.js` and summarised in `RIG_AND_MOVE_PIPELINE.md`.

Verified against the live game by `npm run proof:staging`, not by inspection.

## Production readiness

`Sweep whole clip` samples every keyframe time, every span midpoint, and a
uniform grid across the clip — not just the pose on screen, which is how a clip
that reads fine at every keyframe ships with a broken interpolation between two
of them. It reports:

- non-finite pose or transform channels, named per role/channel/time;
- certification failures at any swept frame (same kernel as `npm run rig:certify`);
- the maximum authored contact gap for each declared contact pair, and where;
- unsupported render/posture modes;
- staging channels the runtime cannot consume, and which roles the runtime will
  actually take position ownership of.

Contact drift is a **warning**, not a blocker: snap-and-bake remains a legitimate
authoring choice, the author simply has to be told when interpolation pulls a
baked contact apart. There is deliberately no hidden persistent contact solver.

## Deliberate boundaries

- The editor authors marker names/times; move executors own damage, legality,
  state changes, reversals, and cleanup.
- Contact metadata is **editor/draft-only**. It is stripped from the exported
  clip and nothing about damage, legality, or hit detection may ever read it.
- Persistent contact constraints, onion skinning, and draft recovery are
  subsequent milestones. The full `npm run rig:certify` matrix remains the
  release acceptance gate.
- **Grounded authoring is disabled.** `down`, `pinned`, and `possum` now reach
  the modular rig in game, but they share a single fixed flat pose: distinct
  prone, bridge, and kneeling postures remain open `postureGap` entries, and
  grounded child-part orientation is a documented open defect. Declaring a
  grounded `posture` on a draft is preserved rather than silently coerced, and
  blocks the readiness report. Dropkick-front, airborne, and held silhouettes
  have not migrated onto the rig at all and are not authorable.
- George and Lou currently define no production variant families, so the
  variant panel explains that it will populate when standardized art exists.
