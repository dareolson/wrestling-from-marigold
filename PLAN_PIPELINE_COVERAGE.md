# PLAN: honest move coverage + capability records (Opus plan, Sonnet executes)

2026-10-25 · Opus · base after `e43792d` (Codex's architecture committed) + Claude's refresh

Implements step 1 (and 2) of the **Revised sequence** in
[MOVE_PIPELINE_EVOLUTION.md](MOVE_PIPELINE_EVOLUTION.md) ("Refresh 2026-10-25"). Read that
document's Decision, "Capability records and coverage", "Common evidence envelope" (for
field names only) and the whole Refresh section. Then read this plan. Read nothing else
unless a task names it.

## Progress

(Executor: append one line per finished task: `T#.# <sha> <one-line result>`.)

## Goal

1. A small, maintained **capability index** says what the engine has learned, who uses it,
   how it is tested, and, as separate fields, whether it is mechanically verified and
   whether Derek approved it visually.
2. **`npm run moves:coverage`** reports, for every move in the registry plus the
   non-clip performance adapters (sells, rises), what is declared, what is checked, and
   what is **unverified**. With `--check`, it fails only on *new or changed* gaps.
   Historical debt lives in a committed baseline with reasons.
3. Today's rig/runtime lessons are in `MOVE_REFINEMENT_METHOD.md`.

**No gameplay change.** No file under `src/` changes, except a read-only export if a
task needs one (say so in the Progress line).

## Ground rules

- Node 22: `export PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH` in every shell. `npm test`
  first (expect 851 or more) and after every task.
- Pure Node tooling: no browser, no Phaser. Read data by importing the existing modules
  (`src/moves/registry.js` `MOVE_SPECS`, `src/animation/clips/index.js`
  `REGISTERED_MOVE_CLIPS`, `tools/move-critic/specs.mjs` `SPECS`). Never copy their contents
  into JSON. Derive.
- Keep `specFor` exactly as is (the critic and a test use it). Add a strict sibling.
- `thesz` and `thesz-front3q-r1` are ignored for verification (Derek, 2026-10-25). Leave
  them out of any rig requirement, and don't count them as failures.
- Don't overclaim. A capability whose consumers you haven't checked is `unverified`, not
  `pass`. Use the evidence the Refresh table cites. Never infer an approval: copy approvals
  only from the plans' Progress/G-lines.
- One local commit per task on `story/marigold-opening`; check `git branch --show-current`.
  **Do not push.** Commit your own files only.

## Design (decided; do not re-litigate)

### D1. `tools/move-critic/capabilities.json`

```json
{
  "version": 1,
  "capabilities": [
    {
      "id": "clip-layers",
      "summary": "Per-limb cross-actor draw order inside a paired clip",
      "origin": { "failure": "...", "evidence": "research/... or commit sha" },
      "implementation": ["src/animation/clipLayers.js"],
      "authoring": "clip `layers` / `layerTie` (tools/move-editor draft fields)",
      "consumers": [ { "kind": "clip", "id": "suplex" }, { "kind": "clip", "id": "figureFourTableau" } ],
      "supported": "any paired clip; anatomical limbs",
      "fallbacks": "no `layers`: y-sorted whole bodies, sub-depth ties by player slot",
      "regression": ["node --test tests/clipLayers.test.js"],
      "maturity": "reused",
      "mechanical": { "status": "pass", "date": "2026-10-24", "evidence": "eb420e2 film, 4 directions" },
      "visual": [ { "status": "approved", "by": "Derek", "date": "2026-10-24", "scope": "suplex, Procreate Lou + George roster" } ]
    }
  ],
  "localDecisions": [
    { "id": "standing-facing-turn", "decision": "kept: mirror on first standing frame", "by": "Derek", "date": "2026-10-25", "evidence": "PLAN_RISE_HANDOFF.md H5" }
  ]
}
```

- `maturity` ∈ `proposed | pilot | reused | retired` (plus `parked`, used only for the
  support plant, with a reason).
- `mechanical.status` ∈ `pass | fail | unverified | not-applicable`, each with a `reason`
  when not `pass`.
- `visual` is a list, because approval is per performance/cast/candidate and never
  carries over.
- `consumers[].kind` ∈ `clip | adapter | tool`. A `clip` id must exist in
  `REGISTERED_MOVE_CLIPS`, and an `adapter` id must exist in D3's adapter list (validated, T1.2).
- Seed with **both** tables in MOVE_PIPELINE_EVOLUTION.md: Codex's six rows and the
  Refresh's eight. Merge rows that describe the same mechanism (e.g. painted anchors). For
  Codex's rows, set `mechanical` to `unverified` unless a named test covers it (then cite
  the test). Write a one-sentence reason for every `unverified`.

### D2. Strict spec lookup

In `tools/move-critic/specs.mjs` add
`specStatus(id) → { status: 'specified' | 'empty' | 'missing', spec }`. `'empty'` is a
key present with `{}` (e.g. `hammerlock`), and `'missing'` is no key. `specFor` stays
unchanged.

### D3. Coverage model (`tools/move-critic/coverage.mjs`)

For each `MOVE_SPECS` entry (all registry moves, clip or legacy):

- `clip`: the registry clip id, or `null` (legacy pose sequence).
- `declared`: from `specStatus`: counts of `contacts`, `strikes`, `landings`, `airborne`;
  from the clip (if any): `grips`, `floorContacts`, `layers`, and part-variant requests in
  keyframes (`parts`).
- `checks`: which declared items the critic actually measures. Read `metrics.mjs` to map
  spec kinds → metric functions. List each kind as `checked` or `unchecked`.
- `status`: `covered` (spec specified and every declared kind checked), `partial`,
  `unverified` (spec missing, or empty without a waiver), or `not-applicable` (waived,
  with a reason).
- `fingerprint`: a stable hash of the move's declared requirements (spec + clip contact
  fields), so a baseline entry stops applying when the requirements change.

Adapters (non-clip performances), listed in `coverage.mjs` as a constant with
a comment pointing to their source: `sell:clutch`, `sell:lyingHold`, `rise:back`
(protected/carried), `rise:handoff` (risefix), `rise:quick`. For each adapter, report its
capability ids and regression commands from `capabilities.json`, plus whether those tests
exist on disk.

Waivers: `tools/move-critic/coverage-waivers.json`, `{ moveId: { reason, by, date } }`, for
`not-applicable` (e.g. taunts, pins). Seed only obvious ones (no contact to check), each
with a reason.

### D4. Baseline + `--check`

- `npm run moves:coverage` prints a table: move | clip | spec status | declared | checked |
  status. Then adapters, then a summary. `--json <path>` writes it.
- `tools/move-critic/coverage-baseline.json`: `{ moveId: { fingerprint, status, reason } }`
  for every move that is not `covered`/`not-applicable` today. Generate it with
  `--write-baseline`, then **edit each `reason` by hand** (one line each; "historical: legacy
  pose sequence, no critic spec" is fine where true).
- `--check` exits 1 if: a move is `unverified`/`partial` and not in the baseline; a baseline
  entry's `fingerprint` no longer matches (the requirements changed, so the debt is re-opened);
  a baseline entry has no reason; or `capabilities.json` fails validation. It prints, without
  failing, baseline entries that are now `covered` ("remove from baseline").
- Add `"moves:coverage": "node tools/move-critic/coverage.mjs"` and the `pre` Node-version
  hook, following the existing `pre*` script pattern in `package.json`.

## Tasks

- **T1.1 Strict spec status.** D2 + tests in `tests/criticMetrics.test.js` (or a new
  `tests/specStatus.test.js`): `suplex` → specified, `hammerlock` → empty, an unknown id →
  missing, and `specFor` is unchanged for all three. Commit.
- **T1.2 Capability index.** D1: write `capabilities.json` seeded as described, plus
  `tools/move-critic/capabilities.mjs` with `loadCapabilities()` + `validateCapabilities()`
  (schema, enums, consumer ids exist, regression test files exist, reasons present). Tests:
  the real file validates; a fixture with a bad consumer id, an unknown maturity, or a
  missing reason fails with a clear message. Commit.
- **T1.3 Coverage report.** D3 + D4 without `--check`. Tests: pure functions on fixture
  registries: a move with no spec → `unverified`; an empty spec with a waiver →
  `not-applicable` with the reason shown; a fully specified + checked move → `covered`; the
  fingerprint changes when a contact window changes. Run it on the real repo and put the
  summary counts in the Progress line. Commit.
- **T1.4 Baseline + `--check`.** Write the baseline, add the reasons, wire `--check` and
  the npm script. Tests: new uncovered move → fail; changed fingerprint → fail; reasonless
  baseline entry → fail; now-covered baseline entry → reported, not failed. `npm run
  moves:coverage -- --check` passes on the real repo. Commit.
- **T1.5 Method lessons (step 2).** Add rows to the "Each of these cost a round of rework"
  table in `MOVE_REFINEMENT_METHOD.md`. Take each lesson from its plan, and keep each row
  to the table's existing two-column shape:
  1. A whole-body `transform.y` swap moves the head with the body → pin the head with a
     `layers` window (PLAN_SUPLEX_RISE / `eb420e2`).
  2. A state swap draws from whatever `this.pose` holds (stale pose) → reset or derive
     the pose at the swap (PLAN_RISE_HANDOFF H1).
  3. The grounded renderer's final key and the upright draw disagree per rig → end the
     segment on the rig's own upright geometry (`standingChannels`) (H2/H3).
  4. A standing wrestler re-faces the opponent on the first frame → a whole-figure mirror,
     not a pose step; measure with the turn removed (H5).
  5. Screenshots taken while the game runs race the clock → step the game at a fixed
     1/60 s and pair runs by event (PLAN_SUPLEX_RISE T1.1).
  6. Comparing all flags on vs all off cannot attribute an effect → film each flag alone
     as well (Codex review, `aft` config).
  7. Art chosen by phase lies when the hand is not there → choose by measured contact,
     with a latch (D4).
  Also add one line under the Pipeline evolution note pointing to `npm run moves:coverage`
  and `capabilities.json`. Commit.
- **T1.6 Handoff.** Add a dated `AI_HANDOFF_ENTRIES/2026-10-25-claude-pipeline-coverage.md`
  (what exists now, the coverage summary counts, the baseline size, what is not claimed)
  and one index line + Status-summary sentence in `AI_HANDOFF.md`. Commit. **Stop.**

## Not in scope

Contact-intent runtime (`contactTargets.js`), the evidence-envelope adapters, merging the
capture tools, the George port, any move-editor UI, any gameplay or art change. Those are
later steps of the Revised sequence.
