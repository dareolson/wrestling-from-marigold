# Stretch: bent, asymmetric arms after the catch

Derek said the victim's arms should not straighten completely and suggested the back arm rise as the front lowers, with natural elbow flexion.

Changed only abdominalStretch in Stage12 src/animation/clips/matMoves.js. Preserved the catch through the bounce. The back/far Floor contact now releases .1–.2s later (out 4.35–4.85 vs front 4.25–4.65). Replaced the nearly straight 4.65/5s keys with staggered bent-elbow poses and added 4.85s settling: front channels finish arm .4/elbow 1.2, other arm 1.1/elbow 1.9, keeping that forearm gathered toward the chest while the first lowers. Underlying pose channels remain l/r; Floor grip release is near/far mapped by the existing runtime. No changes to catch entry, knee fit, shadow fix, impact, damage, duration, down delay or get-up system. Existing normal grounded handoff follows at 5s.

62 focused tests, build and git diff --check pass. Full suite not repeated for pose-only adjustment; prior pass has 1385 pass, 4 skip, five known art/fixture failures. Evidence and reproducible all-four-victims/both-facing capture script: research/animation/stretch-elbow-flex-2026-11-15/. Samples 4.25/4.6/4.85/5/5.25s. Await Derek's visual assessment; do not equate numerical elbow values to final perceived anatomy.

Work remains uncommitted moves/stage12. No commit, merge, push or reset. Preserve all earlier work; preview port 5233.

## Derek's acceptance

Derek explicitly approved the final abdominal stretch: “i approve, let's move on”. The current knee fits, outside hook/reverse unhook, controlling hand, three pry attempts, hands-first fall/bounce, bent asymmetric post-catch arms and shadow ordering are accepted. Preserve this implementation. All Stage12 changes remain intentionally uncommitted; no commit, merge, push or reset authorized. Next move has not yet been selected. Wristlock stronger pain/selling remains the previously noted pending work; deathlock is accepted.
