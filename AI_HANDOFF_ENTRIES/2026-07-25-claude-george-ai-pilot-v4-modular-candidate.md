# Claude — George AI pilot v4: modular torso/arm/thigh repair candidate

Date: 2026-07-25

## Outcome

Built `george-ai-pilot-v4`, a new isolated, opt-in comparison preset that
replaces the torso/trunks, both upper arms (one shared asset), and both
forearms (two distinct hand orientations) with Derek-approved replacement
source art, plus the already-cut v3 replacement thigh (reused verbatim, not
recut). `george-ai-pilot`, `george-ai-pilot-v2`, shipped `george.js`/
`src/assets/wrestlers/george/`, and every other character are untouched.

**Compare at:** `http://localhost:5173/?p1=george-ai-pilot-v4&p2=george`

Not adopted into shipped George. Stopping here for Derek's in-browser visual
approval, per the brief — no expression-state wiring, no broader renderer
changes.

## Cutter inputs

New Derek-approved source sheets (gitignored, `Sprite sheets/` — not
committed):

- `candidates/v4-modular-source/source/george-torso-upper-arm-source-v1.png`
  — torso + one shared upper arm, two objects on one green-screen sheet.
- `candidates/v4-modular-source/source/george-near-far-forearms-source-v1.png`
  — two distinct forearms/hands, two objects on one green-screen sheet.
- `candidates/v3-new-thigh/source/george-generated-thigh-source-v1.png` —
  previously-approved replacement thigh (already cut/mirrored to face right
  by the earlier `cut_v3_thigh.py` pass; reused verbatim here, not recut —
  see that candidate's own `diagnostics/cut-report.json`).

New cutter: `Sprite sheets/AI Pilot/George/tools/prepare_v4_modular_assets.py`
(reproducible: chroma-key with a per-sheet-sampled background color and the
same antialiased key band prior cutters used; connected-component isolation
to separate the two objects on each sheet — **masking each component's alpha
to its own bbox before alignment**, which an early run of this script got
wrong, see "Bug found and fixed" below; the same `align_limb` rotate-and-pad
technique `prepare_rig_assets.py` established for the shared master). Writes
only to `candidates/v4-modular-source/parts/` and `diagnostics/`. Outputs:
`torso.png`, `pelvis_overlay.png`, `upper_arm.png`, `near_forearm.png`,
`far_forearm.png`, plus a byte-identical copy of the v3 `thigh.png`.

### Bug found and fixed during this pass

The first cutter run passed `align_limb` the *whole* two-object sheet instead
of an isolated crop, so each aligned canvas's own `getbbox()` picked up the
other object's alpha too — upper arm came out 1830×920 (should be ~350×753),
forearms 1326×938/1478×897 (should be ~370×876/322×891). This silently
produced grossly oversized arm/forearm render boxes (visually: "chunky"
oversized limbs in the first comparison screenshots). Root-caused by
comparing the reported canvas sizes against the raw per-component bbox
measurements already computed elsewhere in the same script, not by guessing.
Fixed with a `mask_to_bbox()` step (zero alpha outside each component's own
bbox) before every `align_limb` call; re-ran, re-measured, re-copied the
runtime PNGs, and re-verified the full gate below. Recorded here per the
brief's "known visual limitations" requirement, since the first (buggy)
screenshots existed briefly during this session — no oversized-limb art was
ever adopted into the runtime assets.

## Orientation / near-far determination

This torso has no head, so "facing" was determined from the art's own
depth cues rather than assumed:

- **Torso needed no mirror.** The image-right shoulder has the bigger/
  rounder deltoid and the wider/oval nipple; the image-left shoulder is
  smaller/tucked with a round nipple. This is the same "near side reads
  bigger, near nipple sits right-of-center" convention shipped `george.js`
  already uses at `facing=+1` (verified against that known-good baseline,
  not assumed) — so this new torso already reads facing-right as drawn,
  unlike the original gameplay master (which needed the 2026-07-25
  "orientation fix" mirror). Near shoulder/hip sockets were placed on the
  image-right side accordingly.
- **Forearm near/far was read from hand orientation, not sheet position**
  (Derek's instruction: near = outward-facing hand, far = inward-facing
  hand). Zoomed crops of both hands: the image-left forearm shows an open
  palm (palm crease lines visible, thumb splayed outward) — outward-facing,
  assigned **near**. The image-right forearm shows the back of the hand
  (smooth, knuckle ridges, no palm lines) — inward-facing, assigned **far**.
  This is independent of the torso sheet's own left/right convention (a
  different, independently-generated sheet), and was decided from the art
  content each time, not sheet position.

## Normalization: one scale per source sheet, not one global constant

v4 draws from three independently-generated sheets with no shared pixel-per-
real-world-inch density (unlike v1/v2, entirely cut from one master). Each
scale below is *derived*, not guessed, by matching a measured span in the new
art against the same span already established and Derek-reviewed in
`george_ai_pilot.js`/`george_ai_pilot_v2.js` — since this is a surgical
repair ("Derek likes George's overall concept and does not want a redesign"),
preserving those already-approved body proportions is the correct target.
Full numbers: `candidates/v4-modular-source/diagnostics/rig-profile.json`'s
`scaleDerivation` block; full method: this script's own docstring/comments.

- **`EFFECTIVE_SCALE_TORSO_ARM = 0.1391383407251759`** (torso, pelvis
  overlay, shared upper arm — one sheet). Solved so the new torso's own
  measured neck-to-hipMid span (canvas 619×910, 0.83352 of canvas height)
  equals `george_ai_pilot.js`'s already-calibrated torso span (105.536 world
  units, itself derived from the original approved master's own
  head-top-to-sole measurement).
- **`EFFECTIVE_SCALE_FOREARM = 0.1221920043548019`** (both forearms — a
  different sheet from the torso+arm one). Derived from real joint
  continuity: the shared upper arm's elbow-end width (137 source-px,
  measured 30px in from its rounded tip) matched against both forearms'
  elbow-end width (157px near / 155px far, same 30px-from-tip method,
  averaged to 156). `ratio = 137/156 = 0.87821`; `EFFECTIVE_SCALE_FOREARM =
  EFFECTIVE_SCALE_TORSO_ARM * ratio`.
- **`EFFECTIVE_SCALE_THIGH = 0.06887886597938145`** (reused v3 thigh).
  Solved so the thigh's own measured hip-to-knee bone span (776 source-px,
  from that candidate's `cut-report.json`) equals the existing `thighH`
  (53.45) **unchanged** — this is why `thighH` is not overridden in
  `george_ai_pilot_v4.js`: the scale was chosen specifically to reproduce
  the already-approved leg-length proportion on the new art, not the other
  way around. `shinH` (40.19) is likewise unchanged — the shin itself is
  reused, untouched.

Each part's `box.w/h` in `george_ai_pilot_v4.js` follows the same
`canvasDim * scale * (1 - jointPivotFrac)` convention v2's `limbBox`
established, so `_placePart`'s `1/(1-jointPivotFrac)` growth recovers exactly
`canvasDim * scale` at render time — one uniform scale in X and Y within each
sheet's parts (verified by `tests/georgeAiPilotV4.test.js`'s first test). No
independent per-part width/height stretching anywhere.

## Anchors (canvas-fraction, from rig-profile.json)

- **torso** (619×910): `neck (0.483, 0.033)`, `nearShoulder (0.806, 0.174)`,
  `farShoulder (0.141, 0.169)`, `nearHip (0.470, 0.875)`, `farHip (0.297,
  0.858)`. Shoulders were re-measured against zoomed crops of each deltoid
  ball (not the first-pass "widening jump" heuristic, which sat outside the
  actual joint). Hip sockets sit a bit above the trunks' tapering tip (no
  distinct twin leg-hole flaps in this art, unlike the old master) —
  Derek's pelvis-overlay design is what actually hides that seam, so exact
  hip-socket placement matters less than it would without it.
- **upper_arm** (350×753, `jointPivotFrac=0.04889`): `distalAnchorFrac (0.5,
  0.9503)`. Same texture entry backs both `farUpArm`/`nearUpArm` in
  `Skeleton.js`, so both forearms attach through this one measured elbow
  point — the "one elbow attachment contract" the brief requires.
- **near_forearm** (370×876, `jointPivotFrac=0.04318`), **far_forearm**
  (322×891, `jointPivotFrac=0.04094`): pivots are close by construction (both
  measured the same way — topmost alpha-row centroid on the same sheet) —
  satisfies "compatible hidden overlap" without forcing them numerically
  identical. Terminal parts, no `distalAnchorFrac`.
- **thigh** (401×861, reused v3 output unchanged): `jointPivotFrac=0.02323`
  (near-zero — this source has no authored overlap above the hip, unlike
  the old master's thigh; sealed via the pelvis overlay instead, not an
  authored thigh-side overlap), `distalAnchorFrac (0.5, 0.9245)` (the knee,
  translated from the v3 cut-report's `kneeTransitionY` through that
  candidate's own crop box).

## Draw order / mechanisms reused, not reimplemented

- Dynamic-pelvis hip sockets + authored-leg-rig neutralization
  (`Skeleton.js`'s `_solveTorsoOrigin`/`_authoredLegRig`), gated on this
  torso's own `nearHip`+`farHip` sockets.
- Painted-sole IK/FK grounding (`soleAnchorFrac`, reused v2 near/far shins
  unchanged).
- Pelvis overlay: same-canvas, same crop/origin/facing/scale as `torso`,
  depth-ordered above both thigh roots and below the near arms (unchanged
  `Skeleton.js` depth contract) — new pixels are only real magenta trunks +
  antialiased ink from the new torso source, no invented pixels.
- `nearForearm`/`farForearm`: **new** generic opt-in fallback pair in
  `Skeleton.js` (mirrors the existing `farThigh`/`nearThigh` and
  `farShin`/`nearShin` pattern exactly — `textures.farForearm ?? textures.forearm`
  / `textures.nearForearm ?? textures.forearm`). Every character before v4
  is unaffected (both fall through to the shared `forearm` key, byte-
  identical to the single-forearm path).

## Re-tuned for this pass

`farShinScale` — **not** inherited from v2's tuned `1.20` (that value
equalizes near/far sole reach against v2's own hip-socket geometry, which
this torso's freshly-measured sockets don't share). Re-measured empirically
the same way v1/v2 were, sweeping `sk._farShinScale` directly against
`sole_grounding_sweep.mjs`'s reported worst-case gap: **`1.185`** is the
minimax point (worst gap 0.97px, vs. 1.35px at the inherited 1.20 or 1.92px
at 1.15) — comfortably inside the ≤2px gate with margin on both sides.

## Verification (Node 22.23.1 via nvm)

- `npm test`: 64/64 (57 pre-existing + 7 new `georgeAiPilotV4.test.js` cases)
- `npm run build`: clean
- `npm run debug:play -- all`: 16/16 (default brawler/george matchup;
  unaffected by this pass)
- `joint_attachment_audit.mjs george-ai-pilot-v4`: 24/24 PASS, 0.00–1.00px
  (also re-ran george/thesz/george-ai-pilot/george-ai-pilot-v2 together:
  120/120 PASS, no regression)
- `torso_socket_sweep.mjs george-ai-pilot-v4`: worst 0.00px, PASS
- `sole_grounding_sweep.mjs george-ai-pilot-v4`: worst 0.97px, PASS (re-ran
  george-ai-pilot/george-ai-pilot-v2 too — 1.05px/1.28px respectively, no
  regression)
- `elbow_anchor_sweep.mjs george-ai-pilot-v4`: 0.000px, PASS
- `knee_ink_gap_sweep.mjs george-ai-pilot-v4`: 0.00px, PASS
- Real-render capture: `george_pilot_art_review.mjs` extended via its
  existing `WFM_REVIEW_PRESET` env var (no code change needed) — 130 frames
  under `tools/debug/shots/george-pilot-art-review/v4-modular/`: live
  keyboard walk both directions, 24-phase dense gait sweep both facings, and
  four retained-`walkPhase` idle→lockup transitions (4 samples each) both
  facings. `pilot_comparison_shots.mjs` extended with a new
  `WFM_PILOT_PRESET` env var (defaults to `george-ai-pilot`, byte-identical
  for every prior use) — shots under
  `tools/debug/shots/pilot-comparison-george-ai-pilot-v4/`: idle both
  facings, crouch/block, overhead taunt, axe-handle overhead, hammerlock,
  arm bar, 4 walk phases, running, 4 get-up samples.
- Perspective-scale spot check: `this.s` is a computed getter
  (`perspectiveScale(this.y)`, not a settable field — confirmed by directly
  probing it, an assignment silently no-ops), so a literal 0.5x/2x render
  scale isn't independently settable through the public API; checked instead
  across the game's actual perspective range (`s=0.58` far mat depth to
  `s=1.0` near mat depth) — no seam/gap at either extreme.

## Visual review findings (this session's own read, not yet Derek's)

- No exposed trunk protrusion, magenta wedge, or thigh-root gap through the
  dense 24-phase gait sweep or the four idle→lockup transitions (the exact
  failure mode Derek's original in-browser playtest caught on the v1
  pilot) — the pelvis-overlay mechanism carries over cleanly to this new
  torso.
- No shoulder "football pad" widening or elbow/knee lollipop artifacts in
  any captured pose.
- The dense gait montage reads as a believable, non-"emu" stride — legs
  cross and recover naturally under the trunks across the full sampled
  swing arc, which is the specific improvement this thigh replacement was
  commissioned for (see the 2026-07-25 "measured farShinScale" entry's
  finding that the old shared thigh's silhouette, not the rig math, caused
  the crossing/stiff-leg read). Not Derek-confirmed yet.
- Hand-orientation correctness (near palm-out / far back-out) was verified
  from the source art at full resolution, not from in-game screenshots —
  at this rig's actual render scale (~100px tall character), palm-vs-back
  is not reliably legible either way, so that specific acceptance point is
  effectively untestable via screenshot at gameplay scale.

## Known limitations / open items for whoever reviews next

- Torso hip-socket placement (near/far) is a judgment call, not a
  geometric landmark — this art's trunks taper continuously to a point
  with no distinct twin leg-hole flaps the way the old master had, so
  there's no sharp corner to measure. Placement leans on the pelvis overlay
  to hide any imprecision; if Derek's review finds a specific pose where
  the seam shows, re-measuring the hip sockets is the first thing to try
  before touching anything else.
- The three per-sheet scale derivations above are principled but not a
  from-scratch physical measurement — each anchors to an already-approved
  number from the OLD pilot (torso span, thigh bone length) or a cross-
  sheet joint-width match (forearm), because no single new sheet contains a
  full head-to-sole reference the way the original gameplay master did.
  Reasonable for a candidate; worth a second look if Derek's eye says
  something reads mis-scaled.

## Task update

`AI_HANDOFF_TASKS.json`'s `george-ai-pilot` task updated (history preserved,
not deleted) to record this candidate and point at this entry.
