# Wrestling from Marigold — Character Drawing Guide

This guide covers everything needed to draw wrestler body parts that work correctly with the game's skeleton system. Read it fully before starting a character.

---

## The Approach

**Draw the full character first, then cut him apart.**

Do not draw body parts in isolation. Draw the complete wrestler as a cohesive figure in a neutral pose. Then separate him into layers in Photoshop — one layer per body part. Each layer exports as its own PNG. The game's skeleton system assembles the pieces and animates them by rotating and positioning each part independently.

This is the same method used to build Adobe Character Animator puppets.

---

## Character Orientation

**Body: three-quarter view.** The wrestler's body faces roughly 45 degrees toward the camera — not pure side profile. You see the chest and part of the far side. This gives the character volume and lets expressions read properly. The near arm and leg appear slightly larger and more detailed; the far arm and leg are slightly narrower. This depth difference is what sells the three-quarter illusion.

**Head: three-quarter view.** Both eyes are visible — half the face toward camera, a quarter of the other side showing. This is where expressions live. A pure side profile limits you to one eyebrow and half a mouth; three-quarter gives you the full emotional range.

**Facing direction:** the engine flips sprites horizontally when the character turns. For most characters, a horizontal flip reads fine. George is worth drawing both directions (facing left and facing right) because his hair and details are distinctive enough that a flip looks slightly off.

**Move exceptions:** during complex spatial moves — suplexes, body slams, piledrivers, the clothesline arc — the character naturally shifts toward profile view. This is correct and expected. The three-quarter stance is the at-rest personality; profile is the mechanics of the move. Nobody notices the shift because it follows the action.

---

## The Neutral Pose

Every wrestler must be drawn in the same neutral pose. The skeleton rotates from this baseline — if you draw a different pose, the rotation math breaks.

**Neutral pose specs:**
- Standing upright, weight evenly distributed
- Body at three-quarter angle (see Character Orientation above)
- Arms hanging naturally at the sides, slight bend at elbow, hands relaxed
- Legs straight down, feet at a slight outward angle consistent with the three-quarter body turn
- Head at three-quarter view, both eyes visible
- No action, no tension — this is the T-pose equivalent for wrestling

---

## Style Guide

The game applies a **grayscale + scanline broadcast filter** over everything. This has consequences for how you should draw.

**Draw for value, not color.** The filter strips color entirely. High contrast between light and dark areas is what makes characters read. Flat grey-on-grey will disappear. Strong darks and lights will pop.

**Use hard outlines.** 2–4px black contour lines at the drawing stage. This is the most important single rule. Hard outlines:
- Make characters read at small sizes
- Prevent visible seams at joints (the outline covers the gap)
- Fit the 1940s era aesthetic (EC Comics, newspaper strips, vintage wrestling posters)

**Avoid soft gradients.** The filter + scanlines will muddy soft painted edges. Use flat fills or deliberate hatching-style shading. Think graphic and bold, not painterly.

**Era reference:** 1940s–50s. Look at:
- Early EC Comics illustration style
- Vintage wrestling and boxing promotional posters
- 1940s newspaper comic strips
- Golden Age action figure illustration

**Skin tones are irrelevant.** Everything goes grayscale. Focus on the value of skin vs clothing vs hair — make sure they contrast.

---

## Expressions

Each character has multiple head sprites. The engine swaps them based on match state and the specific move being performed. Draw the neutral pose head first, then do expressions as variations — same hair, same structure, only the face changes.

**Standard set (every character):**

| Key | Triggers | Description |
|---|---|---|
| `idle` | default standing | Composed, neutral |
| `hurt` | staggered; stamina below ~30% | Grimacing, registering pain |
| `down` | on the mat | Selling the damage — eyes shut or desperate |
| `effort` | applying any hold or slam | Focused, straining |
| `winning` | pinning; opponent low on stamina | Satisfied or determined |

**George's extended set (character-specific expressions go here):**

| Key | Triggers | Description |
|---|---|---|
| `idle` | default | Preening, self-satisfied — this is his whole personality |
| `hurt` | staggered | Outraged, not pained — "how dare you" |
| `low_stamina` | stamina below ~30% | Genuine concern breaking through the theater |
| `down` | on the mat | Theatrical suffering — legs kicking, mouth open |
| `effort` | applying a hold | Menacing, enjoying himself |
| `winning` | pinning | Theatrical triumph, playing to the crowd |
| `taunting` | taunt state | Over-the-top performance, arms wide |
| `mercy` | receiving toehold, figure four, any leg submission | Begging, hand outstretched toward referee |
| `whipping` | delivering Irish whip | Dismissive, like throwing out trash |
| `shocked` | unexpected nearfall kickout, big comeback | Genuine break in composure |

Ten expressions for George is not overkill — he's a performer and expressions are cheap assets. A stoic character like Thesz probably needs only the standard five. The expressiveness budget follows the character's personality.

**The engine picks expressions in this order of priority:**
1. Move-specific (toehold → mercy; whip → whipping)
2. State-specific (staggered → hurt; down → down)
3. Stamina threshold (below 30% overrides idle → low_stamina)
4. Default idle

---

## Sprite Variants — Body Parts

Beyond the head, specific body parts have variants that swap in during certain moves. These are drawn as additional PNG files and referenced by move name in the engine.

**Foot / boot variants:**

| Key | Triggers | Description |
|---|---|---|
| `foot_normal` | default | Standard boot, pointing naturally |
| `foot_bent` | receiving toehold, figure four | Foot torqued at a wrong angle — visually communicates the hold without any UI |

**Hand variants:**

| Key | Triggers | Description |
|---|---|---|
| `hand_open` | idle, walking, receiving moves | Relaxed, fingers loose |
| `hand_fist` | jab, headbutt, strikes | Knuckles forward |
| `hand_grip` | applying any hold — sleeper, toehold, whip | Fingers closed around opponent |

**How move-specific variants work in practice:**
- Toehold (attacker): hand_grip + stern/effort expression
- Toehold (defender): foot_bent on affected foot + mercy expression
- Sleeper hold (attacker): hand_grip + effort expression
- Sleeper hold (defender): normal parts + fading/pained expression
- Jab (attacker): hand_fist on striking hand + effort expression

This is the level at which a toehold stops being a diagram and starts being a story. The guy twisting the foot has a stern face and a grip hand; the guy receiving it has a bent foot and is begging for mercy. No text, no UI — the sprites tell it.

---

## Canvas and Export Sizes

Work at whatever size feels comfortable in Procreate or Photoshop. The game code sets display dimensions regardless of PNG pixel count, so your working size does not need to be exact.

**Minimum export sizes** (what you save as PNG for the game):

| Part | Export canvas | Notes |
|---|---|---|
| Head (each expression) | 200 × 200 px | Same canvas every expression — face changes, nothing else |
| Torso | 190 × 260 px | Shoulder line at top, hips at bottom |
| R Arm | 110 × 240 px | Shoulder at top-center of canvas |
| L Arm | 110 × 240 px | Shoulder at top-center of canvas |
| R Leg | 110 × 260 px | Hip at top-center of canvas |
| L Leg | 110 × 260 px | Hip at top-center of canvas |
| Foot (each variant) | 110 × 100 px | Ankle at top-center; foot_normal and foot_bent same canvas size |
| Hand (each variant) | 90 × 90 px | Wrist at top-center; hand_open, hand_fist, hand_grip same canvas size |

**Recommended working size:** draw at 4× these dimensions (e.g., head on an 800×800px canvas), then export at the sizes above. 4× gives comfortable drawing room. Export by scaling down — downscaling always looks sharper than upscaling.

**File format:** PNG-24 with transparency. No JPG (destroys edges). No white background.

**Color mode:** RGB or Grayscale — both work. RGB is fine since the filter handles desaturation.

---

## Pivot Points

The pivot is the joint — the point each body part rotates around in the game. **Getting pivots wrong is the most common mistake.** An arm with the pivot in the center rotates from the elbow instead of the shoulder and looks broken immediately.

**Rule: the joint goes at the EDGE of the image, not the center.**

```
HEAD
┌──────────┐
│          │
│  O face  │
│          │
│    neck  │ ← pivot here (bottom center)
└────┼─────┘
     ↕

TORSO
     ↕ ← pivot here (top center = shoulder line)
┌────┼─────┐
│ shoulders│
│  [torso] │
│   hips   │
└──────────┘

ARM (right)
     ↕ ← pivot here (top center = shoulder)
┌────┼─────┐
│ upper arm│
│  forearm │
│   hand   │
└──────────┘

LEG (right)
     ↕ ← pivot here (top center = hip)
┌────┼─────┐
│   thigh  │
│   shin   │
│   foot   │
└──────────┘
```

In practice: leave **20–30px of transparent padding** on the three non-pivot sides of each part. The pivot edge (top for arms/legs, bottom for head) can be tight to the drawing. This padding prevents the part from clipping when rotated to extreme angles.

---

## Joint Seams — Which Part Owns the Overlap

When two body parts meet at a joint, one part covers the other. The depth order in the game determines which is on top. Plan your cutting accordingly.

| Joint | Who owns it | What to do |
|---|---|---|
| Shoulder | **Torso** | Torso has complete shoulder mass. Arm top is a clean flat edge that slides under the torso. |
| Hip | **Torso** | Torso has complete hip/pelvis area. Leg top is a clean flat edge under the torso. |
| Neck | **Head** | Head extends down to cover the neck. Torso has a short neck stub that is hidden behind the head. |

**Draw arms and legs with a flat, clean top edge at the joint.** You don't need to draw a perfectly rounded shoulder cap on the arm — the torso covers it. The arm just needs to start cleanly at the shoulder point.

---

## Photoshop Cutting Workflow

Once the full character is drawn:

1. Duplicate the file before cutting anything
2. Create a layer group for each body part: `Head`, `Torso`, `R_Arm`, `L_Arm`, `R_Leg`, `L_Leg`
3. Using the lasso or pen tool, select each body part region and move it to its group
4. For joint areas: the torso group keeps the shoulders and hips; erase the shoulder/hip area from the arm/leg groups
5. Turn off all groups except one — check it looks clean against a coloured background to catch edge fringing
6. Export each group: `File → Export → Export As` → PNG → trim transparent pixels OFF (you want the consistent canvas size, not auto-cropped)
7. Export at the sizes listed in the table above

**Naming convention:**
```
[character]_head_[expression].png     ← one file per expression
[character]_torso.png
[character]_r_arm.png
[character]_l_arm.png
[character]_r_leg.png
[character]_l_leg.png
[character]_r_foot_[variant].png      ← foot_normal, foot_bent, etc.
[character]_l_foot_[variant].png
[character]_r_hand_[variant].png      ← hand_open, hand_fist, hand_grip
[character]_l_hand_[variant].png
```

Example: `gorgeous_george_head_idle.png`, `gorgeous_george_head_mercy.png`, `gorgeous_george_r_foot_bent.png`

**Where to put them:**
```
src/assets/wrestlers/[character_slug]/
```

---

## Depth Order Reference

When the wrestler faces right, parts render in this order (back to front):

```
L Leg → L Arm → Torso → R Leg → R Arm → Head
```

When facing left, left and right swap. The code handles this automatically, but it informs how you should draw — the "near" arm and leg (front-facing) should be slightly more detailed/brighter since they're always in front.

---

## The Scale Reference

The ring is 20 feet × 20 feet. At the near (camera) edge, 43 pixels = 1 foot. A 6-foot wrestler is **258px tall** at the near edge of the ring. This scales down to **~150px** at the far edge.

Your drawings don't need to match this exactly — the code handles all scaling. But use it as a gut check: if your assembled character would look comically small or enormous against a 20-foot ring, something is off in the proportions.

**Wrestler body proportions (approximate, Golden Age era style):**
- Shoulders roughly 1.5× head width — these were broad men
- Torso (shoulder to hip) roughly 2.5× head height
- Legs roughly 2× torso height
- Arms roughly torso height + a bit

Exaggerate slightly toward the heroic — wide shoulders, thick legs, big hands. It reads better at game scale than anatomically precise proportions.

---

## Pre-Export Checklist

- [ ] Character drawn in neutral standing pose, body at three-quarter angle
- [ ] Head at three-quarter view — both eyes visible
- [ ] Hard outlines on all body parts (2–4px at drawing size)
- [ ] Strong value contrast throughout — no grey-on-grey areas
- [ ] All parts on separate named layers
- [ ] Torso owns shoulders and hips; arms and legs have flat tops
- [ ] Head pivot at bottom center, all others at top center
- [ ] 20–30px transparent padding on non-pivot edges
- [ ] All head expression variants drawn on the same canvas size
- [ ] Foot variants: foot_normal and foot_bent (minimum)
- [ ] Hand variants: hand_open, hand_fist, hand_grip (minimum)
- [ ] Exported at correct canvas sizes (see table above)
- [ ] PNG-24 with transparency, no white background
- [ ] Named correctly: `[character]_[part]_[variant].png`
- [ ] Placed in `src/assets/wrestlers/[character]/`

---

## When You're Ready to Rig

Drop the exported PNGs into the correct folder and let me know. I'll write the rigging code — loading the images, setting pivot origins, defining the pose angle data, and wiring the tween system to animate between states. You draw, I rig.
