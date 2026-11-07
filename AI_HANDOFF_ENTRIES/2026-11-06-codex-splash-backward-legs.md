# For Opus: confirmed backward-leg fault in splash roll

2026-11-06 · Codex · Derek reports backward legs in the latest splash variants. Reviewed through `bc1615a` / runtime `2f79495`, sampler, renderer, tests, saved roll frame 58 (divingElbow-supine-george-right). No fresh browser capture or runtime edits.

## Confirmed cause

`sampleSplash(SPLASH_ROLL)` switches to mirrored facing at u=0.5 and constructs `mirrored(keys[i].g, target)`, negating and wrapping each absolute angle separately. `_applyGrounded` assumes thigh - shin is nonnegative independent of facing; with getups on it clamps any shin > thigh back to the thigh. Negating a bent pose reverses that flex, and separate angle wrapping also gives inconsistent branches for a connected chain.

At the apex the returned roll channels have:

- far knee flex (thigh - shin): **-0.90 rad**, a wrong-way bend; the renderer clamps it straight.
- near knee flex: **5.283 rad** (about 303 degrees), caused by independent 2pi wrapping; equivalent wrapped difference is -1.0 rad. This passes the simple shin > thigh guard and creates an invalid articulated chain/interpolation.

The code/page claim that mirrored facing plus negated angles preserves joint positions is therefore false once the actual knee guard applies. It also does not preserve signed elbow flex. This is a representation/renderer mismatch, not evidence that the existing painted legs need replacing.

## Diagnostic and test gap

Fresh 241-point normalized-bounce sweep of each variant's returned g, both knees, using the renderer's direct channel contract [0,2.55]: roll **121 bad samples**, min -0.90 / max 5.283; tumble **0 bad samples**, min 0.15 / max 1.0; pivot **4 slight negative samples**, minimum -0.05 (its supine rest endpoint is within the ordinary tolerance but gets straightened by the renderer). The sweep covers keyed/returned poses; the rise-from-captured-flight blend and actual drawn chains still need their own audit.

Fresh Node 22 `node --test tests/falls.test.js`: **72/72 pass**. Existing splash bend test only checks `def.keys`; it never checks the post-mirror sampled g. Continuity tests compare angles modulo a turn and do not prove signed knee flex or unchanged drawn joints. Add a playback-sampled signed-flex test including the exact mirror boundary, both sides of it, landing, and both facings; compare actual hip/knee/ankle positions and clamp activity around that boundary. A modulo-continuity pass must not waive the articulated-joint contract.

## Recommended bounded fix

Correct the roll's pose representation and transition before further tuning its speed or bounce. Keep bend direction explicit: derive a shin from thigh plus a valid signed knee bend and use consistent whole-chain angle branches. Simply widening limits, disabling the grounded knee guard, wrapping every channel separately, or swapping shin art would conceal the fault. A reflected articulated pose may require a genuinely different valid bent pose/transition; do not promise identical geometry plus unchanged signed flex under the current facing convention.

Use the non-mirroring tumble as a comparison, not proof that every other phase is clean. Inspect the roll's apex art switch and subsequent get-up turn (already reported 71–96 px) separately; fixing flex does not automatically fix those. If a new back-facing pose is needed for the selected roll silhouette, prove the required geometry before requesting art. Keep G4b unapproved pending Derek's motion judgment.

No runtime repair in this review; this identifies the defect for Opus to scope. `git diff --check` passed for the handoff note.
