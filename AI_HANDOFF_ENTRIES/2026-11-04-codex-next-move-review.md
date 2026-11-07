# Advice for Opus: close r6, then finish the sleeper reversal

2026-11-04 · Codex · Requested by Derek. Reviewed HEAD 5b6dfed, the current animation diff, the atomic-peak evidence and the Stage 4c/4d plan. Advice only; no runtime changes, commit, push or approval.

The current direction is sound. Keep the torso carry, optional slide, support-foot plant, thigh contact and deeper receiver landing. These address actual relationships between the wrestlers, rather than trying to hide contact misses with more independent pose keys. Finish one bounded atomic-drop comparison, then return to the sleeper's small snapmare. Keep story, venues, new holds and further engine work outside this block.

## Before T4c.4l

Fresh Node 22.23.1 validation: `npm test` **1177/1178 pass**; `npm run build` passes. The sole failure is `tests/moveCoverage.test.js:139`: atomicDrop requirements fingerprint changed from `c0a28edd8422` to `7ba5418ae518`. This is the guard correctly reopening existing coverage debt, not evidence of a gameplay failure. Per the current plan, report the failed gate before committing. Review what changed in the requirements, then explicitly update only the relevant baseline entry with an accurate reason if the debt is still accepted. Do not regenerate unrelated baselines or claim the move is covered: it still has no critic spec. Browser gates, knee audit and raw D12 have not been rerun in this review.

## T4c.4m: measure support, don't infer it from keys

I agree with testing lift first, knee chamber second. The current candidate makes the attacker's L and T poses identical, so the knee rises during the lift. A hitch-chamber variant should tell a clearer weight-transfer story while retaining Derek's higher, held peak.

One correction to the brief: restoring r5's `lLeg`/`lFold` at L while keeping `lift: 8` does **not** itself establish “both feet on the mat until L.” The plant currently anchors only the r leg, and the body solve can move the other sole. Measure both painted soles through the squat and lift. If the restored pose misses the mat, author the support transfer explicitly; avoid adding a second hard constraint without checking reach and knee limits. Require continuity at lift-end, chamber-end and impact, as well as the existing <2 px receiver peak drift target. Do not freeze the receiver by breaking his carry relationship.

Keep the comparison controlled: same height, total duration, drop, damage marker, landing folds and camera; vary chamber timing only. Keep the raw overlap table beside r5's. Contact and layering success do not establish D12 success. For r6, retain the planned Lou/George loops in both facings and reverse-pair numerical checks; escalate any reverse-pair discrepancy to a visible strip.

## After Derek's r6 choice

Proceed to T4d.3 and G4d-a. This yields a playable rear-hold exchange with a reversal and visible escape progression, which serves match drama better than opening another move family now. The small snapmare currently has option data in `sleeper.js`, but `clips/snapmare.js` still builds a fixed full flip and supine landing. Use one clip builder with a default full option; preserve full-snapmare behavior while authoring the small option's seated landing and 0.8 s hold deliberately. Halving rotation alone would leave the full throw's path, landing and recovery wrong.

Verify reversal availability at z/zz and denial at zzz, one damage event, cleanup of both partners on interruption, ring-room denial, and a continuous seated-to-getup handoff. Continue using base forearm art until Derek approves the wrap. Stop at the planned visual gate. Waistlock remains opt-in.

The existing snapmare release step, unsupported kneeling gap and raw body overlap remain explicit misses. Don't silently turn these into accepted defaults while introducing the small variant; distinguish inherited misses from new regressions and show any that affect the new seated exchange.

## Recommended next instruction

Resolve the atomicDrop coverage fingerprint deliberately, complete the remaining T4c.4l gates, build the support-measured hitch-chamber comparison, and stop at r6 for Derek. After his choice, finish T4d.3–T4d.4. No new feature branch of work inside this block.
