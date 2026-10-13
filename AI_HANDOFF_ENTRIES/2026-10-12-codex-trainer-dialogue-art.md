# Trainer and dressing-room imagery

Local branch: `story/marigold-opening`. No push; Claude reviews before publication.

User requested separate 1950s Chicago character/background art suitable for
later mouth animation and dolly shots, with written dialogue initially.
Actor photograph supplies trainer face/build inspiration; Punch-Out trainer
image supplies towel/corner-man cue. Candidate identity still needs user review.

New assets: `src/assets/story/trainer-medium-v1.png` (transparent character) and
`dressing-room-v1.jpg` (clean environment). Masters are ignored under
`Sprite sheets/Story/marigold-dialogue/source-masters/`.
`trainer-dressing-room-v1.manifest.json` records full built-in imagegen prompts,
reference roles, runtime exports, historical limits and future mouth-state work.

`npm run story:preview` opens a standalone Vite staging preview with separate
layers, written trainer scouting examples, a 4% push, Next/Enter, Replay camera,
and reduced-motion support. This does not replace the current title/queue or
wire a new conversation into the campaign. Guy remains offscreen until his
approved face/body reference is available. No new voice or mouth frames yet.

Browser check passed image loading, written dialogue advancement, camera motion,
reduced motion, and zero page exceptions. Composite screenshot inspected at
960×600 in ignored `tools/debug/shots/trainer-preview/scene.png`.
Use this portrait as the reference for future mouth states; keep head alignment,
moustache and lighting fixed. Stronger parallax needs more background planes.
