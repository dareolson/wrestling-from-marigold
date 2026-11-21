# Headlock takeover: longer bottom hold — Codex, Nov 19

Derek: bottom feels unfinished; hold George there, possibly use back-facing arm or a less shrimp-like version. Chosen revision keeps real FK wrapping arm and existing layering; no arm/art substitution. No drawn-arm proposal implemented. Everything uncommitted, no commit/merge/push/reset.

Only headlockTakeover build and its grip list in matMoves.js changed this pass. Landing remains 1.65s, one 9 damage hit. Mat clasp and neck carry now stay full until 3.0s (previously 2.0); release completes 3.3, far-hand clasp ends 3.25. Total 4.65s (previously 3.65), rise/release delayed 1s. Landing to release start is now 1.35s. No extra damage/squeeze events.

Lou's mat near/far knee folds reduced from 1.35/1.05 to .25/.65 at landing, then .18/.55 at 2.05; legs extend along the body. At 2.45 there is a small tightening pose, then return by 3.0. Deep knee tuck happens only after release for the rise. All overhead entry and standing receiver resistance unchanged.

George continues reaction keys through hold, then releases/sells 1s later. Added two natural near-hand IK contacts aimed at Lou's near forearm at 65% (2.02–2.5 and 2.56–3.05 with blends). These are peel attempts, not successful escapes. No attacker arm switch: would need an authored transfer and a fresh silhouette review. Derek's entire-move layer order retained.

Evidence/repro under research/animation/headlock-bottom-2026-11-19/: before-matMoves.txt, preserve.mjs, capture.mjs, verify.mjs, matrix.json, matrix-summary.jsonl, capture.jsonl, frame screenshots. capture keys include 1.65, 2.05, 2.45, 2.75, 3, 3.4. Preserve check passes for every other mat move build/damage (approved hammerlock, Guido wristlock, stretch and deathlock untouched).

Node 22.23.1 full suite 1441/1441 pass; build pass (existing >500 kB chunk warning); git diff --check pass. Browser audit now runs 5s and measures neck contact .7–3.0, beyond the old hold endpoint.

Visual judgment remains Derek's. No independent canvas-support guarantee added; prior limitation remains. Numerical neck contact does not establish painted crook/body contact or visual acceptance.

Preview: /tools/mat-preview/?move=headlockTakeover&att=thesz-procreate-v1&def=george-roster-v1&light=v1 .

Final matrix: 16/16 cases pass, one [9, headlockTakeover] hurt each; no non-finite joints or page errors, standing/down/supine/no active move after 5s. Max neck gap (.7–3.0s): 0.049893089 px.
