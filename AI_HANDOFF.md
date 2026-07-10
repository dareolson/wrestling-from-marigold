# AI Handoff — Wrestling from Marigold

Shared project notebook for Derek, Claude, and Codex.

## Protocol

- Read this file before proposing architectural or gameplay changes.
- Add new dated entries at the top of the Handoff Log.
- Identify the author as Derek, Claude, or Codex.
- Do not silently replace prior decisions; record what changed and why.
- Link focused commits and include test commands and results.

## Roles

- Derek: creator and art director
- Codex: technical lead and game-systems designer
- Claude: reviewer and technical director

## Priorities

1. Game feel
2. Wrestling psychology and match drama
3. Emergent storytelling
4. Architecture

Avoid a large rewrite.

## Active assignment — Phase 0, Task 1

Extract only the decision portion of `Wrestler.tryPower` into
`src/logic/moveDecision.js` as a pure exported function such as
`resolvePowerMove(context)`.

Requirements:

- The new module must have no Phaser dependency.
- Preserve all existing behavior and numerical boundaries exactly.
- Preserve `<` versus `<=`, state conditions, scaling, availability checks, and fallback order.
- `Wrestler.js` gathers runtime data, calls the resolver, and executes through existing methods.
- Use Node's built-in `node:test`; do not add Vitest.
- Add table-driven tests for every opponent-state branch.
- Test immediately below, exactly at, and immediately above each distance threshold.
- Test unavailable moves and fallback ordering.
- Do not change AI, shared constants, animations, tweens, timing, damage, or state transitions.
- Do not fix reach-range drift or include the separate AI lockup fix in this commit.

Suggested files:

- `src/logic/moveDecision.js`
- `tests/moveDecision.test.js`
- `src/Wrestler.js`
- `package.json`

After implementation, add a handoff entry containing changed files, commit SHA,
exact tests and results, browser verification, and unresolved questions.

## Clarifications

AI should eventually share authoritative range and move data with Wrestler, but AI
should not call `resolvePowerMove`; tactical selection and player move execution are
different decisions.

For Phase 1, prefer an instance seam such as `wrestler.setState(next, opts)` unless
the code clearly favors another design.

## Gorgeous George v1

The current rig expects six assets in `src/assets/wrestlers/george/`:
`head.png`, `torso.png`, `upper_arm.png`, `forearm.png`, `thigh.png`, and
`shin.png`. Expression and hand/foot swapping are not supported by the current
`Skeleton.js` and are not v1 requirements.

## Handoff Log

### 2026-07-10 — Claude

Holding off on Phase 0 Task 1 (`resolvePowerMove` extraction) — a separate
Claude session is concurrently working on movesets in this repo. Task 1 edits
`src/Wrestler.js`'s `tryPower` method directly, so pausing until that work is
confirmed not to touch `tryPower`/`MOVE_DEFS`/the jab-headbutt-elbowDrop-dropkick
branch, or until it lands and is committed. Will resume once Derek confirms
clear.

### 2026-07-10 — Codex

Reviewed Claude's architecture audit. Approved the conservative phased direction
with the corrections above. Claude should review this active assignment before
implementing or proposing changes.
