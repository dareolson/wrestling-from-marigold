# Atomic drop — higher carry, held peak, bent landing

2026-11-04 · Codex · Local candidate on top of 5b6dfed, responding to Derek's request after r5: keep the faster lift and improved support, boost the receiver higher during the lift, hold a beat at the peak, and bend his legs on landing.

[Normal-speed loops, both facings](index.html) · [measurements](summary.json) · [both-pair contact checks](contact-check.json)

## Changes

- Lift remains **0.42 s**, with the existing torso carry and planted support leg.
- Added an optional torso-carry slide: **36 rig units along the carrier's torso**, easing up during the lift and holding afterward. This is an offset inside the existing carry frame; it does not raise the receiver using independently animated shoulder keys.
- Peak beat increases **0.06 → 0.24 s**. Both men now reach their top key together and hold the same pose while the slide stays at its peak. In the first draft the old carrier transition continued lowering the receiver during the added time; that drift is removed.
- Receiver landing folds increase from 0.60/0.60 to **0.95/0.90 radians**, and compression to **1.15/1.05**. Recovery and idle poses remain as before.
- The torso-to-thigh handoff now reaches full knee contact by the impact marker. Impact/damage shifts **0.55 → 0.73 s** with the longer hitch. Drop speed (0.07 s), recovery duration (0.55 s), damage (12), reversal window (0.20 s) and snapmare timing stay unchanged.
- Total atomic-drop duration is **1.28 s**, previously 1.10 s.

## Measured result

Lou on George, fresh stepped browser playback, both facings:

| Measure | Result |
| --- | --- |
| Added receiver pelvis elevation at the end of the lift | **19.24 raw game px**, both facings |
| Pelvis vertical range through the held peak | **0 px** |
| Peak beat | **0.24 s**, about 14 frames |
| Drawn receiver knee fold at landing, near/far | about **56° / 53°**, previously about 34° / 34° |
| Seat-to-knee gap at first rendered impact frame | **0 px**, both facings |
| Attacker hand-to-waist reach during the carry | **0 px** to the corresponding hip target in the captured Lou/George comparison |

The contact probe also checks George on Lou, both facings: the seat reaches 0–0.1 px gap through the held contact samples. The standing support sole drifts about **0.1 px**, with maximum frame steps below **0.2 px** in that probe. The raised leg is intentionally moving and is not counted as a planted-foot failure.

The receiver comes within the 3 px approach threshold at 0.7167 s; the exact-contact sample and the 0.73 s damage marker occur together in the next rendered frame (0.7333 s). No damage clock is detached from the new contact beat.

These measurements do not approve the animation or waive the existing D12/overlap and end-handoff polish. Derek judges the normal-speed loops.

## Implementation and checks

The carry extension is optional: carries without slide retain their previous target. Validation rejects malformed rise windows, and the compiled slide settings are frozen. New runtime tests check rising along a tilted torso, preservation of the across-body offset, no further climb during the hitch, both facings, and different actor scales.

- **61 focused tests passed:** carry, atomic drop, snapmare, clip compiler, move runtime and staging.
- Production build passed.
- Existing throw browser assertions passed: damage, reversal timing, rope denial, ending states.
- Both-pair / both-facings seat and support-foot probe passed the measurements above.
- Flag-off comparison is recorded in CHECKS.txt.
- git diff --check passed.

Only the two-facing Lou/George review loop was rebuilt as a small visual checkpoint. The reversed pair was checked numerically. No full G-package, approval, commit or push.
