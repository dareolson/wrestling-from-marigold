# Sonnet's atomic drop / snapmare — repair review

2026-11-03 · Codex · Reviewed HEAD 89177ad. Working-tree repairs only: no commit, push, promotion or G4c-a approval.

[Normal-speed strips](index.html) · [before/after measurements](summary.json)

## Visual authoring advice for Sonnet

The key problem is the relationship between the two bodies. Each role has plausible-sounding pose numbers, but the pair lacks a supported contact tableau. More intermediate keyframes will interpolate that mismatch.

**Author four held pictures before another animated pass:** the top of the atomic lift, seat-on-knee impact, the snapmare's supported kneeling pull, and its back landing. Keep both wrestlers visible at actual grayscale play size. On each picture establish the support points, the contact point, body weight and the intended silhouette; then connect those pictures. Start with the worse rig pairing rather than tuning Lou-on-George alone.

For the **atomic drop**, place the attacker's support foot, raised knee and receiver's pelvis together first. Work backward from that impact into the lift. The receiver's legs should hang during the rise, fold as his pelvis contacts the knee, and regain support after the pop forward. A 36-unit slide with arms swung backward does not communicate that recovery. Give the receiver one authored catch-step and a hand actually contacting his own backside/back-waist; the existing protective-selling work is a reference, not a substitute for posing that beat.

For the **snapmare**, first bring the lifted defender onto his feet, then have him take the head, lower onto a supported knee and pull the other man's head over his shoulder. The thrower's changing support should cause the pull. Release the head as the thrown body clears the shoulder, then let the flight arc and back landing finish it. The current head grip is asked to connect bodies whose shoulders separate as one man crouches. Grip IK cannot create a missing head route or a kneeling support pose.

During flight, use the tucked silhouette to make rotation legible. The current 630° in 0.46 s averages about **1,370°/s**; that is a major reason the flip can feel like a spin. Keep Derek's specified version as the reference, and show a short alternative before deciding the final rotation. Avoid adding camera shake or more rotation to compensate for weak contact.

Judge each connection at normal speed first, then inspect the failed frame. Preserve the small joint/contact measurements, but use them to locate a miss rather than treating a passing functional test as visual completion.

## Retained repairs

1. **Knee ownership broke the entry blend.** The hold supplies absolute shins; the throw supplies local knees, which immediately override those shins. Converting the held bend to local flex also clamps it away. The draw blend now bridges between the two in rendered shin-angle space, with one temporary owner. The real move pose and timing stay intact. Regression tests cover both facings, reverse ownership and knee limits.

2. **Snapmare grip redraw bypassed the blend.** Arena restored the real pose before the hand solver, which calls draw again. The temporary blended pose now survives through every post-draw grip correction. The maximum part step during the first 0.14 s decreases from 44.39 to 39.22 px for George reversing Lou, and 57.50 to 52.87 px for Lou reversing George. These still miss a smooth-transition target.

3. **The head stayed high as the thrower knelt.** The victim now bends/crouches down with the pull; that bend carries into the early flip. Full-weight worst-hand-to-neck miss, normalized rig px:

| Drop starts | Snapmare thrower | Original | Candidate, both facings |
| --- | --- | ---: | ---: |
| Lou → George | George throwing Lou | 32.01 | 0.00 |
| George → Lou | Lou throwing George | 22.59 | 18.78 |

The reversed pair still misses. This does not certify contact throughout the ramp or the silhouette.

4. **The impact table sampled early.** A 0.009 s look-back selected 0.4167 s for the 0.42 s impact. The first rendered frame crossing the damage marker is frame 105, 0.4333 s. Its pelvis-to-raised-knee gap is **12.81 px for Lou dropping George**, versus the published **35.1 px before impact**. George dropping Lou has **47.06 px** at the actual impact. These are joint distances, not painted tailbone-surface contact.

The reporter now filters by the named clip: preceding atomic-drop frames no longer pollute snapmare reach/overlap statistics or stand in for its first frame. Landing selection and its assertion likewise use the first sample at/after the marker. The film writer also writes its first rows file to the requested directory, rather than the ancestor returned by recursive mkdir.

The atomic-drop height experiment worsened contact and was reverted; its pose keyframes are unchanged.

## Remaining failures and next repair block

- **Fix George dropping Lou at impact first:** the 47 px gap is the worse contact case. Fit the raised knee and receiver pelvis using actual rig/art anchors, then verify the smaller receiver. Do not move the damage clock to conceal the miss.
- **The snapmare pull is not yet a supported kneel.** A leg extends in front; crouch and positive knee flex alone do not put a knee on the mat. Use the existing get-up KNEEL as a shape reference, with an explicit near-knee / other-foot support solve. Its ground-space angles cannot simply be pasted into upright local-knee channels. Then lower the thrown head into both arms' reachable region.
- **Entry steps remain:** Lou's drop first-frame max improves 45.24 → 36.43 px, still above the tie-up's roughly 32.8. The first actual snapmare frame improves 34.83 → 13.18 px for George reversing Lou, but later lead-in steps remain larger. George's drop starts near 49.8 px; its original-handoff baseline was not captured, so no before/after entry improvement is claimed for that pair.
- **D12 still fails.** The summary retains raw every-frame overlap; the fixed-size mask's airborne cropping limitation remains. Maxima are hundreds of below-belt pixels in the drop and over a thousand in the flip. Layering is not clearance. No new A7 permission is inferred.
- **Foot support is missing:** the 36-unit stumble translates roots without authored steps. Much of the existing “planted sole” table actually measures all ankle movement, including raised feet. Classify support before measuring slide.
- **The final facing snap remains.** Author a turn; delaying it or only examining eight post-move frames does not remove it.
- **Derek's flip decision remains:** unchanged rotation is one turn plus 270°, **630° / 11 rad / 1.75 turns**. The published “passes inverted once” does not describe it. No rotation change was made without the G4c-a choice.

Make one normal-speed loop in both facings after the support/contact repair, then expand the matrix. Include the full 0.14 s lead-in and 40 post-move frames. Do not wire sleeper-wrap art or advance AI/kits in this repair. G4c-a remains a review boundary.

## Evidence and checks

- baseline/: original poses and original handoff, Lou/George, both facings.
- original-contact/: original pose keys explicitly recompiled in a disposable browser, both pair orders, facing right. Corrected knee bridge already active: contact baseline only for George's pair.
- contact-candidate/: experiment, includes the rejected drop-height change; not final.
- draw-order/: short probe after the redraw repair.
- final/: eight current strips, both pair orders/facings, 40 post-move frames.
- tools/debug/waistlock_contact_probe.mjs reproduces the original-contact override.
- tools/debug/waistlock_review_report.mjs summarizes saved rows and builds the viewer.

Final verification: 56 focused tests, all 36 browser throw assertions, the production build, and the grapples-off comparison (60 frames identical to 1e-4) passed after the final draw-order repair. See CHECKS.txt. No full-suite or promotion claim.
