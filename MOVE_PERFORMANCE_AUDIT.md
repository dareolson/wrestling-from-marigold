# Move performance audit and production plan

2026-10-22 · Codex · requested by Derek

## Design conclusion

Treat a move as a performance by two wrestlers, beginning before contact and
continuing after release. The audience must understand intention, purchase,
effort, resistance, consequence and recovery. Joint attachment and correct
damage timing are necessary, but neither establishes that story.

The existing engine is a useful foundation. Extend its authoring contract and
fill specific contact/rendering gaps. Avoid a wholesale animation rewrite or
full-body physics project. Start with figure four and one complete throw
aftermath, then use their proven techniques across the catalog.

This is a current-source audit and implementation plan. No new match footage
was captured, and this document does not certify the current animation's look.
Prior visual findings retain their original dates. No gameplay, clips or art
were changed during this audit.

## What exists now

The current registry has **29 moves: 17 registered clips and 12 legacy moves**.
The October 18 report's 15-clip count predates front kick and shove.

| Layer | Current owner | Assessment |
| --- | --- | --- |
| Choice and eligibility | `Wrestler.try*`, `moveDecision.js`, Arena lockup branches, character kits and AI | Functional but distributed. Keep rules here during visual work; the registry deliberately describes rather than duplicates them. |
| Identity and metadata | `src/moves/registry.js` | Useful canonical inventory, executor/clip cross-checks and body-part sell tags. Not a complete choreography specification. |
| Choreography | `src/animation/clips`, generated drafts and legacy `MOVE_DEFS` | Seekable synchronized tracks exist; remaining pose sequences have different timing/lifecycle paths. |
| Transport | `clipStaging.js`, Wrestler staging fit | Shared origin/axis/scale and ring fitting exist. Entry pose can still require visible reconciliation with the actual starting bodies. |
| Contacts | runtime hand-grip IK, floor contacts, offline staging and critic specs | Valuable pieces already exist. They are not a general leg-entanglement solver. Offline contact assertions and runtime constraints are distinct. |
| Rendering | `Skeleton.js`, per-rig art bindings, variants, local limb stacking | Jointed bodies and replacement infrastructure exist. Current per-wrestler depth assignment cannot author arbitrary crossings between two bodies. |
| Effects and teardown | clip markers, `MoveRuntime`, executors | Event crossing, cancellation and ownership are tested. Gameplay state still belongs to executors/Arena. |
| Acting | stagger library, grounded sells, character sell styles | Both standing and mat reactions exist. Complete injury-specific continuity through recovery is missing. |
| Evaluation | tests, move critic, editor, rendered certification and live debug tools | Strong tooling; a logged move or green structural test does not establish believable performance. |

### Coverage by family

| Family | Clip path | Legacy path | Review priority |
| --- | --- | --- | --- |
| Strikes | jab, dropkick, frontKick, shove | headbutt, kneeLift, clothesline, doubleAxeHandle | Contact direction, support, head/torso lag, corrective steps and recovery. |
| Throws | bodySlam, piledriver, suplex, hipToss | armDrag, backBodyDrop | Purchase, weight transfer, receiver cooperation, crash and aftermath. |
| Holds | hammerlock, armBar, figureFour, ankleLock | sleeperHold, headlock | Enclosure/trapping, support, pressure, purposeful resistance and unwind. |
| Aerials | elbowDrop, kneeDrop, theszPress, divingElbow, topDive | — | Commitment, hit/miss divergence, both landings and transfer into down/pin. |
| Positional/presentation | — | irishWhip, pin, taunt, turnbuckleTaunt | Lead/follow, weight on the cover, kickout space, gaze and crowd timing. |

Preserve Derek's live hammerlock (`hammerlockWip.js`), approved suplex and
accepted move interpretations. The generated hammerlock fixture is a tooling
control, not the live choreography. Make comparisons separately.

## Findings, ranked by effect on the performance

### 1. Figure four describes motion without proving a trap — critical

`figureFour.js` is 4.1 seconds with three `squeeze` events at 2.0, 2.6 and
3.2 seconds. It declares no runtime grips or floor contacts. There is no
figure-four spec in `tools/move-critic/specs.mjs`; `specFor` falls back to an
empty object. A general trace can run without grading the defining trap.

The authoring generator has named times for strut, step, over, grab, fall,
locked, rocking, release and rise. That is a useful first blocking pass.
However, changing angles at those times does not establish ankle purchase,
which leg crosses which, how the trap closes, or whether contact survives
between keys. Its entry still uses inert `lean` for intended torso motion.

The October 18 preserved pose review found indistinct raised overlapping legs
and unreadable purchase. Current source still lacks the explicit constraints
that would prove those issues resolved. This is not a new film verdict.

### 2. Mat submissions have a different gameplay meaning from interactive holds — high

Figure four, arm bar and ankle lock all call `_playPairedThrow`. Both actors
become `holding` with `_fixedHold`; damage occurs at the three squeeze markers;
completion leaves the defender down and attacker standing. This helper has
sound lifecycle foundations, but its fixed sequence does not enter Arena's
sleeper/headlock escape and rope-break loops. A registry category of `hold`
does not provide those mechanics.

First improve the fixed performance without changing its damage budget.
Then build a separately reviewable submission interaction: establish the
hold, sustain pressure, permit resistance/escape, resolve a rope break or
submission, visibly unwind. Do not just loop the current three damage events:
that would change balance and potentially drain indefinitely.

Cancellation currently uses generic grounded/standing recovery. A believable
early aborted grab, a failed thread and a release from a fully locked hold
need different visual exits. Teardown must remain immediate and damage-safe;
an exit animation must not retain invalid partner ownership.

### 3. Entanglement needs explicit depth relationships — critical for the pilot

Wrestler drawing sets depth for the skeleton as a body. Local arm/leg stacking
can improve one rig but cannot express a defender calf between two attacker
parts. Add clip-scoped front/behind relations across participating actors,
applied after their normal depth assignments. Validate a stable ordering and
reject cycles. Author changes at the intended crossing phases.

If one segment must appear both above and below another at separate crossings,
a whole-part sort cannot solve it. Use a measured render split, mask or donor
for that exact crossing. More arbitrary angle keys will not solve topology.

### 4. Pain does not reliably persist as a specific experience — high

`_hurt(amount, moveId)` stores a single move tag. `_tickSell` consumes registry
part/intensity data when the wrestler is down. Economical style has 30% `none`
and otherwise one clutch; sequences too long for the remaining budget are
discarded. Intensity scales amplitude rather than guaranteeing a response.
Both styles can therefore look less affected than the move warrants.

Clutch targets are expressed in near/far render terms. A `knee` tag does not
carry the actual trapped leg through a facing change, roll or get-up. There is
no durable localized injury model in this mechanism. Introduce a lightweight
performance context first: affected anatomical limb, severity, source move,
reaction phase and expiry. This is visual continuity, not automatic localized
damage or a new stun system.

Make substantial confirmed effects always produce a readable response,
including a compact response when the full library action cannot fit. Let
personality determine restraint, rhythm and choices. Economical should mean
a tight jaw, guarded movement and a protective pause; it should not mean
unaffected. Preserve quieter intervals between peaks of pain.

### 5. Acting must continue through recovery — high

Current mat sells return to the base lying pose. Stagger expiry returns to
standing/idle. Neither alone carries protective behavior through a rise and
the next ordinary movement. A knee submission should leave the receiver
protecting the same leg and cautiously accepting weight; a head shot should
leave different residual behavior from a back landing.

Own expression and posture overrides explicitly: active choreography first,
recovery performance next, ordinary state last. Clear or yield on attacks,
guard, pin/pickup, replacement, cancellation and shutdown. Initially fit the
acting into existing control windows. Continuing visible hurt during ordinary
play need not extend the time that the player cannot act.

### 6. Some older recommendations are already implemented

The latest `staggers.js` has **five** stamina tiers and uses working `bend`,
not inert `lean`. Do not repeat the October 18 recommendation as if that
repair were still wholly outstanding. Assess its support feet, travel and
readability with fresh film. There may still be inert channels in other paths.

Likewise supine grounded poses, grounded reaches, runtime grips, crown/floor
windows and shared ring fitting exist. Older pipeline text describing their
absence is historical. Certification gaps and handoff quality must be
remeasured; neither old warnings nor new unit passes establish a fresh verdict.

### 7. Match storytelling needs confirmed outcomes — medium

Arena's `logMove` receives successful action-start return values. Clip contact
can happen later or the move can be cancelled. The nearby comment saying every
move "landed this frame" is therefore broader than the evidence. For future
crowd/commentary direction distinguish attempt, acquired control, confirmed
impact/pressure, escape and release. Reuse confirmed executor outcomes; do not
derive every story beat from the input or start event.

## A reusable way to direct every move

Before authoring angles, fill a short performance sheet:

| Field | Required answer |
| --- | --- |
| Dramatic job | What does this establish: dominance, desperation, damage, escape, humiliation, comeback? |
| Entry | Actual distance, facing, posture and available space of both performers. |
| Physical action | What connects, supports, pivots, transfers weight and releases? |
| Attacker objective | A verb for each beat: seize, load, drive, brace, squeeze, clear. |
| Receiver objective | Protect, resist, catch weight, reach safety, recover; never simply "flail." |
| Contact ledger | Named surfaces/limbs, acquisition/release windows, allowed slide and failure condition. |
| Visibility | Which crossing, face, support and hurt area must remain legible at gameplay size? |
| Gameplay contract | Existing effect times, cost, eligibility, input ownership and interruption behavior. |
| Aftermath | Ending posture, affected side, protective action, rise and next legal action. |

Use a common sequence: **recognition → purchase → preparation → commitment →
effect → response → release → recovery**. A jab can compress several into
fractions of a second; a complicated hold can expand them. Do not give every
move eight equally long stops.

Block pelvises and supports first, then torso/head, then working limbs and
free hands. Delayed head motion, asynchronous settling, interrupted recovery
efforts and intentional stillness supply acting. The receiver participates in
weight transfer without appearing to help the attacker willingly. Every free
limb should have a reason to move or remain still.

## Figure-four performance sheet

Goal: the audience sees George methodically remove the receiver's options,
establish an unmistakable trap, apply pressure, and leave a leg that the
receiver protects after release. Use the existing art first.

Before locking anatomical assignments, check the project's visual references
against a clear reference for the chosen figure-four variation. The following
is a choreography brief, not a technical instruction for applying a real hold.
Name receiver straight/crossed legs and attacker trapping/bracing legs in
anatomical identity; map those to near/far only at rendering time.

| Beat | George's performance | Receiver's performance | What must be demonstrated |
| --- | --- | --- | --- |
| Orient | Approach the feet; lower gaze and torso deliberately. | Notice the approach; tense and attempt to withdraw. | Real entry reconciles to the pair without a teleport or abrupt prone/supine flip. |
| Purchase | Take the chosen leg with a reachable grip. | Leg movement follows the purchase; hands prepare to push or reach. | Hand meets the intended painted ankle/calf surface before it controls the leg. |
| Thread | Transfer weight to a planted support and move the working leg through the chosen route. | Hips follow only as needed; free limbs express resistance. | Crossing clears the other body; identity, knee direction and support stay valid. |
| Arrange | Place the crossed leg and establish the closing trap. | Try to retain space, then recognize the loss of it. | Straight and bent legs are distinguishable; each over/under relationship is intentional. |
| Settle | Lower into the final supported position while preserving the trap. | Shoulders/hips settle with a delayed catch of the head. | Connected surfaces remain connected between keys; no unsupported hovering. |
| Pressure | Brace and apply a distinct effort pulse. | Sharp response follows pressure, then protective stillness. | Force has a visible route through the connected bodies; existing damage marker aligns with it. |
| Resist | Adjust the brace in response to the receiver. | A purposeful sit-up or reach fails; return to a tense pause. | Resistance changes the performance without slipping free or generic repeated arm waving. |
| Relieve | Reduce pressure before opening the trap. | Exhale/soften, but keep the injured leg guarded. | Relief is visually different from another squeeze. |
| Unwind | Clear the trapping limb and release purchase in a readable order. | Withdraw only when the path is open. | Legs do not pass through each other during the exit. |
| Recover | Brace, rise and choose whether to watch or address the crowd. | Protect the same leg; try a cautious load during recovery. | Release flows into grounded selling and rise; immediate new player actions still work. |

Author in this order: **locked still → contact/depth proof → entry → pressure
and resistance → unwind → aftermath**. The playback order remains chronological.
Do not spend days polishing the strut before the defining still reads.

Retain the existing 4.1-second/three-squeeze version as baseline. First compare
a candidate with the same effect budget. If readable threading/release requires
more time, show a separate timing comparison and its effect on vulnerability
and match pace. Later escape, rope reach, reversal and submission branches
need their own gameplay review and exit performances. A mat slap must not look
like a recognized tap-out unless the game is actually resolving a submission.

## Implementation sequence and completion gates

| Stage | Concrete deliverable | Completion gate |
| --- | --- | --- |
| 0: establish evidence | Baseline reel for figure four, jab/stagger and suplex/aftermath; record revision, rigs and flags. | Normal speed and slow motion, both performers visible, control resumption plus two seconds. |
| 1: prove the trap | Separate figure-four locked draft, limb labels, contact ledger and crossing diagram. | Reads with overlays hidden in both facings, using George/Procreate Lou baseline; then current roster candidates. |
| 2: minimum shared machinery | Clip-scoped cross-actor order, named leg contact measurements, supported constraint representation where needed. | Reject impossible order/contact declarations; no limb stretching; defaults restored on every exit. |
| 3: perform the hold | Candidate entry, threading, pressure, resistance and full unwind; synchronized effects. | Actual surfaces hold across dense samples and fresh match film. No implicit empty figure-four critic spec. |
| 4: carry the consequence | Side-aware reaction context, compact sell fallback, protective recovery; suplex aftermath comparison. | A substantial effect is visibly sold; correct leg stays protected; short budgets and immediate actions work. |
| 5: enrich only demonstrated gaps | Registered pain/strain/dazed expressions and specific foreshortened or compressed donors. | Each asset fixes a named failing beat and preserves binding/socket contracts. |
| 6: interaction and catalog rollout | Reviewable interactive submission design; migrate legacy moves by family. | Escape/outcome rules explicit; no duplicate effects; each move passes the same full-performance review. |

Runtime work should remain incremental. Keep `MoveRuntime` as the shared clock,
sampler and lifecycle owner; keep gameplay effects in executors/Arena. Add
semantic phases/contact windows alongside existing clips, not a second timing
engine. A phase specifies its contacts, support, depth, acting intent and legal
exits. A later interactive hold can select entry/sustain/exit clips under a
submission controller while preserving seekable visual segments.

Contacts should declare their actual purpose: purchase, trap, brace or support.
Some require positional coincidence; others require a surface range or allowed
sliding. Start with measurement and the authored tableau, then add only the
runtime solve needed to maintain it across cast proportions. Existing hand IK
does not automatically solve leg-leg contact or a closed multi-limb chain.

Roll out in dependency order: strikes and responses; throws and consequences;
mat holds; enclosing standing holds; aerial landings; whip/pin/taunt
performances. Reuse supports, contact types and reaction motifs, while retaining
each move's silhouette and character intention. Preserve reviewed work as
controls rather than mechanically converting every legacy channel.

## Review rubric

Score each dimension 0 (absent), 1 (readable but inconsistent), or 2 (convincing
through the full sequence): intention, purchase, support/weight, articulation,
receiver agency, effect timing, pain/personality, release/recovery. Use scores
to find the weakest dimension, not to average away a broken trap or handoff.
Required-contact failure, invalid joints, wrong limb identity, stale ownership
or duplicate effects block acceptance regardless of the total.

Review muted at gameplay scale first. Then add sound/crowd and inspect whether
they reinforce the established action. Keep current submission impact foley
silent; expression, breath and exertion audio can be a separate designed pass.

Measure contact surface separation relative to body height, support drift,
joint direction, cross-actor order, floor clearance and final-to-next-state
continuity. The current method's roughly 8% body-height contact guideline is
an upper review reference; a visibly open trapped ankle still fails. Record
per-contact tolerances and worst frames instead of one global pass number.

Sample between keys at 60 Hz and inspect transitions at 30/60/120 Hz plus a
large time step. Exercise both facings, role orders, center/rope-side staging,
different cast proportions, and cancellation in purchase/thread/lock/release.
Include clip replacement, pin/pickup, shutdown, short down windows and immediate
recovery into a new action. Do not widen certification budgets to claim polish.

## Audit verification and boundaries

Reviewed registry/registration, figure-four generator and clip, mat-hold
executors, runtime ownership/grips, grounded selling, latest staggers, critic
specs, Arena event/hold paths and the October 15–18 design handoffs.

Ran existing tests under Node 22.23.1:

```sh
node --test tests/animationClip.test.js tests/moveRuntime.test.js \
  tests/moveContacts.test.js tests/moveRegistry.test.js \
  tests/moveParticipation.test.js tests/sells.test.js tests/staggers.test.js
```

**80 passed, 0 failed.** This supports the sampled event, registry, ownership,
contact and sell contracts; it is not a fresh visual approval, full test-suite
result, build result or rendered rig certification. No new behavior tests were
added for this documentation-only change.
