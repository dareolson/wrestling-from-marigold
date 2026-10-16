# Claude: suplex v2, the method that worked, and the next round

2026-10-15 · Claude · for Codex

Derek's plan: **one more round of revisions on the pilot moves, then apply
what we learned to the rest of the built moves.** This entry is the state at
the end of round one and the brief for round two.

## State

All commits are on `story/marigold-opening` and cherry-picked onto
`thesz-v2-profile-normalization`. **None are pushed.**

| Commit (story / Lou) | What |
|---|---|
| `4974be8` / `4d02cfe` | Jab extension on the 83 ms impact frame (damage timing unchanged); elbow-drop damage at landing, not on cancel |
| `ed882ec` / `27be2f9` | Your joint/participation repair, reviewed and merged unchanged. Derek is redrawing George in Procreate soon, so George's ~10 px shorter shins at rest are accepted |
| `167c102` / `b63c831` | `tools/move-critic/` (critic + the refine.mjs prototype) and your audit/review evidence |
| `8b67048` / `ef104ec` | **Suplex v2**, `stage.mjs`, `export_draft.mjs`, suplex play scenarios, match filming |

Tests: 658/658 on the story branch. The Lou branch still shows the 6 known
failures from git-ignored art in a temp checkout; it was not otherwise
re-verified. Both suplex role orders pass in a real match (`play.mjs suplex`,
`suplexReverse`). `AI_HANDOFF.md` itself is uncommitted: it carries your
story-mode entries alongside ours.

## Your review was right; refine.mjs stays a prototype

Your six findings on the cleanup tool all hold, and the suplex rebuild follows
your recommended approach instead. Don't build on `refine.mjs`. The critic
(`sample.mjs`, `metrics.mjs`, `report.mjs`) stays useful as the regression
check.

## The method (suplex v2)

1. **Block the beats by hand** in a generator (`tools/move-editor/author_suplex.mjs`):
   11 sparse keys. Tie-up, front facelock, load, drive, vertical, past
   vertical, tip back, fall, impact, bounce, settle. The attacker keeps
   one leg stance from the tie-up to the fall.
2. **Solve constraints at those keys only**, with no baking, so the draft
   stays hand-editable. Run `tools/move-critic/stage.mjs <draft> <constraints> <out>`
   with `tools/move-editor/suplex.constraints.mjs`, in this order:
   - `plant`: slide the actor's root so a sole stays where it was at `refAt`.
     A squat moves the hips back over still feet.
   - `stage`: move the partner (transform x + lift) so a joint lands on a
     target. Offsets are screen px, or turn with the target's spine when
     `frame: 'body'` is set (needed once he tilts into the fall).
   - `hands`: drag IK onto the partner, keeping the best of 5 attempts. Near a
     joint limit the IK can end further away than it started.
3. **Install** with `node tools/move-editor/export_draft.mjs <solved.json> suplex.json suplex.js`.
   The generator header lists the full rebuild sequence.
4. **Judge the whole clip, between keys too:**
   - critic report on a 60 Hz trace;
   - key-pose sheet: `sample.mjs --times … --zoom 0.62` plus `poses_sheet.py`;
   - full strip: `contact_sheet.py`;
   - a real match filmed in slow motion:
     `WFM_SHOTS=<dir> WFM_TS=0.3 WFM_URL=… node tools/debug/play.mjs suplex`
     (Arena `?notitle=1` skips the title card; play.mjs adds it when filming).

Result, v1 → v2:

| Measure | v1 | v2 |
|---|---|---|
| Near-hand grip on neck, worst gap over the whole hold | 53% of body height | 5.5% |
| Far-hand grip on trunks, worst gap over the whole hold | 38% of body height | 7.9% |
| Lou's planted-foot slide | 118 px | 82 px |
| Landing | George on top of Lou | head to head beyond Lou |

## Lessons for every paired move

- **Stage bodies before hands.** Every grip that failed in round one was a
  staging problem, not an IK problem. When a grip can't reach, change the
  choreography: the suplex's far hand moves from the trunks to George's lower
  back while he's inverted, because his trunks are beyond Lou's overhead reach.
- **Three-quarter view:** Lou's `nearShoulder` sits toward his back, so "in
  front of his chest" is a large dx (~40 px).
- **An inverted head hangs below the neck.** To put George's head at Lou's
  chest, his neck has to sit above Lou's shoulder.
- **Whole-body layering.** Draw order is per wrestler (by transform.y), so
  no partial interleaving is possible. George is in front for the facelock
  and drive and swaps behind for the vertical so Lou's face and grip read.
  The swap is a one-frame layer change at 0.76 s; it reads fine at speed.
- **`crouch` pushes the feet forward** because the hips stay fixed. Plant
  through the root (the `plant` constraint). Tipping into a fall has the
  same problem; the `tip` key at 1.08 s pivots him back over planted feet.
- **Solo moves can't be judged in the editor.** For the dropkick and the
  flights, travel is the executor's tween. Film them in a match.
- **These rigs have no foot joint** (the boot is painted in the shin), so
  ankle IK can't plant a sole. Plant via the root or accept a slide.

## Suplex: still open for round two

- **George's entry:** his feet skate ~69 px stepping into the facelock
  (0–0.12 s). Give him an actual step.
- **Lou's feet:** 82 px of slide remains. Locate the spans between keys and
  plant at the in-betweens, or add keys.
- **Velocity hitches at keys:** ease choices are still coarse. Do a timing pass
  for slower anticipation, a short balanced hold, and an accelerating
  turnover (your timing notes).
- **Stiff torsos:** both trunks still rotate as slabs. This needs painted torso
  variants (arched attacker, folded/inverted defender) with socket overrides,
  per your geometry warning. That's art work for when Derek's George redraw
  lands.
- **Landing limbs:** both men's arms fly straight up at impact. Settle them
  with purpose.

## Round two: the other pilots

1. **Jab (ready).**
   - Define named aim points: a fist point (not the wrist) and George's face
     (not the head image origin, which sits at the neck).
   - Use the same definition in solving and grading (your finding 1).
   - Add a shoulder lead and a delayed head recoil.
   - Keep damage at 83 ms.
   - Keep the clip solo: no transform keys, because the executor owns
     position.
2. **Dropkick: blocked on Derek.**
   - The distances disagree: the art connects at ~123 units, the hit range
     is 100, and the executor's `targetX` stops Lou 35 units from George.
   - Claude suggested making all three agree at ~120. That's a balance call,
     so wait for Derek.
   - Then fix the boot height (currently high on the chest and face) and
     coordinate George's sell with Lou's landing.
3. **Hammerlock: Derek's own draft.**
   - Claude asked whether to add the missing crank and resistance as a
     separate comparison draft. No answer yet.
   - Don't edit `hammerlock-derek-wip.json` without his go-ahead.

## After round two: the rollout

Apply the method to the built moves in this order:

1. Throws: body slam (keep its powerbomb look; Derek likes it), piledriver,
   hip toss.
2. Mat holds: figure-four, arm bar, ankle lock.
3. Flights: elbow drop, knee drop, dives, Thesz press.
4. Strikes, standing holds, whip, pin, taunts.

Each move gets:

- a beat generator;
- a constraints file;
- a staging solve;
- a critic report;
- a filmed match in both role orders.

Reuse proven constraints, but don't force one rhythm on every move.
