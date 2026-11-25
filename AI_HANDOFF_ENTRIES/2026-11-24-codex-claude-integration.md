# Claude integration handoff — movement, ready arms and move work

Prepared by Codex for Derek, November 24, 2026. Derek's latest direction: “good enough, let's consolidate our work for claude to integrate it” and “also the move work we did too.” This document supersedes the scattered movement/hand iteration notes for final selection; detailed entries remain the provenance for moves.

## Start here

Integrate the accepted walk/run, locomotion arms, nearby-opponent ready stance and final George grip art, together with the accepted leapfrog and recovery work. Preserve head scissors as an explicit draft, body scissors as retired, and unassigned gameplay bindings as unassigned. Review the current working tree before editing: these changes are on disk, not a clean standalone commit. Do not replace entire core files from the snapshot or stage the whole working tree.

The portable companion is `integration/claude-2026-11-24/`: exact source snapshots, selected assets, focused tests, browser evidence and a SHA-256 manifest. Its snapshots preserve relative paths under `snapshot/` and are reference material, not an automatic patch. No commit, push or default promotion was done by this consolidation.

## Acceptance and scope

| Work | Status and integration instruction |
| --- | --- |
| Walking | Accepted: Derek “way better.” Preserve improved walk, especially George's hip/foot support and reduced crouch. |
| Running | Accepted: “looks a lot better.” Preserve run/rope-rebound lifecycle, speed and cadence. |
| Locomotion arms, ready stance, George hands | Accepted as good enough to integrate in latest instruction. Use the final seam-matched relaxed pair below, not intermediate chop, claw or cupped ready-hand prototypes. Ready stance persists while stepping/backing near an opponent. |
| Leapfrog + shared idle | Accepted: “This is good, let's move on.” Preserve knee hinge, timed hand press, runner duck, landing/footing and shared rest correction. |
| Backward-roll getup | Accepted: “that looks great as a getup.” Core/legs drive turnover, guide/rise hand support, normal walking finish, 2.85s / 232-unit retreat. |
| Standing backward-roll escape | Accepted: “it passes.” Separate animation, 2.05s / 205.8-unit retreat; no automatic reversal-success rule. |
| Sit-up / rocking recovery | Accepted: “it's good, it passes.” Relaxed arms, sit-up then backward rock into accepted getup. |
| Kip-up + George/Guido compact idle | Accepted: “great.” Earlier arm drop, authored landing, removed competing leg plants, per-rig landing pose. |
| Grounded head scissors | DRAFT. Held position was called mostly solid and application improved, but no final acceptance. Preserve latest entry/sell/backroll draft for review; do not promote to kit/AI/input. |
| Body scissors | REJECTED/RETIRED (“irredeemable”). Keep blocked in kits, input, AI and direct executor. Its internal construction template is still required by head scissors; do not delete the template or re-enable the move. |
| Earlier checkpoint moves | Preserve accepted wristlock/hammerlock, stretch, deathlock, headlock takeover, flying mare and test of strength. These are existing work, not a request to redesign them. |

## Final movement and hand selection

Current trials require default gait-v2 enabled. They remain opt-in in the source:

| Flag | Current meaning |
| --- | --- |
| `walk=v1` | Reviewed walking presentation / support profiles. |
| `run=v1` | Reviewed running presentation / support profile. |
| `arms=v1` | Locomotion arm swing and elbow follow-through. |
| `stance=v1` | Whole-body nearby-opponent readiness and probing guard. |
| `readyArt=v2` | FINAL George lower/tucked arm pose plus final relaxed hand pair. The v2 URL value is a stable trial selector, not the asset file version. |
| `guardMotion=off` | Static ready guard for comparison; motion defaults on inside stance trial. |
| `readyArt=cupped` | Previous cupped pair for comparison, same low arm angles. |
| `readyArt=v1` | Early single-hand prototype; not the final selection. |

Integration still needs normal-match/default wiring. Review and preserve opt-out behavior before promoting accepted visuals. The generated hand art is George-only: other rigs keep their own art. Do not put George's sprites onto Lou/Kowalski/Guido or invent missing grips for them.

Final files under `src/assets/wrestlers/george-roster-v1/`:

- `forearm_relaxed_grip_outside_v3.png`: CLOSE/NEAR hand shows its BACK; tucked thumb, softer fingers.
- `forearm_relaxed_grip_inside_v3.png`: FAR hand shows its PALM; tucked thumb, softer fingers.
- `GRIP_LIBRARY.md`: reusable variants and previous retained pairs.

Registered readiness aliases are `readyNeutralOutside` / `readyNeutralInside`; reusable move appearances are `relaxedGripOutside` / `relaxedGripInside`. Both select those final v3 files. Texture keys retain earlier v1 suffixes for compatibility; trust the manifest `file`, not the key's version text. `openGripOutside/Inside` retain the stronger articulated pair; `cuppedOutside/Inside` retain the cupped pair specifically requested for move use. These reusable move names are excluded from readiness cleanup ownership. Contact anchors for a new move must be authored separately; no move was automatically reassigned to the new grips.

The final far upper arm stays tucked at .22 rad and forearm at 1.35 rad. Search motion comes from the wrist, not elbow extension. Far hand enlargement is 25% of the HAND only. `readyWrist.js` caches 25 canvas frames with a continuous small triangle deformation through the painted wrist; proximal pixels, wrist pivot and skeleton attachment points stay fixed. It is enabled only for readiness variants and must release cleanly for moves, falls, injury art and distance exits. The generated art was matched using original forearm/upper-arm references; this is visual source matching, not a pixel-exact splice.

## Source map: merge deliberately

| Files | Relevant content |
| --- | --- |
| `src/animation/walkPresentation.js`, `runPresentation.js`, `locomotionArms.js` | Pure presentation functions and rig support profiles. |
| `src/animation/wrestlingStance.js`, `readyWrist.js` | Ready pose, guard targets, periodic probing and local wrist deformation. |
| `src/Wrestler.js` | `gaitV2Config`, phase seed, `_gaitParamsAt`, `_syncReadyAppearance`, draw resets/presentation overlays. Also mixed move executors below. Has unrelated rope/session work: merge relevant sections only. |
| `src/Skeleton.js` | Walk/load/swing, support/rest blending, final arm overlays and ready wrist textures; anatomical leg constraints/floor supports below. Also mixed prior rig work. |
| `src/characters/george_roster_v1.js` | Final grip variant manifest, plus earlier compact idle selection. |
| `src/characters/guido_roster_v1.js` | Earlier compact idle selection. |
| `src/animation/clips/matMoves.js` | Accepted leapfrog/backward roll, contact windows, supplied landing pose and retained retired body-scissors template. Mixed with accepted earlier clips: preserve them. |
| `src/animation/clips/recoveryVariants.js` | Separate standing escape, rocking recovery, kip-up; preserves accepted base roll suffix where applicable. |
| `src/animation/clips/headScissors.js` | Latest grounded head-scissors DRAFT, derived internally from retired body template. |
| `src/animation/leapfrog.js` | Timed hand press and runner duck helpers. |
| `src/animation/AnimationClip.js` | Optional contact/leg/gait channels; phase-aware `afterLegs` validation. |
| `src/animation/MoveRuntime.js` | Central Neck/Ankle targeting, floor/shoulder pin support, supplied clip handling, post-draw contact lifecycle, cleanup. |
| `src/Wrestler.js` move sections | `_doMatMove`, `_doMatSolo`, `_doHeadScissors`, `_doRecoveryVariant`, its three wrappers, leapfrog launch/duck and `_tryBackwardRoll` boundary handling. Preserve existing lifecycle ownership. |
| `src/moves/registry.js`, `src/characters/rosterKits.js`, `src/AIHandler.js` | Body-scissors retirement and existing kits/decision handling. Do not assign new draft/recovery gameplay behavior merely by importing animations. |
| `tools/gait-preview/index.html`, `tools/run-preview/index.html` | Same-art comparisons, rig/facing controls and arm/stance/art comparisons. |
| `tools/mat-preview/index.html`, `tools/debug/g12_lib.mjs` | Move previews, setup/replay and available draft executors. |

## Latest head-scissors draft, preserve these details

Supine receiver; wrist-control/support descent, outside leg goes OVER the shoulder/head rather than through limbs, then ankle closure. Anatomical hinge mode prevents reverse knee extension. Continuous leg depth during application avoids disappearing/reappearing leg; outside leg overlays face. Closure completes at 2.35s. Three squeeze markers remain 3.9 / 6.5 / 9.1s, three 4-damage calls. George sells via alternating bent-leg kicks and open-mouth pain face; no new scream audio exists. Lou uncrosses/clears head and uses a copied roll at 11.2s, with raised-knee entry to avoid passing through George's shoulders. Total 14.05s; attacker standing, receiver down. Accepted standalone roll is not edited to achieve this draft exit.

The phase-aware validator allows late floor hand support after leg contacts release, but still rejects overlapping after-leg redraw ownership. Preserve this distinction. Historical latest head-scissors browser evidence: four cases (Lou→George / Kowalski→Guido, both facings), finite joints, correct three damage calls, ending/cleanup; these measurements do not prove collision-free animation or visual acceptance.

## Preview links and known integration limits

Use `npm run dev` (Node 22 preferred) and substitute the actual Vite port; 5185 was live when handed off.

- Final George hands: `/tools/gait-preview/?compare=ready-art&rig=george-roster-v1&body=close` — previous cupped pair left, final seam-matched pair right.
- Walk: `/tools/gait-preview/?rig=george-roster-v1` — old walk vs reviewed walk.
- Run: `/tools/run-preview/?rig=george-roster-v1`.
- Locomotion arms: `/tools/gait-preview/?compare=arms&rig=george-roster-v1`; switch to running in header.
- Ready stance: `/tools/gait-preview/?compare=stance&rig=george-roster-v1`.
- Moves: `/tools/mat-preview/?move=headScissors&att=thesz-procreate-v1&def=george-roster-v1`; replace move with `leapfrog`, `backwardRoll`, `backwardRollEscape`, `rockingRecovery`, `kipUp`.

The mat-preview's no-query fallback still names retired `bodyScissors`; ALWAYS specify `move` and repair this default during integration. Two independent comparison iframe clocks can differ in phase; exact same-frame invariance comes from audit scripts, not comparing arbitrary screenshot limb positions. Fixed simulation steps are more reliable than wall-clock decay waits under slow browser rendering. Hand sizes/joints are preserved in rig coordinates; painted contours still need human review. Boot articulation is not implemented; walking start/stop drift was not declared solved. No Spine/mesh-body migration or global seam-gluing system was implemented; the continuous wrist deformation is a local solution only.

## Validation and remaining work for Claude

Consolidation reran 112 focused tests across gait, walk/run/arms, stance/wrist, variants, scissors/recovery/leapfrog, mat clips, contacts and runtime. All pass. Production build passes (existing chunk-size advisory only). Exact command and output are in `integration/claude-2026-11-24/verify.sh` and `evidence/`. This is NOT a claim that the whole repository suite or coverage gate was run today.

Copied browser summaries cover final George arm/wrist tests (both directions: fixed elbow/wrist anchors, unchanged proximal pixels, variant cleanup, cupped-move preservation), all-rig walk/run arm invariance, final ready-stance fixed-step checks, and historical latest head-scissors cases. Detailed scripts/captures remain in research directories and the bundle manifest. Move browser evidence is historical, not a fresh end-to-end move retest at consolidation.

Integration order:

1. Review current branch/worktree and snapshot hashes. Merge helpers + relevant core hooks, preserving unrelated rope and prior accepted move work.
2. Verify manifest assets and keep grip move variants distinct from readiness aliases. Use final v3 relaxed sprites, not discarded prototypes.
3. Integrate accepted leapfrog/shared idle and backward-roll/recovery lifecycle changes together with their contact/leg/gait schema dependencies; don't cherry-pick only the clip files.
4. Preserve body-scissors retirement. Keep head scissors draft-only. Keep new standing escape/rocking/kip-up gameplay bindings, reversal success conditions and resource rules unassigned until designed.
5. Wire accepted normal-match presentation/defaults with opt-out and all-rig/facing review; preserve active-move/sell/rope/recovery ownership. No new default was flipped in this handoff.
6. Run focused verification, full project checks required by the repository, both-facing move cleanup/contact tests, all-rig walk/run/rebound and final George stance/hand visual review. Repair mat-preview's retired fallback. Then create focused commits after review; don't push as part of this handoff request.

## Earlier accepted checkpoint and optional referee art

The earlier wristlock/hammerlock/headlock/flying-mare/test-of-strength acceptance and commit references remain in `AI_HANDOFF.md`; preserve them. Head-scissors and recovery source entries are copied into the companion bundle for detailed provenance. The possible George held-overhead kip-up flourish is saved research only, not an assigned move. Backdrop suplex remains queued, not built in this session.

Dempsey referee art is an optional separate candidate, not an integrated referee system: `research/art/dempsey-simplified-head-2026-11-22/dempsey-full-body-candidate-v4-moderate.png`, with `full-body-v4-prompt.txt`. This supersedes the too-heavy v3 and head-only trial; no final acceptance, rig slicing, referee AI or match role integration is claimed.
