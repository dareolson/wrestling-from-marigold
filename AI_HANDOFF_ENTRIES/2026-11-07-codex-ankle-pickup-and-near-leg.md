# Ankle lock: collect the boot before lifting — Codex, 2026-11-07

Derek on e0294f8: the near leg still goes beneath the torso; the attacker wills the receiver toward him instead of going to grab the leg. This supersedes the prior contact-only candidate. Uncommitted for Opus review, no promotion.

[Normal-speed four-case loops and pickup stills](../research/animation/light-moves-2026-11/codex-ankle-entry/index.html) · [Audit JSON](../research/animation/light-moves-2026-11/codex-ankle-entry/measure.json) · [Previous T2.2d page](../research/animation/light-moves-2026-11/t2-2d/index.html)

## What caused the reports

- The previous defender track raised the leg in .0–.3 s at a separation of 210, then moved the receiver from x210 to x68 in .3–.6 s, with the attacker at x0. Release moved the receiver back out. Moving the leg before contact and translating the receiver created the remote pull.
- The layer order tested the legs against the **attacker's** torso but left the **receiver's** torso/trunks outside the chain. Thus passing the old depth test did not establish that the trapped near leg cleared both bodies.

## Candidate

- Capture actual entry separation once in `_doAnkleLock`, and register a per-play `ankleLockEntryClip(distance)`. The receiver keeps that x for the entire clip, including release; entry no longer resets him to a canned separation. This changes only the opt-in ankle lock, without changing shared staging behavior.
- Attacker moves to the grounded boot in .0–.3 s and crouches down to it. Receiver stays flat with the trapped leg down until .3. Painted heel/toe grips close by .3; the lift follows during .3–.6. Attacker rises into the previous upright held pose. An intermediate .45 key keeps the far elbow from overfolding during the rise.
- Plant the attacker from .6–.7, after the approach, instead of pinning his feet during it. End hold/release timing remains 2.7/3.1; all three squeeze events and damage unchanged.
- Include receiver torso, head and arms explicitly in the layer chain; both near legs and the trapped boot clear both torsos. Keep the attacker's far arm behind his torso and near arm over the boot.
- No PNG changes. Still `?light=v1`; flag-off clip unchanged. The default preview clip also uses the new approach rather than retaining the remote pull.

## Checks and review limits

Node22 focused tests: `node --test tests/ankleLockV2.test.js tests/animationClip.test.js tests/clipLayers.test.js tests/moveRuntime.test.js` — **33/33**. Includes receiver position throughout playback at four entry separations, down-before-grab, lift-after-grab, and both near legs above both torso/trunks stacks in both facings. `git diff --check` passes.

Browser audit: real executor, centered ring, Lou→George and George→Lou, both facings, 60 Hz with 30 fps review loops. Results, all four cases: receiver world travel **0 px**; painted-palm contact from grab through lift (.3–.6 s) max **4.59 px** Lou→George / **4.07 px** George→Lou, under the 6 px bar. Held .6–2.7 s both hands round to **0.00 px**. Both added near-leg depth checks pass **127/127** held frames. **0 seam failures, 0 pinned frames**, planted interval worst slide **0 px/frame**. Whole-clip trapped-leg overlap with attacker legs remains 48 frames / 905 px max (Lou) and 45 / 924 (George); the old 0-overlap result came from lifting the leg remotely before moving the receiver. Full numbers are on the linked page/JSON. The audit now records the pickup trace and receiver travel, checks the receiver torso too, and derives the planted interval from the clip instead of assuming .4 s.

Derek judges the new pickup and footwork. Entry/release leg overlap remains a review item; this is not G2 approval or completed bent-boot art. The deeper pickup is brief; held torso bend stays .25. Review the action at normal speed, especially the grounded pickup, rise and release, rather than approving only a held still.
