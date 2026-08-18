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

- `head`, `torso`, legacy `pelvisOverlay`, future `pelvisUnderlay`, `pelvisMask`
- `nearUpperArm`, `farUpperArm`
- `nearForearm`, `farForearm`
- `nearHand`, `farHand`
- `nearThigh`, `farThigh`
- `nearShin`, `farShin`
- `nearBoot`, `farBoot`

George and Lou keep their baked forearm-hand and shin-boot art through the
compatibility path. New eight-part characters use separately socketed hand and
boot slots. Structural wrist/ankle anchors are locked across variants; semantic
hand-contact and sole points may vary with the painted pose.

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

Slot resolution is deterministic: a side-specific family such as
`nearForearm.fist` wins when present, otherwise the renderer falls back to the
shared `forearm.fist` family. This supports George's split forearms and Lou's
unified forearm without changing clip semantics. `strikingForearm` still maps
to near/far from facing; the selected side then follows that same fallback.

Articulated channels survive both legacy `tweenPose` and seekable
`applyAnimationSample` paths. Production content uses local
`lElbow`/`rElbow`/`lKnee`/`rKnee`; absolute forearm/shin channels remain a
compatibility input. Each joint has one live representation, with local flex
winning malformed dual-authored samples, so an invisible legacy channel cannot
keep animating beneath it. Run
`node tools/debug/articulated_channel_probe.mjs` when pose plumbing changes;
it checks actual rendered limb rotations, finite transforms, and intermediate
frame continuity—not only final pose data.

New content should author facing-independent local `lElbow`/`rElbow` and
`lKnee`/`rKnee` flex. Absolute forearm/shin channels remain compatibility
adapters. The rig tuner shows cyan shoulder-elbow-wrist and hip-knee-ankle
chains; use the local controls to author visibly different extended, guard-90,
deep-flex, and overhead poses within the runtime joint limits.

The pelvis is also a connected-art contract. The torso or explicit
`pelvisUnderlay` owns a complete opaque rounded bottom behind both thighs; an
optional `pelvisMask` may add the front garment edge above both roots. Do not
use legacy `pelvisOverlay` as both jobs. The source gate checks real alpha and
pelvis/thigh union sweeps through leg separation/get-up angles.

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

### The clip transform contract (2026-08-13)

`transform` channels used to be authored in the move editor, previewed there,
and then silently dropped: `MoveRuntime.applySample` returns early for any
target implementing `applyAnimationSample`, and `Wrestler.applyAnimationSample`
only consumed `pose` and `parts`. Editor staging previewed correctly and reached
nothing. `src/animation/clipStaging.js` is the contract that closes that seam;
it is the authority, and this is the summary.

- **Units are rig units** (unscaled body space, the space the Skeleton is drawn
  in at `s = 1`) — never editor pixels, never world coordinates. The move editor
  divides by its preview `SCALE` on the way into the draft, so an authored
  offset means the same body distance in the editor and in the ring.
- **Every staged role resolves against one shared tableau origin** — the anchor's
  position when the clip began, not its own. Clip data never carries an absolute
  ring position (a move stages identically wherever in the ring it is triggered)
  while the *relative* placement of the actors is entirely authored.

  This is the correction to the first version of this contract (2026-08-13),
  which captured a separate origin per role. That looked equivalent and is not:
  with per-role origins the final separation was `authored separation + whatever
  gap the two bodies happened to have at trigger time`, so the same clip produced
  a different tableau depending on how far apart the wrestlers were when the move
  fired, and the geometry composed in the editor was never reproduced in the ring.
  The original proof launched both actors from the same `x`, which hid it exactly.

  The cost is explicit and deliberate: at t=0 each actor is **placed** at its
  authored entry offset, so an actor whose real position does not match snaps
  there. For a choreographed paired move that is the desired behaviour —
  commitment snaps the pair into an exact, reproducible tie-up — but it makes
  frame 0 load-bearing, so a clip's t=0 offsets must describe the entry geometry
  the move is actually triggered at. The move editor's readiness report prints
  those offsets as the **entry tableau**, and warns when two actors are authored
  to enter at the same point (a fresh draft starts every role at `x: 0`, which
  under a shared origin stages both wrestlers on top of each other).
- **`x` is measured along the staging axis** — the direction the anchor role
  (`attacker`, see `ANCHOR_PREFERENCE`) faced at clip start — and positive `x`
  is forward along that axis for *both* roles. The two-actor tableau therefore
  mirrors as one rigid unit: a defender authored ahead of the attacker stays
  ahead of them when the attacker faces left. **`y` is ring depth and is not
  mirrored**; facing is a left/right property, and mirroring depth would swap
  which wrestler is nearer the camera.
- **One captured scale for the pair.** Both axes are multiplied by the anchor's
  perspective scale, captured once — same reasoning as the shared origin. Using
  each actor's own live `s` would let them drift apart as the clip nudges them to
  different depths. One origin, one axis, one scale: the tableau is rigid.
- **Placement is absolute, not incremental.** `world = tableauOrigin + f(sampled
  transform)`. Nothing accumulates and nothing reads back the previous frame, so
  an arbitrary seek lands exactly where playing there lands, and re-applying one
  time twenty times moves nobody. Because the origin is shared, the relative
  geometry at any time `t` is a pure function of the clip data — identical from
  every trigger distance, in both facings, in either role assignment.
- **Ring bounds still win.** `Wrestler._applyStagedTransform` clamps, so a large
  authored offset started at the ropes is clipped rather than staging a wrestler
  through the apron. This is the one place the authored tableau is deliberately
  *not* reproduced: at the ropes it compresses. Both behaviours are asserted.

**Ownership is opt-in per track.** `compileClip` marks each track with
`authorsTransform`, and a staging context is built *only* for roles whose track
actually authors transform channels. A clip that authors none — `jab`,
`hammerlock` — gets no context at all and its executor keeps sole ownership of
position exactly as before. That is what makes "the clip owns position" and "the
executor owns position" mutually exclusive by construction rather than by
convention, so two owners can never fight over a wrestler. Facing is *not* a
clip channel: executors set it before `play()` and it is captured, not driven.

Proven end to end by `npm run proof:staging`
(`tools/debug/staging_transport_proof.mjs`), which drives
`src/animation/clips/stagingProof.js` — a developer proof clip authored in the
move-editor export shape and deliberately **not** in the move registry —
through the live Arena's own `MoveRuntime` and real `Wrestler`/`Skeleton`
instances, measuring world coordinates and rendered joint positions rather than
inspecting a screenshot. Unit coverage is `tests/clipStaging.test.js`.

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
5. ~~Add separate hand/foot bones.~~ **Architecture done (2026-08-10)** — opt-in
   eight-part path, source-manifest adapter, marker editor, and compatibility
   renderer are in place. Final George/Lou art remains intentionally deferred.

## Non-negotiable gates

- Painted parent and child anchors meet the same solved joint.
- A variant cannot change a joint location accidentally.
- Clips are seekable and deterministic.
- Contact, damage, audio, and camera events are markers, not untracked timeouts.
- Cancellation restores appearance and releases contacts.
- New wrestlers and the referee use the same manifests and clip roles.
- Lou and George's approved base silhouettes do not change merely because the pipeline exists.
- `npm run rig:certify` reports no architecture-class findings. The reference
  rig is certified first on every run and is the control; if it fails, every
  other verdict in that run is unreliable and the run says so.

## Certification and coverage

`npm run rig:certify` drives the high-strain matrix
(`src/rig/certificationMatrix.js`) through the real render paths in Chrome and
measures rendered transforms — proximal/distal anchor error, joint ink gaps,
pelvis depth order, facing bend-inversion, variant anchor drift, non-finite
transforms, and frame-to-frame continuity. Schema-level checks are not
sufficient here: they pass while the screen is wrong, which is how an
attachment solver that ignored every authored wrist and ankle anchor survived
205 unit tests and both rendered probes unchanged.

Each matrix entry declares which render path actually draws it. Coverage is
currently **16/17**; one entry still does not reach the modular rig:

| Entry | Drawn by |
| --- | --- |
| dropkick extension | `Wrestler._drawDropkickFront` — primitives, skeleton hidden |

This is reported as a **coverage gap**, never as a pass. Authoring a wrestling
move on a state in this table exercises no articulation guarantee at all —
there is no joint, no binding, and no part to measure.

### Grounded-state migration (2026-08-13)

`down`, `pinned` and `possum` previously hit `Wrestler._drawFlat`: two filled
rectangles and a circle, with `skeleton.setVisible(false)`. They now render
through `Skeleton.updateGrounded`, so they carry real joints, bindings and
parts and are certified like any other entry.

Lying flat and the get-up's first keyframe are the **same frozen pose object**
(`Skeleton.GROUNDED_FLAT`, shared by reference with `GETUP_POSES[0]`). That
shared pose is **prone (face down)**, not supine. This makes two guarantees
structural rather than tuned:

- `down` → `gettingUp` is now exactly 0px (re-measured 2026-08-17). It was
  previously a full representation change, from primitives to a skeleton.
- Editing the flat pose moves the lying pose and the get-up's opening frame
  together; they cannot drift apart.

The **other** end of the rise is not clean, and the 0px above must not be read
as covering it. Measured max per-joint jump from `GETUP_POSES` `t = 1.00` to
the first `updateUpright` frame (verification audit, 2026-08-17):

| character | max joint jump | joint |
| --- | --- | --- |
| Lou / Thesz | **35.19 px** | `nearAnkle` |
| George | **55.79 px** | `nearWrist` |

This is **not reflection residue** — it survives the removal of the on-back
mirror, and the get-up's own interior is smooth (dense 100-step sweep: median
per-step 2.36 px Lou / 1.70 px George, worst 5.08 / 3.78 px, and 2.35 / 1.68 px
across the old `ON_BACK_UNTIL_T` boundary, i.e. indistinguishable from the
median). It is a genuine pose/render-path mismatch between the final get-up
keyframe and `updateUpright`'s rest stance: **a visible pop at the hand-off
that still needs correction.** The keyframe comment in `Skeleton.GETUP_POSES`
carries the same numbers so the claim cannot drift from the measurement.

Measured cost: the `falling` → `down` boundary moved from 0px to 4.9px
(1.5px x, 4.6px y). `_drawFalling` collapses its head to exactly the mat line,
while the rig places it 4.6px above — the rig is the more correct of the two.
Rather than retune the falling constants to match, migrate `falling` onto the
rig; it is the next coverage gap after the dropkick.

`_drawFlat` is retained for the airborne and held paths that still use it
(`_drawClotheslineFall`, slam/piledriver holds).

#### Grounded wrestlers lie PRONE (2026-08-17)

Flat states and the whole get-up render **prone (face down)**. There is no
supine grounded pose, and nothing should claim otherwise.

An `onBack` render-time reflection (`_mirrorGroundedOnBack`) previously turned
them face-up, and it was **removed**, not tuned. It reflected every assembled
part across the mat axis — negating rotation, setting `flipY`, inverting
`originY` — and mirrored `jointAttachmentPoints`/`semanticAnchors` to match.
Every anchor therefore still coincided exactly with its parent joint, so the
certifier reported a clean pass on a body whose every face, boot, trunk, arm
and leg PNG was **literally upside down**. It reached the shipped game through
`down`, `pinned` and `possum`, and the early get-up frames.

The lesson generalises: **anchor coincidence proves parts are CONNECTED, not
that they are the right way up.** A reflection preserves every distance the
kernel measured. `certification.findReflectedParts` now fails any part
rendering with `flipY`, attributed `architecture` (no artwork can cause or fix
it), which reproduces as a hard `rig:certify` failure naming the exact slots
and states. `flipX` remains legitimate — it is how facing is mirrored.

Note `facing` cannot supply a supine pose either — measured on Lou, facing +1
and -1 are exact horizontal mirrors of each other and both land face-down. That
horizontal mirror is the lever a sideways roll will want; it is a different
axis.

**A real supine pose is authored joint angles plus back-facing torso/head art**
(the partVariants system can already carry the art). That is deliberately a
separate piece of design work, not a reflection.

### Grounded: open limitations

Four things are open on the grounded path. None is a regression; all are
honestly reported rather than papered over.

1. **Grounded children do not inherit torso orientation** — see below; the
   detail is worth keeping because the certifier still cannot see it.
2. **Get-up → upright handoff pops** — 35.19 px (Lou, `nearAnkle`) / 55.79 px
   (George, `nearWrist`), measured above. Not reflection residue.
3. **No supine, bridge or kneeling posture.** `down`, `pinned` and `possum`
   all render the one shared prone flat pose. `rig:certify` reports these as
   `postureGap` entries, so the coverage number cannot be read as more than it
   is. A real supine pose is authored joint angles plus back-facing torso/head
   art, not a reflection.
4. **Dropkick extension is a coverage gap** — `Wrestler._drawDropkickFront`
   draws primitives with the skeleton hidden, so coverage is 16/17 and that
   state exercises no articulation guarantee at all.

### Known next: grounded parts do not rotate with the torso

George's head visibly detaches when he goes down. It is NOT a position error —
his head anchor sits exactly on the neck joint (measured 0.00px). The head's
rotation stays 0 while the grounded torso rotates to -1.522, so the head renders
upright on a body lying flat.

Two things follow, and both are open:

1. `_applyGrounded` places grounded children at the right point without giving
   them the parent's orientation. Pre-existing — it affected the get-up before
   the grounded migration too.
2. **The certifier cannot see it.** Every structural invariant measures where a
   part sits, never how it is turned. An orientation invariant — a child's
   rotation must stay within tolerance of the relationship its parent implies —
   is the missing check, and it belongs in `src/rig/certification.js` beside
   `measureChain`. Adding it will fail the reference rig until (1) is fixed,
   which is correct: the reference rig is the control.

Ink probing runs at authored keyframes rather than every interpolated frame,
because keyframes are where the authored extremes live. Get-up is sampled at
49 points to stay at or below the 850 ms tween's real playback density; coarser
sampling makes ordinary motion register as a false discontinuity.
