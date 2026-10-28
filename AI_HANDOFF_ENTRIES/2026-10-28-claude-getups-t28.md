# Get-ups T2.8: evidence pass on George's hand route (G1-rev2), nothing tuned

2026-10-28 · Claude (Sonnet, PLAN_GETUPS T2.8) · for Opus, next to Derek's G1-rev2 verdict (approved). Local commit, nothing pushed.
Look first: [g1-rev2 page, "Verified (T2.8)"](../research/animation/getups-2026-10/g1-rev2/index.html#verified). Numbers: `research/animation/getups-2026-10/g1-rev2/verify.json`.
Tools: `tools/debug/getups_verify.mjs` (series, items 3-4), `tools/debug/getups_verify_pixels.mjs` (items 1, 2, 5; run the first one first). Node 22.

## Misses first (measured, not judged)

1. **The 36.5 px hand-end jump is the IK elbow branch flipping**, not the latch, art or depth. Frame 138 -> 139: wrist .51 px, elbow 34.9 px, hand end 36.5 px; forearm texture and `handUnder` unchanged. Art frozen from 139: 36.52 px; depth frozen: 36.52 px; elbow branch frozen at its 138 value: elbow .2 px, hand end .89 px. `solveRouteHand` picks the branch with the flex nearest the current flex; the two branches are at +-1.58..1.62 rad and the current flex crosses 0 (.024 -> -.019), so it flips with no hysteresis. Not tuned.
2. **R moves the wrist 15.3 px on the first standing frame** (frame 55, hw 1.0; elbow 16.2, hand end 16.9; today .1). The T2.6 table dropped it (it kept hw < 1). The IK puts the *wrist* on backWaist; the rise holds the grip *contact* there (the wrist is ~15 px from it). Blend-out (hw .60 -> .50) is gentle: wrist <= 1.2 px a frame, drawn wrist off the path <= 3.18 px by design.
3. **Turn feet jump, no values dropped:** flip frame near knee 1.0 px world (the pivot; x moves 8.12 px to hold it), far knee 76.3, near ankle 75.0, far ankle 57.3 (body-relative 84.5 / 66.9 / 65.4). Near-knee x drift .46-.72: 6.43 px; far-ankle x drift flip -> .72: 2.39 px. Derek could not see it at 1x.
4. **Scope:** IK covers the standing release above `standW` only (107 route frames); the rise and the release below `standW` still use the via/channel route.
5. T2.6's "12 frames touch a thigh" was sampled geometry, not painted pixels.

## Measured

- **Painted pixels** (hand alone over black and white, background gradient removed, PNG): R, 153 hand-behind frames facing left plus the 19 worst per facing: lowest painted pixel 9.9 px (left) / 5.2 px (right) above the hem, 0 painted px below it. Painted hand px over the near thigh's art: <= 9 px on 23 frames; far thigh 0; **visible** hand px over a thigh: 0 on every frame. Today (B), worst frames: 6.4 / 11.7 px below the hem, 63-89 painted px below it (51-54 visible), 148 painted px over the near thigh (2 visible). Sampled numbers were within 3 px of painted ones.
- **Union mask:** parents are identity on all 8 rigs. Copies did not carry alpha or a parent's transform (alpha .5 / 0, a parented thigh all mismatched): fixed in `Skeleton.syncUnionCopy` (`?getups=v1` only; no change at alpha 1 / no parent), 2 tests, all four cases match. Forced hand-below-hem control, 3 variants x 2 facings: visible hand px over the near thigh 102-934 (torso-only) vs 2-11 (union); far thigh 0-242 vs 0. On the real route there is nothing for it to hide.
- **Cost** (ms per game.step, headless, median / p95): legacy 5.4 / 7.4, B 5.6 / 7.9, R 5.6 / 7.8, RU 5.7 / 8.1; route frames R 5.7 / 7.8, RU 5.9 / 8.4; solveRouteHand .1 / .2 ms a call; updateUpright calls per frame 1.78 (R) vs .75 (B).
- **IK residual of the returned pose:** 0 px on 106 of 107 route frames, .227 px on the last. 0 missing values in any displacement series.

## For Opus

- Misses 1 and 2 are new (R-only, both on the IK). Derek approved R at 1x; neither is tuned. If you want them fixed: branch hysteresis (keep the previous branch unless the other is clearly nearer) and a wrist-to-contact offset at the IK start are the two small candidates; say so and Sonnet builds them as a G1-rev3 candidate.
- The page's sampled-geometry table is relabelled; the painted numbers supersede it.
