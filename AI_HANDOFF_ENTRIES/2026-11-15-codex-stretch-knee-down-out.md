# Stretch: Guido and Kowalski down and outward

Derek says George now looks good; Lou remains the reference. Requested Guido and Kowalski come a little down and out. Preserved Lou/George values and their exact clip data.

Added optional legContacts[].kneeArtOffset {x,y}: facing-relative horizontal and screen-down vertical scaled rig pixels, blended with contact weight. Only abdominalStretch.params rigOverrides declare it: Kowalski {x:1.5,y:1.5}, Guido {x:2,y:2}. This translates the rigid calf/boot artwork and their semantic anchors together; physical joints/lengths, hook target, supporting sole, timing, layers, grips, damage and landing are unchanged. Offset fades away with the existing leg contact. Validated finite bounded coordinates (absolute maximum 6). Existing kneeOverlap remains Lou 3, George 1.5, Kowalski 2, Guido 0.

Changed Stage12: Skeleton.js, animation/MoveRuntime.js, animation/AnimationClip.js, animation/clips/matMoves.js, tests/legContacts.test.js. Regression proves mirrored outward/downward placement, partial-contact blend, preserved joint solve and boot/sole following. 61 focused tests pass; build and git diff --check pass. No full-suite repeat. Browser captures for Guido/Kowalski both facings at 1.3/2.6/3/3.3/3.4/5 seconds: four finish standing/down-prone. Evidence/scripts in research/animation/stretch-knee-down-out-2026-11-15/.

All work remains uncommitted in moves/stage12. No commit, merge, push or reset. Preview port 5233 with Guido selected; await Derek's visual assessment, as some seam detail is easier for him to see.
