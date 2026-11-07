# For Opus: waistlock diagnosis and repair sequence

2026-11-02 · Codex, requested by Derek. Reviewed Sonnet's `452805f` and `76b0de4` on `story/marigold-opening`. Advice and verification only; no gameplay changes, no approval of G4b-a. Keep `waistlock=v1` opt-in and T4b.3–T4b.5 pending.

## Confirmed functional bug: match end leaks facing ownership

`Arena._beginWaistlock` sets both `_facingLock = true`. Normal completion clears them, but `_endMatch` only drops `waistlockState`. The orphan watchdog subsequently rescues both men; the match-reset callback does not clear their facing locks. `Wrestler.move` then skips its normal opponent-facing update even in the next match.

Fresh Chrome reproduction on Node 22: Procreate Lou vs George roster, real power+up input at frame 36 after the deterministic tie-up setup; end the match in the hold, then advance 330 frames. Before end: phase hold, states lockup/lockup, locks true/true. After reset: matchOver false, states standing/standing, locks STILL true/true, and two orphanRescue events (p1 and p2, from lockup).

Repair with one waistlock cleanup helper called before discarding state. Release facing ownership, clear state, and return surviving lockup participants to standing with a safe pose/leg handoff. Do not overwrite an interrupting down/selling/move state. Use it on timeout and match end, and guard the tick against participants no longer in the expected state. At match end, return to a stable pose without leaving a callback that can overwrite the next match. Verify ends during circle, hold and release; after reset verify that crossing opponents changes facing normally. This is a new persistent-facing defect even though the old lockup already had a time-limit orphan-rescue issue.

## Why the circle fails

1. **Travel has no stepping owner.** `goBehindOffset` moves the root continuously; `waistlockPoseChannels` blends to fixed leg angles. No plant/swing sequence cancels root travel under a supporting foot. Saved results report 6.63–8.10 px/frame ankle movement and a separate 43.54–53.05 px facing-flip frame. Slowing the curve alone cannot supply footwork. Author alternating steps and lift the swinging foot; measure planted-foot movement separately from swing travel. Reuse the lockup's leg-channel ownership conventions, not its straight-line offsets unchanged for a curved route.

2. **The facing change is a sign test, not a turn.** `facesDefenderWay: fwd < 0` mirrors the rig in one frame, changing near/far channel assignment during the pose blend. Saved whole-body steps reach 80.98–101.81 px/frame. Give the turn its own authored phase and channel handoff. Report the raw flip step alongside any normalized diagnostic; changing the flip time alone does not make a turn.

3. **Final hold layering starts too early.** `_holdWaistlockGrips` applies `waistlockLayerOrder` every waistlock frame, even when grip weights are zero. Thus the attacker body is behind the defender on BOTH routes, including the camera-side pass. Use phase/route-aware layering during approach; apply W4's final stack once the hold closes. Depth order changes alone cannot reduce the current silhouette-overlap count.

4. **The route does not prove clearance.** A 40 px sine lane while x crosses the defender produces the recorded overlap. The page's phrase "overlaps whatever the lane" is not established by the saved result or the reported hold-parameter sweep. Trial a staged route: establish depth clearance, cross behind, then close into the hold. Check the swept posed silhouettes, both sides, and ring bounds. Independent `_clamp()` calls can collapse a route near ropes; decide whether to reject or reposition an unavailable entry rather than silently pushing through the defender.

## Preserve Derek's constraint and distinguish the measurements

W3 currently requires zero projected leg/pelvis and torso overlap in EVERY frame. The mask ANDs independently drawn opaque silhouettes; it does not inspect the final depth composite or distinguish legitimate occlusion from physical interpenetration. A depth-separated pass may still fail this literal screen-space requirement. Keep reporting that failure; do not silently waive D12 or claim that draw order fixes it. If a compact route needs intentional occlusion, show Derek the exact frame and ask for a narrow art-direction decision before changing W3. A larger lane is an experiment, not a proven solution.

The proof samples masks only every third frame despite the plan requiring every frame. Change that for the small diagnostic. `circleClosestLow` is minimum absolute X distance between joint pairs, not 2D silhouette clearance; two people can share an x coordinate while separated in depth. Label it accurately. Likewise, current "sole slide" measures ankle displacement on both feet with no support classification. Preserve the raw numbers, but add actual planted-sole movement and swing/plant labels once steps exist.

## Small next task for Sonnet

First fix and prove cleanup. Then make one Lou-on-George far-side loop, both facings, with every-frame masks and phase-specific layering. Solve the route, support steps and turn as separate phases; keep the existing held tableau as the comparison. Capture through release plus at least 8 standing frames: the saved page reports another 56.56–59.31 px step after release when automatic opponent-facing resumes. A final hold that passes does not close the transition.

Only expand to all eight cases after Derek sees that short normal-speed strip. Keep George's saved 3.67 px near-hand miss visible; do not sacrifice D12 to erase it. No switch, rope break, AI, kit work or promotion in this repair. Preserve other sessions' dirty docs/assets and do not push. Only say you are finished after the commit is made.

## Verification performed by Codex

- Node 22: `node --test tests/waistlock.test.js tests/lockup.test.js` — 32/32 passed. These pure tests do not cover the Arena cleanup, masks or actual foot planting.
- Fresh browser reproduction described above confirmed the persistent locks and orphan rescues. Saved eight-case animation numbers above are Sonnet's `g4b-a/film.json`, not a fresh matrix run.
- Docs-only review: `git diff --check`.
