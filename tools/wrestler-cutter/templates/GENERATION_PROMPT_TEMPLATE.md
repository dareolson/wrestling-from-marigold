# Eight-part wrestler source-plate prompt template

Use this only for visual generation. Exact rig markers are added afterward in
the alignment layer and recorded in `rig-source-manifest.json`; do not ask the
image model to invent production joint coordinates.

```text
Use case: identity-preserving production asset generation
Asset type: cohesive eight-part source plate for a 2D articulated wrestling rig

Create exactly eight isolated, non-overlapping pieces from one cohesive neutral
wrestler design:
1. head with natural neck overlap
2. complete torso with shoulders, costume, and a rounded opaque pelvis/buttock/
   groin underbody extending behind both thigh roots; leg separation must reveal
   body/costume, never transparent background
3. upper arm extending with painted anatomy past both shoulder and elbow centers
4. forearm ending at a clean wrist socket, with painted anatomy extending above the elbow center; NO HAND
5. neutral open hand with painted wrist overlap
6. thigh extending with painted anatomy past both hip and knee centers
7. shin ending at a clean ankle socket, with painted anatomy extending above the knee center; NO BOOT
8. neutral boot with painted ankle overlap

Pose and style:
- [CHARACTER IDENTITY, ATTIRE, ERA, AND LIKENESS]
- neutral upright source pose, consistent anatomical scale
- [PROJECT ART STYLE]
- hard readable outlines and value separation at game scale
- one reusable arm and leg set; no duplicated near/far limbs

Joint construction:
- real opaque anatomical overlap on BOTH sides of elbows and knees
- rounded joint silhouettes, no guillotine cuts, rectangular caps, spikes,
  tapered attachment points, or transparent feathering
- enough painted material around wrist and ankle sockets for hand/boot rotation
- hands and boots must be independent pieces, never baked into forearm or shin
- thigh roots extend above/past their internal hip centers and hinge beneath
  the complete pelvis underbody
- hidden attachment faces use continuous local fill and shading: NO finished
  exterior bevel, rim highlight, dark contour, edge shadow, or hard cutoff line
  across shoulder, elbow, hip, knee, wrist, or ankle overlap zones
- retain hard outline only on the genuinely visible outside silhouette; never
  draw black rings or toy-like mechanical hinges inside an overlap

Pelvis layering:
- default: the torso itself owns the complete opaque rounded underbody
- if garment depth needs separate pieces, also output a `pelvis_underlay`
  behind BOTH thighs and a small `pelvis_mask` above BOTH thigh roots
- never use one ambiguous patch between the two leg depth layers

Composition:
- fixed wide source plate with generous empty space between parts
- each part fully visible and away from canvas edges
- flat uniform chroma background [BACKGROUND COLOR]
- no labels, text, marker dots, guide lines, shadows, floor, watermark, extra
  limbs, alternate poses, or overlapping cells

Important: this generation establishes cohesive art only. Production joint
crosshairs and exact anchor coordinates will be added on a separate guide layer
after generation. Do not paint dots into the anatomy.
```

After generation, copy the example manifest, add the non-exported `RIG_MARKERS`
guide layer, inspect every hidden attachment band at extreme angles for bevels/
double outlines, and run:

```sh
npm run art:validate-source -- path/to/rig-source-manifest.json
```
