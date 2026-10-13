# Trainer dialogue staging preview

Run `npm run story:preview` and open `/tools/story-preview/`.
Enter/Space or Next advances written dialogue. Replay camera restarts the
12-second 4% push. Reduced motion keeps the image still.

The trainer PNG and room JPEG are separate assets; no text is painted into
either. This is a staging preview, not a new campaign scene wired into FrontDoor.
The two trainer lines are scouting examples already in STORY_MODE_SCRIPTING.md.
Guy remains offscreen pending an approved character reference.

The actor photo supplied by the user guides the trainer's face and build;
the Punch-Out image supplies the practical corner-man/towel cue. Both are
translated into the game's inked period illustration style, with a 1952
work shirt, high-waisted trousers, towel, and athletic tape. The room is a
plausible fictional interior, not a documented Marigold reconstruction.

Runtime art and full prompts: `src/assets/story/trainer-dressing-room-v1.manifest.json`.
Full-resolution masters are preserved in ignored
`Sprite sheets/Story/marigold-dialogue/source-masters/`.

Next production step: review the trainer identity and costume, then derive
registered mouth states from this same master, preserving head pose, moustache,
neck, and lighting. Do not regenerate the whole character per spoken line.
Mouth shapes and voiced dialogue are not implemented in this pass. Character
and background layers allow placement and camera changes without repainting
the room; stronger parallax needs additional separated depth planes.

Browser validation: both layers load, written dialogue advances, dolly transform
runs, reduced motion disables it, no page exceptions. Reviewed screenshot:
`tools/debug/shots/trainer-preview/scene.png` (ignored).
