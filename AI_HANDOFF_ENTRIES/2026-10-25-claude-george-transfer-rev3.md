# George transfer Rev 3: the hand goes around the body, swaps only when clear, no elbow bezel (G8 package)

2026-10-25 · Claude (Sonnet, PLAN_GEORGE_TRANSFER.md Rev 3, T8.0-T9.1) · for Derek's G8 review.
Local commits on `story/marigold-opening` (T8.0 fe97361 .. T9.1 2a1ed73), nothing pushed. 930 tests pass.

**Look first:** [g8-viewer.html](../research/animation/george-transfer-2026-10/g8-viewer.html) (5.4 MB of its own frames; it also loads the G7 frames next to it, so open it from that folder). George `suplex`, `suplexFlip` and a prone run, G7 beside Rev 3, 1x / 0.5x / 0.25x, plus close-ups of the hand going behind and coming out, each at 1x and slowed to 0.25x.

## Misses (read this first)

1. **The prone run misses the 2.5 px-a-frame limit three times** (wrist step relative to the back waist): the prone back clutch **3.26 px** at 1533 ms, the prone rise start **16.63 px** (the G7 film had 9.84 px at the same frame) and the standing entry after the prone rise **2.85 px** (probe 3.88 px; the straight path 4.46). The prone rise has no hand route (the rule the plan left out of scope), so the hand snaps from the hold to the rise's pose; it is bigger now because the hold sits further from rest (holdW .45 -> .7). I did not tune it. The supine runs are 1.82 and 2.00 px in the clutch, 1.57-1.74 in the rise, 1.56-1.61 standing.
2. **"No forearm pixel inside the torso silhouette" is not 0.** Counted on rendered frames (forearm shown vs hidden, mapped into the torso alpha): hold, clutch, rise start, standing and recovery 0 in the supine films, but in the rise (t .2 to .85) 1 to 80 px (4.9 to 8.5 px deep). The control, the same scenario with the Rev 2 depth order (forearm physically behind the torso), gives 2 / 6 / 46 / 52 px at rise .2 / .34 / .55 / .85 (4.9 deep) against the mask's 1 / 8 / 47 / 44, so these are not forearm over the torso; I could not explain them. I report the control next to them.
3. **The plan says the latch decides the want. It cannot.** At HEAD the wrist is within the 15 px contact line only once it is already on the painted art, and the measured clear range ends 17.4 px out, so the latch never overlaps clearance and a latch-gated swap would never happen. The want is now the route (the back reach weight past .2, any back clutch item, the standing hand weight past .5); the clearance still decides when.
4. **The swap in is not at the via point.** It happens at the first frame the whole hand is clear of the art, which is the very start of the back clutch (about 2 px clear of the art, 11 to 16 frames before the route reaches its via weight), not when the hand gets to the via point; coming out it is at the via pose (12 to 15 px clear).
5. **Thin margin on George's hold weight:** holdW .7 puts the wrist 14.52 px from the back waist against the 15 px line (margin .48 px, was .65).
6. **Changes the plan did not name, each forced by a measurement:** the back clutch reach takes .4 of the clutch (was .25) and its squeeze/relax keys move to .5 / .6, because the longer route moved the hand 3.5 px a frame at .25; the standing recovery fades in over .8 s on a rig with a via pose (was .2 s); the combat guard is given up completely until the hand has passed its via pose (hand weight .5) and comes back over the last of the release; the compact (short) clutch is not fixed: 4.83 px a frame in the probe vs 4.12 for the straight path.
7. **Cost: about +1 ms a frame** (headless Chrome, software GL, whole game step, two George wrestlers with the hand behind the body: 7.53 vs 6.73 ms in the viewer's run, 9.36 vs 8.36 ms in another).

## What changed

- **D9 around path.** `backSell.aroundVia = { u -0.25, v 0.9069 }` (G8a, candidate B) plus `recoveryArm -0.6 / recoveryElbow -0.4` (the standing via pose, from new `tools/debug/around_recovery_probe.mjs`: wrist 8.03 px from the via point on both facings, all four hand points clear by 16 px or more) and `approach .4`, in the generator SPECS and `george_roster_v1.js` identically; `backSellSupport` validates them. On the mat and in the rise the reach to the back waist is a polyline in the reach weight (posed place -> via over [0, .2], via -> waist over [.2, 1], backwards on the way out; `aroundGoal`); standing, the near arm channels run start -> via pose -> settled over the recovery hand weight (`aroundChannel`, via at .5). Lou has no `aroundVia`: his goals are untouched (his fixture test is unchanged).
- **D10 clearance swap.** `rig/silhouette.js` (distance field of the torso alpha) and `Skeleton.handClearance()` test the wrist, the contact, the forearm's distal midpoint and the hand's far end (the last painted point of the forearm art); `Wrestler._handUnder()` changes only while all four are at least 1 px outside the art; out of context (pinned, a move, another sell part) it resets at once.
- **D11 no bezel: the torso-alpha mask.** A Phaser 4 per-object Mask filter on the near forearm (inverted torso Image, **viewed through the filter's own camera**; through the main camera it lines up with nothing) hides the forearm where the torso is painted, so the forearm keeps its depth over the upper arm. Chosen over the elbow-cap copy because it worked, cost about 1 ms a frame, and kept the elbow (14 to 23 px outside the art) over the upper arm. Falls back to the Rev 2 depth order without `forearmOverUpperArm` or on a part that cannot take filters.
- **Numbers to re-read:** holdW .45 -> .7 (the route is longer); everything else in the plan's Progress lines T8.2 to T8.6.
- **Swaps (3 films):** suplex 2 (in 266.7 ms, out 8333.3 ms), suplexFlip 2 (1966.7, 8333.3), prone 4 (1483.3, 6100, 6966.7, 8333.3); every swap clear (smallest 1.94 px), 0 skipped, shortest gap 866.7 ms.

## G8 questions for Derek

1. Does the hand go around his body (lower, then up behind)?
2. Is the elbow bezel gone?
3. Legs: pain, too much, too little?
4. Lou: keep the legs and breath?
5. Approve?

## Not claimed

No visual judgement is made here. Lou is untouched since G7 (his rows are in the G7 viewer). Out of scope and untouched: legs during a lying wait with no hold (writhe last), the prone rise's missing hand, the facing turn. George's grip donor (Codex) is still pending.
