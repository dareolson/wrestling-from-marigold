# Art request for Codex: George's gesture hands (Claude, 2026-11-15)

Derek: "order replacement arms for gestures". These are the hands for [PLAN_GEORGE_PERFORMANCE.md](../PLAN_GEORGE_PERFORMANCE.md).
- A (crowd taunt, a7dc7c9) and B (superiority) are built and play with his baked fist for now: `?light=v1&georgePerformance=1`.
- C (hair check) waits on hand 4.

## Runtime contract (same as the grip donor, [2026-10-25 brief](2026-10-25-claude-codex-george-grip-request.md))

- **Canvas:** each hand is a **forearm variant** of `src/assets/wrestlers/george-roster-v1/forearm.png`, 426 × 439. His hand is baked into the forearm (`handInForearm: true`).
  - Scale the whole canvas; never crop.
  - The elbow end must stay identical: `jointPivotFrac` .1559, `distalAnchorFrac` (.5010, .5298). Only the hand and wrist change.
- **Style:** match his paint, skin, outline weight and elbow cap. Work from his current forearm and `forearm_grip.png`, not from generated arms forced on afterwards.
- **One drawing per hand.** The same forearm art serves the near and far arm in both facings; the rig flips and rotates it. Draw the hand once, in the forearm's own canvas orientation.
- **Anchors:** each PNG comes with any semantic anchor listed below, `{u, v}` measured on the delivered canvas.
- **Sources:** save prompts and sources next to the output. Files go to `research/art/george-gesture-arms-2026-11-15/`. Claude registers them (`textures.variants.forearm.<name>`) and Derek judges them in game.

## References

`research/art/george-gesture-arms-2026-11-15/references/`, made by `tools/debug/george_arm_refs.mjs`:
- **Stills:** George held in each gesture pose, both facings.
- **`poses.json`:** the arm channels for each pose, the forearm's on-screen angle (degrees from pointing straight forward, positive = down) and the wrist height.
- **The art to start from:** `forearm.png` and `forearm_grip.png`.

| Name | Arm | Where it plays | Forearm on screen | Hand |
|---|---|---|---|---|
| 1. `presentPalm` | near | A present and hold (`crowdPresentHold`); B presenting the man on the mat (`superiorityPresent`) | about level (4°) to slightly down (17°) | open, palm turned up and out to the crowd, fingers together, thumb relaxed: "here I am" / "look at this" |
| 2. `dismiss` | near | A's sweep (`crowdDismissSweep`) | about 27° up | back of the hand leading, fingers loose and trailing, wrist a little cocked: brushing the crowd off |
| 3. `chestTouch` | near | A's offended recoil (`crowdRecoil`) | steep, about 66° up, hand at the upper chest | fingertips or flat hand on his own chest: "how dare you" |
| 4. `hairSmooth` | **far** | C, the hair check (`hairFarArm`) | the arm goes up behind the head and the hand comes over the crown | open hand, fingers together, curved to lie on the hair. Anchor `hairContact`: the centre of the finger pads. |
| 5. `inspect` | near | C, after smoothing: looking at the hand | about the `crowdRecoil` height, hand in front of the chin, not over the face | palm toward his face, fingers slightly spread |

**Order:** 1 and 2 first; they improve A and B at once. Then 3, then 4 and 5 for C.

**Why the hair hand is on the far arm:**
- Posing the current rig, the near arm cannot reach the hair. The best near pose leaves the palm 19 px short of the hair on a 35 px-wide head, with the elbow sitting on his head: the elbow needs to come toward the camera, and a flat arm can't show that.
- The far arm draws behind the head. Its palm reaches the crown (1.5 px from target) with the elbow hidden.
- What still looks wrong in `hairFarArm_*.png`: part of the far forearm shows in front of his face, and the fist pokes above the crown. The open `hairSmooth` hand, lying on the hair, should fix the second. Say if the first needs a shorter or bent variant.
- If you'd rather draw a dedicated foreshortened near arm (upper arm and forearm with the elbow toward camera), that's a bigger rig job. Flag it before drawing.

## Not asked for

Art for other wrestlers, new faces (an offended face is a separate later item), changes to his upper arm or torso.
