# Plan: figure-four tableau and suplex aftermath (audit Stages 0–4)

2026-10-22 · Claude (Opus), plan only · executor: a Sonnet session ·
branch `story/marigold-opening`

This plan implements Stages 0–4 of [MOVE_PERFORMANCE_AUDIT.md](MOVE_PERFORMANCE_AUDIT.md).
Read that file's figure-four performance sheet before T1.1. Also read
[MOVE_REFINEMENT_METHOD.md](MOVE_REFINEMENT_METHOD.md) "Rig facts that bite" and
"Commands". Nothing here is implemented yet.

## Progress

2026-10-22 · Claude (Sonnet)

- Docs committed: `8b03ad3`.
- T0.1 done: `cf3cc0b` (`figureFour` and `figureFourP2` scenarios, both PASS; `play.mjs all` 32 PASS).
- T0.2 done: `3f8c67a`. Baseline in `research/animation/move-performance-baseline/`.
  **Correction 1 is confirmed and sharpened:** depth is constant over the whole
  figure-four clip, parts interleave by sub-band, and the 10 exact cross-actor
  ties fall to display-list order, which always puts P2 in front of P1. The
  trap therefore draws differently with George as P1 and as P2.
- T2.1 done: `2ccb562` (`src/animation/clipLayers.js`, `tests/clipLayers.test.js`).
  Tie step 0.000005 is applied to every part of each later `layerTie` role;
  windows then stack on top of it.
- T4.1 done (`_pain` replaces `_sellTag`). Deviations: figureFour has **no
  `sell.limb` yet**, because the T1.1 ledger that names the grabbed leg doesn't
  exist; add it in T1.1. Pickup is detected in `_tickPain` (left the mat other
  than by rising after this trip's sells were planned), not at each executor.
  Match reset and scene shutdown call `clearPain()` from `Arena.js`.
- 2026-10-22 · Claude (Sonnet), second session: T2.2 `7169892`, T1.1 `0d4b3f9`, T1.2 `7937d6b`,
  T2.3 `2577a9c`, T2.4 (this commit; the G1 package is in
  `research/animation/figure-four-tableau/g1/`). **Stopped at ⛔ G1.** Results and
  open failures (left-facing and roster trap contacts) are in
  `research/animation/figure-four-tableau/LEDGER.md`.
- 2026-10-23: **Figure-four track PARKED by Derek** ("revisit it later"). G1 was never approved;
  the tableau is v3 (`064b4eb`) and the ledger has the v2/v3 notes and the failing left-facing/roster
  contacts. Stage 3 stays unstarted. The shared machinery (clipLayers, critic seg:/tol, editor
  layering, `_pain`) is done and reusable. Stage 4 (suplex aftermath) does not depend on G1.
- 2026-10-23: Claude (Sonnet), Stage 4: T4.2 `eea8ca1` (measured `groundedSlot`, `sideSwap`; NOT flagged),
  T4.3 `84dc620` and T4.4 `cad833f` (both behind `?aftermath=v2`; flag read only in Wrestler.js, no Arena
  registration needed because it registers no clip), T4.5 film + stills in
  `research/animation/aftermath-g3/` (README there). **Stopped at ⛔ G3.**

## Ground rules for the executor

- **Node 22 for everything.** `source ~/.nvm/nvm.sh && nvm exec 22 npm test`.
  Default node may be 25 and `tools/env/require-node.mjs` rejects it. For tools,
  use `N=$(ls -d ~/.nvm/versions/node/v22.*/bin | tail -1); export PATH=$N:$PATH`.
- **Do not touch:** `hammerlockWip.js`, `hammerlock*.js`, `suplex.js`,
  `author_suplex.mjs`, `figureFour.js`, `author_figurefour.mjs`,
  `drafts/figurefour.json`, any art. All new choreography goes in new files.
  The live figure four stays the default.
- **Comparisons sit behind URL flags.** Copy the `?dropkick=v2` pattern
  (`src/Wrestler.js:57`, `:1665`; registered in `src/scenes/Arena.js:22`).
  Defaults change only after Derek approves.
- **Keep damage and timing.** Figure four stays 4.1 s with `squeeze` at 2.0,
  2.6 and 3.2 and `STAMINA_DRAIN.figureFour = 8`. Do not change
  `DOWN_SEC`, the suplex, eligibility or Arena hold rules.
- **Commits.** Make one commit per task. `npm test` must be green before every
  commit. Never push. Commit messages end with the Co-Authored-By line.
- **Green tests are not visual approval.** At a **⛔ DEREK GATE**, stop and send
  him the listed footage. Don't start later stages that depend on it.

## 1. Verified current state

I confirmed everything below by reading the source at 5f52e2d.

| Fact | Where |
|---|---|
| The figure-four clip is 4.1 s with 3 `squeeze` events. It has no `grips`, no `floorContacts`, and the entry keys use inert `lean`. Both actors are staged at `transform.y = 0` throughout (attacker x 0→60, defender x 150). | `src/animation/clips/figureFour.js`; generator `tools/move-editor/author_figurefour.mjs:29-77` |
| The critic has no `figureFour` spec, and `specFor` silently returns `{}`. | `tools/move-critic/specs.mjs:72` |
| figureFour, ankleLock and armBar all go through `_playPairedThrow` with `hitEvent: 'squeeze'`. Cancel → `other._layOnBack(DOWN_SEC)` / `this._standBackUp()`. None of them enter Arena's sleeper/headlock tick loops. | `src/Wrestler.js:1723-1762`, `:1808-1836`; Arena `_tickSleeper`/`_tickHeadlock` at `src/scenes/Arena.js:3453-3455` |
| `_hurt(amount, moveId)` drains and sets `_sellTag = moveId`. `_tickSell` reads `MOVE_SPECS[tag].sell` = `{part, intensity}`. Nothing records a side or limb. | `src/Wrestler.js:1545-1548`, `:946-977` |
| The `economical` sell style is `{none: 0.3, clutch: 0.7}`. `planSells` returns `[]` for `none` or when the sell doesn't fit. Intensity only scales `amp`. | `src/animation/sells.js:173-205` |
| The supine knee clutch always targets `nearKnee` and lifts `nearThigh`. Clutch targets are render slots, not limbs. | `src/animation/sells.js:28-35` |
| The rise clears the sell (`_sell = _sellTag = null`) and ends in `tweenPose('idle')`. No protective behaviour carries past the rise. Wooze only applies below stamina 35. | `src/Wrestler.js:2268-2286`, `:2510-2513` |
| Wrestler depth is `12 + y*0.03`, set **every frame** in `draw()`. Parts sit in sub-bands from base−0.00001 to base+0.00402. All sub-depths are multiples of 0.00001. Parts are root-level `scene.add.image` objects, so a cross-actor `setDepth` works. | `src/Wrestler.js:2416-2419`; `src/Skeleton.js:687-738`, `:325` |
| Grips already accept `Ankle` and `Knee` as partner joints. The runtime re-solves them after draw (arms only). | `src/animation/AnimationClip.js:131`; `MoveRuntime.afterDraw` `:174-190`; `Wrestler.holdGrips` `:537-567` |
| The critic's contacts take any joint as source/target, plus `part:<name>` (the painted centroid). There is no segment target. | `tools/move-critic/metrics.mjs:189-244` |
| `lChannelSide(facing)` maps the `l` pose channels to the near/far slot per rig. It is the one existing anatomical→render mapping. | `src/Skeleton.js:1050-1054` |
| The `stage` constraint in `stage.mjs` can put any partner joint on a target, so legs too. | `MOVE_REFINEMENT_METHOD.md` step 4 |
| Arena's `logMove` comment says "every move that landed this frame". It logs start return values. | `src/scenes/Arena.js:3403` |

### Corrections to the audit

1. **The game doesn't layer whole bodies when staging ties depth. The editor
   does.** Figure four stages both actors at the same `y`, so both wrestlers get
   identical base depth. Their parts then interleave **across actors by
   sub-band**: the defender's near thigh (base+0.003) draws over the attacker's
   torso (base+0.001), and the attacker's far leg draws under the defender's
   torso. Exact ties (both near thighs, for example) fall to display-list order,
   so the layering probably depends on which player slot George is in. The move
   editor instead adds `+0.01` to the attacker (`tools/move-editor/move-editor.js:131`),
   which puts the attacker entirely in front. **The editor preview, critic strips
   and Codex's 2026-10-18 pose sheet do not show in-game layering for this
   move.** T0.2 measures this. Treat the P1/P2 dependence as unverified until
   then.
2. **Leg-contact measurement mostly exists already.** The critic measures
   ankle/knee contacts today. The gaps are a figureFour spec, a target on a limb
   *segment* (an ankle lies across a shin, not on a joint), and naming limbs by
   anatomy. The audit's "named leg contact measurement" is a small critic
   extension, not new runtime.
3. **Whole-body front/behind swaps already have a seam.** The suplex staging
   moves the defender's `transform.y` (0 → 4 → −6). Only per-part,
   cross-actor order is missing.
4. Confirmed: staggers are five tiers and use `bend` (`src/animation/staggers.js`).
   I did not verify the 29/17/12 move count.

## 2. Design decisions

### D1. Cross-actor depth: clip-scoped `layers`, applied per frame after draw

**Recommendation.** Add an optional clip field:

```js
layers: [
  // back → front. Discrete: holds from `from` up to (not including) `to`, like `parts`.
  { from: 1.30, to: 3.55, order: [['defender','rLeg'], ['attacker','lLeg'], ['defender','lLeg']] },
],
layerTie: ['defender', 'attacker'],   // optional: breaks exact sub-depth ties, back → front
```

- **Limbs use anatomical names:** `lLeg | rLeg | lArm | rArm | torso | head`.
  A leg is its thigh, shin and boot. An arm is the upper arm, forearm and hand.
  `torso` covers the torso, trunks and the pelvis layers. Each limb resolves to
  near/far parts with that actor's `skeleton.lChannelSide(facing)` at apply
  time. That way identity holds through both facings.
- **Resolver.** Put it in a new pure module, `src/animation/clipLayers.js`:
  `validateLayers(clip)` and `layerDepths(window, actors) → Map(part → depth)`.
  It starts from the lowest current depth among the listed limbs and stacks each
  limb above the previous one by a fixed step (0.00002). It keeps each limb's
  own internal part offsets, so caps and the shin-under-thigh flag survive.
  Unlisted parts are never touched.
- **Where it runs.** `MoveRuntime.afterDraw()` runs after the grip pass, because
  `holdGrips` redraws and redraw resets depth. `layerTie` adds
  `index * 0.000005` to each role's parts. That only breaks exact ties because
  all sub-depths are multiples of 0.00001. This removes the P1/P2 dependence for
  clips that opt in, and leaves every other clip byte-identical. The approved
  suplex is not affected.
- **Teardown is automatic.** `Wrestler.draw()` resets every depth each frame.
  On the first frame after cancel or complete, the overrides are gone, with no
  cleanup code. A test pins this property.
- **Validation in `validateClip`:** roles need tracks, limbs must be known names,
  the window must lie inside the clip, a chain can't list a limb twice, and
  overlapping windows must not contradict each other. Build the pairwise graph
  and reject cycles.
- **The editor uses the same resolver.** In `move-editor.js`, after both actors
  render, call `layerDepths` for the current time. For clips declaring
  `layerTie`, replace the `+0.01` with the tie rule. Without this the critic and
  the strips keep showing a different picture from the game.

**Alternatives I rejected:**
- A global tie-break change: it alters every same-y paired move in game,
  including the approved suplex.
- Sorting by screen y every frame: it flickers and can't express an authored
  crossing.
- Splitting a segment or masking it: that's only needed if one segment must be
  both over and under. Handle that per D2's stop rule. Don't build it upfront.
- A general render-graph rewrite.

**Why existing pieces can't do it.** `transform.y` moves whole bodies. The
per-rig flags (`_farLegOverTorso`, `_shinUnderThigh`) are fixed per character
and can't refer to a partner.

### D2. Leg contacts: declared in the critic, measured offline, not solved at runtime

- **The contact ledger lives in the critic spec**, not the runtime clip. Contacts
  in `specs.mjs` gain:
  - an optional `tol`, as a fraction of body height. The default is today's 8%,
    but the trapped-ankle contact should be tighter (start at 5%).
  - `kind: 'purchase' | 'trap' | 'brace' | 'support'`, for reports only.
  - a segment target, `seg:<jointA>-<jointB>`: the distance from the source to
    the nearest point on that drawn segment.
- **Anatomical names in specs.** `sample.mjs` records each actor's
  `lChannelSide(facing)` in the trace meta. `metrics.mjs` then resolves `lAnkle`,
  `rKnee` and `seg:lKnee-lAnkle` to near/far before measuring. Near/far names
  keep working as before.
- **Hand purchase uses the existing runtime grips** (`to.joint: 'Ankle'`). No new
  code.
- **No runtime leg solve in this plan.** It's needed only if T3.3 measures a trap
  residual over `tol` on a supported cast. In that case, the first fix is
  per-rig staging data (a `rigProfile` offset, as the crown uses). A solver comes
  only after that, with justification.
- **Stop rule (from the 2026-10-18 strategy).** Sometimes no valid joints within
  limits can make the still read, or one segment must be both over and under.
  Then stop and record the obstructing role, segment, time and desired view as
  donor evidence. Don't force joints and don't build a mask system.

### D3. Pain context: `Wrestler._pain`, replacing `_sellTag`

```js
this._pain = { source: 'figureFour', part: 'knee', limb: 'lLeg' | null,
               severity: 0..1, phase: 'mat' | 'rise' | 'recover', until: <scene ms> }
```

- **Set by** `_hurt(amount, moveId, { limb } = {})`. `part` and `severity` come
  from registry `sell.part` / `sell.intensity`. `limb` comes from the new optional
  registry field `sell.limb`, which the executor can override. The latest
  confirmed hit replaces the previous one. Only confirmed hits call `_hurt`, so
  the "interrupted move never sells" rule still holds.
- **Lifecycle.**
  - `'mat'` while down: `_tickSell` plans the sells from it, once per trip.
    This replaces the `_sellTag` read and clear.
  - `_startRiseUp` / `_startQuickRise` → `'rise'`: the context is no longer
    cleared there.
  - Rise complete → `'recover'`, with `until = now + 2500 ms × severity`.
  - Cleared at expiry, on the next `_hurt`, on pin, pickup or match reset, and
    in `shutdown`.
- **The limb uses anatomical identity** (`'lLeg'`). The grounded near/far slot
  is resolved only when sampling, by
  `groundedSlot(limb, facing, lying, skeleton)` in `sells.js`. Its truth table
  (both facings, both lyings, before/after a roll) has to be **measured, not
  derived**: draw the grounded rig with `lLeg`'s thigh offset and see which slot
  moves.
- **This is visual continuity only.** No localized damage, no stun, no change to
  `stateTimer`.

**Rejected:** a separate injury/health subsystem; putting the limb only in the
clip. The registry is already the home of the sell data and is cross-checked
against executors.

### D4. Compact fallback and protective recovery without extending lockout

- **Fallback, in `planSells`.** If `severity ≥ 0.6` (this decides "substantial")
  and the plan comes out empty — because `none` was picked or the chosen sell
  doesn't fit — plan a **compact clutch**: the same clutch keys, 0.55 s × pace,
  aimed at the limb's slot. If even that doesn't fit the budget, plan nothing:
  the budget is the down timer, which doesn't change.
  - Economical `none` stays possible below 0.6.
  - Personality stays: economical gets a short tight clutch, theatrical gets its
    chain.
- **Protective recovery** is a pose overlay in `Wrestler.draw()`:
  - It applies only while `_pain.phase === 'recover'`, `state === 'standing'`,
    and `!_choreoOwnsPose()`.
  - It works like the existing wooze: offsets go into a **copy** of the pose
    passed to `updateUpright`, and `this.pose` is never mutated. The weight
    ramps in over 0.2 s and decays to 0 by `until`.
  - Motifs only for the two pilots:
    - `knee`: hurt leg's knee +0.15, opposite leg takes weight, `crouch` +0.05.
    - `back`: `bend` +0.12, slower settle.
  - **Input is never blocked.** The overlay is gone the moment any move, stagger
    or tween claims the pose.
- **Get-up keyposes stay as they are in this plan.** The rise already scales
  with stamina. A limb-specific rise is a G3 question.
- **Everything in D4 sits behind `?aftermath=v2`** until Derek approves, because
  it changes every move's mat look.

## 3. Ordered tasks

Each task gets one commit, with `npm test` green (Node 22).

### Stage 0: evidence baseline

**T0.1 Figure-four play scenarios.**
- Files: `tools/debug/play.mjs`.
- Change: add `figureFour` (George P1 attacking a downed Procreate Lou, facing
  right) and `figureFourP2` (roles in slots swapped, facing left). Model them on
  `kneeDrop` (`:372`) and the `suplex`/`suplexReverse` pair (`:244-259`).
  `expect: { move: 'figureFour' }`.
- Done: both PASS in `play.mjs all`.

**T0.2 Baseline reel and depth dump.**
- Files: new `research/animation/move-performance-baseline/README.md` plus media.
- Film both new scenarios, `suplex` and `suplexReverse`, at normal speed and at
  `WFM_TS=0.2`. Each runs from the trigger through control resumption plus 2 s.
  Cast `p1/p2 = thesz-procreate-v1/george`.
- At t = 1.6, 2.6 and 3.4 s, `page.evaluate` a dump of every part's `.depth` for
  both wrestlers, in both scenarios. Record the commit, URL and flags.
- Done: the README states whether the locked-frame cross-actor part order
  differs between P1 and P2. That confirms or refutes correction 1.

### Stage 1: lock the trap

**T1.1 Ledger and crossing list (docs only).**
- Files: `research/animation/figure-four-tableau/LEDGER.md`.
- Name the four legs by channel: receiver straight leg, receiver crossed leg,
  George's trapping leg and George's bracing leg, each written as `lLeg`/`rLeg`.
- List each contact (purchase hand→ankle; trap ankle→`seg` of the shin; brace),
  with its kind, window and `tol`.
- List each crossing as a back→front chain, by beat. It becomes the clip's
  `layers`.
- Use Derek's decision 1 (§5): classic Flair; the grabbed leg is the hurt leg.
  Done: every leg and crossing has a name and a time.

**T1.2 Locked tableau draft.**
- Files: new `tools/move-editor/author_figurefour_tableau.mjs`,
  `tools/move-editor/figurefour_tableau.constraints.mjs`,
  `tools/move-editor/drafts/figurefour-tableau.json`.
- A 1.0 s static draft holding only the locked pose: no rocking, no free-arm
  acting. Not exported to `src/`.
- Stage it in order: pelvises, thighs, calves/boots. Use the `stage` and `plant`
  constraints. Use `bend`, never `lean`.
- Run `tools/debug/joint_direction_audit.mjs` (or the critic's reversal check)
  on it.
- Done: there are no knees past their limit, and the critic contacts (after T2.2)
  are within `tol` on Procreate Lou vs George. If D2's stop rule fires, record it
  and stop the figure-four track. Stage 4 can still go ahead.

### Stage 2: minimum shared machinery

**T2.1 `clipLayers.js` and validation.**
- Files: new `src/animation/clipLayers.js`; `AnimationClip.js` (call
  `validateLayers`; compile the frozen `layers`/`layerTie`); `MoveRuntime.js`
  (`afterDraw` applies the active windows after grips).
- Tests: new `tests/clipLayers.test.js`. Use stub skeletons built with the
  `image()` stub from `tests/pelvisLayering.test.js`, plus `lChannelSide`.
  1. A declared chain holds in both facings, and each limb keeps its internal
     offsets.
  2. Unlisted parts are unchanged.
  3. A contradictory overlap, an unknown limb or a role without a track is
     rejected.
  4. `layerTie` resolves exact ties only.
  5. After cancel and after complete, the next `draw()` restores the defaults
     (use a stub Wrestler whose `draw` calls the real `Skeleton.prototype.setDepth`).
  6. A clip without `layers` is byte-identical. Assert that the suplex's depths
     are unchanged.
- Done: tests green; all existing clips still compile.

**T2.2 Critic: segment target, anatomical names, per-contact tolerance.**
- Files: `tools/move-critic/sample.mjs` (record `lSide` per actor in the meta),
  `tools/move-critic/metrics.mjs` (`seg:` target, `l*/r*` resolution, `tol`,
  `kind` in report rows), `tools/move-critic/report.mjs` (print the worst frame
  per contact).
- Tests: a pure-metrics unit test on a hand-built trace:
  - segment distance;
  - `lAnkle` resolving to `nearAnkle` when `lSide = 'near'` and to `farAnkle`
    otherwise;
  - `tol` deciding pass/fail.
- Done: existing specs still report the same numbers.

**T2.3 Editor shows game layering.**
- Files: `tools/move-editor/move-editor.js`.
- After both actors render, apply `layerDepths`. Use `layerTie` instead of
  `+0.01` when the clip declares it.
- Done: for the tableau draft, the stub-test resolver and an editor
  `page.evaluate` depth dump give the same part order. Add the dump as a check in
  `tools/move-editor/smoke.mjs`.

**T2.4 Put layers on the tableau and still it.**
- Add `layers`/`layerTie` to the T1.2 draft.
- Render stills: overlays hidden, gameplay zoom (`--zoom 0.62`), facing right
  and left. Cast Procreate Lou vs George, then one roster pair (George-roster vs
  Lou-roster) through `--cast`.

> ⛔ **DEREK GATE G1: does the trap read?** Show Derek:
> - the 4 stills: 2 facings × the 2 casts, overlays hidden, plus the baseline
>   locked frame from T0.2 next to them;
> - one copy of each still with the leg labels.
>
> Ask whether he can point to the straight leg, the crossed leg, the trapped
> ankle, George's trapping leg and his support, **without the labels**. If not,
> iterate T1.2 and T2.4. Don't start Stage 3 until he says it reads.

### Stage 3: perform the hold

**T3.1 Candidate clip `figureFourV2`.**
- Files: new `tools/move-editor/author_figurefour_v2.mjs` + `.constraints.mjs`,
  `drafts/figurefour-v2.json`, `src/animation/clips/figureFourV2.js` (through
  `export_draft.mjs`). Register it in Arena next to `dropkickV2`. Add a
  `figureFourCandidate()` flag (`?figurefour=v2`) in `Wrestler._doFigureFour`,
  which picks the clip id.
- Author backwards from the locked tableau, following the audit's ten beats
  inside the same budget:
  - orient / purchase / thread / arrange / settle: 0 → ~1.6;
  - pressure pulses peaking on 2.0, 2.6 and 3.2, with resistance between them;
  - relieve ~3.4;
  - unwind 3.4 → 4.1.
- Duration is exactly 4.1, with `squeeze` exactly at [2.0, 2.6, 3.2].
- `grips`: George's hand on the receiver's ankle (`to.joint: 'Ankle'`) from
  purchase through thread.
- `layers`: change the order at the authored crossings from T1.1, including the
  unwind, where legs must not pass through each other.
- The defender's last key must hand off to `GROUNDED` supine without a pop. Check
  it with the critic's handoff metric or `move_participation_proof.mjs`.
- Done: draft, critic and export are green.

**T3.2 Tests: `tests/figureFourV2.test.js`.**
- The clip validates; the duration and squeeze times equal the baseline.
- Squeezes fire exactly once each at 30, 60 and 120 Hz and at dt = 0.25.
- Grips and layers validate.
- Executor tests use a stub scene like `tests/frontKick.test.js`, with a real
  `MoveRuntime` and `Wrestler.prototype._playPairedThrow`. Cancel at 0.5
  (purchase), 1.1 (thread), 2.3 (lock) and 3.6 (release), and check that:
  - `onCancel` runs, and no squeeze or `_hurt` comes after the cancel;
  - `_fixedHold` is false on both actors and `_activeMove` is null;
  - the defender is down and the attacker is standing;
  - there are no layer overrides on the next draw and no grip.
- Without the flag the live clip is used (assert the clip id).
- Done: green.

**T3.3 Grade and film.**
- Critic report against the new `figureFour` spec in `specs.mjs`. The spec
  carries the ledger contacts and grades the v2 draft. Add a test that every
  registered paired `HOLD`/`THROW` clip has a non-empty spec or sits on an
  explicit allowlist, so empty specs are never implicit again.
- `play.mjs` `figureFour`/`figureFourP2` with `WFM_QS=figurefour=v2`, at normal
  speed and 0.2×, in centre ring and near both ropes. Use Procreate Lou vs George
  first, then the roster pair.
- Record the worst-frame residual per contact, per cast. If a residual exceeds
  `tol`, apply D2: per-rig staging data first.

> ⛔ **DEREK GATE G2: the hold as a performance.** Show Derek:
> - baseline and v2 side by side, muted, normal speed then 0.2×, both facings;
> - the key-pose sheet (`poses_sheet.py`) at purchase, thread, locked, each
>   squeeze peak, relieve and unwind;
> - the critic table of contact residuals.
>
> Ask whether purchase, pressure, resistance and release read. Ask whether v2
> should become the default; that's his call, as with dropkick.

### Stage 4: carry the consequence

T4.1–T4.3 don't depend on G1 or G2, so they can run in parallel with Stage 1.

**T4.1 Pain context.**
- Files: `src/Wrestler.js`. Add `_pain`, replace `_sellTag`, and extend `_hurt`'s
  signature. Lifecycle as in D3, including the clears at `:923`, `:2271` and
  `:2291`. Registry: optional `sell.limb` (figureFour gets `limb` from the T1.1
  ledger). Extend the registry test so `limb` ∈ `{lLeg, rLeg, lArm, rArm}`.
- Tests: update the `downed()` stub in `tests/sells.test.js`.
  - Confirmed hit → `phase 'mat'`.
  - Rise → `'rise'`, then `'recover'` with `until`.
  - Expiry, a new hit and pin/pickup each clear it.
  - An interrupted move leaves `_pain` null.
- Done: all existing sell tests pass, with stub changes only.

**T4.2 Limb-aware clutch.**
- Files: `src/animation/sells.js`. Add `groundedSlot()` (measured truth table)
  and `sideSwap(spec)`, which mirrors the near/far keys in `d` and `hands`.
  `planSells` and `_sellPose` take `limb`.
- Tests:
  - The truth-table test: draw the grounded rig and assert which slot moves for
    each facing × lying.
  - The figure-four's trapped leg is the clutched leg in both facings and after a
    roll.
  - `limb: null` behaves exactly as today.
- Done: green.

**T4.3 Compact fallback.**
- Files: `sells.js` (`planSells`, the `compact` sell), behind `?aftermath=v2`.
  Pass a `compact` option from the Wrestler.
- Tests:
  - With the flag, `severity ≥ 0.6` with `rand` forcing `none` gives a single
    compact clutch, for both styles.
  - It never exceeds the budget.
  - A budget smaller than the compact sell gives nothing.
  - Without the flag, the plan is identical to today's for the same `rand`
    sequence.
  - Edit the tests at `tests/sells.test.js:51` and `:67` only for the flagged
    case, with a comment saying why.
- Done: green.

**T4.4 Protective recovery overlay.**
- Files: `src/Wrestler.js` `draw()`, as D4 describes, behind `?aftermath=v2`.
- Tests:
  - `this.pose` is unchanged after `draw()` (deep-equal before and after).
  - The overlay weight is 0 while `_activeMove` is set, while
    `_choreoUntil > now`, and outside `standing`.
  - The first frame after rise completes still accepts `tryStrike`/`tryPower`
    (same state, no added lock).
  - The weight is 0 at `until`.
- Done: green.

**T4.5 Suplex aftermath and figure-four aftermath film.**
- No clip changes. Film `suplex`/`suplexReverse` and
  `figureFour`/`figureFourP2` with `WFM_QS=aftermath=v2` (plus `figurefour=v2` if
  G2 approved it), and the same scenarios without the flag. Each runs from
  impact through rise plus 3 s.
- Also film one short-budget case: a figure four right before the down timer
  expires, if it can be set up. Otherwise use a unit test only.

> ⛔ **DEREK GATE G3: does the consequence read?** Show Derek:
> - flag off and flag on side by side, muted, normal speed: suplex P1 and P2,
>   figure four P1 and P2, each from impact through rise plus 3 s;
> - a still of the clutch on the trapped leg in each facing.
>
> Ask:
> 1. Is the right leg protected?
> 2. Is economical Lou still economical?
> 3. Does the favoring look hurt, or just stiff?
> 4. Should the rise itself carry the injury? That's a follow-up, not in this
>    plan.
> 5. Should the flag become the default?

## 4. Test and tooling strategy

- **Unit tests** (node:test, stub scenes and skeletons): `clipLayers.test.js`,
  `figureFourV2.test.js`, the metrics test, and the sells/pain extensions. Cover
  30, 60 and 120 Hz and dt 0.25. Cancel at purchase, thread, lock and release.
  Cover both facings and both role slots. Assert that the live figure four and
  the suplex are unchanged.
- **Critic:** the `figureFour` spec, with anatomical contact names, segment
  targets and per-contact `tol`. Report the worst frame. Never widen `tol` to
  pass.
- **play.mjs:** `figureFour`, `figureFourP2`, `suplex`, `suplexReverse`, with
  and without the flags; centre ring and rope-side.
- **Gates for every commit:** `nvm exec 22 npm test`. At the end of each stage,
  also run:
  - `npm run build`;
  - `move_participation_proof.mjs` (maxGap 0);
  - `play.mjs all` (all PASS).

## 5. Risks, questions for Derek, and what this plan does not build

**Risks**
- The trap may not read with the current art (D2 stop rule). Mitigation: G1
  comes before any Stage 3 work, and the stop produces donor evidence.
- The `lChannelSide` truth table differs per rig: Procreate/authored-leg rigs
  stay near, while the shipped rigs swap. Layers and pain must resolve per actor
  per frame, and the tests must cover both kinds of rig.
- Editor and game depths drift apart again. T2.3's smoke check guards this.
- Roster rigs: their proportions may break the contact residuals. Measure them
  in T3.3. Don't tune the clip for George alone; per-rig data goes in
  `rigProfile`.

**Decisions from Derek (2026-10-22)**
1. **Variation and hurt leg: DECIDED.** Use the classic Flair figure four. The
   leg George grabs at purchase is the hurt leg, and the receiver protects that
   leg afterwards.
2. **Economical with no reaction: DECIDED.** Allowed only for light hits
   (severity < 0.6). At 0.6 or above, there is always at least a compact clutch.

**Still open**
3. (At G2.) **Should v2 replace the live figure four?** If readable threading
   needs more than 4.1 s, make that a separate timing comparison.

**Not built in this plan, and why**
- Interactive submission, escape and rope-break (audit Stage 6): this is a
  gameplay and balance design question that needs its own review. The fixed
  sequence stays.
- Bespoke cancel and exit animations: the fixed hold is rarely cancelled
  mid-way, and teardown stays immediate. Add them with the interactive
  submission.
- A runtime leg-contact solver or IK chain: there's no measured need yet (D2).
- Render splits and masks, new donor art, hurt-face expressions (Stage 5): these
  wait for demonstrated failures at G1, G2 and G3.
- A semantic phase layer or second timing engine: the generator's `AT` table and
  the existing events are enough for one move.
- Rolling this out to armBar, ankleLock and the catalog: that waits for G2 and
  G3. armBar and ankleLock keep their current look.
- Get-up keypose changes, and `logMove` attempt-vs-confirmed outcomes: noted, but
  not needed by either pilot.

## 6. Suggested first Sonnet session (~1 sitting)

1. Check Node 22 and run `npm test` to get a green baseline. Read this plan's §1
   and the audit's figure-four sheet.
2. **T0.1**, then **T0.2**: scenarios, film and the depth dump. Commit both.
   This settles correction 1 with evidence.
3. **T2.1** (`clipLayers.js` + tests). It doesn't depend on Derek's answers and
   is the riskiest machinery. Commit.
4. **T4.1** (pain context). Pure plumbing with the defaults unchanged. Commit.
5. Stop and report the T0.2 depth findings. Derek has already answered Q1 and
   Q2 (§5). Next session: T2.2, T1.1, T1.2, T2.3, T2.4 → G1.
