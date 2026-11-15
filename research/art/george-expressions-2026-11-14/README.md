# George expression and match-wear trial — 2026-11-14

User requested animated trash talking at referee, audience and opponent; progressively worse hair and a progressively battered face. Source identity/style is current production `src/assets/wrestlers/george-roster-v1/head.png`.

`george-expression-atlas-v1.png`: built-in imagegen 3x3 concept atlas. Rows: immaculate, disheveled/flushed, messy/bruised. Columns: closed, speaking, shouting. Source original: `/Users/home/.codex/generated_images/01a1cec4-a88a-7593-8aee-05fccbb73a0f/exec-a4d67e3d-698a-4c3d-8a3b-904a5248597c.png`.

Preview: `/tools/head-preview/` on Vite. Uses `src/animation/headPerformance.js`: persistent monotonic wear, transient irregular speech shapes, three target contexts, action suppression and reset. Thresholds and damage increments are trial values, not gameplay balance decisions. No audio or target-facing body gestures yet. The atlas's bottom-of-cell generated debris is clipped in preview; original source retained untouched.

Not wired into matches yet. Before production: clean and separate atlas cells, register each to the original head's eye/ear/neck anchor and exact canvas, verify mouth cycles without jitter in both facings, add expression variants through the existing part-variant asset manifest (and character generator), then merge appearance with move/sell head selections. Match integration must preserve wear through temporary expressions and reset on a new match; injury/active moves should interrupt speech. Target-specific body gestures should only run when gameplay permits, not turn a grappling head independently. Add separate pain expressions later rather than using shouting as the hurt face.

Validation: two headPerformance tests pass; Chrome preview renders and referee speech button works, no page errors. No runtime head replacement or automatic match-damage progression is claimed by this trial.

## Pain and boasting extension

Added `george-pain-atlas-v1.png` (flinch, clenched teeth, open-mouth pain cry) and `george-smug-atlas-v1.png` (smirk, toothy grin, chuckle), each across all three wear stages. Generated from original production George head plus talking atlas as identity/style/wear references. Originals respectively `exec-c6e6a124-4aa8-485a-bb22-e68077339f9a.png` and `exec-34eac556-5826-45dc-b422-d97613b72688.png` in the same generated_images directory noted above.

Preview now has Sell pain and Boast/chuckle sequences. Take a hit adds wear and triggers pain, canceling talk/boasting; new speech/boasts cannot override active pain. Completion returns to current wear stage without resuming canceled speech. Three state tests pass; Chrome confirms boast -> hit -> pain transition with no page errors. Still an art/timing trial, not match integration or full-body selling/taunt choreography. Atlas cells require precise registration and cleanup before runtime use.

## Dedicated resting heads

User requested closer likeness to current George. `george-rest-disheveled-v1.png` and `george-rest-battered-v1.png` are individual edits referenced DIRECTLY to current `george-roster-v1/head.png`, not the expression atlases. Preserve original rounded face, nose, cheek volume, eye, jaw and faint closed-mouth smile while changing hair and restrained late-match wear. Preview now uses original production head at clean rest and these files at worn rest. These supersede the talking atlas's closed-mouth frame for resting use, but do not imply approval of the new art or production alignment. Generated dimensions differ from original; Claude still needs anchor registration, edge cleanup and an on-body likeness check. Expressions currently show some identity/scale drift relative to these closer resting heads; use these and original as references for any next expression refinement.

Generated originals: `exec-d63f7fc4-2e22-4114-b30d-5babfebb4578.png` (disheveled) and `exec-4284b2bc-25cd-47fb-8ebb-c07dc3f05875.png` (battered), same generated_images directory as above.
