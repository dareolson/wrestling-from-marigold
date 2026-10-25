# Rise -> standing handoff: G5 package (`?risefix=1`)

2026-10-25 · Claude (Sonnet, PLAN_RISE_HANDOFF.md T1.1-T3.2) · for Derek's G5 review.
Local commits on `story/marigold-opening`, nothing pushed, nothing promoted. 851 tests pass. Everything is behind `?risefix=1`; without it the game is unchanged (`tests/riseFixFlagOff.test.js`, committed before any src change).

**Look first:** [viewer.html](../research/animation/rise-handoff-2026-10/viewer.html) (default | `risefix=1`, 7 rows, both facings, 1x / 0.5x, scrub, jump to swap), [README](../research/animation/rise-handoff-2026-10/README.md) for regeneration.

## Misses (read this first)

1. **`thesz` and `thesz-front3q-r1` do not reach 3 px.** Pose-only swap step with `risefix=1`: `thesz` 19.9 px, `thesz-front3q-r1` 25.5 px (every rise type; before: 63.8 / 85.4). `standingChannels` reports errPx 19.8 / 25.3: for these two rigs the grounded channels cannot put the shoulders and arms where the upright idle draws them. I tried solving the torso pitch as well: worse (27 / 36 px) and it put a pop inside the last segment, so I reverted it. Crops: `fixed/pairs/thesz*__*.jpg`. Not diagnosed further; Lou and George, the rigs in the viewer, are not affected.
2. **The facing turn (H5) is not touched.** When the opponent is behind, the receiver mirrors on the swap frame. As drawn, the step is still 55.7-61.8 px on Lou (default 83-105) and 45.0 px on George (default 69.1). That is the mirror, not the pose.
3. `george` sits at 2.98 px, 0.02 under the target.

## Cause table (T1.2, Lou supine-pain, facing -1; back waist / far shoulder / far wrist / head px)

Turn H5 31.3 / 18.0 / 44.9 / 4.3. H1 stale `this.pose` 16.6 / 16.6 / 23.9 / 16.6. H2+H3 rise end vs idle upright (hip height, `standingHipHeight` finish) 19.6 / 19.6 / 33.6 / 19.6. H4 overlays 0 at the swap. On Lou H1 and H2+H3 point opposite ways, so the net pose step was 3 px; on the other rigs they add (hip step at the swap, px: george-roster-v1 +18.5, thesz-roster-v1 +27.9, guido +23.0, kowalski +20.7, george +10.0, thesz-front3q-r1 -25.2). Quick rise ended on FALLS key 0: hip -38 px (Lou). Full table: `baseline/attribution.md`.

## What changed (all `?risefix=1`)

- `Skeleton.standingChannels`: per rig + facing + scale, the grounded channels for which `_applyGrounded` draws what `updateUpright` draws for `REST_POSE`. `_getUpPose` swaps only the FINAL key for it, so only the last segment changes. No durations, timers or earlier keypose touched.
- The swap (`_standFromRise`): `tweenPose('idle', 0)`, `moveBlend = 0`, `walkPhase = 0` (a wrestler floored mid-stride used to inherit a gait: new `supine-gait` case, 43.7 -> 0.63 on Lou), the swap frame skips combat blend, the worn-wrestler sway fades in over 300 ms.
- Tools: `rise_handoff_probe.mjs`, `rise_handoff_attribution.mjs`, `rise_handoff_report.py`, `rise_handoff_film.mjs`; `g4_package.py` gained options (no fork).

## Before -> after (pose-only swap step, worst part, worst of both facings, px; flags on = flags off)

| rig | default | `risefix=1` |
|---|---|---|
| thesz-procreate-v1 (Lou) | 65.7 (quick 92.6, gait 43.7) | 0.65 |
| george-roster-v1 | 58.7 | 2.55 |
| george | 56.2 | 2.98 |
| thesz-roster-v1 | 62.6 | 0.68 |
| guido-roster-v1 | 56.4 | 2.26 |
| kowalski-roster-v1 | 63.4 | 0.85 |
| thesz | 63.8 | **19.9** |
| thesz-front3q-r1 | 85.4 | **25.5** |

Metric: largest part-corner (Hausdorff) displacement, so it is larger than the joint-point numbers in the T4.7 write-up (31 px at the back waist is 65 px here). Frame-to-frame steps inside the rise stay <= 1.04 px. Full table: `fixed/table.md`.

D5 carried hand (Lou, supine-pain, default flags): hand-to-backWaist 0.141 px on the last rising and the first standing frame, 1.23 px max over the next 9, both facings, with and without the turn; identical with `risefix=1`. With sellart/aftermath off there is no carried hand to measure.

## Not claimed

- Whether it reads as seamless at 1x. Derek judges.
- Any fix for the thesz / thesz-front3q-r1 arms, or for the turn.
- Rise-start or mid-rise changes: none (`tests/riseFix.test.js` checks t <= K[-2].t is identical).
- Skipped rigs/rise types: none. 8 rigs x 6 cases (supine-pain, supine, prone, quick-supine, quick-prone, supine-gait) x both facings x opponent front/behind. The rises are forced in page (receiver put down, the game's own `_startRiseUp` / `_startQuickRise`), not reached through play.

## G5 questions

1. At 1x, is the stand-up seamless with `risefix=1` vs default?
2. Does any rig or rise type still pop (known: thesz, thesz-front3q-r1)?
3. Promote `risefix` to default?
4. The turn (H5): leave it, turn over a few frames, or choose the sit-up direction at rise start so he stands up already facing the opponent? Viewer rows "Lou, suplex receiver" and "George, ... opponent behind" show it.
