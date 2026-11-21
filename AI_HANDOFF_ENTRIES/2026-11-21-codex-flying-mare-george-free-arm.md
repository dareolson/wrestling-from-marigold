# Flying mare: consistent, larger receiver free arm — Codex, Nov 21

Derek: George's far arm appears/disappears and is too small for his body. Increased receiver far upper-arm/forearm/hand uniformly by 15% in this move through the hold; returns to normal proportions on release/getting-up interval. Same existing FK scale metadata as Lou; no assets or generic runtime changes.

Kept receiver far upper arm behind his body, but far forearm/hand consistently above his torso/near arm during seated hold (.82–5.35). Lou's entire back arm remains behind BOTH bodies as Derek explicitly requested; its pose/scale/route unchanged.

Initial depth-only change still let the free arm align with the trapped arm during the four own-elbow pry constraints, making the silhouettes merge. Removed those four receiver-far-hand pry constraints. Existing keyed free-arm pain poses now keep the hand raised beside the face rather than tucking across the torso. Wrist capture, Lou shoulder clamp, knee brace, pain, duration, impact/damage, release and two retreat steps unchanged.

46/46 targeted contact/layer/mat tests pass; build pass (existing chunk warning), diff --check/full-clip preserve pass. Lou→George browser both facings: one [14,flyingMare] hurt each, no page errors/non-finite joints, receiver paired through hold, proper ending/cleanup. Receiver upper-arm bone, forearm bone and image width all verified **1.15×**; free forearm visible and above torso in every full-hold sample. Wrist gap ≤**0.415765px**. Old full-suite/16-case results are prior evidence, not rerun for this local pose/depth/scale correction.

Updated regressions assert receiver foreground forearm + upper arm behind torso, and 1.15 hold scale / normal release scale. Source changes limited to flyingMareClip and those existing tests. Other full mat clips deep-equal to start snapshot, including accepted headlock.

Evidence/repro: research/animation/flying-mare-george-arm-2026-11-21/ before-matMoves.txt, capture-pry.mjs, verify.mjs, preserve.mjs, pry.jsonl, matrix.json and logs. Final frame-2.png is 1.95s former disappearing reach, now raised hand. Other capture snapshots from the preliminary reach version are superseded. All uncommitted, no commit/merge/push/reset. Preview URL unchanged; await Derek's eye.

## Derek acceptance

Nov 21: “it’s good, what move is next.” Flying mare accepted; preserve this version. Next: test of strength. Work remains uncommitted.
