# Wrestling from Marigold — Character Animation and Moveset Guide

**Status:** Reference report; design guidance, not an approved rewrite  
**Prepared:** 2026-07-25  
**Stack reviewed:** Phaser 4.1.0, JavaScript ES modules, Vite 8, six-part PNG cutout rig, Phaser tweens/timers, Playwright browser diagnostics

## Executive recommendation

Keep the current Phaser/custom-cutout approach for the next stage. The game
already has the important foundations: local joint angles, a two-bone leg
solver, authored poses, character-specific art metadata, contextual inputs,
move-specific state logic, and browser regression scenarios. Replacing it now
would trade visible progress for an asset and tooling migration.

The next architectural step should be smaller and more valuable:

1. Treat `Skeleton` as a formal bone graph with local transforms and named
   anchors—not a collection of independently nudged screen sprites.
2. Replace pose-only sequences plus scattered `delayedCall`s with reusable
   animation clips containing keyframes, contact events, and optional attacker
   and defender tracks.
3. Put move eligibility, animation, gameplay outcome, AI hints, and roster tags
   behind one `MoveSpec` record per move.
4. Add constraint passes for planted feet and move-specific hand/contact
   targets, while keeping authored FK poses responsible for silhouette.
5. Reconsider Spine only after one representative two-body hold has been
   prototyped both ways and the license, editor workflow, Phaser upgrade, and
   asset conversion costs are known.

This approach expands the move library without losing the hand-drawn broadcast
look or turning every new move into another bespoke state-machine exception.

## What the project has today

The current animation pipeline is:

```text
Input/AI context
      ↓
tryAction / tryPower / tryFinisher / lockup routing
      ↓
move-specific _doXxx method
      ├── state, damage, position and defender choreography
      ├── delayed gameplay callbacks
      └── MOVE_DEFS pose sequence
                         ↓
                  tweenPose(POSES[name])
                         ↓
            Skeleton.updateUpright / grounded draw
                         ↓
             six transformed PNG body parts
```

This is a sensible prototype architecture, but move truth is distributed among
`POSES`, `MOVE_DEFS`, `_doXxx`, input routing, `Arena` lockup routing,
`AIHandler`, character `moveSet` arrays, and debug scenarios. That distribution
is now the main obstacle to adding moves safely.

Recent elbow, knee, shoulder, and boot work also exposed an important testing
lesson: a mathematical endpoint, a sprite rectangle, and the visible painted
joint are three different things. Future tooling must measure the painted art
in world space.

## Movement and rigging practices

### 1. Make every joint local to its parent

Store a bone as a parent index, local rotation, local length, and optional local
translation. Derive world transforms from the root outward once per frame.
Child placement should never use a fixed screen-space X/Y correction to solve a
rotating seam. Screen-space offsets can align one pose and drift in every other
pose.

Recommended logical hierarchy:

```text
root / ground position
└── pelvis
    ├── torso
    │   ├── neck → head
    │   ├── near shoulder → upper arm → forearm → hand anchor
    │   └── far shoulder  → upper arm → forearm → hand anchor
    ├── near hip → thigh → shin → sole anchor
    └── far hip  → thigh → shin → sole anchor
```

Phaser Containers support parent-relative child position, rotation, and scale,
and render children in container order. That makes them useful for simple
group transforms. The present rig, however, deliberately interleaves far limb,
torso, near limb, and joint-cap depth. Keep the explicit bone-world-transform
calculation unless a Container prototype proves it preserves this ordering
cleanly. [Phaser Container documentation](https://docs.phaser.io/api-documentation/class/gameobjects-container)

### 2. Separate bone geometry from artwork calibration

Each character should eventually have a `RigProfile` with:

- bone lengths and body scale;
- two-dimensional pivots, not only `jointPivotFrac` on Y;
- painted joint rows/centers measured by the cutter;
- near/far display scale;
- hand, ankle, and painted-sole anchors;
- allowed joint ranges and preferred bend direction;
- optional texture variants.

The bone endpoint is gameplay geometry. The art pivot is how a PNG is seated on
that endpoint. The sole anchor is how a baked boot meets the mat. Keeping these
separate prevents an art crop correction from silently changing reach,
collision range, or wrestler height.

### 3. Use FK for acting and IK for promises

Authored forward-kinematic poses should continue to carry personality,
anticipation, and silhouette. Use constraints only where the animation makes a
visual promise:

- a planted boot stays on the mat;
- a hand stays on a wrist, neck, rope, or opponent anchor;
- a knee or elbow keeps its bend direction;
- two wrestlers maintain a controlled separation during a hold.

Two-bone IK solves a hand or foot target by rotating the parent and child
bones. It is especially useful for planted feet and hands that must remain in
place while the body moves. Mixing FK and IK briefly at entry/release avoids a
hard pop. [Spine's official IK guide](https://en.esotericsoftware.com/spine-ik-constraints)

Do not run every limb at 100% IK. That commonly produces technically connected
but generic motion. A practical move can be 100% authored FK during wind-up,
blend the grabbing arm toward a target during contact, hold the target during
the working phase, then blend back to FK on release.

### 4. Interpolate angles as angles

Before tweening a joint, resolve the target to the shortest angular path from
the current value. Raw numeric interpolation can rotate the long way when a
value crosses `-π/π`. Preserve local elbow/knee bend as a relative angle unless
a pose explicitly supplies an absolute child angle.

Keep interpolation semantics explicit per channel:

- joint rotation: shortest-angle interpolation;
- root position: linear, Bezier, or authored root curve;
- crouch/lean/blend weights: clamped scalar interpolation;
- planted target: constraint solve after the authored pose is sampled.

Phaser tweens can animate ordinary object properties, provide completion and
update callbacks, chain tasks, and use linear/Bezier/Catmull interpolation.
Those capabilities fit a clip runner, but the runner should own angle wrapping
and event dispatch. [Phaser tween guide](https://docs.phaser.io/phaser/concepts/tweens)

### 5. Animate readable phases, not just destinations

Most moves should expose five semantic phases even if two share a pose:

| Phase | Purpose | Typical treatment |
|---|---|---|
| Entry | align range, facing, and stance | quick controlled ease-out |
| Anticipation | show intention and load weight | longer than contact; clear silhouette |
| Contact | damage/reversal decision | shortest phase; event marker; optional hitstop |
| Follow-through/hold | show force or wrestling control | root/body continues after contact |
| Recovery | return control and stance | duration is part of move balance |

Contact must be an event in the animation data, not a separately copied magic
number. The same event should trigger damage, sell state, sound, camera shake,
heat, and debug logging. This prevents pose timing and gameplay timing from
drifting apart.

Phaser's Scene clock drives timers, tweens, sound, and sprite animation from the
same synchronized clock, so clip events should stay on that clock. Scene
`update(time, delta)` receives a smoothed, capped delta for per-frame logic.
[Phaser time guide](https://docs.phaser.io/phaser/concepts/time),
[Phaser Scene API](https://docs.phaser.io/api-documentation/class/scene)

### 6. Layer intent instead of authoring every combination

Use a small number of composable layers:

1. **Base locomotion:** idle, open-ring walk, close wrestling shuffle, run.
2. **Action clip:** can replace the full body or only an upper/lower mask.
3. **Constraint layer:** planted feet, grabbed hand, rope, opponent contact.
4. **Condition layer:** hurt lean, fatigue wobble, guard blend.
5. **Presentation layer:** expression, hand/boot variant, draw order, hit flash.

Apply them in that order and make each weight inspectable in the rig tuner.
Avoid additive offsets whose coordinate space is unclear.

### 7. Preserve weight and contact

- Advance gait from actual travel speed, as the project already does, so foot
  phase and root displacement remain coupled.
- Keep a planted sole target fixed in world space through its stance interval.
- Shift hips and torso before a throw; limbs should follow the center of mass,
  not lead it without support.
- Let root motion continue briefly after impact for clotheslines, throws, and
  drops.
- Use short holds at readable extremes. Constant-speed motion through every
  pose looks mechanical even with good drawings.
- Keep recovery meaningful. A large move with instant recovery has no apparent
  mass and weak gameplay risk.

### 8. Treat draw order as animation data when necessary

The correct near/far order can change during a turn, hold, or arm crossing.
Allow a clip event or keyframe to select a small named ordering preset rather
than scattering depth constants through move code. Overlap bands should render
behind the parent cap that hides them.

## A scalable animation clip

The first useful refactor is not a large declarative gameplay language. It is a
small `AnimationClip` that unifies pose timing and events:

```js
const CLIPS = {
  hammerlockAttacker: {
    duration: 1400,
    keys: [
      { at: 0.00, pose: 'hammerlockReach', ease: 'Cubic.easeOut' },
      { at: 0.09, pose: 'hammerlockTurn',  ease: 'Cubic.easeInOut' },
      { at: 0.21, pose: 'hammerlockSet',   ease: 'Cubic.easeOut' },
      { at: 0.36, pose: 'hammerlockCrank', ease: 'Linear' },
    ],
    events: [
      { at: 0.21, type: 'acquireTarget', anchor: 'defender.nearWrist' },
      { at: 0.21, type: 'contact', damageKey: 'hammerlock' },
      { at: 1.00, type: 'release' },
    ],
  },
};
```

Use normalized `at` values so timing can be tuned by changing one duration.
Permit an absolute millisecond override only when genuinely needed. A clip
sampler should be seekable: the tuner and automated screenshots can then render
0%, 25%, 50%, 75%, and 100% without waiting in real time.

Every pose should normalize all supported channels, including optional
`lForearm`, `rForearm`, `lShin`, and `rShin`. Missing optional channels mean
"use the rig default," while an explicit zero means zero. Do not erase that
distinction during blending.

## One source of truth for moves

The target is one registry that describes selection and execution without
trying to encode arbitrary JavaScript choreography:

```js
const MOVE_SPECS = {
  hammerlock: {
    tags: ['grapple', 'hold', 'technical'],
    trigger: { button: 'finisher', context: 'lockup' },
    eligibility: {
      attackerStates: ['lockup'],
      defenderStates: ['lockup'],
      range: 'establishedLockup',
    },
    animation: {
      attacker: 'hammerlockAttacker',
      defender: 'hammerlockDefender',
      alignment: 'behindDefender',
    },
    gameplay: {
      staminaCost: 3,
      damageKey: 'hammerlock',
      recoveryMs: 220,
    },
    ai: { minHeat: 15, baseWeight: 0.18, repetitionPenalty: 0.55 },
    executor: executeHammerlock,
  },
};
```

The `executor` remains code for complex positioning, pin logic, rope behavior,
or reversals. The registry removes duplicated eligibility/timing/kit facts and
gives player input, AI, documentation, validation, and debug scenarios the same
move identity.

Character kits should contain move IDs plus optional character tuning:

```js
moveSet: {
  hammerlock: { aiWeight: 1.25, damageScale: 1.0 },
  kneeDrop:   { aiWeight: 0.70 },
}
```

That scales better than parallel hard-coded arrays in character data and
`Arena` presets.

## Expanding the move library efficiently

Classify a move before building it:

| Class | Current rig fit | Examples | Requirements |
|---|---|---|---|
| A: single-body/readable reaction | Strong | chop, forearm smash, shoulder block, knee lift, taunt, dodge | attacker clip + existing sell |
| B: aligned two-body move | Good after clip/anchor work | wristlock, snapmare, hip toss, atomic drop, backbreaker | attacker/defender clips + alignment/contact anchors |
| C: sustained entanglement | Limited | Boston crab, figure four, abdominal stretch, complex pin | bespoke defender poses, limb targets, draw-order changes, likely hand/foot variants |
| D: large orientation change | Custom draw or future runtime | bridges, rolling cradles, rope-assisted dives | root curves, body rotation, collision/ground rules, possibly extra art |

Build several Class A moves while the clip runner matures. Then use one Class B
move—snapmare or atomic drop—as the reference implementation for synchronized
two-wrestler choreography. Do not use the hardest mat submission as the first
test of the new architecture.

High-value art additions after the clip runner are the variants already
anticipated in `DRAWING_GUIDE.md`: effort/hurt expressions, fist/open/grip
hands, and normal/bent boots. Phaser's built-in Sprite `AnimationState` is
frame-based and supports playback, queueing, mixing, and animation events; it
can help with expression or small sprite-frame variants, but it does not
replace this multi-image skeleton by itself.
[Phaser AnimationState API](https://docs.phaser.io/api-documentation/4.0.0/class/animations-animationstate)

## Recommended production workflow for each move

1. **Intent:** write trigger, context, wrestling purpose, risk, and outcome.
2. **Feasibility class:** decide A/B/C/D and required art before posing.
3. **Block contact:** place attacker/defender roots and contact anchors first.
4. **Author silhouettes:** entry, anticipation, contact, follow/hold, recovery.
5. **Add event markers:** contact, release, landing, state change, sound/camera.
6. **Wire gameplay:** executor consumes events; avoid duplicate delay numbers.
7. **Wire selection:** registry drives input, AI, character kit, and debug name.
8. **Inspect:** both facings, both player slots, representative ring depths.
9. **Measure:** joints, hand target, sole ground error, root separation.
10. **Playtest:** readability, impact, recovery risk, repetition, and match flow.

## Automated acceptance checklist

Every move should pass:

- referenced poses, clips, events, damage keys, and executor exist;
- clip times are ordered and inside duration;
- exactly one primary contact event unless the move declares multiple hits;
- attacker and defender return to legal states after completion/interruption;
- no orphaned hold, tween, constraint, or delayed callback remains;
- shortest-path joint interpolation across `-π/π`;
- painted shoulder/elbow/hip/knee gap within tolerance;
- planted painted sole within a small mat tolerance;
- required hand/contact anchor within tolerance during a hold;
- facing parity and P1/P2 parity;
- 30, 60, and 120 Hz sampling produces the same event order and outcome;
- browser scenario logs the expected move/contact/outcome;
- visual contact frame is captured for human review.

The rig tuner should gain overlays for true joints, art pivots, sole/hand
anchors, constraint targets, and per-layer blend weights. A comparison grid
should render both facings and several normalized clip times from the seekable
sampler.

## Phased roadmap

### Phase 0 — protect the current rig

- Keep the alpha-aware joint audit.
- Add painted-sole ground and hand-target audits.
- Remove remaining screen-space seam offsets or clearly mark them as temporary.
- Add angle wrapping and joint-limit validation.

### Phase 1 — animation clips

- Introduce seekable `AnimationClip` sampling.
- Move pose durations and contact callbacks into clip data.
- Preserve existing `_doXxx` methods as executors.
- Convert two moves first: jab (simple) and hammerlock (hold/interruption).

### Phase 2 — move registry and choreography

- Add `MoveSpec` registry and validator.
- Route player input, AI, kits, documentation, and debug scenarios through it.
- Add attacker/defender tracks and named alignment/contact anchors.
- Prototype one Class B move end to end.

### Phase 3 — presentation layers

- Expression and hand/boot variants.
- Named draw-order presets.
- Upper/lower-body masks and additive hurt/guard layers.
- Contact hitstop, sound, camera, and effects dispatched from clip events.

### Phase 4 — evaluate an external skeletal runtime

Spine's official Phaser runtime supplies a skeleton, slots/attachments,
constraints, animation tracks, and mixing. The currently installed Phaser
4.1.0 is supported by older `spine-phaser-v4` releases, while the latest
runtime documentation calls for Phaser 4.2.1 or newer; Spine Editor/runtime
versions must also match, and licensing applies. Treat this as an evaluated
production-tool decision, not a casual dependency swap.
[Official spine-phaser runtime guide](https://en.esotericsoftware.com/spine-phaser)

Adopt it only if the prototype shows a decisive improvement in authoring
two-body holds, deformation, skin/attachment variants, and animation mixing
that outweighs converting the hand-drawn asset pipeline and existing tools.

## Decision summary

- **Now:** keep Phaser and the custom six-part rig.
- **Next engineering investment:** seekable clips with events, local-space
  anchors, and one move registry.
- **Next animation investment:** improve planted-foot constraints and build a
  synchronized Class B reference move.
- **Next art investment:** expressions and grip/fist/boot variants after their
  swap layer exists.
- **Avoid:** more pose-specific screen offsets, duplicated contact timers, and
  expanding hard-coded input/AI branches for every new move.
- **Revisit later:** Spine or another skeletal authoring runtime after a fair
  prototype and cost comparison.

## Companion tooling evaluation

See [`ANIMATION_TOOLING_AND_PLUGIN_EVALUATION.md`](ANIMATION_TOOLING_AND_PLUGIN_EVALUATION.md)
for a stack-specific comparison of an internal Phaser Scene Plugin, Phaser
Editor v5, TexturePacker, Spine, Rex FSM/ContainerLite, and Rive. Its immediate
recommendation is to build a small in-repo `MoveRuntimePlugin`; no external
dependency or purchase is approved by the report.

For the concrete next-generation joint attachment contract, see
[`COHESIVE_BODY_RIG_BLUEPRINT.md`](COHESIVE_BODY_RIG_BLUEPRINT.md). It specifies
an authoritative bone graph, two painted anchors per limb, torso-owned sockets,
constraint ordering, tooling, migration phases, and acceptance criteria without
requiring a renderer or asset-pipeline rewrite.

## Primary sources

- [Phaser 4.1 Container API](https://docs.phaser.io/api-documentation/class/gameobjects-container)
- [Phaser tween concepts](https://docs.phaser.io/phaser/concepts/tweens)
- [Phaser time concepts](https://docs.phaser.io/phaser/concepts/time)
- [Phaser Scene update API](https://docs.phaser.io/api-documentation/class/scene)
- [Phaser AnimationState API](https://docs.phaser.io/api-documentation/4.0.0/class/animations-animationstate)
- [Spine IK constraints](https://en.esotericsoftware.com/spine-ik-constraints)
- [Official spine-phaser runtime](https://en.esotericsoftware.com/spine-phaser)
