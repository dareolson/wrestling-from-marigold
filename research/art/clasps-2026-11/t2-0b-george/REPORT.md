# T2.0b — George’s shaft preserved, clasp hands redrawn

2026-11-07 · Codex · Started on `story/marigold-opening`, HEAD `c9a2c2d`. **Uncommitted candidates for Opus review. T2.0b only.**

[3× overlays and pixel diffs](index.html) · [exact measurements](pixel-diff.json).

## Result

George’s original `forearm.png` is the authority for every RGBA pixel in rows **0–252 inclusive** of the 426×439 canvas. Row 252 is the wrist boundary: the shaft/outline remains the original drawing there too. Changes start at row 253, on the hand side. The replacement hands were generated from George’s own art and tone reference, not Lou’s clasp master. Deterministic fitting discards the generated shaft completely. No Lou wrist oval or elbow notch can enter the preserved region.

| Clasp | Prior changed shaft pixels vs George base | New changed shaft pixels | Total changed hand-region pixels | Changed bounds |
|---|---:|---:|---:|---|
| collarTie | 18861 | **0** | 13746 | [148, 253, 301, 400] |
| elbowCup | 18894 | **0** | 14786 | [128, 253, 301, 400] |
| waistClasp | 18546 | **0** | 13716 | [174, 253, 301, 430] |

Counts compare decoded **RGBA bytes**, including RGB under transparency, without a tolerance or alpha threshold. A changed pixel means any of its four channels differs. The prior assets are read from `c9a2c2d`; counts include all preserved rows through the wrist. Total changed pixels include removal of the original extended fingers and transparent-RGB differences in the hand region; `visibleChangedPixels` is separately listed in JSON. Diff bounds start at y253 in all three variants.

## Proof interpretation

Each clasp has base, revised, 50/50 overlay, and magenta diff panels at the identical unrotated pose/canvas/pivot, enlarged exactly 3× with nearest-neighbor sampling. The yellow rectangle outlines actual changed bounds; cyan marks the wrist boundary. The raw binary diff PNG has no annotation. This compares painted pixels rather than sprite quads. It establishes shaft identity, not natural match contact or grasp anatomy approval. Opus/Derek still judge the hand poses and the join.

## Fit / anchor changes

`tools/debug/fit_george_clasp.mjs` composites the new hand below the boundary, with a 16-row transition confined to the hand side. It shifts hand skin medians toward the wrist’s (243,193,159) RGB; fitted hand medians match those channel values. This is a palette diagnostic, not proof that every shade or contour is identical. No ink-thickening from Lou is used on George’s hand. The original cap and shaft are never recolored, rescaled, outlined or repainted.

`build_forearm_variant.mjs` delegates George’s three clasp fits to this helper; Lou and sleeper-wrap rebuilds retain their prior output bytes. The helper writes contact anchors from manually selected opaque palm points. Only the three existing `semanticAnchors.clutch` (u,v) pairs in `george_roster_v1.js` were updated, through the fit command; no new registration or grip/IK behavior.

| Clasp | Contact, canvas px | clutch (u,v) |
|---|---|---|
| collarTie | (245.640, 329.700) | (0.576619718310, 0.751025056948) |
| elbowCup | (231.600, 323.400) | (0.543661971831, 0.736674259681) |
| waistClasp | (241.680, 331.800) | (0.567323943662, 0.755808656036) |

New donor masters, transformation recipe and protected-file hash inventory:
`Sprite sheets/AI Pilot/shared/articulation-donors/2026-11-07-george-clasps-v2/`.
The previous Lou-based donors remain intact as history. The new master images may themselves have generated shaft differences; those pixels are not consumed above the wrist.

## Rebuild and validation

From repo root, Node 22 / Python with Pillow:

```sh
node tools/debug/build_forearm_variant.mjs all --write-george-anchors
node tools/debug/build_forearm_variant.mjs all --check
python3 tools/debug/prove_george_clasps.py
node --test tests/clasps.test.js tests/partVariants.test.js
```

- Full fit byte/measurement/anchor check: passes, sleeper wrap included.
- Exact pixel proof: **0 changed pixels above/through the wrist for all three clasps**.
- Protected-file SHA-256 checks: George base, Lou forearms/variants and George sleeper-wrap unchanged.
- Focused tests: **15/15 pass**.
- `git diff --check`: passes.
- No fresh in-ring capture or claims about contact quality; no full suite/build needed for this bounded art/anchor change.

Only the three George PNGs, their contact anchor metadata, fit/proof tooling and this art evidence belong to this task. Concurrent `lockup.js` / `lockup.test.js` / r7 tool edits belong to the other work and were not changed by Codex. No commit, push or T2.2 r7 execution.
