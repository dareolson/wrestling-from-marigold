# Handoff: cleanup and backup done, splash roll approved at G4b r6

2026-11-07 · Claude Opus · for the next Opus session. Pushed through the commit that adds this entry.

## Done this session

- **Backup (Derek: "backup" means GitHub, not Time Machine).** Story pushed. The five source PSDs (four roster rigs + Lou Procreate master) were only on the laptop inside gitignored `Sprite sheets/`; force-added (69b2c90). Push URL is SSH now, so `git push origin <branch>` works.
- **Cleanup audit:** [PLAN_CLEANUP.md](../PLAN_CLEANUP.md), revised after Codex's review. Left, all low priority: T1 plain `git gc` (no `--prune=now`), T3 tag then delete `thesz-v2-profile-normalization` (all its commits are on story; **waits for Derek's OK**), T4 optional docs move with link check. Frame dumps parked. `master` stays the stable point (Derek: don't fast-forward).
- **Falls T4.8c, the splash roll's legs:** **Derek at G4b r6: "looks perfect".** ([page](../research/animation/falls-2026-11/g4b-r6/index.html), 7c2c34e)
  - Cause of r5's "dolphin": the roll keeps the head on one side, so the legs belong on the other. r5's apex threw them to the head's side, and the descent swung them back under a tipping torso (a back arch).
  - Fix: three keys in `SPLASH_ROLL` (`src/animation/groundContact.js`): ROLL_PRE (soft knees, shins trailing), ROLL_APEX (one straight diagonal body, torso 2.55, hip 70), ROLL_POST (the pivot's tuck). `post: true` keys are authored in the mirrored half's own frame (`sampleSplash` no longer negates them).
  - Rule worth keeping: a facing flip mid-move can only happen on straight chains (a bend reverses on screen). Keep the legs on one side of the hip on screen across the flip, and put curls before and after it.

## Next

1. **Still open at G4b:** does the half trip stay? It overlaps the receiver after landing (555-927 px of silhouette; `route.scale` 0.75 would clear). Ask Derek. Also open: G4 (a normal match with no flag, falls on) and the Marigold title queue visual OK (83ab5cd).
2. Then [PLAN_GRAPPLES.md](../PLAN_GRAPPLES.md) Stage 3d (whip with weight, tucked elbows at the rope), **STOP at G3d**, then [PLAN_FINISHERS.md](../PLAN_FINISHERS.md) Stage 1 (finisher dispatch belongs in F1.1).
3. Later: per-wrestler presets out of `Arena.js` ([Sonnet note](2026-11-07-sonnet-structure-and-bloat-for-opus.md), [Codex review](2026-11-07-codex-structure-efficiency-review-for-opus.md)). Keep `rosterKits.js` as the kit authority.

## Gotchas

- Six unreviewed Codex files stay untracked on purpose (sleeper-wrap PNGs, 4 `tools/debug` scripts). Don't commit or push them unreviewed.
- `nvm use` in a background shell can fail with "not yet installed"; run `source ~/.nvm/nvm.sh && nvm use` in the same command. Vite takes the next free port (5176 this session) when 5173 is busy, so read its ready line and set `WFM_URL` to match.
- Render one move: `WFM_URL=... ONLY=divingElbow LYING=supine CONTACT=1 node tools/debug/falls_g4a_probe.mjs <outDir> 1` (about 1 min).
