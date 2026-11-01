# Latest Sonnet / Opus review at G3f

2026-10-31 · Codex · requested by Derek. Reviewed HEAD `1dcffb4`, latest implementation `dc73b78`, Opus's G3f acceptance/progress entry, current code and corner-knockdown capture data; inspected two local proof frames. No gameplay changes or reopening of Derek's approved visual checkpoints.

## What advanced

The earlier review is largely incorporated: `_setReturnRoute` now uses a snapshot pass-through segment (with an explicit slope/reach fallback); corner stays use episode identity; the charge has `_setRunSegment` rather than a rope-only target; same-x charges are excluded; AI has explicit corner handling. The latest T3c.8 deliberately replaces the earlier daze-extension outcome: the charge now ends the episode, reacts for 150 ms, falls prone, sells head or gut, then rises. Do not restore the obsolete extension latch merely because the earlier review recommended one for the then-current design.

G3f is recorded approved by Derek. The charge has high/default and low/down-held versions; AI chooses per charge. Face uses forward fall (~483 ms), gut kneesForward (~733 ms), both with forced part-specific clutch and additional down-time budget. Current results cover 16 kit/corner/part combinations, with eight filmed examples. The data reports one damage event, no return to cornered after impact, sell before rise, and cleared episode/charge state.

## Remaining limits, already recorded rather than new blockers

- Near-corner mid-fall rope clearance still reaches roughly -12 to -13 px even though the landed body is inside the ropes. End-position tests do not establish clearance throughout the fall.
- George's head clutch has about 11–19 px target error; gut contact is approximately 0–0.4 px. A forced sell proves the action happens, not that the hand touches the face. Keep the two measures separate.
- `CORNER_CHARGE.backOff` is now 330 rig px over 450 ms. This avoids landing overlap, but it is a substantial retreat: proof data puts the attacker 65–107 px from the head sprite. If Derek later reports a sliding/retreat issue, assess the complete impact-to-next-input interval before changing the knockdown trajectory or shrinking the body.
- Move coverage is now 23 baselined gaps, including cornerCharge; baseline acceptance is not an authored-clip/contact certification. Old Status statements still say 22 elsewhere.

## Suggested next verification when this work is resumed

Keep approved visuals and polish-list items parked unless Derek prioritizes them. Before promotion, run a compact live-match sequence through whip → corner → charge → down/sell → pin attempt or recovery, with AI/controller input and both gait configurations. The scripted proof disables AI, so it does not alone establish match-flow reliability. Keep interrupted reaction/fall/get-up cases in that gate; don't add another large capture package just to repeat known numbers. Charge gap and retreat tuning should be judged as one sequence, not isolated pose screenshots.

If Derek wants another move next, this block can stay approved and opt-in while that work proceeds. Do not promote grapples solely because G3f was approved; the plan still calls for a live-match promotion decision.

## Verification

Reran `node --test tests/corner-daze.test.js tests/corner-ai.test.js tests/rebound-line.test.js` with Node 22: **25/25 passed**. Opus separately reports full suite **1110/1110**, build, coverage 23 and flag-off identical at this checkpoint; those are his reported gates, not fresh full-suite runs by this review. `git diff --check` for this note.
