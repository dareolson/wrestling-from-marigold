# Test of strength: wristlock pain hops and playable reset — Codex, Nov 21

Derek requested George jump up/down in pain during the final wristlock, then real separation after Lou shove so the player has another chance despite health loss.

Two actual airborne hops: load 9.35, takeoff 9.5, apex lift 30 at 9.65, crouched landing 9.85; reload 10, takeoff 10.15, apex 10.3, crouched landing 10.5. Alternate tucked legs; pain face retained. No foot plant during hops. Standing wristlock and original descent-spacing fix retained. Lou grip follows George through the hops. Lou own-wrist clasp miss rises to 2.554px at worst while hopping; worked wrist remains ≤.00006001px.

Shove recoil now to m+115, catch steps m+180 / m+225, settle m+240; Lou holds shove root then steps back to m-55. End gap 295 rig units (prior 151). Duration 12.6 and three 3-damage squeeze events unchanged; shove adds no damage. Normal end.def is now stand, with _doMatMove supporting this ending through _standBackUp instead of adding another stun. Abort behavior retained. Both actors can act after the clip.

Actual preview hop/landing/shove/settle captures inspected both facings. Runtime verification stops on the exact completion frame: George standing, no active choreography/escape latch, 295-unit gap, then moves 20.043 rig units toward Lou in 12 input frames. Three 3-damage calls each facing, finite joints, no page errors. Stamina 92.2 after that .2s input test (includes standing regen); damage unchanged. Overhead palm gap ≤2.160701px. No visual acceptance implied.

50 mat/layer/leg + 11 runtime/stagger tests pass; all other mat clips/builds/damage deep-equal start snapshot; diff check pass. No full suite/build gate rerun. No commit/push.

Evidence research/animation/strength-hop-reset-2026-11-21/: before-matMoves.txt, audit.mjs, hops-* captures/JSON, verify.mjs, matrix-immediate.txt/matrix.json (exact completion+input), matrix.txt (earlier .7s post-completion check), tests.txt, runtime-tests.txt, preserve.mjs. Individual frames complete; some contact sheet rows are cropped.
