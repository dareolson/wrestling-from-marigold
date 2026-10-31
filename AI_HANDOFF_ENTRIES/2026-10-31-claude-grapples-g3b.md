# Grapples Stage 3b: exit checks before promotion (G3b)

Claude (Sonnet), 2026-10-31. No game code changed; the G1c stance, gap and hold are untouched. Page: `research/animation/grapples-2026-10/g3b/index.html`.

## T3b.1 a move inside the break's 220 ms settle
`tools/debug/grapples_3b1.mjs` (fresh launch per run). Lou: jab, dropkick, taunt, new lockup; George: jab, kneeLift, dropkick, taunt, new lockup; 0, 60, 120, 200 ms after the lockup ends,
both facings, against the same move from plain idle. A shin the move authors itself (the jab) is in the baseline and not counted.
- Leftover `lShin`/`rShin`: none, all cases (asserted in `grapples_assert.mjs` check 16; a new lockup is left out, it owns the shins by design). `lKnee`/`rKnee` end where the move leaves them.
- Knee line and stagger: every number equals the move's own from idle (dropkick -29.4 / -35.3 is the move).
- First-frame part step is larger from the settle at 0 ms: jab 49 / 56 (idle 35), dropkick 99 / 92 (69), George taunt 40 (19), new lockup 17-18 (4). It falls to the idle number by about 200 ms. Not fixed: easing it needs a blend over the settle (a new system).

## T3b.2 hit timing against the lead-in
`grapples_3b2.mjs`: each exit twice (lead-in on / `_applyExitBlend` off), markers from the runtime events, pose-sequence moves from the executors.
- Clip moves land after the lead-in lets go (frame +8): suplex 1267 ms, piledriver 1233, body slam 1067, hip toss 617, hammerlock acquire 533 / drain 683. Drawn and true agree there (0 px).
- In the lead-in: headlock (hold applied, +0), whip (defender sent running, +0) and arm drag (damage +0, sell +83 ms, drawn 17.3 px from true). The first two act at frame 0 by design; timing and damage are unchanged by rule.
- Not fixed: arm drag would need `exitBlend` shorter than 83 ms and a way to name the move in `_exitBlend` (the pose-sequence moves have no clip id); a shorter blend raises every first-frame step. Left for Derek.
- Contact distance is wrist to the nearest part's sprite rectangle: it can touch transparent space. It says a hand is far, not that it is on the body (Codex review).

## T3b.3 the whip turn
`grapples_3b3.mjs`. At +8, when the lead-in lets go, the defender's drawn facing flips: 120.5 (Lou attacker) / 118.7 (George); today 98.6 / 108.4 at frame 0. The step against the previous frame mirrored is 13.8 / 12.5: it is the flip, on the move's stretched pose.
Scratch edit of a `turnAt` per move (reverted): turn at 0 -> Lou 126, George 103.6; at 0.5 -> 133.6 / 125.6; at 0.75 -> 136.9 / 127.0. Lou never reaches today's number, so nothing was changed. Option for Derek: flip the defender at frame 0 and let Lou's 126 stand, or a drawn turn pose (art).

## Gates
Tests 1060/1060, build, coverage 22 baselined gaps, `grapples_assert` 38/38 (new check 16), flag off identical (`grapples_flagoff.mjs` run on its own server; it reported a difference when pointed at my long-running dev server with `WFM_URL`, same code, so use the default launch). `grapples` stays opt-in.
