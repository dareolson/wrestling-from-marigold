# Headlock takeover: combined grab/hop and turn-out escape — Codex, Nov 19

Derek requested two linked refinements: combine the head grab with the hop, and let George flip onto his stomach, get to hands and knees while still headlocked, then push Lou off. This pass supersedes the supine mutual-shove ending. Uncommitted; no commit/merge/push/reset. Real FK arm and Derek's exact layer order retained. Approved hammerlock, Guido wristlock, stretch/deathlock preserved.

## Entry

Far hand reaches the receiver's neck/head base (-5 rig units y) .08–.18, guides through .48, releases by .6 and transfers to the clasp .6–.75. Near arm clears the crown at .3 on the way up, begins closing at hop apex .38, swings down .48, closes by .6. Neck carry ramps .42–.6 (was .52–.7), staying full through 3.0. Hop lift remains 60; no arm art swap.

## Escape

George draws a knee across at 2.2, turns through a mirrored prone pose at 2.35 using existing step-key/facing convention, then gets his knees under his hips 2.6–3.0. Two floor hand targets ramp 2.4–2.65. Near hand leaves the floor for the shoulder shove from 3.0; far hand supports until 3.35–3.6. Lou follows the head up without releasing his wrapping arm; his far hand unloads the clasp 2.5–2.6 to support his own rise. Both push apart 3.1–3.3 as neck carry releases 3.0–3.18. No extra damage.

Both follow through to their feet by 5.15 (previous total 4.65). Receiver ending is now stagger, consistent with escaping on hands/knees and rising, instead of putting him on his back again. Uses the existing end/stagger executor, no runtime/state-machine changes.

First turn-out trial left the near knee/hand short of the mat; discarded. Revised near thigh comes under hip and receiver torso pitches toward the support while Lou follows the neck. Numerical support measurements are recorded separately from neck contact; no visual approval claimed.

Only headlockTakeover build/grip list in matMoves.js changed. Evidence/repro: research/animation/headlock-turnout-2026-11-19/. before-matMoves.txt is before BOTH requests; preserve.mjs deep-compares all other move builds/damage. Entry-only experiments in headlock-entry-2026-11-19 are superseded. Stills are trial captures until explicitly identified as final; matrix.json is final measured runtime.

Preview: /tools/mat-preview/?move=headlockTakeover&att=thesz-procreate-v1&def=george-roster-v1&light=v1 . Derek judges the look.

## Final checks and measured misses

Node 22.23.1 full suite **1452/1452 pass**, build pass (existing chunk warning), git diff --check pass. All other mat move builds/damage deep-equal to start snapshot.

Browser matrix **16/16** damage/neck/finite-joint cases: one [9,headlockTakeover] hurt each, no non-finite joints or page errors; standing/staggered/no active move at 5.75s. Neck gap through full carry (.6–3.0s) ≤0.049852184 px, including facing flip. The audit does not treat support gaps as passes.

Lou→George facing right, 2.75–2.92s support audit: near wrist→fixed floor target gap **1.319–2.980 px**; far wrist effectively zero. Near knee surface stays **7.298–8.893 px ABOVE** nominal floor, far knee **4.498–6.293 px ABOVE**. Thus hands/knees pose is authored, but both knees are not pinned exactly to the nominal floor. No support-perfect claim. Lou's supporting far-wrist target gap is effectively zero in this case, matrix worst **8.370 px**. Guide hand→neck/head-base target in Lou→George .18–.48s effectively zero.

Final stills: final-frame-4.png (.48s entry), final-frame-10.png (2.9s escape), final-capture.jsonl. Other frame-*.png are earlier trials. Knee clearance is a recorded miss for Derek's review; do not silently treat this move as visually approved.

Other matrix reach limits: entry guide-hand target gap reaches **21.031 px** across all pairings (Lou→George effectively zero); escape near-hand gap reaches **8.302 px**, far hand effectively zero. These are reach misses, not invalid-joint or neck-carry failures.
