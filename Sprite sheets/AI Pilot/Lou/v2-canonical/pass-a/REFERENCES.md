# Thesz v2 Pass A — reference inventory

Paths are repo-relative. Nothing here was generated for this packet.

> **Correction, 2026-08-23.** An earlier draft of this file named
> `Sprite sheets/New Lou/LouTheszFullBodyRef.png` as primary likeness truth.
> That was wrong. **That file depicts Lou with a moustache** — an erroneous
> output, not reference material. It is quarantined below and must not be
> supplied to the model. Lou is unequivocally clean-shaven.

## Likeness authority

**`Sprite sheets/AI Pilot/Lou/v2-layer-standardization/references/lou-canonical-chroma-v1.png`**

This is the single source of truth for Lou's identity, proportions, costume,
palette, and profile. `v2-layer-standardization/REPORT.md` states it plainly:

> Lou is clean-shaven.
> …
> `references/lou-canonical-chroma-v1.png` is the approved likeness/style source.

It visually matches the currently shipped head (`src/assets/wrestlers/thesz/head.png`).
Verified for this packet: clean-shaven, dark swept side-parted hair, heavy brow,
squared jaw, black trunks, blue lace-up boots, right-facing.

## Generation inputs (supply exactly these, in this order)

| # | File | Supplies | Explicitly does NOT supply |
|---|---|---|---|
| 1 | `pass-a/thesz-canonical-v2-guides.png` | Panel/cell geometry, as image/mask input | Any art direction |
| 2 | `.../references/lou-canonical-chroma-v1.png` | **Identity, proportions, costume, palette, profile** | — |
| 3 | `.../references/lou-torso-chroma-v1.png` | Approved complete torso structure | — |
| 4 | `.../references/original-six-layer-reference-board.png` | **Body structure only** — how these forms are built per-part | Likeness |
| 5 | `Sprite sheets/AI Pilot/George/george-canonical-approved.png` | **The five-view turnaround FORMAT only** — front / front3q / profile / back3q / back, and what a cohesive turnaround looks like | **Lou's likeness, face, hair, physique, or palette. George is not Lou.** |

## Quarantined — do not supply

| File | Why |
|---|---|
| `Sprite sheets/New Lou/LouTheszFullBodyRef.png` | **Depicts a moustache.** Contaminates the model's read of Lou's face. Retained in the repo as history; excluded from every generation call. |

Note that `Sprite sheets/New Lou/{Head,Torso,RUpperArm,...}.png` are Derek's
original individual layers and are *not* quarantined — the contamination is in
the assembled full-body file's face. Prefer the six-layer board (input 4) as the
structural reference, since it is the version the approved pipeline already
uses.

## Supporting context (not model inputs)

| File | Use |
|---|---|
| `Sprite sheets/AI Pilot/Lou/v2-layer-standardization/REPORT.md` | Documents the clean-shaven ruling and the approved source correspondence. |
| `Sprite sheets/AI Pilot/Lou/v2-layer-standardization/GENERATION_PROMPT.md` | The prompt that produced the approved layer set. |
| `Sprite sheets/AI Pilot/Lou/v1-golden-master/REPORT.md` | Rescue post-mortem: exactly which occluded pixels were never painted. The failures Pass A exists to avoid. |
| `.../v1-golden-master/evidence/preview_{near_265px,middle_209px,far_154px}[_broadcast].png` | What a Thesz-sized figure looks like at the three Gate-A review scales. Judge line weight against these, not the source sheet. |
| `DRAWING_GUIDE.md` | Era brief: 1940s–50s, EC Comics, newspaper strips, vintage wrestling posters. |
| `research/commentary/1952-07-12-marigold.md` | Fixes the era snapshot at 1952. |

## Palette — measured from the approved canonical

Rec. 709 luma, which is what survives the broadcast grayscale filter. Green
chroma excluded.

| Family | RGB | Luma |
|---|---|---:|
| skin base | 216,168,176 | 178.8 |
| skin shadow | 184,136,152 | 147.4 |
| boot blue | 48,48,136 | 54.4 |
| hair (from shipped `head.png`) | 48,40,40 | 41.7 |
| outline ink / trunks | 0,0,0 | 0.0 |

Adjacency gaps against the standard's 24-luma floor:

| Pair | Gap | |
|---|---:|---|
| skin ↔ skin shadow | 31.4 | pass |
| skin ↔ boot | 124.4 | pass |
| boot ↔ ink | 54.4 | pass |
| hair ↔ ink | 41.7 | pass |
| **trunks ↔ ink** | **0.0** | **known, accepted — see DECISIONS.md D-4** |

An earlier draft measured this palette from the quarantined file and reported
skin at luma 161. The approved canonical is a higher-key palette; the figures
above supersede it.
