# Get-ups T4.3: knees past straight on the mat, clamped

2026-10-29 · Claude (Sonnet, PLAN_GETUPS Rev 8 T4.3) · for Opus and Derek. Local commits, nothing pushed.
Look first: [knee strip](../research/animation/getups-2026-10/knee/knee-strip.html) (Lou and George, both facings, before | after, 1x: lying + backTuck rise, and a forced roll). Tools: `tools/debug/getups_knee.mjs` (forced rises), `getups_knee_match.mjs` (seeded matches), `getups_knee_strip.mjs`. Node 22.

## Misses first (measured, not judged)

1. **The big seeded spikes are not named.** Audit 34b3d71 saw 0.22, 0.35 (twice) and 0.45 rad past straight on a far or near leg in 4 of 49 downs; two re-runs of the same seeds (34 rises, then more seeds) did not reproduce them (largest 0.18), and the matches are not repeatable frame for frame. The only sell in `SELLS` that can open a knee beyond the lying pose's 0.15 is the **roll**: its turned half is +0.7 rad at the turnover (`ON_SIDE` negated on the prone base; `Wrestler._sellPose` skips `limitKnees` for a roll on purpose), +0.95 near / +0.69 far when forced at amp 1.3. But `getups=v1` never plans a roll (`noRoll`, D7), so the 0.35 / 0.45 frames are some other source I did not find (hold offsets and falls were not isolated).
2. **The clamp lowers the feet.** Straightening a leg that was 0.15-0.18 past straight moves the ankle 3.95-6.71 px (Lou 3.95 at frame 0, 4.68 at riseT .28; George 5.66 / 6.71). No foot lifts (0 px). The lowest foot point comes DOWN 8.6-10.9 px, to the body's own lowest point (Lou 30.71 vs 30.71, 30.93 vs 30.93; George backTuck 37.19 vs 37.19; George backKneeHurt 39.26 vs body 41.45), never below it. Over 4 frames at the start of backKneeHurt and 20 frames around riseT .28 of backTuck. Where there is no separate boot image (Lou, George paint the boot into the shin) the foot is the shin image's lowest point.
3. **Scope.** Only under `?getups=v1` (the Skeleton's `_getUps`). Legacy rises, flag off, and every non-getups path keep the 0.15 lying bow. The upright limit is still `JOINT_LIMITS.knee.min` -0.10 (5.7 deg past straight, 1898 of 29281 standing frames sit at it); not touched.
4. The clamp does not change the authored keys, so `GETUP_SUPINE_POSES`, the fall tables and the sells still carry the numbers; a later pass could fix the data (T4.3 was the safety net only).

## What changed

- `Skeleton._applyGrounded` (`leg`): `sA = ang(this._getUps && shin > thigh ? thigh : shin)`. Shin - thigh > 0 is past straight, in the channels (facing-independent), for both facings; thigh, hip, arms untouched (cc01585).
- `tests/groundedKnee.test.js` (5): clamp both facings and both legs, the lying-pose and supine-table numbers are > 0 in the audit's convention and come out 0, a bent or exactly straight knee untouched, one leg at a time, flag off / unset draws the authored angles. `getUps`, `riseFix`, `riseFixFlagOff`, `georgeClutchFlagOff`, `riseSeparation`, `groundedKnee`: 90/90. Full suite, build, coverage not run (not a gate).
- Probe after (`knee/knee-audit-after.json`): drawn knee past straight 0 frames in all 24 runs (6 families x 2 rigs x 2 facings; handed channels still show .15 / .178 / .159, so the clamp is what zeroes them). The probe now renders each clamped frame once unclamped too, for the ankle and foot comparison above.
- Strip: lying 0.5 s then backTuck, and the forced roll (drawn past straight before: near 0.951, far 0.692; after: 0).

## For Opus

- Derek's question (plan step 5): does a straight knee read better, or a slight bend (e.g. clamp at 0.05 rad flexed)? That is a one-number change in the clamp.
- Open from the audit: fix the authored data (lying pose in the FALLS tables, `GETUP_SUPINE_POSES`, backTuck / backKneeHurt keys), decide the upright -0.10 limit and legacy, and find the 0.35 / 0.45 source. All outside T4.3.
- Dev server: my vite on 5175 is still running (5173 / 5174 are held elsewhere).
