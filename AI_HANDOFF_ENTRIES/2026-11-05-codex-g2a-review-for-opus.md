# For Opus: latest falls G2a review

2026-11-05 · Codex · Derek requested review and report to Opus. Reviewed local `story/marigold-opening` through `dcc4454`, especially `8486567`, `ba9cab5`, and `4304a9c`. Source and saved evidence review; no fresh browser capture or visual approval. No runtime edits, commit, push, or promotion.

## Assessment

The bounded shared landing response is a useful next step: backward fall and body slam only, opt-in `?falls=v1`, signed rest-pose elbow tests, staggered limb offsets, and a defender released from the slam clip at contact. Keep the G2a stop. Derek still judges the rebound and bends on the preview; do not extend to T2.5 or promote on this report.

## Findings for the next plan

1. **Body-slam mat sound and shake precede contact by about 283 ms.** In `Wrestler._playPairedThrow`, the hit handler still sends damage, camera shake AND `crowd.impact('mat', ...)` at `impact` (1.083 s); the new `contact` marker is 1.367 s. The G2a page already acknowledges the geometry mismatch, but this also leaves the audible mat hit early. Preserve exactly one damage event. Plan a bounded clip descent/contact correction and align mat foley/shake to the chosen actual contact; moving damage is a separate gameplay decision. The new landing cannot repair the preceding slow descent.

2. **The ground handoff scales down the landing response.** `Skeleton.updateGroundedBlend` adds the landing offsets to the target BEFORE interpolating from the clip pose. Consequently each landing offset is multiplied by smoothstep(u) for the first 0.3 s. At 50 ms only about 7.4% survives; at 100 ms about 26%. The response clock starts at contact, but compression and early flail are strongly suppressed. This is a code-derived effect, not a visual verdict. Evaluate an additive response over the evolving handoff base, with seam and signed-flex checks; simply raising rebound amplitude could hide the cause and exaggerate later motion.

3. **T2.3's audit does not establish the promised complete joint/continuity contract.** `falls_landing_audit.mjs` tests lower flex floors only, with another 0.05 rad tolerance, and reports no upper-limit or clamp-hit checks. Its `landingEnd` is hardcoded to contact + 0.6 s, although actual duration varies with intensity and incoming speed. Its `sellStart` is the first sold flag after contact, not necessarily the landing-to-sell handoff. Record actual landing phase/time and duration in probe rows, check both limits and clamp activity through the blend/sell, and label measured seams from runtime transitions. Pure offset tests cannot cover the blended clip pose or hand IK. George's saved sell elbow misses (-1.9/-0.42 rad) remain visible integration debt even if inherited.

4. **Support evidence remains approximate.** The audit calls a hand already above the 3 px line at contact a release, without requiring prior support. Boxes are not painted palms, as the page correctly states. Separate never-supported / released / replanted; do not call box crossings proof of a supporting hand. Saved rebound peak counts also include wince motion. Prefer phase-tagged first-hop height and actual recontact times before tuning.

## Current evidence and recommended order

The G2a page reports first-hop backward heights 3.1–4.0 px and slam heights 6.5–7.4 px, with contact seam steps 9.9–16.1 px at scale 1. These are saved evidence, not independently recaptured measurements. The 6–10 px target remains tuning guidance. No head/wrist channels, painted support measurement, or hand-to-pain-part wince is supplied yet.

Recommended sequence: Derek's G2a glance; then Opus scopes the contact/foley and blend findings plus accurate phase/limit instrumentation into a small follow-up before broadening landing coverage. Carry G1 support/get-up/sell debts explicitly. Keep existing flags and the review gate.

## Fresh validation

Node v22.23.1: `node --test tests/falls.test.js tests/restPoses.test.js` — **15/15 pass**. These include pure response flex/zero-end/amplitude tests and `MoveRuntime.releaseRole`, but no end-to-end Wrestler landing interruption or contact/audio timing test. Full suite/build/coverage not rerun for this review and docs-only report. `git diff --check` run after writing the report.
