# Canonical wrestler sheet v2

**Purpose:** one registered source sheet from which a production wrestler and
all of the wrestler's required replacement parts can be exported without
per-part cropping, scaling, repadding, or joint retuning.

This is the source format for the future Lou Thesz rebuild. It supersedes the
old instruction to ask an image model for eight unrelated cutouts. The shipped
Thesz assets remain legacy fixtures until the new sheet passes the complete
gate.

Run `npm run art:sheet` to open the manifest-driven template tool. Download its
separate 4096 x 4096 guide and blank-clean PNGs; do not create or resize the
canvas by hand. The tool derives every panel, cell, rectangle, axis, anchor, and
core ring from `rig-source-manifest.v2.example.json` and has a browser smoke
test at `tools/wrestler-cutter/canonical-sheet-smoke.mjs`.

## Fixed sheet geometry

The clean sheet and its guide sheet are both **4096 x 4096 RGBA PNGs**. A result
at any other size is rejected; it is never stretched into compliance.

```text
clean:  <character>-canonical-v2.png
guide:  <character>-canonical-v2-guides.png
size:   4096 x 4096
alpha:  straight-alpha source; transparent pixels have RGB 0,0,0
```

The upper area contains five cohesive neutral masters. Their panel rectangles
are 768 x 960, beginning at y=64:

| View | Panel x | Role |
|---|---:|---|
| `front` | 64 | chest directly toward camera; face-up and front-impact source |
| `front3q` | 864 | front-turn and oblique grappling source |
| `profile` | 1664 | primary standing, locomotion, and strikes source |
| `back3q` | 2464 | rear holds and roll transition source |
| `back` | 3264 | back directly toward camera; prone source |

Every panel uses y=64, w=768, h=960. Each neutral master is **530 px from crown
to planted sole**. That is two source pixels for each pixel of Thesz's intended
265 px near-ring height: enough rotation/filter headroom without repeating the
George v8 failure of feeding 7-12x oversized art into the renderer.

All five masters are skins of one measured skeleton. They may change projected
socket positions, visible planes, lighting, camera-near side, and draw order.
They may not change anatomical bone lengths, body height, costume construction,
identity, or source density.

## Production bank

The production bank begins at x=128, y=1280. It is a 12-column by 8-row grid of
320 x 320 macro-cells. There are 96 cells. Five views use 19 cells apiece (95
total); the final cell is reserved.

```text
globalCell = viewIndex * 19 + slotIndex
cellX      = 128 + (globalCell % 12) * 320
cellY      = 1280 + floor(globalCell / 12) * 320

viewIndex:
  front=0, front3q=1, profile=2, back3q=3, back=4
```

The clean sheet contains no visible cell border, label, marker, or background.
Those exist only on the identically registered guide sheet. Each asset is
copied/masked into its fixed export rectangle at **1:1**. Do not alpha-trim,
autocrop, rotate-to-vertical, resize, or independently repad it. The two-anchor
solver supports an authored segment axis; the art does not need a destructive
normalizing rotation.

Keep an editable layered source (PSD, Krita, or equivalent) with a named
`RIG_MARKERS` layer. PNG cannot retain layer names: the clean PNG is the
markers-disabled export and the guide PNG is a flattened registered guide.

| Slot | Asset | Cell-relative export rectangle `[x,y,w,h]` |
|---:|---|---|
| 0 | `torso` | `[65,30,190,260]` |
| 1 | `pelvisUnderlay` | `[65,30,190,260]` |
| 2 | `pelvisMask` | `[65,30,190,260]` |
| 3 | `shoulderMask` | `[65,30,190,260]` |
| 4 | `upperArm` | `[95,70,130,180]` |
| 5 | `forearm` | `[105,70,110,180]` |
| 6 | `thigh` | `[85,70,150,180]` |
| 7 | `shin` | `[95,55,130,210]` |
| 8 | `head.idle` | `[60,60,200,200]` |
| 9 | `head.hurt` | `[60,60,200,200]` |
| 10 | `head.effort` | `[60,60,200,200]` |
| 11 | `head.down` | `[60,60,200,200]` |
| 12 | `head.winning` | `[60,60,200,200]` |
| 13 | `hand.open` | `[112,112,96,96]` |
| 14 | `hand.fist` | `[112,112,96,96]` |
| 15 | `hand.grip` | `[112,112,96,96]` |
| 16 | `boot.neutral` | `[100,100,120,120]` |
| 17 | `boot.flexed` | `[100,100,120,120]` |
| 18 | `boot.toePoint` | `[100,100,120,120]` |

`head.idle`, `hand.open`, and `boot.neutral` are the base head/hand/boot art.
Move-specific extension pages use the same 4096 template, slot registry, view
order, geometry signatures, and export rectangles. They never append an
arbitrary canvas beside an existing family.

## Exact final export canvases

These are production sizes, not suggestions:

| Asset family | Export canvas |
|---|---:|
| head | 200 x 200 |
| torso, pelvis underlay/mask, shoulder mask | 190 x 260 |
| upper arm | 130 x 180 |
| forearm | 110 x 180 |
| hand | 96 x 96 |
| thigh | 150 x 180 |
| shin | 130 x 210 |
| boot | 120 x 120 |

The v2 canvas envelopes adopt the certified reference rig's sizes, including
its corrected 120 x 120 boot canvas. V2's anchors and two-pixels-per-rig-unit
geometry are new and require their own certification; the current reference
boot's 0.9-canvas grounding rule is not being claimed for the new geometry. Do
not copy the old Thesz 130 x 160 upper arm, 130 x 190 forearm, 150 x 126 thigh,
or 150 x 230 baked shin. Those dimensions record legacy repairs rather than the
future architecture.

## One skeleton, five view skins

The v2 sheet uses anatomical `left` and `right` identity. `near` and `far` are
computed from view, facing, and depth order; they are not permanent body-part
names. Each view publishes all 19 cells even when a cell deliberately reuses
paint from another view. Reuse must be declared; silent fallback is forbidden.

The 19-cell format deliberately uses one bilateral upper-arm, forearm, thigh,
and shin painting per view. The guide records which unobstructed anatomical side
supplied it, and the opposite logical side explicitly mirrors/reuses that cell.
Do not claim the single asset preserves two different near/far paintings. A
future wrestler whose asymmetry truly requires separate left/right limb paint
uses a versioned extension sheet and slot map rather than squeezing extra cells
into this registry.

All source limb anchor spans equal the character's declared bone length times
`assetPixelsPerRigUnit`. For the Thesz replacement template the density is 2:

| Span | Rig units | Exact source span |
|---|---:|---:|
| neck to hip midpoint | 98 | 196 px |
| shoulder to elbow | 60 | 120 px |
| elbow to wrist | 55 | 110 px |
| hip to knee | 43 | 86 px |
| knee to ankle | 44 | 88 px |
| ankle to planted-sole row | 22 | 44 px vertical drop |
| crown to neck | 58 | 116 px |

Ring perspective may still scale the assembled wrestler. No v2 texture may use
an independent `box`, `displayScale`, `heightScale`, `headScale`,
`pivotOffsetFrac`, fixed joint seating offset, or non-uniform width/height
repair. A different body size is a skeleton measurement, not a texture tweak.

The planted boot uses a 44 px **vertical** ankle-to-sole drop; its diagonal
ankle-to-sole vector is intentionally longer because the contact lies forward.
Current pose-driven grounding assumes a different 0.9-canvas boot contract.
Before this sheet can render in a match, the v2 global-density adapter must make
the semantic sole authoritative in gait and pose-driven states and certify the
handoff. The source validator does not pretend that runtime prerequisite exists.

`profile` is the first gameplay target. The other four views are generated and
registered now so prone, face-up, rear-hold, fall, and rolling art does not
require a future identity redesign. They remain runtime-pending until the
`bodyView` channel and view-transition solve are implemented; generated art is
never described as active when the renderer cannot select it.

## Unbreakable connection marker

A single dot is not enough. Every connection guide contains:

1. a center crosshair: the exact structural anchor;
2. an axis point: the part's forward/orientation frame when a second bone
   anchor does not already supply one;
3. a coverage ring: the minimum fully opaque disk around the center.

Both adjoining pieces must contain their own completely opaque coverage disk.
A disk is rotation-invariant, so two disks mapped to the same solved joint
cannot pull apart at any legal angle. The required connections are neck,
shoulder, elbow, wrist, hip, knee, and ankle. Typical source radii are 8 px at
neck/wrist/ankle, 10 px at elbow/knee, and 12 px at shoulder/hip.

The disk is interior fill, not a visible ball joint. Hidden attachment surfaces
have continued local color/shading and **no bevel, rim, cross-contour, edge
shadow, or cutoff line**. This Thesz template uses split pelvis ownership:
`pelvisUnderlay` owns the complete rounded underbody, `pelvisMask` owns only the
front trim, and torso paint must not duplicate an across-both-thigh layer at the
wrong depth. `shoulderMask` is a reserved torso-sized presentation layer and may
remain transparent until its runtime render/depth slot exists. Fixed screen
offsets never repair coverage.

## Replacement-family guarantee

A variant's geometry is computed from, rather than vouched for by, a friendly
`geometryLock` string. The signature includes:

- export canvas and cell-relative export rectangle (global cells differ by
  variant and view);
- structural anchors and orientation frame;
- opaque-core radius and overlap zones;
- source view/facing convention and transparent padding policy;
- asset-pixels-per-rig-unit density.

Within a view, every member of a family must have the same computed signature.
Only semantic paint anchors may vary: palm/knuckle/grip contact, planted sole,
or pointed toe. Pixel coverage is run on every variant, not only the base.

## Artist-drawn, broadcast-stable ink

“Bold” means stable at broadcast size, not uniformly thick. Judge widths on the
final v2 exports and on the 265 px near-ring render:

- exterior silhouette: tapered and pressure-sensitive, usually 5-6.5 source
  px (2.5-3.25 near-screen px), with roughly 20-25% local variation; the
  4.4 px sustained floor still wins, while short tapered endpoints may fall
  below it;
- major anatomy/costume divisions: 3.5-4.5 source px;
- secondary face/fabric/boot detail: 2.5-3.2 source px, deliberately expendable
  at far depth;
- thicker accents only at real occlusion, contact, deep shadow, and
  weight-bearing edges.

Do not put one marker-like black width around every form. Taper line endings,
vary corners naturally, keep internal marks lighter than the silhouette, and
avoid a uniform black ring around joints. Natural variation is controlled
pressure, not random one-pixel edge jitter.

Avoid regular hatching, halftones, checker/dither texture, dense parallel
folds, and repeating details whose projected screen period is 1-8 px. The game
lays a black 1 px scanline on every second screen row, then adds grayscale,
grain, flicker, vignette, and barrel effects; repeated micro-patterns beat
against that grid. Use four or five structural luminance families and keep
gameplay-critical adjacent regions at least 24 luma apart before filters.
Hue-only separation is not separation after grayscale.

The v2 source validator is only Gate A's mechanical precheck. It enforces
geometry, registered pixels, overlap/core coverage, and the clean-sheet hash
once review is approved. It does not yet measure stroke taper, value-family
count, luma separation, temporal grain, or moire; those remain human-reviewed,
source-hash-linked Gate A items until the broadcast-analysis harness exists.
Do not describe an unchecked style target as an automated pass.

## Required workflow

1. Start from the locked guide template; do not ask the image model to invent
   a grid or production joint coordinates.
2. Generate the five cohesive masters together. Approve Thesz's likeness,
   proportions, attire, source-facing convention, and 530 px height before
   cutting anything.
3. Add/refine registered anatomical landmarks on the guide layer by hand.
4. Derive the base production cells from those approved masters. Mask/copy at
   1:1 and inpaint only hidden overlap material. Never independently regenerate
   a base limb after identity approval.
5. Add center, axis, and coverage-ring guides. Keep them out of clean pixels.
6. Create visible expression/hand/boot variants in an identity-locked edit pass
   by duplicating the approved family cell and guide geometry. Visible variant
   paint may change; structural geometry may not.
7. Validate the manifest and exact sheet with `art:validate-source`; this is a
   mechanical Gate A precheck, not approval of the art direction.
8. Export all 95 rectangles with `art:export-v2`. The generated
   `export-index.json` binds every stable filename, source rectangle, final
   canvas, and PNG hash to the exact manifest and clean source-sheet hashes.
9. Pass source Gate A: all five views/cells, overlap/core coverage, family
   locks, source sizes, and offline downscale/filter review.
10. After the v2 compiler/global-density/profile renderer exists, pass runtime
   Gate B at 265, 209, and 154 px, both facings, all profile variants, scanlines
   off/on, and full broadcast grain.
11. After `bodyView`, projected-socket interpolation, view depth order, and the
    shoulder-mask slot exist, pass runtime Gate C for all five views and their
    transitions. Only then may the new sheet replace shipped Thesz.

## Rejection conditions

Reject the sheet instead of repairing it when any of these is true:

- wrong sheet, panel, macro-cell, export-rectangle, or master-figure size;
- any independently stretched, alpha-trimmed, repadded, or corrective-scaled
  part;
- changed bone length/source density between views;
- a structural anchor outside its fully opaque core on either adjoining part;
- missing view/variant cell or silent texture fallback;
- transparent pelvis, shoulder, neck, elbow, wrist, hip, knee, or ankle sweep;
- visible bevel/cutoff in a hidden connection band;
- one-pixel jitter, repeating microtexture, or uniform marker-like outlines;
- silhouette/critical feature failure in Gate A's far-scale simulation or the
  later real-Arena Gate B/C presentation;
- runtime fallback to the legacy placement/offset path.
