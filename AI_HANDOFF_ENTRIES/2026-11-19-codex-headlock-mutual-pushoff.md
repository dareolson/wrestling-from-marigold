# Headlock takeover: mutual shove and supported rise — Codex, Nov 19

Derek: Lou should forcefully push off to stand while George simultaneously pushes him off; the previous release lacked a motive and a physical means to rise. All uncommitted. No commit/merge/push/reset. Preserve prior approved moves and Derek's headlock layer order.

Changed only headlockTakeover build and grip list in matMoves.js. Duration remains 4.65, impact 1.65, single 9 damage hit, full mat hold through 3.0. Earlier entry, FK wrap, and mat hold poses untouched.

Release/rise:
- Far-hand clasp unloads 3.0–3.08; far palm reaches a fixed floor target during 3.05–3.18, remains through 3.45, releases by 3.65.
- Both men reach the other's near shoulder during 3.0–3.12; contacts fade 3.25–3.4. Lou's near arm straightens through shove. Root keys separate both men: Lou D-52 to D-81, George D-4 to D+12 by 3.3, then George settles D+15. These are kinematic choreographed pushes, no extra hit/damage.
- Neck carry fades 3.0–3.18 (was 3.0–3.3), so the head clears during the shove.
- Lou bends one knee underneath himself at 3.3; near-knee floor support blends in 3.18–3.32, out 3.55–3.75. Near-sole support takes over 3.55–3.8 through the ending. Body rise now has .72/.45/.12 tilt beats at 3.3/3.55/3.85 and leg extension through 4.18, settled standing 4.65. Floor hand is pinned while the shoulder moves up, then releases as foot support takes over.

Evidence in research/animation/headlock-pushoff-2026-11-19/: start snapshot, preserve/capture/verify scripts, JSON, screenshots, suite/build logs. Stills cover release/rise 3.0, 3.12, 3.3, 3.45, 3.55, 3.7, 3.85, 4.18, 4.65. preserve.mjs verifies every other mat move build/damage unchanged (Lou hammerlock, Guido wristlock, stretch/deathlock included).

Numerical contact doesn't establish visible force or art acceptance; Derek judges replay. Far hand remains behind George under approved layers and may be partly obscured. Earlier general mat-support limitation remains; only explicit rise support points are newly constrained.

Preview: /tools/mat-preview/?move=headlockTakeover&att=thesz-procreate-v1&def=george-roster-v1&light=v1 .

Final checks: full suite **1452/1452 pass** under Node 22.23.1; build pass (existing chunk-size warning); git diff --check pass. Browser matrix **16/16**, one [9,headlockTakeover] hurt each, no non-finite joints/page errors, all standing/down/supine/no active move after 5s. Full-weight neck gap (.7–3.0s) ≤0.049893089 px. Planted far-wrist to fixed floor-target gap during 3.18–3.45s: ≤16.222758 px (272 samples across 16 cases). This checks the wrist target, not painted palm edge.

Support miss detail: Lou attacker far-hand target gap stays effectively zero through 3.433s, reaches **1.450px** at 3.45s. George attacker has shorter reach: gap begins 3.25s and reaches **16.223px** at 3.45s. Thus the damage/neck/finite-joint matrix passes, but George-as-attacker support is a recorded miss, not a passing planted-hand check. Lou is the requested visual review case.
