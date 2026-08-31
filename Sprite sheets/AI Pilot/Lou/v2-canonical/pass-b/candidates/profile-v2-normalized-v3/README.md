# Thesz canonical-v2 — profile normalized v3

Versioned profile candidate carrying the settled v2 torso/trunks and natural
thigh treatment through the corrected profile ankle registration. It does not
overwrite normalized v1 or v2, the approved source parts, the Pass-B bank, or
the frozen Pass-A v3 artwork.

Rebuild with `npm run art:normalize-profile-v2`. The tool refuses to run unless
Pass-A v3 remains SHA-256
`ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb`.

## Changed from normalized v2

- The far/right profile chain is registered to the corrected two-bone fit:
  hip `(398,467)`, knee `(427,564)`, ankle `(429,662)`. Its painted sole stays
  fixed at `(441,702)`.
- Reusable upper arm, thigh, and shin cells are placed by unreflected similarity
  registration to their declared bone endpoints. No turned-view limb is
  horizontally mirrored.
- Proof names and output directory are versioned `profile-v2n3-*` and
  `profile-v2-normalized-v3`.

The revised torso source remains `profile-torso-trunks-v3-alpha.png`; the thigh
is still the approved source art, not regenerated. The pelvis mask remains fully
transparent. Layering remains `pelvisUnderlay -> far leg -> torso+trunks -> near
leg -> arms`, with the far leg under the solid trunks and the near thigh above.

`parts/` contains the 14 canonical cells. The neutral, articulation, and parts
contact-sheet PNGs are review proofs. `parts-index.json` records registration,
coverage, hashes, and mechanical checks; `SHA256SUMS.txt` hashes every emitted
PNG.
