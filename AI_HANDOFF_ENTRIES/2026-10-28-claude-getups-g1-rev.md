# Get-ups G1-rev: Lou's forearm (T2.4), George's elbow-out (T2.5)

2026-10-28 · Claude (Sonnet, PLAN_GETUPS T2.4-T2.5) · for Derek's G1-rev review. Local commits on `story/marigold-opening`, nothing pushed.
Full suite 974/974 on Node 22. George's rig data and every flag-off path are unchanged.

**Look first:** [g1-rev/index.html](../research/animation/getups-2026-10/g1-rev/index.html) (T2.4 numbers and frames, T2.5 table and 14 loops).

## T2.4 Lou's forearm: no size change found, no fix made

Per frame through the flip (`backKneeHurtBack`, both facings, `tools/debug/getups_forearm.mjs`): the near forearm draws the same size all the way (box 16.42 x 49.26 px, scale .1403, elbow -> wrist 37.95 px). Ruled out: the grip art swapping on the flip (it swaps at t .30 with the same box), the far forearm on the back (separate object, 41.9 px tall, never holds the back reach), a two-anchor binding, depth. What changes at the flip is the art's mirror (`flipX`) and the IK re-solving onto the other side's back-waist point; the elbow fold is the same (2.26 vs 2.25 rad). Drawing the forearm over the upper arm for the whole rise made no visible difference before the flip, so I reverted it (nothing from it is committed except the probes). **Open: which frame and which arm Derek means.** The 2x strip of frames 22-28 is on the page.

## T2.5 George's hand: candidates, all still below the trunks somewhere

Candidates are runtime patches of `aroundVia` (`tools/debug/getups_elbowout.mjs`); B = today. C1-C3: via at backWaist height, 1.0 / 1.25 / 1.5 hand lengths outboard, upper arm back .4 / .6 / .8. P1-P3 = C1-C3 plus the new optional `aroundVia.phase` (arm first, elbow after).

1. Lowest hand point on the standing route vs the trunks' lower edge (the last opaque row of the torso art; George's trunks are painted on it): never <= 0 for any candidate. B 10.3 px below; C1/C2/C3 12.5 / 12.5 / 11.7; P1/P2/P3 12.2 / 11.4 / 8.3. The via itself is now ~24 px above the edge (B: 8.8 px below), but the hand dips on the way in and out.
2. The waist-height via is out of reach as asked: 11.6 / 11.5 / 9.9 px off at the asked swing; best picks 9.8 / 8.5 / 9.9 px (B 8.0). The elbow goes negative (folded behind the upper arm), -1.1 to -2.0.
3. Outside torso U thighs at the depth swap: C1/P1 0 px (fail closed), C2/P2 6.7, C3/P3 16.1; B 13.1 in, 12.1 out.

New code: `aroundVia.phase` (validated in `backSellSupport`, `recoveryVia` passes it, `aroundChannel` takes it; absent = byte-identical, tests in `tests/backSellSupport.test.js`). No candidate is in `george_roster_v1.js` yet.

## Open for Opus

- Candidate choice waits for Derek (G1-rev Q2); P3 is the lowest-dipping of the seven. If none is wanted, a hand path that stays above the hem needs its own route (interpolate the hand position, not the channels), not another via point.
- The feet jump at the turn (52-79 px) is still unaddressed; Derek has not yet said whether it shows.
