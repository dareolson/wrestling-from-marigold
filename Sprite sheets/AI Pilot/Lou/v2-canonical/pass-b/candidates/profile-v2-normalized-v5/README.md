# profile-v2-normalized-v5

**Status: candidate — awaiting visual approval.** Mechanically certified;
not visually approved, not runtime certified, not production ready.

Supersedes `profile-v2-normalized-v4`, which is preserved unchanged as
provenance. v4 was accepted in August as a decision to end an overlong iteration
loop, not as approval of how it looked.

## What changed

**Single-visible-limb silhouette.** The view contract declares one visible arm
and one visible leg for `profile`, and the renderer follows it. The duplicate
offset limb and the second boot are gone. Both logical chains remain in the rig
with all sixteen master landmarks, so choreography can still reveal the hidden
side.

**Shoulder coverage.** The torso shoulder zones now name `shoulderMask` as their
coverage owner, so their flat un-outlined core fill is no longer painted into the
visible torso artwork — 623px of it in v4. `shoulderMask` is drawn behind the
figure alongside `pelvisUnderlay`, because a coverage layer carrying core fill
must back the parts it supports; drawn on top it paints over the collarbone and
deltoid strokes and reads worse than the defect it removes.

**Hidden chains get no coverage.** A coverage capsule for a chain the view does
not draw has nothing in front of it and stands proud of the torso as a hard pale
block. Coverage is built only for drawn chains.

## Proofs

- `profile-v2n5-neutral-assembly.png` — full resolution
- `profile-v2n5-articulation-proof.png` — mild articulation, full resolution
- `profile-v2n5-neutral-game-scales.png` — 265 / 209 / 154 px
- `profile-v2n5-articulated-game-scales.png` — 265 / 209 / 154 px
- `profile-v2n5-parts-contact-sheet.png` — every normalized cell

## Known open issue, for the approval decision

A soft pale un-outlined mass remains over the deltoid, with a mottled patch on
the pec. **This is in the approved source art, not added by the pipeline.**
`profile-torso-trunks-v3-alpha.png` contains a flat, hard-edged inpainted disc
over the shoulder; it is the largest single contributor to how the shoulder
reads. Clearing it is a source repaint, not a pipeline change, and the pipeline
has been kept out of it deliberately: three separate mechanical corrections have
already been attributed to this area, and the iteration limit says the source
composition is what to test next.

It is much less prominent at the three game scales than at source scale, which
is the reason the game-scale proofs exist.

## Bare joint cores

Un-outlined core fill that is the visible surface in neutral assembly. Zones
whose fill is routed to a coverage layer report zero here.

| zone | bare px |
| --- | --- |
| `upperArm.shoulder` | 441 |
| `thigh.hip` | 435 |
| `shin.knee` | 317 |
| `nearForearm.elbow` | 317 |
| `torso.neck` | 197 |
| `nearBoot.ankle` | 197 |
| `nearHand.wrist` | 197 |

Total 2101px. At each joint the side drawn later exposes its core, so each of
these needs either a coverage owner or an ordering that hides it. Most sit on
same-toned paint and read as continuous flesh, which is what
`continuous-fill-no-edge` is for; they are listed because the measurement should
be visible, not because all of them are defects.

## Verification

Node 22.23.1. Pass-A v3 unchanged at
`ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb`. 18 joint
zones across 71 normalization checks, all passing. Artifact identity verified
across all 19 artifacts. Built with `npm run art:build`.
