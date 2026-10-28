# Get-ups G1-rev2: George's hand route above the hem (T2.6), the thigh backstop (T2.7)

2026-10-28 · Claude (Sonnet, PLAN_GETUPS T2.6-T2.7) · for Derek's G1-rev2 review. Local commits on `story/marigold-opening`, nothing pushed.
Full suite 979/979 on Node 22. Flag off and every other rig are unchanged; George's rig data is NOT changed (the path is a runtime patch in the film tool until Derek picks).

**Look first:** [g1-rev2/index.html](../research/animation/getups-2026-10/g1-rev2/index.html) (today | T2.6 | T2.6 + T2.7, both facings, 1x).

## Misses (read this first; measured, not judged)

1. **The hand still touches the thighs' art on 12 frames** (T2.6 alone; today 47): a hand sample is inside a thigh's painted area while the hand is behind the body, though 8 px+ above the hem (the thigh art reaches up beside the trunks). The T2.7 mask changes only 1 frame (9 px) on this route (5 frames, 9-23 px, on today's route). The plan's "none after T2.6" is not met.
2. **One frame has a 36.5 px hand-end jump** (R, frame 139, hand weight .69) while the wrist moves .5 px: the hand's art and draw order change between frames 138 and 139 (the grip latch, the A1 limitation). Today's route: 1.75 px max in the same window. I did not establish whether it is art or depth.
3. **IK only in the standing release** (hand weight above the via at .5). Below it, and in the rise, the channel blend and reach are as before; the rise's reach goes through the same via point, now at waist height.
4. **Runtime patch only.** Path point u -.4772 / v .6358 (1.5 hand lengths outboard, the wrist 29 px above the hem), via pose arm -.45 / elbow -1.8 (wrist .25 px off), path in `research/animation/getups-2026-10/g1-rev2/route.json`. Nothing in `george_roster_v1.js`.

Met: the hand's lowest point while behind the body is 8.3 px ABOVE the hem on every frame (today 8.8 px below; target >= 3 above); IK error <= .23 px; wrist step <= 1.2 px a frame (today 1.5); 17.6 / 26.1 px outside torso U thighs at the two depth swaps (today 13.1 / 12.1).

## What changed

- `aroundVia.path` (rig data, optional, validated 1-4 `{u, v}` points; `rig/backSell.js`), `pathPoint` (arc-length polyline).
- `Skeleton.aroundPathPoints`, `Skeleton.solveRouteHand`: the near wrist onto the route by IK each frame (the elbow branch nearest the current flex, three correction passes since the swing and guard terms are outside the solve), `Wrestler._routeHandDraw` blends it in over the first .1 of hand weight above standW.
- T2.7 (`?getups=v1`, `&handUnion=off` = before): the near forearm's mask and the depth-swap clearance use torso U near thigh U far thigh. The mask source is a Container of render-only copies synced on `prerender` (created once, destroyed with the skeleton); the clearance fails closed (a missing silhouette, an unusable distance or Infinity means not clear).
- Tools: `tools/debug/getups_route.mjs`. Tests: `tests/getUps.test.js` (22; path, IK on a stub arm both facings, union fail-closed).
- Not measured: ms per frame of the union mask (A3's cost number).

## Open for Opus

- Candidate data for George waits for Derek's pick; if he accepts, the numbers in `route.json` go into `george_roster_v1.js` (generator SPECS + generated file + agreement test) and the page's R column becomes the default.
- A true "no frame touches a thigh" needs a route that also stays out beside the trunks, or the mask acting on more than a few pixels; I did not find why the mask hides so little.
