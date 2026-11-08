# For Opus: clasp runtime r4 review

2026-11-07 · Codex · Derek requested latest review and message. Reviewed through `837298f`, including e63bb94 wiring, reverted r2, e516c60 target change and r4 reach cap; source, tests and saved G2 results. No fresh browser capture/playback, runtime changes or commit/push.

## Assessment

Painted clasp selection and contact anchors are now integrated, with explicit per-arm grip labels and exit cleanup. The defender's near hand now targets the attacker's opposite arm after the r2 alternative was reverted. R4 keeps elbows bent instead of stretched straight. These changes address concrete visual reports, but the saved result is not a completed contact solve. Keep STOP at G2 and Derek's visual review; do not infer approval from green tests.

## Findings

1. **Reach limiting leaks into the fallback/base-art path.** `holdGrips` applies `CLASP_REACH` when `item.clasp` is present, whereas painted-palm correction correctly requires `_claspSel[side + Forearm] === item.clasp`. Grip lists carry labels even when a rig has no clasp variant (Guido/Kowalski), or weight is below the .5 art threshold. Those arms now receive the .94 cap too. This contradicts the intended missing-variant fallback if fallback is meant to preserve its previous solve. Gate the new cap on actual active clasp ownership, or explicitly scope a separate all-grip behavior change. Test no-art and subthreshold grips as well as active art. Flag-off equality on legacy rigs does not prove this promoted-grapples fallback unchanged.

   Fresh one-call source diagnostic with no `_claspSel`, equal 50 px arm segments and the same unreachable target: unlabelled grip writes upper-arm delta 0.0447 / elbow -0.0596 rad; the identical grip labelled collarTie writes 0.3482 / -0.4592. Thus even with no selected art, the label alone changes the pose. This is a mathematical fixture, not a rendered anatomy/visual judgment.

2. **The .94 statement is stronger than the current IK construction.** The solver shortens scalar `d` to choose an elbow, but still uses the original unshortened `goal` when calculating the forearm direction. That is a best-effort angle solve, not proof the drawn shoulder-to-palm reach is capped at .94 or that a particular elbow flex follows on both rigs. Measure actual drawn flex/reach; if implementing a real constrained target, project the goal consistently and account for the painted palm offset, rather than changing only the elbow triangle. Do not increase arm length or widen joint limits to reach an impossible target.

3. **Contact misses remain large after the target revision.** Current saved `results.json`, Lou-on-George right lockup: means a.elbowCup **35.74 px**, d.collarTie **27.22 px**, d.elbowCup **16.73 px**; a.collarTie is **0.24 px**. Minimum elbow flex is now 0.53–1.67 rad in that cell, so solving the straight-elbow complaint has not solved holding contact. Preserve those misses in Status/progress. Determine whether each target is reachable with the shortened shoulder-to-painted-palm chain and legal elbow bend before changing targets or adding passes. The wrist-to-palm offset rotates during the solve, and the partner's elbow moves too; more iterations alone do not establish a valid solution.

4. **Switch-frame displacement deserves a short proof.** That same saved cell reports the defender near-arm clasp activation at frame 14 moving the forearm **63.4 px**, versus **10.8 px** the previous frame. This is not automatically a texture pop: the column measures joint motion across the whole frame, and changing the selected target/IK can move the chain. Isolate base versus clasp geometry at the same frozen pose and then inspect frames before/at/after activation. Show whether the selected hand actually reaches its visible target rather than merely changing which arm is named.

5. **Tests cover selection better than integration.** The new reach test only asserts CLASP_REACH lies between .85 and .97. It cannot establish a drawn bent elbow, no-art fallback, contact or threshold continuity. Add one focused real-rig/pose proof for active versus unavailable clasp and threshold crossing; retain signed joint/clamp checks. The existing cleanup browser script does include variant state after reset, which is useful; I did not rerun that browser script in this review.

## Suggested next step

Opus scopes the fallback gate fix plus a small reach/contact diagnostic for the three failing hands. Keep the pose/art currently selected by Derek; show one normal-speed tie-up/drive/release and a contact close-up on each pair before building another full package. Avoid another broad clasp-target rearrangement without his feedback. Keep the art/fit tooling separate from solving arm geometry.

The handoff Status is stale: it still says art refit awaits OK and T2.2 is next, while HEAD has already wired and revised clasps through r4. Update it to G2 with the unresolved contact gaps. Original art-only reports are historical evidence, not current runtime contact numbers.

## Fresh validation

Node v22.23.1: `node --test tests/clasps.test.js tests/grapples.test.js tests/waistlock.test.js` — **24/24 pass**. Source diagnostic above confirms label-only solve change with no art selected. Latest commit reports suite 1263/1263, build, coverage, grapples_assert and flag-off pass; those broader checks were not rerun. `git diff --check` passed for this docs-only note.
