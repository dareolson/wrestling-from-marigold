# Wristlock cradle: back upper arm behind torso, sustained pain face

Derek reported the receiver's back arm accidentally stacked over his torso during the new retreat/cradle, then requested a pain face for George.

Main workspace story/marigold-opening, uncommitted. Added forearm-only layer groups (l/rForearm and near/farForearm = forearm + hand) to clipLayers. The wristlock retreat window now draws defender farArm behind nativeBody, then nearArm and farForearm in front. This preserves the back upper-arm occlusion while keeping the supporting hand visible. No arm swap or contact/step/timing/damage changes.

Pain face issue: original wristlock final keys requested head:'hurt', but George's roster expression driver resumed the normal face after its 1.4s automatic damage reaction. Wristlock final keys now request head:'pain', an explicit expression-driver hold. FaceDriver honors it with the rig's pain/cry expression at its current wear stage for as long as the clip declares it, then releases to normal driving on teardown. It also compares the actual drawn texture rather than only its cached choice, so a body-art head reset cannot silently suppress the face. No new art, wear or damage. Existing head:'hurt' semantics unchanged for other moves; approved hammerlock clip not edited.

Tests: forearm/hand depth with back upper arm behind torso, both rig channel mappings and facings; pain persists past automatic flinch, repairs external head reset, clears cleanly and adds no damage. 82 focused tests pass. Full tests/*.test.js: 1422/1422 pass; build and git diff --check pass.

Changed this pass: src/animation/clipLayers.js, src/animation/clips/matMoves.js, src/animation/faceTrial.js, tests/clipLayers.test.js, tests/faceTrial.test.js. Prior uncommitted wristlock resistance/final wrench/retreat changes remain. No commit/merge/push/reset.

Browser evidence/scripts research/animation/wristlock-cradle-depth-2026-11-16/. Guido against all four receivers in both facings; captures include finishing wrench, cradle and retreat. runtime.jsonl records actual pain texture names during 3.4–4.3s (George: george_face_pain_0_2). Await Derek's visual approval. Main preview localhost:5173, wristlock Guido against George.
