# Wristlock cradle: existing grip swap, complete back arm behind torso

Derek rejected the forearm-only foreground correction: the forearm itself still looked wrong over the torso. Asked whether a swappable arm existed.

Inspected George roster's registered forearm donors: grip, elbowCup, collarTie, waistClasp, inspect, chestTouch and others. Viewed grip/elbowCup/inspect/chestTouch artwork. Grip has a curved gripping hand; the basic forearm shape is similar to the original, so it is not a new foreshortened whole-arm pose. No new art generated.

Changed wristlock retreat to keep defender farArm (upper arm, forearm AND hand) behind nativeBody. No part of the back forearm is promoted over the torso. Removed the unused forearm-only layer group extension from the preceding rejected experiment; src/animation/clipLayers.js now matches HEAD. Updated the depth regression to assert the complete back arm remains behind.

Worked near wrist now sits farther forward/outside silhouette (self Hip above .35 offset x40/y4 vs x22/y4). After release, farForearm wears the EXISTING grip donor. Supporting far hand uses its authored clutch palm anchor to reach the worked wrist; same injured arm, no arm swap. Contact/art applied only to wristlock selling tail. Maintains backward steps, pain expression, final wrench and 8 total damage. Approved hammerlock/stretch/deathlock untouched.

Files changed this pass: src/animation/clips/matMoves.js and tests/clipLayers.test.js; removal of preceding unused changes to src/animation/clipLayers.js. Face-driver fix from previous pass remains. 82 focused tests pass, final layer tests 18/18 and build/git diff --check pass. Full suite not repeated for this pose/art selection revision; previous full pass 1422/1422.

Browser evidence/scripts: research/animation/wristlock-grip-swap-2026-11-16/. An initial browser run was interrupted by Vite reloading during source edits; reran after edits completed. Guido against all four receivers in both facings, capturing same final wrench/retreat/cradle times. Await Derek's visual judgment; not approved. If the donor still reads wrong, a purpose-made support forearm may be needed; do not declare this an anatomical fix solely from successful contact measurements.

Main workspace story/marigold-opening. Keep all current work uncommitted, no commit/merge/push/reset. Main preview localhost:5173, wristlock Guido -> George.

Final matrix completed: eight clean standing/staggered endings, one 8-point hit each, no invalid joints or browser errors; pain textures remain active throughout retreat. Viewed George's cradle in both facings. Preview reopened.

## Derek's acceptance

Derek approved the completed Guido wristlock: “that looks good let's move on”. Preserve resistance/push, Guido's final wrench, backward retreat cradling the same sore wrist, gripping-hand donor, complete back arm behind torso and sustained pain face. The three-crank proposal was not implemented and is no longer a requirement for this approved version. Next in the agreed Stage12 order: headlock takeover.
