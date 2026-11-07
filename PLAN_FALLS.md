# PLAN_FALLS: falls that hurt and obey gravity (Derek 2026-11-04)

Opus plans, Sonnet executes, Derek judges. Rig: Procreate Lou (`thesz-procreate-v1`) first, then `george-roster-v1`. Old rigs
`thesz` / `thesz-front3q-r1` don't count.

## Derek's direction (2026-11-04)

"We need several ways for them to fall, forward and backward, but they should feel painful and reflect gravity. It could engage
when a victim hits the mat, but there should be some bounce and wincing, and arms need to engage with the mat to support them.
Currently they lie in an unnatural missile position with their arms at their sides; in reality they would use the arms for support."

## What exists (Opus read, 2026-11-04)

**Derek's next direction (2026-11-05):** the latest work is starting to look good; next, remove the “velcro” stop on slams with a visible rebound and natural limb flailing, **without hyperextension**. [Codex assessment and Stage 2 advice](AI_HANDOFF_ENTRIES/2026-11-05-codex-falls-bounce-review.md). Bounce is already Stage 2; this clarifies its limb behavior. Positive feedback does not select/promote all G1 poses.

- **Falls from standing:** `Wrestler.startFall` tweens `fallProgress` 0 -> 1 (`Sine.easeIn`) through `Skeleton.FALLS` keyposes
  (`backward`, `sitBack`, `forward`, `kneesForward`; `FALL_VARIANTS` picks one at random per direction), drawn by
  `Skeleton.updateFall` (Skeleton.js ~2180). `flip` (`startClotheslineFall`) is the airborne one, with an arc. On completion the
  state is `down` at once: **no contact beat, no bounce**; the camera shakes.
- **Throws:** clips (slam, suplex, hip toss, snapmare ...) end on the upright rig, then `_layDown` (Wrestler.js ~2729) blends
  0.3 s (`GROUND_HANDOFF_SEC`) from the clip's last frame into the lying pose. No landing beat either.
- **Lying pose:** `GROUNDED_SUPINE` / `GROUNDED_FLAT`: arms along the body (`farArm` 1.48, `nearArm` 1.42, about the torso's own
  angle), legs straight: the missile. It is also **the first key of every get-up** (`getUps.js` 122, 128, 159, 164, 201), the base of
  the mat sells (`Wrestler.js` ~1198 `applyOffsets(GROUNDED_POSES[lying], d)`), of `_lyingHold`, of the fall end keys and of pins.
- **Mat sells** (`sells.js`, `planSells`): clutch, roll, writhe after the landing; they offset the missile pose.
- **Hands to a point on the ground:** `Skeleton.updateGroundedReach` already places hands on targets (used by sells and lying holds):
  the lead for planting palms and forearms on the mat.
- **No face expression art** exists (no wince head). The wince here is body language; a pain-face variant is a later Codex art ask.

## Decisions (Opus; Derek can overrule at any gate)

- **D1 Flag:** `?falls=v1`, opt-in. Flag off byte-identical (`grapples_flagoff`-style check). Never promote without Derek.
- **D2 The missile stays, the rest pose is new.** Don't edit `GROUNDED_SUPINE` / `GROUNDED_FLAT` (certifier, get-ups, pins key off
  them). Add `Skeleton.REST_POSES = { supine, prone }` and one function, `lyingBase(lying)`, that returns the rest pose with the flag
  on, the old pose with it off. Every reader above goes through it. Get-ups start from the rest pose under the flag (their first key
  swapped, the rest of the keys unchanged), so the rise starts from where he lies.
- **D3 Trained bumps, 1950s pros.** A back bump: chin tucked, the arms slap the mat at about 45° from the body, palms down, at the
  shoulders' contact, which is what protects him and sells the noise. A forward fall: the hands and forearms catch first, the elbows
  give, then the chest. Not a ragdoll. Derek can ask for a "civilian" sloppier fall per move later.
- **D4 Gravity as a measured rule, not a feel.** Over the unsupported part of the drop (no hand, foot or knee bearing weight;
  braces and pivots around a planted foot are reported separately, not held to this), from the moment balance is lost to contact, the pelvis's height falls at an
  increasing rate: per-frame drop never decreases (allow 1 frame of noise), the fastest frame is the last before contact, and the
  time from balance loss to contact is within 20% of free fall from the pelvis height (`sqrt(2h/g)`, g picked once so a standing
  man's free fall is about 0.40 s at s = 1; report the value). No ease-out into the mat.
- **D5 The landing is one shared layer** (`src/animation/falls.js`, pure data and math like sells.js, with tests): contact ->
  compression -> bounce -> settle -> wince, applied to every path to the mat (falls from standing, the flip, `_layDown` after a
  throw), so throws get a bounce too without re-authoring each clip. Size by the move's `sell.intensity` (and height of the drop for
  throws, measured from the clip's last frames).
- **D6 Arms engage the mat.** In the landing and at rest, each palm or forearm meant to touch the mat is within 3 px of the mat line
  (measured on the painted hand), placed with `updateGroundedReach` where keys alone can't. At rest no arm lies within 15° of the
  torso's line (the missile test).

## Measures (every gate; raw numbers, both rigs, both facings)

Pelvis height per frame through the fall (D4 checks), contact frame and what touches first, bounce height (px) and count, arm angle
off the torso at rest (deg), each support hand/forearm's gap to the mat (px) at contact and at rest, max joint step at each hand-off
(fall -> landing -> rest -> sell -> get-up; flag a step over the gait's 2.5 px/frame), get-up first-frame step from the rest pose, flag
off identical. Missing art, overlap (forearm inside the torso, as G8 counted) and any pop are misses, listed first.

## Stage 0: before page (no game change)

- **T0.1** `tools/debug/falls_probe.mjs`: every path to the mat today (the four `FALLS` variants, `flip`, and the throws that `_layDown`
  supine and prone: body slam, suplex, hip toss, snapmare, the piledriver's prone), Lou on George and George on Lou, both facings:
  frames, the measures above, JSON beside them. Page `research/animation/falls-2026-11/before/index.html`, normal-speed loops,
  misses first. Commit locally; no stop (it's the "before" column for G1 and G2).

## Stage 1: lying with the arms on the mat, stop at G1

- **T1.1** `REST_POSES` and `lyingBase` (D2). Supine: arms out from the body (40-60° off the torso), elbows slightly bent, forearms
  and palms on the mat; the near knee up (foot flat), the far leg straight or slightly bent; head on the mat. Prone: forearms on the
  mat under the shoulders, one palm flat near the head, elbows out, the head turned or slightly up, one knee drawn out to the side.
  Author on Lou, check George. Unit tests: flag off returns the old objects (identity); rest pose limbs within `limitKnees` and the
  joint limits.
- **T1.2** Route every reader through `lyingBase`: the `down` draw, the ground hand-off blend target, `_sellPose`, `_lyingHold`,
  the fall end keys, get-up first keys (D2). Pins: leave the pinned man on the old pose this stage unless the cover's hands still land
  (measure the attacker's hands to his chest; if off, leave pins on the old pose and say so).
- **T1.3** The sells offset the rest pose now: re-check that clutch, roll and writhe still reach their targets (hand to part, px) and
  don't pass a hand through the torso; a roll turns over between the two rest poses with no pop.
- **T1.4** G1 page `research/animation/falls-2026-11/g1/index.html`: before (missile) and after, stills of both rest poses, and
  normal-speed loops of: a fall, the lie, a sell, the get-up, per rig and facing. One quick loop strip in both facings first
  (CLAUDE.md). Misses first. Focused tests, flag-off check, `npm run moves:coverage -- --check`. Commit locally, **STOP at G1**.

## Stage 2: the landing (contact, rebound, limbs, wince), stop at G2a then G2

Rewritten by Opus 2026-11-05 from Derek's "velcro" note and [Codex's review](AI_HANDOFF_ENTRIES/2026-11-05-codex-falls-bounce-review.md).
Derek: slams stick to the mat; he wants a visible rebound with the limbs flailing, **no hyperextension**. Authored and bounded: one
shared response, not a ragdoll. Lou first, George checked every task.

- **T2.0** Fix the elbow check in `tests/restPoses.test.js`: it takes `Math.abs` of the wrapped fore-arm difference, so a wrong-way
  bend passes. Use the signed flex (sign convention from `tools/debug/limb_limits_audit.mjs`) and assert `min <= flex <= max` from
  `JOINT_LIMITS`. If either rest pose fails, retune the pose, not the limit.
- **T2.1** `src/animation/falls.js` (D5): pure data and math, with tests. `landingResponse(kind, intensity, incomingVy, t)` returns
  offsets on top of `lyingBase`. Phases, about 0.45-0.7 s in all:
  - **contact** (t = 0): back bump: shoulders and arms meet the mat together, arms slap out (D3); forward: hands and forearms land
    1-2 frames before the chest;
  - **compression** (about 0.05 s): the trunk flattens and shortens (torso and pelvis channels, not a y shift of a rigid pose), knees
    and elbows give;
  - **rebound**: pelvis and upper back leave the mat. Lou at intensity 0.7: 6-10 px is a **tuning target**, scaled by intensity and
    incoming speed, not a fixed hop. A smaller second one only for intensity >= 0.8;
  - **limbs**: each limb gets its own lag and damping (knee, elbow, wrist, head peak and settle at different times, amplitude falling
    with each rebound). A supporting arm catches and yields at contact, **may release** during the rebound, then returns to the mat on
    purpose. Forward: one forearm can stay planted while the other limb reacts. Don't pin both arms for the whole response;
  - **settle, then wince**: knees draw up, back curls, chin in, the near hand starts toward `sell.part` so the sell takes over with no
    step.
  Every key and every lagged channel stays inside the signed knee/elbow limits; tune the keys and lag, never widen `JOINT_LIMITS` or
  lean on `limitKnees` clamping to hide a bad key. Unit tests: signed flex in range at 120 samples per kind and intensity; offsets go
  to zero at the end (the rest pose is where it lands).
- **T2.2** Wire **two paths only**: `startFall` `backward` and the body slam through `_layDown`. Contact is the impact frame (the
  fall's t = 1; the throw's own impact event). The landing starts **at contact**, running alongside the 0.3 s ground blend, not after
  it (no stuck beat on the mat first). If the clip already has an impact reaction, the landing replaces its tail, so one impact never
  gets two reactions. One damage event and the camera shake unchanged. State: `down` at contact as today (damage and pin rules
  unchanged); a landing timer blocks AI actions and pin starts until it ends; reset, match end and a get-up clear it. Say so in the
  commit.
- **T2.3** Joint and continuity audit of the response: adapt `limb_limits_audit.mjs` (and `clutch_continuity_audit.mjs` for steps)
  to the drawn frames, through contact, compression, rebound, re-contact, settle and the sell's first frames, both rigs and facings,
  including the blend and any `updateGroundedReach`. Report: contact and re-contact times, rebound height (px), support release and
  replant times, signed flex min per joint (any < limit is a miss), clamp hits, the largest step at each seam (fall -> landing ->
  sell). A fast frame during the impact itself is expected velocity; a step at a state or pose seam is a pop. Separate them.
- **T2.4** Preview for Derek (CLAUDE.md): one strip page `research/animation/falls-2026-11/g2a/index.html`: the backward fall and the
  body slam, Lou on George and George on Lou, both facings, normal speed and 0.25x loops, contact and apex frames marked, T2.3's misses
  first. Focused tests only. Commit locally, **STOP at G2a** (Derek glances: rebound size, limb flail, any wrong bends).

**G2a (Derek 2026-11-05):** "looking good"; the backward falls are OK. **The slams** are off: "he hits, then a few moments pass
before he reacts". Keep the backward fall as it is (T2.4a-b change the slam path only). Two causes,
from [Codex's G2a review](AI_HANDOFF_ENTRIES/2026-11-05-codex-g2a-review-for-opus.md), both confirmed in code by Opus: (1) the slam's
damage, shake and mat foley fire on the clip's `impact` (1.083 s) with the pelvis 37 px up; it reaches the mat at `contact` (1.367 s);
(2) `Skeleton.updateGroundedBlend` adds the landing offsets to the target **before** the smoothstep, so the response is scaled by the
blend (about 7% left at 50 ms, 26% at 100 ms): compression and early flail are mostly lost. Fix these before T2.5. Don't raise
amplitudes to cover (2).

- **T2.4a** One impact moment (slam), under `?falls=v1` only, flag-off untouched: retime the slam's descent from its apex so the
  pelvis reaches the mat **at** the hit, falling under D4's g (1710) on the unsupported part. Then damage, shake, mat foley and the
  landing start all fire on that one frame. Exactly one damage event. Sonnet picks the mechanism (flagged alternate keys or a time
  warp on that segment in `MoveRuntime`) and says which in the commit. Report: pelvis height at the hit (target <= 3 px), the time
  between foley/shake and pelvis contact (target <= 1 frame), the descent curve against free fall, and the clip length change. Both
  pairs, both facings.
- **T2.4b** Additive landing over the blend, **slam path only**: apply the landing offsets **after** the blend from the clip pose,
  not into its target, so they reach full size at contact. The backward fall keeps today's into-target behaviour (Derek OK'd it at
  G2a); prove it unchanged (same probe rows as dcc4454). Signed flex and seam checks through the blend (the blend base and the offsets
  can add up to a wrong bend; tune keys or lag, never the limits). Re-measure the slam's first hop (was 6.5-7.4 px) **before** any
  amplitude retune; report both.
- **T2.4c** Audit to the T2.3 contract: probe rows carry the landing phase and its actual duration (drop the hardcoded contact + 0.6 s);
  check both joint limits (lower and upper) and clamp hits through contact, blend, settle and the sell's first frames, no extra
  tolerance; label seams from runtime transitions (landing -> sell when the landing actually ends). Support: classify each hand as
  never supported / released / replanted (a hand already up at contact is not a release). First-hop height phase-tagged, wince
  excluded. One end-to-end `Wrestler` test: one damage event, foley at contact, pin/AI blocked until the end, reset clears it.
- **T2.4d** G2a r2 page (same layout, `research/animation/falls-2026-11/g2a/r2.html`): dcc4454 beside the fix, normal speed and 0.25x,
  hit/contact/apex marked, misses first (George's sell elbow -1.9/-0.42 stays listed). Focused tests only. Commit locally,
  **STOP at G2a r2** (Derek: does he react the moment he hits?).

**G2a r2 (Derek 2026-11-05):** "looks great and elevates the action". Next he wants **more fall types** and to explore **bigger
impacts**. Plan from [Codex's note](AI_HANDOFF_ENTRIES/2026-11-05-codex-fall-variety-and-heavy-impacts.md). Codex withdrew the 283 ms
claim: the slam's raised pelvis was the frame before the hit; the extra `contact` marker caused the delay. r2 (e36116c) is the
comparison for everything below. Each new response is its own shape, not the slam's hop on a different pose.

- **T2.5a** Debts from r2, before new work: (1) the jump into the landing is 17.1 / 24.3 px (dcc4454: 9.9 / 14.2). Split it into
  impact velocity vs. a pose seam (D-rule in T2.3). If it is a seam, fix it, with the hop height unchanged (Lou 7.2, George 9.2 px).
  (2) George's back sell: the near knee reaches 3.73 rad (cap 2.55) on 9 frames and the far elbow -0.42. Run it flag-off. If it's
  the same there, list it on the polish list in the r2 Progress line and move on. If `?falls=v1` causes it, fix the keys.
- **T2.5b** Forward catch and buckle (`forward`, `kneesForward`): hands and forearms land first and **yield** (supported compression,
  not a flight), then the chest or knees follow and the heels kick. One forearm may stay planted while the other limb reacts. Measure
  support separately from the unsupported part (never supported / released / replanted).
- **T2.5c** Seated collapse (`sitBack`): hips hit first, shoulders rock back, legs kick, then settle. **No full-body hop** like the
  slam's. Same audit.
- **T2.5d** Bigger impact tiers on the body slam, preview only behind `?slamTier=heavy|exceptional` (default = r2):
  - **heavy**: hop about 11-12 px;
  - **exceptional**: 14-16 px. This needs `REBOUND_MAX` (14, `src/animation/falls.js`) raised for that tier only. Say so in the
    commit.

  Shape, not just height: shorter and harder compression, bigger staggered knee and arm recoil, one dominant rebound, a much
  smaller settle, then a short spent pause before the sell. Don't lengthen the hang time before the hit. Mat foley and shake can scale
  but stay on the one impact frame. **Gameplay unchanged**: same damage, down time and pin rules. If a tier's landing runs longer,
  report it, and don't let it extend the pin/AI block past r2's. Signed limits on every tier: tune keys, never `JOINT_LIMITS`.
- **T2.5e** Sideways spill, **concept only**: Lou, one facing, the hip or side lands first, the torso follows, one arm reacts, and he
  settles onto his back. An authored transition, not a rotated back bump. Behind `?falls=v1&spill=1`, not wired to any move.
- **T2.5f** G2b page `research/animation/falls-2026-11/g2b/index.html`, the same layout as r2. Rows: forward catch, knees-first,
  seated collapse, sideways spill (concept), and the slam at r2 / heavy / exceptional side by side. Show both pairs and both facings
  (spill: Lou, one facing), normal speed and 0.25x, with contact and apex marked and the audit's misses first. Focused tests only.
  Commit locally, **STOP at G2b**. Derek picks the shapes he likes and the impact tier, and decides where "exceptional" is used.
**G2b (Derek 2026-11-05):** "it's looking great". He wants the falls used everywhere they fit, picked by the situation, and
eventually standard (today all of it is behind `?falls=v1`). Tiers and the knockdown rule confirmed by Derek 2026-11-05: the body slam and
the other big impact moves should feel painful (heavy, at least); exceptional may repeat; strike knockdowns under 35 stamina.

- **T2.5g** Landings on every throw (each keeps its own clip and its one impact frame; the landing starts one frame after it, the
  r2 way). Receiver: suplex `back` heavy; back body drop `back` heavy; hip toss, arm drag and the clothesline/dropkick/dive flip
  landing `back` r2; snapmare `seat`; piledriver `exceptional` on its own lie (prone today: a front landing with **no** hand catch,
  he didn't put his hands out). The suplex attacker's own bump gets `back` r2. Atomic drop: no landing (the receiver stays up).
  Re-run T2.3 on all; both pairs, both facings. Don't add a stumble before a throw whose clip already supplies the flight.
- **T2.5h** Tiers per rig: George's drawn hops are 14.9 / 18.8 px against 11-12 / 14-16 (Lou 11.5 / 14.4 in range). Scale the hop
  by the rig so both land in range; the tier ranges are in drawn px at scale 1. Body slam default becomes **heavy**; `?slamTier=`
  still overrides for review. Exceptional is only for the piledriver and the moves T3.1 names.
- **T2.6** Gravity (D4) on the drop: retime `startFall` (keys' pelvis heights and the ease) until D4 passes for `backward`,
  `forward`, `sitBack`, `kneesForward` and `spill`, measured on **unsupported intervals only**; report support and contact phases separately.
- **T2.7** G2 page `research/animation/falls-2026-11/g2/index.html`: every path, before and after, normal speed and 0.25x, per rig and
  facing, the D4 curve per fall, T2.3 table. Misses first. Full suite, build, coverage, flag-off. Commit locally, **STOP at G2**.

## Stage 3: the right fall for the situation, stop at G3

Today only three things knock a man down from standing: the headbutt (random `backward`/`sitBack`), the corner charge (`forward`, or
`kneesForward` to the gut) and the clothesline family (the flip). Jab, front kick, shove, double axe handle and knee lift only
stagger. Stage 3 picks the fall from the situation, and lets worn-down men go down from strikes (the escalation rule: big falls come
after wear-down).

- **T3.1** `chooseFall(ctx)` in `src/animation/falls.js`, pure, with tests. `ctx`: move, where it hit (head/chest/gut), the attacker's
  side (front/behind), the receiver's stamina, ring room on each side. Rules:
  - from the front to the head or chest: `backward` or `sitBack`; to the gut: `kneesForward` or `sitBack`;
  - from behind: `forward` or `kneesForward`;
  - a shove or glancing blow with room to the side: `spill` (otherwise `backward`);
  - tired (stamina < 35): weight toward `sitBack` and `kneesForward`, the collapses; fresh: toward `backward` and `forward`;
  - drop any fall that would leave the body outside the ring (measured on its lying length), then pick at random among what's left;
  - tier: `exceptional` when a big move (suplex, back body drop, body slam) lands on a receiver under 25 stamina, otherwise the
    move's T2.5g/h tier.
  Tests: every rule, and every result is a fall `startFall` accepts.
- **T3.2** Registry: each move lists the falls it may cause (`falls: [...]`, read by `chooseFall`); the move-to-fall table goes in
  MOVE_CATALOG.md. Wire it: the headbutt and corner charge use `chooseFall`; jab, front kick, shove, double axe handle and knee lift
  knock down (instead of staggering) when the receiver's stamina is under 35 after the hit, through `chooseFall`. Damage, down time
  and pin rules don't change; the knockdown threshold is the only new gameplay rule, state it in the commit.
- **T3.3** Finish the spill: both rigs, both facings, gravity timed (T2.6), T2.3 audit clean, then drop `&spill=1` (it stays behind
  `?falls=v1`).
- **T3.4** G3 page `research/animation/falls-2026-11/g3/index.html`: a table of move x situation -> fall (fresh, tired, from behind,
  near the ropes), each a short strip, both pairs; plus one normal-speed AI-vs-AI match clip with every fall marked by its pick reason.
  Misses first. Full suite, build, coverage, flag-off. Commit locally, **STOP at G3**.

### Stage 3 r2: wiring and evidence (Opus 2026-11-06), stop at G3 r2

From the reviews of [G2](AI_HANDOFF_ENTRIES/2026-11-05-codex-g2-review-for-opus.md) and
[G3](AI_HANDOFF_ENTRIES/2026-11-05-codex-g3-review-for-opus.md). G3 built the selector. What's left is integration and proof that
it happens in a real match, not more fall types.

- **T3.5** Read the hit at the hit: capture the attacker's side (front/behind), where it hit, and the receiver's stamina **right after
  the damage**, at the hit frame. Carry them into `_staggerOrFall` and `_pickFall`. Today they're read after the 110-150 ms sell,
  after `move` has auto-turned the receiver, so "from behind" only works with the facing held. Test at the executor (`Wrestler`)
  level: a real strike from behind with no facing lock picks a forward fall; stamina 35 vs 34.9 right after damage at the threshold.
- **T3.6** Tired throws: one shared helper (receiver-aware tier) used by `_doBodySlam`, `_doSuplex` and `_doBackBodyDrop`; it calls
  `chooseFall`'s tier rule. Stamina is sampled at the throw's impact, **before** its damage. `?slamTier=` still overrides; flag-off
  untouched. Throws keep their own clips (don't route them through `startFall`). Executor test: a slam on a receiver at 24 lands
  exceptional, at 26 heavy.
- **T3.7** Backward fall arm step at contact (G2: Lou's near wrist 75.7 screen px from frame 31 falling to 32 down; about 20 px
  before the retime). Compare the last fall frame, the exact t = 1 pose and the first down pose at matched time; split it into
  translation vs angle change, flag-off vs candidate. A normal-speed 10-frame strip, both rigs. Fix it only if it's a pose seam (no
  smoothing that hides a real impact).
- **T3.8** Supported falls: label the phases (first support -> keyed absorption -> response start) for `sitBack`, `kneesForward`,
  `forward` and `spill` in the probe rows and on the pages. The response starts at the tween's end (220-300 ms after first support).
  Check whether the keys already hold the catch. If they do, leave it and say so. If there's a dead beat, start the response at first
  support **without** doubling the keyed reaction. Don't copy the slam rule over blindly.
- **T3.9** Ring edge: when no fall fits, today `chooseFall` returns the least overshoot ("cramped") and he can land through the rope.
  Fallback: keep the chosen fall and slide the body inward over the fall, the way `_fallFromCorner` does with `landMargin`. Show
  one boundary case per facing (both pairs) with the rope drawn; feet and head inside the ropes.
- **T3.10** Real-match evidence, nothing capped: `grapples_soak.mjs` AI vs AI under `?falls=v1`, at least 4 x 150 s, both pairings.
  Log landed strikes, stamina right after each hit, knockdowns per fall and pick reason, throws per tier, and the time from landing to
  the earliest legal pin per fall. For the suplex, check both men clean up when interrupted. **Don't retune** stamina recovery or
  the 35 threshold to force knockdowns. If strike knockdowns almost never happen because stamina recovers in seconds, report the
  numbers; that's Derek's call.
- **T3.11** Snapmare preview: commit Codex's harness fix in `tools/debug/falls_probe.mjs` (rear atomic-drop reversal through
  `Arena._beginSnapmare`; reviewed by Opus, harness only) as its own commit. Re-film the snapmare landing with it. The old G2
  snapmare clips were face-to-face and are invalid.
- **T3.12** G3 r2 page `research/animation/falls-2026-11/g3/r2.html`: T3.5 from-behind and threshold cases from real strikes, tired
  vs fresh slam, the T3.7 strip before/after, the T3.8 phase labels, the T3.9 boundary cases, the T3.10 numbers table, and the
  re-filmed snapmare. Misses first. Full suite, build, coverage, flag-off. Commit locally, **STOP at G3 r2**.

### Stage 3 r3: wear, so worn-down men go down (Opus 2026-11-06), stop at G3 r3

G3 r2's uncapped soak: 35 landed strikes, 1 knockdown in 4 x 150 s. Stamina recovers 6/s standing (`STAMINA_RECOVER`), so nobody stays
under 35. Derek 2026-11-06 picked a separate **wear** meter over slowing stamina: stamina stays the moment-to-moment meter, wear is
how beaten-up he is over the match. Later it can gate big moves to late in the match (the escalation vision, MOVE_CATALOG 2b); not
in this stage.

- **T3.13** `wear` on each `Wrestler`, 0-100, under `?falls=v1` only (flag-off has no wear and stays as it is today). It goes up with
  the damage he takes (`wear += damage x WEAR_PER_DAMAGE`) and drops slowly (`WEAR_RECOVER` per second, a fraction of stamina's).
  It resets at match start only (not on a get-up). Pure helpers and constants in `src/animation/falls.js`, unit tests.
- **T3.14** Swap the checks: a strike knocks down when wear >= `KNOCKDOWN_WEAR` (replaces `KNOCKDOWN_STAMINA` 35); exceptional when
  wear >= `EXCEPTIONAL_WEAR` (replaces stamina < 25); `chooseFall`'s tired/fresh weighting reads wear too. Read at the hit, as
  T3.5/T3.6 do. Stamina rules for pins, kickouts and begging off **don't change**. Executor tests at each threshold.
- **T3.15** Tune with the soak (`falls_g3_soak.mjs`, 4 x 150 s, both pairings, nothing capped). Tune only `WEAR_PER_DAMAGE`,
  `WEAR_RECOVER` and the two thresholds; never damage, stamina or its recovery. Targets:
  - no strike knockdowns in the first 45 s;
  - strike knockdowns from about the midpoint on, a few per match by 150 s (not every strike);
  - exceptional landings late and rare (0-2 per match).
  Report knockdowns, exceptional throws and mean wear per 30 s bucket, per run.
- **T3.16** A debug readout: `?wear=show` draws a thin wear bar under each stamina bar (off by default). G3 r3 page
  `research/animation/falls-2026-11/g3/r3.html`: the soak table, the constants chosen, and one normal-speed uncapped AI-vs-AI clip with
  the wear bars on and every knockdown/exceptional marked with its reason. Misses first. Full suite, build, coverage, flag-off.
  Commit locally, **STOP at G3 r3**.

Polish list (not now): the sell pushes limbs 13-18 px past the rope in 2 edge cases; George's snapmare-sell far elbow.

## Stage 4: down-hit reaction, soak, promotion (Opus 2026-11-06), stop at G4a, then G4

Derek 2026-11-06: G3 r3 is passable, moves are passable, **promote falls**. Plus one gap he saw: when an elbow lands on a man on the mat,
the man on the mat doesn't react. Measured: `_doElbowDrop`, `_doKneeDrop` and `_doTopDive`'s down branch call only `_hurt` and set
`stateTimer`, with no pose. `_doDive` (diving elbow) on a downed man plays the standing `sellChest` and then `startClotheslineFall`.

- **T4.1** `Wrestler._downHitReact(attacker, move, intensity)`, under `?falls=v1` only, pure keys/timing in `src/animation/falls.js`.
  Supine (`this.lying === 'supine'`): he **jolts up at the waist**. Shoulders and head come off the mat (torso about 20-35 degrees,
  scaled by intensity), knees come up a little through `lShin`/hips (never positive `lKnee`, see the knee rule), and both **arms flail**
  out and up, with each arm offset in phase and amplitude so they don't mirror. Then he drops back flat. Peak about 120 ms after the
  impact, total 450-600 ms. Prone: head and heels lift, the back arches, arms flail at the sides, the same timing. Damage, `stateTimer`,
  pins and get-ups don't change. A pin or a get-up that starts mid-jolt cancels it cleanly back to the lying pose (no pop). Tests:
  the jolt peaks and returns to the exact lying pose; the cancel path; flag-off is byte-identical.
- **T4.2** Call it at the impact of every move that hits a downed man: elbowDrop (0.7), kneeDrop (0.8), divingElbow on a downed man
  (0.9, replaces the standing sell + clothesline fall in that branch only), and topDive's down branch (0.9). The attacker side doesn't
  change.
- **T4.2b** Derek 2026-11-06: after the elbow drop **the attacker teleports up**. Measured: `elbowDropClip` ends lying (tilt 1.5,
  lift -95), and `_doElbowDrop`'s land callback then poses `elbowLand` (a standing crouch, 80 ms) and `idle`, with no get-up. Fix it
  under `?falls=v1`: at the impact, `this._layDown(ELBOW_DOWN_SEC, lying)` (lying = whichever of supine/prone matches the clip's last
  frame; show the check), so `_groundHandoff` eases him from the clip into the grounded pose and the authored get-up stands him up.
  Tune `ELBOW_DOWN_SEC` (start 0.8 s) so he is down long enough to read but not long enough to be pinned easily. Flag-off doesn't
  change. Then check every other move that leaves the attacker on the mat. Dropkick and piledriver already use `_layOnBack` and
  are fine. The diving elbow (`_doDive`), top dive (`_doTopDive`) and the Thesz press whiff set `state = 'down'` by hand with no
  `_groundHandoff`: measure each one's first-frame step and switch it to `_layDown` if it pops. The knee drop lands on a knee and
  stands in 220 ms (`kneeDropLand` -> idle). Report that rise next to the step limit and leave it alone unless it breaks the limit.
  Include each of these attacker landings in the G4a strips. Tests: the attacker is `down` after the impact, gets up through the get-up
  library (not `idle`), and the first-frame step at the handoff is within the step limit.
- G4a page `research/animation/falls-2026-11/g4a/`: one normal-speed loop strip per move, both facings, Procreate Lou and
  `george-roster-v1` receiving, supine and prone. Misses first (step limit, outline overlap, rope and mat clipping). Focused tests, then
  commit locally and **STOP at G4a** for Derek's glance.

### G4a r2: ground-attack contact (Opus 2026-11-06), stop at the stills, then at G4a r2

Derek at G4a: underwhelmed, the ground attacks phase through the opponent. Codex
[review](AI_HANDOFF_ENTRIES/2026-11-06-codex-ground-attack-contact.md), confirmed by Opus: `_doElbowDrop` flies to `other.x` at the
attacker's own depth, and `_layDown` drops him into a generic prone pose on that spot. The two torsos lie through each other
(`g4a/film/frames/elbowDrop-supine-george-right/s0051.jpg`). No code aims the elbow at the chest or keeps the bodies apart, and G4a
never measured overlap between the two bodies. The jolt and the handoff stay; the contact is what's missing.

- **T4.5** A body-overlap measure first: the two wrestlers' painted silhouettes (torso + head + limbs) from the render, overlap px per
  frame, split into the striking limb on the target (allowed) and everything else (a miss). Run it on G4a's frames to get the
  before numbers.
- **T4.6** Elbow drop, three **stills only**: **approach / contact / roll-off**. Procreate Lou and `george-roster-v1` each as
  attacker, both facings, receiver supine and prone.
  - Contact: the striking elbow on a torso contact point taken from the receiver's drawn pose and rig geometry (supine/prone and facing
    change it), not his root. The attacker's body lies beside the receiver, slightly nearer the camera (a depth offset, checked against
    ring room). Only the striking forearm overlaps the target.
  - Per-part layering for the contact window only: the striking forearm over the target, far limbs behind as the pose needs. A fixed
    order with an explicit release. No whole-body depth swaps, fades or distortion to hide an overlap.
  - Roll-off: he rolls or plants a hand **away** from the receiver, and the get-up starts from there.
  - Existing parts only. If a bent elbow or shoulder angle can't be made, list the narrow art request for Codex. Normal joint limits
    and the knee rule apply.
  - Stills page with silhouettes and a contact close-up, overlap numbers per still. Commit locally, **STOP at the stills** for Derek.
- **T4.7** After Derek approves the stills: animate between them. The flight aims at the contact point. The elbow's downward travel
  stops at contact (brief compression, the receiver's jolt around the hit, attacker recoil). Damage, sound and shake land once, on the
  actual contact frame. The handoff to the ground must not pull him back through the receiver. Then apply the same approach to the knee
  drop, diving elbow and top dive, each with its own contact point (not one shared offset). G4a r2 page: loop strips as G4a, overlap
  numbers before and after. Focused tests, flag-off pass. Commit locally, **STOP at G4a r2**.
- **T4.7 additions** (Codex's [stills review](AI_HANDOFF_ENTRIES/2026-11-06-codex-ground-contact-stills-review.md), confirmed by
  Opus):
  - **Side: far** (Derek 2026-11-06 at the stills): the attacker lands on the far side of the receiver.
  - **Derek at the stills:** "needs to be dialed in, limbs still don't look good, might look better in action." So **T4.7a** first:
    the elbow drop only, animated in the runtime between the three stills (far side), with a quick dial-in of what Opus saw in the
    stills:
    - contact: the striking forearm visibly on the chest, not hidden behind the receiver. Lou's body angled away from George's so the
      two don't lie stacked parallel with their heads together.
    - roll-off: the near hand planted on the mat beside the receiver (not on his head or back). Hips and legs on the mat under him,
      not trailing in the air.
    Normal-speed loop strips, both facings, Lou on George and George on Lou, supine and prone, with the three overlap numbers on each.
    Focused tests. Commit locally, **STOP at G4a r2a** for Derek to judge in motion. The rest of T4.7 (full validation, knee drop,
    dives) waits for that.
  - **The measure, tightened:** each move declares its striking side and part (elbow drop: the near-camera forearm + hand only, not
    the upper arm) and its target region on the receiver. The allowed limb is fixed for the whole move, not re-picked per frame.
    Report raw overlap, overlap outside the allowed part, and the depth-order conflict as three separate numbers. "Front conflict 0"
    with all parts behind is not "no phasing". Before/after is a matched window (same move, same frames), not a pose against 2.6 s.
  - **Roll-off support:** anchor a planted hand to a mat point beside the receiver, not to an offset from his chest. Show the point,
    its gap to the mat and to the receiver, and start the get-up from it. Existing parts first.
  - **Production ownership:** the stills tool's `updateGrounded`/`setDepth` overrides become runtime code with one owner. Part depths
    are restored on the end of contact, on a cancel, a pin or a match end (tests for each). The target point follows the receiver
    through his jolt. Ring room and mat support are checked at the real positions along the whole route.
  - **Order:** the elbow drop alone first (both rigs, facings, supine and prone). Validate elbow gap, the three overlap numbers, hand
    support, signed joints, seams, damage/foley firing once, and the cancel path. Then knee drop and dives, each with its own striking
    part.
- **T4.3** Soak: `grapples_soak.mjs` with `falls=v1`, 4 x 150 s, both pairings. Count falls per variant and pick reason, down-hit
  reactions, page errors, stuck `down` states and get-up pops. A stuck state or a page error blocks T4.4. Fix it or report it.
- **T4.4** Promote: `fallsCandidate` becomes `defaultOnFlag('falls', 'v1')` like the other promoted flags, so `?falls=off` is the old
  path. `?wear=show` stays opt-in. Update tests that assumed falls off by default, the flag list in AI_HANDOFF Status and the Progress
  line. Full suite, build, coverage and a `?falls=off` pass. Commit locally, **STOP at G4**: Derek plays a match with no flag.

## Open for Derek

- Trained bumps (D3) or rougher, more civilian falls for this era?
- A wince **face** (eyes shut, teeth) needs head art: ask Codex for a pain-head variant per rig now, or body-only first?
- The move -> fall mapping (Stage 3) at G2.

## Progress

(sha, result, misses; ≤ 3 lines each)
- T0.1: 5a990c8 `falls_probe` + [before page](research/animation/falls-2026-11/before/index.html). Gravity fails on all 5 falls from standing (fall/free-fall 1.05-2.45), missile arms in 40/40, no bounce on any fall.
  Misses: no painted-hand contact line (no hand art); throw runs are not deterministic after the impact (sell noise, up to 106 px).
- T1.1-T1.4: b93a3ec, a43dca8, ff8d4a3 (coverage), T1.4 commit: `REST_POSES`, `lyingBase`, `?falls=v1`; [G1 page](research/animation/falls-2026-11/g1/index.html). Suite 1185/1185. **STOP at G1.**
  Misses: arms 15-27 deg off the torso (not 40-60: foreshortened), no prone head turn, prone clutch wrist steps 9-14 px/frame, rolls off under the flag, Lou backward get-up first-frame step 13.5 px.
- G1: Derek 2026-11-05 "starting to look good", go to Stage 2 (poses not final; G1 misses carried). Stage 2 rewritten for the rebound.
- T2.0-T2.4: dcc4454 (T2.0 8486567, T2.1 ba9cab5, T2.2/3 4304a9c) [G2a page](research/animation/falls-2026-11/g2a/index.html). T2.0 signed elbow test found two backward folds (supine far -0.40, prone far -2.09 rad; -3.0 limit passes them), poses retuned. Landing: backward fall + body slam; focused tests pass. **STOP at G2a.**
  Misses: backward hop 3.1-4.0 px (target 6-10; fall not gravity-timed until T2.6); slam impact event fires with the pelvis 37 px up, so contact is a new `contact` clip event at 1.367 s; George's sell elbow -1.9/-0.42 (sell, not landing); no head/wrist channel, no painted-hand line; wince hand-to-sell.part not built.
- G2a: Derek 2026-11-05 "looking good"; backward falls OK, slams off (hits, then a pause before he reacts). T2.4a-d added, slam only (one impact moment, additive landing, full audit); then T2.5.
- T2.4a-d: e36116c slam lands 1 frame after the hit (tickDown after the impact event; blend from the final drawn pose), landing additive over the blend, audit to the T2.3 contract, [G2a r2](research/animation/falls-2026-11/g2a/r2.html). **STOP at G2a r2.**
  Misses: T2.4a's premise (pelvis 37 px up at impact) did not reproduce: it is at the mat (12.8/14.0 px, rest 7.9/10.1) at 1.083 s, the landing started 0.30 s late, so no descent retime; George's back-sell knee 3.73 rad (cap 2.55) and elbows -0.42/-1.9 sit under the sell; seam step into the landing 17/24 px.
- G2a r2: Derek 2026-11-05 "looks great and elevates the action"; wants more fall types and bigger impacts. T2.5a-g added (debts, forward/knees/seated, slam tiers, spill concept), STOP at G2b.
- T2.5a-f: (sha below) debts: the slam's 17/24 px first-frame step is impact velocity (flag-off clip's own ankle steps 29.6 at that frame), nothing changed; George's "3.73" knee was an audit wrap error, the real fault a knee pinned at the 2.55 cap 11 frames (sell bend over the drawn-up rest knee), fixed with `applyOffsetsSoft`. New landing shapes `catch`/`knees`/`seat`/`spill`, `?slamTier=heavy|exceptional`, [G2b](research/animation/falls-2026-11/g2b/index.html); STOP at G2b.
  Misses: George's drawn tier hops 14.9 / 18.8 px are over the 11-12 / 14-16 range (Lou 11.5 / 14.4 in range); George's sell elbows (far to -0.45) are the sell's own, flag-independent, on the polish list; spill is keys only, no gravity timing (T2.6).
- G2b: Derek 2026-11-05 "looking great"; wants falls everywhere they fit, picked by situation, eventually standard. T2.5g-h (throws, tiers) and Stage 3 (chooseFall, strike knockdowns, spill) written.
- T2.5g-T2.7: (sha below) landings on suplex (both men), hip toss, snapmare (seated), piledriver (limp, exceptional, at the pelvis's contact 1.80 s), the flips (all through startClotheslineFall, back body drop heavy); tiers per move + George hop x0.775 (`falls.hopScale`); falls from standing gravity-timed (`FALL_BALLISTIC`, 0.40 s, no first-frame pop under the flag), D4 passes on both rigs; [G2](research/animation/falls-2026-11/g2/index.html). Suite 1208/1208, build, coverage (26 baselined) and flag-off pass. STOP at G2.
  Misses: backward-fall hop 5.6-5.8 px (target 6-10); last-frame arm step 84 px (backward Lou) at contact; fall start step 33 px (was 112); George's sell elbows still outside the limit on some runs (sell's own); piledriver George 16.3 px over the 14-16 range.
- Derek 2026-11-05: slam and big impact moves heavy (painful), exceptional may repeat, knockdown under 35 OK.
- T3.1-T3.4: dfea763 `chooseFall` + `MOVE_FALLS` (falls.js, 7 new tests), strikes knock down under 35 stamina after the hit (jab, front kick, shove, double axe handle, knee lift; headbutt and corner charge always fall) through `_pickFall` under `?falls=v1`, spill unflagged (shove calls it); [G3](research/animation/falls-2026-11/g3/index.html). Suite 1216/1216, build, coverage (26 baselined), flag-off table (strikes stagger, headbutt falls) pass. **STOP at G3.**
  Misses: stamina recovers in seconds, so two 150 s AI runs at full stamina logged no strike fall (the match clip holds stamina at 36); "from behind" only runs with the facing held (strikes turn the receiver); a rope under 70 px behind him is "cramped" (least overshoot), the shove spills toward a rope 85 px behind.
- G3: dfea763 done; Codex G2/G3 reviews: hit-time context, tired-throw tier not wired, contact arm step, ring fallback, uncapped match evidence. T3.5-T3.12 added, STOP at G3 r2.
- T3.5-T3.12: 1ad916f strikes read at the hit (`_hitAt`/`_strikeReact`: side, stamina after damage, facing held through the sell; real jab from behind, no lock, falls forward; 35 stays, 34.9 falls), tired throws (`tierFor`, slam/suplex/back body drop, receiver stamina before damage; 24 exceptional, 26 heavy), ring-edge slide (`chooseFall` `slide`; inside the ropes at contact and landing, 8/8), suplex interruption tests, harness commit fd194fe; [G3 r2](research/animation/falls-2026-11/g3/r2.html). Suite 1227/1227, build, coverage (26 baselined), flag-off pass. **STOP at G3 r2.**
  Misses: 4 x 150 s uncapped AI runs: 35 landed strikes, 1 under 35, 1 strike knockdown (stamina recovery, not retuned, Derek's call); back-fall arm step 52 / 84 px on the last frame is the keyed arm swing (not a seam, left); supported falls have no dead beat (kneesForward one stop-start); sell pushes limbs 13-18 px past the rope in 2 edge cases; George's snapmare far elbow outside the limit (sell's own).
- G3 r2: Derek 2026-11-06 chose a wear meter for knockdowns/exceptional (not slower stamina). T3.13-T3.16 added, STOP at G3 r3; then Stage 4.
- T3.13-T3.14: a0f98b5 `wear` (0-100) on each Wrestler under `?falls=v1`: rises with damage taken (`_damage`: hits, throws, hold drains; not the attacker's own cost), recovers slowly, resets at match start only; strikes knock down at `KNOCKDOWN_WEAR`, big throws land exceptional at `EXCEPTIONAL_WEAR`, `chooseFall` weights by wear. Tests at each threshold, suite 1228/1228.
  Misses: the AI never threw a suplex, body slam or back body drop in the first soak, so the exceptional line is proven by unit tests and few real landings.
- T3.15: c53ea13 tuned with the soak over 3 passes of 4 x 150 s: 0.8 wear per damage, 0.4/s recovery, knockdown 60, exceptional 92. Chosen: first strike knockdown 110 s / none / 84 s / 149 s, none under 45 s; wear-driven exceptional 0, 0, 0, 2.
  Misses: only 0-4 knockdowns per run (AI lands 7-9 strikes a run); the 2 exceptional landings came at 42 s and 52 s at wear 100; run-to-run spread is wide; knockdown line 55 gave 3 per run on average but one first knockdown at 36 s.
- T3.16: c53ea13 `?wear=show` bar, soak wear table tool, uncapped clip tool, [G3 r3](research/animation/falls-2026-11/g3/r3.html); suite, build, coverage (26 baselined), flag-off pass. **STOP at G3 r3.**
  Misses: the clip (LG, seed 1) has 2 jab knockdowns at wear 100, no exceptional landing; windows around marks only, not 150 s continuous; extra seeds were too slow to film in parallel.
- T4.1-T4.2b: 379255b `joltResponse` + `_downHitReact` (flag-gated; elbow 0.7, knee 0.8, dives 0.9 on a downed man); elbow-drop attacker lies prone 0.8 s then the get-up; diving elbow, top dive, press whiff via `_layDown` (seam 51-54 -> 3.1-5.5 px). [G4a](research/animation/falls-2026-11/g4a/index.html); falls tests 56 and full suite 1241 pass. **STOP at G4a.**
  Misses: every attacker seam still over 2.5 px/frame (elbow 6.5/9.3, dives 3.1-5.5, press 4.5-6.5; flight before it is 13-34); knee drop attacker stands in 23 frames at 45 px/frame max, left alone; jolt joint step 15-37 px/frame (velocity, rest delta 0); outline overlap and rope/mat clipping not measured; press whiff has no before number.
- T4.5-T4.6: (sha below) overlap measure (`falls_contact.mjs`, silhouettes from the render, depth order reported) and the elbow drop's three stills on both rigs ([stills page](research/animation/falls-2026-11/g4a-r2/index.html)). Before (G4a code): peak miss 3,171-4,940 px over 150-265 frames. Stills: contact miss 316-927 px raw, front conflict 0. **STOP at the stills.**
  Misses: not zero; the attacker lies on the FAR side (search: 285-480 px vs 1,000+ near side), a deviation from "nearer the camera"; striking-arm layering exists only in the stills tool; roll-off hand still touches him (28-246 px); before/after not like-for-like (window vs pose).
