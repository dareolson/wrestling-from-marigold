# 2026-10-08 — Codex: find and fix the gap below Procreate Lou's knee when he walks

## The problem

Derek sees **a space opening below Lou's knee when he walks**, on the opt-in
candidate `thesz-procreate-v1` (Derek's hand-painted Procreate Lou). Open it
with:

    npm run dev        (Node 22 — `~/.nvm/versions/node/v22.23.1/bin` must be first on PATH)
    http://127.0.0.1:5173/?p1=thesz-procreate-v1&p2=george

Derek's eye is the ground truth here. **Claude measured for it and found
nothing, and was wrong to treat that as "not there".** Take the bug as real;
your job is to find where the measurement missed it, and fix it.

## What Claude checked (and why it may have missed it)

All measured live, against the current working tree, at y=360 mid-ring:

1. **Walking driven by the AI** (press `1` to put P1 on AI). Sampled frames
   while `state === 'standing' && moveBlend >= 0.6`, ~30 per direction,
   facing right and facing left.
2. For each knee (near and far), drew ONLY that leg's thigh + shin into an
   offscreen canvas through each image's `getWorldTransformMatrix()`, and:
   - counted transparent pixels enclosed by leg ink within 3 world px
     horizontally or vertically: a steady **2–4 world px²** just behind the
     knee in every frame, every phase (it reads as the drawn crease, but it
     may not be);
   - counted connected components of thigh ∪ shin: always **1** (thigh and
     shin never fully separate).
3. Visual close-ups at 5–6x zoom against a flat background: no gap seen.

Blind spots, which are the likely places to look:

- **Only the walk was sampled.** Not `running` (liftScale 1.0, runBlend),
  not the brake-to-stop tail, not stagger/hurt wooze, not stepping during
  strikes, lockup or grapple clips.
- **The hole metric only sees thigh + shin of ONE leg.** It cannot see a gap
  between the two legs, or between a leg and the trunks/torso, or one the
  OTHER leg's art should be covering.
- **Alpha threshold 128.** A soft-edged gap (alpha 1–127 fringe at the
  thigh's distal end or shin's proximal end) would be counted as solid. The
  parts went through an alpha floor of 15, so semi-transparent edges exist.
- **The broadcast post-filter** (grain, scanlines, grayscale) makes a small
  gap hard to see in screenshots; it doesn't hide it in Derek's browser.
- **Sampling every ~70ms** may skip the frames where it opens.

## Recent changes to the knee (any of these could be the cause)

All uncommitted, all 2026-10-08:

- **`shinUnderThigh: true`** in `src/characters/thesz_procreate_v1.js`, a new
  opt-in flag in `src/Skeleton.js` (`_shinUnderThigh`, applied at the end of
  `setDepth`). Each shin now draws just UNDER its own thigh (Derek: calves
  stack below thighs, as his Procreate layers do). Before this the shin drew
  ON TOP, which may have been hiding a gap at the knee. **Prime suspect.**
  Derek wants the stacking kept, so the fix is coverage at the knee, not
  reverting the order.
- **Derek's rig-tuner export:** `nearShinOffsetX: 1, nearShinOffsetY: -5,
  farShinOffsetX: 1, farShinOffsetY: -3`; `nearHip` u 0.455 → 0.438;
  `nearShoulder` (0.177, 0.21). Derek expected this tune to close the gap.
- **`heightScale` 0.9075 → 0.7907** (whole figure scale only).
- **Phaser origin fix in `Skeleton.js`:** three places that mirrored an
  off-centre origin for facing < 0 did `img.originX = …`, which in Phaser 4
  leaves the cached `_displayOriginX` stale; now `setOrigin(…)`. That makes
  every mirrored part's origin actually mirror. Limb origins are u=0.5, so
  this should not touch legs; it measured identical facing L and R, but
  verify.

Relevant config (`src/characters/thesz_procreate_v1.js`):
`thigh` box 34.86×87.146, `jointPivotFrac` 0.06721, `distalAnchorFrac`
(0.513568, 0.891024), `pivotOffsetFrac` 0.013568; `shin` box 43.716×101.028,
`jointPivotFrac` 0.090196, `soleAnchorFrac` (0.641101, 0.98573),
`pivotOffsetFrac` -0.124635; bone lengths `thighH` 76.96, `shinH` 41.81.
Hip sockets are declared, so `_authoredLegRig` is true (skips the shipped-Lou
stagger nudges, see `Skeleton.js` near the `NEAR_SHIN_FWD`/`NEAR_SHIN_UP`
lines). Note the shin's joint pivot sits only 9% down its box: there is very
little shin art above the knee to tuck under the thigh as the knee bends.

## What to do

1. **Reproduce it first.** Ask Derek exactly when/where he sees it if you
   can't. Then capture the frames that show it: walking, running and stopping,
   both facings, near and far leg, broadcast filter on AND off. Say which
   condition shows it.
2. Find the cause in the geometry: thigh distal end vs shin proximal end
   through the knee-bend range (pivot placement, `jointPivotFrac`,
   `distalAnchorFrac`, shin offsets, draw order, soft alpha at the ends).
3. **Fix with config/rig values or a knee-coverage approach, not by painting
   over Derek's art.** The last non-Derek paint added to this character (a
   black oval in the trunks) read as a bulge and had to be removed. If the
   art itself needs more overlap (e.g. a longer shin top), say so and let
   Derek do it in Procreate.
4. Verify on screen, at the frames where it showed, and show Derek.

## Ground rules

- **Shipped `thesz` and `george` must not change.** The new flag is opt-in;
  keep any fix scoped to `thesz-procreate-v1`. Pixel-compare shipped
  characters if you touch shared code in `Skeleton.js`.
- Tests: `npm test` is 557/557 green; keep it that way. `npm run rig:validate`
  must stay clean.
- Nothing is committed. `git status` also holds OTHER sessions' work
  (`research/commentary/`, `INTRO_STORYBOARD.md`, `STORY_MODE_SCRIPTING.md`,
  `CHARACTER_ART_RECOVERY_AUDIT.md`, `IDEAS/`, `FRONT3Q_V5_GATE/`). Don't
  absorb it into a commit.
- When a measurement disagrees with Derek's eye, the eye wins and the
  measurement is what to debug.
