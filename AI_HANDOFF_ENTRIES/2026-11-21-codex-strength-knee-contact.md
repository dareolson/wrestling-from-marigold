# Test of strength: continuous grip through knee-to-rise — Codex, Nov 21

Derek reports Lou still loses grip after George kneels. Expanded live contact verification to 7.0–11.08 (previous checks wrongly split 1.35–7.7 and 8.85–11.08, skipping the transition). Baseline fails: 18.83859px wrist/palm gap at 8.2667, despite the grip being fully enabled. Rise roots separated the receiver beyond Lou reach.

Only three retained choreography changes: attacker 8.25 root m-48→m-18, attacker 8.85 m-34→m-26, receiver 8.25 m+75→m+65. Both close distance as George rises; main grip target/timing, forearm depth, pain hops, shove and gameplay reset unchanged. Transfer root gap is now 83 at 8.25 and 80 at 8.85 (was 123/88), keeping the hand reachable.

Continuous live 60Hz contact check, both facings: max wrist gap across 7.0–11.08 ≤.334699px (worst now 10.733, rather than 8.266); no page errors/non-finite joints. Three 3-damage calls, 295-unit end gap, immediate controls and 20.043 units movement over 12 frames retained. Preview transition captures inspected; no visual acceptance implied.

50 focused mat/layer/leg tests pass, with transfer spacing regression and grip-weight checks expanded to include the previously missed interval. All other mat clip builds/damage unchanged from task snapshot; diff check pass. No full suite/build gate, commit, push or reset.

Evidence research/animation/strength-knee-contact-2026-11-21/: before-matMoves.txt, verify.mjs, before.txt + before-matrix.json (expected failure), after.txt/matrix.json (pass), audit.mjs closer ±1 captures/JSON, tests.txt, preserve.mjs.
