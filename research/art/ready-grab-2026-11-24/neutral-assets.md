# Neutral ready hands

Generated using built-in imagegen. Prior cupped hand sprites retained as move variants.

- Inside: `src/assets/wrestlers/george-roster-v1/forearm_relaxed_grip_inside_v3.png`
- Outside: `src/assets/wrestlers/george-roster-v1/forearm_relaxed_grip_outside_v3.png`
- Full generated sources: `neutral-inside-source.png`, `neutral-outside-source.png` in this folder. Packed to 426×439 with transparency preserved.

## Inside prompt

Edit this inside forearm sprite for a hand-drawn vintage wrestling game. Preserve the entire forearm above the wrist, elbow overlap contour, wrist connection, canvas proportions, orientation, scale and padding. REDRAW THE HAND ONLY with a NEUTRAL FOREARM ROTATION, like the relaxed hand in a handshake before contact, ready to take an opponent's wrist. The current cupped palm reads like asking someone to put a fruit in it; remove that pose. Show a narrow three-quarter SIDE/EDGE view of the hand with the palm facing INWARD toward the other hand, not up toward the viewer. Thumb rests naturally along the upper/side edge, closer to the index finger, with its tip pointing generally in the same direction as the fingers, not splayed out sideways or lifted like a hook. Four fingers loosely flexed, softly staggered, mostly pointing along the forearm axis with shallow curvature, NOT rolled into a deep bowl, NOT a claw, fist, flat wave, receiving palm or thumbs-up. Straight neutral wrist, no sideways kink. In this vertical image the fingertips still point toward the bottom; the neutral thumb lies on the RIGHT edge near the index knuckle. Inside/far arm: show a subtle sliver of palm/thenar plane with one restrained crease, mostly side-on, NOT the broad full palm. Same mature muscular adult male hand size, simple flat peach fill, black irregular cartoon ink matching source. Exactly five anatomically correct digits, no photorealism. Preserve source's elbow cap contour without adding a full ring, bevel, halo or glow. One whole isolated forearm plus corrected hand on genuine transparency. No labels, extra objects, shadow or checkerboard.

## Outside prompt

Edit this outside forearm sprite for a hand-drawn vintage wrestling game. Preserve the entire forearm above the wrist, elbow overlap contour, wrist connection, canvas proportions, orientation, scale and padding. REDRAW THE HAND ONLY with a NEUTRAL FOREARM ROTATION, like the relaxed hand in a handshake before contact, ready to take an opponent's wrist. The current cupped palm reads like asking someone to put a fruit in it; remove that pose. Show a narrow three-quarter SIDE/EDGE view of the hand with the palm facing INWARD toward the other hand, not up toward the viewer. Thumb rests naturally along the upper/side edge, closer to the index finger, with its tip pointing generally in the same direction as the fingers, not splayed out sideways or lifted like a hook. Four fingers loosely flexed, softly staggered, mostly pointing along the forearm axis with shallow curvature, NOT rolled into a deep bowl, NOT a claw, fist, flat wave, receiving palm or thumbs-up. Straight neutral wrist, no sideways kink. In this vertical image the fingertips still point toward the bottom; the neutral thumb lies on the RIGHT edge near the index knuckle. Outside/near arm: show side-on knuckles/back plane, with a restrained thumb profile, NOT a full top-down back-of-hand view. Same mature muscular adult male hand size, simple flat peach fill, black irregular cartoon ink matching source. Exactly five anatomically correct digits, no photorealism. Preserve source's elbow cap contour without adding a full ring, bevel, halo or glow. One whole isolated forearm plus corrected hand on genuine transparency. No labels, extra objects, shadow or checkerboard.


## Open-grip correction

Derek rejected the edge-on v1 pair as chop hands. Current v2 shows the back of the close hand and palm of the far hand, with partly curled fingers. Built-in imagegen prompts: open-grip-outside-prompt.txt and open-grip-inside-prompt.txt. Full sources: open-grip-outside-source.png and open-grip-inside-source.png. Earlier cupped move variants remain registered and preserved.


## Relaxed library pair

Final candidate in the current preview is the relaxed-grip pair above, generated with the original forearm as a style reference. Exact prompts: relaxed-inside-prompt.txt and relaxed-outside-prompt.txt. Full sources: relaxed-inside-source.png and relaxed-outside-source.png. Registered reusable move variants relaxedGripInside/Outside; stronger open grips and cupped grips retained. Library: src/assets/wrestlers/george-roster-v1/GRIP_LIBRARY.md.

## Current outline / thumb correction

Current selected pair is relaxed-grip v2 above: restored black contour and tucked thumb on BOTH hands. Generated with built-in imagegen using outlined-inside-prompt.txt and outlined-outside-prompt.txt; the inside transparency cleanup used outlined-inside-cleanup-prompt.txt. Selected source images: outlined-inside-source.png, outlined-outside-source.png. Previous relaxed v1 had insufficient ink and thumbs too far out; it is retained as an earlier candidate.


## Current seam-matched pair

Current relaxed-grip v3 assets above were edited using original George forearm and upper-arm references, retaining the hand pose. Built-in imagegen prompts: seam-match-inside-prompt.txt and seam-match-outside-prompt.txt; selected full sources: seam-match-inside-source.png and seam-match-outside-source.png. Runtime wrist rendering now uses a continuous deformation instead of a cut slice.
