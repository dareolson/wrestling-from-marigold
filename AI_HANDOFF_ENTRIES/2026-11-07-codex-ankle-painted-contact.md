# Ankle-lock contact revision — Codex, 2026-11-07

Derek clarified the current fault: **hands miss the boot**. Uncommitted candidate for Opus review; no promotion or commit.

[Before/after stills, both pairings and facings](../research/animation/light-moves-2026-11/codex-ankle-contact/index.html) · [Rendered measurements](../research/animation/light-moves-2026-11/codex-ankle-contact/measure.json)

The previous T2.2 gate measured wrists against extensions along the shin axis. The painted toe projects sideways, and the painted palm extends beyond the wrist, so passing that gate did not establish hand-to-boot contact.

## Change

- Add heel/toe semantic landmarks to Lou and George's existing base shin metadata. No PNG changes. Lou (.21,.89)/(.82,.90); George (.39,.86)/(.87,.875), normalized image coordinates. These are provisional painted landmarks for Derek to judge; not the future bent-boot art.
- T2.2 wears each rig's existing grip forearms and requests their clutch palm anchors. Optional clip grip fields `to.anchor` and `palm` pass through the runtime. The endpoint IK solves shoulder→elbow→painted palm, including the off-axis palm vector. Existing clasp behavior and wrist-based clips keep their original path; absent anchor metadata falls back to the joint.
- Reach required a pose adjustment: remove the candidate's 80 px inward step, bend the torso .75 rad, and offset attacker depth +20. This is a deliberate staging departure from be60b72, for Opus to assess against the plan's keep-staging direction. The shoulder approaches the boot instead of planting the hips over the receiver. Keep both soles planted and restore bend/art at completion.
- Old flag-off clip, duration 3.1 s, three squeeze events and damage unchanged. Still opt-in `?light=v1`.

## Evidence and limits

At 60 Hz, all four cases, held .6–2.7 s: palm→heel/toe max rounds to **0.00 px**, no held frames above 6 px. Previous before JSON records wrist/proxy distances, so its `targetHeld` field is not a like-for-like contact metric. Boot-centroid distances are descriptive only.

Whole-clip attacker ankle motion still peaks ~7–8.1 px/frame in entry/release. Body overlap remains; current whole-clip below-body max ~1341–1381 px versus ~2300–2400 in the prior candidate. Torso overlap max zero. This is not G2 approval: layering, nearly straight trapped knee, release/entry motion, victim sell, bent boot art, and a normal-speed loop remain. Derek judges the picture; exact selected anchors alone do not certify its appearance.

Checks: Node22 `node --test tests/ankleLockV2.test.js tests/animationClip.test.js tests/moveRuntime.test.js tests/lockup.test.js tests/clasps.test.js`: **52/52**. `git diff --check` passes. Browser proof: `LIGHT=1 CAPTURE_DIR=research/animation/light-moves-2026-11/codex-ankle-contact node tools/debug/ankle_lock_measure.mjs research/animation/light-moves-2026-11/codex-ankle-contact/measure.json`.

Opus: review the contact endpoint and staging before continuing T2.3. Keep the heel/toe anchor names in the future T2.4 shin variant so the same grip contract survives its art swap. No G2 approval claimed.
