# Wristlock: backward steps and cradle the worked wrist

Derek requested George take a few backward steps after Guido's finishing wrench and hold his sore wrist; wondered whether an arm swap was needed. Kept the SAME worked near wrist and brought the free far hand across to support it. No arm swap/new art.

Main workspace story/marigold-opening, src/animation/clips/matMoves.js only this pass. Wristlock now lasts 4.5s (was 3.1) to include a retreat after release. Existing catch, pullback resistance and Guido's final 2.55s wrench preserved. Guido finishes his stance at 3.1s and waits through the tail. Receiver takes alternating short backward steps at 3.35/3.65/3.95s, hips retreating from D+16 to D+68, then settles hunched/guarding his wrist. Added three alternating sole-plant windows for the retreat.

After primary release at 2.9s, the worked near wrist gathers toward his own front waist (Hip above .35, offset {x:22,y:4}, blendFromHand). Free far hand reaches that actual near Wrist with an afterLegs self-grip, fully supporting by 3.3s and easing away during final recovery. A post-release layer window draws both arms in front of the body, with the supporting hand foremost; the initial version hid the supporting arm and read as chest pain, so lowered/forwarded the wrist and corrected its layer. No shared runtime changes.

Single 8-point impact at 1.5s unchanged. Deep equality vs HEAD baseline confirms accepted wristlockHammerlock, abdominalStretch and indianDeathlock clips unchanged despite the hammerlock sharing the wristlock's initial entry. Roster/input unchanged. No commit, merge, push or reset.

74 focused tests pass; build and git diff --check pass. Browser Guido attacking all four receivers, both facings, evidence/scripts research/animation/wristlock-retreat-cradle-2026-11-16/. Final wrench, cradle and steps sampled 2.55/2.95/3.25/3.55/3.85/4.2/4.7s. Await Derek's visual assessment. Earlier separate proposal for three damage cranks remains unimplemented; this extends only the post-release selling.

Preview main server http://localhost:5173/tools/mat-preview/?move=wristlock&att=guido-roster-v1&def=george-roster-v1 . Preserve AI_HANDOFF.md pre-existing edits and research/art.

Final browser matrix: 8 clean standing/staggered endings, exactly one [8,wristlock] hit per run, no invalid joints or browser errors. Reviewed retreat and cradle, including George in both facings. Preview reopened.
