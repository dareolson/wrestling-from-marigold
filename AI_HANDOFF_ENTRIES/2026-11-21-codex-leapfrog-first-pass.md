# Leapfrog first pass — Codex, Nov 21

Derek requested next move after accepted-move checkpoint. Read current Claude handoff; preserve all accepted mat clips. Live leapfrog preview initially failed compilation: delayed landing plant end 1+delay could exceed rounded spec.duration by floating-point epsilon. Landing plant now ends at spec.duration; fractional-delay regression added.

Runner now borrows a render-only duck from jumper handle: knees lower first (.65? superseded; retained target crouch 1.45), torso folds to 1.25, then recovers after passage. Kept ordinary run position, velocity, gait and input ownership; underlying receiver pose not mutated. Borrowed state removed on completion/cancel, or when an upright runner leaves running. Helper src/animation/leapfrog.js. No damage or throw/carry, no new art.

Lou takeoff crouch at .12 rather than .16, aerial straddle lift 100 at .26 rather than 50 at .32, peak lift 115 at .45 matching apex event (was 82 at .5), existing landing/recovery retained. Launch foot releases .1–.13 rather than .12–.2, avoiding a foot pin during takeoff. Close incoming runs accelerate the solo clip, rate clamp 1–2.5, to align peak with runner arrival; longer run-up retains existing delay. Preview leapfrog camera zoom 1.2 / centerY280 (other move previews unchanged) shows whole jump.

Both-facing captures inspected. Browser matrix Lou jumping / George running, both facings, approach 80/100/150/333.333 rig units: 8/8 pass, zero hurt calls/page errors/non-finite joints/reversed run travel, all finish with no active clip or borrowed duck. At runner head center crossing jumper hip center, full head-image bounding top is 2.38335–17.85406px below average hip height. Short approach margin is tight; this is one measured crossing, not full silhouette/interpenetration certification. Cancellation immediately after starting releases runner overlay and keeps runner running. Other distance/boost/rig configurations not certified. Earlier failed matrices retained as trial evidence.

42 focused leapfrog/mat/leg/runtime tests pass (3 new helper/delay tests); all other full mat builds/clips/damage deep-equal start snapshot; diff check pass. No full suite/build/coverage/size-pop gate rerun (first visual review). No commit/push. Await Derek visual judgment.

Concurrent staged gait-v2 promotion changes in Wrestler.js/tests and scale research are from another session; left untouched/un-staged by Codex. Leapfrog works with current default gait v2. Do not stage unrelated files indiscriminately.

Evidence research/animation/leapfrog-2026-11-21/: before-matMoves.txt/before-Wrestler.txt, diagnose.mjs startup error, audit.mjs clearance ±1 final captures/JSON, verify.mjs verified-matrix.txt/matrix.json (8 final cases), tests.txt, preserve.mjs. baseline-* has timing fix only; duck-*, timed-*, final-* and first/quick/final-matrix.txt are intermediate revisions; clearance-* is retained appearance.
