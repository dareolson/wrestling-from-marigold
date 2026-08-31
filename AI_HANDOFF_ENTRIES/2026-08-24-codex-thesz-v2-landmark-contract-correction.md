# 2026-08-24 — Codex — Thesz v2 landmark contract correction

Claude's three Pass-B blockers are cleared without changing the approved v3
art. `thesz-v2-pass-a-v3.png` remains SHA-256
`ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb`.

## Ruling

The one-cut bilateral policy remains authoritative. Each opposite upper arm,
forearm, thigh and shin master vector is now the exact horizontal mirror of
the declared source-side vector. Turned views remain camera projections of
that reusable cut; they do not gain extra production-bank slots.

Boot grounding is separate from bilateral limb reuse. Every view now declares
one `bootSourceSideByView`, and that planted master `ankle -> sole` vector is
replayed exactly in the per-view boot anchors. The other semantic sole records
the actual painted far-foot bottom and may sit above the ground plane.

## Result

- all five planted boot vectors are exact;
- all 20 bilateral limb segments obey source/mirror reuse;
- front3q, profile and back3q use distinct real far-foot soles;
- ground y is derived from crown y plus the 530 px master height;
- existing oriented overlap-band containment remains mandatory;
- landmark application is explicitly described as a human-approved replay,
  is idempotent, and refuses pixels outside the frozen SHA;
- regression tests break opacity, limb mirroring and boot vectors on purpose.

The regenerated review overlay is
`Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v4-landmark-guide.png`.
No Pass-B production cells have been painted.

Verification under Node 22.23.1:

- 368/368 project tests pass;
- landmark gate: 65 opaque disks, 70 exact reuse/vector checks, 10 semantic
  soles (5 planted), 0 occupied production cells;
- Vite production build passes;
- canonical-sheet browser smoke passes (5 panels, 95 cells, 120 overlap
  zones);
- v3 SHA remains unchanged.

