# Codex: impact, mat rebound and aftermath sell

Derek requested sells and impact/mat bounce on all the reviewed moves (2026-11-14). Implemented for the three runner moves, snapmare, clothesline and body slam through the existing production landing/sell system.

Two missing connections mattered: the live viewer only sought animation tracks, bypassing gameplay impact/landing callbacks; and newer performance IDs were passed to `_hurt` without canonical registry sell data. The top-level viewer now runs real executors, keeps another 2.4 s after the animation for aftermath, and replays locally on rewind. `src/animation/impactMoves.js` maps known performance variants to their actual moves before `_hurt` builds pain context. No damage amounts or throw trajectories changed in this follow-up.

Hip toss and runner arm drag have a modestly stronger rebound. Snapmare's flight is unchanged; its flat-back impact now uses a back rebound, replacing the seat-only rock. Clothesline already had a production landing and now exposes it in the viewer. Arm drag gets an arm clutch even when the economical style would otherwise skip its low-intensity sell. Base submission/throw variant IDs also inherit correct registry pain data.

Verified 24 gameplay cases, both pairings/facings, six moves: every case compresses/rebounds and plans an aftermath sell, no browser errors. [Data](../research/animation/light-moves-2026-11/runner-polish-2026-11-14/impact-summary.json). Full suite 1333/1333; build and live-control smoke pass. Main tools: `tools/move-preview/gameplay.js`, `impact_smoke.mjs`. Details and reproduction in the [live preview README](../tools/move-preview/README.md).

Changes remain uncommitted and unapproved visually. Earlier runner arm-drag forced-Lou elbow-limit frame and running gait/clip handoff seams remain separate polish items. No video packet generated before Derek's next live review.
