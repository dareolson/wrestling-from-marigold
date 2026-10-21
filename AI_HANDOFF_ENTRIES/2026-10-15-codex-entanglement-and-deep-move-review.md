# Next Claude: move contact, recovery, and leg entanglement

2026-10-15 · Codex · requested by Derek.

Derek explicitly assigned the next Claude session to tackle the findings and
entanglement approach below. First read the current Claude handoff and reconcile
changes made after baseline `1311f8b`; reproduce remaining defects before editing.
The current selling-library work was in progress during this review and is not
judged here. Preserve Derek’s hammerlock draft and existing damage/down durations.

## Deeper move review — committed baseline 1311f8b

Review only. Shared project source was not edited. Claude's unfinished selling work is excluded from the findings below. An initial working-tree capture included it; those traces were set aside as /tmp/marigold-in-progress-runtime.json. Final checks used a temporary copy overwritten with git archive HEAD for tracked src/tools files, retaining required local art assets. Baseline: 1311f8b01531c68f7959788891ae86acd0b95cee.

## Judgment

The method and choreography have improved substantially. The remaining problems are not all deficiencies in acting: cast geometry, renderer transitions, and ring placement can defeat a well-authored clip. Those should be distinguished from artistic refinement so the animator does not repeatedly compensate for infrastructure mismatches.

## Confirmed findings

### 1. Piledriver contact fails on Procreate Lou

Exact runtime seek to the authored 1.24 s impact, in George -> Lou center-ring staging:

- Original Lou's lowest painted head pixel is effectively on the floor line (within 0.2 rig units using the standing sole calibration).
- Procreate Lou's lowest painted head pixel is about 33.6 rig units above that calibrated line, approximately 31 screen px at this perspective scale.
- At 1.27 s compression, Procreate Lou remains about 29 rig units above the calibrated line. The gap persists through the head-balance beat; this is not simply a damage event a frame before contact.

The raw root-floor gap at impact is also 31.7 rig units, so the result does not depend on the small standing-sole calibration. Screenshots independently show the gap.

The constraints stage the defender's NECK relative to George's hip during the lift/hold. Impact and subsequent poses use authored lift values. Shared lift scaling does not ensure that differently proportioned head/neck/torso art reaches the same painted contact surface.

Recommendation: define and measure the inverted crown-to-mat contact on both rigs, preserve the waist grip, then direct the compression and release around that contact. Do not solve the head independently of the hands and hips.

Evidence: [original Lou impact](../research/animation/move-review-2026-10-15/piledriver-impact-thesz.png), [Procreate Lou impact](../research/animation/move-review-2026-10-15/piledriver-impact-thesz-procreate-v1.png), [exact contact and handoff measurements](../research/animation/move-review-2026-10-15/marigold-impact-results.json).

### 2. Grounded blending does not preserve original Lou's shoulder geometry

An exact end-pose test removes frame scheduling as a confounder: seek piledriver to 2.00 s, draw, capture joints, invoke _layDown(..., 'prone'), draw at blend progress zero, compare.

Original Lou jumps 29.77 rig units at nearShoulder and 29.46 at nearElbow/nearWrist. At the tested scale that is approximately 27.7 screen px. Procreate Lou's worst corresponding transition is 3.28 rig units at the neck.

Cause visible in code: groundedPoseFrom reconstructs segment angles and hip placement, but the legacy grounded renderer collapses shoulder roots to its shared torso origin. Separate torso shoulder sockets are gated on the dynamic pelvis/socket path. The upright and grounded geometries therefore differ for original Lou even at blend progress zero. Blending the angles cannot recover the missing shoulder offsets.

Recommendation: preserve or consistently derive the socket geometry across these render paths. This is separate from the later get-up-to-standing pop.

Evidence: [exact contact and handoff measurements](../research/animation/move-review-2026-10-15/marigold-impact-results.json). Snapshot code: src/Skeleton.js groundedPoseFrom and _applyGrounded shoulder routing.

### 3. Rope clamping changes the throw's landing geometry

A controlled executor stress check used real Wrestlers and Arena._tickGame at 60 Hz, Lou's actual kit, y=410, with both initial positions inside their standing limits.

Body slam, facing right:

- At center, attacker x=550; defender ends x=734.28: separation 184.28 screen px.
- Near right ropes, attacker x=800 and defender initially x=865; defender ends clamped to x=868.18: separation 68.18 screen px.

Hip toss, facing right:

- At center, defender lands 147.42 screen px behind the attacker.
- With attacker x=160 and defender initially x=225, defender ends clamped to x=91.82: only 68.18 px behind.

These are executor-level stress checks, not proof that a natural keyboard scenario fired each move at exactly those coordinates. The mechanism is explicit: _applyStagedTransform clamps each actor independently after applying the shared authored frame. The late landing displacement is compressed, while tilt/lift continue to describe the original motion.

Recommendation: plan the pair's tableau against the available ring area. Options include shifting the shared staging origin before commitment or authoring a deliberate rope-side variation. Preserve relative placement during the committed throw.

Evidence: [edge results summary](../research/animation/move-review-2026-10-15/edge-results-summary.json) and the preserved diagnostic scripts in that evidence directory. The per-frame edge trace remains temporary.

## Artistic reading after watching gameplay

Suplex remains the clearest reference for preparation, suspense and commitment. Body slam's overhead hold is readable; the load could communicate George's weight more clearly. Hip toss has a coherent trajectory but its overlapping entry obscures the purchase, and the pull over the hip could be clearer. Piledriver's silhouette works during the hold; the release and crumple need a stronger relationship to the head contact. George's backward recovery also settles his boots into Lou's head area in the sampled center-ring match.

The current single rigid upper torso can bend about the hips but cannot show internal curvature, twist, or compression. More keys will not by themselves supply those shapes. That is an art/rig limitation to address only where the directed poses require it.

## What the checks actually establish

- Prior validation on this baseline: 666 unit tests pass; production build passes; participation proof maxGap=0 and maxUncoveredCore=0 for George and both Lous.
- Fresh keyboard-driven bodySlam, piledriver and hipToss scenarios pass; gameplay films are under /tmp/deep-review-<move>.
- Seven additional baseline runtime traces cover both Lou variants and mirrored hip toss/piledriver, recording through get-up. These invoke executors directly and are diagnostic, not input-eligibility tests.
- Natural down -> gettingUp transitions were continuous at the sampled joint points. Get-up -> standing still showed visible joint jumps.
- play.mjs accepts the presence of a matching event; it does not assert visual contact, damage count or aftermath quality. Arena logs a paired move when initiated, before its eventual impact.
- referenceThrows tests prove registration, valid data/export parity, one event per playback at several rates, and broad endpoint tilt/lift conditions. They do not measure crown-to-mat contact or renderer seam continuity.
- The piledriver critic's existing landing spec measures the attacker's TORSO, which lands during his later backward roll. Its reported half-second event offset does not establish that the piledriver impact is mistimed.
- Foot-slide scores include intentional sit-out leg travel. Overlap scores are screen-space projections. Floor scores use painted outlines and a standing sole calibration. Treat them as leads for inspection, not automatic verdicts.

## Priority for reviewing Claude's completed pass

First check whether confirmed-hit tags and sells integrate cleanly with clip handoff, cancellation, pinning and get-up, without changing down duration. Then check the three independent baseline issues above. Do not attribute them to the new selling library without a before/after reproduction. Keep the original Lou and Procreate Lou contact and transition checks separate.

Selected screenshots, measurements, and diagnostic scripts are preserved in `research/animation/move-review-2026-10-15/`. The scripts retain session-specific absolute imports and port 5221: adapt them to the current workspace and an isolated server before rerunning. They are review diagnostics, not installed regression tests. Full runtime traces and gameplay films remain temporary `/tmp` artifacts; the findings above are recorded independently of their availability.


## Assigned next: prove leg entanglement with the figure-four

Derek asked how to support figure-four leglocks and planned toe holds, then
asked that the next Claude tackle this direction. Implement a small, opt-in
proof on the existing figure-four before generalizing to the full hold library.
This is a proposed implementation direction, not a claim that the machinery
already exists or that every listed art addition is necessary.

### What the current implementation lacks

- `tools/move-editor/author_figurefour.mjs` poses both wrestlers but has no
  accompanying staging constraints establishing a true leg trap. Its crossed
  angles alone do not prove which ankle is trapped or where pressure is carried.
- `Skeleton.setDepth(base)` supplies a fixed internal part order. Each wrestler
  receives its own depth base in `Wrestler.draw()`. This cannot reliably express
  one leg passing behind a partner's shin while another segment passes in front.
- The boot is often painted into the shin; there is no generally independent
  foot articulation for twisting and gripping the foot in a toe hold.
- Flat side-view thigh/shin art cannot express every foreshortened knee, calf,
  or foot orientation merely by rotating it.

### First deliverable: one readable locked tableau

1. Block the locked figure-four position first. Explicitly identify the
   defender's straight leg and bent leg, ankle resting across the other leg,
   and attacker's trapping/bracing legs. Check the actual hold geometry against
   available reference material rather than inventing anatomy from angle values.
2. Declare named contact surfaces and support relationships for this tableau:
   ankle/calf/knee contact, trapping leg, and any hand grip. Position the pelvises
   and thighs together before solving the distal limbs. Keep leg lengths and
   plausible knee bending; change the tableau if a contact cannot be reached.
3. Prove the still pose at gameplay size with George and both Lou rigs, then in
   the opposite facing. Track anatomical/clip leg identity independently of
   near/far render slots so mirroring does not silently change the trapped leg.
4. Only then animate entry, step-over/threading, lock, squeeze/resistance, and
   an unwind that visibly clears the trapped limbs before recovery.

### Minimum renderer extension

Add clip-scoped, phase-authored part-layer relationships across BOTH actors.
For example, one defender shin can draw behind an attacker thigh, with the
attacker boot above it. Apply overrides after ordinary per-wrestler depth
assignment so the next draw cannot erase them. Preserve normal rendering
outside participating clips.

Represent front/behind relationships explicitly and derive a stable ordering;
reject contradictory ordering rather than accepting unstable sorts. Change the
order at deliberate crossings during threading/release, not automatically
whenever projected X/Y changes. Keep local joint-cap/overlap ordering intact.
Restore defaults on natural completion, cancellation, replacement, and shutdown.

If one painted segment must be both above and below another at different
crossings, whole-part depth cannot express it. Use a narrowly scoped mask,
render split, or pose-specific art only for that case. Do not start with a
wholesale renderer rewrite or automatic full-body collision simulation.

### Contact and motion

Author the pair as one connected hold. Constrain the trapped contacts through
their declared windows while allowing purposeful sliding, pressure changes,
and release. Do not weld every joint together: the squeeze should move hips
and torso against a braced leg, while the receiver resists without losing the
trap. Maintain contact between authored keys, not just at solved endpoints.

For future toe holds, reuse the layering/contact mechanism with foot-in-hands,
lower-leg bracing, and attacker support. Add named heel/toe/ankle targets and
independent boot articulation where the approved pose needs them. Existing
combined shin/boot art needs a calibrated split or suitable replacement, not
an extra boot painted over the old one. Preserve ankle registration and joint
coverage when changing views.

Foreshortened thigh/calf/boot variants should follow the blocked pose's actual
needs. Prefer a few measured variants over a new full character sheet. Do not
stretch limbs or rotate the entire lower leg to fake a foot turning in a grip.

### Acceptance and sequence

- Start by reconciling the latest handoff and reproducing the baseline contact,
  grounded-geometry, and rope-staging findings. Record which remain open.
- Prove the locked tableau and minimal layering mechanism; then build the full
  figure-four entry/hold/release as the first entanglement example.
- Contacts and crossings must read at gameplay scale, retain joint coverage,
  preserve limb identity in both facings, and fit George and both Lous.
- Film the hold and the second after release in the real match. Inspect the
  get-up, cancellation during threading/hold, and clip replacement. No stale
  layer override, grip, pose, travel, or partner lock may remain.
- Test available space near both ropes: preserve the pair's geometry rather
  than independently crushing the landing/hold against ring bounds.
- Keep damage markers, eligibility, down duration, and roster choices intact.
  Any balance change remains Derek's decision. Keep submission foley silent.
- Run relevant existing tests, build, and joint/participation proof. Add focused
  regression coverage for cross-actor order/reset and actual contact/handoff
  behavior; export parity or a matching move event alone is insufficient.
- Deliver before/after evidence, limitations, and an updated handoff. Broaden to
  toe holds after this proof works; document the reusable contacts and art needs.
