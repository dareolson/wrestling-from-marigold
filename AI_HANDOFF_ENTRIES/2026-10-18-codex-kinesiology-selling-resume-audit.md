# Resume move refinement: mechanics, pain, and recovery

2026-10-18 · Codex · requested by Derek. Documentation audit; no animation,
art, damage, or timing changed in this pass.

## Direction for the next session

Derek wants continued refinement of the kinesiology of the existing moves,
with convincing consequences: staggering, looking out of it, rolling around
in pain for a while, and eventually replacement heads with pained expressions.
Identify replacement limbs and torsos where the present flat pieces cannot
express the required anatomy. This is the active move-refinement direction
after the current roster work. Preserve the considerable work already done.

Start with **one complete impact-to-recovery example**, alongside the existing
figure-four entanglement assignment. A move is not finished at its last key:
watch contact → recoil → mat reaction → attempted recovery → standing again.

## What has been accomplished

Source checked: the live clip registration list, move registry, sells planner,
Wrestler hit/down/stagger/draw paths, Skeleton bend and replacement paths,
variant validator, current refinement method, and October 15–18 handoffs.
This is a current-source and recorded-evidence audit, not a new full-speed
visual approval. Existing screenshots/proofs and approval reports retain their
original dates and scope; tests below establish only their stated contracts.

- **15 live registered clips** in `src/animation/clips/index.js`: jab,
  Derek's hammerlock WIP, body slam, piledriver, suplex, hip toss, dropkick,
  elbow/knee drops, diving elbow, top dive, Thesz press, figure-four, arm bar,
  ankle lock. The generated hammerlock fixture is not Derek's live move.
- **Repeatable authoring workflow:** sparse authored beats, staging/plant/hand
  constraints, sampled critic traces, pose sheets, runtime match captures.
  Torso `bend`, support-foot work, purposeful easing, compression and delayed
  settling now have a documented method and worked examples.
- **Impact/refinement progress:** suplex v3 and jab v2; refined body slam,
  piledriver and hip toss; dropkick v2 visually approved according to the
  current method, still a flagged comparison pending promotion. Preserve the
  accepted overhead/powerbomb-like body-slam interpretation.
- **Cast-aware contact machinery:** runtime grip IK, authored crown/floor
  contact windows, and shared staging-origin fitting now exist. Older reports
  of missing machinery must not become instructions to rebuild it.
- **Selling is implemented:** `src/animation/sells.js` supplies supine writhing,
  kicking, rolling and targeted clutches; prone rolling, clutches and failed
  push-up/stirring. Grounded reach IK puts hands on the hurt area. Confirmed-hit
  `_hurt` tags feed down-state playback. Rolls change lying/facing together.
- **Character distinction exists:** George theatrical, others economical;
  damage-scaled stagger sequences, slower injured movement and damage-scaled
  get-up duration also exist. These are foundations to refine.
- **Replacement infrastructure exists:** semantic clip part requests,
  calibrated variant inheritance, and cleanup. Original George has a wired
  hurt head; Procreate Lou has forearm donors. Availability is per rig:
  neither fact proves the new roster rigs have corresponding variants.
- **Four opt-in roster rigs are built.** The October 18 roster report records
  703 passing tests, clean sampled limb joins and live AI runs. They remain
  candidates with manual landmarks, incomplete art details and UNVERIFIED
  certification. Local arm/leg stacking flags are not cross-actor entanglement.

## Where the current selling falls short of the requested direction

These are source findings or review targets, not newly observed film defects.

1. **Standing torso acting still uses inert `lean`.** `startStagger()` has four
   stamina tiers (0.85/1.35/1.9/2.6 seconds), but stagger poses encode their
   torso pitch in `lean`. The low-stamina `wooze` in `draw()` also feeds lean;
   Skeleton documents that lean no longer moves the body. Limb/crouch motion
   remains, but the intended torso sway is missing. Repair a selected stagger
   using `bend` with planted support and an actual corrective step; do not
   blanket-convert every legacy pose or add bend to all states.
2. **Mat pain is optional and brief for most of the cast.** Economical style
   has 30% `none`, otherwise one clutch, no chain. Its nominal clutch is
   0.96 seconds; a plan must fit after a 0.35-second lead and 0.3-second tail.
   Short down windows can therefore contain no library sell at all. Intensity
   scales amplitude, not duration or choice. This explains why a built library
   need not produce the sustained rolling/pain Derek wants.
3. **Reactions return to neutral.** Sells return to the flat lying pose, and
   stagger expiry returns to standing/idle. There is no complete authored
   progression carrying the hurt body part and a dazed expression through
   recovery. Inspect the idle tails inside stagger windows as well as expiry.
4. **The sell sampler carries body offsets and hand reaches, not expression
   phases.** Existing clip head swaps do not automatically supply faces during
   down/get-up/standing. Add explicit presentation ownership and reset rules
   before hooking hurt/dazed heads to these paths.
5. **The tag is move/part based, not a durable injury model.** Avoid calling
   this persistent localized damage. Audit submission pressure/release paths
   separately: registry metadata alone does not prove a post-release sell runs.

## Strategy: make force and consequences legible

For every move, identify the supporting foot/hand, the connection transferring
force, the pivot, and the release. Block pelvis and torso before reaching with
hands. A throw needs a loaded base and a receiver whose shoulder/hips/legs
follow in sequence; a strike needs a readable collision and directional recoil;
a hold needs purchase, brace, pressure, resistance and relief. Check planted
soles and painted contact surfaces between keys, not only joint proximity.

Direct the receiver through distinct beats: initial shock, protective reaction,
a quieter hurt pause, an effort to recover, then residual unsteadiness. A head
hit can have a delayed head catch-up, loose guard and corrective step; a back
landing can arch, roll to the side and clutch; a knee hold can produce a leg
clutch and cautious loading of that leg. Do not give every hit the same flail.
Stillness and shallow breathing between painful actions make the actions read.

Keep Lou restrained but unmistakably hurt; economical must not mean unaffected.
George can chain a roll and clutch or kick with a quieter beat between them.
Give Guido and Kowalski deliberate styles after their character direction is
settled; their borrowed presets do not establish final personalities.

First fit stronger acting inside existing down/recovery windows. If that cannot
show pain for long enough, prepare a separate comparison with longer aftermath
and report the effect on vulnerability, AI opportunities and match pace for
Derek's review. His desired sustained selling is clear; exact timing values
remain to be established. Avoid silently extending stun or disabling control.
A residual visual hurt layer during ordinary play can continue the story without
adding a new stun, but must yield to attacks, guards and paired choreography.

## Concrete selling solutions to pilot (Derek / Codex follow-up)

- Re-author one stagger with working `bend`: chest reels, head catches up late,
  knees soften, then a corrective step catches the weight. Keep the support
  foot planted until that step; do not mechanically replace every `lean` value.
- Substantial confirmed hits should always have a readable response. Let style
  select the acting, rather than allowing a substantial hit to select `none`.
  Lou: arch, pause, protective clutch, difficult rise. George: roll/clutch or
  kick, quiet pause, another effort. Preserve character contrast.
- Give short down windows a compact recoil/clutch fallback instead of dropping
  all selling when a full sequence does not fit. Reserve handoff time explicitly.
- Carry the reaction through get-up and initial upright movement: guarded ribs,
  cautious knee loading, or slow head lift and loose guard after a head shot.
  A visual hurt layer must yield to player actions and paired choreography;
  extending visible hurt does not require extending loss of control.
- First comparisons: jab → stagger → recovery, and suplex → mat pain → get-up.
  Use current art first; add hurt/dazed heads and compressed/side-lying torso
  donors when the comparison shows their benefit. Longer down/stun timing is
  a separate measured comparison, not a hidden consequence of visual polish.

## Replacement-art opportunities, in priority order

| Art family | Exact useful beats | What the replacement must accomplish |
| --- | --- | --- |
| Hurt/strain and dazed heads | Strike recoil, submission squeeze, mat clutch, get-up and first upright beat | Distinguish sharp pain from being out of it; preserve neck registration, skull size, likeness and view. Add attacker effort later. Relax expressions between peaks. |
| Grip, fist, open/bracing forearms | Jab; throw/hold purchase; release; hand on mat during get-up | Replace the whole calibrated forearm where hands are baked in. Use the actual working near/far side. Guido's missing untaped counterpart remains an immediate roster need. |
| Arched and folded/turned torso | Suplex bridge/turnover; body-slam load/follow-through; hip-toss pivot; back-body-drop fold | Supply spinal curvature, shoulder turn and abdominal compression that hip rotation cannot draw. Prove one donor at its failing beat before commissioning more. |
| Side-lying/compressed torso | Back landing, roll midpoint, protective clutch and failed rise | Make rolling look like volume turning and ribs compressing, rather than a flat trunk rotating. Inspect shoulder/hip socket continuity through turnover. |
| Crossing/foreshortened thigh, calf and boot | Figure-four trap, threading and release; later toe-hold foot grip | Clarify actual over/under relationships and knee direction. Art alone cannot fix cross-actor layering. Combined shin/boot may need a calibrated split where independent foot rotation is required. |
| Turned shoulder/upper arm and foreshortened forearm | Hip toss/arm drag, enclosing headlock/sleeper, hammerlock resistance | Express depth, elbow direction and enclosure without stretching segments. Preserve Derek's hammerlock; any acting change is a separate candidate only if requested. |
| Seated/cover torso and bracing limbs | Piledriver sit-out/release, pin and Thesz-press landing | Show a supported pelvis and weight on the opponent, with clean release into the next posture. |

Use the current approved/candidate character art as the source reference for
that rig. Do not transplant old expression pixels onto a new head without
registration and visual review. Preserve Derek's silhouette and paint; no new
full-sheet generation campaign is needed. Each request should name the rig,
move, actor role, timestamp, present image, target silhouette and anchor overlay.

**Geometry gate:** `validateCharacterArt` currently requires variant boxes,
display scale and explicit binding anchors to match base geometry. A torso
texture swap does not establish new shoulder/hip sockets. Start with variants
preserving these contracts. If anatomy requires moved sockets, explicitly extend
and test geometry resolution across upright, grounded, IK, reporting and reset
paths; do not bypass validation or pretend a different cut is a safe texture swap.

## Resume checklist and reviewable deliverables

1. Finish/reconcile the opt-in roster review first. Select an explicit art
   benchmark; Procreate Lou is the prior move benchmark, while roster Lou is
   now a candidate. Keep defaults until approved. Preserve unrelated dirty work.
2. Capture a small baseline reel: jab → stagger, suplex or body slam → mat
   pain → get-up, figure-four → release. Normal speed and slow motion, gameplay
   scale, muted first. Include the entire aftermath until control resumes and
   two further seconds of ordinary movement. Record rig IDs, clip IDs, query
   flags and source revision/working-tree state.
3. Recheck older defects against current source. Crown contacts, runtime grips
   and shared ring staging have later implementations; measure their results
   before declaring the October 15 findings open or closed. Grounded socket
   handoff and get-up-to-standing continuity remain explicit checks. Full joint
   coverage and a logged move event do not certify those transitions.
4. Pilot the standing sell: one planted stagger with visible torso/head lag,
   a corrective step and a controlled recovery. Then pilot a substantial mat
   reaction with pauses and an attempted rise. Compare economical/theatrical
   styles and show whether existing timers provide enough room.
5. Continue the assigned figure-four proof: locked tableau, declared trapped
   contacts, cross-actor part order, threading, pressure and release. Current
   per-rig layering flags do not solve this. See the October 15 entanglement
   brief; prove this before extending to toe holds.
6. Add registered hurt/dazed heads and one demonstrated torso/limb donor family.
   For expression ownership: active clip takes priority; recovery/sell owns its
   phases afterward; ordinary state resumes its expression when finished.
   Clear overrides on interruption, pin/pickup, replacement and scene shutdown.
7. Deliver before/after films, annotated contact/support stills, a donor list
   ranked by demonstrated benefit, remaining limits and an updated handoff.

Acceptance: contact, damage and reaction align once; missed/cancelled attacks
produce no false sell; feet/support and hold contacts persist across sampled
frames; no floor, joint, layer or head-swap pops. Check both facings and role
orders, the selected new rigs, center and ropes, and cancellation during each
phase. Include pin/pickup interruption, supine/prone rolls, short down budgets,
large frame steps and recovery into a new action. Character personality should
remain visible while every substantial hit has a readable consequence.

Use the existing Node 22 test/build/rig and participation tooling from
`MOVE_REFINEMENT_METHOD.md`. Add focused behavior checks only when implementing
changes; pair numeric evidence with real match film. A scenario reporting a move
event is not a visual acceptance test. Certification remains UNVERIFIED until
its actual requirements are met; do not widen budgets to obtain a green badge.

## Verification for this audit

Documentation only. Reviewed source and existing evidence reports; no fresh
browser captures or animation sign-off claimed. Focused existing selling,
variant, throw and registry test results are recorded in the accompanying
handoff log entry. Older audits remain historical; this entry reconciles their
recommendations with current source rather than silently rewriting them.
