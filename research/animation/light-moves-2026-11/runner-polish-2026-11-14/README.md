# Runner move polish — Codex, 2026-11-14

Derek requested more height for the back body drop and running hip toss, and a real arm drag instead of a punch-like attack. Snapmare and clothesline received positive feedback and are unchanged.

Review in the live move preview: http://localhost:5197/tools/move-preview/ (start with `npm run move:preview` if the server is stopped). Select Back body drop · runner, Hip toss · runner or Arm drag · runner. Both pairings, facing toggle and slow motion are available. The camera now fits the higher throws. These play the same clip factories as the game.

Changes:

- Back body drop: increased shoulder takeoff and apex lift; 0.06 s more descent. Runner approach speed and landing position are unchanged. Actual runner pelvis peaks are 37–40 px higher.
- Running hip toss: dedicated `runnerHipTossClip`; apex lift increases by 55 rig units, yielding 44–48 px higher measured pelvis peaks. Standing `hipTossClip` is untouched. Runner entry and throw keys now own their shin angles instead of clamping positive knee channels.
- Runner arm drag: paired wrist/elbow catch, lowered attacker base and continuous pull-through into a low rolling throw. Replaces the runner branch’s old chest-hit + clothesline fall. The standing/lockup arm drag is unchanged. Arm-drag damage now occurs on the mat-impact marker through the paired throw executor, rather than immediately on initiating the legacy sequence. Kit selection and flags are unchanged.

Validation:

- Actual running triggers, 3 moves × 2 pairings × 2 facings: all 12 land down/supine, attackers finish standing, approach speed 306 px/s, no page errors. Summary: `summary.json`. Tests force hip toss onto George and arm drag onto Lou because their normal kits select the other move.
- Back body drop and runner hip toss have no pinned joints in these runs. The arm drag has one far-elbow limit frame with Lou attacking, both facings (forced test); George attacking has none. That grip/pose remains a polish item. New motion still awaits Derek’s visual assessment.
- Full Node 22 suite: 1330/1330; build passes; coverage command passes with existing gaps (24 unverified moves, no new coverage claims). Live-preview smoke passes, first frame about 1.6 s.
- Existing running-gait-to-clip handoff seams and landing-room restrictions are not solved here. No full video packet generated before visual feedback; use the live preview first.

Reproduce the actual running check:

```sh
WFM_URL=http://127.0.0.1:5197 LIGHT=v1 MODES=backBodyDrop,hipToss,armDrag node tools/debug/runner_measure.mjs /tmp/runner-polish.json
node tools/debug/runner_report.mjs /tmp/runner-polish.json
```
