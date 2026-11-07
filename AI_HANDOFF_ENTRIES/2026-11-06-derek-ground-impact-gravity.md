# For Opus: one gravity-driven descent into ground-attack contact

2026-11-06 · Derek feedback, recorded by Codex · Reviewed source through `54b60db` (T4.7a). Derek says the latest elbow drop looks good, but wants the impact a little more gravity driven: “it's almost like he hits the ground, then hits the guy now.” Positive feedback on the presentation; contact timing still needs this focused adjustment. No new visual approval or promotion inferred.

## Source finding

`_doElbowDrop` completes the 0.38 s flight clip before `_beginGroundAttack` starts. The flight's last key is already low and near horizontal (`tilt: 1.5`, `lift: -95`). The new contact sequence then spends 0.14 s blending from that body to the approach pose and 0.16 s reaching toward contact. Only at `groundAttackContactAt = blend + reach` does `_tickGroundAttack` call damage/jolt/foley/shake. Thus the actual hit follows the completed flight by about 0.30 s. Source supports Derek's reported two-stage impression; no fresh capture or physical contact measurement in this turn.

## Recommended focused correction

Preserve the far-side silhouette, elbow-to-torso target, existing art, planted-hand recovery and roll-off. Make the aerial descent and contact approach one continuous trajectory. Enter the contact choreography before the old flight reaches its mat-level endpoint, or replace that flight tail with the target-aware descent. Do not finish the flight, rise/blend back to an approach pose, then strike again.

Drive the unsupported body descent with increasing downward velocity toward the receiver's torso, carrying momentum across the renderer/pose handoff. Aim the elbow at the torso surface above the mat; stop/yield there, transfer the hit into the receiver's jolt and brief attacker compression, then recoil and roll off. The attacker must not reach a settled mat pose before this contact. Supported rotation after first contact is authored absorption, not another free-fall interval. Do not apply a ballistic constraint to every limb or simply speed up the entire move.

Keep exactly one damage, sound, shake and receiver-reaction beat at actual elbow contact. Moving the callback earlier alone will not repair the body trajectory. Preserve the target-relative placement and separation rather than restoring the old root-to-root landing. No increased impact amplitude, new art, or broad rewrite requested.

## Small review proof

One normal-speed and quarter-speed elbow-drop loop, current beside revised, both rigs/facings and supine/prone receiver. Mark apex, first elbow-to-torso contact, any attacker mat support, damage/jolt onset and roll-off. Show the last airborne frames through compression so Derek can judge continuous falling weight. Check velocity across the flight/contact handoff, signed joints, overlap and part-layer cleanup; retain the current recovery. Scope this elbow timing correction before copying the sequence to knee drop/dives.

Docs only: `git diff --check`; no runtime edits or suite run.
