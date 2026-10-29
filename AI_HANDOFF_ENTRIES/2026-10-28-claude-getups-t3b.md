# Get-ups T3b: the fatigue stall (D8), G2b package

2026-10-28 · Claude (Sonnet, PLAN_GETUPS T3b.1 + T3b.2) · for Opus and Derek. Local commits, nothing pushed.
Look first: [G2b page](../research/animation/getups-2026-10/g2b/index.html), [loop strip](../research/animation/getups-2026-10/g2b/strip.html). Tool: `tools/debug/getups_g2b.mjs` (+ `getups_g2b_page.mjs`). Node 22.

## Misses first (measured, not judged)

1. **Lou's frontKnee near hand is half-lifted through the whole stall**: weight .62 (tLift .37), and the breath takes its shoulder -> held point ratio to .96-1.01 of the arm, so at the extreme it cannot reach. Not fixed (G2b Q2). Lou's far hand: planted, ratio .73-.81. George frontKnee: both hands already released at the stall (weight 0). backKneeHurt: far hand on the knee, weight 1.
2. **Droop is torso rotation + hip sag only** (no head channel, S4): .10 rad, 3 px, eased over 200 ms. Whether it reads as head down is for Derek (Q3).
3. Steps entering / leaving the stall (stamina 5, px/frame, worst part): Lou bkh 9.1 / 3.1, fk 7.8 / 10.1, fkb 7.0 / 9.2; George bkh 13.9 / 3.5, fk 7.2 / 8.8. All below the same entry's biggest step within +-.04 t of the key at 100 % (16.5-22.9), so the stall adds no new worst step. backKneeHurt's entering step includes the facing flip, which lands on the stall's first frame.
4. Total time = today + stall to within one frame (17 ms) in all 36 films; stall measured 600 / 1233 ms asked 600 / 1240 (25 / 5 %). Stamina 100 and flag-off configs are today's tween call, unchanged.

## What changed

- `getUps.js`: `STALL`, `stallMs`, `stallTimeline`, `stallOffsets`, `STALL_DROOP_SIGN` (-1), entry field `stall` (validated: a key t). backKneeHurt* stall at KNEEL .46, frontKnee* at ALLFOURS .42; backTuck and legacy none.
- `Wrestler._startRiseUp`: one tween with a custom ease holding riseT on the key; stale tween stopped at the next rise start and on interruption (`_tickRiseFlip`). `Skeleton.updateGetUp` takes `stallOffsets`; hand targets / lifts read the un-breathed key pose (S3).
- Tests: 12 added to tests/getUps.test.js (52 there). Focused 122/122; full suite 1012/1012, build ok, `moves:coverage --check` 22 baselined gaps.

## For Opus

- T4.0 must not pick backTuck at stamina <= 25 % (it has no stall), per Rev 5.
- Dev server note: another vite held 5173 during this run; the films used my own on 5174 (same tree).
