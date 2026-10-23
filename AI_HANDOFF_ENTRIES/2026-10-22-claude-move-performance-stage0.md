# Move performance Stage 0: baseline and depth evidence (2026-10-22)

Claude (Sonnet), executing Stage 0 of `PLAN_MOVE_PERFORMANCE.md`. Local only; nothing pushed.

## What was done

- `8b03ad3` committed the audit, the plan, and Codex's handoff/method pointers (docs only).
- `cf3cc0b` T0.1: `figureFour` (George P1 vs Procreate Lou) and `figureFourP2` (roles swapped) in
  `tools/debug/play.mjs`. Both PASS; `play.mjs all` 32 PASS, 0 FAIL.
- `3f8c67a` T0.2: baseline film and depth dump, `research/animation/move-performance-baseline/`.
  New tooling: `tools/debug/depth_probe.mjs` (in-page sampler), `depth_report.mjs` (tables), and
  `play.mjs` hooks `WFM_DEPTH`, `WFM_SLOWMO`, `WFM_PROCREATE`, `WFM_SHOTS_CLIP`. No game code changed.

## Commands

```sh
source ~/.nvm/nvm.sh && nvm exec 22 npm test        # 733 pass, 0 fail
nvm use 22 && npm run debug:play -- figureFour       # one scenario per call
WFM_PROCREATE=1 WFM_SHOTS_CLIP=250,230,750,320 WFM_SLOWMO=0.2 WFM_SHOTS=<dir> WFM_SHOTS_N=200 WFM_DEPTH=<dir> npm run debug:play -- figureFour
node tools/debug/depth_report.mjs <depth.json> figureFour 1.6,2.6,3.4
```

## Finding

Plan §1 correction 1 is confirmed. Both actors stand at y=360 for the whole clip, so they share base
depth 22.8; every part's depth is constant across the clip (one distinct depth set per run). Parts
interleave by sub-band across bodies. The 10 exact cross-actor ties fall to display-list order and
w1 always sorts behind w2, so P2 draws in front whoever George is. Same clip, different trap with
George as P1 vs P2. Tables and the explanation are in the baseline README.

## Surprises

- `play.mjs` runs one scenario per call (`all` or a single name), not a list.
- `WFM_TS=0.2` breaks the scripted setup (wall-clock windows time out). `WFM_SLOWMO` slows the scene
  after the trigger instead; the first ~100 ms of each move plays at normal speed.
- A first draft of the depth report merged parts by insertion order and showed bogus P1/P2 differences;
  the probe now records display-list index `z` and the report sorts ties by it.
- Procreate Lou's shins sit 0.00001 under his thighs while George's do not, so tie pairs differ by rig.
- The filmstrips (32 MB) and the slow-motion depth JSON (3.6 MB) are untracked on purpose (disk);
  regenerate with the README commands, or commit them if Codex needs them.
