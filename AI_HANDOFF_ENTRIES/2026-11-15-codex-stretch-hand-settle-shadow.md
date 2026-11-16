# Stretch: tiny knee nudge, grounded hands and shadow depth

Derek requested a teensy further down/out adjustment for Guido and Kowalski, more natural hands after the accepted fall catch into recovery, then noticed the victim initially falls into his own shadow.

- Knee offsets increased by .5 per axis: Kowalski kneeArtOffset {x:2,y:2}, Guido {x:2.5,y:2.5}. Lou and George remain unchanged. Existing overlap values remain 3/1.5/2/0 respectively.
- Catch approach and initial plant unchanged. Floor hand grips now stay fully planted through 4.25s (including landing bounce), fade to 4.65s rather than lifting after 4s. Victim arms gather at 4.25, relax at 4.65, and end at the ordinary LIE arm values at 5s, removing the bent floating-arm terminal pose before the existing grounded handoff/recovery. No impact, damage or total move/down/get-up timing changes.
- Shadow bug: clipLayerDepths reordered bodies into the lowest actor band but left the other actor's shadow above that band. It now returns both actor gfx depths below the lowest part of the reordered pair, preserving lower native depths. Wrestler.draw resets these normally after the move. Shared paired-layer behavior, not a stretch-specific rendering conditional. Regression covers both facings and differing ring depths.

Stage12 changes this pass: src/animation/clips/matMoves.js, src/animation/clipLayers.js, tests/legContacts.test.js, tests/clipLayers.test.js. Preserve all earlier uncommitted changes; no commit/merge/push/reset.

62 focused tests pass; build and git diff --check pass. Full tests/*.test.js: 1385 pass, 4 skip, same five known failures (landmarkFit, profileV2Normalization, two shipped-thigh ink checks, frozen profile-v4 identity). Extended catch test verifies fixed palms at 4.21s.

Evidence/scripts in research/animation/stretch-hand-settle-2026-11-15/. verify.mjs captures all four attackers against Lou in both facings. verify-shadow-recovery.mjs captures all four receivers against Guido in both facings, retaining arena/shadows and asserting both shadows below reordered bodies while holding. Initial check incorrectly extended that paired-only invariant past the clip into normal independent actor depth; corrected the diagnostic scope. verify-rise.mjs extends samples past the existing down delay into the actual get-up. Await Derek's visual acceptance; his screen reveals seam details the captures can miss.

Final actual-rise matrix: all eight receiver/facing combinations reach standing by 12.5s; captured rise at 10.1/10.7/11.5/12.5s. The existing five-second down interval after the clip remains. Preview reopened with Guido attacking Lou.
