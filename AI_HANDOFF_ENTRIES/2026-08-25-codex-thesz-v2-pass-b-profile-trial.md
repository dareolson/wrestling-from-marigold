# 2026-08-25 — Codex — Thesz v2 Pass B profile trial

Derek approved trying Pass B after reviewing the corrected landmark overlay.
This is deliberately a profile-only base-cell checkpoint, not a 95-cell fill.

## What happened

The first identity-locked image-model edit was rejected. It resized the sheet,
rearranged the production cells into an exploded doll, duplicated bilateral
parts, and redrew approved pixels. It was useful evidence that the model must
not own v2 sheet geometry.

The accepted trial path is deterministic 1:1 masking from the frozen profile
master. `tools/wrestler-cutter/build-pass-b-profile-trial.mjs` writes eleven
profile base cells: torso, pelvis underlay, pelvis mask, shoulder mask, upper
arm, forearm, thigh, shin, idle head, open hand and neutral boot. New pixels are
limited to concealed joint bands and pelvis/shoulder coverage material. No
expression, hand or boot variants were attempted.

Candidate and proofs:

- `Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates/thesz-v2-pass-b-profile-base-v1.png`
- `.../thesz-v2-pass-b-profile-base-v1-assembly.png`
- `.../thesz-v2-pass-b-profile-base-v1-stress.png`
- `.../thesz-v2-pass-b-profile-base-v1-compare.png`

## Mechanical result

- approved v3 remains SHA-256 `ce78aea3…3dceb`;
- candidate SHA-256 `861d9e20…a0024`;
- 61,614 changed pixels, all confined to profile cells
  38,39,40,41,42,43,44,45,46,51,54;
- 16 profile joint zones are fully opaque;
- pelvis underlay coverage is complete;
- transparent RGB remains zero;
- 368/368 project tests and the Vite build pass.

## Review status

Rejected as an expansion template after Derek's review. Although neutral
reassembly is coherent and the stress proof demonstrates concealed material,
the reusable arm and leg read too much like front-view cuts. The next profile
pass must derive one unmistakably side-view upper arm and leg set and reuse
each on the opposite side without horizontal mirroring. Forearms and hands are
not the same case: the near and far sides need separate authored cuts for the
outward/back-of-hand and inward/palm surfaces. The current one-`forearm` and
one-`hand.open`-cell contract must be resolved without abusing the fist/grip
variant cells. The head cut also includes torso/shoulder paint and must stop
after a short neck seating overlap. This remains a diagnostic candidate only.

## Replacement checkpoint

A fresh strict right-facing full-body profile source was generated rather than
repairing this cutter output. It is registered into the versioned candidate
`pass-a/candidates/thesz-v2-pass-a-v5-profile-regen-v1.png`, with an old/new
comparison at
`pass-a/candidates/profile-regens/thesz-v2-profile-regen-v1-compare.png`.
Exactly 45,189 pixels differ from frozen v3 and none lie outside the profile
panel. Candidate file SHA-256 is `f5127ad5…143f`; decoded-pixel SHA-256 is
`5257ef35…159a`. It is awaiting Derek's visual approval and has not replaced the
manifest-bound master.

Derek also fixed the profile garment depth rule for the replacement cut. The
visible trunks stay attached to the torso. The far leg draws underneath that
torso/trunks asset and the near leg draws on top, with a hidden pelvis underlay
behind both. Do not populate the profile `pelvisMask` unless an articulation
proof shows that a minimal front leg-hole lip is actually required.
