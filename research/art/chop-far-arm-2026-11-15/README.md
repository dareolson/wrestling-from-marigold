# Far-arm chop art trial — 2026-11-15

## Camera-facing tween follow-up

`chop-camera-tween-v1.png` adds an end-on, foreshortened complete arm for the horizontal sweep. Hand is flat, palm down, fingers together toward camera. Built-in imagegen used contact art as style reference, then revised the initially upright hand. Art only; same integration limitations below apply.

Prompt: Isolated Lou arm pointing directly toward camera, compact overlapping shoulder, elbow, wrist and open hand. Horizontal chest-height chop; rotate forearm axially so palm faces floor and back of hand faces up, fingertips side by side horizontally, straight together, thumb tucked. Match reference peach skin, muted rose painted shadows and dark contours. Genuine transparent background, no body or text. Preserve depth view, no fist or stop gesture.

Final source: `exec-6083c5a8-4c71-4c88-87c7-710f15a6449e.png` in the generation source folder below.

Three transparent complete-arm drawings generated with the built-in imagegen tool, referenced to Lou's current `thesz-roster-v1/upper_arm.png` and `forearm.png`.

- `chop-windup-v1.png`: bent elbow, hand coming around horizontally.
- `chop-contact-v1.png`: open fingers together, extended hand for chest contact.
- `chop-followthrough-v1.png`: shorter projected forearm and turning hand after contact.

Art trial only. These are complete arms, not registered forearm texture replacements. No runtime changes or in-game approval. The generated contact pose retains a substantial bend, so it is not a fully straight extension. Registration, splitting at the elbow, matching projected lengths, and a live far-arm preview remain necessary before integration. Do not stretch the current bones or overwrite base arms to fit these drawings.

## Prompt set

Shared prompt: Production 2D wrestling game sprite, isolated complete FAR ARM ONLY from rounded shoulder cap to open flat fingertips, no body. Match reference upper-arm and forearm artwork: vintage hand-painted cartoon, peach skin, simple muted rose shadows, thin irregular dark contour, restrained realistic muscular proportions, not glossy or detailed. Lou's bare arm performing a horizontal knife-edge chest chop, same side-on three-quarter camera. Shoulder LEFT to hand RIGHT at chest height, hand open fingers together thumb tucked, never a fist. Transparent background, padding, no text, guides, motion lines or other body parts. Draw depth-perspective in-betweens, not just a rotated fist.

1. Wind-up: elbow bent about 35 degrees, upper arm receding, forearm coming round horizontally; subtle foreshortening; three-quarter back-of-hand view, little-finger edge leading.
2. Contact: same arm, nearly straight soft 10-degree elbow, horizontal knife edge with fingers together in line with wrist, little-finger edge leading, palm slightly down. References also include frame 1 for continuity.
3. Follow-through: sweeping across wrestler's front, upper arm approximately horizontal, softly bent elbow, forearm foreshortened toward camera, hand more edge-on, straight wrist. References also include frame 2 for continuity.

Generation source folder: `/Users/home/.codex/generated_images/01a1cec4-a88a-7593-8aee-05fccbb73a0f/`. Source images copied intact, preserving alpha.
