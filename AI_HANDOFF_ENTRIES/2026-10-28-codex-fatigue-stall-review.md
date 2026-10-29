# Codex to Opus: fatigue-stall opinion at G2b

2026-10-28 · Codex · reviewed HEAD `b03f964`, T3b handoff, Rev 5 and stall/support implementation. Source/evidence review, not a visual verdict. No runtime changes or tests run. Derek judges G2b; Opus directs.

The one-tween timeline is a sensible bounded implementation. The reported total duration is within a frame of requested timing; flag-off/no-stall remain the previous configuration, and interruption/token tests are included. No reason from this review to replace that clock architecture. G2-approved keys, prone back-reach fallback and turn jumps stay accepted.

My preference for G2b Q2, if Derek wants a candidate: **let a release already underway finish on elapsed stall time**, rather than moving the entire frontKnee stall just to fix Lou's near hand. Capture each hand's current ownership and weight on stall entry; permit existing release weights to decrease monotonically to zero, with a continuous hand trajectory. Do not replant, recapture the mat target, advance the route's knee phase, or change the facing during the pause. On leaving the stall, carry that completed release forward until its phase ends: simply resuming the old t-based weight could make the hand reappear/replant. This requires a bounded per-phase release state, not just a second weight formula in the draw code. Film only that change against the current candidate before adopting it.

Why: freezing normalized progress correctly preserves route state, but also freezes a temporary blend for up to 1.4 seconds. Lou's w .62 hand is between contact and release throughout the pause and sometimes beyond reach; the pause prolongs something that was brief in G2. Completing an already-started release preserves the stall location and the original support decision. George's frontKnee hands are already fully released, so this change should leave them unchanged. His unsupported all-fours pause remains a separate visual question for Derek, not something this release fix can claim to solve.

Moving the stall to t .22 is a legitimate alternative, but verify both rigs first. George's near mat hand releases almost immediately in the existing route; “both Lou hands planted” does not establish a shared stable support pose. Compare the actual drawn hand/foot/knee support at the proposed key, including the Back variant with only far-hand support. No universal key needs to be imposed if the current pause is acceptable by eye.

Two evidence cautions:

- “No new worst step” compared with a broad nearby window is useful context, not proof of continuous entry/exit. Keep the direct entering/leaving step numbers, joint identity and adjacent frames visible. A pause makes a formerly moving silhouette stationary, so the same discontinuity may become more noticeable. Do not reopen accepted motion solely because a numerical maximum is large.
- The 25% threshold adds 600 ms abruptly between just above 25% and 25%. This is an authored tier, not a clock bug. Disclose it when checking selection and match rhythm; do not smooth it or change timing without Derek's judgment. Sample natural rises on both sides of that boundary in Stage 4.

For the next planning step, selection should use a single rise-start snapshot for stamina, back-sell context and eligibility, and the same snapshot should drive stall duration. Preserve the no-backTuck-at-low-stamina rule, eligible-only no-repeat rule, quick-rise exception, and logged fallback reasons. Film actual match down→hold→rise sequences before promotion: the 36 forced films establish the local pause, not its frequency or pacing in matches.

Recommended order: Derek judges the existing G2b length/droop and half-release; if accepted, proceed to selection without another refinement pass. If the half-release is a visible issue, build one elapsed-release candidate with the ownership rules above. Punishability remains the explicitly deferred gameplay task.
