# Flying mare: visible top-shoulder clamp — Codex, Nov 19

Derek: Lou's back arm should control George too; suggested George's top shoulder. Replaced seated far-hand elbow contact with a top-near-shoulder clamp, while near hand retains wrist control. All uncommitted, no commit/merge/push/reset. Flying mare remains awaiting visual judgment. Preserve accepted headlock, Lou hammerlock, Guido wristlock, stretch/deathlock.

Far-hand target: defender near shoulder, offset y -4 rig units, using existing grip forearm's clutch palm anchor. Blend .82–1.05, hold until 2.95, release by 3.25. Wrist control, throw trajectory/timing, seated reaction, damage and ending unchanged.

The old elbow-control joint contact was numerically present but hidden behind the receiver under the full rear-arm layer. Added an opt-in forearm layer group (forearm + hand, upper arm excluded) to clipLayers.js: anatomical l/rForearm and facing-relative near/farForearm. Seated flying mare .82–3.25 now draws Lou's far upper arm behind his own body, his far forearm/palm over George's near shoulder/arm, near gripping arm frontmost. Earlier throw and later release retain previous layers. Other clips don't use the new group; default order unchanged.

Meaningful regression in tests/clipLayers.test.js checks both facing conventions and both facings: far upper arm behind own torso, far forearm/hand above receiver, anatomical resolution correct. Focused layer/contact/mat tests: 44/44 pass. No asset changes. Full-clip preserve check deep-equals all other mat clips, builds/damage to starting snapshot (including accepted headlock).

Evidence/repro: research/animation/flying-mare-shoulder-2026-11-19/ before-matMoves.txt, preserve/capture/verify scripts, screenshots/JSON, logs. Capture at .82, 1.2, 1.7, 2.05; frame-8/9.png show seated shoulder control. Browser audit uses semantic clutch palm→shoulder target distance, not wrist→elbow from prior pass.

Preview: /tools/mat-preview/?move=flyingMare&att=thesz-procreate-v1&def=george-roster-v1&light=v1 . Derek judges the look; numerical contact doesn't establish a convincing grip.


Final checks: **1454/1454 full tests pass**, build pass (existing chunk warning), diff --check pass. Final 16-case matrix (Lou/Guido × four receivers × both facings): one [14,flyingMare] hurt each, no non-finite joints/page errors, receiver paired throughout hold, standing/down/no active move at ending. Forearm/painted hand stays above the receiver's near upper arm in every hold sample. Palm→shoulder target gap max **0.197542 px** globally; Lou→George max **0.000047 px**. Wrist hold remains ≤**0.425494 px**. Prior fast-flip wrist-reach miss remains a limitation; not changed in this pass.

Initial browser instrumentation assumed a separate farHand sprite and failed on embedded-hand grip art; fixed the audit to use farHand when present, otherwise farForearm depth. This was an audit correction, not a game runtime failure. Final matrix.json/matrix-summary.jsonl are the successful run.
