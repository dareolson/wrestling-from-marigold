# 2026-10-07 — AUDIT AND REPAIR: the `thesz-procreate-v1` binding

**Written by the Claude that did the work, at Derek's instruction, after he said
"you are hallucinating".** He is right. This prompt exists to get the candidate
audited and repaired by someone who did not make these mistakes. Treat every
number in the config and in the prior handoff entry as unverified.

Do not take the prior session's write-up
(`2026-10-07-claude-lou-procreate-master-integration.md`) on trust. It is
accurate in places and confidently wrong in others, and it does not distinguish
between them.

## Confirmed wrong — start here

### 1. The figure-height measurement is invalid, and a config value was set from it

Every "figure height" number the prior session quoted came from a script that
summed Phaser part rects:

```js
t = min(img.y - img.displayHeight/2);  b = max(img.y + img.displayHeight/2)
```

`displayHeight` is `box.h * s * growth` — the **box**, including transparent
padding. The candidate's crops are tight (ink fills ~0.96 of canvas width);
shipped Lou's are loose (~0.75). **Comparing two characters this way does not
compare their visible figures.**

It produced a result that contradicts the repo. `src/characters/thesz.js:14-19`
says, in its own comment:

> heightScale = 265/302 = 0.877 … Result: Thesz now reads taller than George
> (265px vs George's 247px target in george.js), matching their real heights.

265/247 = **1.0729**. The box-based script measured shipped Lou at 185 against
George's 198 = **0.934** — inverted. The project already encodes Lou-taller-
than-George and already matches real heights; the prior session "discovered" the
opposite and changed the candidate to fix a problem that does not exist.

**`heightScale: 0.9075` in `thesz_procreate_v1.js` was set from that bad
measurement** (and from heights asserted from memory — see §2). It is unsound.
Re-derive it against the project's own 265px convention, the way `thesz.js:14`
does, and verify by measuring rendered **ink**, not part boxes.

### 2. Real-world heights were asserted from memory, with no source

"Lou Thesz 6'2\" (74in), Gorgeous George 5'9\" (69in), ratio 1.0725" was stated
as fact and used to justify the heightScale change. Nothing was checked. That it
lands near the repo's own 1.0729 is luck, not verification. Confirm or discard.

### 3. A test was reported whose edit never applied

The session concluded that `legOffsetY` cannot move the legs — that
`_authoredLegRig` (true, because the candidate declares hip sockets) makes the
rig skip its stagger/bias nudges — on the strength of rendering three values
(0, −7, −13.6) and getting three identical frames.

**`grep -c legOffsetY src/characters/thesz_procreate_v1.js` returns 0.** The
sed/python patch loop never wrote the field. The frames were identical because
nothing changed. **Derek was told the legs cannot be moved from the tuner or by
offsets, on the basis of a test that did not run.** Re-test properly. The
`_authoredLegRig` reasoning may still be right — it is read from
`Skeleton.js:549` — but it is unverified.

### 4. Stale hardcoded constants in the measurement scripts

- `inkFill = { cand: 0.960, shipped: 0.747 }` was hardcoded into the height
  script and then reused **after** the parts were regenerated and art was added.
  Every "torso INK width" figure (e.g. "41.3 vs 43.3") used those stale values.
- `k = 0.22245` (units per source pixel) was hardcoded into a later rebind
  rather than recomputed from the art it was rebinding.
- The "bone proportions match the drawing to 0.0% on every bone" table was
  computed once and never re-checked after the thigh was regenerated, the hip
  sockets were moved, or the ovals were added.

## Verify, do not assume — claims that were actually checked

These were grepped, measured or proven in-session and are probably sound, but
confirm before relying on them:

- PSD intake. `sha256 41a6af64…` verified before and after; the PSD is unmodified
  and so are both provenance PNGs. 10 layers, all 4 channels decoded, by
  `tools/wrestler-cutter/psd-layer-reader.py` (written for this task).
  `LAYER_INVENTORY.md` records it.
- Shipped Lou untouched: `git status --porcelain src/assets/wrestlers/thesz/
  src/characters/thesz.js` returns 0 throughout.
- `Skeleton.js` per-character bone overrides (`torsoH`, `upperArmH`, `forearmH`)
  added following the existing `thighH`/`shinH` pattern, defaulting to `P.*`.
  All tests passed unchanged, which is the evidence that existing characters are
  unaffected — but no pixel comparison of george/thesz was done. **Do that.**
- `headAnchorFrac` without `neckInTorso` makes `head.y` NaN
  (`Skeleton.js:414-418` vs `:1669`). Caught by `rig:certify` (820 findings) and
  now pinned by a test.
- The rig-tuner's export loop and `CHAR0` were hardcoded to `['george','thesz']`;
  now derived from `CHARS`. Verified end-to-end headlessly: moving
  `sockets.farHip.v` produced a correct export block.
- `pelvisOverlay` draws BELOW the near thigh (`+0.0025` vs `+0.003`);
  `pelvisMask` draws above both thigh roots (`+0.0035`). Read from
  `Skeleton.js:679-695`.

## Art that is NOT Derek's, currently shipped in the candidate

The PSD was never modified. The **derived runtime parts** were, beyond the
deterministic cleanup:

| file | what was added | status |
| --- | --- | --- |
| `torso.png` | a black oval, ~3,275 px, filling the FAR leg opening under the trunks' arc, clipped to the far side of the crotch midline | **currently in the candidate** |
| `torso.png` | earlier: black discs on both hip sockets (~9,336 px) | reverted |
| `thigh.png` | earlier: a black trunk slab, then a disc centred on the hip | reverted |
| all limbs | rotated about their proximal joints onto neutral bone axes | **in place, intended** |
| all parts | alpha floor 15; largest-connected-component only (114 px of specks) | **in place, intended** |

The reverts happened because the additions read as a bulge on screen even though
they measured clean (near-hip `interior_bg` 325 → 0). **That is the standing
lesson here: mechanical passes and Derek's eye disagreed, and the eye was
right.** The remaining oval has not been through that scrutiny at length.

## The deeper problem to audit

The session worked by: change a value → render → ask Derek → change again. Derek
caught, in order: orangutan proportions, a too-small head, an 8-foot figure, a
potato-shaped bulge, the wrong hole filled, and finally the hallucination. **Each
fix was real; the loop never converged**, because the measurement underneath it
was not trustworthy and nobody checked it against the project's own conventions
(`thesz.js:14` was sitting there the whole time).

Audit for that pattern, not just the individual numbers.

## What to do

1. **Re-derive every number in `src/characters/thesz_procreate_v1.js` from the
   art**, independently. Do not copy the current values. Especially
   `heightScale`, which should follow the repo's 265px convention.
2. **Measure rendered INK**, never part boxes, for any cross-character
   comparison. Say which you used.
3. **Re-run `legOffsetY` properly** and tell Derek whether the legs can be moved
   from the tuner. He has been told they cannot.
4. **Pixel-compare shipped george and thesz** before and after the `Skeleton.js`
   bone-override change, to prove byte-identical rendering rather than inferring
   it from a passing suite.
5. **Decide on the far-hip oval** — keep, reshape, or revert to Derek's pixels
   and make it a Procreate correction instead. It is the only non-Derek paint
   left.
6. **Re-check the joint-articulation shim.** `extracted-v1/joint-shim*/` fakes
   near/far parts by duplicating the shared painting. The runtime applies
   `RIG.FAR_ARM_SCALE` / `FAR_THIGH_TILT` to the far side; the shim does not.
   Far-side "pass" results may not reflect the game.
7. Re-read `measure-joint-articulation.mjs`'s `straight_run_px` failures (22-70
   against a threshold of 18) at shoulders, elbows and knees. The session
   dismissed these as "flat edges, not holes" without investigating.

## Ground rules

- Shipped Lou and George stay untouched. Verify, do not assume.
- Nothing is committed. `git status` is dirty with **other sessions'** work
  (`research/commentary/`, `INTRO_STORYBOARD.md`, `STORY_MODE_SCRIPTING.md`,
  `CHARACTER_ART_RECOVERY_AUDIT.md`, `IDEAS/`, `FRONT3Q_V5_GATE/`). Do not absorb
  it.
- The candidate is opt-in: `?p1=thesz-procreate-v1&p2=george`. It is removable by
  deleting `src/characters/thesz_procreate_v1.js`,
  `src/assets/wrestlers/thesz-procreate-v1/`, `tests/theszProcreateV1.test.js`,
  the `POSES.theszProcreateIdle` entry in `src/Wrestler.js`, and the
  registration lines in `src/scenes/Arena.js`, `tools/rig/validate-character-rigs.mjs`
  and `tools/rig-tuner/rig-tuner.js`.
- Current state: 557 tests pass, build clean, `rig:validate` clean,
  `certify.mjs thesz_procreate_v1` renders 516 frames UNVERIFIED (parity with
  shipped thesz). **None of that caught any of the four errors above.**
- When a measurement disagrees with Derek's eye, the eye wins and the
  measurement is the thing to debug.
