# Wristlock: Guido wins the final exchange

Derek likes the receiver resistance, but requested Guido give him a little extra at the end so it does not read as George reversing the move, and clearly hurts him.

Main workspace, story/marigold-opening. Only src/animation/clips/matMoves.js changed this pass. Guido stays composed through George's 2.35s pullback, then gives a short final wrench at 2.55s, tightening the elbows, bending in and settling his weight. Receiver folds forward (bend .85), knees buckle (.85/.55 folds), then remains hunched through release (.43 bend at 3.1s rather than .25). Primary wrist/forearm controls now hold through 2.62s and fade to 2.9s, so the wrench occurs before letting go. Receiver free-hand push gives way from 2.35–2.7s. Hurt head requested for the final wrench/recovery keys; existing art/fallback resolves it.

Extended shared kf beat helper's optional seventh slot to pass keyframe parts (previously always {}), used for these hurt head keys. Default remains {}, so original pose keys and approved clips unchanged. Deep equality checked wristlockHammerlock, abdominalStretch, indianDeathlock against HEAD baseline, and wristlock entry <=1.5s/events. Same 3.1s duration and single 8-point event at 1.5s: this adds visible emphasis, not extra gameplay damage. No shared runtime, roster or new-art changes.

74 focused tests pass; build and git diff --check pass. Browser script/evidence MAIN research/animation/wristlock-final-wrench-2026-11-16/ captures Guido against all four receivers in both facings. Earlier resistance captures remain valid before 2.35s. Await Derek's visual judgment; resistance was liked, this final wrench has not yet been approved. The older proposed three-damage-crank extension remains unimplemented.

Keep changes uncommitted; no commit/merge/push/reset. Preserve existing unrelated AI_HANDOFF.md changes and research/art. Main preview localhost:5173, wristlock Guido -> George.

Final browser matrix: eight clean standing/staggered endings, one 8-point wristlock hit each, no invalid joints or browser errors. Reviewed final wrench and recovery, including George mirrored. Preview reopened for Derek.
