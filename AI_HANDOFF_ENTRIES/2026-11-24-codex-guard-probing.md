# Searching guard — Codex, November 24, 2026

Derek requested slight arm animation near an opponent, suggesting he is looking for a grab or strike. The ready stance now adds restrained lead-hand reach/retract motion and an offset rear-guard adjustment. Two slow rhythms avoid a synchronized arm pump; Kowalski has slower, smaller gestures. This is presentation only, with no automatic grab/strike or gameplay timing changes.

`probingGuard(rigId,time)` adds bounded facing-relative arm angles to the existing ready stance. Scene time determines phase (frame-rate independent) with an initial-position offset per wrestler so opposing characters do not synchronize. Uses existing proximity easing and ownership exclusions. Bone lengths, shoulder anchors, body posture and legs remain the same as the ready stance. Draw clears probe time before any early-return render path.

Enabled within the existing opt-in `?stance=v1`; `&guardMotion=off` selects the static ready guard. Preview: http://localhost:5185/tools/gait-preview/?compare=probing&rig=george-roster-v1 . Both panes use identical ready stance, walking and locomotion arms; left static, right probing. Starts close-up, with Full body toggle. No match defaults promoted.

Validation: 56 focused tests and production build pass. Tests sample 30 seconds of all four guard profiles, checking elbow limits and bounded wrist movement. Browser audit checks all four rigs/both facings across 12 seconds each: finite joints, unchanged authored pose, identical legs/neck, invariant upper/lower arm lengths, nonzero hand motion, and suppression in running/falling/choreography. Evidence: research/animation/guard-probing-2026-11-24/. Await Derek’s motion review.

## Stronger revision, same day

Derek requested less subtle motion. Increased gesture amplitudes 2.4× while retaining rhythm, phase offsets, smaller/slower Kowalski gestures, posture and move ownership. Shoulder-to-wrist excursion stays bounded; sampled elbow flex remains within limits. Relevant tests 19/19 and build pass; browser audit rerun for all rigs/facings. Evidence stronger-tests.txt and stronger-build.txt alongside updated runtime.json and preview.png.
