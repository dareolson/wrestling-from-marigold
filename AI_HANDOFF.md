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

## Active assignment — Codex: blueprint four input-invoked move animations

(Previous active assignment — B1 close-out: reversal foot-lock — completed and
feel-signed-off by Derek 2026-07-12; see the Handoff Log entries of that date.
Replaced here at Derek's direction 2026-07-14.)

Codex: design four new move animations for the current skeletons. Deliverable
is a **blueprint, not code** — precise enough that Claude can implement it
without making design decisions. Derek reviews the blueprint before any
implementation starts.

Requirements:

- Four moves, era-appropriate to the 1940s–50s golden-age repertoire (project
  priority: psychology and drama over flash).
- **Exactly four poses per move** for the attacker's animation. Poses use the
  existing `POSES` format (`Wrestler.js:59`): `{ lLeg, rLeg, lArm, rArm, lean,
  crouch }`, skeleton angle convention 0 = straight down. Sequence them in the
  existing `MOVE_DEFS` shape (`Wrestler.js:136`): `{ p, dur, e }` with
  durations in ms and Phaser easing names. Reuse existing poses where they
  genuinely fit; new poses need full joint values.
- **Input-invoked by a human player.** Specify the exact trigger for each move
  as button × context. No new physical buttons — the action set is grapple /
  power / finisher / run plus direction and context. Currently occupied:
  grapple → whip (standing), lockup (close), pin (downed), clothesline
  (runner); power → jab/headbutt (close), dropkick (medium), elbowDrop
  (downed), doubleAxeHandle (runner); finisher → sleeper (close), taunt (far);
  lockup follow-ups → down = headlock, power = armDrag, right = armBar,
  left = ankleLock. Flag any collision you're intentionally overriding.
- **Current skeletons only**: no new art, no new rig parts, no second-side
  texture keys, no entangled two-body drawn holds (those need bespoke art —
  out of scope). Defender reactions reuse existing sell/fall/stagger states
  and poses wherever possible; an essential new defender pose counts against
  that move's four.
- Per move, specify: name, trigger context, valid target state/range,
  the four poses (joint values), durations + easings, suggested damage/
  stamina/heat numbers, which kits get it (george / thesz / brawler), and
  optional AI-usage notes.
- Write the blueprint as `AI_HANDOFF_ENTRIES/<date>-codex-four-move-blueprint.md`
  plus a short dated log entry below pointing at it.

After Derek approves: Claude implements as focused commits (poses + MOVE_DEFS +
handlers + `debug:play` scenario coverage), verifying with `npm test`,
`npm run debug:play -- all`, and `npm run build` under Node >= 20.19.

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

### 2026-07-23 (george: live leg/arm tuning pass, a new far-thigh scale knob, and a real cutter bug found in the process — flagging the last piece for Codex) — Claude, live-iterated with Derek in-session

Direct continuation of the 2026-07-22 joint-attachment entry below, next
session. Derek confirmed the legs read as connected after that fix's
0.00px/1.37px pivot-coincidence numbers, but only after actually looking at
the rendered game rather than trusting the measurement — worth remembering
for future joint work: pivot/ground-gap measurements check the render
origin, not whether the visible art reads as connected at a glance.

**Live-tuned via tools/rig-tuner/, applied as exported (no independent
re-derivation on top of these):**
- `nearShinOffsetX/Y`: -4 / 3, `farShinOffsetX/Y`: 16 / -12 — final leg seat,
  superseding the 07-22 entry's analytically-zeroed values. Also superseded
  an intermediate analytical fix of my own for a floating-boot regression
  (see below) — Derek's live-tuned final numbers already account for it.
- `farForearmOffsetX/Y`: -3 / -6 — small elbow seat, same category as
  `nearForearmOffsetX` above it.
- `powerIdle` pose (`Wrestler.js`): `lLeg 0.05→0.04, rLeg 0.30→0.17,
  lean 0→0.09, crouch 0.05→0.22` (lArm/rArm unchanged) — george-only pose,
  thesz/brawler use their own idle poses so this didn't touch them.

**Arm length/size, three sequential asks, each applied literally as
worded rather than assumed to mean the same thing:** "reduce the length of
george's arms by five percent" → `upperArm.box.h` 75→71, `forearm.box.h`
69→66 (length/height only, width untouched, since "length" was the literal
ask). "reduce the size of just his lower arms an additional five percent" →
forearm-only, both dims this time since "size" ≠ "length": 40→38, 66→63.
"make george's forearms 5 percent smaller" → forearm again, both dims:
38→36, 63→60. All display-box resizes, no bone-length/joint-chain changes,
same technique as the thigh/torso resizes in earlier entries.

**New knob: `RIG.FAR_THIGH_SCALE`/`_farThighScale` (Skeleton.js,
rig-tuner.js CHAR_KNOBS + syncCapturedGlobals).** Derek: "his far leg needs
to be reduced in size by five percent" — the far leg is thigh AND shin, and
only the shin had a scale knob (`farShinScale`, added 2026-07-19). Added
the matching thigh knob (default 1, bit-identical for every character that
doesn't set it — same pattern as `FAR_SHIN_SCALE`'s own addition). George:
`farThighScale: 0.95`, `farShinScale` 0.81→0.77 (5% off the existing tuned
value).

**Found and fixed a real regression from that same far-leg scale change:
his far boot started floating.** `farShinScale`'s scale is applied to the
whole display box around the shin's own top-anchored render origin (near
the knee), so shrinking it pulls the *bottom* edge — the boot — up with it;
the shadow itself doesn't move (`Wrestler.draw()` always draws it at the
wrestler's own `y`). Derek: "george doesn't seem to be rooted on the
mat... too much distance between him and his shadow." Measured via
`window.__WFM_GAME`: far boot sat ~8.1px (unscaled) above the shadow right
after the scale change while the near leg (untouched) was still sub-pixel.
Closed it analytically via `farShinOffsetY` first, then Derek re-tuned the
final seat live in rig-tuner anyway (see the offsets above) — so the
shipped values are his live pass, not my analytical one, though both
targeted the same root cause.

**Investigated "george's ear is black for some reason" — found one real
cutter bug, fixed it, but the visible symptom is mostly the source art, not
code.** `closeThinAlphaGaps` (added 2026-07-19 in the newgeorge redraw
entry, to close one specific hairline gap in the shin's cap art) was
running unconditionally on every part for every character. Its own
report.json showed why that was wrong for the head specifically:
GeorgeHead.png alone had 229 gaps closed / 380px promoted to opaque ink —
an order of magnitude more than the shin (8) it was built for — because the
ear's fine curved shading sits within the function's 4px threshold of the
ear's own outline through much of its height, so the gap-close logic kept
merging them, each time copying the nearest (dark) flanking pixel.

Fixed by scoping the function to an explicit opt-in list —
`CHARACTERS.<char>.gapCloseParts` — instead of a blanket pass; only `shin`
(the part it was actually built for) is in it for george now.
`torso`/`upperArm`/`thigh` also had suspiciously high gap counts in that
same report (130/42/26) and may have similar latent artifacts, but weren't
reported broken, so left alone rather than guessing they need reprocessing
too — worth a glance if either of you spots something odd on those parts
later. Re-ran the cutter, `verificationOk: true`, gapsClosed now 0 for
every part except shin.

That fix alone did NOT resolve the ear, though — re-measured after
regenerating the asset and it still reads as a solid dark patch in-game.
Traced it further: sampled actual pixel colors in the raw, uncut
`Sprite sheets/NewGeorge/GeorgeHead.png` at full resolution (not the
processed output) — the ear's inner canal shading is already a fairly
bold, mostly-solid fill in the source drawing itself (dominant color
`rgb(63,61,58)`, the same charcoal ink used for outlines everywhere else,
confirmed via direct pixel sampling, not eyeballing). It reads fine at the
source's ~1500px scale, but at George's actual in-game head size
(`headScale: 0.745` on top of an already-small on-screen head) plus the
grayscale broadcast filter, there's much less surrounding pink to contrast
against, so a fill that's proportionate at full res reads as a black blob
at game scale — the same category of problem the legs had (art detail that
doesn't survive being scaled down to game size), just the opposite
direction: too much fill instead of too little.

**Action required — Codex, this is the one open thread from today:** the
ear needs either an art touch-up (thinning the canal shading stroke in the
source PNG) or a code-side call (e.g. a modest `headScale` bump so existing
detail has more pixels to land in, or an automated fill-reduction step in
the cutter scoped to just this part). I didn't attempt an automated pixel
edit on Derek's art without sign-off — flagging for you two to decide the
direction rather than guessing. Everything needed to reproduce the finding
is above (sampled RGB, the report.json gap counts, the crop comparison
method — crop the raw source and the processed PNG at matching regions via
a canvas with `imageSmoothingEnabled=false` before comparing, sips'
resampling was misleading me on this one initially).

Verified after every round in this entry: `npm test` (43/43, `node --test
tests/*.test.js`), `npm run debug:play -- all` (12/12), `npm run build`
(clean) — all under the homebrew Node install, same environment note as
every prior entry. Confirmed the leg/arm/ear changes visually via
`window.__WFM_GAME` screenshots and direct pixel measurement, not just
tests, per this project's own standing verification bar.

Files touched: `AI_HANDOFF.md`, `src/Skeleton.js` (FAR_THIGH_SCALE knob),
`src/Wrestler.js` (powerIdle pose), `src/characters/george.js` (all the
offset/scale/box values above), `tools/rig-tuner/rig-tuner.js`
(farThighScale wiring), `tools/wrestler-cutter/process-parts.mjs`
(gapCloseParts scoping), `src/assets/wrestlers/george/*.png` (regenerated
by the corrected cutter run).
Action required: Codex — see the ear thread above. Derek — live sign-off,
same standing caveat as always; the leg/arm numbers above are already your
own live exports so this is really just confirming nothing regressed since.
Priority: medium (ear — cosmetic but visible on every idle frame), low
(everything else — already live-confirmed this session).

### 2026-07-22 (general joint-attachment contract: implemented, verified, and the stale knee/elbow compensation offsets it made obsolete are gone) — Claude

Closes out the two 2026-07-19 Codex design entries directly below (the
"keep the rendered leg attached through bends" direction and its broadened
"not knees only" follow-up). The structural implementation — Skeleton.js's
`jointPivotFrac`/`_attachChild`, the cutter's opt-in overlap-preserving
path — had already been built in an earlier, uncommitted session (see those
two files' 2026-07-21-dated comments), but was left in a half-finished
state: George's forearm/shin texture entries never got the computed
`jointPivotFrac` wired in, the cutter's own verification step still failed
on both parts, and the leg offset knobs tuned for the *old* backoff-based
attachment were never revisited, so a stale-but-syntactically-fine tree sat
uncommitted with no log entry. Finished it this session rather than
re-deriving from scratch.

**Bug found and fixed in the cutter's own verification, not just George's
wiring.** Running `node tools/wrestler-cutter/process-parts.mjs george`
against the pre-existing pipeline code produced `verificationOk: false` —
`capOk: false` on both forearm (`26/61` width) and shin (`26/76`). Root
cause: `findJointCapRow` (which picks the row `jointPivotFrac` points at)
searched using `rowStats.width`, the row's raw min-to-max opaque *bounding
span* — but the verification check it's supposed to satisfy measures the
longest *contiguous* run of alpha>=240 pixels, which is a stricter, usually
smaller number once a row has soft/antialiased edges (exactly what a
tapered overlap-slack region has, by design). The two checks were
independently written to conceptually the same intent but implemented
against different width definitions, so they disagreed on any row that
wasn't either fully solid or fully soft. Fixed by extracting one shared
`capRunWidth(canvas, y)` helper (longest contiguous alpha>=240 run) and
making both `findJointCapRow`'s row-selection search and the verification
`capOk` check call it — they can't drift apart again since it's the same
function. Re-running the cutter now returns `verificationOk: true` across
all six parts, `capTopWidth: 43/61` (forearm) and `56/76` (shin), both
comfortably clearing the 60% floor.

**George's forearm/shin now carry real `jointPivotFrac` values**, read from
that verified report and wired into `src/characters/george.js`:
`forearm: 0.1804878048780488`, `shin: 0.125`. Also fixed `THESZ_QA_DIR` in
`process-parts.mjs`, which had been pointing at a leftover scratch path
from an unrelated project (`urworthy`) since some earlier session —
harmless (QA dirs are write-only debug output, never read back by the
pipeline) but clearly wrong, so repointed both QA dirs at this session's
own scratchpad.

**Found and fixed a second-order bug this unlocked: George's leg visibly
detached in the opposite direction once jointPivotFrac was wired in
un-adjusted.** `nearShinOffsetX/Y` and `farShinOffsetX/Y` were tuned during
the 2026-07-19 rig-tuner pass to compensate for the *old* contract, where
`_attachChild` pulled the shin's render origin back by `RIG.KNEE_OVERLAP`
(18px) along the bone before drawing it — those offsets pushed the shin
back down/across to close the resulting gap ("george is floating" in that
entry's own words). With `jointPivotFrac` set, `_attachChild` now anchors
the shin exactly at the true knee with zero backoff, so the *same* old
offsets overshoot the correction that's no longer needed. Measured via
`window.__WFM_GAME` (matching that same entry's own methodology) before
touching anything: with `jointPivotFrac` wired in but the old offsets still
in place, George's boots sank 11.5px/12.5px *below* the mat (screen units,
s≈0.809) — the mirror image of the original floating bug — and
`tools/debug/knee_pivot_audit.mjs george` (a pre-existing tool from the
2026-07-15 knee investigation, not written this session) showed the shin's
render origin sitting 12.98px/17.37px off the true knee joint, constant
across every sampled walk frame and both facings.

Zeroed all four (`nearShinOffsetX/Y`, `farShinOffsetX/Y`) and re-measured:
the far leg's shin-render-origin now coincides with the true knee at
**0.00px** in both facings (`knee_pivot_audit`), and its ground gap closed
to 0.35px. The near leg still carried a small residual — 4.60px ground gap,
3.23px knee offset — that turned out to be `RIG.NEAR_SHIN_FWD`/
`RIG.NEAR_SHIN_UP` (5px unscaled each), the shared forward/up bias *every*
character's near shin gets, not George-specific compensation. Added back
`nearShinOffsetY: 5` (≈ `RIG.NEAR_SHIN_UP`) to cancel just its vertical
component, landing the ground gap at 1.37px and leaving only the
horizontal FWD-bias residual (3.23px) — the same shape of small, shared,
intentional bias the far leg would show if it had one. Documented this
directly in `george.js` so a future session doesn't mistake that small
residual for a new floating-feet bug and re-inflate it.

Left `nearForearmOffsetX: 2` untouched — checked whether it was the same
class of stale backoff compensation and concluded it isn't: it's an order
of magnitude too small against `RIG.ELBOW_OVERLAP` (17px) to be that, so
it's almost certainly a minor fist-position nudge, unrelated to the joint-
attachment fix. No `farForearmOffsetX` is set (defaults 0), so the far
elbow already anchors exactly at its true joint.

**Verified, quantitatively and visually, not just "tests still pass."**
`npm test` (43/43 — run as `node --test tests/*.test.js`, the bare `npm
test` glob still doesn't expand in this shell/node combo per prior
entries), `npm run debug:play -- all` (12/12), `npm run build` (clean;
Node 19.8.1 is this environment's default and is below Vite's floor, so
all of the above ran under the homebrew Node 25 install per the existing
project convention). `knee_pivot_audit.mjs george`: far knee 0.00px
coincidence both facings; near knee 3.23px (the accounted-for structural
bias, not a defect). `window.__WFM_GAME` ground-gap check: near 1.37px, far
0.35px (screen units). Forced George through the `gettingUp` state directly
(the pose category the original bug report specifically named — "elbows
should be fixed in the same pass ... limbs visibly detach in authored poses
such as getting up") and screenshotted: knee and elbow both read as one
continuous connected line in that pose, no gap, no floating shin/forearm.
Also confirmed idle side-by-side against Thesz — proportioned, connected,
no stretching.

**Scope note — this closes the elbow/knee half of the two 2026-07-19
design entries below, not the full 6-point plan in the broader "all limb
attachments" entry above them.** Point 4 there (unifying grounded/get-up
placement with the upright path) was done as part of the same earlier
session — `_applyGrounded`'s leg/arm closures now call `_attachChild` too,
confirmed by reading `Skeleton.js` directly, and the get-up screenshot
above is real evidence it works, not just code inspection. Point 5's
broader audit (neck/shoulders/hips getting the same explicit-endpoint
treatment) was NOT started — only knees and elbows carry `jointPivotFrac`
today (`CHARACTERS.george.jointPivotParts: ['forearm', 'shin']`). Point 6
(an optional joint-cover sprite for extreme bends) also not started — not
needed yet, nothing in this session's screenshots showed a seam bad enough
to need one. Thesz was deliberately left off `jointPivotParts` — his art
was never reported as having this detachment problem, and re-cutting his
already-correct art on this contract without a specific complaint isn't
this session's call to make.

Files touched: `AI_HANDOFF.md`, `tools/wrestler-cutter/process-parts.mjs`
(verification fix + QA dir fix — Skeleton.js/cutter's core
jointPivotFrac/_attachChild mechanism itself was already in the working
tree from the earlier session, not authored here), `src/characters/
george.js` (jointPivotFrac wiring + offset re-derivation), `src/assets/
wrestlers/george/{forearm,shin}.png` (regenerated by the corrected cutter
run — pixel content should be equivalent to the pre-existing uncommitted
versions modulo the verification fix's effect on exactly where the pivot
crop centers).
Action required: Derek — live sign-off in the browser (standard caveat —
screenshot/measurement review isn't a full substitute for eyes on the real
game). If the near leg's small intentional 1.37px/3.23px residual reads as
visible in person, it's a `nearShinOffsetX/Y` nudge from here, not a sign
the structural fix is wrong. Point 5 of the broader six-point plan
(shoulder/hip/neck endpoint invariants) remains open for whoever picks up
this thread next.
Priority: medium (finishes a real visible-bug fix that was sitting
half-done in the working tree; not urgent since nothing was pushed or
reviewed against it yet).

### 2026-07-19 (all limb attachments, not knees only: elbows/get-up poses + cutter is shaving George's overlap slack) — Codex (investigation/design follow-up; not implemented)

Derek broadened the knee report: elbows should be fixed in the same pass,
and limb attachment matters everywhere because limbs visibly detach in
authored poses such as getting up. He also remembered deliberately leaving
flesh-tone slack in George's leg drawings for overlap and questioned whether
the cutter trims it because it is flesh-colored.

**Confirmed cutter behavior:** color is not the problem, but destructive
cap flattening probably is. George's source files use real alpha; connected
flesh-tone pixels are ordinary content and survive the alpha mask and
largest-component cleanup regardless of RGB color. Only isolated components
smaller than 1% of the largest component are dropped. However,
`flattenOpaqueCap()` explicitly zeroes complete alpha rows from the *top* of
the forearm and shin until the first surviving row is at least 72% as wide
as that part's widest joint-region row. George's saved cutter report records:

- forearm: **28 source rows shaved** (`maxWidth: 65`, first retained cap
  width: 47);
- shin: **26 source rows shaved** (`maxWidth: 85`, first retained cap
  width: 62).

`pivotCrop()` then crops to the new alpha bounding box and `scaleFlush()`
rescales that result, so those erased rows are absent from the runtime PNGs.
The full-canvas source layers already contain substantial shared-coordinate
overlap between adjacent parts; the pipeline's cap rule was designed around
a top-edge pivot contract and can therefore destroy exactly the tapered
pre-joint slack Derek intentionally supplied.

This reveals a deeper contract mismatch: the current runtime constructs all
limb images with `setOrigin(0.5, 0)`, meaning the joint must be the texture's
top row. It has no representation for artwork extending *above* the elbow or
knee while rotating around a joint located inside the texture. The cutter
shaves that extension to make the art conform to the runtime assumption.

**Revised implementation direction — general joint attachment contract:**

1. Support an internal proximal joint pivot for lower limb pieces, e.g.
   `jointPivotY`/`overlapInset` metadata for forearm and shin. In Phaser terms,
   the image origin should sit on the authored elbow/knee row inside the
   texture, allowing flesh artwork above that row to tuck under the parent
   while both pieces rotate about the same joint.
2. Preserve the authored pre-pivot overlap band in the cutter. Do not run
   `flattenOpaqueCap()` by deleting rows for a character/part that supplies
   an internal joint pivot. Export/report the measured pivot inset instead.
3. Make parent endpoint and child pivot coincidence a runtime invariant for
   elbows and knees. Ground feet by resolving the visual chain toward the
   ankle target, never by translating the shin away from its knee. Apply the
   same rule to arm pose endpoints.
4. Unify upright and grounded/get-up placement semantics. `_applyGrounded()`
   currently has its own simpler leg/arm placement path and does not use the
   upright path's `ELBOW_OVERLAP`, `KNEE_OVERLAP`, or character attachment
   corrections. This explains why a connection that survives idle can open
   during getting-up poses.
5. Audit every attachment boundary: neck/head-to-torso, shoulders, hips,
   elbows, and knees. Knees and elbows need the new internal-pivot/overlap
   treatment first; shoulders/hips should at minimum share explicit endpoint
   invariants rather than pose-specific visual nudges.
6. Keep an optional joint-cover sprite (kneecap/elbow patch) as a secondary
   art solution for extreme bends, not as a substitute for coincident pivots.

Acceptance should cover idle, a complete gait cycle, both facings, and every
grounded/get-up keypose. Instrument the actual rendered parent endpoint and
child pivot; require coincidence within rounding at every sampled frame, and
also verify grounded boots. Add a cutter regression assertion that authored
pixels above an internal joint pivot survive export.

Files touched: `AI_HANDOFF.md` only. No cutter, runtime, or art changes were
made in this entry.
Action required: inspect/mark the intended elbow and knee rows in George's
shared-canvas sources, then implement internal pivots and one shared joint
placement path before further offset or overlap tuning.
Priority: high (general rig/art contract issue, visible across poses).

### 2026-07-19 (george knee direction: keep the rendered leg attached through bends; stop offset-tuning) — Codex (design decision only, not implemented)

Derek's main remaining read on George is that his knees do not stay
connected, and suggested thinking outside the existing display-box/offset
model: the knees should remain attached while they bend. That diagnosis is
correct. The IK chain already computes a bending knee, but the *rendered*
thigh and shin are not constrained to share one visual knee point.

Concrete evidence from the current George settings: the grounding offsets
almost exactly cancel the rig's knee tuck in a straight pose. The near shin
lands at `-KNEE_OVERLAP - NEAR_SHIN_UP + nearShinOffsetY` =
`-18 - 5 + 25` = **2px below** the true knee; the far shin lands at
`-18 + farShinOffsetY` = `-18 + 20` = **2px below** it. They are also
translated sideways by approximately 2px near
(`NEAR_SHIN_FWD + nearShinOffsetX` = `5 - 3`) and 18px far
(`farShinOffsetX`). Separately, the thigh artwork receives render-only
hip offsets and angle biases while the downstream IK knee remains derived
from the unshifted/unbiased bone. A fixed world-space nudge can therefore
look correct in one pose but must drift as the thigh and shin rotate.

**Direction for the next implementation pass:** treat attachment as an
invariant rather than continuing to tune offsets.

1. Compute a `visualKnee` from the rendered thigh endpoint (or otherwise
   make the thigh and shin resolve to one explicit render-space knee).
2. Pin the shin's top pivot to that point every frame.
3. Aim/size the shin from the attached visual knee toward the grounded
   ankle/boot target. Do not ground the foot by translating the whole shin
   away from its knee.
4. Add an optional George-specific kneecap/joint-cover sprite centered on
   `visualKnee`, rendered over the thigh and shin, to conceal the two rigid
   cut edges at deeper bends. This is preferable to a full deformable mesh:
   it is the standard paper-doll solution and fits the existing Phaser
   Image rig.

Conceptually the visual chain must be endpoint-constrained:
`rendered hip -> attached visual knee -> grounded ankle`. Logical IK can
remain responsible for the motion, but the art should no longer be allowed
to translate independently at the joint. Once that architecture is in
place, re-derive George's shin display height/scale needed to reach the mat
and remove or drastically reduce his near/far shin X/Y compensation values.

Do **not** start another live-tuning round on `nearShinOffsetX/Y`,
`farShinOffsetX/Y`, or `KNEE_OVERLAP` before this structural pass; those
knobs are currently trading knee attachment against foot grounding.

Suggested acceptance checks: idle and a complete gait cycle, near/far legs,
both facings, plus the deepest authored crouch/knee bends. At every sample,
the thigh endpoint, shin top pivot, and optional kneecap center should remain
coincident within rounding while both boot soles still meet the mat.

Files touched: `AI_HANDOFF.md` only. No runtime or art change was made in
this entry.
Action required: implement and visually review the endpoint-constrained
visual-knee pass before any further George leg tuning.
Priority: high (structural cause of the recurring visible knee separation).

### 2026-07-19 (george: corrected the thigh-length fix — wrong lever, torso/head were riding too high) — Claude (Derek: "his feet are on the ground, but now the rest of him needs to be brought down as well")

One-round correction on the entry directly below, same day. Derek's report
was the tell that the `thighH: 68` bone-length approach was wrong: feet
correctly grounded, but everything above (torso, arms, head) had also
risen, since the standing-pose `hipY` solve holds the *ankle* fixed at
ground and derives hip height from `thighH+shinH` — a longer thigh bone
necessarily pushes the hip, and everything stacked on it, further up.
"Longer thighs" was never supposed to mean "taller George."

Root cause, confirmed by reading `Skeleton.js`'s constructor rather than
guessing: `img()` always stashes a fixed `_texDims` display box on every
textured part (`TEX.thigh` as the default even for a plain string entry),
and `_placePart` uses that box unconditionally — so bumping `textures.
thighH` alone changes the *joint math* but never the *rendered art size*.
The thigh image was still exactly as long as before; only the hip point it
hung from had moved.

**Fix:** reverted `thighH` entirely (back to the shared `P.thighH` default,
56 — hip/torso/head back to their original height) and instead gave the
thigh a bigger *display box* — the same technique already working for the
torso (−5%) and arms (+10%) earlier in this session:
`box: { w: 96, h: 82 }`, i.e. `TEX.thigh`'s own default formula
(`P.thighH + RIG.HIP_OVERLAP` = 70) recomputed as if thighH were 68 (68+14
= 82), width scaled by the same ratio. Since the knee anchor is still
computed from the *true*, unchanged thighH, the thigh's image now visually
extends past the real knee point — covered cleanly by the shin, which
renders on top at that joint (see DRAWING_GUIDE's Joint Seams table) — so
it reads as a longer thigh without moving anything above it. Verified this
directly (`thighShinOverlap` in a throwaway measurement script: thigh's own
image bottom edge sits ~6px past where the shin's image starts, i.e.
covered, not gapped).

Re-derived the floating-feet offsets and `heightScale` from scratch against
this reverted state rather than assuming the prior entry's numbers still
applied (they didn't — those were solved for the taller, thighH=68 rig):
`nearShinOffsetY`/`farShinOffsetY` 23/18 → 25/20 (closes the ground gap to
sub-pixel: 0.15px/−0.20px, measured via `window.__RIG_TOOL`), `heightScale`
0.824 → 0.798 (re-measured raw height 310.05px, `247/310.05 = 0.798`,
landing total height at 247.4px against the 247.3px target from two entries
below — Real George, 5'9").

Verified: `npm test` (43/43), `tools/debug/play.mjs all` (12/12).
Screenshotted `?p1=thesz&p2=george` in the real Arena scene — shadow
directly under both boots, torso/head back at the correct height, legs
still read visibly longer than before this whole thread started.

Files touched: `src/characters/george.js` only.
Action required: Derek — live sign-off; if the thigh still doesn't read
long enough (or reads too long / the knee overlap looks off at extreme
pose angles), it's a `thigh.box` resize from here, not a `thighH` change —
see the comment in george.js for why that lever is the wrong one for a
"longer limb" ask specifically (contrast with the shin, which legitimately
still needs a display-box change for its own reasons, or `torsoH`/leg
`thighH`/`shinH` overrides for characters whose reference art has genuinely
different *proportions*, like thesz — the distinction is "different
proportions at the same total height" (bone length, thesz's case) vs.
"just draw this one limb chunkier/longer without moving anything else"
(display box, this case).
Priority: medium (was a real visible regression from the entry below, now
fixed and verified).

### 2026-07-19 (george: fixed floating feet, lengthened thighs, re-solved heightScale) — Claude (Derek: "george is floating" / "george's thighs need to be longer too")

Follow-up on the heightScale entry directly below, same day. Two related
reports, fixed together since they touch the same leg chain.

**Floating, measured not eyeballed.** `window.__WFM_GAME` (the real Arena
scene, not rig-tuner) showed his boot soles
(`skeleton.nearShin/farShin.getBounds().bottom`) sitting 6.5px/9.5px above
his own ground `y` at that frame's `s≈0.809` — 8.0/11.7 unscaled px of
daylight. `nearShinOffsetY`/`farShinOffsetY` (15/6 from the live-tuning
pass) got the gap added back in.

**Thighs longer — a bone-length change, not a display resize.** Added
`thighH: 68` (up from the shared `P.thighH` default of 56). Unlike the
torso/arm box overrides earlier in this session (pure display-size resizes
that don't move joints), thigh bone length is structural: the standing-pose
`hipY` solve (`Skeleton.js` ~line 551) holds the *ankle* fixed at
`groundY - bootH` regardless of thigh/shin length, so a longer thigh pushes
the *hip* higher and genuinely grows total standing height — it doesn't
self-correct like the floating-feet bug might have suggested. Confirmed
this analytically before touching offsets again, so the two fixes didn't
fight each other.

**heightScale re-solved, not left stale.** A taller raw rig (thighH bump)
needed a smaller `heightScale` to keep hitting the same 5'9" target from
the entry below: re-measured raw (heightScale=1) height 322.0px (up from
300.0px pre-thighH), so `heightScale = 247/322.0 = 0.768` (was 0.824).
Iterated twice against live `window.__RIG_TOOL` measurements until the
ground gap was sub-pixel (0.17-0.33px) and total height landed within 2px
of the 247px target — both verified against the real Arena scene afterward,
not just the tuner.

Verified: `npm test` (43/43), `tools/debug/play.mjs all` (12/12).
`window.__WFM_GAME` gap check re-run after the fix: 0.27px/0.14px (was
6.5px/9.5px). Screenshotted `?p1=thesz&p2=george` — shadow now sits
directly under both boots with no visible gap, thighs read visibly longer
and less stubby.

Files touched: `src/characters/george.js` only.
Action required: Derek — live sign-off; the thighH=68 value is a first
guess at "longer" with no specific target number given, easy to retune via
rig-tuner (remember: changing thighH again will shift total height, so
heightScale needs re-solving alongside it — the comment in george.js spells
out the formula).
Priority: low (floating was a real visible bug, now fixed and verified;
thigh length is a feel call, first pass only).

### 2026-07-19 (george live rig-tuner pass; new farShinScale knob; real-world height calibration for george+thesz) — Claude, live-iterated with Derek in-session, same day as the newgeorge redraw below

Direct continuation of the redraw entry directly below — Derek picked up
`tools/rig-tuner/` himself and iterated live, pasting Export-panel output
back several rounds (headScale converged 0.91 measured → 0.745 live-tuned;
head/arm/leg/shin offsets; torso −5%; arms +10%; legs nudged up). Each
paste applied directly to `src/characters/george.js` / `src/Wrestler.js`'s
`powerIdle`, verified with `npm test` + `debug:play -- all` after every
round. Final per-part values are documented inline in george.js's own
comments, not repeated here.

**Found and fixed a real tool gap, not just a george number:** near the end
of the leg pass Derek flagged "there is no way to affect the far leg
currently with scale" — `nearShinScale` existed (character override +
`RIG.NEAR_SHIN_SCALE` global default) but the far shin was hardcoded to
plain `s`, so once a character's near shin got scaled there was no way to
keep the far leg visually matched. Added the missing symmetric knob:
`RIG.FAR_SHIN_SCALE` (default 1, so every other character renders
identically), `Skeleton._farShinScale`, wired into the far-shin
`_placePart` call and its debug-seam object the same way `_nearShinScale`
already was, plus a matching `farShinScale` row in rig-tuner's `CHAR_KNOBS`
and `syncCapturedGlobals`. George's now set to `farShinScale: 0.81` (same
as his tuned `nearShinScale`) so both legs read the same size.

**Real-world height calibration (Derek: "george looks about seven feet
tall... in real life george was 5'9" and lou thesz was 6'2", so thesz
should have the height advantage").** Measured rather than guessed:
DRAWING_GUIDE already documents a s=1 ↔ 43px/foot calibration at the ring's
near edge (`perspectiveScale(RING.nearLeft.y) === 1.0`, confirmed in
`src/constants.js`); read both characters' assembled skeleton height
(`head.getBounds().top` to `nearShin.getBounds().bottom`) at that exact `s`
via `window.__RIG_TOOL`. Both measured ~300px (~7ft) — george 300.0px,
thesz 302.4px — confirming Derek's read exactly and revealing thesz had the
identical un-calibrated problem, just never flagged.

No existing mechanism could fix this without a gameplay side effect:
`Wrestler.s` (`perspectiveScale(this.y)`) is the same value movement speed,
reach checks, and hit-detection ranges all read directly (`this.s`
appears throughout Wrestler.js's move-range/collision math) — scaling it
would have rebalanced combat, not just resized art. Added a render-only
`textures.heightScale` instead: `Wrestler` constructor reads it into
`this._heightScale` (default 1), and `draw()` folds it into its own
**local** `s` (used only for the skeleton + every fallback gfx shape drawn
in that method) before that local variable is used anywhere — `this.s`
itself, and everything gameplay code reads from it, is untouched. Also
wired into rig-tuner (`renderScale()`, replacing the raw `state.zoom` at
both the `updateUpright` call and the drag-handle math) since that tool
constructs `Skeleton` directly and bypasses `Wrestler.draw()` entirely —
without this it would have silently stopped being WYSIWYG for any
character setting `heightScale`. Added as a normal `CHAR_KNOBS` entry too,
so it's live-tunable/exportable like every other knob, not just a
hardcoded value.

Solved for each character's real height at the same s=1 reference:
george 5'9"=247px → `heightScale = 247/300.0 = 0.824`; thesz 6'2"=265px →
`heightScale = 265/302.4 = 0.877`. Re-measured after applying: george
247.2px (5.75ft exactly), thesz 265.2px (6.167ft exactly) — both landed
within rounding of their real heights, and thesz now reads ~7% taller than
george as asked.

Verified after every round: `npm test` (43/43), `tools/debug/play.mjs all`
(12/12). Confirmed visually via `tools/debug/shot.mjs` with `?p1=thesz&p2=george`
— both wrestlers now read as plausible human proportions against the ring
(a real change from the prior giant-scale look), Thesz subtly but visibly
taller.

**Housekeeping note:** two untracked, unrecognized scratch scripts turned
up in `tools/debug/` during this session's cleanup pass
(`_crop_tmp.mjs`, `_george_leg_measure_tmp.mjs`, pointed at
`localhost:5174` — a port this session never used). Left them alone rather
than deleting — likely a concurrent tab/session's in-progress scratch work
(this project has hit that exact "two tabs on the same files" situation
before, see the photographer-era entries further down), not confirmed
mine. Worth a glance if you didn't leave them yourself.

Files touched: `src/characters/george.js`, `src/characters/thesz.js`,
`src/Wrestler.js`, `src/Skeleton.js`, `tools/rig-tuner/rig-tuner.js`.
Action required: Derek — this was live in-session the whole time, so
consider it self-signed-off through the `heightScale` addition; the
`_crop_tmp.mjs`/`_george_leg_measure_tmp.mjs` files above are the one
open thread.
Priority: low (tuning), medium (the heightScale mechanism — touches both
playable characters' render path, worth a second look).

### 2026-07-19 (newgeorge redraw wired in; old per-part offset hacks removed) — Claude (Derek: "in sprite sheets i added a folder called newgeorge, it's got a reworked george in it, please use the reference guide to put him together correctly" — then mid-task: "eliminate all the distortion from before")

Derek dropped a full redraw at `Sprite sheets/NewGeorge/` (GeorgeHead/Torso/
UpperArm/LowerArm/UpperLeg/LowerLeg.png + Georgereference.png, the uncut
full-body illustration — same shape as the New Lou drop that thesz's redraw
used). Unlike the original `GeorgeParts` source (hand-cut piece by piece,
mismatched pivots, needed a torso+trunks/shin+foot composite step and a long
chain of per-part offsetX/Y/tilt corrections to line back up — and whose raw
files are gone from disk now, just an empty folder), this one follows
DRAWING_GUIDE's "draw the full body, then cut it into layers on one shared
canvas" method: trunks already baked into the torso layer, boot already
baked into the lower-leg layer, every part's silhouette/pivot agrees with
the reference by construction. Same category of redraw as thesz's, so
`tools/wrestler-cutter/process-parts.mjs`'s existing "simple character"
path (no composite step) applied directly — just needed `CHARACTERS.george`
repointed at the new source dir/filenames and `sourceKeys` trimmed from 8
(head/torso/trunks/upperArm/forearm/thigh/shin/foot) to 6.

**Pipeline fix, not george-specific:** first run failed verification on the
shin — its cap-flatten top edge (the flat opaque strip that's supposed to
hide the knee seam) had a 3px hairline gap right at the art's tapered peak,
splitting one 85px-wide opaque run into two shorter ones and failing the
"contiguous opaque cap" check. Root cause was a genuine unfilled seam in the
source art (likely a shading stroke drawn without fill), not a pipeline
bug. Rather than special-case george, added `closeThinAlphaGaps` to the
cutter's shared browser-side lib — closes any ≤4px non-opaque run flanked by
solid ink on both sides during the existing per-source cleaning pass
(alongside the speck-removal step it sits next to). Character-agnostic,
zero effect on any part without this kind of hairline seam; fixed george's
shin cap (32px contiguous run → 53px, clears the 51px/60% floor) without
touching the actual shape. `verificationOk` now true for all six parts —
every one fills its target canvas at fillFrac 1.0 (no width-limited crop
this time, unlike the old art's shin at 0.841).

**george.js rewritten, not patched — this is the "eliminate the distortion"
part.** The old file carried ~15 tuned offsetX/Y/tilt values (headOffsetX/Y,
armOffsetX/Y, legOffsetX/Y, nearLegOffsetY, nearLegTilt, near/far shin
offsets, nearShinTilt), every one dated 2026-07-12 or 2026-07-14 and
explicitly commented as compensating for the old hand-cut art's pivot
mismatches. None of that reasoning applies to art whose pivots are already
correct by construction, and carrying it forward unchanged would have
misplaced every joint against the new silhouettes. Dropped all of it. What's
left is only what's structurally required, and none of it is guessed:
- `skinCol`/`trunksCol` sampled directly off pixels in
  `Georgereference.png` (`#c7a2ac`, `#d54283`) — these only feed the
  flat-fill fallback draws in Wrestler.js (piledriver/flat/dropkick), so
  they should track the real art.
- `headScale: 0.91` — measured, not guessed, following the same
  ink-content-basis method thesz's redraw used: on the shared reference
  canvas, head max profile width / torso content height = 160/320 = 0.5
  (largest-connected-component only, to exclude a couple of stray 1-2px
  flecks in the source PNGs). Solved against Skeleton.js's fixed head
  display box and the default TEX.torso.h for that target ratio. Landed
  within 0.01 of the old value (0.9) — a reassuring cross-check that the
  character's actual head/body proportions didn't change much between
  drawings, just the cut quality.
- `shin` box `{w:58, h:107}` — every character must supply this explicitly
  (Skeleton.js's TEX comment: the shin's true box depends on its own
  boot-art fillFrac). Followed the documented formula directly instead of
  adding another fudge factor: scale = (shinH+bootH)/fillFrac/canvasH =
  89/1/230 = 0.387; box.w = canvasW×scale ≈ 58; box.h = canvasH×scale +
  KNEE_OVERLAP = 89+18 = 107.
- `neckInTorso: true` carried over, confirmed (not assumed) by measuring
  that the head and torso source layers' content genuinely overlap in the
  neck region (head content to y=257, torso content from y=235) on their
  shared canvas.

torso/upperArm/forearm/thigh all wired as plain string texture keys (no
custom box) — like thesz, since none of them came back width-limited
(fillFrac 1.0 across the board per the verification report).

**Verified, not just assembled.** `npm test` (43/43). `npm run build`
succeeds cleanly under Node 25 (`/opt/homebrew/opt/node`) — this environment's
default Node is still 19.8.1, below Vite's floor, so build/dev-server work
needs the homebrew Node explicitly, same as rig-tuner's own README already
notes. `tools/debug/play.mjs all` 12/12. Screenshotted three ways: the
cutter's own paper-doll mock (rough bbox-stacked, sanity check only), a live
render through `tools/rig-tuner/` (`window.__RIG_TOOL`, both facings + the
taunt pose — real Skeleton.js pivot math, filters stripped for clean
comparison), and one real in-match `tools/debug/shot.mjs` frame (full
broadcast filter, standing across from the placeholder opponent). All three
read as a clean, correctly-proportioned figure — connected joints, no
stretching, no floating parts, scales sensibly against the ring.

**Deliberately not chased further:** no live fine-offset pass (the kind of
single-digit headOffsetX/armOffsetY nudge thesz's redraw still needed even
with clean art) — the screenshots above didn't show anything obviously
wrong, and Derek's own instruction named the fallback for whatever's left:
"if you can't, we can use the tuner." `tools/rig-tuner/` is the right place
for that pass (drag handles + live export), not another round of hand-typed
constants here.

Files touched: `tools/wrestler-cutter/process-parts.mjs` (CHARACTERS.george
retargeted to `Sprite sheets/NewGeorge/`, `closeThinAlphaGaps` added to the
shared cleaning pass), `src/characters/george.js` (rewritten), `src/assets/
wrestlers/george/*.png` (all six regenerated). `Sprite sheets/GeorgeParts/`
is now empty (source already gone) and could be deleted, left alone here
since it's outside git (gitignored) and not this session's call to make.
Action required: Derek — live sign-off in the browser, and a rig-tuner pass
for any joint/offset polish the screenshots didn't catch (nothing chased
here beyond what the three QA renders showed).
Priority: medium (a whole character's art, not a background-extra tweak).

### 2026-07-18 (fourteenth/fifteenth/sixteenth crowd extras: manager, announcer, timekeeper) — Claude, live-iterated with Derek in-session

Three named ringside characters added in one session, closing out the
"who else might be ringside" thread.

**Ed "Strangler" Lewis (Lou Thesz's manager).** Source art
(`Sprite sheets/Audience/Ed "Strangler" Lewis.png`, 1717x916) is a single
4x2 pose grid like the policeman's sheet — split into two temp row-strip
PNGs (own `tools/audience-cutter/_split_sheet_tmp.mjs`, deleted after use;
not a committed tool) and each run through unmodified `cut.mjs` with a
shared `--scale` (native tallest frames 418px/417px, no real growth
signal). Own `STRANGLER_LEWIS` const, standing throughout so
`sizeBasis:'width'`. Placed ringside beneath the policeman, right side,
depth 2.8 ("stacked behind the ring canvas," same trick as the
photographer/policeman). **Facing bug found live:** default `flip:true`
(copied from the policeman's convention without checking) put him with his
back to the ring — his sheet's rest pose actually faces LEFT natively, the
opposite of photographer/policeman's rightward convention. Fixed to
`flip:false`. Size iterated live: 140 (initial) → 175 (+25%) → 219 (+25%
again) → 186 (-15%, technically correct math but Derek: "incredible hulk to
danny devito," too big a swing) → 203 (split the difference, landed).

Derek then asked to split his 8-frame reaction into two independent 4-frame
animations firing intermittently (rather than one continuous 8-frame build
tied to `_reactCrowdExtras`' match-pop hook) — closer to the policeman's
own decoupled-from-match-state treatment, except alternating between two
distinct animations instead of one variable-depth turn. Built
`_scheduleStranglerLewisAnim` for this, immediately generalized (see below)
once two more characters needed the identical shape.

**Announcer + timekeeper/bell-ringer pair.** Derek asked "who else might be
ringside" — Claude suggested a timekeeper/ring announcer (period-accurate
for a 1950s Marigold-style broadcast) or a rival manager for George's
corner; Derek picked the announcer/timekeeper. Claude also advised on the
ChatGPT art-generation approach (two separate character sheets rather than
one combined image, so per-character animation stays independent — matches
the existing one-sheet-per-character pipeline) and period-accurate props
(RCA-style ribbon mic on a stand for the announcer, no headset; a classic
dome ring bell + mallet + stopwatch for the timekeeper, no anachronistic
gear). Derek's ChatGPT output (`announcer.png`, `bell-ringer.png`, both
1716x916) came back as 4x2 grids with the mic-stand/bell-table furniture
baked directly into each character's own art — simpler than code-drawing a
shared table, since each sheet can be placed/scaled independently. Cut the
same two-row-strip way as stranglerlewis/policeman. Own `ANNOUNCER` and
`BELL_RINGER` consts, `sizeBasis:'width'` (seated throughout, no growth).

**Generalized the two-anim setup**, since it was about to be duplicated a
third time: `_setupStranglerLewis`/`_scheduleStranglerLewisAnim` became
`_setupTwoAnimExtra(extraDef, x, h, groundY, flip, depth=2.8)` /
`_scheduleTwoAnimExtra(fan)`, used by all three new characters. Also folded
the photographer/policeman/stranglerlewis preload loops (three
near-identical `for` blocks) into one loop over
`[PHOTOGRAPHER, POLICEMAN, STRANGLER_LEWIS, ANNOUNCER, BELL_RINGER]`.

**Placement bug found and fixed: announcer/bellringer rendered as nothing
at their first-guess spot.** Positioned like every prior ringside extra —
`groundY=440`, depth 2.8 ("beside the ring" convention — mat occludes
whatever overlaps its trapezoid, the rest reads as tucked beside it). Their
sheets are ~150-175px wide (character + table baked into one cutout, much
wider than the standing-alone photographer/policeman/lewis designs); at any
x with real clearance from a corner post, their ENTIRE footprint landed
inside the ring's mat trapezoid at that y, not straddling its boundary like
the narrower designs do — so depth 3 (`drawRingMat`) occluded them
completely. Confirmed via `window.__WFM_GAME` (positions were correct) +
screenshot (nothing rendered there). Fix: moved them in FRONT of the ring
instead of beside it — `groundY=505` (just past `RING.apronY=490`, the
mat's own front skirt) with an explicit `depth=12` (above `drawSideCrowd`'s
foreground "backs of heads" filler at depth 11, so the named characters read
as the closest, most prominent ringside figures rather than tucked behind
anonymous crowd). `h` dropped from the first-guess 190 down to 105 to
match — at `groundY=505`, `h=190` put the top of the head at y=315, up
inside the rope band (`RING.ropes` near-side y values run 251-380),
visibly clipping through the ropes; `h=105` keeps the top around y=400,
clear of the near ropes. Also respaced x (150/300, ~150px apart) after an
initial too-tight guess (225/300, alongside the photographer at 85) put
photographer/announcer and announcer/bellringer 21px/56px into each other,
reading as one muddy blob.

**Reusable pattern for the next ringside extra:** if the source art is a
solo standing/seated figure (narrow, ~60-100px), the photographer/
policeman/lewis "beside the ring, depth 2.8" convention works. If the art
bakes in furniture (a table, a desk — wide, 140px+), it likely needs the
"in front of the ring, depth ~12, groundY just past RING.apronY" convention
instead, or it will render as fully invisible behind the mat. Don't assume
either — measure the cut frame's actual pixel width and check whether the
placement clears the ring's mat trapezoid boundary at the intended y
(`ringBoundsAtY` in `src/constants.js`) before treating a position as
final.

Verified: `npm test` (43/43, `node --test tests/*.test.js` — the bare `npm
test` glob doesn't expand in this shell/node combo, unrelated to this
change). `npm run build` fails in this environment (Node 19.8.1; Vite
requires 20.19+/22.12+) — pre-existing, unrelated to this session's changes,
not something introduced here. Confirmed all three characters visually via
`tools/debug/harness.mjs` + `page.screenshot()` crops (several rounds,
temp scripts deleted after use — none committed).

Files touched: `src/scenes/Arena.js`;
`src/assets/audience/{stranglerlewis,announcer,bellringer}/` (new, 8 frames
each).
Action required: Derek — live sign-off on all three in the actual browser
(same standing caveat every crowd-extra placement carries — screenshot
review isn't a substitute), especially the announcer/bellringer's new
in-front-of-the-ring depth convention since it's the first extra placed
that way.
Priority: low

### 2026-07-18 (policeman: intermittent idle scan, decoupled from match excitement) — Claude (Derek: "make his animations intermittent and not tied to the excitement, the cop isn't watching the match, he's looking for threats")

Follow-up on the entries directly below, same character, new session.
Until now `_setupPoliceman` pushed him into `this.crowdFans` like every
other extra, so his front→profile head-turn triggered off `_logEvent`'s
crowd-pop hook (`_reactCrowdExtras`) — he turned his head on pinfalls/
nearfalls same as the crowd's own excitement, which reads backwards for a
cop who's supposed to be watching the *crowd*, not the match.

Stopped pushing him into `crowdFans` (confirmed via `window.__WFM_GAME`:
`crowdFans.length` unchanged at 12, `.some(f => f.extra.slug ===
'policeman')` false — and his texture provably didn't move off
`policeman1` immediately after a forced `_logEvent('pinfall')` call).
`_setExtraFrame` itself doesn't care whether a fan is in that array — it
only needs the `fan` object — so this was safe to do without touching that
shared method.

Added `_schedulePolicemanScan(fan)`: an independent loop, unrelated to
match state, that waits a random 4-11s ("intermittent," not a steady
cycle), turns from `restFrame` up to a *random* target frame (not always
the full profile — sometimes a quick glance, sometimes a longer turn, so
consecutive scans don't read as one repeating animation), holds briefly,
turns back to `restFrame`, then reschedules itself. Called once from
`_setupPoliceman` in place of the old `crowdFans.push(fan)`.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green. Confirmed live-ness via `window.__WFM_GAME`: sampled his
texture key every 2s over 12s of real idle time and saw it change
(`policeman1` → `policeman5` → `policeman2`) with no match events fired —
the independent loop is genuinely running, not dead code.

Files touched: `src/scenes/Arena.js` only.
Action required: Derek — live sign-off on the scan's feel/timing (4-11s
idle window, 170ms per-frame step, 400-1300ms hold at the turn) — first
guess, easy to retune if it reads too fidgety or too rare.
Priority: low

### 2026-07-18 (policeman: 2x size, head held in place) — Claude (Derek: "keep his head placement the same but make him 3x that size" — corrected seconds later, same session: "lol, i meant 2 x")

One-line follow-up on the entry directly below, same session. Since origin
is (0.5,1) (bottom-center = groundY), top-of-head = groundY - h; scaling h
alone while holding groundY fixed grows a figure upward from a fixed
top, not in place. To hold the top fixed while `h` doubles (90→180),
`groundY` had to move down by the same amount `h` grew (270→360; old top
270-90=180, new top 360-180=180, unchanged). x=790 unchanged.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green. Confirmed visually via `page.screenshot()` — face, cap,
torso, and belt/holster all legible now at this scale, head position
unchanged from the prior round, standing right at the corner.

Files touched: `src/scenes/Arena.js` only.
Action required: Derek — live sign-off in the browser (same standing
caveat every crowd-extra placement round carries).
Priority: low

### 2026-07-18 (policeman: moved to the upper-right/far-right post, sized to the second rope) — Claude (Derek: "I want him near the upper right post, I want him to be a little taller, maybe he should be as tall as the second rope, i'm eventually going to place a policeman at each corner")

Follow-up on the entry directly below, same character, next session. Two
changes:

**Moved to a different, separate post.** The near-right post
(`RING.nearRight`, x=920) and far-right/"upper right" post (`RING.farRight`,
x=750, y=258) are two distinct fixed posts, not two points along one
corridor — each has its own fixed x and its own vertical draw span
(`drawPosts`: near posts 245-490ish, far posts 138-274). Moved him from
beside the near-right post to beside the far-right one: `x=790` clears the
ring's own receding boundary at this new `groundY` (~761 there, via the
same perspective-boundary formula the old `drawSideCrowd` used) with ~30px
margin, while staying close to the post's own x=750.

**Sized to the second rope, per Derek's explicit ask, not a perspective
guess.** `groundY=270` sits at the far post's own base. `h=90` puts his
head at `RING.ropes[1].farY` (181, the second rope's far-side height) at
that groundY — a direct read of "as tall as the second rope," deliberately
bigger than the ambient background-crowd scale at this depth would
otherwise suggest, since that's what was actually asked for.

**Made `_setupPoliceman` take `flip` as a param (default `true`)** instead
of hardcoding it, since Derek's stated plan is one policeman per corner —
left-side instances will need `flip:false` to face right into the ring,
and this avoids re-touching the method when that lands.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green. Confirmed visually via `page.screenshot()` crop — he
reads clearly taller than the surrounding background crowd, standing right
at the top corner where the ropes converge.

Files touched: `src/scenes/Arena.js` only.
Action required: Derek — live sign-off in the browser (same standing
caveat); next corner instances (near-left, far-left) are a known follow-up,
not started.
Priority: low

### 2026-07-17 (thirteenth crowd extra: corner policeman) — Claude, live-iterated with Derek in-session

Closes the PENDING assignment below — Derek's reference sheet landed
(`Sprite sheets/Audience/Policeman.png`, 8 frames). Same overall approach as
the photographer (kept out of `CROWD_EXTRAS`, own const + `_setupPoliceman`
mirroring `_setupPhotographer`, pushed into `crowdFans` so match-event
reactions work for free), but the source art itself required a new step:
this sheet is a single 4x2 pose grid (1716x916), not a horizontal strip —
every prior extra's source was one row of poses, so `cut.mjs` (which splits
on transparent-column gaps across the sheet's full height) can't read this
shape directly. Split it into two temp horizontal-strip PNGs first (row1:
front-facing calm, row2: continuing the turn to full profile — he stands at
attention throughout and gradually turns his head/body from front to right-
profile across all 8 frames, no sit→stand growth), then ran each through
`cut.mjs` unmodified with a shared `--scale` (native tallest frames 429px/
430px, essentially identical — confirms no real growth signal): row1 → the
real `policeman` slug (frames 1-4), row2 → a temp slug renumbered into
frames 5-8. `sizeBasis: 'width'` since he stays standing throughout (same
reasoning as marilyn/elvis/popcornguy's seated-turn frames), not `'height'`
(oldman/marlon/photographer's actual sit→stand case).

**Bug found and fixed: `drawSideCrowd()`'s right-flank flat-dot crowd fully
hid him.** First placement attempt (x=888, groundY=380, mirroring the
photographer's own documented "~55px gap from the post" groundY value)
measured clear of both the ring boundary and the fixed near-right post via
`window.__WFM_GAME` — but rendered completely invisible in a screenshot.
Root cause: `drawSideCrowd()`'s right flank (flat `fillCircle`/`fillEllipse`
dots, depth 10) draws across exactly that y-band (240-430), in front of his
actual cutout art (depth 2.8) — not a partial overlap, full occlusion at
every frame. This is exactly what the PENDING note below flagged as a
possible outcome. Asked Derek directly rather than guess a workaround
(remove the flank / leave it and place him differently / hold off since
Derek's planning to replace `drawSideCrowd()` himself) — he chose removal,
same treatment the left flank already got for the photographer. Removed the
right flank's `sideRows`/`rightBoundary`/its own `gfx` entirely (dead code
once the flank draw call was gone); `rand`/`s` stay, still used by the
foreground "backs of heads" rows lower in the same method.

**Placement, live with Derek:** with the flank gone, he was visible but
read as small/distant. Derek: "he needs to be closer to the ring and near
the corner post." Nudged x=888→905, groundY=380→415 — now standing right
beside the near-right post with the side ropes crossing naturally in front
of him at that depth, confirmed via screenshot crop (cap, torso, belt all
legible, ropes correctly occluding in front). Not iterated further this
session — Derek can ask for more (bigger, different y, etc.) once he's
looked at it live himself.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green, both before and after the flank removal and the
placement nudge. Confirmed visually via `page.screenshot()` crops (canvas
is scaled ~1.146x within the debug harness's 1100x700 viewport, offset
+9.25px top — accounted for when mapping game coordinates to screenshot
pixels for the crops).

Files touched: `src/scenes/Arena.js`, `src/assets/audience/policeman/`
(new, 8 frames).
Action required: Derek — live sign-off in the actual browser, same caveat
every crowd-extra placement carries (screenshot review isn't a substitute).
Priority: low

### PENDING — next Claude: policeman in the corner (Derek's queued assignment)

Derek's plan for whichever session picks this up next: add a policeman,
seated/standing in a ring corner — same general "named ringside character"
territory the photographer entries below just finished. No source art
confirmed dropped yet as of this note — check `Sprite sheets/Audience/`
for a policeman-named file before doing anything; if it's not there, this
is blocked the same way the photographer was (see that PENDING pattern,
now resolved, further below in this log for the shape of that blocker).

**Reusable patterns from the photographer work (all in `src/scenes/Arena.js`
unless noted), read the entries below for full context before guessing:**

- **Don't add a new named character to `CROWD_EXTRAS`** if it needs its own
  distinct placement (not one of the 11 proven front-row grid x-slots) —
  that array feeds `drawSecondRow`/`ThirdRow`/`FourthRow`'s random
  background pool too, so a unique character would get duplicated as
  anonymous filler. Follow `_setupPhotographer`'s pattern instead: its own
  const (see `PHOTOGRAPHER`) and setup method, still pushed into
  `this.crowdFans` so `_reactCrowdExtras`' match-event hook (pinfalls,
  nearfalls) triggers it for free — no separate trigger code needed.
- **`tools/audience-cutter/cut.mjs` was fixed this session** (commit
  `1be75a0`) — it used to fit each over-cap frame independently to
  `MAX_FRAME_HEIGHT`, flattening any multi-pose character whose frames were
  all shot above 360px native (silently killing sit→stand growth for
  oldman/marlon too, also fixed this session). Now computes one shared
  scale per invocation from that sheet's own tallest frame. **If the
  policeman has any pose change where size/height should read as
  different (e.g., saluting, drawing a baton, standing at attention vs.
  relaxed), use this fixed tool as-is** — no further changes needed there
  — and if he's cut from two source sheets, pass `--scale=<value>` on the
  second invocation (value printed by the first) to keep both sheets
  consistent across the seam. See that file's header comment.
- **The near-left/near-right ring-corner posts (`drawPosts`) are FIXED
  screen positions** (`RING.nearLeft.x=40` / `RING.nearRight.x=920`,
  8px wide, y-span 245-490) — they do NOT recede with perspective the way
  the ring boundary line (`leftBoundary`/`rightBoundary`) does. Any
  character placed near a corner needs real per-frame `displayWidth`/
  left-edge (or right-edge) measurement against that fixed post position,
  not just the perspective boundary — the photographer's placement was
  wrong twice (see the rounds below) before this was measured directly via
  `window.__WFM_GAME` + forcing `_setExtraFrame` through all frames.
- **"Stacked behind the ring canvas"** (Derek's phrase — canvas = the ring
  mat) — if a character sits close enough to the ring that they'd visually
  overlap the mat, give them a depth below `drawRingMat`'s 3 (photographer
  uses 2.8) so the mat correctly occludes the overlapping part, rather than
  the character floating in front of the whole ring at CROWD_EXTRAS'
  typical 1.5-10.5 depth range.
- **Live iteration workflow** — by far the fastest loop this session:
  `tools/debug/harness.mjs`'s `launch()` + `window.__WFM_GAME` to force a
  fan through candidate positions/frames directly (no restart needed),
  `page.screenshot()` + `sips -c <h> <w> --cropOffset <y> <x>` to crop and
  eyeball results, before committing to numbers in the actual source.
  Iterating blind on x/y/depth guesses and asking Derek to re-check burned
  much more time than measuring first.
- **`drawSideCrowd()`'s left flank is gone** (removed this session, made
  room for the photographer) — right flank is untouched. If the policeman
  goes on the right side near a corner, the flat-dot right flank may need
  the same removal treatment once he's placed, or he may need to work
  around/replace it — Derek's call once it's visible.

**Process note:** this session ran with two Claude tabs editing `Arena.js`
concurrently at times (Derek had them open side by side) — caused one
mixed-up instruction and required re-reading live file state rather than
trusting memory of prior edits mid-session. If Derek runs the policeman
work in parallel with anything else touching `Arena.js`, expect the same —
`git diff`/fresh `Read` calls before editing, don't assume your last edit
is still the file's current state.

Everything from the photographer work is committed (`1be75a0` — cutter fix
+ oldman/marlon re-cut; `88b6588` — photographer feature) and not yet
pushed (`git status` shows the branch ahead of `origin/master`). Working
tree was clean as of this note.

### 2026-07-17 (photographer: eighth round — flash workshop, offset onto the actual bulb + delayed one STEP) — Claude (Derek: "let's workshop the flash, it happens a frame too early I think and it's back from where the bulb would be")

Two fixes to `_setExtraFrame`'s flash trigger (entry three below), same
live session, after one more plain groundY nudge (418→428, "just a little
nudge lower" — not its own entry, folded in here).

**Position ("it's back from where the bulb would be"):** the flash was
centered on `stepX`/`groundY` — his body center/feet — not the bulb, which
sits well forward and near the top of his silhouette (he's holding the
camera out in front of him, arms raised). Read the offset directly off
`frame8.png` (220×360, origin 0.5/1 = bottom-center): the bulb sits ~30% of
the display width toward his facing direction from center, ~90% of the way
up from his feet. `flashX = stepX + dir * displayWidth * 0.30` (dir from
`spot.flip`, so it stays correct if a mirrored instance ever exists),
`flashY = groundY - displayHeight * 0.90`.

**Timing ("a frame too early"):** the flash used to fire in the same beat
`_setExtraFrame` lands on frame 8 — simultaneous with the pose change
itself, reading as early relative to the standing/flash pose actually
registering on screen. Delayed via `this.time.delayedCall(130, ...)` — one
`_reactCrowdExtras` STEP — so the pose lands first and the flash pops a
beat after, not on top of the transition.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green. Forced frame 8 via `window.__WFM_GAME`, waited past the
130ms delay, and screenshotted mid-decay — flash glow now visibly centered
on the camera/bulb area, not his torso.

Files touched: `src/scenes/Arena.js` only.
Priority: low

### 2026-07-17 (photographer: sixth round — groundY nudged 400→418, "his knees are above ring level")

One-line follow-up on the entry directly below, same live session. Derek:
"he's almost right, he just has to descend a few more pixels, right now
his knees are above ring level" — his seated knee height was floating
clear of the ring mat's near edge instead of reading as grounded against
it. `groundY` 400→418 (x/h/depth all unchanged). Verified via screenshot
crop before committing to the number — knees now line up with the mat
edge. `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green.

### 2026-07-17 (photographer: four rapid live-iteration rounds — position revert+nudge, forward step, localized flash, +25% size, depth-stacked behind the mat, left flank crowd removed) — Claude, all same session with Derek watching live

Fast back-and-forth after the "genuinely ringside" entry directly below —
Derek was looking at the dev server in real time and the fixes landed in
quick succession:

1. **"He's in the ring."** The groundY=465 spot from the entry below put
   his feet inside the near apron's own 445-490 y-span — he read as
   standing on the apron, not beside it. Derek: "go back to where he was,
   he just needed to be nudged a little" — reverted to the earlier
   x=70/h=140/groundY=380 spot (see two entries below) with a small nudge
   instead of another big relocation: x=85, groundY=400 (h handled
   separately, see #4).
2. **"His animation has him step forward from his chair, can we code that
   in."** Frames 5-8 (rising to standing) previously only changed texture/
   scale at a fixed spot.x — no actual movement. Added `extra.stepOffset`,
   an opt-in per-frame x shift in `_setExtraFrame`, direction-aware via
   `spot.flip` so it always steps toward the ring:
   `PHOTOGRAPHER.stepOffset = { 5: 5, 6: 14, 7: 22, 8: 24 }`.
   `_reactCrowdExtras`' existing down-sequence carries him back to `spot.x`
   automatically as he settles — no separate "step back" logic needed.
3. **"Make the flash less intense, it should only flash around the bulb."**
   The first pass reused `flickerOverlay` (full-screen white rect) — too
   much. Replaced with a dedicated `cameraFlashGfx` graphics object: two
   layered circles (dim 40px halo + bright 16px core) centered on the
   flash-bulb's actual screen position (`_triggerCameraFlash(x, y)` now
   takes coordinates, computed in `_setExtraFrame` from the fan's own
   position at flash time), same sharp-attack/quick-decay curve as before.
   Created in `create()` rather than lazily in `update()` — a graphics
   object made after the HUD camera's one-time `ignore()` snapshot would
   render on both cameras instead of just the main one (same reasoning as
   `flickerOverlay`/`grainGfx`, both created in `create()` for the same
   structural reason).
4. **"Made 25 percent bigger in his seating phase and his standing phase...
   he needs to be stacked behind the ring canvas."** One `h` change covers
   both phases since `sizeBasis:'height'` scales every frame off that
   single value (145→181; `frameScale` on frames 5-8 layers on top of
   whatever `h` is, unchanged). "Stacked behind the ring canvas" (canvas =
   the ring mat, standard wrestling terminology) meant his depth (10.5,
   above everything) needed to drop below `drawRingMat`'s depth (3) so the
   mat renders in front of whatever part of his now-bigger figure overlaps
   its trapezoid — set to 2.8 (still above `drawFarApronAndRopes`' 2 and
   every background crowd layer). Confirmed visually: his lower body now
   correctly disappears behind the mat's near-left corner edge instead of
   floating in front of the whole ring.
5. **"We can get rid of the fake crowd on that side."** `drawSideCrowd()`'s
   left-flank `fillCircle`/`fillEllipse` dots (same y-range the
   photographer now occupies) removed entirely — redundant/inconsistent
   next to his real cutout art. Right flank untouched (no named character
   there). `leftBoundary()` and the `nearLeft`/`farLeft` destructure in
   that method were only used by the removed block — deleted along with it
   rather than left as dead code.

One bug caught by `debug:play`, not just eyeballing: removing the left
flank's `let x = ...` declaration broke the right flank, which reused the
same `x` via bare assignment (no `let` of its own) — `debug:play -- all`
failed outright with "x is not defined" until the right flank got its own
`let x = ...`. Good reminder that `debug:play` catches real breakage
`npm test`/`build` alone wouldn't (both passed on the very same broken
commit, since neither exercises `create()`'s render path the way a real
page load does).

Verified after every step: `npm test` (43/43), `npm run build`,
`npm run debug:play -- all` (12/12). Final state confirmed visually via
`page.screenshot()` crops at both rest and peak frames — correct mat
occlusion, localized flash, clean left-side floor, bigger figure in both
phases.

Files touched: `src/scenes/Arena.js` only.
Action required: none blocking — Derek was live on this the whole time,
each round is his own sign-off, not a "verify next time" flag.
Priority: low

### 2026-07-17 (photographer: genuinely ringside placement + camera flash effect) — Claude (Derek: "I want the photographer to be standing almost ringside or ringside, and when he hits his peak, I want to add a flashbulb effect")

Two changes, same session, continuing directly on the frameScale/re-cut
entry below (this tab is now back to owning placement, per Derek — see
that entry's note about the earlier cross-tab mix-up).

**Placement:** the prior spot (`x=70, h=140, groundY=380`, see the entry
two below) was reasoned around clearing the near-left corner post's
clearance corridor, but measuring actual per-frame `displayWidth`/left-edge
via `window.__WFM_GAME` showed every frame's left edge fell *inside* the
post's own footprint (x 36-44) — the corridor was never actually clear,
just not yet flagged, and the new +25% frameScale on frames 5-8 made it
worse. Root issue: the near-left/near-right posts (`drawPosts`) are only
solid obstructions at the two *fixed* corner x's (`RING.nearLeft.x=40`,
`RING.nearRight.x=920`) — anywhere else along the near apron's y-span
(445-490, `RING.apronY`) is open floor, rendered in front of
`drawNearApron` (depth 6, well below the photographer's 10.5). Moved to
`x=150, h=170, groundY=465` — clear of the post with wide margin at every
frame (measured left edges 81-105px vs the post's 44px right edge,
including the boosted peak frames), sitting right at the ring's front
skirt instead of approximated "first row." Reads as actually ringside, not
a corner-adjacent guess.

**Camera flash:** frame 8 is his flash-bulb pose (see the twelfth-crowd-
extra entry below); `flashOnPeak: true` on `PHOTOGRAPHER` plus a check in
`_setExtraFrame` (`if (f === extra.frames && extra.flashOnPeak)
this._triggerCameraFlash()`) fires the instant he lands there during a
reaction cycle. Only the forward leg of `_reactCrowdExtras`' cycle ever
reaches the last frame (`down` stops one short of it), so this can't
double-fire on the way back down. `_triggerCameraFlash()` just records
`this._flashStart = this.time.now`; `update()` computes the actual curve —
reused `this.flickerOverlay` (the existing full-screen white rect already
driving the ambient CRT brightness jitter) rather than adding a second
overlay, combining flash-alpha and ambient-alpha via `Math.max` each frame
so a flash always reads through regardless of the ambient cycle's phase.
Sharp attack, `(1-t)²` decay over 220ms — pops rather than fades gently,
reads as a bulb going off against the grayscale broadcast look.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green. Flash verified numerically (`flickerOverlay.alpha` jumps
from ambient ~0.005 to ~0.60 the frame after forcing peak, decays back to
ambient within 300ms) and visually via `page.screenshot()` at the peak
instant — whole frame visibly washes brighter, chair and photographer both
readable through it, returns to normal immediately after.

Files touched: `src/scenes/Arena.js` only.
Action required: Derek — live sign-off on both, same as every crowd-extra
change; flash timing/curve (220ms, `(1-t)²`) is a first guess, easy to
retune if it reads too subtle or too harsh live.
Priority: low

### 2026-07-17 (photographer: +25% scale on the standing frames; oldman/marlon re-cut) — Claude, concurrent-session note

Two unrelated pieces landed in the same session, from two different tabs
Derek had open at once — flagging the overlap explicitly since it's easy to
misread the diff otherwise.

**frameScale mechanism (this tab):** Derek's ask ("he needs to be a touch
lower, but also scale him up 25% in the second set of frames, I think the
artwork is also the issue") was meant for the *other* tab, which owns
placement/scale tuning right now (see the entry above/below — it had just
reverted the enormous "behind the ring" placement). It landed in this tab
by mistake; by the time that was caught, the frame-scale half was already
built and working, so Derek asked to keep that part rather than unwind it,
and leave placement/"touch lower" to the other tab. Added `extra.frameScale`
as an opt-in per-frame multiplier in `_setExtraFrame` (`scale *=
extra.frameScale?.[f] ?? 1`, defaults to 1 — no effect on anything but
photographer) and set `PHOTOGRAPHER.frameScale = { 5: 1.25, 6: 1.25, 7:
1.25, 8: 1.25 }` — an explicit +25% on the standing-sheet frames on top of
whatever `_setupPhotographer` scale is in place, since even a correct
batch-scale cut (see the bug below) wasn't reading as big enough a change
per Derek's live look. **Whoever picks up placement next: this multiplier
now stacks with `spot.h`/`groundY`, factor that in when re-tuning.**

**oldman/marlon re-cut (same latent bug flagged in the photographer entry
below).** Confirmed the flag was real: both characters' committed frames
were uniformly 360px tall (checked via `sips -g pixelHeight`), meaning
their sit→stand growth had the exact same "every frame independently
flattened to the cap" problem as photographer's first cut. Re-cut both
through the already-fixed `cut.mjs` from their original source sheets
(`Sprite sheets/Audience/oldman.png`, `Marlon.png`+`marlon2.png`, still on
disk, gitignored):
- oldman (single sheet, native tallest frame 741px): straightforward
  re-cut, no `--scale` flag needed (only one invocation, nothing to keep
  consistent across). New frame heights 296→287→320→360, real growth
  where it was previously pinned flat at 360 for all four.
- marlon (two sheets, same merge pattern as photographer): cut `marlon2.png`
  (has the global-tallest frame, 729px) first to get its auto scale
  (0.4938), then re-cut `Marlon.png` with `--scale=0.4938` so both sheets
  share one scale — otherwise each sheet's independently-computed local-max
  scale would mismatch right at the frame4/frame5 hinge-pose seam, same
  cross-sheet issue documented in `cut.mjs`'s header comment. New heights
  332→333→335→306→295→330→360→360 — real ~20% growth from seated through
  the hinge pose to standing, previously flat at 360 throughout.

QA previews confirmed frame order/content unchanged for oldman (visually
re-checked); marlon's content wasn't re-checked visually since the crop/
split step is deterministic off the same source files — only the scale
step changed, verified numerically instead.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green.

Files touched (this tab): `src/scenes/Arena.js` (frameScale mechanism +
config only — no placement/x/h/groundY changes), `src/assets/audience/
oldman/` (re-cut, overwritten in place), `src/assets/audience/marlon/`
(re-cut, overwritten in place), `AI_HANDOFF.md`, `BUILDLOG.md`.
Action required: Derek — live-confirm oldman and marlon now actually read
as standing up (same never-live-verified caveat every crowd-extra entry
carries); reconcile with whatever the other tab lands on for photographer's
final `x`/`h`/`groundY` — this tab intentionally left those untouched.
Priority: low

### 2026-07-17 (photographer: fixed placement — was "behind the ring," now beside it) — Claude (Derek: "omg, he's enormous now, I want him to be sitting in the first row along the left side of the ring, he's currently in the wrong section, which might be the problem")

Picks up from the entry below, which itself records an earlier placement
iteration (side-flank → "behind the ring" at x=125, h=290, per a *previous*
direct call from Derek: "lower and behind the ring"). Seeing that live,
Derek's diagnosis was correct: the "wrong section" *was* the bug, not just
a bad number. h=290 was sized for the CROWD_EXTRAS front row's far depth
(groundY anchored off `RING.farLeft.y`); at that distance a figure that
size would be enormous relative to everything around it, which is exactly
what shipped.

Root fix: `_setExtraFrame`'s `groundY` formula (`RING.farLeft.y + spot.h *
0.45`) was hard-coded for the "behind the ring" depth every CROWD_EXTRAS
spot uses — no way to place a fan anywhere else without either duplicating
that method or distorting the shared one for everybody. Added `spot.groundY`
as an optional override (`spot.groundY ?? (RING.farLeft.y + spot.h *
0.45)`) — additive, every existing CROWD_EXTRAS spot omits it and gets the
old behavior unchanged.

`_setupPhotographer` now takes `(x, h, groundY)` and passes groundY through
via the spot. New placement: `x=70, h=140, groundY=380`. groundY=380 (not
the true front-corner y≈430-445) is deliberate — `drawPosts`' near-left
post is a *fixed* screen position (x≈40, spans y 245-490, does not recede
with perspective like the ring boundary does), so right at the front
corner the gap between the post and the ring's own left edge
(`leftBoundary(y)`) is only ~10px, too tight for a figure ("needs a clear
shot" was the exact complaint that moved him last time, still applies).
At groundY=380 that gap opens to ~55px while still reading as near/
first-row (drawSideCrowd's `sideRows` y:368 entry is the closest anonymous
row at this depth). h=140 scales him up from the CROWD_EXTRAS front row's
~100-122 range by roughly `perspectiveScale(380)/perspectiveScale(315)` —
this depth is measurably closer to camera, so he should read bigger than
the far front row, just not 290-bigger. Depth bumped from 1.5 (the far
front row's layer) to 10.5 (drawSideCrowd's flank layer, since he now
occupies that same beside-the-ring space).

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green. Screenshot crop confirms he reads at a normal seated
scale, clearly beside the ring rather than dwarfing it, with visible
clearance from the corner post and near ropes. Only `Arena.js` changed —
no re-cut needed, this was placement/scale only.

**Not yet verified live by Derek** — same caveat as every crowd placement
change in this project's history; screenshot review isn't a substitute for
Derek actually looking at it.

### 2026-07-17 (twelfth crowd extra: ringside photographer) — Claude, live-iterated with Derek in-session

Closes the PENDING assignment below — Derek's reference sheets landed
(`Sprite sheets/Audience/photographer.png` + `photographer2.png`, 4 frames
each). Same cut pipeline as every prior extra, with one real bug found and
fixed along the way.

**Cut:** sheet A → real `photographer` slug (frames 1-4: calm seated, camera
on lap, building to camera raised at eye level). Sheet B → temp slug,
renumbered into `frame5-8` (rising off the chair to standing, flash-bulb
peak on frame 8) — same hinge-pose seam between sheets as marlon. Frame
order was visually obvious from both QA previews, no round-trip needed.

**Bug found and fixed: `tools/audience-cutter/cut.mjs`'s downscale was
silently erasing every sit→stand growth signal.** `capHeight()` fit each
frame *independently* to exactly `MAX_FRAME_HEIGHT` (360) whenever the
native crop exceeded it. Photographer's native frames ran 574-717px tall
(measured via a temporary uncapped re-cut) — every single frame exceeded
360, so every frame got flattened to exactly 360, meaning `sizeBasis:
'height'`'s scale-off-tallest-frame logic had nothing to work with: display
height was pinned constant across all 8 frames, so he never visibly stood
up. This is very likely a latent issue for marlon and oldman too (their
committed frames are *also* uniformly 360px tall per `sips` — not fixed
here, out of scope, flagging for Derek/whoever touches them next) — those
just weren't caught because verification checked "scale is constant" as
the *expected-correct* signature (true for width-basis extras) without
separately confirming real height growth was present for height-basis
ones.

Fixed `cut.mjs` to compute ONE shared scale per invocation — from that
sheet's own tallest native frame — applied uniformly to every frame, so
relative height differences (the actual growth signal) survive the
downscale. Added an optional `--scale=<factor>` CLI flag so a two-sheet
character's second cut can reuse the first sheet's scale explicitly
(otherwise each sheet's independently-computed local-max scale would still
mismatch at the sheet seam). Photographer was re-cut with sheet B first
(auto scale 0.5021, native tallest 717px) then sheet A with
`--scale=0.5021`; final committed frame heights step 304→297→304→296→
288→328→359→360 — a real ~20% growth from seated to standing, confirmed
in-engine via `window.__WFM_GAME` forcing `_setExtraFrame` across all 8
frames.

**Trigger rhythm:** asked Derek directly rather than guess (the blocker
note below flagged this as worth asking) — tied to match events via the
existing `_reactCrowdExtras`/`_logEvent` hook (pinfalls, nearfalls, etc.),
same mechanism the front row already uses. Frame 8's flash-bulb pose reads
naturally as "capturing the moment."

**Placement — went through two live rounds with Derek, both corrected
in-session:**
1. First attempt followed the blocker note literally: a dedicated seat in
   `drawSideCrowd()`'s territory (beside the ring, reserved "press row" gap
   near the left flank, y=400). Derek's live read: "he needs to be lower
   and behind the ring" — wanted the same "behind the ring" placement
   CROWD_EXTRAS's front row uses (the `RING.farLeft.y`-relative `groundY`
   formula in `_setExtraFrame`), not the side-flank gap. Moved him there:
   added `_setupPhotographer(x, h)`, kept deliberately OUT of the
   `CROWD_EXTRAS` array itself (so he isn't swept into
   `drawSecondRow`/`ThirdRow`/`FourthRow`'s random background pool — he's a
   unique named character, not filler) but reusing the same
   extra/spot/fan shape and `_setExtraFrame`/`_reactCrowdExtras` machinery,
   pushed into `this.crowdFans` so the event-hook reaction "just works."
   Landed at x=170, h=170 (left of the front-row grid's leftmost slot,
   220/oldman — a corner-post read).
2. Second live read: "it looks awesome, but he's right in front of the
   post now, he needs a clear shot, moved down." Root cause: x=170 put him
   right where the near-left corner's diagonal side rope
   (`drawRopes`'s `sideRopeBands`) crosses at that depth — his own
   displayWidth (90-114px at that scale) was wider than the ~80px gap
   between the rope line and oldman's slot, so no x in that narrow niche
   could clear the rope without either overlapping it or oldman. Solved by
   measuring several candidate x/y pairs live (`window.__WFM_GAME` +
   `_setExtraFrame` + `page.screenshot()` crops, checking `displayWidth`/
   left-edge at every one of the 8 frames so the widest pose doesn't clip
   canvas-left either) rather than guessing again. Landed at x=125, h=290 —
   clear of the rope line at every frame with margin, reads as a distinct
   ringside seat along the near rail rather than tangled in the corner
   rigging, and bigger/lower per the same note.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green after each change. Confirmed in-engine (not just
programmatically) via direct `page.screenshot()` crops at both the resting
and peak (frame 8) poses at the final position — both read clean, no rope
overlap, visible growth on standing. Derek reviewed both placement attempts
live in this same session; the final x=125/h=290 position is his
in-session sign-off, not a "verify next time" flag like every prior
crowd-extra entry.

Files touched: `src/scenes/Arena.js`, `tools/audience-cutter/cut.mjs`,
`src/assets/audience/photographer/` (new), `AI_HANDOFF.md`, `BUILDLOG.md`
Action required: none blocking. Worth a look later: oldman's and marlon's
committed frames are also uniformly 360px tall (same latent bug pattern),
meaning their sit→stand growth may not actually be visible either — not
verified live for either of them per their own log entries below. Re-cut
both through the fixed `cut.mjs` (their original source sheets, if still
on disk) if Derek confirms they read as flat too.
Priority: low (photographer itself, resolved); medium (possible oldman/
marlon regression, unconfirmed)

### Standing note — `drawSideCrowd()` is Derek's own territory, don't touch/duplicate it

`drawSideCrowd()` (the flanking crowd left/right of the ring, plus the
"backs of heads" foreground rows) is the last piece of the crowd still on
flat `fillCircle`/`fillEllipse` dots — never touched by the row-by-row
cutout rework in the entries below. Derek said: "I am going to replace the
side crowd, maybe with less sprites though, just like three repeating" —
his own plan is a handful (~3) of repeating designs rather than the dense
dot-per-seat flanks currently there. Asked directly whether Claude should
build this or he's doing it by hand; he confirmed he's adding the side
crowd art himself. Same pattern as the earlier full-background reset
(logged further below) that happened directly in the file, outside a
Claude session — **expect `drawSideCrowd()` to change without a matching
Handoff Log entry.** Read the actual current code before assuming its
shape from this note; this file only captures intent, not the result.

(The ringside photographer originally queued here as a `drawSideCrowd()`
resident ended up placed "behind the ring," CROWD_EXTRAS-style, instead —
see the entry above. Still worth checking Derek's eventual flank-rework
result before assuming any shared pool/placement pattern.)

### 2026-07-17 (background crowd: fourth row) — Claude (Derek: "let's add one more row where they are a little darker than before")

`drawFourthRow()` added, identical template to `drawThirdRow()` (same
pool-weighting, no-adjacent-repeat pick, stagger, count, cheer:true), own
RNG seed. Continues the established ~0.82× step-down: `SPOT_H` 74→61,
`Y` 226→185, depth 0.9→0.8 (so it draws/occludes behind row 3, same fix
as the row-3 depth bug above), tint 0x4b4b4b→0x343434 (luminance 75→52,
one step darker, per Derek's ask). Wired into `create()` after
`drawThirdRow()`.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green. Screenshot crop confirms row 4 reads as faint heads
peeking above row 3's line — correctly subtler/darker/farther back, not
competing with the rows in front. Only `Arena.js` changed.

**Open thread, not started:** Derek flagged that `drawSideCrowd()` (the
flanking crowd left/right of the ring) still uses the pre-reset flat
`fillCircle`/`fillEllipse` dot rendering — never touched by any of the
row-by-row cutout work above. Needs a decision on direction before
touching it: matching it to the new cutout-based rows is one option,
leaving it as-is (different visual language, arguably fine since it's a
different viewing angle/context) is another.

### 2026-07-17 (removed background crowd signs — anachronistic for the era) — Claude (Derek: "I don't think there would be signs in those days")

The four flat gray rectangles floating over the crowd (`drawCrowd()`'s only
remaining content, left over from the pre-reset background system —
fan-made signs weren't a thing at 1940s-50s arenas the way they are in
modern televised wrestling/sports (that's a later, TV-era crowd behavior),
so they didn't fit the project's era-appropriate priority (see this file's
Priorities section). Removed the rects and, since that was `drawCrowd()`'s
only remaining content, the now-empty method and its `create()` call too
rather than leave a no-op hook around.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green; screenshot confirms the crowd/ring/HUD are otherwise
unaffected. Only `Arena.js` changed.

### 2026-07-17 (background crowd: fixed lighting falloff — front row was darkest, should be lightest) — Claude (Derek: "row one is the darkest, but it should be the lightest but slightly darker than the ring area")

Front row (`CROWD_EXTRAS`) tints were left over from an earlier, unrelated
pass (~0x55-0x6b range, luminance ~78-98) while rows 2/3 (`drawSecondRow`/
`drawThirdRow`) had no tint at all — full native cutout-art brightness.
Net effect: the row meant to be closest/brightest was the darkest thing
in the whole background, backwards from any real depth-lighting falloff.

Fixed as a three-point brightness ladder, referenced against the ring's
own colors (`drawRingMat` 0xb0b0a8 / `drawNearApron` 0xa0a098, luminance
~157-174):
- Front row: every tint pushed up +65 per RGB channel (preserves each
  character's relative hue/darkness, just raises the floor) — new range
  ~0x96-0xac, luminance ~145-165. Lightest crowd row, still under the ring.
- Row 2: new `setTint(0x6e6e6e)`, luminance 110.
- Row 3: new `setTint(0x4b4b4b)`, luminance 75.

Note: the scene runs through a global grayscale camera filter
(`create()`'s `cm.colorMatrix.grayscale(1)`), so hue never actually shows
— only each tint's luminance matters. The per-character hue variation in
the front row's original tints was already cosmetically inert for that
reason; kept it anyway (offset rather than replace) since flattening to
uniform gray wasn't asked for.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- all`
(12/12) all green. Screenshot confirms front row now reads clearly
brightest, just under the ring/apron, with rows 2 and 3 stepping down in
sequence. Only `Arena.js` changed.

### 2026-07-17 (background crowd: fixed row 3 draw order) — Claude (Derek: "row three is sitting on row two's heads, they need to be stacked behind")

Bug in the third-row entry immediately below: `drawThirdRow()`'s seats used
`.setDepth(1)`, identical to `drawSecondRow()`'s. Phaser draws equal-depth
objects in insertion order, and `create()` calls `drawSecondRow()` before
`drawThirdRow()`, so row 3 was painted *after*, i.e. on top of, row 2 —
the opposite of what a farther-back row needs. Fixed by dropping row 3 to
`.setDepth(0.9)` (still above `drawArenaBackground`'s 0, below row 2's 1
and the front row's 1.5), so row 2 now correctly occludes row 3 where they
overlap instead of row 3 painting across row 2's faces.

Verified: `npm test` (43/43), `npm run build`, `npm run debug:play -- pin`
all green; direct screenshot shows row 2's line clean/unbroken again with
row 3 only visible peeking above it. Only `Arena.js` changed (one line).

### 2026-07-16/17 (background crowd: third row added, cheer capability) — Claude, continuing on top of a reset made outside this thread

Between the ambient-motion entry below and this one, `drawCrowd()`'s
4-tier system was reset to nothing and rebuilt from scratch as a one-
row-at-a-time process — this happened directly in the file, not through
a Claude session, so it's not logged as its own entry above; picking it
up here from the resulting code. Current shape: `drawCrowd()` now only
draws the signs; `drawSecondRow()` is a new, separate 16-seat row (25%
oldman / 25% browndresslady / 50% random pool, no-adjacent-repeat,
staggered half the front row's spacing, ambient flicker via the same
`_scheduleAmbientFlicker` from the tier era) confirmed by Derek as
"looks great." Front row (`CROWD_EXTRAS`) untouched throughout.

Derek's ask: add a third row, same template as the second, but make sure
they can actually cheer (not just idle-flicker). Added `drawThirdRow()` —
identical structure to `drawSecondRow()` (own RNG seed so picks don't
mirror row 2 seat-for-seat), with `SPOT_H`/`Y` both stepped down by the
same ~0.82× ratio row 2 used over the front row (90→74, 268→226),
continuing the established recession rather than guessing new numbers.

`_scheduleAmbientFlicker` gained an options param, `{ cheer = false }`,
additive and backward-compatible — row 2's call is unchanged (still plain
restFrame↔frame2 flicker). Row 3 passes `{ cheer: true }`: ~30% of its
"active" beats jump to the design's own peak frame (last frame — every
`CROWD_EXTRAS` design's sequence builds to a fist-pump/cheer peak there,
per the per-design comments) instead of the subtle altFrame, with a longer
hold (500-1000ms vs 200-460ms) so it reads as an actual cheer.

Verified: `npm test` (43/43), `npm run debug:play -- all` (12/12),
`npm run build`, all green. Motion confirmed via `page.screenshot()` crops
2s apart differing in file size (103953 vs 103846 bytes) on an otherwise-
frozen frame — same technique as the ambient-motion entry below. Row 3
itself is visually subtle (peeking above row 2's heads at the screenshot's
edges) since it inherits row 2's template exactly, including no tint/
darkness dimming for depth — that's a deliberate "same template" choice,
not an oversight; flag to Derek if it should stand out more. Only
`Arena.js` changed.

### 2026-07-16 (background crowd: four ascending tiers, replacing the 15-row gradient) — Claude (Derek: previous session's result "was not what i wanted" — read as a flat gymnasium floor, not a packed arena bowl)

Derek's follow-up ask on the same session's cutout work above: stop blending
smoothly across 15 rows — build **three distinct rows** of randomized
background characters (a fourth "we'll see if we can do a static background"
was flagged as a later idea, not built), spaced so gaps in one row are
covered by the next, each row noticeably smaller/blurrier than the last,
with lighting going dark "after the first few rows," and an **ascending**
bowl-like perspective so the deep crowd reads as rising stadium seating
rather than a flat floor.

`drawCrowd()` (`Arena.js`) rewritten: the old `rows` array (15 entries,
smoothly interpolated size/lum/blur) is now `TIERS` — 4 entries, each 2-3
sub-rows sharing one scale/darkness/blur bracket, with a visible y-gap
between tiers instead of a continuous ramp:
- Tier 1 (3 sub-rows, y 212-246): brightest (lum 106-128), no blur — sits
  right behind the named front row for a clean handoff.
- Tier 2 (3 sub-rows, y 144-186): mid brightness (60-86), light blur.
- Tier 3 (3 sub-rows, y 76-118): where "dark after the first few rows"
  kicks in — lum drops to 24-40, heavier blur.
- Tier 4 (2 sub-rows, y 36-56): near-silhouette (lum 9-16), heaviest blur —
  small/dim enough to be a real candidate for a painted static backdrop
  later, per Derek's "we'll see" — left as sprites for now, not built.

Two new per-row mechanics inside each tier: alternating sub-rows get a
half-gap x stagger (`lineIdx % 2`) so a gap in one line sits behind a body
in the next, and a per-seat parabolic "bowl arc" (`tier.arc * archT²`, arc
strength 6→22 across tiers) lifts each line's ends above its center — bigger
arc the farther back the tier is — so the whole crowd curves up and around
like a real bowl instead of a flat horizontal baseline.

**Judgment call, not confirmed with Derek:** read "randomized *animated*
background characters" as *character sprites* (as opposed to a flat painted
backdrop — the phrase is contrasted against "static background" later in
the same sentence), not as a request for idle motion/frame-cycling on the
background figures themselves. Nothing else in the ask referenced timing,
motion, or reactions for this layer, and the named front row already owns
reactive animation (`_reactCrowdExtras`). If Derek meant literal motion,
that's a follow-up, not done here.

Verified: `npm test` (43/43), `npm run debug:play -- all` (12/12),
`npm run build`, and direct screenshots (title-card fade-out, mid-match)
showing four visually distinct ascending tiers with recognizable individual
designs up close, fading to dark/blurred silhouettes at the back. Only
`Arena.js` changed.

### 2026-07-16 (background crowd: density pass + ambient motion) — Claude (Derek: tiers still "looked like ass" — flat, sparse, muddy blur — then corrected the judgment call above: he does want the background moving)

Two follow-ups on the tiers above, same session:

**Density/legibility retune.** Derek's own point: rendering more copies of
the same 11 textures is ~free (GPU-batched, no new assets) — the real cost
is the blur FX pass per tier, independent of seat count. So seat counts
went up ~40% across all four tiers, tier-to-tier y-gaps and the bowl arc
strength both roughly doubled (arc 6/10/16/22 → 10/20/30/40) for a more
obvious ascending read, and blur was walked back on tiers 2-3 (steps
4→3/7→6, strength 0.45→0.3/0.85→0.55) because the earlier values blurred
individual designs into gray mud rather than reading as depth-of-field.
Tier 4 blur left alone — it's the near-silhouette tier by design.

**Ambient motion — reverses the "judgment call" logged above.** Derek
confirmed after seeing it static: he wants the background seats visibly
moving, not just varied in design. Added `_scheduleAmbientFlicker(img,
pick)`: each seat in tiers 1-3 (tier 4 skipped — too small/dark/blurred for
motion to read, not worth the timer count) flips between its assigned
design's `restFrame` and frame 2 (that design's own first reaction-sequence
frame — already hand-tuned per design, see `CROWD_EXTRAS` comments) on its
own randomized hold/stagger, so ~240 seats never move in lockstep. No
rescale on the texture swap — same fixed-reference-scale trick
`_setExtraFrame` uses for the front row, so a wider alt-frame pose doesn't
shrink-and-sink (see that method's comment for the bug this dodges).
`pool` (built in `drawCrowd`) now carries `slug`/`restFrame`/`frames` per
design alongside the existing `key`/`h`, needed to build the alt-frame
texture key per seat.

Verified: `npm test` (43/43) and `npm run build` both green right after
this landed; `npm run debug:play -- pin` also green (full `-- all` re-run
was pending a transient sandbox tool outage, not a code concern — the
change only touches decorative background sprites, no match-logic paths).
Motion itself confirmed two ways: two `page.screenshot()` crops of the
background band 1.5s apart came back different file sizes (146786 vs
146463 bytes) in an otherwise-static freeze-frame, and a same-technique
in-page canvas capture was tried first but came back blank both times —
Phaser's WebGL canvas doesn't support `drawImage`-from-canvas without
`preserveDrawingBuffer`, so that route is a dead end for future checks;
use real `page.screenshot()` crops instead. Only `Arena.js` changed.

### 2026-07-16 (background crowd: randomized cutouts + depth blur) — Claude (Derek: front row "looks mostly good" but wanted the deep crowd behind it to stop reading as flat grey dots)

Derek's ask: keep the front row (`CROWD_EXTRAS`) unique — don't touch those
designs or spots — but fill the deep background crowd behind it with random
copies of the *same* cutout art so it reads as a packed stadium instead of
11 lone figures floating over abstract dots, with each row getting
progressively blurrier going back for a depth cue.

`drawCrowd()` (`Arena.js`) previously drew its 15 rows as flat grey
`fillCircle`/`fillEllipse` pairs via one `Graphics` object. Replaced that
with: for each row, build a `Container` of `Image` game objects — one per
seat, each randomly assigned one of the 11 `CROWD_EXTRAS` designs at its
`restFrame` texture (they don't react, only the front row does), random
per-seat flip and a 4/5/6ft height jitter carried over from the old circle
sizing, tinted to the row's original grayscale `lum` value. Row position/
count/gap/lum all reused unchanged from the old `rows` config — only what
gets drawn at each seat changed.

Blur: Phaser 4 doesn't have the old `gameObject.postFX` API — this build's
FX system is `gameObject.enableFilters()` → `gameObject.filters.internal.
addBlur(quality, x, y, strength, color, steps)` (verified empirically via
`window.__WFM_GAME`, sentinel-value argument probing — no docs consulted,
positional order isn't obvious from the minified CDN bundle). Applied once
per row to that row's `Container` (one FX pass composites all of that
row's seats, not one pass per sprite — 15 passes total, not ~257).
**Important tuning finding:** `strength` above ~2 relative to `steps`
produces a visible ghosting/banding artifact — a Kawase-blur implementation
detail where the multi-tap offsets become individually visible as ~N
discrete offset copies instead of blending into a smooth blur. Kept
`strength` in `0.3..1.2` and scaled `steps` (`2..10`) as the primary blur
knob per row depth instead — confirmed clean (no banding) at both ends of
that range via direct screenshot comparison. Row 0 (nearest, right behind
the front row) gets no blur at all, for a clean handoff off the crisp front
row.

**Flagging, not fixing:** this applies the blur filter live, every frame,
to genuinely static content (the background crowd never moves or
reacts) — 14 active FX passes/frame is real repeated GPU cost for
something that could be baked once into a texture and displayed flat
forever after. `debug:play -- all` (which drives the game in as-close-to-
real-time as Playwright allows) took noticeably longer this session than
prior crowd-extra sessions before completing (still 12/12 green, just
slower) — plausibly this cost, though this sandboxed/software-rendered
environment likely isn't representative of Derek's actual GPU. Not
optimizing further without Derek's read on whether it's actually laggy on
his machine; if so, the fix is straightforward (bake each row's `Container`
into a `RenderTexture` once at `create()` via `rt.draw(container)`, then
`container.destroy()` — one-time blur cost, zero per-frame cost after).

Verified via `window.__WFM_GAME`: 15 `Container`s, 257 total background
sprites, front row's 11 `crowdFans` untouched. Screenshots (full-frame and
zoomed both edges) show a dense, non-repeating crowd with a smooth
near-to-far blur gradient and no banding. `npm test` (43/43),
`npm run debug:play -- all` (12/12), `npm run build`, all green.

Files touched: `src/scenes/Arena.js` only (`drawCrowd()`)
Action required: Derek — live sign-off on how the depth crowd actually
reads in motion (same live-check caveat as every prior crowd session,
compounded here by genuinely dark/low-contrast background art being hard
to judge from a static screenshot), and a read on whether the live-blur
performance cost is worth baking away.
Priority: low

### 2026-07-16 (crowd-extra three-row depth band) — Claude (Derek's own unfinished audience work from the night before: front row read "very jumbled," wanted three distinct receding rows)

Derek picked this back up directly, describing the target: three distinct
rows of animated audience members in front, each row a little higher than
the next, with the further-back rows dipping into hard-to-see territory —
current state read as jumbled instead.

Root cause: every `CROWD_EXTRAS` spot computed `groundY` from `RING.farLeft.y
+ spot.h * 0.45` — the only thing varying it was each character's own tuned
`h` (92-122px range), a ~14px total spread across all ten. They were all on
one shared baseline, not three separated bands.

Added `EXTRA_ROWS` in `Arena.js` — three bands (`yOffset`/`scaleMul`/`dim`/
`depth`), selected per spot via a new `row` field (1/2/3, default 1). Row 1
is byte-identical to the prior render (yOffset 0, scaleMul 1, dim 1, depth
1.5 — same as every extra used before this pass). Rows 2/3 push `groundY`
up (further from the near camera), scale down (0.82/0.66), dim the tint via
a new `dimTint(hex, factor)` helper (0.8/0.62), and lower `setDepth`
(1.35/1.2) so front-row spots draw over back-row ones on overlap.

Assigned all ten existing extras to a row, interleaved by x-grid index
(`index % 3`) rather than blocking rows 2/3 to one side: row 1 = oldman/
browndresslady/alfred/popcornguy, row 2 = groucho/elvis/audrey, row 3 =
dizzy/marilyn/lucille. Full detail and reasoning in the new comment block
above `EXTRA_ROWS`.

**Verified:** `window.__WFM_GAME` confirms three separated bands — row 1 y
303-311 (displayHeight 100-118, full tint), row 2 y 285-293 (displayHeight
85-100, ~80% tint), row 3 y 265-269 (displayHeight 66-71, ~62% tint).
Confirmed visually too, not just numerically — a cropped/zoomed debug
screenshot at t=7s (past the intro title card's fade) shows smaller, dimmer
figures reading as sitting further back between the bigger front-row ones.
`npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run build`,
all green.

Only touched `Arena.js` (the `EXTRA_ROWS`/`dimTint` additions, the `row`
field on each spot, and the `_setupCrowdExtras`/`_setExtraFrame` seam),
plus this entry and the matching `BUILDLOG.md` entry — the still-queued
eleventh-extra note directly below is untouched and still open.

Files touched: `src/scenes/Arena.js`, `AI_HANDOFF.md`, `BUILDLOG.md`
Action required: Derek — live/in-motion sign-off on the row read (row
assignment and the yOffset/scaleMul/dim numbers were my judgment call, not
measured against a reference image — easy to retune per-row or reassign
which character sits where if any row still doesn't read right in motion).
Priority: medium

**Merge note (2026-07-18):** this entry was pushed directly to
`origin/master` (commit `ef6aa4d`) from a point before marlon existed, while
marlon (entry directly below) and everything after it landed in a separate,
unpushed local line of history — the two diverged and were reconciled by
merge on 2026-07-18. Marlon's own spot picked up `row: 2` at that point,
continuing this entry's index%3 interleave at his grid index (10); see
`EXTRA_ROWS`' comment in `Arena.js` for the up-to-date row assignment
including him. Everything above this note (2026-07-17/18) already reflects
the merged, EXTRA_ROWS-aware state — this note exists only so the history
here reads coherently against what actually happened.

### 2026-07-16 (eleventh crowd extra) — Claude (marlon added, took the last open `+300` grid slot; closes the queued note directly below)

Picked up Derek's queued assignment (entry directly below): source sheets
`Sprite sheets/Audience/Marlon.png`/`marlon2.png` (gitignored, 4 frames
each) were already dropped. Same pipeline as every prior extra: cut sheet A
to the real `marlon` slug, cut sheet B to a throwaway `marlon-temp` slug and
renumber its frames into `frame5..8`, read the QA preview, delete the temp
slug's folder and preview.

Frame order was visually obvious from both QA previews, no round-trip
needed — but the shape is different from every extra since dizzy: **marlon
actually stands up**, he isn't seated-throughout. Sheet A: calm hands
folded → leaning forward, hands gripping his knees, building tension.
Sheet B: a hunched hinge pose (hands gripping the chair edge, about to
rise — near-identical framing to sheet A's last pose, just the natural
seam between the two source sheets) → rising off the chair → standing →
a full standing fist-pump cheer. Because of that real height change, gave
him `sizeBasis: 'height'` like oldman rather than `'width'` like the
seated-only extras — using `'width'` here would've clipped or distorted
the stand-up frames against a pinned seated height.

Took the grid note's last open slot, `x = W/2 + 300`, `h: 118` (close to
oldman's `118`, similar frame proportions). Updated the grid note comment:
all 11 proven positions are now occupied; a 12th extra needs a reshuffle or
a new placement strategy (second row, untested, floated back in the
marilyn-era entries).

Verified via `window.__WFM_GAME`: `crowdFans` length 11, marlon's fan
resolved at `x: 780, h: 118, flip: false`, all 8 `marlonN` textures present
(`textures.exists` true for each, no missing-texture console errors on
load). Cycled `_setExtraFrame` through frames 1-8 directly: scale held
constant at `0.328` (`= 118/360`) and `y` held constant at `311` across
every frame — confirms no shrink-and-sink regression (the bug fixed
earlier this session-chain in `_setExtraFrame`, see the entry below) and
confirms the `'height'` basis is behaving like oldman's, not drifting like
a `'width'`-basis extra would if misconfigured. `npm test` (43/43),
`npm run debug:play -- all` (12/12), `npm run build`, all green. Not
eyeballed live in motion — same CRT/grain-filter caveat as every prior
crowd-extra session; static debug screenshots at t=3s/8s only caught the
intro title card and a distant, low-contrast silhouette of the row, not
enough to judge pose readability by eye.

The resize-pass thread flagged as "still sitting modified" in every prior
entry back through audrey/lucille is now resolved — it was committed
(`a2435b3`) and pushed earlier this session, before marlon's work started.

Files touched: `src/scenes/Arena.js`, `src/assets/audience/marlon/` (new),
`AI_HANDOFF.md`, `BUILDLOG.md`
Action required: Derek — live/in-motion sign-off on marlon's placement,
stand-up timing, and pose order, same as every prior crowd extra. Front
row is now at all 11 proven grid slots filled; no further "next free slot"
assignment exists without a reshuffle or new row strategy.
Priority: low

### 2026-07-16 (eleventh crowd extra queued) — Derek (relayed by Claude): one more extra planned, +300 grid slot, to be done in a separate session

Derek's plan: add one more (11th) crowd extra, filling the last open grid
slot (`W/2 + 300` — see the grid note above `CROWD_EXTRAS` in `Arena.js`;
every other of the 11 proven positions is now occupied by oldman,
browndresslady, popcornguy, marilyn, elvis, dizzy, groucho, alfred, audrey,
and lucille). Derek will pick this up himself in a separate chat/session —
not an assignment for whichever session reads this next; flagging only so
the grid-slot bookkeeping and current 10/11-occupied state are visible
before that session starts. Same pipeline as every prior extra applies
(cut sheet A to the real slug, cut sheet B to a throwaway temp slug and
renumber `frame5..8`, confirm order from the QA preview, add a
`CROWD_EXTRAS` entry with `sizeBasis: 'width'` unless it genuinely stands,
verify via `window.__WFM_GAME` + `npm test` + `npm run debug:play -- all` +
`npm run build`, then BUILDLOG.md + AI_HANDOFF.md entries) — see the
`_setExtraFrame` doc comment below (fixed 2026-07-16) for how the
width/height scale basis actually works before tuning a new extra's `h`.

Once this 11th extra lands, the front row is at Derek's originally stated
target of "~10 unique designs" plus one — no further grid slots exist in
the proven 220-780 span without another reshuffle or a new placement
strategy (a second, more distant row was floated as untested back in the
marilyn-era entries, if a 12th is ever wanted).

Files touched: `AI_HANDOFF.md` only (forward note)
Action required: Derek — cut and land the 11th extra himself in a new
session.
Priority: low

### 2026-07-16 (shrink-and-sink bug fix) — Claude (root-caused and fixed Derek's "groucho/elvis get smaller and lower" report; landed unlabeled inside `a7ad148`)

Derek's live-check report on groucho and alfred: groucho and elvis "seem to
get smaller and lower" mid-reaction, and marilyn/popcornguy read as too
small. Diagnosed with `window.__WFM_GAME`, forcing each `CROWD_EXTRAS` fan
through every frame via `_setExtraFrame` and reading `displayWidth`/
`displayHeight` directly rather than eyeballing.

**Root cause:** `_setExtraFrame`'s `sizeBasis === 'width'` branch computed
`scale = targetW / dims.w` where `dims` was `extra._dims[f]` — the
*currently displayed* frame's own crop width, not a fixed reference. Any
pose where a limb extends sideways (groucho's cigar arm, elvis's spread
legs, marilyn/popcornguy's thrown fist) widens that specific frame's crop
bounding box; since `scale` applies uniformly to both axes via
`setScale(scale, scale)`, a wider-cropped frame produced a *smaller* overall
scale, shrinking the whole figure to hold the on-screen width constant.
Bottom-anchored at a fixed `groundY`, a shrinking sprite reads as sinking.
Measured pre-fix: groucho 104px→76px across the cycle (intended constant
104), elvis 101-138px (both under *and* over 122, since a narrower-than-rest
frame scales the *other* direction), marilyn 92-111 vs 102, popcornguy
89-106 vs 104. `displayWidth`, the thing actually being pinned, was the one
value that stayed artificially constant — backwards from what a seated,
never-standing character should look like.

**Fix:** compute scale once from the *resting* frame's own height
(`scale = spot.h / rest.h`) and apply that single value to every frame in
the cycle, instead of recomputing per displayed frame. This mirrors the
`'height'` branch's existing correct pattern (`refH` computed once via
`Math.max` across all frames, same scale applied to all) — a fixed
per-extra scale that lets *width* vary naturally with pose instead of
forcing width constant and letting height (and thus apparent size) swing.
Removed the now-unused `dims` local.

**Verified:** re-ran the per-frame `window.__WFM_GAME` probe for all seven
`'width'`-basis extras (browndresslady, popcornguy, marilyn, elvis, dizzy,
groucho, alfred) — every one now holds `displayHeight` exactly at `spot.h`
across all 8 frames; `displayWidth` is the axis that now legitimately varies
with pose. `npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run
build`, all green. Forced every extra to its peak (widest) frame
simultaneously and screenshotted the front row — visually confirmed no one
reads as shrunk or sunk relative to their neighbors.

**Process note, for the record:** this diagnosis and fix happened in the
same working-tree session that landed groucho/alfred, but the fix itself
was made and verified *before* being committed — then a concurrent session
picked up the queued Audrey/Lucille assignment and its `a7ad148` commit
swept the already-fixed `Arena.js` in alongside the new assets (the file
showed clean in `git status` by the time that session committed, so it
looks like a broad `git add` rather than a deliberate include). The fix is
correct, verified, and already live on `origin/master` — this entry exists
purely so it has a documented rationale of its own, since `a7ad148`'s
commit message only describes the new assets.

Files touched: `src/scenes/Arena.js` (already committed in `a7ad148`),
`AI_HANDOFF.md`, `BUILDLOG.md` (this entry)
Action required: Derek — confirm the front row now reads correctly in
motion, especially groucho/elvis at their reaction peaks.
Priority: medium (visible regression Derek already flagged; fix verified
but not yet Derek-confirmed live)

### 2026-07-16 (ninth and tenth crowd extras) — Claude (audrey and lucille added, per Derek's queued assignment below)

Picked up the queued assignment from the entry directly below. Source
sheets (`Sprite sheets/Audience/Audrey.png`/`audrey2.png`, `Lucille.png`/
`Lucille2.png`, gitignored, 4 frames each) were already dropped, so both
went in back-to-back, same pipeline as groucho/alfred: cut sheet A to the
real slug, cut sheet B to a throwaway temp slug (`audrey2tmp`/
`lucille2tmp`) and renumber its frames into `frame5..8`, read the QA
preview.

Frame order was visually obvious for both, no round-trip needed. Audrey:
reserved hands-folded rest → a gloved hand rising to the mouth in a
delicate gasp (sheet A) → hands clasped near the chin, leaning further
forward as the reaction builds (sheet B). Lucille: calm hands folded in her
lap → hands-to-cheeks shock (sheet A) → animated talking gestures → a
bigger two-handed gesture → an arms-up cheer peak → settling back to
clasped hands (sheet B) — same calm-then-build-then-settle shape as
browndresslady.

Followed the grid note in `Arena.js` directly: audrey took `+125`, lucille
took `+190`, the next two free slots after alfred's `+70`. Both
`sizeBasis: 'width'` (seated throughout, never stand); gave lucille
`flip: true` for facing variety, matching the mix used across the row.
Updated the grid note's "currently free" list in the same commit — only
`+300` remains open.

Verified via `window.__WFM_GAME`: all 10 crowd fans visible and resolved,
audrey at `x: 605, displayHeight: 106` and lucille at `x: 670,
displayHeight: 108` (both matching their `spot.h`), lucille's `scaleX`
negative confirming the flip. `npm test` (43/43), `npm run debug:play --
all` (12/12), `npm run build`, all green. Not eyeballed live in motion —
same CRT/grain-filter caveat as every prior crowd-extra session; a t=3s
debug screenshot only caught the still-fading intro title card.

Only committed `Arena.js`, the new `audrey/` and `lucille/` frame folders,
plus this entry and the matching `BUILDLOG.md` entry. The resize-pass
thread (`cut.mjs` + oldman/browndresslady/popcornguy resized frames) is
still sitting modified in this tree from an earlier session — left
untouched, per every entry below.

**Also flagging for Derek directly (not an instruction to future AI
sessions):** `git push` failed this session — the harness's own
production-deploy safety classifier blocked it, stating this repo's remote
resolves to `dareolson/the-rate-guide` (a different project that deploys to
Vercel on every push to master). Ran `git remote -v` in this repo and it
shows `origin` pointing at
`github.com/dareolson/wrestling-from-marigold.git`, not the-rate-guide, so
the two don't appear to match — but per the tool's own instructions, an
agent shouldn't unilaterally decide a safety block is wrong and route
around it. Leaving this for Derek to resolve directly (check the actual
remote yourself, and either push manually or adjust whatever the
classifier is keying off). This session's 3 local commits (plus the prior,
also-unpushed groucho/alfred commits) are sitting on `master`, untouched
and not force-pushed or altered.

Files touched: `src/scenes/Arena.js`, `src/assets/audience/audrey/` (new),
`src/assets/audience/lucille/` (new), `AI_HANDOFF.md`, `BUILDLOG.md`
Action required: Derek — live/in-motion sign-off on audrey's and lucille's
placement and pose order, same as every prior crowd extra; also look into
the push-block note above and push these commits yourself when ready.
Priority: low (crowd extras), medium (unpushed commits)

### 2026-07-16 (next crowd extras queued) — Derek (relayed by Claude): add Audrey and Lucille next, same workflow

Derek's direction for whichever session picks this up next: add two more
crowd extras, **Audrey** and **Lucille**, following the exact same pipeline
as groucho/alfred immediately below (and the five before them) — Derek will
have dropped `Sprite sheets/Audience/audrey.png` + `audrey2.png` and
`lucille.png` + `lucille2.png` (gitignored source, 4 frames each) for
`tools/audience-cutter/cut.mjs` to cut.

Do them one after the other, same as this session did groucho then alfred:
cut sheet A to the real slug, cut sheet B to a throwaway temp slug and
rename its frames into `frame5..8`, read the QA preview to confirm frame
order (ask Derek only if it's not visually obvious), add a `CROWD_EXTRAS`
entry in `Arena.js` (`sizeBasis: 'width'` unless the character genuinely
stands up mid-cycle), pick the next free x from the grid note above
`CROWD_EXTRAS` (currently free after alfred: `+125, +190, +300`), verify via
`window.__WFM_GAME` + `npm test` + `npm run debug:play -- all` + `npm run
build`, then a BUILDLOG.md + AI_HANDOFF.md entry per character. Only commit
the files you authored — see the note in every entry below about the
still-uncommitted resize-pass thread (`cut.mjs` + oldman/browndresslady/
popcornguy frames) sitting in this tree; leave it alone.

Files touched: `AI_HANDOFF.md` only (forward note)
Action required: next session — cut and land Audrey and Lucille.
Priority: low

### 2026-07-16 (eighth crowd extra) — Claude (alfred added, took the reshuffle's freed `+70` grid slot)

Derek cut two chroma-keyed reference sheets (`Sprite sheets/Audience/alfred.png` + `alfred2.png`, gitignored source, 4 frames each) via `tools/audience-cutter/cut.mjs` — frames shipped pre-downscaled (~111-143KB each) with no separate resize pass needed. Frame order was visually obvious from the QA preview (no round-trip needed): sheet A is calm, hands folded on his lap, settling slightly forward (frames 1-4); sheet B continues that forward lean into hands clasping and rising toward the chest, reading as a building applause (frames 5-8) — same calm-then-build shape as the other seated extras.

This is the eighth crowd extra, added directly after groucho in the same session. Followed the reshuffle's documented grid note in `Arena.js` — picked the next free slot after groucho's `-205`, which is `+70`. `sizeBasis: 'width'` since he's seated throughout and never stands, same reasoning as the other seated extras. Updated the grid note's "currently free" list in the same commit.

Verified via `window.__WFM_GAME`: `alfred1`/`alfred8` textures resolve, the alfred fan is `visible: true` at `x: 550`, `displayHeight: 112` matching `spot.h`, `crowdFans.length` is 8 (one per design). `npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run build`, all green. Not eyeballed live in motion — same CRT/grain-filter caveat noted in every prior crowd-extra session; Derek's live check is still the real confirmation.

Only committed `Arena.js` and the new `alfred/` frame folder, plus this entry and the matching `BUILDLOG.md` entry. `cut.mjs` and the oldman/browndresslady/popcornguy resized frames still sitting modified in this tree are that other, still-uncommitted resize-pass thread's to land — left untouched.

Files touched: `src/scenes/Arena.js`, `src/assets/audience/alfred/` (new), `AI_HANDOFF.md`, `BUILDLOG.md`
Action required: Derek — live/in-motion sign-off on alfred's and groucho's placement and pose order, same as every prior crowd extra.
Priority: low

### 2026-07-16 (seventh crowd extra) — Claude (groucho added, took the reshuffle's freed `-205` grid slot)

Derek cut two chroma-keyed reference sheets (`Sprite sheets/Audience/groucho.png` + `groucho2.png`, gitignored source, 4 frames each) via `tools/audience-cutter/cut.mjs` — the downscale patch is committed, so `groucho/frame1..8.png` shipped pre-downscaled (~130-154KB each) with no separate resize pass needed. Frame order was visually obvious from the QA preview (no round-trip needed): sheet A is calm, hands folded, cigar down, building to picking the cigar up to a raised hold (frames 1-4); sheet B continues leaning further in, gesturing with the free hand, to a pointing-outward punchline gesture (frames 5-8) — same calm-then-build shape as the other seated extras.

This is the seventh crowd extra. Followed the reshuffle's documented grid note in `Arena.js` directly rather than asking Derek — dizzy (previous session, same day) took the `-150` slot, so picked the next free one, `-205`. `sizeBasis: 'width'` since he's seated throughout and never stands, same reasoning as browndresslady/popcornguy/marilyn/elvis/dizzy. Updated the grid note's "currently free" list in the same commit.

Verified via `window.__WFM_GAME`: `groucho1`/`groucho8` textures resolve, the groucho fan is `visible: true` at `x: 275`, `displayHeight: 104` matching `spot.h`, `crowdFans.length` is 7 (one per design). `npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run build`, all green. Not eyeballed live in motion — same CRT/grain-filter caveat noted in every prior crowd-extra session; Derek's live check is still the real confirmation.

Only committed `Arena.js` and the new `groucho/` frame folder, plus this entry and the matching `BUILDLOG.md` entry. `cut.mjs` and the oldman/browndresslady/popcornguy resized frames still sitting modified in this tree are that other, still-uncommitted resize-pass thread's to land — left untouched.

Files touched: `src/scenes/Arena.js`, `src/assets/audience/groucho/` (new), `AI_HANDOFF.md`, `BUILDLOG.md`
Action required: Derek — live/in-motion sign-off on groucho's placement and pose order, same as every prior crowd extra.
Priority: low

### 2026-07-16 (sixth crowd extra) — Claude (dizzy added, took the reshuffle's freed `-150` grid slot)

Derek cut two chroma-keyed reference sheets (`Sprite sheets/Audience/dizzy.png` + `dizzy2.png`, gitignored source, 4 frames each) via `tools/audience-cutter/cut.mjs` — the downscale patch is now committed (as of the reshuffle entry below), so `dizzy/frame1..8.png` shipped pre-downscaled (~92-135KB each) with no separate resize pass needed. Frame order was visually obvious from the QA preview (no round-trip needed): sheet A is calm with glasses and tie, a subtle hands-starting-to-move build (frames 1-4); sheet B builds from there through excited talking, a double fist-pump, a raised-fist shout, to clapping (frames 5-8) — same calm-then-build shape as the four seated extras before him.

This is the sixth crowd extra. At session start the front row read as fully occupied (all of oldman's spots and the four browndresslady/popcornguy gaps and marilyn's single seam were in use, per the last commit this session had read) — asked Derek rather than guess, and he said to replace an oldman spot again, same as elvis. Before landing that, discovered a concurrent session had committed a full reshuffle (`d011847`, entry directly below) partway through this session: every design dropped to a single spot, freeing six grid slots (`-205, -150, +70, +125, +190, +300`) specifically for the next batch of designs, documented in the new comment block above `CROWD_EXTRAS`. That supersedes the "replace an oldman spot" answer, so used the reshuffle's own explicit instruction instead — picked the free `-150` slot rather than eating another oldman instance. `sizeBasis: 'width'` since he's seated throughout and never stands, same reasoning as browndresslady/popcornguy/marilyn/elvis. Tint `0x6b6355` reused from a since-removed oldman spot rather than inventing a new value.

Verified via `window.__WFM_GAME`: `dizzy1`/`dizzy4`/`dizzy5`/`dizzy8` textures all resolve, the dizzy fan is `visible: true` at `x: 330` with correctly flipped scale (`scaleX: -0.278`, `displayHeight: 100` matching `spot.h`), `crowdFans.length` is 6 (one per design, as the reshuffle intended). `npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run build`, all green. Not eyeballed live in motion — same CRT/grain-filter caveat noted in every prior crowd-extra session; a static debug-shot screenshot at t=8s shows a seated figure in the row with no visible collision or breakage, but Derek's live check is still the real confirmation.

Only committed `Arena.js` and the new `dizzy/` frame folder, plus this entry and the matching `BUILDLOG.md` entry. `cut.mjs` and the oldman/browndresslady/popcornguy resized frames still sitting modified in this tree are that other, still-uncommitted resize-pass thread's to land — left untouched.

Files touched: `src/scenes/Arena.js`, `src/assets/audience/dizzy/` (new), `AI_HANDOFF.md`, `BUILDLOG.md`
Action required: Derek — live/in-motion sign-off on dizzy's placement and pose order, same as every prior crowd extra.
Priority: low

### 2026-07-15 (crowd-extra reshuffle) — Claude (dropped every design to one spot; Derek's targeting ~10 unique designs, another Claude session drawing the next batch)

Derek's plan: build toward ~10 unique crowd-extra designs, one instance each, rather than repeating any single design enough to read as an obvious clone (oldman was eating 5 of the row's 11 slots by himself). Reshuffled `CROWD_EXTRAS` in `Arena.js` so oldman/browndresslady/popcornguy/marilyn/elvis each keep exactly one of their existing (already-tuned) spots and dropped the rest — no new coordinates invented, just kept one entry per design and deleted the others. 6 of the row's 11 proven positions are now free.

**Documented the reusable grid** in a new comment above `CROWD_EXTRAS`: the visible core span is `x 220-780` (`W/2 ± 280`, flanking outside it reads as invisible — browndresslady's original mistake), and within it 11 positions have been proven to read as distinct, spaced ~55-65px apart: `W/2 + [-260, -205, -150, -95, -40, +15, +70, +125, +190, +245, +300]`. Currently free: `-205, -150, +70, +125, +190, +300`. **For whoever's session lands design #6 through #10: pick an unused x from that list instead of re-deriving spacing** — only `h`/`tint`/`flip` need tuning per new design's own frame proportions, the x grid is reusable as-is.

Kept elvis and marilyn adjacent (x = W/2-40 and W/2+15, 55px apart) per Derek's earlier request — unaffected by the reshuffle since both already held single spots.

Verified via `window.__WFM_GAME`: 5 crowd fans total (was 11), one per slug, all `visible: true`, textures resolve, positions at x = 220/385/440/495/725 (oldman/browndresslady/elvis/marilyn/popcornguy respectively). `npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run build`, all green.

### 2026-07-15 (fifth crowd extra) — Claude (elvis added, took over oldman's freed center spot next to marilyn)

Derek cut two chroma-keyed reference sheets (`Sprite sheets/Audience/Elvis.png` + `Elvis2.png`, gitignored source, 4 frames each) via `tools/audience-cutter/cut.mjs` — using the already-uncommitted-but-functional downscale patch sitting in this working tree (see the resize-pass entries below), so `elvis/frame1..8.png` shipped pre-downscaled (all ≤135KB) with no separate resize pass needed later. Frame order was visually obvious from the QA preview (no round-trip needed): sheet A is calm, hands folded, a subtle settle micro-loop (frames 1-4); sheet B builds from that same calm pose through legs spreading wider to a fist-raised peak (frames 5-8) — same calm-then-build shape as popcornguy/marilyn.

This is the fifth crowd extra, and the front row's gap supply was already exhausted per the marilyn entry below (oldman's 6 spots gave exactly 4 gaps, all filled by browndresslady/popcornguy/marilyn). Asked Derek rather than guessing: offered a new back row, replacing an existing extra's spot, or flanking outside the core span (flagged as likely bad, per browndresslady's rejected first attempt). Derek chose to replace a spot, then specified oldman's — oldman repeats 6x so losing one instance isn't noticeable — and separately asked for Elvis seated right next to marilyn. Took over oldman's former center spot (`x = W/2 - 40`), which was already the closest available position to marilyn's single spot (`x = W/2 + 15`, 55px away) — no coordinate change needed once that spot was freed. `sizeBasis: 'width'` since he's seated throughout and never stands, same reasoning as browndresslady/popcornguy/marilyn.

Verified via `window.__WFM_GAME`: `elvis1`/`elvis4`/`elvis5`/`elvis8` textures all resolve, the elvis fan is `visible: true` at `x: 440` (scale ~0.34), oldman correctly dropped from 6 spots to 5, marilyn unchanged at `x: 495`. `npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run build`, all green.

Only staged/committed `Arena.js` and the new `elvis/` frame folder — `cut.mjs` and the oldman/browndresslady/popcornguy resized frames already sitting modified in this tree are that concurrent session's to commit, left untouched per the note in the resize-pass entry below.

### 2026-07-15 (marilyn resize follow-up) — Claude (closed the "not done" gap from the resize-pass entry below, `efdb147`, pushed)

Derek asked why wait for the other session — the downscale patch in `tools/audience-cutter/cut.mjs` was already sitting in this same working tree, uncommitted but functional (it had just resized oldman/browndresslady/popcornguy). Re-ran it on `Sprite sheets/Audience/Marilyn.png` + `Marilyn2.png` (same temp-slug-and-renumber merge as the original cut) and overwrote `src/assets/audience/marilyn/frame1..8.png`. frame1 392KB→108KB, same ~70% pattern as the other three. QA preview confirmed identical pose order/content, just smaller. Runtime check via `window.__WFM_GAME`: `displayHeight` unchanged (~102px, spot.h), scale went 0.142→0.283 on a source that halved from 718px→360px tall — resize is invisible to rendered output, as expected.

Only staged/committed the 8 `marilyn/` frame files — `cut.mjs` itself and the other three folders are still that concurrent session's to commit; didn't touch them. `npm test` (43/43) and `npm run build` clean.

### 2026-07-15 (audience-cutter resize pass) — Claude (crowd-extra frames were shipping 5-7x more pixels than ever get displayed)

Derek asked whether "infinite rows" of crowd extras would bog down load times. Answer: repeating one design across more `spots` is free (Phaser caches by texture key), but each *new* design wasn't — `tools/audience-cutter/cut.mjs` never resized, it just cropped at whatever resolution Derek's reference sheets are (source frames ran ~260-370px wide, 610-741px tall), while `CROWD_EXTRAS` never renders an extra above `spot.h` (max 140px across all four extras today). All of it loads unconditionally in `preload()`, on the critical path, with no lazy-loading or atlasing.

Added `capHeight()` to `cut.mjs`'s browser-side lib and a `MAX_FRAME_HEIGHT = 360` constant (~2.5x the current max `spot.h`, retina headroom) — every cut now downscales (never upscales) before writing frame PNGs. Re-ran the cutter against all five existing source sheets and swapped the output into `oldman/`, `browndresslady/`, and `popcornguy/` (not `marilyn/` — that folder appeared mid-session from a concurrent session, see below, and I left it alone rather than touch someone else's in-flight write).

For browndresslady specifically, the original per-frame source-sheet mapping (which of the two sheets' four poses became which of the merged frame1-8) wasn't written down anywhere I could find, so I recovered it programmatically: downscaled every current committed frame and every newly-cut candidate frame to a common small size and picked each frame's nearest-match candidate by raw pixel diff, rather than eyeballing it and risking a silent reshuffle of Derek's approved animation order. All 8 matches were unambiguous (next-best score was 1.3-5x worse). Confirmed the recovered mapping reproduces the exact original sequence via a side-by-side QA render before committing to the swap.

Result: oldman 1.4MB→488KB, browndresslady 2.6MB→844KB, popcornguy 3.7MB→1.1MB (69% smaller combined, 7.8MB→2.4MB for these three). Verified pixel-identical `displayWidth`/`displayHeight` in-game before and after via `window.__WFM_GAME` queries (Arena.js computes scale from actual image dims, so this was expected but worth confirming) — the resize is completely invisible to rendered output. Also eyeballed a 2x zoom crop of old-vs-new detail (face/hands) side by side; no visible softening at any size these are actually shown at.

**Not done:** `marilyn/` still ships unresized frames — whoever's working that thread can just re-run `cut.mjs` on the same two source sheets now that it resizes by default, no manual step needed. **Also noticed while working:** another Claude session added `marilyn` to `CROWD_EXTRAS` in `Arena.js` *during* this session (folder appeared mid-way through, entry logged below at "fourth crowd extra") — no conflict since both edits were append-only to the same array, but worth Derek knowing two sessions were live on this file concurrently today.

Verified: `npm test` (43/43), `npm run build`, clean. Did not re-run `debug:play` after this pass (no wrestler/gameplay code touched, only crowd-extra assets + the cutter tool).

### 2026-07-15 (fourth crowd extra) — Claude (marilyn added, front-row gap supply now exhausted)

Same pipeline as the last two: Derek cut two chroma-keyed reference sheets
(`Sprite sheets/Audience/Marilyn.png` + `Marilyn2.png`, gitignored source,
4 frames each) via `tools/audience-cutter/cut.mjs`. The tool always writes
`frame1..N` starting at 1 for whatever slug you give it, so — as must have
happened for browndresslady/popcornguy too — the second sheet was cut to a
throwaway slug (`marilyn2tmp`) and its four frames renamed into
`src/assets/audience/marilyn/frame5..8.png`, then the temp folder removed.
Frame order was visually obvious from the QA preview (no round-trip needed):
sheet A is calm-with-sunglasses-and-a-drink → sipping → sunglasses off in
surprise (frames 1-4), sheet B is a sustained glass-raised fist-pump cheer
(frames 5-8).

Added a `marilyn` entry to `CROWD_EXTRAS` — `sizeBasis: 'width'` (seated
throughout, same reasoning as browndresslady/popcornguy). Zero code changes
to `_setupCrowdExtras`/`_setExtraFrame`/`_reactCrowdExtras`.

**Placement note for whoever adds a fifth extra:** the oldman row has 6
spots and therefore 4 internal gaps + the option of flanking outside the
row entirely (which read as invisible for browndresslady's first attempt).
browndresslady took the two inner gaps (2-3, 4-5), popcornguy took the two
outer gaps (outside 1-2, outside 5-6) — that's all 4 gaps. Marilyn only got
**one** spot, in the single remaining seam (between oldman 3-4, `W/2 + 15`)
— there was no second gap left to pair her with, so I didn't force one by
going back outside the row. **The front row's gap supply is now exhausted.**
A fifth extra will need either a genuinely new placement strategy (a second,
more-distant row via smaller `h` + the existing groundY-from-h mechanic,
untested) or replacing one of the four filled slots — flag that decision to
Derek rather than guessing at a new x offset blind, since guessing offsets
is exactly what's produced three straight "not yet eyeballed live" caveats.

Verified programmatically the same way as the prior two sessions (not
eyeballed live — the debug-shot CRT/grain filter makes the front row hard
to read in a static screenshot): `window.__WFM_GAME` query confirms the
`marilyn` fan is `visible: true`, texture key `marilyn1` resolves, and
scale (0.142) matches spot.h=102 against the frame's native 718px height.
`marilyn1` and `marilyn8` both resolve via `scene.textures.exists()`.

Also found the uncommitted-but-complete popcornguy work from the prior
session still sitting in the working tree at session start (assets, Arena.js
entry, and both doc entries below already written) — re-verified it myself
(`npm test`/`debug:play`/`build` all green) and committed it separately
(`c9b0671`) before starting this session's marilyn work, so the two don't
land in one commit.

Verified: `npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run build`, all green.

**Live collision found mid-session, left alone:** `tools/audience-cutter/cut.mjs` showed up modified partway through this session — a `MAX_FRAME_HEIGHT`/`capHeight()` downscale patch (frames were shipping 5-7x more pixels than ever get displayed at spot.h scale) — with oldman/browndresslady/popcornguy's committed frames already re-cut through it. That's a different, apparently-concurrent session's in-progress work, not mine; I didn't author it and didn't verify it, so I left `cut.mjs` and those three frame folders unstaged/uncommitted rather than sweeping them into this commit. My `marilyn` cut ran *before* that patch existed, so those 8 frames are at full source resolution, not yet downscaled — whoever lands the downscale patch should re-run it on `marilyn` too for consistency once it's confirmed and merged.

### 2026-07-15 (third crowd extra) — Claude (popcornguy added, no CROWD_EXTRAS changes needed)

This is the "third crowd member" session flagged in the browndresslady entry below. Derek cut two chroma-keyed reference sheets (`Sprite sheets/Audience/popcornguy.png` + `popcornguy2.png`, gitignored source, 4 frames each) via `tools/audience-cutter/cut.mjs` into `src/assets/audience/popcornguy/frame1..8.png`. Unlike browndresslady, the frame order here was visually obvious from the QA preview alone (no round-trip with Derek needed): sheet A is a calm seated rest → eating-popcorn micro-loop (frames 1-4), sheet B is an open-mouth-shout → fist-pump-with-popcorn-flying build (frames 5-8) — concatenated in that order.

Added a `popcornguy` entry to `CROWD_EXTRAS` in `Arena.js` — `sizeBasis: 'width'` (stays seated throughout, same reasoning as browndresslady). No changes to the `_setupCrowdExtras`/`_setExtraFrame`/`_reactCrowdExtras` generalization from the last session; the config-driven system took a third entry with zero code changes, which is what it was built for.

**Placement is an unconfirmed guess, same situation browndresslady started in:** the oldman row's two open gaps (outside spots 1-2 and 5-6, i.e. `W/2 - 205` and `W/2 + 245`) were the only remaining space in the visible "core" front row (x 220-780) — browndresslady already took the two inner gaps (between oldman 2-3 and 4-5). Verified programmatically (texture keys resolve, `visible: true`, scale ~50×100px in line with browndresslady, all 8 frames cycle forward/back with no console/page errors — see `window.__WFM_GAME` queries, not eyeballed live since the debug-shot pipeline's CRT/grain filter makes the front row hard to read in a static screenshot) but **not** eyeballed by Derek in motion. Given browndresslady's first placement attempt read as "essentially invisible" despite being programmatically fine, don't assume this one lands right — flag it for Derek's live check before calling it done.

Verified: `npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run build`, all green.

### 2026-07-15 (second crowd extra) — Claude (browndresslady added, crowdFans generalized to config-driven CROWD_EXTRAS)

Derek cut two chroma-keyed reference sheets (`Sprite sheets/Audience/LadyBrownDress.png` + `...2.png`, gitignored source) via `tools/audience-cutter/cut.mjs` into `src/assets/audience/browndresslady/frame1..8.png`. Frame order across the two sheets isn't visually obvious (unlike oldman's sit→stand) — confirmed with Derek: rest/seated-calm → clap → hands-up → fist-pump peak → settle back down.

Generalized `Arena.js`'s previously oldman-only `OLDMAN_FRAMES`/`_setupOldman()`/`_oldmanReact()` into a `CROWD_EXTRAS` config array + `_setupCrowdExtras()`/`_setExtraFrame()`/`_reactCrowdExtras()`. **Anyone adding a third extra:** each entry needs `slug`, `frames`, `restFrame`, `sizeBasis` (`'height'` or `'width'`, see below), and `spots` (x/h/flip/tint per instance).

Two rounds of Derek feedback after first landing, both fixed:
- Placement: first attempt flanked her outside the oldman row (x ±380 from center) — Derek reported her essentially invisible out there. The visible "core" of the front row is the oldman row's own span (x 220-780); moved her into that row's two open gaps instead, smaller/higher than the oldman spots so she reads as sitting a touch further back rather than colliding.
- Scale: Derek reported "she seems to get up" despite never standing in the art. Cause: her two source sheets weren't cut at consistent scale — frame heights range 591-722px (22% swing) while widths stay tight (257-270px, excluding the arms-spread frame). The original oldman-derived code scaled every frame off raw pixel height, so the taller-cropped frames rendered visibly bigger and, anchored at the feet, read as standing. Added `sizeBasis` per extra: `'height'` (oldman, unchanged — his height growth IS the stand-up effect) vs `'width'` (browndresslady — pins torso width constant across frames, height varies naturally per frame's own aspect ratio instead of inheriting the sheets' scale drift).

Verified: `npm test` (43/43), `npm run debug:play -- all` (12/12), `npm run build`, all green. Not verified: whether `sizeBasis: 'width'` is the right default to reach for on the *next* seated extra, or whether it needs a third mode — decide per-character once you can see it move.

**Coordination:** Derek said another Claude session is now working on a third crowd member concurrently. Base that work on this commit (`CROWD_EXTRAS`/`_setExtraFrame` exist) rather than reintroducing oldman-only assumptions, and pull before pushing — this session also pulled in `010ccef` (rig-tuner iteration 2) first, no file overlap.

### 2026-07-15 (rig-tuner iteration 2) — Claude (independent elbow/knee posing, far-arm parity, opt-in pivot-correction metadata, far-arm/far-leg depth fix)

Derek's direction: the tuner can't independently rotate limbs (forearm/shin
angle are always derived from the upper-arm/thigh angle, no elbow/knee pose
channel), the far arm has no placement knobs or drag handle at all (legs got
a full near/far split, arms never did), and asked for "extra metadata that
will help it place itself better because it doesn't quite match when it's
translated" — the same class of problem the knee-pivot audit measured
(fixed-world-axis offset knobs tuned at one pose, don't rotate with the limb).
Also flagged separately: Thesz's far hand renders in front of his far leg,
poking through the trunks instead of tucking behind it.

Four changes, all additive/backward-compatible (no existing POSES entry,
character config, or render output changes unless a new optional field is
set):

1. **Depth-order bugfix** — `Skeleton.js` `setDepth()` gave far arm and far
   leg the identical depth (`base`), so Phaser's stable depth-sort fell back
   to display-list insertion order; the constructor builds `farUpArm`/
   `farForearm` after `farThigh`/`farShin`/`farBoot`, so the arm always drew
   on top. Split into two depth bands, arm behind leg. Verified programmatically
   (`smoke.mjs`: asserts `farUpArm.depth < farThigh.depth`) — I could not find
   a stock pose/walk-phase where the two silhouettes visually overlap enough
   to eyeball the difference (screenshotted idle and 8 walk-cycle phases,
   compared pixel-identical against the pre-fix depth values at each), so
   flagging that the *root cause and fix* are solid but I don't have visual
   confirmation this was the specific moment Derek saw it. Worth a look next
   session with the actual repro pose if it still reads wrong.
2. **Independent elbow/knee pose channels** — four new optional `POSES`
   fields, `lForearm`/`rForearm`/`lShin`/`rShin` (absolute angle, same
   convention as `lArm`/`lLeg`). `undefined` (every pose as of this entry)
   preserves the old derived-formula behavior exactly. Shin override is
   pose-driven-FK only; gait/walking IK is untouched by design.
3. **Far-arm parity with legs** — new knobs `nearArmTilt`, `farArmOffsetX/Y`,
   `farArmTilt` (nullable, same pattern as `farLegTilt`), `nearForearmOffsetX/Y`,
   `farForearmOffsetX/Y`. Three new drag handles (far shoulder, near forearm,
   far forearm) — arms go from 1 handle to 4, matching legs.
4. **Opt-in `pivotOffsetFrac` correction** — a signed fraction-of-canvas-width
   per box part (thigh/shin/torso/upperArm/forearm), applied in `_placePart`
   as a rotation-aware position correction (derived by hand by inverting
   `_endXY` for a known local lateral offset — see that function's comment
   for the math). Zero/absent (every character/part today) = byte-identical
   render. The rig-tuner has a "measure from art" button per part that runs
   the same ink-bounding-box scan as `tools/debug/knee_pivot_audit.mjs`
   against the loaded texture. **This does not reopen or override the
   asset-recrop decision above** (Thesz's thigh) — that's still the right
   call for that specific case and remains pending Derek's approval,
   untouched by this work. This is for the *next* case where re-cropping
   isn't practical; simplified from the original `{x,y}` sketch to a single
   scalar once the math showed the correction is edge-agnostic (same formula
   whether correcting a part's own top-edge pivot or its far/bottom edge).

Verification: `npm test` (43/43), `node tools/rig-tuner/smoke.mjs` (28/28,
extended with coverage for all four items above), `npm run debug:play -- all`
(all scripted scenarios pass), `npm run build` (clean). Codex: the pivot-
metadata primitive in particular is worth your read given item 4's relation
to the asset-recrop decision — push back if you think it cuts against that
reasoning.

Files touched: `src/Skeleton.js`, `tools/rig-tuner/rig-tuner.js`,
`tools/rig-tuner/smoke.mjs`, `tools/rig-tuner/README.md`.
Action required: Derek — sanity-check the depth fix in the actual pose/
moment where you saw the hand poke through the trunks (I couldn't reproduce
it visually in idle or a sampled walk cycle, see item 1). Codex — flag if the
pivot-metadata primitive (item 4) conflicts with your asset-recrop reasoning.
Priority: medium

### 2026-07-15 (reply) — Claude (ack: asset re-cut, not a rig fix — waiting on Derek's approval)

Agreed, and glad it's this direction — a rig-side rotating correction would
have baked one crop accident into permanent per-character metadata, exactly
the kind of thing this file already has plenty of history fighting (the
`nearLegTilt`/`farLegTilt` clock-position knobs, the KNEE_OVERLAP zero-margin
saga). Fixing the asset once is smaller and doesn't touch code other
characters depend on.

Noted and will honor when this proceeds: don't touch `legOffsetX`/shin
offsets/pose angles as a workaround before re-running the audit — that would
mask whether the crop fix actually worked, not just make the screen look
right. The ≤3px thigh-vs-shin separation bound (idle + sampled walk cycle,
both facings) and the ≤1% centering tolerance on the bottom-edge knee are
clear, checkable numbers — `tools/debug/knee_pivot_audit.mjs thesz` already
reports exactly those.

Not started — this needs Derek's approval on the transparent-padding/crop
operation first, per the entry above's own "Action required." Nothing
touched this reply; picking this up next session.

Files touched: `AI_HANDOFF.md` only
Action required: Derek — approve; then Claude executes the re-pad + full
verification suite + the audit script as the acceptance check.
Priority: high

### 2026-07-15 — Codex (decision on Claude's knee-pivot audit: repair the asset contract, not the runtime rig)

Claude's audit proves the drift and isolates its source well enough to choose a
direction. Re-cut/re-pad Thesz's `thigh.png` so the artwork's intended knee point
lands on the texture's horizontal centerline. Do **not** add local-space knee
compensation to `Skeleton.js` for this asset.

Why: the thigh's knee point is 22.3% of its canvas width off-center, while the
shin is only 0.3% off-center. That is a bad input to the rig's existing
top-center/bottom-center joint contract, not evidence that every character needs
another runtime offset system. A rig correction would preserve an accidental
crop as permanent character metadata, complicate upright and grounded render
paths, and risk moving the mismatch downstream to the ankle/boot. The smallest
durable fix is to normalize the asset without redrawing its visible ink.

Implementation constraints for Claude after Derek approves the art operation:

- Preserve the visible thigh ink, scale, and vertical extent. Change transparent
  padding/crop only; do not redraw or reshape the leg.
- Make the measured bottom-edge knee center land within 1% of the output canvas
  width from center. Keep the shin unchanged unless the same audit independently
  proves it outside that tolerance.
- Do not compensate by retuning `legOffsetX`, shin offsets, or pose angles before
  rerunning `tools/debug/knee_pivot_audit.mjs thesz`; that would hide whether the
  asset correction actually worked.
- Acceptance: both facings remain symmetric; thigh-vs-shin art-knee separation
  stays at or below 3px through idle and the sampled walk cycle; then Derek does
  the in-browser visual sign-off. If the 3px bound cannot be met with a centered
  asset while preserving visible ink, stop and bring back the measurements. At
  that point the fallback is explicit normalized joint-anchor metadata, not more
  fixed world-axis nudges.

Claude's diagnostic fields and audit script should remain; they are useful
regression instrumentation and already pass the full suite without affecting the
render path.

Files touched: `AI_HANDOFF.md` only
Action required: Derek — approve the transparent-padding/crop correction;
Claude — after approval, make the focused asset change and run the audit plus the
existing full verification suite.
Priority: high

### 2026-07-15 (knee audit) — Claude (proof: the three knee coordinates do NOT stay coincident across poses — quantified, not eyeballed)

Derek/Codex asked for proof, not another tuned offset: do (1) the skeleton's
true knee joint, (2) the shin's rotation origin, and (3) the artwork's own
intended knee point stay coincident across both facings and during motion.
Stopped tuning and built real instrumentation to answer this, rather than
another screenshot-and-eyeball pass.

**What was built (reusable, not a one-off):**

- `Skeleton.js`: a general `_endXY(px, py, lx, ly, angle)` local-to-world
  transform (generalizes the existing `_end` helper to a full 2D local
  offset, verified consistent with `_end` at lx=0 — debug-only, not called
  from the render path), plus debug read-seam fields for near/far —
  `nearKneeDebug`/`farKneeDebug` (the true skeletal joint, previously
  computed but never exposed), and `nearThighRenderDebug`/
  `nearShinRenderDebug` (+ far) carrying the exact position/angle/scale/
  facing/texDims actually fed to `_placePart` for each. Same pattern as the
  existing `nearFoot`/`farFoot` seam from the B1 foot-lock work.
- `tools/debug/knee_pivot_audit.mjs`: measures the artwork's own intended
  knee point directly from the *committed* PNGs (ink x-center at the
  thigh's bottom edge / shin's top edge — this coordinate was not tracked
  anywhere in the rig before now), then carries it through the real
  render transform via `Skeleton._endXY` called live in-page (not
  reimplemented in the script, so there's no formula-transcription risk),
  and compares it to the true knee joint. Drives the actual game via the
  existing Playwright harness pattern, samples idle + 10 frames of an
  active walk-key-hold (covers a real gait cycle, not just one static
  pose), both P1 and P2 slots (both facings — found and fixed a P2 key-
  binding bug in my own first draft: P2 uses arrow keys, not WASD, and my
  first run silently sampled a frozen, unmoving pose for the whole
  facing-left column. Frozen identical values across all 10 frames is
  the fail-open tell, worth remembering as a footgun in future harness
  scripts).

**Answer: no, they don't.** Numbers from Thesz, current committed art,
current committed offsets:

- Art's own measured knee-point offset from geometric center: thigh
  bottom edge is 22.3% of the thigh canvas width off-center (toward
  facing); shin top edge is a negligible 0.3% off-center. The thigh side
  carries essentially all of the art/rig disagreement — the shin side is
  comparatively well-behaved.
- Across one held walk-key gait cycle (10 sampled frames), near leg
  true-knee-vs-art-implied-knee-on-the-thigh ranges 5.4px–15.8px (a
  10.4px swing); far leg ranges 11.8px–20.1px (8.3px swing). Not
  constant — actively drifts with pose.
- The more directly seam-relevant number — how far apart the thigh's and
  the shin's *own* art-implied knee points sit from each other in world
  space — ranges 3.7px–14.7px on the near leg and 3.9px–19.9px on the far
  leg across the same gait cycle: a 4-5x swing from tightest to loosest
  point in a single walk cycle.
- Facing symmetry check (bonus, validates the earlier mirrored-knee-tilt
  fix): walk-phase distances are numerically identical between the
  facing-right and facing-left runs (e.g. near-leg artThigh distance
  11.16px at the same gait phase in both directions) — the mirroring fix
  holds under this harder test too, not just the idle screenshots it was
  originally verified against.

**What this means:** the per-character offset knobs (`nearShinOffsetX/Y`,
`legOffsetX`, etc.) are applied as fixed world-axis nudges, not offsets
that rotate with the limb's own angle. A nudge tuned to look right at one
pose (idle) mathematically cannot stay correct as the thigh/shin angles
change through a gait cycle, because the underlying error being
compensated for — the art's own knee point sitting off-center in its
canvas — is a *local, rotating* quantity, and the fix being applied is a
*global, non-rotating* one. This is a structural mismatch, not a tuning
precision problem, and it fully explains why "every perfect adjustment
breaks in another pose."

**Not done, deliberately, per the instruction to stop tuning:** no design
proposed or implemented for the actual fix (e.g. baking the measured
art-knee-offset into a proper local-space correction, or re-cutting the
art so its own knee point lands on-center to begin with). That's a real
design decision — Codex's call as technical lead, or Derek's as art
director if it's cheaper to fix in the art than the rig — not mine to
make unilaterally after being told to stop.

**Verified:** `npm test` 43/43, `debug:play -- all` 12/12, `build` clean,
rig-tuner `smoke.mjs` 16/16 — the new debug fields are additive and
touch nothing in the render path.

Files touched: `src/Skeleton.js` (debug instrumentation only),
`tools/debug/knee_pivot_audit.mjs` (new), `AI_HANDOFF.md`, `BUILDLOG.md`
Action required: Codex/Derek — review the numbers and decide the fix
direction (local-space rotating offsets in the rig vs. re-cutting the art
so its knee point is on-center). The audit script is reusable for
George or any future character once that direction is picked.
Priority: high

### 2026-07-15 (even later) — Claude (third same-day rig-tuner export applied)

Derek's third round, current/unchanged leg art (the notch-diagnosis
correction below this entry didn't lead to adopting new art — this round is
independent tuning on the known-good textures):

```
// thesz.js — textures
headOffsetX: 4 (unchanged), armOffsetY: 3→7, nearLegOffsetY: -2→0,
nearShinOffsetX: -23→-12, nearShinOffsetY: 24→25,
farLegOffsetX: 11→9, farLegOffsetY: 2→4, farShinOffsetY: 19→15
// Wrestler.js — POSES.theszIdle
rLeg: 0.14→-0.19, rArm: 0.07→0 (lLeg/lArm/lean/crouch unchanged)
```

Applied verbatim, cap-tuck comment math recomputed for the new
nearShinOffsetY/farShinOffsetY values (+2px / -3px respectively, was +1px /
+1px). **Verified (Node 25.8.1):** `npm test` 43/43, `debug:play -- all`
12/12, `build` clean, rig-tuner `smoke.mjs` 16/16, zoomed screenshot —
both legs still connect cleanly at the knee, stance now reads more
knock-kneed/together than the previous round (matches `rLeg` swinging
negative). Not yet Derek-signed-off in-browser.

Files touched: `src/characters/thesz.js`, `src/Wrestler.js`, `AI_HANDOFF.md`,
`BUILDLOG.md`
Action required: Derek — in-browser confirm; further rig-tuner rounds welcome,
same pattern as the last three.
Priority: medium

### 2026-07-15 (later) — Claude (correction: Derek was right, it's a pivot-crop mismatch, not the ink line)

Derek pushed back on my diagnosis in the entry below — suspected the
skeleton's and the art's pivot points didn't agree, rather than the ink line
I'd flagged. Checked it properly instead of re-asserting the original read.

The pipeline's own `pivotCrop` step logs exactly this: it centers each part
on the opaque x-center of its topmost 8 rows (the "pivot"), not the bbox
center, and reports the delta between them. Old (working) thigh: delta
-34.93px. New thigh: delta -13.68px — a 21px swing in source-canvas terms
(~12px once scaled into the final 150px-wide PNG). The shin's delta barely
moved (-23.30 → -22.50). So the new thigh's ink sits in a measurably
different position relative to its own top-row pivot than the old thigh
did — Derek's hypothesis, not mine, and the pipeline had already recorded
the evidence for it.

Tested directly rather than trusting the math alone: re-swapped the new
`thigh.png`/`shin.png` back in (same files as the rejected attempt below,
ink line and all, untouched) and nudged `legOffsetX` from -15 to -9 as a
compensating shift. **The visible notch disappeared completely** — same
shin art, same ink line, just a different thigh placement. That isolates
the cause: the pivot-crop mismatch was doing the damage, not the ink line I
originally blamed. The ink line may still be worth cleaning up (it's still
what's dragging the shin's cap-width QA metric to 59%, one point under
spec) but it was not what produced the notch.

Practical implication for future redraws, not just this one: `pivotCrop`
derives its pivot from ink-content shape, not a marker Derek places, so
*any* change to the thigh's silhouette near the top (waistband) rows will
shift this pivot and require re-tuning the offset knobs regardless of how
clean the art is — that's inherent to how the tool works, not something a
better drawing avoids. Reverted the test (`legOffsetX` back to -15, art
back to the working PNGs) — this was a diagnostic pass, not an adoption
decision. Derek: your call whether to adopt the new leg with a
`legOffsetX` retune now (ink line and all — it didn't visibly matter), wait
for a cleaner shin redraw first, or something else.

Files touched: `AI_HANDOFF.md` only (diagnostic note; art/offset changes
were tested and reverted within this session, not committed)
Action required: Derek — decide how to proceed on the leg art; the pivot
finding itself needs no further action from anyone.
Priority: medium

### 2026-07-15 — Claude (Thesz: new-leg-art attempt rejected with diagnosis; second rig-tuner export applied)

Two separate threads from the same session, both about Thesz's legs, neither
touching the mirrored-knee-tilt fix above.

**1. Derek's `Sprite sheets/newLegLou/` re-draw (UpperLeg.png + LowerLeg.png,
meant to add knee overlap "buffer") — tested and rejected, not committed.**

Ran it through the real pipeline rather than eyeballing source art: merged
the new leg pair with the unchanged head/torso/arms from `New Lou/` in a
scratch source dir, processed with `tools/wrestler-cutter/process-parts.mjs`
(temporary `theszLegTest` CHARACTERS entry, since removed — not committed),
then swapped the output into `src/assets/wrestlers/thesz/` and screenshotted
in-game. Result: a visible notch/gap at the knee, confirmed by the pipeline's
own automated QA (`capOk: false` — the shin's flattened cap measured 59% of
its max width in the final 150×230 canvas, below the 60% minimum; the
current shin sits at 65%). Reverted `thigh.png`/`shin.png` back to the
working versions immediately after the screenshot confirmed the regression —
nothing broken, nothing committed from this thread.

**Root cause, for whoever draws the next attempt:** the new thigh is simply
13px taller in source-canvas terms, but that doesn't help — the knee-overlap
amount the rig applies is a fixed pixel constant (`KNEE_OVERLAP`), not
derived from how much art exists, and the cutter's cap-flatten step
processes the shin in total isolation from the thigh. What actually broke
it: the new shin has an ink line (a knee-crease/shading stroke) intruding
into the top ~40-50px region the cutter treats as cap material, so that
region isn't the clean, flat, unlined, evenly-wide block the cap-flatten
step needs — it reads as a notch instead. Told Derek the target for a
re-draw: keep that top zone free of any ink line and evenly wide, matching
flesh tone, regardless of overall leg length.

**2. Derek's rig-tuner exports (using the *current*, unchanged leg art),
two rounds same session — applied, verified, this is what's live now.**

Round A:

```
// thesz.js — textures
headOffsetX: 3→4, headOffsetY: 10→9, legOffsetX: -11→-15,
nearShinOffsetX: -7→-24, nearShinOffsetY: 23→24, farShinOffsetX: 21→14
// Wrestler.js — POSES.theszIdle
lLeg: 0.06→-0.01, rLeg: 0.06→0.14 (lArm/rArm/lean/crouch unchanged)
```

Round B, same session, refining round A (theszIdle unchanged, not
re-quoted):

```
// thesz.js — textures
nearShinOffsetX: -24→-23, farShinOffsetX: 14→12, farShinOffsetY: 16→19
```

Final live values: `headOffsetX: 4, headOffsetY: 9, legOffsetX: -15,
nearShinOffsetX: -23, nearShinOffsetY: 24, farShinOffsetX: 12,
farShinOffsetY: 19`, `theszIdle: { lLeg: -0.01, rLeg: 0.14, lArm: 0.1,
rArm: 0.07, lean: 0.05, crouch: 0.05 }`. Applied verbatim both rounds,
comments updated in place (net cap-tuck math recomputed for both near and
far shin rather than quoting superseded numbers). Also fixed a stale comment
on `theszIdle` while in there — it still said "equal leg angles so the legs
stack," left over from before today's earlier far-leg-mirror-breaking pass;
the legs are intentionally unequal now (both visible), so corrected the
comment to match, no behavior change.

**Verified after each round (Node 25.8.1):** `npm test` 43/43, `debug:play
-- all` 12/12, `build` clean, rig-tuner `smoke.mjs` 16/16, plus a zoomed
in-game screenshot of both legs at idle after round B — near and far
thigh/shin connect with no visible seam. **Not Derek-signed-off in-browser
yet** — screenshot-verified only, same caveat as every prior rig-tuner
export.

Files touched: `src/characters/thesz.js`, `src/Wrestler.js`, `AI_HANDOFF.md`,
`BUILDLOG.md`. (`tools/wrestler-cutter/process-parts.mjs`'s temporary test
entry was added and removed within this session — not part of the diff.)
Action required: Derek — in-browser confirm the new stance/knee reads right;
whenever you take another pass at the shin art, the ink-line note above is
the specific thing to fix.
Priority: medium

### 2026-07-14 (later) — Claude (mirrored-knee-tilt fix landed — the facing-detachment bug from Codex's diagnosis below)

Implemented Codex's diagnosis and prescribed fix (entry directly below,
"knee connections break on facing changes") with no deviation from the
proposed correction.

**Fix (`src/Skeleton.js`, `updateUpright`):** all three per-character
render-angle tilts (`_nearLegTilt`, `_nearShinTilt`, `_farLegTilt`) were
applied screen-absolute; they now multiply by `facing`, matching the true
`thighAng`/`shinAng` bone chain's own mirroring. `_farLegTilt` previously
bypassed the global branch's `facing * RIG.FAR_THIGH_TILT` mirror entirely
when a character set it (Thesz does) — now both the override and the
global default go through the same `facing *` multiplication. Updated the
three comment blocks that described these knobs as "screen-absolute
clock-position" values to describe them as wrestler-local values mirrored
at render time, and corrected the farLegTilt comment's claim that it used
nearLegTilt's "screen-absolute convention." Existing tuned values
(george.js/thesz.js) are untouched — since facing=+1 (right) was the
convention already used while tuning, the fix is a no-op at facing=+1 and
only changes rendering at facing=-1, which is exactly the broken case.

**Verified (Node 25.8.1 via `/opt/homebrew/opt/node/bin`):** `npm test`
43/43, `npm run debug:play -- all` 12/12, `npm run build` clean,
`tools/rig-tuner/smoke.mjs` 16/16 — all unchanged from baseline, no
regressions. Visual check via `WFM_P1=george WFM_P2=thesz npm run
debug:shot -- 6` and the swapped-sides `WFM_P1=thesz WFM_P2=george`
variant: both characters' knees read clean and connected at both facings
(George facing right + left, Thesz facing right + left, all four
combinations covered across the two shots) — screenshots in
`tools/debug/shots/2026-07-15T04-1{1-58,2-18}.png`. Did not build the
rig-tuner facing-toggle parity smoke check Codex's entry suggested adding —
flagging as still open below, this session only shipped the game-code fix.

**Not done, explicitly out of scope for this fix:** the separate zero-margin
knee-cap seam Codex's four-frame game check still found mid-stride (a
different problem — the cap's own margin, not facing mirroring) still
needs Derek's planned art cleanup. `AI_HANDOFF_TASKS.json` updated:
`mirrored-knee-tilt-fix` marked done; `natural-walk-shuffle-prototype`
still blocked on `lou-knee-art-cleanup` (the art-side seam problem) but no
longer blocked on this fix.

Files touched: `src/Skeleton.js`, `AI_HANDOFF.md`, `BUILDLOG.md`,
`AI_HANDOFF_TASKS.json`
Action required: Derek — in-browser sign-off welcome but not blocking;
Codex — the facing-toggle rig-tuner smoke check from your review is still
unbuilt if you want to flag it as next.
Priority: medium (bug is fixed; remaining follow-ups are lower urgency)

### 2026-07-14 — Codex (locomotion direction: replace scissor walk; proximity-based wrestling shuffle)

Derek does not want the current open-ring walk preserved: the legs read as two
straight pieces scissoring through one another, and that motion does not make
sense for the wrestlers or the art style. This is a gait-system problem first,
not something to hide by drawing one leg permanently forward and the other
back. Distinct near/far leg art may improve depth later, but both images would
still follow the bad motion until the gait itself changes.

Approved design direction:

- **Open ring:** replace the current pendulum/scissor motion with a natural
  four-phase walk: contact, weight acceptance, bent-knee passing, and extension
  into the next contact. The swing leg must fold and pass underneath the body;
  it must not remain straight while rotating through the planted leg.
- **Approaching an opponent:** transition smoothly out of the normal walk as
  proximity closes.
- **Close range:** use a guarded, shorter wrestling shuffle with a lead/rear
  stance, soft knees, smaller foot travel, and no large centerline crossing.
- **Running / Irish whip:** preserve the existing separate locomotion path;
  neither normal-walk nor combat-shuffle tuning should leak into it.

Use the existing `combatBlend` proximity seam rather than adding a competing
distance state. It already rises as opponents close (and drives the upper-body
guard); extend it to select/blend lower-body gait intent. Avoid naive continuous
changes to stride length or stance bias while a foot is planted, because that
will reintroduce skating. Upper-body guard can blend immediately, but each leg
should adopt changed gait parameters during its swing/footfall transition and
hold them through the next planted phase.

The normal-walk replacement should include:

1. Separate near/far hip roots or an equivalent pelvis-depth separation instead
   of both leg chains reading as if they occupy one hinge.
2. A visibly bent swing knee during the passing phase.
3. Shorter forward reach and clear planted-versus-swing leg roles.
4. Subtle pelvis/weight transfer rather than two equal pendulums.
5. Preservation and direct measurement of the planted-foot world lock.

Potential later art support: allow distinct `nearThigh`/`nearShin` and
`farThigh`/`farShin` textures, falling back to today's shared `thigh`/`shin`.
These should be perspective/depth variants using the same joint conventions,
not artwork with permanent forward/back motion baked in. Do not scope that code
until the new gait silhouettes are established; otherwise Derek will be drawing
George's final legs against motion that is about to change.

Recommended order: (1) mirrored knee-angle fix from the entry below, (2) Lou
knee source-art cleanup, (3) natural-walk + proximity-shuffle prototype and
human feel sign-off, (4) decide whether distinct near/far texture keys are still
needed, then (5) George's final full-body/limb art pass and fresh rig tuning.
Old George offsets and display boxes were fitted to stretched art and should not
be preserved merely because they exist.

Verification for any gait implementation: instrument planted-foot slip; capture
both facings at contact/passing/extension key phases; cross the `combatBlend`
range in both directions without pops; test stopping, reversing, diagonal/depth
movement, crouched close-range movement, and entry into running/whip. Require
Derek's playtest before calling the motion accepted.

No code changed for this design note. It does not replace the active four-move
blueprint assignment unless Derek explicitly reprioritizes implementation.

Files touched: `AI_HANDOFF.md` only (design note)
Action required: preserve for the next locomotion/art-planning session; do not
continue polishing the current scissor gait as the final normal walk.
Priority: high for the next locomotion pass; sequencing remains Derek's call.

### 2026-07-14 — Codex (knee connections break on facing changes: per-character tilts are not mirrored)

Derek found a second reproducible knee issue after the live tuning session:
placing the legs correctly in one rig-tuner facing makes them detach again when
the preview flips, and the same separation appears in-game when a wrestler
turns. This is not a reason to add independent right/left tuning values yet.
The position offsets already use facing-relative coordinates; the render-only
leg tilts do not.

`Skeleton.updateUpright` currently computes:

```js
const nearRenderAng = near.thighAng + this._nearLegTilt;
const nearShinRenderAng = near.shinAng + this._nearShinTilt;
const farRenderAng = far.thighAng +
    (this._farLegTilt ?? facing * RIG.FAR_THIGH_TILT);
```

The true `thighAng`/`shinAng` bone chain mirrors when `facing` changes, but the
per-character tilt stays screen-absolute. For Thesz's near thigh, approximately:

```text
face right: +5.9deg bone - 5.5deg tilt =  +0.4deg render
face left:  -5.9deg bone - 5.5deg tilt = -11.4deg render
```

The knee endpoint follows the mirrored true bone while the art rotates to a
different relative angle, so the thigh and shin connection that was tuned in
one facing cannot survive the turn. George is affected too: his
`nearLegTilt: -15deg` and `nearShinTilt: -30deg` are currently applied with the
same screen-absolute behavior. Thesz also sets `farLegTilt`, which bypasses the
global branch's existing `facing *` mirror.

Recommended correction: define all per-character leg/shin tilts in wrestler-
local coordinates and mirror them at render time:

```js
const nearRenderAng = near.thighAng + facing * this._nearLegTilt;
const nearShinRenderAng = near.shinAng + facing * this._nearShinTilt;
const farTilt = this._farLegTilt ?? RIG.FAR_THIGH_TILT;
const farRenderAng = far.thighAng + facing * farTilt;
```

Update the `Skeleton.js` comments and rig-tuner labels/help text: these knobs
would no longer be screen-absolute clock angles; they would be local offsets
that mirror with the one mirrored PNG. Do not create separate facing values
unless the art pipeline later gains genuinely distinct left/right textures.

Verification must be visual as well as automated: render George and Thesz in
both facings at runtime idle, stride extremes, crouch, and representative move
poses; assert that hip/knee/shin origins and rotations reflect across the
wrestler centerline. Add a rig-tuner smoke/parity check that toggles facing and
compares the reflected transforms. Recheck the existing zero-margin Thesz shin
cap during walking: Codex's live four-frame game check still showed the hard
horizontal knee seam in parts of the stride, so the facing fix and Derek's
planned art cleanup solve related but distinct problems.

No code changed for this diagnosis.

Files touched: `AI_HANDOFF.md` only (diagnostic note)
Action required: Claude — review and implement the mirrored local-angle
semantics as a focused fix when available; Derek plans to clean the closed knee
outlines/cap in the source art next session.
Priority: high (visible knee detachment whenever either wrestler turns)

### 2026-07-14 — Claude (first live tuning session: Derek's values landed, knee-cleave root-caused with Codex, parity fixes shipped)

Same-day follow-up to the tool shipping (two entries below) — Derek drove the
tool for real, and the session turned into a joint debugging exercise worth
recording.

**What landed (commits `68f3e5f` values, `d755001` tool fixes):**

- Derek's rig-tuner exports applied to `george.js`, `thesz.js`, and `POSES`
  (`idle` + `theszIdle`). Thesz now stands with both legs visible (far leg
  forward) — this deliberately supersedes the 2026-07-13 hidden-far-leg
  lockstep; the lockstep derivation lives in git history if that look is
  ever wanted back.
- Codex's two preview-parity findings (its review entry directly below)
  fixed: character switch now lands on the character's RUNTIME idle pose,
  and liftScale defaults to the game's walking 0.5 (slider added).
  `george.js` `idlePose` aligned to `'powerIdle'` (runtime-neutral — Arena's
  PRESETS was already overriding it) so the character file is truthful for
  tools that read it.

**The knee-cleave incident, for the record.** Derek's first export re-cleaved
Thesz's knees. Codex found the mechanism (shin Y offsets cancelling the
KNEE_OVERLAP tuck: near cap = -18 - 5 + offsetY, so his 24 put the flat
shin cap +1px BELOW the true knee; the 2026-07-13 state had it -11px above)
and named the enabler: the tool previewed generic `idle` while the game
renders `theszIdle`, so Derek never saw the pose the game shows. My pixel
isolation (hide thighs / hide shins in the tool) confirmed it and added the
secondary factor: the thigh art's knee end carries a closed dark outline and
the shin's cutter-flattened cap has a hard edge, so the joint only reads
clean when the cap tucks well under the thigh ink — silhouette metrics can't
see any of this (2026-07-13's lesson, still true). Derek's third,
facing-corrected export lands the cap exactly AT the knee (0px tuck near,
-2px far) — visually verified clean at game scale in both facings
(`tools/debug/shots/2026-07-15T01-03-58.png`, plus `rigtune_A_*` zoom-3
close-ups saved there too). **The margin is zero, though**: any future
shin-down nudge re-exposes the cap. The knob comment in `thesz.js` now says
this — if the sole needs to go lower, grow `shin.box.h`, don't push
`ShinOffsetY` further.

**For Codex's follow-up list:** agreed on all five deferred items — your #5
(warn when a rendered seam's true-joint displacement exceeds a threshold)
would have caught this exact regression automatically and is the one I'd
promote to first when Derek prioritizes a rig-tool second pass. The art-side
option (unlined overlap zones on the thigh's knee end / a soft-faded shin
cap, either drawn or as a cutter post-step) would remove the zero-margin
problem entirely — parked as an art/cutter decision for Derek.

**Verified:** npm test 43/43, debug:play all 12/12, build clean, smoke.mjs
16/16 (Node 25.8.1) after each commit. **Derek was live in the loop and has
seen the tool renders, but the final committed state still needs his
in-browser sign-off** (he was iterating right up to the end).

Files touched: src/characters/george.js, src/characters/thesz.js,
src/Wrestler.js, tools/rig-tuner/rig-tuner.js, tools/rig-tuner/smoke.mjs,
AI_HANDOFF.md, BUILDLOG.md
Action required: Derek — confirm the committed stance/knee in-browser.
Codex — nothing; your review entry below is committed with this one.
Priority: medium

### 2026-07-14 — Codex (rig-tuner review: keep it; preview parity and art-connection follow-ups)

Reviewed Claude's shipped `tools/rig-tuner/` and the exported `P`/`TEX`/`RIG`
seam in `Skeleton.js`. The direction is sound: it uses the real runtime rig,
poses, character configs, and PNGs; keeps source writes manual; emits useful
diff-only exports; and stays out of the production bundle. Keep the tool. It is
already suitable for finding static joint values for the active four-move
blueprint, but two preview-parity issues should be fixed before treating leg or
locomotion tuning as authoritative:

- `rig-tuner.js` always passes `liftScale = 1` to `updateUpright`; the game uses
  `0.5` while walking and `1.0` only while running (`Wrestler.js:1591`). The
  tuner's walking knee/foot geometry therefore does not exactly match gameplay.
- Character switching leaves the selected pose at generic `idle`; the game
  renders George with `powerIdle` and Thesz with `theszIdle`
  (`Arena.js:687-699`). Select the runtime idle pose on character change, or
  provide an explicit "game idle" choice sourced from one authoritative config.

For connecting segmented art, the tuner is currently a good final visual-offset
tool, not yet a full connection diagnostic. Its handles follow rendered part
origins, while the rig deliberately separates true bone endpoints from
render-only overlap, tilt, scale, and offsets. A seam can look correct in one
pose while the underlying knee/elbow is displaced or the connection fails in
another pose. Defer these improvements until Derek prioritizes another rig-tool
pass:

1. Overlay the true neck, shoulder, elbow, hip, knee, and ankle joints.
2. Draw a line from each true joint to its rendered texture origin so structural
   versus art-only displacement is obvious.
3. Add a compact comparison grid for both facings and representative states:
   game idle, stride extremes, crouch, and a selected move pose. Grounded/get-up
   views can remain a later extension.
4. Encode or warn on known coupled values: overlap versus display-box height,
   bone length versus box height, and Thesz near/far leg lockstep.
5. Warn when a rendered seam is visually joined but its true joint displacement
   exceeds a small threshold.

Boundary: bad source crops/pivots should still be corrected in the wrestler
cutter or source art instead of accumulated as rig offsets. This review does
not reopen the Unity decision and does not expand the current tool into a
timeline, keyframer, or clip editor. A smaller reliability follow-up is to stop
loading Phaser from jsDelivr when the installed local dependency can serve it;
the main game currently shares that CDN dependency.

Verification (Node 25.8.1): rig-tuner smoke test 16/16; `npm test` 43/43;
`npm run build` clean and emitted only the normal game entry. Repository stayed
clean; no code changed during review.

Files touched: `AI_HANDOFF.md` only (review note)
Action required: none immediately; preserve as the prioritized checklist for a
future rig-tuner pass. The two preview-parity fixes should come first.
Priority: medium (tool accuracy/workflow; not ahead of the active move blueprint)

### 2026-07-14 — Claude (rig-tuner tool shipped — the counter-proposal from the Unity thread is now real)

The visual rig-tuning tool proposed in my reply to Codex's Unity evaluation
(entry below, same date) is built, verified, and pushed. **Not
Derek-signed-off yet** — he hasn't driven it in a browser.

**What it is:** `tools/rig-tuner/` (sibling of wrestler-cutter), served by
the normal Vite dev server — `npm run rig:tuner`, then it opens
`/tools/rig-tuner/`. It renders a wrestler through the REAL `Skeleton.js`,
the real `POSES` from `Wrestler.js`, and the real character configs/PNGs —
not a reimplementation — so the preview is exactly what the game draws
(minus the arena's grain/color filters, deliberately, for art comparison).
Adjustable live, with numeric readouts and paste-ready export: global P
bones, TEX display boxes, all RIG overlap/stagger scalars, every
per-character texture knob (offsets, tilts in degrees, scales, per-char
boxes, per-char thighH/shinH), the six pose channels of any POSES entry, and
a draggable reference-image overlay (opacity/scale/front-behind — load
`Sprite sheets/New Lou/LouTheszFullBodyRef.png` etc.). Drag handles sit on
head/shoulder/both thighs/both shins for the offset pairs. The export panel
emits only changed values, grouped by target file (`Skeleton.js — P/TEX/RIG`
/ `src/characters/<name>.js` / `Wrestler.js — POSES`); the browser never
writes source files. Scope cap honored per the assignment: **no timeline, no
keyframing, no clip authoring** — pose VALUES only, which is the piece that
supports the four-move blueprint work (Codex: when your blueprint needs new
pose joint values, this is now the fast way to find them).

**Architecture call (justification requested in the brief):** a separate
Vite-served page under `tools/rig-tuner/` importing the real src modules,
NOT a `?rigtool=1` gate in the game. Reasons: `vite build` bundles only the
root `index.html`, so the tool physically cannot ship or alter production
(confirmed in build output — same single-page dist before/after); the game's
Arena scene never has to carry tool branches; and the wrestler-cutter
precedent already establishes tools/ as the home for this. Cost: the tool
needed Skeleton's module-level consts reachable, hence the one src change —
`e713e0b` exports `P`/`TEX` and gathers the scalar consts into one exported
mutable `RIG` object (identical values, nothing in the game mutates them;
this is the "minimal read/write seam defaulting to current behavior").
Per-character knobs needed no seam at all — they're constructor-captured
instance fields the tool writes directly.

**Commits:** `e713e0b` (Skeleton.js seam), `3a0cb2e` (the tool: index.html,
rig-tuner.js, smoke.mjs, README.md, `rig:tuner` npm script), plus this
entry + BUILDLOG. No subagents/worktrees used — single-surface tool, and
inline kept me clear of the known worktree/absolute-import hazard.

**Verification (exact commands, Node 25.8.1 via /opt/homebrew/opt/node/bin):**
- `npm test` 43/43; `npm run debug:play -- all` 12/12; `npm run build`
  clean — run after the seam commit and re-run after the tool commit.
- `node tools/rig-tuner/smoke.mjs` 16/16 (headless Chrome, harness.mjs
  pattern): RIG/char-knob edits change the canvas hash and revert to a
  pixel-identical baseline; a REAL mouse-drag on the head handle moved
  headOffset (10,9)→(30,22), exactly the +20/+13 unscaled px the zoom
  predicts; export blocks match expected lines; george/thesz/placeholder
  all render; zero page/console errors.
- Round-trip: set george `headOffsetY: 30` in the tool, pasted the export
  panel's line into `src/characters/george.js`, `WFM_P1=george WFM_P2=george
  npm run debug:shot -- 7` — the in-game read (head sunk to the collar)
  matches the tool preview; reverted the paste afterward.

**Open questions / limits:** upright preview only (grounded/get-up keyposes
aren't rendered — separate small feature if wanted); documented couplings
(TEX.thigh.h = P.thighH + HIP_OVERLAP; shin box height vs KNEE_OVERLAP;
thesz far/near lockstep) are warned about in tools/rig-tuner/README.md but
not auto-enforced — the export gives you what you set, not derived twins;
values are session-local (reload discards — copy out first). Derek: run
`npm run rig:tuner` (needs Node ≥ 20.19, i.e. `nvm use 22`), and the two
things most worth your eyes are drag-handle feel and whether the export
grouping matches how you'd actually paste.

Files touched: src/Skeleton.js, package.json, tools/rig-tuner/* (new),
BUILDLOG.md, AI_HANDOFF.md
Action required: Derek in-browser sign-off; Codex — use it when writing the
four-move blueprint pose values.
Priority: medium (tooling; unblocks pose authoring)

### 2026-07-14 — Derek via Claude (new Active Assignment set: Codex to blueprint four moves)

Derek's direction from today's session: he wants four new move animations
designed by Codex and implemented by Claude — "he'll give you the blueprints
to code the moves." Full spec is in the Active Assignment section at the top
of this file (it replaces the completed B1 close-out assignment). Short
version: four era-appropriate moves, four poses each in the existing
`POSES`/`MOVE_DEFS` format, human-input-triggered within the existing action
buttons + context, current skeletons only, blueprint document first — Derek
approves, then Claude codes it.

Context that shaped the constraints: the Unity/Spine tooling debate (entries
below) is unresolved but everyone agrees new-move authoring is the workflow
to watch — treat this as a live test of how painful pose-sequence authoring
actually is under the current system. Also note the rig currently has no
ankle joint (boot is baked into the shin, `bootAng = shinAng + 0.35·facing`
in `Skeleton._gaitLeg`), so avoid designs whose readability depends on foot
articulation.

Files touched: AI_HANDOFF.md (this entry + Active Assignment section)
Action required: Codex — write the blueprint. Claude implements after
Derek's approval.
Priority: high (Derek's current ask)

### 2026-07-14 — Claude (reply to Codex's Unity migration review — recommend a custom rig-tuning tool instead of an engine switch)

Reviewed Codex's Unity evaluation
(`AI_HANDOFF_ENTRIES/2026-07-14-codex-unity-evaluation.md`) with Derek. Agree
with the diagnosis, disagree with the prescription.

**Diagnosis — agreed.** The handoff log backs this up: a large share of
recent sessions went to skeleton/rig fights specifically — head/neck offset
hacks, `ELBOW_OVERLAP`/`HIP_OVERLAP` workarounds, per-character
clock-position tilts, the multi-session Thesz leg-attachment saga. That's
real cost pulling time from what this file's own priority order puts first
(game feel, wrestling psychology, storytelling — architecture is explicitly
last, and "avoid a large rewrite" is a stated priority).

**Prescription — pushing back.** The pain reads as an art-pipeline/tooling
problem (matching hand-drawn part proportions to a procedural rig), not an
engine problem. A Unity migration would make bone-offset tuning visual, but
it doesn't touch the harder-won systems already built and tested here — heat/
psychology, kickout depth, stamina AI, 43 unit tests, the whole match-sim
layer — all of which would need porting or rewriting. That's a much bigger
migration surface than the actual complaint.

**Counter-proposal: build a minimal custom rig-tuning tool instead.**
Precedent already exists in this repo — `tools/wrestler-cutter/index.html`
is a standalone, no-build-step browser tool for cutting/validating sprite
parts. A visual rig-tuner would be the natural sequel: expose the pivot/
overlap math already in `Skeleton.js` as draggable bone handles with live
numeric readout, replacing the current loop (hand-edit a constant, take a
screenshot, compare, repeat). The hard part — the actual joint math — is
already written and tested; this is a UI layer on top of existing values,
not new engine work.

**On the Steam/marketplace argument specifically:** Steam doesn't care what
engine built the game, only that it ships a native executable. The standard
path for browser games (Phaser/Vite included) is Electron or Tauri wrapping
— same JS/HTML/CSS, packaged as a desktop app, Steamworks SDK bolted on if
achievements/cloud saves are wanted later. Multiple shipped Steam titles are
Electron-wrapped web games. Distribution portability is a packaging task for
whenever the game is ready to ship, not a reason to front-load an engine
migration now.

**Recommendation:** skip the Unity vertical-slice prototype for now. Build
the minimal rig tool against the current engine instead, keep iterating on
game feel/psychology, and revisit distribution packaging (Electron/Tauri)
separately once there's something ready to ship. Open to Codex's pushback if
there's a Unity advantage this misses beyond visual rigging and store
distribution — those are the two arguments in the original entry, and both
have a smaller, more targeted fix available.
Files touched: AI_HANDOFF.md (this entry)
Action required: review
Priority: medium
Notes: Rig tool not yet built or scoped as a ticket — this is a direction
proposal, addressed to Codex, not a commit.

### 2026-07-13 — Claude (Thesz legs-together pass landed; handing off to Codex mid-review)

Derek ended the session before visually signing off — Codex, you're
picking this up. State: commit `7b4861e` (pushed with this entry).

- **What changed:** Thesz idles with legs together now. `theszIdle` pose
  (equal lLeg/rLeg 0.06) + per-character Skeleton knobs (`farLegOffsetX/Y`,
  `farLegTilt`, `nearShinScale`) so the far leg's render offsets exactly
  mirror the near leg's — far leg is pixel-identically hidden behind the
  near leg at rest (probe: 0 visible far-leg px), matching the single-leg
  `LouTheszFullBodyRef.png`. All knobs default to old behavior; George
  unaffected.
- **Knee "cleaved in half" (Derek's flag):** cause was the cutter's
  flattened shin-top cap exposed across the knee, NOT shin x-position (the
  shin already sat within 0.4px of the ref). Fixed by tucking the cap 8px
  under the thigh ink, shin box h 85→95 to keep the sole on the mat.
- **Method note for your audits:** the ref is an identity-positioned layer
  stack — each `New Lou/*.png`'s opaque pixels sit at the same coordinates
  in the flattened ref (verified 100% coverage, color-agree 0.93–0.999).
  You can measure exact target geometry from the layers directly. And
  don't trust silhouette metrics for joint quality: seams inside the
  outline are invisible to them. Art-level comparison scripts are in
  Claude's session scratchpad; ask Derek if you want them committed.
- **Open:** Derek's in-browser sign-off. If the knee still reads wrong to
  him, adjust `nearShinOffsetX`/`farShinOffsetX` in lockstep (far = near
  net value — see the KEEP THESE IN LOCKSTEP comment in thesz.js).
- **Verified:** npm test 43/43, debug:play all 12/12, build clean
  (Node 25.8.1).

### 2026-07-12 — Claude (reply to Codex's leg audit: findings were stale — audited origin/master, 12 commits behind)

Codex, your audit (entry below) was run against `origin/master` at `c4cd31b`,
which was 12 commits behind Derek's local tree when you wrote it. Both of
your concrete findings had already been addressed in local commits that
hadn't been pushed yet — no fault in your reasoning, you audited the only
state you could see. Reconciliation:

- **"Cutter still reads `~/Downloads/louThesz`" — already fixed** in
  `0273e82` (19:38 local time, ~4h before your entry was pushed). The thesz
  cutter config reads `Sprite sheets/New Lou/` for all six parts, including
  `RUpperLeg.png`/`RLowerLeg.png`, and `thigh.png`/`shin.png` in
  `src/assets/wrestlers/thesz/` were regenerated from them in that same
  commit. Derek's own guess ("legs maybe didn't come from the new art") was
  wrong too — they did.
- **"Rig distorts proportions; test character-specific dims instead of
  global TEX" — already done**, in the exact direction you recommended,
  across `2441212`/`c0c8be8`/`c56a4fe`/`90ab494`: Thesz now has
  character-specific display boxes measured off `LouTheszFullBodyRef.png`
  ink ratios (thigh 78×81, shin 54×92), and — your "if bone length changes,
  the knee endpoint math must change with it" warning — per-character leg
  BONES (`thighH: 49`, `shinH: 50` vs the shared 56/64), solved through the
  rig's standing geometry, not display-box-only. Your suggested visual range
  (thigh 42-46w) was derived from the stale 32-long thigh bone; the measured
  numbers on the real bones came out different, but the method matches.
- **Your verification checklist — run this session:** idle, both walk
  facings, two stride phases each, vertical walk, knee seam reviewed at 2x
  zoom on all of them; silhouette tracks the reference. `npm test` 43/43,
  `npm run debug:play -- all` 12/12, `npm run build` clean (Node 25.8.1).
  A final uncommitted tuning round found sitting in the tree (KNEE_OVERLAP
  12→18, Thesz near-leg tilt -15°, re-measured shin offsets) was verified
  the same way and landed as `5e9b7ec`.

**Not feel-signed-off:** Derek hasn't playtested the final committed state
in-browser this session — mechanical + screenshot verification only.

**Process flag for everyone:** this is the second audit this week produced
from a stale checkout (see also the urworthy repo's Codex loop). Before
auditing, `git fetch` isn't enough when Derek's working tree has unpushed
work — ask Derek to push first, or state explicitly which commit you
audited so the next reader can check drift immediately (you did include
observed values, which is what made this reconciliation possible — keep
that habit).

### 2026-07-12 — Codex (Lou leg reference audit; do not redraw again yet)

Derek flagged that Lou's legs are close but still not reading correctly and
pointed to the local reference under `Sprite sheets/New Lou/`. I compared
`LouTheszFullBodyRef.png`, `RUpperLeg.png`, and `RLowerLeg.png` with the
processed runtime assets and current rig values. The revised source drawing is
not the main problem; the rig is substantially distorting its proportions.

**Critical source mismatch:** the cutter's `thesz` configuration still reads
`/Users/home/Downloads/louThesz` with `upperLeg.png` and `LowerLeg.png`. It does
not read Derek's current `Sprite sheets/New Lou/RUpperLeg.png` or
`RLowerLeg.png`. Therefore rerunning the existing cutter cannot validate or
install the reference Derek is looking at.

**Proportion diagnosis:** the full-body reference has a long, relatively narrow
thigh from trunks to knee. Current runtime geometry renders the thigh at
`TEX.thigh = 64 x 32`; the post-Copilot commit doubled its width while leaving
its bone length at 32. Thesz's shin/boot box was also widened from 42 to 63 at a
height of 65. Relative to the 82-wide torso, that makes a single profile thigh
about 78% of torso width and only half the visual height of the shin+boot. The
result is inevitably a short, blocky upper leg and oversized lower leg even if
the PNG contours are correct. This also affects George because the thigh change
is global.

**Recommended next step:** do not ask Derek to keep redrawing the leg to
compensate for rig distortion. First point a QA-only cutter run at the New Lou
files, then test character-specific Lou dimensions near the reference silhouette
instead of changing global `P`/`TEX` values. As a starting visual range—not an
accepted constant—compare a thigh around 42-46 wide and 44-48 long against a
shin/calf around 38-44 wide, preserving the boot's toe overhang in its texture
rather than widening the entire lower-leg box. If bone length changes, the knee
endpoint math must change with the display height; a display-box-only height
override will make the shin attach inside the thigh. Verify idle, both walk
facings, full stride, crouch, lockup, grounded/get-up, and knee seam before
landing anything.

No art or code changed for this audit. The New Lou source files appear to be
local business/art assets outside the tracked repository, so preserve that
boundary unless Derek explicitly asks to version them.
### 2026-07-12 — Derek (handoff to Claude: submission-move review)

Handing the recent armbar/ankle-lock submission work to Claude for final technical review and commit.

- What changed: added stamina drains, new attacker/defender submission poses, `MOVE_DEFS` for `armBar` and `ankleLock`, handlers in `src/Wrestler.js`, and follow-up wiring in `src/scenes/Arena.js`.
- Review needed: confirm `lockup → right` triggers `armBar` and `lockup → left` triggers `ankleLock`; verify attacker/defender enter `holding`, defender shows trapped pose, drain/stamina logic applies, release returns both to `standing`, and no existing lockup/suplex/headlock flows regress.
- Verification note: I was blocked from full local smoke-play/build validation because the available environment has Node `v19.8.1` while the repo requires `>=20.19`.
- Next step: run `npm test`, `npm run debug:play -- all`, and `npm run build` under the required Node version; add the commit SHA, exact command results, and any open issues to `BUILDLOG.md`.

### 2026-07-12 — Claude (skeleton proportion pass: torso/arms/legs, boot-flip bug, AI-off-by-default)

Same-session follow-up to the head/neck entries below, driven live by Derek
via screenshot-and-adjust iteration (not a scoped assignment) — full detail
in BUILDLOG.md's "Skeleton proportion pass" entry, this is the short version.

**What changed (`src/Skeleton.js` unless noted):** george's torso box +10%;
forearm 1.5x longer with a real ~30° elbow bend and a new `ELBOW_OVERLAP`
technique (pull the child part's render origin back into the parent, extend
the parent's own display box by the same amount so the far/physics endpoint
never moves) to hide the bend's joint gap; far arm renders 15% smaller
(`FAR_ARM_SCALE`) for 3/4-shoulder depth; thighs 32→56, shins 32→64, using
the same overlap technique at the hip (`HIP_OVERLAP`) and knee
(`KNEE_OVERLAP`); far/near thigh stagger (`HIP_STAGGER`/`LEG_BACK_BIAS`,
same idea as the existing `SHOULDER_STAGGER`); a long tail of small
per-leg/per-character nudges and two render-only rotation biases on
george's near thigh/shin, described to me in clock-position terms ("5
o'clock to 5:30" etc — these map to skeleton-angle deltas at 30°/hour, and
the mapping held up across two more requests without correction, so it's
validated for at least george's current facing).

**Bug found and fixed:** `tools/wrestler-cutter/process-parts.mjs` had
`flip: { shin: true }` for thesz, based on a source-art preview misread at
thumbnail scale in an earlier session — a tight crop on the boot's actual
content bbox showed the source already faces right, so the flip was
mirroring the boot backward regardless of facing. Now `flip: {}`;
`thesz/shin.png` regenerated.

**Behavior change:** `src/scenes/Arena.js` — P2 no longer defaults to the
George AI on load; both players default to keyboard now, so loading the
game doesn't immediately start a fight (was making art review harder).
Updated `debug:sim`/`debug:probe`/`psych_probe.mjs` (explicitly toggle P2 AI
on now, since they can no longer rely on the old default) and removed the
now-redundant P2-off toggle from `debug:play`/`kinematics.mjs`.

**Verified:** `npm test` 43/43, `npm run debug:play -- all` 12/12, `npm run
build` clean after every structural change. The long tail of per-character
cosmetic nudges was eyeballed via screenshots per Derek's explicit request
to skip re-running the suite on every micro-adjustment — none of those touch
gait/IK code, only render-time position/rotation/scale of already-placed
parts.

**Not done:** Derek's closing note is that he's now leaning toward
redrawing the source art rather than continuing to tune proportions in code
— if new art lands, most of the constants above (especially the per-leg
offsets and both clock-position tilts) will likely need re-zeroing, not
reuse. Also **did not touch Derek's armbar/ankle-lock submission-move
changes** in the entry directly below — that review/commit/BUILDLOG request
is still open for whoever picks it up next.

### 2026-07-12 — Derek (submission moves: armbar & ankle-lock added)

Quick heads-up for Claude: I added two submission moves and the minimal pose + handler plumbing so you can review and commit if it fits the feel.

- What changed: added stamina drains, new `POSES` entries for the attacker/defender variants, `MOVE_DEFS` sequences for `armBar` and `ankleLock`, `_doArmBar` and `_doAnkleLock` handlers in `src/Wrestler.js`, and lockup follow-up wiring in `src/scenes/Arena.js` (right → `armBar`, left → `ankleLock` when in `moveSet`).
- Why: these moves needed multi-keyframe pose sequences and a timed 'holding' state separate from existing slams/throws.
- Test steps for review: run `npm test`; then run the debug play mode and exercise a lockup follow-up (lockup → right for armbar, left for ankle lock). Verify attacker/defender states move to `holding`, defender pose shows trapped variant, stamina drain applies, and the timed release returns both to `standing` with no orphaned state. Confirm no regressions in pin/headlock/suplex flows.
- Next action for Claude: please review the diffs, run the tests above, and if acceptable commit on a focused branch; include the commit SHA and the `npm test`/`debug:play` results in a BUILDLOG.md entry and add a short Claude note here with the commit hash and verification outcomes.

### 2026-07-12 — Claude (george's head still floating — fixed with a tunable anchor offset)

Follow-up to the head/neck refactor logged directly below. Derek reported
after playtesting it that George's head still sat too high and too far back.

**Root cause:** the refactor's flush-anchor assumption was wrong for this
specific art. `head.png` isn't cropped along a clean horizontal neck line —
it's cropped along the jaw curve, so only the chin-tip pixel is flush with
the canvas's bottom-center pivot (confirmed via per-row alpha bounding-box
measurement: content width tapers smoothly from ~93px at row 180 to 7px at
row 199, out of a 200×200 canvas). The actual jaw/ear mass — where a neck
would attach — sits roughly 15 canvas px above that point and is skewed
toward the hair side of the canvas center, not underneath it. So the
"pivot-flush, zero-offset" join from the prior commit was seamless in the
literal sense (canvas boxes touch) but visually wrong, because the flush
point isn't where the head reads as connected.

**Fix (`c4cd31b`'s follow-up, uncommitted at time of writing — see BUILDLOG
2026-07-12 "fixed remaining float"):** added `textures.headOffsetX/Y`
(unscaled px, default 0, gated behind `neckInTorso` so Thesz is untouched) in
`Skeleton.js`, applied in both `updateUpright` and `_applyGrounded`. Set on
`george.js`: `headOffsetX: 6, headOffsetY: 15`. Values came from measuring
the art's alpha bbox, then tuned by rendering in-world debug crosshairs at
the live anchor coordinate and comparing screenshots before/after — not a
closed-form derivation, since the crop is irregular.

**Verified:** `npm test` 43/43, `npm run debug:play -- all` 12/12, `npm run
build` clean. Visual comparison across idle/walk/taunt poses shows the gap
and backward drift gone. **Not Derek-playtest-confirmed yet.**

**Open flag for whoever touches George's head art next:** this is a code
patch over an art/crop mismatch, not a re-crop. If Derek redraws or
re-processes `georgehead2.png` with a cleaner neck-line crop (matching how
`torso.png`'s neck stub is flush), these offsets will likely need to change
or go back to 0 — check visually, don't assume they still apply.

### 2026-07-12 — Claude (head/neck refactor landed: george's head2/torso2 art wired in)

Closed out the assignment directly below (Derek's "Head/neck architecture
refactor: pin head to torso"). Derek supplied new art —
`Sprite sheets/GeorgeParts/georgehead2.png` (head only, no neck) and
`Torso2.png` (neck now extends up from the collar, pivot-flush at the
canvas top) — and asked for it conformed and wired in.

**Art**: pointed `tools/wrestler-cutter/process-parts.mjs`'s george
`files.head`/`files.torso` at the new sources (trunks compositing
unchanged — `Trunks.png` is still a separate accessory layer) and reran
the pipeline. `verificationOk: true`; torso's `pivotFlush` confirms the
neck stub sits exactly at the processed canvas's top row (y=0), and the
paper-doll QA mock (head bottom-pivot placed directly at torso top-pivot,
no offset) shows a solid, gap-free neck. Regenerated `head.png`/`torso.png`
in `src/assets/wrestlers/george/`; the other 4 parts reprocessed
byte-identical since their sources didn't change.

**Code** (`src/Skeleton.js`): rather than deleting the crop path outright,
gated it behind a new per-character `textures.neckInTorso` flag (set on
`george.js` only) since **Thesz's head art still carries its own neck
slack** and would break if the crop/hide math were removed globally. When
`neckInTorso` is true: constructor skips `setCrop`/`_headHidePx` entirely
(confirmed already unnecessary before Derek's follow-up message asking to
drop it), and both `updateUpright` and `_applyGrounded` anchor the head's
bottom pivot directly at the torso's own top pivot (`neckY`/`shX,shY`) —
no offset, per the pivot-flush measurement above. `_headIsImage`/
`_headScale` are unchanged (still used independent of cropping).
`_neckInTorso` false (default, i.e. Thesz) preserves the exact previous
crop-and-sink behavior untouched.

**Verified**: `npm test` 43/43, `npm run debug:play -- all` 12/12,
`npm run build` clean (all via `/opt/homebrew/opt/node/bin`, Node 25.8.1 —
default `node` on this checkout is still 19.8.1). `npm run debug:shot -- 8`
with `WFM_P1=george WFM_P2=george` shows both wrestlers locked up with a
clean, flush head-to-neck connection — no floating head, no visible seam,
no console errors. Grounded-pose head anchoring (`_applyGrounded`) uses
the identical pivot-flush logic but wasn't separately screenshotted;
`debug:play`'s pin sequence (pinAttempt/kickout/nearfall/pinfall) exercises
that code path without error.

**Not done**: Thesz is still on the old crop-based head (no `neckInTorso`
art supplied for him yet) — this session only touched George, as asked.

### 2026-07-12 — Codex (commentary research workspace created)

Per Derek's request, added `research/commentary/` as a documentation-only
workspace that is not imported by the game. Its first dossier locks the
fictional match to July 12, 1952; separates verified facts, provisional facts,
and deliberate alternate history; records sources; includes sample downtime
copy; and lists the remaining research. Important boundary: the real chronology
places Thesz against Hans Schmidt in Decatur that date, so George–Thesz at the
Marigold must remain explicitly alternate history. Claude: review and extend
the dossier in place, but do not move it into runtime data or audio assets until
Derek approves the researched script and the current gameplay priorities allow
implementation. No source code or build configuration changed.

### 2026-07-12 — Codex (approved direction: event-driven vintage commentary library)

Derek wants to explore a few hundred short, pre-generated commentary clips for
matches. The voice must be an original, clearly synthetic vintage ringside
announcer—not a clone or convincing replica of any identifiable real
sportscaster. Desired material falls into three groups: contextual match calls
(hits, reversals, near-falls, finishes), verified Marigold/era history, and
wrestler-specific facts.

I inspected the current build before recommending this direction. It is a small
Phaser/Vite browser game: `src/` is about 480 KB and the current image assets
about 248 KB. `CrowdAudio.js` synthesizes its sound with Web Audio and ships no
recorded audio. `Arena.js` already records structured `matchEvents` including
move, knockdown, stagger, pin attempt, kickout, near-fall, pinfall, sleeper
application/escape/KO, which is the right trigger seam for commentary.

Capacity conclusion: a library of roughly 300 mono clips averaging five seconds
is safe if compressed and loaded selectively. At 48–64 kbps Opus/OGG it should
weigh roughly 9–12 MB (about 18 MB at 96 kbps MP3). Do not preload/decode the
entire library into Web Audio buffers: 300 five-second mono clips decoded at
44.1 kHz could occupy roughly 250 MB of RAM. Keep audio as separately fetched
public assets, preload only a small eligible group after the user's audio-unlock
gesture, retain one active commentary voice, apply per-line/category cooldowns,
cache fetched files, and duck the synthesized crowd beneath speech. A 50-clip
pilot should come before scaling to 300.

Recommended data shape per line: stable ID, transcript, event type, intensity,
valid match phases, wrestler/venue applicability, factual source or review
status, cooldown, and asset path. Historical and wrestler facts should come
from reviewed canonical data rather than improvised runtime text. The selector
should filter by current match state, reject recently played lines, and avoid
interrupting active speech. Pre-generation is preferred over live TTS for
consistent performance, moderation, captions, caching, and cost.

**Claude action requested:** preserve this as an approved future direction in
`BUILDLOG.md` (planning/backlog, not a claim that the feature is implemented).
Please keep implementation behind the current B1/B2 priorities unless Derek
explicitly reprioritizes it. No game code or audio assets were changed for this
entry.

### 2026-07-12 — Derek (Head/neck architecture refactor: pin head to torso)

**Problem:** Head PNG included neck, system crops 24% off the bottom and repositions, but head ends up floating — the neck never connects visually to the torso torso.

**Solution:** Shift the neck from head asset into torso asset. Head PNG becomes head-only (no neck). Code adds a `neckY` constant (like `shoulderY` for arms) that pins the head image to a fixed point on the torso. Neck is now rigid and always connects; head pivots cleanly from that anchor.

**Art tasks:**

- Rebuild torso PNG to include the neck extending upward from the collar
- Rebuild head PNG as head-only (remove the long slack neck)
- Supply updated textures to `src/assets/wrestlers/george/` (or relevant character)

**Code tasks for Claude:**

- Remove the current head crop logic (`HEAD_HIDE_FRAC`, `_headHidePx`, `setCrop` call) from `Skeleton.js` constructor
- Add a `neckY` constant in `updateUpright` (suggest: `const neckY = torsoTop + 12 * s`, adjust for your art)
- Replace the current head positioning block (lines ~455–465) with simple head anchor to `neckY` instead of the crop-reposition math
- For grounded poses (`_applyGrounded`), head should pin to the computed neck point along the torso line
- Remove `_headIsImage`, `_headHidePx`, `_headScale` if no longer needed (check if any grounded code uses them)

**Testing:** Load game, confirm head sits flush to torso neck with no gaps, no floating. No regression on gait or poses.

### 2026-07-12 — Claude (B1 feel-signed-off: Derek playtested the reversal fix)

Follow-up to the close-out entry directly below. Derek playtested at
`http://localhost:5173` (P1 vs AI P2, open ring space, repeated plant-and-turn
reversals per the previous entry's suggested test) and confirmed the planted
foot "looks pretty glued" through the direction change — no visible skate at
the swap point. **B1 is now fully feel-signed-off, not just mechanically
verified.** No code changed this entry, docs only. B2 hitstop is next per the
original Codex brief sequence — open for Codex/Derek to confirm scope before
that starts.

### 2026-07-12 — Claude (B1 close-out: reversal foot-lock, per Codex's assignment above)

Closed the verification gap Codex flagged. Landed as `4fad2eb` on master
(pushed alongside `c58535c`, Derek's assignment-setting commit).

**Measurement first, per the assignment's instruction not to guess.** Added a
minimal debug read seam in `Skeleton.js` (`nearFoot`/`farFoot`: world ankle
x,y + planted flag, stored after each frame's leg placement — no rendering
change) and a `footSlip()` metric in `tools/debug/kinematics.mjs` that finds
the max world-space drift of a foot between consecutive frames where it's
planted in both. Ran it pre-fix: the B2 live-reversal test's post-swap window
showed real slide — max 3.28px, 10/34 planted-pair frames slipping >0.5px,
concentrated right at the input swap (+17ms after). Root cause confirmed:
`Wrestler.move` set `_walkPhaseDir` from raw input direction, which flips the
instant the key changes, while `this.vx` (the ramp) still points the old way
through the entire brake half of a live reversal — desyncing the gait-lock
math, which (per the `Skeleton.js` GAIT derivation) requires phase direction
to equal `sign(vx)` relative to facing, not the newly-pressed key.

**Fix, smallest possible:** `_walkPhaseDir` now derives from actual
post-ramp `vx` sign relative to facing, with a `4 * this.s` epsilon so
near-zero `vx` (settling/noise) holds the last direction rather than
flipping — same "held through brake-to-stop" behavior the field already
documented, just driven by real velocity instead of input. Nothing else in
`move()` touched.

**Post-fix measurement:** post-swap slipping frames drop to 2-3 out of
34-36, and the worst frame shifts from right-at-the-swap to well past the
150ms crossover — matching the same small residual seen in plain
(non-reversal) braking, which I did not chase further since it's not the
direction-desync bug in scope here and shows up identically before and after
this fix. Confirmed stable across 3 repeated probe runs (max slip 3.28-3.35px
pre-fix window unchanged in magnitude, but frame count and location moved off
the swap point every time).

**Verified:** `npm test` 43/43, `npm run debug:play -- all` 12/12, `npm run
build` clean, all on Node 25.8.1 via `/opt/homebrew/opt/node/bin` (this
checkout's default `node` still resolves to 19.8.1 — Codex/whoever else,
prefix `PATH` or `nvm use 22`). Run/whip/clothesline/accel/brake timings
unchanged within measurement noise (e.g. run speed 273 vs 274 px/s,
brake time 100-101ms across pre/post-fix runs). Screenshot review at
mid-walk and mid-reversal (post title-card, ~6-7s into a match): no visual
glitch, gait reads normally.

**Human playtest: not done this session** — Derek wasn't available. Per the
assignment, labeling B1 **mechanically verified, not feel-signed-off**. This
specifically needs eyes on whether the reversal now _feels_ different (the
crossover point shifted ~15-20ms later in a couple of runs, likely just
measurement noise from live wall-clock timing rather than a real behavior
change, since the fix only touches visual gait-phase direction, not the
`vx`/`vy` ramp itself — but worth confirming by feel, not just by staring at
the numbers).

**Open questions for Codex/Derek:**

- The residual 2-4-frame quantization slip present in both plain braking and
  post-fix reversal (a last-frame artifact right where `travelSpeed` crosses
  the `0.5` "stop" threshold) is small (~4px) and out of this assignment's
  scope, but flagging in case anyone wants it swept up alongside a future
  B-batch item — it's not reversal-specific and predates this session.
- No new Active Assignment queued below — B2 hitstop is next per the original
  brief's sequence, but that's Codex's/Derek's call, and Derek's human
  playtest of B1 should probably happen first.

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
`coverStamina` 55/60) gates on a _standing_ low-stamina opponent, and that
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

- preload path fix, see entry below), and untracked `src/assets/` (George's
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
