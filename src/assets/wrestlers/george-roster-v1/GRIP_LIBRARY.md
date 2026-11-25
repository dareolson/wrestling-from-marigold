# George forearm / grip library

The manifest in `src/characters/george_roster_v1.js` registers these reusable appearance variants. Select a near/outside and far/inside variant in a move's `parts` selection. Existing calibrated contact grips are unchanged; contact points for a newly authored move are authored separately from its appearance selection.

| Pair | Close / near arm | Far / inside arm | Use |
| --- | --- | --- | --- |
| Relaxed grip | `relaxedGripOutside` — [sprite](forearm_relaxed_grip_outside_v3.png) | `relaxedGripInside` — [sprite](forearm_relaxed_grip_inside_v3.png) | Gentle finger flex, thin original-style contours; current ready-stance candidate. Back of near hand, palm of far hand. |
| Open grip | `openGripOutside` — [sprite](forearm_ready_neutral_outside_v2.png) | `openGripInside` — [sprite](forearm_ready_neutral_inside_v2.png) | More strongly articulated fingers; retained for move use. |
| Cupped grip | `cuppedOutside` — [sprite](forearm_ready_outside_v5.png) | `cuppedInside` — [sprite](forearm_ready_inside_v5.png) | Deeper cupped shape, preserved at Derek's request for moves. |

Current readiness aliases `readyNeutralOutside` and `readyNeutralInside` select the relaxed pair when `stance=v1&readyArt=v2`. Readiness cleanup owns these aliases, not the reusable move names above. The far ready hand retains 25% hand-only enlargement and wrist-led motion; reusable move appearances do not automatically inherit that animation.

Generated using built-in imagegen. Full sources and exact per-side prompts are in `research/art/ready-grab-2026-11-24/`: `relaxed-inside-source.png`, `relaxed-outside-source.png`, `relaxed-inside-prompt.txt`, `relaxed-outside-prompt.txt`. Packed to the calibrated 426×439 canvas with transparency preserved. Earlier candidates remain available. Current relaxed pair awaits art-direction review.
