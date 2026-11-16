# Deathlock far arm and broken leg art

Derek's feedback: far arm outside the torso and pointing the wrong way; leg art breaking. Changes remain uncommitted in `/Users/home/Documents/wfm-stage12` on `moves/stage12`.

Fixed the deathlock stack: far arm before the attacker's torso/head. Both arms now reach toward the trap rather than letting the free arm trail backward. Late grips use physical `near` / `far` arm selectors, resolved to the rig's l/r channels at runtime, so the visible holding arm remains camera-side for George and both facings.

Corrected the shared `Skeleton.reachLeg` renderer. It previously placed thigh and shin directly from abstract joint positions, bypassing authored offsets/overlap, and did not move a separate boot. It now rotates the already drawn thigh around the hip, carries the drawn calf/boot together to the solved knee/ankle, and updates sole/semantic points. This preserves the existing part dimensions and painted pivot geometry. Bone lengths and endpoint solving are unchanged.

Added thigh-only layer entries so the attacker's folded knee cap can cover his own shin while that shin remains in front of the receiver's crossed leg. This avoids exposing the calf cut edge through George's deeply folded knee.

Validation: 31 focused tests passed before the final arm-selector assertion was added; full suite after that assertion: 1371 pass, the same five existing art/fixture failures (landmarkFit, profileV2Normalization, two shipped-thigh source checks, frozen profile-v4 identity). Build and whitespace checks pass. Added a render-geometry regression proving that painted knee offsets, unscaled image dimensions, boot and sole attachment survive the solve, plus near-arm selection across both facing maps.

Visual checks: George attacking left and right; Lou/George held poses for body scissors, stretch and deathlock to cover the shared renderer. Runtime evidence and final captures: `research/animation/deathlock-arm-leg-repair-2026-11-15/`. Earlier George-left frames in `deathlock-rebuild-2026-11-15/` were refreshed during this pass. No new art generated.

Preview remains http://127.0.0.1:5233/tools/mat-preview/?move=indianDeathlock . No merge, commit or push.
