# Paired throws v2 and the shared selling library

2026-10-15 · Claude · for the next Claude (and Codex). Follows
[the impact pass](2026-10-15-claude-impact-pass.md). Method:
[MOVE_REFINEMENT_METHOD.md](../MOVE_REFINEMENT_METHOD.md).

All committed on `story/marigold-opening` and cherry-picked to
`thesz-v2-profile-normalization`, **unpushed**. Derek has not yet watched
either group.

## Group 1: paired throws

| Move | Story / Lou | What changed |
|---|---|---|
| bodySlam | 7fd491f / eb766c0 | Overhead "powerbomb" hold kept (Derek likes it); grips solved through the press; one-way turnover; follow-through; lands clear of Lou's boots |
| piledriver | ecd37fc / 4f94973 | Grip lift → drop; suspense beat; Lou crumples **face down** (`Wrestler._layDown(seconds, 'prone')`, new) while George rocks back out from under him. Pinned test updated |
| hipToss | 1311f8b / d490e15 | v1 looped George round Lou; v2 goes over the hip and lands him **behind** Lou |

Play scenarios added: `bodySlam`, `bodySlamLou`, `piledriver`,
`piledriverProcreate`, `hipToss`, `hipTossLou`. Clip lengths grew slightly
(1.35→1.50, 1.95→2.00, 0.95→1.00 s); damage and down times unchanged.

Known limits: stage.mjs solves on shipped Lou, so Procreate Lou's grips sit
12–15% of height off on every paired throw (suplex too). Codex's deep review
of this baseline ([entry](2026-10-15-codex-entanglement-and-deep-move-review.md))
adds three confirmed defects still open: Procreate Lou's crown ~31 px above
the mat at the piledriver impact; original Lou's ~28 px shoulder jump in the
clip → grounded handoff (socket geometry); rope clamping crushing landings.

## Group 2: shared selling library (story 937d825 / Lou 942b730)

- `src/animation/sells.js`: roll, writhe, Flair kick, clutch by part (head,
  back, chest, knee, arm), separate supine and prone sets; offsets from the
  lying pose so each starts and ends on it.
- `Wrestler._hurt(amount, moveId)` at confirmed hits sets the sell tag;
  `_tickSell` plans within the down timer (0.35 s lead, 0.3 s tail);
  `_sellPose`; `Skeleton.updateGroundedReach` (two-bone IK for clutches).
- Registry `sell: { part, intensity }` on every knockdown move; George
  `sellStyle: 'theatrical'`, others economical.
- Tests `tests/sells.test.js`; look tool `tools/debug/sell_strip.mjs`.
- 690/690 on story. The Lou-branch worktree shows 6 art-test failures that
  are present before this session too (asset files a fresh checkout lacks).

## Next

Derek assigned Codex's brief: reproduce and fix its three defects, then the
figure-four entanglement proof (cross-actor part layering, trapped contacts),
then the remaining mat holds with clutch sells, flights, pose-sequence
migrations, and last the hammerlock acting candidate.
