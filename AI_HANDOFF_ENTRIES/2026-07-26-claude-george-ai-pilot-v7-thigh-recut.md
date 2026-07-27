# Claude — George AI pilot v7: thigh recut candidate, v6 found to have no meaningful visual improvement

Date: 2026-07-26

## Outcome

Derek reviewed `george-ai-pilot-v6` live and found **no meaningful visual
improvement** over v5. v6 is not literally a no-op — it does apply a
uniform 1.25x scale multiplier to the same v3 thigh bitmap — but the fix is
visually inadequate: that scale only takes the thigh from ~27.6 to ~34.5
world pixels wide, roughly 4-6 **screen** pixels at normal ring depth. The
underlying long, narrow silhouette itself never changed, so the thighs
still read too small and thin against the v5/v6 torso.

Built `george-ai-pilot-v7`, a new isolated, opt-in comparison candidate that
recuts the thigh at its real source knee transition instead of applying
another multiplier to the unchanged bitmap. Forearms, shins, torso, pelvis
overlay, head, and the shared upper arm all carry forward from
`george-ai-pilot-v6` unchanged — not revisited, per the brief ("primarily a
thigh recut and visual-proof pass, not another broad rig rewrite").
`george-ai-pilot`, `-v2`, `-v4`, `-v5`, `-v6`, shipped `george.js`/
`src/assets/wrestlers/george/`, and every other character are untouched.

**Compare at:** `http://localhost:5173/?p1=george-ai-pilot-v6&p2=george-ai-pilot-v7`

Not adopted into shipped George. Stopping here for Derek's in-browser visual
approval — v7 is not called approved.

## Root cause of v6's inadequate fix

v3's cutter (`cut_v3_thigh.py`) placed its knee cut at source `Y=985`,
treating a ~776-source-px span (top hip `Y=209` to `Y=985`) as the thigh
bone. That is well below the leg's actual anatomical knee — it retains most
of the drawn calf inside what `Skeleton.js` treats as the thigh bone. Any
uniform width fix on that bitmap has to also stretch that excess length,
which is why v6's 1.25x bump landed on a thigh that's still visually thin:
going wider on that bitmap without also going proportionally longer starts
to distort the leg, so v6's tuning trial (1.0/1.15/1.25/1.35x, see the v6
entry) stopped at a conservative 1.25x rather than pushing further.

## Thigh recut — measurement, not a guess

Per the brief, did not blindly trust the brief's own Y=840-880 estimate —
re-measured directly from the untouched source
(`candidates/v3-new-thigh/source/george-generated-thigh-source-v1.png`,
1024x1536, never re-opened for writing):

- **Row-by-row silhouette width profile** (chroma-keyed alpha bounds per
  row, same key constants as `cut_v3_thigh.py`): the leg narrows steadily
  from its thigh bulge (max width 357px around y=480-515) down to a **flat
  minimum plateau of 232-234px spanning y=868 to y=926** — the true
  cross-sectional narrowing at the knee joint. Width climbs again (233 →
  235) starting at y=927, marking where the calf bulge resumes.
- **Interior "bend crease" ink stroke** — the same hand-drawn joint-marking
  convention identified in the v5 arm-trim entry (a connected-component
  scan of near-black interior pixels, distinct from the bold outer
  silhouette stroke): found exactly one crease at **y=836-900, x=465-522**,
  sitting over the upper half of the width plateau. A second, separate
  crease at y=961-1017 sits well into the calf-bulge region below the knee
  and was **not** used — it reads as a calf/shin muscle line, not a joint
  marker (confirmed by its position relative to the width-plateau
  boundary, not assumed from its shape).

`KNEE_TRANSITION_Y = 880` — centered inside both the width plateau
(868-926) and the crease span (836-900), at the conservative (lower) edge
of the brief's own Y=840-880 estimate rather than picked from that estimate
blindly. `UNDERLAP_PX = 40` (within the brief's 35-50px range, matching the
underlap convention `cut_v3_thigh.py` itself used at 45px and
`prepare_v5_arm_trim.py`'s arm crops used at 40px). `CUT_Y = 920`.

New cutter: `Sprite sheets/AI Pilot/George/tools/prepare_v7_thigh_recut.py`.
Reuses `cut_v3_thigh.py`'s exact method (chroma-key, straight horizontal
alpha cut, trim-to-content with 20px padding, mirror-in-place to match the
facing-right bake every other part uses) against the **same** untouched
source — only the cut row changes. No redraw, no black transverse line, no
kneecap circle/oval/peg/bulb, no synthesized anatomy anywhere; the top hip
stroke and both side contours above the cut are byte-identical source
pixels (pre-mirror).

New hip-to-knee bone span: **671 source px** (880 − 209), vs. v3/v6's 776 —
a genuinely shorter bone, not just a smaller crop.

## Scale — solved against the new bone span, not another arbitrary multiplier

`EFFECTIVE_SCALE_THIGH = 67 / 671 = 0.09985096870342772` — solved to hit
**67 world px** hip-to-knee (the midpoint of the brief's 65-68px target
range), against the new, shorter 671-source-px bone. At this scale:

- `thighH = 67.0` world units (Skeleton.js's separate IK bone-length
  constant, not auto-derived from the texture box — same caveat v6's own
  entry documents) — essentially unchanged from v6's own 66.81, so leg
  length and knee height are not disturbed.
- `box.w = 38.97` world px — vs. v6's 33.72 and v5's ~27.6. Close to the
  brief's ~40px starting target, and large enough that the difference reads
  at native gameplay scale (see visual evidence below), not just in a
  zoomed crop.
- `box.h = 72.99` world px, `THIGH_PIVOT (jointPivotFrac) = 0.02663115845539281`
  (= 20px padding / 751px canvas height, same construction as v6's own
  pivot), `distalAnchorFrac = { u: 0.5, v: 0.9201065246338216 }` (= local
  knee row 691 / canvas height 751, same construction v6 used for its own
  776/861 anchor).

Because the recut removed the redundant calf material instead of just
scaling around it, one uniform scale hits both the width and length targets
at once — the "shorter source bone span that can be rendered at a larger
uniform scale while preserving a believable hip-to-knee world length" the
brief asked for. No non-uniform width scaling, no screen-space offsets, no
fake knee anchor, no gait changes.

Full numbers: `Sprite sheets/AI Pilot/George/candidates/v7-thigh-recut/diagnostics/cut-report.json`.

## Implementation structure

- `Sprite sheets/AI Pilot/George/candidates/v7-thigh-recut/` (new cutter
  output — `parts/thigh.png`, `diagnostics/cut-report.json`).
- `src/assets/wrestlers/george-ai-pilot-v7/` (new, isolated) — the new
  `thigh.png`, plus byte-identical (MD5-confirmed) copies of every other
  part from `george-ai-pilot-v6/`.
- `src/characters/george_ai_pilot_v7.js` (new; spreads `georgeAiPilotV6`,
  overrides only `thighH`/`thigh` — box/jointPivotFrac/distalAnchorFrac/key
  — plus re-keys every other texture into this character's own folder,
  same convention every prior pilot candidate used).
- `'george-ai-pilot-v7'` comparison preset in `src/scenes/Arena.js`
  (`CHARACTERS` array + `PRESETS` map, same pattern as v4/v5/v6).
- `tools/debug/v7_comparison_shots.mjs` (new) — the full v6-vs-v7 visual
  evidence set described below.

`Skeleton.js` was not touched — no new generic capability was needed;
v6's own `thigh`/`thighH` override mechanism was already sufficient.

## Verification (Node 22.23.1 via nvm; `/opt/homebrew/bin/python3` for the
cutter script, per the existing recorded python3-on-this-machine gotcha)

- `npm test`: 64/64, no regression.
- `npm run build`: clean.
- `npm run debug:play -- all`: 16/16 (default brawler/george matchup,
  unaffected).
- `joint_attachment_audit.mjs george george-ai-pilot george-ai-pilot-v2
  george-ai-pilot-v4 george-ai-pilot-v5 george-ai-pilot-v6
  george-ai-pilot-v7`: **168/168 PASS**, no regression on any prior
  character; v7 itself 0.00-1.00px across all 24 sampled poses/facings
  (gate 2.5px) — tighter than v6's own 0.00-2.00px on the same sweep.
- `torso_socket_sweep.mjs george-ai-pilot-v7`: neck/both shoulders/nearHip
  all 0.00px; **farHip 3.00px** (gate 2.5px) — see the dedicated section
  below. Same known, investigated finding as v6 (3.16px there), not a new
  regression.
- `sole_grounding_sweep.mjs george-ai-pilot-v7`: worst 1.88px, PASS
  (matches v6's 1.87px — v7 doesn't touch shins/farShinScale, as expected).
- `elbow_anchor_sweep.mjs george-ai-pilot-v7`: 0.000px, PASS (arms
  untouched).
- `knee_ink_gap_sweep.mjs george-ai-pilot-v7`: **0.00px** across the full
  dense angle sweep, PASS — confirms the shorter recut thigh bone still has
  zero ink gap at the knee joint through its full rotation range, no
  exposed underlap from the recut.

### `torso_socket_sweep.mjs` farHip, 3.00px — same finding as v6, re-investigated

v6's entry documented this exact hip socket (facing 1, get-up t=0.56) as an
already-marginal, thin-ink boundary point, insensitive to that pass's own
tuning knobs, and visually clean under the pelvis overlay. Re-checked for
v7 rather than assumed to still apply:

- The 3.00px reading (vs. v6's 3.16px) is close enough to be the same
  texture-atlas/sub-pixel sampling artifact v6's own pixel-level diagnostic
  identified, not a new defect from the recut — the small delta is
  consistent with a different thigh canvas size feeding the same marginal
  sampling boundary, not a change in the underlying hip-socket geometry
  (torso/pelvis overlay are byte-identical to v6, untouched by this pass).
- **Real-render zoomed check at the exact flagged pose** (facing 1, get-up
  t=0.56, camera zoomed 6x on torso+pelvis-overlay bounds), both v6 and v7
  side by side: `tools/debug/shots/v7-comparison/12_farhip_flagged_pose_zoom_p1v6.png`
  / `..._p2v7.png` — no exposed skin, wedge, or seam in either; the pelvis
  overlay covers the hip root identically in both. Same conclusion as v6:
  not a real defect, left as a flagged, non-blocking, already-known finding.

## Required visual evidence

`node tools/debug/v7_comparison_shots.mjs` — `WFM_P1=george-ai-pilot-v6`,
`WFM_P2=george-ai-pilot-v7`, both wrestlers in frame at once, same
depth/scale. All shots under `tools/debug/shots/v7-comparison/`:

- `01`/`02` idle, both facings.
- `03` crouch/block, `04` lockup pose, `05` hammerlock, `06` arm bar, `07`
  overhead taunt.
- `08`/`08b` deep thigh swing (`kneeLiftImpact` pose, the largest
  single-leg-raise value in `POSES` — lLeg 1.72, sharper test than
  dropkick's 0.80) at gameplay scale and zoomed on torso+pelvis+thighs —
  **no exposed hip wedge, no knee underlap, at the deepest authored leg
  raise in the game.**
- `09_walk_phase_0..3` — four dense forced walk phases.
- `10` running.
- `11_getup_*` — five get-up rotation samples (0, 0.34, 0.56, 0.72, 1).
- `12_farhip_flagged_pose_zoom_*` — the automated-gate finding above, both
  characters, zoomed on the flagged joint.
- `13`/`14_trunks_thigh_knee_v6`/`v7` — tight crop (camera zoomed on the
  real torso+pelvis+thigh bounds via `Skeleton` image `getBounds()`, not a
  guessed coordinate) at idle. **This is the core evidence**: v7's thigh
  visibly fills more of the trunks leg-hole and reads noticeably rounder
  than v6's, which still shows a visible gap between the trunks edge and
  the thigh silhouette.
- `15`/`16_hands_v6`/`v7` — forearms unchanged from v6, confirmed
  identical, thumbs still read correctly (see forearm section below).
- `17`/`18_feet_v6`/`v7` — shins unchanged from v6, confirmed identical.
- `19`-`26` — forearm verification poses (idle both facings, overhead, deep
  elbow bend, lockup), zoomed on both forearms, both characters.
- `27`-`29` — shin/foot verification (idle both facings, running), zoomed
  on both shins, both characters.
- `30`/`31` — **real, keyboard-input-driven walking** (not forced pose) —
  P1 (v6, WASD) and P2 (v7, arrows) actually walking apart then together
  through the live game loop, both directions covered for both characters.
- `32` — real, input-triggered lockup attempt (grapple key at close range).

Additionally, a native-resolution (no game-camera zoom, just an image crop
of the full-frame idle screenshot, 3x nearest-neighbor upscale for
visibility only) side-by-side of both near thighs was reviewed directly —
the width difference is real and visible without relying on any zoomed
in-game crop, satisfying the brief's "plainly visible without zooming"
bar, though it reads as a moderate rather than dramatic improvement at
normal ring depth.

## Forearm verification (carried forward from v6, re-checked per the brief)

The brief required verifying forearms from the actual runtime rather than
assuming v6's prior verification still holds. Captured `19`-`26` above at
v7's own runtime (same bitmaps/keys as v6, re-keyed into v7's own asset
folder — MD5-confirmed byte-identical to v6's `near_forearm.png`/
`far_forearm.png`): both thumbs read correctly (positioned toward the
wrist/forearm junction, not splayed with the fingers) at idle both facings,
overhead, deep elbow bend (`armBarLock`), and lockup pose. No regression
from the thigh-only change, as expected since forearm textures/keys/pivots
are untouched.

**Not exhaustively re-covered:** the full dense elbow-bend sweep and
actually-locked headlock/hammerlock-in-progress poses (both partners
mid-move, not just a forced single-wrestler pose) were not captured this
pass either — same limitation v6's own entry flagged, carried forward
un-worsened since forearms weren't touched.

## Shin/foot verification (carried forward from v6, re-checked per the brief)

Captured `27`-`29` above: both `near_shin.png`/`far_shin.png` in v7's own
folder are MD5-confirmed byte-identical to v6's. Both feet show the same
clean side-profile boot at idle (both facings) and running — the angled
near/front boot is still absent, painted soles still read grounded
(confirmed numerically too: `sole_grounding_sweep` 1.88px, matching v6's
1.87px).

## Preserved from v6 (not revisited)

- Forearm swap+mirror (`nearForearm`/`farForearm` bitmaps, keys, pivots).
- Shin duplication (`nearShin`/`farShin` both the clean far/back boot
  bitmap, `farShinScale: 1.0`).
- Final pass-3 mirrored torso and near/far torso socket assignments.
- Pelvis overlay and draw-order solution.
- Approved head.
- Trimmed shared upper arm and its current length.
- Dynamic-pelvis, authored-anchor, and painted-sole runtime mechanisms
  (`Skeleton.js` untouched).

## Known limitations / open items for whoever reviews next

- The `torso_socket_sweep.mjs` farHip ~3px finding — same conclusion as
  v6's own investigation (visually clean, not blocking), re-checked rather
  than assumed, but still not silently cleared.
- Forearm/shin re-verification this pass reused v6's own bitmaps/pivots
  (unchanged) rather than re-deriving anything — appropriate given the
  brief's "primarily a thigh recut... not another broad rig rewrite" scope,
  but flagged directly per this project's convention.
- The native-scale visual read (side-by-side native crop, described above)
  is a moderate, not dramatic, improvement — Derek's own eye at normal ring
  depth is the actual acceptance test this candidate is waiting on.
- `george-ai-pilot-v7`'s working tree is uncommitted, same as every pilot
  candidate before it — not committed or pushed as part of this pass.

## Task update

`AI_HANDOFF_TASKS.json`'s `george-ai-pilot` task updated (history preserved,
not deleted) to record v6's "no meaningful improvement" finding and this
candidate.
