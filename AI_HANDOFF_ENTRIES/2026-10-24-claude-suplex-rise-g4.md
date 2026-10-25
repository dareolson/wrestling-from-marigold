# Suplex receiver rise: G4 package (Lou, `?sellart=v1` + `?aftermath=v2`)

**Update 2026-10-24: Derek approved at G4 and promoted both flags to default.** They are on in the game unless the URL has `?sellart=off` / `?aftermath=off`. The support plant stays parked behind `&plant=1`.

2026-10-24 · Claude (Sonnet, session 4 of [PLAN_SUPLEX_RISE.md](../PLAN_SUPLEX_RISE.md), rev 4) · for Derek's G4 review.
All commits are local on `story/marigold-opening`; nothing is pushed or promoted. 838 tests pass.

**Look first:** [viewer.html](../research/animation/suplex-rise-2026-10/viewer.html) (aft | on | off, both facings,
1× and 0.5×, scrub, event jumps), [README](../research/animation/suplex-rise-2026-10/README.md) for regeneration.

## One target missed (read this first)

T4.7 had two targets for the stand-up handoff (riseT .85 → standing + 400 ms).

| Target | Before D5 (T4.3) | After D5 (T4.7), facing −1 / +1 | Result |
|---|---|---|---|
| no unbroken stretch > 15 px from the back for more than 50 ms | 450 ms | **0 ms** | met |
| largest per-step jump of the near contact ≤ 4 px | 12.12 / 14.19 px | **31.22 / 34.57 px** at 6550 ms (first standing frame) | **missed** |

The jump is a whole-body step, not a hand step. In that same frame the painted back waist steps 31.35 / 34.71 px, the
far shoulder 18.02 / 19.95 px and the far wrist 44.9 / 49.7 px, while hand-to-back distance stays 0.14–0.16 px
(6533 → 6550 ms). The same step is in `aft` (back waist 31.35 / 34.48 px, far shoulder 18.02 / 19.82) and in `off` at
`4613c0f` (far shoulder 18.02 / 19.85, near wrist 12.12 / 14.11), so it is the existing rise → standing re-pose, and
the flags do not cause it. Before D5 the contact moved only 12–14 px because the hanging hand sits near the torso
centre; with the hand on the back it now travels with the back, so the step shows at full size. I did not retune the
getup keyposes (out of scope). I have not diagnosed the cause beyond that: the final supine key (hip 88, torso π, legs
0) and the upright idle (lean .05, crouch .05, lLeg −.05 / rLeg .14) are different poses, and the swap happens in one
frame. Stills: `on/suplexReverse/strip/` at 6533.33 vs 6566.67 ms, and `closeups/standing.png`.

## What changed (all behind `?sellart=v1`; the standing parts also need `?aftermath=v2`)

| Piece | Commit | Behaviour |
|---|---|---|
| Lying hold | `81fe5bf` | After the last back clutch the near hand settles at the back waist: weight .80 ± .08, 1.6 s breath, a pure function of time since release. No timer changes. |
| Contact-driven grip art | `81fe5bf` | Grip when the measured contact is ≤ 15 px, 100 ms dwell, 250 ms refractory. Replaces "grip at any t > 0". |
| Rise `from` | `81fe5bf` | Rise eases from the hold weight to the severity-scaled reach instead of dipping to 0. |
| Standing back hand | `f56bf2c`, `a822721` | Near hand on the back waist during the carried recovery; grip art carries in. |
| **Carried rise (D5)** | `fa9969f` | Rise keeps its reach to t = 1 (`backRiseWeight(..., carry)`); the standing hand starts on the arm the rise ended with, at full weight, then eases into the probed back-hand pose over 300 ms. `bend` keeps its fade-in. |
| Rise-end arm probe | `befa6ea` | `Skeleton.carriedRiseEndArm`; `_solveGroundedReach` split out of `updateGroundedReach` (same behaviour). |
| Tools | `7b876c7`, `b94ac3f`, `9be1205` | `motif_curve.mjs` (windows, handoff run and step), `rise_end_arm.mjs`, `g4_package.py`, viewer. |

D5 applies only to a carried rise: `sellart=v1` + `aftermath=v2` + painted `backWaist` + back pain + supine rise.
Aft-only, George, flag off, quick rise: unchanged paths (tests in `tests/carriedRise.test.js`, `tests/sellArtFlagOff.test.js`).

## Measurements

ms with the near hand > 15 px from the painted back waist / window span, facing −1 (+1 where it differs):

| Window | aft | on, T4.3 | on, T4.7 |
|---|---|---|---|
| lying: clutch end → rise start | 4200 / 4200 | 0 / 4200 | 0 / 4200 (0 / 4716.7) |
| rise: start → riseT .85 | 766.7 / 766.7 | 16.7 / 766.7 | 0 / 766.7 |
| handoff: riseT .85 → standing | 266.7 / 266.7 | 266.7 / 266.7 | 0 / 266.7 |
| standing → +2 s | 2000 / 2000 | 1083.3 / 2000 | 900 / 2000 |

- **Rise end vs standing target (T4.5):** rise-end arm lArm −1.205 / lElbow 2.260, elbow flex 129.2° (limit 157.6°), painted
  contact 0.17 px from the back waist, grounded and in the upright draw. Probed standing hand (absolute on Lou's settled
  idle): lArm −1.160 / lElbow 2.200, 2.33 px. Difference −0.045 / +0.060 rad. The un-carried rise ended 45.3 px away.
  Identical in both facings.
- **Lying hold:** distance 4.62–10.63 px (facing +1: 5.12–11.76); the contact travels 5.96 × 0.74 px (6.60 × 0.82).
- **Hand art (R1):** one grip run from 366.7 ms; back to the fist at 7783.3 ms (facing −1) / 7766.7 ms (+1), i.e. about 1.2 s into the recovery; no grip → fist → grip under 250 ms.
- **Interruptions (T4.4, T4.6 tests):** pin in the hold, hit in recovery, choreography, a move and `pain.until` expiry
  all release the hand and the art on the next draw; the carried recovery's largest per-frame channel step near expiry
  is under .02 rad; across the handoff the near-arm channels move ≤ .05 rad per frame.

## Deviation to flag

The combat guard replaces arm angles at `combatBlend` 1, which would erase the hand on the back. During the carried
recovery `draw` scales the guard by (1 − hand weight), so **both arms relax**, not only the near one. Drawing only: no
damage, timer, input lock or guard state changes. With the flag off the guard value is untouched.

## Not claimed

- Nothing here says the sequence reads as one hurt action, or that the hold looks alive. Derek judges the film.
- The support plant is **parked** (`&plant=1` only, as in `4613c0f`); the far hand in these films is the base rise.
  The Codex support-art request is on hold.
- George as receiver is unchanged: no painted back waist, no hold, no hand on the back. Stage 6 is not started.
- The unit test for hand continuity uses stub forward kinematics; the real-rig numbers are the T4.5 probe and the
  T4.7 film (0.14–0.16 px at the swap), not a unit assertion on painted anchors.
- Flag-off equality is claimed for pose channels (`tests/sellArtFlagOff.test.js`) and rise/appearance context
  (T0.2), not for rendered pixels.
- No mp4s: `ffmpeg` is not on PATH here. Viewer frames are 480 px WebP q80 (15.49 MB), not the full-size strips.
- Aft and off were re-filmed at `fa9969f` + working tree for the viewer; clutch-peak time differs by up to 183 ms between
  runs (sell plan). Rise start and standing are identical in all runs.

## G4 questions for Derek

1. At 1× playback: does impact → clutch → lying hold → rise → stance read as one hurt action, or separate moves? Does the
   lying hold look alive or frozen?
2. Is the hand returning to the back on his feet right, too much, or a dip?
3. The whole-body step at the standing frame (31 / 35 px at the back waist): is that a visible problem to fix in the
   getup keyposes, or acceptable? (Plant parked, so no far-hand question.)
4. Promote `sellart=v1` to default for Lou, or keep iterating?
5. Next: port to George (Stage 6), or ask Codex for the open-palm art first?
