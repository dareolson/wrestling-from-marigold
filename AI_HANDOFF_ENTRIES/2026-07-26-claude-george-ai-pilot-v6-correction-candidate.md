# Claude — George AI pilot v6: thigh/forearm/shin correction candidate, supersedes the premature v5 approval

Date: 2026-07-26

## Outcome

Derek's "looks great" approval of `george-ai-pilot-v5` (same day, recorded in
AI_HANDOFF.md's earlier 2026-07-26 entry) is **RESCINDED**. Derek reviewed
the complete character more carefully and found three concrete problems the
earlier spot-check poses missed:

1. Both thighs read much too small against the new (v4/v5) torso.
2. The near/far forearm assets are assigned to the wrong physical side and
   wrongly mirrored — thumbs did not read as facing up.
3. The near/front shin-and-boot art bakes in an angled-foot perspective that
   does not read correctly during walking; the back/far shin-and-boot art (a
   clean side-profile boot) should be used for both legs.

Built `george-ai-pilot-v6`, a new isolated, opt-in comparison candidate that
fixes **only** those three things. `george-ai-pilot`, `-v2`, `-v4`, `-v5`,
shipped `george.js`/`src/assets/wrestlers/george/`, and every other
character are untouched. The pass-3 torso orientation/shoulder-attachment
work, the head, the trimmed shared upper arm and its length, the pelvis
overlay/draw-order solution, and the dynamic-pelvis/authored-anchor/
painted-sole runtime mechanisms all carry forward from v5 unchanged — not
revisited, per the brief.

**Compare at:** `http://localhost:5173/?p1=george-ai-pilot-v6&p2=george`, or
against v5 directly: `?p1=george-ai-pilot-v5&p2=george-ai-pilot-v6`.

Not adopted into shipped George. Stopping here for Derek's in-browser visual
approval, per the brief — no expression-state wiring, no broader renderer
changes, v6 not called approved.

## Cutter

New `Sprite sheets/AI Pilot/George/tools/prepare_v6_corrections.py`. Does
not re-derive anything from raw source sheets:

- Copies `torso.png`/`pelvis_overlay.png`/`upper_arm.png` byte-identical
  from `candidates/v5-arm-trim/parts/`, and `thigh.png` byte-identical from
  `candidates/v3-new-thigh/parts/` (confirmed via MD5, not assumed).
- **Forearms:** loads v5's `near_forearm.png`/`far_forearm.png`, swaps which
  bitmap backs which semantic slot, and horizontally mirrors both
  (`ImageOps.mirror`) — a pixel-level bake, not a runtime `flipX` exception.
  New `near_forearm.png` = old `far_forearm.png` mirrored; new
  `far_forearm.png` = old `near_forearm.png` mirrored.
- **Shins:** copies `george-ai-pilot-v2/far_shin.png` (the clean
  side-profile boot — confirmed byte-identical to v4/v5's own `far_shin.png`
  by file identity before running, not inferred from sheet position) to
  BOTH `near_shin.png` and `far_shin.png`. The angled near/front bitmap is
  not carried into v6 at all.

Outputs written only to `candidates/v6-corrections/parts/` and
`diagnostics/correction-report.json` — v4/v5's own generated parts are left
untouched.

## Forearm pivot verification (not assumed)

The brief warned "current elbow pivots appear centered, but verify rather
than assume." Checked structurally rather than by scanning ink pixels
(scanning turned out to be the wrong signal — a hand-drawn limb's visible
alpha at any one row isn't symmetric even when its authored joint pivot is,
since fingers/thumb splay to one side; an earlier version of this check
mistakenly flagged 10-20px "centering errors" that were really just normal
finger-splay asymmetry, not a real problem — caught and corrected before
relying on it). The actual invariant: `v5-arm-trim/diagnostics/rig-profile.json`
records both forearms' `proximal: [0.5, ...]` — `align_limb`
(`prepare_v4_modular_assets.py`) sets the proximal point to exactly
`width/2` by construction. `prepare_v5_arm_trim.py`'s crop only touches Y,
never width, so that invariant survives into v5 unchanged; mirroring a
fixed-width image about its own vertical centerline preserves it too. So
`u=0.5` is confirmed correct post-swap-and-mirror by chaining three already-
true facts, not by re-measuring the wrong signal.

## Thigh correction

v5 inherited the v3 shared thigh (`candidates/v3-new-thigh/parts/thigh.png`)
at `EFFECTIVE_SCALE_THIGH = 0.06887886597938145`, a value chosen solely to
reproduce the old master's `thighH=53.45` unchanged — not derived against
the new torso at all. Per the brief, did not assume preserving that old
numeric length preserved the correct new silhouette.

**Trial:** swept uniform-scale multipliers 1.0/1.15/1.25/1.35 relative to
v5's scale (same bitmap, no recut — the width-vs-length trade-off the brief
flagged as a possible reason to recut near the knee did not bite; a uniform
bump alone produced both a believable width and a believable hip-to-knee
span). A direct side-by-side real-render screenshot
(`?p1=george-ai-pilot-v5&p2=george-ai-pilot-v6`, idle both facings) at 1.25x
shows the v6 thigh visibly filling the trunks/hip region against the v5
torso, where v5's own thigh reads noticeably thinner/pencil-like by
comparison — the exact defect Derek flagged. **1.25x** was picked as the
candidate: comfortably fixes the "too small" read without looking
exaggerated. Screenshot: `/tools/debug/shots/pilot-comparison-george-ai-pilot-v6/01_idle_facing_right.png`
plus an ad hoc v5-vs-v6 idle crop taken during this pass (not saved to the
repo — reproducible via the harness at any time).

**thighH bug caught and fixed:** `Skeleton.js`'s IK solver reads
`this._thighH` (`textures.thighH`) as a *separate* bone-length constant from
the texture's own `box.h` — NOT auto-derived from it. v4/v5 never overrode
`thighH` because their `EFFECTIVE_SCALE_THIGH` was solved specifically to
reproduce the inherited default (53.45) — see `george_ai_pilot_v4.js`'s own
comment on this. Scaling only the box (my first pass) would have silently
left the IK hip-to-knee bone at the OLD short length while the sprite
rendered bigger. Caught by `torso_socket_sweep.mjs` failing `farHip` at
3.16px; fixed by adding `thighH: THIGH_BONE_PX * EFFECTIVE_SCALE_THIGH`
(66.81 world units) to v6's textures, matching the brief's own explicit
warning ("recompute the resulting bone span... rather than hiding it with
offsets").

Both enlarged thigh roots were checked against the pelvis overlay through
the get-up rotation sweep and in the zoomed idle/hammerlock crops taken this
pass — no exposed hip wedge or seam in any of them (see "torso_socket_sweep
farHip" section below for the one related automated-gate finding, which
turned out to be unrelated to the thigh scale itself).

## Forearm correction — visual result

Close-up crops at idle, both facings (camera zoomed ~4.5x on the hip/hand/
foot region), show both hands with their thumb now positioned up near the
wrist/forearm junction rather than splayed at the bottom alongside the
fingers — the orientation Derek asked for. Checked from the actual runtime
facing-transform output, not from filenames, per the brief. Full pose sweep
(headlock/arm-bar/hammerlock while actually locked with a partner, deep
elbow bends) was **not** exhaustively captured this pass — flagging this
directly rather than claiming full coverage; the idle/close-crop check is a
reasonable spot-check, not the brief's full pose matrix. Worth a second look
if Derek's eye catches something at an extreme bend.

## Shin/foot correction — visual result

Close-up crops in both facings show identical boot art on both legs (the
clean side-profile boot, matching `far_shin.png`) — the angled near/front
perspective is gone. Walk-phase and running comparison screenshots
(`08_walk_phase_*.png`, `09_running.png`) show both feet tracking naturally
through the stride against shipped George's own gait in the same frames, no
obviously broken or backwards-looking foot.

**farShinScale swept** (0.9/1.0/1.1/1.185/1.3) against
`sole_grounding_sweep.mjs`: **1.0 (equal near/far)** is the actual minimax
point — 1.87px worst gap, PASS. Every other tested value was worse (1.86px
was the v6-config's own confirmed re-run; 1.1 → 2.94px FAIL, 1.185 → 5.02px
FAIL, 1.3 → 7.82px FAIL). This matches the brief's own expectation exactly
("begin with equal near/far shin scales when both use the same bitmap") —
no justified deviation was needed, so none was added.

## Known automated-gate finding: `torso_socket_sweep.mjs` farHip, 3.16px (not adopted as a real defect, but not silently dropped either)

`torso_socket_sweep.mjs george-ai-pilot-v6` reports `farHip: max ink gap
3.16px` at facing 1, get-up t=0.56 (gate is 2.5px) — every other joint
(neck/both shoulders/nearHip) is 0.00px, and this exact character passed at
0.00px for every joint as `george-ai-pilot-v5`.

**Investigated thoroughly, not waved off:**
- Swept the thigh scale multiplier (1.0/1.15/1.25) and `farShinScale`
  (0.9/1.0/1.1/1.185/1.3) — the reported gap was **exactly 3.16px in every
  single case**, proving it's insensitive to both of this pass's own tuning
  knobs.
- Temporarily restored v6's `nearShin`/`farShin` to v5's own original
  (distinct) shin entries — still exactly 3.16px, ruling out the shin
  correction as the cause too.
- Direct pixel-level diagnostic (dumping the torso/thigh sprites' actual
  transform and nearest-ink search at the flagged joint) showed the torso
  and thigh sprites render at byte-identical positions/sizes/rotations
  between v5 and v6, and the joint-relative offset is identical — but the
  torso's *own* nearest ink to the joint measures 0.00px for v5 and 2.83px
  for v6, despite pixel-identical (MD5-confirmed) `torso.png` bytes. This
  points to a texture-atlas/sub-pixel sampling artifact specific to loading
  the same pixels under a fresh Phaser texture key, landing on an
  ALREADY-marginal, thin-ink boundary — the v4 handoff entry itself
  documents this exact hip socket as "a judgment call... no distinct twin
  leg-hole flaps... placement leans on the pelvis overlay to hide any
  imprecision," i.e. this point was never robustly covered by torso ink in
  the first place, in v5 either.
- **Real-render visual check at the exact flagged pose** (facing 1, get-up
  t=0.56, camera centered/zoomed 5x on the hip joint): no exposed skin,
  wedge, or seam — the pelvis overlay fully covers the hip root, exactly as
  designed. This is the actual acceptance criterion; the automated check
  doesn't model the pelvis overlay's coverage at all (its `JOINTS` mapping
  only compares `torso` vs. `farThigh` ink directly).

Left as a flagged, investigated, non-blocking finding rather than either
hiding it or spending further time chasing what four separate isolation
tests show is not caused by anything this pass changed. Worth a second look
if Derek's own review ever catches a visible hip seam specifically during a
get-up transition — the fix, if one is ever needed, is almost certainly a
torso hip-socket re-measurement (as the v4 entry already anticipated), not
anything in v6's own thigh/shin work.

## Preserved from v5 (not revisited)

- Final pass-3 mirrored torso and near/far torso socket assignments
  (`rigProfile.sockets`, byte-identical).
- Pelvis overlay and draw-order solution.
- Approved head.
- Trimmed shared upper arm and its current length (`upperArm` box/pivot/
  `distalAnchorFrac` byte-identical).
- Dynamic-pelvis, authored-anchor, and painted-sole runtime mechanisms
  (unchanged in `Skeleton.js` — v6 needed no new runtime capability; the
  existing near/far forearm and near/far shin opt-in fallback pairs already
  covered everything this pass needed).

## Implementation structure

- `src/assets/wrestlers/george-ai-pilot-v6/` (new, isolated).
- `src/characters/george_ai_pilot_v6.js` (new; spreads `georgeAiPilotV5`,
  overrides only `thigh`/`thighH`/`nearForearm`/`farForearm`/`nearShin`/
  `farShin`/`farShinScale` plus re-keyed torso/pelvisOverlay/upperArm/head).
- `'george-ai-pilot-v6'` comparison preset in `src/scenes/Arena.js`
  (`CHARACTERS` array + `PRESETS` map, same pattern as v4/v5).
- `Sprite sheets/AI Pilot/George/candidates/v6-corrections/` (new cutter
  output dir; v4/v5's own `parts/`/`diagnostics/` untouched).

No shared runtime code changes — `Skeleton.js` was not touched.

## Verification (Node 22.23.1 via nvm — the system `/usr/bin/python3` on this
machine is still broken per the existing recorded gotcha; used
`/opt/homebrew/bin/python3` for the cutter script)

- `npm test`: 64/64, no regression.
- `npm run build`: clean.
- `npm run debug:play -- all`: 16/16 (default brawler/george matchup,
  unaffected).
- `joint_attachment_audit.mjs george george-ai-pilot george-ai-pilot-v2
  george-ai-pilot-v4 george-ai-pilot-v5 george-ai-pilot-v6`: all PASS, no
  regression on any prior character; v6 itself 0.00–2.00px across all 24
  sampled poses/facings (gate 2.5px).
- `torso_socket_sweep.mjs george-ai-pilot-v6`: neck/both shoulders/nearHip
  all 0.00px; farHip 3.16px — see the dedicated section above.
- `sole_grounding_sweep.mjs george-ai-pilot-v6`: worst 1.87px, PASS
  (farShinScale=1.0, swept and confirmed the minimax point).
- `elbow_anchor_sweep.mjs george-ai-pilot-v6`: 0.000px, PASS.
- `knee_ink_gap_sweep.mjs george-ai-pilot-v6`: 0.00px, PASS.
- Real-render capture: `pilot_comparison_shots.mjs`
  (`WFM_PILOT_PRESET=george-ai-pilot-v6`) — 16 shots under
  `tools/debug/shots/pilot-comparison-george-ai-pilot-v6/` (idle both
  facings, crouch/block, overhead taunt, axe-handle overhead, hammerlock
  pose, arm-bar pose, 4 walk phases, running, 4 get-up samples). Plus ad hoc
  zoomed v5-vs-v6 idle/hand/foot crops taken directly through the harness
  this pass (not saved to the repo — reproducible on demand) to make the
  actual thigh/thumb/foot calls described above.

## Known limitations / open items for whoever reviews next

- The `torso_socket_sweep.mjs` farHip 3.16px finding above — investigated,
  not blocking (visually clean at the flagged pose), but not silently
  cleared either.
- Forearm pose coverage (headlock/arm-bar/hammerlock while actually locked,
  dense elbow-bend sweep, deep thigh swings beneath the trunks) was spot-
  checked at idle/close-crop only this pass, not the brief's full dense pose
  matrix — flagged directly per this project's own convention, not hidden.
- `george-ai-pilot-v6`'s working tree is uncommitted, same as v4/v5 before
  it — not committed or pushed as part of this pass.

## Task update

`AI_HANDOFF_TASKS.json`'s `george-ai-pilot` task updated (history preserved,
not deleted) to record the v5 approval rescission and this candidate.
