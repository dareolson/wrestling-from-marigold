# Wrestling from Marigold — Character Drawing Guide

> **Legacy six-part compatibility guide.** Use this document to maintain the
> currently shipped George/Lou assets. Do not use its edge-pivot/whole-forearm/
> whole-shin rules to generate a new production wrestler or to rebuild George
> or Lou. New characters follow `CHARACTER_ART_SOURCE_STANDARD.md`: internal
> two-anchor elbow/knee joints, explicit non-exported marker guides, and
> separately socketed hand/boot replacement families. The legacy cutter's
> alpha-derived joint rows are migration aids, not the future authoring
> contract.

This guide covers everything needed to draw wrestler body parts that work correctly with the game's skeleton system. Read it fully before starting a character.

**Current compatibility status:** George and Lou still load these six assets,
and this document describes only that legacy path. The engine also supports the
new eight-part/two-anchor contract and independent hand/boot variants; use
`CHARACTER_ART_SOURCE_STANDARD.md` for all new production work.

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

**One file per part, not per side:** the near/far asymmetry described above is about how you draw the *single* reference illustration so it reads with correct volume — it does not mean you export separate near-arm/far-arm files. The engine reuses one upper-arm PNG, one forearm PNG, one thigh PNG, one shin PNG, etc. for both sides and mirrors/repositions them in code.

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

> **Pipeline support exists; shipped art/state mapping does not yet.** Head
> variants can now be declared in `character.textures.variants` and selected
> by a seekable clip through `Skeleton.setPartVariants()`. The one migrated move
> (`jab`) swaps only a forearm, not a head, and George/Lou still ship one head,
> so draw the neutral head first and add expressions alongside the move that
> will actually use them.
> See `RIG_AND_MOVE_PIPELINE.md`.

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

**The engine picks expressions in this order of priority (once built):**
1. Move-specific (toehold → mercy; whip → whipping)
2. State-specific (staggered → hurt; down → down)
3. Stamina threshold (below 30% overrides idle → low_stamina)
4. Default idle

---

## Sprite Variants — Body Parts

> **Whole-part swapping is wired; separate hand/foot bones are not.** Because
> hands and boots are baked into the existing art, a fist/grip replaces the
> relevant `nearForearm`/`farForearm`, and a bent foot replaces the relevant
> `nearShin`/`farShin`. Variants inherit the calibrated base part geometry.
> Do not draw isolated 90×90 hand or 110×100 foot files for the current rig.
> Draw aligned forearm/shin replacements unless a later move proves an extra
> hand or foot bone is necessary.

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

**How move-specific variants would work in practice:**
- Toehold (attacker): hand_grip + stern/effort expression
- Toehold (defender): foot_bent on affected foot + mercy expression
- Sleeper hold (attacker): hand_grip + effort expression
- Sleeper hold (defender): normal parts + fading/pained expression
- Jab (attacker): hand_fist on striking hand + effort expression

This is the level at which a toehold stops being a diagram and starts being a story. The guy twisting the foot has a stern face and a grip hand; the guy receiving it has a bent foot and is begging for mercy. No text, no UI — the sprites tell it. Until this is wired up, the fist/grip hand shape should just be baked directly into the forearm PNG (see Canvas and Export Sizes below) and the boot baked into the shin PNG.

---

## Canvas and Export Sizes

Work at whatever size feels comfortable in Procreate or Photoshop. The game code sets display dimensions regardless of PNG pixel count, so your working size does not need to be exact — only the aspect ratio and padding matter.

**Required for v1** — six parts, one file each:

| Part | Export canvas | Notes |
|---|---|---|
| Head | 200 × 200 px | One file; expression variants above are future work |
| Torso | 190 × 260 px | Shoulder line at top, hips at bottom; trunks baked in |
| Upper Arm | 130 × 160 px | Pivot at top-center (shoulder); bottom edge is the elbow joint |
| Forearm | 130 × 190 px | Own pivot at top-center (elbow); fist/hand baked in; renders **on top** of the upper arm at the joint — see Joint Seams |
| Thigh | 150 × 150 px | Pivot at top-center (hip); bottom edge is the knee joint |
| Shin | 150 × 230 px | Own pivot at top-center (knee); boot baked in; renders **on top** of the thigh at the joint — see Joint Seams |

**Deferred separate-bone assets (not used by the current whole-part variant path):**

| Part | Export canvas | Notes |
|---|---|---|
| Foot variant | 110 × 100 px | Only relevant once foot-variant swapping is built |
| Hand variant | 90 × 90 px | Only relevant once hand-variant swapping is built |

**Recommended working size:** draw at 4× these dimensions (e.g., head on an 800×800px canvas), then export at the sizes above. 4× gives comfortable drawing room. Export by scaling down — downscaling always looks sharper than upscaling.

**File format:** PNG-24 with transparency. No JPG (destroys edges). No white background.

**Color mode:** RGB or Grayscale — both work. RGB is fine since the filter handles desaturation.

---

## Pivot Points

The pivot is the joint — the point each body part rotates around in the game. **Getting pivots wrong is the most common mistake.** An arm with the pivot in the center rotates from the elbow instead of the shoulder and looks broken immediately.

**Rule: the joint goes at the EDGE of the image, not the center. Each of the six parts has its own independent pivot.**

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

ARM — two separate pieces, two separate pivots
     ↕ ← pivot here (top center = shoulder)
┌────┼─────┐
│ upper arm│
└────┬─────┘
     ↕ ← forearm's OWN pivot (top center); positioned every frame at
       upper arm's bottom edge (the elbow)
┌────┼─────┐
│  forearm │
│   +hand  │
└──────────┘

LEG — two separate pieces, two separate pivots
     ↕ ← pivot here (top center = hip)
┌────┼─────┐
│   thigh  │
└────┬─────┘
     ↕ ← shin's OWN pivot (top center); positioned every frame at
       thigh's bottom edge (the knee)
┌────┼─────┐
│   shin   │
│   +boot  │
└──────────┘
```

In practice: leave **20–30px of transparent padding** on the non-pivot sides of each part. The pivot edge (top for torso/upper arm/forearm/thigh/shin, bottom for head) can be tight to the drawing. This padding prevents the part from clipping when rotated to extreme angles — and the range is wide: the get-up sequence alone swings the torso through roughly 143° and the thighs/shins to roughly ±92°, well beyond a casual idle sway.

For the upper-arm/forearm and thigh/shin pairs, the elbow/knee edge is a pivot edge for the lower piece (forearm, shin) but a plain bottom edge for the upper piece (upper arm, thigh) — see Joint Seams for exactly how that edge should be drawn.

---

## Joint Seams — Which Part Owns the Overlap

When two body parts meet at a joint, one part covers the other. The render order in the game determines which is on top. Plan your cutting accordingly.

| Joint | Who owns it | What to do |
|---|---|---|
| Shoulder | **Torso** | Torso has complete shoulder mass. Upper arm's top edge is a clean flat cut that slides under the torso. |
| Hip | **Torso** | Torso has complete hip/pelvis area. Thigh's top edge is a clean flat cut under the torso. |
| Neck | **Head** | Head extends down to cover the neck. Torso has a short neck stub that is hidden behind the head. |
| Elbow | **Forearm** | Forearm renders on top of the upper arm at their shared pivot point. Give the forearm's top edge a flat, fully opaque cap — no transparent padding on that row — at least as wide as the upper arm's bottom edge. Because both pieces pivot at the exact same world coordinate every frame, that's enough to cover the seam at any bend angle. |
| Knee | **Shin** | Same rule as the elbow, mirrored: shin renders on top of the thigh. Flat, opaque top edge on the shin, at least as wide as the thigh's bottom edge. |

**Elbow and knee work opposite to shoulder/hip/neck.** At the shoulder and hip, the *upper* body (torso) owns the seam. At the elbow and knee, the *lower* limb segment (forearm, shin) owns it — that's the render order the rig actually uses. Don't round off the upper arm's or thigh's bottom edge expecting it to cap the joint; round/flatten the forearm's and shin's top edge instead.

Draw the upper arm and thigh with a flat, clean top edge at the shoulder/hip — you don't need to draw a rounded cap there, since the torso covers it. They just need to start cleanly at the joint point.

---

## Photoshop Cutting Workflow

Once the full character is drawn:

1. Duplicate the file before cutting anything
2. Create a layer group for each body part: `Head`, `Torso`, `Upper_Arm`, `Forearm`, `Thigh`, `Shin` — six groups total, one set each (the engine mirrors for the other side, and generates the far copy from the same art)
3. Using the lasso or pen tool, select each body part region and move it to its group
4. For joint areas: the torso group keeps the shoulders and hips; erase the shoulder/hip area from the Upper_Arm/Thigh groups so their top edge is flat. At the elbow and knee, make sure the Forearm/Shin group's top edge is a flat, fully opaque cap (see Joint Seams) rather than a tapered point.
5. Turn off all groups except one — check it looks clean against a coloured background to catch edge fringing
6. Export each group: `File → Export → Export As` → PNG → trim transparent pixels OFF (you want the consistent canvas size, not auto-cropped)
7. Export at the sizes listed in the table above

**Naming convention (required for v1):**
```
head.png
torso.png
upper_arm.png
forearm.png
thigh.png
shin.png
```
No character prefix — the folder already scopes the files to one character.
These six plain filenames are all the code currently needs: `Arena.js`'s
`preload()` loads them from `src/assets/wrestlers/[character_slug]/` (see
`PART_FILES` in `Arena.js`), and each character's config file (e.g.
`src/characters/george.js`) maps them to that character's Phaser texture keys
(e.g. `george_head`) — the prefix lives in the texture key, not the filename.

**Naming convention (future, not yet wired):**
```
head_[expression].png     ← one file per expression
foot_[variant].png        ← foot_normal, foot_bent, etc.
hand_[variant].png        ← hand_open, hand_fist, hand_grip
```

Example, for George's folder (`src/assets/wrestlers/george/`): `head.png`,
`upper_arm.png`, `forearm.png` — and, once expressions are wired,
`head_mercy.png`.

**Where to put them:**
```
src/assets/wrestlers/[character_slug]/
```

---

## Depth Order Reference

Within one wrestler, back to front:

```
far thigh → far shin → far upper arm → far forearm →
torso (+trunks) →
near thigh → near shin → near upper arm → near forearm →
head
```

At the elbow and knee specifically, the lower segment always renders on top of the upper segment it's attached to (forearm over upper arm, shin over thigh) — see Joint Seams.

When the wrestler faces right vs left, "near" and "far" swap which physical side is toward camera. Since there's only one upper-arm PNG, one forearm PNG, one thigh PNG, and one shin PNG — reused for both sides — this doesn't change what you draw. The engine mirrors and repositions automatically. It does inform how you draw the original reference illustration, though: the near arm and leg (front-facing in your neutral-pose drawing) should read slightly more detailed/brighter, since conceptually they're the ones always in front.

---

## The Scale Reference

The ring is 20 feet × 20 feet. At the near (camera) edge, 43 pixels = 1 foot. A 6-foot wrestler is **258px tall** at the near edge of the ring. This scales down to **~150px** at the far edge.

Your drawings don't need to match this exactly — the code handles all scaling. But use it as a gut check: if your assembled character would look comically small or enormous against a 20-foot ring, something is off in the proportions.

**Wrestler body proportions (approximate, Golden Age era style):**
- Shoulders roughly 1.5× head width — these were broad men
- Torso (shoulder to hip) roughly 2.5× head height
- Legs (thigh + shin combined) roughly 2× torso height
- Arms (upper arm + forearm combined) roughly torso height + a bit

Exaggerate slightly toward the heroic — wide shoulders, thick legs, big hands. It reads better at game scale than anatomically precise proportions.

---

## Pre-Export Checklist

**Required for v1:**
- [ ] Character drawn in neutral standing pose, body at three-quarter angle
- [ ] Head at three-quarter view — both eyes visible
- [ ] Hard outlines on all body parts (2–4px at drawing size)
- [ ] Strong value contrast throughout — no grey-on-grey areas
- [ ] Six parts on separate named layers: Head, Torso, Upper_Arm, Forearm, Thigh, Shin — one set, not per-side
- [ ] Torso owns shoulders and hips; upper arm and thigh have flat, clean top edges
- [ ] Forearm and shin have a flat, fully opaque top edge (no transparent padding on that row), at least as wide as upper arm's/thigh's bottom edge — covers the elbow/knee seam
- [ ] Each part's pivot at its own top-center, except head at bottom-center
- [ ] 20–30px transparent padding on non-pivot edges
- [ ] Fist/hand shape baked into the forearm PNG; boot baked into the shin PNG
- [ ] Exported at the sizes in the table above
- [ ] PNG-24 with transparency, no white background
- [ ] Named correctly: `head.png`, `torso.png`, `upper_arm.png`, `forearm.png`, `thigh.png`, `shin.png` (no character prefix — the folder scopes it)
- [ ] Placed in `src/assets/wrestlers/[character]/`

**Future (only once the corresponding code exists):**
- [ ] All head expression variants drawn on the same canvas size
- [ ] Foot variants: foot_normal and foot_bent
- [ ] Hand variants: hand_open, hand_fist, hand_grip

---

## When You're Ready to Rig

Drop the exported PNGs into the correct folder and let me know. I'll write the rigging code — loading the images, setting pivot origins, defining the pose angle data, and wiring the tween system to animate between states. You draw, I rig.
