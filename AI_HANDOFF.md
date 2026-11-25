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

## Status (2026-11-24, Claude; replace this block; ≤ 40 lines)

- **Consolidated (Claude, 2026-11-24, local, not pushed):** all Codex/Sonnet work through Nov 24 is committed on `story/marigold-opening`; side worktrees (`wfm-george-hair`, `wfm-stage12`) merged and removed. [Entry](AI_HANDOFF_ENTRIES/2026-11-24-claude-consolidation.md).
- **Movement PROMOTED (Derek: "get the movement changes in place"):** walk, run, locomotion arms, ready stance and George's relaxed v3 ready hands are default (`?walk=off` `?run=off` `?arms=off` `?stance=off` `?readyArt=off`). Ready hand art is George-only. Codex packet: [entry](AI_HANDOFF_ENTRIES/2026-11-24-codex-claude-integration.md).
- **Lou's body is Lou2.psd (Derek, Nov 24):** `thesz-procreate-v1` keeps its id, head, faces, moves, back sell; torso/arms/thighs/shins (separate far leg) come from Lou2, calves over thighs, far leg over trunks (PSD layer order). Old body shelved: `?p1=thesz-procreate-shelf`. Film: `research/art-revisions/2026-11-24-lou/compare/`. Awaiting Derek's look.
  - Misses: grip/clasp/chop forearms keep the old elbow cap (donors slimmer than the new forearm, no clean splice) → art pass; far-shin ankle twist fit IoU .83 (different boot drawing); back sell (holdW/recovery) and `crownBelowHip` are pre-swap numbers → re-measure; Lou stands 0.5% shorter in ink (ladder re-pinned).
- **Art revision system:** [ART_REVISION.md](ART_REVISION.md). All four production rigs = generated base (`src/characters/generated/*.base.js`, never edit) + authored layer. `node tools/art/revise_rig.mjs <rig>` re-cuts from the PSD and re-fits every variant. Derek plans new knees (maybe elbows) on every wrestler: use this.
- **Accepted, preserve:** Lou `wristlockHammerlock`, Guido `wristlock`, stretch, deathlock, headlock takeover, flying mare, test of strength (Nov 16-21); leapfrog + shared idle, backward-roll getup, standing escape, sit-up/rock, kip-up + compact George/Guido idle (Nov 21); Stage E taunts (merged). Body scissors RETIRED (template kept for head scissors). Head scissors DRAFT; recovery/escape gameplay bindings unassigned.
- **NEXT:** Derek looks at Lou (film + live `?p1=thesz-procreate-v1`), then head scissors review, then backdrop suplex. Ropes: RS/TS.6 rope spill under `?ropeSpill=v1` awaiting Derek ([PLAN_ROPES.md](PLAN_ROPES.md)); rope height still his call.
- **Open control issues:** with `waistlock=v1`, Lou's go-behind shadows Up/Down + Power; AI plays only stretch and deathlock of the mat set.
- **Preview:** `npm run dev`; moves `/tools/mat-preview/?move=<key>&att=<rig>&def=<rig>` (defaults to wristlockHammerlock); gait `/tools/gait-preview/?rig=<rig>`; run `/tools/run-preview/?rig=<rig>`.
- **Before any push:** Opus reviews; push to the SSH URL. 49cb207a's dangling Lou2 import is resolved (bc103d4a, then superseded).
- **On disk only:** review frames/footage under `research/animation/`, `research/ropes-2026-11/` (ignored), `Roster Base Masters/`.
- **Parked:** finishers, gait Stage 4, get-ups Stage 5, George transfer G10a, figure-four, support-hand plant, `thesz-v2-profile-normalization` branch (tag+delete awaits Derek, PLAN_CLEANUP T3). Promoted flags: `risefix`, `sellart`, `aftermath`, `getups`, `grapples`, `falls`, `scale`, `light`, `gait`, `ropes`, `walk`, `run`, `arms`, `stance`, `readyArt` (`?<flag>=off` = old). Opt-in: `waistlock=v1`, `plant=1`, `ropeSpill=v1`.
- **Older history:** [AI_HANDOFF_ARCHIVE.md](AI_HANDOFF_ARCHIVE.md) and `AI_HANDOFF_ENTRIES/`.

## Entry index

- 2026-11-24 · Claude · [Consolidation: integration commits, movement promoted, Lou2 body, art revision system](AI_HANDOFF_ENTRIES/2026-11-24-claude-consolidation.md)

- 2026-11-24 · Codex · [Consolidated Claude integration handoff](AI_HANDOFF_ENTRIES/2026-11-24-codex-claude-integration.md)

- 2026-11-24 · Codex · [Arm art seam matching](AI_HANDOFF_ENTRIES/2026-11-24-codex-arm-seam-match.md)

- 2026-11-24 · Codex · [Neutral thumb rotation on both hands](AI_HANDOFF_ENTRIES/2026-11-24-codex-neutral-ready-hands.md)

- 2026-11-24 · Codex · [Far elbow, wrist motion and hand proportion](AI_HANDOFF_ENTRIES/2026-11-24-codex-ready-wrist.md)

- 2026-11-24 · Codex · [Inside forearm and lower ready guard](AI_HANDOFF_ENTRIES/2026-11-24-codex-inside-ready-arm.md)

- 2026-11-24 · Codex · [Ready-to-grab forearm art](AI_HANDOFF_ENTRIES/2026-11-24-codex-ready-grab-art.md)

- 2026-11-24 · Codex · [Searching guard motion](AI_HANDOFF_ENTRIES/2026-11-24-codex-guard-probing.md)

- 2026-11-24 · Codex · [Full-body ready stance](AI_HANDOFF_ENTRIES/2026-11-24-codex-ready-stance.md)

- 2026-11-24 · Codex · [Wrestling stance trial](AI_HANDOFF_ENTRIES/2026-11-24-codex-wrestling-stance.md)

- 2026-11-23 · Codex · [Locomotion arm refinement](AI_HANDOFF_ENTRIES/2026-11-23-codex-locomotion-arms.md)

- 2026-11-23 · Codex · [Existing-art running trial](AI_HANDOFF_ENTRIES/2026-11-23-codex-running-trial.md)

- 2026-11-23 · Codex · [George walking support correction](AI_HANDOFF_ENTRIES/2026-11-23-codex-george-walking.md)

- 2026-11-23 · Codex · [Existing-art walking trial](AI_HANDOFF_ENTRIES/2026-11-23-codex-walking-trial.md)

- 2026-11-21 · Claude · [Ropes plan handoff: rope height, physical ropes, rope grab](AI_HANDOFF_ENTRIES/2026-11-21-claude-ropes-plan-handoff.md)

- 2026-11-21 · Codex · [Test of strength: actual-preview ending and stronger shove](AI_HANDOFF_ENTRIES/2026-11-21-codex-strength-ending-preview.md)

- 2026-11-21 · Codex · [Test of strength: arm depth, shove and stagger](AI_HANDOFF_ENTRIES/2026-11-21-codex-strength-arm-depth-shove.md)

- 2026-11-21 · Codex · [Test of strength: face clear, contact and body language](AI_HANDOFF_ENTRIES/2026-11-21-codex-strength-face-contact-sell.md)

- 2026-11-21 · Codex · [Test of strength: slower contest and palm grip](AI_HANDOFF_ENTRIES/2026-11-21-codex-strength-slower-palm-grip.md)

- 2026-11-21 · Codex · [Flying mare: larger, consistently visible receiver free arm](AI_HANDOFF_ENTRIES/2026-11-21-codex-flying-mare-george-free-arm.md)

- 2026-11-20 · Codex · [Flying mare: back arm behind both bodies, same position](AI_HANDOFF_ENTRIES/2026-11-20-codex-flying-mare-back-arm-depth.md)

- 2026-11-20 · Codex · [Flying mare: restore arm route and switch to base arms during rise](AI_HANDOFF_ENTRIES/2026-11-20-codex-flying-mare-restore-arm-route.md)

- 2026-11-20 · Codex · [Flying mare: larger visible arm, doubled hold, two retreat steps](AI_HANDOFF_ENTRIES/2026-11-20-codex-flying-mare-arm-hold-retreat.md)

- 2026-11-19 · Codex · [Flying mare: arm silhouette, knee brace and sustained pain](AI_HANDOFF_ENTRIES/2026-11-19-codex-flying-mare-knee-pain.md)

- 2026-11-19 · Codex · [Flying mare: visible back-hand shoulder clamp](AI_HANDOFF_ENTRIES/2026-11-19-codex-flying-mare-shoulder-clamp.md)

- 2026-11-19 · Codex · [Flying mare: snappier throw into seated armlock](AI_HANDOFF_ENTRIES/2026-11-19-codex-flying-mare-seated-armlock.md)

- 2026-11-19 · Codex · [Headlock takeover: loaded break, recoil and catch step](AI_HANDOFF_ENTRIES/2026-11-19-codex-headlock-hard-break.md)

- 2026-11-19 · Codex · [Headlock takeover: combined head grab and turn-out escape](AI_HANDOFF_ENTRIES/2026-11-19-codex-headlock-entry-and-turnout.md)

- 2026-11-19 · Codex · [Headlock takeover: mutual shove and supported rise](AI_HANDOFF_ENTRIES/2026-11-19-codex-headlock-mutual-pushoff.md)

- 2026-11-19 · Codex · [Headlock takeover: extended bottom hold and opened legs](AI_HANDOFF_ENTRIES/2026-11-19-codex-headlock-bottom-hold.md)

- 2026-11-19 · Codex · [Headlock takeover: receiver resistance and impact sell](AI_HANDOFF_ENTRIES/2026-11-19-codex-headlock-receiver-sell.md)

- 2026-11-18 · Codex · [Headlock takeover: FK bend and mat separation measurements (awaiting Derek)](AI_HANDOFF_ENTRIES/2026-11-18-codex-headlock-fk-refinement.md)

- 2026-11-16 · Codex · [Headlock takeover: new wrap art and retained head control (awaiting Derek)](AI_HANDOFF_ENTRIES/2026-11-16-codex-headlock-wrap-takeover.md)

- 2026-11-16 · Codex · [Wristlock: existing grip swap, back arm behind torso (awaiting Derek)](AI_HANDOFF_ENTRIES/2026-11-16-codex-wristlock-grip-swap.md)

- 2026-11-16 · Codex · [Wristlock: cradle arm depth and sustained pain face (awaiting Derek)](AI_HANDOFF_ENTRIES/2026-11-16-codex-wristlock-cradle-depth-pain.md)

- 2026-11-16 · Codex · [Wristlock: backward steps and wrist cradle (awaiting Derek)](AI_HANDOFF_ENTRIES/2026-11-16-codex-wristlock-retreat-cradle.md)

- 2026-11-16 · Codex · [Wristlock: Guido final wrench and receiver pain (awaiting Derek)](AI_HANDOFF_ENTRIES/2026-11-16-codex-wristlock-final-wrench.md)

- 2026-11-16 · Codex · [Wristlock: receiver resistance and braced legs (awaiting Derek)](AI_HANDOFF_ENTRIES/2026-11-16-codex-wristlock-resistance.md)

- 2026-11-15 · Claude · [Hammerlock: elbow down, arm cranked up the back](AI_HANDOFF_ENTRIES/2026-11-15-claude-hammerlock-elbow-down.md)
- 2026-11-15 · Codex · [Wristlock-to-hammerlock: Lou passes in front (awaiting Derek)](AI_HANDOFF_ENTRIES/2026-11-15-codex-wristlock-front-pass.md)
- 2026-11-15 · Codex · [Lou's wristlock into hammerlock variant](AI_HANDOFF_ENTRIES/2026-11-15-codex-wristlock-hammerlock-variant.md)
- 2026-11-15 · Codex · [Stretch: bent asymmetric arms; Derek APPROVED the stretch (knee/hook passes: `2026-11-15-codex-stretch-*.md`)](AI_HANDOFF_ENTRIES/2026-11-15-codex-stretch-elbow-flex.md)
- 2026-11-15 · Codex · [Abdominal stretch: arm struggle and shove](AI_HANDOFF_ENTRIES/2026-11-15-codex-abdominal-stretch-shove.md)
- 2026-11-15 · Codex · [Wristlock: visible capture and sell](AI_HANDOFF_ENTRIES/2026-11-15-codex-wristlock-revision.md)
- 2026-11-15 · Codex · [Deathlock: victim sits up and misses punches (approved)](AI_HANDOFF_ENTRIES/2026-11-15-codex-deathlock-victim-struggle.md)
- 2026-11-15 · Codex · [Seated deathlock rebuild, headlock takeover, backward roll](AI_HANDOFF_ENTRIES/2026-11-15-codex-deathlock-rebuild.md)
- 2026-11-15 · Codex · [Stage 12 online reference pass](AI_HANDOFF_ENTRIES/2026-11-15-codex-stage12-online-reference-pass.md)
- 2026-11-15 · Codex · [Stage 12 physical pose pass](AI_HANDOFF_ENTRIES/2026-11-15-codex-stage12-fixes.md)
- 2026-11-15 · Codex · [Stage 12 visual and leverage review](AI_HANDOFF_ENTRIES/2026-11-15-codex-stage12-review.md)

- 2026-11-15 · Codex · [Ten-move legwork audit: support feet, mounted punches, receiver legs and recovery](AI_HANDOFF_ENTRIES/2026-11-15-codex-ten-move-legwork-audit.md)

- 2026-11-15 · Codex · [George performance plan and new hair-check/dismissal arm-art direction](AI_HANDOFF_ENTRIES/2026-11-15-codex-george-performance-and-arm-art.md)

- 2026-11-14 · Codex · [Impact, mat rebound and aftermath sell on the reviewed moves](AI_HANDOFF_ENTRIES/2026-11-14-codex-impact-and-sell.md)

- 2026-11-14 · Codex · [Runner move polish: higher throws and paired arm drag](AI_HANDOFF_ENTRIES/2026-11-14-codex-runner-polish.md)

- 2026-11-12 · Codex · [Latest toe-hold direction for Opus: drop onto both knees, trap the leg between them, then wrench](AI_HANDOFF_ENTRIES/2026-11-12-codex-toehold-leg-capture-direction.md)

- 2026-11-12 · Codex · [T3.0 r4 review for Opus: kneeling, fist contact, portable motion evidence](AI_HANDOFF_ENTRIES/2026-11-12-codex-toehold-r4-review-for-opus.md)

- 2026-11-10 · Claude Opus · [Handoff for the next Opus: project manager on PLAN_LIGHT_MOVES](AI_HANDOFF_ENTRIES/2026-11-10-claude-opus-handoff-pm.md)

- 2026-11-10 · Claude Opus · [Handoff for the next Sonnet: what to do after G1](AI_HANDOFF_ENTRIES/2026-11-10-claude-opus-handoff-for-sonnet.md)

- 2026-11-07 · Claude Opus · [Handoff: light moves plan, ankle lock staging and sell approved](AI_HANDOFF_ENTRIES/2026-11-07-claude-opus-handoff-ankle-lock-approved.md)

- 2026-11-07 · Codex · [Ankle-lock pickup before lift and near-leg depth (Opus-reviewed, committed)](AI_HANDOFF_ENTRIES/2026-11-07-codex-ankle-pickup-and-near-leg.md)

- 2026-11-07 · Codex · [Ankle-lock painted contact (Opus-reviewed, committed)](AI_HANDOFF_ENTRIES/2026-11-07-codex-ankle-painted-contact.md)

- 2026-11-07 · Claude Opus · [Handoff: clasping hands approved at G2](AI_HANDOFF_ENTRIES/2026-11-07-claude-opus-handoff-clasps-approved.md)

- 2026-11-07 · Codex · [Clasp r4 review for Opus: fallback reach regression, remaining palm gaps and activation step](AI_HANDOFF_ENTRIES/2026-11-07-codex-clasp-runtime-review-for-opus.md)

- 2026-11-07 · Claude Opus · [Handoff: backup done, splash roll approved at G4b r6](AI_HANDOFF_ENTRIES/2026-11-07-claude-opus-handoff-roll-approved.md)

- 2026-11-07 · Derek, recorded by Codex · [Keep roll’s action; use pivot’s understated leg motion](AI_HANDOFF_ENTRIES/2026-11-07-derek-roll-action-pivot-legs.md)

- 2026-11-07 · Sonnet · [Code structure and roster bloat, for Opus](AI_HANDOFF_ENTRIES/2026-11-07-sonnet-structure-and-bloat-for-opus.md)

- 2026-11-07 · Codex · [Efficiency review for Opus: Sonnet’s assumptions, roster ownership, story saves and corrected asset budget](AI_HANDOFF_ENTRIES/2026-11-07-codex-structure-efficiency-review-for-opus.md)

- 2026-11-06 · Codex · [Confirmed splash roll backward-leg fault: mirrored sampled flex violates renderer contract](AI_HANDOFF_ENTRIES/2026-11-06-codex-splash-backward-legs.md)

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
