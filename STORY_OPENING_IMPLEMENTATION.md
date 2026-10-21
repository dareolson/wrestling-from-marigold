# Robe dialogue — October 13, 2026

The opening now asks where Guido's robe is, establishes he has none, and gives
him the trainer's old robe to borrow. The trainer promises a new robe with
MORETTI across the back if Guido takes the fall. The named robe is awarded
after the first booked loss; this supersedes the old contender-tier lettering
plan. The preview contains the dialogue only. Post-match reward state and
robe illustrations remain future work. Departure still depicts the moment
before he puts on the loaned robe.

---

# Opening coverage completion — October 13, 2026

Six additional illustrations are staged as review candidates: closer entrance
bustle, dressing-room two-shot, Guido pulling his wrist back, tape-start insert,
wrist-offered insert, and time-to-go departure. Full PNGs live under ignored
`Sprite sheets/Story/marigold-opening-completion/source-masters/`; runtime JPEGs
and the full prompt/reference manifest are in `src/assets/story/` under
`marigold-opening-completion-v1.manifest.json`.

The first five arrival illustrations remain visually approved. These six new
compositions await review. Approved face/build references and trainer master
remain untouched. Trainer sits left and Guido right during the conversation;
the right wrist receives one plain white wrap. There are some generated seating
and camera differences between compositions; these are cutscene stills, not
registered frames for hand animation.

The dialogue now includes player-advanced quiet beats for the room introduction,
offering the wrist again, and departure. Other lines cut between hand inserts,
Guido's reaction, the original trainer layer and the two-shot. Lower dialogue
panel starts at y=440 to preserve hand action. No new dialogue was invented.
A “few minutes later” card establishes an offscreen costume change before
Guido stands in wine-red trunks, black boots with cream laces and one taped
right wrist. Continue at the preparation checkpoint restores this departure
composition. Reduced motion disables camera movement in both exterior and room.

Validation passed: production build, browser walkthrough of all eleven generated
arrival/room shots, linear dialogue progression, Continue restoration, scene
cleanup and reduced motion. Tape, reaction and departure compositions visually
inspected at 960×600; dialogue leaves the hand actions and faces visible.

Remaining work: user review of new shots, production cleanup / registered
animation planes if wanted, authored character motion, licensed sound effects,
corridor-to-ring and broadcast transition, and playable first campaign match.

---

# Arrival art pass — October 13, 2026

Five built-in imagegen illustrations are now available as review candidates:
`arrival-bus-step-v1.jpg`, `arrival-walk-v1.jpg`, `arrival-first-sight-v1.jpg`,
`arrival-guido-closeup-v1.jpg`, and `arrival-side-door-v1.jpg` under
`src/assets/story/`. Full PNG originals are preserved in ignored
`Sprite sheets/Story/marigold-arrival/source-masters/`. Prompts, reference roles,
and limitations are recorded in `src/assets/story/marigold-arrival-v1.manifest.json`.

Guido's approved October 7 cinematic face and medium masters supply identity;
the existing exterior supplies architecture. The side-door image uses the
approved trainer identity with a more drawn treatment; it does not replace
his master. These are finished compositions for review, not registered parallax
planes. Dry-pavement prompts still produced some glossy highlights; bus and
service-door details are plausible fictional staging, not documented reconstructions.

New Game now shows the live exterior queue, bus step, walk insert, first sight,
Guido close-up, then the side-door exchange before the trainer scene. Each still
has a restrained 4% push, disabled for reduced motion. Text remains editable;
Enter/click advances, S skips arrival, Escape restores title. Sound cues remain
silent. The existing trainer room composition and campaign preview endpoint
remain in use. No character movement is implied inside these flattened stills.

Validation passed: production build and browser walkthrough of all five textures,
arrival-to-room transition, Continue, title reset, and reduced motion. Close-up
and door compositions inspected at 960×600.

---

# Opening cinematic staging — October 13, 2026

New Game begins with an unobscured exterior establishing view and the existing
animated queue. Enter/click advances through the text arrival beats; S skips
to the dressing room. The camera makes modest pushes; reduced motion disables
these. Bus and Guido-specific shots still need approved artwork.

The dressing-room background and approved trainer master now load in Phaser as
separate layers. A 12-second 4% push accompanies the revised conversation,
with dialogue in a lower panel. Guido remains offscreen. There is no mouth,
hand, or wrist-taping animation. Conversation advances directly to preparation;
the earlier branching choice is deferred. Continue restores room staging.
Escape returns to title and resets the camera and room visibility.

`story-cue` scene events expose named silent cues for future licensed effects:
exterior crowd, bus arrival, street footsteps, service door, muffled room crowd,
and speaker lines. No audio assets or playback have been added.

The first-match rule is now loss advances / win ends the run and requires a
restart. This is recorded in STORY_MODE_SCRIPTING.md; the preview still ends
before the playable campaign match, so result enforcement remains future work.

Validation passed: `npm run build`; `node tools/debug/title_opening_proof.mjs`
(queue, arrival camera, layered trainer dialogue, linear progression, Continue,
cleanup/re-entry, reduced motion, and no page exceptions). Trainer composition
visually inspected at 960×600. Existing arena mask warnings remain.

---

Earlier implementation record (superseded where changed above):

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

`src/scenes/TitleStreet.js` owns a six-person entrance queue and a brief
single-bulb flicker. Front patrons enter one at a time; remaining patrons step
forward with staggered delays, stop in standing poses, and a newcomer joins the
tail. Two sprite models are reused with tonal variation and decreasing size
near the doorway. Queue slots and timings are authored in canvas coordinates.
Scene shutdown cancels timers/tweens and clears actors and queue references.
Reduced motion keeps the queue still and disables flicker and the camera push.

Cars are on hold: neither parked nor passing car sprites load in the title.
Their assets and per-car table are preserved for future work. This pass has not
painted a perspective-matched parked car. No street or character audio yet.
Runtime queue sheets are 896px wide, resized with premultiplied alpha. Full
masters are ignored. Full prompts: `src/assets/story/marigold-queue-v1.manifest.json`.

Latest queue handoff: `AI_HANDOFF_ENTRIES/2026-10-11-codex-marigold-queue-animation.md`.

Branch and integration instructions: `AI_HANDOFF_ENTRIES/2026-10-11-codex-layered-marigold-opening.md`.

Current validation: Vite production build; `node tools/debug/title_opening_proof.mjs`
checks queue admission, advancement, replenishment, standing/walk poses,
arrival camera, Exhibition cleanup,
title re-entry, reduced motion, and browser exceptions. Screenshots at 960 × 600
are written under ignored `tools/debug/shots/title-opening/`.

Earlier preview notes recorded 565 Node tests and a fuller booking/save
walkthrough; those were not rerun for this layered-art change.
