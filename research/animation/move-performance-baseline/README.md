# Move performance baseline (plan T0.2)

2026-10-22 · Claude (Sonnet) · evidence for `PLAN_MOVE_PERFORMANCE.md` §1 correction 1.
Footage is evidence, not approval. No visual claims are made here beyond what the depth numbers show.

## Setup

- Commit under test: `cf3cc0b` plus the uncommitted `tools/debug` changes in the commit that adds this file.
- Node 22. Dev server spawned by `tools/debug/harness.mjs` (`http://localhost:5199/?arena=1&p1=…&p2=…&notitle=1`).
- Cast (`WFM_PROCREATE=1` maps `thesz` to `thesz-procreate-v1`):

| Scenario | P1 | P2 | Attacker |
|---|---|---|---|
| `figureFour` | george | thesz-procreate-v1 | George, P1, faces right |
| `figureFourP2` | thesz-procreate-v1 | george | George, P2, faces left |
| `suplex` | thesz-procreate-v1 | george | Lou |
| `suplexReverse` | george | thesz-procreate-v1 | George |

- Commands (repeat per scenario; `$B` = this directory):

```sh
export WFM_PROCREATE=1 WFM_SHOTS_CLIP=250,230,750,320
# normal speed, 60 frames at ~80 ms
WFM_SHOTS=$B/normal WFM_SHOTS_N=60  WFM_DEPTH=$B/depth-normal npm run debug:play -- <scenario>
# slow motion: scene slowed to 0.2x once the scenario has triggered the move, 200 frames
WFM_SLOWMO=0.2 WFM_SHOTS=$B/slow WFM_SHOTS_N=200 WFM_DEPTH=$B/depth-slow npm run debug:play -- <scenario>
node tools/debug/depth_report.mjs $B/depth-normal/figureFour.json figureFour 1.6,2.6,3.4
```

- Slow motion is applied after the trigger, not via `WFM_TS=0.2`: the scripted setup (jab, headbutt, approach) has wall-clock windows and times out at 0.2x. The first ~100 ms of each move therefore plays at normal speed.
- Frames are 750x320 crops (x=250, y=230) from the 1100x700 viewport, JPEG q80, ~80 ms apart in wall time. Each film runs from the trigger press through control resumption plus about 2 s of game time.

## Files

- `depth-normal/*.json`: committed. Per rendered frame in which a clip advanced: clip id and time, both wrestlers' `x/y/state`, base depth, every textured part's `depth`, and its display-list index `z`. Includes every clip that played (jab and headbutt too); filter on `clip`.
- `depth-slow/*.json`: same, from the slow-motion runs, roughly 5x denser. Not committed (3.6 MB); regenerate with the command above.
- `normal/<scenario>/NNN.jpg`, `slow/<scenario>/NNN.jpg`: filmstrips. Not committed (32 MB). Regenerate with the commands above.
- Tools: `tools/debug/depth_probe.mjs` (sampler), `tools/debug/depth_report.mjs` (tables), and the `WFM_DEPTH`, `WFM_SLOWMO`, `WFM_PROCREATE`, `WFM_SHOTS_CLIP` hooks in `tools/debug/play.mjs`. All read-only against the game.

## Finding: correction 1 is confirmed

Both actors stand at `y = 360` for the whole figure-four clip (the clip's `transform.y` is 0 throughout), so both bodies get the same base depth, `12 + 360 * 0.03 = 22.8`. Over the whole clip (4.1 s, 242 to 1194 sampled frames per run) **every part's depth is constant**: one distinct depth set per run. Nothing in the clip changes cross-actor order.

The two bodies therefore interleave by sub-band, not as whole bodies. Offsets from base, back to front, for both rigs together:

| Offset | Parts |
|---|---|
| +0 | far forearm |
| +0.00001 | far upper arm |
| +0.00009 to +0.0001 | far thigh, far shin |
| +0.0005 | head |
| +0.001 | torso |
| +0.0025 | pelvis overlay (George only) |
| +0.003 | near thigh, near shin |
| +0.004 | near forearm |
| +0.00401 | near upper arm |

For example, in `figureFour` at 2.6 s the order back to front starts `w1.farForearm < w2.farForearm < w1.farUpArm < w2.farUpArm < w2.farShin < w1.farThigh …`. So the defender's far leg draws behind the attacker's far leg but in front of the attacker's far arm, and the defender's near shin sits under the attacker's near thigh. Parts are never grouped by body.

Where both wrestlers' parts share an exact depth (10 pairs, listed in the report), the tie falls to display-list order (`z`), and Phaser's sort is stable. **In both scenarios w1 sorts behind w2 on every tie.** The attacker is a different body in each.

## Answer: does the locked-frame cross-actor order differ between George-as-P1 and George-as-P2?

**Yes, in the sense that matters.** The sub-band order is the same, but the tie-break follows the player slot, not the role:

- `figureFour` (George P1): George loses every exact tie to the defender. Example: `w1.nearThigh < w2.nearThigh`, so Lou's near thigh draws over George's.
- `figureFourP2` (George P2): George wins every exact tie. `w1.nearThigh < w2.nearThigh` is still true, now with George's near thigh over Lou's.

Because the figure-four trap depends on exactly these crossings (near/far legs of both bodies), the same clip draws a different trap depending on which slot George occupies. The move editor and critic put the attacker wholly in front (`+0.01`, `tools/move-editor/move-editor.js:131`), so neither matches the in-game result in either slot. This needs the cross-actor layering of plan D1; no clip keyframe change can fix it.

One rig difference worth knowing: Procreate Lou's shins sit 0.00001 below his thighs (`+0.00009` far, `+0.00299` near; the `_shinUnderThigh` layout), while George's shins share his thigh depths. So the tie pairs differ by role of the rig, not only by slot: `w1.farShin < w2.farThigh` with George as P1, `w1.farThigh < w2.farShin` with George as P2. The probe shows the effect; it did not isolate the flag.

## Not measured

- Whether the in-game layering reads as a trap. That is a visual question for G1 and needs eyes on the filmstrips. This README makes no such claim.
- `suplex` and `suplexReverse` depth sets were recorded but not analysed here (the suplex moves `transform.y`, so depth does change during it; see plan §1 correction 3).
