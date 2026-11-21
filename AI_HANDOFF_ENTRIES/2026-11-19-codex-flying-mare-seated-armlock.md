# Flying mare: sharp shoulder throw into seated armlock — Codex, Nov 19

Derek found flying mare redundant with snapmare; accepted the direction of retaining the thrown arm into an armlock and requested a sitting receiver and a snappier throw (old version floated). This pass implements that sequence, awaiting Derek's eye. Everything uncommitted; no commit/merge/push/reset. Accepted headlock, Lou hammerlock, Guido wristlock, stretch and deathlock preserved.

## Choreography and runtime ownership

Only flyingMare's spec and flyingMareClip in matMoves.js changed, plus its existing regression in tests/legContacts.test.js. Full clip 4.15s (was 2.4), impact .82 (was 1.65). Turn/capture through .36, throw .36–.82 (was ~.75–1.65); authored lift maximum 35 (was 75), descending by .64. All FK art, no generated assets.

Receiver lands with tilt 3π/2 and torso bend 1.25, settles seated bend 1.4. Attacker kneels behind/beside the worked shoulder, holding the same wrist and pressing near the elbow. Two small wrenches at 1.7 and 2.35; free-hand reaches at the trapped arm and asymmetric leg reactions. Release starts 2.95–3.25, receiver guards arm then slumps onto back by 4.15; attacker stands. Same one 14-damage impact, no extra wrench damage.

Removed flyingMare's `land:'back'`: that generic impact callback released the receiver from the paired clip at impact, which would discard the new seated lock. Receiver now stays paired/holding through the armlock; existing executor still finishes him down/supine at the end. No generic runtime or state-machine changes.

## Contact

Near wrist capture starts .06–.16 and remains full to 2.95; attacker far hand moves from shoulder load (.08–.82) to near-elbow control (.82–3.25). Reciprocal receiver-near-arm IK runs after the throw placement, so it can meet the gripping wrist when natural authored arm pose is out of reach. Receiver reach solves before attacker's elbow-control hand; all retain real bone lengths. No hot swaps. Existing first pass with one-sided wrist IK left ~18px gaps at impact and was discarded.

Receiver's held arm is raised behind him (nearArm -1.5, tightening -1.65) rather than dangling down. The seated hold is a shoulder/straight-arm extension with wrist plus elbow control, not a cross-armbar or hammerlock. Numerical wrist equality does not establish the painted grip silhouette or acceptance.

Evidence/repro: research/animation/flying-mare-armlock-2026-11-19/ before-matMoves.txt, preserve.mjs, capture.mjs, verify.mjs, screenshots/JSON and logs. preserve.mjs compares every other full mat clip, build and damage with start snapshot, including accepted headlock. Original snapmare files untouched. Test now checks fast landing, increasing flight turn, seated bend, retained wrist and absence of generic landing handoff.

Preview: /tools/mat-preview/?move=flyingMare&att=thesz-procreate-v1&def=george-roster-v1&light=v1 . Matrix attackers Lou/Guido (owners), four receivers, both facings.

## Final checks and measured misses

Kneeling base revised after first captures: both thigh/ankle channels tuck calves back (lLeg -.15 / rLeg -.05; folds 2.2 / 2.2), removing the dangling shin below the mat. final-frame-4/8/9.png and final-capture.jsonl supersede earlier frame-* kneeling poses.

Full suite under Node 22.23.1: **1453/1453 pass**. Build pass (existing chunk-size warning). `git diff --check` and full-clip preserve checks pass. No other move clip changed.

Final 16-case browser matrix: Lou/Guido attacking four receivers, both facings. Exactly one [14,flyingMare] hurt each; zero non-finite joints/page errors; receiver remains paired/holding through the seated lock rather than released at impact. All finish standing/down with no active move after 4.8s.

Full seated hold (1.05–2.95): worst wrist gap **0.425494 px** across matrix; Lou→George effectively zero. Elbow-control gap effectively zero in all cases. Lou→George seated support proxy (`seatWorld`) **1.392–1.520 px above** nominal floor; attacker near-knee surface **0.957 px below** nominal floor.

Recorded miss: during fast rotation (.16–.82), worst wrist gap **10.431451 px** across matrix; Lou→George **8.681278 px** at .600s. Logical grip is retained throughout, but physical wrist equality is not perfect during flight. Do not report this as a flawless uninterrupted painted grip. No visual acceptance claimed; Derek judges snappiness, seated arm leverage, pain and release.

Reproduce: with local Vite at :5173, `node research/animation/flying-mare-armlock-2026-11-19/verify.mjs` writes matrix.json and summaries to stdout. capture-final.mjs writes final stills and joint data. `node .../preserve.mjs` checks all other mat clips against before-matMoves.txt, including accepted headlock.
