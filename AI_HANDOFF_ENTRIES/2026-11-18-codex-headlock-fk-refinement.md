# Headlock takeover FK refinement — Codex, Nov 18

Workspace `/Users/home/Documents/wrestling-from-marigold`, branch `story/marigold-opening`. Uncommitted. No commit, merge, push or reset. Derek judges the look; this entry records changes, measurements and misses.

## Starting point and retained decisions

Derek rejected the generated wrap arm: short forearm and a frame-zero swap. Claude's uncommitted FK rebuild supersedes the Nov 16 generated-arm pass. This pass uses the real FK arm throughout. No new artwork generated or activated. Existing rejected assets/registrations were left alone.

Retained 3.65s duration, single 9 damage impact at 1.65, .38 hop and overhead arm, .56 downswing, .75 clasp, far grip swap during .6–.75, joint carry nearElbow→nearWrist at .35 with in [.52,.7], out [2,2.3]. Retained Derek's exact whole-move layer order: George above Lou's torso, only Lou's near arm over George. No runtime/rig changes this pass.

## Changes in `src/animation/clips/matMoves.js`

- Lowered standing near arm .9→.45. Receiver bend at .75 .7→1.05; at 1.0 .35→.95, crouch .18 at both keys. The first trial deepened the bend without lowering the crook and raised the receiver's feet; discarded.
- Mat keys 1.65–2.0: attacker tilt 1.18→.82, lift -102→-112, nearArm .25 / nearElbow 1.85; asymmetrical folded legs. Release tilt at 2.3 .95→.75.
- Receiver mat arms now nearArm -.65 / nearElbow 1.2, farArm .25 / farElbow 1.0. First mat trial lifted receiver above canvas; lowered crook afterward.

## Measurements and checks

`research/animation/headlock-refine-2026-11-18/` holds scripts, final JSON, screenshots, logs, and start-of-task matMoves snapshot.

16 browser cases: Lou/George attacking Lou, George, Kowalski and Guido, both facings. Every case exactly one `[9,"headlockTakeover"]` hurt call; no non-finite joint coordinates; no page errors. All finish standing/down/supine, no active move. Per-frame full-weight neck→35%-forearm contact sampled .7–2.0s: worst **0.049820875 px**. Blend-in/release intervals intentionally are not a zero-gap hold.

Lou→George facing right, drawn hip-midpoint→neck axis relative to upright: entry **32.656°**, .75 **55.590°**, 1.0 **38.402°**. Mat neck-joint separation **31.528 px** at 1.65, 1.85 and 2.0; across the matrix **31.507–31.904 px**. These are world/canvas px, before camera zoom, and joint distances, not painted-edge clearance.

Remaining measurement/visual limits: receiver solved mat lift is **-90.078** in Lou→George, compared with authored LIE -110; contact controls final height, so no independent canvas-support guarantee is asserted. Joint validity audit checks finite coordinates, not an anatomical judgment. Derek must judge silhouette, depth, wrap readability, and the jump/swing in playback. No visual approval claimed.

Final `npm test` under Node 22.23.1: **1441/1441 pass**. `npm run build`: pass; >500 kB chunk warning (531.60 kB main JS). `git diff --check`: pass. `preserve.mjs`: every other mat move build and damage deep-equal to start-of-task snapshot, including Lou hammerlock, Guido wristlock, stretch and deathlock.

Reproduce with Vite at localhost:5173 and Node 22:

- `node research/animation/headlock-refine-2026-11-18/verify.mjs` (matrix.json and stdout summary)
- `node research/animation/headlock-refine-2026-11-18/capture.mjs` (Lou→George stills .75, 1.65, 2.0; frame-3/6/8.png)
- `node research/animation/headlock-refine-2026-11-18/preserve.mjs`

Preview: `/tools/mat-preview/?move=headlockTakeover&att=thesz-procreate-v1&def=george-roster-v1` (light move implementation; arena audit explicitly uses `light=v1`). No drawn arm proposed or built; any future art requires Derek's approval, upper arm 50.5 / forearm 60.2 units, swap only after the swing lands.
