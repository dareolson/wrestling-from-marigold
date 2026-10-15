# Existing move refinement audit and action plan

2026-10-15 · Codex · Proposal, not an implementation change

## Opinion

The moves have recognizable silhouettes now. The next leap is to make the
viewer believe one wrestler is actually moving the other wrestler's weight.
That comes from visible support, tension, release, and consequences. Extra
frames and expressions help when they explain those things.

My priority order: contact and support → timing → defender reactions →
specialized art → sound and restrained camera response. Keep the existing
roster and move IDs. No new moves are proposed here.

Follow-up priority, 2026-10-15: repair elbow/knee attachment before the art
expansion or feel pass. See [JOINT_ATTACHMENT_REPAIR_PLAN.md](JOINT_ATTACHMENT_REPAIR_PLAN.md)
for the measured baseline, structural binding migration and acceptance gates.

## Evidence and limits

Reviewed the built section of MOVE_CATALOG.md, all 15 registered clips,
AnimationClip/MoveRuntime, the relevant Wrestler executors, Skeleton part
replacement, character variant definitions, and the editor contact contract.
Visually inspected editor samples of Derek's hammerlock, suplex, hip toss,
piledriver, body slam, figure-four, and dropkick. Captures are under
`/tmp/move-feel-audit/` (temporary local evidence).

This is a source and sampled-pose audit, not a full-speed gameplay sign-off.
Editor separation, floor placement, and scale do not by themselves prove the
same result in the ring. Recommendations for the other existing moves below
are choreography proposals based on their implementation, not claims of
observed visual defects.

Important current-state corrections:

- The live hammerlock is hammerlockWip.js, 2.4 seconds. hammerlock.js is the
  retired generated fixture. Its contact proof does not certify Derek's clip.
- George already has a wired hurt head; the Procreate Lou config has a grip
  forearm. The README statement that neither has production variants is stale.
- Onion skinning exists in the editor UI. It does not need to be built again.
- The 13 registered clips other than jab and hammerlock have no authored part
  changes. There is considerable room to use the replacement system already here.

## Findings that should drive the first pass

1. **Jab contact and damage are out of phase.** jab.js fires impact at .083s,
   the cocked pose; full extension is .150s. This deliberately preserves legacy
   timing, but the defender can react before the arm arrives. Pick the actual
   contact pose and align damage, reaction, and sound there. Either retime the
   forward stroke to the existing gameplay beat or explicitly review a later
   damage beat. Do not silently change balance under an art pass.
2. **The elbow drop drains stamina before its anticipation.** _doElbowDrop
   calls _drain immediately, then winds up and flies. _playFlight currently
   dispatches completion/cancellation callbacks, not an impact handler. Move
   the damage to validated landing contact, preserving exactly-once behavior.
   Knee drop already applies defender damage at landing; preserve that pattern
   (its immediate drain is an attacker commitment cost).
3. **Whole-body rotation cannot supply all the missing anatomy.** In the
   suplex turnover and hip-toss samples, both bodies read as relatively rigid
   articulated shapes. A curved trunk, shoulder rotation, delayed legs, and
   credible grip would explain the force much better.
4. **Some impact poses lack visible attacker effort.** At the body-slam impact
   sample the defender is flat while Lou is upright with both arms projected
   forward. A downward follow-through and bent supporting leg would connect
   his action to that landing. Preserve the catalog's accepted powerbomb-like
   interpretation; do not redesign it into another move.
5. **The dropkick has a good readable extension.** Preserve it. The larger
   opportunity is the defender and the attacker's recoil. Its clip is solo;
   the static editor defender is not evidence of a missing gameplay reaction:
   _doDropkick already triggers sellChest and a fall on a successful hit.
6. **The figure-four needs a clearer pressure story.** At the inspected squeeze
   pose, overlapping legs are hard to parse and the defender's raised arms are
   quite symmetrical. Clarify the trapped knee, crossed ankle, attacker's brace,
   and one deliberate reaching hand. Confirm the mechanics through the entire
   entry before polishing the grimace.

## Refinement by existing move

| Existing move(s) | Choreography refinement | Most useful art/tween |
|---|---|---|
| jab | Plant, small shoulder lead, quick extension, delayed head recoil, return to guard | Closed fist, brief impact face; tiny shoulder turn |
| headbutt, kneeLift | Distinct load and contact; keep the attacker braced while the victim folds around the struck area | Effort face, tucked chin, compressed abdomen |
| clothesline, doubleAxeHandle | Transfer running momentum into a visible chest/shoulder collision; let the receiver's hips lag the upper body | Chest-hit torso, open release hand, shoulder-led bump |
| hammerlock | Preserve Derek's entry; prove wrist contact through the turn and crank; receiver resists with the free arm and legs | Existing hurt face, grip, turned shoulder/back donor; restrained free-hand reach |
| sleeperHold, headlock | Show an enclosing arm and stable base; alternate a small attempt to straighten with renewed compression | Grip/palm, tense neck, compressed shoulder; effort and strain heads |
| bodySlam | Sell the load through the knees, then downward follow-through; defender compresses and settles after landing | Braced torso, release palm, supine compression pose |
| piledriver | Brief stabilized inverted hold, compact seated drop, convincing attacker seat landing and victim release | Inverted shoulder/neck transition, gripping arms, seated trunk; avoid depicting head penetration into the mat |
| suplex | Maintain the hook through lift; attacker initiates backward rotation, defender follows around the connection; both settle after landing | Arched attacker torso, folded/inverted defender torso, profile transition |
| hipToss, armDrag | Make the hip/arm the visible pivot; lead with the receiver's shoulder and let legs follow | Three-quarter shoulder turn, foreshortened forearm, asymmetric falling legs |
| backBodyDrop | Establish the planted lifting base; hips travel over it before legs complete the arc | Folded waist, inverted transition, back landing |
| figureFour | Readable step-through and crossing, brace before squeeze; asymmetric resistance on each pressure beat | Leg-over/under variants, strained head, reaching palm, half-raised trunk |
| armBar | Expose a readable controlled arm, attacker hip extension, receiver shoulder response | Grip, side-lying trunk, foreshortened controlled arm |
| ankleLock | Make hand-to-ankle purchase explicit; receiver twists through hip and reaches away | Ankle grip, turned pelvis/trunk, planted free palm |
| elbowDrop, kneeDrop | Separate takeoff, descent, compression, and recovery; show a short defender reaction on contact | Bent elbow/knee silhouette, impact face, compressed supine trunk |
| divingElbow, topDive | Preserve flight silhouette; sharpen launch/descent rhythm and distinguish successful contact from a miss | Airborne torso, contact/release hands, landing compression |
| theszPress | Chest-to-chest collision followed by shared descent; arrive in a supported cover without a pose pop | Forward-curved trunk, bracing palms, pin transition |
| irishWhip | Wrist tension, step and shoulder turn, then visible release before the runner accelerates | Grip→open hand, turned torso |
| pin | Chest weight across the opponent, clear bracing arm and leg control; small breathing/struggle | Cover torso, hooked-leg overlap, strained receiver head |
| taunt, turnbuckleTaunt | Settle the feet before gesturing; offset head, chest, and hand timing | Smug/effort head, open expressive hand; restrained breathing |

## Art and tween brief

Treat numeric in-betweens and painted replacement parts as separate tools.
Use the rig for travel and joint angles. Paint replacements when a rotating
flat part cannot express the anatomy or perspective. Do not generate every
in-between frame: that risks inconsistent proportions and visible flicker.

First production batch, limited to the pilot moves:

1. Lou effort and hurt/strain heads. Reuse George's existing approved expression
   donors after registration; wire only the ones those moves need. Align the
   neck, skull scale, hairline, and view. The head replacement path does not
   currently apply arbitrary per-variant geometry like the limb path does, so
   keep these expression canvases registered to the existing head.
2. Closed fist, gripping hand, and release palm for the actual near/far roles
   used in the pilots. On current rigs with baked-in hands, replace the calibrated
   forearm; do not assume separate hand assets work on every character.
3. Suplex torso donors: backward arch for the attacker and folded/turned
   shoulder for the defender. Start with one pair and the exact sample poses
   that fail. Maintain Lou's established tall, lanky silhouette.
4. One back-landing compression donor and one side-lying/half-raised donor,
   only after deciding how the grounded renderer will consume them.

Second batch, justified by failures in existing moves: palm-up/down forearms,
foreshortened upper arms, crossing thighs, bent boot/shin silhouettes, turned
pelvis, chest-hit torso, seated torso, and cover torso.

For every donor: provide the existing part and adjacent pieces as reference,
specify the named move/role/beat, preserve style and lighting, then have Derek
clean up and register it before deterministic cutting and binding. Preview in
the actual move at gameplay size. Three-quarter remains the primary view;
profile is a move transition source. This follows the existing art recovery
decision, not a new full-character generation campaign.

Use a brief anticipation expression, effort during load, pain at contact or
pressure, and recovery afterward. A head that remains in maximal pain for the
whole clip loses contrast. Give the free limbs purposeful resistance; avoid
continuous identical flailing. Lou can stay economical, George more theatrical.

## Architecture

Extend the existing pipeline incrementally:

`draft + contact windows → compiled clip → MoveRuntime → Wrestler → Skeleton`

**Drafts remain choreography authority.** Keep pose, transform, facing, parts,
and events in their current tracks. Extend the readiness sweep with painted
contact targets where needed, support-foot checks, floor/penetration checks,
and continuity checks at entry and exit. Inspect sampled spans, not just keys.
Use joint-relative/rig-scale tolerances; report actual gaps and locations.

**Contacts remain authoring data.** Use existing snap-and-bake first. Add dense
samples or an offline baking pass when a grip drifts. If this cannot maintain
contact through a turn across supported rigs, prototype a tightly scoped visual
constraint separately. Do not quietly introduce a persistent runtime solver or
make editor contacts determine hit eligibility.

**Torso variants need a geometry decision before shipping.** The current part
selection swaps torso images and part metadata, but torso sockets are captured
from the rig profile. A twisted donor with moved shoulders/hips therefore cannot
be treated as an ordinary texture swap. First try a donor that preserves those
sockets. If insufficient, add explicit variant socket overrides, resolved as a
complete per-sample geometry state and reset on replacement/cancel. Update
rendering, structural-anchor reporting, editor IK, and certification together.
Match pelvis overlays/underlays to the selected torso; test both facings.

**Grounded transitions need explicit support.** A tilted upright rig and the
grounded renderer are different paths. Preserve final joint/root continuity
when handing off to supine, prone, side-lying, seated, or a cover. Add only
postures required by existing moves. The editor README's grounded restrictions
need comparison against current code before selecting an implementation.

**Impact remains a gameplay event.** Executors validate the hit and apply damage
once. Add a small presentation response only after a confirmed contact: named
sound, receiver sell, optional camera response. Keep these effects out of seek
and editor scrubbing. A submission squeeze should primarily read through body
pressure and resistance; repeated camera shakes are currently configured and
are a candidate for reduction.

**Use a shared clock if adding impact pause.** Begin with authored compression
and settling; prototype a short local pause only if it improves the result.
Freezing only MoveRuntime while Phaser position tweens keep running would
separate bodies. Coordinate clip time, flight motion, sells, and cancellation
before adopting hitstop. Do not globally slow input or duplicate damage events.

**Keep one owner per channel.** Paired staging already owns root transforms.
Solo flights currently use executor tweens. Any migration to clip-authored
travel must remove the corresponding tween. Check cancellation stops residual
travel and clears faces, parts, tilt, lift, handles, and fixed-hold flags.

## Action plan and acceptance

1. **Capture baselines.** Record the live registered hammerlock, jab, suplex,
   and dropkick at full speed and quarter speed, both facings and role orders.
   Include successful hits, misses where applicable, interruption, and ropes.
   Record exact clip/draft names so fixture proofs cannot stand in for live art.
2. **Correct event alignment.** Fix jab contact timing and elbow-drop
   damage timing with explicit review of any gameplay timing change. Verify
   one damage application, no damage from seek or cancellation before contact,
   and correct behavior under a large frame step.
3. **Polish the four pilots.** Hammerlock proves grip and resistance; jab
   proves sharp contact; suplex proves weight and torso shape; dropkick proves
   flight, collision, and recoil. First re-pose using existing art. Add only
   the expression/hand/torso donors the comparison demonstrates are needed.
4. **Resolve torso and grounded limitations.** Prove one socket-preserving
   torso replacement first. Implement socket overrides or extra postures only
   when an existing move requires them. Complete rendering and sweep support
   together, including cleanup on cancellation.
5. **Roll the lessons through built moves.** Body slam/piledriver/hip toss,
   then figure-four/arm bar/ankle lock, then drops/dives/press. Follow with
   legacy strikes, standing holds, whip, pin, and taunts. Reuse proven art and
   timing patterns without forcing every move into the same rhythm.
6. **Tune sound and camera last.** Distinguish foot plant, exertion, body
   contact, and mat landing. Keep submission pressure quieter than a slam.
   Judge the animation muted first, then restore presentation effects.

Each pilot passes when:

- The load, contact, release, and consequence read at normal gameplay scale.
- The grip stays believable throughout its declared interval, in both facings.
- A supporting foot stays planted until its intentional release; unsupported
  bodies follow a purposeful airborne path.
- Damage, the visible contact, and the sell begin on the same intended beat.
- The defender's head, shoulders, hips, and limbs have purposeful timing offsets.
- There is no entry teleport, floor penetration, rope escape, visible seam pop,
  or jump when the clip hands off to recovery/grounded rendering.
- Cancellation leaves no stale face, grip, travel tween, or locked actor.
- Relevant clip/runtime/contact tests, rig certification, staging proof, and
  live gameplay checks pass. Extend the hammerlock proof to the registered WIP
  before citing it as evidence for Derek's version.

The first reviewable deliverable should be a four-move before/after reel with
the required donor parts beside it. Decide the broader art batch from that reel.
