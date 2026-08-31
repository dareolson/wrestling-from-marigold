# Thesz canonical-v2 — profile-v2 normalized v2

Versioned profile candidate implementing Derek's settled 2026-08-26 torso and
thigh ruling. It does not overwrite `profile-v2-normalized-v1`, the approved
profile-v2 source parts, the Pass-B bank, or Pass-A v3.

Rebuild with `npm run art:normalize-profile-v2`. The tool refuses to run unless
Pass-A v3 remains SHA-256
`ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb`.

## Changed from normalized v1

- `torso.png` comes from `profile-torso-trunks-v3-alpha.png`: the squared,
  outlined collar is replaced by a short unlined seating column, and the trunks
  are one solid black silhouette with no transparent leg-opening cutout.
- `thigh.png` is not regenerated. The approved source already contains the
  broad natural hip-to-thigh contour. V1's visible knob was created by clipping
  that contour to a hip capsule and filling the capsule. V2 moves the hip
  registration far enough into the existing paint to contain the declared
  coverage zone, preserves the source contour, and adds zero hip-zone pixels.
- Proof names use `profile-v2n2-*` and the output directory is versioned v2.

Every other normalized input and rule is retained: distinct near/palm-out and
far/palm-in forearms and hands; one unmirrored upper arm, thigh, and shin; both
right-facing boots; canonical canvases and anchors; and manifest depth order.

## Layering

`pelvisUnderlay -> far leg -> torso+trunks -> near leg -> arms`.

`pelvis-mask.png` remains fully transparent. The hidden pelvis underlay still
guarantees concealed joint coverage, while the visible near thigh overlaps the
solid trunks to imply the leg opening. No pelvis lip is authored.

## Contents and validation

- `parts/`: 14 normalized canonical cells.
- `profile-v2n2-neutral-assembly.png`: neutral proof.
- `profile-v2n2-articulation-proof.png`: moved near arm and near leg proof.
- `profile-v2n2-parts-contact-sheet.png`: all cells at 1:1.
- `parts-index.json`: landmarks, scales, per-joint fill, hashes, depth order,
  mask-exposure measurements, and mechanical check results.
- `SHA256SUMS.txt`: hashes for every emitted PNG.

The validator checks canonical canvases, alpha cleanliness, 20 opaque joint
zones, both transparent presentation masks, a hole-free torso/trunks silhouette,
unmirrored reuse, separately authored near/far cells, and right-facing boots.
