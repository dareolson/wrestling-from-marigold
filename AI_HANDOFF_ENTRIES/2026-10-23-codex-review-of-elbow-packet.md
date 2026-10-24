# Review of Claude's elbow pilot packet

2026-10-23 · Codex · reviewed `f4829ce`

Inspected the contact sheet, donor audition, clutch sheet, reference-tool source
and registry. The recommendation to audition existing grip paint before making
new elbow paint is supported by these images. Moderate bends have a coherent
joint outline; deeper folds would benefit from compression/overlap paint. The
grip donor supplies visibly curved fingers. No runtime or new art was delivered
by this commit, so it is a reference packet, not an integrated improvement.

Corrections for Claude before generation or integration:

1. **The head clutch is a diagnostic, not the actual suplex reaction.**
   `MOVE_SPECS.suplex.sell` is `{part:'back', intensity:1}`. The reference tool
   manually installs `part:'head'`. Keep the useful head example, but name it
   accurately. Capture the real back clutch and its hand-to-hip contact before
   deciding which donor is best for the suplex-aftermath pilot. The sampled
   124°/114° maxima are four chosen head-clutch frames, not continuous-clip maxima.
2. **Palm-side fist is not an open supporting palm.** The bottom row of
   `donor-audition.png` shows curled fingers/closed hands. It changes the visible
   side of a fist; it cannot by itself supply a flat weight-bearing palm for
   get-up. Label it `palm_side_fist`, and reserve `open_support` for art with an
   actual supporting palm and finger contact. The grip is also an audition,
   not automatic approval for all knee/chest/head contacts or both perspectives.
3. **Forward flex and hammerlock are separate pose families.** The survey
   uses absolute elbow magnitudes. That loses the difference between positive
   flex and the hammerlock's explicitly negative channels, which approximate
   shoulder internal rotation in 2D. A 150° forward-flex ladder is not a
   generation reference for an arm folded behind the back. Start new flexed-pair
   art from an actual rendered suplex/piledriver attacker pose. If hammerlock
   needs art, use its own defender screenshot, signed channels, view and
   shoulder/elbow/wrist contacts in a separate candidate. Reuse paint only after
   comparing those actual poses; do not promise one donor fits both.

The broad reuse survey is a useful candidate list, not a rendered fit audit of
every move. In particular, the statement that tight folds occur in head/chest
clutches needs its own full rendered sweep; it does not follow from the four
head-clutch images, whose sampled folds stay below 137°.

Recommended next concrete deliverable: a candidate grounded-sell appearance
owner auditioning Lou's existing grip on the real back clutch and the diagnostic
head clutch, with base/grip comparisons at game scale, both facings, and reset
on interruption. For get-up support, use a separate open-palm request if the
existing art fails. Preserve the parked figure four and authored hammerlock.
No need to generate a whole sheet or require another approval just to prepare
that reversible comparison; final visual promotion remains Derek's call.

Reference scripts pass `node --check`; `git diff --check` is clean. No fresh
runtime film or test-suite run was needed for this documentation/tool-only commit.
