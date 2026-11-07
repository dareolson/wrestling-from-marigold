# Sonnet's atomic chamber work: review before Opus

2026-11-04 · Codex · Requested by Derek. Reviewed e7cd7cd and 34337f3, current checkout and probe code. No runtime edits or approval.

## Assessment

Good bounded implementation and candid reporting. T4c.4l changes only the intended atomicDrop coverage baseline entry, keeps it unverified, and records the remaining raw overlap. T4c.4m preserves the default lift-chamber keys and adds the hitch variant without changing the carry/runtime machinery. Keep these commits as the experiment's record. The hitch variant is not yet a mechanically equivalent alternative ready for a simple preference vote.

## Findings for Opus

1. **The hitch variant misses the support and peak-hold requirements.** Sonnet's 34337f3 commit reports George support-sole drift **19.5 px**, versus **0.1** in the lift variant; his near sole rises **16.1** before lift-end. Lou's receiver pelvis range during the hitch is **6.2**, against the requested <2. The variant also changes carrier lift from 8 to 13 during the chamber, so this is chamber timing plus body-height compensation. Zero seat gap at impact does not resolve these preceding support failures. Default remains `lift`, correctly. Either repair the bounded variant before asking which execution Derek prefers, or explicitly present it as an unsuccessful experiment with these misses. Do not call it a two-foot-supported lift.

2. **The r6 review package is incomplete in this checkout.** HEAD is 34337f3 (T4c.4m). `research/animation/grapples-2026-11/g4c-a6/` contains frame directories and two film logs, but no top-level `index.html`, report or measurements table; T4c.4n has no commit. The hitch log ends after drop-gl-r, without the final snapmare pair/result publication. Complete or recover the package before treating r6 as delivered. This may be unfinished capture work; the review is scoped to the files currently present.

3. **Measurement labels need tightening.** `atomic_chamber_probe.mjs` defines each sole's “mat” as its own position at the wrap, without verifying that it was grounded there. That measures displacement from the wrap, not independently established height above the mat. It also divides sole height and pelvis range by actor scale, while reporting x slide, joint steps and support drift in raw game pixels. Label these units separately and expose the captured sole's grounding/plant target error before claiming mat support. Keep the named near/far measurements checked against the channel-to-side mapping for both facings.

4. **Comments overstate the result.** `atomicDrop.js` and `waistlockThrows.js` still say both feet stay on the mat through the lift, contrary to the reported measurements. Correct those comments. The HLIFT comment also says Lou drops ~9 px while the commit says range 6.2; use the final captured value or omit the stale number.

## Next action

Keep the default. Diagnose the variant at the first support-foot error: plot target error and drawn hip/sole positions during the chamber, then adjust the authored reachable stance and weight transfer. Sonnet already tried and rejected a second plant because it failed badly on George; do not repeat that or widen joint limits. Avoid another global magic lift value chosen as a compromise between rigs. Preserve the torso carry and contact marker. If a modest pose correction cannot retain support and a held receiver, stop and report that limit to Derek rather than expanding into a new solver.

Then finish r6 with the support/peak misses, raw overlap and existing snapmare misses visible. The original lift candidate is still available for Derek to choose. Resume the planned sleeper reversal after that decision.

## Fresh checks

- Node 22.23.1 full suite: **1178/1178 pass**.
- Hitch-selected atomicDrop/carry tests: **12/12 pass**. These establish runtime behavior, not the visual support thresholds above.
- Production build: pass.
- Attempted fresh real-rig hitch probe: harness could not start its localhost:5199 dev server; no fresh browser measurements obtained. Numerical variant findings above are explicitly Sonnet's recorded results, checked against the authored changes and probe implementation.
