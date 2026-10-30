# New Opus handoff: G3 review and a smaller next work block

2026-10-29 · Codex · requested by Derek: review the latest work, leave a detailed message for the new Opus, and improve efficiency.

Reviewed at `02afe1d`, branch `story/marigold-opening`. Runtime left unchanged. This is source/data review, not a fresh browser film or Derek's visual approval.

## Resume here

Read `CLAUDE.md`, the Status in `AI_HANDOFF.md`, and `PLAN_GETUPS.md` Stage 4 / Rev 6 through Stage 5. Do not read the archive, whole task registry, or every earlier get-up revision to resume.

T4.0 (`f9fbfc3`) and T4.1 (`18489d7`) are implemented. The G3 evidence is committed in `02afe1d`. **G3 awaits Derek.** No approval or promotion is implied by this note. Start with the [strip](../research/animation/getups-2026-10/g3/strip.html); use the [full page](../research/animation/getups-2026-10/g3/index.html) for individual failures. Stage 5 is George's targeted re-check after G3, not a reason to reopen the entire George plan now.

The entry `2026-10-29-claude-getups-t41.md` is an accurate misses-first summary. Keep its distinctions between standing handoffs, immediate AI actions, and limited natural coverage.

## 1. Resolve attribution of the four standing steps before recommending promotion

I independently read the ten on-run JSON manifests. These are the four `endTo === 'standing'` cases with a measured part-corner step above 5 px:

| Seed / actor / rise | Entry | Largest step | Frame pair in that rise's directory |
| --- | --- | --- | --- |
| 2 / George / 2 | backTuck | nearForearm 35.52 px | 61 → 62 |
| 8 / George / 3 | backTuck | farShin 34.76 px | 68 → 69 |
| 10 / George / 5 | backKneeHurtStraight | nearForearm 42.37 px | 61 → 62 |
| 10 / Lou / 4 | backTuck | nearShin 63.20 px | 57 → 58 |

Directories are `g3/frames/seedNN/w1-rNN` for Lou and `w2-rNN` for George; JPEG names are `sNNNN.jpg`. The G3 page already links the frame pairs. Reuse those files first.

**Hypothesis, not established cause:** the opponent can cross after the rise-start turn snapshot. `Wrestler.move()` re-faces any unlocked standing wrestler toward the opponent; a completed rise releases the grounded lock. This can produce a standing-frame mirror despite a valid choice at rise start. `_standFromRise()` resets pose/gait but does not define a facing policy. Prior handoff notes already identified this risk; these natural cases are the opportunity to attribute it.

For one representative failure, record the last drawn rise frame and first standing frame: facing, x/y, opponent x, riseT, state, pose, moveBlend, and the changed joint positions. Separate root translation, facing change, and pose/texture change. If the existing JPEG pair suggests the cause, confirm it with a small forced fixture or instrumented reproduction. A matching seed alone cannot replay the same match state (see §3).

The other 16 >5 px steps lead directly into an AI action. They remain visible transitions worth reporting, but do not automatically justify modifying the rise keys or adding a gameplay delay. First distinguish action-entry discontinuity from rise completion. The 19 backTuck start steps >10 px deserve the same attribution at the down → rise boundary; the pre-rise geometry was sampled but its image was not saved.

## 2. Understand the mix before tuning weights

The implementation follows Rev 6's ordered refusals and strict family repeat avoidance. The manifests report 80 `avoidedRepeat`, 29 `onlyEligible`, and only 15 `pick` decisions. With just two supine families, excluding the previous family leaves exactly one whenever both were eligible and the previous family was one of them. **Weights then have no influence on that choice.** This is expected from C1/C3, not an implementation defect.

Consequently, 55 backTuck / 67 backKneeHurt / 2 frontKnee is not a direct test of the stamina weight curve. Before proposing new numbers, inspect the eligible/refused counts and previous-family context. A desired mix change may require Derek to choose a different repeat policy; do not silently relax it while describing the change as weight tuning. Existing pure tests do exercise weighted choice with no previous family.

Natural coverage remains narrow: 2 prone rises, no natural rises at stamina 20–30 %, and **zero quick rises** in these on runs. Keep prior forced G2/G2b evidence and focused tests as explicit supplemental evidence. Do not burn more natural matches hunting for a rare state when a diagnostic needs a known boundary; a forced 25/26 % pair can verify that boundary without claiming it is naturally frequent. The 600 ms threshold and accepted stall release remain Derek's decisions; the half-lifted-hand candidate stays parked.

## 3. Evidence-tool gaps worth fixing only when touched next

In `tools/debug/getups_g3.mjs`:

- Seeding before init is useful, but `SETUP` sleeps the game only after launch and reseeds the RNG without resetting already evolved state. The current warning about load-time dependence is correct. For regression replay, establish a deterministic startup/step boundary and compare two manifests before recapturing a package. Do not call the present seeds exact reproductions.
- `row.otherSide` is always `null`; the sampler does not record opponent x. The current data cannot establish that every rise finishes facing the opponent. Record that position beside the actor's facing at the relevant boundaries, especially for crossover cases.
- `cause()` selects the latest match event with a move for either wrestler. That is contextual information, not reliable attribution of this actor's knockdown. Scope a future cause record to the receiver and relevant fall transition. A prone rise count alone also does not count direct face-down landings.
- The tool classifies interruption by a sampled terminal progress threshold (`.98` for full rises), rather than a completion/cancel event. Zero reported interruptions is an observation under that classifier, not proof of lifecycle coverage. Use a forced interruption check where needed.
- `_logGetUp` caps normal logs at 50; `_startQuickRise` pushes directly without trimming. Small confirmed consistency miss, not a promotion blocker by itself. Fix beside the next relevant logging change and test a mixed full/quick history, rather than opening a separate workstream.

These are bounded improvements to existing tooling. Do not start a generic capture framework or regenerate unchanged evidence just to reorganize it.

## 4. Suggested next work block and stop

Opus: review the existing four frame pairs, identify the smallest diagnostic needed, and give Sonnet one task: attribute and, if warranted, repair one confirmed completion-boundary defect. Require focused regression evidence for the cause and both facings, with Lou and George where shared runtime changes affect both. Keep a stationary-opponent case and a crossover case so the fix cannot merely hide one seed's failure.

Sonnet's return should contain: cause, small diff, focused check result, remaining misses, and one normal-speed loop in both facings. Then stop for Derek's direction before another full G package or promotion. If Derek accepts the current behavior with known limitations, record that decision explicitly and follow the existing Stage 5 scope.

## 5. Efficiency for this session

The compact startup rules are already implemented. `PLAN_TOKEN_EFFICIENCY.md` still describes Phase 1's old 599 KB handoff and missing repo rules as future work; do not execute those steps again. The current handoff is about 17 KB with a short Status and a long historical index. Read just Status. The old audit's next-task and token-size figures are historical, not today's queue.

Use Opus for the bounded decision and review, Sonnet for the resulting execution block, and mechanical tools for counts/package output. Keep one active problem and one acceptance question per block. Reuse existing manifests and images; recapture only the affected case until the direction is accepted. Focused tests per runtime task; full suite/build/coverage at the next actual gate; docs-only edits get `git diff --check`. Keep one short Status update and one handoff entry per coherent checkpoint; no duplicate narrative in every plan and log. No estimated token-saving percentage: judge actual usage and iteration count.

## Verification and working-tree notes

Fresh Node 22.23.1 check: `node --test tests/getUps.test.js tests/riseFixFlagOff.test.js tests/georgeClutchFlagOff.test.js` — **68/68 passed**. Full suite 1023/1023, build pass, and 22 baselined coverage gaps are Sonnet's recorded T4.1 gate results; not rerun by this review. Passing coverage still means the historical gaps remain.

Before this review the only dirty item was untracked `research/animation/suplex-rise-2026-10/pair-sheet-aft-on.html`; left untouched. The branch has no configured upstream, so `@{u}` fails: verify remote refs explicitly if push status matters. No fetch, commit, push, promotion, or runtime edit was performed. This handoff and its index/Status pointers are the only intended edits.
