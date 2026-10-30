# Get-ups T4.2: the snap into standing is the separation, now eased

2026-10-29 · Claude (Sonnet, PLAN_GETUPS Rev 7 T4.2) · for Opus and Derek. Local commits, nothing pushed.
Look first: [snap strip](../research/animation/getups-2026-10/g3/snap-strip.html) (Lou and George, both facings, before | after, 1x). Tools: `tools/debug/getups_snap.mjs` (probe), `getups_snap_strip.mjs`. Node 22.

## Misses first (measured, not judged)

1. **The plan's overlap case cannot show the snap.** A *standing* opponent runs its own `move()` separation on frame 0 and shoves itself to `80*s` (x 520 -> 456.17); the riser's root never moves (0 px, all 12 cases). The snap needs an opponent that is not standing, so the confirming case is the opponent held in `elbowDropping` (the state in the G3 cases). That is what the tests and the strip use.
2. **The four real G3 steps were not re-checked.** No recapture, as the plan says; `getups_g3.mjs` now samples `other.x/y/state` and fills `otherSide`, so the next capture will show the opponent's state at the standing frame. The probe's 33.8-63.8 px range matches the reel's 35-63 px.
3. **The pair still overlaps for ~11 frames** while the riser eases (6·s px per 1/60 s from a 0-30 px gap); the old snap hid that in one frame. The opponent is not moved.
4. Not touched (by plan): the 16 AI-next-action steps and the 19 backTuck start steps.

## What was proved

Forced backTuck rise, 1/60 s steps, Lou and George, both facings, gaps 0 / 30 / 150 px (`snap-probe-before.json`):

| opponent | gap | first standing frame, root step | 80·s − dist |
|---|---|---|---|
| busy (`elbowDropping`) | 0 | 63.83 px | 63.83 |
| busy | 30 | 33.83 px | 33.83 |
| busy | 150 | 0 | 0 |
| standing | 0 / 30 / 150 | 0 | (opponent moved itself) |

Facing is -1 -> -1 and 1 -> 1 in every case: not a facing flip. `s` = 0.798 for both rigs.

## What changed

- `Wrestler.js`: `_riseStandAt` is stamped where a full or quick rise reaches standing, under `getUpsCandidate()` only. For 250 ms after it, the separation block moves toward its target by at most `6 * s * dt * 60` px instead of snapping. The half-depth branch, rise keys and AI timing are untouched. Flag off is the old code path.
- After (`snap-probe-after.json`): standing-frame step 4.79 px (= 6·s) in every busy overlap case, ends 63.83 apart, controls 0. Flag off (`snap-probe-off.json`, `--off`): 33.83 px as before.
- Tests: new `tests/riseSeparation.test.js` (6: cap, per-1/60 s cap, control, window end and no stamp, flag off, stamp under flag only). `getUps`, `riseFix`, `riseFixFlagOff`, `georgeClutchFlagOff`, `riseSeparation`: 85/85. Full suite, build and coverage not run (not a gate).
- Commits: 19ab04f (probe, fix, tests, probe JSONs, g3 sampler), b1249e6 (strip).

## For Opus

- Derek's choice (plan step 3): ease (built) or push the opponent instead; the probe and strip work for either.
- Dev server: my vite on 5175 is still running (5173/5174 are held elsewhere).
