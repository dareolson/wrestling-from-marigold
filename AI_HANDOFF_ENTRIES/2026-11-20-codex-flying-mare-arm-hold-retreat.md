# Flying mare: larger visible back arm, longer hold, two retreat steps — Codex, Nov 20

Derek requested: clear Lou arm/torso overlap; make the arm 15% bigger; hold about twice as long; keep outside arm visible during wrench; back up a couple steps after release. Combined revision, awaiting visual judgment. All uncommitted, no commit/merge/push/reset. Preserve accepted headlock and all other approved moves.

## Arm

Interpreted “arm” as the back/far shoulder-clamping arm from the preceding review. Added clip-local farArmScale sample metadata, consumed by Wrestler and applied by Skeleton to BOTH upper-arm and forearm bone lengths, image scale/width and attached hand. Explicit 1.15 factor through hold. FK joints/grips solve at the same increased proportions; no new art or arm swap. Factor blends back toward 1 during release and is unconditionally 1 outside an active clip, including cancellation.

Initial torso-alpha mask hid too much at wrench; Derek caught the disappearing arm. Removed that attempt entirely. Final clamp uses the existing reverseElbow route to swing the elbow around the outside instead, with full forearm visible. Near-hand back-sell masking remains unchanged. Existing shoulder clamp + wrist control and front forearm layers retained. No claim of pixel-perfect silhouette acceptance.

## Hold

Impact/fast throw unchanged at .82, same one 14 damage hit. Seated hold until release start **5.05s**, previously 2.95: landing→release **4.23s**, previously 2.13 (~1.99×). Added second pair of wrench/resistance cycles at 3.6 and 4.25, with free-hand pry windows; sustained grip/pain parts and knee brace throughout. Release completes 5.35; recovery keys +2.1s, standing 6.25.

## Retreat and recovery bug

Two alternating backward steps after standing: load 6.35, first landing 6.55 (x 28→54), second landing 6.87 (x 54→78), settle guard at 7.15. New total **7.15s**. Receiver stays down after release; no dragging or extra damage.

Found raised-leg aliases carrying into later standing samples when later poses omitted the semantic channels. Every flying-mare attacker beat now explicitly owns near/far leg/fold channels, so the raised knee clears during recovery and legs actually stand/step. Added optional near/far leg names to sole plants, resolved through existing lChannelSide mapping; older l/r plants keep their behavior. New regression exercises both rig channel conventions and verifies ending shins no longer retain deep knee folds. Plant windows alternate far→near→far with overlap while the next foot lands.

## Files and evidence

Source: matMoves.js; Skeleton.js (opt-in far-arm scale); Wrestler.js (clip metadata lifetime); MoveRuntime.js / AnimationClip.js (optional relative plant leg names); tests/legContacts.test.js (relative plant + cleared ending regression); tests/snapmare.test.js (expanded plant validation contract). Attempted far torso-mask helper/test were removed, not left unused. No asset changes. Full-clip preserve script compares all OTHER moves with start snapshot, including accepted headlock.

research/animation/flying-mare-arm-size-2026-11-20/ contains before-matMoves.txt, capture/preserve/verify scripts, screenshots, logs and matrix JSON. Final capture keys cover extended wrench and both steps. Matrix verifies 1.15 ratios for upper bone, forearm bone and image width, contact, appearance, visibility and restore-to-1 after clip. Earlier mask audit was stopped when Derek steered the route correction; it is superseded.

Preview: /tools/mat-preview/?move=flyingMare&att=thesz-procreate-v1&def=george-roster-v1&light=v1 . Derek judges arm silhouette, pain, hold length and retreat.


## Final validation and misses

Focused **56/56** pass. Full suite **1458/1458** pass under Node 22.23.1; build pass (existing chunk warning); diff --check/full-clip preserve pass. First full run exposed the old snapmare plant-validation test expecting near/far to be invalid; updated that test to accept the new physical-side names and still reject unsupported names. Snapmare source/choreography untouched.

Final browser matrix **16/16** (Lou/Guido × four receivers × both facings): one [14,flyingMare] hurt each, no non-finite joints/page errors; receiver remains paired/holding through the extended lock, finishes down; attacker finishes standing, no active move after 8s. All full-hold samples keep pain/grip parts and visible working forearms. Measured upper-arm bone, forearm bone and forearm image width ratios: **1.15** in every case (floating-point error <1e-13). Scale restores to **1** after completion; no far-arm torso mask remains active.

Full hold wrist gap ≤**0.415765 px**; shoulder palm gap ≤**3.104942 px** across matrix, Lou→George shoulder ≤**0.000030 px**. Prior flight wrist miss ≤**10.431452 px** remains. Sole plant residual during full retreat support windows reaches **8.669776 px** (Lou→George and global); no perfect foot-lock claim. Lou→George root x moves **38.197548 px** backward over the two steps, then stops. Hold remains 4.23s from impact to release start; total clip 7.15s including recovery/retreat.

Final frame-3.png shows extended wrench; frame-7/8/9/10.png show the retreat. capture.jsonl and matrix.json are final. Earlier screenshots/logs from torso-mask and sticky-knee trials are superseded. Derek still judges silhouette, force and footwork; no visual approval inferred.
