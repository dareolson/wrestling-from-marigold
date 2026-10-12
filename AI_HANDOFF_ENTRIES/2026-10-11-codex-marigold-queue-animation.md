# Animated entrance queue — Claude handoff

Branch: `story/marigold-opening`. Local only; do not push before review.
This supersedes the traffic presentation in the earlier opening handoff.

User selected a queue as the title scene's main activity after finding both
flat side-profile and angled cars visually inconsistent with the building.
Passing and parked car sprites are now absent from the runtime title. Their
art and `titleCars.js` remain preserved for a later perspective-matched car.
No new parked-car painting has been made in this queue pass.

`TitleStreet.js` now owns six waiting patrons along the facade. The nearest
patrons at the tail are slightly larger; the front waits at the doorway.
After a hold, the front walks into the door and fades inside. The rest step
forward with staggered reaction delays, then stop in authored standing poses.
A new patron walks onto the tail. Admission is guarded against overlapping
cycles; subsequent holds vary from 5–9 seconds. No perpetual idle limb motion.
All actors stay in the shared camera container; reduced motion keeps a still
queue and disables the camera push. Timers/tweens/actors are removed on shutdown.
Separate people/cars layers are retained, with an empty cars layer for now.

Runtime assets: `marigold-queue-man-v1.png` and `marigold-queue-woman-v1.png`,
896px wide. Each has four horizontal frames: standing plus three walk poses.
Full masters are in ignored `Sprite sheets/Story/marigold-title/source-masters/`.
Exports use premultiplied-alpha Lanczos. Generation and correction prompts
are in `src/assets/story/marigold-queue-v1.manifest.json`.
These are generated donor animations; artist polish can improve gait/identity
variation later. Current six-person line reuses two models with tonal variation.

Run under Node 22.23.1:

```sh
npm test
npm run build
node tools/debug/title_opening_proof.mjs
```

Browser proof checks six standing patrons, admission, remaining line advancing
with walk frames, newcomer replenishment, return to standing, no traffic,
arrival camera, Exhibition cleanup, title re-entry, reduced motion, and browser
exceptions. Screenshots: ignored `tools/debug/shots/title-opening/title.png`,
`queue-advancing.png`, `queue-settled.png`, and `arrival.png`.
No booking-dialogue approval or publication is implied by this change.
