# Get-ups T4.0 / T4.1: selection on, G3 reel

2026-10-29 · Claude (Sonnet, PLAN_GETUPS T4.0 + T4.1) · for Opus and Derek. Local commits, nothing pushed.
Look first: [G3 page](../research/animation/getups-2026-10/g3/index.html), [loop strip](../research/animation/getups-2026-10/g3/strip.html). Tools: `tools/debug/getups_g3.mjs` (one seed; `--off` = counts only), `getups_g3_page.mjs`. Node 22.

## Misses first (measured, not judged)

1. **Handoff step into standing:** 4 of 86 rises that end in the `standing` state step more than 5 px from the last rise frame to the next: Lou backTuck 63.2 px nearShin (seed 10 #4), George backKneeHurtStraight 42.4 nearForearm, George backTuck 35.5 and 34.8 (G2 forced films gave .6-2.5 px). Not investigated; frames linked on the page.
2. **Rise ends straight into an AI action:** 16 of 38 such rises change pose by more than 5 px (up to 74 px) on the step after the rise, because the AI starts a move (slamming, lockup, dropkicking, holding) that very step. That is the next action's first pose, but the player sees it.
3. **Rise start:** 19 rises step over 10 px from the last down frame to frame 0 (all backTuck, George nearForearm 11-13 px).
4. **Prone and stalls barely happen naturally:** 2 prone rises (both Lou, frontKneeStraight, seed 9; both stalled, stamina 0 and 15 %); no natural rise at stamina 20-30 % so the 25 % step is not in the reel; lowest stamina at a rise 0, 15, 36 %. Stall enter / leave on those: 8.3 / 10.4 px per frame.
5. Mix: backTuck 55, backKneeHurt* 67, frontKnee 2 of 124; reasons: avoidedRepeat 80, onlyEligible 29, pick 15; 10 repeats of a family, all with only one family eligible; no fallbacks; 0 cut short. Getups off (B1a): George 23 prone rises and 98 rises vs 63 on; Lou 113 vs 61 (sell plans differ on purpose; matches diverge).
6. Matches are not frame-for-frame repeatable (state before the loop sleeps is load-time dependent); seeds repeat the random stream only.

## What changed

- `getUps.js`: `chooseGetUp(ctx, prevFamily, rand)`, `GETUP_WEIGHTS` (f9fbfc3).
- `Wrestler`: rise-start snapshot (`_riseSnap`: stamina %, `_backSellRiseState()`, turn), `_pickGetUp` = override or `chooseGetUp`, `_getUpLog` (last 50, incl. quick rises), `_lastGetUpFamily` (18489d7). Under the flag prone now plays frontKnee. Flag off unchanged.
- Gates: full suite 1023/1023, build ok, `moves:coverage --check` 22 baselined gaps; focused set incl. riseFixFlagOff, georgeClutchFlagOff, sell* 196/196.

## For Opus

- Item 1 is the one to look at before promoting: frames linked on the page.
- Dev server: my vite on 5174 (another holds 5173).
