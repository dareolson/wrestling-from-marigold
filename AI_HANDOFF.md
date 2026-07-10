# AI Handoff — Wrestling from Marigold

Shared project notebook for Derek, Claude, and Codex.

## Protocol

- Read this file before proposing architectural or gameplay changes.
- Add new dated entries at the top of the Handoff Log.
- Identify the author as Derek, Claude, or Codex.
- Do not silently replace prior decisions; record what changed and why.
- Link focused commits and include test commands and results.

## Roles

- Derek: creator and art director
- Codex: technical lead and game-systems designer
- Claude: reviewer and technical director

## Priorities

1. Game feel
2. Wrestling psychology and match drama
3. Emergent storytelling
4. Architecture

Avoid a large rewrite.

## Active assignment — Phase 0, Task 1

Extract only the decision portion of `Wrestler.tryPower` into
`src/logic/moveDecision.js` as a pure exported function such as
`resolvePowerMove(context)`.

Requirements:

- The new module must have no Phaser dependency.
- Preserve all existing behavior and numerical boundaries exactly.
- Preserve `<` versus `<=`, state conditions, scaling, availability checks, and fallback order.
- `Wrestler.js` gathers runtime data, calls the resolver, and executes through existing methods.
- Use Node's built-in `node:test`; do not add Vitest.
- Add table-driven tests for every opponent-state branch.
- Test immediately below, exactly at, and immediately above each distance threshold.
- Test unavailable moves and fallback ordering.
- Do not change AI, shared constants, animations, tweens, timing, damage, or state transitions.
- Do not fix reach-range drift or include the separate AI lockup fix in this commit.

Suggested files:

- `src/logic/moveDecision.js`
- `tests/moveDecision.test.js`
- `src/Wrestler.js`
- `package.json`

After implementation, add a handoff entry containing changed files, commit SHA,
exact tests and results, browser verification, and unresolved questions.

## Clarifications

AI should eventually share authoritative range and move data with Wrestler, but AI
should not call `resolvePowerMove`; tactical selection and player move execution are
different decisions.

For Phase 1, prefer an instance seam such as `wrestler.setState(next, opts)` unless
the code clearly favors another design.

## Gorgeous George v1

The current rig expects six assets in `src/assets/wrestlers/george/`:
`head.png`, `torso.png`, `upper_arm.png`, `forearm.png`, `thigh.png`, and
`shin.png`. Expression and hand/foot swapping are not supported by the current
`Skeleton.js` and are not v1 requirements.

## Handoff Log

### 2026-07-10 — Claude (asset-pipeline tooling session)

Reviewed the first Codex-generated art drop in `WrestlerPNGs/` (a ChatGPT
image-gen composite) against `DRAWING_GUIDE.md` — rejected. It was one
flattened reference sheet, not six transparent PNGs: no alpha channel, three
of six canvas sizes wrong, pivot markers/labels baked into the image as
literal text, parts drawn independently rather than cut from one full-body
neutral pose, and the forearm bent instead of hanging straight with a flat
top edge. Conclusion: image generators are good at concept art, not reliable
asset exporters — decided with Derek to keep hand-cutting layers in
Procreate (as this guide already prescribes) rather than asking an image
model to also do the exporting.

Built `tools/wrestler-cutter/index.html` — a standalone, dependency-free
browser tool (open the file directly, no build step). Drop each rough
hand-cut transparent layer per part; it auto-crops to content, scales/pads
to the exact spec canvas per part, flushes the pivot edge (top for
torso/arms/legs, bottom for head), and warns if the forearm/shin's top edge
isn't fully opaque (the elbow/knee joint-seam rule) or if non-pivot padding
is under 20px. Outputs correctly-named, correctly-sized transparent PNGs
ready for `src/assets/wrestlers/<slug>/`. Verified with a headless Playwright
script exercising both pivot directions and the opaque-cap warning before
handoff — see commit for the tool itself (test script was scratch-only, not
committed).

**Coordination note:** this session only touched `AI_HANDOFF.md` (this entry)
and `tools/wrestler-cutter/`, both committed and pushed. Found the working
tree already carrying substantial uncommitted work from other concurrent
sessions (art-pipeline session's `Arena.js`/`george.js`/head.png texture
wiring below, and what looks like a separate movesets session's changes to
`MOVES.md`/`AIHandler.js`/`Wrestler.js` for a Thesz press). Deliberately left
all of that untouched and unstaged — didn't write it, haven't verified it,
and the art-pipeline entry below has an open question for Derek (head
redraw) that shouldn't get swept into an unrelated push. Flagging per this
file's own protocol: whoever owns those diffs should commit them explicitly
rather than relying on a future broad `git add`.

### 2026-07-10 — Claude (art pipeline session)

First George asset landed: `src/assets/wrestlers/george/head.png` (uncommitted
in the working tree — not yet staged/committed by this session; be aware if
another session runs a broad `git add`). Wired via a new `textures:
george.textures` field on `PRESETS.george` and a `c1.textures ?? {}` /
`c2.textures ?? {}` arg added to both `new Wrestler(...)` calls in
`Arena.js`'s `_setupGame()` — previously `Wrestler` was never passed a
`textures` object at all, so every wrestler always rendered as the Graphics
placeholder no matter what was preloaded. Also fixed `Arena.js` preload
(`this.load.image` path was missing the `src/` prefix, 404ing to the SPA
fallback HTML under Vite dev — no PNG could ever have loaded before this).
Verified via `w2.skeleton.head.texture.key === 'george_head'` at runtime
(`scene.textures.exists()` alone only proves the preload succeeded, not that
a wrestler is using it — learned that the hard way mid-session).

Derek's first head drawing was flagged twice by playtest: mirrored (art faced
left; `Skeleton.js` line 334 requires "PNG is drawn facing right" since only
one PNG is drawn and the engine mirrors it per-facing) — flipped in place,
cheap fix. Second issue is not code: it's a pure side profile, not the
three-quarter view `DRAWING_GUIDE.md` specifies (both eyes visible) — reads
narrow/small against the fixed head display box (`headR*2.0 × headR*2.5` in
`Skeleton.js`). That's a redraw, flagging for Derek rather than deciding
unilaterally.

**Coordination note:** touched only `Arena.js`'s `_setupGame()`
(PRESETS/Wrestler-construction block) and `preload()` — no overlap with Batch
A's `_tickLockup`/`startClotheslineFall`/etc. below. Also noticed this file
got edited concurrently mid-session (lost an initial write, had to re-read) —
this and the feel-audit session are sharing one working directory, not
separate worktrees, so uncommitted changes from both are interleaved on disk
right now.

### 2026-07-10 — Claude (feel-audit session)

FEEL_AUDIT Batch A landed: six commits `6d581d4..92815cd`, all on master and
pushed. Full results in FEEL_AUDIT.md "Batch A results" addendum + BUILDLOG
2026-07-09/10 entry. Summary:

- `AIHandler.justDown` now **consumes presses on read** (keyboard parity).
  Anyone writing input-adjacent code: never read `justDown` twice for the
  same action in one frame — the second read is false by design, on both
  keyboard and AI paths.
- `_handleLockup` runs on its own `_lockupBeat`, not the global `_cooldown`
  (which the lockup-initiating grapple press sets past the lockup window).
- Lockup follow-ups bump heat via `_heatForMove`.
- Five unclamped positioners clamped (clothesline fall, piledriver seat,
  lockup drift, suplex landing, dropkick attacker landing). Probe OOB is ≈0;
  keep it that way — any new tween that moves `x`/`y` needs a
  `ringBoundsAtY` clamp (60·s margin if the body ends up flat).
- Verification: `npm run debug:play -- all` 12/12 after every commit; 12
  AI-vs-AI probe matches analyzed (`tools/debug/psych_probe.mjs` +
  `psych_analyze.mjs`, now committed).

**Coordination:** the tryPower extraction (Phase 0 Task 1) does not collide
with any of this — Batch A touched `startClotheslineFall`, `_doPiledriver`,
`_doSuplex`, `_doDropkick`, `AIHandler`, and Arena's `_tickLockup` only. Base
it on `92815cd` or later. Note FEEL_AUDIT Batch B (queued next) WILL touch
`Wrestler.js` movement/velocity code and MOVE_DEFS timing — sequence
accordingly.

**Open design question for Derek before Batch C:** Thesz/George now goes to a
10:00 Broadway every time — matches are dramatic (heat peaks 100) but nobody
can close. The closing tools are C1 (kickout depth curve) + C2 (finish
hunting); the relevant booking knobs are `_handleLockup`'s `< 40` plain-slam
threshold and the personalities' `coverStamina`.

Also: DRAWING_GUIDE.md's v1 naming section shows `[character]_head.png` but
its own loader note (and `Arena.js`) reads plain `head.png` etc. from the
character folder — the prefix is wrong; whoever next edits the guide should
fix that section.

### 2026-07-10 — Claude

Holding off on Phase 0 Task 1 (`resolvePowerMove` extraction) — a separate
Claude session is concurrently working on movesets in this repo. Task 1 edits
`src/Wrestler.js`'s `tryPower` method directly, so pausing until that work is
confirmed not to touch `tryPower`/`MOVE_DEFS`/the jab-headbutt-elbowDrop-dropkick
branch, or until it lands and is committed. Will resume once Derek confirms
clear.

### 2026-07-10 — Codex

Reviewed Claude's architecture audit. Approved the conservative phased direction
with the corrections above. Claude should review this active assignment before
implementing or proposing changes.
