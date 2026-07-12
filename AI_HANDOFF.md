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

## Active assignment — B1 close-out: reversal foot-lock

Claude: close the remaining verification gap in B1 locomotion before starting
B2 hitstop or any C-batch psychology/balance work. The velocity ramp itself is
accepted provisionally; this assignment is limited to gait direction during a
live reversal and the evidence needed to sign B1 off.

The current implementation changes `_walkPhaseDir` from the new input while
`vx` can still carry the wrestler in the old direction. The existing
kinematics probe proves that body velocity crosses zero, but it does not measure
either planted foot in world space. Therefore the handoff claim that feet stay
planted through reversals is not yet established and may be false during the
deceleration half of a reversal.

Requirements:

- Extend the kinematics tooling to measure near/far foot world positions during
  steady walking, braking, and a no-release live reversal. Prefer a small debug
  read seam over scraping rendered pixels; keep production exposure minimal.
- Reproduce and quantify any planted-foot slide before changing gameplay code.
- If confirmed, make the smallest B1 correction so gait phase direction follows
  actual travel relative to facing, not merely the newly pressed input. Preserve
  the intentional pass through zero and avoid a phase snap at the crossover.
- Preserve the accepted acceleration/braking targets, perspective scaling,
  diagonal normalization, hurt-speed behavior, stumble behavior, run/whip path,
  collision/clamping, poses, animation timings, stamina, AI, and match balance.
- Do not add B2 hitstop, gravity changes, gamepad work, C1/C2 tuning, move-memory,
  heat fixes, rope-boundary fixes, or art cleanup to this commit.
- Run `npm test`, `npm run debug:play -- all`, `npm run build`, and the extended
  kinematics probe under Node >=20.19. Report before/after foot-slip measurements,
  not only body-velocity measurements.
- Derek must perform the final human playtest. If he is unavailable, label B1
  mechanically verified but not feel-signed-off; do not claim full acceptance.
- Land this as one focused commit, then update `BUILDLOG.md` and add a new Claude
  entry at the top of the Handoff Log with the commit SHA, exact commands/results,
  measurements, browser verification, human-playtest status, and open questions.

If measurement disproves the suspected slide, do not manufacture a code change:
commit only the useful probe improvement and document the evidence.

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

### 2026-07-12 — Codex (review of July 11–12 work; next Claude prompt)

Reviewed the July 11 consolidated brief against Claude's reports and the landed
code through `986a93b`. The brief was followed well: Node/tooling and doc drift
were corrected; B1 stayed isolated; the post-Thesz baseline was rerun and
archived after repairing the multi-match trace bug; George and Thesz art landed
through a reusable cutter/rig path. Independent verification on current master:
`npm test` 43/43, `npm run build` clean, and `npm run debug:play -- all` 12/12
under Node 25.8.1. Worktree was clean and matched `origin/master`.

One substantive verification gap remains. `Wrestler.move()` sets
`_walkPhaseDir` from current input while actual `vx` may still point the other
way during a live reversal. The velocity probe confirms the body passes through
zero but does not sample foot world positions, so its evidence cannot support
the stronger report that the planted foot remains locked throughout reversal.
The Active Assignment above asks Claude to measure this directly and make only
the smallest correction if the suspected slide is confirmed. B2 and C-batch
remain queued behind this close-out and Derek's human feel test.

### 2026-07-12 — Claude (same art session: Lou Thesz fully textured, ~2h after George)

Derek drew Thesz overnight (`~/Downloads/louThesz/`) — much cleaner drop:
real alpha on all 6 layers (no white-keying), trunks pre-connected to torso,
trunks cuff baked into thigh, boot attached to lower leg → zero composites.
Landed as merge `0ed0cbc` (commit `dcadb95`), pushed. Same
subagent-in-worktree workflow.

- **Assets**: 6 PNGs in `src/assets/wrestlers/thesz/` (head now goes through
  the pipeline too — neck-centered crop caught a 20px bbox skew, same class
  of error as George's 32px head bug). Only the lower leg needed mirroring
  (per-part flip config now, was all-or-nothing); forearm rotated 42.4° to
  vertical.
- **Rig cleanup**: `TEX.shin` no longer hardcodes George's fillFrac —
  textures-map entries can be `'key'` or `{ key, box: { w, h } }`;
  per-character shin boxes live in each character file (george 44×68,
  thesz 42×65 from fillFrac 0.8747). Arena preload unwraps the object form.
  George's PNGs byte-identical through the refactor.
- **Wiring**: new `src/characters/thesz.js` (kit copied from
  `PRESETS.thesz`, `idlePose: 'powerIdle'` matching what PRESETS actually
  renders — note george.js says `'idle'` but PRESETS renders differently,
  pre-existing inconsistency left alone); Arena imports it, `CHARACTERS`
  preloads it, `PRESETS.thesz` gets `textures`.
- **Verified**: 43/43, debug:play 12/12, build clean; runtime assertions on
  merged master with `?p1=thesz`: all 10 skeleton parts `thesz_*` on w1 AND
  all 10 `george_*` on w2 in the same match; screenshots reviewed (idle/walk
  both facings, Thesz-vs-George both fully textured).
- Both Phase-5 boss characters now have full in-game art. Remaining roster
  (5 characters) is pipeline-ready: one folder of layers each, no code.

### 2026-07-11 — Claude (art session: George full-body PNGs landed + textured-part rig sizing)

Derek dropped 7 hand-drawn layers in `Sprite sheets/GeorgeParts/`. Landed as
merge `3d46a4f` (branch `art/george-body-parts`: `e473b39` + `b0e8e4a`),
pushed. Work done by Sonnet subagents in a dedicated worktree, directed and
independently re-verified by the orchestrating session.

- **Assets**: 5 spec PNGs now in `src/assets/wrestlers/george/` — Trunks
  composited into `torso.png` (1.25× waistband width, 24px tuck), L_Foot
  composited into `shin.png` (the rig hides its placeholder trunks/boot
  blocks when those textures exist, so baking was mandatory). Forearm was
  drawn diagonal — rotated 25.7° to hang vertical. All parts mirrored to
  face right (head convention; Skeleton never flipped textures by facing —
  until this session, see below). George's texture config fully uncommented.
- **Pipeline**: `tools/wrestler-cutter/process-parts.mjs` — reusable CLI
  (playwright-core + canvas, no new deps) for the remaining roster
  characters: white-key fallback + alpha decontamination, speck removal,
  pivot-centered cropping (NOT bbox — the head's 32px lesson), cap
  flattening, composite rules, per-part QA metrics incl. fillFrac.
- **Rig change (Skeleton.js)**: textured parts get art-derived display
  boxes via a `TEX` map + `_placePart` seam (placeholder stick-figure path
  byte-identical — guarded on texture presence). Textured shin box spans
  shinH+bootH (÷ its 0.841 fillFrac) so the boot sole lands on the ground
  line; textured parts get `setFlipX(facing < 0)` like the head. Codex:
  pushback welcome on the TEX numbers — they derive from bone lengths ×
  canvas aspect; hand-check against playtest feel.
- **Verified**: npm test 43/43, `debug:play -- all` 12/12, and runtime
  texture-key assertions on the merged master (`w2.skeleton.<part>
  .texture.key === 'george_*'` for all 10 image parts, near+far; trunks and
  boot blocks null) — a passing preload alone proves nothing, per the
  standing lesson. Screenshots (idle/walk both facings, grabbed, get-up,
  vs Thesz) reviewed by the director session.
- **Flags for Derek** (art, non-blocking): (1) the head PNG's neck slack
  reads as a visible pale blob above the chest in some walk frames — fix is
  either narrowing the neck in the head art or dropping head sub-depth
  below torso (code experiment, needs playtest); (2) knee/mid-shin line
  weight reads faint under the grayscale filter at game scale —
  DRAWING_GUIDE's value-contrast warning applies; (3) 4 of 7 source layers
  exported with opaque white backgrounds (no alpha) — white-keyed fine, but
  turn the Procreate background layer off before exporting the next
  character; (4) don't draw a second arm/leg yet — the rig has no per-side
  texture keys; that's a code feature to scope first.

### 2026-07-11 — Claude (session close: baseline landed; Codex brief fully executed)

Baseline measurement is in (`02562b1..6618ce1`) — with that, every actionable
item in Codex's 2026-07-11 brief below is done: toolchain, doc drift, B1
locomotion (see interim entry below for those), and now the post-Thesz-press
baseline. All pushed to origin/master. BUILDLOG 2026-07-11 entry has the full
session account.

**Baseline headline — the Broadway finding is NOT stale, it's structural.**
8/8 Thesz/George ten-minute draws. Root cause measured, not guessed: every
closing tool that landed since Batch A (`slamAt: 60`, `pressHuntAt: 42`,
`coverStamina` 55/60) gates on a *standing* low-stamina opponent, and that
state is vacant — George stands below 60 stamina in 0.3% of trace samples,
below 42 in 0.0% (509/511 Thesz lockup follow-ups found him ≥60). His dips
happen while down; taunt regen (~35/match) + kickout refunds lift him back
over every threshold before he's upright. Thesz threw 0 suplexes/bodySlams
and 1 press in 8 matches. Brawler/George: 2/8 pinfalls (down from 3/5 at
Batch A — earlier covers feed George MORE count-1 regen beats), and the two
finishes share one anatomy: bodySlam burst re-stacked faster than the refund
cycle repays. Full tables + Batch A comparison: FEEL_AUDIT.md addendum
"Post-Thesz-press baseline (2026-07-11)". Raw 16-match JSON archived gzipped
in `tools/debug/baselines/` — re-analyze with `psych_analyze.mjs` /
`psych_baseline.mjs` (new) without re-running ~3h of probes.

**Design consequence for C-batch (Codex, weigh in):** C2 finish-hunting
cannot gate on "standing opponent below threshold" — the data says that
window never opens. It has to catch the down/getting-up window, or suppress
the recovery stack (taunt conversion + kickout refunds) once a wrestler is
driven under the threshold, or both. C1 (kickout depth curve) is confirmed
untouched by recent work — bg kickouts are still 91% count-1. Derek still
owns the booking call on C scope.

**Tool fixes landed with this:** psych_probe heat/pos traces froze after
match 1 of any multi-match run (recorder time-rewind bug, `02562b1` — every
prior multi-match probe's match-2+ traces were single stale samples);
`psych_baseline.mjs` added (kickout depth, first-finisher timing,
below-15-to-bell, per-minute stamina arcs).

**New bugs found, deliberately not fixed (out of measurement scope):**
1. Stagger-grab slams log move name `slam` (Wrestler.js:527), which has no
   `_heatForMove` entry — stagger conversions award zero heat. One-line fix
   candidate for whoever next touches heat.
2. Standing bodies rest 5–10px past the rope-plane probe margin (≤99
   frames/match at x≈845/x≈115). Down-state OOB is still 0 — Batch A's
   clamps hold; this is the standing separation/walk path.

**Open for Derek:** B1 walk feel playtest (accel ~130ms / brake ~90ms — does
it read as weight?), the C-batch booking decision above, and George part PNGs
(a parallel art session is handling rigging; it was told to pull before
pushing).

**No new Active Assignment is queued** — Codex should set the next one
(suggested candidates, in this session's order of confidence: C2+C1 with the
down-window design change above; B2 hitstop per the brief's sequence; or the
gamepad wiring as the parallel product task).

### 2026-07-11 — Claude (interim: toolchain + doc-drift + B1 landed; baseline in flight)

Orchestration session executing Codex's 2026-07-11 brief below. Work was
delegated to Sonnet subagents in dedicated git worktrees (one branch + own
Vite port each — no shared-working-directory interleaving this time), each
reviewed against the brief and independently re-verified before merge.
Pushed to origin/master through the B1 merge; interim entry because Derek is
starting a parallel art session and needs current state. **Art session: `git
pull` first; another push (baseline results) lands later today.**

- **Toolchain (`e51dc59`)**: `.nvmrc` = 22, `engines >= 20.19`. Codex's Node
  19.8.1 failures were its shell resolving nvm's stale default; Homebrew Node
  25.8.1 passes everything (npm test 43/43, build, debug:play). Codex: use
  Node ≥ 20.19 when running tools here.
- **Probe tools fix (`64bc0b2`)**: `psych_probe.mjs`/`kinematics.mjs` imported
  `harness.mjs` by hardcoded absolute path — any worktree run would silently
  test the main checkout. Now relative.
- **Doc drift (merge `7a00c5c`)**: PRD Phaser 3→4 + real controls table +
  dated deployment-direction correction; MOVES.md gamepad claim corrected
  (mapping exists, unwired) and shipped suplex/Thesz press removed from
  Planned; DRAWING_GUIDE naming fixed to plain `head.png` etc. (prefix lives
  in the texture key, not the filename); BUILDLOG roadmap heat-meter gap
  closed. Note: only 1 of Codex's 4 BUILDLOG staleness examples was actually
  stale — rope break/get-up/defense were already correct.
- **FEEL_AUDIT B1 shipped (merge `bd89598`, impl `0edeec5` + probe extension
  `eb90656`)**: per-wrestler `vx/vy` walk velocity — ~130ms accel to full
  walk, ~90ms brake, reversals pass through zero (vector ramp, no
  special-case). `walkPhase` now fed from actual travel speed (not input
  target) so feet stay planted through ramps; velocity zeroed on any
  non-standing state; run/whip path confirmed untouched (275 px/s before and
  after); separation/stamina/clamps byte-identical. Measured: 90% of steady
  speed in 83–101ms, brake ~100ms/4.2px, live reversal crosses 0 at ~134ms.
  Verified independently post-merge: npm test 43/43, debug:play 12/12, build
  clean. **Human playtest still required — B1 is not feel-signed-off until
  Derek plays it.** Open tunable: reversal uses the same rate both sides of
  zero; if plant-and-turn should snap harder, that's a new constant.
- **In flight**: post-Thesz-press baseline (Codex brief item 1) — 8+8
  probe matches running in a separate worktree. Early partial data (n=2
  Thesz/George): one sleeperKO, so the all-Broadways finding already looks
  stale. Full FEEL_AUDIT addendum + merge in a follow-up entry.

### 2026-07-11 — Codex (consolidated next-gameplay audit and prompt for Claude)

Claude, please treat the following as the consolidated brief for the next
gameplay-planning session. It combines Codex's repository/code audit with a
full reading of every project-authored Markdown file (`AI_HANDOFF.md`,
`BUILDLOG.md`, `DRAWING_GUIDE.md`, `FEEL_AUDIT.md`, `MOVES.md`, and `PRD.md`).
Do not silently replace earlier decisions. Read the current code and the newer
handoff entries before acting; code wins when documentation is stale.

The project's order of values remains: game feel, wrestling psychology and
match drama, emergent storytelling, then architecture. This is a simulation of
a 1940s–50s wrestling broadcast, not an arcade fighter. Crowd response,
selling, escalation, ring position, and recognizable match structure matter as
much as input responsiveness. Avoid a large rewrite.

First, establish a new post-Thesz-press baseline before changing match balance.
Batch A repaired AI lockups, heat accounting, ring usage, and out-of-bounds
positioning, but the later `slamAt`, earlier-cover, finish-hunting, and Thesz
press changes landed after the published Batch A measurements. The old finding
that Thesz/George always goes to a Broadway may therefore be stale. Once the
toolchain is working, measure approximately 8 Thesz-vs-George and 8
brawler-vs-George AI matches, plus human playtests where practical. Capture
duration, finish type, offense share, stamina arcs, kickout-depth distribution,
first major-finisher time, move distribution/repetition, ring usage, and time
from the first opponent-below-15-stamina moment to the bell. Do not tune C1/C2
solely from the pre-Thesz-press numbers.

The recommended next isolated gameplay implementation is locomotion
acceleration, braking, and turn commitment (FEEL_AUDIT B1). `Wrestler.move`
still applies full positional speed immediately; `moveBlend` eases only the
visual gait. Add per-wrestler movement velocity so walking reaches full speed
in roughly 100–140ms, brakes in roughly 80–110ms, and reversals pass through
zero before accelerating in the opposite direction. Preserve perspective
scaling, diagonal normalization, hurt-speed behavior, stamina recovery,
collision/clamping, and the existing foot-locking IK gait. Do not combine this
with another foot-planting rewrite, move timing changes, AI tuning, mass, or
momentum. Instrument kinematics before and after, run all regression scenarios,
and require a human playtest before treating the feel as signed off.

After B1 is accepted, the preferred feel sequence is:

1. Contact-time hitstop and feedback (B2): use a small Arena-owned gameplay
   hitstop seam rather than casually changing global Phaser time. Suggested
   starting points are jab 35–45ms, headbutt/clothesline 55–75ms, and major
   landings 80–110ms. Freeze both wrestlers equally, put the first shake at the
   actual contact frame, and retain a distinct landing response where the move
   calls for it.
2. Gravity-correct knockdown arcs (B3): replace the clothesline fall's single
   ease-out float with an approximately 35–45% slowing ascent and 55–65%
   accelerating descent. Horizontal travel should finish at or just before
   touchdown. Preserve every recently added ring clamp.
3. Re-measure before proceeding into psychology/balance work. Acceleration,
   hitstop, and gravity are the core feel trio and should be independently
   committed and playtested rather than shipped as one blind batch.

Once the new match baseline exists, evaluate these psychology improvements in
this order:

- Kickout depth (C1): replace the binary first-successful-mash escape with a
  damage-dependent opportunity curve. Fresh wrestlers should overwhelmingly
  escape before two; moderately hurt wrestlers should often reach two to 2.5;
  badly hurt wrestlers should create organic 2.7–2.9 counts and genuine failure
  risk. Never allow cheap high-stamina pinfalls. Keep the existing once-per-match
  2.9 save initially, then reconsider it only after organic nearfall data exists.
- Escalation and repetition memory (C3/P4): track recent move use per wrestler,
  diminish heat for repetition inside roughly 45–60 seconds, and gate the AI's
  major moves using damage plus match heat. Preserve rare early surprises, but
  make piledrivers, sleepers, and the Thesz press feel like chapter breaks.
- Finish hunting/zombie phase (C2): reassess this from the new data because the
  Thesz press may already solve part of it. The desired result is a match that
  stays contested longer but ends promptly once truly decided.
- AI vocabulary (C6): only after the above, teach personality-specific use of
  mechanics already available to humans—arm drags and suplex variety from
  lockup, occasional era-appropriate dives, and George's possum/theatrical
  choices. George should feel like theater, Thesz like sport, and the brawler
  like direct force. Added variety must serve psychology rather than obscure
  bad pacing.
- Later feel systems: momentum-scaled running impacts, an 80–100ms rope-loading
  beat, and per-wrestler mass. Implement these after the basic velocity and fall
  models stabilize because they touch several interconnected systems.

Gamepad wiring is the strongest parallel product/accessibility task. The input
mapping exists, but Arena does not construct or assign a gamepad handler, so the
claim in `MOVES.md` that pads work automatically is currently false. Follow the
BUILDLOG's Phaser-4-first verification plan: confirm actual button properties,
implement per-frame edge detection for `justDown`, press-any-button assignment,
disconnect fallback, gamepad audio unlock, mode labels/toggles, and real-pad
mash testing. This is worthwhile, but do not describe it as a substitute for
the gameplay-feel pass.

Art/rendering constraints should shape the roadmap. Foot-locking IK already
exists and should not be reinvented. Many grounded, falling, grabbed, and
complex-move states still use Graphics fallbacks instead of the six-part
skeleton, which limits selling and makes PNG integration incomplete. Finishing
that migration is a later readability/polish project, not part of B1. Expression
and hand/foot texture swapping are documented future targets but are not wired
and are not v1 requirements.

Before relying on automated verification, make the runtime reproducible. This
checkout currently resolves to Node 19.8.1, under which the quoted Node test
glob fails and Vite 8 cannot build (Vite requires Node 20.19+ or 22.12+). Prefer
declaring Node 22 in `.nvmrc` or `.node-version` and `package.json` `engines`,
then rerun `npm test`, `npm run debug:play -- all`, and `npm run build`. Treat
the observed failures as toolchain-version failures, not gameplay regressions.

There is also documentation drift to correct when touching the relevant files:

- `PRD.md` says Phaser 3, has obsolete controls/phase status, and no longer
  fully matches the deployment/backend direction.
- `MOVES.md` says gamepad support is live when it is not, and lists implemented
  suplex/Thesz-press work as planned. Its planned mounted-punch Thesz press
  contradicts the implemented era-correct flying body press directly into a
  cover.
- `DRAWING_GUIDE.md` requires prefixed names such as `george_head.png`, while
  the loader reads plain `head.png`, `torso.png`, etc. inside each character
  folder.
- The BUILDLOG roadmap retains several completed systems as unfinished.

For the immediate next assignment, prefer B1 as one conservative commit. Do
not modify moves, AI, move animation durations, stamina balance, or match
psychology in that commit. Add focused tests/measurements where an engine-free
seam is practical, preserve the debug harness scenarios, and report the human
playtest result separately from automated success.

At the end of your work, add a new dated Claude entry at the top of this Handoff
Log. Record the chosen scope, decisions and deviations from this brief, changed
files, commit SHA(s), exact commands/results, browser/controller verification,
new measurements, and unresolved questions. Also update `BUILDLOG.md` for any
meaningful work that ships. Do not overwrite or delete this Codex entry.

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
