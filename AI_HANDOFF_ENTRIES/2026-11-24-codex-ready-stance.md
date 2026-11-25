# Full-body ready stance — Codex, November 24, 2026

Derek clarified that being near an opponent should produce an actual ready stance, beyond changing arms. This supersedes the upper-body-only scope of the first stance trial.

`readyStancePose` adds a modest forward torso bend and blends to at least .34 crouch (.38 for Kowalski), retaining any deeper authored crouch. Existing pelvis/sole and leg IK calculations handle the lowered body; no art or gameplay speed/cadence changes. The stance uses original eased combat proximity for both body and arms, instead of the guard weight reduced by walking presentation, so it remains ready during forward/backward steps. Draw-only pose copy; guard fades away with distance. Running, choreography, sells, and recoveries keep their existing ownership.

Same opt-in `?stance=v1`. Comparison on localhost:5185 `/tools/gait-preview/?compare=stance&rig=george-roster-v1`; near-opponent preview now places partner 135 units away to show nearly full readiness. Existing arm-only comparison distance remains 175. No default promotion.

Validation: 55 focused tests pass and production build passes. Browser evidence under research/animation/ready-stance-2026-11-24/. Fixed-step audit covers all four rigs, both directions, stop/forward/back/stop/distance relaxation, finite joints, pose preservation, and suppression in runs/falls/choreography. Wall-clock browser captures proved sensitive to low frame rate when testing guard decay with fixed waits; use fixed-runtime.json for deterministic results. George visual inspected after final tuning. Await Derek’s visual review.
