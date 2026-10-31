# For Opus: rebound geometry and the next corner work

2026-10-31 · Codex · requested by Derek. Reviewed HEAD `7a4309d`, T3c.5 implementation `70c7fe3`, current Stage 3c plan, run-line/rebound/recoil tests and rope-hit capture results. This is advice for the active challenge, not authorization to skip Derek's G3d review or promote grapples. No gameplay changes made.

## 1. Confirmed: aiming at the attacker's depth at the far rope does not intercept him

`Wrestler._flipAtRope` calls `_setRunLine(-dir, clampRunY(this._lastOther.y))`. `_setRunLine` aims at the *opposite rope's x* at that y. A straight segment reaches the attacker's depth at the rope, rather than at his x. Existing `rebound-line.test.js` uses attacker x=300, depth offset 60: its `<48` tolerance can pass without proving interception.

Reproduced through the actual `_flipAtRope` and `tickRun` methods at 1/60, grapples=v1, default gait: receiver starts at `ringBoundsAtY(300).right - 40`, y=300; attacker y=430. At the first frame crossing attacker x=400, receiver x=396.91, y=367.70: **62.30 px depth error**, outside the 48 px gate. At attacker x=600: 100.71 px error. These are valid ring positions. This can make a correctly aimed rebound miss its intended follow-up.

Recommendation: snapshot BOTH attacker x and y at the end of the recoil. Define an explicit pass-through/intercept point. Continue toward the rope after that point using a bounded continuation or a second segment; do not home on the opponent each frame. Preserve intentional sidesteps after the snapshot. Decide behavior when the attacker is behind the runner or almost vertically aligned. Keep today's flat run identical. Tests should vary attacker x as well as y, both ropes and both gaits, and measure y error at the attacker x crossing (not just endpoint or a permissive attack window). Actual attack success is a separate test.

## 2. Existing evidence still has a large rendered turn

`rope-results.json` records raw flip-frame steps **99.8–139.7 px**, versus **12.2–23.1 px** after mirroring the previous frame. The latter isolates pose change; it does not remove the visible facing flip. Keep BOTH numbers prominent. This may be an accepted stylistic turn, but the smaller number alone does not establish smoothness. Derek remains the visual judge; do not retune the approved whip or lockup stance based on this note.

## 3. T3c.6 needs an interruptible corner episode, beyond adding a new state name

The plan already calls out inward facing, strike lists and the near-post depth. Additional implementation traps:

- `_doSell` changes state to `selling` and runs a completion callback. A corner-charge sell must return to `cornered` only if the SAME corner episode remains valid. A fall, new move, escape or reset must invalidate the pending restore. Guard return-to-corner tweens and exit-step completion in the same way. A small episode identity/handle is enough; no new general state framework is needed.
- Specify whether the daze clock continues during a charge's sell and whether a restored corner pose retains the remaining time. Do not accidentally reset the whole daze on every hit. The planned +0.6 s extension "once" needs an episode-level latch; test two consecutive hits so it cannot become indefinite corner stun.
- Clear corner-only grip/pose ownership on interruption. A state-only assertion will miss a wrestler who has fallen but whose hand is still IK-pinned to the top rope.
- The corner return should reverse the first stagger's travel deliberately. `_runStaggerSteps` clamps x to a 40*s inset, while arrival targets are 20 px inside the rope. Measure that path rather than treating the stagger endpoint as the corner point.

These are proposed guards for work not yet implemented, not claims that current cornered code is broken (it does not exist yet).

## 4. T3c.7: reachable attack target and AI need explicit handling

- Do not reuse `_setRunLine` unchanged for a charge gap: it always overwrites x with a rope coordinate. A charge needs a segment ending at a reachable attack point, stopping short of the victim. At impact recheck target identity, corner episode, range and depth before damage; a starting snapshot alone does not prove contact.
- A corner approach can be nearly vertical. Current `_runLineSlow`/`tickRun` intentionally snaps y when the x span is zero (`run-line.test.js` enshrines this). Reusing it for charges can teleport a same-x attacker or create near-zero-x gait motion. Add a same-x approach case and decide a bounded fallback before extending the helper. Avoid altering the existing accepted run merely to support a new attack.
- `AIHandler._chooseAction` currently rejects opponents other than standing/blocking after the rebound branch. Add the corner branch before that rejection. Its earlier movement decision must also choose the corner target instead of backing off. At close range the proposed "otherwise strikes" still needs explicit cornered handling; changing only Wrestler target whitelists will not make the AI choose a strike. Respect `_attack`/offense cooldown so the 0.6 charge odds are per decision beat, not rolled every frame.

## Smallest useful next proof

Keep G3d's review boundary. Before building a big G3e package, fix/prove the pass-through geometry with a tiny focused test matrix. Then one corner episode and one charge, Lou first at a near corner: arrive, hold, hit, restore, escape, and miss after target escapes. Assert one damage event, at most one extension, and no stale callback or grip after an interrupt. Once that holds, expand to both kits/all corners and the existing rendered proof. This isolates geometry, contact and lifecycle problems instead of tuning them together.

Validation performed: `node --test tests/run-line.test.js tests/rebound-line.test.js tests/rope-recoil.test.js` on Node 22: **16/16 pass**. The geometry repro above is an extra probe; existing passing tests do not cover that failure. No full suite or capture rerun for this docs-only review. `git diff --check`.
