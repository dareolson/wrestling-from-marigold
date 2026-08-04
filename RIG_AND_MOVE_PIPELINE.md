# Rig and Move Content Pipeline

**Status:** Foundation implemented; `jab` migrated and shipped (2026-07-31); `hammerlock` migrated as the first paired-actor proof (2026-08-03); remaining move migration is intentionally incremental
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

`hammerlock` is the first PAIRED move on the runtime (`hammerlockClip`, `Wrestler._doHammerlock`): two synchronized `attacker`/`defender` tracks sampled at one clip time, three authored markers (`acquire-contact`, `apply-drain`, `release-contact`) that replaced the old `delayedCall(300)`/`delayedCall(1400)`, and deterministic teardown when either wrestler is interrupted. It has **no** legacy `poseSeq` fallback — its old `MOVE_DEFS.hammerlock` entry was deleted so there is no second, dead timing source. The paired proof drove three runtime changes worth reusing for future paired moves:

- **Move-neutral active handle.** `Wrestler._activeJab` became `_activeMove`; for a paired move BOTH wrestlers' `_activeMove` reference the same handle, so either one claiming a new pose/state (via `tweenPose` → `_cancelActiveMove`) cancels the whole move and cleans up both actors.
- **`onCancel` lifecycle seam.** `MoveRuntime.play` now takes `onCancel` alongside `onComplete`. Natural completion and cancellation are different outcomes: only completion runs the release drain and the 220ms settle; cancellation (either actor, `cancelTarget`, or `shutdown`) tears down without release damage. `cancel()` is idempotent and re-entrancy-safe (its `_active.delete` guard absorbs a cancel that loops back through a recovery pose-claim).
- **Executor-owned character recovery.** The shared clip never bakes in Lou's `theszIdle` or George's `powerIdle`; the executor's `onComplete` runs the per-character 220ms idle settle. This kept the clip data character-agnostic without inventing a per-actor pose-injection binding.

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
2. ~~Use `hammerlock` as the paired proof: attacker/defender tracks, grip variant, contact acquire/release, interruption.~~ **Done (2026-08-03)** — `src/animation/clips/hammerlock.js` + `Wrestler._doHammerlock`. Synchronized attacker/defender tracks; `acquire-contact`/`apply-drain`/`release-contact` markers fire exactly once in order at 30/60/120 Hz and never on seek; interruption through either actor, `cancelTarget`, and `shutdown` all leave both wrestlers in legal, non-orphaned states with no stranded `_fixedHold`/handle/variant/timer and no late damage; preserved timing (drain @300ms, release @1400ms, 220ms recovery) and tuning (defender 10+4, attacker cost 3, heat 5). A working/grip forearm can be authored later but no grip PNG exists yet, so the semantic slot safely resolves to base art (as jab's `fist` does). Verified live (`debug:play -- hammerlock` Lou→George and `hammerlockReverse` George→Lou), by `tests/hammerlockClip.test.js` (20 tests), and by `tools/debug/hammerlock_preview.mjs` (seek frames + interruption matrix). This provides paired lifecycle ownership + event markers only — **not** a general contact-constraint or MoveSpec system.
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
