# 2026-10-09 — Codex: recurring knee-gap investigation

Status: **unresolved; exact reported cutoff needs a matching frame**.

## Derek's correction to the prior diagnosis

The space is on both legs, appeared on previous Lou versions, and also appears
on George. Raising the calves did not improve it. It looks like a cutoff/gap,
not just a crease. Therefore do not attribute it to the Oct 8 shin-under-thigh
flag or prescribe new overlap paint without reproducing it.

## Evidence produced

`tools/debug/knee_motion_probe.mjs` runs the actual `Skeleton.updateUpright`
renderer, pauses the Scene, uses each wrestler's settled `POSES[idlePose]`,
and samples 96 phases per condition: walk, run, partial movement blend (0.21),
and pose-driven idle; both facings. Walk liftScale=0.5 matches Wrestler.draw.
This is a controlled renderer sweep, **not a recorded live stopping sequence**.

Final runs: `thesz-procreate-v1`, `thesz`, `george`, 768 frames each. Evidence:
`tools/debug/shots/knee-motion/<character>/`.

- `<mode>-<facing>.png`: 12 full-figure samples, proportional 2x scaling.
- `<mode>-<facing>-knees.png`: 5x knee close-ups, near on top, far below.
- `report.json`: every measured frame and transforms.
- `game-broadcast.png`, `game-no-scanlines.png`, `game-no-front-ropes.png`:
  the same paused game frame, then camera filters/scanlines removed, then
  front/side ropes hidden. These toggles exist only in the probe, not the game.

PNG alpha is composited through each Image's real world matrix and cached display
origin, using its actual frame. No source image was repainted or normalized.

## What the measurements do and do not say

The old `knee_ink_gap_sweep.mjs` takes the minimum distance between any pair of
thigh/shin ink pixels: touching at one edge suffices. That does not establish
coverage across the joint. It also explicitly disables gait.

The new enclosed-hole count (alpha >=200, ink brackets horizontally AND
vertically within 6 world px) remains zero in all sampled conditions. That is
**not absence-of-gap proof**: an exterior slit or wedge need not be enclosed.
A second vertical-bracket-only count sees open notches (up to 20 pixels for
current Lou, 23 for old Lou, 28 for George). Curved silhouettes and legitimate
spaces can contribute too; these counts are **not a pass/fail gate**. Knee
close-ups show open bend notches, but the reported full cutoff has not been
matched confidently to one of these frames.

Current Lou's declared thigh distal anchor and shin proximal anchor differ by
~3.26 near/~2.02 far world px; George ~8.12/~8.91. These match their configured
post-attachment shin offsets, not a newly proven cause. Old Lou deliberately
has no declared distal knee anchor, so that comparison is unavailable.

## Independent scene effect isolated

The front rope crosses both calves and produces a horizontal cutoff in the
actual game. Hiding ropes removes that line without moving any body parts.
Front rope depth is 25.5, above ring wrestlers, intentionally (Arena.js dynamic
rope setup). This is reproducible scene occlusion, **not yet identified as
Derek's reported knee gap**. Asked Derek to distinguish rope cutoff from a
separate opening at the thigh/calf joint; no answer received during these runs.

## Probe corrections, retained for honesty

Early trial runs sampled the partially tweened startup pose and used liftScale
0.38. Replaced with settled per-character poses and the actual 0.5 walk lift.
An early `sc._frozen` flag did not stop updates; no production code reads it.
The final probe uses `sc.scene.pause()`. Early screenshots that changed pose
between toggles were overwritten by final paused captures. Do not reuse those
trial observations as controlled comparisons.

## Next

Match a screenshot/video from Derek to a phase, state, ring depth and render
path. If it also appears in the rig tuner, ropes are excluded immediately.
Investigate the isolated component or rendering layer, then fix and replay that
same frame. Do not add coverage paint, remove intentional ropes, or zero artist
offsets based on an unconfirmed hypothesis.

No runtime code/config/art changed by this investigation. Only the probe and
evidence were added; other sessions' existing dirty changes remain untouched.
No gameplay tests or certification runs were needed because no runtime fix was
made. Local server/Chrome execution required sandbox escalation and was approved.
