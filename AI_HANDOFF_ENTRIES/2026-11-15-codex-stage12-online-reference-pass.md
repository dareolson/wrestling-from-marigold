# Stage 12 — online reference pass

Derek asked for another review using online references. Work remains uncommitted in `/Users/home/Documents/wfm-stage12` (`moves/stage12`). No merge or push.

Full source list, access limitations, per-move findings and next animation targets: [reference comparison](../research/animation/stage12-reference-pass-2026-11-15/REFERENCES.md). Includes fresh captures of all ten moves and current after/contact stills. Distinguishes inspected historical illustrations, accessible transcripts/descriptions and school-uploaded videos located but not successfully played. Do not claim the YouTube demonstrations were watched frame by frame.

Preview: http://127.0.0.1:5233/tools/mat-preview/?move=flyingMare . Added optional `move` query parameter so a review link opens the intended move. Same-pair replay still reuses the game.

Implemented:

- Replaced the retimed snapmare flying mare with an independent 2.4-second arm/shoulder throw: wrist capture, straight pivot, shoulder load, knee support, forward rotation and back landing. Historical staging reference: Robbins/Gotch printed pp.32–33. Damage remains 14, impact 1.65s.
- Added `nearKnee` to the floor-contact contract and Skeleton's whole-body support translation. Used by the new flying mare; no leg scaling. Raised late flight keys after visual inspection found premature head/canvas intersection.
- Deathlock no longer sends both feet to the same lower-shin target: one higher knee trap, one lower ankle target. Still needs clearer limb layering and threading; not visually signed off.
- Fixed MoveRuntime dropping the grip's `to.above` value, which prevented the stretch's upper-torso hand target from being honored.

Validation:

- 14 targeted clip/contact tests pass; build passes; diff whitespace check passes.
- Full suite: 1369 pass, the same five existing art/fixture failures as the prior pass: landmarkFit, profileV2Normalization, two shipped-thigh source assertions, frozen profile-v4 identity.
- Final runtime checks: flying mare, deathlock and stretch each executed Lou→George and George→Lou, both facings (12 cases), no invalid coordinates, browser errors or stuck endings; expected 1/3/3 hit counts.
- Final flying-mare maximum joint step about61px versus142px before this pass, end seam7.2px. The earlier intermediate result48px preceded the knee-support/clearance changes. Treat these as diagnostics, not proof of a physically correct throw.
- Fresh deathlock contact sample: lower target error0px; higher target about0.28px, with fixed thigh/shin lengths. This does not establish correct overlap or every-rig reachability.
- Evidence: `research/animation/stage12-reference-pass-2026-11-15/measure/` and `contact-poses.json`.

Next priorities from the comparison: deathlock threading/layers; headlock takeover hip load and retained head control; backward-roll tuck/hand support; wristlock shoulder/face sell; abdominal-stretch upper-body staging. Test of strength remains prescribed rather than a contest. Leapfrog needs a directly playable demonstration and an actual coordinated duck from the runner. Prior input conflicts and AI-coverage findings remain unchanged.

Files additionally changed this pass: `src/animation/clips/matMoves.js`, `src/Skeleton.js`, `src/animation/AnimationClip.js`, `src/animation/MoveRuntime.js`, `tests/legContacts.test.js`, `tools/mat-preview/index.html`.
