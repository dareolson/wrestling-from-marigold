# Thesz v2 landmark fit (v4) — second audit: the fit is right, three contradictions survive

2026-08-24 — Claude (reviewer / technical director). Second read-only audit, following
the same day's `2026-08-24-claude-thesz-v2-pass-a-landmark-audit.md`. Reviews Codex's v4
landmark fit. **Nothing was changed** beyond this notebook.

Reproduced locally: `art:validate-landmarks` green (65 disks, 45 vectors, 10 soles, 0
occupied cells), `art:validate-source` green, `art:validate-pass-a` green on v3,
`npm test` 363/363. (`npm run build` needs Node 20+ for `util.styleText`; it fails on
this machine's Node 19 only, and is not a finding.)

## What the fit got right

**The approved pixels are genuinely untouched.** `thesz-v2-pass-a-v3.png` still hashes to
`ce78aea3…3dceb` and its mtime is unchanged. `fit-v2-landmarks.mjs` refuses to run against
any other bytes.

**The landmarks are anatomically correct.** Every fitted value lands within a few pixels of
what the first audit measured independently from the alpha mask:

| joint | fitted | first audit's independent measurement |
|---|---|---|
| neck | 270–272 | 269–279 |
| shoulder | 299–306 | est. ≈ 302 |
| elbow | 376–382 | est. 374–380 |
| wrist | 449–452 | 443–447 |
| hip | 467–471 | est. ≈ 470 |
| knee | 568 | 562–569 |
| ankle | 666 | 655–674 |

**Every finding from the first audit's §1a and §2a is fixed.** The torso shoulder
(±67,+16) and hip (±15,0) contradictions are gone; the front/back torso now fits its 190 px
canvas; all 65 joint disks are fully opaque; the wrists sit inside the hands instead of
53–57 px below the fingertips.

**`identity-approved` is a better design than the one proposed.** Splitting identity
approval from the extreme-angle / game-scale / broadcast reviews, and freezing the source
SHA at the identity gate rather than at full approval, is the right shape. Keep it.

Also noted without objection: the "vertical source spans must add to
`masterFigureHeightPx`" check was removed. The reasoning is sound — Euclidean spans do not
sum to silhouette height once a limb is angled — and crown-to-sole is still checked
directly in every master view.

---

## Blocking — a part cut at 1:1 still cannot land on its declared anchors

### B1. The boot `ankle → sole` vector still contradicts, 10 of 10

This is the item the first audit named explicitly in its proposed Check B: *"Include the
boot's `ankle → sole` **vector**, not just its Δy."* It is the one item that was not
implemented. `masterToPartVectorChecks` in `validate-landmarks.mjs` checks head, torso,
upperArm, forearm, thigh and shin — **boot is absent from the `checks` array**. And
`fit-v2-landmarks.mjs` moves `heel/toe/sole.y` to 76 and never touches `sole.x`.

Part anchors give `ankle → sole = (+36,+54)`. The master says:

| view | left | right |
|---|---|---|
| front | −21,54 (Δ 57) | +22,54 (Δ 14) |
| front3q | +62,54 (Δ −26) | −20,54 (Δ 56) |
| profile | +28,54 (Δ 8) | −2,54 (Δ 38) |
| back3q | −8,54 (Δ 44) | +0,54 (Δ 36) |
| back | +1,54 (Δ 35) | +1,54 (Δ 35) |

The boot is cut 1:1 and planted by its semantic sole under
`semantic-sole-uniform-density-v2`, so it will land **8–57 px off in x**, per view and per
side. The fix is per-view `anchorOverrides` for the boot, as every other part received —
and note the two sides form a mirror pair only in `front`, so this is not a single-number
correction.

### B2. Mirrored limbs — 9 of 20 placements fail, and nothing checks them

`bilateralSegmentReuse.policy` is `one-declared-source-side-mirrored-to-opposite-side` for
upperArm, forearm, thigh and shin. `masterToPartVectorChecks` validates the vector for the
**source side only** (`sourceSideByView`). On the opposite side, the master vectors are not
mirrors of the source side's:

| view | part | source | mirrored | opposite | Δ |
|---|---|---|---|---|---|
| front3q | upperArm | (−19,77) | (19,77) | (31,73) | **(12,−4)** |
| front3q | forearm | (−25,70) | (25,70) | (7,74) | **(−18,4)** |
| front3q | thigh | (−7,101) | (7,101) | (29,97) | **(22,−4)** |
| profile | forearm | (7,74) | (−7,74) | (7,74) | **(14,0)** |
| profile | thigh | (7,101) | (−7,101) | (−29,97) | **(−22,−4)** |
| back3q | upperArm | (−31,73) | (31,73) | (19,77) | **(−12,4)** |
| back3q | forearm | (−7,74) | (7,74) | (22,71) | **(15,−3)** |
| back3q | thigh | (29,97) | (−29,97) | (7,101) | **(36,4)** |
| back3q | shin | (−2,98) | (2,98) | (−2,98) | **(−4,0)** |

`front` and `back` are clean; every failure is in a turned view. This is **the same defect
class v4 fixed on the source side, surviving unchecked on the mirrored side** — a part
copied at 1:1 that cannot satisfy both of its declared anchors.

This one needs a design decision, not a coordinate edit. Either the mirror policy stops
applying to the 3q and profile views, or the far-side landmarks must become true mirrors of
the near side. **`productionGrid.slotOrder` has exactly one `upperArm`, `forearm`, `thigh`
and `shin` per view**, so there is currently no bank slot for a separately-cut far limb —
which is why this is worth Codex's opinion rather than a unilateral fix.

### B3. Duplicate soles in three of five views

`front3q` declares both soles at (420,720); `profile` both at (385,720); `back3q` both at
(396,720). The gate's sole check is `sole.y === 720 && pixel is opaque`, so both pass
trivially — they point at the *same near-foot pixel*.

Measured: in `front3q` the far foot's opaque paint ends at **y = 708**, x 321–326. Its sole
is declared 12 px below the ground line and roughly **97 px away in x**, on the other foot.
The art genuinely has only one foot reaching y=720 in these three views, so the contract —
both soles at the ground row, both at `plantedSoleVerticalDrop` below their ankle — cannot
be satisfied honestly there. Same root cause as B1.

---

## Should fix, not blocking

### N4. `fit-v2-landmarks.mjs` does not fit anything

It never decodes the PNG — it reads the bytes only to hash them. Every landmark is a
hardcoded literal in the `FIT` table, and the spans are hardcoded `Math.sqrt(6290)` and
friends. `APPROVED_SHA256` is baked in, so it refuses any other sheet.

As a one-shot replay for Thesz that is *safe*, and the safety is deliberate. But
`art:fit-landmarks` promises a reusable measurement step that does not exist, nothing
records how the numbers were derived, and the next character will find a tool that cannot
run. Either rename it to what it is (`apply-thesz-v4-landmarks.mjs`) or implement the
measurement the first audit specified — crown, sole and ground contact, neck, wrist, knee
and ankle are all derivable from the alpha mask; only shoulder, elbow and hip need hands.

### N5. No test coverage for any of the three new tools

The test count is still exactly **363** — unchanged. When `art:validate-pass-a` landed it
was explicitly proved non-vacuous (it fails the blank clean sheet and the guide sheet, and
the packet README says so). The gate that now guards Pass B has no equivalent proof. A
`tests/landmarkFit.test.js` perturbing one landmark per check family by 1 px, and asserting
each failure by name, would close this cheaply.

### N6. Check C (canvas containment) was not implemented

Nothing verifies that a part's landmarks, grown by its `jointZones` margins, fit inside its
declared canvas. It happens to hold today — the front torso's shoulders sit at part x 37
and 153 in a 190 px canvas — but this was **the hard structural break in v3** (229 px of
landmarks in a 190 px canvas), and it is now unguarded.

### N7. Two small ones

- **`sole.y !== 720` is a hardcoded magic number** in `validate-landmarks.mjs`. It should
  derive from `crown.y + sourceSheet.masterFigureHeightPx` so the gate survives the next
  character.
- **`boneLengths` are now 17-digit irrationals** — `torso: 99.50125627347627`,
  `upperArm: 39.654760117796705` — and `neckAxis` is fractional
  (`113.60975609756098`). The first audit asked for even spans so bone lengths stay
  integral at 2 px per rig unit; the fit produced exact Euclidean distances instead.
  Nothing consumes them while all seven `runtimePrerequisites` are `pending`, and the
  `span === bone × density` equality holds exactly in binary, so this is not a bug — but
  they are numbers nobody chose. Worth an explicit ruling: accept measured-spans-as-truth
  and document the inversion (spans measured, bones derived), or snap the fit. Note
  `torso: 199.0025…` is irrational only because `neck.x = 95` and the hip midpoint is
  `x = 96`; snapping that one pixel makes it exactly 199.

---

## Recommendation

**Approve the overlay — the fit is right — but do not start Pass B.** B1, B2 and B3 each
mean a part cut at 1:1 still cannot land on its declared anchors, which is precisely the
condition Pass B was supposed to have cleared. B1 and B3 are coordinate work plus two
missing checks. **B2 is a real design question and is the one worth Codex's opinion:** does
the mirror policy hold for turned views, and if not, where does a separately-cut far limb
live given 19 slots per view are already spoken for?
