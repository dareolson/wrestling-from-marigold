# Seated deathlock rebuild, headlock takeover and backward roll

Derek authorized the next pass and called out the deathlock as particularly bad, with art generation available if needed. Work is uncommitted in `/Users/home/Documents/wfm-stage12` on `moves/stage12`; no merge or push. Used existing art for this implementation.

Preview: http://127.0.0.1:5233/tools/mat-preview/?move=indianDeathlock . A deathlock link now defaults to George attacking Lou, matching an intended kit; selectors still support all four rigs and both facings. Optional `att` and `def` query parameters select other rigs.

## Deathlock

Replaced the kneeling pile of limbs with a seated, reclining configuration. One knee is raised as the visible fulcrum. The first leg threads behind it, the second crosses lower on the trapping shin, then the attacker settles back for three pulls. Entry, threading, pressure and unthreading are separate beats. Duration 5.1s; damage remains three 5-point events at 2.0/2.65/3.3s.

Layering separates the receiver's two legs, the attacker's trapping leg and its shin/boot. The receiver's crossed leg can therefore pass in front of a thigh and behind the trapping calf. This was the major visual problem with a single attacker-in-front stack.

Leg-contact targets can now refer to an authored `l` or `r` channel, resolved through each rig's facing map. The raised trapping knee remains the correct target when George swaps near/far sides. A late grip pass (`afterLegs`) keeps the holding hand on the solved ankle instead of chasing the receiver's pre-IK foot. Validation prevents a late grip from redrawing an actor whose own legs have been solved, which would erase those contacts.

## Headlock takeover

Added a closer hip-load beat before the throw. The attacker now follows onto his side beside the receiver's head, keeps both arms in control briefly, then releases and moves clear before standing. The earlier seated version put his hips over the receiver's head. Damage still fires once at 1.2s; a short authored back rebound follows. This move now retains the receiver clip through the brief mat hold, so its rebound is authored rather than an immediate switch to the grounded landing driver. Normal completion hands the receiver to the grounded rig.

## Backward roll

Knees tuck toward the chest earlier; elbows fold and hands come toward the head through the shoulder roll, then the feet collect beneath the hips before rising. Fixed a shared placement issue: tilt at -2PI is upright, but bodyPlacementWeight treated it as fully airborne until the idle controller wrote 0. Weight now uses wrapped orientation so the final recovery blends into standing. Existing single-turn tilted poses retain their behavior.

## Validation

- 30 focused clip, leg-contact, layer and body-placement tests pass. Added an integration test for post-leg grip ordering and anatomical target mapping in both facings; rejects the invalid redraw case and invalid target channel.
- Full suite 1370 pass, five existing art/fixture failures: landmarkFit, profileV2Normalization, two shipped-thigh source checks, frozen profile-v4 identity. Production build and diff whitespace check pass.
- Deathlock 32 cases: all four-by-four rig pairings in both directions. Entry hold contacts maximum error 1.58px; all 32 escape via Action presses, no browser errors.
- Eight additional cases through the full pressure portion, including Kowalski/Guido extremes: maximum contact error 0.40px, all 8 escapes, no browser errors.
- Real executor runs for the three revised moves, Lou/George both roles and facings: correct hit counts, no invalid joints or stuck endings. Final headlock end seam 6.2px; roll 5.8px; deathlock 6.2px. The final headlock file supersedes the earlier summary after the side-landing/arm revisions.

Evidence and repeatable browser scripts: `research/animation/deathlock-rebuild-2026-11-15/`. Includes exploratory pose options, four-phase images, George attacking left, rig/pull matrices, preview capture, test/build logs and per-move measurements. Measurements establish connected geometry and completion, not artistic signoff. The compact ankle overlap and hand/support silhouette remain for Derek's visual judgment; custom boot/forearm art is still an option if that overlap cannot read at game scale. Escape cancellation still uses the existing recovery path.

Changed in this pass: `src/animation/clips/matMoves.js`, `src/animation/MoveRuntime.js`, `src/animation/AnimationClip.js`, `src/Skeleton.js`, `tests/legContacts.test.js`, `tests/bodyPlacement.test.js`, `tools/mat-preview/index.html`. Prior Stage12 changes remain in the same worktree. Wristlock, test-of-strength, leapfrog, scissors, stretch and backdrop priorities from the reference document remain available for subsequent passes.
