# Thesz canonical-v2 — profile-v2 normalized v1

Production-normalized profile parts derived from the Derek-approved
`pass-b/candidates/profile-v2/parts/` source set. This is a versioned candidate;
it does not overwrite that source set, the Pass-B bank, or Pass-A v3.

Rebuild with `npm run art:normalize-profile-v2`. The tool refuses to run if
`pass-a/candidates/thesz-v2-pass-a-v3.png` is not still
`ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb`.

## What normalization does

Every cell is registered onto the canonical fixed canvas and the profile anchors
the v2 source manifest declares, by a **two-point similarity transform**: uniform
scale, rotation and translation, with no reflection term. Nothing is mirrored, so
the one true side-view upper arm, thigh, shin and boot are reused unflipped and
both boots keep their drawn right-facing toe.

The source board is not drawn at the fitted v2 skeleton's proportions, so each
part carries its own scale (0.257 for the torso up to 0.489 for the shin). The
two source landmarks per part are read off that part's own silhouette and are
recorded in `parts-index.json`.

## Cleanup rule

One rule does the trimming: **past a terminal joint anchor, a part keeps only the
paint the contract asks it to carry**, clipped to the disk that exactly contains
that anchor's declared overlap band. That is what takes the round shoulder ball
down and stops the thigh and shin from presenting mismatched lips at the knee.
The thigh's hip end is clipped to the narrower overlap capsule instead, because
the trunks do not fully conceal it.

The only paint added is flat colour sampled from the part itself, inside a
declared joint zone, filled as a capsule so it reads as a limb stub rather than a
rectangular tab. That is the contract's own `continuous-fill-no-edge` surface and
every such zone is concealed by the part that attaches there.

## Contents

- `parts/` — 14 normalized cells on their canonical canvases.
- `parts-index.json` — per-part source landmarks, scale, trim/fill counts, file
  and decoded-pixel SHA-256, depth order, validation summary, and the measured
  presentation-mask exposure.
- `SHA256SUMS.txt` — file hashes for every PNG written here.
- `profile-v2n-neutral-assembly.png` — neutral depth/registration proof.
- `profile-v2n-articulation-proof.png` — moved near arm and near leg.
- `profile-v2n-parts-contact-sheet.png` — all cells at 1:1.

## Depth and layering

`pelvisUnderlay -> far leg -> torso+trunks -> near leg -> arms`, matching the
manifest's own profile `depthOrder`. The visible black trunks stay part of
`torso.png`; the far thigh attaches underneath them and the near thigh on top.
`pelvis-underlay.png` is the hidden layer that closes the trunks' leg opening,
filled with the trunks' own black over the manifest's declared `pelvisCoverage`
band.

`pelvis-mask.png` and `shoulder-mask.png` are **deliberately transparent**, per
Derek's profile rule. `parts-index.json` records how much near-limb overlap each
mask would cover if it were authored, in the neutral pose and under load, so the
decision can be made on evidence rather than on principle.

## Known-open

- The torso source's neck is a squared, outlined collar block about three times
  the width of the manifest's neck core. Seating the head under it leaves a
  straight ink line across the base of the neck. Trimming cannot fix this without
  taking the shoulder line with it; it wants a torso regeneration.
- The trunks are drawn with a front-facing V leg opening rather than a profile
  hem, so the far leg-hole edge reads as a black wedge in front of the near thigh.
- The boots are drawn large relative to the shin. Satisfying the declared 20px
  pre-ankle overlap from drawn paint puts the foot at about 0.76 of the shin
  length rather than the ~0.6 a real figure carries.

Pass-A v3 is unchanged at SHA-256
`ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb`.
