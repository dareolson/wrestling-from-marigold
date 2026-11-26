# Codex — character-shadow projection review, 2026-11-25

**ACCEPTED by Derek, 2026-11-25:** “I'm thinking this passes, i've been watching for a while and not seeing errors.” This supersedes visual-review-pending notes below. Preserve the current reference angle, softness, opacity, consistent projection, support anchor and separate MULTIPLY pass with no body cutout. Still opt-in; no default promotion, commit or push requested.

Derek requested character-shaped dynamic shadows from the archival reference and then reported self-shadow overlap/disappearance during ground moves. The first opt-in prototype produced an accepted visual direction, not final move coverage. Earlier symptom patches are superseded by the broader projection review.

Current source: `src/rendering/characterShadows.js`, focused `src/Wrestler.js` hook/oval suppression, `tests/characterShadows.test.js`, `tools/debug/character_shadow_review.mjs`. Preview server port 5187; `shadows=v1&shadowAngle=reference`. Original direction available without shadowAngle; defaults not promoted. No rope/Arena/constants/Skeleton edits by Codex for this work. Shared sessions may have other changes; do not stage the worktree wholesale.

Root defects: down-state identity projection duplicated the body; original-angle interpolation passed through a zero-area matrix; combined-shadow checks concealed possible per-actor disappearance. Replaced with a fixed light projection for all poses, retained George's painted-sole anchor, and separated full cast from body coverage/display composition. Softness/opacity/standing direction retained. See [full review](../research/animation/character-shadows-2026-11-25/README.md).

Checks: 144 focused tests, build, diff check pass. Four browser scenarios cover reference-angle falling elbow and original-angle knockdown in both facings; each actor's full and exposed cast stays nonzero, zero fully covered body pixels contain shadow, zero depth failures/page errors. Detailed frame data/captures in the review folder. This is bounded numerical evidence, not Derek's visual approval or all-move certification.

Next: Derek reviews normal-speed live falls and ground moves. Remains opt-in; 2.5D height/depth ambiguity, fractional-alpha/renderer filter agreement and target-device upload cost remain limitations. No commit/push requested.

## Superseding update — boot-edge rendering

Derek reported a persistent lighter boot rim. All binary, partial-alpha and original-alpha body cutouts are now removed. Native layering with a separate MULTIPLY shadow blend pass is current. Diagnostic `body` coverage is computed only on request, never used to clear visible shadow pixels. Normal-alpha batching had changed final opaque grounded pixels despite correct depth/render-list values; multiply reduced the frozen grounded comparison from 1,544 changed pixels / max difference 36 to zero pixels differing by more than one RGB level. Detailed notes and final-image evidence are in the review README. Earlier mask-overlap checks are historical and superseded. 144 focused tests and build pass. User visual review remains pending; no default promotion, commit or push.
Final-image regression PASS: `review-multiply-interiors/results.json`, 487 frames; each actor maintains full/exposed casts, zero final-render RGB changes in six deep-interior body comparisons across the elbow sequence, zero depth/runtime errors. Earlier two-pixel edge checks remain in evidence as noted; current four-pixel interior margin is explicit. Safari reopened for Derek; visual acceptance pending.
