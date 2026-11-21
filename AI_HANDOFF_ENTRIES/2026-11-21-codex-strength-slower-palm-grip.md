# Test of strength: slower contest and palm grip — Codex, Nov 21

Derek asked to check weird elbows, consider generated forearms for a more interlocked grip, and slow the move substantially. Changed testOfStrength from 3.1s to 9.4s. Establishing grip now takes 1.35s; three pushes at 3/5/7s, with receiver recovering some height between pushes, then knees and release/recovery. Damage unchanged: three 3-damage calls. Attacker still wins; no gameplay victory/randomization work.

Wider separation and natural elbow routing replace the old hands pulled across the face. Existing grip forearms are used on both sides, with painted palm anchors targeted reciprocally rather than wrist joints. Extended gripTarget's optional painted anchor to Wrist/Forearm as well as existing Ankle/Shin; rigs without the anchor fall back to wrist. New unit regression covers anchor and fallback. No generated art or bone-length changes. Recommendation: dedicated interlocked-hand variants, preserving each rig's real elbow→wrist length, rather than replacing whole arms. Await Derek's visual judgment before further art work.

Full suite 1459/1459 pass, build pass (existing chunk warning), diff check pass. All other full mat clips and damage deep-equal to start-of-task snapshot, including accepted flying mare and headlock takeover. Browser matrix results below. No visual acceptance implied.

Evidence: research/animation/strength-2026-11-21/ before-matMoves.txt, capture-before.mjs/capture.mjs, before.jsonl/first.jsonl, frame-*.png (current slow revision), verify.mjs, matrix.json/txt, preserve.mjs, tests.txt, build.txt. Preview opened at /tools/mat-preview/?move=testOfStrength&att=thesz-procreate-v1&def=george-roster-v1&light=v1. Everything remains uncommitted; no commit/merge/push/reset.

## Superseding ending: standing double wristlock, no hip toss

Derek requested George rise from his knees into a double wristlock, initially followed by a hip toss, then explicitly cancelled the toss. His far-arm note was old; clarified in chat. Final duration **12.6s**. First overhead contest/knees retained. George rises 7.8–9.35; worked wrist guided low near his waist, Lou near hand retains wrist while far hand threads to clasp Lou's own near wrist, full 8.85–10.7. Release 10.7–11.1, two retreat steps and settle at 12.6. Receiver ends stagger/standing, never flipped or thrown. No toss carry, impact event or additional damage. Three original 3-damage squeezes remain.

Final natural elbow route retained. Reverse-elbow trial raised the hands across the face and was rejected; capture-lock.mjs/lock-*.png/lock.jsonl are the retained low natural route. combo-* evidence is discarded toss work; ignore it. No new art.

Final regression checks knees→standing lock→standing release, second-hand own-wrist clasp, and no throw tilt/impact. Full suite **1460/1460** passes, build passes, all other full mat clips/damage unchanged from start snapshot. Browser early-contest 16-case matrix (Lou/Kowalski attacking four rigs, both facings): three [3,testOfStrength] calls each, no non-finite joints/page errors, all clean endings. Palm misses through hold: Lou→George ≤2.220620px; overall ≤15.138160px (Kowalski→Guido). That matrix predates the standing-lock ending. Final ending measured separately in Lou→George both facings in lock-matrix.json/txt. Handoff measurement update follows.

Final Lou→George both facings: worked painted palm gap ≤0.00005116px; own-wrist clasp gap ≤0.00005091px through 8.85–10.65; three hurt calls each, zero non-finite joints/page errors, no active handle at finish. All uncommitted, awaiting Derek’s eye.
