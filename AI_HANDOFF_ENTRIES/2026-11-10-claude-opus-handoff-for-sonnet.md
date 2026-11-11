# Handoff for the next Sonnet: what to do after G1 — Claude Opus, 2026-11-10

**Start.** Read CLAUDE.md, the Status in AI_HANDOFF.md, and [PLAN_LIGHT_MOVES.md](../PLAN_LIGHT_MOVES.md) ("Order and roles" first). Node 22: `source ~/.nvm/nvm.sh && nvm use`. Work on Procreate Lou (`thesz-procreate-v1`) vs `george-roster-v1`, both facings. Everything new goes behind `?light=v1`; flag off stays byte-identical.

**Where things stand.**
- Front kick round 3 (8d084c4) is at **STOP G1**, reviewed by Opus, waiting for Derek's verdict.
  - If Derek asks for changes: do a round 4 with his notes, same audit (`tools/debug/front_kick_audit.mjs`) and a page like `front_kick_g1r3_page.mjs`. Opus's misses to check while there: Lou's boot hidden inside George's belly at impact (sole -24.9 px past it), Lou leaning far back, Lou's support knee 2.02 rad, George's hands landing on Lou's chest at 1.1 s.
  - If Derek approves: next is **T2.7** (kneeling arm bar fixes; `armBarV2` is Codex's committed, unapproved candidate 15e7d5e). Then Stage 3 (T3.0 asks Derek for footage first).
- Ankle lock G2 approved (0d2e0da).

**Rules that bit before.**
- One STOP per task: commit locally, write a ≤ 3-line Progress entry (sha, result, misses), stop. Opus reviews, Derek judges. Never push.
- Report measurements and misses; never say a move reads or looks right.
- Measure the intent: painted palm/sole anchors (`partAnchorPoint`, `soleWorld`), not joint points.
- No positive upright `lKnee`/`rKnee`; bend with `lShin`/`rShin`. Saturation check every task.
- Gitignore loop frames (`s*.jpg`) before committing a page; commit stills.
- Codex may leave uncommitted files in the checkout: don't sweep them into your commit (`git add` named paths, not `-A`).
