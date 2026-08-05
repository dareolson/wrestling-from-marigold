# Arena Lighting and Depth Concepts

**Status:** Round 3 of the first lighting experiment IMPLEMENTED (2026-08-05,
Claude, per Derek's visual verdict on round 2) and awaiting Derek's
screenshot review — see "Implementation record, round 3" below. Not approved
as final; nothing beyond this slice has been started. All other concepts
remain explicitly backburnered.
**Purpose:** Explore ways to add depth, spectacle, and period atmosphere to the
arena without weakening wrestler readability or the 1940s–50s broadcast identity.

## Implementation record, round 3 — 2026-08-05 (Claude)

Derek's round-2 verdict, live in-browser: an unwanted glowing "orb" at ring
center; the lighting "underwhelming" and "feels composited over the scene
rather than interacting with it"; rope shadows "dramatically too thick."
Three targeted fixes, no new effects added and nothing from the backlog
below pulled forward:

**1. Orb eliminated — mat pool rebuilt as a single gradient texture.**
Round 1/2's mat pool drew 14 concentric normal-blended ellipses,
biggest/faintest first, smallest/brightest last. That construction always
recomposites a small bright core at the shared center point no matter how
low `peakAlpha` goes — lowering alpha dims the whole pool but can't remove
the re-compositing itself. Replaced with `ensureGlowTexture` in
`arenaLighting.js`: one 256px canvas radial gradient (flat plateau to 55%
of the radius, one continuous falloff to fully transparent at the edge,
generated once and cached on the texture manager), drawn as a single tinted/
non-uniformly-scaled Image (`createMatLightPool`) instead of a Graphics
fill. Same depth/mask/color/size as before (`MAT_POOL` unchanged except
`peakAlpha` 0.1 → 0.16, tuned after the orb was gone rather than before).

**2. Beams now have a visible effect on the environment.** Previously three
additive polygons sitting on top of the scene with no consequence beyond
their own shape. Added, all in `arenaLighting.js`:
- `beamInfluenceAt(x, y)` — a shared 0..1 influence field reusing each
  beam's own centerline/half-width/length-alpha-taper math (no new
  geometry). `Arena.js`'s `_scheduleDustMote` samples it once at spawn and
  brightens that mote's peak alpha when it starts inside a shaft — see
  `11_dust_in_beam_crop.png`, a mote caught mid-shaft at alpha ~0.44 versus
  the ~0.1-0.2 ambient baseline.
- `createBeamSpill` — a restrained, additive glow (same shared glow
  texture as the mat pool, tinted `BEAM_COLOR`) at the point each beam
  crosses `BEAM_SPILL_Y` (mid-crowd band), so the crowd/haze directly
  behind the ring visibly brightens in the same three columns the shafts
  occupy, instead of the beams reading as separate from the background.
- `BEAM_PEAK_ALPHA` raised 0.075 → 0.13, judged from post-processed
  screenshots (scanlines/grain/vignette/smoke all applied via the scene's
  own pipeline, not raw Graphics output) against the round-2 baseline —
  see `02_lighting_idle.png` vs. `01_baseline_idle.png`.
- Mat/beam alignment: unchanged, already correct — the center beam's
  `toX: 480` already matches `MAT_POOL.x: 480`.

**3. Rope shadows rebuilt to hard-line thickness.** Round 2's bands
(`halfW` 6-9, plus a 1.8x-wider halo pass) rendered as ~12-32px stripes —
nowhere near "hard overhead shadow." A hard light source casts a shadow
close to the width of the thing casting it, so `ROPE_SHADOW` in
`arenaLighting.js` now sizes each band's `halfW` to roughly match its own
rope's visible width (near ropes draw at halfW 2, far at halfW 1, side
ropes taper ~1.5→0.9 — see `_updateRopes`'s `fillRibbon`/`fillRibbonBands`
calls): `near` halfW 9→2.2, `far` 6→1.3, `side` 8→1.7, with a new `taper`
function mirroring the visible side ropes' own perspective narrowing. The
1.8x-wider halo pass is gone, replaced with the same ~1px antialiasing
fringe the visible ropes themselves use (`drawBand` in `Arena.js`, reusing
`AA`). `spreadMul` — which widened every band under live sag/press — is 0
on all three bands: sag/bounce now only moves each band's centerline
(still anchored to the bottom rope's own live points, offset by `dx`/`dy`,
unchanged from round 2), never inflates its width — verified against
`04_lighting_rope_bounce.png` (far/side bands stay hairline-thin through
an active bounce) and, at an exaggerated diagnostic alpha (0.9 on all three
bands, reverted after capture), `06_ropeshadow_clip_boundary_boosted.png` —
which now shows thin hairlines tight to each rope and to the mat's own
clip boundary, in contrast to round 2's same diagnostic view showing a
solid black rectangle.

| Band | dy | dx | halfW | alpha | spreadMul | taper |
|---|---:|---:|---:|---:|---:|---|
| near | 12px | 0 | 2.2 | 0.40 | 0 | — |
| far | 70px | 0 | 1.3 | 0.35 | 0 | — |
| side (×2, dx signed) | 10px | 6px | 1.7 | 0.38 | 0 | `1 - 0.4t` |

Alpha raised from round 2 (0.10-0.16 → 0.35-0.40) since a thin line needs
more contrast than a wide band to read as a hard shadow at all — judged
against `08_near_rope_crop.png`/`09_far_rope_crop.png`/
`10_side_rope_crop.png`, each showing the shadow directly beside its rope
for a thickness comparison.

### Screenshots

`ARENA_LIGHTING_EVIDENCE/` at the repo root, all committed. The five
round-1/2 frames re-captured against round-3 code
(`01_baseline_idle.png`…`05_lighting_roles_swapped.png`, unchanged
filenames/scenarios), plus six new frames added this round:
`06_ropeshadow_clip_boundary_boosted.png` (diagnostic, exaggerated alpha —
see item 3 above, not representative of shipped alpha),
`07_mat_center_crop.png` (tight crop on the mat center — no orb, no
bullseye, no ring-stepping), `08_near_rope_crop.png` /
`09_far_rope_crop.png` / `10_side_rope_crop.png` (rope-vs-shadow thickness
comparisons, one per side), and `11_dust_in_beam_crop.png` (a dust mote
caught mid-beam, found by polling live mote alpha rather than a fixed
timestamp, since spawn position/timing is randomized). Generated by
`tools/debug/arena_lighting_comparison_shots.mjs`, extended this round with
a `crop()` helper (game-space → screenshot-space via the harness's FIT-mode
scale factor) and the mote-polling step; `tools/debug/harness.mjs`'s
`screenshot()` gained an optional `clip` parameter to support it.

### Verification run

`npm test` (113/113), `npm run rig:validate` (george + thesz both valid),
`npm run build` (clean), `npm run debug:play -- hammerlock` (PASS),
`npm run debug:play -- hammerlockReverse` (PASS) — Node 22.23.1. No
gameplay code was touched (purely additive/replaced visual layers).

### What remains visually uncertain (for Derek's review)

- Beam alpha (0.13) and the mat pool's `peakAlpha` (0.16) are still tuned
  by feel against screenshots, not a hard measured target.
- The dust-beam interaction is a per-spawn alpha boost, not a continuous
  per-frame effect — a mote that drifts into a beam mid-life won't
  brighten, and one that drifts out won't dim. Acceptable for the ~50px
  drift range motes actually cover, called out here in case a wider drift
  range is ever tuned in.
- Not tested against a full 8-minute real match (only scripted scenarios +
  idle/move snapshots), same caveat as rounds 1 and 2.

### Tuning / rollback

Same as rounds 1-2: every constant lives in `src/scenes/arenaLighting.js`,
grouped by effect (`MAT_POOL`, `BEAMS`/`BEAM_PEAK_ALPHA`/`BEAM_DEPTH`/
`BEAM_WAVE_AMPLITUDE`/`BEAM_SPILL_Y`/`BEAM_SPILL_ALPHA`, `ROPE_SHADOW`).
Quick A/B via `?lighting=0`; permanent disable by changing
`lightingEnabled()`'s default to `false`; reduce any one effect by editing
its constants directly.

## Implementation record, round 2 — 2026-08-05 (Claude, superseded above)

<details>
<summary>Fixture removal / beam softening / merged rope-shadow-band
implementation — kept for history; mat pool construction and rope-shadow
thickness were both reworked again in round 3 above. Not the current
behavior.</summary>

Derek's round-1 verdict: "it looks terrible" — the fixture sprites in
particular ("the fixtures are junk"). Codex proposed a physically better
rope-shadow model (three vertically-stacked ropes under a roughly-overhead
light source should project toward essentially the same ground line and
overlap into one soft band, not three separate offset stripes — the round-1
implementation drew three distinct stripes per side). Derek approved that
model and asked for this specific punch list, implemented in full:

- Fixture sprites removed entirely (art + `tools/arena-lighting-cutter/`
  deleted from the shipped build — both fully recoverable from git history
  at `ba00501`, the round-1 commit, if ever worth revisiting).
- Mat light pool: unchanged (round 1's "Mat light pool" design still
  applies — 14 concentric normal-blended ellipses, masked to the mat).
- Beams: reworked to have no equipment origin, softer edges, gentle wobble.
- Rope shadows: rebuilt from three per-rope stripes into one merged,
  irregular band per ring side, plus the previously-missing far-side band.

Code still lives in `src/scenes/arenaLighting.js` (tunables + pool/beam
draw helpers) plus `src/scenes/Arena.js` (`_setupArenaLighting`, the
merged-band rope-shadow pass inside `_updateRopes`). Same
`?lighting=0` dev toggle as round 1, unchanged — see round 1's own note
below for how it works.

### Beams (reworked)

`BEAMS` in `arenaLighting.js`: still three tapered soft cones, but with no
fixture to anchor to (`fromY: -60`, above the visible frame — alpha is
already ~0 there via the same length-wise `sin(π·t)` taper round 1 used, so
there's no visible point of origin) and two changes for softness: every
segment now draws a wide/faint halo pass under a slightly-reduced-alpha
core (same halo technique the visible ropes use), and each beam gets a
gentle per-segment wobble (`BEAM_WAVE_AMPLITUDE = 5px`, ramping from 0 at
the source to full at the aim point, `phase`-offset per beam) so the shaft
reads as wandering haze rather than a rigid geometric cone. Peak alpha
dropped slightly, 0.1 → 0.075. Depth/masking logic unchanged from round 1.

### Rope shadows (rebuilt)

Round 1 anchored each of the three ropes (bottom/middle/top) at its own
offset, producing three visibly separate stripes per ring side. Under a
believable roughly-overhead light, that's wrong — the three ropes should
converge toward nearly the same ground line. The rebuild in `_updateRopes`:

1. Anchors each side's merged-band **centerline** to the bottom
   (nearest-to-mat) rope's own live points only, displaced by that side's
   `(dx, dy)`.
2. Widens the band wherever the three ropes are **currently** diverging —
   computed as each rope's live point vs. its own freshly-computed
   zero-sag/zero-press reference point (same `archPts`/`sidePoint` calls,
   sag and press forced to 0), so a press or bounce visibly puffs the band
   out right where it's happening. (First attempt compared the three ropes'
   raw live positions directly — that's dominated by their ~130px static
   height gap, not live deformation, and blew the band out to cover half
   the mat; caught via screenshot at an exaggerated debug alpha, not
   guessed — see `buildMergedBand`'s comment in `Arena.js`.)
3. Draws one band per ring side — **four** total: `near` (the only one
   round 1 drew), `far` (missing in round 1 — the back ropes sit well above
   the mat's own far edge on screen, so `far.dy = 70`, much larger than the
   others, just clears that edge), and `side` (shared config, reused for
   left/right with `dx` signed by direction).

`ROPE_SHADOW` in `arenaLighting.js`:

| Band | dy | dx | halfW | alpha | spreadMul |
|---|---:|---:|---:|---:|---:|
| near | 12px | 0 | 9 | 0.16 | 0.22 |
| far | 70px | 0 | 6 | 0.10 | 0.18 |
| side (×2, dx signed) | 10px | 6px | 8 | 0.15 | 0.20 |

Softer/lighter than round 1's per-rope alphas (0.24–0.4), per Derek's ask.
Masked to the mat trapezoid exactly as round 1 was — reconfirmed at an
exaggerated debug alpha (0.9 on all three bands) in
`ARENA_LIGHTING_EVIDENCE/06_ropeshadow_clip_boundary_boosted.png`, which
also makes the near/far/side bands' relative positions and widths easy to
see clearly (the shipped build's own alpha is far more restrained).

### Screenshots

Same five generated frames as round 1, in `ARENA_LIGHTING_EVIDENCE/` at the
repo root (still intentionally committed, not gitignored — see round 1's
own note on why), re-captured against the round-2 code and overwritten in
place (round 1's frames remain recoverable from git history at `ba00501`):
`01_baseline_idle.png`, `02_lighting_idle.png`, `03_lighting_move_jab.png`,
`04_lighting_rope_bounce.png`, `05_lighting_roles_swapped.png`,
`06_ropeshadow_clip_boundary_boosted.png` (re-captured at a taller crop
this round so both the near and far bands are visible in one frame).
Generated by `tools/debug/arena_lighting_comparison_shots.mjs`, unchanged
from round 1.

### Verification run

`npm test` (113/113), `npm run rig:validate` (george + thesz both valid),
`npm run build` (clean), `npm run debug:play -- hammerlock` (PASS),
`npm run debug:play -- hammerlockReverse` (PASS), and
`npm run debug:play -- all` (17/17 PASS) — all on Node 22.23.1. No gameplay
code was touched.

### What remains visually uncertain (for Derek's review)

- Beam alpha (0.075) is still tuned by feel, not a hard target — Derek's
  own framing was "might want to experiment with light beams" as a later
  pass, so this wasn't over-invested this round.
- The far-side band's `dy = 70` is a bigger displacement than the other
  three bands by a wide margin, which reads correctly on screen (it lands
  just past the mat's own far edge) but is worth a second look if the ring
  geometry or camera ever changes.
- Not tested against a full 8-minute real match (only scripted scenarios +
  idle/move snapshots), same caveat as round 1.

### Tuning / rollback

Same as round 1: every constant lives in `src/scenes/arenaLighting.js`,
grouped by effect (`MAT_POOL`, `BEAMS`/`BEAM_PEAK_ALPHA`/`BEAM_DEPTH`/
`BEAM_WAVE_AMPLITUDE`, `ROPE_SHADOW`). Quick A/B via `?lighting=0`;
permanent disable by changing `lightingEnabled()`'s default to `false`;
reduce any one effect by editing its constants directly.

</details>

## Implementation record, round 1 — 2026-08-04 (Claude, superseded above)

<details>
<summary>Original fixture/beam/rope-shadow implementation — kept for
history; fixtures were removed and beams/rope-shadows reworked in round 2
above. Not the current behavior.</summary>

Implemented exactly the four items in "First experiment — approved scope"
below: three fixture sprites cut from the gitignored source sheet via
`tools/arena-lighting-cutter/` and placed per the "Recommended fixture map"
below; the mat light pool described in round 2 above (unchanged since);
three fixture-anchored atmospheric beams; and rope shadows drawn as three
separate per-rope offset stripes per side (`ROPE_SHADOW.dispY = [6.5, 11,
18]` for bottom/middle/top, `dispX = [3, 5, 8]` for the side ropes).

Verification, screenshots, and toggle mechanism were the same shape as
round 2 documents above. See commit `ba00501` for the exact code, and
`tools/arena-lighting-cutter/find-components.mjs` /`cut-fixtures.mjs` (also
removed from the working tree in round 2, recoverable the same way) for how
the three fixture sprites were cut from the six-fixture concept sheet.

</details>

## Current sequencing decision — Derek, 2026-08-04

Finish and commit the active move-system/hammerlock work before editing arena
presentation code. The next visual session is deliberately limited to:

1. cut and place the three recommended show-business fixtures;
2. add one restrained, feathered mat light pool;
3. add dynamic, mat-clipped rope shadows derived from the existing live rope
   geometry;
4. capture controlled before/after screenshots at idle and during a move;
5. stop for Derek's visual approval.

Do not bundle the following ideas into that session. They are retained in this
document but are on the backburner until the first lighting comparison establishes
the scene's direction:

- real ring-canvas texture;
- crowd depth of field;
- per-match crowd shuffling;
- wrestler rim/backlighting or silhouette shaders;
- ceiling trusses, banners, or additional architecture;
- reactive or heat-driven lighting;
- alternate fixture layouts;
- manager switching (tracked separately in
  `RINGSIDE_CAST_AND_MANAGER_SYSTEM.md`).

The first session should not make preparatory architecture for the backburnered
items unless a tiny shared seam is strictly required by the three approved
effects. Avoiding speculative infrastructure is part of the scope.

## Current visual read

The ring and wrestlers are crisp and readable, and the monochrome broadcast
treatment, crowd density, smoke, dust, scanlines, vignette, and ringside
characters already establish a strong identity. The main opportunities are:

- the crowd layers have similar apparent sharpness, so the audience can read as
  a detailed wall instead of a space extending behind the ring;
- the dark space above the crowd provides useful negative space for the HUD but
  could also imply unseen arena architecture and production lighting;
- the mat is relatively even in brightness, so a more deliberate pool of light
  could strengthen focus on the wrestlers and make the arena feel theatrical.

The empty upper area should not simply be filled with more crowd. It should
remain mostly dark and frame the HUD, with a few carefully placed show-business
fixtures and restrained light through the existing atmosphere.

## Art-direction principles

- Golden-age American wrestling broadcast, approximately 1948–1955.
- A prestigious regional show in a smoky hall, not a modern arena concert.
- The ring and wrestlers remain the sharpest, clearest visual plane.
- Pizazz comes from theatrical Fresnels, haze, exposure, and composition rather
  than colored LEDs, moving concert lights, or illuminated advertising walls.
- New visual layers must work with the existing grayscale, scanline, grain,
  vignette, barrel-distortion, camera-flash, smoke, and dust treatments.
- Lou and George's approved art and rig silhouettes do not change for this pass.

## Fixture source art

Approved concept sheet for cutting and evaluation:

`Sprite sheets/Arena Lighting Concepts/showbusiness-fixtures-source-v1.png`

The sheet is intentionally stored in the gitignored source-art area. It contains
six isolated theatrical fixtures on green for manual cutout. Do not load or ship
the unprocessed sheet directly.

The first in-game experiment should use only three fixtures. Using all six at
once would make the arena look like an asset showcase.

## Recommended fixture map

**2026-08-05 update: tried and rejected.** This placement was implemented
almost exactly as specified in round 1 (`ba00501`) and Derek's verdict was
"the fixtures are junk" — removed entirely in round 2. Kept below as design
history / in case a different art treatment is worth trying later, not as
an active recommendation.

The game canvas is 960×600. The ring is centered around x=480, with its far edge
at y=258 and near edge at y=445.

```text
  0                    240              480              720                    960
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │ P1 HUD            LEFT FRESNEL      TIMER       RIGHT FRESNEL         P2 HUD │
  │                         \        CENTER LAMP        /                         │
  │                          \            |            /                          │
  │                           \     haze and dust     /                           │
  │             deep crowd     \         |          /     deep crowd             │
  │                              feathered light pool                             │
  │                                  WRESTLING RING                               │
  └──────────────────────────────────────────────────────────────────────────────┘
```

| Position | Sheet fixture | Canvas placement | Display width | Treatment |
|---|---|---:|---:|---|
| Left key | top-left black Fresnel | x=245, top≈−15 | 125–140 px | rotate approximately 8° inward |
| Center key | bottom-middle followspot | x=480, top≈−25 | 110–125 px | aim straight down; brightest lens |
| Right key | top-middle silver Fresnel | x=715, top≈−15 | 125–140 px | mirror and rotate approximately 8° inward |

The mounts should disappear slightly above the frame. This makes the equipment
feel suspended outside the camera's view instead of pasted onto the backdrop.
The existing HUD should render above the fixtures and remain fully legible.

Suggested aim points:

- left Fresnel → `(405, 345)`;
- center followspot → `(480, 335)`;
- right Fresnel → `(555, 345)`.

These are starting positions for screenshot comparison, not locked values.

## Lighting treatment

### Primary mat pool

- Create one broad, feathered oval centered near `(480, 350)`.
- Let the center followspot provide most of the exposure.
- Let the two side Fresnels overlap it gently from opposing angles.
- Keep the ring corners slightly darker than its working center.
- Avoid a visible hard-edged white ellipse or obvious cone painted on the mat.

### Atmospheric beams

- Make the beams most visible in the smoky air above and behind the wrestlers.
- Fade them substantially before they reach the mat.
- Existing dust motes may brighten subtly while crossing a beam.
- Keep the fixtures mostly dark, readable as silhouettes with pale lenses.
- Do not add constant bloom clouds around the lamps.

### Ringside spill

The side lights may barely reveal the announcer, timekeeper, photographer, and
front crowd rows. They should not flatten the existing foreground vignette or
make every ringside figure equally bright.

### Shadows and highlights

- Explore shadows stretching slightly away from the central light instead of
  uniform gray contact ovals.
- A restrained rim highlight may catch shoulders, heads, and the upper edge of
  the top rope.
- Do not bake character-specific highlights into Lou or George's PNGs during
  the first experiment.

### Rope shadows

Overhead ring lighting can cast the rope lines downward/toward the camera on the
canvas. This is physically plausible and a high-value depth cue, but the strength
and visibility of the effect varies with lamp position, exposure, and footage;
pronounced rope shadows are not yet claimed here as a universal 1940s–50s visual.
The ropes stop reading as lines composited over a flat mat and begin to occupy
real height above it.

The rope shadows should reuse the same live rope geometry that already supplies
sag, bounce, and wrestler presses. Draw a second, softer pass projected onto the
mat rather than creating static shadow PNGs. This keeps every shadow attached to
its moving rope.

- Project shadows generally screen-down and slightly away from the central lamp.
- The top rope should cast the largest-offset, softest shadow.
- The middle rope should have a smaller offset and slightly sharper shadow.
- The bottom rope should sit closest to its shadow.
- Side-rope shadows should angle away from the central light instead of all
  receiving one identical vertical offset.
- Use low opacity and a wider/softer stroke than the visible rope.
- Clip or mask the shadow pass to the mat trapezoid so it cannot darken the
  crowd, aprons, posts, or ringside characters.
- Drive shadow deformation from the real rope control points; do not duplicate
  the sag/press calculation in an independent animation.

Starting visual ranges, to be tuned by screenshot rather than treated as law:

| Rope | Screen-down displacement | Shadow character |
|---|---:|---|
| Top | 14–22 px | softest and widest |
| Middle | 9–14 px | medium softness |
| Bottom | 5–8 px | closest and slightly sharper |

These values represent a stylized camera-space projection, not a physical 3D
simulation. The test is whether the ropes convincingly float above the mat.

## Technical feasibility

The planned look is achievable with layered 2D rendering. A general real-time
lighting engine, normal maps, or a renderer migration is not required.

| Treatment | Feasibility | Recommended first method | Main risk |
|---|---|---|---|
| Fixture sprites | straightforward | cut transparent PNGs and place above the deep crowd | visual clutter around HUD |
| Atmospheric beams | straightforward | feathered textures/Graphics with additive or screen-like blending | obvious hard cones or excessive bloom |
| Mat light pool | straightforward | soft masked gradient immediately above the mat and below actors | washing out wrestler contrast |
| Real canvas material | feasible, moderate | perspective-map a quiet top-down texture onto the ring quad | photographic noise or incorrect perspective |
| Dynamic rope shadows | strong fit | redraw existing rope curves as displaced, soft mat-only shadow geometry | duplicated rope math or spill beyond mat |
| Crowd depth of field | feasible, moderate | crowd-only RenderTexture/camera or pre-blurred deep-row assets | blur applied to the entire broadcast image |
| Wrestler rim/backlight | feasible, moderate-to-advanced | begin with a soft actor-level backlight; prototype a silhouette pass only if needed | halos around individual limbs and joints |
| Fully projected wrestler shadows | possible but deferred | whole-actor silhouette RenderTexture projected onto mat | cost, complexity, and articulated seam artifacts |

### Wrestler backlight progression

The approved character PNGs do not contain lighting layers, so the effect must
be added non-destructively. Test it in increasing order of complexity:

1. **Environmental backlight:** place a very soft, low-alpha glow behind each
   wrestler's upper-body region, aligned with the side/rear Fresnel direction.
   This may provide enough separation from the crowd without touching the
   character sprites.
2. **Whole-actor silhouette pass:** render one wrestler's assembled parts into
   an offscreen texture, tint it pale, offset it by roughly 1–2 pixels toward
   the light-facing edge, and draw it behind the normal wrestler. Only the thin
   exposed edge should remain visible.
3. **Custom edge shader:** consider only if the silhouette prototype proves the
   art direction but cannot stay clean through animation. This is not part of
   the first experiment.

Do not duplicate and offset every limb independently as the final solution.
That can expose bright internal seams at shoulders, elbows, hips, and knees.
The whole assembled wrestler should be treated as one silhouette if a true rim
pass is needed.

The rim should be restrained and directional: the left and right Fresnels may
catch opposite outer edges, while the central overhead lamp primarily affects
top-facing forms. A uniform white outline would look like a selection effect,
not arena illumination.

## Ring canvas material

The current mat is a flat `Graphics` trapezoid filled with one value. A real
canvas texture is recommended as another depth layer, provided it remains quiet
enough that the wrestlers and rope shadows stay dominant.

### Texture content

Use a neutral, top-down canvas surface containing:

- fine woven cotton texture;
- slight irregularity in the weave and dye;
- very shallow wrinkles or tension lines;
- restrained center wear and a little corner/edge wear;
- occasional soft scuffs that do not resemble blood or large stains.

Do not bake these into the source texture:

- spotlight gradients;
- rope or wrestler shadows;
- the MWF logo and center seam;
- strong directional highlights;
- large unique dirt marks that reveal repetition or dominate the match.

Those remain separate layers so lighting can be tuned, ropes can deform, and the
logo can stay readable without regenerating the material.

### Perspective and layering

The source should be a rectangular, top-down, seamless or generously oversized
texture. Map its four corners onto the existing ring trapezoid rather than merely
cropping a rectangular image with a mask. A four-corner mesh/UV projection is the
cleanest route because the weave, scuffs, and tension lines then compress toward
the far side of the ring with the scene's perspective.

Recommended render stack:

```text
flat base value
  → perspective-mapped canvas weave and wear
  → center seam and MWF mark
  → broad feathered lighting pool
  → dynamic rope and wrestler shadows
  → wrestlers and visible ropes
  → scanlines, grain, vignette, and camera treatment
```

The texture contrast should start extremely low. At normal gameplay scale it
should register first as a physical surface, not as a photograph pasted into the
ring. Review it through the final grayscale/scanline camera treatment, since a
texture that looks subtle in isolation can become noisy after grain.

### Canvas acceptance test

- The mat no longer reads as a perfectly flat digital polygon.
- Wrestler limbs remain easier to read than the weave or scuffs.
- The far half shows plausible perspective compression.
- No obvious tile repetition appears during a full match.
- Lighting and shadows can be disabled independently of the material.
- The original flat mat can be restored with one asset/config toggle for an
  exact before/after comparison.

## Crowd depth of field

The desired lens stack is:

```text
soft foreground heads → sharp ring and wrestlers → softly receding deep crowd
```

- Blur only the deepest crowd layers at first, approximately 1–2 display pixels.
- Reduce their local contrast slightly so individual figures merge with depth.
- Optionally soften the nearest backs-of-heads layer by less than the deep crowd.
- Apply blur before scanlines and grain if possible; blurring the final broadcast
  image risks smearing the entire aesthetic.
- Do not blur ringside named characters in the first pass.

Phaser's camera blur affects a whole camera rather than an arbitrary individual
GameObject. Possible implementation experiments include pre-blurred background
textures, a crowd-only RenderTexture, or an isolated crowd camera. Choose the
smallest approach that can produce a trustworthy before/after comparison.

### Non-destructive depth treatment

Do not overwrite the approved crowd PNGs or flatten one seating arrangement into
a permanent blurred background. Keep the originals as the source of truth and
make the treatment selectable, for example:

```text
crowdDepthMode: off | preblur | lowResolutionLayer
```

For `preblur`, create separate derived texture keys for the deep-row version of
each source frame. The same fan can therefore appear sharp in a near row and
soft in a distant row. Derived textures may be generated offline or once during
loading; either route must leave the originals byte-identical.

Every before/after review should use the same crowd seed and seat assignments.
That prevents a more attractive random crowd arrangement from being mistaken for
a better depth treatment. The `off` mode must restore the current render without
requiring an asset rollback.

### Per-match crowd shuffling

Depth of field must remain compatible with a different audience arrangement each
match. The current background-row builders use fixed per-row seeds, which makes
their layouts repeat deterministically. Replace those independent hard-coded
seeds later with one logged `crowdSeed` chosen when a match is created or reset.
Feed that seed into deterministic row sub-seeds so:

- a normal match gets a fresh seating arrangement;
- a debug run can supply a known seed and reproduce a visual bug exactly;
- screenshot A/B comparisons can hold the audience constant;
- saving or replaying a match can recover the same crowd if needed later.

The shuffle should be constrained rather than purely random:

- keep named ringside characters and their authored positions fixed;
- prevent the same design from occupying adjacent seats;
- preferably keep one or two seats between repeated distinctive silhouettes;
- preserve row-specific scale, ground line, tint, depth, and occlusion behavior;
- maintain intentional aisles/gaps and coverage at the sides of the ring;
- keep flipped audience members generally oriented toward the ring;
- balance very light and very dark clothing so one side does not become a solid
  bright or black mass;
- vary idle-phase timing separately from identity/seat selection.

The depth treatment is applied after assignment: near rows select the original
texture key, while deep rows select the corresponding soft derived key. This
means any shuffled crowd remains compatible with the same depth system and does
not require a newly composited background image.

### Crowd-depth rollback test

- Run a match with a fixed debug `crowdSeed` and capture `crowdDepthMode: off`.
- Switch only the depth mode and capture again.
- Confirm identities, positions, animation frames, scale, and tint are unchanged.
- Disable the feature and confirm the original crowd returns exactly.
- Start several new seeds and verify the deep-row treatment follows every design
  without missing textures or producing sharp outliers.

## Alternate fixture layout

The bottom-right three-light pipe assembly from the source sheet can replace the
three individual fixtures in a later comparison. It should not be added on top
of the recommended three-fixture layout.

The unused square scoop and profile spotlight may be useful later for:

- an alternate venue;
- entrances;
- a localized announcer or timekeeper pool;
- promotional/title-card staging.

## Additional period details to consider later

- a faint ceiling truss or catwalk emerging from darkness;
- restrained ventilation or roof structure silhouettes;
- one federation banner mostly lost in shadow;
- brief camera flashes that expose a wider patch of the deep crowd;
- gentle projector-like exposure breathing, used very sparingly.

These should wait until the three-light composition proves that more upper-frame
detail is actually needed.

## First experiment — approved scope

1. Cut the three recommended fixture assets from the source sheet.
2. Place them using the map above without changing current gameplay or HUD code.
3. Add a single restrained, feathered central mat pool. Do not add atmospheric
   beam shapes in this slice unless the fixture placement is unreadable without
   one extremely subtle test layer.
4. Add dynamic, mat-clipped rope shadows using the existing rope geometry.
5. Capture identical before/after frames at idle and during a paired move.
6. Review composition, wrestler readability, period fit, and performance, then
   stop for Derek's decision before taking up any backburnered concept.

## Acceptance criteria

- The eye goes first to the wrestlers, not the lamps.
- The crowd reads as receding space rather than a flat wall.
- The upper frame feels intentionally designed while retaining useful darkness.
- HUD labels, stamina bars, and clock remain clear.
- Fixture silhouettes read as early television/theatrical equipment.
- The treatment does not resemble a modern concert or sports arena.
- Scanlines, grain, smoke, dust, vignette, and camera flashes remain coherent.
- Frame rate and debug-play behavior do not regress.
- The change can be removed cleanly if screenshot review rejects it.

## Decisions

No implementation decision has been made. The show-business fixture sheet and
three-light placement map are approved only as the first visual experiment.
