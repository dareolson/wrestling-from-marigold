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

## Status (2026-11-06 late, replace this block; ≤ 40 lines)

- **Direction (Derek 2026-11-06):** moves are passable for now. Stop polishing them and move the project forward; move misses go on polish lists and get revisited later.
- **Falls ([PLAN_FALLS.md](PLAN_FALLS.md)):** done through T3.16 (`c53ea13`), G3 r3 accepted as passable ([page](research/animation/falls-2026-11/g3/r3.html)). `falls` PROMOTED (73cb6d1, G4 awaiting Derek; `?falls=off` disables): wear meter (0.8/damage, 0.4/s recovery, knockdown 60, exceptional 92), `?wear=show` bar. Stage 4 done: soak clean (0 errors, 0 stuck), knee drop and dives use `groundHitSell`. Polish: get-up to standing steps 20-46 px (27 median without falls too), a man already getting up when the elbow lands gets no sell, 0-4 knockdowns a run, the two exceptional landings at wear 100 came early (42/52 s), the AI rarely throws big moves, sell limbs past the rope, George's snapmare elbow.
- **Grapples ([PLAN_GRAPPLES.md](PLAN_GRAPPLES.md)):** `grapples` promoted (aa0532f, G5). Waistlock (`?waistlock=v1`, opt-in) stopped at G4b; atomic drop T4c.4r, T4d.3 and sleeper wrap art parked as passable/polish. Irish whip, corners and charge approved (G3f).
- **Other moves, parked:** gait Stage 3 behind `?gait=v2` (G3 unjudged); get-ups promoted (Stage 5 parked); George transfer parked at G10a; figure-four and support-hand plant parked.
- **Promoted flags:** `risefix`, `sellart`, `aftermath` (v2), `getups`, `grapples`, `falls` (default on, `=off` disables). Opt-in: `waistlock=v1`, `gait=v2`, `plant=1`.
- **Story and art direction (docs only, no runtime yet):**
  - Opening: Chicago 1952, kitchen phone/union call, landlord's $100 demand, girlfriend sends Guido out ([brief](STORY_CARNIVAL_OPENING.md)). Carnival $100 challenge is the first playable match; Carl then recruits him. Kohler naming bridge unresolved.
  - Whole game monochrome; art generated in color, monochrome derived ([standard](CINEMATIC_ART_STANDARD.md)).
  - Venues/crowds/exhibition: [plan](PLAN_VENUES_CROWDS_AND_EXHIBITION.md). Carl as Guy's ringside trainer: [sheet](research/art/carl-ringside-2026-10-31/carl-ringside-sheet-v1.png). Feud/art: [STORY_ART_AND_FEUD_DIRECTION.md](STORY_ART_AND_FEUD_DIRECTION.md).
- **Awaiting Derek:** G4 (play a match with no flag, falls on) and G4b (splash bounce); Marigold title queue (83ab5cd) visual OK.
- **Uncommitted on purpose:** Codex's sleeper-wrap PNGs (`src/assets/wrestlers/*/forearm_sleeper_wrap.png`) and 4 Codex `tools/debug` scripts (sleeper wrap, throw support, waistlock probes) are unreviewed and stay untracked. Large frame dumps are gitignored.
- **Repo:** branch `story/marigold-opening`, Node 22 (`nvm use`; shell default is 25). Pushed through `fb8c5ca` (2026-11-06); later commits local. Session handoff: [entry](AI_HANDOFF_ENTRIES/2026-11-06-claude-opus-handoff-ground-contact.md). Push via the SSH URL only. Coverage baseline 26 gaps.
- **Next (Sonnet 2026-11-06):** falls promoted (73cb6d1). T4.8 splash **at G4b** (2f79495, local): pivot, tumble (face down) and roll (on his back), all halved at Derek's r3 ([tumble vs roll](research/animation/falls-2026-11/g4b-r2/index.html)); Derek picks which move gets which and whether the half trip (it overlaps the receiver) stays. Then [PLAN_GRAPPLES.md](PLAN_GRAPPLES.md) **Stage 3d** (whip with weight, tucked elbows at the rope), **STOP at G3d**; then [PLAN_FINISHERS.md](PLAN_FINISHERS.md) Stage 1.
- **Older history:** [AI_HANDOFF_ARCHIVE.md](AI_HANDOFF_ARCHIVE.md) and `AI_HANDOFF_ENTRIES/`.

## Entry index

- 2026-11-06 · Claude Opus · [Handoff: falls ground contact at T4.7c; finishers and personality queued](AI_HANDOFF_ENTRIES/2026-11-06-claude-opus-handoff-ground-contact.md)

- 2026-11-06 · Codex · [For Opus: continuous descent verified; compression, support marker and overlap limits](AI_HANDOFF_ENTRIES/2026-11-06-codex-ground-gravity-review-for-opus.md)

- 2026-11-06 · Derek, recorded by Codex · [Ground attack looks good; make impact one gravity-driven descent](AI_HANDOFF_ENTRIES/2026-11-06-derek-ground-impact-gravity.md)

- 2026-11-06 · Codex · [Ground-contact stills review for Opus: depth vs overlap, explicit striking limb, support and animation](AI_HANDOFF_ENTRIES/2026-11-06-codex-ground-contact-stills-review.md)

- 2026-11-06 · Codex · [Ground attacks: staged limb contact, separate body silhouettes, roll-off; preserve existing art](AI_HANDOFF_ENTRIES/2026-11-06-codex-ground-attack-contact.md)

- 2026-11-05 · Codex · [G3 review for Opus: tired-throw tier wiring, hit context and natural match evidence](AI_HANDOFF_ENTRIES/2026-11-05-codex-g3-review-for-opus.md)

- 2026-11-05 · Codex · [Snapmare preview correction: rear reversal retained; front entry needs different setup](AI_HANDOFF_ENTRIES/2026-11-05-codex-snapmare-preview-correction.md)

- 2026-11-05 · Codex · [For Opus: G2 review — contact transitions, supported phases, tiers and match timing](AI_HANDOFF_ENTRIES/2026-11-05-codex-g2-review-for-opus.md)

- 2026-11-05 · Codex · [Derek likes r2: fall variety and bigger impact exploration for Opus](AI_HANDOFF_ENTRIES/2026-11-05-codex-fall-variety-and-heavy-impacts.md)

- 2026-11-05 · Codex · [For Opus: G2a review — contact/foley, attenuated landing blend, audit limits](AI_HANDOFF_ENTRIES/2026-11-05-codex-g2a-review-for-opus.md)

- 2026-11-06 · Claude Opus · [Falls G2a to G3 r2; wear meter next](AI_HANDOFF_ENTRIES/2026-11-06-claude-opus-falls-wear-wrapup.md)
- 2026-11-05 · Codex · [Falls G1 assessment and Derek's next direction: rebound with natural limbs, no hyperextension](AI_HANDOFF_ENTRIES/2026-11-05-codex-falls-bounce-review.md)

- 2026-11-04 · Derek, recorded by Codex · [For Opus: carrier's outside forearm stays in front of the receiver's trunks](AI_HANDOFF_ENTRIES/2026-11-04-derek-atomic-outside-forearm.md)

- 2026-11-04 · Derek, recorded by Codex · [Atomic drop: natural receiver arms, then tailbone pain and move away before turning](AI_HANDOFF_ENTRIES/2026-11-04-derek-atomic-arms-and-sell.md)

- 2026-11-04 · Codex · [Sonnet chamber review before Opus: support misses and incomplete r6 package](AI_HANDOFF_ENTRIES/2026-11-04-codex-sonnet-chamber-review.md)

- 2026-11-04 · Codex · [Next move for Opus: close r6, support measurement, coverage gate, then sleeper reversal](AI_HANDOFF_ENTRIES/2026-11-04-codex-next-move-review.md)

- 2026-11-02 · Codex · [Waistlock review for Opus: confirmed cleanup bug and animation repair sequence](AI_HANDOFF_ENTRIES/2026-11-02-codex-waistlock-review-for-opus.md)

- 2026-10-31 · Codex · [Stage 5 in-progress review: soak failure and actual clutch coverage](AI_HANDOFF_ENTRIES/2026-10-31-codex-stage5-in-progress-review.md)

- 2026-10-31 · Claude · [Opus handoff: grapples Stage 5 in progress](AI_HANDOFF_ENTRIES/2026-10-31-claude-opus-handoff-stage5.md)
- 2026-10-31 · Codex · [Review of latest Sonnet / Opus G3f work](AI_HANDOFF_ENTRIES/2026-10-31-codex-g3f-review.md)

- 2026-10-31 · Codex · [Detailed skyline and kitchen opening scene](AI_HANDOFF_ENTRIES/2026-10-31-codex-kitchen-opening-scene.md)

- 2026-10-31 · Codex · [Entire game monochrome — Derek’s final visual direction](AI_HANDOFF_ENTRIES/2026-10-31-codex-monochrome-decision.md)

- 2026-10-31 · Codex · [Audience generator, reusable venues and exhibition encounters](AI_HANDOFF_ENTRIES/2026-10-31-codex-venue-crowd-exhibition-direction.md)

- 2026-10-31 · Codex · [Carnival first match, steelworker origin and profile opponent concept](AI_HANDOFF_ENTRIES/2026-10-31-codex-carnival-origin.md)

- 2026-10-31 · Codex · [For Opus: rebound geometry and corner implementation review](AI_HANDOFF_ENTRIES/2026-10-31-codex-corner-rebound-review-for-opus.md)

- 2026-10-31 · Codex · [For Opus: approved Carl ringside sheet for Guy, deferred integration](AI_HANDOFF_ENTRIES/2026-10-31-codex-carl-ringside-for-opus.md)

- 2026-10-31 · Codex · [Irish whip direction and cross-body candidate](AI_HANDOFF_ENTRIES/2026-10-31-codex-irish-whip-direction.md)

- 2026-10-31 · Claude · [Grapples Stage 3b: exit checks, stopped at G3b](AI_HANDOFF_ENTRIES/2026-10-31-claude-grapples-g3b.md)
- 2026-10-31 · Claude · [Grapples G1c: legs through every phase and exit](AI_HANDOFF_ENTRIES/2026-10-31-claude-grapples-g1c.md)
- 2026-10-30 · Codex · [Opus/Sonnet efficiency review: smaller leg proof, precise metrics, reusable capture](AI_HANDOFF_ENTRIES/2026-10-30-codex-sonnet-efficiency-review.md)
- 2026-10-30 · Claude · [Grapples unattended run: Stages 1b, 3, 4a](AI_HANDOFF_ENTRIES/2026-10-30-claude-grapples-run.md)
- 2026-10-30 · Claude · [Grapples Stage 1b: upper body only](AI_HANDOFF_ENTRIES/2026-10-30-claude-grapples-g1b.md)
- 2026-10-30 · Codex · [Opus review: grapple defects, evidence limits, next block and story continuity](AI_HANDOFF_ENTRIES/2026-10-30-codex-review-for-opus.md)
- 2026-10-30 · Claude · [Grapples Stage 1 (T1.0-T1.4), stopped at G1](AI_HANDOFF_ENTRIES/2026-10-30-claude-grapples-g1.md)
- 2026-10-29 · Claude · [Handoff: get-ups closed, grapples next](AI_HANDOFF_ENTRIES/2026-10-29-claude-grapples-handoff.md)
- 2026-10-29 · Claude · [Get-ups T4.4: getups promoted to default](AI_HANDOFF_ENTRIES/2026-10-29-claude-getups-t44.md)
- 2026-10-29 · Claude · [Get-ups T4.3: knees past straight on the mat, clamped](AI_HANDOFF_ENTRIES/2026-10-29-claude-getups-t43.md)
- 2026-10-29 · Claude · [Get-ups T4.2: the snap into standing is the separation, now eased](AI_HANDOFF_ENTRIES/2026-10-29-claude-getups-t42.md)
- 2026-10-29 · Codex · [New Opus review: G3 findings, next diagnostic and efficiency](AI_HANDOFF_ENTRIES/2026-10-29-codex-review-for-new-opus.md)
- 2026-10-29 · Claude · [Get-ups T4.0 / T4.1: selection on, G3 reel](AI_HANDOFF_ENTRIES/2026-10-29-claude-getups-t41.md)
- 2026-10-28 · Codex · [G2b fatigue-stall opinion: release continuity and selection boundaries](AI_HANDOFF_ENTRIES/2026-10-28-codex-fatigue-stall-review.md)
- 2026-10-28 · Claude · [Get-ups T3b: the fatigue stall, G2b package](AI_HANDOFF_ENTRIES/2026-10-28-claude-getups-t3b.md)
- 2026-10-28 · Codex · [G2 measuring-pass advice: contact coverage, prone context and fatigue-stall boundaries](AI_HANDOFF_ENTRIES/2026-10-28-codex-g2-measuring-advice.md)
- 2026-10-28 · Codex · [Planning advice after T2.9 / G2a: rollout boundary, contact continuity and Stage 3 support](AI_HANDOFF_ENTRIES/2026-10-28-codex-stage3-planning-advice.md)
- 2026-10-28 · Claude · [Get-ups T2.8: evidence pass on George's hand route](AI_HANDOFF_ENTRIES/2026-10-28-claude-getups-t28.md)
- 2026-10-28 · Codex · [G1-rev2 advice for Opus: route, mask and measurement limits](AI_HANDOFF_ENTRIES/2026-10-28-codex-current-getups-advice.md)
- 2026-10-28 · Claude · [Get-ups G1-rev2: George's hand route above the hem (T2.6), thigh backstop (T2.7)](AI_HANDOFF_ENTRIES/2026-10-28-claude-getups-g1-rev2.md)
- 2026-10-28 · Claude · [Get-ups G1-rev: Lou's forearm (T2.4), George's elbow-out (T2.5)](AI_HANDOFF_ENTRIES/2026-10-28-claude-getups-g1-rev.md)
- 2026-10-27 · Claude · [Get-ups G1: backKneeHurt and its back-sell variant (`?getups=v1`)](AI_HANDOFF_ENTRIES/2026-10-27-claude-getups-g1.md)
- 2026-10-27 · Codex · [Current get-up issues: opinion and contracts for Opus](AI_HANDOFF_ENTRIES/2026-10-27-codex-getups-review.md)
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
