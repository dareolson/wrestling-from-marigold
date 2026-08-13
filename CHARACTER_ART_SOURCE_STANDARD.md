# Character Art Source Standard

**Status:** Required preparation contract for new wrestlers and future George/Lou rebuilds  
**Applies to:** generated source plates, hand-drawn masters, replacement parts, and move-specific variants  
**Compatibility:** the shipped six-part George/Lou rigs remain supported as legacy assets until they are rebuilt

## Decision

Future wrestlers use a marker-authored, two-anchor skin contract. A painted limb
is not accepted because it merely looks connected in one neutral pose. Every
segment must declare the anatomical points it spans, preserve opaque overlap on
both sides of a bending joint, and pass rotation and replacement-family checks
before animation work begins.

The future modular body has eight authored asset types:

```text
head
torso
upperArm → forearm → hand
thigh    → shin    → boot
```

The engine may still mirror/reuse those assets for near/far sides. Hands and
boots become their own socketed parts so `open`, `fist`, `grip`, `flexed`, and
`toePoint` variants do not require regenerating an entire forearm or shin.

The runtime path now exists behind the existing six-part renderer. Parts that
declare `binding.proximal` and `binding.distal` use exact two-anchor placement;
parts without it remain on the legacy renderer. This does not force an
immediate George/Lou redraw.

## Audit: why the current process will not scale

The repository currently contains three competing contracts:

1. `DRAWING_GUIDE.md` describes pivots at texture edges and flat child caps.
2. `tools/wrestler-cutter/process-parts.mjs` infers elbow/knee rows from painted
   alpha width and character-specific opt-ins.
3. `COHESIVE_BODY_RIG_BLUEPRINT.md` correctly calls for two painted anchors
   bound to one authoritative bone graph.

The Lou golden-master experiment also contains explicit joint coordinates and
overlap measurements, but that rigor is not required by the general generator.
As a result, a new source can pass canvas/alpha validation while still changing
the anatomical elbow, knee, wrist, or ankle location. Whole-forearm and
whole-shin variants multiply that risk.

Automatic alpha analysis may suggest a joint, but it cannot know anatomy. A
bulky knee pad, fist, boot, outline, or generated paint flap can move the
inferred centroid. The artist-approved landmark must therefore be explicit.

## Source plate and marker layer

Generate or draw the cohesive character first. Then place each part in its own
fixed cell and add a separate guide layer named `RIG_MARKERS`. The guide layer
contains visible dots/crosshairs, but it is never composited into production
PNG art.

Marker meanings:

| Marker | Meaning | Typical uses |
|---|---|---|
| `socket` | Root attachment owned by torso/head | neck, shoulder, hip |
| `proximal` | Joint nearest the torso | shoulder, elbow, hip, knee, wrist, ankle |
| `distal` | Joint away from the torso | elbow, wrist, knee, ankle |
| `contact` | Gameplay/constraint target | palm grip, knuckles, sole |

The exact marker coordinates are recorded in `rig-source-manifest.json` in
**export-pixel coordinates**, even when the working art is 4× larger. The
manifest, not raster color detection, is authoritative. This avoids generated
color drift and prevents a removed marker from leaving a hole in joint art.

If the source tool cannot preserve layers, export two images:

- `source-art.png` — clean artwork, no marker pixels;
- `source-guides.png` — same canvas, marker overlay only.

Never flatten markers into the only copy of the artwork.

## Elbow and knee construction

Yes: both the upper and lower segment should extend beyond the anatomical joint.
The joint point sits **inside opaque artwork**, not on a trimmed texture edge.

```text
parent segment ========( joint )==== overlap tail
                         ●
child overlap head ====( joint )================ child segment
```

Rules:

- Upper arm extends past the elbow; forearm extends above the elbow.
- Thigh extends past the knee; shin extends above the knee.
- Both segments name the same world joint through their own painted anchor.
- Minimum overlap is 12 px at final export scale on each side of the joint;
  use 48 px when drawing at 4×.
- Joint overlap is fully painted anatomy, not transparent feathering.
- The visible outer silhouette around the joint is rounded. Avoid flat
  guillotine cuts, rectangles, spikes, and narrow tapered points.
- Draw order chooses which cap presents the seam, but draw order never defines
  the joint location.
- The parent distal anchor and child proximal anchor are independently mapped
  to the same solved bone joint. Rotation must not change their mapping error.

The dot/crosshair is therefore an authoring aid for the true hinge center. It
does not need to be concealed by the other part because it is excluded from the
production export.

The anchor editor also draws translucent overlap bands from each joint's
`beforePx`/`afterPx` declaration and the rounded pelvis coverage region. Use
those guides to inspect the clean art; the bands themselves remain guide-only.

## Hidden attachment surfaces: no bevels

An overlap zone is not an exterior end-cap. Do not finish it with a bevel, rim
highlight, dark contour, edge shadow, or hard cutoff line across the hidden
attachment face. Those marks become black rings, double outlines, or toy-like
hinges as soon as the joint rotates.

This applies to the proximal front shoulder beneath the torso/deltoid, both
sides of the elbow, thigh hip and knee bands, shin knee and ankle bands, hand
wrist, boot ankle, and pelvis/thigh socket boundaries. Continue the part's local
fill and internal shading through the hidden band. Keep the strong exterior
outline only on the genuinely visible outside silhouette. Automatic dark-line
detection is advisory; human guide-overlay review at extreme angles is required.

## Pelvis, trunks, and thigh roots

The torso/pelvis source owns a complete rounded opaque buttock/groin/trunks
underbody behind both thighs. `nearHip` and `farHip` are internal anatomical
sockets inside that body, never bottom texture edges. Each thigh's proximal hip
anchor sits inside painted overlap extending above and past the socket so it
hinges beneath the pelvis.

The default is one complete torso texture. When the garment silhouette requires
depth separation, use two unambiguous optional layers:

- `pelvisUnderlay`: complete rounded underbody behind both thighs;
- `pelvisMask`: small front waistband/groin edge above both thigh roots.

Legacy `pelvisOverlay` remains supported only for existing art. It sits between
far and near legs and must not be used as the future underbody contract.
`pelvisCoverage` in the source manifest declares the owner, rounded bounds, hip
disks, and sweep radius. Pixel validation rotates thigh-root alpha through
combat/get-up angles in both facings and rejects interior holes in the union.

## Wrist, hand, ankle, and boot sockets

Forearms end at a declared `wrist` anchor with neutral overlap beyond it. Every
hand variant uses the same canvas and the same `wrist` coordinate. Hands also
declare a semantic contact point:

- `open`: palm center;
- `fist`: lead knuckle center;
- `grip`: grip cavity/closed-finger center.

Shins end at a declared `ankle` anchor. Every boot variant uses the same canvas
and `ankle` coordinate and declares a `sole` contact point. A bent boot changes
paint around the ankle; it does not move the ankle socket.

When a move needs a truly different limb silhouette, create a deliberate
whole-part family with the same canvas and anchors. Do not silently override
geometry. A geometry-changing replacement is a new rig profile and must pass
the full joint audit.

## Variant-family lock

Each replaceable part has a `geometryLock` identifier. All members of a family
must match exactly:

- canvas width and height;
- every structural attachment-anchor coordinate (neck, wrist, ankle, or the
  proximal/distal bone anchors for a whole-limb replacement);
- overlap-zone declarations;
- source orientation and facing convention;
- transparent padding policy.

Semantic contact anchors are variant-specific: an open palm, fist knuckle, grip
cavity, flexed sole, and pointed toe do not contact at the same pixel. They must
remain inside the common canvas but may move without changing the attachment
geometry. The validator rejects a replacement that moves a structural anchor by
even one source pixel unless it explicitly declares a new geometry lock and goes
through full rig calibration.

## Local elbow and knee articulation

Production poses author shoulder/hip world orientation plus facing-independent
local flex:

```text
forearm world angle = upper-arm world angle + facing × elbow flex
shin world angle    = thigh world angle     + facing × knee flex
```

Use `lElbow`/`rElbow` and `lKnee`/`rKnee`. Positive flex bends toward the
authored forward direction and mirrors without inversion. Runtime anatomical
limits prevent hyperextension and impossible overfolding. Existing
`lForearm`/`rForearm` and `lShin`/`rShin` remain absolute-angle compatibility
adapters for old clips and tuner exports. A joint has exactly one live owner:
authoring local flex removes its legacy absolute channel and authoring a legacy
channel removes local flex. If malformed content supplies both, local flex wins.
Switches seed the new owner from the last upright render so the first frame is
continuous; non-upright renders invalidate that seed rather than reuse stale
standing geometry.

Every new rig must show the mannequin articulation matrix—extended, guarded at
about 90 degrees, deep flex, and overhead—in both facings. Changing local elbow
flex must keep shoulder/elbow fixed and move the wrist; changing shoulder angle
must carry the whole chain. Apply the analogous test at hip/knee/ankle.

## Generator preparation workflow

1. Generate one cohesive neutral wrestler for identity, costume, and anatomy.
2. Produce the eight clean parts with real painted material behind every joint.
3. Add `RIG_MARKERS` manually or in the alignment tool; do not rely on the image
   model to place exact coordinates.
4. Record canvas, anchors, overlap zones, and geometry locks in a source
   manifest copied from
   `tools/wrestler-cutter/templates/rig-source-manifest.example.json`.
5. Draw replacements by duplicating the approved base part canvas and marker
   layer. Never start a replacement from a newly cropped blank canvas.
6. Open `tools/wrestler-cutter/anchor-editor.html` through Vite (linked from
   the cutter), import the manifest and each clean PNG, then place/refine the
   named anchors. Export the clean PNG and guide PNG separately.
7. Run `npm run art:validate-source -- path/to/rig-source-manifest.json`. Once
   PNGs exist, also add `--assets-dir path/to/pngs` to verify canvas dimensions
   and actual opaque joint coverage.
8. Cut/export production art with the marker layer disabled.
9. Compile pixel anchors with `sourceManifestToTextures()` from
   `src/rig/sourceManifestAdapter.js`; do not hand-copy normalized values.
10. Run both the source-family validator and runtime `rig:validate` gate.
11. Before approval, test elbow/knee rotation sweeps, both facings, extreme move
    poses, hand targets, and painted-sole grounding.

## Acceptance gate for a new wrestler

- All eight base parts and required anchors exist.
- Elbow and knee anchors are internal to opaque overlap zones.
- Hip sockets are internal to a complete rounded opaque pelvis underbody, and
  pelvis/thigh union sweeps reveal no interior hole in either facing.
- Parent/child overlap is at least 12 final pixels per side.
- Hidden attachment surfaces use continuous fill/shading with no bevel, rim,
  dark cross-contour, edge shadow, or hard cutoff; extreme-angle human review
  is recorded.
- Hand and boot replacement families have exact canvas/anchor parity.
- Torso owns named neck, near/far shoulder, and near/far hip sockets.
- No screen-space offset is proposed as a joint repair.
- No generated replacement is auto-cropped independently of its family.
- Marker guides and clean artwork are both retained as source assets.
- Source manifest validation, runtime rig validation, angle sweeps, both
  facings, and representative move poses pass.
- The extended / guarded-90 / deep-flex / overhead articulation matrix passes
  with local elbow/knee channels and anatomical limits.
- Human review is performed at actual in-game scale, not only on the source
  sheet.

## George and Lou

Do not keep extending their current six-part art as the final combat system.
They remain useful compatibility fixtures while the eight-part contract and
two-anchor placement are implemented. Their eventual rebuilds should start from
new cohesive masters prepared under this standard, with hands and boots split at
the source. Preserve the current approved likenesses as visual references, not
as geometry templates.

Current-art diagnostic: George's torso and legacy `pelvisOverlay` are opaque in
small disks around both configured hip sockets, but the patch is drawn at the
ambiguous between-legs depth. It is above the far thigh and below the near
thigh, so it cannot guarantee a complete behind-both bottom or a clean
above-both garment edge when the legs separate. Lou has no explicit hip sockets
or declared pelvis coverage region, so his mostly acceptable standing silhouette
cannot be mechanically verified through get-up poses. Neither asset is redrawn
or retuned in this architecture pass.

## Implemented compatibility architecture

- `src/rig/twoAnchorBinding.js` maps authored segment endpoints onto one
  authoritative world bone with zero endpoint drift through rotation/facing.
- `Skeleton.js` opts into that path per part and exposes independent near/far
  hand and boot slots. Legacy baked forearm-hand and shin-boot assets remain.
- Hand/boot variants geometry-lock canvas and wrist/ankle binding while
  permitting variant-specific `contact`/`sole` anchors.
- Both legacy `tweenPose` and seekable clips preserve authored
  `lForearm`/`rForearm`/`lShin`/`rShin` channels. The headless
  `tools/debug/articulated_channel_probe.mjs` gate proves they change the
  actual rendered Image rotations, preventing an animation-path loss from
  being misdiagnosed as bad joint art.
- Variant resolution uses side-specific families first, then shared families:
  `nearForearm.fist` overrides `forearm.fist`, while a unified Lou-style
  `forearm.fist` reaches both sides. The same convention applies to limbs,
  hands, and boots.
- Future art may opt into distinct `pelvisUnderlay` and `pelvisMask` render
  layers. Existing `pelvisOverlay` depth and George/Lou rendering are preserved.
- `src/rig/articulation.js` owns local flex limits and the four-pose mannequin
  articulation matrix. The existing move library still needs deliberate elbow/
  knee key authoring; this architecture does not pretend transport alone fixes
  rigid-looking choreography.
- The example source manifest is the synthetic eight-part mannequin fixture
  used by geometry, overlap, facing, contact, and grounding tests. It is not
  final wrestler art.
