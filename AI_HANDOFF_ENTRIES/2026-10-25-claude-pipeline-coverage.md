# Pipeline coverage: capability index, `moves:coverage`, baseline

2026-10-25 · Claude (Sonnet, PLAN_PIPELINE_COVERAGE.md T1.1-T1.6) · step 1 and 2 of the Revised sequence in [MOVE_PIPELINE_EVOLUTION.md](../MOVE_PIPELINE_EVOLUTION.md).
Local commits on `story/marigold-opening`, nothing pushed. 881 tests pass. No file under `src/` changed; no gameplay change.

## What exists now

- `specStatus(id)` in `tools/move-critic/specs.mjs`: `specified | empty | missing`. `specFor` is unchanged.
- `tools/move-critic/capabilities.json` + `capabilities.mjs` (`loadCapabilities`, `validateCapabilities`): 12 capabilities and 2 local decisions, seeded from both tables in the evolution doc. Clip ids are checked against `REGISTERED_MOVE_CLIPS`, adapter ids against `adapters.mjs`, tool and test paths against the disk.
- `tools/move-critic/adapters.mjs`: the 5 non-clip performances (`sell:clutch`, `sell:lyingHold`, `rise:back`, `rise:handoff`, `rise:quick`). The plan put this list in `coverage.mjs`; it is its own file so `capabilities.mjs` can validate against it without an import cycle. `coverage.mjs` re-exports it.
- `npm run moves:coverage` (`-- --json <path>`, `-- --check`, `-- --write-baseline`), `tools/move-critic/coverage-waivers.json`, `tools/move-critic/coverage-baseline.json`.
- `MOVE_REFINEMENT_METHOD.md`: seven new rows in "Rig facts that bite" and a pointer to the two new artifacts.

## Coverage today (29 registry moves)

5 covered (dropkick, frontKick, shove, bodySlam, hipToss), 3 partial (jab, piledriver, suplex), 19 unverified, 2 not-applicable (taunt, turnbuckleTaunt: waived, "no contact and no damage by definition"). Baseline: 22 gaps (3 partial + 19 unverified), each with a one-line reason.

A move is `covered` only if its spec is specified and the critic measures every kind it declares. The critic measures `contacts`, `strikes` (only if the clip has an `impact` event), `landings` and `airborne`. It has no metric for a clip's `grips`, `floorContacts`, `layers` or part-variant requests, so a move that declares any of those is at best `partial`: that is why suplex (layers), piledriver (grips, floor contact) and jab (part variants) are `partial` even though their specs pass.

## What is not claimed

- `covered` means the critic grades the declared requirements on a trace. It is not visual approval and not proof the move reads well.
- Capability `mechanical: pass` means a named test or recorded measurement covers the mechanism on the stated scope; the scope is written next to it (e.g. clip-grips: window logic only, not reach to the painted surface).
- Visual approvals are copied only from the G-lines in PLAN_SUPLEX_RISE.md and PLAN_RISE_HANDOFF.md (G4 2026-10-24, PROMOTE, G5 2026-10-25). The suplex head layering (`eb420e2`) has no gate line of its own, so `clip-layers` is `unverified` for it; the evolution doc's table says "suplex approved 2026-10-24", which the plans do not back up. Derek: confirm or correct.
- `thesz` and `thesz-front3q-r1` are ignored for verification (Derek, 2026-10-25) and are not counted anywhere. `rise-standing-channels` notes their 19.9 / 25.5 px misses as ignored.
- `stepped-capture` is `unverified` mechanically: the two film tools have no automated test.
- The adapters are listed with their capability records and whether their regression tests exist on disk. They get no per-requirement checks yet.
- Not done (later steps): `contactTargets.js`, the evidence-envelope adapters, merging the capture tools, the George port, any move-editor UI.

## How to use it

New or changed move requirement with no check: `npm run moves:coverage -- --check` fails and names it. Fix it (write a spec), waive it (`coverage-waivers.json`, with a reason), or baseline it (`--write-baseline`, then write the reason). Changing a baselined move's spec or clip contact fields re-opens its debt. When a baselined move becomes covered, `--check` prints "remove from baseline".
