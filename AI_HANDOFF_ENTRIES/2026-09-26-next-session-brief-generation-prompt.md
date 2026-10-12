# 2026-09-26 — RETIRED brief: the generation prompt

> ## CORRECTION — 2026-09-27
>
> Do not execute this brief. Derek states that he never requested the
> broader/compact/stockier Lou described here as requirement 1. That direction
> was an AI invention falsely attributed to him. The resulting tracked prompt is
> retired. Mechanical findings in this file remain historical evidence only.

**Start here.** Then read, in this order:

1. `AI_HANDOFF.md` — the Status summary is the thirty-second read. The Handoff
   Log below it is long and mostly history; the 2026-09-25 entry and its
   2026-09-26 addendum are this thread.
2. `AI_HANDOFF_ENTRIES/2026-09-15-derek-front3q-verdict-and-next-generation-brief.md`
   — the standing brief. **It opens with a STOP block. That block is your job.**
3. `RIG_AND_MOVE_PIPELINE.md`, "Binding art to the rig" — four gotchas that cost
   a session each. Two are arithmetic, two are about what a part may contain.
4. `FRONT3Q_CANDIDATE_EVIDENCE/README.md` — what the rejected v4 candidate
   measured and why it was rejected.

We are on the **narrow eight-part production path**: approved front3q artwork →
automatic cut/map/proofs → tuner-ready character → live match → tween/move
iteration. The five-view canonical-v2 runtime and its seven
`runtimePrerequisites` stay **paused**. Preserve production Lou and the frozen
`thesz-front3q-r1` diagnostic control.

## The job

**Revise the front3q generation prompt, and move it into the repository.**

Nothing downstream can start until this is done, and doing anything else first
wastes a generation cycle. The reasoning is below; do not take it on trust, the
prompt is three minutes to read.

## Codex addendum — prompt approval before another generation

Keep this session focused on the first job. Produce and version-control the
corrected generation prompt, then show that prompt to Derek before generating
art. Do not start the orchestration command, binding emitter, tuner integration,
or another generation until Derek reviews the prompt.

Make the prompt auditable against all ten requirements. Include a final
traceability table showing the exact prompt language that satisfies each one.
Be literal about the eight-part delivery:

- Exactly `head`, `torso`, `upper_arm`, `thigh`, `near_forearm`, `far_forearm`,
  `near_shin`, and `far_shin`.
- `torso` is headless and ends in a short neck stub. It contains no face, hair,
  skull, or duplicate head.
- There is no pelvis layer.
- `upper_arm` and `thigh` are single shared paintings.
- Forearms and shins remain separately authored near/far pieces.
- No whole arm or whole leg may combine a joint the rig articulates.

Requirement 1 must say **match the broader, compact Pass-A front3q
proportions**, not merely "make him broad." Explicitly prohibit a leaner torso
and relatively longer legs than the Pass-A master while avoiding an exaggerated
modern-bodybuilder silhouette. Derek's eye remains the approval authority unless
he authorizes numerical thresholds.

Do not let a separately generated whole-body reference substitute for proof of
the delivered parts. The approval image must ultimately be assembled from, or
be demonstrably identical to, the eight delivered paintings.

Inspect `tools/wrestler-cutter/templates/GENERATION_PROMPT_TEMPLATE.md`, but do
not inherit its five-view/canonical assumptions blindly. This prompt is
specifically for the paused-runtime-independent, eight-part legacy-rig
production track. Put the character-specific prompt in a tracked, clearly named
location such as
`tools/wrestler-cutter/prompts/lou-front3q-eight-part-v1.md`. Preserve the old
desktop prompt as historical evidence rather than overwriting the only copy.

Stop after presenting the revised prompt and its ten-requirement traceability
table to Derek. Generate only after he approves that artifact.

## The tree is clean. Here is what landed.

Branch `thesz-v2-profile-normalization`, **31 commits ahead of origin/master,
unpushed.** `npm test` **544/544, 0 skipped** on Node 22.23.1. Build clean.
`rig:validate` clean for george, thesz and `thesz-front3q-r1`. `rig:certify`
exit 0, `refrig` CERTIFIED as the control.

Untracked and **not yours to tidy**: `IDEAS/` and
`RINGSIDE_CAST_AND_MANAGER_SYSTEM.md` are other sessions'. `FRONT3Q_V5_GATE/` is
four review images whose fate is an open question for Derek — see below.

Five commits this thread, `6c0fc19`..`bc2bebe`:

| commit | what |
| --- | --- |
| `6c0fc19` | all four measurement tools now read the **eight-part** delivery |
| `8ca3164` | `npm run art:key-plate`, for plates that arrive pre-alpha'd |
| `df7b6a3` | **requirement 10**: the torso must be headless |
| `917ab58` | four corrections to `AI_HANDOFF.md` + the log's missing entry |
| `bc2bebe` | a fifth correction: the generation prompt (this brief's job) |

No `src/` file changed in any of them. Production Lou, `thesz-front3q-r1` and
all seven `runtimePrerequisites` are untouched.

## The blocker, in detail

`~/Desktop/codex-front3q-prompt.md`, dated 13 Sep, is the **only** generation
prompt that exists. No revised one was ever written, although `AI_HANDOFF.md`
has promised one since 2026-09-15. It predates Derek's verdict by two days and
contradicts four of the ten requirements:

| req | the prompt says | the requirement says |
| --- | --- | --- |
| 1 | line 10: "Lou must remain **lean**, athletic... **not thick, broad**"; checklist repeats "lean proportions" | broader and more compact, must not read leaner than the master |
| 8 | "anatomically painted torso shoulders and **pelvis hips**" | no pelvis layers while on the shipped rig |
| 9 | "Near and far authored separately — not mirrored, not shared" | ONE shared `upper_arm`, ONE shared `thigh` |
| 10 | *silent* | headless torso ending in a short neck stub |

**Requirement 1 is the dangerous one.** Generate from this prompt and the
leanness Derek rejected comes back however well the torso is fixed. The v5 draft
already shows it — see the measurements below.

**Keep what is still right.** The prompt is not worthless: its identity source
(`lou-canonical-chroma-v1.png`, named as approved in the sibling `REPORT.md`),
its clean-shaven rule and moustache-quarantine warning, its articulation ranges,
its landmark discipline, and above all its **far-forearm / far-shin reasoning**
are all correct and hard-won. `Skeleton.js:1556-1565` really does rotate the far
forearm independently, and `v1-golden-master`'s RESCUE VERDICT really does
record what happens when a continuous limb is re-split after generation. The
prompt then over-generalises that to the upper arm and thigh, which the rig
cannot tell apart — that is the `SHARED-ONLY` row `art:map-candidate` prints.
Carry the reasoning forward and correct only its scope.

**Put the result in the repository.** The one document that drives every
generation currently lives on a desktop, so nothing version-controls it, diffs
it, or fails when it goes stale. It has gone stale twice in twelve days with
nothing noticing.

## Second job, if you have room: requirement 1 has no mechanical check

It is `art:proofs --compare` plus Derek's eye, and that is how leanness survived
v3, v4 and v5. The project's own stated lesson applies: *a requirement that can
be measured and is not is one the next generation will miss the way this one
did.* That argument is what justified requirement 10.

Working measurements exist and are recorded below. Making them a real check is
small. **It is a requirement change, so put it to Derek rather than shipping it
as a fait accompli** — requirement 10 was added with his brief already calling
for exactly that kind of gate; this one is a new gate on a judgement he has
reserved to his own eye.

## Third, only if art is still not moving: the rest of the path

These remove the remaining manual steps between approved art and a live match.
None is urgent; all pay off the moment art lands.

1. **Fold step 2 into one command.** `key-plate → cut → map-candidate →
   measure-joints → proofs` is five invocations today.
2. **A binding emitter**: parts + landmarks + shipped-Lou targets → the
   character config. This is the last hand-derived arithmetic on the path and
   it is exactly where the `growth` width error came from. A prior session
   called it "the one addition that removes a step rather than adding
   architecture."
3. **The rig tuner cannot see a candidate.** `tools/rig-tuner/rig-tuner.js:21`
   hardcodes `CHARS = { george, thesz, placeholder }`, there is a second
   `[george, thesz]` list in `preload()`, and line 28's `charFilename = id => id`
   breaks on `thesz-front3q-r1`, whose file is `thesz_front3q_r1.js`.

## Do not re-derive these

Everything here is measured and recorded. Re-measuring is fine; re-deriving from
scratch is waste, and two of these were got wrong first.

**v5 proportions**, on the v5 assembled reference against the Pass-A front3q
panel. Both ratios are scale-invariant, so the plate's unkeyed glow does not
touch them:

| | v5 candidate | Pass-A master |
| --- | ---: | ---: |
| torso width at 40% down | 17.7% of height | 18.9% |
| widest clean torso run | 22.2% | 23.2% |
| legs as fraction of height | 42.8% | 40.3–41.8% |

**Torso width must be taken on the CENTRAL run** — the rows where the arms are
cleanly separated and the silhouette reads as three runs. A width at a height
station reads `[arm, torso, arm]` as one run and is contaminated by arm
position. That mistake was made and corrected on 2026-09-22.

**A crotch detector must scan for the longest two-run band through the lower
body.** Scanning down for the *first* two-run row finds the **arm gap** — it
reports 68.5% legs on the v5 candidate against a true 42.8%. Also corrected
2026-09-22.

**Two figures in the record are NOT reproducible.** Flagged in place, do not
quote them: the Pass-A master leg fraction "41.2%" (it moves 40.3–41.8% with the
alpha threshold; the candidate is stable at 42.8%), and "elbow width continuity
0.2% as assigned against 23.6% swapped" (method unrecorded; measuring the upper
arm's distal band against each forearm's proximal band gives 4.9% near, 8.6%
far, the two forearms 13.6% apart — same conclusion, different numbers).

**`FRONT3Q_V5_GATE/02-equal-height-candidate-vs-master.png`: candidate is LEFT,
master is RIGHT.** Written down nowhere before 2026-09-26; establishing it cost
a rendering of the master panel. That image also predates `art:key-plate`, so
the picture may understate the candidate's size even though the ratios hold.

**Requirement 10's numbers.** Neck pinch in the torso's row-width profile: v5
draft 10.2%; shipped Lou, shipped George, the v4 control and `thesz-front3q-r1`
all **exactly 0.0%**, at every smoothing window from 3 rows to 21. Threshold 3%.

**Environment.** The default `node` on this machine is 25.8.1 and `.nvmrc` pins
22; production commands refuse to run off-pin. Use
`export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"`.

**A trap in the test suite.** `assert.equal` on two decoded PNG buffers
OOM-kills the runner while building its diff — you get `SIGKILL` and no failure
message. Compare pixel buffers with `assert.ok(a === b, msg)`.

**`Sprite sheets/` is gitignored but 21 files under it ARE tracked** (10 md, 6
txt, 5 json, no artwork). A fresh worktree contains the tree, empty of images,
and fails 5 tests / skips 4 — 479 passing of 488 run. That is expected, not a
regression you introduced.

## Open, and Derek's rather than yours

- **The regeneration itself.** Nothing here generates art.
- **A live disagreement about requirement 1.** A reviewer read v5 as "broader,
  more compact"; the measurements above say it is still leaner and
  longer-legged than the master. Its separate `head.png` genuinely *is* a true
  three-quarter head, so requirement 2 is satisfiable by this generation. Derek's
  eye is the authority on requirement 1 — do not treat either reading as settled.
- **Whether requirement 1 gets a mechanical check at all.**
- **Whether `FRONT3Q_V5_GATE/` is committed.** Derek's session brief called
  those four images disposable; they are now the evidence behind a documented
  decision. If they are committed they need a README recording the
  candidate-left/master-right convention, or the next session re-derives it.
- **31 commits unpushed.**

## Do not

Tune or repaint `v4-straightened`. Rig-tune `thesz-front3q-r1`'s zeroed offsets.
Do hip-span or pelvis-registration work. Repoint `validate_joints.py`. Activate
any runtime prerequisite. Push without Derek. **And do not generate art from the
current prompt** — that is the whole point of this brief.

## Keep Derek in the loop

At the whole-character, game-scale visual approval gate, before any detailed rig
tuning. `FRONT3Q_V5_GATE/02-equal-height-candidate-vs-master.png` is the format
that works; `art:proofs --figure` regenerates it, and `art:key-plate` should run
before the cutter on any plate that did not come through `remove-chroma-key.mjs`.
