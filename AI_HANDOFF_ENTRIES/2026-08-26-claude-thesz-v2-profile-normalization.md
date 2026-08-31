# 2026-08-26 — Claude: profile-v2 normalized into the canonical canvases

Independent audit and production normalization of the profile-v2 source parts
Derek approved on 2026-08-26 with a cleanup allowance.

Tool: `tools/wrestler-cutter/normalize-profile-v2-parts.mjs`
(`npm run art:normalize-profile-v2`).
Output: `Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates/profile-v2-normalized-v1/`.
Tests: `tests/profileV2Normalization.test.js`.

Pass-A v3 is byte-identical: SHA-256
`ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb`. The
normalizer refuses to run otherwise. The approved profile-v2 source set is
read-only input and its nine generation sources are hash-frozen in the test.

## Audit findings

**Alpha was already clean.** Every source part carries RGB `0,0,0` under alpha 0
and no chroma-key fringe. The one exception is `torso-trunks.png`: 26 connected
components, of which 25 are 40 stray pixels along rows 1063-1073, plus two
trunk-leg "legs" below y≈930 that are outline stroke with no fill left inside.

**The knee shelf was a registration artifact, not an art defect.** The old proof
scaled the thigh by 0.429 and the shin by 0.444 off raw bounding-box heights,
with guessed pivot fractions. At the drawn art's own joints the two sides agree:
thigh 94px wide at its knee, shin 94-95px at its knee. Registering both onto the
manifest anchors makes them 47px and 47px and the shelf disappears. No trimming
was needed for it.

**The round shoulder is real.** `upper-arm-source.png` carries a deltoid cap
whose circle centre sits 66 source px above the paint's top edge — about 28px
once registered, against a declared shoulder overlap of 20px along the axis with
a 12px opaque core.

**`upper-arm.png` is cut above the elbow.** The crop ends at source y=261; the
drawn elbow (the arm's waist) is at y=266. It therefore carries no post-elbow
overlap at all, against a declared `afterPx` of 30. Normalization cuts the upper
arm from `upper-arm-source.png` instead, which has the paint.

**The trunks' leg opening was an open hole in the assembly.** The old proof faked
the underlay with a hardcoded black ellipse at (386,473) r=(34,28) that did not
cover it. There was no `pelvisUnderlay` part.

**The board is not drawn at the fitted skeleton's proportions.** Registered
scales run 0.257 (torso) to 0.489 (shin); the thigh comes out about 29% larger
relative to the forearms than it was drawn. That is legitimate — the rig owns the
proportions — but it does change limb-thickness relationships from the board.

## What changed

Each cell is registered by a two-point similarity transform (uniform scale,
rotation, translation, **no reflection term**) from two landmarks read off the
part's own silhouette onto its manifest profile anchors. Nothing is mirrored.

One cleanup rule: past a terminal joint anchor a part keeps only the paint the
contract asks it to carry, clipped to the disk that exactly contains that
anchor's declared overlap band. That trims the shoulder (1038px removed) and
reconciles the knee. The thigh's hip end is clipped to the narrower overlap
capsule instead, because the trunks do not conceal it.

The only paint added is flat colour sampled from the part itself, inside a
declared joint zone, filled as a capsule rather than the square-cornered band —
filling the band literally left rectangular tabs at the neck and shoulders. That
is the contract's own `continuous-fill-no-edge` surface.

`pelvis-underlay.png` is new: the manifest's declared `pelvisCoverage` band
filled with the trunks' own sampled black, plus both hip coverage zones. It
closes the leg opening.

Two proofs were rebuilt from the normalized cells using the manifest's master
landmarks and profile `depthOrder`, with supersampled rotation so the moved-limb
proof shows the assets' edges rather than the renderer's aliasing.

## Deliberately not done

`pelvisMask` and `shoulderMask` stay transparent, per Derek's rule. The stress
evidence he asked for is now measured and recorded in `parts-index.json`:

| mask | neutral | under load | what it would cover |
| --- | --- | --- | --- |
| pelvisMask | 1,976 px | 2,226 px | near-thigh overlap drawn on top of the trunks |
| shoulderMask | 244 px | 351 px | near upper-arm overlap proud of the torso |

The pelvis number is not a "very small lip" — the near thigh's mandatory 20px of
above-hip overlap is what produces it, and it is visible in both proofs. That is
Derek's call, not mine.

A neck-seam ink flattening pass was written, tried and reverted: the drawn collar
is roughly three times the width of the manifest's neck core, so flattening only
the declared zone left a dashed remnant that read worse than the solid line.

## Still questionable

1. **Torso neck collar.** The torso source's neck is a squared, outlined block.
   Because the torso draws over the head, that block's top stroke lands as a
   straight ink line across the base of the neck. Trimming cannot remove it
   without taking the shoulder line too. **This is the one part that wants
   regeneration** — a torso whose neck continues into a short unlined seating
   column rather than a boxed collar. Nothing else needs redrawing.
2. **Trunks leg opening.** Drawn as a front-facing V rather than a profile hem,
   so the far leg-hole edge reads as a black wedge in front of the near thigh.
3. **Boot proportion.** Satisfying the declared 20px pre-ankle overlap from drawn
   paint puts the foot at ~0.76 of the shin length rather than ~0.6.
4. **Rig proportions.** The 29% thigh-versus-forearm rescale is the same
   long-arm-stylization question left open in the morning audit of 2026-08-24.

## Validation

`npm run art:normalize-profile-v2` — 20 joint zones across 72 checks, all pass.
`node --test tests/*.test.js` — **375/375** (368 before, +7 here).

## Addendum — the profile fit cannot place the far foot (2026-08-26, later)

Derek's read of normalized v2 was that it still "looks kinda messed up." He is
right, and the cause is not the art or the normalization. Comparing the assembly
against the approved v3 profile panel side by side — the check that should have
been run from the start, and was not — the assembled figure reads **one-legged**.

The profile landmark fit declares:

| | ankle | sole |
| --- | --- | --- |
| near (left) | 387, 666 | 385, 720 |
| far (right) | 389, 666 | 441, 702 |

The two ankles are 2px apart; the two soles are 56px apart. In the drawn master
the two boots are both upright and parallel, offset roughly 40px diagonally. No
placement of one unmirrored boot asset satisfies both anchors:

- **honour the ankles** — each boot stays attached to its own shin, but the two
  feet stack and the figure reads one-legged (this is what v1 and v2 both did,
  and it is what is committed now);
- **honour the soles** — the far boot detaches from the far leg and floats
  forward, figure width blows out to 135% of the master;
- **rotate to join ankle and sole** — the far foot stands on its toe at 55°.

All three were built and looked at; screenshots are reproducible from the tool.

The far sole was measured at the far boot's painted **toe** while the near sole
sits under its own ankle, so the two landmarks are not measuring the same
feature. That is consistent with the 2026-08-24 note that "far-foot soles record
their real painted height rather than duplicating the planted pixel" — the
consequence for assembly was not followed through at the time.

**This is a landmark-contract defect and belongs to Codex, not to the
normalizer.** The normalizer now honours the ankles and documents the choice
inline rather than papering over it with a hand-tuned offset. Either the near
ankle sits ~40px too far forward, or the far ankle ~40px too far back, or the
far foot needs its own declared placement rather than sharing the bilateral boot
anchors. Fixing it is a re-fit, not a re-cut: no part needs regenerating.

Everything else in the v2 delivery stands and was independently verified — the
neck collar and the thigh knob are genuinely gone, 20 zones / 74 checks green,
deterministic, 377/377.

## Addendum 2 — a rig-tuner preview was built and backed out (2026-08-26, later)

Derek asked to assemble the normalized cells in the rig tuner to judge them
interactively. It was built, looked at, and **reverted the same session**. The
repo carries no trace of it; this note exists so the path is not rediscovered
from scratch, and so nobody mistakes it for a green light.

What it took, if it is wanted once the runtime is ready:

- `src/rig/partVariants.js` already honours a per-character `assetRoot`
  override, previously unused. That is the clean hook — no loader change needed.
- The runtime wants a flat `BASE_PART_FILES` layout (`upper_arm.png`,
  `pelvis_underlay.png`, …), so the normalized cells need staging/renaming into
  `src/assets/wrestlers/<id>/` rather than being pointed at in place.
- The tuner builds its character picker from `Object.keys(CHARS)`, so a roster
  entry is a one-line change.

**Why it was wrong to do now.** The v2 manifest still declares all seven
`runtimePrerequisites` as `pending` — no v2 compiler, no uniform-density
profile renderer, no body-view channel, no view depth-order transport. The
preview therefore rendered profile-only cells through the existing near/far rig,
which is a different contract: the runtime mirrors one limb set across sides,
while the profile set deliberately authors near and far forearms separately, and
the flat asset layout has a single `hand` slot so the palm-side hand could not
be wired at all. Box values had to be seeded from manifest canvases rather than
measured. The result would have shown Derek an assembly whose faults belonged to
the preview scaffolding, not to the art — the same class of mistake as judging
the earlier proofs without comparing them against the approved master.

Derek's call, and the right one: "let's follow best practices and do things when
they are ready." The profile art is judged from the normalizer proofs until the
runtime prerequisites are real.

Unrelated and pre-existing, noted while there: `tools/rig-tuner/smoke.mjs`
reports 24/30. Verified against a pristine checkout of `rig-tuner.js` — the six
failures are baseline-restore assertions that already failed before this session
touched anything.

## Addendum 3 — the sole inconsistency is not confined to profile (2026-08-26)

Codex confirmed the far-foot finding and scoped the next step as a profile
re-fit. Checking all five views' ankle/sole landmark pairs first, **two views
carry the defect, and the anomalous side is not the same in both**:

| view | near ankle->sole | far ankle->sole | ankle gap | sole gap |
| --- | --- | --- | --- | --- |
| front | (-21, 54) | (22, 54) | 102 | 145 |
| front3q | (-31, 42) | (-19, 54) | 86 | 99 |
| **profile** | (-2, 54) | **(52, 36)** | **2** | 59 |
| **back3q** | **(-69, 44)** | (-1, 54) | **2** | 71 |
| back | (1, 54) | (1, 54) | 102 | 102 |

The healthy signature is an ankle->sole vector of roughly (small, 54) — the foot
hanging under its own ankle — with the two ankles 86-102px apart. Profile and
back3q both collapse the ankle gap to 2px, and each has exactly one foot whose
sole vector is anomalous: the **far** foot in profile, the **near** foot in
back3q.

A profile-only re-fit would therefore leave back3q to resurface later.

For the profile correction magnitude: the blue boot pixels in the approved v3
panel cluster around x=348 and x=390 with a toe tail out to x=446, so the drawn
feet sit roughly **42px apart** against the fit's 2px. That is consistent with
the ~40px implied by the three failed placements.

Two limits on this, held honestly. Back3q is confirmed to share the *signature*;
its art has **not** been checked against its own fit the way profile was, so it
is a strong lead rather than a proven defect. And front3q's (-31, 42) sits
mildly off the (small, 54) pattern without meeting the threshold — probably
fine, worth a glance during the re-fit.

## Addendum 4 — CORRECTION: the soles are right, the ankles are collapsed (2026-08-27)

**This supersedes the diagnosis in addendum 1 and addendum 3.** Those said the
far sole had been measured at the boot's painted toe while the near sole sat
under its own ankle — i.e. that the *soles* were inconsistent. That was wrong,
and Codex should not act on it.

Measuring the drawn boots per view (blue paint below the knee line, split at the
trough between the two boot masses) against the declared landmarks:

| view | drawn boot gap | declared **sole** gap | declared **ankle** gap |
| --- | --- | --- | --- |
| front | 117 | 145 | 102 |
| front3q | 87 | 98 | 86 |
| **profile** | **55** | **56** | **2** |
| **back3q** | **75** | **70** | **2** |
| back | 111 | 102 | 102 |

In both broken views the declared **sole** gap matches the drawn boots almost
exactly (56 vs 55, 70 vs 75). It is the **ankles** that are collapsed onto one
another. Exactly one ankle per view is misplaced, and the other is already right:

- **profile** — the **far (right)** ankle is at x=389 but its own sole is at
  x=441: **52px too far back**. The near ankle (387 over sole 385) is fine.
- **back3q** — the **near (right)** ankle is at x=395 but its own sole is at
  x=326: **69px too far forward**. The far ankle (397 over sole 396) is fine.

### This is a two-bone chain solve, not a point nudge

`checkV2MasterSpans` validates `Hip->Knee` and `Knee->Ankle` to exactly the
declared `sourceSpansPx` (tolerance 1e-9). Moving an ankle without moving its
knee will fail the gate. Both bones must be re-solved with the hip fixed.

**And the obvious target is out of reach.** Two-bone max reach is
101.24 + 98.02 = **199.26px**:

| view | leg | ankle target | hip distance | |
| --- | --- | --- | --- | --- |
| profile | right | (441, 666) — keep current y | 203.6 | **UNREACHABLE** |
| profile | right | (441, 648) — sole minus 54 | 186.0 | reachable, bent knee |
| back3q | right | (326, 666) — keep current y | 207.8 | **UNREACHABLE** |
| back3q | right | (326, 656) — sole minus 54 | 198.3 | reachable, but see below |

So each corrected ankle has to rise as well as move sideways. Note back3q's
198.3 against a 199.26 limit — that is a 0.96px margin, i.e. an almost perfectly
straight leg, and it will be numerically fragile. Worth choosing the ankle y for
back3q deliberately rather than taking sole-minus-54 as given.

`plantedSoleVerticalDrop` (54) is only gated on the planted side named by
`bootSourceSideByView`, so the non-planted foot's drop is not itself constrained.

Nothing here changes the conclusion that **no artwork needs regenerating or
recutting**. It changes only what the re-fit must move, and tells Codex that the
naive placement fails a validator gate before it ever reaches a proof.

## Addendum 5 — independent review of the re-fit: REVISE (2026-08-27)

Reviewed Codex's profile + back3q ankle re-fit against Derek's brief. **back3q is
correct. Profile's far foot is still wrong.** Recommendation: revise, scoped to
one landmark.

### Mechanical — all green

- Pass-A v3 `ce78aea3…3dceb`; normalized-v1 and normalized-v2 both re-verified
  against their own `SHA256SUMS.txt` with **0 mismatches**.
- The approved profile-v2 source parts are untouched (rolled hash of all 14
  unchanged across the session).
- **All 14 normalized cells are decoded-pixel identical to v2** — only PNG
  container bytes differ. The artwork genuinely did not change.
- All `Hip->Knee` / `Knee->Ankle` / `Shoulder->Elbow` / `Elbow->Wrist` spans
  exact across all five views.
- `art:validate-landmarks`: 62 opaque joint disks, 63 reuse/vector checks, 10
  semantic soles (5 planted), 0 occupied production cells.
- Full suite **380/380**. Normalizer self-check 20 zones / 74 checks / 0 failures.
- Zero enclosed joint gaps in either neutral assembly.

### The re-fit did exactly what it should have

Only the two identified ankles moved, each with its knee (the required chain
solve). Soles, hips and the other ankles are untouched:

| | was | now | moved |
| --- | --- | --- | --- |
| profile rightKnee | (391,568) | (427,564) | 36.2px |
| profile rightAnkle | (389,666) | (429,662) | 40.2px |
| back3q rightAnkle | (395,666) | (329,650) | 67.9px |

**No-reflection is now machine-enforced,** which is a real improvement: the
policy became `per-view-declared-opposite-transform` with
`oppositeTransformByView` declaring `unreflected-registration` for front3q,
profile and back3q. The validator was **strengthened**, not weakened — it now
requires that key and asserts each view's expected transform.

**The near-straight-leg concern did not materialise.** back3q's re-fitted right
leg sits at 7.59px reach margin — comfortably bent. Codex chose the ankle y
deliberately (dy=60 to its sole rather than 54) and bought that margin, which is
what was asked for.

### The blocker: profile's far ankle is in empty space

`rightAnkle` (429,662) is **not on the figure at all**. At y=662 the two boot
shafts occupy x=376-407 and x=339-369; the ankle sits **22px past the right edge
of the nearer shaft**, on background.

Tracing each foot's ankle->sole run through boot paint (blue or its own outline
ink), calibrated against the three views nobody disputes:

| view | near | far |
| --- | --- | --- |
| front | 100% | 100% |
| front3q | 100% | 100% |
| **profile** | 100% | **44.2%** |
| back3q | 100% | 100% |
| back | 100% | 100% |

Seven of eight feet sit wholly inside their own boot. Profile's far foot spends
the first 57% of its run in empty background before reaching paint. The assembly
is 125% of the master's width as a result (was 93% when the feet were stacked,
135% when the boot was placed by its sole).

**An ankle at x≈391 — the centre of that 376-407 shaft — is reachable** (hip
distance 195.1 against a 199.26 limit), so reach is not the constraint here.

### What I could not prove, and Codex should settle

Chasing this further, the profile sole landmarks look inconsistent with each
other, not just with the ankles. The paint reaching the ground at y=718-720 spans
x=367-407, which contains `leftSole` (385,720) — correct. But `rightSole`
(441,702) sits in the toe region that plausibly belongs to that *same* boot,
which would leave the shaft at 339-369 with no declared sole at all. **I cannot
prove this**: the two boots merge into one painted run below y≈675, so
connectivity cannot separate them, and my earlier attempt to settle it by
component labelling was wrong (the boots' own black outsole splits each boot into
several blue blobs — that check failed all five views including the healthy ones
and was discarded).

This matters because it decides the fix: if both profile soles are on one boot,
moving the far ankle to x≈391 is only half the correction and the far sole needs
relocating to its own boot's ground contact too.

**Correction to addendum 4:** that addendum asserted "the soles are right, the
ankles are collapsed." The ankle half holds. The sole half is no longer safe —
it rested on comparing declared sole gap against drawn boot-centroid gap, which
is too coarse to detect a sole sitting on the wrong boot.

### Recommendation: REVISE

One view, one foot. back3q is done and should not be reopened. Everything
mechanical passes and the stance is genuinely restored — this is a narrow
correction on top of real progress, not a rejection.

## Addendum 6 — DEFINITIVE boot-ownership ruling (2026-08-27)

Settled by tracing both boots through shaft, vamp and outsole to ground contact
using outline continuity and occlusion, then confirming visually against an 8x
annotated render of the Pass-A v3 profile panel. Blue-component labelling was
**not** used; that method was already shown to be invalid here.

### The two boots

| | shaft at y≈662-666 | outsole / ground | toe tip | depth |
| --- | --- | --- | --- | --- |
| **A** | x 340-369 | reaches y=716-720, thick outsole across the bottom-left | ≈x414 | **front (occludes B)** |
| **B** | x 376-408 | outsole visible right of A, higher | ≈x447 | **behind A** |

Boot A is drawn on top: its outline is unbroken across the overlap and B's vamp
is interrupted behind it. At y=704 the two are separated by background at
x=412-416, which is what makes the split provable rather than inferred.

### Ownership ruling

- **`rightSole` (441,702) is owned by boot B** (shaft 376-408). It sits on B's
  toe/outsole, right of A's toe tip.
- **`leftSole` (385,720) is owned by boot A** (shaft 340-369). It sits on A's
  outsole at the lowest painted row.
- Boot A is therefore the **near** foot (cameraNearSide = left) and boot B the
  **far** foot, consistent with A occluding B.

**Both soles are correct and neither needs moving.** This restores addendum 4's
finding and **retracts the doubt raised in addendum 5** — that doubt came from a
coarse centroid comparison, and the outline trace overturns it.

### Answer to question 4: ankle + knee chain correction only. No sole correction.

### Both ankles are on the wrong boot

- `rightAnkle` (429,662) — in empty background, right of both shafts.
- `leftAnkle` (387,666) — inside **376-408**, i.e. standing on boot **B**, the
  far boot. It should be on boot A.

Both are displaced right by roughly the same amount, which is why the assembly
keeps its stance width but floats the feet away from the legs.

### Proposed coordinates

Ankle y is pinned: the near foot is the planted side, so
`plantedSoleVerticalDrop` (54) fixes `leftAnkle.y` = 720-54 = **666**.

**FAR (right) — clean fix.** Ankle **(392, 662)**, the centre of boot B's shaft.
Hip distance 195.09 against the 199.26 two-bone limit — **margin 4.17px**, safely
bent. Solved knee **(415.2, 566.8)**; both spans hold exactly by construction.

**NEAR (left) — cannot be fixed within the current constraints.** With
`leftHip` (378,467) and the ankle pinned at y=666, the hip-to-ankle vertical
drop is **199.00px against a 199.26px reach**. The entire system holds **0.26px
of slack**, and only at zero horizontal offset. The reachable ankle window is
x=367.8..388.2, which clips boot A's shaft (340-369) at just **x=368-369**, with
**0.01px margin** — a fully locked knee. Boot A's shaft centre, x≈354, is
**unreachable** (200.4 > 199.26).

This is a structural finding, not a fitting error, and it is newly surfaced: the
profile near leg is drawn at essentially full extension, so no hip move can buy
meaningful slack either (even a hip directly above the ankle yields only 0.26px).
Resolving it means changing one of: `leftHip`, the planted-sole drop, or the
declared thigh/shin spans — each of which reaches beyond this re-fit.

### Recommendation to Codex

1. Apply the **far** ankle correction now: `rightAnkle` -> (392,662), knee ->
   (415.2,566.8). Unambiguous, comfortable margin, and it is the defect that put
   an ankle in empty space.
2. Do **not** force the near ankle to 368-369 to make it technically land on its
   own boot. A 0.01px margin passes the gate and produces a locked knee; it
   trades a visible fault for a hidden fragile one.
3. Raise the near-leg extension question to Derek as its own decision.

back3q remains approved and frozen. The proof-alpha seam remains parked.

## Addendum 7 — exact integer solutions, and why the near leg is the real problem (2026-08-27)

**Supersedes the coordinates proposed in addendum 6.** That addendum proposed a
far ankle at (392,662) with a real-valued knee. It is not usable: master
landmarks are integers, and `checkV2Span` requires the bone spans to match
*exactly* (1e-9). The declared spans are themselves integer-lattice distances —
thigh² = 10250, shin² = 9608 — so only integer coordinate pairs on those circles
are legal. (392,662) is not one of them.

### The complete legal solution set

Searching the lattice, with each ankle required to land on its own boot:

| leg | hip | exact solutions on the correct boot | margin |
| --- | --- | --- | --- |
| near (left) | (378,467) | **ankle (369,666), knee (371,568)** — the only one | 0.06 |
| far (right) | (398,467) | **ankle (393,666), knee (391,568)** | 0.20 |
| | | ankle (389,666), knee (391,568) | 0.06 |

So the correct fit is:

```
leftAnkle  (369,666)   leftKnee  (371,568)     -> boot A, the near foot
rightAnkle (393,666)   rightKnee (391,568)     -> boot B, the far foot
```

Both soles stay exactly as they are. Ankle gap becomes 24px against a 56px sole
gap, which is what a stance with a forward-pointing near foot should look like.

### Why the re-fit went where it did

The pre-re-fit `rightAnkle` (389,666) was **already on boot B** — the ownership
was right. What was wrong was the **near** ankle at (387,666), which was also on
boot B. Two ankles on one boot is what collapsed the stance. The re-fit then
moved the *far* ankle off boot B into empty space to buy reach margin, which
traded a correct-but-cramped fit for a visibly floating one.

At y=662 there are only four legal integer solutions for the far leg and **none
of them lands on boot B**, which is why that search dead-ended. Freeing the far
ankle's y (it is not gated — `plantedSoleVerticalDrop` constrains only the
planted near side) reopens it at y=666.

### The structural finding, which is the real issue

Hip y=467 to planted sole y=720 is **253px**. Declared leg reach plus sole drop
is 199.2627 + 54 = **253.26px**. The entire hip-to-ground chain holds **0.26px
of slack**.

Both legs are therefore straight by construction, and every legal solution sits
at 0.06-0.20px margin. No landmark placement can change this; it is a proportion
relationship between the declared skeleton and the drawn figure. Options are a
lower hip line, a shorter planted-sole drop, or longer thigh/shin spans — all of
which reach past a landmark re-fit and are **Derek's call**.

The recommendation stands: apply the ankle/knee pairs above, and treat the
zero-slack leg chain as a separate decision rather than a blocker.

## Addendum 8 — independent verification of v4: APPROVE the foot fit (2026-08-30)

Codex applied addendum 7 exactly. Verified independently rather than on report.

### Mechanical — all green

| check | result |
| --- | --- |
| Pass-A v3 | `ce78aea3…3dceb` unchanged |
| normalized v1 / v2 / v3 | 0 mismatches each against their own SHA256SUMS |
| normalized v4 | 0 mismatches against its own SHA256SUMS |
| approved profile-v2 source parts | rolled hash unchanged (`e06164bf…`) |
| landmark gate | 63 disks, 63 reuse/vector, 10 soles (5 planted), 0 occupied cells |
| full suite | **381/381** |
| normalizer | 20 zones / 74 checks / 0 failures |

Ten of fourteen cells are decoded-pixel identical to v3; only thigh, shin and the
two boots re-registered, which is exactly what moving the leg anchors should
touch. No source pixels were regenerated.

### The fit is right

The far foot is fixed outright: `rightAnkle` (393,666) now sits **100% opaque**
with a **100%** ankle-to-sole run inside its own boot B. Both profile soles are
untouched. back3q is unchanged and locked by an exact-coordinate regression test.
Assembly width moved 125% -> **110%** of the master, and visible skin in the boot
band dropped from 105px to **82px**.

### What Derek is accepting, stated plainly

Two landmarks are exempted from the painted-disk gate via
`registrationOnlyLandmarks`. The mechanism itself is sound — the validator
restricts it to knee/ankle targets and a test enforces that — but it is doing
real work here and should be an explicit concession, not a silent pass:

| landmark | opaque at r10 | note |
| --- | --- | --- |
| profile `leftAnkle` (369,666) | **53%** | straddles boot A's painted edge |
| back3q `rightKnee` (331,552) | **77%** | pre-existing; exempted in this pass |

profile `leftAnkle`'s ankle-to-sole run is **79.3%** inside boot A, against 100%
for the other seven feet across five views. This is not a fitting error: (369,666)
is provably the **only** legal integer point that puts the near ankle on its own
boot at all, and the previous value (387,666) was on the wrong boot entirely. It
is the visible symptom of the structural issue below.

Worth Derek knowing: back3q was approved before its `rightKnee` exemption
existed. 77% is comfortable and the coordinates never moved, but the approval
predates the declaration.

### Recommendation: APPROVE the foot fit

The stance is restored, ownership is correct, every gate passes, and the residual
is bounded and explained. Nothing further should be attempted as a landmark fit.

**The zero-slack leg chain remains Derek's decision and was not touched.**
Hip-to-ground is 253px against a declared reach-plus-drop of 253.26px, so both
legs are straight by construction at 0.06px and 0.20px margins. Accepting it
means accepting the near ankle's 53% disk and the small skin sliver behind the
near boot; changing it means a lower hip line, a shorter planted-sole drop, or
longer thigh/shin spans.

Nothing was modified during this review and nothing is committed.

## Addendum 9 — Derek accepts the zero-slack leg chain (2026-08-30)

Derek's ruling: **accept it.** The profile foot fit as delivered in
`profile-v2-normalized-v4` is approved, and with it:

- the 0.26px-slack hip-to-ground chain, so both profile legs are straight by
  construction at 0.06px and 0.20px extension margins;
- profile `leftAnkle` (369,666) at 53% opaque, exempted via
  `registrationOnlyLandmarks`, and the small skin sliver behind the near boot
  that follows from it;
- back3q `rightKnee` (331,552) at 77% opaque under the same exemption.

No hip-line, planted-sole-drop or bone-span change is authorized. **This is now a
settled proportion, not an open question** — it should not be reopened as another
landmark fit, and the exemptions should not be quietly widened.

### What this unblocks

The profile view is complete: art normalized, ownership settled, fit verified,
proportion accepted. The cutter may now expand to the remaining four views —
front, front3q, back3q, back — which was gated on exactly this approval.

Two things to carry into that expansion:

1. **Check each view's ankle/sole ownership the same way before trusting its
   fit.** The per-view ankle-to-sole continuity test is what caught profile and
   back3q; front, front3q and back all measured 100% and are believed healthy,
   but they have not been re-checked since the v4 landmark changes.
2. **The registration-only exemption list is a budget, not a tool.** Two entries
   are accepted. A third should be treated as evidence of a fit problem rather
   than a fix for one.

### Still parked

The proof-alpha seam — the non-rotated `blit` overwriting destination alpha and
punching translucent 1px seams into the proofs (11 strictly-interior cases,
inherited from `build-pass-b-profile-trial.mjs`) — remains untouched by Derek's
instruction. It affects proof images only, never asset bytes or runtime
rendering. Anyone reviewing the v4 proofs at high zoom will see those seams; they
are the renderer, not the art.
