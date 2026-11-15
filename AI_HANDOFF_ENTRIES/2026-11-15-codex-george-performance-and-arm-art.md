# George performance and arm-art follow-up

2026-11-15 · Codex · Derek requested a plan or implementation extending Opus's updated strut, then discussed new arms for checking his hair. This entry collects the complete direction for Claude/Opus.

Read [PLAN_GEORGE_PERFORMANCE.md](../PLAN_GEORGE_PERFORMANCE.md) for the source-grounded implementation plan, timings, expression arbitration, rig constraints, interruption handling and acceptance checks. Source inspected: strut commit `3fa3757`. No new choreography implemented or visually approved by this planning work.

## Direction

George performs as if the crowd should feel privileged to see him: elegant, vain, imperious. Start with **strut → invite admiration → pause for applause → offended recoil → dismiss crowd → return to opponent**. Preserve Opus's planted gait and finish whole strides before stationary gestures. Later add a short post-move superiority gesture and a hair-check/preening routine. Wear should make the same performance increasingly frustrated rather than replace his personality.

## New arm art discussed after the plan

Derek suggested new arms for hair checking. Proposed forearm/hand variants:

1. **Hair smoothing:** open hand, fingers together, shaped to contact temple/forelock and sweep backward.
2. **Inspecting fingers:** palm angled toward his face, fingers slightly separated, checking what wrestling did to his hair.
3. **Dismissive flourish:** relaxed fingers and a slightly bent wrist for waving away the crowd. This also supports the crowd sequence.

Pose the CURRENT George arm first and capture the desired contact position; then draw art for that exact view/angle. George's hands are baked into his forearm, so these need matching forearm/hand variants with the existing canvas, elbow/wrist geometry, skin palette, ink style and painted joint coverage. Do not generate arbitrary detached arms and force them onto the rig afterward. Use original `george-roster-v1` art as authority. Preserve his proportions; the near/far role must follow the rig's facing mapping.

Check the entire approach to hair, contact sweep and retreat in both facings. Fingers must touch the visible hair surface without tunneling through head, obscuring face or pushing elbow behind skull. Add semantic hair-contact anchor if needed. Hair grooming does not reset persistent hair/wear stage. No new arm art has been generated yet; the three variants above are proposals, not approved assets.

## Expression state and scope

George v2 expression atlases and resting heads are in `research/art/george-expressions-2026-11-14/`; Claude has already integrated the expression system (see current handoff status). Coordinate the body sequence with `FaceDriver`, give pain priority and release temporary performance ownership on cancellation. Do not restore older trial code over current integration.

Next concrete deliverable: one opt-in on-body crowd sequence using existing art, compared against the unchanged strut. Hair-check sequence follows posed-contact art preparation. No code/tests were changed by this handoff; documentation only. No commit or push performed.
