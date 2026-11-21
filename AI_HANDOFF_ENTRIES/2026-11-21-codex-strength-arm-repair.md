# Test of strength arm repair — Codex, Nov 21

Derek reports Lou arm gimpy/hyperextended on descent and phantom hands/limbs; prior checks missed the visual problem. Actual iframe captures inspected. Retained changes only in testOfStrength: receiver reach now 3.2/3.3 shoulder, .65 elbow; Lou descent seed arms lowered with bent elbows at 5/7/7.7, free far arm lowered at 8.25. Lou whole far arm now foreground through overhead/standing lock instead of upper arm hidden behind bodies with forearm foreground. Original grip constraints restored: one-way and shared shoulder target trials lost contact (33–52px) and were discarded. Do not treat the speculative feedback diagnosis as proven.

49 focused mat/layer/leg tests pass; diff check and all-other-mat-clips deep comparison pass. Both facings: three 3-damage calls, finite joints, standing/staggered finish, no active handle; overhead palm miss remains ≤2.165004px. No full suite/build rerun for this local pose/layer correction. No new art, runtime changes, or commit/push. Visual acceptance remains Derek’s; do not claim all reported artifacts eliminated from sparse stills.

Evidence: research/animation/strength-arm-repair-2026-11-21/ before-matMoves.txt, capture.mjs/capture-left.mjs, after.jsonl/left.jsonl, preview-*.png, left-*.png, verify.mjs, matrix-final.txt/matrix.json, tests.txt, preserve.mjs. matrix.txt is discarded trial evidence. Final right capture was full timing list; capture.mjs subsequently shortened for focused reruns.

Derek rejected this pass: “it's terrible.” Reverted the entire testOfStrength spec to before-matMoves.txt; original grips already restored. All repair visuals above are rejected evidence. Original reported defects remain unresolved.
