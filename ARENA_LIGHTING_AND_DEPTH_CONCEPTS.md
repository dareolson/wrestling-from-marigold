# Arena Lighting and Depth Concepts

**Status:** First lighting experiment IMPLEMENTED (2026-08-04, Claude) and
awaiting Derek's screenshot review — see "Implementation record" below. Not
approved as final; nothing beyond this first slice has been started. All
other concepts remain explicitly backburnered.  
**Purpose:** Explore ways to add depth, spectacle, and period atmosphere to the
arena without weakening wrestler readability or the 1940s–50s broadcast identity.

## Implementation record — 2026-08-04 (Claude)

Implemented exactly the four items in "First experiment — approved scope"
below, nothing else. Code lives in `src/scenes/arenaLighting.js` (all tunable
constants + the fixture/pool/beam draw helpers) plus small, clearly-marked
hooks in `src/scenes/Arena.js` (`_setupArenaLighting`, the rope-shadow pass
inside `_updateRopes`, and splitting `drawRingMat`'s seam/logo strokes into
`_drawRingMarkings` so the mat pool can sit under them). No lighting-engine,
shader, or normal-map work — everything is layered 2D Graphics, same
technique the existing smoke/dust/flash/vignette effects already use.

**Dev toggle:** append `?lighting=0` to the game URL to render the exact
pre-lighting baseline (fixtures/pool/beams hidden, rope shadows skipped).
Defaults to enabled. Purely visual — `Arena._setupArenaLighting` returns
early when off; no gameplay state is touched. For scripted tools,
`tools/debug/harness.mjs` accepts `WFM_QS=lighting=0` (or any other raw
querystring) to pass this through.

### 1. Fixtures

Cut from the gitignored source sheet via the new
`tools/arena-lighting-cutter/` (mirrors `tools/audience-cutter`'s chroma-key
+ spill-suppression approach; `find-components.mjs` is the one-time probe
that found the three bounding boxes, `cut-fixtures.mjs` is the repeatable
cutter). Shipped as `src/assets/arena-lighting/{left-fresnel-black,
fresnel-silver, followspot}.png` (280px-wide transparent PNGs, 2x the
largest planned display width).

Final placement (`FIXTURES` in `arenaLighting.js`):

| Fixture | x | top | width | rotation | flipX |
|---|---:|---:|---:|---:|---|
| left-fresnel-black | 245 | -15 | 132 | 9° | no |
| followspot | 480 | -25 | 118 | 4° | no |
| fresnel-silver | 715 | -15 | 132 | -9° | yes |

The followspot is NOT rotated ~90° to point its lens down — a rotation that
large around a top-anchored (0.5, 0) origin swings the bulk of the sprite
sideways off-frame instead of hanging downward (found via screenshot, see
the code comment on `FIXTURES` in `arenaLighting.js`). Its "aimed down"
character comes from the mat pool + center beam, not the art's own internal
lens direction. Depth 1.8 (above background/deep crowd, below the mat and
every wrestler/rope depth) — fixtures render on the main camera like
everything else, and the HUD's separate camera + ignore-list already
guarantees it draws on top regardless of Graphics depth, so "sit behind the
HUD" needed no extra work.

### 2. Mat light pool

`MAT_POOL` in `arenaLighting.js`: 14 concentric feathered ellipses
centered at (480, 350), pale warm tint `0xf0e6cc`, peak alpha 0.1, drawn
**once** at scene creation (static — no per-frame cost). First pass used
additive blending, which blew out to a near-white blob at the shared center
point once ~18 rings' alphas summed (found via screenshot, not guessed) —
switched to normal alpha compositing (biggest/faintest ring first,
smallest/brightest last), which caps predictably instead of summing.
Rendered between the flat mat fill (depth 3) and the seam/logo linework
(now depth 3.2, see `_drawRingMarkings`) so the pool sits under the logo,
per the brief. Masked to the mat trapezoid.

### 3. Atmospheric beams

`BEAMS` in `arenaLighting.js`: three tapered polygon cones (narrow at the
fixture, wide at the aim point) with alpha following `sin(π·t)` along each
beam's own length — 0 at both the fixture and the aim point, peaking
mid-air. Additive blend, peak alpha 0.1, drawn once (static). Depth 2.9:
below the mat fill (3), so the mat's own opaque fill gives a free hard stop
at the near edge in addition to the alpha taper; below every wrestler/rope
depth so wrestlers occlude the beam in front of them. This was the most
over-tuned element — 0.35 read as an obvious modern-concert cone in testing,
0.07 was nearly invisible; 0.1 was the smallest value that still read as
"something" in the smoky air without competing with the ring.

### 4. Rope shadows

Implemented inside `Arena.js`'s existing `_updateRopes` — the near-rope and
side-rope point arrays (`archPts`/`sidePoint` output) are captured into
`nearPtsByRi`/`sidePtsByRi` at the exact point they're already computed for
the visible ropes, then reused (never recalculated) to draw a second,
softer, displaced ribbon pass into a masked `this.ropeShadowGfx` every
frame, using the same `ribbonEdges`/`drawStrip` helpers the visible ropes
use. `ROPE_SHADOW` in `arenaLighting.js` holds the tunable numbers:

| Rope | dispY | dispX (side only) | halfW | alpha |
|---|---:|---:|---:|---:|
| Bottom | 6.5px | 3px | 3.0 | 0.4 |
| Middle | 11px | 5px | 4.2 | 0.32 |
| Top | 18px | 8px | 6.0 | 0.24 |

Near (horizontal) ropes get a pure screen-down offset; side ropes add the
`dispX` component signed away from the center lamp (x=480) on top of a
slightly reduced vertical offset. Both passes are masked to the mat
trapezoid via the same `Phaser.GameObjects.Graphics.createGeometryMask()`
the mat pool uses, so the shadow physically cannot render outside the mat
polygon — confirmed at an exaggerated debug alpha (0.9 across all three
ropes) in `ARENA_LIGHTING_EVIDENCE/06_ropeshadow_clip_boundary_boosted.png`,
where the boundary is unmistakable.

### Screenshots

All in `ARENA_LIGHTING_EVIDENCE/` (repo root — NOT gitignored, unlike this
project's usual `tools/*/shots`/`_qa` convention; screenshots are being
committed here because the brief for this session explicitly asked for
them as part of the reviewable deliverable):

- `01_baseline_idle.png` / `02_lighting_idle.png` — same camera/state,
  `?lighting=0` vs default, direct before/after.
- `03_lighting_move_jab.png` — mid-strike, standing move.
- `04_lighting_rope_bounce.png` — a wrestler mid-irish-whip, freshly
  bounced off the near-right ropes (real `triggerRopeBounce` spring sag),
  proving the shadows track live rope deformation, not a static pass.
- `05_lighting_roles_swapped.png` — george/thesz swapped (p1/p2), spot-check
  for layering problems with the other character pairing.
- `06_ropeshadow_clip_boundary_boosted.png` — near-left corner at an
  exaggerated debug alpha, proving the clip boundary; the shipped build
  uses the much more restrained alpha values in the table above.

Generated by `tools/debug/arena_lighting_comparison_shots.mjs` (repeatable —
rerun it after any further tuning) plus one manual `tools/debug/shot.mjs`
pass for the boosted clip-boundary frame.

### Verification run

`npm test` (113/113), `npm run rig:validate` (george + thesz both valid),
`npm run build` (clean), `npm run debug:play -- hammerlock` (PASS),
`npm run debug:play -- hammerlockReverse` (PASS), and
`npm run debug:play -- all` (17/17 PASS) — all on Node 22.23.1. No gameplay
code was touched; the full scenario-pass result is expected, not a
coincidence.

### What remains visually uncertain (for Derek's review)

- The followspot's own silhouette is the least distinctive of the three at
  its current small rotation (4°) — it reads as "a fixture" but not as
  emphatically as the two Fresnels' barn doors. Open to more rotation/scale
  if Derek wants it more prominent, bounded by the 90°-swings-sideways
  constraint noted above.
- The center followspot sits close to the clock/timer HUD element. The HUD
  renders on a separate camera on top of it (always fully legible — see
  "Fixtures" above), but it's a tight composition; flagging in case Derek
  reads it as cluttered despite technically not covering anything.
- Beam alpha (0.1) was tuned to "smallest value that still reads as
  something" rather than a fully worked-out target — genuinely the most
  subjective of the four numbers here.
- Not tested against a full 8-minute real match (only scripted scenarios +
  idle/move snapshots) — no reason to expect a problem (everything reused
  is either static or already-existing per-frame work) but not directly
  observed either.

### Tuning / rollback

Every constant above lives in `src/scenes/arenaLighting.js`, grouped by
effect (`FIXTURES`, `MAT_POOL`, `BEAMS`/`BEAM_PEAK_ALPHA`/`BEAM_DEPTH`,
`ROPE_SHADOW`). To reduce or disable without touching gameplay code:

- Quick A/B: `?lighting=0` in the URL.
- Permanent disable: change `lightingEnabled()`'s default in
  `arenaLighting.js` to `false`.
- Reduce any one effect: edit its constants directly — e.g. halve
  `MAT_POOL.peakAlpha`, drop `BEAM_PEAK_ALPHA`, or scale down
  `ROPE_SHADOW.alpha`.

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
