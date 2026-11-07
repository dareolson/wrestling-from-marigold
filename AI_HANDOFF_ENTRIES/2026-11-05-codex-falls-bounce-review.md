# Falls G1 assessment and Derek's bounce direction

2026-11-05 · Codex · Reviewed through 6ee66a5, G1 page, Lou supine rest still, rest-pose integration and tests. Fresh Node 22 suite: **1185/1185 pass**. No fresh browser capture or visual approval inferred.

Derek says the work is starting to look good. Next he wants the rebound after a slam: the wrestlers currently stick to the ground “like velcro”; their limbs should flail with the bounce, **without hyperextension**.

## Assessment

The outside-forearm correction is now explicit clip layering (f86aa8f), with the reported trunks-over-forearm count reduced to zero. Falls G1 makes a useful bounded change: distinct rest poses, one `lyingBase` selector and opt-in integration into down/sell/get-up readers. It preserves the old objects with the flag off. This is a foundation, not the landing pass: no `falls.js` landing layer exists yet. The lack of bounce is explicitly reported and planned for Stage 2, not a regression introduced by G1.

G1's limits remain: the page reports Lou backward get-up's first-frame step worsening to 13.5 px, prone clutch wrist steps rising to 9–14 px/frame, no painted support contact measurement, and disabled roll sells. The supine pose clears the 15-degree screen-space missile threshold but not the intended 40–60-degree splay. Don't confuse the threshold with evidence of support or visual approval. Pin coverage is reasoned about but not filmed. These are visible/integration debts to track into Stage 2, not reasons for a rewrite.

## Next pass for Opus

Stage 2 is the right next focus, with one correction to its existing instruction: **do not pin both arms throughout the rebound**. That would preserve the stiffness Derek is reporting. A support arm may catch and yield at contact; it may release when the body rebounds, then return to the mat deliberately. Forward catches can keep a supporting forearm while the other limb reacts. Knees, elbows and wrists should lag and recover at different times, with reduced motion as the bounce dies out. The trunk compresses and rebounds; don't translate an unchanged rigid pose vertically.

Keep this authored and bounded, not a new ragdoll system. Start with one backward landing and one body-slam landing sharing the response, Lou first and George checked. Show contact → compression → modest first rebound → smaller settling motion → pain. Use the existing 6–10 px at intensity .7 as an initial **tuning target**, not a rule that every slam must visibly hop that high. Scale to incoming motion and move intent, and preserve the actual contact/damage event. Never delay bounce until a completed 0.3 s ground blend, which would leave a pause stuck to the mat first. Nor should a clip and the shared landing each add a second reaction to the same impact.

Before a full G2 packet, show normal-speed and quarter-speed loops with the contact and apex frames marked. Then extend the same response to forward falls and remaining throw paths. Keep falls opt-in; Derek's positive feedback does not independently promote it or select every G1 pose.

## Joint and continuity checks

Check **drawn, signed knee and elbow flex** every frame through contact, rebound, recontact, settle and sell on both rigs/facings. Existing `restPoses.test.js` checks static poses; its elbow check uses the absolute wrapped angle, which cannot distinguish a bend from the same-sized bend in the wrong direction. It does not establish that a moving landing avoids hyperextension. Adapt the real-rig joint audit to grounded landing poses, including blends and any hand IK. Preserve joint ranges; tune keys/lag instead of widening limits or relying on clamp saturation to hide invalid motion.

Record contact/recontact times, body rebound height, support release/replant times, painted part gaps where anchors exist, joint-limit/clamp failures and handoff steps. A body accelerating through impact can move quickly: distinguish expected velocity from a discontinuity at a state/pose seam instead of treating every fast impact frame as a pop. Keep one damage event and clean interruption/reset/match-end behavior; state whether pins/AI may interrupt the response.

The roadmap's D4 is also too broad if read literally: a supported forward catch or a body rotating around a planted foot need not have monotonically accelerating pelvis descent. Apply the ballistic timing check to genuinely unsupported intervals, and report support/contact phases separately. This avoids “fixing gravity” by erasing the intended brace and compression.
