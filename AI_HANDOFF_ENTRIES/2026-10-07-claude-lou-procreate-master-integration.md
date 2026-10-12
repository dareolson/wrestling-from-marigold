# 2026-10-07 — Derek's Procreate master, bound as `thesz-procreate-v1`

Execution of `AI_HANDOFF_ENTRIES/2026-10-07-claude-integrate-lou-procreate-master.md`.
**Status: READY FOR DEREK VISUAL REVIEW.** Production promotion intentionally
not performed. Nothing committed.

## The PSD is untouched

`sha256 41a6af6469e650ab4e55ab0fc8caf4cc7a998fa99fd3dd6929d1f129d8a8b3bb`,
verified before reading and again after all work. Both provenance PNGs
unchanged. `git status --porcelain src/assets/wrestlers/thesz/` and
`src/characters/thesz.js` both return **0**.

## What Derek delivered

Nine art layers plus a hidden `Background`, every one full-canvas aligned at a
common origin, no masks, no groups, 100% opacity, `norm` blend. That is the
interchange contract `CHARACTER_ART_RECOVERY_AUDIT.md` asks for, delivered
exactly. Full inventory and alpha measurements:
`procreate-masters/2026-10-06-imagegen-cohesive-v1/LAYER_INVENTORY.md`.

**Six layers map onto shipped Lou's exact six-part contract with no renderer
change**: `Head`, `Torso` (headless, trunks included), `R Upper Arm`,
`R Lower Arm` (fist baked), `R Upper Leg`, `R Lower Leg` (boot baked).
`L Arm` is a whole shoulder-to-fist limb and is deliberately NOT wired — the rig
articulates the elbow and no offset bends one painting in the middle. The far
thigh and far shin stay donor material because the rig shares those families.

No PSD reader was installed. `psd-tools`, ImageMagick and `ag-psd` are all
absent; PIL reads layer names but returns empty tiles for 7 of 10 layers. Layers
were read with a dependency-free parser of the PSD layer records, preserved at
`tools/wrestler-cutter/psd-layer-reader.py`. All 10 layers decoded all 4
channels; nothing was flattened.

## Two deterministic corrections, both recorded

1. **Alpha floor 15 + largest connected component.** The paint is 93.1%
   effectively opaque; the README's "aura" is the alpha 1-15 band, 3.8% of ink.
   Each layer also carries a few 1-14px brush specks — 114px in 23 components
   across nine layers — which inflate each part's bbox and so corrupt every
   fractional anchor derived from it.
2. **Each limb rotated about its own proximal joint onto a neutral bone axis.**
   As delivered: upper arm **21.2°**, forearm 8.4°, thigh 7.0°, shin 4.3°,
   against a 3° threshold. Residual after rotation is 0.00° on every bone except
   the forearm (0.56°, measured on fist ink — no declared wrist) and the shin,
   whose knee→sole reads 7.38° because the boot toe juts forward of the ankle:
   the documented booted-shin effect. Its knee→ankle **bone** is straight.

Derek approved the rotation before it was bound.

## Three bugs found

1. **`straighten-limb-bake.mjs` cannot straighten any ankle-mode part.** The
   loop transports `distalAnchorFrac` and `soleAnchorFrac` through the rotation
   but never `sourcePixel`, which is what `ankle` mode measures, so the residual
   never changes and it throws. Hidden until now because no shin had previously
   exceeded the 3° threshold. Worked around, not patched.
2. **`headAnchorFrac` without `neckInTorso` makes `head.y` NaN.** `Skeleton.js`
   assigns `_headHidePx` only when neither flag is declared (`:414-418`), but the
   non-`neckInTorso` branch at `:1669` computes `anchorY` from it regardless.
   `rig:certify` caught it: 820 runtime-transport findings, nonfinite-transform
   at `head.y` and `joints.neck` in every pose and both facings. `neckInTorso`'s
   name is misleading — what it *does* is anchor the head at the torso's neck
   socket, which is correct for this art even though the torso bakes no neck.
   Pinned by a test so it cannot regress.
3. **`rig:certify` resolves a character as `module[characterId]` by FILENAME**
   (`certify.mjs:191`), so a camelCase export is uncertifiable. This is why
   `thesz_front3q_r1` never was. A one-line snake_case alias unlocks it; the
   candidate is still NOT added to `certify.mjs`'s default list.

## Anchors

Measured from Derek's art, never inherited. Elbow, knee, hip and neck are the
centroid of the two parts' own overlap — those pairs touch only at that joint.
**The shoulder is not**: a hanging arm overlaps the torso along most of its
length, so that centroid is lateral adjacency, not a socket. Taken as the
proximal cap centre instead. Boxes follow `RIG_AND_MOVE_PIPELINE.md`'s growth
arithmetic against the skeleton's own bone spans; the derived shin box (39×90)
lands close to shipped Lou's (47×86), an independent sanity check.

All candidate-only screen offsets are **zero**. None was tuned.

## Verification

| command | result |
| --- | --- |
| `npm test` | **554/554**, 0 skipped (544 + 10 new) |
| live match, candidate + control | 0 non-finite samples, 0 missing textures, both facings, 12-14 states |
| `npm run build` | clean |
| `npm run rig:validate` | `thesz-procreate-v1: rig contract valid (6 textures)`; george/thesz/front3q-r1 unchanged |
| `node tools/rig/certify.mjs thesz_procreate_v1` | **516 rendered frames**, UNVERIFIED (10 chains unmeasurable) — identical to shipped `thesz`, i.e. parity. `refrig` CERTIFIED, so the run is trustworthy. Exit 0. |

Evidence: `procreate-masters/2026-10-06-imagegen-cohesive-v1/evidence-v1/`.

## Tuned against live screenshots

The first binding passed every mechanical check and still read wrong on screen.
Two errors, both in the derivation, neither in the art:

- **`box.w`.** Shipped Lou's part canvases carry wide empty margins (ink fills
  0.47-0.75 of canvas width); these crops are tight (0.93-0.96). `box.w` maps the
  whole CANVAS to the rendered width, so an equally-sized box renders a tight
  crop's ink much wider. The upper arm came out **1.49x** shipped Lou's on-screen
  ink width and became a mass that covered the head overhead; the thigh was
  0.70x and too thin. Now solved for on-screen ink:
  `box.w = target / (growth * inkFill)` against shipped Lou's widths, which are
  known good against this skeleton's fixed bone lengths. This is exactly the
  failure `RIG_AND_MOVE_PIPELINE.md` warns of.
- **`headScale`.** Derived by scaling shipped Lou's 0.65 by the art's
  head-ink/torso-height ratio, which double-counts — the rig already sizes the
  head from the torso. Rendered ~1.3x too small, sunk into the shoulders. Now
  solved on head ink fill: `0.65 * 0.745/0.939 = 0.5157`.

No joint moved; these are width and scale only. Before/after/shipped triptych:
`tools/debug/shots/procreate-v1-tuned/before-after-shipped.png`.

## A real match was played

`tools/debug/live_match_check.mjs` (new) drives an actual AI-vs-AI match in
Chrome and samples the live skeleton. Both sides default to keyboard, so the
match is two men standing still until `1` and `2` hand each side to its
`AIHandler` — without that the harness reports a clean run that never happened.

| run | events | states | facings | non-finite / missing texture | page errors |
| --- | ---: | --- | --- | ---: | ---: |
| candidate r1 | 67 | 12 incl. down, gettingUp, slamming, holding | both, both sides | **0** | 1 (see below) |
| candidate r2 | 55 | — | both, both sides | **0** | **0** |
| shipped `thesz` control | 83 | 14 | both, both sides | **0** | **0** |

**Not attributable to the candidate:** one run threw `facing must be 1 or -1`
(`src/rig/twoAnchorBinding.js:33`). `facing` transiently reaches **0** in the
control run too, so this is a pre-existing race — a binding call landing on the
frame where facing passes through zero. It surfaced once in three runs and did
not reproduce. Flagged, not fixed, not caused here.

Shots: `tools/debug/shots/live-match/` (+ `-control`, `-r2`).

## Procreate correction list

1. **The torso has no rounded opaque underbody behind the thighs.** Shipped
   Lou's torso has a clear bulge below the trunks; this one is scalloped to the
   leg silhouette with nothing behind it. At the game's real hip range
   (−30°…+98.5°, read from the pose tables) no background opened, so it is not
   blocking — but it is thinner than shipped Lou and shows in abduction poses.
   See `evidence-v1/shipped-vs-candidate-parts.png`.
2. **The far/right hand's fingers**, as the PSD README already flags.
3. **Limbs drawn on straight vertical axes** would remove the straightening step
   entirely.

## Removal

Delete `src/characters/thesz_procreate_v1.js`,
`src/assets/wrestlers/thesz-procreate-v1/`, the two lines in
`tools/rig/validate-character-rigs.mjs`, and the import + `CHARACTERS` entry +
`PRESETS` block in `src/scenes/Arena.js`. Nothing else references it.
