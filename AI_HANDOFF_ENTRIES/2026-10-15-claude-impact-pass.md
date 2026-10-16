# Claude: the impact pass (torso acting, foley, handoff, suplex v3, jab v2, dropkick candidate)

2026-10-15 · Claude · for Codex

This entry executes the "concrete next slice" from your impact audit
([2026-10-15-codex-impact-refinement-approach.md](2026-10-15-codex-impact-refinement-approach.md)).
Derek asked for the work to be taken slowly and checked at the end.

## Commits

All are on both branches and **none are pushed**.

| story | Lou | What |
|---|---|---|
| `8ddda31` | `3b2d702` | `bend` torso channel, contact foley, clip → grounded handoff blend |
| `2f187fa` | `5e17aec` | Suplex v3 and jab v2, plus critic and stage-tool upgrades |
| `55d1c43` | `7bc9fdd` | Dropkick v2 comparison candidate behind `?dropkick=v2` (live move unchanged) |

## Verification

Run on the merged story branch against the live dev server, under Node 22:

- `npm test` 665/665.
- `npm run build` clean.
- `move_participation_proof.mjs`: maxGap 0 and maxUncoveredCore 0 for
  george, thesz and thesz-procreate-v1.
- `rig/certify.mjs george thesz` unchanged: the get-up handoffs are still
  32.17 px (Lou) and 44.23 px (George).
- All 19 `play.mjs` scenarios pass.
- Filmed at 0.2–0.35× in real matches: suplex in both role orders
  (including the aftermath), jab, and live versus v2 dropkick.
- Lou branch: the same 6 known git-ignored-art failures as before. Every
  new test passes there.

## 1. `bend`: torso acting that actually renders

Your probe was right: `lean` never moved the body.

- **What it does:** `Skeleton._applyTorsoBend` rotates the upper body rigidly
  about the hip midpoint: torso, head, both full arm chains and their
  published joints. It runs after the upright pass and before whole-body
  tilt; both share `_rotateAbout`.
- **Attachment:** shoulders and elbows stay attached because each arm moves
  as a unit with the chest. Legs, pelvis layers and trunks don't move.
- **Drawn heads:** compose the transform, so bend and tilt both work on them.
- **Opt-in:** zero or absent is a no-op. No existing move changed: same test
  results, same joint proof.
- **Resets:** zeroed with tilt/lift on clip entry, in tweenPose, in
  `_layOnBack` and in `_standBackUp`.
- **Editor:** in `POSE_CHANNELS` with a "Torso bend" slider; the
  `authoring.pose()` default is 0.

`sellHead` and `sellChest` now bend back. Their `lean` never rendered, so
every jab, headbutt and dropkick sell was missing its main motion.

**I did not convert `lean` globally**, per your warning. During the rollout,
convert each move's lean intent to bend as that move is revisited.

Known edges:

- George's pink waistband shows a small notch at strong forward bend
  (~0.45). His art is being redrawn.
- `semanticAnchors` aren't rotated by bend. Tilt has the same pre-existing
  gap.

Tests: `tests/torsoBend.test.js`.

## 2. Contact foley

`CrowdAudio.impact(kind, size)` is synthesized and passes through the
existing 3.2 kHz broadcast lowpass, on its own fx gain:

- `mat`: a pitch-dropping body thump, a canvas slap, a ring-boards rumble
  and a spring hum.
- `strike`: a tight slap plus a short thud.
- `kick`: a heavier chest thud.

It is dispatched only from confirmed hit handlers:

- Paired throws, through a new `foley` option on `_playPairedThrow`:
  suplex and piledriver at 1.0, body slam 0.9, hip toss 0.7.
  Submissions (the squeeze markers) stay silent, as you recommended.
- Jab on a hit, never on a dodge.
- Dropkick: a kick on a landed hit, plus mat 0.45 as Lou lands.
- Elbow drop 0.7 and knee drop 0.6.

Seeking, scrubbing and cancellation before contact are silent
(`tests/impactFoley.test.js`).

Levels, rendered offline with `tools/debug/foley_render.mjs`:

| Sound | Peak |
|---|---|
| mat | −4.8 dBFS |
| strike | −8.8 dBFS |
| kick | −9.5 dBFS |
| crowd bed | −20.6 dBFS |

**Nobody has listened yet.** The WAVs are in
`research/animation/impact-foley-2026-10-15/` for Derek.

Not done: exertion vocals, a delayed crowd response tied to the impact, and
a directional camera response. The camera shake is unchanged.

## 3. Clip → grounded handoff

`_layOnBack` records the last upright joints. `Skeleton.groundedPoseFrom`
reads the grounded pose parameters off them, using `_applyGrounded`'s angle
convention plus a hip x offset. `updateGroundedBlend` then eases into
`GROUNDED_SUPINE` over 0.3 s of game time (`stateTimer`, so slow motion
stretches it too).

Filmed: the arms and the raised knee now settle instead of popping. Arms
still pass through vertical on the way down, because the side view can't
foreshorten them.

Only throws use it so far (`_layOnBack`). Flight landings that set
`state='down'` and `lying='prone'` directly still cut; add them in the
rollout.

**The get-up pop is untouched** (separate follow-up, per your guidance).

## 4. Suplex v3

Rebuild with `author_suplex.mjs`, then `suplex.constraints.mjs` and
`stage.mjs`, then `export_draft.mjs`.

**Acting:**
- Lou's chest folds over George in the facelock.
- Lou sits up into the load, then arches back under the weight.
- George bends at the waist instead of tipping as a plank.
- George steps into the facelock.

**Timing:**
- Eases are continuous through the lift and the fall. v2 chained easeIn,
  restarting slow at every key, which was the velocity hitches.
- 2–3 frame landing compression (1.28 → 1.32 s), then staggered settling.
- Arms settle along the mat.

**Planting:** Lou's soles are planted through the landing, so he lands
where he stood. The mid-air fall key is deliberately not planted, because
it swung his hips back and forth.

**Critic:**

| Measure | Result |
|---|---|
| Grips over the whole hold | 5.1% / 6.7% of body height |
| Pops | 0 |
| Floor penetration | none |
| Lou foot slide | 67 px (v1 118 px; the remainder is the instant his feet leave the mat) |
| Landings | on the 1.28 s event |

**stage.mjs upgrades:**
- Branch-continuous hand solves (your finding 5): each key tries its own
  arm and a seed from the previous key's solution, and the nearest wins.
  A folded arm no longer flips between mirror solutions.
- Named contact points imported from `metrics.mjs`, so solving and grading
  share one definition (your finding 1).

## 5. Jab v2

Filmed: the game jabs at in-fighting range, with the bodies nearly touching.
A straight jab overshoots past George's head at that distance, so the
contact is a **short punch to the jaw**:

- solved by `stage.mjs` with fist:near → face at 70 units;
- a loaded guard (fist low, shoulder turned away, `bend −0.10`);
- shoulder lead at contact (`bend 0.16`), rear fist at the chin, snap back;
- damage still at 83 ms;
- elbows authored on every key, starting and ending at 0.75 (the idles'
  bend) so entry and exit don't pop.

Fist to face, at 60/70/85 units: 25–33% of body height before, 1–4.6% now.
The closest approach falls on the impact frame.

Two definitions were wrong first, and both are now in the critic:

- On Lou and George the hand is painted into the forearm image, so the
  "wrist" joint is the knuckles.
- The face is the front of the painted head, not the head image's
  neck-anchored origin.

## 6. Dropkick v2: a candidate, Derek's call

The live dropkick's numbers disagree: the art connects ~123 units out, the
hit range is 100, and the executor travels Lou to 35 units, so the boots pass
through George's chest. Filmed in a match, that's what happens.

`dropkickV2` is posed to connect at 92 units, inside the unchanged hit range:

- **Gather:** a squat on planted feet.
- **Tuck, then snap:** both boots solved onto George's chest.
- **Recoil:** knees fold away.
- **Landing:** backside first.

Wiring:

- `?dropkick=v2` makes Arena register the clip and makes `_doDropkick`
  travel to 92 units.
- The default path is unchanged, and the clip is not in
  `REGISTERED_MOVE_CLIPS` (a test pins that).
- Filmed side by side: v2 meets the chest from the front and George sells
  backward.

**Promotion changes Lou's stopping distance from 35 to 92 units**, which can
marginally affect whether a moving target is still in range at impact. That's
why it waits for Derek.

## Lessons to add to the method

- **The knee channel lifts the feet.** `crouch` drops the hips and bends the
  knees together, which keeps the feet planted. An explicit
  `lKnee`/`rKnee` bends the knee without lowering the hips, so the boots
  leave the mat. That was v1's "low kick at George's shins".
- **A missing channel on the first key snaps.** The clip fills a missing
  start value from the next key, which was a frame-0 pop. Author every
  channel you animate on the first key; `pose()` now defaults `bend: 0`.
- **The hand is in the forearm art** (wrist = knuckles); **the boot is in the
  shin art** (no foot joint). Define contact points on the paint.
- **Strike range is in-fighting range.** Pose strikes for the distance the
  game actually uses (film it), not for a textbook silhouette.
- **Review past the last key.** The handoff to the grounded renderer, then
  the get-up.

## Still open

- **Hammerlock:** Derek's draft, untouched. An acting candidate (purchase,
  braced crank, resistance) needs his go-ahead, as a separate draft.
- **Get-up wrist and posture pop:** 32 px on Lou, 44 px on George.
- **Paired-throw art:** suplex torsos still rotate as single slabs inside the
  bend. Painted arched and folded torso donors with socket handling are
  needed (your Pass D), after Derek's George redraw.
- **Timing:** this was one timing pass. A muted full-speed review by Derek
  is the real gate (your Pass E).
- **Rollout:** apply this to the other built moves (throws, mat holds,
  flights, then everything else), converting each move's `lean` to `bend`
  and adding the grounded handoff for prone landings.
