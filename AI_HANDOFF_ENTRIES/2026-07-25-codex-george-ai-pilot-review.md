# Codex review — George AI art-swap pilot

Date: 2026-07-25

Reviewed commits `4fa14db` and `701b8d8`. The opt-in architecture is a sound
base: shipped George/Thesz remain untouched, `headAnchorFrac` and the inverse
pelvis/socket solve are properly gated, the new pure-math tests are useful, and
the tracked pilot namespace is reversible. Independent verification under
modern Node passed 53/53 unit tests, the production build, and all 16 browser
scenarios.

Do **not** swap the pilot into live George or begin expression-state wiring yet.
The next focused phase is proportion/grounding correction plus audit hardening.

## Blocking visual issue: part scales do not preserve the approved master

The six parts were cut from one shared full-body master, but the pilot config
normalizes each limb independently to the old shared bone lengths. That applies
different source-pixel-to-world scales to different parts:

- upper arm: about `0.320` world px/source px before `heightScale`
- forearm: about `0.503`
- thigh: about `0.260`
- shin: about `0.396`
- torso: `112/530 = 0.211`

This is why the hand/forearm and boot/shin visibly balloon relative to the rest
of the approved drawing. The side-by-side screenshot independently reproduced
Claude's finding: the pilot's hand is enormous and the boots sink well through
the mat.

Correct direction: derive **one effective source-pixel-to-world scale** from
the approved gameplay master's measured head-top-to-painted-sole height and
George's existing 5'9" / approximately 247px-at-s=1 target. Apply that same
effective scale to head, torso, and every limb canvas. It is fine to retain
`heightScale: 0.798` or replace it, but the product of config box scale and
`heightScale` must be the same for all parts. Do not independently stretch
parts to `P.upperArmH`, `P.forearmH`, etc., and do not fix this with X/Y nudges.

Once one scale is chosen, derive the pilot's logical bone spans from its
measured anchors at that scale. If the runtime needs new opt-in per-character
bone-length fields, add them behind the pilot config and regression-pin the
legacy path. Preserve uniform image scaling.

## Blocking grounding issue: baked boot needs an explicit painted sole

The pilot shin has a measured knee and ankle, but grounding still assumes the
shared procedural `bootH * 0.9`. That cannot seat this baked boot reliably.
Add an opt-in `soleAnchorFrac` (or equivalently explicit ankle-to-sole painted
span) to the shin profile, measured from the approved part/master, and derive
the ankle target/hip solve so the transformed painted sole lands on the mat.
Do not use `nearShinOffsetY`/`farShinOffsetY` to hide the mismatch.

Acceptance: both painted soles within 2px of the mat for idle and every planted
sample across a full gait cycle, both facings. Swing feet must still clear.

## Runtime contract gaps hidden by the current painted-gap audit

1. `george_ai_pilot.js` declares `thigh.distalAnchorFrac`, but all three leg
   paths still compute knees with `_end(...)`, not `_trueDistalEnd(...)`
   (`Skeleton.js` upright far/near knees and `_applyGrounded`'s `leg`). Route a
   textured thigh's knee through its declared distal anchor; absence must
   retain the legacy `_end` result byte-for-byte. Add upright/grounded, both-
   facing regression coverage. The present rounding makes the pilot's numeric
   difference small, but ignoring declared metadata defeats the contract.
2. `_applyGrounded` still roots both upper arms at the shared torso origin
   `shX/shY`; it does not transform `nearShoulder`/`farShoulder` sockets for the
   pilot. Use the placed/rotated torso's individual sockets on the opt-in path.
   Keep legacy characters unchanged unless separately migrated.
3. Neck audit bookkeeping records the legacy `shoulderX/neckY` (upright) or
   `shX/shY` (grounded) even when the head was actually placed at the torso neck
   socket. Record the actual `anchorX/anchorY`. Similarly, grounded shoulder
   audit points must be the actual socket roots after item 2.

The current `joint_attachment_audit` and `torso_socket_sweep` 0.00px results
prove painted overlap coverage, but they do not prove these configured socket
invariants because the debug points above follow the legacy roots. Extend an
audit to compare the reported joint against an independently transformed
configured socket, with <=0.5px mapping error through upright and dense get-up
rotation sweeps, both facings.

The pilot also inherits shared cosmetic leg behavior despite omitting explicit
knobs: `RIG.FAR_THIGH_TILT`, `RIG.NEAR_SHIN_FWD/UP`, and
`RIG.NEAR_SHIN_SCALE`. Add a single opt-in authored/socket-bound path that
neutralizes these legacy presentation corrections, rather than compensating
with opposite per-character offsets.

## Elbow diagnostic clarification

`elbow_anchor_sweep.mjs george-ai-pilot` independently reproduces the reported
FAIL (near 7.282px, far 6.190px), but its bottom-most-row heuristic selects the
pilot upper arm's thin diagonal underlap tail, not the authored elbow anchor in
`rig-profile-pilot.json`. Do not change the asset anchor to make that heuristic
pass. Update the diagnostic to distinguish heuristic-inferred anchors from
authored anchors (and clearly label any authored-anchor transform check that is
tautological with runtime config). Retain the existing heuristic for legacy art
where it is valid.

## Required comparison gate

- `npm test`
- `npm run build`
- `npm run debug:play -- all`
- authored socket/anchor mapping sweep, <=0.5px
- painted joint gap audit, <=2.5px
- painted sole sweep, <=2px for planted samples
- side-by-side shipped George vs. pilot: both facings; idle, walk, run, crouch,
  overhead arms, arm-bar/hammerlock, and the full get-up sequence
- confirm one uniform effective art scale and no screen-space repair offsets

Stop for Derek's in-browser approval after this focused correction. Expression
heads are already normalized and committed as data, but expression switching is
the phase after the base idle body/head proportions and grounding are approved.
