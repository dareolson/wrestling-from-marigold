# 2026-09-13 — Brief for the next session: Lou's replacement limbs

**Start here.** This is the standing brief for the work Derek wants next. Read
it before `AI_HANDOFF.md`'s log, which is longer and mostly history.

## The job

Derek had Codex generate a new set of Lou limbs. Review them, and get them to a
state where they can replace the shipped ones. His goal in his own words is
"better limbs"; the first task is turning that into something checkable, because
judging by eye alone is the loop `CHARACTER_PIPELINE_REVIEW.md` exists to stop.

## Read the tree before you touch it

**The working tree is dirty with someone else's in-flight work.** Codex was
working in this same checkout on 2026-09-13 and was paused mid-task, not
finished. Committed through `3e9f970`. Everything below that line is uncommitted
and is Codex's, not yours:

| path | what it is |
| --- | --- |
| `src/characters/thesz.js` | fixed forearm offsets zeroed — **see the warning below** |
| `src/scenes/Arena.js` | `chicago-fan-v1` wired into `CROWD_EXTRAS` with empty `spots` |
| `tests/productionJointConfig.test.js` | new, pins those offsets at zero |
| `tests/pipelineParameterization.test.js` | modified |
| `tools/wrestler-cutter/cut-production-limb-board.mjs` | new, cuts the limb plate |
| `src/assets/audience/chicago-fan-v1/` | new, 8 generated crowd frames |

Do not commit any of it under your own work, and do not "clean up" the dirty
tree by reverting it.

**One item needs Derek, not you.** The `thesz.js` change zeroes
`nearForearmOffsetX/Y` and `farForearmOffsetX/Y`. The comment it replaced records
those values as "LOCKED to Derek's 2026-07-31 tuner export" and a "KNOWN
TRADEOFF, accepted by Derek" — he took an overhead elbow gap in exchange for the
idle hand seating where he wanted it. Zeroing them takes the opposite trade and
pins it with a test. The reasoning is right by the v2 standard and it changes
shipped Lou's idle silhouette, which `RIG_AND_MOVE_PIPELINE.md` lists as a
non-negotiable gate. Ask before building on it.

## The decision that reframes everything

**2026-09-13, Derek: three-quarter is the primary view.** Profile and the rest
are tween and transition sources — profile for suplexes and similar move
mechanics. The full consequence list is in `AI_HANDOFF.md`'s status summary;
the ones that bear on limbs:

- The new limbs were generated for three-quarter. Judge them as three-quarter.
- `profile-v2-normalized-v5` is now a secondary-view candidate, not the gate on
  the primary view. Do not treat its pending approval as blocking this work.
- Derek will run the **profile head on the three-quarter body** until new heads
  exist. That reuse has to be declared, not left to silent fallback.

## What the new limbs actually are, and what track they are on

`Sprite sheets/AI Pilot/Lou/production-limb-redesign/v1/`

```
source/  lou-production-limbs-v1-chroma.png   1536x1024, green-screen
keyed/   lou-production-limbs-v1-alpha.png    1536x1024, straight alpha
parts/   far-arm  far-leg  near-upper-arm
         near-forearm-hand  near-thigh  near-shin-boot   + parts-index.json
```

**These target the shipped legacy six-part rig, not the v2 canonical bank.**
Hand is baked into the forearm and boot into the shin, the far arm and far leg
are whole single pieces, and the near side splits. That is the shipped
asymmetric decomposition, and it is a deliberate and sensible choice: this track
can ship without any of the seven v2 `runtimePrerequisites`, all of which are
still `pending`. Do not "correct" these into 19-slot v2 parts.

Cut them with `node tools/wrestler-cutter/cut-production-limb-board.mjs
<input-alpha.png> <output-dir>`. It classifies components spatially rather than
by size, so a complete far limb and a shorter near segment cannot swap
identities.

## First impressions, to confirm or overturn rather than inherit

From one look at the keyed board, read as a starting point and nothing more:

- Silhouettes are closed with continuous outline. The previous generation's
  torso had an un-outlined front abdominal edge; this does not repeat it.
- Joint overlap material is present — the near upper arm extends past the elbow
  with a rounded cap, and the forearm carries a rounded cap above it.
- Soft pale un-outlined patches persist on both deltoids and near the elbow.
  Same family of artifact as the old shoulder disc, smaller.
- `near-upper-arm` reads bulbous and oddly notched next to `far-arm`'s cleaner
  deltoid-to-elbow taper. Worth a direct comparison.
- The black trunk band is baked onto the top of **both** thighs. Check for
  double-drawing at the hip when the legs separate.

## The shoulder, because it will come up

Two different problems have worn that name. Keep them apart:

- **Schema** — solved. Joint zones could only name a `coveragePart` for the
  split-pelvis hips, so torso shoulder cores were flat fill in `torso.png` with
  no layer allowed to own them. Milestone 2 generalized it and removed 623px of
  flat fill from visible torso paint.
- **Source art** — open, and it is in the **torso**, not a limb.
  `profile-torso-trunks-v3-alpha.png` contains a flat, hard-edged inpainted disc
  over the shoulder, and v5's README names it the largest single contributor to
  how that shoulder reads. New limbs cannot fix it. If a pale mass survives this
  round, that is why.

v5 separately lists 441px of bare core at `upperArm.shoulder` — that one *is* in
the arm, and new limb art can address it.

## Tools you have

```sh
npm run art:measure -- --sheet <png> [--families 179,147,54,42,0]
```

Reports value flatness, identity drift, broadcast presentation at 265/209/154px,
and micro-pattern periodicity. Works with or without a manifest. Advisory: exits
0 unless `--strict`, and its thresholds are proposed, not ratified — a number
here is evidence for review, not a ruling.

Baselines already measured, same command, flatness within +-4 luma of a family:

| artefact | score |
| --- | ---: |
| Pass-A v3, profile master | 76.7% |
| `profile-v2n5-neutral-assembly.png` | 84.8% |
| **new limb board v1** | **86.5%** |

So the new generation is measurably flatter than anything before it and is
approaching the proposed 90% gate. That is one property out of four; it is not
an approval.

Everything runs on Node 22 — `.nvmrc` is pinned and thirteen production commands
refuse to run off it. The default `node` on this machine is a stale symlink; use
`nvm use` first or the pre-hook will stop you. `npm test` is 418/418.

`npm run rig:certify` will not run until `npm install` is done: `node_modules`
is absent and the harness needs `playwright-core`.

## Do not re-derive these

They cost a full session on 2026-09-13 and are recorded in
`AI_HANDOFF_ENTRIES/2026-09-13-claude-image-generation-assessment.md`:

- The canonical 4096 sheet, 96-cell bank and `art:export-v2` have never produced
  a production asset. No `export-index.json` exists.
- `art:validate-source --sheet` returns 363 errors because the bank is empty.
  The form quoted in handoffs omits `--sheet`.
- `CANONICAL_CHARACTER_SHEET_V2.md`'s span table is obsolete on every row after
  the 2026-08-24 refit, including a 44px planted-sole drop against the
  manifest's 54.
- Pass B has never masked parts from the approved master at 1:1. It generates
  them. Derek approved that on 2026-08-26; the documents were never amended.
