# For Opus: elbow-drop continuous-descent review

2026-11-06 · Codex · Derek requested check and message for Opus. Reviewed through `e8c7498`, the runtime/source diff, G4a r2b page, saved revised JSON and Lou-on-George supine contact still. No fresh browser capture or animation playback. Docs only; no runtime changes or promotion.

## Result

The requested sequence correction is implemented: candidate flight stops at the 0.24 s apex key, then a 0.14 s quadratic descent carries the captured body directly into the contact pose. The previous completed mat-level flight followed by 0.30 s blend/reach is gone. Damage/jolt/shake remain together at the contact callback, rather than merely being shifted earlier while leaving the old motion. Existing far-side placement, art, roll-off and get-up are retained. Flag-off uses the full original flight.

Saved timings show hit at frame 44 after the move call versus 62 before (18 frames earlier), consistently across the eight cases. Lou supine saved contact elbow gap is 1.7 px; the contact still retains the selected far-side layout. These are source/saved-evidence findings, not a claim that Derek has approved the motion.

## Remaining observations

- **Absorption is abrupt but now follows the descent.** Lou's saved hip displacement sequence approaching the hit is 5.22, 9.53, 13.76, 17.91, 21.98, 25.97, 29.88 px/frame, followed by 13.47, -0.65, -2.99 as contact/compression takes over. This supports the acceleration claim, but do not describe speed as increasing all the way through contact. The page's “about 15 px/frame” understates the preceding 29.88 step (commit reports about 30–34). If Derek still wants weight, tune a short yielding compression/recoil against this sequence; do not restore a pause or soften the whole flight into a slow arrival. The current 5 px hip compression is authored absorption, not a physical simulation.
- **The mat-support marker is a proxy.** The probe marks `matLevel` when the down-state hip is <=18 px above its root, not when a hand, elbow, hip or torso first touches a mat surface. Revised hit and marker coincide, but this is not independent proof that no part supported the body before the hit. Rename it contact-pose height or measure first support explicitly; keep elbow-to-torso gap and callback timing separate. No need to block the visual review over a label, but avoid turning it into a physical-contact guarantee.
- **Projected overlap remains.** The page correctly reports outside-limb peak 2503 px and depth-conflict peak 1410 px. A smaller cumulative sum in the fixed comparison window partly reflects the earlier hit, not improved contact geometry. Preserve the raw/limb/depth distinction and existing overlap debt. Do not reopen the accepted silhouette without Derek's feedback.
- **Horizontal momentum remains authored.** Flight travel eases to its endpoint at apex, then the far-side root translation is linear over the descent. The quadratic pose blend establishes increasing vertical movement; it is not a complete ballistic trajectory. If a sideways kink is reported, check the root velocity at that handoff rather than changing the art.

## Next recommendation

Keep STOP at G4a r2b for Derek's normal-speed judgment: does the continuous fall now supply the weight he requested? If yes, carry the contact ownership and descent pattern into the remaining knee/drop dives using each move's own strike geometry. If not, scope only descent-to-compression absorption first. Preserve existing recovery and avoid adding impact amplitude or new art without a concrete need.

## Fresh validation

Node v22.23.1: `node --test tests/falls.test.js` — **64/64 pass**. Tests cover the cut clip, phase sampling and existing contact lifecycle; saved rendered evidence still matters for velocity and overlap. `git diff --check` passed. Full suite/build not rerun for this docs-only review.
