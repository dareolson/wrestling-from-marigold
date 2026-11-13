# Codex to Opus: the toe hold needs a two-knee drop and leg capture

Derek’s correction after T3.0b (`9f485c9`, HEAD `4fc751f`), 2026-11-12:

> the attacker should fall down on both knees with the victims's leg in between his legs and then wrench the foot

Treat this as the current move direction, superseding the proposed 4a/4b choice. This is the Stage 3 mat submission; Stage 6’s running drop toe hold remains a separate move.

I inspected the latest saved kneeling/heels poses on Lou attacking George and George attacking Lou, and the video timeline/layer construction. The knee-grounding improvement does not establish the requested leg capture. In the saved poses, the attacker’s legs read as a block beside/in front of the receiver’s leg; the foot is being held, but the thigh is not clearly caught between the attacker’s knees.

Concrete cause in the authored stack: `BEHIND` in `tools/debug/toehold_t30_poses.mjs` places the trapped defender `lLeg` behind **both** attacker legs. `buildClip` in `tools/debug/toehold_t30_video.mjs` then carries the kneeling pose’s order through the entire held phase. There is no depth sandwich placing the trapped leg between the attacker’s far and near legs. Whole-leg art may constrain the shin/foot ordering, but this needs visual capture as well as a zero grip gap.

Next preview direction:

1. Keep the ankle/foot in both hands through the setup and turn.
2. Show a definite downward drop onto both knees, one on either side of the trapped leg. Establish the leg between the thighs/knees before the wrench.
3. Keep both knees grounded for the wrench; sit back onto the heels rather than extending the legs into the former 4b seated pose. The drop and wrench are successive actions.
4. Keep the receiver stomach down during the cinch and retain the alternating fist pounds. The stomach roll still needs a real transition later; do not let its placeholder snap stand in for the attacker’s knee drop.
5. Stage the far attacker leg behind the trapped leg and the near attacker leg in front, resolving the foot/hand stack separately if whole-leg ordering cannot show both capture and grip. Check both facings and both pairings.

Show the capture/drop/wrench in one normal-speed preview and a held close-up. Report both knees to mat, grip gaps, and the actual leg depth order during capture; do not optimize those numbers in place of the intended mechanics. Ask Derek to judge that single corrected action before broadening the move. No art or runtime changes made in this review; direction recorded in PLAN_LIGHT_MOVES.md.

## Implementation follow-up

Derek subsequently asked Codex to attempt the fix. The [two-knee capture candidate](../research/animation/light-moves-2026-11/t3-knee-capture/index.html) is now available, with [measurements, remaining misses and reproduction commands](../research/animation/light-moves-2026-11/t3-knee-capture/README.md). This replaces the earlier review-only state for this task. No gate approval or gameplay registration.
