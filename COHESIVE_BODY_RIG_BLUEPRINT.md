# Cohesive Body Rig Blueprint

**Status:** Approved direction; incremental implementation blueprint  
**Prepared:** 2026-07-25  
**Scope:** George, Lou Thesz, placeholder wrestlers, and future cutout wrestlers

> **V2 source update:** this blueprint remains the runtime rationale for the
> authoritative bone graph and two-anchor placement. New artwork follows the
> stricter five-view/fixed-density/core-coverage contract in
> `CHARACTER_ART_SOURCE_STANDARD.md` and
> `tools/wrestler-cutter/templates/CANONICAL_CHARACTER_SHEET_V2.md`. Character-
> specific width/box scaling described below is compatibility architecture, not
> permission to repair a v2 source with independent resizing.

## Goal

Make each wrestler behave and read as one articulated body. A shoulder, elbow,
hip, or knee must be one shared world-space joint—not a mathematical endpoint
with two independently positioned images near it.

This is an evolution of the current six-part cutout renderer. It does not replace
Phaser, require Spine, redraw the wrestlers, or change move/gameplay behavior.

## Why the present contract is not enough

The current rig has improved `jointPivotFrac`, overlap, painted-alpha audits, and
leg IK. However, three locations can still differ:

1. the bone graph's joint;
2. the painted distal joint on the parent image;
3. the painted proximal joint on the child image.

The renderer positions images using display boxes plus scales, staggers, tilts,
and character offsets. Several are render-only: they change where painted anatomy
lands without changing the endpoint used by the next bone. The audit can prove
that opaque pixels overlap near a mathematical point while the eye still sees the
joint slide, swell, or change shape.

The replacement contract is: **bind two painted anchors on every limb to the two
bone joints it spans.** Both pieces then meet the same joint by construction.

## Architecture

```text
Pose / gait / move constraints
             ↓
      BoneGraph.solve()
  (one world transform per joint)
             ↓
    SkinBinding.placePart()
 (painted anchors mapped to joints)
             ↓
 optional seam/socket presentation
             ↓
       Phaser display parts
```

### 1. Authoritative `BoneGraph`

Create one small data structure containing named joints and bones. At minimum:

```text
root → pelvis
pelvis → torso/neck
pelvis → nearHip → nearKnee → nearAnkle
pelvis → farHip  → farKnee  → farAnkle
torso → nearShoulder → nearElbow → nearWrist
torso → farShoulder  → farElbow  → farWrist
```

Pose angles, gait IK, crouch, lean, and grounded/get-up poses write local bone
rotations or constraint targets. `BoneGraph.solve()` walks parent to child once and
produces all world-space joint positions. Rendering must not move those joints.

Near/far perspective is allowed, but it must be structural. If a far upper arm is
shortened to 85%, its elbow target and forearm chain use the same 85% bone length.
Never render a part at one length while computing its child's joint at another.

### 2. Two-anchor `SkinBinding`

Every textured limb declares a painted proximal and distal anchor in normalized,
unflipped source-texture coordinates:

```js
upperArm: {
  key: 'george_upper_arm',
  anchors: {
    proximal: { u: 0.50, v: 0.04 }, // painted shoulder center
    distal:   { u: 0.48, v: 0.94 }, // painted elbow center
  },
  widthScale: 1.0,
  overlap: { proximal: 0.04, distal: 0.05 },
}
```

Equivalent bindings are required for forearm, thigh, and shin. The torso has a
small anchor map (`neck`, near/far shoulder, near/far hip) rather than only two
anchors. Head declares its neck/collar anchor. Values refer to the processed PNG
frame and remain stable through world scale and facing flips.

`placeBoundPart(image, binding, worldProximal, worldDistal, facing, depthScale)`:

1. reads the source anchor vector;
2. rotates the image so that vector points from the world proximal joint to the
   world distal joint;
3. scales along the bone so both painted anchors land exactly on those joints;
4. applies the approved perpendicular `widthScale` around the bone axis;
5. mirrors source U for the opposite facing without changing joint math.

The image origin is the painted proximal anchor. Transparent padding and authored
overlap may extend above/below either anchor without changing bone length.

`box.h`, `jointPivotFrac`, and fixed X/Y seating offsets become compatibility
inputs during migration, not the final binding model.

### 3. Torso-owned sockets

The torso binding owns shoulder, neck, and hip socket locations. Arms and legs root
from those sockets after the torso transform is solved. This removes the current
split where the torso is drawn at one location but `SHOULDER_STAGGER`,
`HIP_STAGGER`, `armOffsetX/Y`, and `legOffsetX/Y` can place limbs independently.

Character proportions remain tunable through socket positions in the skin profile,
but sockets rotate and translate with the torso. A wrestler can have broad or narrow
shoulders without creating football-pad bulges through arm scaling.

### 4. Constraint pass

After the authored FK pose is sampled but before skin placement:

- two-bone leg IK maintains planted painted soles;
- move-specific arm IK can maintain a hand-to-wrist/neck/rope target;
- joint limits preserve elbow and knee bend direction;
- paired moves may align roots and named contact targets;
- constraint weights blend in/out instead of snapping.

Constraints modify bones or targets, never individual sprite X/Y positions.

### 5. Seam presentation

The structural binding should normally be sufficient because parent and child
painted anchors coincide. Preserve a small authored overlap band and keep the parent
cap above the child's overlap at elbows and knees.

Allow an optional `socketPatch` only for flat-color placeholder/future art: a small
skin-colored ellipse or dedicated patch sprite centered on the shared joint and
behind the parent cap. It is a presentation fallback, not a substitute for correct
anchors. George and Thesz should first pass without generated blobs.

## Character data target

Introduce `rigProfile` beside the current `textures` data:

```js
rigProfile: {
  sockets: {
    neck:         { u: 0.51, v: 0.02 },
    nearShoulder: { u: 0.31, v: 0.16 },
    farShoulder:  { u: 0.70, v: 0.14 },
    nearHip:      { u: 0.43, v: 0.94 },
    farHip:       { u: 0.58, v: 0.92 },
  },
  parts: {
    upperArm: { proximal: { u: 0.5, v: 0.04 }, distal: { u: 0.5, v: 0.94 } },
    forearm:  { proximal: { u: 0.5, v: 0.10 }, distal: { u: 0.5, v: 0.94 } },
    thigh:    { proximal: { u: 0.5, v: 0.05 }, distal: { u: 0.5, v: 0.91 } },
    shin:     { proximal: { u: 0.5, v: 0.12 }, distal: { u: 0.5, v: 0.78 }, sole: { u: 0.55, v: 0.98 } },
  },
}
```

The numbers above demonstrate the schema and are not measurements to copy. The
cutter or rig tuner must produce the real values from each character's processed
art. Near/far overrides are permitted only when distinct artwork or deliberate
perspective requires them.

## Tooling changes

Extend the cutter report and rig tuner rather than hand-entering blind values:

- overlay every source anchor on the PNG;
- drag proximal/distal anchors and torso sockets;
- export normalized `rigProfile` values;
- show the bone joint, parent painted anchor, and child painted anchor as separate
  colored points;
- show numeric mapping error and painted-alpha gap;
- compare both facings and normalized pose/clip samples in a grid;
- warn when an old render-only offset remains active on a bound part.

Automatic alpha analysis may suggest an anchor center, but the artist-approved
anatomical landmark is authoritative.

## Incremental implementation

### Phase A — graph and diagnostics, no visual change

- Add `BoneGraph` joint output behind the existing upright and grounded solvers.
- Route current endpoint calculations into named joints.
- Add overlays for bone joint vs parent/child painted anchors.
- Preserve the shipped render path and take baseline screenshots.

### Phase B — elbows and knees

- Add two-anchor bindings for forearm/shin first, using existing
  `jointPivotFrac` as migration input for the proximal anchor.
- Measure distal wrist/sole anchors.
- Bind upper-arm/forearm and thigh/shin pairs to shared endpoints.
- Remove bound-part screen-space offsets and render-only length mismatches.

### Phase C — shoulders, hips, and neck

- Measure torso sockets for George and Thesz.
- Root limbs and head from torso sockets.
- Retire shoulder/hip stagger and seating offsets where the profile replaces them.
- Keep draw-order presets, because ordering is separate from attachment.

### Phase D — constraints and future-wrestler contract

- Make planted-sole constraints use the painted sole anchor.
- Add hand/contact targets for paired moves.
- Require a complete `rigProfile` for new textured wrestlers.
- Keep the legacy path only for placeholder art until migrated.

## Acceptance criteria

- parent distal, bone joint, and child proximal mapping error is at most 0.5 world
  pixel before raster rounding;
- painted parent/child alpha gap remains at most 2.5 screen pixels in the existing
  audit set and a full angle sweep;
- mapped anchor error does not change as a joint rotates;
- no fixed screen-space part offset is used to repair a bound joint;
- planted painted sole stays within 3 screen pixels of the mat during stance;
- both facings and both wrestler slots produce mirrored attachment behavior;
- upright, walking, running, crouched, all move poses, and all get-up samples pass;
- George retains his approved proportions without shoulder swelling or floating;
- Thesz retains his approved silhouette without elbow/knee cleaves;
- existing moves, collision/reach, state timing, and damage remain unchanged;
- the old renderer can be removed part-by-part, with no one-shot rewrite.

## Implementation guardrails

- Do not add more character-specific screen X/Y corrections for a bound joint.
- Do not derive gameplay reach from display-box dimensions.
- Do not non-uniformly stretch along a limb to hide a bad anchor.
- Do not combine this migration with the animation clip/MoveSpec refactor.
- Do not delete the current alpha-aware audit; strengthen it with anchor error.
- Stop for visual review after elbows/knees before migrating torso sockets.

## Recommended first slice

Implement Phase A plus **George's near and far elbows only**. This is the smallest
slice that proves two-anchor binding eliminates drift without disturbing gait,
grounding, or move timing. Once George passes the angle sweep and Derek approves the
silhouette, apply the same code path to Thesz elbows, then knees.
