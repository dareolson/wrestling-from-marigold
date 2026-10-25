# Turning move discoveries into engine capabilities

2026-10-24 · Codex · architecture requested by Derek.

## Decision

Every move refinement must leave two results: the improved performance and a
record of what the pipeline learned. Reusable discoveries become shared
capabilities with authoring support and regression evidence. Choreography and
character-specific paint remain authored data. Extend the current engine;
do not build a second animation system or require every fix to become a framework.

This document establishes the workflow now. The interfaces and commands below
are proposed implementation work, not claims that those tools already exist.

## Current evidence

We already accumulate useful machinery:

| Discovery | Shared implementation | Remaining gap |
| --- | --- | --- |
| Staged hands miss on different casts | Clip grips, `MoveRuntime.afterDraw`, rig-aware IK | Contact evidence must distinguish bone endpoints from painted surfaces |
| Figure-four depth depends on player slot | `clipLayers.js`, anatomical layer windows and tie order | Shared mechanism exists; parked figure-four performance remains unapproved |
| A wrist is not the painted grasp | `Skeleton.imageAnchorPoint`, semantic anchors, candidate grounded reach | Contact intent and unsupported-rig fallback need an explicit contract |
| Selling art can fight move art | `sellAppearance.js`, ownership/reset tests | Carry ownership rules into future recovery/support work |
| Pain ends before recovery performance | `_pain`, `backRisePerformance.js`, optional recovery | Current pilot is incomplete; support planting and standing motif are open |
| Engine preview differs from gameplay | Critic traces, play scenarios, event-aligned capture | Clip-only traces and aftermath captures have separate formats and coverage |

The method already records rig lessons, but the connection between a lesson,
its consumers and a regression is informal. `specFor` currently returns `{}`
for an unknown move; a report can therefore omit intended contact checks
without explicitly saying coverage is missing. Documentation also contains
superseded whole-actor layering guidance. These are pipeline reliability gaps.

## The learning loop

1. Reproduce a named failure in the real game; preserve baseline, cast,
   facing, flags, phase and game time. State the desired wrestling performance.
2. Classify the cause: choreography, engine mechanism, rig/art metadata,
   gameplay rule, or measurement/tool defect. A problem can have several causes.
3. Fix the smallest demonstrated cause behind a candidate flag where needed.
   Keep timing/damage/input ownership explicit.
4. Extract a shared mechanism when the behavior is invariant. Keep the first
   consumer working while extracting; avoid a parallel implementation.
5. Connect the mechanism to authoring, validation and a behavioral regression.
   Record unsupported cases explicitly. Test a second distinct consumer before
   calling a capability reusable; until then label it a pilot.
6. Compare real-speed performance and measurements. Mechanical verification
   and Derek's visual approval are separate recorded outcomes.
7. Update the capability record, current authoring method and handoff. A
   move can improve while its generalization remains pending; report both.

Examples: a support-hand solver is reusable; the moment Lou chooses to push
off is choreography; Lou's painted palm location is rig data. A cupped hand
cannot become a support palm by changing the IK target.

## Responsibilities and boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| Move/performance definition | Beats, named roles, contact windows, release intent, appearance requests | Solver math, image coordinates, duplicated rig exceptions |
| Rig metadata | Painted anchors, variant availability, binding and supported projections | Per-move timing or damage |
| Shared runtime | Target resolution, reach limits/hinge continuity, ownership and teardown | Inventing missing paint or silently changing choreography |
| Authoring tools | Expose supported intent, preview actual resolution/fallbacks, preserve export | A separate approximation of runtime contact semantics |
| Verification | Coverage, geometry, continuity, event alignment, interruption and reproducibility | Automatic approval of acting or weight bearing |

Keep existing clip `grips`, `floorContacts`, `layers`, `parts`, sells and rise
paths. Introduce shared helpers behind these APIs, then migrate only touched
consumers. `Wrestler` retains gameplay state transitions; `Skeleton` retains
rendering/binding; pure resolution helpers must not import either class.

## First shared interface: contact intent

Implement incrementally in a proposed `src/animation/contactTargets.js`,
initially consumed by the supine support pilot. Resolve named targets into
the existing reach solver rather than creating another IK implementation.

Each request specifies:

- Source actor, anatomical limb and painted anchor name (or an explicitly
  labeled joint proxy).
- Target space: own-body anchor, partner anchor or fixed world point.
- Active phase/window, approach/release envelope, hinge policy and tolerances.
- Required art/anchor capability and declared fallback.

Return target resolution and diagnostics: exact/proxy/unsupported, reason,
reachability, final residual and whether a limit constrained the solution.
Never describe a clamped unreachable target as a successful plant. Resolve
against current transforms; do not retain yesterday's world anchor after a
variant swap. Fixed support contacts retain their authored world position for
their window; seekable rises derive it deterministically from a reference pose.
If the root later moves, transform the original reference point correctly
instead of recomputing a moving plant each frame.

Fallback choices are authored: use a measured joint proxy for geometry studies,
keep baseline behavior, or omit an optional gesture and report unsupported.
Production painted-contact acceptance requires the actual registered anchor.
Coordinate conversion and tolerances use explicit rig units or pixels plus
render scale; manifests retain that scale. Do not copy Lou's coordinates to George.

Contact resolution must precede the final measurement pass. Preserve current
runtime ordering until a traced dependency demonstrates a needed change;
measure final rendered anchors after all IK and layering, not intermediate poses.

## Capability records and coverage

Add a small proposed `tools/move-critic/capabilities.json`, maintained with
implementation changes. This is an index, not a second move registry or a
copy of per-move thresholds. Derive clip IDs from existing registration;
reference existing specs, tests and rig metadata.

Each capability records: stable ID, originating failure/evidence, implementation
path, authoring entry point, consumers, supported contexts, explicit fallbacks,
regression command, evidence path and maturity. Use `proposed`, `pilot`,
`reused`, `retired` for maturity; store mechanical verification and visual
approval separately, with dates, scope and evidence. Approval belongs to the
specific performance/cast/candidate, never automatically to all consumers.

Seed records from the six rows above; do not mark uninspected historical
consumers verified. Missing evidence is `unverified`, not a pass.

A proposed `npm run moves:coverage` reports for each registered clip and
explicit legacy/aftermath adapter: declared contact/impact/support expectations,
available checks, required rigs/variants, and uncovered requirements. Preserve
legacy `specFor` callers initially; add strict lookup in the new review path.
An absent or intentionally empty spec must be visible as `unverified` or a
reasoned `not-applicable`, never equivalent to contact approval.

Roll out with a committed baseline of existing coverage debt. Fail new or
changed requirements that lack checks; report unchanged historical debt.
Do not force every old move through a new gate before continuing the pilot.
Baseline exceptions require a reason and evidence reference; changing the
baseline cannot silently erase a new failure.

## Common evidence envelope

Adapt existing critic traces and aftermath manifests into a versioned envelope;
do not rewrite capture tools first. Preserve tool-specific raw data.

Required fields: source commit and dirty state, scenario, cast/rig IDs, flags,
random seed, time base/sample interval, event timestamps, scale, declared
requirements, metrics with units, coverage status and artifact paths.
Record checks as `pass`, `fail`, `unverified`, `not-applicable`; include reasons.
Missing files or samples invalidate their dependent checks.

Separate physical-time playback from phase-normalized diagnostic comparisons.
Event warping helps compare poses but can hide duration/rhythm changes. Supply
synchronized normal-speed playback on game timestamps, alongside phase views.
Use four flag combinations when isolating two interacting candidate features;
do not attribute a combined comparison to one flag.

Commit compact reports and reproducible commands. Provide a portable video or
packaged viewer for Derek; a sheet pointing to untracked local frames is not
a portable review artifact.

## First implementation sequence

1. **Make coverage honest.** Seed capability records and implement the coverage
   command with strict spec status and historical baseline. Verify that an
   unknown move is unverified, an explicitly waived check shows its reason,
   and a newly uncovered requirement fails the review command. No gameplay change.
2. **Prove the support pilot.** Continue `PLAN_SUPLEX_RISE.md` Stage 2 on Lou.
   Measure reach and final contact across both facings; use a joint proxy only
   as labeled geometry evidence. Implement the smallest shared target resolver
   needed, retaining existing reach IK and unchanged flag-off behavior.
3. **Close the art and performance loop.** Give Codex the measured support-art
   request, register the painted anchor, remeasure contact, author standing
   protection, and deliver the complete impact-to-standing comparison.
4. **Prove transfer.** Exercise shared anchor resolution on the existing back
   clutch and support plant (moving body target versus fixed world target).
   Verify rigid transform/facing behavior, unreachable cases and interruption.
   This proves resolver reuse, not that every future support animation is solved.
5. **Integrate the workflow.** Surface contact capability and fallback status
   in the move editor as those contacts become authorable; add evidence adapters
   and the final review command. Update the current method in the same change.
   Extract timed-capture machinery from the suplex tool when a second scenario
   needs it, preserving the original scenario as a regression fixture.

For every stage, report performance gain, shared capability gained, current
consumers, tests/evidence, and remaining limitations. Do not promote defaults
without Derek's performance judgment. Figure four stays parked and Derek's
hammerlock stays the compatibility control.

## Completion criteria

The loop works when a new move can declare an already solved contact or
appearance behavior, receive the existing runtime implementation, expose its
art requirements in authoring, and inherit meaningful verification without
copying a previous move's special-case code. New discoveries either extend
that capability with a regression or remain explicitly local with a reason.
