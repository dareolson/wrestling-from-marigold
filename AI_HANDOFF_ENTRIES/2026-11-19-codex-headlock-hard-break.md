# Headlock takeover: loaded break, recoil and catch — Codex, Nov 19

Derek: “George and Lou need to seriously break at the end…they just kind of float away.” Changed only headlockTakeover build/grips/plants in matMoves.js. Uncommitted; no commit/merge/push/reset. Preserve prior entry, turn to stomach, hands/knees, FK wrapping arm, and exact layer order. No visual approval claimed.

## Revised ending

- Added 3.25 rise key: establish a bent-legged base before the break. Neck stays in crook through 3.35; release 3.35–3.43 (previously 3.0–3.18). Lou's far hand re-clasps 3.08–3.2, unloads 3.35–3.4 after supporting the rise.
- Chest/shoulder contact load 3.34–3.45. Receiver uses both hands; attacker uses near hand. Targets inset 12 rig units below shoulder rather than face-level reach. Arms extend into the shove at 3.51. Hand constraints release 3.51–3.58 as bodies recoil.
- Main separation 3.51–3.67: attacker D-54→D-112 (58 rig units), receiver D-2→D+50 (52 units). Small catch-step travel completes by 3.78 at D-120 / D+58. Those root x keys remain fixed through 5.15; no continued lateral exit glide.
- Opposing torso recoil .12/.08 backward tilt, bent-knee catch at 3.78, settle 3.98 onward. Added plant constraints on push leg (3.43–3.6) and catch leg (3.67–4.07) for both roles. Existing knee floor support unloads 3.0–3.12 as sole support takes over; removed long knee/sole overlap. Receiver support hand releases before the chest shove.
- Total still 5.15, one 9 damage impact at 1.65, no added hit events. Receiver ends staggered. First trial attempted the shove during the rapid rise; discarded in favor of rising before the loaded break.

## Verification/evidence

research/animation/headlock-break-2026-11-19/ contains before-matMoves.txt, preserve/capture/verify scripts, screenshots, matrix JSON and logs. Stills 3.25, 3.43, 3.51, 3.59, 3.67, 3.78. Preserve check: all other mat move builds/damage unchanged from start, including approved hammerlock, Guido wristlock, stretch/deathlock. Node 22.23.1 suite **1452/1452 pass**, build pass (existing chunk warning), git diff --check pass.

Preview: /tools/mat-preview/?move=headlockTakeover&att=thesz-procreate-v1&def=george-roster-v1&light=v1 . Numerical gaps and root timing are evidence; Derek judges the force and feet visually. Earlier knee-support/reach misses outside the changed ending remain unless superseded by measurements below.


Final matrix **16/16** damage/neck/finite-coordinate cases pass: one [9,headlockTakeover] hurt each, no page errors/non-finite joints, standing/staggered/no active move at 5.75s. Full neck hold .6–3.35s max gap **0.049952191 px**. First audit failed (matrix-first-failed.json) because defender nearSole constraint clamped body height before neck release; moved its blend to **3.4–3.48** so it takes over at the break. Final suite/build rerun after fix: 1452/1452 pass, build pass.

Lou→George full load contact (3.45–3.51): Lou hand→George shoulder/chest target effectively zero; George near hand→Lou chest target up to **4.296 px**. Root x drift after 3.79 through 4.25: **0 px for both**. Foot-plant audit during full push/catch weights: Lou max miss **7.059 px**, George **0.166 px**; global matrix worst **7.059 px**. These are recorded misses, not a perfect-support claim. Far-foot height/painted contact is not independently certified.

Final capture-final.mjs, final-capture.jsonl and final-frame-4/7.png supersede earlier stills where defender foot competed with neck carry. Preserve check and diff --check passed after final fix. Everything remains uncommitted.

## Derek acceptance

Nov 19: “looking good enough, let’s move to the next move.” Accepted for now; preserve this exact headlock version, including recorded numerical misses. Next review: flying mare (Lou attacking George). No commit/merge/push/reset authorized; work remains uncommitted.
