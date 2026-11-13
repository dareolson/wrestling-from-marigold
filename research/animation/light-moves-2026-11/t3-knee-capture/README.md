# Two-knee capture candidate — Codex, 2026-11-12

Open `index.html` for four normal-speed videos (both pairings and facings), stills and measured numbers. This revises the T3.0b preview; it does not register a playable move.

Changed: a 0.2-second final knee drop, trapped leg between far/near attacker legs, stationary kneeling base during all three foot wrenches, no legs-out seated ending. Retains the solved stomach-down fist sell.

Measured through the held video phase: 59 samples per case, 236/236 correct thigh depth sandwiches; knees 1.6–3.5 px above mat, knee displacement <0.001 px; heel/toe grip gaps 0 px; three counted fist strikes per arm. Depth ordering establishes the intended occlusion, not an anatomical proof of capture; Derek judges whether the leg looks trapped.

Limits: turn and stomach roll still snap. Transit grip gaps reach 66.6 px (136.5 px at the facing flip), with some transition joints hitting their limits. These misses are in `video/manifest.json` and on the page. Boot visibility is partly sacrificed to near-leg occlusion, George has no ankleTwist art, and no new boot art was drawn. The planted wrench is the candidate to judge; entry continuity remains unfinished.

Reproduce from repo root:

```sh
node tools/debug/toehold_knee_capture.mjs
REPLAY=1 node tools/debug/toehold_t30_stills.mjs research/animation/light-moves-2026-11/t3-knee-capture
NOSLOW=1 ENDING=4a node tools/debug/toehold_t30_video.mjs research/animation/light-moves-2026-11/t3-knee-capture research/animation/light-moves-2026-11/t3-knee-capture
node tools/debug/toehold_t30_page.mjs research/animation/light-moves-2026-11/t3-knee-capture
```

Checks: Node 22 syntax checks, 24/24 animation/runtime/layer tests, all page assets present. Four webm files are 0.98–1.03 MB each; raw recordings are ignored. No approval or promotion implied.
