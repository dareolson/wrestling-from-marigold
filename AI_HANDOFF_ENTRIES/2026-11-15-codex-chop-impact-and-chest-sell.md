# Faster, heavier chop and chest-pain sell — Codex, 2026-11-15

Derek requested a quicker chop, more impact/damage, a possible grapple version, then specifically facial pain, a natural chest-holding arm, body language and a recoil step. This follows the projected-arm correction; its camera-facing in-between remains in the animation.

- Timing: load .16 s, impact .25 s, follow .34 s, finish .58 s (previous .24/.38/.52/.86).
- Damage: 12, previously 5; registry chest intensity .85.
- Impact: 80 ms chest snap, a distinct skin-slap sound and stronger scoped camera/crowd response.
- Receiver: short alternating recoil/catch steps (8+6 scaled units), then a hunch and hand protecting the chest. A dedicated 1.6 s chop stagger replaces the generic stamina stagger; the worn-man knockdown rule remains.
- The near arm reaches the lower sternum by two-bone IK, preserving segment lengths. The lower wrist target accounts for fingers baked past the wrist; the earlier upper-sternum target put the hand at the throat. Its clutch weight now passes through tweenPose normalization and resets on other poses/states. No new art was generated.
- Face: chop pain reaction lasts 1.9 s. Other strikes retain 1.4 s. Removed `faces=0` from this review page; that preview setting had hidden the already-integrated expressions.
- Tie-up trial: Forward + Power from an owned lockup, gated by light kit membership. Existing Up + Power standing chop remains; up/down go-behind and neutral Power follow-ups retain their routes. Registry remains a strike because this is a strike available from a grapple, rather than a throw/hold.

Preview: `http://127.0.0.1:5201/tools/legwork-preview/?move=chopTieup&loop=1`. Choose Chop for the standing version or Chop from tie-up for the new route. Repeat reuses the loaded scene; interval allows the chest sell to finish.

Evidence: `research/animation/chop-2026-11-15/complete-sell/`. Lou attacking all four receivers, both facings; real executor and snapshots through the sell. `tieup-check.json`: both facings enter the new route once, deal 12 once, exit lockup and finish standing, zero page errors. Faces visible in final screenshots; earlier `impact/` and `impact-final/` were intermediate passes and should not be used as final visuals. Hand-height metric in the tool still spans a fixed frame range and now includes the faster return; don't quote it as the strike arc's flatness measurement.

Full tests **1379/1379 pass**, build passes. New tests catch dropped clutch weights, pain-face duration, wrist height/arm lengths and the sell's step/release envelope. Current workspace only, uncommitted; other worktree unchanged. Updated evidence supersedes older chop timing/damage/sell descriptions.
