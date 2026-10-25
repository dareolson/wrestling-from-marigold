# PLAN: seamless rise → standing handoff (Opus plan, Sonnet executes)

2026-10-24 · Opus · base `b8b274b` (sellart + aftermath promoted to default)

Follows [PLAN_SUPLEX_RISE.md](PLAN_SUPLEX_RISE.md) T4.7, which found the problem. Read the T4.7
Progress line and the "One target missed" section of
[2026-10-24-claude-suplex-rise-g4.md](AI_HANDOFF_ENTRIES/2026-10-24-claude-suplex-rise-g4.md). Read nothing
else unless a task names it.

## Progress

(Executor: append one line per finished task: `T#.# <sha> <one-line result>`.)

- T1.1 (this commit) — `tools/debug/rise_handoff_probe.mjs` + `rise_handoff_pairs.py`; baseline `research/animation/rise-handoff-2026-10/baseline/` (handoff.json, 40 3x pairs). 8 rigs x 5 rise types x 2 facings x flags default/off. Forced rises (receiver put down in page, game's own `_startRiseUp`/`_startQuickRise`), stale `this.pose` = the pose a real suplex receiver carries (measured live). 839 tests.
- T1.2 (this commit) — `tools/debug/rise_handoff_attribution.mjs` + `rise_handoff_table.py`; `baseline/attribution.json` + `attribution.md` (full table, 8 rigs x 5 rise types, facing -1). Replication check: a controlled re-draw equals the game's first standing frame at 0.00 px. **Finding that changes the plan: the 31-35 px step Lou shows in T4.7 is the facing turn (H5), not a pose step.** `Wrestler.move()` re-faces a standing wrestler toward the opponent, and the receiver's rise is in `GROUNDED_FACING_LOCK`; the suplex thrower stands on the side the receiver sat up away from, so on the first standing frame `facing` flips -1 -> +1 and the whole figure mirrors (the live film shows it: facing -1 at 6533 ms, +1 at 6550 ms). Lou supine, same step with the turn taken out: back waist 3.01 / far shoulder 3.02 / far wrist 12.25 / head 3.02 px (with the turn: 31.33 / 18.03 / 44.94 / 4.32, the T4.7 numbers). Cause table (Lou supine-pain, facing -1, back waist / far shoulder / far wrist / head px): turn H5 31.3 / 18.0 / 44.9 / 4.3; H1 stale `this.pose` (rKnee .6, lLeg .1, rLeg .35 left by the suplex) 16.6 / 16.6 / 23.9 / 16.6 (it drops the hip 16.6 px); H2+H3 (rise end vs idle upright, hip 88 + `standingHipHeight` finish vs upright hip) 19.6 / 19.6 / 33.6 / 19.6; H4 overlays 0 at the swap (guard 0; the recovery copy moves only the near forearm, 36 px of sprite corner, 0 at every joint point). On Lou H1 and H2+H3 point opposite ways, so the net pose step is 3 px; on the other rigs they do not cancel: hip step at the swap (px, + = down) george-roster-v1 +18.5, thesz-roster-v1 +27.9, guido-roster-v1 +23.0, kowalski-roster-v1 +20.7, george +10.0, thesz-front3q-r1 -25.2 (not `_lockLimbJoints`, so no finish), thesz -0.03, Lou -3.0. Quick rise ends on FALLS key 0 (hip 88, no finish): hip step -38 (Lou), larger than the getting-up rise. Stop condition: not tripped (every pose cause is fixable in the last segment / at the swap); H5 is a turn-behaviour decision for Derek, not in scope here. 839 tests.
- T2.0 29beb12 — `tests/riseFixFlagOff.test.js` + `tests/fixtures/riseFixFlagOff.json`, committed before any src change: the pose each renderer is handed by `updateGetUp` (lock on/off, supine/prone, both facings, t = 0..1), by `updateFall` (every variant, p = 0..1), and what the swap does to the Wrestler (state, `this.pose`, `moveBlend`, the tweens it starts). 841 tests.
- T2.1 (this commit) — `?risefix=1` (`riseFixCandidate()` in `Wrestler.js`). `Skeleton.standingChannels(s, facing, pose)` solves, per rig + facing + scale (cached), the grounded channels for which `_applyGrounded` draws what `updateUpright` draws for `REST_POSE` (hips, knees, ankles, shoulders, elbows, wrists walked onto the upright render's points; `errPx` = what channels cannot reach). `_getUpPose(K, t, lock, hip, stand)` swaps the FINAL key for it, so only the last segment changes and the `standingHipHeight` finish is not stacked; `updateGetUp`, `updateFall` (quick rise: its t = 0 end) and `carriedRiseEndArm` take `stand`. The swap (`_standFromRise`): `tweenPose('idle', 0)` (the pose starts at REST_POSE, not at the stale pose the tween used to start from), `moveBlend = 0`, `_riseSwapAt`; `updateCombatBlend` skips the swap frame; the worn-wrestler sway fades in over 300 ms from the swap. Nothing before the last segment moves; no timers, durations or keyposes touched. `tests/riseFix.test.js` (10): solver recovers known channels on a stub FK rig (both facings, two scales), cache, last-segment-only blend (t <= K[-2].t identical, mid-segment is the straight blend, t = 1 is the stand), no hip finish on top, quick-rise end, carried arm solved on the new end, REST_POSE == `tweenPose('idle')`, the swap, the guard. The per-part step on real rigs is measured in the browser (T2.2): Node has no Phaser parts. 851 tests (carriedRise / standingBackHand unchanged and passing).
- T2.2 (this commit) — re-ran T1.1 with `risefix=1` (`fixed/handoff.json`, `fixed/table.md` from `tools/debug/rise_handoff_report.py`; baseline re-run with a new `supine-gait` case = floored mid-stride, `_standFromRise` now also zeroes `walkPhase`). Pose-only swap step, worst part, worst of both facings, before -> after (flags on = flags off): Lou 65.7 -> 0.65 (quick 92.6 -> 0.64, gait 43.7 -> 0.63); george-roster-v1 58.7 -> 2.55; george 56.2 -> 2.98; thesz-roster-v1 62.6 -> 0.68; guido 56.4 -> 2.26; kowalski 63.4 -> 0.85. **Two rigs miss the 3 px target: `thesz` 19.9 px and `thesz-front3q-r1` 25.5 px** (all rise types); `standingChannels` reports errPx 19.8 / 25.3 (shoulders/arms cannot reach the upright points with the grounded channels). Tried adding the torso pitch to the solve: worse (27 / 36 px, and a pop inside the last segment), reverted. Crops in `fixed/pairs/`. Lou's carried hand to backWaist: 0.141 px on the last rising and first standing frame (<= 1.23 over the next 9), both facings, with and without the turn; with sellart/aftermath off there is no carried hand (42 px is the unpainted contact, same as before the fix). With the turn (opponent behind) the drawn step is 55.7-61.8 px on Lou (was 83-105), 41-52 px on other rigs: the mirror, not the pose (H5, not changed). Natural (frame-to-frame) step in the rise <= 1.04 px. `fixed/shots/` raw captures (24 MB) left untracked. 851 tests.
- T3.1 (this commit) — `research/animation/rise-handoff-2026-10/viewer.html` + `README.md` + `g5/` (1115 downscaled WebP frames, 9.3 MB; regeneration commands in the README). `tools/debug/rise_handoff_film.mjs` (forced rises, 1/60 s stepping, 250 ms before the swap to 400 ms after, both facings, default vs `risefix=1`; per-frame part step with the mirror removed) feeds `g4_package.py`, extended with `--configs/--scenarios/--out/--var/--t0/--max-w` (no fork; with no options it still writes the G4 package). Rows: Lou suplex receiver (thrower behind: turns), Lou back, Lou front, Lou quick rise, George back, George front, George thrower-behind (turns). Swap-frame numbers in the film equal the probe's (Lou 65.7 -> 0.63, George 58.7 -> 2.55). Raw `g5-film/` (26 MB) and `fixed/shots/` left untracked.

## Goal

On the frame a wrestler goes from `gettingUp` (or `risingUp`) to `standing`, no body
part jumps. Today Lou's whole body steps 31–35 px at the back waist, 18–20 px at the far
shoulder, and 45–50 px at the far wrist in one frame. That happens in every flag configuration,
including the old default. Target: **every part moves ≤ 3 px** across the swap, for every
rise type, rig and facing. Derek judges the motion at 1× (gate G5).

This is a **continuity fix, not choreography**: the shape of the rise stays as authored.

## Ground rules

- **Node 22 only.** `export PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH` in every shell.
  Dev server `127.0.0.1:5173` (`WFM_URL`). macOS has no `timeout`.
- The fix goes behind **`?risefix=1`** until Derek approves at G5. Without it the game is
  unchanged. Prove that with a test, the way `tests/sellArtFlagOff.test.js` does.
- `sellart`/`aftermath` are default-on (`b8b274b`). Measure with them on (the default) and
  with `sellart=off&aftermath=off`. The D5 carried hand must stay on the back across the swap:
  hand-to-backWaist ≤ 1 px on both frames, as T4.7 measured.
- No changes to rise durations, timers, damage, input locks, or the shape of any keypose
  before the last one. Do not touch fall clips, move clips, figure four, hammerlock, or art.
- One local commit per task on `story/marigold-opening`; check `git branch --show-current`.
  **Do not push.** Stage only your files: Codex's uncommitted `AI_HANDOFF.md`,
  `MOVE_REFINEMENT_METHOD.md` and `MOVE_PIPELINE_EVOLUTION.md` edits stay unstaged.
- Report measurements, never "reads well". Derek judges pictures.

## 1. What Opus read (unverified, so T1.1 must confirm or reject it)

The swap, `Wrestler._startRiseUp` `onComplete` (`src/Wrestler.js`): `state = 'standing'`,
`_painRecovering(...)`, then `tweenPose('idle', 150, 'Linear')`. So the first standing
frame is drawn by `updateUpright` from **whatever `this.pose` holds at that moment**, tweening to
idle over 150 ms. The last rising frame is drawn by `Skeleton.updateGetUp(... t = 1)`, from
the final key of `GETUP_POSES` (which `GETUP_SUPINE_POSES` shares), through `_applyGrounded`,
plus a `standingHipHeight` finish on `_lockLimbJoints` rigs. `_startQuickRise` swaps
the same way, from `updateFall` at `fallProgress` 0, with a 120 ms tween.

Candidate causes, in the order Opus would bet on them:

- **H1 stale `this.pose`.** `this.pose` still holds the pose from before the knockdown, or
  a move's last sample. The 150 ms tween starts from that, not from where the rise ended.
- **H2 two renderers disagree.** The grounded final key drawn by `_applyGrounded` and an upright
  pose drawn by `updateUpright` put the hip, torso, and limbs in different places, even for
  "the same" standing pose. The `GETUP_SUPINE_POSES` comment claims an identical handoff.
  Check it per rig.
- **H3 hip height.** The `standingHipHeight` finish (locked-limb rigs) vs the upright hip.
- **H4 overlays.** At the swap, `combatBlend`/guard, the aftermath `bend` ramp, lean/crouch/
  breathing in idle, and `_heightScale` all switch on.

## 2. Tasks

### Stage 1: diagnose (no src changes)

- **T1.1 `tools/debug/rise_handoff_probe.mjs`.** Reuse `aftermath_film.mjs`'s stepping
  (fixed 1/60 s `game.step`, pinned tween clock, seeded random). For each case, record the
  **last rising frame** and the **first 10 standing frames**: world x, y and rotation of every
  textured part (from `skeleton`'s images), `jointAttachmentPoints`, `this.pose`,
  `combatBlend`, the recovery weights, and `riseT`/`fallProgress`. Cases:
  - Rise types: supine `gettingUp` (suplex receiver), prone `gettingUp` (a move that leaves
    the receiver prone; find one in `play.mjs` scenarios, or force `lying = 'prone'` in
    page before the rise), and quick rise (`risingUp`, supine and prone, if a scenario or the
    possum path reaches it; otherwise force it in page and say so).
  - Rigs: `thesz-procreate-v1`, `george-roster-v1`, `thesz`, `george`, plus any other
    preset in `PRESETS` (`src/scenes/Arena.js`) that can be a receiver. List the ones you skip and why.
  - Both facings; flags default and `sellart=off&aftermath=off`.
  Output `research/animation/rise-handoff-2026-10/baseline/handoff.json` + one 3× crop pair
  (last rising | first standing) per rig × rise type.
- **T1.2 Attribute the step.** For Procreate Lou supine (the T4.7 case), split the
  per-part step into H1–H4 by controlled re-draws in a paused scene: draw `updateGetUp(t = 1)`;
  draw `updateUpright` with (a) the actual `this.pose` at the swap, (b) a fresh `idle` copy,
  (c) (b) with guard 0 and recovery off. The differences between these attribute the step.
  Repeat the split for George and one rise of each other type. Write a table: case × cause →
  px at back waist / far shoulder / far wrist / head. Commit tool + JSON + table in the
  Progress line.

**Stop after T1.2 and report** if the attribution says the step can only go by changing
the *shape* of a keypose other than the last one (e.g. the crouch key itself is far from any
standing pose). That is Derek's choreography call.

### Stage 2: fix behind `?risefix=1`

Choose the fix from T1.2's attribution. The intended shapes:

- **For H1:** at the swap, `this.pose` must start the tween from the pose the rise
  ended in. Write the upright channels equivalent to the rise's t = 1 frame into
  `this.pose` before the first standing draw, then tween to idle as now. Converting needs
  the same grounded → upright mapping D5 used (`Skeleton.carriedRiseEndArm`,
  `localFlexFromChildAngle`), extended to every channel. Only if that conversion is
  impractical: write idle into `this.pose` at rise start, so the tween is a no-op.
- **For H2/H3:** the last segment of the rise (second-to-last key → t = 1) converges on the
  rig's *own* upright idle geometry. Compute once per rig + facing + scale (cache on the
  Skeleton, like `_plantPlan`) the grounded channels that reproduce `updateUpright(idle)`.
  Then blend the final key toward them across the last segment, so that t = 1 draws exactly
  what the first standing frame draws. Earlier keys are untouched.
- **For H4:** the overlays must ramp from 0 at the swap (most already ramp). Fix any
  overlay that enters at full weight. The D5 carried hand is the exception: it enters at full
  weight on purpose, and stays as is.

- **T2.1 Implement** behind `riseFixCandidate()` (`?risefix=1`, next to `plantCandidate()`).
  Tests: (a) for each rig fixture in the existing tests, the swap step ≤ 3 px for every part,
  supine and prone, both facings (unit-level: `updateGetUp(t = 1)` vs the first
  standing `draw()`); (b) without `risefix`, poses are identical to before (snapshot written
  **before** the src change and committed first); (c) `carriedRise.test.js` and
  `standingBackHand.test.js` pass unchanged; (d) `riseT` 0 and mid-rise poses are unchanged.
- **T2.2 Film.** Re-run T1.1 with `risefix=1`. Report the max per-part step per case
  (target ≤ 3 px) and the D5 hand-to-backWaist on the swap frames (≤ 1 px). Report any case
  that misses, with crops; do not retune keyposes. Commit.

### Stage 3: G5 package, then STOP

- **T3.1** `research/animation/rise-handoff-2026-10/viewer.html` + `README.md`. Build them
  from `tools/debug/g4_package.py` (reuse it; do not fork it if a parameter will do).
  Columns: default (no fix) | `risefix=1`. Rows: Lou supine, Lou prone, George supine,
  George prone, one quick rise. Both facings, 1× and 0.5×, scrub, and a jump button to
  the swap frame. Committed downscaled frames: report the size and keep it under ~10 MB.
  The README lists the regeneration commands.
- **T3.2** `AI_HANDOFF_ENTRIES/2026-10-2x-claude-rise-handoff-g5.md`: cause table, what
  changed, before/after steps per case, any misses first, what is not claimed. Commit.
- **STOP. G5 questions for Derek:** (1) At 1×, is the stand-up seamless now, with `risefix=1`
  vs default? (2) Any rig or rise type that still pops? (3) Promote `risefix` to default?
  (4) **The facing turn (H5, out of scope here):** a wrestler who stands up facing away from
  the opponent mirrors to face them on the first standing frame. That is Lou's 31–35 px in
  T4.7. Options: leave it; turn over a few frames; or choose the sit-up direction at rise start
  so he stands up already facing the opponent. The G5 viewer must show at least one
  `turn` case (opponent behind), default vs `risefix=1`, so Derek can judge it at 1×.

## Resume note (Opus, 2026-10-24)

Session 1 ended during T2.2, most likely out of context. At handover the tree held
uncommitted, unverified work: `_standFromRise` resets `walkPhase` (+ its test line), probe
and `g4_package.py` edits, a re-run `baseline/` (a new `supine-gait` case), an incomplete
`fixed/shots/` with no `handoff.json`, `viewer.html`, `rise_handoff_film.mjs`, and
`rise_handoff_report.py`. The resuming session treats all of it as a draft: verify it, keep
what is right, and commit it under the task it belongs to.

## 3. Suggested session

One Sonnet session: T1.1 → T1.2 → T2.1 → T2.2 → T3.1 → T3.2, unless the Stage 1 stop trips.
