# Grapples Stage 1b (T1.5-T1.10): upper body only

2026-10-30 · Claude (Opus, running the Sonnet tasks) · local commits only. Plan: [PLAN_GRAPPLES.md](../PLAN_GRAPPLES.md).
Page: [g1b/index.html](../research/animation/grapples-2026-10/g1b/index.html) (frames local, `.git/info/exclude`).

## Misses first
- Under the belt, engage: 81-368 px body overlap on the first frames: boots at the film's 90 px start in idle stance. Today has the same (82-267). Not fixed.
- Under the belt, break: 21-139 px for a few frames, a hand on the other man's trunk at belt height as he lets go.
- Ankle daylight target 8: 6.3 on the first run after a page load (frame 0), otherwise 15.2-40.1.
- George's attacker collar: 2 engage frames over 3 px (9.3 px). Lou 0.
- Break step 43.8-54.5 px/frame (G1 33-42): the arms go home faster now.
- Guido and Kowalski at gap 80, untuned: torso on torso 50-166 px, grips within 1.6 px.

## Measured (12 runs, new, both attackers and facings)
Even, drive, steal, stall: 0 px under the belt, 0 torso on torso, every run. Torso 0 in every phase. Engage step 40-46 px/frame (G1 56-74). Planted slide max 2.16. Median step cost 3.7-4.1 ms vs 3.4-3.5 off.

## Plan corrections and choices
- **`lean` is not drawn.** The plan said raise lean; the rig only draws `bend`, and `_tickGrapple` forced it to 0. The first sweep's lean axis was dead. The A-frame is `bend` .38, and the tugs and strain now go on `bend` too.
- Gap 80, one number. 78 also passes but sits on the edge, where the strain's +-.02 leaves the band. Plan said smallest; I took the stable one.
- Below-belt split: `below` is the plan's hip-line count, `belowBody` needs a leg or pelvis in it (hand on hand at belt height is the difference). Silhouette 0 needs far more than ankle daylight 8: boots reach 25-30 px past the ankle.
- T1.8 cause: **renderer**. Far hand's target parked on the chest, the solve asked 4.98 rad of elbow, past the joint limit, and flipped: 30 px. Fix: `elbowCup` -0.6, so **the far hand sits on the forearm past the elbow, not on the elbow**. Derek may dislike this. Up the arm made it worse.
- Engage misses: out of reach; grips landed before the gap closed. Engage .22 -> .30, grips land .20-.29, ramp .10. Grab order kept: 200 / 230 / 260 / 290 ms.
- New: break let-go (`release`): torsos up and arms home, because hands dropped on the other man's hips.
- T1.5's helper was deleted in T1.7: with one gap nothing reads arm length. Removing the leak did not change the engage step (73.6 -> 71.2, 61.7 -> 63.2, 68.6 -> 67.8, 57.0 -> 56.1).
- Flag-off fixture re-recorded from 910e69f (before any grapple code), poses compared at a fixed tween delta: identical.

## Open from G1 (Derek)
1. Is 1.4 s the right length? 2. Which hands fail as art? 3. Which layering order?

## Gates
Suite 1054/1054, build, coverage 22, flag-off identical incl. poses, `grapples_assert` 13/13.
