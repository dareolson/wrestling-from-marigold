# For Opus: roll's action with pivot's understated legs

2026-11-07 · Derek direction, recorded by Codex · Reviewed through `61a9003` / r5 implementation `4b84244`, sampler and saved pivot/r5-roll apex comparison (divingElbow-supine-george-right, frame 58). No fresh animation playback or runtime changes.

Derek: “the wrestler kind of goes into a dolphin position ... on pivot, the legs look more natural ... I want the action of roll, but the understated realism of the legs on pivot.” This is feedback on r5, not approval of its current leg silhouette. Preserve roll's action/head-side/landing intent and the parked tumble decision.

## Why the two differ

Pivot's apex has near knee flex 1.0 rad and far 0.9 rad: thighs lifted, lower legs hanging independently. Roll's own apex is explicitly straight at both knees (near thigh/shin 0.8, far 0.65), because its facing mirror cannot reflect a bent chain without reversing its signed flex. r5 lowered the straight legs and spread the later knee bend over the descent (`kneeEase: 1`); it did not give the apex pivot's articulated shape. A joint-valid straight pose can still produce the dolphin-like silhouette Derek dislikes.

## Recommended narrow prototype

Keep the roll route, timing and back landing initially unchanged. Author the legs through a few explicit before/through/after-apex poses: soft knees and independent hanging shins before the turn, a brief neutral crossing only if the current facing switch requires it, then a relaxed bend promptly afterward. Let pelvis/torso lead, with modest thigh movement and a little shin lag; avoid both legs sweeping as one straight tail or snapping into the deep resting knee pose at the end. Reference pivot's relative thigh/shin shapes and restrained motion, rather than copying its absolute angles into a mirrored frame.

Important constraint: directly replacing ROLL_APEX with pivot's bent APEX reproduces the signed-flex failure caught in T4.8a. Keep the mirror guard. If the straight-limbed crossing remains visibly wrong even when brief, change the roll's orientation/pose transition rather than relaxing knee limits or insisting on straight legs to accommodate the implementation. That is a separate bounded geometry decision; do not promise an identical bent pose can mirror with unchanged anatomy under the current convention. No new art request is justified until that small proof exposes a specific missing view.

## Review target

Current roll / leg revision / pivot reference, same move and camera, Lou and George, both facings. Normal speed first, quarter speed to inspect knee direction and leg lag. Show before apex, exact switch and after apex. Check sampled signed flex, clamp activity and drawn hip/knee/ankle continuity (not only stored keys); keep the existing zero-step switch proof. Judge the whole leg silhouette and timing with Derek. Do not simultaneously retune bounce height, travel, impact strength or get-up; these obscure whether the leg revision solves his request.

Docs only; `git diff --check` passed. No suite run or runtime fix claimed.
