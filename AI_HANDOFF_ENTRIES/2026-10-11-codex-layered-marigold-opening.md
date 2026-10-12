# Layered Marigold opening — Claude integration handoff

Branch: `story/marigold-opening`
Base: `4af3703` on `thesz-v2-profile-normalization`.

## User intent

Build the opening title screen around the real historical Marigold building,
romantic but grounded in 1952 Chicago. User supplied a current church photo
and an older nighttime facade photo. The older photo controls the steep left
gable, tall arched window, and long hall receding right. Its exact date and
whether it shows the same side as the church photo remain unverified.

Preserve a glowing marquee even where that requires artistic interpretation.
Copy: MARIGOLD GARDENS ARENA / TONIGHT: / WRESTLING FROM MARIGOLD.
Gardens is plural. Sources attest Marigold Gardens and Marigold Arena; the
combined wording is descriptive, not verified historical marquee copy.
User explicitly permits baked lettering, overriding initial art guidelines.

## Working implementation

- `src/main.js`: normal launch opens FrontDoor; Arena remains scene index zero.
  `?arena=1`, character, time-scale, and lighting parameters open Arena directly.
- `src/scenes/FrontDoor.js`: title/menu and existing arrival/booking preview.
  Continue saves only booking/accepted-booking stages. This is not a playable
  Guy campaign; the preview completion offers the existing Exhibition roster.
- `src/scenes/TitleStreet.js`: reusable street layer parented to the shared
  background container. Positions use 960 × 600 coordinates. Owns two parked
  cars, two static waiting groups, lateral passes cycling three side-profile car models,
  a four-frame walking patron fading through the doorway, and
  one brief bulb flicker. Intervals are intentionally sparse and irregular.
  Scene shutdown cancels timers and tweens and destroys actors. Reduced motion
  disables traffic, walking, flicker, and arrival push.
- `tools/debug/harness.mjs`: existing match tools explicitly append `arena=1`.
- `tools/debug/title_opening_proof.mjs`: separate title browser walkthrough.
  Intercepts the Phaser CDN request with the installed same-version script
  for offline verification; production index.html stays as it was.

## Assets and review

Runtime assets under `src/assets/story/`:

- `marigold-title-clean-v1.jpg` (PNG master in `Sprite sheets/Story/marigold-title/source-masters/`): registered background with exterior cars and
  people removed and hidden sidewalk/doors reconstructed by imagegen.
- `marigold-sedan-v1.png`: original burgundy side-profile sedan.
- `marigold-sedan-cream-v1.png`: cream/tobacco four-door sedan.
- `marigold-coupe-green-v1.png`: forest-green two-door coupe.
  Per-model master geometry is in `src/scenes/titleCars.js`. Hub crops scale
  to runtime texture width; car bodies explicitly request `__BASE`.
- `marigold-patron-walk-v1.png`: 2081 × 756, four frames in one horizontal row.
  Runtime slices by quarter-width. Gait and alignment remain generated donor
  quality; needs artist animation cleanup before calling it final.
- `marigold-waiting-patrons-v1.png`: transparent group, used twice at different
  scales and directions. Replace one group later to reduce repetition.

Original paintings v1–v3 are preserved locally in `Sprite sheets/Story/marigold-title/`
(untracked, like other source art); their prompt manifests are in
`research/marigold-title-art/`. (Moved out of `src/assets` in review.)
The layers manifest records all built-in imagegen prompts and reference roles.
Historical research: `research/marigold-title-reference.md`.
Do not claim the added marquee or exact 1952 elevation is historically proven.

## Validation and integration

Run `npm run build` and `node tools/debug/title_opening_proof.mjs` (local port
5207 and system Chrome required). Browser proof checks advancing street actors,
walk-frame use, full car frame, constant traffic depth/scale, each model at 4× size with hubs rotated,
the 4% arrival push, Exhibition shutdown,
title restart, reduced motion, and zero page exceptions. Screenshots go to
ignored `tools/debug/shots/title-opening/`; inspect them, not only assertions.

Existing Phaser mask warnings occur in Arena and are outside this change.
No new audio yet. The rest of the bus-arrival storyboard is still text panels.
The walking path and generated cutouts are prototypes; retain easy authoring
of placement, scale, and intervals when polishing. Preserve menu readability.

This branch includes opening-related commits only. Uncommitted wrestler rig,
move-editor, tests, and forearm artwork already existed when the branch was
created; they remain in the shared working directory and MUST NOT be bundled
into opening integration. Inspect `git status` before staging or switching.
Use the opening commit for cherry-picking into a clean integration branch.
No remote push, merge, or message to Claude has been performed.

## Current traffic revision — ready for Claude review

Derek chose Claude's side-profile recommendation after reviewing the angled
prototype. This revision follows the pasted car brief: right-facing profiles,
transparent backgrounds, circular visible hubs, one per-car geometry table,
parked tyres at 466 and passing tyres at 486. Models cycle per spawn rather
than repeating one sedan. People/cars layers and reduced motion remain intact.

Generated cream-sedan and green-coupe masters are untracked under
`Sprite sheets/Story/marigold-title/source-masters/`; runtime exports are
460 × 230 with premultiplied-alpha Lanczos resizing. Prompts are in
`src/assets/story/marigold-side-profile-cars-v1.manifest.json`. Measurements in
`titleCars.js` are master pixels, independent of runtime export resolution.
All three models use the same registration and wheel-rotation implementation.

The browser walkthrough writes `side-profile-traffic.png` and six enlarged
hub review screenshots (`car-{0,1,2}-hubs-{0,90}.png`). Node 22.23.1 npm test,
build, and browser proof pass. Review these screenshots before publishing.
The diagonal traffic and three-quarter assets are no longer loaded. Local
rejected drafts and masters are preserved under ignored Sprite sheets; their
manifest is archived under `research/marigold-title-art/`.

No push. Claude should review this local branch before anything is published.
The booking-dialogue approval item in Claude's original review is still open;
this vehicle pass does not resolve or change it.
