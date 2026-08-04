# Wrestling from Marigold — Animation Tooling and Plugin Evaluation

**Status:** Reference and purchasing guidance; internal clip/variant foundation
implemented 2026-07-31, the first move (`jab`) migrated and shipped, and the first
PAIRED move (`hammerlock`) migrated 2026-08-03 (synchronized attacker/defender
tracks, contact/drain/release markers, interruption + cleanup); remaining move
migration continues incrementally
**Prepared:** 2026-07-25  
**Evaluated against:** Phaser 4.1.0, Vite 8, JavaScript ES modules, the custom six-PNG articulated rig, paired wrestler choreography, the existing rig tuner, and Playwright diagnostics

## Bottom line

No external plugin fixes the current shoulder, elbow, knee, and grounding issues by
itself. Those defects come from bone/art anchor calibration, transform ownership,
and missing contact constraints. The highest-value next addition is therefore a
small **in-repository Phaser Scene Plugin** that owns seekable animation clips,
events, paired tracks, interruption, and cleanup. It should sit above the corrected
custom rig rather than replace it.

The external tools worth keeping on the shortlist are:

1. **Phaser Editor v5**, for a one-month workflow trial after the clip format exists.
2. **TexturePacker**, when hand, face, boot, or costume variants make asset packing
   and pivot metadata cumbersome.
3. **Spine + `spine-phaser`**, as a controlled later prototype if two-body holds and
   deformation remain too expensive in the custom rig.
4. **Rex FSM**, imported narrowly if the gameplay state graph becomes difficult to
   maintain; do not adopt the whole plugin collection or use it as the move format.

Rive and wholesale ContainerLite migration do not fit the present rendering and
choreography needs well enough to justify their integration cost.

## Ranked decision matrix

Ratings are relative to this project, not judgments of the products generally.

| Candidate | Joint/contact value | Moveset-authoring value | Phaser 4.1 fit | Migration cost | Recommendation |
|---|---:|---:|---:|---:|---|
| In-repo `MoveRuntimePlugin` | High | Very high | Exact | Low–medium | **Build next** |
| Phaser Editor v5 | Low directly | Medium | Strong | Low–medium | **Trial after clip schema** |
| TexturePacker | Medium for pivots/variants | Low | Strong exporter support | Low | **Defer until variants grow** |
| Spine + `spine-phaser` | Very high | Very high | Version-sensitive | Very high | **Prototype later** |
| Rex FSM only | None directly | Medium for state control | Explicit Phaser 4 package | Low | **Optional narrow import** |
| Rex ContainerLite | Medium in theory | Low | Explicit Phaser 4 package | Medium–high | **Do not migrate the rig now** |
| Rive Web runtime | High inside Rive | High inside Rive | No native Phaser path evaluated | Very high | **Not for current wrestlers** |

## 1. Built foundation: in-repo move runtime

The first dependency-free slice now lives in `src/animation/AnimationClip.js` and
`src/animation/MoveRuntime.js`, with the asset/variant contract in
`src/rig/partVariants.js`. It provides validated seekable clips, synchronized
arbitrary actor roles, deterministic events, cancellation, and appearance cleanup.
The `jab` is now registered and driven through it in `Arena`/`Wrestler._doJab`
(shipped 2026-07-31), and `hammerlock` followed as the first paired move
(`Arena`/`Wrestler._doHammerlock`, 2026-08-03) — proving synchronized
attacker/defender tracks, the `onCancel` lifecycle seam, and the move-neutral
`_activeMove` handle that lets either bound actor tear the pair down. Every other
move still runs on the legacy path and migrates incrementally per the gates in
`RIG_AND_MOVE_PIPELINE.md`. The runtime still delivers only paired lifecycle
ownership + authored event markers — it is deliberately **not** a declarative
gameplay language or a contact-constraint/IK solver.

Keep it focused rather than adding helpers inside `Wrestler`. Phaser's official Scene Plugin API is designed for
per-Scene state and exposes `start`, `pause`, `sleep`, `wake`, `shutdown`, and
`destroy` lifecycle events. Phaser also installs Scene Plugins through game config
or its Plugin Manager. This is a good match for move playback because every active
clip, constraint, event marker, and cancellation token should die cleanly with the
match Scene.

The plugin should own only animation orchestration:

- register and validate clips;
- start one-body or paired attacker/defender tracks;
- sample a clip at a normalized time for playback and the tuner;
- dispatch contact, acquire-target, release, sound, camera, and state events;
- cancel by wrestler, move, Scene shutdown, reversal, or interruption;
- expose active clip/time/event state to diagnostics;
- use the Scene clock, not an independent real-time scheduler.

It should **not** calculate damage rules, select AI moves, or become a generic
declarative scripting language. `MoveSpec` selects and describes a move; its
executor handles gameplay; the plugin plays and synchronizes animation data.

This is the only candidate that directly matches the current architecture with no
asset conversion, licensing, renderer boundary, or version uncertainty.

Sources: [Phaser ScenePlugin API](https://docs.phaser.io/api-documentation/4.0.0/class/plugins-sceneplugin),
[Phaser PluginManager API](https://docs.phaser.io/api-documentation/4.0.0/class/plugins-pluginmanager)

## 2. Trial: Phaser Editor v5

Phaser Editor v5 is now explicitly built for Phaser 4. Its visual workflow includes
asset packs, prefabs, scene layout, animations, filters, Spine 4.2 preview, and
generation of Phaser code. That could improve:

- ring, UI, menu, and debug-scene layout;
- reusable wrestler or effects prefabs;
- managing the larger texture set created by facial, hand, and boot variants;
- previewing future Spine events if a Spine prototype proceeds;
- giving an artist a visual workspace without making the shipped game depend on
  the editor.

It is not currently a visual editor for this project's custom local-angle pose
objects, so it will not automatically repair the six-part skeleton or author the
planned paired clip schema. A trial is most informative **after** `AnimationClip`
JSON exists; then evaluate whether a small editor extension or generated component
can edit that data without producing brittle generated code.

As of 2026-07-25, the official pricing page lists Phaser Editor at $12/month, says
there is no free trial, and says the editor stops working when the license expires
while exported game projects continue to work. Buy one month only when there is a
written trial checklist.

Trial acceptance criteria:

- imports the existing Vite project without reorganizing runtime ownership;
- preserves hand-written source cleanly;
- makes one real content task faster (for example expression variants or a debug
  comparison scene);
- produces diffable project assets/code;
- does not become required to run tests or build the game.

Sources: [Phaser Editor overview](https://phaser.io/editor),
[Phaser Editor pricing](https://phaser.io/pricing),
[Phaser Editor documentation](https://docs.phaser.io/phaser-editor/v4/)

## 3. Defer: TexturePacker

TexturePacker has a Phaser data exporter, editable pivot points, trimming metadata,
atlases, scaling variants, cache busting, and a command-line build path. Those are
useful once each wrestler has fist/open/grip hands, expressions, bent boots, costume
variants, or multiple frame replacements.

For the current small texture set, direct PNGs plus character `RigProfile` metadata
are simpler and more transparent. Packing sprites also does not remove the need for
painted joint, sole, and contact anchors; an atlas pivot is only one anchor. If the
tool is adopted later, keep authoritative bone lengths and semantic anchors in
versioned character data, and use exported pivots only for sprite seating.

Adoption trigger: asset variants make manual imports or origin calibration a
recurring burden, or draw-call/texture loading measurements show an atlas is useful.
Commit the `.tps` source and make atlas generation reproducible from a package
script rather than publishing atlases manually.

Sources: [TexturePacker documentation](https://www.codeandweb.com/texturepacker/documentation),
[Phaser sprite-sheet tutorial](https://www.codeandweb.com/texturepacker/tutorials/how-to-create-sprite-sheets-for-phaser),
[command-line workflow](https://www.codeandweb.com/texturepacker/documentation/commandline)

## 4. Prototype later: Spine and the official Phaser runtime

Spine is the only evaluated external system that could materially outperform the
custom rig at skeletal authoring. Its runtime supplies skeletons, slots and
attachments, constraints, animation state/mixing, and IK; those map directly to
connected joints, grip targets, planted feet, costume variants, draw-order changes,
and reusable animation blending.

The cost is a real pipeline migration. Existing Procreate parts need importing and
rigging, move playback and gameplay events need bridging, character proportions
need rebuilding, the tuner/audits need adaptation, and synchronized two-wrestler
contact still requires game-specific alignment logic. It is not a drop-in joint fix.

Version pinning is mandatory. The current official runtime guide says recent
`spine-phaser-v4` releases require Phaser 4.2.1 or newer, while earlier runtime
releases support Phaser 4.1.0; exported Spine data must match the runtime's Spine
version. A prototype must therefore pin all three versions or first approve a
Phaser upgrade.

As of 2026-07-25, Spine lists Essential at $69 and Professional at $379 during the
displayed promotion; Essential excludes meshes and other advanced features. Prices
and license eligibility can change, so recheck before purchasing. The free trial can
be used to evaluate authoring, but shipping the runtime requires the applicable
license terms.

Prototype one difficult representative sequence—not an idle animation:

- one wrestler acquires and holds the other's wrist;
- the defender turns while contact remains stable;
- a planted foot stays fixed;
- near/far draw order changes once;
- the move can be sought to contact and interrupted cleanly;
- compare authoring time, visual quality, runtime complexity, and new-art burden
  against the custom clip/constraint implementation.

Sources: [official `spine-phaser` guide](https://en.esotericsoftware.com/spine-phaser),
[Spine IK constraints](https://en.esotericsoftware.com/spine-ik-constraints),
[Spine purchase and licensing summary](https://us.esotericsoftware.com/spine-purchase)

## 5. Optional narrow import: Rex FSM

Rex Rainbow's project now documents Phaser 4 and publishes
`phaser4-rex-plugins`; the repository is MIT-licensed. Its FSM supports named
states, transitions, enter/exit callbacks, and Scene update hooks. It is a plausible
small dependency if wrestler/match state transitions become the next maintenance
problem.

Do not use FSM states as animation keyframes and do not import a large bundled
surface merely because it is available. A move clip is time-sampled data with events;
a gameplay FSM answers which state may follow which. Keep those concerns separate.
Before adoption, import only the FSM class in a branch, run the full browser suite,
inspect bundle impact, and confirm pause/shutdown behavior.

Sources: [Rex FSM documentation](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fsm/),
[Rex plugin repository and MIT license](https://github.com/rexrainbow/phaser3-rex-notes)

## 6. Do not migrate now: Rex ContainerLite

ContainerLite can synchronize child position, rotation, scale, alpha, and local
tweens, and it has an explicit Phaser 4 package. It is appealing because the current
rig is a hierarchy of image parts. However, adopting it would replace transform and
display-list behavior at the same time the project is stabilizing painted anchors.
The current renderer deliberately weaves far limbs, torso, near limbs, overlaps,
and joint caps. ContainerLite still would not supply bone lengths, two-bone IK,
painted joint anchors, paired contacts, or move events.

Keep the explicit bone graph and world-transform pass. A future isolated experiment
is reasonable only if it demonstrates simpler code while preserving exact draw
order, facings, constraints, and every alpha-aware joint audit.

Source: [Rex ContainerLite documentation](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/containerlite/)

## 7. Not for the current wrestler rig: Rive

Rive has strong visual state machines and a capable Web runtime, but the evaluated
Web integration owns an HTML canvas/OffscreenCanvas and advances its own artboard
and state machine. No official Phaser-native renderer or Game Object integration
was identified in this evaluation. Embedding a separate renderer would complicate
Phaser depth ordering, cameras, hitstop/time scaling, shader/effect handling,
screenshot diagnostics, and two-wrestler contact with existing Game Objects.

Rive may be useful later for self-contained menus, broadcast graphics, or UI motion.
It is a poor fit for replacing only the wrestlers inside the current Scene.

Sources: [Rive Web runtime parameters](https://rive.app/docs/runtimes/web/rive-parameters),
[Rive state-machine playback](https://rive.app/docs/runtimes/web/state-machines)

## Proposed decision sequence

1. Implement the in-repo `MoveRuntimePlugin` with seekable clips and events.
2. Convert jab and hammerlock; add tuner seeking and interruption tests.
3. Add hand/contact and painted-sole constraints and audits.
4. When art variants begin, evaluate TexturePacker against the actual asset set.
5. Buy one month of Phaser Editor only with a scoped workflow experiment.
6. After one Class B paired move exists, run the Spine prototype if authoring is
   still the dominant cost.
7. Add Rex FSM only if a concrete gameplay-state problem justifies it.

## Plugin acceptance checklist

Before adding any animation dependency, require all of the following:

- explicit Phaser 4.1 compatibility or a separately approved Phaser upgrade;
- ES-module/Vite import without remote runtime scripts;
- pinned version and recorded license;
- Scene pause, sleep, shutdown, and destroy behavior verified;
- no second unsynchronized clock for moves;
- two wrestlers, both facings, hitstop, and interruption tested;
- compatible draw order and camera behavior;
- seekable output for the tuner and deterministic event order at 30/60/120 Hz;
- no regression in joint, hand-target, or sole-ground audits;
- measurable authoring or runtime benefit on a real move;
- small removal plan if the experiment fails.

## Decision

**Approve as the next architectural task:** design and implement the small internal
Phaser `MoveRuntimePlugin` described above.

**Approve for later evaluation, not purchase yet:** Phaser Editor v5,
TexturePacker, and Spine.

**Allow only when justified by a concrete issue:** Rex FSM as a narrow class import.

**Do not adopt for the wrestler rig now:** ContainerLite migration or Rive.
