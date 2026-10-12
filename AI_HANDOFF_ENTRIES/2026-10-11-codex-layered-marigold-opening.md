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
  sedans, two static waiting groups, an occasional passing sedan with rotating
  hubcap crops, a four-frame walking patron fading through the doorway, and
  one brief bulb flicker. Intervals are intentionally sparse and irregular.
  Scene shutdown cancels timers and tweens and destroys actors. Reduced motion
  disables traffic, walking, flicker, and arrival push.
- `tools/debug/harness.mjs`: existing match tools explicitly append `arena=1`.
- `tools/debug/title_opening_proof.mjs`: separate title browser walkthrough.
  Intercepts the Phaser CDN request with the installed same-version script
  for offline verification; production index.html stays as it was.

## Assets and review

Runtime assets under `src/assets/story/`:

- `marigold-title-clean-v1.png`: registered background with exterior cars and
  people removed and hidden sidewalk/doors reconstructed by imagegen.
- `marigold-sedan-v1.png`: transparent late-1940s-style sedan, 1774 × 887.
  Runtime derives two 122 × 122 hubcap frames; body MUST request `__BASE`
  explicitly because adding frames changes Phaser's default frame.
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
walk-frame use, full sedan body, the 4% arrival push, Exhibition shutdown,
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
