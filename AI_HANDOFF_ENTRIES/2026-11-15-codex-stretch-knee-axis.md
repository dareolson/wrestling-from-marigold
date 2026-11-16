# Stretch: align the calf tuck with the calf axis

Derek reported the final hold knee seam misaligned on all four characters, including Lou. Continued existing uncommitted moves/stage12 work; no commit, merge, push or reset.

Changed only the kneeOverlap translation direction in Skeleton.reachLeg: previously it pulled the calf/boot toward the hip along the thigh, shifting the cap sideways across a folded knee. It now slides the rigid calf/boot up its own solved axis into the knee. The existing overlap amounts remain Lou 3, George 4, Kowalski 4.5, Guido 4. Semantic sole anchors follow the same rigid translation. Joint positions, segment lengths, artwork dimensions, timing, damage, grip control, depth order and support-floor contract are unchanged. Other moves declare zero kneeOverlap and receive zero translation.

Changed Stage12 files this pass: src/Skeleton.js and tests/legContacts.test.js. Added a folded-leg regression for both facings and partial/full contact, proving no lateral slip relative to the calf axis, identical underlying joint solve, and matching boot/sole translation.

60 focused tests pass; build and git diff --check pass. Browser captures at 1.3, 2.6, 3, 3.3, 3.4 and 5 seconds for all four attackers against Lou in both facings; all eight end standing/down-prone. Checked enlarged late hold and release captures. Full suite was not repeated. Evidence and reproducible scripts: research/animation/stretch-knee-continuity-2026-11-15/. Diagnostic capture scripts temporarily hide non-character scene objects in their own browser pages so ropes do not obscure knees; no scene code changed. Candidate script applies an in-browser replacement; verify.mjs uses the actual saved source.

Preview remains on http://127.0.0.1:5233/tools/mat-preview/?move=abdominalStretch&att=george-roster-v1&def=thesz-procreate-v1 . Await Derek's visual feedback; do not assume final visual acceptance.
