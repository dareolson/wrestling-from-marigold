# George transfer Rev 2: hand under the body, still hand, leg life (G7 package)

2026-10-25 · Claude (Sonnet, PLAN_GEORGE_TRANSFER.md Rev 2, T6.0-T7.1) · for Derek's G7 review.
Local commits on `story/marigold-opening` (T6.0 6901bea .. T7.1 fb7cacf), nothing pushed. 912 tests pass.

**Look first:** [g7-viewer.html](../research/animation/george-transfer-2026-10/g7-viewer.html) (9.75 MB with its frames; George before/after for `suplex` and `suplexFlip`, Lou before/after, one prone rise; 1x / 0.5x).

## Misses (read this first)

1. **The facing-turn step got bigger for George.** The contact (= the back waist, hand-to-back 0 px) jumps in the one frame where the figure mirrors on the first standing frame: `suplex` 13.58 -> 25.46 px, `suplexFlip` 15.06 -> 27.95 px (Lou 31.08 -> 31.08). The plan called the turn "unchanged"; for George it is not, because the anchor now sits on the contour, further from the mirror axis than candidate C. The pose-only stand-up step is still 2.54 px (George) / .65 px (Lou). The turn code is untouched; whether to fix the turn is the separate call the plan reserves for you.
2. **Prone rise still has no hand on the back** (unchanged rule), and with `handUnder` the forearm comes out from under the torso at the rise start and goes back under at standing (4 depth swaps in that run, shortest gap 1283 ms).
3. **Standing: more time over 15 px.** George 350 -> 550 ms of 2000 (both scenarios); Lou 900 -> 900.
4. **The hand still moves in the world during the hold** (George hold travel x/y 3.2/2.2 -> 1.2/3.9 px, 3.5/2.4 -> 1.3/4.3 px): it follows the chest and hips. Relative to the back waist it varies only 0.55-0.6 px. Lou 6.0/.74 -> 1.2/2.5 px.
5. **Thin margin on George's hold weight:** holdW .45 gives 13.99 px at rest and 14.35 px at the worst point of the leg cycle against the 15 px line (margin .65 px).
6. The lying window is longer in the after films (3783 vs 2400 ms) only because the two films' sell plans time their clutches differently.

## What changed

- **D7 (all rigs):** `holdWeight` is constant (`holdW`); the chest breathes: `holdOffsets(sec).torso = .04 sin(2 pi sec / 1.6)`. The reach re-solves each frame, so the hand follows the body.
- **D8 (all rigs):** `HOLD_LEGS`: 3.6 s cycle, near knee 0-1.4 s (`nearThigh .40 / nearShin -.35`), rest, far knee 1.8-3.2 s (`farThigh .35 / farShin -.30`), rest; `hip +2` at each peak; sin^2 lifts; 400 ms ramp-in; drawn through `limitKnees`. The window lengths (1.4 s, .4 s rests) are mine; the plan gave only the cycle and the order.
- **Rise continuity:** the hold's last offsets ride into the rise and ease out over t in [0, .15] (`riseHoldCarry`, `Skeleton.updateGetUp(..., holdOffsets)`). Hold -> rise step, worst part, both rigs, both facings, five points in the hold cycle: **.36 px** with the carry (23.96 px without). New probe `tools/debug/hold_rise_probe.mjs`.
- **D6 (George only):** `backWaist` moved to candidate A (u .2558, v .6077, on the contour); `backSell.handUnder: true` puts `nearForearm` (`base + .00095`) and `nearHand` behind the torso (`+ .001`) while the grip latch is on, in the back clutch, hold, rise and standing recovery (`Wrestler._handUnder` -> `Skeleton.setHandUnder` -> `setDepth`). The upper arm stays in front. Lou has no `handUnder`, so his depths are unchanged (tested in every phase).
- **Re-measured at A** with the shared tools (not reusing C's numbers): holdW **.55 -> .45**, recovery **-0.5/+1.0 -> -0.7/+1.1** (1.94 px, flex 103.1 deg, limit 157.6). `hold_weight_sweep.mjs` now scores each weight over the whole hold cycle (torso breath, knees, hip) instead of a +-.08 weight trough; `contactPx` stays 15.
- **Depth swaps:** George 2 per supine run (under in `down`, normal in `standing`), shortest gap 6266-6300 ms; no two inside 250 ms; Lou 0.
- **Lou fixture:** only `holdWeight` changed (now .8 throughout); every other section is identical (per-key comparison; hunks all inside the `holdWeight` lines). The adapter keeps the retired `breath` .08 in `values` so that section stays byte-identical.

## G7 questions for Derek

1. Is George's hand now under his back, not on his belly (lying, rise, standing)?
2. Do the legs read as pain, or as too much or too little?
3. Lou with legs and breath: keep it?
4. Approve?

## Not claimed

No visual judgement is made here. Out of scope and untouched: legs during a lying wait with no hold (writhe last), the prone rise's missing hand, the facing turn. George's grip donor (Codex) is still pending.
