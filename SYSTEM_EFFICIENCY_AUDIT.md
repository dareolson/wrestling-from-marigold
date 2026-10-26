# System efficiency audit — 2026-10-25

Codex; source reviewed at `89cd0fe`, including the current working-tree film changes.

## Verdict

The suplex investment has created useful shared engine behavior and verification tools.
It has not yet created an inexpensive end-to-end production workflow. George's transfer
is the first substantial reuse trial, and its repeated visual revisions show where
the remaining cost is. Do not forecast a percentage saving from this audit: local
source and Git cannot establish weekly token usage or attribute tokens to tasks.

## What the investment bought

| Asset | Evidence and practical reuse | Limit |
| --- | --- | --- |
| Rise/standing renderer agreement | `Skeleton.standingChannels`, `_standFromRise`; G5 measurements in `PLAN_RISE_HANDOFF.md`: approximately 56–93 px jumps reduced to at most 3 px on six rigs; promoted to default | Facing turn deliberately retained; two old rigs excluded by Derek |
| Continuous back selling | Shared hold, protected rise, carried recovery and contact latch; `src/animation/backRisePerformance.js`, `src/animation/sellAppearance.js` | Back/supine scope; prone protection incomplete; latest hold changes need visual review |
| Rig-specific support contract | `src/rig/backSell.js`, Lou/George data, contract and fixture tests | George's mechanical transfer exists; final acting remains unapproved |
| Contact/depth machinery | Painted anchors, clip layers; latest silhouette clearance and inverse torso mask in `src/rig/silhouette.js` and `src/Skeleton.js` | Latest George path/mask work is not through G8; mask cost is a reported software-GL measurement, not a target-device benchmark |
| Repeatable visual evidence | Stepped film, contact curves, portable playback viewers | More than one capture/package path; reproducibility needs tightening |
| Honest coverage inventory | `tools/move-critic/capabilities.json`, strict specs and coverage baseline | Reporting debt does not repair or execute all missing checks |

## Findings, in priority order

1. **Expensive visual proof arrives too late.** George G6 was rejected for a belly-rub read
   and stiff legs; G7 required another revision, now followed by an around-body route
   and mask. Numeric contact success did not resolve acting, hand path or occlusion.
   Screen a small normal-speed loop of approach, hold, rise and release before producing
   a full multi-row review package. This is an ordering change, not removal of regression checks.
2. **Resume context is excessive and stale.** `AI_HANDOFF.md` is 9,391 lines. Its leading
   status still points at G7, while `PLAN_GEORGE_TRANSFER.md` records G7's rejection,
   G8a's approval and progress through T8.4. Older status paragraphs still describe
   promoted features as unpromoted. Keep a short current-state entry with exact next task,
   flags, open misses and links; consult historical entries only when needed.
3. **The pipeline does not fully reproduce its own experiments.** George T3.5/T4.1 records
   repeated runs to obtain particular sell kinds (24 new runs for the G6 package).
   `aftermath_film.mjs` installs its fixed random seed in `TAKE_OVER`, after the suplex
   event; that does not control earlier randomness. Install a selectable seed before game
   initialization, record it and the chosen sell plan, then verify repeated manifests match.
   Use explicit forced sell cases for isolated diagnostics and a natural game run for integration.
4. **Evidence tooling is accumulating parallel implementations.** G4, G6 and G7 each have
   a package script. Capture tools share some infrastructure but remain separate paths.
   Preserve scenario-specific probes; consolidate packaging and clock/seed ownership when
   next touched. Avoid building a new general framework before a concrete consumer needs it.
5. **Task ceremony is disproportionate for some work.** The George plan requires the full
   suite after every task, even inventory and documentation tasks. The fresh suite takes
   about five seconds here, so execution time is modest; repeated instructions, outputs,
   commits and handoffs add context overhead. Use focused checks during runtime edits;
   full suite/build/coverage at a coherent review checkpoint. Documentation-only work needs
   link/diff checks, unless it changes executable metadata.
6. **Validation status is easy to overread.** Coverage passes with 22 historical gaps:
   5 covered, 3 partial, 19 unverified, 2 not applicable out of 29 moves. Even suplex is
   partial because its layer declaration lacks a critic metric. Capability records correctly
   keep most selling behavior at pilot maturity. Keep these qualifications in completion reports.
7. **Latest work is not yet a portable checkpoint.** The modified film tool imports untracked
   `tools/debug/forearm_count.mjs`. Both exist locally, but committing the caller alone would
   break clean-checkout capture. Preserve the pair when the current work is finalized.
   T8.4 also reports nonzero contour pixels against a literal zero-pixel goal; define and
   review the alpha-edge tolerance explicitly rather than silently calling that target met.

## Recommended next working loop

1. Resume from the current George T8.5 task; preserve existing authorized decisions and
   parked scope. Do not restart the suplex audit or implement another animation architecture.
2. Capture one short George loop in both facings and inspect the route, clearance and mask.
   Resolve material failures before making the G8 package. Keep Lou as the regression control.
3. Complete the existing G8 checks and package, including explicit misses and mask cost.
   Derek's visual review remains the decision on acting.
4. At the next tooling edit, fix seed timing and parameterize packaging. Reuse the current
   film data rather than recapturing unaffected baseline frames.
5. Before each new move, list the existing capabilities it can consume and the single
   new problem it introduces. Separate rig/art measurements from shared runtime changes.
6. End each work session with one compact checkpoint: commit/dirty state, visible result,
   checks, unresolved issue, exact next command or task. Link the detailed evidence.

These recommendations do not override existing plans automatically. No runtime,
approval state, historical handoff or in-progress source was changed by this audit.

## Fresh verification

Node 22.23.1: `npm test` **929/929**, `npm run build` passes,
`npm run moves:coverage -- --check` passes with **22 baselined gaps**.
Reviewed source, plans, capability metadata, recent commits and working-tree diff.
No new browser film, target-device performance benchmark or visual approval was performed.
