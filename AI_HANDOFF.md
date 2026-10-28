# AI Handoff — Wrestling from Marigold

Shared project notebook for Derek, Claude, and Codex.

## Protocol

- Read the Status below. Open AI_HANDOFF_ARCHIVE.md or AI_HANDOFF_ENTRIES/ only when a task names them.
- Handoff entries go in AI_HANDOFF_ENTRIES/, newest first in the index below.
- Status ≤ 40 lines; replace it, don't append.
- Identify the author as Derek, Claude, or Codex.
- Do not silently replace prior decisions; record what changed and why.
- Link focused commits and include test commands and results.
- Update the Status when the state it describes changes (replace, don't append). The entries and
  AI_HANDOFF_ARCHIVE.md stay the detailed record.

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

## Status (2026-10-25, replace this block; ≤ 40 lines)

- **HEAD** `5724542` (T9.2) on `story/marigold-opening`; 929+ tests pass (930 at T9.1). Tree clean except untracked `research/`.
- **Pushed vs local:** origin tip is `e76fe73`; the 39 commits after it (George transfer T0.1–T9.2, Rev 2, Rev 3) are **local only**. Push via the SSH URL (HTTPS returns 400).
- **Gait (2026-10-26):** [PLAN_GAIT.md](PLAN_GAIT.md) Stage 3 (run as its own gait) built behind `?gait=v2` (`&runGait=off` = Stage 2 run; flag off byte-identical), stopped at **G3**: Derek judges the [G3 page](research/animation/gait-2026-10/g3.html). Stage 2 commits local only. Open: whip-start facing flip (Stage 4), George hip step 3.3 px.
- **Active plan:** [PLAN_GETUPS.md](PLAN_GETUPS.md) (authored get-up library, `?getups=v1`; no rolls while selling on the back). Next task: **T1.0** (Sonnet). [PLAN_GEORGE_TRANSFER.md](PLAN_GEORGE_TRANSFER.md) is **parked at G10a** (Derek 2026-10-27): G9 grip approved; `legScale` built (8e5b82a), no value set; thigh mask (Stage 11) not started; re-checked at get-ups G4.
- **Awaiting Derek:** whether to push the local commits.
- **Open misses (G8):** prone run misses the 2.5 px/frame step limit (3.26, 16.63, 2.85 px; the prone rise has no hand route); forearm pixels still show inside the torso outline in the rise (1–80 px counted); the latch cannot decide the swap (want = the route); swap-in is at the start of the clutch, not at the via point; holdW .7 leaves a .48 px margin to the 15 px line; about +1 ms a frame.
- **Feature flags:** `risefix`, `sellart` (v1) and `aftermath` (v2) are **promoted** (default on, `=off` disables; risefix 82b71a8, others Derek 2026-10-24). `?plant=1` (support-hand plant) is **opt-in only**, parked.
- **Parked (Derek):** figure-four track (2026-10-23, G1 never approved, revisit later, see [PLAN_MOVE_PERFORMANCE.md](PLAN_MOVE_PERFORMANCE.md) and `research/animation/figure-four-tableau/LEDGER.md`); support-hand plant and Codex's support-art request; old rigs `thesz` and `thesz-front3q-r1` (don't fix, don't retire).
- **Other open items:** Lou's rise-to-standing whole-body step (31/35 px) is the facing turn, not the hand ([PLAN_RISE_HANDOFF.md](PLAN_RISE_HANDOFF.md)); the Marigold title queue (83ab5cd) awaits Derek's visual OK; move coverage baseline is 22 gaps (`npm run moves:coverage -- --check`).
- **Plans and viewers:** [PLAN_GEORGE_TRANSFER.md](PLAN_GEORGE_TRANSFER.md), [PLAN_SUPLEX_RISE.md](PLAN_SUPLEX_RISE.md) (G4 approved, promoted), [PLAN_RISE_HANDOFF.md](PLAN_RISE_HANDOFF.md), [PLAN_PIPELINE_COVERAGE.md](PLAN_PIPELINE_COVERAGE.md), [PLAN_MOVE_PERFORMANCE.md](PLAN_MOVE_PERFORMANCE.md), [PLAN_TOKEN_EFFICIENCY.md](PLAN_TOKEN_EFFICIENCY.md), [MOVE_CATALOG.md](MOVE_CATALOG.md), [MOVE_PIPELINE_EVOLUTION.md](MOVE_PIPELINE_EVOLUTION.md). Viewers: [G7](research/animation/george-transfer-2026-10/g7-viewer.html), [G6](research/animation/george-transfer-2026-10/viewer.html), [G4](research/animation/suplex-rise-2026-10/viewer.html).
- **Older history:** [AI_HANDOFF_ARCHIVE.md](AI_HANDOFF_ARCHIVE.md) (old Status summary + Handoff Log, plus archived plan Progress).

## Entry index

- 2026-10-27 · Codex · [Notes for Opus: Rev 4 / Rev 4b runtime and plan review](AI_HANDOFF_ENTRIES/2026-10-27-codex-notes-for-opus.md)
- 2026-10-26 · Codex · [George grip donor ready for Claude registration](AI_HANDOFF_ENTRIES/2026-10-26-codex-george-grip-donor.md)
- 2026-10-25 · Claude · [Rise -> standing handoff: G5 package (`?risefix=1`)](AI_HANDOFF_ENTRIES/2026-10-25-claude-rise-handoff-g5.md)
- 2026-10-25 · Claude · [Pipeline coverage: capability index, `moves:coverage`, baseline](AI_HANDOFF_ENTRIES/2026-10-25-claude-pipeline-coverage.md)
- 2026-10-25 · Claude · [George transfer Rev 3: the hand goes around the body, swaps only when clear, no elbow beze](AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer-rev3.md)
- 2026-10-25 · Claude · [George transfer Rev 2: hand under the body, still hand, leg life (G7 package)](AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer-rev2.md)
- 2026-10-25 · Claude · [George transfer: the back sell on a second rig (G6 package)](AI_HANDOFF_ENTRIES/2026-10-25-claude-george-transfer.md)
- 2026-10-25 · Claude · [Art request for Codex: George's grip donor (back clutch)](AI_HANDOFF_ENTRIES/2026-10-25-claude-codex-george-grip-request.md)
- 2026-10-24 · Codex · [Implemented: contact-aware selling art and a protective back rise](AI_HANDOFF_ENTRIES/2026-10-24-codex-sell-art-and-protected-rise.md)
- 2026-10-24 · Codex · [Review of Claude's latest suplex-rise handoff](AI_HANDOFF_ENTRIES/2026-10-24-codex-review-of-claude-suplex-rise.md)
- 2026-10-24 · Claude · [Suplex receiver rise: G4 package (Lou, `?sellart=v1` + `?aftermath=v2`)](AI_HANDOFF_ENTRIES/2026-10-24-claude-suplex-rise-g4.md)
- 2026-10-24 · Claude · [Request to Codex: Lou far-forearm support hand (`support` variant)](AI_HANDOFF_ENTRIES/2026-10-24-claude-open-support-request.md)
- 2026-10-23 · Codex · [Review of Claude's elbow pilot packet](AI_HANDOFF_ENTRIES/2026-10-23-codex-review-of-elbow-packet.md)
- 2026-10-23 · Codex · [Latest performance review and asset contract for Claude](AI_HANDOFF_ENTRIES/2026-10-23-codex-performance-and-asset-brief.md)
- 2026-10-23 · Codex · [Claude's reach repair: inspected, extended and filmed](AI_HANDOFF_ENTRIES/2026-10-23-codex-clutch-solver-repair.md)
- 2026-10-23 · Codex · [Review of Claude's committed response](AI_HANDOFF_ENTRIES/2026-10-23-codex-check-of-claude-reply.md)
- 2026-10-23 · Codex · [Body-part replacements: shared art and animation work brief](AI_HANDOFF_ENTRIES/2026-10-23-codex-body-part-replacement-coordination.md)
- 2026-10-23 · Claude · [Claude's reply to Codex: review accepted, clutch work committed](AI_HANDOFF_ENTRIES/2026-10-23-claude-reply-to-codex-clutch-review.md)
- 2026-10-23 · Claude · [Bent-elbow pilot: measured packet, reuse map, and a revised first step](AI_HANDOFF_ENTRIES/2026-10-23-claude-bent-elbow-pilot-packet.md)
- 2026-10-22 · Claude · [Move performance Stage 0: baseline and depth evidence (2026-10-22)](AI_HANDOFF_ENTRIES/2026-10-22-claude-move-performance-stage0.md)
- 2026-10-21 · Claude · [Front kick, explicit roster kits, and move-selection gaps (2026-10-21)](AI_HANDOFF_ENTRIES/2026-10-21-claude-front-kick-and-kit-architecture.md)
- 2026-10-18 · Codex · [Claude: Procreate roster preparation is ready](AI_HANDOFF_ENTRIES/2026-10-18-codex-roster-preparation-for-claude.md)
- 2026-10-18 · Codex · [LouNew comparison rig — ready for Derek's tuner review](AI_HANDOFF_ENTRIES/2026-10-18-codex-lou-roster-comparison.md)
- 2026-10-18 · Codex · [Resume move refinement: mechanics, pain, and recovery](AI_HANDOFF_ENTRIES/2026-10-18-codex-kinesiology-selling-resume-audit.md)
- 2026-10-18 · Codex · [Elbow/knee direction audit and limiter strategy](AI_HANDOFF_ENTRIES/2026-10-18-codex-joint-direction-and-limit-audit.md)
- 2026-10-18 · Codex · [George's figure-four: improve the hold before ordering replacement parts](AI_HANDOFF_ENTRIES/2026-10-18-codex-figure-four-existing-art-strategy.md)
- 2026-10-18 · Claude · [Roster comparison rigs for all four PSDs](AI_HANDOFF_ENTRIES/2026-10-18-claude-roster-four-comparison-rigs.md)
- 2026-10-15 · Codex · [Codex — tested isolated joint/participation repair](AI_HANDOFF_ENTRIES/2026-10-15-codex-joint-repair-tested.md)
- 2026-10-15 · Codex · [Codex — audit of the refinement approach: impact and personality](AI_HANDOFF_ENTRIES/2026-10-15-codex-impact-refinement-approach.md)
- 2026-10-15 · Codex · [Next Claude: move contact, recovery, and leg entanglement](AI_HANDOFF_ENTRIES/2026-10-15-codex-entanglement-and-deep-move-review.md)
- 2026-10-15 · Codex · [Codex audit of Claude's integrated fixes and refinement prototype](AI_HANDOFF_ENTRIES/2026-10-15-codex-claude-move-refinement-review.md)
- 2026-10-15 · Claude · [Paired throws v2 and the shared selling library](AI_HANDOFF_ENTRIES/2026-10-15-claude-throws-and-selling.md)
- 2026-10-15 · Claude · [Claude: suplex v2, the method that worked, and the next round](AI_HANDOFF_ENTRIES/2026-10-15-claude-suplex-v2-and-method.md)
- 2026-10-15 · Claude · [Claude: the impact pass (torso acting, foley, handoff, suplex v3, jab v2, dropkick candida](AI_HANDOFF_ENTRIES/2026-10-15-claude-impact-pass.md)
- 2026-10-12 · Codex · [Trainer and dressing-room imagery](AI_HANDOFF_ENTRIES/2026-10-12-codex-trainer-dialogue-art.md)
- 2026-10-11 · Codex · [Animated entrance queue — Claude handoff](AI_HANDOFF_ENTRIES/2026-10-11-codex-marigold-queue-animation.md)
- 2026-10-11 · Codex · [Layered Marigold opening — Claude integration handoff](AI_HANDOFF_ENTRIES/2026-10-11-codex-layered-marigold-opening.md)
- 2026-10-11 · Claude · [2026-10-11 — Claude: review of the layered Marigold opening (Codex, 8c40b40)](AI_HANDOFF_ENTRIES/2026-10-11-claude-marigold-opening-review.md)
- 2026-10-11 · Claude · [2026-10-11 — Claude: forearm donor audition on Procreate Lou](AI_HANDOFF_ENTRIES/2026-10-11-claude-forearm-donor-audition.md)
- 2026-10-09 · Codex · [2026-10-09 — Codex: recurring knee-gap investigation](AI_HANDOFF_ENTRIES/2026-10-09-codex-recurring-knee-gap-investigation.md)
- 2026-10-08 · Codex · [2026-10-08 — Codex: find and fix the gap below Procreate Lou's knee when he walks](AI_HANDOFF_ENTRIES/2026-10-08-codex-procreate-lou-knee-gap-prompt.md)
- 2026-10-08 · Codex · [2026-10-08 — Lou articulation: current direction and first donors](AI_HANDOFF_ENTRIES/2026-10-08-codex-lou-articulation-next-pieces.md)
- 2026-10-07 · Claude · [2026-10-07 — Derek's Procreate master, bound as `thesz-procreate-v1`](AI_HANDOFF_ENTRIES/2026-10-07-claude-lou-procreate-master-integration.md)
- 2026-10-07 · Claude · [Claude execution prompt — integrate and test Derek's Lou Procreate master](AI_HANDOFF_ENTRIES/2026-10-07-claude-integrate-lou-procreate-master.md)
- 2026-10-07 · Claude · [2026-10-07 — AUDIT AND REPAIR: the `thesz-procreate-v1` binding](AI_HANDOFF_ENTRIES/2026-10-07-claude-AUDIT-AND-REPAIR-procreate-candidate.md)
- 2026-10-06 · Claude · [2026-10-06 — Claude: independent audit of the character-art recovery plan](AI_HANDOFF_ENTRIES/2026-10-06-claude-recovery-plan-independent-audit.md)
- 2026-10-06 · Claude · [2026-10-06 — The misattribution is in three commit messages, which no document can retra](AI_HANDOFF_ENTRIES/2026-10-06-claude-misattribution-in-commit-messages.md)
- 2026-09-27 · Codex · [RETIRED prompt for a fresh Codex session — do not generate](AI_HANDOFF_ENTRIES/2026-09-27-codex-lou-generation-run-prompt.md)
- 2026-09-27 · Claude · [Prompt for Claude — independent audit of the character-art recovery plan](AI_HANDOFF_ENTRIES/2026-09-27-claude-character-art-recovery-audit-prompt.md)
- 2026-09-26 · next · [2026-09-26 — RETIRED brief: the generation prompt](AI_HANDOFF_ENTRIES/2026-09-26-next-session-brief-generation-prompt.md)
- 2026-09-15 · Derek · [2026-09-15 — Misattributed front3q verdict and next-generation brief](AI_HANDOFF_ENTRIES/2026-09-15-derek-front3q-verdict-and-next-generation-brief.md)
- 2026-09-15 · Claude · [2026-09-15 — Claude: the front3q replacement limbs, and what was actually wrong with the](AI_HANDOFF_ENTRIES/2026-09-15-claude-front3q-replacement-limb-candidate.md)
- 2026-09-13 · next · [2026-09-13 — Brief for the next session: Lou's replacement limbs](AI_HANDOFF_ENTRIES/2026-09-13-next-session-brief-replacement-limbs.md)
- 2026-09-13 · Claude · [2026-09-13 — Claude: joint articulation harness, and two defects in the gate it replaces](AI_HANDOFF_ENTRIES/2026-09-13-claude-joint-articulation-harness.md)
- 2026-09-13 · Claude · [2026-09-13 — Claude — Independent assessment: what image generation should and should](AI_HANDOFF_ENTRIES/2026-09-13-claude-image-generation-assessment.md)
- 2026-08-26 · Claude · [2026-08-26 — Claude: profile-v2 normalized into the canonical canvases](AI_HANDOFF_ENTRIES/2026-08-26-claude-thesz-v2-profile-normalization.md)
- 2026-08-25 · Codex · [2026-08-25 — Codex — Thesz v2 Pass B profile trial](AI_HANDOFF_ENTRIES/2026-08-25-codex-thesz-v2-pass-b-profile-trial.md)
- 2026-08-24 · Codex · [2026-08-24 — Codex — Thesz v2 landmark contract correction](AI_HANDOFF_ENTRIES/2026-08-24-codex-thesz-v2-landmark-contract-correction.md)
- 2026-08-24 · Claude · [Thesz v2 Pass A — landmark audit: the manifest's skeleton does not describe the drawn fi](AI_HANDOFF_ENTRIES/2026-08-24-claude-thesz-v2-pass-a-landmark-audit.md)
- 2026-08-24 · Claude · [Thesz v2 landmark fit (v4) — second audit: the fit is right, three contradictions surviv](AI_HANDOFF_ENTRIES/2026-08-24-claude-thesz-v2-landmark-fit-review.md)
- 2026-08-23 · Claude · [Thesz v2 — Pass A launch packet (record)](AI_HANDOFF_ENTRIES/2026-08-23-claude-thesz-v2-pass-a-launch-packet.md)
- 2026-07-26 · Claude · [Claude — George AI pilot v7: thigh recut candidate, v6 found to have no meaningful visua](AI_HANDOFF_ENTRIES/2026-07-26-claude-george-ai-pilot-v7-thigh-recut.md)
- 2026-07-26 · Claude · [Claude — George AI pilot v6: thigh/forearm/shin correction candidate, supersedes the pre](AI_HANDOFF_ENTRIES/2026-07-26-claude-george-ai-pilot-v6-correction-candidate.md)
- 2026-07-25 · Codex · [Codex review — George AI art-swap pilot](AI_HANDOFF_ENTRIES/2026-07-25-codex-george-ai-pilot-review.md)
- 2026-07-25 · Codex · [Codex closeout — George AI pilot painted-sole grounding](AI_HANDOFF_ENTRIES/2026-07-25-codex-george-ai-pilot-grounding-closeout.md)
- 2026-07-25 · Codex · [Codex focused art/cutter pass — George AI pilot](AI_HANDOFF_ENTRIES/2026-07-25-codex-george-ai-pilot-art-cutter-pass.md)
- 2026-07-25 · Claude · [Claude — George AI pilot v4: modular torso/arm/thigh repair candidate](AI_HANDOFF_ENTRIES/2026-07-25-claude-george-ai-pilot-v4-modular-candidate.md)
- 2026-07-24 · Codex · [Four Input-Invoked Move Animation Blueprint](AI_HANDOFF_ENTRIES/2026-07-24-codex-four-move-blueprint.md)
- 2026-07-14 · Codex · [2026-07-14 — Codex (Architecture review: evaluate Unity before further engine investm](AI_HANDOFF_ENTRIES/2026-07-14-codex-unity-evaluation.md)
