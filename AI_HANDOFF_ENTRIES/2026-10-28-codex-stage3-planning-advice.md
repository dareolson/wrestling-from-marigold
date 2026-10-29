# Codex to Opus: planning after T2.9 / G2a

2026-10-28 · Codex · Derek requested another planning review. Reviewed HEAD `d43e333`, PLAN_GETUPS, T2.8 evidence, registered route and current get-up/IK implementation. No runtime changes or visual judgment; no tests run. Opus directs Sonnet.

The evidence pass was productive: it separated real visible overlap from sampled geometry, proved the painted hand stays above the hem in the examined route, and attributed both new discontinuities. Derek approved G1 and accepted the turning-foot jump. Keep those judgments closed. Continue G2a's rough pose review; do not make Derek re-approve the entire first get-up to address an implementation boundary.

## Highest priority: make the rollout boundary explicit

T2.9 records that registering George's new aroundVia/path changes behavior with getups OFF, doubles some lying-clutch steps (compact 8.6 → 17.4 px/frame), and reduces the hold margin from .48 to .09 px. This conflicts with the plan's flag-off byte-identical contract. Passing 981 tests does not resolve that measured change.

Before promotion, choose and record one policy: gate the new route/data behind getups while retaining the previous George values for the comparison path, or explicitly make the George route a separately approved default change and stop describing getups=off as the old baseline. My preference is to preserve the comparison baseline until the new set is accepted. Do not rely on a fixture which never exercises George's changed clutch. Use the existing compact/normal clutch measurements in both facings as a focused regression check; the .09 px clearance margin also needs checking across the real severity/hold range, not another arbitrary threshold change.

## Two small solver tasks, if you schedule them

- **Elbow branch continuity:** T2.8 proves the 36.5 px jump is branch selection. Choosing nearest to the current channel pose each frame is not continuity because that channel pose crosses zero. Persist the chosen branch for one continuous route traversal, initialized from the actually drawn elbow; reset it on route exit, interruption, facing change or ownership change. If you allow a branch change near singularity/unreachability, measure the resulting elbow displacement and make the policy explicit. A threshold on channel flex alone can still oscillate. Test the specific crossing found at frames 138–139, both facings and repeated traversals. This is advice for a candidate, not a request to reopen Derek's approval without cause.
- **Same contact through the rise/standing boundary:** the 15.3 px first-standing wrist jump is the solver changing its semantic target. A wrist cannot be put directly on backWaist when the grip cup is what touches the waist. Define the route's controlled point consistently (prefer the semantic grip contact); if solving a wrist target, derive its offset from the current forearm transform and account for variant changes. Blend from the actually drawn carried endpoint when the standing solver acquires ownership. Measure grip-contact, wrist, elbow and painted hand, before and after the boundary. Merely subtracting one fixed world offset is fragile under facing and arm rotation.

## Stage 3 should establish support before refinement

`frontKnee` currently has only a far-knee support interval; its push-up mat contacts are not implemented. `backTuck` has no `hands` data yet. That is appropriate for rough G2a keys, but static approval cannot establish the weight-transfer requirement. Add an explicit implementation task after G2a: capture each mat target once at push start in world space, maintain it during the push window, release smoothly, then transfer ownership to the knee target. The current hands shape allows only one target per side; frontKnee needs a small ordered contact schedule or an equally explicit two-phase representation. Avoid scattering family-name conditionals through Skeleton.

For a back-sell frontKnee, the near hand remains protected, so both-hands push-up is ineligible: implement and film the declared far-hand-only variant. Ensure selection cannot choose backTuck's two-hand route when the near hand is reserved. The variants are promised in the plan but are not yet in GETUPS for frontKnee.

At the G2 measuring pass, keep direct prone landing and no-turn cases, both rigs/facings, and report support-hand slip in WORLD space during contact, elbow residual after limits, and hold→rise→standing ownership transitions. A hand close to a moving knee target is useful; a mat hand needs a fixed world target to establish support.

## Stall and selection: pin down boundaries before implementation

The planned fatigue pause should freeze normalized route progress while advancing a separate elapsed clock; capture stamina/stall duration once at rise start so recovery during the pause cannot stretch or cancel it. Breathing must re-solve the supporting hand each frame. For backKneeHurt, the natural stable key coincides with the turn key: define the ordering (flip and pivot correction once, then stall) and test skipped-timestep crossing and interruption there. Existing extra safe time is already an explicit Derek-approved temporary gameplay choice; no new approval flow is needed.

Plan housekeeping: T2.8/T2.9/T3 progress lines currently sit under Why instead of Progress; move them when updating status. Done means still says every rise is authored and flag-off identical, although quick rises remain legacy and T2.9 changed the old path. State the actual accepted scope so later reviewers do not mistake those for completed guarantees.

Recommended order: Derek judges G2a; Opus records the flag/default boundary; Sonnet implements the contact schedule and back-sell variants; focused transition measurements; then G2. Keep any solver-continuity candidate as a named, bounded task rather than another broad animation tuning pass.
