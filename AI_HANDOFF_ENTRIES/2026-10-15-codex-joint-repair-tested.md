# Codex — tested isolated joint/participation repair

## Claude's next task — explicitly requested by Derek

Integrate this repair into the shared game together with your current jab,
hammerlock, suplex and dropkick refinement pass. Derek has authorized the work;
do not stop at reviewing the proposal or ask him to authorize integration again.

1. Stabilize your current move edits and inspect the working diff. Preserve
   your authored clips, drafts, timing improvements and unrelated work.
2. Read the bundle README and inspect all three patches. They target base
   `4974be8`; use `git apply --check` against the current tree first. A failed
   check means reconcile the relevant hunks with your newer changes, not reset
   the tree, discard your refinements, or replace whole source files.
3. Integrate `01-animation-ownership.patch`, then `02-limb-attachment.patch`,
   then `03-render-proof.patch`. Include their new regression tests. Pay
   particular attention to clip replacement/paired cleanup, stopping travel
   tweens on cancellation, neutral recovery and gait suppression in Wrestler.js.
4. Review the refined four moves with the corrected geometry. Re-pose contact
   keys only where necessary: earlier hand/foot placement may have depended on
   the old offsets. Keep both characters' approved proportions and existing art.
5. With source edits settled, run the Node 22 commands below against your
   actual dev-server port. Do not run the proofs against a stale isolated copy
   and cite those results as validation of the merged game.
6. Review normal-speed playback in both role orders/facings, including entry
   from movement, recovery, interruption and receiving another move. Save the
   merged proof results and update AI_HANDOFF.md with what actually passed,
   what changed during reconciliation and any remaining visible problem.

```sh
nvm use
npm test
npm run build
WFM_URL=http://127.0.0.1:5173 node tools/debug/move_participation_proof.mjs /tmp/merged-joints.json
WFM_URL=http://127.0.0.1:5173 node tools/rig/certify.mjs george thesz
WFM_URL=http://127.0.0.1:5173 node tools/debug/play.mjs hammerlock
WFM_URL=http://127.0.0.1:5173 node tools/debug/play.mjs hammerlockReverse
```

Acceptance: no competing clip owners, residual cancelled travel, measured
elbow/knee anchor separation, ink gap or uncovered joint core in the merged
proof. Keep all existing tests passing and do not loosen thresholds to hide a
failure. Also inspect the silhouettes visually: correct coordinates alone do
not prove a convincing bend. The existing certifier reports legacy findings;
an exit code of zero is not a claim that every character is fully certified.

The remaining grounded-to-upright wrist/posture pop is a separate follow-up.
Preserve the reduction achieved here and report the remaining jump explicitly;
do not add detached limb nudges or inflate handoff budgets to conceal it.

## Implementation and evidence

Derek authorized implementation, then clarified that Claude is concurrently
refining the first four pilot moves. To prevent source overwrite and shared
Vite reloads, all implementation ran in `/tmp/marigold-joint-repair`; the shared
runtime, character configs, authored moves, and tests remain untouched.

The durable handoff is [research/animation/joint-repair/README.md](../research/animation/joint-repair/README.md).
It contains three integration patches, failing-before regression evidence,
passing-after tests/proofs, visual comparisons, limitations and commands.

Confirmed/fixed mechanisms in the isolated implementation:

- Participating receivers can retain their own active clips and old pose tweens.
- Sparse clips and neutral recovery can retain a previous hold's joint angles.
- Frozen walking phase/blend can override move legs and add unrelated arm swing.
- Interrupted flights/dropkicks can leave a root-travel tween alive.
- Legacy calf/forearm nudges can displace the child from its painted parent joint.
- Original Lou's thigh lacks its anatomical distal knee anchor; George's shin
  knee-row feature is off the nominal source center.

The final proof measures no elbow/knee ink gaps or uncovered central pixels in
9,030 clip sample times, 48 real executor cases and 1,764 grounded/fall/get-up
pose samples across George and both Lou presets. Independent anchor error is
below 4e-13 pixels. Both keyboard-driven hammerlock role orders pass. Existing
rig certification exits 0 with its legacy findings retained.
The full unit suite passes 658/658 and the production build passes on Node 22.

**Do not call the entire body-animation problem solved:** get-up wrist/posture
pops remain, although their recorded maximum decreases from 78.75→44.23px on
George and 45.30→32.17px on original Lou. See the bundle for further limitations.

Integration must preserve Claude's clip/draft refinements and reconcile
Wrestler.js changes by hunk. The patches pass `git apply --check` against the
shared source at handoff time. No whole-file replacement, art regeneration,
damage retiming, or change to authored move data is part of this repair.
