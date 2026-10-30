# Grapples Stage 1 (T1.0-T1.4): the tie-up behind `?grapples=v1`, stopped at G1

2026-10-30 · Claude (Sonnet) · local commits only, nothing pushed. Plan: [PLAN_GRAPPLES.md](../PLAN_GRAPPLES.md).
G1 page: [g1/index.html](../research/animation/grapples-2026-10/g1/index.html) (frames are local, `.git/info/exclude`).

## What was built
- `src/animation/lockup.js` (pure): phases (engage 70/30 + jolt, seeded tugs, step-pulse drive, rope stall, steal hitch, break), grip list per D4,
  leg offsets that hold the planted foot, `holdGapFor(armLen)`. Flag `grapplesCandidate()` in `Wrestler.js`; `holdGrips` takes `at`.
- Arena: `_tickGrapple` (flag branch of `_tickLockup`), `_holdLockupGrips` (grips A,D,A,D,A,D, then the D8 layers; `&grapplesLayer=alt`),
  input buffered in the engage, timeout 1.4 s then the break. AIHandler: the beat starts at engage end (0.35-0.9 s). Flag off: untouched.
- Tools: `tools/debug/grapples_flagoff.mjs` (+ fixture), `grapples_contacts.mjs`, `grapples_film.mjs`, `grapples_g1_page.mjs`.

## Decisions I made that Opus should check
- **Hold gap from the attacker's arm (D9), not one number.** A fixed 44 was measured on the old `george` pilot; `george-roster-v1` has a 65 px
  arm (Lou 87.5) and missed the collar by 12.7 px. `holdGapFor = 0.7*arm - 21` (Lou 40.3, George 24.6), fitted by eye on four rigs.
- **Arms start at lArm .3 / lElbow .7** before the IK: 1.1 / 1.0 left Lou's far hand 41-47 px short (the elbow folded the wrong way).
- **Lead leg = the near-side leg.** Lead legs forward made the feet cross by 58 px; stance retuned (lead -.06/-.02/-.12, rear -.34/-.40/-.26).
- Grips stay with the original grabber through a steal (D5); only the poses and drive direction swap.
- Pose tween is wall-clock, so the browser flag-off check compares x and state exactly and leaves poses unchecked.

## Measurements (G1 film; px at scale 1; both facings; full table on the page)
- Hand-to-target, held in the even or the drive pose alone (contacts script): 0.0 px on every grip, except George's far elbow in the drive pose 3.2 px.
- **In the film, attacker grips miss:** Lou attacker collar max 9.2-13.9 px, elbow 7.7-8.6 px, 3-4 frames over 3 px. **George attacker collar 22-27 px,
  elbow 22.5 px, 54-56 frames over 3 px** (of ~105). Defender grips 0 px. Cause not isolated: the tugs move the pair 2-5 px and the engage ramps the arms.
- Grab order (ms): attacker collar 100, elbow 133, defender collar 183, elbow 200 (the plan's times, to the frame).
- Collar flex (attacker near arm) 0.06-0.99 rad over the whole run; head-centre gap 49.5-76 px (Lou), 34-70 px (George).
- Ring travel 33-38 px over the 1.4 s run incl. the break (no input); steal at 0.7 s: net 0.4 / 2.3 px (it drives, then reverses). Case (d) as specified (60 px out) never reached the stall zone: the drive only moves the pair ~15-20 px, the zone is 34 px from the rope (see below).
- **Planted-foot slide 1.98-2.21 px/frame (limit 2.5)**; today 7.6-36.
- Feet crossing (overlap past the other man's front ankle): Lou attacker 7 px, George attacker 27 px; today -16..-41 (apart).
- Max part step px/frame: engage 56-74 (today 36), steal 10-32, break 33-42. Cost: median 3.1 / 2.5 ms per game step vs 2.3 / 2.2 flag off.
- Exits at 0.8 s, first-frame max part step: headlock 99-102, suplex 73-80, whip 82-99, body slam 73, piledriver 81, hip toss 75, arm drag 82, hammerlock 62-69
  (all in the table; this is the Stage 3 list). Every exit starts from the new pose with no lead-in.

## Misses and open items (measured, not judged)
1. Attacker hands miss during the run (above); George is the worse case. Needs a decision: tune the poses, shrink the tugs, or reach by IK on the torso.
2. **Case (d) at 60 px out does not exercise the stall** (the page's case (d) rows are the same as (b): no `stall` frames). Checked separately with `grapples_film.mjs ... d2` (defender 40 px out, not on the page): a `stall` phase appears in all 4 runs (7-26 frames) and the pair's x is constant through it (travel stops; the push strain keeps going). Not filmed as a strip.
3. Feet cross for George as attacker (27 px); gap and stance are coupled to the arm reach.
4. `_tickGrapple` has no Node test (Arena needs Phaser); the film and the flag-off check cover it.
5. Not checked: hand art. I looked at engage frames by eye (hands reach neck and elbow, legs cross); Derek judges the strips.

## Questions for Derek (G1)
1. Is 1.4 s the right length? 2. Which hands fail as art (the Codex request)? 3. Which layering order: default or `alt` (case b strip)?

## Gates
Full suite 1053/1053 (1035 + 18 new), `npm run build` ok, `moves:coverage --check` passed (22 baselined). Flag-off fixture identical (60 frames, x/state).
