# Canonical wrestler generation prompt — v2

Use this prompt with the locked 4096 x 4096 guide template described in
`CANONICAL_CHARACTER_SHEET_V2.md`. The template must be supplied as an image or
mask input. A text-only model is not trusted to invent exact panels, cells,
sizes, or joint coordinates.

This is a **master-first editing workflow**, not a request for disconnected body
parts in one attempt. First approve five cohesive views. Then derive the fixed
production cells from those same masters at 1:1. Never independently regenerate
a limb merely because a crop is inconvenient.

## Pass A — cohesive five-view identity master

```text
Use case: identity-locked production source for a 2D articulated wrestling rig
Target character: [CHARACTER IDENTITY, ERA, LIKENESS, BUILD, AND ATTIRE]
Project style: [PROJECT ART STYLE]
Input: the canonical Wrestling from Marigold v2 guide template
Output: exactly 4096 x 4096 RGBA; preserve the supplied geometry exactly

Paint one internally consistent wrestler in the five master panels already
marked on the template:
1. front
2. front three-quarter
3. right-facing profile (the canonical gameplay view)
4. back three-quarter
5. back

The five figures are the same person, same moment, same 530-pixel crown-to-sole
height, same body measurements, same costume construction, same hair, and same
facial identity. They differ only by camera view. Keep the neutral body erect,
feet planted, arms relaxed slightly away from the torso, elbows and knees
readable, hands open, and near/far limbs visually separable. Do not foreshorten
or enlarge a body part to make a panel easier.

Art direction:
- hand-inked sports illustration with confident pressure and tapered strokes
- a strong readable silhouette, but NOT one uniformly thick marker outline
- exterior ink varies naturally with weight and occlusion; internal anatomy,
  facial features, fabric seams, and boot detail are lighter and narrower
- flat, deliberate value families with restrained painted shading
- likeness and anatomy remain cohesive across all five views
- period-correct materials and attire: [COSTUME DETAILS]

Broadcast constraints:
- no halftone, checker, dither, regular hatching, dense parallel folds, or
  repeated micro-pattern
- no random one-pixel edge jitter or noisy pseudo-pencil texture
- no soft airbrush halo around the silhouette
- do not rely on hue alone to separate skin, hair, trunks, boots, or outlines;
  the result must remain readable in grayscale
- preserve eyes, mouth, hands, boot/sole, trunks, and major anatomy when the
  full wrestler is reduced from 530 pixels to 154 pixels high

Composition and exclusions:
- obey the supplied master-panel rectangles and transparent background
- no labels, text, numbers, grid lines, marker dots, floor, cast shadows,
  watermark, props, extra limbs, extra poses, or overlapping panels in clean art
- leave the production-bank cells untouched in Pass A

Important: do not invent rig points. Anatomical landmarks, axes, and opaque-core
rings are placed/refined on the separate guide layer after the five-view art is
approved. Do not paint guide marks into the wrestler.
```

Stop after Pass A for identity/proportion review. Do not populate production
cells around an unapproved likeness.

## Pass B — source-locked production cells

Pass B is an edit of the approved Pass-A sheet. The approved masters remain
pixel-locked references.

```text
Using only the approved five master views on this same canonical sheet, populate
the fixed production-bank cells for each view. Preserve the supplied 4096 x 4096
canvas, macro-cell positions, and export rectangles exactly.

Required base construction per view:
- torso ending into the registered trunk boundary without duplicating a second
  across-both-thigh underbody at the wrong depth
- pelvisUnderlay owning the complete rounded opaque underbody behind both thighs
- pelvisMask above both thigh roots
- shoulderMask reserved on its torso-sized cell; transparent is valid until the
  runtime shoulder-mask slot is implemented
- upper arm with painted material beyond shoulder and elbow anchors
- forearm with painted material above elbow and beyond wrist; NO HAND
- thigh with painted material beyond hip and knee anchors
- shin with painted material above knee and beyond ankle; NO BOOT
- head.idle with neck overlap
- hand.open with wrist overlap
- boot.neutral with ankle overlap

The base production art must be masked/copied at 1:1 from the approved master view.
Do not alpha-trim, autocrop, scale, stretch, rotate-to-vertical, or change
padding. Inpaint only material hidden inside a connection band, and keep that
paint consistent with the adjoining anatomy/costume.

Each view has one bilateral upperArm, forearm, thigh, and shin cell. Use the
manifest-declared unobstructed source side and explicitly mirror/reuse it for
the other logical side. Do not imply the single cell contains two different
near/far paintings.

Joint construction:
- both adjoining pieces contain fully painted anatomy around the same neck,
  shoulder, elbow, wrist, hip, knee, or ankle center
- joint cores are rounded and opaque, never transparent feathering, a narrow
  point, rectangle, guillotine cut, or visible mechanical ball
- hidden connection faces continue local fill/shading with NO bevel, rim
  highlight, black cross-contour, edge shadow, cutoff line, or finished cap
- the front shoulder and all other covered socket faces have no exterior bevel
- hands and boots remain independent parts
- the declared pelvisUnderlay/torso union remains opaque behind both legs at
  every separation angle without duplicating a front layer over the far thigh

Ink consistency:
- preserve the approved hand-drawn pressure/taper hierarchy
- do not thicken every extracted edge into an AI/vector-looking outline
- do not add a black ring around any joint
- new hidden overlap paint must not introduce dense texture that aliases under
  scanlines

Do not paint center dots, axis marks, coverage rings, labels, or cell guides
into clean art. Those remain on the separate guide sheet.
```

## Pass C — identity-locked variants and guide lock

The exact anchor centers are artist-approved after generation. Use the editable
layered guide plus the v2 manifest, never color detection, to place:

- center crosshair;
- orientation/axis point where a second bone anchor does not already define it;
- fully opaque coverage-radius ring;
- semantic palm/knuckle/grip or sole/toe contact markers.

Create the required visible replacements in this explicit editing pass:

- head.hurt, head.effort, head.down, head.winning;
- hand.fist, hand.grip;
- boot.flexed, boot.toePoint.

Duplicate the approved family cell and guide geometry first. Visible expression,
finger, or foot paint may change while identity/costume remains locked.
Structural anchors, canvas, **cell-relative** export rectangle, joint core,
source density, orientation, and padding may not change. Semantic contact points
may.

## Exact production sizes

```text
head                                      200 x 200
torso / pelvisUnderlay / pelvisMask /
shoulderMask                              190 x 260
upperArm                                  130 x 180
forearm                                   110 x 180
hand                                       96 x 96
thigh                                     150 x 180
shin                                      130 x 210
boot                                      120 x 120
```

These are final export canvases. The old cutter's alpha-autocrop/resize path is
legacy-only and must not be used on a v2 sheet.

## Verification

Copy `rig-source-manifest.v2.example.json`, replace the template identity and
guide coordinates with the approved character data, then run:

```sh
npm run art:validate-source -- path/to/rig-source-manifest.json \
  --sheet path/to/<character>-canonical-v2.png
```

After the mechanical check succeeds, produce the review/runtime crop package
with the deterministic 1:1 exporter:

```sh
npm run art:export-v2 -- \
  --manifest path/to/rig-source-manifest.json \
  --sheet path/to/<character>-canonical-v2.png \
  --output-dir path/to/<character>-v2-exports
```

It writes all 95 registered PNGs plus `export-index.json`, which records every
source rectangle, output SHA-256, and the exact manifest/sheet hashes.
Re-running the same source produces identical bytes; it never trims or rescales
a part.

The exact source architecture is in `CANONICAL_CHARACTER_SHEET_V2.md`. This
command is the mechanical precheck inside source Gate A, not the whole gate.
Gate A completes only when the exact clean-sheet hash is bound to an approved
human review of extreme articulation, artist-like linework at game scale, and
the near/middle/far broadcast presentation. Runtime adoption is separate:
profile needs the v2 compiler/global-density/semantic-sole path before Gate B
can run, and all-view proof waits for `bodyView`, projected-socket
interpolation, depth-order transport, and the optional shoulder-mask slot in
Gate C. Shipped Thesz is not replaced until all applicable gates pass.
