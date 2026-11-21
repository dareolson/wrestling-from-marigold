# Headlock takeover: new wrap art and retained head contact

Derek approved the direction proposed after reviewing the incoherent old headlock takeover: purpose-built headlock wrapping arm, existing other-hand grip, visible standing head capture, grounded hip/drop, retained control into landing. This first rebuilt pass is ready for VISUAL REVIEW, not approved yet.

Main workspace /Users/home/Documents/wrestling-from-marigold, story/marigold-opening. Keep all work uncommitted; no commit/merge/push/reset. Preserve approved Guido wristlock, Lou hammerlock, stretch and deathlock, and existing unrelated notebook/research/art.

## Artwork

Built-in image_gen, imagegen skill. Generated one transparent full preposed wrap arm from Lou upper_arm.png and forearm_grip.png as style references. New master research/art/headlock-wrap-2026-11-16/headlock-wrap-v1.png (1312x1199 RGBA); exact prompt and generation mode in prompt.txt. Copied unmodified to both kit owners' asset folders as upper_arm_headlockWrap_v1.png; no original art overwritten and no Python image editing. Registered upperArm.headlockWrap in thesz_procreate_v1.js and george_roster_v1.js with the existing projectedArm contract, matching different rig scales. Forearm/hand child sprites are suppressed because the whole wrapping arm is already drawn; other far forearm wears the existing grip donor and clasps the projected wrist using its clutch palm anchor. No new rig assignment: only Lou/George own this move. Other non-kit attackers were not part of this pass's preview matrix.

Measured anchors on generated master: shoulder (340,220), elbow (1010,595), wrist (595,950), semantic headlockCrook (640,790). ProjectedArm followTorso:true is new opt-in; rotates complete wrap with torso through the drop. Existing projected chop arms leave it unset and preserve their rendering.

## Choreography and head contact

Rebuilt only headlockTakeover spec/grips in matMoves.js: establish head under arm; crouch/load; drop body/hip close to the receiver instead of travelling far away; retain head through 1.55s; release by 1.85s; rise to stand by 3.2s. Same single 9-point impact at 1.2s and standing/supine ending. Standing body layering keeps receiver face visible inside crook; switches to attacker-front landing order at .65s. Initial planted supporting sole through .4–.55s. Receiver pain expression at impact through existing face driver.

Generalized existing carry with frame:'part', part:'nearUpArm'/'farUpArm'/'torso', anchor:<semantic name>, joint:'neck'/'nearHip'/'farHip'. It translates the receiver's body so the chosen joint meets an authored image anchor; preserves authored tilt and all bone lengths. Before grips, like existing carries. Headlock uses defender neck -> attacker nearUpArm.headlockCrook. Part contact uses bracketed lift solve: the old derivative probe could stall near standing lift=0 (a measured 17px gap). The bracketed solve closes to .05px and rechecks horizontal placement after lift (hip-placement blend can move x). Torso and thigh carries retain their old solve. Validation rejects invalid part/joint/anchor and slide on a part contact. Logs now include part contact gap.

## Checks and evidence

55 focused tests pass (carry, projected arm, move compilation/layers, Lou asset enumeration). Added tests for neck-to-moving-part contact in both facings/scales, release, invalid data, flat lift derivative and torso-following arm. Updated Lou asset inventory expectation for the new variant. Full suite after geometry changes: 1426/1426 pass. Final standing layer-order tweak was followed by focused tests/build, not another full-suite run. Build and git diff --check pass.

Final browser matrix: Lou/George attacking each of four receivers, both facings = 16. Exactly one [9,headlockTakeover] hurt call each, all finish standing/down/supine with no active move. Zero invalid joints or browser errors. Full-weight neck-crook error <= .049963 px. Evidence/reproducible scripts: research/animation/headlock-wrap-2026-11-16/. Initial review captures in headlock-review-2026-11-16 show the old disconnected action. Earlier failed audits in new folder reflect the discarded derivative-based solve; final runtime.jsonl and <attacker>-<receiver>-<facing>-<frame>.png images supersede them.

Deep equality checked accepted hammerlock/stretch/deathlock clip data against HEAD baseline; unchanged. Guido wristlock changes accepted earlier remain as-is.

Files changed this pass: src/animation/clips/matMoves.js, src/animation/MoveRuntime.js, src/animation/AnimationClip.js, src/Skeleton.js, src/characters/thesz_procreate_v1.js, src/characters/george_roster_v1.js; new two upper_arm_headlockWrap_v1.png assets; tests/carry.test.js, tests/projectedArm.test.js, tests/theszProcreateV1.test.js. No unrelated edits discarded.

Preview: http://localhost:5173/tools/mat-preview/?move=headlockTakeover&att=thesz-procreate-v1&def=george-roster-v1 . Await Derek: particularly judge the new crook silhouette, head visibility, hip/drop and mat hold. Numerical contact alone is not visual acceptance.
