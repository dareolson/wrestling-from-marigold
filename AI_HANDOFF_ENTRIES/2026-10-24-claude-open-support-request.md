# Request to Codex: Lou far-forearm support hand (`support` variant)

2026-10-24 · Claude (session 2 of [PLAN_SUPLEX_RISE.md](../PLAN_SUPLEX_RISE.md)) · for Codex review under the
[asset request protocol](2026-10-23-codex-performance-and-asset-brief.md#claude--codex-asset-request-protocol).

**ON HOLD (Derek 2026-10-24: plant parked; do not generate).** Original note: hold generation until Derek answers the gate below.** The request is complete, but the
measurements in section 1 say the painted hand would be mostly hidden at the current plant point.
Codex owns art and the review; this entry records numbers, not a verdict on the pose.

## 0. Status of the runtime hook

`?sellart=v1` now plants Lou's far **wrist** during the supine back rise (commits `946254c`, `d1c91b7`).
It is a geometry prototype: it holds the wrist, not painted pixels. The runtime already reads an
optional `semanticAnchors.support` on whatever far-forearm image is active (`Skeleton.updateGroundedReach`,
point-target entries) and falls back to the wrist when none exists. Nothing registers `support` yet, and
no support variant is selected anywhere. Selection wiring (`backRiseParts` in `src/animation/sellAppearance.js`,
gated on the plant weight, released by `setPartVariants({})` like the grip) is mine after the art exists.

## 1. Gate for Derek (measured, both facings, Procreate Lou)

| Measurement | Value | Source |
|---|---|---|
| Far-arm pixels that change the finished picture, base rise at t = .12 / .248 / .325 | 21–31 / 253–362 / 284–406 | `plant/crops/far-arm-visibility.json` |
| Same, planted | 31–32 / 32 / 32 | same |
| Plant point, relative to the hip root | 5.76 px toward facing (scale .764), on the mat line | `rise-planted-sweep.json` `plan` |
| Base wrist vs plant point at t = .24 / .32 | 28.8 / 48.9 px further back (toward the head) | sweeps |
| Time the plant is held (riseT .17 → .325) | 287 → 403 ms after rise start, i.e. 116 ms; arrival from .12 (242 ms) and release to ~.405 (456 ms) | film `plant/film/on/suplexReverse/manifest.json` |
| Far arm geometry in the window | elbow flex 22.9–34.9° (positive = anatomical), shoulder–wrist 95.4–98.0 % of lu+lf | `plant-metrics.json` |

Why the plant sits there: the authored far arm is already ~straight (reach 98.9–100 % of lu+lf at every
t), so a fixed point is reachable for only ~0.22 of rise progress, and only if it is the wrist's t = .12
position. A plant further back (where the base keypose has the hand "behind the hips") is not
reachable from the base shoulder path. Moving it means a different rise keypose, which is Derek's
choreography call, not mine.

Questions for Derek before art is generated:
1. Is a ~116 ms planted hand (plus ~215 ms of arrival/release) worth a dedicated `support` donor?
2. Should the plant sit further back, behind the hips (needs a revised supine rise keypose)? If so,
   the contact patch below moves with it; the art request does not change, the verification does.

## 2. Request fields (protocol)

- **Rig / slot / side / view:** `thesz-procreate-v1`, far arm, slot `farForearm`, side-on view (same as
  the current texture). New variant name: `support` (proposed key `thesz_pv1_far_forearm_support`,
  proposed file `far_forearm_support.png`, under `variants.forearm.support` in
  `src/characters/thesz_procreate_v1.js`, next to `grip`). Hand is painted into the forearm
  (`handInForearm: true`), so the variant replaces the whole forearm texture.
- **Move / phase / time:** suplex receiver, supine back rise (`lying = 'supine'`, `_pain.part = 'back'`),
  riseT .12 (arrival start), .248 (mid-plant), .325 (tLift); both facings. In the stepped film
  (`plant/film/on/suplexReverse`, facing −1, and `suplexReverseFlip`, facing +1) riseT .12 / .248 / .325
  fall 242 / 349 / 403 ms after rise start (rise start = 5516.67 ms after impact, standing 6550 ms).
- **Current stills (game scale 1× and 3× crops, base left / planted right, wrist marked red, plant point
  green):** `research/animation/suplex-rise-2026-10/plant/crops/`
  `plant-{t0,mid}-f{right,left}-1x-game.png` and `plant-{t0,mid,tLift}-f{right,left}-3x.png`.
- **Existing source PNG:** `src/assets/wrestlers/thesz-procreate-v1/far_forearm.png`, **117×351 RGBA**,
  sha256 `411610be49896da6692fee31176835c1d5215c52c8ef0ddb922374b5f3427131` (palm-side fist, donor
  palm-donor-v3). Related, same canvas: `forearm.png` `d2735a0d…16f2f7`, `forearm_grip.png`
  `e14ed4d0415aa151e01ecde6dc110fad0eb849a2ebc71eaf8222c06d9a49208a`. Preserve the original file; the
  variant is a new file. Alpha bounding box of the source: x 5–111, y 2–343.
- **Registration (from `thesz_procreate_v1.js`, measured on the live rig):** box 23.003 × 69.008,
  `jointPivotFrac` .116194, `pivotOffsetFrac` −.012388. Logical elbow lands at **u .4891, v .1162**
  (≈ 57.2, 40.8 px), logical wrist endpoint at **u .4891, v .8867** (≈ 57.2, 311.2 px), both facings
  (`plant/crops/far-forearm-registration.json`). The wrist endpoint is a rig joint, not a painted
  crease; the fist extends past it (alpha to y = 343, v .977, ≈ 4.6 game px at scale .764). Annotate the
  painted wrist crease on the source before generating; I have not invented one.
- **Contact patch:** the flat of the palm heel plus finger pads, to be marked as
  `semanticAnchors.support: { u, v }` on the normalized canvas, with the patch extent recorded in the
  donor README. Target surface: the mat line (root y). At the plant the forearm axis (elbow → wrist) runs
  about 44° below horizontal at t = .12–.248 and 59° at tLift (screen angle, y down, facing +1; mirrored
  for −1), so the palm must present toward the mat at that angle, not straight down.
- **Overlap order:** far forearm stays behind the torso and the near thigh, as now. The patch must still
  read where the arm passes behind the thigh or hip; see the visibility numbers, since at the current
  plant point only ~32 px (1×) of the far arm is visible.
- **Why posing / IK / layer order cannot fix it:** the base far hand is a closed palm-side fist
  (`far_forearm.png`), with no flat bearing surface. Planting the wrist on the mat (done, slide ≤ 0.04 px)
  leaves a fist under it. IK cannot change the painted hand, and the grip donor is a cupped clutch hand
  built for the near arm. Layer order does not change the far-arm visibility numbers above.
- **Output path:** `research/art/lou-support-2026-10-xx/` with donor, prompt, README, hashes; normalized
  runtime candidate named above. Existing `research/art/lou-open-palm-2026-10-24/open-palm-donor-v2.png`
  (724×2172, sha256 `c434cee270e9396c5f8156fc15fe6df879e75d741204f5e94ddf286908fe0d1b`) is starting
  material only. Repeat the README warning: **no uniform rescale onto 117×351**; the generator changed
  forearm-to-hand proportions and would shorten the elbow–wrist span (measured 39.07 game px at scale
  .764 on the live rig). Normalize against the elbow/wrist geometry above, or harvest the hand only.
- **Selection / reset:** `farForearm: 'support'` selected while the plant weight is > 0, released by
  `setPartVariants({})` on interruption (state leaves `gettingUp`, `_activeMove`, choreo, `_backRiseContext()`
  null). No grip-to-fist-to-grip flicker rule applies (different slot), but the same ≤ 100 ms hysteresis
  idea will be used if the art swaps by measured contact.
- **A/B requirement:** same-scale base vs `support` on the actual rig, both facings, including the
  transitional frames: arrival (riseT .12–.17), hold (.17–.325) and release (.325–.405). My side:
  `tools/debug/sell_art_plant_crops.mjs` and `tools/debug/plant_metrics.mjs` regenerate the stills and
  metrics; after registration I re-run them and measure the painted `support` patch against the mat line
  instead of the wrist.

## 3. Not claimed

The wrist plant is a geometry prototype. Nothing here shows a hand bearing weight, a palm touching the mat,
or acting quality; Derek judges pictures. George, figure four, the hammerlock and the prone rise are not
touched. Everything stays behind `?sellart=v1`.

## 4. Regenerate the evidence

Node 22, dev server on 5173, `WFM_PROCREATE=1`:
`node tools/debug/sell_art_rise_measure.mjs base|planted|world-parts`,
`node tools/debug/sell_art_plant_crops.mjs`,
`node tools/debug/aftermath_film.mjs suplexReverse on research/animation/suplex-rise-2026-10/plant/film` (+ `suplexReverseFlip`),
`node tools/debug/plant_metrics.mjs`.
