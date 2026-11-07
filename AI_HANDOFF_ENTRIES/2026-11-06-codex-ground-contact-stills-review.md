# For Opus: ground-contact stills review

2026-11-06 · Codex · Derek requested review and note. Reviewed through `ea31ebb` (T4.5–T4.6), source/tooling/results and saved contact stills (Lou on George supine, George on Lou supine) plus Lou on George prone roll-off. No fresh browser capture or animation playback. No runtime edits or promotion.

## Assessment

This is the planned static proof, not a completed ground-attack fix: runtime remains unchanged, animation and contact layering live only in the tool. Anchoring an actual elbow to a drawn torso point and measuring silhouettes are useful improvements over matching roots. Existing parts suffice for these poses; no new art request is justified yet. Keep the stills boundary for Derek before T4.7.

The far-side choice is a reasonable candidate, despite the earlier near-side suggestion: the search reports less projected overlap there. Do not force the near-side layout merely to follow my earlier recommendation. Derek chooses the silhouette; the metric does not decide it.

## Findings for the next block

1. **Zero front conflict is not a no-phasing result.** The measurement sets `front = 0` whenever all non-striking attacker parts are behind the receiver. Contact stills retain 316–927 raw overlapping pixels. The page discloses this correctly; retain that distinction in the next plan. Legitimate 2D occlusion is possible, so raw overlap need not be zero either. Judge the contact contour and body placement, then compare matched animated windows, not a static pose against an entire 2.6 s baseline. Do not accept a depth override as the sole fix.

2. **The allowed-contact mask is broader than the intended contact.** `falls_contact.mjs` allows the entire upper arm, forearm and hand of whichever elbow is nearest the chest, recalculated per sample. That can exempt upper-arm intersection or switch the exempt limb mid-animation. For each move, declare the striking side/part and target region explicitly. Report unrelated body overlap separately even where it shares pixels with the allowed arm; `over - limb` on union masks cannot distinguish a torso hidden under those same arm pixels. Keep the present metric as descriptive evidence, not a complete collision/contact validator.

3. **Roll-off has not established a support hand on the mat.** The tool anchors the far elbow to chest + (-45,-60) in the roll-off pose; it does not anchor either hand to a mat support point. In the saved Lou-on-prone still, the extended hands project across the receiver's upper back/head region. The page acknowledges residual arm contact (28–246 px depending on case). Show the intended planted hand point and its gap to the mat/receiver before using it to drive a push-away get-up. Do not request replacement art until the support route is tested with existing parts.

4. **Animation needs more than endpoint interpolation.** Flight -> contact must stop the striking limb at the torso while keeping torso/hips beside it. Compression/jolt/recoil need one coordinated contact beat; keep the target current as the receiver reacts. Then release the contact constraint and route away before get-up. Explicitly restore part depths on interruption/cancel/match end. The still tool overrides `updateGrounded` and `setDepth`; that is a preview technique, not production ownership/cleanup. Check ring-room and mat support using the actual attacker/receiver positions throughout the route.

## Recommendation

Show Derek the contact close-ups and a revised/annotated support placement for roll-off. After he chooses the static geometry, implement one elbow-drop sequence first, both rigs/facings and supine/prone, with a matched before/after window. Validate elbow gap, body overlap/depth, hand support, signed joints, seams, single damage/foley timing and cancellation. Only then apply the approach to knee drop/dives with their own striking parts. Preserve the bounded task; do not reopen parked move polish or regenerate the art wholesale.

## Fresh validation

Node v22.23.1: `node --test tests/falls.test.js` — **57/57 pass**. The new still test checks authored knee/elbow channel flex; it does not test target contact, support, occlusion, ring bounds or animation. `git diff --check` passed for this docs-only note. Full suite/build not rerun.
