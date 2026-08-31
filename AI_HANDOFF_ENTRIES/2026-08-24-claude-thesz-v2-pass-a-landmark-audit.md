# Thesz v2 Pass A — landmark audit: the manifest's skeleton does not describe the drawn figure

2026-08-24 — Claude (reviewer / technical director). **Read-only audit. Nothing was
changed:** no manifest, validator, documentation, shipped asset, test, or runtime edit;
no commits; no pushes; no Pass B cells painted. Baseline `npm test` = **363/363 pass**.
The quarantined moustached reference was never opened.

Requested after a manifest-landmark overlay on the approved Pass A candidate exposed a
contract problem that `art:validate-pass-a` does not detect.

## Inputs verified

- `Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png`
  — SHA-256 `ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb`.
- `tools/wrestler-cutter/templates/rig-source-manifest.v2.example.json` (`thesz_v2_template`).
- `art:validate-pass-a` passes on v3 **and** on v2.
- `art:validate-source` passes on the manifest.

## Verdict

**The manifest is wrong, not the artwork.** Three independent lines of proof.

### 1. The manifest contradicts itself, before any pixel is examined

Pass B copies a fixed rect from a master panel into a part canvas at 1:1. That is a pure
translation `T`, so for each view and part there is exactly one `T` consistent with the
part's frame anchor, and every other part anchor must then land on its master landmark.
Solving `T` from `torso.neck` gives `T = (289,282)` in every view:

| view | anchor | part anchor lands at | masterLandmarks says | Δ |
|---|---|---|---|---|
| front | torso.leftShoulder | (337,346) | (270,330) | **(+67,+16)** |
| front | torso.rightShoulder | (431,346) | (498,330) | **(−67,+16)** |
| front | torso.left/rightHip | (365/403,502) | (350/418,502) | **(±15,0)** |
| front3q | torso.left/rightShoulder | (347/421,346) | (300/468,330) | **(∓47,+16)** |
| front3q | torso.left/rightHip | (369/399,502) | (360/408,502) | **(±9,0)** |
| profile | torso.left/rightShoulder | (365/403,346) | (365/403,330) | **(0,+16)** |
| back3q | torso.left/rightShoulder | (421/347,346) | (468/300,330) | **(∓47,+16)** |
| back3q | torso.left/rightHip | (399/369,502) | (408/360,502) | **(∓9,0)** |
| back | torso.left/rightShoulder | (431/337,346) | (498/270,330) | **(∓67,+16)** |
| back | torso.left/rightHip | (403/365,502) | (418/350,502) | **(∓15,0)** |

The **+16 px shoulder error is in all five views**; the horizontal error varies by view and
vanishes only in profile, which is why nothing looked wrong there.

Plus, in **all five views and both sides**, the boot: part anchors give
`ankle → sole = (36,44)`; `masterLandmarks` give `(0,44)` — a **36 px x contradiction**.
`checkV2PartSpans` compares only `|Δy|` for the planted sole, so it never sees this.

**A hard structural break.** `torso.canvas.w` is 190, hardcoded in `V2_PART_CONTRACT`
(`tools/wrestler-cutter/validate-source-manifest.mjs:68`). In `front` and `back` the
torso's own master landmarks span `x = 270…498` = **229 px**. No placement of a 190 px
canvas can contain them. The front/back shoulder landmarks are not merely mispositioned —
they are unrepresentable in the torso part at any offset.

So: the skeleton is internally *consistent* in the one dimension the validator measures
(bone spans) and internally *contradictory* in the dimension it does not (part anchors ↔
master landmarks ↔ canvas capacity).

### 2. The declared proportions are not the intended Thesz contract

Declared, on a 530 px figure: shoulder→wrist **230 px (43 % of height)**; hip→sole
**218 px (41 %)**. Arms longer than legs, at proportions no human has. `DECISIONS.md`
fixes only the height ("530 px master → 265 px near-ring. Matches real Thesz at 6'2\"")
and defers everything else to the likeness authority. Nothing in the settled decisions
asks for these proportions.

### 3. The art was never asked to hit these landmarks

`PASS_A_PROMPT.md`, verbatim:

> **Important: do not invent rig points. Anatomical landmarks, axes, and opaque-core
> rings are placed/refined on the separate guide layer after the five-view art is
> approved. Do not paint guide marks into the wrestler.**

The guide sheet *does* draw the labelled stick figure (`canonical-sheet.js:143-171`), but
the prompt's only geometric requirements were the panel rectangle and the exact 530 px
crown-to-sole height — both of which v3 satisfies exactly. Landmark placement is, by the
packet's own design, a **post-approval** step. The art is compliant. The placeholder
skeleton is the thing that was never fitted.

Candidate **v2** fails identically (40 vs 39 opaque-core failures), so this is not a v3
regression and not something a re-roll would fix.

## Exact discrepancies by view

Measured on the fully-opaque mask (alpha > 254 — the same threshold
`validateV2MasterPanelPixels` uses). Crown 190 and sole 720 are exact in all five views.

### Opaque-core coverage — 39 of 65 jointed landmarks fail

Every jointed landmark must carry a fully-opaque disc of its connection's
`opaqueCoreRadiusPx`. Counts below are non-opaque pixels inside that disc:

| landmark | front | front3q | profile | back3q | back |
|---|---|---|---|---|---|
| leftShoulder r12 (441 px) | **441** | **441** | ok | **441** | **441** |
| rightShoulder r12 | **441** | **209** | ok | **405** | **441** |
| leftElbow r10 (317 px) | **247** | **116** | ok | **152** | **144** |
| rightElbow r10 | **251** | **3** | ok | **50** | **137** |
| leftWrist r8 (197 px) | **197** | **197** | ok | **197** | **197** |
| rightWrist r8 | **197** | **197** | ok | **197** | **197** |
| leftKnee r10 | **45** | ok | ok | **1** | **21** |
| rightKnee r10 | **55** | **292** | ok | **285** | **54** |
| leftAnkle r8 | **185** | ok | **66** | **10** | **176** |
| rightAnkle r8 | **196** | **197** | ok | **196** | **196** |

`441/441` means the landmark sits in fully transparent space. Profile passes almost
everything — in that view every declared x happens to land somewhere on a narrow
silhouette. That is the whole reason the fault survived review.

### Landmark y vs drawn anatomy (declared − measured)

Measured features are silhouette width-extrema, reproducible from the alpha mask.

| joint | declared y | measured y (front / f3q / profile / b3q / back) | error |
|---|---|---|---|
| crown | 190 | 190 everywhere | **0 (exact)** |
| neck base | 306 | 271 / 272 / 279 / 272 / 269 | **+27 … +37** |
| shoulder | 330 | not silhouette-resolvable; nearest opaque px is 27.5–30.8 px away in front/back/back3q | outside anatomy |
| elbow | 450 | drawn elbow crease ≈ 374–380 (front); y=450 coincides with the drawn **wrist** | **≈ +70 … +76** |
| wrist | 560 | 443–447 | **≈ +113** |
| hip | 502 | crotch / leg split at 472 (front) | **≈ +30** |
| knee | 588 | 566 / 562·568 / 557 / 566·569 / 568 | **+20 … +26** |
| ankle | 676 | 665·667 / 659·665 / 655 / 666·673 / 674 | **+2 … +17** |
| sole | 720 | 720 everywhere | **0 (exact)** |

### The unarguable one: the wrist is declared below the end of the hand

Painted row ranges inside a ±28 px band on the declared wrist x, wherever the arm is
silhouetted clear of the torso (alpha > 0):

| view / side | arm + hand paint | next paint below | declared wrist |
|---|---|---|---|
| front left | 336…**507** | 699 (boot) | **560** |
| front right | 337…**507** | 697 (boot) | **560** |
| front3q left | 332…**504** | 677 (boot) | **560** |
| back3q left | 328…**504** | 692 (boot) | **560** |
| back left | 328…**505** | 694 (boot) | **560** |
| back right | 326…**505** | 692 (boot) | **560** |

The wrist joint is declared **53–57 px below the last painted pixel of the hand**, inside a
~190-row band of pure transparency. No judgement about "where the true wrist is" is
required to call this wrong.

### Sole x does not sit on the drawn footprint

Ground-contact runs at y = 720 vs declared sole x:

| view | painted contact (centre) | declared soles | error |
|---|---|---|---|
| front | 303–323 (313), 449–467 (458) | 350, 418 | **~37 / ~40 px inboard** |
| front3q | 409–434 (422) | 360, 408 | 14 px (near foot) |
| profile | 379–392 (386) | 375, 393 | ok |
| back3q | 391–401 (396) | 408, 360 | 12 px |
| back | 328–335 (332), 430–438 (434) | 418, 350 | 16 / 18 px |

Same root cause as the boot contradiction above: `masterLandmarks` place the sole directly
under the ankle; the boot part places it 36 px toward the toe.

### Two incidentals worth recording so they are not rediscovered

- The exact-530 guarantee is a **fully-opaque-core** measure. Including antialiasing
  (alpha > 0) the figures are **536–537 px** (front 187…724). Not a defect, but the
  `semantic-sole-uniform-density-v2` grounding contract should be written against the
  opaque core, not the visible edge.
- In profile the lowest rows (718–720) are a ~14 px bump near x = 386 rather than the
  boot's flat contact line (~333…415 at y = 717). The planted-sole row is being set by a
  bump, not by the sole.

## Recommendation: a manifest-only v4. No artwork exception.

**Do not authorize an artwork v4.** No artwork change is required or desirable: v3 is the
approved identity, `art:validate-pass-a` passes it, and the drawn anatomy fits every part
canvas at 1:1 once the landmarks are fitted (measured torso shoulder span ≈ 151 px vs the
190 px canvas; thigh ≈ 96 in a 180 canvas; shin ≈ 100 in a 210 canvas). Retouching or
regenerating the approved master to chase a placeholder skeleton is precisely the failure
this pipeline exists to prevent.

Deterministic procedure:

1. **Freeze the master.** On Derek's identity approval, write v3's SHA-256 into
   `humanReview.sourceSheetSha256`. `verifyV2SourceSheetHash` already enforces the binding.
2. **Measure what silhouette can resolve** — a new deterministic `art:fit-landmarks`:
   crown, sole and ground-contact x, neck (narrowest head-column row), wrist (narrowest
   arm-run row), knee and ankle (width minima between thigh/calf and calf/foot), crotch.
   Same rules used in this audit; byte-identical output for the same sheet.
3. **Place the three joints silhouette cannot resolve — shoulder, elbow, hip — by hand**
   in the existing `tools/wrestler-cutter/anchor-editor.html`, over the frozen master.
   This is the only judgement step, and it is recorded rather than re-derived.
4. **Derive, never hand-author, the dependent numbers.** `sourceSpansPx` ← fitted landmark
   distances; `boneLengths` ← spans ÷ `assetPixelsPerRigUnit`; each part's local anchors ←
   `master landmark − T`, with `T` chosen to centre that part's anatomy in its canvas.
   Deriving them is what permanently kills the ±67 / +16 / ±15 / +36 contradictions —
   those exist only because the two coordinate systems were authored independently.
   Constraint: spans must be **even** so `boneLengths` stays integral at 2 px per rig unit.
5. **Regenerate the guide** (`npm run art:sheet`) so the drawn skeleton matches, then
   re-run `art:validate-source`, `art:validate-pass-a`, the new landmark gate, and `npm test`.
6. **Human re-approval of the overlay** (art + fitted skeleton) before any Pass B cell.

### Provisional fitted chain (front view), for scale only

crown 190 → neck 272 → shoulder ≈ 302 → elbow ≈ 377 → wrist 447; hip ≈ 470 → knee 566 →
ankle 666 → sole 720. Spans: head 82, torso 198, upperArm ≈ 75, forearm ≈ 70, thigh 96,
shin 100, soleDrop 54 — which sums to exactly 530 crown-to-sole. Shoulder, elbow and hip
are the judgement calls from step 3; every other value is measured.

## The one call that is Derek's, not the auditor's

Fitting spans to the art **changes Thesz's rig proportions.** Shipped v1
(`src/Skeleton.js`: `upperArmH 68, forearmH 63, thighH 56, shinH 64`) also encodes
arms-longer-than-legs — but its own comments describe those as 1.5×/2× fudges from
2026-07-12 ("arm read too short", "thighs read squished"), i.e. tuning for the
stick-figure-era renderer, not a considered proportion contract. Fitting to the art gives
Thesz natural proportions and drops that stylization.

**Recommended:** fit to the art. All seven v2 `runtimePrerequisites` are `pending`, so
nothing shipped depends on the v2 spans, and any stylization Derek still wants belongs in
how the renderer places parts — not in a source manifest describing art it did not
constrain.

**The alternative, stated fairly:** if Derek wants v1's silhouette preserved, that is a
Pass A regeneration with the guide skeleton promoted to a binding target. That is a
different and larger decision, and it should be taken explicitly rather than by leaving
the placeholder in place.

## The measurable gate for Pass B

Proposed `art:validate-landmarks --sheet <approved> --manifest <m>`, run after
`art:validate-pass-a` and required green before the first Pass B cell is painted. Every
check is a geometric identity, so the tolerance is **0 px** — the judgement lives in the
fitting, never in the gate.

| | check | fails today |
|---|---|---|
| **A** | **Opaque-core coverage.** Every jointed master landmark: all pixels within its connection's `opaqueCoreRadiusPx` are alpha 255. | 39 / 65 |
| **B** | **Part ↔ master agreement.** Per view and part, solve the unique 1:1 translation from the part's frame anchor; every other part anchor must land exactly on its master landmark. Include the boot's `ankle → sole` **vector**, not just its Δy. | torso shoulders (all 5 views), torso hips (4), boot sole (all 5) |
| **C** | **Canvas containment.** The bounding box of a part's master landmarks, grown by its `jointZones` before/after margins, must fit inside the part's declared canvas. | front + back torso: 229 px needed, 190 px available |
| **D** | **Silhouette envelope.** No jointed landmark may lie in a row where its own limb has no paint, and each terminal landmark (wrist, ankle) must sit inside the painted limb with at least its `afterPx` of paint beyond it. | all 10 wrists |
| **E** | **Ground contact.** Each `*Sole` x must fall inside its own foot's painted run on the panel's lowest painted row. | front (both), back (both), front3q, back3q |
| **F** | **Existing span checks** (`checkV2PartSpans`, `checkV2MasterSpans`) — keep unchanged. | pass |

**A + D are exactly what `art:validate-pass-a` structurally cannot catch.** That gate
measures the figure's *extent* and the bank's *emptiness*; it never asks whether the
declared skeleton lands on the drawn body. Suggested warning line for the new gate, in the
existing house style: *"geometric check only: whether these landmarks are the
anatomically right joints remains human review."*

## Note on the tests

Landmark values are read from the manifest throughout `tests/`, never hardcoded — the one
value-touching assertion (`tests/sourceManifest.test.js:319`) perturbs
`back.masterLandmarks.leftWrist.y` by 1 and expects a span error, which stays valid under
any internally consistent fit. A v4 landmark correction should not require test edits
beyond adding coverage for the new gate.
