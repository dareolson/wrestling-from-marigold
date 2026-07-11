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

### 2026-07-10 — Claude (session close-out: pending work landed + Phase 0 Task 1 done)

Picked this up with the working tree already carrying two other sessions'
verified-but-uncommitted work (see the two entries below this one) plus this
file's own uncommitted log entries. Before starting anything new, ran
`debug:play -- all` (12/12) and `npm run build` against that combined state,
then committed it as `a6938ac` (Thesz press finisher + George head texture
wiring) and `0bc37a5` (this file's pending log entries). Deleted
`WrestlerPNGs/` (the rejected Codex art drop flagged safe-to-delete in the
entry below).

**Phase 0 Task 1 (`resolvePowerMove` extraction) — done, commit `9c9f18e`.**
Delegated to a Sonnet subagent working in its own git worktree (branch
`task1-resolve-power-move`, off `0bc37a5`) rather than the shared working
directory, specifically to avoid the interleaved-uncommitted-diffs problem
this file already documents. Reviewed the diff personally against every
constraint in the "Active assignment" section above before merging:

- `src/logic/moveDecision.js` — new pure `resolvePowerMove(context)`, zero
  Phaser import, takes `{ dist, scale, otherState, moveSet }`.
- `Wrestler.tryPower` keeps the `state !== 'standing'` guard, the
  `input.justDown('power')` check, and the `Phaser.Math.Distance.Between`
  call — only the four-branch move selection moved out. Dispatches on the
  resolver's return string via `switch` to the same `_do*` methods, same
  return values as before.
- `<=` vs `<`, branch order (headbutt → elbowDrop → jab → dropkick → false),
  and all three thresholds (`jabReach`/`reach`/`medReach`, `* scale`) are
  verbatim copies — confirmed by diff, not just by test pass.
- `tests/moveDecision.test.js`: 43 `node:test` cases — every branch,
  unavailable-move fallthrough, priority-order cases, and below/at/above
  boundary checks for all three thresholds at scale 1 and scale 2.
  `package.json`'s `test` script now runs `node --test "tests/**/*.test.js"`
  (a bare directory arg 404s on this Node version's test-runner glob —
  confirmed, not a mistake).
- Did not touch `AIHandler.js`, other `tryX` methods, animations/tweens/
  timing/damage, the reach-range-drift note, or the AI lockup logic — all
  correctly out of scope per the assignment.

Independently re-ran (not just trusting the subagent's report): `npm test`
(43/43), `npm run debug:play -- all` (12/12), `npm run build` (succeeds) —
all pass in the merged tree at `9c9f18e`. Fast-forward merged to master,
worktree removed.

**Pushed to origin/master** (`e894d1a..0dad564`, includes this file's own
`817b883`/session-close-out entry and the `0dad564` BUILDLOG entry) — Derek
confirmed. Anyone resuming should `git pull` before assuming their local
`master` is current.

**Skipped, deliberately, not forgotten:** Batch C (kickout depth curve /
finish hunting) — still an open design question for Derek, not mine to
decide. Batch B (accel/hitstop/gravity) — queued but broad and needs human
playtest per this file's own priorities, not part of this file's one
concrete active assignment. The George head redraw and the `DRAWING_GUIDE.md`
`[character]_head.png` naming-prefix fix are still open — the naming fix is
trivial enough to just do inline next time someone's in that file, not worth
a dedicated pass.

**Open**: no new "Active assignment" queued after Task 1 — Derek/Codex should
set the next one (Task 2? Batch B/C decision?) before more code work happens
here.

### 2026-07-10 — Claude (art pipeline session, wrap-up)

Session ending (Derek closing this tab) — leaving state for whoever picks this
up next.

**head.png resize/recenter (since the last entry below):** Derek flagged the
landed head as "wrong size, not situated over his shoulders, needs to be
bigger and wider" — the neck length is intentional (drawn long on purpose so
it stays covered by the torso through the full animation range, not a
mistake). Root cause found: my crop centered on the full hair+face bounding
box, but the hair bulges out ~2.3x further on one side than the face does on
the other (122px vs 286px from the neck's own x-center to each bbox edge) —
so bbox-centering put the actual neck 32px (16% of the 200px canvas) off from
where `Skeleton.js` assumes it sits (`setOrigin(0.5,1)`, i.e. dead-center).
Fixed by re-cropping symmetrically around the neck's own x-position instead
of the bbox, and tightened non-pivot padding from ~25px avg down to
6-12px (below `DRAWING_GUIDE.md`'s 20-30px generic-part guidance —
deliberate, Derek explicitly asked for bigger/wider, and heads rotate far
less than limbs so the rotation-clipping padding rationale applies less
here). Drawn content went from 150×137 (off-center) to 188×122 (centered).
Verified: neck x-center now 101.5 vs canvas center 100 (was 132 vs 100), and
visually confirmed in a live screenshot against P1's placeholder head for
scale reference. `head.png` is still uncommitted.

**"My match died" — diagnosed as environmental, not a code bug.** Ran
`debug:play -- all` twice back-to-back; got different, non-reproducible
failures each time (`Cannot read properties of null`, `Execution context was
destroyed, most likely because of a navigation`). Checked file mtimes
mid-investigation and caught `src/scenes/Arena.js` being modified three times
in a 12-second window by what's now confirmed to be a concurrent movesets
session — this matches the known hazard already on record in project memory
("don't edit src/ while a probe is running — Vite HMR reloads mid-run and
corrupts it"). Two-plus sessions are sharing one working directory (not
worktrees), so any dev-server tab open during another session's save gets a
live HMR reload, which can corrupt or freeze a match in progress. Did not
chase this further as a code bug — told Derek to retest with a fresh
`npm run dev` once edits settle, and to report back if it still dies with no
concurrent writes happening. If it recurs under that condition, treat it as
real and start from `debug:watch`/`debug:probe`, not `debug:play` (which
itself is now polluted by this same hazard and unreliable to run while others
are editing).

**Current uncommitted working-tree state at handoff (from `git status`):**
modified `MOVES.md`, `src/AIHandler.js`, `src/Wrestler.js` (not this
session's — presumably the movesets/Thesz-press session below), plus this
session's `src/characters/george.js`, `src/scenes/Arena.js` (textures wiring
+ preload path fix, see entry below), and untracked `src/assets/` (George's
`head.png`) and `WrestlerPNGs/` (rejected Codex art drop, still sitting
there — safe to delete, already superseded by the Procreate+cutter workflow).
Nothing from this session is staged or committed. Whoever resumes: `git diff`
before assuming a clean baseline.

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
