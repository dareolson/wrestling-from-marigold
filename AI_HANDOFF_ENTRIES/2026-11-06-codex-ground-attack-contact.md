# For Opus: ground-attack contact without breaking the art

2026-11-06 · Codex · Derek reports the new ground attacks phase through the opponent and asks how to portray contact while preserving the art. He requested this guidance in the handoff. Design recommendation, not an implemented fix or visual approval.

## Evidence and cause

Reviewed through `b1c4b1b` / runtime change `379255b`, the elbow/knee executors, G4a notes, and the saved elbow-drop contact still (`g4a/film/frames/elbowDrop-supine-george-right/s0051.jpg`). `_doElbowDrop` travels to `other.x`, then `_layDown` hands the attacker to an independent prone mat pose. Matching wrestler roots does not establish elbow-to-torso contact or keep their bodies separate. The receiver jolt and smoother attacker get-up do not resolve body intersection. G4a explicitly leaves outline overlap and rope/mat clipping unmeasured. Derek's report is the visual finding.

## Proposed staging

Choreograph contact between the two rigs using the existing illustrated pieces:

1. Aim the striking elbow or knee at a receiver torso contact point, not the receiver's root. Establish the target from the drawn pose and rig geometry, including supine/prone and facing differences.
2. Land the attacker's body beside the receiver, slightly nearer the camera. Let the striking limb overlap the target while most of the attacker retains a separate silhouette. Check ring room before choosing that offset.
3. Stop the striking limb's downward travel at contact. Brief compression, a receiver fold/jolt around the hit, and attacker recoil supply impact; do not continue through the torso to the mat. Damage, sound and shake should share the actual contact beat, once.
4. Recover away from the receiver: roll off or plant a hand beside him before getting up. Keep the contact pose and route through the flight-to-ground handoff; blending to a generic mat pose must not pull the attacker back through the opponent.
5. Use temporary per-part layering for the contact window: striking forearm over the target, far limbs behind as the pose requires. Establish a stable order and explicit release. Layering supports correct geometry; it cannot repair two torsos occupying the same space. Avoid hiding the intersection with whole-body depth swaps, fading or distortion.

## Small first proof

Start with the elbow drop: three still poses, **approach / contact / roll-off**, on both rigs and facings; then animate between them. Include the receiver's supine and prone poses. Show silhouettes and the contact close-up before tuning impact strength. Keep knee drop and dives as follow-up applications of the same contact approach, not identical endpoint offsets.

Use existing parts first. Request a narrowly scoped replacement only if a specific bent elbow/shoulder angle cannot be achieved with the current rig. Preserve body proportions, painted outlines and ordinary signed joint limits. No broad art regeneration or physics rewrite is proposed.

## Validation and scope

Docs only in this turn; no runtime/art changes, capture or test suite. `git diff --check` passed. This records Derek's visual problem and Codex's recommended solution. Opus should scope a contact proof before treating G4a's phasing as resolved; existing soak/promotion gates remain in place.
