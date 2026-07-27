# Claude Task — George v9 Broadcast-Optimized Runtime Candidate

## Authority and objective

Derek is not yet convinced that the new modular George looks better than the
shipped George. The immediate problem is that v8's fine lines break up under
runtime minification and the screen-space scanline overlay.

Create one isolated **downsample-only** candidate from the current
`george-ai-pilot-v8` assets and present a controlled old-vs-v8-vs-v9 visual
comparison. This task is diagnostic and reversible. It is not permission to
redesign George, generate new artwork, reinforce ink, retune the rig, or adopt
the candidate.

The current run ends after Phase A screenshots and Derek's review. Do not begin
an ink-reinforcement or posterization pass unless Derek explicitly authorizes a
follow-up after seeing Phase A.

## Why this task exists

- Shipped `george/torso.png` is 190x260 and renders at about 78x106 world units
  before character/depth scaling: roughly 2.4x source minification.
- v8 `torso.png` is 619x910 and renders at about 78x126.616 world units before
  character/depth scaling: roughly 7-8x source minification.
- Several v8 interior strokes therefore become substantially less than one
  screen pixel after character scale, ring-depth scale, rotation, and GPU
  sampling.
- `Arena.createScanlines()` then places a black row on every other screen row
  at alpha 0.18. The scanlines expose already-fragile subpixel strokes; passing
  rig audits says nothing about this presentation failure.

The first question is narrowly: **does high-quality offline minification to a
runtime-appropriate raster make the same approved v8 artwork read better?**

## Frozen baseline

Treat the exact v8 files present at task start as immutable inputs. Record their
checksums before doing anything. Do not rerun any old v8 preparation/correction
script against them.

Freeze all of the following:

- shipped `src/assets/wrestlers/george/` and `src/characters/george.js`
- `src/assets/wrestlers/george-ai-pilot-v8/`
- `src/characters/george_ai_pilot_v8.js`
- `src/Skeleton.js`
- `src/Wrestler.js`
- all poses, sockets, anchors, pivots, boxes, scales, offsets, grounding, and
  depth order
- the scanline implementation and alpha
- the current trunks, neck, shoulder, proportions, likeness, colors, shading,
  and silhouettes
- `AI_HANDOFF.md` and `AI_HANDOFF_TASKS.json` until Derek approves a result

Do not image-generate anything. Do not edit visible anatomy. Do not remove,
redraw, thicken, thin, inpaint, posterize, quantize, sharpen, or recolor any
line during Phase A.

## File allowlist

You may create or modify only:

- a new deterministic processor at
  `tools/wrestler-cutter/prepare_george_v9_broadcast.mjs`
- a new asset directory
  `src/assets/wrestlers/george-ai-pilot-v9-broadcast/`
- a new character config
  `src/characters/george_ai_pilot_v9_broadcast.js`
- the minimum import/preload/preset wiring in `src/scenes/Arena.js`
- a new comparison tool under `tools/debug/`
- new screenshots/reports under `tools/debug/shots/george-v9-broadcast/`

If another file appears necessary, stop and report why. Do not modify it.

## Phase 0 — establish an honest baseline

Before creating v9:

1. Record `git status` and SHA checksums for every v8 runtime PNG.
2. Measure each v8 part's actual maximum on-screen rendered bounds at the near,
   middle, and far ring depths. Do not guess from config boxes alone; include
   `heightScale`, perspective/depth scale, and any near/far scale.
3. Capture old George and v8 under identical conditions:
   - same wrestler slot and screen position;
   - both facings;
   - near, middle, and far ring depths;
   - idle, walking stride, overhead arm pose, and one deep elbow/knee pose;
   - scanlines on and scanlines hidden.
4. Hide scanlines only inside the comparison script by finding/hiding the
   display object using the `scanlines` texture. Do not add a production query
   flag or edit `Arena.createScanlines()`.

## Phase A — downsample only

Create `george-ai-pilot-v9-broadcast` as a byte-independent derivative of the
frozen v8 PNGs.

Processing rules:

1. For each part, choose an output raster approximately **2x the measured
   maximum on-screen bounds** from Phase 0. Retain enough oversampling for
   rotation while avoiding v8's current 7-8x minification. Record the measured
   bound, chosen output dimensions, and ratio in a machine-readable report.
2. Preserve each source PNG's aspect ratio exactly. Resize width and height by
   one uniform factor; do not stretch to match the runtime display box.
3. Use one documented high-quality premultiplied-alpha downsampling method
   (Lanczos or equivalent). RGB must be resampled in premultiplied-alpha space
   so transparent-edge color cannot create halos.
4. Do not crop, repad, rotate, flip, or move content. The full source canvas
   maps to the full output canvas.
5. Preserve normalized anchors, sockets, pivots, sole anchors, distal anchors,
   display boxes, character scale, and every other numeric v8 value exactly.
   The v9 character config should inherit v8 and change only `id` and texture
   keys.
6. Keep torso and pelvis-overlay output canvases identically registered. Since
   they share one source canvas and runtime box contract, they must use the same
   output dimensions and transform.
7. Do not apply sharpening, thresholding, morphology, dilation, erosion,
   posterization, denoising, contrast adjustment, or selective line work.
   Phase A isolates downsampling and nothing else.

The processor must be deterministic and refuse to overwrite its frozen v8
inputs. Re-running it should reproduce identical v9 output checksums.

## Phase A verification

Verify mechanically before screenshots:

- all expected PNGs exist and retain alpha;
- every v9 normalized alpha/content position matches v8 within resampling
  tolerance;
- no output has an opaque or colored transparent fringe;
- torso and pelvis overlay remain identically registered;
- v9 config differs from v8 only in id/texture keys;
- joint, socket, pose, and world-space transforms are numerically identical to
  v8 in matching frames;
- a second processor run produces identical checksums.

Do not run the entire game test/audit suite yet. A clean build and a focused
runtime smoke check are enough before Derek's visual gate.

## Required comparison deliverable

Produce a labeled three-column matrix:

```text
shipped George | unchanged v8 | v9 downsample-only
```

For each required pose/depth/facing, provide:

- scanlines on;
- scanlines hidden;
- actual gameplay scale without camera zoom;
- a nearest-neighbor enlarged crop for inspection, clearly labeled as an
  enlargement and never substituted for the gameplay-scale view.

Also provide a concise report containing:

- source and output dimensions per part;
- observed maximum screen bounds per part;
- exact filter and alpha method;
- v8 and v9 checksums;
- any line that improved, degraded, or disappeared.

Do not describe v9 as better or approved. Present the evidence and stop.

## Hard stop

After the Phase A matrix is ready:

- stop for Derek's visual decision;
- do not thicken or redraw lines;
- do not flatten gradients;
- do not make a Phase B candidate;
- do not modify v8 or shipped George;
- do not update the handoff/task ledger;
- do not run the full suite;
- do not commit, push, or adopt v9.

If Phase A is rejected, preserve its evidence and wait. The next decision will
be one of:

1. authorize a separately versioned, tightly bounded broadcast-ink treatment;
2. retain old George;
3. begin a new cohesive full-body-master workflow.

Generating body parts independently is explicitly not an allowed fallback.

## Acceptance condition

This task is complete only when the comparison matrix and report exist and
Derek has reviewed them. Visual approval—not rig audits, successful processing,
or Claude's judgment—determines whether any next phase is authorized.
