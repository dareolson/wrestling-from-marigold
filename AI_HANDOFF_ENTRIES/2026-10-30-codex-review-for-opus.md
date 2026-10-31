# Opus: grapple G1 review, concrete defects, and next block

2026-10-30 · Codex · requested by Derek. Reviewed HEAD `533d889` on
`story/marigold-opening`, current source, plan, latest handoffs, and committed
G1 film metadata. No runtime edits, fresh browser capture, or visual approval.

## Current decision boundary

Get-ups are promoted (`6bfb66c`), G3 approved, George Stage 5 parked by Derek.
Do not revive yesterday's Codex G3 advice as an outstanding gate. The active
review is PLAN_GRAPPLES Stage 1, stopped at G1. Grapples remain opt-in.
Sonnet's handoff correctly reports dynamic hand misses, George's crossing feet,
missing rope-stall coverage, and deferred exit discontinuities. Derek still
judges length, hand art, and layering.

## 1. Fix the measurement helper's pose side effect first

`Arena._lockupArmLength` saves only lArm/rArm/lElbow/rElbow, then assigns the
entire result of `lockupPoseChannels`, which also changes lean, crouch, both
legs, and both knees. Only the arms are restored. `_tickGrapple` subsequently
captures `g.from`, so the attacker's engage source is already modified on an
uncached call. This also makes first-use and cached behavior different.

I ran the current method body in a minimal stub harness: arm length returned
80, but lean .11 became .32, crouch .12 became .24, lLeg .13 became -.06,
rLeg .14 became -.34, lKnee .15 became .35, and rKnee .16 became .20.
This confirms the pose mutation in isolation, not its exact contribution to
the measured 56–74 px engage steps. The browser film is needed for attribution.

Make the measurement side-effect-free: restore every pose field it changes,
including original key presence, and redraw the restored state. Verify both
cache miss and hit, both roles/facings, before retuning engage keys. A focused
regression asserting pose preservation has actual value here.

## 2. The engage buffer loses directional intent

`_tickLockup` buffers only finisher/action/power keys in a Set. On release it
reads up/down/left/right from the live input. Press up+action during engage,
release before .22 s, and the buffered action can become a piledriver/slam
instead of the requested suplex. Direction changes during the wait can also
reinterpret the same button. The film's exits are pressed at .8 s, so they
do not exercise this boundary.

Opus should explicitly choose the input contract. Recommendation: buffer the
intended command with its direction and consume it once when engage completes.
Check up/down/directional-whip inputs released before engage ends, simultaneous
contest versus attack, and pending input disposal on interruption/break. Do not
silently change priority or add another timing restriction while repairing it.

## 3. Separate contact solving from art quality

Static held poses reach nearly every target, but the film reports George's
attacker grips 22–27 px away for roughly half the frames. Do not label those
as a hand-donor problem yet. `_holdLockupGrips` computes lists once, then runs
three A/D passes. Collar points are copied world points; elbow targets follow
the partner's changing arm pose. The final defender pass can move an elbow
target after the attacker's last solve. These are concrete dependencies to
inspect, not a proven complete explanation for the misses.

For one George-attacker case, measure after each pass: both shoulders/elbows/
wrists, current target, target reach distance, actual arm lengths, requested
grip weight, resulting error, and clamp/branch behavior. Check that solved
channels survive the redraw. Separate partial-weight engage frames from fully
held frames. Diagnose whether the residual is target movement, elbow branch,
renderer constraints, or an unreachable pose before shrinking gaps/tugs or
ordering replacement art. Retest Lou as the shared-runtime control.

The tool's `unreachable` count currently means `error > 3 px`, not geometric
unreachability (`distance outside the arm's reachable annulus`). Relabel it
as contact misses or add a separate reachability test. These are different
causes and lead to different fixes.

## 4. G1 evidence qualifications

- I checked all four `case d / new` runs in the 60-run manifest: phases are
  engage/even/drive/break, never stall. Sonnet separately reports a successful
  40 px `d2` test; it is not on the published page. Add that targeted strip and
  its phase/travel assertion when the tool is next touched. Do not recapture
  every exit to repair a missing rope case.
- Flag-off proof compares x/state/timeout, explicitly excludes pose. That is
  useful partial regression evidence, not proof of D1's byte-identical visual
  contract. The film tool already overrides tween delta; reuse a deterministic
  clock/reset approach for pose comparison rather than weakening the contract.
- `grapples_flagoff.mjs` logs DIFFERENT if lengths differ but exits nonzero only
  when `bad >= 0`. A pure length mismatch can therefore succeed. Include length
  mismatch in its failure condition when editing the check.
- `_tickGrapple` / buffering lack integration assertions. A small stepped-browser
  assertion script fits the existing harness; importing Arena into Node is not
  necessary. Exercise buffer consumption, steal role rights, break cleanup,
  pose preservation, and at least one real stall.
- Exit steps of 62–102 px are honestly reported and deliberately Stage 3.
  Preserve that boundary; fixing all exits now would expand this review.

## Suggested next execution block

Ask Sonnet for one small repair/diagnostic block: pose-preserving arm measurement,
direction-preserving buffered input, and one instrumented George contact run.
Run focused tests plus a short browser assertion case. Return one normal-speed
Lou/George strip in both facings with misses first. Then Derek can decide the
G1 direction and distinguish shape/art failures from failed contact solving.
Only regenerate the full gate package when the direction is accepted. Keep
`grapples` opt-in and leave parked get-ups/George work alone.

## Story work is active, uncommitted, and not ready for implementation

Derek and Codex have been developing story direction in the dirty
`STORY_MODE_SCRIPTING.md`, `STORY_OPENING_IMPLEMENTATION.md`, untracked
`STORY_ART_AND_FEUD_DIRECTION.md`, and `research/story/`. Preserve those files.
The old first-chapter outline and `FrontDoor.js` dialogue are superseded in
several places. Read the latest October 29 decisions before assigning story
execution; do not implement the old George opening or victory-restart rule.

Current sequence: weak annoying heel repeats on booked losses until an
unauthorized win; name becomes Guy after the very first match, win or lose;
unauthorized win leads to guaranteed Lou punishment. Girlfriend leaves after
Lou; five-man bar fight, arrest, Kohler bailout and newspaper make Guy a major
attraction. Buddy's agreed foreign-object loss, Kowalski's overriding claw loss,
and an authorized Bobo win lead to the biggest paycheck. Ex-return drains and
the college-daughter crush/possible credits gesture remain branch details.
The art direction is toward gritty, simplified illustration; no restyle assets
have been generated or approved. Historical research and fictional scenes
are explicitly distinguished.

Before a story build, consolidate approved beats into one short chronological
outline and branch table, then rewrite only the opening dialogue against it.
The current additive discussion notes contain superseded branches and naming
shorthand; they are a decision record, not an executable script. This cleanup
should replace contradictory current instructions, preserve history separately,
and avoid writing the same scene in three documents. It need not block G1.

## Verification / limits

Fresh Node 22.23.1: `node --test tests/lockup.test.js tests/grapplesFlag.test.js`
**18/18 passed**. Also ran the isolated helper diagnostic and read manifest
phase coverage. Sonnet's full suite **1053/1053**, build, and coverage with
**22 baselined gaps** are recorded gate results, not rerun here. No fresh
performance benchmark, screenshot inspection, or judgment of visual acting.

No commit or push. Existing story edits and untracked research left intact;
this entry and its handoff pointer are the only intended review edits.
