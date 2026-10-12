# 2026-10-11 — Claude: review of the layered Marigold opening (Codex, 8c40b40)

Derek asked for this review before anything ships ("i only wanted codex to
build it but for you to review it before deploying"), then asked me to fix
every finding. Status: fixed locally on `story/marigold-opening`, rebased onto
the pushed `thesz-v2-profile-normalization` (efc2024). **Not pushed** until
Derek has looked and confirmed item 6.

## Verified working as built

Proof script passes; no page errors; Exhibition from the title starts a clean
match; direct `?p1=` / `?arena=1` links still open the arena (the harness
appends `arena=1`). The handoff is honest about what is unverified history.

## Findings and fixes

1. **Unused reference paintings in `src/assets` (8.2 MB).** v1–v3 were never
   imported. Codex's commit was AMENDED, before any push, to keep them out of
   history. They now live locally in the untracked
   `Sprite sheets/Story/marigold-title/`, and their prompt manifests are in
   `research/marigold-title-art/` with paths updated. The amend touched no
   runtime code or assets and says so in its message.
2. **Title screen loaded 6.8 MB of images** for sprites shown at most 230 px
   wide. They are now display-sized at about 2–2.5×. Alpha was resized
   premultiplied (no dark fringes), and the background is now a q88 JPEG at
   full 1586×992. Total is 0.83 MB. Full-resolution masters are in
   `Sprite sheets/Story/marigold-title/source-masters/`. Sedan hubcap
   geometry stays in master pixels (`SEDAN_MASTER_W`) and scales to the
   loaded texture, so a re-export needs no coordinate edits.
3. **Cars were parked on the sidewalk.** Tyres were at about y 440 and the
   curb is at about y 452. Cars are now placed by tyre line: parked at
   y 466, the passing lane at y 486. The arrival screen no longer reads as
   the passing car driving through the parked one.
4. **Draw-order bug.** All actors went into one container in insertion order,
   so a patron spawned during a car pass drew over the car. People and cars
   now have separate containers, with cars in front.
5. **Waiting crowds were squashed about 25%.** A near-square image (1.03) was
   drawn at 64×83 (0.77). It now scales by height and keeps its proportions.
6. **OPEN, for Derek:** the booking dialogue ("take the fall", "you'll never
   work here again", "trust you with his body") is not in
   STORY_MODE_SCRIPTING.md or INTRO_STORYBOARD.md. Derek must confirm it is his,
   or approve it, before it ships. Do not attribute it to him until then.
7. **Arena booted behind the title.** It was listed first and stopped in
   postBoot, but its preload still downloaded about 36 wrestler images.
   `main.js` now orders scenes by launch mode: title first on normal
   launches, Arena first for direct and debug launches (tools read
   `scenes[0]`). The title now requests only its own four images.

Verification (Node 22.23.1): `npm test` 567/567, build OK, title proof PASS,
title boot loads no wrestler files and Exhibition works, the direct `?p1=`
link plus F then H plays Derek's WIP hammerlock. Screens were inspected by
eye, including a 4× check of hubcap registration on the downsized sedan.
