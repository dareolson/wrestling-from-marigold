# Abdominal stretch: model-specific leg pass

Uncommitted in `/Users/home/Documents/wfm-stage12`, branch `moves/stage12`. Preserve the existing move revisions. No commit, merge or push.

Preview: http://127.0.0.1:5233/tools/mat-preview/?move=abdominalStretch&att=kowalski-roster-v1&def=thesz-procreate-v1

Derek reported different leg problems on different models. Audited all four loaded rigs in both roles and facings (32 combinations). Lou's shorter leg could not reach the same low calf target used by the longer rigs; the old knee-direction rule could also switch solutions as the target crossed the hip axis.

- Fit the hook higher on the receiver's calf when the attacker's actual drawn leg lengths require it. Uses an 86% reach budget, retaining bend and preserving artwork dimensions. Longer legs retain the lower hook where reachable. New pure helper: `src/animation/legContacts.js`.
- Added an explicit facing-relative forward knee choice for this hook, preventing a branch flip during entry/release. Other moves retain their existing knee rule.
- Pin the supporting painted sole to the mat during the hold, rather than using the ankle as a floor proxy. The hook still resolves after arm-grip redraws.
- Derek clarified that the whole attacking leg must come around the outside, because exposing only the calf made the victim visually sever its knee. The entire hooking thigh/shin/boot now passes in front of the victim during the hook window, maintaining one continuous silhouette; ordinary leg layering returns during the shove/fall. Tried a separate front knee-cap crop earlier, but removed it. No new art or extra overlay sprites remain.

Preserved the accepted upper-body hold, Lou's three pry attempts, the unhook and two-handed shove into the prone fall/bounce. This is a proportion/contact correction, not a final approval of every painted knee overlap; inspect the tall/short pairings in motion before further art decisions.

Evidence: `research/animation/stretch-leg-audit-2026-11-15/` contains before/after joint and sole measurements, screenshots, audit/capture scripts and test logs. At full contact (1.3s and 2.6s), all 32 combinations reach the hook goal within floating-point tolerance and the supporting sole stays on the mat. Entry/release samples intentionally blend away from the contact and should not be read as full-weight errors.

Validation: 54 focused tests pass, including whole-hook depth continuity across both rig channel mappings and facings; build and `git diff --check` pass. Full `node --test tests/*.test.js`: 1377 pass, 4 skip, the same five existing failures (landmarkFit, profileV2Normalization, two shipped-thigh source/knee-band assertions, frozen profile-v4 artifact identity). Bare `node --test` also discovers two unrelated archived `_vault` AI tests; use the repository test-directory command for comparison. Final geometry matrix: 32 cases, zero browser errors, full-weight maximum contact error below 0.000001px and sole error below 0.00002px. The final outside-layer change does not change those joint positions.

Files for this pass: `src/Skeleton.js`, `src/animation/AnimationClip.js`, `src/animation/MoveRuntime.js`, `src/animation/legContacts.js`, `src/animation/clips/matMoves.js`, `tests/legContacts.test.js`, `tests/clipLayers.test.js`. Clip layer changes already present from the preceding stretch revision remain. Wristlock still needs the stronger pain pass requested earlier.
