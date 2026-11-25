# Lou2 PSD wired as an opt-in rig on Lou's moves (Claude, 2026-11-22)

**Ask (Derek):** Lou2.psd (`~/Downloads/RosterNew/`) is his joint edit of LouNew; wire it to Lou's moves and see if it breaks less.

**What Lou2 is:** same 10 layers and 4096x1714 canvas as LouNew (not the Procreate master that in-game Lou uses). Changes: trunks extended over the hips, both thighs extended down past the knee, shin tops trimmed, forearm reshaped at the elbow. `L Arm` hidden (never wired anyway).

**Built:**
- Source copied to `Sprite sheets/RosterNew/2026-11-22/` (inventory by layer name from LouNew), exported + cleaned with `export-roster-psds.py --cleanup` (81 stray px removed).
- `tools/wrestler-cutter/prepare-lou2-roster.py`: LouNew generator with paths/ids swapped. Writes `src/characters/thesz_lou2_v1.js` + `src/assets/wrestlers/thesz-lou2-v1/`. LouNew's manual landmarks (shoulders, wrist, ankles, soles) checked on Lou2 and reused unchanged; overlap joints re-measured.
- Arena preset `thesz-lou2-v1` with `moveRig: 'thesz-procreate-v1'`: `w.rigId` (every clip override) reads Lou; `w.artRigId` is the preset key, used by faceTrial and scaleDebug. `?p1=thesz-lou2-v1`.
- Registered in `backSellRigContract.test.js` and `validate-character-rigs.mjs`.
- `tools/debug/lou2_compare.mjs`: Lou vs Lou2 on George, 12 moves, both facings → `research/animation/lou2-2026-11-22/index.html`.

- Draw order: tried shins over thighs (Derek: "looks bad"); back to thighs over shins (`shinUnderThigh: true`).
- Thigh bottom rim (Derek: the "bezel", bottom only): the generator repaints each thigh's bottom ink rim in the skin just above it, only where the rim lies 7px inside the shin's silhouette, so the outer leg contour stays. Side lines of the thigh tab are kept. Colour only; alpha and joint measurements unchanged. PSD untouched.

**Misses / open:**
- Knee pivot (overlap-centroid rule) moved down: near knee y1110 → 1164 canvas px, far 1107 → 1133. thighH 51.6 → 59.2, shinH 57.9 → 49.1. Pivot is the overlap centre (repo rule).
- No chop/grip/clasp/headlockWrap/ankle-twist variants, no backSell/backWaist, no expression heads: those moves show plain forearms, and back sell is unsupported.
- heightScale 1.08526 inherited from LouNew (matched to Procreate Lou ink height in Oct), not re-measured.
- Mistake: also re-ran `prepare-lou-roster.py` once; tracked outputs restored with `git checkout`, but the gitignored LouNew `comparison-v1/measurements.json` was regenerated (same script, same inputs).

**Checks:** focused tests 26/26 (backSellRigContract, rosterBackWaistAgreement, faceTrial, scaleDebug, partVariants), validator `thesz-lou2-v1: rig contract valid (8 textures)`, build OK. Full suite not run (not a gate).
