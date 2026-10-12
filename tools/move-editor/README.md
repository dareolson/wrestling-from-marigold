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
authored here mirrors rigidly in the ring.

Both actors resolve against **one shared origin** (the attacker's position at
clip start), so the separation you compose here is the separation you get in the
ring — independent of how far apart the wrestlers were when the move fired. The
consequence is that **frame 0 is load-bearing**: its offsets are the committed
entry geometry, and each actor is *placed* there at t=0. The readiness report
prints them as the entry tableau and warns if two actors would enter at the same
point. A fresh draft starts every role at `x: 0`, so a paired move needs a real
entry separation authored on the non-attacker roles.

The full contract — units, origin capture, seek determinism, ring clamping, and
why the runtime can never end up with two owners of a wrestler's position — is in
`src/animation/clipStaging.js` and summarised in `RIG_AND_MOVE_PIPELINE.md`.

Verified against the live game by `npm run proof:staging`, not by inspection:
that probe launches the same clip from seven different trigger distances and
requires the authored tableau to converge identically.

## Facing and draw order (2026-10-11)

**Facing is per keyframe.** The Facing control edits the selected actor like a
pose slider; **Capture** writes it onto the keyframe. It is stored relative to
the attacker's facing at the clip's first frame (the same axis `transform.x`
uses), so a turn authored facing right mirrors when the move runs facing left.
It snaps on its keyframe and holds until the next keyframe that sets it — it
never blends. At the first frame the control also sets the draft's start
arrangement (`preview.facing`) — for the defender only. The attacker's start
facing is the axis everything else resolves against, and it stays fixed while
authoring: turning the attacker, even on the first frame, turns only him. A clip that authors no facing leaves facing to its
executor, as every shipped clip does today.

In the game, `Wrestler.move()` turns every wrestler toward the other each tick;
the clip's facing is applied after that, so what is authored here is what
renders. That is also why the shipped hammerlock's `other.facing = this.facing`
only holds for one frame — measured 2026-10-11, the defender faces the attacker
for the whole hold. Authoring the turn as keyframe facing fixes it.

**Draw order follows ring depth**, as in the game: the actor nearer the camera
(larger Actor Y) draws in front, so stepping one wrestler round behind the
other reads correctly while posing. Ties draw the attacker in front.

## Production readiness

`Sweep whole clip` samples every keyframe time, every span midpoint, and a
uniform grid across the clip — not just the pose on screen, which is how a clip
that reads fine at every keyframe ships with a broken interpolation between two
of them. It reports:

- non-finite pose or transform channels, named per role/channel/time;
- certification failures at any swept frame (same kernel as `npm run rig:certify`),
  measured with that frame's **sampled part variants applied** — a variant swap
  moves painted joint anchors, so certifying a variant frame against base art
  certifies a rig the clip never renders;
- the maximum authored contact gap for each declared contact pair, and where;
- unsupported render/posture modes;
- staging channels the runtime cannot consume, which roles the runtime will
  actually take position ownership of, and the entry tableau.

Contacts hold over an **interval**: capturing a snapped keyframe acquires the
contact, `Release at playhead` closes it, and an unreleased contact holds to the
end of the clip. The gap is graded **only inside that window** — before
acquisition the limb is still travelling to the anchor and after release it is
deliberately leaving, so grading those spans would report the approach and the
follow-through as contact failures and bury the one span the author asserted.

Contact drift is a **warning**, not a blocker: snap-and-bake remains a legitimate
authoring choice, the author simply has to be told when interpolation pulls a
baked contact apart. There is deliberately no hidden persistent contact solver.

## Deliberate boundaries

- The editor authors marker names/times; move executors own damage, legality,
  state changes, reversals, and cleanup.
- Contact metadata is **editor/draft-only**. It is stripped from the exported
  clip and nothing about damage, legality, or hit detection may ever read it.
- Contact joints are **derived from the rig**, not listed by hand: `CONTACT_TARGETS`
  comes from `STRUCTURAL_CHAINS` and `CONTACT_SOURCES` is its wrist/ankle subset
  (the limb ends a two-bone chain can actually solve onto an anchor). The
  dropdowns are built from those constants at runtime, so every joint the model
  accepts is reachable and nothing else can be offered. Do not hand-write
  `<option>` lists in `index.html` — `tests/moveEditorContactContract.test.js`
  fails if you do. A capture the model cannot grade is refused with a reason in
  the status line and blocks the readiness report; it is never filtered silently.
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
