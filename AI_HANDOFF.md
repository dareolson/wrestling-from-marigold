# AI Handoff — Wrestling from Marigold

Shared project notebook for Derek, Claude, and Codex.

## Protocol

- Read this file before proposing architectural or gameplay changes.
- Add new dated entries at the top of the Handoff Log.
- Identify the author as Derek, Claude, or Codex.
- Do not silently replace prior decisions; record what changed and why.
- Link focused commits and include test commands and results.

## Roles

- Derek: creator and art director
- Codex: technical lead and game-systems designer
- Claude: reviewer and technical director

## Priorities

1. Game feel
2. Wrestling psychology and match drama
3. Emergent storytelling
4. Architecture

Avoid a large rewrite.

## Active assignment — Codex: blueprint four input-invoked move animations

(Previous active assignment — B1 close-out: reversal foot-lock — completed and
feel-signed-off by Derek 2026-07-12; see the Handoff Log entries of that date.
Replaced here at Derek's direction 2026-07-14.)

Codex: design four new move animations for the current skeletons. Deliverable
is a **blueprint, not code** — precise enough that Claude can implement it
without making design decisions. Derek reviews the blueprint before any
implementation starts.

Requirements:

- Four moves, era-appropriate to the 1940s–50s golden-age repertoire (project
  priority: psychology and drama over flash).
- **Exactly four poses per move** for the attacker's animation. Poses use the
  existing `POSES` format (`Wrestler.js:59`): `{ lLeg, rLeg, lArm, rArm, lean,
  crouch }`, skeleton angle convention 0 = straight down. Sequence them in the
  existing `MOVE_DEFS` shape (`Wrestler.js:136`): `{ p, dur, e }` with
  durations in ms and Phaser easing names. Reuse existing poses where they
  genuinely fit; new poses need full joint values.
- **Input-invoked by a human player.** Specify the exact trigger for each move
  as button × context. No new physical buttons — the action set is grapple /
  power / finisher / run plus direction and context. Currently occupied:
  grapple → whip (standing), lockup (close), pin (downed), clothesline
  (runner); power → jab/headbutt (close), dropkick (medium), elbowDrop
  (downed), doubleAxeHandle (runner); finisher → sleeper (close), taunt (far);
  lockup follow-ups → down = headlock, power = armDrag, right = armBar,
  left = ankleLock. Flag any collision you're intentionally overriding.
- **Current skeletons only**: no new art, no new rig parts, no second-side
  texture keys, no entangled two-body drawn holds (those need bespoke art —
  out of scope). Defender reactions reuse existing sell/fall/stagger states
  and poses wherever possible; an essential new defender pose counts against
  that move's four.
- Per move, specify: name, trigger context, valid target state/range,
  the four poses (joint values), durations + easings, suggested damage/
  stamina/heat numbers, which kits get it (george / thesz / brawler), and
  optional AI-usage notes.
- Write the blueprint as `AI_HANDOFF_ENTRIES/<date>-codex-four-move-blueprint.md`
  plus a short dated log entry below pointing at it.

After Derek approves: Claude implements as focused commits (poses + MOVE_DEFS +
handlers + `debug:play` scenario coverage), verifying with `npm test`,
`npm run debug:play -- all`, and `npm run build` under Node >= 20.19.

## Clarifications

AI should eventually share authoritative range and move data with Wrestler, but AI
should not call `resolvePowerMove`; tactical selection and player move execution are
different decisions.

For Phase 1, prefer an instance seam such as `wrestler.setState(next, opts)` unless
the code clearly favors another design.

## Gorgeous George v1

The current rig expects six assets in `src/assets/wrestlers/george/`:
`head.png`, `torso.png`, `upper_arm.png`, `forearm.png`, `thigh.png`, and
`shin.png`. Expression and hand/foot swapping are not supported by the current
`Skeleton.js` and are not v1 requirements.

## Handoff Log

### 2026-07-15 (later) — Claude (correction: Derek was right, it's a pivot-crop mismatch, not the ink line)

Derek pushed back on my diagnosis in the entry below — suspected the
skeleton's and the art's pivot points didn't agree, rather than the ink line
I'd flagged. Checked it properly instead of re-asserting the original read.

The pipeline's own `pivotCrop` step logs exactly this: it centers each part
on the opaque x-center of its topmost 8 rows (the "pivot"), not the bbox
center, and reports the delta between them. Old (working) thigh: delta
-34.93px. New thigh: delta -13.68px — a 21px swing in source-canvas terms
(~12px once scaled into the final 150px-wide PNG). The shin's delta barely
moved (-23.30 → -22.50). So the new thigh's ink sits in a measurably
different position relative to its own top-row pivot than the old thigh
did — Derek's hypothesis, not mine, and the pipeline had already recorded
the evidence for it.

Tested directly rather than trusting the math alone: re-swapped the new
`thigh.png`/`shin.png` back in (same files as the rejected attempt below,
ink line and all, untouched) and nudged `legOffsetX` from -15 to -9 as a
compensating shift. **The visible notch disappeared completely** — same
shin art, same ink line, just a different thigh placement. That isolates
the cause: the pivot-crop mismatch was doing the damage, not the ink line I
originally blamed. The ink line may still be worth cleaning up (it's still
what's dragging the shin's cap-width QA metric to 59%, one point under
spec) but it was not what produced the notch.

Practical implication for future redraws, not just this one: `pivotCrop`
derives its pivot from ink-content shape, not a marker Derek places, so
*any* change to the thigh's silhouette near the top (waistband) rows will
shift this pivot and require re-tuning the offset knobs regardless of how
clean the art is — that's inherent to how the tool works, not something a
better drawing avoids. Reverted the test (`legOffsetX` back to -15, art
back to the working PNGs) — this was a diagnostic pass, not an adoption
decision. Derek: your call whether to adopt the new leg with a
`legOffsetX` retune now (ink line and all — it didn't visibly matter), wait
for a cleaner shin redraw first, or something else.

Files touched: `AI_HANDOFF.md` only (diagnostic note; art/offset changes
were tested and reverted within this session, not committed)
Action required: Derek — decide how to proceed on the leg art; the pivot
finding itself needs no further action from anyone.
Priority: medium

### 2026-07-15 — Claude (Thesz: new-leg-art attempt rejected with diagnosis; second rig-tuner export applied)

Two separate threads from the same session, both about Thesz's legs, neither
touching the mirrored-knee-tilt fix above.

**1. Derek's `Sprite sheets/newLegLou/` re-draw (UpperLeg.png + LowerLeg.png,
meant to add knee overlap "buffer") — tested and rejected, not committed.**

Ran it through the real pipeline rather than eyeballing source art: merged
the new leg pair with the unchanged head/torso/arms from `New Lou/` in a
scratch source dir, processed with `tools/wrestler-cutter/process-parts.mjs`
(temporary `theszLegTest` CHARACTERS entry, since removed — not committed),
then swapped the output into `src/assets/wrestlers/thesz/` and screenshotted
in-game. Result: a visible notch/gap at the knee, confirmed by the pipeline's
own automated QA (`capOk: false` — the shin's flattened cap measured 59% of
its max width in the final 150×230 canvas, below the 60% minimum; the
current shin sits at 65%). Reverted `thigh.png`/`shin.png` back to the
working versions immediately after the screenshot confirmed the regression —
nothing broken, nothing committed from this thread.

**Root cause, for whoever draws the next attempt:** the new thigh is simply
13px taller in source-canvas terms, but that doesn't help — the knee-overlap
amount the rig applies is a fixed pixel constant (`KNEE_OVERLAP`), not
derived from how much art exists, and the cutter's cap-flatten step
processes the shin in total isolation from the thigh. What actually broke
it: the new shin has an ink line (a knee-crease/shading stroke) intruding
into the top ~40-50px region the cutter treats as cap material, so that
region isn't the clean, flat, unlined, evenly-wide block the cap-flatten
step needs — it reads as a notch instead. Told Derek the target for a
re-draw: keep that top zone free of any ink line and evenly wide, matching
flesh tone, regardless of overall leg length.

**2. Derek's rig-tuner exports (using the *current*, unchanged leg art),
two rounds same session — applied, verified, this is what's live now.**

Round A:

```
// thesz.js — textures
headOffsetX: 3→4, headOffsetY: 10→9, legOffsetX: -11→-15,
nearShinOffsetX: -7→-24, nearShinOffsetY: 23→24, farShinOffsetX: 21→14
// Wrestler.js — POSES.theszIdle
lLeg: 0.06→-0.01, rLeg: 0.06→0.14 (lArm/rArm/lean/crouch unchanged)
```

Round B, same session, refining round A (theszIdle unchanged, not
re-quoted):

```
// thesz.js — textures
nearShinOffsetX: -24→-23, farShinOffsetX: 14→12, farShinOffsetY: 16→19
```

Final live values: `headOffsetX: 4, headOffsetY: 9, legOffsetX: -15,
nearShinOffsetX: -23, nearShinOffsetY: 24, farShinOffsetX: 12,
farShinOffsetY: 19`, `theszIdle: { lLeg: -0.01, rLeg: 0.14, lArm: 0.1,
rArm: 0.07, lean: 0.05, crouch: 0.05 }`. Applied verbatim both rounds,
comments updated in place (net cap-tuck math recomputed for both near and
far shin rather than quoting superseded numbers). Also fixed a stale comment
on `theszIdle` while in there — it still said "equal leg angles so the legs
stack," left over from before today's earlier far-leg-mirror-breaking pass;
the legs are intentionally unequal now (both visible), so corrected the
comment to match, no behavior change.

**Verified after each round (Node 25.8.1):** `npm test` 43/43, `debug:play
-- all` 12/12, `build` clean, rig-tuner `smoke.mjs` 16/16, plus a zoomed
in-game screenshot of both legs at idle after round B — near and far
thigh/shin connect with no visible seam. **Not Derek-signed-off in-browser
yet** — screenshot-verified only, same caveat as every prior rig-tuner
export.

Files touched: `src/characters/thesz.js`, `src/Wrestler.js`, `AI_HANDOFF.md`,
`BUILDLOG.md`. (`tools/wrestler-cutter/process-parts.mjs`'s temporary test
entry was added and removed within this session — not part of the diff.)
Action required: Derek — in-browser confirm the new stance/knee reads right;
whenever you take another pass at the shin art, the ink-line note above is
the specific thing to fix.
Priority: medium

### 2026-07-14 (later) — Claude (mirrored-knee-tilt fix landed — the facing-detachment bug from Codex's diagnosis below)

Implemented Codex's diagnosis and prescribed fix (entry directly below,
"knee connections break on facing changes") with no deviation from the
proposed correction.

**Fix (`src/Skeleton.js`, `updateUpright`):** all three per-character
render-angle tilts (`_nearLegTilt`, `_nearShinTilt`, `_farLegTilt`) were
applied screen-absolute; they now multiply by `facing`, matching the true
`thighAng`/`shinAng` bone chain's own mirroring. `_farLegTilt` previously
bypassed the global branch's `facing * RIG.FAR_THIGH_TILT` mirror entirely
when a character set it (Thesz does) — now both the override and the
global default go through the same `facing *` multiplication. Updated the
three comment blocks that described these knobs as "screen-absolute
clock-position" values to describe them as wrestler-local values mirrored
at render time, and corrected the farLegTilt comment's claim that it used
nearLegTilt's "screen-absolute convention." Existing tuned values
(george.js/thesz.js) are untouched — since facing=+1 (right) was the
convention already used while tuning, the fix is a no-op at facing=+1 and
only changes rendering at facing=-1, which is exactly the broken case.

**Verified (Node 25.8.1 via `/opt/homebrew/opt/node/bin`):** `npm test`
43/43, `npm run debug:play -- all` 12/12, `npm run build` clean,
`tools/rig-tuner/smoke.mjs` 16/16 — all unchanged from baseline, no
regressions. Visual check via `WFM_P1=george WFM_P2=thesz npm run
debug:shot -- 6` and the swapped-sides `WFM_P1=thesz WFM_P2=george`
variant: both characters' knees read clean and connected at both facings
(George facing right + left, Thesz facing right + left, all four
combinations covered across the two shots) — screenshots in
`tools/debug/shots/2026-07-15T04-1{1-58,2-18}.png`. Did not build the
rig-tuner facing-toggle parity smoke check Codex's entry suggested adding —
flagging as still open below, this session only shipped the game-code fix.

**Not done, explicitly out of scope for this fix:** the separate zero-margin
knee-cap seam Codex's four-frame game check still found mid-stride (a
different problem — the cap's own margin, not facing mirroring) still
needs Derek's planned art cleanup. `AI_HANDOFF_TASKS.json` updated:
`mirrored-knee-tilt-fix` marked done; `natural-walk-shuffle-prototype`
still blocked on `lou-knee-art-cleanup` (the art-side seam problem) but no
longer blocked on this fix.

Files touched: `src/Skeleton.js`, `AI_HANDOFF.md`, `BUILDLOG.md`,
`AI_HANDOFF_TASKS.json`
Action required: Derek — in-browser sign-off welcome but not blocking;
Codex — the facing-toggle rig-tuner smoke check from your review is still
unbuilt if you want to flag it as next.
Priority: medium (bug is fixed; remaining follow-ups are lower urgency)

### 2026-07-14 — Codex (locomotion direction: replace scissor walk; proximity-based wrestling shuffle)

Derek does not want the current open-ring walk preserved: the legs read as two
straight pieces scissoring through one another, and that motion does not make
sense for the wrestlers or the art style. This is a gait-system problem first,
not something to hide by drawing one leg permanently forward and the other
back. Distinct near/far leg art may improve depth later, but both images would
still follow the bad motion until the gait itself changes.

Approved design direction:

- **Open ring:** replace the current pendulum/scissor motion with a natural
  four-phase walk: contact, weight acceptance, bent-knee passing, and extension
  into the next contact. The swing leg must fold and pass underneath the body;
  it must not remain straight while rotating through the planted leg.
- **Approaching an opponent:** transition smoothly out of the normal walk as
  proximity closes.
- **Close range:** use a guarded, shorter wrestling shuffle with a lead/rear
  stance, soft knees, smaller foot travel, and no large centerline crossing.
- **Running / Irish whip:** preserve the existing separate locomotion path;
  neither normal-walk nor combat-shuffle tuning should leak into it.

Use the existing `combatBlend` proximity seam rather than adding a competing
distance state. It already rises as opponents close (and drives the upper-body
guard); extend it to select/blend lower-body gait intent. Avoid naive continuous
changes to stride length or stance bias while a foot is planted, because that
will reintroduce skating. Upper-body guard can blend immediately, but each leg
should adopt changed gait parameters during its swing/footfall transition and
hold them through the next planted phase.

The normal-walk replacement should include:

1. Separate near/far hip roots or an equivalent pelvis-depth separation instead
   of both leg chains reading as if they occupy one hinge.
2. A visibly bent swing knee during the passing phase.
3. Shorter forward reach and clear planted-versus-swing leg roles.
4. Subtle pelvis/weight transfer rather than two equal pendulums.
5. Preservation and direct measurement of the planted-foot world lock.

Potential later art support: allow distinct `nearThigh`/`nearShin` and
`farThigh`/`farShin` textures, falling back to today's shared `thigh`/`shin`.
These should be perspective/depth variants using the same joint conventions,
not artwork with permanent forward/back motion baked in. Do not scope that code
until the new gait silhouettes are established; otherwise Derek will be drawing
George's final legs against motion that is about to change.

Recommended order: (1) mirrored knee-angle fix from the entry below, (2) Lou
knee source-art cleanup, (3) natural-walk + proximity-shuffle prototype and
human feel sign-off, (4) decide whether distinct near/far texture keys are still
needed, then (5) George's final full-body/limb art pass and fresh rig tuning.
Old George offsets and display boxes were fitted to stretched art and should not
be preserved merely because they exist.

Verification for any gait implementation: instrument planted-foot slip; capture
both facings at contact/passing/extension key phases; cross the `combatBlend`
range in both directions without pops; test stopping, reversing, diagonal/depth
movement, crouched close-range movement, and entry into running/whip. Require
Derek's playtest before calling the motion accepted.

No code changed for this design note. It does not replace the active four-move
blueprint assignment unless Derek explicitly reprioritizes implementation.

Files touched: `AI_HANDOFF.md` only (design note)
Action required: preserve for the next locomotion/art-planning session; do not
continue polishing the current scissor gait as the final normal walk.
Priority: high for the next locomotion pass; sequencing remains Derek's call.

### 2026-07-14 — Codex (knee connections break on facing changes: per-character tilts are not mirrored)

Derek found a second reproducible knee issue after the live tuning session:
placing the legs correctly in one rig-tuner facing makes them detach again when
the preview flips, and the same separation appears in-game when a wrestler
turns. This is not a reason to add independent right/left tuning values yet.
The position offsets already use facing-relative coordinates; the render-only
leg tilts do not.

`Skeleton.updateUpright` currently computes:

```js
const nearRenderAng = near.thighAng + this._nearLegTilt;
const nearShinRenderAng = near.shinAng + this._nearShinTilt;
const farRenderAng = far.thighAng +
    (this._farLegTilt ?? facing * RIG.FAR_THIGH_TILT);
```

The true `thighAng`/`shinAng` bone chain mirrors when `facing` changes, but the
per-character tilt stays screen-absolute. For Thesz's near thigh, approximately:

```text
face right: +5.9deg bone - 5.5deg tilt =  +0.4deg render
face left:  -5.9deg bone - 5.5deg tilt = -11.4deg render
```

The knee endpoint follows the mirrored true bone while the art rotates to a
different relative angle, so the thigh and shin connection that was tuned in
one facing cannot survive the turn. George is affected too: his
`nearLegTilt: -15deg` and `nearShinTilt: -30deg` are currently applied with the
same screen-absolute behavior. Thesz also sets `farLegTilt`, which bypasses the
global branch's existing `facing *` mirror.

Recommended correction: define all per-character leg/shin tilts in wrestler-
local coordinates and mirror them at render time:

```js
const nearRenderAng = near.thighAng + facing * this._nearLegTilt;
const nearShinRenderAng = near.shinAng + facing * this._nearShinTilt;
const farTilt = this._farLegTilt ?? RIG.FAR_THIGH_TILT;
const farRenderAng = far.thighAng + facing * farTilt;
```

Update the `Skeleton.js` comments and rig-tuner labels/help text: these knobs
would no longer be screen-absolute clock angles; they would be local offsets
that mirror with the one mirrored PNG. Do not create separate facing values
unless the art pipeline later gains genuinely distinct left/right textures.

Verification must be visual as well as automated: render George and Thesz in
both facings at runtime idle, stride extremes, crouch, and representative move
poses; assert that hip/knee/shin origins and rotations reflect across the
wrestler centerline. Add a rig-tuner smoke/parity check that toggles facing and
compares the reflected transforms. Recheck the existing zero-margin Thesz shin
cap during walking: Codex's live four-frame game check still showed the hard
horizontal knee seam in parts of the stride, so the facing fix and Derek's
planned art cleanup solve related but distinct problems.

No code changed for this diagnosis.

Files touched: `AI_HANDOFF.md` only (diagnostic note)
Action required: Claude — review and implement the mirrored local-angle
semantics as a focused fix when available; Derek plans to clean the closed knee
outlines/cap in the source art next session.
Priority: high (visible knee detachment whenever either wrestler turns)

### 2026-07-14 — Claude (first live tuning session: Derek's values landed, knee-cleave root-caused with Codex, parity fixes shipped)

Same-day follow-up to the tool shipping (two entries below) — Derek drove the
tool for real, and the session turned into a joint debugging exercise worth
recording.

**What landed (commits `68f3e5f` values, `d755001` tool fixes):**

- Derek's rig-tuner exports applied to `george.js`, `thesz.js`, and `POSES`
  (`idle` + `theszIdle`). Thesz now stands with both legs visible (far leg
  forward) — this deliberately supersedes the 2026-07-13 hidden-far-leg
  lockstep; the lockstep derivation lives in git history if that look is
  ever wanted back.
- Codex's two preview-parity findings (its review entry directly below)
  fixed: character switch now lands on the character's RUNTIME idle pose,
  and liftScale defaults to the game's walking 0.5 (slider added).
  `george.js` `idlePose` aligned to `'powerIdle'` (runtime-neutral — Arena's
  PRESETS was already overriding it) so the character file is truthful for
  tools that read it.

**The knee-cleave incident, for the record.** Derek's first export re-cleaved
Thesz's knees. Codex found the mechanism (shin Y offsets cancelling the
KNEE_OVERLAP tuck: near cap = -18 - 5 + offsetY, so his 24 put the flat
shin cap +1px BELOW the true knee; the 2026-07-13 state had it -11px above)
and named the enabler: the tool previewed generic `idle` while the game
renders `theszIdle`, so Derek never saw the pose the game shows. My pixel
isolation (hide thighs / hide shins in the tool) confirmed it and added the
secondary factor: the thigh art's knee end carries a closed dark outline and
the shin's cutter-flattened cap has a hard edge, so the joint only reads
clean when the cap tucks well under the thigh ink — silhouette metrics can't
see any of this (2026-07-13's lesson, still true). Derek's third,
facing-corrected export lands the cap exactly AT the knee (0px tuck near,
-2px far) — visually verified clean at game scale in both facings
(`tools/debug/shots/2026-07-15T01-03-58.png`, plus `rigtune_A_*` zoom-3
close-ups saved there too). **The margin is zero, though**: any future
shin-down nudge re-exposes the cap. The knob comment in `thesz.js` now says
this — if the sole needs to go lower, grow `shin.box.h`, don't push
`ShinOffsetY` further.

**For Codex's follow-up list:** agreed on all five deferred items — your #5
(warn when a rendered seam's true-joint displacement exceeds a threshold)
would have caught this exact regression automatically and is the one I'd
promote to first when Derek prioritizes a rig-tool second pass. The art-side
option (unlined overlap zones on the thigh's knee end / a soft-faded shin
cap, either drawn or as a cutter post-step) would remove the zero-margin
problem entirely — parked as an art/cutter decision for Derek.

**Verified:** npm test 43/43, debug:play all 12/12, build clean, smoke.mjs
16/16 (Node 25.8.1) after each commit. **Derek was live in the loop and has
seen the tool renders, but the final committed state still needs his
in-browser sign-off** (he was iterating right up to the end).

Files touched: src/characters/george.js, src/characters/thesz.js,
src/Wrestler.js, tools/rig-tuner/rig-tuner.js, tools/rig-tuner/smoke.mjs,
AI_HANDOFF.md, BUILDLOG.md
Action required: Derek — confirm the committed stance/knee in-browser.
Codex — nothing; your review entry below is committed with this one.
Priority: medium

### 2026-07-14 — Codex (rig-tuner review: keep it; preview parity and art-connection follow-ups)

Reviewed Claude's shipped `tools/rig-tuner/` and the exported `P`/`TEX`/`RIG`
seam in `Skeleton.js`. The direction is sound: it uses the real runtime rig,
poses, character configs, and PNGs; keeps source writes manual; emits useful
diff-only exports; and stays out of the production bundle. Keep the tool. It is
already suitable for finding static joint values for the active four-move
blueprint, but two preview-parity issues should be fixed before treating leg or
locomotion tuning as authoritative:

- `rig-tuner.js` always passes `liftScale = 1` to `updateUpright`; the game uses
  `0.5` while walking and `1.0` only while running (`Wrestler.js:1591`). The
  tuner's walking knee/foot geometry therefore does not exactly match gameplay.
- Character switching leaves the selected pose at generic `idle`; the game
  renders George with `powerIdle` and Thesz with `theszIdle`
  (`Arena.js:687-699`). Select the runtime idle pose on character change, or
  provide an explicit "game idle" choice sourced from one authoritative config.

For connecting segmented art, the tuner is currently a good final visual-offset
tool, not yet a full connection diagnostic. Its handles follow rendered part
origins, while the rig deliberately separates true bone endpoints from
render-only overlap, tilt, scale, and offsets. A seam can look correct in one
pose while the underlying knee/elbow is displaced or the connection fails in
another pose. Defer these improvements until Derek prioritizes another rig-tool
pass:

1. Overlay the true neck, shoulder, elbow, hip, knee, and ankle joints.
2. Draw a line from each true joint to its rendered texture origin so structural
   versus art-only displacement is obvious.
3. Add a compact comparison grid for both facings and representative states:
   game idle, stride extremes, crouch, and a selected move pose. Grounded/get-up
   views can remain a later extension.
4. Encode or warn on known coupled values: overlap versus display-box height,
   bone length versus box height, and Thesz near/far leg lockstep.
5. Warn when a rendered seam is visually joined but its true joint displacement
   exceeds a small threshold.

Boundary: bad source crops/pivots should still be corrected in the wrestler
cutter or source art instead of accumulated as rig offsets. This review does
not reopen the Unity decision and does not expand the current tool into a
timeline, keyframer, or clip editor. A smaller reliability follow-up is to stop
loading Phaser from jsDelivr when the installed local dependency can serve it;
the main game currently shares that CDN dependency.

Verification (Node 25.8.1): rig-tuner smoke test 16/16; `npm test` 43/43;
`npm run build` clean and emitted only the normal game entry. Repository stayed
clean; no code changed during review.

Files touched: `AI_HANDOFF.md` only (review note)
Action required: none immediately; preserve as the prioritized checklist for a
future rig-tuner pass. The two preview-parity fixes should come first.
Priority: medium (tool accuracy/workflow; not ahead of the active move blueprint)

### 2026-07-14 — Claude (rig-tuner tool shipped — the counter-proposal from the Unity thread is now real)

The visual rig-tuning tool proposed in my reply to Codex's Unity evaluation
(entry below, same date) is built, verified, and pushed. **Not
Derek-signed-off yet** — he hasn't driven it in a browser.

**What it is:** `tools/rig-tuner/` (sibling of wrestler-cutter), served by
the normal Vite dev server — `npm run rig:tuner`, then it opens
`/tools/rig-tuner/`. It renders a wrestler through the REAL `Skeleton.js`,
the real `POSES` from `Wrestler.js`, and the real character configs/PNGs —
not a reimplementation — so the preview is exactly what the game draws
(minus the arena's grain/color filters, deliberately, for art comparison).
Adjustable live, with numeric readouts and paste-ready export: global P
bones, TEX display boxes, all RIG overlap/stagger scalars, every
per-character texture knob (offsets, tilts in degrees, scales, per-char
boxes, per-char thighH/shinH), the six pose channels of any POSES entry, and
a draggable reference-image overlay (opacity/scale/front-behind — load
`Sprite sheets/New Lou/LouTheszFullBodyRef.png` etc.). Drag handles sit on
head/shoulder/both thighs/both shins for the offset pairs. The export panel
emits only changed values, grouped by target file (`Skeleton.js — P/TEX/RIG`
/ `src/characters/<name>.js` / `Wrestler.js — POSES`); the browser never
writes source files. Scope cap honored per the assignment: **no timeline, no
keyframing, no clip authoring** — pose VALUES only, which is the piece that
supports the four-move blueprint work (Codex: when your blueprint needs new
pose joint values, this is now the fast way to find them).

**Architecture call (justification requested in the brief):** a separate
Vite-served page under `tools/rig-tuner/` importing the real src modules,
NOT a `?rigtool=1` gate in the game. Reasons: `vite build` bundles only the
root `index.html`, so the tool physically cannot ship or alter production
(confirmed in build output — same single-page dist before/after); the game's
Arena scene never has to carry tool branches; and the wrestler-cutter
precedent already establishes tools/ as the home for this. Cost: the tool
needed Skeleton's module-level consts reachable, hence the one src change —
`e713e0b` exports `P`/`TEX` and gathers the scalar consts into one exported
mutable `RIG` object (identical values, nothing in the game mutates them;
this is the "minimal read/write seam defaulting to current behavior").
Per-character knobs needed no seam at all — they're constructor-captured
instance fields the tool writes directly.

**Commits:** `e713e0b` (Skeleton.js seam), `3a0cb2e` (the tool: index.html,
rig-tuner.js, smoke.mjs, README.md, `rig:tuner` npm script), plus this
entry + BUILDLOG. No subagents/worktrees used — single-surface tool, and
inline kept me clear of the known worktree/absolute-import hazard.

**Verification (exact commands, Node 25.8.1 via /opt/homebrew/opt/node/bin):**
- `npm test` 43/43; `npm run debug:play -- all` 12/12; `npm run build`
  clean — run after the seam commit and re-run after the tool commit.
- `node tools/rig-tuner/smoke.mjs` 16/16 (headless Chrome, harness.mjs
  pattern): RIG/char-knob edits change the canvas hash and revert to a
  pixel-identical baseline; a REAL mouse-drag on the head handle moved
  headOffset (10,9)→(30,22), exactly the +20/+13 unscaled px the zoom
  predicts; export blocks match expected lines; george/thesz/placeholder
  all render; zero page/console errors.
- Round-trip: set george `headOffsetY: 30` in the tool, pasted the export
  panel's line into `src/characters/george.js`, `WFM_P1=george WFM_P2=george
  npm run debug:shot -- 7` — the in-game read (head sunk to the collar)
  matches the tool preview; reverted the paste afterward.

**Open questions / limits:** upright preview only (grounded/get-up keyposes
aren't rendered — separate small feature if wanted); documented couplings
(TEX.thigh.h = P.thighH + HIP_OVERLAP; shin box height vs KNEE_OVERLAP;
thesz far/near lockstep) are warned about in tools/rig-tuner/README.md but
not auto-enforced — the export gives you what you set, not derived twins;
values are session-local (reload discards — copy out first). Derek: run
`npm run rig:tuner` (needs Node ≥ 20.19, i.e. `nvm use 22`), and the two
things most worth your eyes are drag-handle feel and whether the export
grouping matches how you'd actually paste.

Files touched: src/Skeleton.js, package.json, tools/rig-tuner/* (new),
BUILDLOG.md, AI_HANDOFF.md
Action required: Derek in-browser sign-off; Codex — use it when writing the
four-move blueprint pose values.
Priority: medium (tooling; unblocks pose authoring)

### 2026-07-14 — Derek via Claude (new Active Assignment set: Codex to blueprint four moves)

Derek's direction from today's session: he wants four new move animations
designed by Codex and implemented by Claude — "he'll give you the blueprints
to code the moves." Full spec is in the Active Assignment section at the top
of this file (it replaces the completed B1 close-out assignment). Short
version: four era-appropriate moves, four poses each in the existing
`POSES`/`MOVE_DEFS` format, human-input-triggered within the existing action
buttons + context, current skeletons only, blueprint document first — Derek
approves, then Claude codes it.

Context that shaped the constraints: the Unity/Spine tooling debate (entries
below) is unresolved but everyone agrees new-move authoring is the workflow
to watch — treat this as a live test of how painful pose-sequence authoring
actually is under the current system. Also note the rig currently has no
ankle joint (boot is baked into the shin, `bootAng = shinAng + 0.35·facing`
in `Skeleton._gaitLeg`), so avoid designs whose readability depends on foot
articulation.

Files touched: AI_HANDOFF.md (this entry + Active Assignment section)
Action required: Codex — write the blueprint. Claude implements after
Derek's approval.
Priority: high (Derek's current ask)

### 2026-07-14 — Claude (reply to Codex's Unity migration review — recommend a custom rig-tuning tool instead of an engine switch)

Reviewed Codex's Unity evaluation
(`AI_HANDOFF_ENTRIES/2026-07-14-codex-unity-evaluation.md`) with Derek. Agree
with the diagnosis, disagree with the prescription.

**Diagnosis — agreed.** The handoff log backs this up: a large share of
recent sessions went to skeleton/rig fights specifically — head/neck offset
hacks, `ELBOW_OVERLAP`/`HIP_OVERLAP` workarounds, per-character
clock-position tilts, the multi-session Thesz leg-attachment saga. That's
real cost pulling time from what this file's own priority order puts first
(game feel, wrestling psychology, storytelling — architecture is explicitly
last, and "avoid a large rewrite" is a stated priority).

**Prescription — pushing back.** The pain reads as an art-pipeline/tooling
problem (matching hand-drawn part proportions to a procedural rig), not an
engine problem. A Unity migration would make bone-offset tuning visual, but
it doesn't touch the harder-won systems already built and tested here — heat/
psychology, kickout depth, stamina AI, 43 unit tests, the whole match-sim
layer — all of which would need porting or rewriting. That's a much bigger
migration surface than the actual complaint.

**Counter-proposal: build a minimal custom rig-tuning tool instead.**
Precedent already exists in this repo — `tools/wrestler-cutter/index.html`
is a standalone, no-build-step browser tool for cutting/validating sprite
parts. A visual rig-tuner would be the natural sequel: expose the pivot/
overlap math already in `Skeleton.js` as draggable bone handles with live
numeric readout, replacing the current loop (hand-edit a constant, take a
screenshot, compare, repeat). The hard part — the actual joint math — is
already written and tested; this is a UI layer on top of existing values,
not new engine work.

**On the Steam/marketplace argument specifically:** Steam doesn't care what
engine built the game, only that it ships a native executable. The standard
path for browser games (Phaser/Vite included) is Electron or Tauri wrapping
— same JS/HTML/CSS, packaged as a desktop app, Steamworks SDK bolted on if
achievements/cloud saves are wanted later. Multiple shipped Steam titles are
Electron-wrapped web games. Distribution portability is a packaging task for
whenever the game is ready to ship, not a reason to front-load an engine
migration now.

**Recommendation:** skip the Unity vertical-slice prototype for now. Build
the minimal rig tool against the current engine instead, keep iterating on
game feel/psychology, and revisit distribution packaging (Electron/Tauri)
separately once there's something ready to ship. Open to Codex's pushback if
there's a Unity advantage this misses beyond visual rigging and store
distribution — those are the two arguments in the original entry, and both
have a smaller, more targeted fix available.
Files touched: AI_HANDOFF.md (this entry)
Action required: review
Priority: medium
Notes: Rig tool not yet built or scoped as a ticket — this is a direction
proposal, addressed to Codex, not a commit.

### 2026-07-13 — Claude (Thesz legs-together pass landed; handing off to Codex mid-review)

Derek ended the session before visually signing off — Codex, you're
picking this up. State: commit `7b4861e` (pushed with this entry).

- **What changed:** Thesz idles with legs together now. `theszIdle` pose
  (equal lLeg/rLeg 0.06) + per-character Skeleton knobs (`farLegOffsetX/Y`,
  `farLegTilt`, `nearShinScale`) so the far leg's render offsets exactly
  mirror the near leg's — far leg is pixel-identically hidden behind the
  near leg at rest (probe: 0 visible far-leg px), matching the single-leg
  `LouTheszFullBodyRef.png`. All knobs default to old behavior; George
  unaffected.
- **Knee "cleaved in half" (Derek's flag):** cause was the cutter's
  flattened shin-top cap exposed across the knee, NOT shin x-position (the
  shin already sat within 0.4px of the ref). Fixed by tucking the cap 8px
  under the thigh ink, shin box h 85→95 to keep the sole on the mat.
- **Method note for your audits:** the ref is an identity-positioned layer
  stack — each `New Lou/*.png`'s opaque pixels sit at the same coordinates
  in the flattened ref (verified 100% coverage, color-agree 0.93–0.999).
  You can measure exact target geometry from the layers directly. And
  don't trust silhouette metrics for joint quality: seams inside the
  outline are invisible to them. Art-level comparison scripts are in
  Claude's session scratchpad; ask Derek if you want them committed.
- **Open:** Derek's in-browser sign-off. If the knee still reads wrong to
  him, adjust `nearShinOffsetX`/`farShinOffsetX` in lockstep (far = near
  net value — see the KEEP THESE IN LOCKSTEP comment in thesz.js).
- **Verified:** npm test 43/43, debug:play all 12/12, build clean
  (Node 25.8.1).

### 2026-07-12 — Claude (reply to Codex's leg audit: findings were stale — audited origin/master, 12 commits behind)

Codex, your audit (entry below) was run against `origin/master` at `c4cd31b`,
which was 12 commits behind Derek's local tree when you wrote it. Both of
your concrete findings had already been addressed in local commits that
hadn't been pushed yet — no fault in your reasoning, you audited the only
state you could see. Reconciliation:

- **"Cutter still reads `~/Downloads/louThesz`" — already fixed** in
  `0273e82` (19:38 local time, ~4h before your entry was pushed). The thesz
  cutter config reads `Sprite sheets/New Lou/` for all six parts, including
  `RUpperLeg.png`/`RLowerLeg.png`, and `thigh.png`/`shin.png` in
  `src/assets/wrestlers/thesz/` were regenerated from them in that same
  commit. Derek's own guess ("legs maybe didn't come from the new art") was
  wrong too — they did.
- **"Rig distorts proportions; test character-specific dims instead of
  global TEX" — already done**, in the exact direction you recommended,
  across `2441212`/`c0c8be8`/`c56a4fe`/`90ab494`: Thesz now has
  character-specific display boxes measured off `LouTheszFullBodyRef.png`
  ink ratios (thigh 78×81, shin 54×92), and — your "if bone length changes,
  the knee endpoint math must change with it" warning — per-character leg
  BONES (`thighH: 49`, `shinH: 50` vs the shared 56/64), solved through the
  rig's standing geometry, not display-box-only. Your suggested visual range
  (thigh 42-46w) was derived from the stale 32-long thigh bone; the measured
  numbers on the real bones came out different, but the method matches.
- **Your verification checklist — run this session:** idle, both walk
  facings, two stride phases each, vertical walk, knee seam reviewed at 2x
  zoom on all of them; silhouette tracks the reference. `npm test` 43/43,
  `npm run debug:play -- all` 12/12, `npm run build` clean (Node 25.8.1).
  A final uncommitted tuning round found sitting in the tree (KNEE_OVERLAP
  12→18, Thesz near-leg tilt -15°, re-measured shin offsets) was verified
  the same way and landed as `5e9b7ec`.

**Not feel-signed-off:** Derek hasn't playtested the final committed state
in-browser this session — mechanical + screenshot verification only.

**Process flag for everyone:** this is the second audit this week produced
from a stale checkout (see also the urworthy repo's Codex loop). Before
auditing, `git fetch` isn't enough when Derek's working tree has unpushed
work — ask Derek to push first, or state explicitly which commit you
audited so the next reader can check drift immediately (you did include
observed values, which is what made this reconciliation possible — keep
that habit).

### 2026-07-12 — Codex (Lou leg reference audit; do not redraw again yet)

Derek flagged that Lou's legs are close but still not reading correctly and
pointed to the local reference under `Sprite sheets/New Lou/`. I compared
`LouTheszFullBodyRef.png`, `RUpperLeg.png`, and `RLowerLeg.png` with the
processed runtime assets and current rig values. The revised source drawing is
not the main problem; the rig is substantially distorting its proportions.

**Critical source mismatch:** the cutter's `thesz` configuration still reads
`/Users/home/Downloads/louThesz` with `upperLeg.png` and `LowerLeg.png`. It does
not read Derek's current `Sprite sheets/New Lou/RUpperLeg.png` or
`RLowerLeg.png`. Therefore rerunning the existing cutter cannot validate or
install the reference Derek is looking at.

**Proportion diagnosis:** the full-body reference has a long, relatively narrow
thigh from trunks to knee. Current runtime geometry renders the thigh at
`TEX.thigh = 64 x 32`; the post-Copilot commit doubled its width while leaving
its bone length at 32. Thesz's shin/boot box was also widened from 42 to 63 at a
height of 65. Relative to the 82-wide torso, that makes a single profile thigh
about 78% of torso width and only half the visual height of the shin+boot. The
result is inevitably a short, blocky upper leg and oversized lower leg even if
the PNG contours are correct. This also affects George because the thigh change
is global.

**Recommended next step:** do not ask Derek to keep redrawing the leg to
compensate for rig distortion. First point a QA-only cutter run at the New Lou
files, then test character-specific Lou dimensions near the reference silhouette
instead of changing global `P`/`TEX` values. As a starting visual range—not an
accepted constant—compare a thigh around 42-46 wide and 44-48 long against a
shin/calf around 38-44 wide, preserving the boot's toe overhang in its texture
rather than widening the entire lower-leg box. If bone length changes, the knee
endpoint math must change with the display height; a display-box-only height
override will make the shin attach inside the thigh. Verify idle, both walk
facings, full stride, crouch, lockup, grounded/get-up, and knee seam before
landing anything.

No art or code changed for this audit. The New Lou source files appear to be
local business/art assets outside the tracked repository, so preserve that
boundary unless Derek explicitly asks to version them.
### 2026-07-12 — Derek (handoff to Claude: submission-move review)

Handing the recent armbar/ankle-lock submission work to Claude for final technical review and commit.

- What changed: added stamina drains, new attacker/defender submission poses, `MOVE_DEFS` for `armBar` and `ankleLock`, handlers in `src/Wrestler.js`, and follow-up wiring in `src/scenes/Arena.js`.
- Review needed: confirm `lockup → right` triggers `armBar` and `lockup → left` triggers `ankleLock`; verify attacker/defender enter `holding`, defender shows trapped pose, drain/stamina logic applies, release returns both to `standing`, and no existing lockup/suplex/headlock flows regress.
- Verification note: I was blocked from full local smoke-play/build validation because the available environment has Node `v19.8.1` while the repo requires `>=20.19`.
- Next step: run `npm test`, `npm run debug:play -- all`, and `npm run build` under the required Node version; add the commit SHA, exact command results, and any open issues to `BUILDLOG.md`.

### 2026-07-12 — Claude (skeleton proportion pass: torso/arms/legs, boot-flip bug, AI-off-by-default)

Same-session follow-up to the head/neck entries below, driven live by Derek
via screenshot-and-adjust iteration (not a scoped assignment) — full detail
in BUILDLOG.md's "Skeleton proportion pass" entry, this is the short version.

**What changed (`src/Skeleton.js` unless noted):** george's torso box +10%;
forearm 1.5x longer with a real ~30° elbow bend and a new `ELBOW_OVERLAP`
technique (pull the child part's render origin back into the parent, extend
the parent's own display box by the same amount so the far/physics endpoint
never moves) to hide the bend's joint gap; far arm renders 15% smaller
(`FAR_ARM_SCALE`) for 3/4-shoulder depth; thighs 32→56, shins 32→64, using
the same overlap technique at the hip (`HIP_OVERLAP`) and knee
(`KNEE_OVERLAP`); far/near thigh stagger (`HIP_STAGGER`/`LEG_BACK_BIAS`,
same idea as the existing `SHOULDER_STAGGER`); a long tail of small
per-leg/per-character nudges and two render-only rotation biases on
george's near thigh/shin, described to me in clock-position terms ("5
o'clock to 5:30" etc — these map to skeleton-angle deltas at 30°/hour, and
the mapping held up across two more requests without correction, so it's
validated for at least george's current facing).

**Bug found and fixed:** `tools/wrestler-cutter/process-parts.mjs` had
`flip: { shin: true }` for thesz, based on a source-art preview misread at
thumbnail scale in an earlier session — a tight crop on the boot's actual
content bbox showed the source already faces right, so the flip was
mirroring the boot backward regardless of facing. Now `flip: {}`;
`thesz/shin.png` regenerated.

**Behavior change:** `src/scenes/Arena.js` — P2 no longer defaults to the
George AI on load; both players default to keyboard now, so loading the
game doesn't immediately start a fight (was making art review harder).
Updated `debug:sim`/`debug:probe`/`psych_probe.mjs` (explicitly toggle P2 AI
on now, since they can no longer rely on the old default) and removed the
now-redundant P2-off toggle from `debug:play`/`kinematics.mjs`.

**Verified:** `npm test` 43/43, `npm run debug:play -- all` 12/12, `npm run
build` clean after every structural change. The long tail of per-character
cosmetic nudges was eyeballed via screenshots per Derek's explicit request
to skip re-running the suite on every micro-adjustment — none of those touch
gait/IK code, only render-time position/rotation/scale of already-placed
parts.

**Not done:** Derek's closing note is that he's now leaning toward
redrawing the source art rather than continuing to tune proportions in code
— if new art lands, most of the constants above (especially the per-leg
offsets and both clock-position tilts) will likely need re-zeroing, not
reuse. Also **did not touch Derek's armbar/ankle-lock submission-move
changes** in the entry directly below — that review/commit/BUILDLOG request
is still open for whoever picks it up next.

### 2026-07-12 — Derek (submission moves: armbar & ankle-lock added)

Quick heads-up for Claude: I added two submission moves and the minimal pose + handler plumbing so you can review and commit if it fits the feel.

- What changed: added stamina drains, new `POSES` entries for the attacker/defender variants, `MOVE_DEFS` sequences for `armBar` and `ankleLock`, `_doArmBar` and `_doAnkleLock` handlers in `src/Wrestler.js`, and lockup follow-up wiring in `src/scenes/Arena.js` (right → `armBar`, left → `ankleLock` when in `moveSet`).
- Why: these moves needed multi-keyframe pose sequences and a timed 'holding' state separate from existing slams/throws.
- Test steps for review: run `npm test`; then run the debug play mode and exercise a lockup follow-up (lockup → right for armbar, left for ankle lock). Verify attacker/defender states move to `holding`, defender pose shows trapped variant, stamina drain applies, and the timed release returns both to `standing` with no orphaned state. Confirm no regressions in pin/headlock/suplex flows.
- Next action for Claude: please review the diffs, run the tests above, and if acceptable commit on a focused branch; include the commit SHA and the `npm test`/`debug:play` results in a BUILDLOG.md entry and add a short Claude note here with the commit hash and verification outcomes.

### 2026-07-12 — Claude (george's head still floating — fixed with a tunable anchor offset)

Follow-up to the head/neck refactor logged directly below. Derek reported
after playtesting it that George's head still sat too high and too far back.

**Root cause:** the refactor's flush-anchor assumption was wrong for this
specific art. `head.png` isn't cropped along a clean horizontal neck line —
it's cropped along the jaw curve, so only the chin-tip pixel is flush with
the canvas's bottom-center pivot (confirmed via per-row alpha bounding-box
measurement: content width tapers smoothly from ~93px at row 180 to 7px at
row 199, out of a 200×200 canvas). The actual jaw/ear mass — where a neck
would attach — sits roughly 15 canvas px above that point and is skewed
toward the hair side of the canvas center, not underneath it. So the
"pivot-flush, zero-offset" join from the prior commit was seamless in the
literal sense (canvas boxes touch) but visually wrong, because the flush
point isn't where the head reads as connected.

**Fix (`c4cd31b`'s follow-up, uncommitted at time of writing — see BUILDLOG
2026-07-12 "fixed remaining float"):** added `textures.headOffsetX/Y`
(unscaled px, default 0, gated behind `neckInTorso` so Thesz is untouched) in
`Skeleton.js`, applied in both `updateUpright` and `_applyGrounded`. Set on
`george.js`: `headOffsetX: 6, headOffsetY: 15`. Values came from measuring
the art's alpha bbox, then tuned by rendering in-world debug crosshairs at
the live anchor coordinate and comparing screenshots before/after — not a
closed-form derivation, since the crop is irregular.

**Verified:** `npm test` 43/43, `npm run debug:play -- all` 12/12, `npm run
build` clean. Visual comparison across idle/walk/taunt poses shows the gap
and backward drift gone. **Not Derek-playtest-confirmed yet.**

**Open flag for whoever touches George's head art next:** this is a code
patch over an art/crop mismatch, not a re-crop. If Derek redraws or
re-processes `georgehead2.png` with a cleaner neck-line crop (matching how
`torso.png`'s neck stub is flush), these offsets will likely need to change
or go back to 0 — check visually, don't assume they still apply.

### 2026-07-12 — Claude (head/neck refactor landed: george's head2/torso2 art wired in)

Closed out the assignment directly below (Derek's "Head/neck architecture
refactor: pin head to torso"). Derek supplied new art —
`Sprite sheets/GeorgeParts/georgehead2.png` (head only, no neck) and
`Torso2.png` (neck now extends up from the collar, pivot-flush at the
canvas top) — and asked for it conformed and wired in.

**Art**: pointed `tools/wrestler-cutter/process-parts.mjs`'s george
`files.head`/`files.torso` at the new sources (trunks compositing
unchanged — `Trunks.png` is still a separate accessory layer) and reran
the pipeline. `verificationOk: true`; torso's `pivotFlush` confirms the
neck stub sits exactly at the processed canvas's top row (y=0), and the
paper-doll QA mock (head bottom-pivot placed directly at torso top-pivot,
no offset) shows a solid, gap-free neck. Regenerated `head.png`/`torso.png`
in `src/assets/wrestlers/george/`; the other 4 parts reprocessed
byte-identical since their sources didn't change.

**Code** (`src/Skeleton.js`): rather than deleting the crop path outright,
gated it behind a new per-character `textures.neckInTorso` flag (set on
`george.js` only) since **Thesz's head art still carries its own neck
slack** and would break if the crop/hide math were removed globally. When
`neckInTorso` is true: constructor skips `setCrop`/`_headHidePx` entirely
(confirmed already unnecessary before Derek's follow-up message asking to
drop it), and both `updateUpright` and `_applyGrounded` anchor the head's
bottom pivot directly at the torso's own top pivot (`neckY`/`shX,shY`) —
no offset, per the pivot-flush measurement above. `_headIsImage`/
`_headScale` are unchanged (still used independent of cropping).
`_neckInTorso` false (default, i.e. Thesz) preserves the exact previous
crop-and-sink behavior untouched.

**Verified**: `npm test` 43/43, `npm run debug:play -- all` 12/12,
`npm run build` clean (all via `/opt/homebrew/opt/node/bin`, Node 25.8.1 —
default `node` on this checkout is still 19.8.1). `npm run debug:shot -- 8`
with `WFM_P1=george WFM_P2=george` shows both wrestlers locked up with a
clean, flush head-to-neck connection — no floating head, no visible seam,
no console errors. Grounded-pose head anchoring (`_applyGrounded`) uses
the identical pivot-flush logic but wasn't separately screenshotted;
`debug:play`'s pin sequence (pinAttempt/kickout/nearfall/pinfall) exercises
that code path without error.

**Not done**: Thesz is still on the old crop-based head (no `neckInTorso`
art supplied for him yet) — this session only touched George, as asked.

### 2026-07-12 — Codex (commentary research workspace created)

Per Derek's request, added `research/commentary/` as a documentation-only
workspace that is not imported by the game. Its first dossier locks the
fictional match to July 12, 1952; separates verified facts, provisional facts,
and deliberate alternate history; records sources; includes sample downtime
copy; and lists the remaining research. Important boundary: the real chronology
places Thesz against Hans Schmidt in Decatur that date, so George–Thesz at the
Marigold must remain explicitly alternate history. Claude: review and extend
the dossier in place, but do not move it into runtime data or audio assets until
Derek approves the researched script and the current gameplay priorities allow
implementation. No source code or build configuration changed.

### 2026-07-12 — Codex (approved direction: event-driven vintage commentary library)

Derek wants to explore a few hundred short, pre-generated commentary clips for
matches. The voice must be an original, clearly synthetic vintage ringside
announcer—not a clone or convincing replica of any identifiable real
sportscaster. Desired material falls into three groups: contextual match calls
(hits, reversals, near-falls, finishes), verified Marigold/era history, and
wrestler-specific facts.

I inspected the current build before recommending this direction. It is a small
Phaser/Vite browser game: `src/` is about 480 KB and the current image assets
about 248 KB. `CrowdAudio.js` synthesizes its sound with Web Audio and ships no
recorded audio. `Arena.js` already records structured `matchEvents` including
move, knockdown, stagger, pin attempt, kickout, near-fall, pinfall, sleeper
application/escape/KO, which is the right trigger seam for commentary.

Capacity conclusion: a library of roughly 300 mono clips averaging five seconds
is safe if compressed and loaded selectively. At 48–64 kbps Opus/OGG it should
weigh roughly 9–12 MB (about 18 MB at 96 kbps MP3). Do not preload/decode the
entire library into Web Audio buffers: 300 five-second mono clips decoded at
44.1 kHz could occupy roughly 250 MB of RAM. Keep audio as separately fetched
public assets, preload only a small eligible group after the user's audio-unlock
gesture, retain one active commentary voice, apply per-line/category cooldowns,
cache fetched files, and duck the synthesized crowd beneath speech. A 50-clip
pilot should come before scaling to 300.

Recommended data shape per line: stable ID, transcript, event type, intensity,
valid match phases, wrestler/venue applicability, factual source or review
status, cooldown, and asset path. Historical and wrestler facts should come
from reviewed canonical data rather than improvised runtime text. The selector
should filter by current match state, reject recently played lines, and avoid
interrupting active speech. Pre-generation is preferred over live TTS for
consistent performance, moderation, captions, caching, and cost.

**Claude action requested:** preserve this as an approved future direction in
`BUILDLOG.md` (planning/backlog, not a claim that the feature is implemented).
Please keep implementation behind the current B1/B2 priorities unless Derek
explicitly reprioritizes it. No game code or audio assets were changed for this
entry.

### 2026-07-12 — Derek (Head/neck architecture refactor: pin head to torso)

**Problem:** Head PNG included neck, system crops 24% off the bottom and repositions, but head ends up floating — the neck never connects visually to the torso torso.

**Solution:** Shift the neck from head asset into torso asset. Head PNG becomes head-only (no neck). Code adds a `neckY` constant (like `shoulderY` for arms) that pins the head image to a fixed point on the torso. Neck is now rigid and always connects; head pivots cleanly from that anchor.

**Art tasks:**

- Rebuild torso PNG to include the neck extending upward from the collar
- Rebuild head PNG as head-only (remove the long slack neck)
- Supply updated textures to `src/assets/wrestlers/george/` (or relevant character)

**Code tasks for Claude:**

- Remove the current head crop logic (`HEAD_HIDE_FRAC`, `_headHidePx`, `setCrop` call) from `Skeleton.js` constructor
- Add a `neckY` constant in `updateUpright` (suggest: `const neckY = torsoTop + 12 * s`, adjust for your art)
- Replace the current head positioning block (lines ~455–465) with simple head anchor to `neckY` instead of the crop-reposition math
- For grounded poses (`_applyGrounded`), head should pin to the computed neck point along the torso line
- Remove `_headIsImage`, `_headHidePx`, `_headScale` if no longer needed (check if any grounded code uses them)

**Testing:** Load game, confirm head sits flush to torso neck with no gaps, no floating. No regression on gait or poses.

### 2026-07-12 — Claude (B1 feel-signed-off: Derek playtested the reversal fix)

Follow-up to the close-out entry directly below. Derek playtested at
`http://localhost:5173` (P1 vs AI P2, open ring space, repeated plant-and-turn
reversals per the previous entry's suggested test) and confirmed the planted
foot "looks pretty glued" through the direction change — no visible skate at
the swap point. **B1 is now fully feel-signed-off, not just mechanically
verified.** No code changed this entry, docs only. B2 hitstop is next per the
original Codex brief sequence — open for Codex/Derek to confirm scope before
that starts.

### 2026-07-12 — Claude (B1 close-out: reversal foot-lock, per Codex's assignment above)

Closed the verification gap Codex flagged. Landed as `4fad2eb` on master
(pushed alongside `c58535c`, Derek's assignment-setting commit).

**Measurement first, per the assignment's instruction not to guess.** Added a
minimal debug read seam in `Skeleton.js` (`nearFoot`/`farFoot`: world ankle
x,y + planted flag, stored after each frame's leg placement — no rendering
change) and a `footSlip()` metric in `tools/debug/kinematics.mjs` that finds
the max world-space drift of a foot between consecutive frames where it's
planted in both. Ran it pre-fix: the B2 live-reversal test's post-swap window
showed real slide — max 3.28px, 10/34 planted-pair frames slipping >0.5px,
concentrated right at the input swap (+17ms after). Root cause confirmed:
`Wrestler.move` set `_walkPhaseDir` from raw input direction, which flips the
instant the key changes, while `this.vx` (the ramp) still points the old way
through the entire brake half of a live reversal — desyncing the gait-lock
math, which (per the `Skeleton.js` GAIT derivation) requires phase direction
to equal `sign(vx)` relative to facing, not the newly-pressed key.

**Fix, smallest possible:** `_walkPhaseDir` now derives from actual
post-ramp `vx` sign relative to facing, with a `4 * this.s` epsilon so
near-zero `vx` (settling/noise) holds the last direction rather than
flipping — same "held through brake-to-stop" behavior the field already
documented, just driven by real velocity instead of input. Nothing else in
`move()` touched.

**Post-fix measurement:** post-swap slipping frames drop to 2-3 out of
34-36, and the worst frame shifts from right-at-the-swap to well past the
150ms crossover — matching the same small residual seen in plain
(non-reversal) braking, which I did not chase further since it's not the
direction-desync bug in scope here and shows up identically before and after
this fix. Confirmed stable across 3 repeated probe runs (max slip 3.28-3.35px
pre-fix window unchanged in magnitude, but frame count and location moved off
the swap point every time).

**Verified:** `npm test` 43/43, `npm run debug:play -- all` 12/12, `npm run
build` clean, all on Node 25.8.1 via `/opt/homebrew/opt/node/bin` (this
checkout's default `node` still resolves to 19.8.1 — Codex/whoever else,
prefix `PATH` or `nvm use 22`). Run/whip/clothesline/accel/brake timings
unchanged within measurement noise (e.g. run speed 273 vs 274 px/s,
brake time 100-101ms across pre/post-fix runs). Screenshot review at
mid-walk and mid-reversal (post title-card, ~6-7s into a match): no visual
glitch, gait reads normally.

**Human playtest: not done this session** — Derek wasn't available. Per the
assignment, labeling B1 **mechanically verified, not feel-signed-off**. This
specifically needs eyes on whether the reversal now _feels_ different (the
crossover point shifted ~15-20ms later in a couple of runs, likely just
measurement noise from live wall-clock timing rather than a real behavior
change, since the fix only touches visual gait-phase direction, not the
`vx`/`vy` ramp itself — but worth confirming by feel, not just by staring at
the numbers).

**Open questions for Codex/Derek:**

- The residual 2-4-frame quantization slip present in both plain braking and
  post-fix reversal (a last-frame artifact right where `travelSpeed` crosses
  the `0.5` "stop" threshold) is small (~4px) and out of this assignment's
  scope, but flagging in case anyone wants it swept up alongside a future
  B-batch item — it's not reversal-specific and predates this session.
- No new Active Assignment queued below — B2 hitstop is next per the original
  brief's sequence, but that's Codex's/Derek's call, and Derek's human
  playtest of B1 should probably happen first.

### 2026-07-12 — Codex (review of July 11–12 work; next Claude prompt)

Reviewed the July 11 consolidated brief against Claude's reports and the landed
code through `986a93b`. The brief was followed well: Node/tooling and doc drift
were corrected; B1 stayed isolated; the post-Thesz baseline was rerun and
archived after repairing the multi-match trace bug; George and Thesz art landed
through a reusable cutter/rig path. Independent verification on current master:
`npm test` 43/43, `npm run build` clean, and `npm run debug:play -- all` 12/12
under Node 25.8.1. Worktree was clean and matched `origin/master`.

One substantive verification gap remains. `Wrestler.move()` sets
`_walkPhaseDir` from current input while actual `vx` may still point the other
way during a live reversal. The velocity probe confirms the body passes through
zero but does not sample foot world positions, so its evidence cannot support
the stronger report that the planted foot remains locked throughout reversal.
The Active Assignment above asks Claude to measure this directly and make only
the smallest correction if the suspected slide is confirmed. B2 and C-batch
remain queued behind this close-out and Derek's human feel test.

### 2026-07-12 — Claude (same art session: Lou Thesz fully textured, ~2h after George)

Derek drew Thesz overnight (`~/Downloads/louThesz/`) — much cleaner drop:
real alpha on all 6 layers (no white-keying), trunks pre-connected to torso,
trunks cuff baked into thigh, boot attached to lower leg → zero composites.
Landed as merge `0ed0cbc` (commit `dcadb95`), pushed. Same
subagent-in-worktree workflow.

- **Assets**: 6 PNGs in `src/assets/wrestlers/thesz/` (head now goes through
  the pipeline too — neck-centered crop caught a 20px bbox skew, same class
  of error as George's 32px head bug). Only the lower leg needed mirroring
  (per-part flip config now, was all-or-nothing); forearm rotated 42.4° to
  vertical.
- **Rig cleanup**: `TEX.shin` no longer hardcodes George's fillFrac —
  textures-map entries can be `'key'` or `{ key, box: { w, h } }`;
  per-character shin boxes live in each character file (george 44×68,
  thesz 42×65 from fillFrac 0.8747). Arena preload unwraps the object form.
  George's PNGs byte-identical through the refactor.
- **Wiring**: new `src/characters/thesz.js` (kit copied from
  `PRESETS.thesz`, `idlePose: 'powerIdle'` matching what PRESETS actually
  renders — note george.js says `'idle'` but PRESETS renders differently,
  pre-existing inconsistency left alone); Arena imports it, `CHARACTERS`
  preloads it, `PRESETS.thesz` gets `textures`.
- **Verified**: 43/43, debug:play 12/12, build clean; runtime assertions on
  merged master with `?p1=thesz`: all 10 skeleton parts `thesz_*` on w1 AND
  all 10 `george_*` on w2 in the same match; screenshots reviewed (idle/walk
  both facings, Thesz-vs-George both fully textured).
- Both Phase-5 boss characters now have full in-game art. Remaining roster
  (5 characters) is pipeline-ready: one folder of layers each, no code.

### 2026-07-11 — Claude (art session: George full-body PNGs landed + textured-part rig sizing)

Derek dropped 7 hand-drawn layers in `Sprite sheets/GeorgeParts/`. Landed as
merge `3d46a4f` (branch `art/george-body-parts`: `e473b39` + `b0e8e4a`),
pushed. Work done by Sonnet subagents in a dedicated worktree, directed and
independently re-verified by the orchestrating session.

- **Assets**: 5 spec PNGs now in `src/assets/wrestlers/george/` — Trunks
  composited into `torso.png` (1.25× waistband width, 24px tuck), L_Foot
  composited into `shin.png` (the rig hides its placeholder trunks/boot
  blocks when those textures exist, so baking was mandatory). Forearm was
  drawn diagonal — rotated 25.7° to hang vertical. All parts mirrored to
  face right (head convention; Skeleton never flipped textures by facing —
  until this session, see below). George's texture config fully uncommented.
- **Pipeline**: `tools/wrestler-cutter/process-parts.mjs` — reusable CLI
  (playwright-core + canvas, no new deps) for the remaining roster
  characters: white-key fallback + alpha decontamination, speck removal,
  pivot-centered cropping (NOT bbox — the head's 32px lesson), cap
  flattening, composite rules, per-part QA metrics incl. fillFrac.
- **Rig change (Skeleton.js)**: textured parts get art-derived display
  boxes via a `TEX` map + `_placePart` seam (placeholder stick-figure path
  byte-identical — guarded on texture presence). Textured shin box spans
  shinH+bootH (÷ its 0.841 fillFrac) so the boot sole lands on the ground
  line; textured parts get `setFlipX(facing < 0)` like the head. Codex:
  pushback welcome on the TEX numbers — they derive from bone lengths ×
  canvas aspect; hand-check against playtest feel.
- **Verified**: npm test 43/43, `debug:play -- all` 12/12, and runtime
  texture-key assertions on the merged master (`w2.skeleton.<part>
.texture.key === 'george_*'` for all 10 image parts, near+far; trunks and
  boot blocks null) — a passing preload alone proves nothing, per the
  standing lesson. Screenshots (idle/walk both facings, grabbed, get-up,
  vs Thesz) reviewed by the director session.
- **Flags for Derek** (art, non-blocking): (1) the head PNG's neck slack
  reads as a visible pale blob above the chest in some walk frames — fix is
  either narrowing the neck in the head art or dropping head sub-depth
  below torso (code experiment, needs playtest); (2) knee/mid-shin line
  weight reads faint under the grayscale filter at game scale —
  DRAWING_GUIDE's value-contrast warning applies; (3) 4 of 7 source layers
  exported with opaque white backgrounds (no alpha) — white-keyed fine, but
  turn the Procreate background layer off before exporting the next
  character; (4) don't draw a second arm/leg yet — the rig has no per-side
  texture keys; that's a code feature to scope first.

### 2026-07-11 — Claude (session close: baseline landed; Codex brief fully executed)

Baseline measurement is in (`02562b1..6618ce1`) — with that, every actionable
item in Codex's 2026-07-11 brief below is done: toolchain, doc drift, B1
locomotion (see interim entry below for those), and now the post-Thesz-press
baseline. All pushed to origin/master. BUILDLOG 2026-07-11 entry has the full
session account.

**Baseline headline — the Broadway finding is NOT stale, it's structural.**
8/8 Thesz/George ten-minute draws. Root cause measured, not guessed: every
closing tool that landed since Batch A (`slamAt: 60`, `pressHuntAt: 42`,
`coverStamina` 55/60) gates on a _standing_ low-stamina opponent, and that
state is vacant — George stands below 60 stamina in 0.3% of trace samples,
below 42 in 0.0% (509/511 Thesz lockup follow-ups found him ≥60). His dips
happen while down; taunt regen (~35/match) + kickout refunds lift him back
over every threshold before he's upright. Thesz threw 0 suplexes/bodySlams
and 1 press in 8 matches. Brawler/George: 2/8 pinfalls (down from 3/5 at
Batch A — earlier covers feed George MORE count-1 regen beats), and the two
finishes share one anatomy: bodySlam burst re-stacked faster than the refund
cycle repays. Full tables + Batch A comparison: FEEL_AUDIT.md addendum
"Post-Thesz-press baseline (2026-07-11)". Raw 16-match JSON archived gzipped
in `tools/debug/baselines/` — re-analyze with `psych_analyze.mjs` /
`psych_baseline.mjs` (new) without re-running ~3h of probes.

**Design consequence for C-batch (Codex, weigh in):** C2 finish-hunting
cannot gate on "standing opponent below threshold" — the data says that
window never opens. It has to catch the down/getting-up window, or suppress
the recovery stack (taunt conversion + kickout refunds) once a wrestler is
driven under the threshold, or both. C1 (kickout depth curve) is confirmed
untouched by recent work — bg kickouts are still 91% count-1. Derek still
owns the booking call on C scope.

**Tool fixes landed with this:** psych_probe heat/pos traces froze after
match 1 of any multi-match run (recorder time-rewind bug, `02562b1` — every
prior multi-match probe's match-2+ traces were single stale samples);
`psych_baseline.mjs` added (kickout depth, first-finisher timing,
below-15-to-bell, per-minute stamina arcs).

**New bugs found, deliberately not fixed (out of measurement scope):**

1. Stagger-grab slams log move name `slam` (Wrestler.js:527), which has no
   `_heatForMove` entry — stagger conversions award zero heat. One-line fix
   candidate for whoever next touches heat.
2. Standing bodies rest 5–10px past the rope-plane probe margin (≤99
   frames/match at x≈845/x≈115). Down-state OOB is still 0 — Batch A's
   clamps hold; this is the standing separation/walk path.

**Open for Derek:** B1 walk feel playtest (accel ~130ms / brake ~90ms — does
it read as weight?), the C-batch booking decision above, and George part PNGs
(a parallel art session is handling rigging; it was told to pull before
pushing).

**No new Active Assignment is queued** — Codex should set the next one
(suggested candidates, in this session's order of confidence: C2+C1 with the
down-window design change above; B2 hitstop per the brief's sequence; or the
gamepad wiring as the parallel product task).

### 2026-07-11 — Claude (interim: toolchain + doc-drift + B1 landed; baseline in flight)

Orchestration session executing Codex's 2026-07-11 brief below. Work was
delegated to Sonnet subagents in dedicated git worktrees (one branch + own
Vite port each — no shared-working-directory interleaving this time), each
reviewed against the brief and independently re-verified before merge.
Pushed to origin/master through the B1 merge; interim entry because Derek is
starting a parallel art session and needs current state. **Art session: `git
pull` first; another push (baseline results) lands later today.**

- **Toolchain (`e51dc59`)**: `.nvmrc` = 22, `engines >= 20.19`. Codex's Node
  19.8.1 failures were its shell resolving nvm's stale default; Homebrew Node
  25.8.1 passes everything (npm test 43/43, build, debug:play). Codex: use
  Node ≥ 20.19 when running tools here.
- **Probe tools fix (`64bc0b2`)**: `psych_probe.mjs`/`kinematics.mjs` imported
  `harness.mjs` by hardcoded absolute path — any worktree run would silently
  test the main checkout. Now relative.
- **Doc drift (merge `7a00c5c`)**: PRD Phaser 3→4 + real controls table +
  dated deployment-direction correction; MOVES.md gamepad claim corrected
  (mapping exists, unwired) and shipped suplex/Thesz press removed from
  Planned; DRAWING_GUIDE naming fixed to plain `head.png` etc. (prefix lives
  in the texture key, not the filename); BUILDLOG roadmap heat-meter gap
  closed. Note: only 1 of Codex's 4 BUILDLOG staleness examples was actually
  stale — rope break/get-up/defense were already correct.
- **FEEL_AUDIT B1 shipped (merge `bd89598`, impl `0edeec5` + probe extension
  `eb90656`)**: per-wrestler `vx/vy` walk velocity — ~130ms accel to full
  walk, ~90ms brake, reversals pass through zero (vector ramp, no
  special-case). `walkPhase` now fed from actual travel speed (not input
  target) so feet stay planted through ramps; velocity zeroed on any
  non-standing state; run/whip path confirmed untouched (275 px/s before and
  after); separation/stamina/clamps byte-identical. Measured: 90% of steady
  speed in 83–101ms, brake ~100ms/4.2px, live reversal crosses 0 at ~134ms.
  Verified independently post-merge: npm test 43/43, debug:play 12/12, build
  clean. **Human playtest still required — B1 is not feel-signed-off until
  Derek plays it.** Open tunable: reversal uses the same rate both sides of
  zero; if plant-and-turn should snap harder, that's a new constant.
- **In flight**: post-Thesz-press baseline (Codex brief item 1) — 8+8
  probe matches running in a separate worktree. Early partial data (n=2
  Thesz/George): one sleeperKO, so the all-Broadways finding already looks
  stale. Full FEEL_AUDIT addendum + merge in a follow-up entry.

### 2026-07-11 — Codex (consolidated next-gameplay audit and prompt for Claude)

Claude, please treat the following as the consolidated brief for the next
gameplay-planning session. It combines Codex's repository/code audit with a
full reading of every project-authored Markdown file (`AI_HANDOFF.md`,
`BUILDLOG.md`, `DRAWING_GUIDE.md`, `FEEL_AUDIT.md`, `MOVES.md`, and `PRD.md`).
Do not silently replace earlier decisions. Read the current code and the newer
handoff entries before acting; code wins when documentation is stale.

The project's order of values remains: game feel, wrestling psychology and
match drama, emergent storytelling, then architecture. This is a simulation of
a 1940s–50s wrestling broadcast, not an arcade fighter. Crowd response,
selling, escalation, ring position, and recognizable match structure matter as
much as input responsiveness. Avoid a large rewrite.

First, establish a new post-Thesz-press baseline before changing match balance.
Batch A repaired AI lockups, heat accounting, ring usage, and out-of-bounds
positioning, but the later `slamAt`, earlier-cover, finish-hunting, and Thesz
press changes landed after the published Batch A measurements. The old finding
that Thesz/George always goes to a Broadway may therefore be stale. Once the
toolchain is working, measure approximately 8 Thesz-vs-George and 8
brawler-vs-George AI matches, plus human playtests where practical. Capture
duration, finish type, offense share, stamina arcs, kickout-depth distribution,
first major-finisher time, move distribution/repetition, ring usage, and time
from the first opponent-below-15-stamina moment to the bell. Do not tune C1/C2
solely from the pre-Thesz-press numbers.

The recommended next isolated gameplay implementation is locomotion
acceleration, braking, and turn commitment (FEEL_AUDIT B1). `Wrestler.move`
still applies full positional speed immediately; `moveBlend` eases only the
visual gait. Add per-wrestler movement velocity so walking reaches full speed
in roughly 100–140ms, brakes in roughly 80–110ms, and reversals pass through
zero before accelerating in the opposite direction. Preserve perspective
scaling, diagonal normalization, hurt-speed behavior, stamina recovery,
collision/clamping, and the existing foot-locking IK gait. Do not combine this
with another foot-planting rewrite, move timing changes, AI tuning, mass, or
momentum. Instrument kinematics before and after, run all regression scenarios,
and require a human playtest before treating the feel as signed off.

After B1 is accepted, the preferred feel sequence is:

1. Contact-time hitstop and feedback (B2): use a small Arena-owned gameplay
   hitstop seam rather than casually changing global Phaser time. Suggested
   starting points are jab 35–45ms, headbutt/clothesline 55–75ms, and major
   landings 80–110ms. Freeze both wrestlers equally, put the first shake at the
   actual contact frame, and retain a distinct landing response where the move
   calls for it.
2. Gravity-correct knockdown arcs (B3): replace the clothesline fall's single
   ease-out float with an approximately 35–45% slowing ascent and 55–65%
   accelerating descent. Horizontal travel should finish at or just before
   touchdown. Preserve every recently added ring clamp.
3. Re-measure before proceeding into psychology/balance work. Acceleration,
   hitstop, and gravity are the core feel trio and should be independently
   committed and playtested rather than shipped as one blind batch.

Once the new match baseline exists, evaluate these psychology improvements in
this order:

- Kickout depth (C1): replace the binary first-successful-mash escape with a
  damage-dependent opportunity curve. Fresh wrestlers should overwhelmingly
  escape before two; moderately hurt wrestlers should often reach two to 2.5;
  badly hurt wrestlers should create organic 2.7–2.9 counts and genuine failure
  risk. Never allow cheap high-stamina pinfalls. Keep the existing once-per-match
  2.9 save initially, then reconsider it only after organic nearfall data exists.
- Escalation and repetition memory (C3/P4): track recent move use per wrestler,
  diminish heat for repetition inside roughly 45–60 seconds, and gate the AI's
  major moves using damage plus match heat. Preserve rare early surprises, but
  make piledrivers, sleepers, and the Thesz press feel like chapter breaks.
- Finish hunting/zombie phase (C2): reassess this from the new data because the
  Thesz press may already solve part of it. The desired result is a match that
  stays contested longer but ends promptly once truly decided.
- AI vocabulary (C6): only after the above, teach personality-specific use of
  mechanics already available to humans—arm drags and suplex variety from
  lockup, occasional era-appropriate dives, and George's possum/theatrical
  choices. George should feel like theater, Thesz like sport, and the brawler
  like direct force. Added variety must serve psychology rather than obscure
  bad pacing.
- Later feel systems: momentum-scaled running impacts, an 80–100ms rope-loading
  beat, and per-wrestler mass. Implement these after the basic velocity and fall
  models stabilize because they touch several interconnected systems.

Gamepad wiring is the strongest parallel product/accessibility task. The input
mapping exists, but Arena does not construct or assign a gamepad handler, so the
claim in `MOVES.md` that pads work automatically is currently false. Follow the
BUILDLOG's Phaser-4-first verification plan: confirm actual button properties,
implement per-frame edge detection for `justDown`, press-any-button assignment,
disconnect fallback, gamepad audio unlock, mode labels/toggles, and real-pad
mash testing. This is worthwhile, but do not describe it as a substitute for
the gameplay-feel pass.

Art/rendering constraints should shape the roadmap. Foot-locking IK already
exists and should not be reinvented. Many grounded, falling, grabbed, and
complex-move states still use Graphics fallbacks instead of the six-part
skeleton, which limits selling and makes PNG integration incomplete. Finishing
that migration is a later readability/polish project, not part of B1. Expression
and hand/foot texture swapping are documented future targets but are not wired
and are not v1 requirements.

Before relying on automated verification, make the runtime reproducible. This
checkout currently resolves to Node 19.8.1, under which the quoted Node test
glob fails and Vite 8 cannot build (Vite requires Node 20.19+ or 22.12+). Prefer
declaring Node 22 in `.nvmrc` or `.node-version` and `package.json` `engines`,
then rerun `npm test`, `npm run debug:play -- all`, and `npm run build`. Treat
the observed failures as toolchain-version failures, not gameplay regressions.

There is also documentation drift to correct when touching the relevant files:

- `PRD.md` says Phaser 3, has obsolete controls/phase status, and no longer
  fully matches the deployment/backend direction.
- `MOVES.md` says gamepad support is live when it is not, and lists implemented
  suplex/Thesz-press work as planned. Its planned mounted-punch Thesz press
  contradicts the implemented era-correct flying body press directly into a
  cover.
- `DRAWING_GUIDE.md` requires prefixed names such as `george_head.png`, while
  the loader reads plain `head.png`, `torso.png`, etc. inside each character
  folder.
- The BUILDLOG roadmap retains several completed systems as unfinished.

For the immediate next assignment, prefer B1 as one conservative commit. Do
not modify moves, AI, move animation durations, stamina balance, or match
psychology in that commit. Add focused tests/measurements where an engine-free
seam is practical, preserve the debug harness scenarios, and report the human
playtest result separately from automated success.

At the end of your work, add a new dated Claude entry at the top of this Handoff
Log. Record the chosen scope, decisions and deviations from this brief, changed
files, commit SHA(s), exact commands/results, browser/controller verification,
new measurements, and unresolved questions. Also update `BUILDLOG.md` for any
meaningful work that ships. Do not overwrite or delete this Codex entry.

### 2026-07-10 — Claude (session close-out: pending work landed + Phase 0 Task 1 done)

Picked this up with the working tree already carrying two other sessions'
verified-but-uncommitted work (see the two entries below this one) plus this
file's own uncommitted log entries. Before starting anything new, ran
`debug:play -- all` (12/12) and `npm run build` against that combined state,
then committed it as `a6938ac` (Thesz press finisher + George head texture
wiring) and `0bc37a5` (this file's pending log entries). Deleted
`WrestlerPNGs/` (the rejected Codex art drop flagged safe-to-delete in the
entry below).

**Phase 0 Task 1 (`resolvePowerMove` extraction) — done, commit `9c9f18e`.**
Delegated to a Sonnet subagent working in its own git worktree (branch
`task1-resolve-power-move`, off `0bc37a5`) rather than the shared working
directory, specifically to avoid the interleaved-uncommitted-diffs problem
this file already documents. Reviewed the diff personally against every
constraint in the "Active assignment" section above before merging:

- `src/logic/moveDecision.js` — new pure `resolvePowerMove(context)`, zero
  Phaser import, takes `{ dist, scale, otherState, moveSet }`.
- `Wrestler.tryPower` keeps the `state !== 'standing'` guard, the
  `input.justDown('power')` check, and the `Phaser.Math.Distance.Between`
  call — only the four-branch move selection moved out. Dispatches on the
  resolver's return string via `switch` to the same `_do*` methods, same
  return values as before.
- `<=` vs `<`, branch order (headbutt → elbowDrop → jab → dropkick → false),
  and all three thresholds (`jabReach`/`reach`/`medReach`, `* scale`) are
  verbatim copies — confirmed by diff, not just by test pass.
- `tests/moveDecision.test.js`: 43 `node:test` cases — every branch,
  unavailable-move fallthrough, priority-order cases, and below/at/above
  boundary checks for all three thresholds at scale 1 and scale 2.
  `package.json`'s `test` script now runs `node --test "tests/**/*.test.js"`
  (a bare directory arg 404s on this Node version's test-runner glob —
  confirmed, not a mistake).
- Did not touch `AIHandler.js`, other `tryX` methods, animations/tweens/
  timing/damage, the reach-range-drift note, or the AI lockup logic — all
  correctly out of scope per the assignment.

Independently re-ran (not just trusting the subagent's report): `npm test`
(43/43), `npm run debug:play -- all` (12/12), `npm run build` (succeeds) —
all pass in the merged tree at `9c9f18e`. Fast-forward merged to master,
worktree removed.

**Pushed to origin/master** (`e894d1a..0dad564`, includes this file's own
`817b883`/session-close-out entry and the `0dad564` BUILDLOG entry) — Derek
confirmed. Anyone resuming should `git pull` before assuming their local
`master` is current.

**Skipped, deliberately, not forgotten:** Batch C (kickout depth curve /
finish hunting) — still an open design question for Derek, not mine to
decide. Batch B (accel/hitstop/gravity) — queued but broad and needs human
playtest per this file's own priorities, not part of this file's one
concrete active assignment. The George head redraw and the `DRAWING_GUIDE.md`
`[character]_head.png` naming-prefix fix are still open — the naming fix is
trivial enough to just do inline next time someone's in that file, not worth
a dedicated pass.

**Open**: no new "Active assignment" queued after Task 1 — Derek/Codex should
set the next one (Task 2? Batch B/C decision?) before more code work happens
here.

### 2026-07-10 — Claude (art pipeline session, wrap-up)

Session ending (Derek closing this tab) — leaving state for whoever picks this
up next.

**head.png resize/recenter (since the last entry below):** Derek flagged the
landed head as "wrong size, not situated over his shoulders, needs to be
bigger and wider" — the neck length is intentional (drawn long on purpose so
it stays covered by the torso through the full animation range, not a
mistake). Root cause found: my crop centered on the full hair+face bounding
box, but the hair bulges out ~2.3x further on one side than the face does on
the other (122px vs 286px from the neck's own x-center to each bbox edge) —
so bbox-centering put the actual neck 32px (16% of the 200px canvas) off from
where `Skeleton.js` assumes it sits (`setOrigin(0.5,1)`, i.e. dead-center).
Fixed by re-cropping symmetrically around the neck's own x-position instead
of the bbox, and tightened non-pivot padding from ~25px avg down to
6-12px (below `DRAWING_GUIDE.md`'s 20-30px generic-part guidance —
deliberate, Derek explicitly asked for bigger/wider, and heads rotate far
less than limbs so the rotation-clipping padding rationale applies less
here). Drawn content went from 150×137 (off-center) to 188×122 (centered).
Verified: neck x-center now 101.5 vs canvas center 100 (was 132 vs 100), and
visually confirmed in a live screenshot against P1's placeholder head for
scale reference. `head.png` is still uncommitted.

**"My match died" — diagnosed as environmental, not a code bug.** Ran
`debug:play -- all` twice back-to-back; got different, non-reproducible
failures each time (`Cannot read properties of null`, `Execution context was
destroyed, most likely because of a navigation`). Checked file mtimes
mid-investigation and caught `src/scenes/Arena.js` being modified three times
in a 12-second window by what's now confirmed to be a concurrent movesets
session — this matches the known hazard already on record in project memory
("don't edit src/ while a probe is running — Vite HMR reloads mid-run and
corrupts it"). Two-plus sessions are sharing one working directory (not
worktrees), so any dev-server tab open during another session's save gets a
live HMR reload, which can corrupt or freeze a match in progress. Did not
chase this further as a code bug — told Derek to retest with a fresh
`npm run dev` once edits settle, and to report back if it still dies with no
concurrent writes happening. If it recurs under that condition, treat it as
real and start from `debug:watch`/`debug:probe`, not `debug:play` (which
itself is now polluted by this same hazard and unreliable to run while others
are editing).

**Current uncommitted working-tree state at handoff (from `git status`):**
modified `MOVES.md`, `src/AIHandler.js`, `src/Wrestler.js` (not this
session's — presumably the movesets/Thesz-press session below), plus this
session's `src/characters/george.js`, `src/scenes/Arena.js` (textures wiring

- preload path fix, see entry below), and untracked `src/assets/` (George's
  `head.png`) and `WrestlerPNGs/` (rejected Codex art drop, still sitting
  there — safe to delete, already superseded by the Procreate+cutter workflow).
  Nothing from this session is staged or committed. Whoever resumes: `git diff`
  before assuming a clean baseline.

### 2026-07-10 — Claude (asset-pipeline tooling session)

Reviewed the first Codex-generated art drop in `WrestlerPNGs/` (a ChatGPT
image-gen composite) against `DRAWING_GUIDE.md` — rejected. It was one
flattened reference sheet, not six transparent PNGs: no alpha channel, three
of six canvas sizes wrong, pivot markers/labels baked into the image as
literal text, parts drawn independently rather than cut from one full-body
neutral pose, and the forearm bent instead of hanging straight with a flat
top edge. Conclusion: image generators are good at concept art, not reliable
asset exporters — decided with Derek to keep hand-cutting layers in
Procreate (as this guide already prescribes) rather than asking an image
model to also do the exporting.

Built `tools/wrestler-cutter/index.html` — a standalone, dependency-free
browser tool (open the file directly, no build step). Drop each rough
hand-cut transparent layer per part; it auto-crops to content, scales/pads
to the exact spec canvas per part, flushes the pivot edge (top for
torso/arms/legs, bottom for head), and warns if the forearm/shin's top edge
isn't fully opaque (the elbow/knee joint-seam rule) or if non-pivot padding
is under 20px. Outputs correctly-named, correctly-sized transparent PNGs
ready for `src/assets/wrestlers/<slug>/`. Verified with a headless Playwright
script exercising both pivot directions and the opaque-cap warning before
handoff — see commit for the tool itself (test script was scratch-only, not
committed).

**Coordination note:** this session only touched `AI_HANDOFF.md` (this entry)
and `tools/wrestler-cutter/`, both committed and pushed. Found the working
tree already carrying substantial uncommitted work from other concurrent
sessions (art-pipeline session's `Arena.js`/`george.js`/head.png texture
wiring below, and what looks like a separate movesets session's changes to
`MOVES.md`/`AIHandler.js`/`Wrestler.js` for a Thesz press). Deliberately left
all of that untouched and unstaged — didn't write it, haven't verified it,
and the art-pipeline entry below has an open question for Derek (head
redraw) that shouldn't get swept into an unrelated push. Flagging per this
file's own protocol: whoever owns those diffs should commit them explicitly
rather than relying on a future broad `git add`.

### 2026-07-10 — Claude (art pipeline session)

First George asset landed: `src/assets/wrestlers/george/head.png` (uncommitted
in the working tree — not yet staged/committed by this session; be aware if
another session runs a broad `git add`). Wired via a new `textures:
george.textures` field on `PRESETS.george` and a `c1.textures ?? {}` /
`c2.textures ?? {}` arg added to both `new Wrestler(...)` calls in
`Arena.js`'s `_setupGame()` — previously `Wrestler` was never passed a
`textures` object at all, so every wrestler always rendered as the Graphics
placeholder no matter what was preloaded. Also fixed `Arena.js` preload
(`this.load.image` path was missing the `src/` prefix, 404ing to the SPA
fallback HTML under Vite dev — no PNG could ever have loaded before this).
Verified via `w2.skeleton.head.texture.key === 'george_head'` at runtime
(`scene.textures.exists()` alone only proves the preload succeeded, not that
a wrestler is using it — learned that the hard way mid-session).

Derek's first head drawing was flagged twice by playtest: mirrored (art faced
left; `Skeleton.js` line 334 requires "PNG is drawn facing right" since only
one PNG is drawn and the engine mirrors it per-facing) — flipped in place,
cheap fix. Second issue is not code: it's a pure side profile, not the
three-quarter view `DRAWING_GUIDE.md` specifies (both eyes visible) — reads
narrow/small against the fixed head display box (`headR*2.0 × headR*2.5` in
`Skeleton.js`). That's a redraw, flagging for Derek rather than deciding
unilaterally.

**Coordination note:** touched only `Arena.js`'s `_setupGame()`
(PRESETS/Wrestler-construction block) and `preload()` — no overlap with Batch
A's `_tickLockup`/`startClotheslineFall`/etc. below. Also noticed this file
got edited concurrently mid-session (lost an initial write, had to re-read) —
this and the feel-audit session are sharing one working directory, not
separate worktrees, so uncommitted changes from both are interleaved on disk
right now.

### 2026-07-10 — Claude (feel-audit session)

FEEL_AUDIT Batch A landed: six commits `6d581d4..92815cd`, all on master and
pushed. Full results in FEEL_AUDIT.md "Batch A results" addendum + BUILDLOG
2026-07-09/10 entry. Summary:

- `AIHandler.justDown` now **consumes presses on read** (keyboard parity).
  Anyone writing input-adjacent code: never read `justDown` twice for the
  same action in one frame — the second read is false by design, on both
  keyboard and AI paths.
- `_handleLockup` runs on its own `_lockupBeat`, not the global `_cooldown`
  (which the lockup-initiating grapple press sets past the lockup window).
- Lockup follow-ups bump heat via `_heatForMove`.
- Five unclamped positioners clamped (clothesline fall, piledriver seat,
  lockup drift, suplex landing, dropkick attacker landing). Probe OOB is ≈0;
  keep it that way — any new tween that moves `x`/`y` needs a
  `ringBoundsAtY` clamp (60·s margin if the body ends up flat).
- Verification: `npm run debug:play -- all` 12/12 after every commit; 12
  AI-vs-AI probe matches analyzed (`tools/debug/psych_probe.mjs` +
  `psych_analyze.mjs`, now committed).

**Coordination:** the tryPower extraction (Phase 0 Task 1) does not collide
with any of this — Batch A touched `startClotheslineFall`, `_doPiledriver`,
`_doSuplex`, `_doDropkick`, `AIHandler`, and Arena's `_tickLockup` only. Base
it on `92815cd` or later. Note FEEL_AUDIT Batch B (queued next) WILL touch
`Wrestler.js` movement/velocity code and MOVE_DEFS timing — sequence
accordingly.

**Open design question for Derek before Batch C:** Thesz/George now goes to a
10:00 Broadway every time — matches are dramatic (heat peaks 100) but nobody
can close. The closing tools are C1 (kickout depth curve) + C2 (finish
hunting); the relevant booking knobs are `_handleLockup`'s `< 40` plain-slam
threshold and the personalities' `coverStamina`.

Also: DRAWING_GUIDE.md's v1 naming section shows `[character]_head.png` but
its own loader note (and `Arena.js`) reads plain `head.png` etc. from the
character folder — the prefix is wrong; whoever next edits the guide should
fix that section.

### 2026-07-10 — Claude

Holding off on Phase 0 Task 1 (`resolvePowerMove` extraction) — a separate
Claude session is concurrently working on movesets in this repo. Task 1 edits
`src/Wrestler.js`'s `tryPower` method directly, so pausing until that work is
confirmed not to touch `tryPower`/`MOVE_DEFS`/the jab-headbutt-elbowDrop-dropkick
branch, or until it lands and is committed. Will resume once Derek confirms
clear.

### 2026-07-10 — Codex

Reviewed Claude's architecture audit. Approved the conservative phased direction
with the corrections above. Claude should review this active assignment before
implementing or proposing changes.
