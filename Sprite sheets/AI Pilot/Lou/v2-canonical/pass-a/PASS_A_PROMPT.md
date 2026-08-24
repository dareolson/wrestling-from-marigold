# Thesz v2 — Pass A generation prompt (FINAL, decisions settled)

Derived from `tools/wrestler-cutter/templates/GENERATION_PROMPT_TEMPLATE.md`.
All placeholders filled from the rulings in `DECISIONS.md`. **Pass A only.**

---

## Inputs — supply exactly these, in this order

| # | File | Role |
|---|---|---|
| 1 | `thesz-canonical-v2-guides.png` | **Image/mask input.** 4096 x 4096 geometry. Mandatory. |
| 2 | `.../references/lou-canonical-chroma-v1.png` | **Likeness authority.** Identity, proportions, costume, palette, profile. |
| 3 | `.../references/lou-torso-chroma-v1.png` | Approved complete torso structure. |
| 4 | `.../references/original-six-layer-reference-board.png` | **Body structure only.** |
| 5 | `Sprite sheets/AI Pilot/George/george-canonical-approved.png` | **Five-view turnaround format ONLY. Not Lou's likeness.** |

**Do not supply `LouTheszFullBodyRef.png`.** It depicts a moustache and
contaminates the model. Lou is clean-shaven.

**Output:** `thesz-canonical-v2.png`, exactly 4096 x 4096 RGBA. The supplied
blank-clean PNG is the exact output geometry. Do not resize the canvas. Do not
invent coordinates.

> Alpha handling: the guide is mostly transparent and its declared
> `transparentPixelRgb` is `[0,0,0]`. If the pipeline flattens alpha, composite
> over **black**, not white — the cyan panel wash is only alpha 6/255 and
> inverts its meaning on a white flatten.

---

## The prompt

```text
Use case: identity-locked production source for a 2D articulated wrestling rig
Target character: Lou Thesz in 1952, age 36, at the peak of his NWA World
  Heavyweight Championship run. His likeness is defined ENTIRELY by the supplied
  approved canonical reference: same face, same swept dark side-parted hair,
  same heavy brow and squared jaw, same age, same heavyset-athletic 6'2" build
  with thick neck and trapezius, broad flat chest, heavy shoulders and powerful
  thighs. CLEAN-SHAVEN — NO MOUSTACHE, NO BEARD, NO STUBBLE. Attire is plain
  black wrestling trunks and blue lace-up wrestling boots, nothing else.
Project style: hand-inked 1940s–50s American sports illustration — flat
  deliberate value fills with restrained painted shading, confident tapered pen
  pressure, faces built from a few decisive strokes. Muted mauve-pink skin with
  a single darker mauve shadow family, exactly as in the approved canonical.
  Period feel of EC Comics illustration, newspaper strip inking, and vintage
  wrestling posters.
Input: the canonical Wrestling from Marigold v2 guide template
Output: exactly 4096 x 4096 RGBA; preserve the supplied geometry exactly

Reference roles, strictly:
- The approved Lou canonical is the ONLY authority for face, hair, physique,
  costume, and palette.
- The six-layer board informs how the body's forms are constructed per part.
- The George turnaround is supplied ONLY to show the five-view turnaround
  format and what a cohesive turnaround looks like. George is a DIFFERENT
  wrestler. Do not borrow his face, hair, hairstyle, colouring, physique,
  costume, or trunks colour. Nothing about George's appearance may reach Lou.

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
readable, hands OPEN and relaxed, and near/far limbs visually separable. Do not
foreshorten or enlarge a body part to make a panel easier.

The approved canonical shows Lou in a right-facing near-profile. The profile
panel follows it closely. The front, front three-quarter, back three-quarter and
back panels are your extrapolation of that same man rotated — keep every
identity cue from the canonical and rotate the camera, do not reinterpret him.
The turnaround rotates so the profile faces RIGHT. In front, front
three-quarter and profile the anatomical LEFT side is the unobstructed near
side; in back three-quarter and back the anatomical RIGHT side is.

Art direction:
- hand-inked sports illustration with confident pressure and tapered strokes
- a strong readable silhouette, but NOT one uniformly thick marker outline
- exterior ink varies naturally with weight and occlusion; internal anatomy,
  facial features, fabric seams, and boot detail are lighter and narrower
- exterior silhouette runs about 5 to 6.5 pixels with roughly 20 to 25 percent
  local variation; major anatomy and costume divisions 3.5 to 4.5 pixels;
  secondary face, fabric and boot detail 2.5 to 3.2 pixels
- taper line endings, vary corners naturally, and never ring a joint with a
  uniform black outline
- this tapered treatment changes only HOW the line is drawn; Lou's established
  identity, proportions, costume and palette are unchanged
- flat, deliberate value families with restrained painted shading
- likeness and anatomy remain cohesive across all five views
- period-correct materials and attire: plain BLACK wrestling trunks cut high on
  the hip in the 1950s manner, clean waistband, no belt, logo, trim, stripe or
  lettering; BLUE lace-up leather wrestling boots reaching mid-calf with visible
  lacing and a defined sole; bare chest, arms and legs; no kneepads, elbow pads,
  wraps, tape, jewellery, or championship belt

Value structure, measured against the broadcast filter:
- four structural luminance families: skin base, skin shadow, boot, and ink
- match the approved canonical's values: skin base near luma 179, skin shadow
  near luma 147, boot blue near luma 54, ink black
- keep gameplay-critical adjacent regions at least 24 luma apart before filters
- do not rely on hue alone to separate skin, hair, trunks, boots, or outlines;
  the result must remain readable in grayscale

Broadcast constraints:
- no halftone, checker, dither, regular hatching, dense parallel folds, or
  repeated micro-pattern
- no random one-pixel edge jitter or noisy pseudo-pencil texture
- no soft airbrush halo around the silhouette
- preserve eyes, mouth, hands, boot/sole, trunks, and major anatomy when the
  full wrestler is reduced from 530 pixels to 154 pixels high

Composition and exclusions:
- obey the supplied master-panel rectangles and transparent background
- no labels, text, numbers, grid lines, marker dots, floor, cast shadows,
  watermark, props, extra limbs, extra poses, or overlapping panels in clean art
- leave the production-bank cells COMPLETELY EMPTY in Pass A; paint nothing
  below the master panels

Important: do not invent rig points. Anatomical landmarks, axes, and opaque-core
rings are placed/refined on the separate guide layer after the five-view art is
approved. Do not paint guide marks into the wrestler.

Avoid: moustache, beard, stubble, any facial hair, George's face or hair or
physique or trunks colour, beautification, modernization, exaggerated
bodybuilder anatomy, caricature, invented costume details, kneepads, tape,
championship belt, uniform marker outlines, black rings around joints, closed
fists, front-facing thigh in the profile panel, and any panel whose figure
height differs from 530 pixels.
```

---

## After generation — run the validator first

```sh
npm run art:validate-pass-a -- --sheet path/to/thesz-canonical-v2.png
```

It mechanically enforces, against the committed manifest:

1. exactly 4096 x 4096, 8-bit RGBA, non-interlaced;
2. **every production-bank cell empty** and no paint anywhere outside the five
   master panels;
3. each panel contains a figure, inside its own rectangle, not bleeding;
4. each figure measures **530 px** crown to planted sole (±2 px);
5. transparent pixels carry RGB 0,0,0.

A pass is a mechanical precheck only. It cannot judge likeness, taper, or value
families — those are human review, and the standard says so explicitly.

## Then human review, which is the actual gate

6. Identity, proportion, attire and 530 px height approved across all five
   views — **including the four extrapolated views**, which is the point of
   stopping here.
7. Clean-shaven, no moustache, in every panel.
8. Ink reads as an artist's tapered hand, not a uniform vector marker, and Lou's
   established identity is intact underneath the new stroke treatment.
9. Silhouette and critical features survive at 265, 209 and 154 px. Compare
   against `v1-golden-master/evidence/preview_*_broadcast.png`.

**Stop after Pass A.** Do not populate a single production cell until Derek has
approved the likeness. Regenerating a limb after identity approval is the exact
failure this pipeline exists to prevent.
