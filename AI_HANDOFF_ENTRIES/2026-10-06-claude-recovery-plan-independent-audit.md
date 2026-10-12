# 2026-10-06 — Claude: independent audit of the character-art recovery plan

Read-only audit, as commissioned by
`AI_HANDOFF_ENTRIES/2026-09-27-claude-character-art-recovery-audit-prompt.md`.
No code, art, manifest or existing document was edited. Verified on branch
`thesz-v2-profile-normalization` at `65ab92f`, Node 22.23.1.

Labels used throughout: **[FACT]** verified from current code or art and cited;
**[INFER]** reasoned from verified facts; **[REC]** recommendation; **[DEREK]**
a question only Derek can answer.

---

## 1. Bottom-line verdict

The recovery plan's direction is right and I would adopt it: keep shipped Lou,
treat generated sheets as donor material, make Procreate normalization a required
stage, and replace one small family at a time. Its diagnosis of the root process
failure — asking one generation to solve likeness, anatomy, decomposition and
production geometry simultaneously — matches what the artifacts actually show.
Three things in it need correction before work starts. The hand slice is **not**
the smallest end-to-end proof: on shipped Lou it requires a repainted handless
forearm, three hands, and new socket geometry, because Lou's fist is baked into
his forearm. A **whole forearm-plus-hand variant is one shared painting with no
new seam** and satisfies the hammerlock, which already authors the swap. The
`open` hand is requested by no clip in the library and should not be in Priority
0. Separately, I found a latent aliasing bug that permanently mutates a
character's shared socket config on the first face-left render; it is mostly
harmless today but becomes live, compounding corruption the moment per-variant
torso sockets are built on that same mechanism, which is exactly what the
inventory proposes. The architecture claims in the plan are otherwise accurate and
better tested than the plan gives them credit for.

---

## 2. Claims verified from code

**[FACT] The replacement architecture exists as described.**
`src/rig/partVariants.js` provides `BASE_PART_FILES` and `RENDER_PART_SLOTS`
(lines 1-24), semantic slots `workingHand`/`strikingForearm` resolved from live
facing (`SEMANTIC_PART_SLOTS`, `resolveSemanticSlots`, lines 40-60), side-specific
fallback chains (`SLOT_BASE_KEYS`, lines 63-80), shared families
(`SHARED_VARIANT_FAMILIES`, lines 90-92), geometry-inheriting variant merge
(`mergeVariantEntry`, lines 113-130), selection resolution with family fallback
(`resolvePartSelection`, lines 134-152), and single-source asset enumeration for
Phaser preload and the CLI validator (`enumerateCharacterAssets`, lines 154-176).

**[FACT] Side-specific near/far opt-in is real in the renderer.**
`src/Skeleton.js:335-351` reads `textures.farThigh ?? textures.thigh` and the same
idiom for shin, forearm, hand and boot. The upper arm is the documented exception:
`src/Skeleton.js:355` and `:373` both read `textures.upperArm` with no near/far
fallback.

**[FACT] Independent far-side articulation is real.** `src/Skeleton.js:1556-1565`
attaches `farForearm` at the far elbow with its own angle and `RIG.ELBOW_OVERLAP`;
`src/Skeleton.js:1461-1470` does the same for `farShin` at the far knee.

**[FACT] Variant reset on interruption is deterministic.**
`Skeleton.setPartVariants` (`src/Skeleton.js:619-645`) treats an omitted slot as
`base`, with the stated intent of never leaving "a fist, grip, hurt face, or bent
boot stranded". `src/Wrestler.js:476` routes clip selections through
`resolveSemanticSlots`, and `_resolveVariantSlots`'s neighbouring comment records
that MoveRuntime resets variants to base on cancel.

**[FACT] The variant path is well covered by tests** — 18 references across
`tests/partVariants.test.js`, `moveRuntime.test.js`, `animationClip.test.js`,
`clipStaging.test.js`, `hammerlockClip.test.js`, `jabClip.test.js`,
`articulatedContinuity.test.js`, `articulatedPosePath.test.js`.

**[FACT] Shipped Lou and George declare no `variants` key at all.** Confirmed by
grep over `src/characters/thesz.js` and `src/characters/george.js`. The move
editor's own README already records this at `tools/move-editor/README.md:115`.
So the architecture is 100% unexercised by production art — the plan's "underused"
is accurate, and the cause is art, not code.

**[FACT] The entire clip library's authored part-swap demand is two names.**
Across `src/animation/clips/*.js`: `workingHand: "grip"` (hammerlock, 35
keyframes) and `strikingForearm: 'fist'` (jab, `jab.js:51`), plus their `base`
bookends. Nothing requests an `open` hand, any head expression, any boot, torso
or thigh variant.

**[FACT] Both of those swaps are silent no-ops on shipped Lou today.** Lou
declares no `hand` entry, so `src/Skeleton.js:357` (`farHand`) and its near
counterpart evaluate to `null` and no hand is drawn or swapped — no placeholder
blob, which is good. Lou does declare `forearm`, so `strikingForearm: 'fist'`
resolves through `resolvePartSelection` to a missing variant, falls back to the
base entry, and renders base art with **no warning**.

**[FACT] Shipped Lou bakes hand into forearm and boot into shin.**
`src/characters/thesz.js` declares exactly `head`, `torso`, `upperArm`, `forearm`,
`thigh`, `shin` (lines 20, 63, 109, 139, 208, 285) — no `hand`, no `boot`.

**[FACT] Per-variant torso sockets are genuinely unsupported, and for a stronger
reason than the plan states.** Sockets are not on the torso part entry at all:
`src/Skeleton.js:526` reads `this._torsoSockets = textures.rigProfile?.sockets ??
null`, a sibling block, once in the constructor. `mergeVariantEntry` therefore has
nothing to carry — a torso variant has nowhere to put a socket. (Its explicit
carry-over list at `partVariants.js:124-130` also omits `sockets`, though `...base`
would pass an inherited one through.)

**[FACT — new finding] `_withFaceLeftOverrides` permanently mutates the shared
character config.** `src/Skeleton.js:1023-1033` does
`socketsSnapshot = { ...this._torsoSockets }`, then
`Object.assign(this._torsoSockets, o.rigProfile.sockets)`, then restores with
`this._torsoSockets = socketsSnapshot`. Because `_torsoSockets` **aliases**
`textures.rigProfile.sockets` (`:526`) and nothing clones the character config
(no clone in `src/Wrestler.js:351` or `src/rig/referenceRigRuntime.js:78`), the
`Object.assign` writes through to the module-level config object. Restoring the
*instance* pointer to a copy leaves the shared config permanently overwritten.
George is the live case — `src/characters/george.js:141-150` declares
`faceLeftOverrides.rigProfile.sockets.neck`. Reproduced against the real imported
config:

```
config neck BEFORE          {"u":0.612,"v":0.136}
aliases the config object?  true
during face-left render     {"u":0.451,"v":0.141}
instance after restore      {"u":0.612,"v":0.136} <- correct
config neck AFTER           {"u":0.451,"v":0.141}
a Skeleton built later sees {"u":0.451,"v":0.141} <- WRONG, face-left value in facing-right
```

That is a 0.161-of-torso-width neck displacement inherited by any Skeleton
constructed after the first George face-left render. **No test covers
`faceLeftOverrides` restore** (grep over `tests/` returns nothing).

**[FACT] Blast radius today is small.** `Arena._setupGame` has one call site
(`src/scenes/Arena.js:3018-3022`), so the shipped match constructs both wrestlers
once per page load, before any render. The exposed consumers are anything that
constructs a Skeleton *after* a render in the same process —
`src/rig/referenceRigRuntime.js:78` (reference rig, move-editor preview,
certification kernel) and the rig tuner's facing toggle.

---

## 3. Corrections to Codex's audit

**1. The hand vertical slice is not the smallest end-to-end proof, and the plan
understates its cost.** [FACT] Lou's fist is baked into his forearm, so a
separately socketed hand cannot be added without also repainting a **handless
forearm** — otherwise Lou renders two hands. The real Priority 0 cost is four new
paintings (handless shared forearm + `fist` + `open` + `grip`), a new `hand`
texture entry with box and anchor geometry, a wrist anchor that must hold across
three states, and a new seam at the wrist that did not previously exist. The plan
acknowledges the seam in "Known architecture limits to respect" but its "Why hands
first" rationale — "it changes a small area and therefore carries much less
silhouette risk than a torso or thigh replacement" — is in tension with that, and
the two sections should not both stand as written. [INFER] The wrist is also the
highest-motion seam on the character, so it is the *worst* first test of a new
overlap-painting contract, not the best.

**2. There is a genuinely smaller slice that the move library already asks for.**
[FACT] `forearm` is a shared variant family (`SHARED_VARIANT_FAMILIES`,
`partVariants.js:90-92`) and `resolvePartSelection` falls back from slot to family
(`:143-148`), so a single `variants.forearm.grip` painting serves both
`nearForearm` and `farForearm`. [REC] Make the first slice **one shared
forearm-plus-hand `grip` variant**: one painting, no new part slot, no new socket
geometry, no new seam, no handless repaint, and no change to `hammerlock.tracks.js`
beyond pointing its existing swap at `strikingForearm` (or adding a
`forearm`-family entry that `workingHand` cannot reach — see §4). It exercises the
entire path the plan wants to prove — donor → Procreate → aligned export →
deterministic cut → variant config → keyframe swap → reset → both facings → three
scales. Split hands become worthwhile when a move needs the wrist to rotate
independently of the forearm, which no current clip does.

**3. The `open` hand is speculative and contradicts the plan's own rule.**
[FACT] No clip in `src/animation/clips/` requests it; the whole library asks only
for `grip` and `fist`. The plan closes with "Do not build speculative parts merely
because the schema can hold them" and the audit brief asks for hand states tied to
an existing or known near-term move. [REC] Drop `open` from Priority 0 and
reinstate it when a reaching, whip or pin clip actually authors it.

**4. A missing or misspelled variant name fails silently, and nothing
cross-validates it.** [FACT] `setPartVariants` does `if (!key) continue`
(`Skeleton.js:627`) and `resolvePartSelection` falls back to the base entry, so a
typo renders base art with no error. [FACT] Nothing cross-checks clip `parts`
names against the characters' declared variants — grep finds no such validator in
`src/rig/certification.js` or `tools/rig/validate-character-rigs.mjs`. [INFER]
This is the same silent-failure class that let the bent arms and the baked-in head
through: the system reports success while doing nothing. [REC] Add one cheap
check to `rig:validate` — for every clip `parts` value, if the character declares
the target slot's base, it must also declare that variant, else fail. It is the
cheapest gate in this whole plan and it would have flagged `strikingForearm:
'fist'` as unsatisfied since the jab shipped.

**5. Fix the socket aliasing before building per-variant sockets, not after.**
[FACT] Proven in §2. [INFER] Today it is near-harmless because wrestlers are
constructed once per session. Per-variant torso sockets would run the same
patch/restore on **every keyframe swap**, many times per match, on an object that
is never restored — turning a latent leak into compounding corruption that would
present as a slowly wandering head and shoulders, and would be extremely hard to
attribute. [REC] One-line class of fix: deep-copy the sockets at construction
(`this._torsoSockets = { ...textures.rigProfile.sockets }`, or clone each point),
so the instance never aliases shared config. Add the missing restore test at the
same time. [REC] Then build per-variant sockets by generalizing
`_withFaceLeftOverrides`'s snapshot/patch/restore, which is already the correct
shape — this is a smaller change than the plan's "variant-specific socket support
or a different composite strategy" implies.

**6. The plan undersells its own test coverage and oversells test counts
elsewhere.** [FACT] The variant path has 18 test references across 8 files, which
the plan does not mention; "underused" reads as "unproven" and it is not. [FACT]
Conversely `CHARACTER_ART_RECOVERY_AUDIT.md`'s "Verified current baseline" leads
with `npm test` 544/544 — true, and I re-ran it — but per the brief's own
instruction, a passing count is not evidence of visual quality, and no test in the
suite renders a wrestler a human looks at.

**7. Nothing in the plan closes the misattribution's last propagation path.**
[FACT] Three commit messages state the invented direction as Derek's verdict —
`0d5119c` ("measure two of **his nine requirements**"; "should be broader and more
compact"), `c05e30b` ("requirement 1 reversed"; "the leanness Derek rejected"),
and `65ab92f` ("Requirement 1 now reads 'match the broader, more compact…'";
"Derek approves the prompt as corrected"). Commit messages cannot be edited, are
not covered by any document retraction, and are what a future session reads via
`git log` and `git blame`. Recorded in
`AI_HANDOFF_ENTRIES/2026-10-06-claude-misattribution-in-commit-messages.md`,
including my own authorship of the most enforceable version of the invention.
[REC] Treat that file as the retraction of record; do not rebase 33 unpushed
commits to rewrite three messages, because the evidence of how the error
propagated is worth more than a clean log.

**8. The plan does not name a build authority for Lou, which is now unowned.**
[FACT] Requirement 1 is withdrawn and the retired prompt's §1 named the Pass-A v3
`front3q` panel as the build authority. Measured 2026-09-26 with one method:
`LouTheszFullBodyRef.png` reads 46.7% legs as a fraction of figure height, the v5
draft 42.8%, and that Pass-A v3 panel 40.4% — the **most compact** figure of the
three. [INFER] The compact drift was therefore already in the Pass-A master, so it
cannot serve as the proportion authority for a tall, lanky Lou. [INFER] This does
not block Lou 1.1, because that milestone's locked invariant is that production
Lou's silhouette does not change — a forearm variant inherits his existing build.
It blocks any future whole-body work. **[DEREK]** Which file is the build
authority for Lou's proportions? If none in the repo is right, that is worth
knowing before the next body conversation, not during it.

---

## 4. Recommended Lou 1.1 vertical slice

Narrower than the plan's, and it ends in the same place.

**Goal.** The hammerlock visibly closes Lou's hand on the arm, in both facings, at
all three gameplay scales, and resets cleanly on completion and on interruption.

**Assets — one painting.** `lou_forearm_grip.png`: Lou's existing shared forearm
with the hand closed into a grip, exported on the **same full canvas and origin**
as the current `forearm.png` so no geometry needs re-deriving. Derek draws it in
Procreate from the shipped forearm as donor.

**Config — one block**, in `src/characters/thesz.js`:
```js
variants: { forearm: { grip: { key: 'thesz_forearm_grip', file: 'forearm_grip.png' } } }
```
[FACT] Geometry omitted from a variant inherits from the calibrated base
(`mergeVariantEntry`), so if the canvas and origin match, no box, pivot or anchor
is needed. `enumerateCharacterAssets` picks the file up for both Phaser preload
and the CLI validator with no further wiring.

**Code — one decision, then likely zero changes.** [FACT] The hammerlock requests
`workingHand`, which maps to `nearHand`/`farHand` — slots Lou does not have — so a
`forearm` variant will **not** be reached by it as authored. Two options:
retarget those 35 keyframes to `strikingForearm` (data-only change in
`hammerlock.tracks.js`), or add a `grippingForearm` semantic slot to
`SEMANTIC_PART_SLOTS` (three lines, and more honest about role). [REC] The second:
`workingHand` should keep meaning *hand* for when hands exist.

**Tests.** Extend `tests/partVariants.test.js` for the family-fallback path on a
character declaring only `forearm`; add the missing `faceLeftOverrides` restore
test from §3.5; add the clip-variant cross-validator from §3.4 with the jab's
unsatisfied `fist` as its first fixture.

**Gates, in order.**
1. *Cheap, automated, before Derek looks at anything:* file present, canvas and
   origin identical to base, `rig:validate` clean, cross-validator clean, 544+
   tests green.
2. **Visual gate — Derek.** The real game, hammerlock, both facings, 265/209/154.
   The decision asked of him is exactly one question: *does the grip read as
   Lou's hand closing, and does nothing else about Lou look different?* Nothing
   proceeds on a maybe.
3. *Expensive, only after that passes:* articulation sweeps and certification on
   the variant frame, which the move editor already measures with sampled
   variants applied (`tools/move-editor/README.md:72-73`).

**Why this is the right size.** [INFER] It changes one painting, one config block
and at most three lines of code, and it still exercises every seam the plan cares
about. If it fails, the failure is unambiguous and cheap to attribute — which is
precisely what the last three months lacked.

---

## 5. Revised part inventory — changes only

| change | from | to | reason |
| --- | --- | --- | --- |
| **Priority 0** | 3 hands + handless forearm | **1 shared `forearm.grip`** | §3.1, §3.2. Four paintings and a new seam become one painting and none. |
| `HND-OPEN` | `needed` | **deferred, no owner** | §3.3. No clip requests it. |
| `HND-BASE` / `fist` | `needed` as separately socketed hand | **deferred**; keep Lou's baked fist as base | Base already reads correctly; the jab's `fist` request is better served by `forearm.fist` if it is wanted at all. |
| Head expressions | five in Priority 1 | **start with one**, `HEAD-3Q-HURT` | [FACT] No clip requests any head variant. One proves the family on the cheapest geometry (head variants need no socket change if canvas and neck geometry are locked); the other four wait for a selling or taunt clip that asks. |
| Torso variants | "mild paint-only changes possible" | **blocked pending the §3.5 fix** | Correct as written, but the dependency ordering is missing. |
| New row | — | **`FOREARM-GRIP`**, status `needed`, demanded by hammerlock's 35 existing keyframes | The only family the current library actually demands. |

[FACT] One inventory claim I could not support: Priority 1 lists five expression
donors as existing (`angry`, `exhausted`, `hurt`, `shocked`, `smug`). I did not
verify those files exist on disk and the inventory does not cite paths — worth a
path per row, since a named-but-absent asset is how this project lost a session to
a transparent PNG.

---

## 6. Procreate handoff checklist

[REC] The plan's interchange contract is right — one common full-body canvas,
every layer exported at identical dimensions and origin, guides never flattened,
stable layer names, no per-layer cropping. Four additions, each earning its place:

1. **Export the base part alongside every variant**, unchanged, in the same batch.
   It is the only way to prove canvas and origin match, and it makes the diff
   mechanical instead of a judgement.
2. **State the canvas size and origin once, in a sidecar `.json` or the layer
   name** — not in a message. [INFER] Every alignment failure in this project's
   history was a number that lived only in conversation.
3. **One guide layer carrying the wrist, elbow and shoulder marks** at the same
   canvas size, exported separately. Codex/tooling derives anchors from it rather
   than inferring from ink — the documented booted-shin failure is the precedent.
4. **Name the donor and the date in the sidecar.** The moustached-Lou and
   transparent-PNG incidents were both provenance failures, not drawing failures.

[REC] On overlap painting, the operational rule that survives from the retired
prompt and is unaffected by the misattribution: the hidden overlap is *interior
anatomy that happens to be concealed at rest*, painted as continuing flesh and
fabric, never as a finished outline or a flat fill disc, and sized to the full
swept range rather than the rest pose plus a margin. That part was always correct.

---

## 7. George transfer test

The method is repeatable when, without touching George's anatomy or proportions:

1. George gets his own `forearm.grip` from his own shipped forearm as donor, via
   the same checklist, with no new code.
2. The same hammerlock clip drives both characters correctly in both facings,
   through the semantic slot, with no per-character branch.
3. The cross-validator passes for both, and fails for a deliberately misspelled
   variant on either.
4. George's face-left socket override still behaves after the §3.5 fix — he is the
   only character exercising that path, so he is the regression canary.
5. The written checklist Derek follows for George is the one from Lou with the
   character name changed, and nothing else.

[INFER] If step 5 requires any Lou-specific reasoning, the method is not yet
repeatable and the inventory is encoding Lou's anatomy rather than the process.

---

## 8. Risks and stop conditions

**Stop a local repair and reconsider when:** the variant needs its own box, pivot
or anchor geometry to look right (the canvas contract has failed, fix that first);
or a second family is needed before the first has passed Derek's visual gate.

**Do not start another generated sheet unless** a specific move cannot be posed by
any combination of existing parts plus a variant — demonstrated in the running
game, not argued from a document. [FACT] Nothing in the current runtime forces
this: the only unmet authored demands are two variant names on parts Lou already
has.

**Named risks.**
- *The silent-success class.* [FACT] A missing variant renders base with no error.
  Until §3.4 ships, every "it works" is unverified. Highest-value cheap fix in the
  plan.
- *The aliasing leak.* [FACT] §3.5. Harmless now, corrupting later, and invisible
  when it bites.
- *Provenance drift.* [INFER] Three of this project's worst losses — a moustached
  reference, a transparent master, an invented requirement — were all provenance
  failures. Every asset and every direction should carry a cited source. The
  heading "Derek's answers" is not a source.
- *Scope creep through the inventory.* [INFER] `CHARACTER_PART_INVENTORY.md` can
  hold far more than any move needs, and the plan's own closing rule is the
  defence. Priority 0 of three hands was already drift.

**[DEREK] — the four open questions, in the order they will bite:**
1. Is a single shared forearm-plus-hand `grip` an acceptable first slice, or do you
   specifically want separately socketed hands even at four paintings and a new
   wrist seam?
2. Which file is the build authority for Lou's proportions, now that requirement 1
   is withdrawn and the Pass-A v3 panel measures as the most compact figure
   available? (Not blocking Lou 1.1; blocking any body work after it.)
3. Should the §3.5 socket fix and the §3.4 cross-validator go in before the art
   slice? Both are small, and both are the kind of thing that gets skipped and
   then costs a session.
4. 33 commits are unpushed and the recovery documents are uncommitted. What should
   land, and when?
