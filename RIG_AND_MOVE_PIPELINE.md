# Rig and Move Content Pipeline

**Status:** Foundation implemented; `jab` migrated and shipped (2026-07-31); remaining move migration is intentionally incremental
**Purpose:** Make new wrestlers, the referee, transitions, and move-specific art predictable content work instead of edits scattered through `Skeleton.js`, `Wrestler.js`, and `Arena.js`.

## The contract

The production path is now split into three responsibilities:

```text
character art manifest
  base parts + calibrated anchors + named variants
                         ↓
seekable animation clip
  attacker / defender / referee tracks + event markers
                         ↓
move executor
  gameplay legality, damage, state, reversal, and cleanup
```

The rig remains responsible for connected anatomy. The clip describes how actors transition and which art is visible. The move executor remains responsible for game rules. Do not repair a bad joint by adding a move-only screen offset.

## Part variants

Variants live under `character.textures.variants` and target semantic render slots:

- `head`, `torso`, `pelvisOverlay`
- `nearUpperArm`, `farUpperArm`
- `nearForearm`, `farForearm`
- `nearThigh`, `farThigh`
- `nearShin`, `farShin`

Hands and boots are currently baked into forearm and shin art. Therefore a grip or fist swaps the relevant forearm; a bent foot swaps the relevant shin. Splitting hands and feet into extra bones should wait until a real move proves whole-part replacement insufficient.

```js
textures: {
    forearm: {
        key: 'example_forearm',
        box: { w: 40, h: 60 },
        jointPivotFrac: 0.08,
    },
    variants: {
        nearForearm: {
            grip: {
                key: 'example_near_forearm_grip',
                file: 'near_forearm_grip.png',
            },
        },
        head: {
            hurt: {
                key: 'example_head_hurt',
                file: 'head_hurt.png',
            },
        },
    },
}
```

A variant inherits its base part's display box and anchors. This is the fast path and requires the replacement to use the same canvas, joint, and alignment. If the cut is genuinely different, the variant must explicitly override its geometry and pass the same joint audits as a base part.

`Arena.preload()` now discovers both base and variant assets from this contract. `Skeleton.setPartVariants()` applies one complete selection and resets omitted slots to base, preventing interrupted moves from leaving a grip hand or hurt face stranded.

Run `npm run rig:validate` before launching the browser. Missing/non-PNG files,
duplicate keys, invalid slots, malformed normalized anchors, and a variant canvas
that silently differs from its inherited base canvas fail at the command line.

## Seekable clips

`AnimationClip` is data, measured in seconds. Every actor role has ordered keyframes. Numeric `pose` and `transform` channels blend; `parts` selections change discretely on their authored keyframe. Partial keyframes inherit earlier channels.

```js
{
    id: 'hammerlock-v1',
    duration: 1.2,
    tracks: {
        attacker: {
            keyframes: [
                { at: 0,   pose: POSES.grapple, parts: { nearForearm: 'base' } },
                { at: 0.3, pose: POSES.hammerlockCatch, parts: { nearForearm: 'grip' } },
                { at: 1.2, pose: POSES.hammerlockHold },
            ],
        },
        defender: {
            keyframes: [
                { at: 0,   pose: POSES.grapple },
                { at: 1.2, pose: POSES.hammerlocked },
            ],
        },
        referee: {
            keyframes: [
                { at: 0,   transform: { attention: 0 } },
                { at: 0.6, transform: { attention: 1 } },
            ],
        },
    },
    events: [
        { at: 0.3, type: 'acquire-contact', target: 'defender.nearWrist' },
        { at: 0.8, type: 'apply-damage' },
    ],
}
```

Role names are not hard-coded, so a referee track can be added without inventing a second animation system. `MoveRuntime` samples every bound role at the same clip time, emits markers exactly once, supports seeking for tools, cancels by target, and clears part swaps on completion or interruption.

`jab` is the first move actually wired to this runtime: `Arena` registers `jabClip` and `Wrestler._doJab` plays it, with a legacy pose-sequence fallback (`_doJabLegacy`) kept for unit-test construction where no `MoveRuntime` exists. Every other move still runs on the legacy tween/timer path. The runtime is deliberately not wired wholesale into every existing move at once — converting all moves in one pass would mix a choreography rewrite with the connected-rig work and make regressions hard to isolate.

## Content workflow

1. Draw or generate a neutral full-body master with clear joint landmarks.
2. Cut and clean the base parts through `tools/wrestler-cutter`.
3. Calibrate sockets and painted anchors once; pass both facings and the angle sweeps.
4. Draw variants on copies of the calibrated base canvases. Preserve the joint and canvas.
5. Declare variant key/file entries and run `npm run rig:validate`.
6. Author the move as a seekable clip with anticipation, contact, impact/hold, release, and recovery keyframes.
7. Preview the clip at arbitrary time, not only through live gameplay.
8. Gate the move at 30/60/120 Hz, both facings, both wrestler slots, interruption, reversal, and Scene shutdown.

## Migration order

1. ~~Use `jab` as the one-body clip proof: transition, fist forearm, impact marker, recovery.~~ **Done (2026-07-31)** — `src/animation/clips/jab.js` + `Wrestler._doJab`. Impact fires exactly once at 30/60/120 Hz, seeking never emits, cancel before/after impact is damage-safe, appearance resets on cancel/shutdown, and the striking forearm resolves correctly in both facings. Verified live (`debug:play -- jab` for Lou and George) and by `tests/jabClip.test.js`.
2. Use `hammerlock` as the paired proof (next, not yet started): attacker/defender tracks, grip variant, contact acquire/release, interruption.
3. Add a referee actor and bind it to existing pin/submission events.
4. Move remaining Class A strikes, then Class B paired moves, one at a time.
5. Only add separate hand/foot bones, an atlas, or an external skeletal tool if measured authoring pain remains after those proofs.

## Non-negotiable gates

- Painted parent and child anchors meet the same solved joint.
- A variant cannot change a joint location accidentally.
- Clips are seekable and deterministic.
- Contact, damage, audio, and camera events are markers, not untracked timeouts.
- Cancellation restores appearance and releases contacts.
- New wrestlers and the referee use the same manifests and clip roles.
- Lou and George's approved base silhouettes do not change merely because the pipeline exists.
