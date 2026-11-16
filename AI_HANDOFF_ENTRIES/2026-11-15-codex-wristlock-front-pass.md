# Wristlock variant: Lou passes in front

Derek rejected the first around-the-back transition: with the hand Lou grabbed, he thinks Lou needs to pass in front. Revised only wristlockHammerlock in Stage12 src/animation/clips/matMoves.js.

Kept initial wristlock, same worked wrist, stable captured-hand trajectory, damage, duration, hammerlock hold, release and agreed roster split (Lou variant/Guido original). Lou's transitional y offsets now +18 at 1.85s, +26 at 2.15s and +14 at 2.34/2.36s, circling back to the existing -8 hold depth by 2.7s. Previously the pass used -22/-26/-12, behind the victim. Layer order now places Lou's body/arms in front of the victim from 1.6–2.5s, then returns to the behind-body hammerlock order after he clears the victim's side. This makes the route visible rather than just changing stage coordinates under the old layering.

118 focused tests pass; build and git diff --check pass. Full suite not repeated for this choreography-only revision; previous pass had 1390 pass/4 skip/5 existing failures. Browser script/evidence MAIN research/animation/wristlock-front-pass-2026-11-15/ uses Lou against all four receivers in both facings. Await Derek's review, not visually approved. Existing old evidence under wristlock-hammerlock-2026-11-15 is superseded for the route.

All Stage12 changes remain uncommitted; no commit/merge/push/reset. Preview port 5233, move=wristlockHammerlock.

Final browser matrix: eight clean standing/staggered endings, exactly one 8-point damage event each, zero invalid joints or browser errors. Hold wrist error within floating-point tolerance; transition wrist steps remain about 1.8–1.9px/frame. Preview reopened with Lou attacking George.
