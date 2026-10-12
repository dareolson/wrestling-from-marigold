# Title and opening preview — October 11, 2026

Normal launches open `FrontDoor`, a Phaser scene using the generated Marigold
exterior and painted marquee lettering: MARIGOLD GARDENS ARENA / TONIGHT: /
WRESTLING FROM MARIGOLD, as requested by the user. New Game continues the exterior with a restrained 4% push,
three arrival text panels, the trainer's first booking, and Guy's decision.
The background, street actors, and bulb mask share one camera transform. Story panels darken the image
for legibility. Arrow keys and Enter/Space, or clicking, operate the UI.
S skips the arrival; Escape returns to the title.

Guy can accept, speak to George first, or refuse. Refusal offers a final chance
to stay, then a short departure ending. A versioned localStorage checkpoint
resumes the booking or the accepted-booking card through Continue. Invalid or
unavailable storage disables Continue; save failure is reported on the booking
completion card. Starting over replaces progress upon reaching the booking.

This is an opening preview. The full bus/arrival artwork, character panels,
audio, Guy's playable rig, campaign matches, and the three-loss progression are
not implemented. The completion card explicitly offers Exhibition, which
starts the existing arena roster. It does not present Lou Thesz as Guy.

Arena remains scene index zero for the existing debugging tools. `?arena=1`
launches it directly; character, time-scale, and lighting query parameters also
retain direct arena behavior. The shared debug harness adds `arena=1`.

Art: `src/assets/story/marigold-title-clean-v1.jpg` (full-resolution PNG master in `Sprite sheets/Story/marigold-title/source-masters/`), a clean plate derived from
v3; v1–v3 are preserved locally in `Sprite sheets/Story/marigold-title/` with prompts in `research/marigold-title-art/`. V3 used the user's historical nighttime photograph
as architectural reference and the modern church photograph as secondary
context. The reference date/elevation remains unverified, and the added marquee
is artistic interpretation. Typography is baked in at the user's request,
overriding the initial editable-type standard for this asset.

`src/scenes/TitleStreet.js` owns parked cars, waiting groups, a sedan pass with
rotating hubcaps, a four-frame patron walk into the doorway, and a brief
single-bulb flicker. Activity repeats at irregular intervals. All actors use
separate transparent PNG assets. Scene shutdown removes timers, actor tweens,
and actors. Reduced-motion preference disables movement and camera push.
Generated walking frames need artist polish; no street or engine audio yet.
Full asset prompts are in `src/assets/story/marigold-title-layers-v1.manifest.json`.

Branch and integration instructions: `AI_HANDOFF_ENTRIES/2026-10-11-codex-layered-marigold-opening.md`.

Current validation: Vite production build; `node tools/debug/title_opening_proof.mjs`
checks street movement, sprite frames, arrival camera, Exhibition cleanup,
title re-entry, reduced motion, and browser exceptions. Screenshots at 960 × 600
are written under ignored `tools/debug/shots/title-opening/`.

Earlier preview notes recorded 565 Node tests and a fuller booking/save
walkthrough; those were not rerun for this layered-art change.
