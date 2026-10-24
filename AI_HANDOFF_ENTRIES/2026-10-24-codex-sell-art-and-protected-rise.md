# Implemented: contact-aware selling art and a protective back rise

2026-10-24 · Codex · working changes on base `361d9bb`

Derek authorized a deeper audit, direct implementation and a report back to
Claude. He also clarified that Codex produces the new art. I read Claude's
corrected elbow packet and implemented a small real-game comparison rather
than commissioning a whole replacement body.

## What the review established

Claude's key finding stands: the moderate elbow bend is not the main failure
in this pilot. The missing hand function, actual contact surface and absence
of back protection during the rise matter more. His earlier head-clutch study
is useful diagnostic material; the suplex's real reaction is `part:'back'`.

Two extra problems emerged from implementation and rendered inspection:

- The logical `Wrist` is a baked forearm/hand endpoint, not necessarily where
  the painted hand touches. Registered canvases alone do not guarantee a grasp.
- The back clutch's old `nearHip` target puts the hand on the hip/trunks.
  Better hand paint still reads as the wrong pain location if we keep that target.

## Candidate available now

Add **`sellart=v1`** to a game URL. Use Procreate Lou (`thesz-procreate-v1`),
whose registered grip donor has the contact metadata. Existing defaults remain
the comparison baseline. `aftermath=v2` can be added independently for the
previous compact fallback and standing-recovery overlay.

1. **One appearance owner for grounded sells and protective rises.**
   `sellAppearance.js` chooses existing supported grip variants for the authored
   back/head approach/contact/release phases. Other reactions keep their current
   art. Near/far choice follows the actual clutch and anatomical slot mapping.
   Missing donors/images/textures fall back to base. `Wrestler` releases this
   selection before a clip or legacy pose takes over and on sell completion,
   roll, pin, pickup, state exit and reset. It does not write over an active clip.
2. **Painted contact rather than a misleading bone endpoint.**
   The existing grip donor gains a `clutch` landmark at source **(57,279)** on
   its 117×351 canvas. This is the black **inner cup contour**, not palm skin.
   `Skeleton.imageAnchorPoint` reads its actual origin, flip and transform.
   Candidate reach IK solves that point to the target, compensates the local
   contact angle and reserves angular budget to retain the real elbow fold cap.
   Default reaches continue using their existing endpoint.
3. **An art-specific back-waist target.**
   Lou's torso gains `backWaist` at normalized **(.22,.60)**, on the back/left
   waist contour above the trunks. Only candidate back reactions use it. This
   is a measured point on this three-quarter painting, not a general anatomical
   spine landmark or a coordinate to copy blindly to George.
4. **Protection carries into the supine rise.**
   Optional `updateGetUp` context reaches the near hand to the back-waist target.
   The envelope ramps from 0 to full by rise progress .18, holds to .55 and
   eases out by .85. The original first/last geometry and get-up duration are
   preserved. Non-back pain, prone rises, quick rises and active choreography
   keep their existing paths. The candidate requires finite positive severity.

This is a small addition to the current rig/appearance machinery. It is not a
new animation engine, and it changes no damage, down timers or input locks.

## Rendered evidence and review

[Open the comparison viewer](../research/animation/sell-art-pilot-2026-10-24/index.html).
The final dataset is `proof-waist/`; `proof/` preserves the first hip-target
trial so the reason for the refinement remains visible. Twenty paired poses
were drawn through **actual `Wrestler.draw()`** in one paused scene: actual back
clutch samples, a labeled diagnostic head clutch, and supine rise samples in
both facings. These are exact phase comparisons, not uninterrupted match film.

- At the back-clutch holds, the candidate inner grip contour is approximately
  **0.17px** from the authored waist target in both facings.
- The same residual holds through sampled rise progress .20/.34/.55. The base
  fist probe is not a calibrated palm surface, so do not turn its distance
  into a claimed percentage improvement in physical contact quality.
- At rise .20, the legacy near wrist is 49.46px below the diagnostic mat line;
  the candidate is 12.25px above it. This is a screen-space clearance probe,
  not proof of weight bearing or a complete floor collision model.
- Final proof first/last rise poses match the baseline within floating-point
  precision. Maximum sampled elbow magnitude is recorded in the JSON; no
  continuity/anatomy approval is implied by static poses alone.

My visual judgment: the hand-to-waist reaction and continuing back protection
read more deliberately than the fist-to-trunks and dangling-arm rise. The cup
gesture still looks a little pinched for a broad back press. It is an honest
candidate, not final acting or art sign-off.

## New art produced by Codex

Saved under [lou-open-palm-2026-10-24](../research/art/lou-open-palm-2026-10-24/README.md),
using the built-in image-generation tool, transparent output and the existing
forearm as the edit source. Exact prompts, source/output hashes and status are
preserved. v1 showed the back of the hand; v2 corrects the view to an open palm.

**v2 is a donor, not a calibrated runtime replacement.** Generation changed
the forearm/hand proportion, so uniform full-canvas shrinking would shorten the
painted elbow-to-wrist span. Next art work is deterministic hand harvesting or
registration against the original elbow/wrist, followed by the normal artist
cleanup. No existing art was overwritten. The runtime candidate uses the
already registered grip donor while this open palm is prepared.

## Verification

- Node 22.23.1: **800/800 tests pass**, including new appearance ownership,
  interruption/fallback, rise endpoints/envelope, image contact transforms
  and contact-offset elbow-cap cases.
- Production build passes; all eight rig contracts validate.
- Real Chrome `play.mjs suplex` and `suplexReverse` pass with
  `sellart=v1&aftermath=v2` and Procreate Lou/roster George casts. These validate
  execution/events, not a full-speed acting approval.
- `sell_art_proof.mjs` captures both facings and the actual render path;
  `git diff --check` clean. No commits or pushes made.

## What Claude should do next

1. Review the final waist-target viewer first. Preserve the exact same-phase
   baseline when judging the hand shape and the protected rise.
2. If this direction reads, help author the next motion: a real supporting-hand
   plant with a fixed world contact and an open palm. The current far hand
   still follows generic get-up angles and slides; it is **not planted**.
   Prone rises have separate support problems and remain a separate candidate.
3. Give Codex the exact support pose/view, contact patch and source dimensions.
   Codex owns new-art generation; use the saved open-palm donor as the starting
   material where it fits. Do not scale it blindly onto the old canvas.
4. For deeper flexed-arm art, use actual forward-flex suplex/piledriver poses.
   Keep hammerlock's negative-fold projection in its own family. Strongly
   off-axis contact donors need a hinge/extension check in addition to a cap
   check; this donor's contact is almost on axis.
5. Film the complete impact-to-rise-to-standing sequence with event-relative
   game timestamps before promoting this candidate. Existing upright handoff,
   far-hand support, residual reach-activation step and facial acting are not
   claimed solved by this pass. Figure four remains parked.

No live Claude reply is implied by this repository handoff.
