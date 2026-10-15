# Tested joint and move-participation repair

2026-10-15 · Codex · Isolated implementation for integration with Claude's move pass

**The shared game's runtime, character files, and authored move clips have not
been changed.** Derek said Claude is refining the same four pilot moves, so
implementation and testing ran in `/tmp/marigold-joint-repair`. This directory
preserves the proposed changes and evidence after that temporary copy disappears.

Base: `4974be8` (already includes Claude's jab contact and elbow-drop damage
timing fixes). No move timings, clip poses, damage values, or source images are
changed by this bundle.

## Changes

1. [01-animation-ownership.patch](01-animation-ownership.patch): a new clip
   releases competing clips on either participating actor, stops stale pose
   tweens, initializes omitted joint channels from the character's idle, and
   cancels surviving flight/dropkick travel on interruption. Authored moves
   suppress frozen gait/guard influences. Neutral recovery unwinds old hold
   angles. Includes six regression tests, all six failing on the original code.
2. [02-limb-attachment.patch](02-limb-attachment.patch): opt-in joint locking
   on George, original Lou, and Procreate Lou. Forearm/shin placement no longer
   uses detached post-joint translations. Calibrates George's shin knee pivot
   from its source row and original Lou's anatomical knee from the preserved
   thigh crop. Knee reporting and downstream ankle geometry use the same
   painted knee. Get-ups finish at body-relative hip height, with two tests.
3. [03-render-proof.patch](03-render-proof.patch): repeatable independent
   final-image anchor/alpha measurement and a move-participation browser proof.
   Checks individual joint coordinates, nearest ink gap, and a radius-2px
   uncovered joint core. Samples both facings and all registered clips, plus
   four real move executors and grounded/fall/get-up paths.

Joint locking is an incremental repair using existing painted anchors and
internal pivots. This does not pretend that the legacy characters have migrated
to the complete two-anchor/independent hand-and-boot production standard.
Legacy offset fields remain stored as historical tuner values; they are inactive
for locked child joints. Existing editor/tuner calibration controls should be
reviewed before using them for further character fitting.

## Verification

- [Render proof](render-proof.txt): 9,030 clip sample times across three presets,
  48 executor/role/facing cases from moving/recovering state, and 1,764 sampled
  grounded/fall/get-up poses. **Zero measured elbow/knee ink gaps and uncovered
  central pixels**; maximum independent anchor error below `4e-13` pixels.
  Detailed measurements: [render-proof.json](render-proof.json).
- [Original-code regression failures](baseline-regressions.txt): all six
  participation regressions reproduced before fixing the code.
- [Unit suite](unit-tests.txt): **658/658 pass**; [production build](build.txt) passes.
- Keyboard-driven [Lou → George hammerlock](gameplay-hammerlock.txt) and
  [George → Lou hammerlock](gameplay-hammerlock-reverse.txt): both pass.
- [Existing rig certification](rig-certification.txt): exit 0 for the reference
  rig, George and original Lou, with existing legacy findings still reported.
  This runner does not accept the Procreate preset ID as a module name; that
  preset is measured by the dedicated render proof instead.

The joint-core coverage check is deliberately stronger than closest ink overlap,
but it is still a finite sampled raster check at the tested scale. It does not
certify every possible pose, perspective scale, future variant, rope interaction,
or untested sequence of interruptions. The source images are unchanged.

## Remaining visible limitations

Grounded-to-upright wrist/posture mismatch remains. The final correction reduces
George's worst get-up handoff from the recorded 78.75px baseline to 44.23px and
original Lou's from 45.30px to 32.17px at certification scale 1. Those are still
visible pose discontinuities; they are not elbow/knee detachment. The reference
rig itself retains its recorded 84.96px get-up mismatch. Closing that requires
unifying the final grounded pose with the actual upright pose, rather than
allowing another joint offset or increasing the certification budget.

The existing certifier also reports George's neck/facing and variant findings,
missing legacy binding/attachment metadata, and the unimplemented pin-bridge
posture. This bundle does not claim to resolve them.

## Integrating alongside Claude's work

Apply by hunk once the overlapping move edits are stable. Preserve Claude's
authored clip/draft changes and reconcile executor changes in `Wrestler.js`.
The patches were checked together against the shared project with
`git apply --check` without altering source files. Recheck after Claude's edits;
do not replace whole files from the temporary implementation.

Apply ownership first, then attachment, then the proof. Run under Node 22:

```sh
npm test
npm run build
WFM_URL=http://127.0.0.1:5173 node tools/debug/move_participation_proof.mjs /tmp/joints.json
WFM_URL=http://127.0.0.1:5173 node tools/rig/certify.mjs george thesz
WFM_URL=http://127.0.0.1:5173 node tools/debug/play.mjs hammerlock
WFM_URL=http://127.0.0.1:5173 node tools/debug/play.mjs hammerlockReverse
```

Use a server with stable source during the probes. Review both the new refined
clips and their incoming/recovery poses: corrected attachment can change hand
and foot placement relative to choreography authored against the old nudges.

Visual comparison: [suplex before](before_doSuplex.png),
[suplex after](after_doSuplex.png), [hammerlock before](before_doHammerlock.png),
[hammerlock after](after_doHammerlock.png). These are sampled live-render poses
from the actual executors with prior movement, not a claim of a complete
full-speed before/after movie.
