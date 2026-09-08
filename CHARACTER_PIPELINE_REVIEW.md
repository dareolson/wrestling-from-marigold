# Character Pipeline Review

**Status:** Working production policy, 2026-09-07

**Purpose:** Make adding a wrestler repeatable without mistaking mechanical
correctness for a visually successful character.

## Conclusion

The canonical-v2 work proved that the repository can freeze source identity,
register joints, export deterministic cells, and detect structural drift. It
did not yet prove that the process reliably produces a good assembled wrestler.
Thesz profile v4 is mechanically certified and useful pipeline evidence, but it
is not the visual template for future characters.

The next expansion is paused. Profile and back three-quarter first need an
approved **single-visible-limb silhouette**: one visible arm and one visible leg
in the neutral assembled view. The rig may retain left/right logical chains, but
it must not create a second offset limb merely to demonstrate bilateral
completeness. A hidden limb can be revealed by choreography when a move needs
it; that is a render/animation decision, not a reason to weaken the neutral
silhouette.

## What worked

- One cohesive multi-view identity master is better than unrelated generated
  cutouts.
- Explicit anatomical landmarks and two-anchor registration prevent joint
  drift that visual spot checks miss.
- Fixed source density, versioned candidates, hashes, and generated reports make
  the production history reproducible.
- Separate structural, opacity, orientation, and semantic-contact checks catch
  different classes of failure.
- Keeping v2 out of the match until its runtime prerequisites exist prevented a
  misleading partial integration from becoming production debt.

These mechanisms remain. The correction is to put them after a stronger visual
contract instead of letting them define that contract.

## What held the work up

### 1. The silhouette rule was wrong but mechanically explicit

The standard required one side-view limb painting to be duplicated for both
logical sides. That satisfied slot completeness while producing the extra arm
and leg that weakened the profile. Repeated landmark work could not solve a
composition problem.

### 2. Visual approval happened too early and meant too many things

Identity, source-part cleanup, landmark fit, and final assembled appearance were
treated as if one approval covered all four. Later criticism therefore looked
like reopening a settled decision instead of reaching the first meaningful
whole-character gate.

### 3. The process optimized parts before approving the assembled result

The normalizer proved joint zones and exact spans in detail before the final
silhouette had passed at actual game scale. This made local fixes cheap to
measure but made a necessary composition change feel expensive.

### 4. Numerical gates became a proxy for quality

Counts such as 63 landmark checks and 74 normalization checks are valuable
regression evidence. They say nothing about whether the stance, anatomy,
likeness, pose, or limb readability looks good. Reporting them beside approval
language obscured that distinction.

### 5. The first character carried too much future architecture

The 95-cell, five-view contract, future body-view transport, replacement
families, and runtime prerequisites were designed together before one view had
proved the complete visual-to-runtime path. That increased the cost of every
art-direction correction.

### 6. There was no iteration budget or escalation rule

Landmarks and normalization could be revised indefinitely. The process did not
say when repeated local correction was evidence that the master composition or
contract itself needed to change.

## Revised production gates

Each gate has one meaning. Passing a later mechanical gate never retroactively
grants visual approval.

### Gate 0 — view contract

Before generation, record for every view:

- camera direction and near side;
- visible limb count in the neutral silhouette;
- major occlusions and draw order;
- planted foot and intended stance width;
- which hidden limbs may appear during moves;
- required game-scale identity cues.

For the current Thesz contract, `profile` and `back3q` use one visible arm and
one visible leg in neutral assembly.

### Gate 1 — cohesive masters

Approve all five whole-body masters for identity and broad anatomy. This is not
part approval. Review the clean art at source scale and at the intended 265,
209, and 154 pixel wrestler heights.

### Gate 2 — assembled silhouette pilot

Choose one primary gameplay view and build only enough temporary parts to prove
the reassembled neutral figure and one mild articulated pose. Review stance,
limb count, proportions, occlusion, and broadcast readability. No exhaustive
landmark tuning or 95-cell export begins until this passes.

### Gate 3 — structural authoring

Place anchors, overlap cores, semantic contacts, and depth rules on the approved
silhouette. Run the existing mechanical validators. Failures here are
structural failures, not invitations to change the approved composition.

### Gate 4 — production cells

Extract fixed-density cells and variants, then rerun assembly proofs at all
three game scales. Approve the assembled result again. A candidate can be
mechanically certified while remaining visually rejected.

### Gate 5 — runtime proof

After the required compiler/render path exists, test the real Arena in both
facings and representative poses. Only this gate makes a view production ready.

### Gate 6 — view expansion

Expand one view at a time. Each view repeats Gates 1-5 as applicable; passing
profile does not visually approve back3q or any other view.

## Status vocabulary

Use these terms literally in handoffs and manifests:

- **candidate:** available for review;
- **visually approved:** Derek approved the named assembled proof at specified
  display scales;
- **mechanically certified:** automated structural and artifact gates pass;
- **runtime certified:** the real renderer passes its required scenarios;
- **production ready:** visually approved, mechanically certified, and runtime
  certified.

“Accepted to move forward” is a project-management decision, not visual
approval. Record it as such.

## Iteration limits

- After two local correction rounds for the same visible problem, stop and test
  whether the source composition or contract is wrong.
- A new exception or tolerance cannot be added solely to make a candidate pass.
- If the whole figure looks wrong while local checks pass, the whole-figure
  judgment wins and the work returns to Gate 0, 1, or 2.
- Preserve rejected candidates as provenance, but do not make future characters
  inherit their visual decisions.

## Immediate Thesz recovery plan

1. Keep normalized profile v4 frozen as mechanically certified provenance.
2. Revise the profile and back3q whole-view composition to one visible arm and
   one visible leg; do not begin by moving landmarks.
3. Produce clean neutral and mild-articulation assembly proofs at 265, 209, and
   154 pixels.
4. Get explicit visual approval for each view.
5. Decide how the hidden logical chains are represented by the compiler and
   move choreography.
6. Only then update landmarks/cells and resume expansion to the other views.

This review should be amended with Claude's independent findings before the
recovery implementation is considered final.

---

# Claude's independent review

**Added 2026-09-07, at Derek's instruction.** Stated goal: after this first test
case, adding up to eight more wrestlers should be relatively easy. That goal is
the measure I applied. A method can be correct about art direction and still
fail this project, because the thing being built is not one wrestler — it is the
machine that produces nine.

## Where I agree

The six-item failure analysis above is accurate, and three parts of it are worth
keeping verbatim: the separation of approval semantics, the status vocabulary,
and the iteration stop rule. The diagnosis that mechanical counts were reported
beside approval language, and thereby read as quality evidence, is correct and
understated. Finding 3 below is a concrete instance of it that the review did
not catch.

I also agree with the silhouette ruling itself, and I found independent
corroboration for it from a direction the review does not mention — see Finding
4.

## Where this review is incomplete

The review treats the delay as an art-direction problem. Most of it was. But
every gate it proposes is a *human judgment* gate, and none of the six findings
mentions the state of the tooling that has to carry those judgments to eight
more characters. Measured against the nine-wrestler goal, the tooling is the
larger problem, and it is invisible in the current text.

### Finding 1 — The pipeline is per-character source code, not a parameterized tool

Every producer stage hardcodes this character's paths at module scope:

- `normalize-profile-v2-parts.mjs:28-36` pins the Pass-A sheet, the source parts
  directory, the output directory, and `const VIEW = 'profile'`.
- `build-pass-b-profile-trial.mjs:15-18`, `extract-profile-v2-parts.mjs:12`, and
  `render-profile-v2-proofs.mjs:12` pin the same tree.
- No npm script accepts a character argument. `art:normalize-profile-v2`,
  `art:pass-b-profile-trial` and `art:apply-landmarks` take a view or nothing.

The validators are in better shape — `validate-source-manifest.mjs`,
`validate-pass-a.mjs` and `validate-landmarks.mjs` all parse argv and accept
manifest and sheet paths. So the *checking* half of the pipeline is already
general and the *producing* half is not.

The practical consequence: wrestler #2 is not a run of this pipeline. It is a
copy-and-edit of four .mjs files, after which the repository contains two
divergent normalizers that must be fixed in parallel forever. By wrestler #9
that is nine. This single fact will cost more than every landmark round to date,
and no gate in the model above would catch it, because it is not a defect in any
character — it is a defect in the space between them.

Recommended: before any recut, make the producer stages take
`--character <id>` and resolve every path from a per-character root. This is
mechanical refactoring against a green 381-test suite, and it is the highest
leverage work available right now.

### Finding 2 — Landmarks live in code, and there are two authoring paths

`fit-v2-landmarks.mjs` is not a fitter. Its own comment says so: "This command
replays an approved landmark contract; it does not alter pixels." The contract
is a frozen `const FIT` at lines 16-45 — eighty hand-picked points for one
character, in source. `applyFit` then hardcodes
`manifest.characterId = 'lou_thesz_v2'` at line 76 along with that character's
sheet filenames.

Meanwhile `anchor-editor.js:120` already downloads a complete manifest as JSON,
named by `characterId`. So part anchors have a data path and whole-figure master
landmarks have a code path, for the same character, in the same pipeline.

The manifest carries 226 hand-authored xy pairs — 452 numbers per wrestler, 36
pairs in each of the five views plus 39 in the part table. Nine wrestlers is
roughly four thousand hand-placed coordinates. Whether that number is
authored in a GUI and exported, or transcribed into a frozen const in a .mjs
file, is the difference between a pipeline and nine forks of one.

Recommended: master landmarks move into the per-character manifest.
`fit-v2-landmarks.mjs` keeps its genuinely valuable job — replaying and
verifying a contract against a frozen sheet hash — but reads the contract as
data. The Thesz `FIT` table becomes the first such data file, unchanged, so
nothing about the approved profile is disturbed by the move.

### Finding 3 — Two of the fourteen certified profile parts are empty files

`profile-v2-normalized-v4/parts/shoulder-mask.png` and `pelvis-mask.png` are
190x260 canvases containing zero opaque and zero partially-opaque pixels. Not
sparse — empty. Measured directly with the repository's own `decodeRgbaPng`.

Both are transparent by the same documented decision, recorded in the
normalizer's own comment: pelvisMask and the reserved shoulderMask stay empty
unless a stress proof proves a lip is needed. So neither is an oversight in
itself. But Finding 4 shows that decision was made against a measurement that
was pointing the wrong way, and the empty shoulderMask is the proximate cause
of the worst visible defect in the profile.

Both files were exported, hashed into `SHA256SUMS`, counted in the parts index,
and passed every structural gate, because those gates check that a declared slot
exists at the right dimensions, never that a coverage layer covers anything.

This is the review's fourth finding made concrete, and it is worth stating
plainly in the document: **the 63 landmark checks and 74 normalization checks
certified a part set in which one of the two coverage layers is blank.** Any
count reported next to the word "certified" should be read against that.

Recommended: add a non-empty-coverage assertion for every slot whose role is
occlusion, and make `pending` runtime prerequisites block the word "certified"
in generated reports rather than sitting beside it.

### Finding 4 — The worst visible defect is an uncoverable joint core, and the silhouette ruling will not fix it

I ran the diagnostic this review originally recommended. My first hypothesis was
wrong, and the real cause is worse — it is structural, it is in the schema, and
it survives the recut.

**Method.** I copied the normalizer, redirected its output to a scratch
directory, and reproduced v4. All fourteen parts and all three proofs came back
pixel-identical to the certified set, so the reproduction is faithful. I then
suppressed individual chains and diffed.

**Result.**

- Far arm suppressed: 338 pixels change, in a band at x399-429, y265-312. The
  far arm is almost entirely hidden behind the torso already.
- Far arm and far leg suppressed: changes confined to x383-459. This is the
  single-visible-limb condition, approximately.
- The pale un-outlined shoulder mass sits at x319-376. It is outside both of
  those regions. **It does not move when the far chain is removed.**
- Near upper arm suppressed: the arm disappears and the pale mass is still
  there.

The mass is the torso's own paint. `torso.png` carries two soft, un-outlined,
slightly lighter rounded lumps at the shoulders and a matching neck stub. Those
are its `continuous-fill-no-edge` joint-zone cores, and they are correct by the
standard — hidden overlap material is supposed to be inpainted and un-outlined,
because something is supposed to cover it.

**Why nothing covers it.** `parts.torso.jointZones.leftHip` and `rightHip`
declare `"coveragePart": "pelvisUnderlay"`. `leftShoulder` and `rightShoulder`
declare no coverage part — and cannot. `validate-source-manifest.mjs:581-582`
rejects the field outright: `coveragePart is only valid for split-pelvis hip
coverage`. The `shoulderMask` slot exists, but the manifest has no vocabulary to
bind it to the shoulder zones as their coverage owner, so it is rendered
intentionally transparent and the core paints straight into the silhouette,
un-outlined, against a torso whose every other edge is stroked.

So the hips got a coverage owner and a validator rule enforcing it. The
shoulders got the same kind of un-outlined core with the coverage concept
disallowed by schema.

**Why the instruments reported it as fine.** `measureMaskExposure` records
`shoulderMask: neutralPx 232, note: "near upper-arm overlap standing proud of
the torso above the shoulder"`. Its `pastShoulder` predicate is
`alphaAt(torso,x,y) <= 128` — it counts upper-arm pixels that fall *outside* the
torso. The defect is torso core pixels *not covered by the arm*. The measurement
is the complement of the quantity that matters, and it returns a small,
reassuring number.

**Consequences for the recovery plan.** Three, and the first is the reason I
would not start with the recut:

1. The single-visible-limb ruling does not address this. Removing the far arm
   and far leg changes pixels in a region that does not contain the defect. The
   revised profile will still have the pale shoulder.
2. Repainting the masters does not address it either. The core is generated by
   `fillJointZones`, not drawn by the artist.
3. It is not specific to Thesz. Every character will have `continuous-fill-no-edge`
   shoulder cores with no declarable owner. This is the clearest instance in the
   codebase of the review's own point that the first character carried too much
   architecture: the split-pelvis case was solved thoroughly and generalized to
   nothing.

**Recommended, and this replaces the diagnostic step:** allow `coveragePart` on
any joint zone, bind the shoulder zones to `shoulderMask`, and add the missing
schema invariant — *a zone declared `continuous-fill-no-edge` must name a
coverage owner, and that owner must be non-empty where the zone is exposed in
neutral assembly.* That invariant is mechanically checkable, would have caught
this before any art was cut, and is exactly the class of gate the pipeline
already knows how to build. It is also the single change that most improves
every one of the next eight wrestlers.

### Finding 5 — depthOrder is declared, validated, and never used

Each view declares a nine-entry `depthOrder`. `validate-source-manifest.mjs:741`
checks it contains each side and presentation layer exactly once, and the
normalizer copies it into the parts index. Nothing renders from it. The proof
renderer's `renderProofs` hardcodes the draw sequence in statement order — far
arm, pelvis underlay, far leg, head, torso, then the near stack.

For one character whose hardcoded order matches its declared order, this is
harmless. For a character whose views differ, the manifest will say one thing,
the proof will show another, and every gate will pass. Given that the whole
point of the new view contract is to make occlusion and draw order explicit per
view, a declared depth order that no renderer consumes is a contract with no
teeth.

Recommended: `renderProofs` iterates `depthOrder`. This also removes a
per-character edit from the normalizer, supporting Finding 1.

### Finding 6 — The mechanism the new ruling needs already exists, but is framed as a budget

Single-visible-limb needs a way to say "this joint is present for registration
but not visible." That mechanism is already built:
`registrationOnlyLandmarks`, currently `['leftAnkle']` on profile and
`['rightKnee']` on back3q.

It is capped in two ways that will block the new contract.
`validate-source-manifest.mjs:750` allows only knee and ankle targets, and the
handoff frames the list as "a budget, not a tool — a third entry is evidence of
a fit problem, not a fix for one." That framing was right for what it was
guarding against, which was silently exempting bad landmark fits. It is wrong
for expressing an approved visibility contract, and the two will be confused the
moment someone adds a shoulder to that array.

Expect three specific collisions when implementing the ruling:

- `validate-source-manifest.mjs:730,741` requires `depthOrder` to contain both
  `leftArm` and `rightArm`, and both legs, exactly once.
- `requireExactKeys(view.masterLandmarks, V2_MASTER_LANDMARKS)` requires all
  sixteen master landmarks including the hidden side's. This one should stay —
  hidden chains still need registration points, which is exactly the distinction
  the new contract depends on.
- `V2_VIEW_META` pins `role`, `runtimeStatus` and `cameraNearSide` per view name
  as universal constants, so those are currently Thesz's view semantics applied
  to all future characters.

Recommended: introduce a distinct per-view `visibility` block — which logical
chains render in neutral assembly — and keep `registrationOnlyLandmarks` as the
narrow exemption budget it was designed to be. Visibility is a design decision
that should be declared freely; an exemption is a concession that should stay
expensive. Collapsing them would lose the thing the budget was protecting.

### Finding 7 — The gate model has no human-approval budget

Six gates, five views, nine wrestlers. Gates 1, 2 and 4 each require Derek's
eyes, and Gate 6 repeats 1 through 5 per view. Applied literally, the model
schedules well over a hundred separate visual approvals to reach nine
characters. The first character took weeks with far fewer.

The gates are individually right. What is missing is the statement that the
per-character human cost is itself a design target. Without it, the natural
outcome is that the gates get skipped under time pressure, which returns the
project to exactly the condition this review was written to correct.

Recommended: state a budget in the document. Something on the order of three
approvals per new wrestler — identity masters, primary-view assembled
silhouette, and final assembled proof at the three game scales — with every
other view derived and mechanically checked. Then treat any additional approval
a wrestler actually requires as a defect report against the tooling or the
contract, logged as such. That converts human review load from an unbounded cost
into a measured signal, which is the same move the iteration limit makes for
correction rounds.

### Finding 8 — Running off the pinned Node silently breaks the checksum record

*Corrected 2026-09-07 after Milestone 1. The first version of this finding said
the PNG encoder was not byte-deterministic. It is. The divergence came from my
own reproduction running under the stale Node 19 on this machine's PATH rather
than the Node 22 pinned in `.nvmrc`.*

Reproducing v4 from unchanged inputs **under Node 22 reproduces every file byte
exactly**, and `SHA256SUMS.txt` verifies. Reproducing it under Node 19 produces
seventeen artifacts whose decoded pixels are all identical and whose PNG
container bytes all differ, so every recorded checksum fails.

That is a worse failure mode than nondeterminism, because it is silent and it
looks like success. An off-pin run produces correct artwork with a broken
provenance record, and nothing in the pipeline notices: the normalizer prints
"all normalization checks passed" either way.

The two hashes therefore mean different things and should be documented as such:

- `decodedPixelSha256` is the portable artifact identity. It depends only on the
  pixels the pipeline decided to draw and reproduces on any Node version.
- `fileSha256` is an environment-specific integrity check. It detects on-disk
  edits, and it only reproduces on the pinned toolchain.

Recommended: pin and enforce the Node version on every production command, and
state the distinction in the generated reports so a future reader knows which
hash carries the claim. Both are done in Milestone 1.

## Amendments proposed to the recovery plan

Keeping the six steps as written, with insertions. The diagnostic that stood
here in the first draft has been run; its result is Finding 4 and it changes the
order.

1. Keep normalized profile v4 frozen as mechanically certified provenance.
   Amend: record that its `shoulderMask` and `pelvisMask` slots are empty and
   that its shoulder joint cores render exposed, so the provenance is not later
   read as a complete part set.
2. **New, and first.** Fix the coverage schema: allow `coveragePart` on any
   joint zone, bind the shoulder zones to `shoulderMask`, and add the invariant
   that a `continuous-fill-no-edge` zone must name a non-empty coverage owner
   wherever it is exposed in neutral assembly. Repair `measureMaskExposure` to
   measure uncovered core rather than limb overhang. This is the defect the eye
   actually catches, it is character-independent, and every subsequent step
   inherits the fix.
3. **New.** Parameterize the producer stages by character and move master
   landmarks into per-character manifest data. Thesz's current values move
   unchanged. Do this before the recut, so the recut is the first run of the
   real pipeline rather than another one-off.
4. Revise the profile and back3q whole-view composition to one visible arm and
   one visible leg; do not begin by moving landmarks. Amend: add the per-view
   `visibility` block first, and make `renderProofs` consume `depthOrder`, so
   the revision is expressed as data rather than as another hardcoded sequence.
   Note that this step is now known *not* to fix the shoulder — step 2 does.
5. Produce clean neutral and mild-articulation assembly proofs at 265, 209, and
   154 pixels.
6. Get explicit visual approval for each view.
7. Decide how the hidden logical chains are represented by the compiler and move
   choreography.
8. Only then update landmarks/cells and resume expansion to the other views.

The ordering point behind steps 2 and 3 is the one I would most want carried
into the next session. The review correctly identifies that parts were optimized
before the assembled figure was approved. The same error is available again in a
new form: revising the composition before the pipeline can run a second
character means the revision is authored into the same one-off scripts, and the
nine-wrestler goal is no closer than it was in August. Finding 4 sharpens it
further — the composition revision was about to be asked to fix a defect it
cannot reach, which is precisely the third correction round on a
misattributed cause that the iteration limit exists to prevent.

## Verification

All findings were checked against the working tree at commit `b3f9e84`,
branch `thesz-v2-profile-normalization`. Test suite runs 381/381 green.

The Finding 4 diagnostic used a scratch copy of the normalizer with its output
directory redirected outside the repository. It first reproduced v4 from
unchanged inputs and confirmed all fourteen parts and three proofs were
pixel-identical to the certified set before any chain was suppressed. Alpha and
part measurements used the repository's own `decodeRgbaPng`. The scratch copy
has been deleted.

No art, manifest, landmark, normalizer, or runtime files were changed by this
review. `git status` after the diagnostic shows only Codex's four files.
