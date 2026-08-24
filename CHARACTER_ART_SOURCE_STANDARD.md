# Character Art Source Standard

**Status:** Required v2 preparation contract for new wrestlers and future George/Lou rebuilds

**Applies to:** generated source plates, hand-drawn masters, replacement parts, and move-specific variants

**Compatibility:** the shipped six-part George/Lou rigs remain supported as legacy assets until they are rebuilt

## Decision

Future wrestlers use a marker-authored, multi-view, two-anchor skin contract. A
painted limb is not accepted because it merely looks connected in one neutral
pose. Every segment must declare the anatomical points it spans, contain a
rotation-invariant opaque core at each structural joint, preserve painted
overlap on both sides of the hinge, and pass rotation, orientation,
replacement-family, and broadcast-presentation checks before animation work
begins.

The future modular body has eight semantic asset types plus three registered
coverage layers (required on the canonical v2 sheet even when a layer is
deliberately transparent):

```text
head
torso
upperArm → forearm → hand
thigh    → shin    → boot

pelvisUnderlay / pelvisMask / shoulderMask
```

The engine may still mirror/reuse those assets for near/far sides. Hands and
boots become their own socketed parts so `open`, `fist`, `grip`, `flexed`, and
`toePoint` variants do not require regenerating an entire forearm or shin.

The runtime articulation path exists behind the existing six-part renderer. Parts that
declare `binding.proximal` and `binding.distal` use exact two-anchor placement;
parts without it remain on the legacy renderer. This does not force an
immediate George/Lou redraw.

The canonical v2 package is a single locked 4096 x 4096 RGBA source sheet with
five registered identity masters (`front`, `front3q`, `profile`, `back3q`, and
`back`) and one fixed production bank. Exact panel/cell coordinates, final
export sizes, source density, and prompt stages live in
`tools/wrestler-cutter/templates/CANONICAL_CHARACTER_SHEET_V2.md`. The model is
given that template; it is never asked to invent the layout.

`profile` is the first planned runtime target, and remains explicitly pending
until its v2 compiler/render path is certified. The other views are authored
immediately so front impacts, face-up work, rear holds, prone work, falls, and
rolls do not force a later identity redraw. Until a `bodyView` animation channel
and view-transition solve exist, those views are truthfully marked
runtime-pending rather than silently falling back to profile art.

## Three independent guarantees

A source is accepted only when all three guarantees hold:

1. **Structural coincidence:** parent and child anchors map to the same solved
   world joint in every legal pose and facing.
2. **Opaque presentation coverage:** both adjoining textures contain a fully
   opaque disk centered on that anchor, and their union remains closed through
   the complete angle sweep.
3. **Correct body view/orientation:** the selected skin faces the intended
   camera direction and no texture is reflected vertically or borrowed from an
   undeclared view.

Anchor coincidence alone cannot prove the elbow is painted, the pelvis has a
bottom, or a prone head is right-side up. Opaque coverage alone cannot prove the
art is the correct side of the body. Certification must name and grade these as
separate properties.

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

## Source sheet and marker layer

Generate or draw the cohesive five-view character first. After the identity,
proportions, attire, and source density are approved, derive each part from
those masters into the locked production cells at 1:1. Do not generate 95
unrelated cutouts and hope they assemble into the same person.

The canonical clean and guide sheets are both exactly 4096 x 4096. The clean
sheet contains transparent production pixels only. The guide sheet uses the
same registration and adds the panel/cell template plus marker graphics. The
editable PSD/Krita/equivalent source owns the named `RIG_MARKERS` layer; PNG
cannot preserve a layer name, so `*-guides.png` is its flattened guide export.
It is never composited into production PNG art.

Marker meanings:

| Marker | Meaning | Typical uses |
|---|---|---|
| `socket` | Exact structural center owned by torso/head | neck, shoulder, hip |
| `proximal` | Joint nearest the torso | shoulder, elbow, hip, knee, wrist, ankle |
| `distal` | Joint away from the torso | elbow, wrist, knee, ankle |
| `axis` | Second point defining orientation when one anchor is insufficient | head, hand, boot |
| `coverage` | Radius of the fully opaque joint core | every structural connection |
| `contact` | Gameplay/constraint frame | palm, knuckles, grip cavity, heel, toe, sole |

The exact marker coordinates are recorded in `rig-source-manifest.json` in
**export-pixel coordinates**. V2 uses a fixed two-pixels-per-rig-unit Thesz
source density and 1:1 production cells; a different-scale working sketch is
reference material, not the production sheet. The manifest, not raster color
detection, is authoritative. This avoids generated color drift and prevents a
removed marker from leaving a hole in joint art.

If the source tool cannot preserve layers, export two images:

- `source-art.png` — clean artwork, no marker pixels;
- `source-guides.png` — same canvas, marker overlay only.

Never flatten markers into the only copy of the artwork.

### Center + axis + core, not one dot

A lone dot identifies position but says nothing about orientation or painted
coverage. Every single-anchor attachment therefore records:

- the center crosshair;
- a distinct axis point (or a second structural anchor that supplies the same
  frame);
- an `opaqueCoreRadiusPx` coverage ring.

Every pixel inside the core disk must be opaque on both adjoining pieces. The
disk is an interior guarantee, not a visible ball joint. Heads, hands, and boots
also retain their axis point across replacements so a correct socket cannot be
paired with an upside-down or sideways variant.

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
  a v2 production cell is already at final scale and is never independently
  resized.
- Both pieces contain a fully opaque core disk centered on the joint. Use a
  10 px source radius at elbow/knee unless the character manifest declares a
  stricter radius.
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

The anchor editor also draws the center, axis, opaque-core ring, translucent
overlap bands from each joint's `beforePx`/`afterPx` declaration, and the
rounded pelvis/shoulder coverage regions. Use those guides to inspect the clean
art; the guides themselves remain non-production.

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
detection is a v1 advisory. For v2 it blocks production acceptance unless the
source-hash-linked extreme-angle review records that the detected dark pixels
are a true occlusion edge rather than a hidden attachment bevel.

## Shoulder and neck coverage

Shoulders and neck use the same coverage logic as hips. The torso owns complete
opaque neck and deltoid/root disks behind the head and both upper arms. A
torso-sized `shoulderMask` may present the front collar/deltoid edge above the
arm roots, but it cannot supply missing anatomy underneath them.

The torso manifest declares neck/shoulder core radii and upper-arm sweep
regions. The head and upper arm independently cover their own matching cores.
Pixel validation sweeps the arm through overhead, guard, hammerlock, and deep
cross-body angles in both facings. A front shoulder seam is a hidden connection
surface and carries no bevel or finished cap.

## Pelvis, trunks, and thigh roots

The torso/pelvis source owns a complete rounded opaque buttock/groin/trunks
underbody behind both thighs. `nearHip` and `farHip` are internal anatomical
sockets inside that body, never bottom texture edges. Each thigh's proximal hip
anchor sits inside painted overlap extending above and past the socket so it
hinges beneath the pelvis.

V1 allows one complete torso texture. The canonical Thesz v2 template chooses
one unambiguous split ownership mode:

- `pelvisUnderlay`: complete rounded underbody behind both thighs;
- `pelvisMask`: small front waistband/groin edge above both thigh roots.

In split mode, torso paint meets the registered trunk boundary but does not
duplicate a second across-both-thigh underbody at a conflicting depth. The
manifest owner decides the coverage; a reserved layer cell may be transparent,
but two layers never both claim the same full pelvis.

Legacy `pelvisOverlay` remains supported only for existing art. It sits between
far and near legs and must not be used as the future underbody contract.
`pelvisCoverage` in the source manifest declares the owner, rounded bounds, hip
disks, and sweep radius. Pixel validation rotates thigh-root alpha through
combat/get-up angles in both facings and rejects interior holes in the union.

## Wrist, hand, ankle, and boot sockets

Forearms end at a declared `wrist` anchor with neutral overlap beyond it. Every
hand variant uses the same canvas and the same `wrist` coordinate. Hands retain
the same `wristAxis` point and opaque wrist core. They also declare a semantic
contact frame (point plus outward normal), not merely a point:

- `open`: palm center;
- `fist`: lead knuckle center;
- `grip`: grip cavity/closed-finger center.

Shins end at a declared `ankle` anchor. Every boot variant uses the same canvas
and the same `ankle`/`ankleAxis` coordinates and declares heel, toe, and sole
contact data. A bent boot changes paint and semantic contact around the ankle;
it does not move or rotate the structural ankle frame.

When a move needs a truly different limb silhouette, create a deliberate
whole-part family with the same canvas and anchors. Do not silently override
geometry. A geometry-changing replacement is a new rig profile and must pass
the full joint audit.

## Variant-family lock

Each replaceable part retains a human-readable `geometryLock`, but v2 does not
trust that string. The validator computes a structural geometry signature. All
members of a family must match exactly:

- canvas width and height;
- every structural attachment-anchor coordinate (neck, wrist, ankle, or the
  proximal/distal bone anchors for a whole-limb replacement);
- overlap-zone declarations;
- opaque-core radii and axis/orientation points;
- source orientation and facing convention;
- transparent padding policy;
- cell-relative export rectangle (the global view/variant cells differ) and
  asset-pixels-per-rig-unit.

Semantic contact anchors are variant-specific: an open palm, fist knuckle, grip
cavity, flexed sole, and pointed toe do not contact at the same pixel. They must
remain inside the common canvas but may move without changing the attachment
geometry. The validator rejects a replacement that moves a structural anchor by
even one source pixel. Declaring a different friendly lock name does not waive
the failure: geometry-changing art is a new rig profile and must go through full
calibration. Pixel coverage and hidden-band inspection run on every replacement,
not only the base part.

## View skins and side identity

V2 authors five view skins now: `front`, `front3q`, `profile`, `back3q`, and
`back`. They share skeleton topology, character measurements, source density,
and bone lengths. Torso/head/pelvis paint, projected socket positions,
camera-near side, and draw order may differ by view and are declared rather than
inferred.

Body identity is anatomical `left`/`right`. `near`/`far` is a render result of
view, facing, and depth. This prevents one character's split near/far files and
another character's unified file from creating unreachable replacement slots.
The manifest maps every anatomical slot into the renderer explicitly. Shared
paint is allowed through an explicit reuse declaration; a missing view is never
filled by silent fallback.

The base 19-cell/view sheet deliberately stores one bilateral upper-arm,
forearm, thigh, and shin painting per view. Its manifest names the unobstructed
source side and explicitly mirrors/reuses that paint for the opposite logical
side. A wrestler that truly needs asymmetric left/right segment art uses a
versioned extension sheet; the base sheet does not pretend one cell preserves
two different projected limb paintings.

A future `bodyView` clip channel will select/transition these skins. `profile`
is the first planned production runtime target, but remains
`pending-v2-profile-renderer` until its own compiler/global-density/grounding
path is certified. Generating the remaining views is still required for the
first Thesz sheet because it freezes the identity and joint architecture before
move art starts.

## Fixed source density and export sizes

V2 adopts the certified reference rig's canvas envelopes as its export sizes;
`shoulderMask` is a new torso-sized reserved layer rather than a reference-rig
asset:

```text
head                                      200 x 200
torso / pelvisUnderlay / pelvisMask /
shoulderMask                              190 x 260
upperArm                                  130 x 180
forearm                                   110 x 180
hand                                       96 x 96
thigh                                     150 x 180
shin                                      130 x 210
boot                                      120 x 120
```

The Thesz replacement template uses `assetPixelsPerRigUnit: 2` and a 530 px
crown-to-sole master for the intended 265 px near-ring body. Every limb anchor
span equals its declared bone length times that density. The final production
sheet uses fixed 1:1 cells: no alpha autocrop, independent resize, non-uniform
stretch, rotation-to-vertical, or repadding is allowed.

This forbids corrective art-fit values on a v2 skin (`box`, `displayScale`,
`heightScale`, `headScale`, `pivotOffsetFrac`, fixed joint offsets, and similar
legacy repairs). Ring-depth perspective and wrestler-scale transforms still
apply to the assembled body. A taller/shorter wrestler changes measured
skeleton lengths; it does not secretly scale one texture.

The v2 anchors/density are not the reference rig's geometry. In particular, the
new planted boot uses a 44 px vertical ankle-to-sole drop, while the current
pose-driven runtime assumes the reference boot's 0.9-canvas drop. A v2
global-density compiler plus semantic-sole grounding for gait and pose states is
a runtime prerequisite; source-sheet acceptance cannot waive it.

## Broadcast-safe hand-drawn linework

Readable ink is a hierarchy, not one thick outline. At v2's two-source-pixels
per near-screen-pixel density:

- exterior silhouettes usually occupy 5-6.5 source px, taper with pressure, and
  vary roughly 20-25% locally; sustained runs stay at least 4.4 px, while short
  tapered endpoints may become finer;
- major anatomy/costume divisions use 3.5-4.5 source px;
- secondary face/fabric/boot details use 2.5-3.2 source px and may disappear
  cleanly at far depth;
- thicker accents are reserved for real occlusion, contact, deep shadow, and
  weight-bearing edges.

Uniform marker-like outlines, identical-width joint rings, random one-pixel
jitter, halftones, checker/dither texture, dense parallel folds, and regular
hatching are rejected. Avoid repeated motifs whose projected screen period is
1-8 px: the broadcast pass adds a black 1 px row every 2 screen rows plus
grayscale, grain, flicker, vignette, and barrel effects. Use four or five
structural luminance families and keep gameplay-critical adjacent regions at
least 24 luma apart before filters; hue-only separation does not survive
grayscale.

Source Gate A simulates the full wrestler at 265, 209, and 154 px heights for
all five views and variants. Runtime Gate B repeats that proof in the real Arena
for profile after the v2 compiler/global-density/semantic-sole path exists.
Runtime Gate C covers all views only after `bodyView`, projected-socket
interpolation, depth-order transport, and the optional shoulder-mask slot exist.
Across the applicable gate, the silhouette remains connected; eyes, mouth,
hands, boot/sole, trunks, and essential costume marks remain distinguishable;
internal strokes do not merge into blobs or beat against the scanline grid.
Human review also confirms that taper/pressure still reads as an artist's hand,
not a uniform AI/vector marker.

`art:validate-source -- --sheet` is Gate A's mechanical precheck. It enforces
sheet geometry, source density, view/slot completeness, structural frames,
family locks, painted overlap/core coverage, and—once review is approved—the
exact clean-sheet hash. Stroke taper, value-family count, luma separation,
moire, and critical-feature survival remain explicit source-hash-linked human
review items until a real broadcast-analysis harness implements those
measurements. A pending review is reported as pending; a mechanically valid
manifest is never mislabeled as completed Gate A.

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

1. Start from the locked template in
   `tools/wrestler-cutter/templates/CANONICAL_CHARACTER_SHEET_V2.md`.
2. Generate the five cohesive neutral masters together. Approve identity,
   costume, anatomy, source facing, 530 px height, and line hierarchy before
   producing parts.
3. Place registered anatomical landmarks and center/axis/core guides manually;
   do not rely on the image model to invent exact coordinates.
4. Derive the fixed production cells from those approved masters at 1:1.
   Inpaint only hidden overlap material; never independently regenerate or
   auto-resize a base limb.
5. Create visible expression/hand/boot replacements in a separate
   identity-locked edit pass by duplicating the approved family cell and guide
   geometry. Visible paint may change; structural geometry may not. Never start
   a replacement from a newly cropped blank canvas.
6. Record views, skeleton measurements, cells, structural/semantic frames,
   overlap/core geometry, and review records in a manifest copied from
   `tools/wrestler-cutter/templates/rig-source-manifest.v2.example.json`.
7. Run `npm run art:validate-source -- path/to/manifest.json --sheet
   path/to/clean-sheet.png` to verify the exact sheet/cells and pixel coverage.
8. Run `npm run art:export-v2 -- --manifest path/to/manifest.json --sheet
   path/to/clean-sheet.png --output-dir path/to/exports`. It writes all 95
   fixed 1:1 PNGs and a checksum/index file; V2 never uses the legacy cutter's
   alpha-autocrop/resize path.
9. Pass source Gate A for all views/cells, overlap/core coverage, variants,
   fixed sizes, and offline downscale/filter presentation.
10. Implement/verify the v2 compiler, uniform-density profile renderer, view to
    near/far mapping, and semantic-sole pose grounding without legacy fallback;
    then pass runtime Gate B for profile.
11. Implement `bodyView`, projected-socket interpolation, view depth order, and
    the optional shoulder-mask slot; then pass runtime Gate C for all view
    transitions. Shipped Thesz remains until all applicable gates pass.

## Acceptance gate for a new wrestler

- The exact 4096 x 4096 clean/guide sheets, five registered masters, 95 required
  cells, fixed export rectangles, and 530 px master heights exist.
- All semantic base parts, coverage layers, required replacements, structural
  anchors, orientation frames, and semantic contact frames exist in every view.
- Every adjoining neck/shoulder/elbow/wrist/hip/knee/ankle pair contains its
  full declared opaque core; one missing core pixel is a failure.
- Hip sockets are internal to a complete rounded opaque pelvis underbody, and
  pelvis/thigh union sweeps reveal no interior hole in any view/facing.
- Neck/shoulder owners cover their full head/arm sweeps without an interior
  hole. The reserved shoulder-mask cell may remain transparent until Gate C.
- Parent/child overlap is at least 12 final pixels per side.
- Hidden attachment surfaces use continuous fill/shading with no bevel, rim,
  dark cross-contour, edge shadow, or hard cutoff; extreme-angle human review
  is recorded.
- Head, hand, boot, and whole-part replacement families have matching computed
  structural signatures and pass the same pixel/core audit as their bases.
- Torso owns named neck, anatomical left/right shoulder, and anatomical
  left/right hip sockets; view mapping resolves them to runtime near/far slots.
- Anatomical left/right slot identity, view-to-near/far mapping, and draw order
  are explicit; missing art cannot silently fall back to another view.
- No independent part scale, box repair, screen-space offset, or legacy
  placement fallback is proposed as a joint/art repair.
- No generated replacement is auto-cropped independently of its family.
- Marker guides and clean artwork are both retained as source assets.
- Source Gate A passes all five views/variants. Runtime Gate B passes profile,
  both facings, representative moves/get-up, articulation and grounding after
  the v2 runtime path exists. Gate C passes every body-view transition later.
- The extended / guarded-90 / deep-flex / overhead articulation matrix passes
  with local elbow/knee channels and anatomical limits.
- At runtime Gate B/C, `npm run rig:certify -- <character>` reports zero
  findings AND zero unmeasurable chains. An unmeasurable chain is not a pass.
- Gate A simulated and Gate B/C real-Arena filter-free/scanline/full-broadcast
  captures pass at near, middle, and far scale without moire, silhouette holes,
  merged critical features, or uniform AI/marker-looking ink. Human review is
  performed at actual game scale, not only on the source sheet.

## Articulation certification and the reference rig

`src/rig/referenceRig.js` is a standards-compliant character defined in code
rather than in artwork: a source manifest plus a procedural painter that fills
every joint zone from the manifest's own anchors, so it is compliant by
construction instead of by an artist remembering the rules. It never ships in a
match and Arena never loads it.

It exists because of a 2026-08-12 audit finding. Neither George nor Lou
declares a `hand` slot, a `boot` slot, a two-anchor `binding`, or any
`variants`. `Skeleton._placeAttachment` therefore returns null on its first
guard at all six of its call sites, `_placeBoundPart` always falls through to
the legacy `_placePart`, and `resolvePartSelection` never swaps anything. The
entire production contract in this document was, in the shipped game, dead
code. This was demonstrated rather than assumed: deliberately breaking
`solveAnchoredAttachment` so that every hand and boot centred on its quad
instead of its authored wrist/ankle anchor produced byte-identical output from
205 unit tests, both validators, `articulated_channel_probe.mjs`, and
`joint_attachment_audit.mjs`.

The reference rig is therefore the control specimen, and `npm run rig:certify`
always certifies it first:

- If the reference rig fails an invariant, the finding is **architectural**.
  Its manifest anchors and its ink are generated from each other and cannot
  disagree, so no character's artwork can be blamed and no artwork can fix it.
- If the reference rig passes and a legacy character fails, the finding is
  **source-artwork**. Regenerate the art; never add a fixed attachment offset.
- If the reference rig passes and a character that *declares* compliance still
  fails, the finding is **binding-geometry** — that character's manifest
  anchors disagree with its own ink.

`UNVERIFIED` is a distinct outcome from `CERTIFIED`. A character with no
bindings clears every pose in the matrix while proving nothing, which is
precisely how this architecture went unverified beneath a green test suite.
George and Lou both currently report `UNVERIFIED`, with the specific
unmeasurable chains listed.

Known legacy-art defects live in `KNOWN_LEGACY_DEFECTS` in
`tools/rig/certify.mjs` so that a failure count carries information: a listed
defect is reported as expected rather than blocking, and the list cannot rot
silently.

## George and Lou

Do not keep extending their current six-part art as the final combat system.
They remain useful compatibility fixtures while the modular contract,
multi-view transport, and two-anchor placement are implemented. Their eventual
rebuilds start from new five-view cohesive masters prepared under this standard,
with hands and boots split at the source. Preserve the current approved
likenesses as visual references, not as geometry templates.

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
- `rig-source-manifest.example.json` remains the v1 synthetic eight-part
  mannequin fixture used by the current reference rig. The canonical generator
  starts from `rig-source-manifest.v2.example.json`, whose additional views,
  sheet cells, coverage cores, source density, and review fields are deliberately
  not compiled through the legacy adapter. Neither file is final wrestler art.
