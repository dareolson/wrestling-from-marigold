# Flying mare: arm silhouette, knee brace and sustained pain — Codex, Nov 19

Derek: “Lou's got an extra arm” and wants the armlock to look more painful, suggesting a knee in George's back. This pass addresses the crossing-arm silhouette and adds a raised back-knee brace with stronger body/face selling. Uncommitted; no commit/merge/push/reset. Await visual judgment; accepted headlock and other approved moves preserved.

## Arm and appearance corrections

No new arm sprite/art was created by the previous depth edit. Reordered both Lou upper arms behind the bodies; only the two working forearms/palms come over George. Far leg/knee stays behind George's body rather than crossing his stomach in front. Keeps shoulder clamp and same captured wrist. No asset edits/generation or hot swap.

Found a real persistence issue: kf's default parts={} reset the impact pain face and grip forearms on subsequent keys. All attacker keys .82–3.12 now explicitly retain both grip forearms; all receiver keys .82–3.45 explicitly retain head:'pain'. This keeps actual clutch art/anchor and expression through the hold. Test checks seated expression and grip persistence, not only impact.

## Brace and pain action

Lou settles a little farther behind George while bringing up far knee during 1.02–1.3. Raised farLeg .5 / farFold 2.15, near grounded leg -.15 / fold 2.2; crouch .65. On wrench peaks 1.7 and 2.35 he drives farLeg .6 with a small body turn. The first trial raised it too far through the torso; discarded in favor of the back edge and behind-body layering.

George arches backward (bend .95 then .9, versus old nearly-upright 1.55), worked arm drawn farther back, free hand comes up/reaches, legs recoil asymmetrically. Between pulls he eases toward bend 1.25/1.2 but stays seated. Same .82 impact, 14 damage once, 4.15 duration and ending; no added damage events.

To keep the same physical raised knee under mirroring/rig mappings, extended existing facing-relative pose-channel resolution from Arm/Elbow to Leg/Shin, and shinsFromFolds now accepts optional near/farFold alongside l/rFold. No existing clip data changes unless these optional keys are used. Regression tests both facing/channel conventions with finite thigh/shin values. Existing layer tests still ensure upper arms behind bodies and the back clamp forearm visible.

## Evidence and checks

research/animation/flying-mare-knee-2026-11-19/ contains before-matMoves.txt, preserve/capture/verify scripts, frame-3/4/6/7.png (brace/first pull/second pull/ease), JSON and logs. preserve.mjs deep-equals all OTHER full mat clips/builds/damage with start snapshot, including accepted headlock. Source changes this pass: matMoves.js, Wrestler.js (optional leg aliases), rig/articulation.js (optional fold aliases), tests/legContacts.test.js. No accepted move edits.

Preview: /tools/mat-preview/?move=flyingMare&att=thesz-procreate-v1&def=george-roster-v1&light=v1 . Knee-back audit uses knee center→painted torso backWaist anchor; that distance is not painted-edge clearance. Derek judges pain and the extra-arm reading.


Final checks: focused 45/45, full **1455/1455 tests pass**, build pass (existing chunk warning), diff --check/preserve pass. Final 16-case matrix: one [14,flyingMare] hit each, zero non-finite joints/page errors, paired receiver throughout hold; all end standing/down with no active move. All hold samples retain pain head + both grip forearms; both upper arms behind receiver torso and clamp forearm visible.

Lou→George: shoulder palm target gap ≤**0.000044 px**, held wrist gap ≤**0.415765 px**. Raised knee center→painted backWaist anchor distance during 1.3–2.8 **3.964–14.411 px**; this includes pose motion and is not knee paint clearance. Global matrix knee-center distance ≤**18.325 px**. Shoulder contact now uses the real grip palm throughout, exposing a reach limit on other pairings: max **9.387051 px** across matrix. Global wrist hold ≤**0.415765 px**; previous flight wrist miss **10.431451 px** remains. Do not describe all contacts as perfect. Screenshot frame-3/4/6/7 and capture.jsonl are final (the first over-deep knee trial was overwritten); source and matrix.json are authoritative.
