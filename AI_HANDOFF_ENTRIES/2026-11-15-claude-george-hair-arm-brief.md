# Art request for Codex: George's near arm for fixing his hair (Claude, 2026-11-15)

Derek, after seeing the hair check: "he needs to check his hair more obviously ... he might need to use an alternate arm for that." Plan: Stage D of [PLAN_GEORGE_PERFORMANCE.md](../PLAN_GEORGE_PERFORMANCE.md).

## The problem
- The hair check uses the far arm (your `hairSmooth` forearm). It draws behind his head, so the hand is mostly hidden.
- The near arm draws in front of the head, but with the base upper arm it can't reach: palm 19 px short of the hair, elbow sitting on his head. The elbow needs to come toward the camera, which a flat side-on upper arm can't show.

## What to draw: one near-arm pair
1. **`upperArm.hairReach`**: his upper arm foreshortened, raised and coming toward the camera, so it reads shorter and the elbow sits in front of and beside the head, not on it. Canvas and joints as `src/assets/wrestlers/george-roster-v1/upper_arm.png` (296 × 410): shoulder end at the same `jointPivotFrac` (.2529); give the new elbow point as `distalAnchorFrac` {u, v} if it moves (it will, foreshortened).
2. **`forearm.hairFix`**: forearm with the hand on the side/top of his hair, palm down, fingers together and slightly curled, pushing the hair back into place. Canvas and elbow end as `forearm.png` (426 × 439, `jointPivotFrac` .1559). Anchor **`hairContact`**: the centre of the finger pads.
3. Optional, if it comes easily: **`forearm.hairRake`**, the same hand with fingers spread and clawed, for the battered stage's frustrated attempt.

## Rules (as the gesture-hands brief)
- Pose the current rig first and draw for that view: the near arm in front of the head, hand on the hair, face (eyes and mouth) left visible. A hand on the temple or forelock, not over the eyes.
- Match his paint, skin, outline weight and the elbow cap where the two pieces meet; the joint has to stay closed through the motion.
- One drawing per piece, in the canvas orientation; the rig flips it for the other facing.
- Output to `research/art/george-hair-arm-2026-11-15/` with prompts, sources and a JSON of the anchors. Claude/Sonnet registers them; Derek judges in game.

## Not asked for
Changes to the base arm, torso or head; art for other wrestlers.
