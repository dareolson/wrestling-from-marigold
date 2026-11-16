# Abdominal stretch: outside swing into calf hook

Supersedes the whole-leg foreground layering in `2026-11-15-codex-stretch-model-legs.md`. Derek clarified: proximal thigh behind the victim's leg; swing the knee clear outside it; fold the calf back across the front. Bringing the whole thigh forward was the wrong interpretation.

Uncommitted in `/Users/home/Documents/wfm-stage12`, branch `moves/stage12`. No commit, merge or push. Preview: http://127.0.0.1:5233/tools/mat-preview/?move=abdominalStretch&att=kowalski-roster-v1&def=thesz-procreate-v1

The previous contact reached across to the victim's near calf, leaving the other victim leg across the attacker's knee. Contact now wraps the outside/far leg. The ankle swings outward and up between .45 and .7s, then folds back onto the leg by 1s. The facing-relative sweep mirrors with the move. It uses an 80% budget of the actual attacking leg lengths and can fit higher along the victim's hip-to-ankle line; this is necessary for Lou against Guido, where even the victim's knee is too low for a clean bent wrap. The drawings remain rigid and keep their knee overlap. The thigh stays behind the victim throughout; only shin/boot come forward during the wrap. No extra knee overlay, new art or scaling trick.

Added validated optional `legContacts[].sweep` timing/offsets in AnimationClip and MoveRuntime. The sweep modifies the target before the proportion-aware calf fit. Other contacts have no sweep and retain their old behavior. Preserved the painted support-sole floor contact, body hold, three pry attempts, squeeze damage and shove into the prone fall/bounce.

Tests exercise the outward-then-inward ankle target in both facings, invalid sweep timing, and the behind-thigh/front-calf depth contract across both rig channel mappings. 55 focused tests pass; build and whitespace checks pass. Full repository test-directory suite: 1378 pass, 4 skip, same five existing art/fixture failures. Evidence and reproducible scripts: `research/animation/stretch-outside-hook-2026-11-15/`.

Final browser matrix: all 32 role/model/facing combinations complete without browser errors. At full contact, hook error is below 0.000001px and supporting sole error below 0.00002px. The solved knee stays outside the victim's far-thigh axis in all cases (minimum axis clearance about 11px; this is a joint measurement, not a pixel collision guarantee). Captured outward kick, hold, strain and release for all four attackers, plus Lou against Guido. Both-facing escape checks retain stagger escape before the shove and the prone ending after it.

Changed this revision: `src/animation/clips/matMoves.js`, `src/animation/MoveRuntime.js`, `src/animation/AnimationClip.js`, `tests/legContacts.test.js`, `tests/clipLayers.test.js`. Preserve prior leg-length, sole, deathlock, wristlock and stretch changes in this worktree. Wristlock stronger pain detail is still pending.
