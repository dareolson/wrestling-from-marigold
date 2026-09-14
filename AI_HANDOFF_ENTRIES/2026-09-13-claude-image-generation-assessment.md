# 2026-09-13 — Claude — Independent assessment: what image generation should and should not do here

**Read-only review. Nothing was changed** beyond this record and its Handoff Log
entry: no manifest, validator, producer, art, test, or runtime edit; no commits;
no pushes. Baseline `npm test` = **410/410** under Node 22.23.1.

Derek asked for an independent assessment of a proposal to use improved image
generation for a Lou Thesz v2 rebuild — five registered identity views, with the
repository's template, landmarks, two-anchor geometry, fixed export rectangles
and validators remaining authoritative.

The proposal describes work that already ran. Pass A produced seven candidates,
`thesz-v2-pass-a-v3.png` is the frozen identity-approved master, and Pass B
reached `profile-v2-normalized-v5`. So the answerable question is not "should we
try this" but "what does the executed pilot's evidence say about continuing it."
This entry records only what is **not already** in the handoff. The shoulder
disc, the coverage schema, producer parameterization and the Node pin are
covered by the 2026-09-07 entries and the pipeline review; nothing here reopens
them.

---

## A correction to record first

An earlier draft of this assessment said Pass B abandoned the 1:1-masking rule
"without recording it as a deviation." **That is wrong and the handoff proves
it.** `AI_HANDOFF.md:644` records Codex creating the generated profile part
sources on 2026-08-26, and `AI_HANDOFF.md:657` records Derek reviewing the
contact sheet and assembly proofs the same day and ruling that "the profile
parts pass as source material." It was a deliberate, approved decision.

What is true is narrower, and is Finding 4's sibling: the canonical documents
were never amended to match the approved practice.
`tools/wrestler-cutter/templates/CANONICAL_CHARACTER_SHEET_V2.md` still says
"**Never independently regenerate a base limb after identity approval**,"
`GENERATION_PROMPT_TEMPLATE.md` still specifies Pass B as an edit of the
approved sheet, and `pass-a/README.md` still says the bank is filled "by masking
the approved masters at 1:1 — never by regenerating a limb." The executed
pipeline does neither: `production.views.profile.sourceParts` points at the
generated board, and the Pass-A sheet is opened exactly once in the whole
producer chain — `normalize-profile-v2-parts.mjs:1308-1310` — to hash it and
throw if it changed. No Pass-A pixel reaches a production part.

That divergence costs nothing today, because Derek ruled on the actual artwork.
It costs on wrestler #2, who will be built from the documents.

---

## Finding 1 — The five masters are not one man, and nothing measures that

Cropping the five heads from the approved `thesz-v2-pass-a-v3.png` and placing
them side by side:

- **Hair, five different treatments.** `front` is a solid black mass with a
  sharp widow's-peak hairline and no internal marks. `front3q` adds white
  scratch-hatch strands and raises the hairline. `profile` has a distinctly
  lower, straighter hairline. `back3q` carries heavy **regular parallel
  comb-hatching** — a repeating micro-pattern the art contract explicitly
  forbids. `back` is solid black with a scalloped edge.
- **Face.** `front` is neutral and symmetric; `front3q` is visibly older and
  scowling with a pronounced nasolabial fold and jowl; `profile` is a cleaner,
  younger, straighter-nosed man. They do not read as the same person.
- **Ear** large and fully drawn in `profile`, absent in `front3q`, small in
  `back3q`. **Trapezius** narrow with a visible sternocleidomastoid in `front`,
  enormous in `back3q`. `back` carries a "v" mark at the nape that appears
  nowhere else.

All five panels pass `art:validate-pass-a`, and the manifest records
`humanReview.status: "identity-approved"`. The validator says plainly that
likeness is not measured; the point is that **no gate, human or mechanical, ever
compared the five panels to each other.** Pass A's review checklist asks whether
identity is approved "across all five views," which was read as five separate
judgements rather than one consistency check.

This is the failure mode to expect from any generator on a turnaround, and it is
why generating the remaining views as a batch does not "freeze identity" — it
freezes an inconsistency.

## Finding 2 — `back3q` has a pose baked into a structural part

The `back3q` head is **turned to look over the shoulder.** The Pass-A prompt
asks for five figures that are "the same person, same moment... they differ only
by camera view," so this is a prompt violation — but the consequence is
structural, not cosmetic. The head is a socketed part with an axis anchor. A
turned head makes the `back3q` head cell a pose rather than a neutral skin, and
all four expression variants derived from it inherit the turn. It cannot be
corrected downstream of the master.

## Finding 3 — The `profile` master is not a profile

Zooming the profile torso: a full frontal pectoral mass with the nipple placed
well inboard of the silhouette, a pec lower-border curve sweeping across the
chest, a sternum division, and the far deltoid visible behind. **The head is in
near-true profile and the torso is roughly 20-30 degrees turned.** The figure is
internally inconsistent about its own camera.

Silhouette *widths* are consistent with a profile — chest span 106px against
front's 173px, a ratio of 0.61, which is normal for a heavyweight — which is
exactly why width-based checks pass. The drawing is not.

This bears directly on the single-visible-limb ruling: candidate v5 presents a
strict one-arm, one-leg side stance wearing a three-quarter ribcage.

## Finding 4 — The span table in the canonical template is obsolete on every row

The 2026-08-24 landmark-contract correction refit the skeleton to the drawn
figure. `CANONICAL_CHARACTER_SHEET_V2.md` was never updated, and now contradicts
the shipped manifest everywhere:

| Span | Template says | `skeleton.sourceSpansPx` |
| --- | ---: | ---: |
| crown to neck | 116 | **82.87** |
| neck to hip midpoint | 196 | 199.42 |
| shoulder to elbow | 120 | **79.31** |
| elbow to wrist | 110 | **74.33** |
| hip to knee | 86 | **101.24** |
| knee to ankle | 88 | **98.02** |
| ankle to planted sole | **44** | **54** |

The template's numbers are the placeholder skeleton the Pass-A landmark audit
demolished; they give arms longer than legs at 43% of height.
`CHARACTER_ART_SOURCE_STANDARD.md` repeats the 44px sole drop in prose as a
runtime-blocking fact, and `AI_HANDOFF.md:1003` still asserts the boot drop is
"exactly 44 px, as declared" — true when written, before the refit.

Two second-order notes. The bone lengths are now non-integer floats fitted to
the art (`upperArm: 39.654760117796705`), which inverts the documented direction
that spans derive from declared bone length times density. That is defensible,
and it was Derek's call on 2026-08-24 — but it means every new wrestler needs
the same fitting step, and no workflow list says so.

**Anyone authoring wrestler #2 from the template authors the wrong body.**

## Finding 5 — The full source gate has never been green and is not run in the form that would say so

```
$ npm run art:validate-source -- <manifest> --sheet <pass-a-v3.png>
source manifest invalid (363 errors)
   75 front · 75 front3q · 69 profile · 69 back3q · 75 back
```

363 errors, evenly distributed, every one of the form "opaque core is 0/197
fully opaque pixels," because the production bank is empty in all five views.
Drop `--sheet` and the same command prints `lou_thesz_v2: source manifest valid
(11 parts)`. That second form is the one quoted in handoffs.

Related, and the same shape: `variantFamilies` declares 11 variants (5 heads, 3
hands, 3 boots) while `parts.head.variants`, `parts.hand.variants` and
`parts.boot.variants` are all empty and no variant art exists. And
`art:export-v2`, the deterministic 95-rectangle exporter, **has never been run**
— there is no `export-index.json` anywhere in the tree. `v5/parts/` holds 14
files named `near-*`/`far-*`, not the 19 canonical slots.

The canonical 4096 sheet, the 96-cell bank and the exporter are validated,
hashed, documented, and unused by the path that actually produces art. That is
worth stating plainly before the format is carried to eight more characters.

## Finding 6 — The value-family contract is measurably unmet in the approved master

The handoff correctly records that value families "are human review and are not
measured" (`AI_HANDOFF.md:955`). They had not been measured. They are now.

Against the five declared structural families (skin 179, skin shadow 147, boot
54, hair 42, ink/trunks 0), counting only fully-opaque pixels inside each master
panel:

| view | within ±4 luma of a declared family | within ±8 |
| --- | ---: | ---: |
| front | 19.6% | 43.8% |
| front3q | 18.1% | 39.0% |
| profile | 16.4% | 39.9% |
| back3q | 18.1% | 41.4% |
| back | 20.3% | 38.5% |

Eroding the mask 4px to exclude antialiasing changes almost nothing (front
18.8% to 17.9%), so this is genuine continuous-tone interior shading, not edge
softness. Even choosing the five **best-fitting** centres empirically —
`[4, 64, 162, 178, 187]` for front — covers only 76.4% within ±4. The front
panel contains **16,842 unique RGB values.**

The contract asks for four or five flat structural families. The approved master
has two tight clusters and a smear. This is the single most reliable, most
mechanical failure mode of image generation against this art direction, it is
cheap to check, and it would have been caught before any cell was cut.

## Finding 7 — The luma budget is measured in the wrong space

`Arena.js:857-858` applies `colorMatrix.grayscale(1)`, plus vignette and
`addBarrel(1.05)`; `Arena.js:2863-2870` lays a 1px black row every 2 rows at
alpha 0.18 on a 960x600 canvas.

Sampling the left wrestler from `ARENA_LIGHTING_EVIDENCE/01_baseline_idle.png`
and `02_lighting_idle.png` — approximate region box, stated so it can be
re-measured — **source skin at luma 179 arrives on screen at median about 92,
p95 about 129-131**, with the wrestler's whole on-screen range topping out near
146. The lighting pass itself adds little (92 to 94); most of the compression is
already in the base render.

So a 24-luma source separation is worth roughly 13-14 on screen. Gate A's
offline downscale/filter simulation does not include this compression, so the
24-luma budget is being checked in a space where it means about twice what it
means to the player.

Separately: **the game is grayscale at runtime.** All the colour work — the
mauve skin, the blue boots, the measured palette in `REFERENCES.md` — is
discarded by `grayscale(1)`. Generating in colour asks the model to optimise for
something no player sees, and image models optimise perceptual colour appeal
rather than luminance separation. Measured evidence of what that costs: the
declared hair (42) and boot (54) families collapse into a single empirical
cluster at about 64-66. Not a contract violation, since they are not adjacent on
the body, but it shows what the model does with the only axis that survives.
Monochrome generation is worth considering, with the caveat that the PRD's Game
2 is colour, so colour source has future value.

## Finding 8 — Three-quarter versus profile has never been adjudicated, and it is load-bearing

`DRAWING_GUIDE.md` argues, with a reason:

> "**Body: three-quarter view.** The wrestler's body faces roughly 45 degrees
> toward the camera — not pure side profile... **Head: three-quarter view.**
> Both eyes are visible... **A pure side profile limits you to one eyebrow and
> half a mouth; three-quarter gives you the full emotional range.**"

The v2 standard makes `profile` the primary gameplay view and requires a
single-visible-limb neutral. The `DRAWING_GUIDE` header disclaims its
edge-pivot, whole-forearm and whole-shin **joint** rules and says nothing about
the camera argument. No v2 document rebuts it, and no handoff entry adjudicates
it.

This is not academic:

- The PRD makes crowd reaction and performance a core mechanic.
- The sheet allocates five expression heads per view — `idle`, `hurt`, `effort`,
  `down`, `winning`. In strict profile at 154px those five have one eyebrow and
  half a mouth to carry them.
- The shipped George and Lou are three-quarter, and `RIG_AND_MOVE_PIPELINE.md`
  lists as a non-negotiable gate that "Lou and George's approved base
  silhouettes do not change merely because the pipeline exists." A v2 Thesz
  changes Lou's from three-quarter-with-two-legs to profile-with-one. That needs
  an explicit carve-out or the gate is dead letter.
- Finding 3 shows the generated master hedged anyway.

**Approving candidate v5 ratifies strict profile.** If the answer is
three-quarter, the single-visible-limb ruling, the profile master and v5 all go
back. It is a short decision that either confirms months of work or voids it,
and it should be taken before the approval rather than after.

> **RESOLVED the same day. Derek's ruling: three-quarter is the primary view**,
> with profile and the other views serving as tween and transition sources —
> profile for suplexes and similar move mechanics. `DRAWING_GUIDE.md` was right
> about the camera all along. v5 is re-scoped to a secondary-view candidate
> rather than the gate on the primary view, and the manifest's
> `views.profile.role: primary-gameplay-source` is now backwards. See the Status
> summary in `AI_HANDOFF.md` for the full consequence list.

---

## What is already covered, and is not reopened here

The pale deltoid disc and its source-repaint attribution; the coverage schema
and `coveragePart`; `measureMaskExposure` measuring the complement of the real
quantity; producer parameterization; the landmark table moving to manifest data;
the Node pin and the two hash meanings; `depthOrder` becoming data. All recorded
2026-09-07. This assessment agrees with all of it.

## Recommendations

1. **Settle Finding 8 before approving v5.** Blocking, cheap, and it gates
   everything else.
2. **Do not generate views 2-5.** `production.views` declares `profile` only,
   and all seven `runtimePrerequisites` are `pending`. Generating now produces
   inventory behind seven pieces of unwritten runtime code.
3. **Update the two documents** to the fitted spans and the 54px sole drop, and
   either amend the 1:1-masking rule to match approved practice or state the
   exception. Wrestler #2 reads these.
4. **Add the three checks Finding 6, 7 and 1 imply** — value-family
   quantization, post-filter luma separation, and a cross-view identity delta.
   All three are mechanically computable, all three failed silently on the
   approved master, and all three are currently listed as "human review."
   **Done, advisory:** `npm run art:measure -- --sheet <png>`
   (`tools/wrestler-cutter/measure-art-contract.mjs`). It reports value
   flatness, identity drift, broadcast presentation and micro-pattern
   periodicity, works with or without a manifest so it runs on a master sheet or
   an assembled proof, and exits 0 unless `--strict`. Its thresholds are
   proposed, not ratified — the standard's own rule is that an unchecked style
   target must not be described as an automated pass, and the inverse holds too.

   Three of its metrics were wrong in their first version and are worth knowing
   about, because each failed the repository's own "report the quantity that
   matters" invariant. The unique-colour count indexed the whole sheet's buffer
   with region-local offsets and returned 1 for every input. Hairline position
   and head dark-mass were grouped as view-invariant and reported 122.9% drift
   on a turnaround whose back view is correctly almost all hair; they are now
   compared only among views that show a face, detected from the art. And a
   sign-change busyness score graded back3q's comb-hatched hair *lowest* of the
   five views, because a hatched head is a few percent of a whole wrestler — it
   is replaced by autocorrelation periodicity, which is the property the
   contract actually names. `tests/artContractMeasure.test.js` pins each metric
   against synthetic art whose answer is known by construction, including
   hatching against irregular detail of identical busyness.
5. **Consider a non-rigged control pilot.** `src/assets/audience/` holds 18
   named characters at 8 frames each, and `tools/audience-cutter/cut.mjs`
   already ingests a chroma-keyed strip deterministically. One generated
   ringside extra answers "does generated art survive grayscale, scanlines and
   the lighting pass at broadcast scale" in days, with no joint contract, no
   anchors, no 95-cell bank and no runtime prerequisites — and it is the
   cheapest place to build the three checks above before they touch a wrestler.
6. **A second candidate worth knowing about.** `RIG_AND_MOVE_PIPELINE.md`
   records that hammerlock's grip variant resolves to base art because "no grip
   PNG exists yet," while the standard records that the hand/boot slot
   architecture is dead code in the shipped game because neither George nor Lou
   declares those slots. Splitting shipped Lou's baked forearm-hand at the wrist
   and producing `open`/`fist`/`grip` is a three-asset job that converts proven-
   dead architecture into proven-live architecture and unblocks an authored
   move. Noted as an option, not a recommendation against the v2 direction.

## Verification

All findings checked against `thesz-v2-profile-normalization` at `5baf203`,
working tree clean apart from the two pre-existing untracked files.
`npm test` 410/410 on Node 22.23.1.

`npm run rig:certify` could not be run: `node_modules` is not installed on this
machine and `tools/debug/harness.mjs` requires `playwright-core`. Worth noting
independently — a gate that needs a browser install is a gate that gets skipped
across nine wrestlers.

Measurements used Pillow and NumPy against the manifest's own declared panel
rectangles and family centres, on `thesz-v2-pass-a-v3.png` and the committed
`ARENA_LIGHTING_EVIDENCE` captures. Panel crops and the head montage were
written outside the repository and discarded. No art, manifest, landmark,
producer, validator or runtime file was touched.
