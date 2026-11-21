# Test of strength: doubled forearm at hops — Codex, Nov 21

Derek reports doubled Lou forearms at/just before hops. Close-up captures at 8.85/9.35/9.65/9.85/10.3, plus temporary per-part alpha isolation, identify Lou far forearm crossing his near bicep/torso while its own upper arm is hidden. Hiding George free forearm does not remove the shape; hiding Lou far forearm does. No additional sprites or art variants were being spawned.

Single retained source change: remove the independent attacker farForearm foreground override from the 8.25–10.85 wristlock layer window. Far upper arm/forearm stay together behind Lou torso; hand/clasp tip remains at its existing target. No pose, arm solver, grip timing, hops, damage, gap or control changes. Both facings close-up frames inspected after change. No visual acceptance implied.

50 focused mat/layer/leg tests pass, including back-arm occlusion regression. Other full mat clips/builds/damage unchanged from task snapshot; diff check pass. Runtime verification recorded in matrix.txt/matrix.json. No full suite/build gate rerun, no commit/push.

Evidence research/animation/strength-forearm-route-2026-11-21/: before-matMoves.txt; audit.mjs before/layered ±1 captures + frame transforms; isolate.mjs hideLouFar/hideGeorgeFar captures (temporary alpha only, diagnostic); verify.mjs matrix.json/txt; tests.txt; preserve.mjs. isolate tint capture stayed grayscale due presentation rendering; alpha isolates identify the part.
