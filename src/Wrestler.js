import { RING, ringBoundsAtY, perspectiveScale } from './constants.js';
import Skeleton, { GAIT } from './Skeleton.js';
import { resolvePowerMove } from './logic/moveDecision.js';
import { stagedWorldPoint } from './animation/clipStaging.js';
import { resolveSemanticSlots } from './rig/partVariants.js';
import { dropkickClip } from './animation/clips/dropkick.js';
import { frontKickClip } from './animation/clips/frontKick.js';
import { shoveClip } from './animation/clips/shove.js';
// ?dropkick=v2 comparison candidate (tools/move-editor/author_dropkick_v2.mjs).
import { dropkickV2Clip } from './animation/clips/dropkickV2.js';
import { elbowDropClip } from './animation/clips/elbowDrop.js';
import { kneeDropClip } from './animation/clips/kneeDrop.js';
import { divingElbowClip } from './animation/clips/divingElbow.js';
import { topDiveClip } from './animation/clips/topDive.js';
import { theszPressClip } from './animation/clips/theszPress.js';
import { SELLS, clutchSell, sampleSell, applyOffsets, planSells, groundedSlot } from './animation/sells.js';
import { staggerFor } from './animation/staggers.js';
import { MOVE_SPECS } from './moves/registry.js';
import {
    ARTICULATED_CHANNELS,
    ARTICULATION_CHANNEL_PAIRS,
    authoredArticulationChannels,
    mergeArticulatedPose,
} from './rig/articulation.js';

const SPEED      = 140;
const RUN_SPEED  = 340;
const DOWN_SEC   = 4.5;
// How long a thrown body takes to settle from the clip's last frame into the
// grounded lying pose (see _layOnBack / Skeleton.groundedPoseFrom).
const GROUND_HANDOFF_SEC = 0.3;
// A down-state sell (src/animation/sells.js) starts after the grounded
// handoff has settled and ends this long before the get-up.
const SELL_LEAD_SEC = 0.35;
const SELL_TAIL_SEC = 0.3;
const RECOVERY_RAMP_MS = 200; // ?aftermath=v2 protective recovery fades in over this
// The dropkick v2 candidate connects with Lou this far from George (rig units;
// author_dropkick_v2.mjs DROPKICK_V2_REACH), inside the unchanged hit range.
const DROPKICK_V2_REACH = 92;
// Front kick: the attacker settles this far from the target (the distance
// tools/move-editor/author_frontkick.mjs poses the boot to meet the belly at),
// may start it from FRONT_KICK_REACH, and the boot still counts at FRONT_KICK_HIT.
// Same ring-depth lane the separation and combat-blend code use: a target who
// stepped off the attacker's row during the wind-up is missed, not hit.
const STRIKE_DEPTH_TOLERANCE = 26;
const FRONT_KICK_STANDOFF = 84;
const FRONT_KICK_REACH    = 130;
const FRONT_KICK_HIT      = 115;
// Shove: a point-blank guard-breaker (tools/move-editor/author_shove.mjs poses
// the palms to meet the chest at SHOVE_STANDOFF); still counts out to SHOVE_HIT.
const SHOVE_STANDOFF = 76;
const SHOVE_HIT      = 100;
// v2 opens with a run-up stride; from closer than this (rig units) there is
// no room for one, so the clip starts at its gather (author_dropkick_v2.mjs
// AT.gather) — a crouch and jump from where he stands.
const DROPKICK_V2_STRIDE_MIN_GAP = 130;
export const DROPKICK_V2_GATHER_AT = 0.22;
const dropkickCandidate = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('dropkick') === 'v2';
// ?aftermath=v2: the compact fallback sell and the protective recovery overlay
// (PLAN_MOVE_PERFORMANCE.md D4), a comparison until Derek approves it at G3.
// Flag off, neither exists and nothing below reads _pain beyond today's sells.
const aftermathCandidate = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('aftermath') === 'v2';
// Below this a wrestler who begs off (George) begs instead of taunting —
// the AI's begging-off threshold (AIHandler george.retreatStamina).
const BEG_STAMINA = 35;

// Submissions on a downed man, in the order a plain finisher press picks
// them, and who runs each.
const GROUND_HOLDS = ['figureFour', 'ankleLock', 'armBar'];
const GROUND_HOLD_EXECUTORS = { figureFour: '_doFigureFour', ankleLock: '_doAnkleLock', armBar: '_doArmBar' };

// States where a wrestler is on, or on the way to, the mat. move() must not
// turn him to face the opponent here: on the ground facing decides which way
// the body lies (head toward facing prone, away from it supine), so re-facing
// would flip a lying body end to end whenever the opponent walked past.
const GROUNDED_FACING_LOCK = new Set(['falling', 'flipping', 'down', 'pinned', 'possum', 'gettingUp', 'risingUp']);
// Derived so a planted foot stays world-locked (no skating) — see Skeleton GAIT.
const WALK_FREQ  = GAIT.WALK_FREQ; // radians per unscaled pixel of travel

// Walk velocity ramps (px/s², unscaled — multiplied by perspective scale `s`
// at tick time so the feel holds across ring depth). Big men plant and drive:
// ~130ms to full walk speed, ~90ms to brake to a stop. A direction reversal
// is just two ramps back to back, so it passes through zero on the way.
const WALK_ACCEL_TIME = 0.13; // seconds to reach full walk speed
const WALK_BRAKE_TIME = 0.09; // seconds to decelerate to a stop
const WALK_ACCEL = SPEED / WALK_ACCEL_TIME;
const WALK_BRAKE = SPEED / WALK_BRAKE_TIME;

// ─── Stamina ─────────────────────────────────────────────────────────────────
const STAMINA_MAX      = 100;
const STAMINA_RECOVER  = 6;   // per second while standing
// Per-joint pose channels beyond the six the original rig blended. lElbow/
// rElbow/lKnee/rKnee are local flex relative to the parent bone (see
// rig/articulation.js); lForearm/rForearm/lShin/rShin are the older absolute
// skeleton-convention overrides. Both are optional per pose — a pose that omits
// one leaves the joint on its derived relationship.
export { ARTICULATED_CHANNELS };

// Exported so tests/moveRegistry.test.js can assert every registry damageKey
// resolves here and every value here is claimed by a move (no dead damage).
export const STAMINA_DRAIN = {    // drained from the DEFENDER on each move landing
    jab:          5,
    headbutt:     8,
    clothesline:  12,
    bodySlam:     22,
    piledriver:   30,
    figureFour:    8, // per squeeze — three while the hold is on
    dropkick:     14,
    elbowDrop:         10,
    doubleAxeHandle:   12,
    sleeperHold:       18, // total drained if hold runs full duration
    headlock:         4.0, // per second (applied in Arena._tickHeadlock)
    armDrag:          14,
    armBar:            6, // per squeeze — three while the hold is on (the mat arm bar)
    ankleLock:         5, // per squeeze — three while the hold is on
    hipToss:          10,
    suplex:            20,
    divingElbow:       18,
    topDive:           28,
    theszPress:        24, // flying body press — finisher-grade, lands straight into the cover
    hammerlock:        10, // + 4 more on release, see _doHammerlock
    kneeLift:           9,
    backBodyDrop:      16,
    kneeDrop:          12,
    frontKick:          7, // planted push-kick: light damage, a stagger and a step back
    shove:              4, // two-handed guard-breaker: little damage, opens a blocker and gives ground
};
// Kick-out chance: 100% at full stamina, 0% at or below this threshold
const KICKOUT_FLOOR = 15;

// States a delayed sell must never interrupt — mid two-body moves and holds,
// where a state change on one wrestler strands the other with no way out.
const UNSELLABLE_STATES = new Set([
    'slamming', 'grabbed', 'pinning', 'pinned', 'holding', 'sleeping', 'headlocked', 'lockup',
]);

// ─── Pose library ────────────────────────────────────────────────────────────
// Angles are facing-relative: positive = toward facing direction.
// Walk cycle blends additively on top; idle = all zeros lets the walk cycle
// run freely with no bias.
// Optional channels (default 0): `lean` pitches the torso/head forward (+) or
// back (−); `crouch` (0..1) bends the knees and drops the hips with feet
// planted. These carry the silhouette of a move — wind-ups coil back and low,
// impacts drive forward and down.
export const POSES = {
    // idle legs retuned via rig-tuner (Derek, 2026-07-14). Note the non-zero
    // legs make poseLegActive true, so a wrestler resting in this pose uses
    // pose-driven FK instead of the gait path (see Skeleton.updateUpright);
    // in-game the presets idle in powerIdle/theszIdle/brawlerIdle, so this
    // mostly drives fallbacks.
    idle:        { lLeg: -0.04, rLeg: 0.16,  lArm: 0,     rArm: 0,    lean: 0, crouch: 0 },
    grapple:     { lLeg: 0.12,  rLeg:-0.08,  lArm: 0.50,  rArm: 0.18, lean: 0.15, crouch: 0.12 },
    slamHold:    { lLeg: 0.20,  rLeg:-0.22,  lArm: 2.80,  rArm: 2.80, lean:-0.14, crouch: 0.08 }, // arms straight overhead, back arched under the weight
    slamThrow:   { lLeg: 0.50,  rLeg:-0.28,  lArm: 1.30,  rArm: 1.00, lean: 0.42, crouch: 0.22 }, // driving down through the throw
    whipRelease: { lLeg: 0.22,  rLeg: 0.12,  lArm: 0.88,  rArm: 0.30, lean: 0.28 },
    clothesline: { lLeg:-0.15,  rLeg: 0.38,  lArm: 1.18,  rArm:-0.28, lean: 0.30 },
    pinHold:     { lLeg: 0.28,  rLeg: 0.28,  lArm: 0.30,  rArm:-0.30, lean: 0.55, crouch: 0.75 }, // dropped low over the opponent
    elbowRaise:  { lLeg: 0.10,  rLeg: 0.05,  lArm:-1.40,  rArm: 0.15, lean:-0.12 }, // arm loaded high, back arched
    elbowImpact: { lLeg: 0.08,  rLeg: 0.06,  lArm:-0.08,  rArm: 0.08, lean: 0.30, crouch: 0.30 },
    dropkick:    { lLeg: 0.80,  rLeg: 0.65,  lArm:-0.50,  rArm:-0.50  },
    stumble:     { lLeg: 0.24,  rLeg:-0.20,  lArm:-0.55,  rArm: 0.55, lean: 0.12, crouch: 0.20 }, // landing recovery — arms wide for balance
    sleeperHold: { lLeg: 0.08,  rLeg:-0.05,  lArm: 1.40,  rArm: 0.30, lean: 0.18, crouch: 0.10 },
    sleeping:    { lLeg:-0.08,  rLeg:-0.04,  lArm:-0.50,  rArm:-0.45, lean:-0.10, crouch: 0.15 },
    pileSit:        { lLeg: 0.55,  rLeg: 0.50,  lArm:-0.20,  rArm:-0.16, crouch: 0.45 }, // seated after piledriver — legs spread forward, arms low at sides
    stagger:        { lLeg:-0.14,  rLeg: 0.12,  lArm: 0.22,  rArm: 0.18, lean:-0.06 }, // mild — slight lurch, arms loose
    staggerMed:     { lLeg:-0.24,  rLeg: 0.20,  lArm: 0.55,  rArm: 0.45, lean:-0.12, crouch: 0.12 }, // hurting — deeper stumble, arms flailing
    staggerHeavy:   { lLeg:-0.34,  rLeg: 0.28,  lArm: 0.90,  rArm: 0.72, lean:-0.18, crouch: 0.26 }, // badly hurt — near-buckle, arms way out
    staggerCollapse:{ lLeg:-0.42,  rLeg: 0.36,  lArm: 1.18,  rArm: 0.96, lean:-0.24, crouch: 0.42 }, // critical — knees nearly giving, arms thrown wide
    staggerBack:    { lLeg: 0.20,  rLeg:-0.16,  lArm:-0.38,  rArm:-0.30, lean:-0.15 }, // counter-sway — reeling back the other way
    jab:            { lLeg: 0.18,  rLeg:-0.12,  lArm: 1.00,  rArm:-0.35, lean: 0.22, crouch: 0.10 }, // near arm punches forward, body drives behind it
    headbutt:       { lLeg: 0.38,  rLeg: 0.15,  lArm: 0.30,  rArm: 0.25, lean: 0.48, crouch: 0.18 }, // whole body lunges forward, head leads
    // The sells' `lean` never rendered (it does not move the body); `bend` is
    // the torso channel that does, so these reactions finally snap back.
    sellChest:      { lLeg:-0.10,  rLeg: 0.08,  lArm:-0.90,  rArm:-0.82, lean:-0.30, bend: -0.34 }, // chest impact — torso snaps back, arms whip behind
    sellHead:       { lLeg: 0.06,  rLeg: 0.06,  lArm: 0.65,  rArm: 0.55, lean:-0.18, crouch: 0.10, bend: -0.22 }, // head strike — hands fly up toward face
    brawlerIdle:    { lLeg: 0.06,  rLeg:-0.04,  lArm: 0.28,  rArm: 0.18, lean: 0.10, crouch: 0.10 }, // guard stance — weight forward, fists up
    powerIdle:      { lLeg: -0.18, rLeg: 0.13,  lArm: 0.10,  rArm: 0.59, lean: 0.09, crouch: 0.22 }, // wide, imposing — arms hanging low (rig-tuner pass 2026-07-26, live export; supersedes the prior 2026-07-26 values — used by shipped george via idlePose: 'powerIdle', see Arena.js/george.js; formerly also shared across the now-vaulted george-ai-pilot v1-v9 lineage)
    theszIdle:      { lLeg: 0.04,  rLeg: 0.14,  lArm: 0.04,  rArm: 0.17, lean: 0.05, crouch: 0.05, lForearm: 0.8, lShin: -0.11, rShin: -0.06 }, // Derek rig-tuner export 2026-07-30. Arms low (lArm 0.04) so the corrected shoulder seam shows; lForearm bend + shin bends shape the rest stance.
    // Derek rig-tuner export 2026-10-07, for the thesz-procreate-v1 comparison
    // candidate ONLY. Identical to theszIdle except lLeg 0.04 -> -0.05, tuned
    // against that candidate's own longer thigh. It is a SEPARATE entry because
    // shipped Lou idles on theszIdle above: editing that in place would have
    // restanced the shipped character to suit a candidate under review.
    theszProcreateIdle: { lLeg: -0.05, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05, lForearm: 0.8, lShin: -0.11, rShin: -0.06 },
    tauntArmsWide:  { lLeg: 0.22,  rLeg:-0.20,  lArm: 2.20,  rArm: 2.00, lean:-0.16 }, // arms raised wide, chest out to the crowd
    // Begging off, Ric Flair's "no, no, wait" (Royal Rumble sheet 283–286):
    // hands up in front of the face, palms out, leaning away. The shake
    // alternates the hands.
    begPlead:       { lLeg:-0.22,  rLeg: 0.12,  lArm: 1.05,  rArm: 0.95, lElbow: 2.05, rElbow: 2.15, lKnee: 0.30, rKnee: 0.30, lean:-0.18, crouch: 0.25 },
    // Ric Flair's strut (Royal Rumble sheet 386–389): hunched, stalking, arms
    // hanging forward; the two alternate the stepping leg.
    strutLeft:      { lLeg: 0.30,  rLeg:-0.15,  lArm: 0.55,  rArm: 0.35, lElbow: 1.10, rElbow: 1.00, lKnee: 0.45, rKnee: 0.30, lean: 0.45, crouch: 0.30 },
    strutRight:     { lLeg:-0.15,  rLeg: 0.30,  lArm: 0.35,  rArm: 0.55, lElbow: 1.00, rElbow: 1.10, lKnee: 0.30, rKnee: 0.45, lean: 0.42, crouch: 0.30 },
    begShake:       { lLeg:-0.22,  rLeg: 0.12,  lArm: 1.20,  rArm: 0.85, lElbow: 1.85, rElbow: 2.30, lKnee: 0.30, rKnee: 0.30, lean:-0.24, crouch: 0.30 },
    ropeOneTaunt:   { lLeg: 0.08,  rLeg:-0.06,  lArm: 1.80,  rArm:-1.80  }, // one arm raised to crowd, other grips rope
    axeHandleUp:    { lLeg: 0.08,  rLeg: 0.12,  lArm: 2.70,  rArm: 3.10, lean:-0.22 }, // arms overhead, back arched for the drop
    axeHandleDown:  { lLeg: 0.30,  rLeg: 0.18,  lArm: 1.20,  rArm: 1.15, lean: 0.40, crouch: 0.20 }, // whole body lurching forward, arms smashing down
    axeHandleImpact:{ lLeg: 0.34,  rLeg: 0.24,  lArm: 0.70,  rArm: 0.65, lean: 0.48, crouch: 0.34 }, // arms at impact depth, body weight fully dropped
    axeHandleFollow:{ lLeg: 0.38,  rLeg: 0.28,  lArm: 0.38,  rArm: 0.35, lean: 0.52, crouch: 0.28 }, // momentum carries arms past, hunched over
    lockup:         { lLeg: 0.18,  rLeg:-0.12,  lArm: 1.57,  rArm: 1.57, lean: 0.26, crouch: 0.18 }, // leaning hard into the collar-and-elbow tie-up
    // ── Strike wind-up / recoil ───────────────────────────────────────────────
    jabCock:        { lLeg: 0.12,  rLeg:-0.10,  lArm:-0.55,  rArm: 0.26, lean:-0.10, crouch: 0.08 }, // punch loaded back, body coiled
    jabRecoil:      { lLeg: 0.14,  rLeg:-0.09,  lArm: 0.82,  rArm:-0.10, lean: 0.08 }, // arm bounces slightly after contact, guard drops
    headbuttCock:   { lLeg: 0.14,  rLeg:-0.12,  lArm: 0.32,  rArm: 0.28, lean:-0.28, crouch: 0.14 }, // body coiling way back before the lunge
    headbuttRecoil: { lLeg: 0.22,  rLeg: 0.18,  lArm: 0.42,  rArm: 0.38, lean:-0.10, crouch: 0.10 }, // rocking back after impact, arms flying out
    // ── Running attack phases ─────────────────────────────────────────────────
    clotheslineCock:{ lLeg:-0.08,  rLeg: 0.28,  lArm:-0.85,  rArm:-0.18, lean:-0.12 }, // arm cocked way back, full running stride
    clotheslineFollow:{ lLeg:-0.22, rLeg: 0.46, lArm: 0.82,  rArm:-0.40, lean: 0.38 }, // arm carried through past impact
    // ── Irish whip phases ─────────────────────────────────────────────────────
    whipGrab:       { lLeg: 0.14,  rLeg:-0.09,  lArm: 0.65,  rArm: 0.48, lean: 0.18, crouch: 0.10 }, // both hands reaching to grab wrist/arm
    whipLoad:       { lLeg: 0.22,  rLeg: 0.14,  lArm: 0.90,  rArm: 0.25, lean:-0.14, crouch: 0.16 }, // pulling back against the opponent's weight
    whipFollow:     { lLeg: 0.10,  rLeg: 0.08,  lArm: 0.50,  rArm: 0.12, lean: 0.18 }, // arm settling after release
    // ── Slam phases ───────────────────────────────────────────────────────────
    slamGrab:       { lLeg: 0.25,  rLeg:-0.28,  lArm: 0.78,  rArm: 0.72, lean: 0.40, crouch: 0.45 }, // bent low, wide stance, reaching to lift
    slamPeak:       { lLeg: 0.20,  rLeg:-0.20,  lArm: 3.14,  rArm: 2.80, lean:-0.18 }, // opponent at full height — back arched, arms locked out
    // ── Elbow drop phases (visible before jump) ───────────────────────────────
    elbowCrouch:    { lLeg: 0.28,  rLeg: 0.25,  lArm: 0.22,  rArm: 0.18, lean: 0.24, crouch: 0.50 }, // deep knee-bend before the leap
    elbowLand:      { lLeg: 0.10,  rLeg: 0.08,  lArm:-0.12,  rArm: 0.10, lean: 0.30, crouch: 0.35 }, // just landed, weight dropped
    // ── Grapple holds ────────────────────────────────────────────────────────
    headlockHold:   { lLeg: 0.22,  rLeg:-0.18,  lArm: 2.10,  rArm: 0.85, lean: 0.30, crouch: 0.15 }, // cranking the head down, body over the hold
    headlocked:     { lLeg: 0.35,  rLeg: 0.30,  lArm:-0.45,  rArm:-0.40, lean: 0.62, crouch: 0.28 }, // bent forward hard, trying to pry free
    armDragGrab:    { lLeg: 0.14,  rLeg:-0.10,  lArm: 0.72,  rArm: 0.55, lean: 0.18, crouch: 0.10 }, // both hands reaching to snatch the arm
    armDragPull:    { lLeg:-0.08,  rLeg: 0.30,  lArm: 1.45,  rArm: 0.85, lean: 0.35, crouch: 0.18 }, // pivoting hard, dragging opponent through
    armDragFollow:  { lLeg:-0.16,  rLeg: 0.24,  lArm: 0.58,  rArm: 0.22, lean: 0.15 }, // arms settling after release
    // Submission poses (attacker / defender variants)
    armBarSetup:    { lLeg: 0.18,  rLeg:-0.12,  lArm: 1.10,  rArm: 1.40, lean:-0.08, crouch: 0.22 }, // lowering into the armbar setup
    armBarLock:     { lLeg: 0.14,  rLeg:-0.08,  lArm: 1.80,  rArm: 1.05, lean: 0.32, crouch: 0.24 }, // cranking the trapped arm
    armBarHold:     { lLeg: 0.20,  rLeg:-0.04,  lArm: 1.50,  rArm: 0.90, lean: 0.18, crouch: 0.28 }, // holding the submission
    armBarDefender: { lLeg:-0.08,  rLeg: 0.06,  lArm:-0.60,  rArm: 0.90, lean:-0.14, crouch: 0.20 }, // opponent trapped and reaching out
    ankleLockSetup: { lLeg: 0.24,  rLeg:-0.18,  lArm: 0.90,  rArm: 0.40, lean: 0.16, crouch: 0.22 }, // grabbing the leg and isolating the foot
    ankleLockTwist: { lLeg: 0.32,  rLeg:-0.28,  lArm: 1.10,  rArm: 0.28, lean:-0.06, crouch: 0.30 }, // winding the twist into the hold
    ankleLockHold:  { lLeg: 0.14,  rLeg:-0.36,  lArm: 0.82,  rArm: 0.50, lean: 0.26, crouch: 0.34 }, // leaning back on the foot lock
    ankleLockDefender:{ lLeg: 0.46, rLeg:-0.52,  lArm:-0.18,  rArm:-0.10, lean:-0.16, crouch: 0.18 }, // trapped ankle and pain response
    // ── Defense ──────────────────────────────────────────────────────────────
    block:          { lLeg: 0.18,  rLeg:-0.14,  lArm: 0.95,  rArm: 0.80, lean: 0.14, crouch: 0.25 }, // braced sprawl — arms up front, weight low, ready to stuff a tie-up
    evade:          { lLeg:-0.25,  rLeg: 0.30,  lArm: 0.55,  rArm: 0.40, lean:-0.32, crouch: 0.10 }, // backstep — torso whipped back out of reach, arms trailing up
    // ── Four-move blueprint (Codex, 2026-07-24; approved by Derek) ─────────────
    // Behind-the-back arm lock — attacker stages slightly behind/outside the
    // defender rather than genuinely interlocking hands (see MOVE_DEFS.hammerlock).
    hammerlockReach:  { lLeg: 0.10,  rLeg:-0.12,  lArm: 0.78,  rArm: 0.42, lean: 0.18, crouch: 0.10 },
    hammerlockTurn:   { lLeg:-0.10,  rLeg: 0.24,  lArm: 1.32,  rArm: 0.74, lean: 0.22, crouch: 0.16 },
    hammerlockSet:    { lLeg: 0.20,  rLeg:-0.16,  lArm: 1.92,  rArm: 0.68, lean: 0.30, crouch: 0.22 },
    hammerlockCrank:  { lLeg: 0.28,  rLeg:-0.22,  lArm: 2.18,  rArm: 0.46, lean:-0.06, crouch: 0.28 },
    // Rising knee lift — planted close-range strike, creates stagger not a knockdown.
    kneeLiftLoad:     { lLeg:-0.18,  rLeg: 0.22,  lArm:-0.15,  rArm: 0.38, lean:-0.12, crouch: 0.30 },
    kneeLiftChamber:  { lLeg: 1.15,  rLeg:-0.10,  lArm: 0.72,  rArm: 0.40, lean: 0.10, crouch: 0.20 },
    kneeLiftImpact:   { lLeg: 1.72,  rLeg:-0.06,  lArm: 0.90,  rArm: 0.24, lean: 0.34, crouch: 0.10 },
    kneeLiftRecover:  { lLeg: 0.24,  rLeg: 0.06,  lArm: 0.30,  rArm: 0.18, lean: 0.12, crouch: 0.16 },
    // Back body drop — the defensive answer to a returning runner.
    backDropBrace:    { lLeg: 0.34,  rLeg:-0.26,  lArm: 0.48,  rArm: 0.38, lean: 0.36, crouch: 0.55 },
    backDropDip:      { lLeg: 0.44,  rLeg:-0.34,  lArm: 0.82,  rArm: 0.72, lean: 0.62, crouch: 0.82 },
    backDropLaunch:   { lLeg: 0.18,  rLeg: 0.08,  lArm: 1.55,  rArm: 1.35, lean:-0.12, crouch: 0.28 },
    backDropRecover:  { lLeg:-0.12,  rLeg: 0.24,  lArm: 0.42,  rArm: 0.32, lean: 0.18, crouch: 0.12 },
    // Knee drop — measured drop onto a grounded opponent.
    kneeDropSet:      { lLeg: 0.18,  rLeg: 0.10,  lArm: 0.35,  rArm: 0.20, lean: 0.16, crouch: 0.30 },
    kneeDropLeap:     { lLeg: 0.72,  rLeg: 0.18,  lArm:-0.40,  rArm: 0.52, lean:-0.08, crouch: 0.16 },
    kneeDropTuck:     { lLeg: 1.38,  rLeg: 0.50,  lArm: 0.30,  rArm: 0.65, lean: 0.28, crouch: 0.50 },
    kneeDropLand:     { lLeg: 1.05,  rLeg: 0.22,  lArm: 0.18,  rArm: 0.28, lean: 0.44, crouch: 0.68 },
};

// The dropkick's feet-out frame, named so the rig certifier can render it
// (certificationMatrix 'dropkick-extension'). Read from the clip, never
// restated, so the certified pose is the one the game draws.
POSES.dropkickExtended = dropkickClip.tracks.attacker.keyframes
    .find(frame => frame.at === dropkickClip.events.find(event => event.type === 'impact').at).pose;
// The elbow drop's flat-in-the-air frame, likewise ('elbow-drop-air'): the
// keyframe with the most tilt before the impact.
POSES.theszPressAir = theszPressClip.tracks.attacker.keyframes
    .filter(frame => frame.at < theszPressClip.duration)
    .reduce((best, frame) => ((frame.pose.tilt ?? 0) > (best.pose.tilt ?? 0) ? frame : best)).pose;
POSES.elbowDropAir = elbowDropClip.tracks.attacker.keyframes
    .filter(frame => frame.at < elbowDropClip.duration)
    .reduce((best, frame) => ((frame.pose.tilt ?? 0) > (best.pose.tilt ?? 0) ? frame : best)).pose;

// ─── Move definitions ─────────────────────────────────────────────────────────
// poseSeq drives the attacker's visual. Durations mirror the defender's tween
// timings so both sides stay in sync.
// Defender spatial logic stays in _doXxx — it varies too much per move to
// collapse into data without a more complex DSL.
export const MOVE_DEFS = {
    irishWhip:   { poseSeq: [{ p: 'whipGrab',    dur: 100, e: 'Cubic.easeOut' },
                              { p: 'whipLoad',    dur: 120, e: 'Linear'        },
                              { p: 'whipRelease', dur:  90, e: 'Cubic.easeIn'  },
                              { p: 'whipFollow',  dur: 120, e: 'Cubic.easeOut' },
                              { p: 'idle',        dur: 160, e: 'Linear'        }] },
    clothesline: { poseSeq: [{ p: 'clotheslineCock',   dur: 100, e: 'Cubic.easeOut' },
                              { p: 'clothesline',       dur:  80, e: 'Cubic.easeIn'  },
                              { p: 'clotheslineFollow', dur: 130, e: 'Linear'        },
                              { p: 'idle',              dur: 200, e: 'Cubic.easeOut' }] },
    pin:         { poseSeq: [{ p: 'pinHold',     dur: 200, e: 'Linear'        }] },
    doubleAxeHandle: { poseSeq: [{ p: 'axeHandleUp',     dur: 150, e: 'Cubic.easeOut' },
                                  { p: 'axeHandleUp',     dur: 130, e: 'Linear'        },
                                  { p: 'axeHandleDown',   dur: 100, e: 'Cubic.easeIn'  },
                                  { p: 'axeHandleImpact', dur:  80, e: 'Linear'        },
                                  { p: 'axeHandleFollow', dur: 140, e: 'Linear'        },
                                  { p: 'idle',            dur: 250, e: 'Cubic.easeOut' }] },
    sleeperHold: { poseSeq: [{ p: 'sleeperHold', dur: 200, e: 'Linear'        }] },
    headlock:    { poseSeq: [{ p: 'whipGrab',     dur: 100, e: 'Cubic.easeOut' },
                              { p: 'headlockHold', dur: 200, e: 'Cubic.easeOut' },
                              { p: 'headlockHold', dur: 200, e: 'Linear'        }] },
    armDrag:     { poseSeq: [{ p: 'armDragGrab',   dur:  90, e: 'Cubic.easeOut' },
                              { p: 'armDragPull',   dur: 100, e: 'Cubic.easeIn'  },
                              { p: 'armDragFollow', dur: 130, e: 'Linear'        },
                              { p: 'idle',          dur: 200, e: 'Cubic.easeOut' }] },
    turnbuckleTaunt: { poseSeq: [{ p: 'ropeOneTaunt', dur: 300, e: 'Cubic.easeOut' },
                                  { p: 'ropeOneTaunt', dur: 900, e: 'Linear'        },
                                  { p: 'idle',         dur: 350, e: 'Linear'        }] },
    taunt:       { poseSeq: [{ p: 'tauntArmsWide', dur: 380, e: 'Cubic.easeOut' },
                              { p: 'tauntArmsWide', dur: 900, e: 'Linear'        },
                              { p: 'idle',          dur: 450, e: 'Linear'        }] },
    jab:         { poseSeq: [{ p: 'jabCock',    dur:  83, e: 'Cubic.easeOut' },
                              { p: 'jab',        dur:  67, e: 'Cubic.easeIn'  },
                              { p: 'jabRecoil',  dur:  83, e: 'Linear'        },
                              { p: 'idle',       dur: 167, e: 'Cubic.easeOut' }] },
    headbutt:    { poseSeq: [{ p: 'headbuttCock',   dur: 117, e: 'Cubic.easeOut' },
                              { p: 'headbutt',       dur:  83, e: 'Cubic.easeIn'  },
                              { p: 'headbuttRecoil', dur: 100, e: 'Linear'        },
                              { p: 'idle',           dur: 183, e: 'Cubic.easeOut' }] },
    // ── Four-move blueprint (Codex, 2026-07-24; approved by Derek) ─────────────
    // hammerlock migrated to the seekable clip runtime (2026-08-03) — its
    // choreography and timing now live in src/animation/clips/hammerlock.js, so
    // it has no MOVE_DEFS.poseSeq here (a duplicate poseSeq would be a dead,
    // misleading second timing source). The hammerlock* POSES it samples stay
    // above; they double as rig-audit reference stances (joint_attachment_audit,
    // lou_preview, comparison shots).
    // kneeLift/backBodyDrop are documented here for reference, but the middle
    // launch phase of backBodyDrop doesn't tween `pose` directly — it shares
    // the clothesline fall. (The elbow and knee drops' flights are clips.)
    kneeLift:    { poseSeq: [{ p: 'kneeLiftLoad',    dur: 100, e: 'Cubic.easeOut' },
                              { p: 'kneeLiftChamber', dur:  90, e: 'Cubic.easeIn'  },
                              { p: 'kneeLiftImpact',  dur:  70, e: 'Linear'        },
                              { p: 'kneeLiftRecover', dur: 180, e: 'Cubic.easeOut' }] },
    backBodyDrop:{ poseSeq: [{ p: 'backDropBrace',   dur: 110, e: 'Cubic.easeOut' },
                              { p: 'backDropDip',     dur: 120, e: 'Cubic.easeIn'  },
                              { p: 'backDropLaunch',  dur: 100, e: 'Cubic.easeOut' },
                              { p: 'backDropRecover', dur: 220, e: 'Cubic.easeOut' }] },
};


// ─── State machine reference ──────────────────────────────────────────────────
// 'standing'    default; can move, accept input, initiate moves
// 'evading'     quick backstep with dodge frames — strikes whiff, grapples find nothing; ~320ms then standing
// 'blocking'    braced stance while block key held — grapple/sleeper attempts get stuffed (attacker
//               staggers), but strikes land normally and stamina doesn't recover
// 'staggered'   brief stun after a light strike; stateTimer counts down; no input; second hit knocks down
// 'selling'     brief reaction tween on the defender before fall/stagger; blocks movement and input
// 'taunting'    attacker mid-taunt pose sequence; blocks movement and input; ~1.3s total
// 'running'     Irish whip victim; runPhase 'toRope' → 'returning'; no input
// 'falling'     400ms fall tween before going down; no input
// 'flipping'    clothesline/dropkick victim arc; flipProgress 0→1; no input
// 'dropkicking'   attacker airborne during dropkick; posed by the dropkick clip
// 'elbowDropping' attacker airborne during elbow/knee drop; posed by its flight clip
// 'slamming'    attacker mid-slam, elbow drop, or dropkick launch; no input
// 'grabbed'     legacy held-victim state; no move sets it since the throws moved to clips (2026-10-13)
// 'down'        flat on mat; stateTimer counts down to 0 → 'gettingUp' (or 'possum' if holding down)
// 'possum'      faking unconscious; hold down key to stay flat; action/power = quick spring up
// 'gettingUp'   staged rise: flat → sit up → all fours → standing (riseT 0→1, slower when hurt); no input
// 'risingUp'    160ms kip-up after possum; drawn as falling in reverse; no input
// 'pinned'      flat during a pin; mash action to attempt kickout
// 'pinning'     attacker holding the pin
// 'holding'     attacker applying sleeper hold or headlock
// 'sleeping'    defender in sleeper hold; mash action to escape
// 'headlocked'  defender in side headlock; mash action to escape
// 'lockup'      grapple clinch; attacker follows up with action+direction, defender contests with action
// 'climbing'    tweening up to or down from a turnbuckle corner; no input
// 'onTurnbuckle' standing on middle rope at corner; power = dive, movement = climb down
// 'diving'      airborne from turnbuckle dive; posed by the dive clip
// 'pressing'    Thesz press flight, posed by its clip; lands into pin (hit) or down (whiff)

// ─── Wrestler class ───────────────────────────────────────────────────────────
export default class Wrestler {
    constructor(scene, x, y, skinCol, trunksCol, input, moveSet = ['irishWhip', 'clothesline', 'bodySlam', 'pin', 'elbowDrop', 'dropkick', 'doubleAxeHandle'], textures = {}) {
        this.scene        = scene;
        this.x            = x;
        this.y            = y;
        this.skinCol      = skinCol;
        this.trunksCol    = trunksCol;
        this.input        = input;
        this.moveSet      = moveSet;
        this.facing       = 1;
        this.state        = 'standing';
        this.stateTimer   = 0;
        this.fallProgress = 0;
        // How a downed wrestler lies: 'supine' (on the back, feet toward
        // facing) or 'prone' (face down, head toward facing). Set by every
        // path that puts a wrestler on the mat; read by the grounded render
        // and the get-up.
        this.lying        = 'supine';
        this._fallVariant = 'backward';
        this.runPhase     = null;
        this.runTarget    = 0;
        this.runFacing    = 1;
        this.walkPhase    = 0;
        this.moveBlend    = 0;
        this.vx           = 0; // walk velocity, px/s — ramps toward/away from target speed
        this.vy           = 0;
        this._walkPhaseDir = 1; // last stride direction, held through brake-to-stop frames
        this.stamina      = STAMINA_MAX;
        this.flipProgress  = 0;
        this.flipDir       = 1;
        this._corner       = null;
        this._divLandY     = 0;
        this._ropeLevel    = 0; // 0=none, 1=middle rope, 2=top rope
        this.pose            = { ...POSES.idle, lean: 0, crouch: 0 }; // live joint angles, tweened per move
        this.idlePose        = 'idle';            // character-specific resting stance — override after construction
        this.tauntPose       = 'tauntArmsWide';   // character-specific taunt — override after construction
        this.sellStyle       = 'economical';      // how he sells on the mat (sells.js SELL_STYLES) — override after construction
        this._pain           = null;              // pain context of the last confirmed hit (_hurt): sold on the mat, carried through the rise
        this._sell           = null;              // the sells playing on this trip to the mat (_tickSell)
        this.begsOff         = false;             // pleads instead of preening when hurt (George)
        this.struts          = false;             // taunts with Flair's strut instead of the arms-wide pose (George)
        this._runStepTimer   = 0;
        this.gfx             = scene.add.graphics();
        this.skeleton        = new Skeleton(scene, skinCol, trunksCol, textures);
        this.combatBlend     = 0;
        this._evadeCooldown  = 0;
        // Scene-clock deadline until which a legacy pose sequence owns the
        // stance — see _choreoOwnsPose().
        this._choreoUntil    = 0;
        // Handle for a move currently driven by the scene MoveRuntime. While
        // set, the clip owns this.pose each frame; anything else that claims the
        // pose (tweenPose) cancels it, so an interrupted move can't keep
        // animating or fire a late impact/drain. Move-neutral, not jab-specific:
        // for a PAIRED move (hammerlock) both the attacker's and the defender's
        // `_activeMove` reference the SAME handle, so either one claiming a new
        // pose or state tears down the whole move and both actors get cleaned up
        // together. The clip's onCancel/onComplete is what nulls this back out.
        this._activeMove     = null;
        // Render-only overall size multiplier (2026-07-19, real-world height
        // calibration — see george.js/thesz.js) — folded into draw()'s local
        // `s` only, never into the `s` getter below, so it never touches
        // movement speed, reach, or hit-detection ranges, all of which read
        // `this.s` directly. Defaults to 1: bit-identical for any character
        // that doesn't set textures.heightScale.
        this._heightScale    = textures.heightScale ?? 1;
    }

    get s() { return perspectiveScale(this.y); }

    // True while authored choreography — a MoveRuntime clip or a MOVE_DEFS pose
    // sequence — owns the stance.
    //
    // The combat-ready guard in Skeleton blends the arms toward a fixed ready
    // position as combatBlend approaches 1, and at b=1 it REPLACES the arm
    // angles outright (`a + (GUARD - a) * 1 === GUARD`). combatBlend only falls
    // when the state leaves standing/staggered, and jab/headbutt never change
    // state, so every arm-driven strike was being erased at exactly the range
    // where it is legal: measured 1.55 rad of authored jab travel rendering as
    // 0.0025 rad. Suppressing the guard while choreography owns the arms fixes
    // the whole class rather than one move.
    //
    // Derived from a deadline rather than a flag so it cannot get stuck on if a
    // sequence is interrupted, and tweenPose clears it so a pose override
    // (selling, blocking, the idle settle) hands the guard straight back.
    _choreoOwnsPose() {
        return this._activeMove !== null || this.scene.time.now < this._choreoUntil;
    }

    // Smoothly ramp combatBlend toward 1 when standing close to the opponent,
    // toward 0 otherwise. Only active in neutral standing states.
    updateCombatBlend(dt, opponent) {
        const NEAR = 130, FAR = 240;
        const neutralState = this.state === 'standing' || this.state === 'staggered';
        const depthDiff = Math.abs(this.y - opponent.y);
        const dist = depthDiff > 26
            ? 9999
            : Phaser.Math.Distance.Between(this.x, this.y, opponent.x, opponent.y);
        const target = neutralState
            ? Math.max(0, Math.min(1, (FAR - dist) / (FAR - NEAR)))
            : 0;
        this.combatBlend += (target - this.combatBlend) * Math.min(1, dt * 5);
    }

    // ── Pose helpers ──────────────────────────────────────────────────────────

    // Consume one sampled frame from the scene MoveRuntime. This is the seam
    // MoveRuntime.applySample looks for, so the clip writes straight into the
    // same live pose object draw() already reads. Pose channels merge in place
    // (extended channels the clip doesn't author — lForearm/lShin/… — pass
    // through untouched, matching the legacy tweenPose path). The clip's
    // semantic `strikingForearm` slot is resolved to the correct near/far
    // forearm here, from facing.
    // `staging` is the immutable per-role frame MoveRuntime captured at play()
    // (src/animation/clipStaging.js). It is non-null only when THIS role's track
    // actually authors transform channels, so a clip that stages nobody — jab,
    // hammerlock — reaches this method exactly as it did before and leaves
    // position entirely to its executor.
    //
    // Pose, parts and transform are applied from the SAME sampled frame in one
    // call, so a keyframe's stance, its art swap, and its staging can never land
    // on different game frames.
    //
    // Authored facing lands FIRST: which physical arm plays a semantic part
    // slot (workingHand, strikingForearm) depends on facing, so the turn and
    // the art swap on the same keyframe must resolve against the new facing.
    prepareAnimationClip(track) {
        this.scene.tweens.killTweensOf(this.pose);
        this._choreoUntil = 0;
        // A sparse clip (e.g. jab) must not inherit a previous hold's folded
        // elbow or knee. Initialize ONLY unowned joints from this character's
        // neutral stance. Fully authored clips retain all their choreography.
        const firstPose = track.keyframes[0].state.pose;
        for (const channel of ['tilt', 'lift', 'bend']) {
            if (!Number.isFinite(firstPose[channel])) this.pose[channel] = 0;
        }
        const idle = POSES[this.idlePose] ?? POSES.idle;
        for (const { local, legacy } of ARTICULATION_CHANNEL_PAIRS) {
            if (Number.isFinite(firstPose[local]) || Number.isFinite(firstPose[legacy])) continue;
            delete this.pose[local];
            delete this.pose[legacy];
            if (Number.isFinite(idle[local])) this.pose[local] = idle[local];
            else if (Number.isFinite(idle[legacy])) this.pose[legacy] = idle[legacy];
        }
        if (track.authorsTransform) {
            this.scene.tweens.killTweensOf(this);
            this.vx = this.vy = 0;
        }
    }

    applyAnimationSample(sample, staging = null, facingAxis = null) {
        if (facingAxis && sample.facing) this.facing = facingAxis * sample.facing;
        if (sample.pose) mergeArticulatedPose(this.pose, sample.pose);
        // Read by draw() only while a move is active, so it can't go stale.
        this._floorContacts = sample.floorContacts ?? null;
        if (sample.parts) this.skeleton.setPartVariants(this._resolveVariantSlots(sample.parts));
        if (staging && sample.transform) this._applyStagedTransform(sample.transform, staging);
    }

    // The staging origin MoveRuntime reads at play() time. A pure snapshot —
    // deliberately no side effects, so capture order can never change what a
    // clip does. `scale` is this wrestler's perspective scale at clip start;
    // the runtime uses the ANCHOR's for every role so the pair stays rigid.
    captureStagingOrigin() {
        return { x: this.x, y: this.y, facing: this.facing, scale: this.s };
    }

    // A clip's grips (AnimationClip.js): turn each gripping arm, by two-bone
    // IK, so its hand lands on the partner's drawn joint, then redraw. The
    // clip resamples the arms every frame, so nothing accumulates; the turn
    // per pose channel is measured once per facing (rigs differ in sign and
    // in which side a channel draws on).
    holdGrips(list) {
        const sk = this.skeleton, pts = sk?.jointAttachmentPoints;
        if (!pts?.nearWrist) return;
        const flip = side => (side === 'near' ? 'far' : 'near');
        const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
        const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
        const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
        let moved = false;
        for (const { arm, partner, joint, side, w } of list) {
            const handSide = arm === 'l' ? sk.lChannelSide(this.facing) : flip(sk.lChannelSide(this.facing));
            const to = partner.skeleton.jointAttachmentPoints?.[`${side === 'other' ? flip(handSide) : handSide}${joint}`];
            const S = pts[`${handSide}Shoulder`], E = pts[`${handSide}Elbow`], W = pts[`${handSide}Wrist`];
            if (!to || !S || !E || !W) continue;
            const goal = { x: W.x + (to.x - W.x) * w, y: W.y + (to.y - W.y) * w };
            if (dist(W, goal) < 0.5) continue;
            const lu = dist(S, E), lf = dist(E, W);
            const d = Math.max(Math.abs(lu - lf) + 1e-3, Math.min(dist(S, goal), (lu + lf) * 0.999));
            const base = angle(S, goal);
            const bend = Math.acos(Math.max(-1, Math.min(1, (lu * lu + d * d - lf * lf) / (2 * lu * d))));
            // Of the two elbows, keep the one nearer where it is.
            const elbows = [base + bend, base - bend].map(a => ({ x: S.x + Math.cos(a) * lu, y: S.y + Math.sin(a) * lu }));
            const E2 = dist(elbows[0], E) <= dist(elbows[1], E) ? elbows[0] : elbows[1];
            const dUpper = wrap(angle(S, E2) - angle(S, E));
            const dFore = wrap(angle(E2, goal) - angle(E, W)) - dUpper;
            const signs = this._gripSigns(arm, handSide);
            this.pose[`${arm}Arm`] += signs.arm * dUpper;
            this.pose[`${arm}Elbow`] += signs.elbow * dFore;
            moved = true;
        }
        if (moved) this.draw();
    }

    // Screen turn per unit of a pose channel, by probing it once (cached per
    // arm and facing).
    _gripSigns(arm, handSide) {
        const key = `${arm}:${this.facing}`;
        this._gripSignCache ??= {};
        if (this._gripSignCache[key]) return this._gripSignCache[key];
        const pts = () => this.skeleton.jointAttachmentPoints;
        const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
        const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
        const read = () => {
            const p = pts();
            const S = p[`${handSide}Shoulder`], E = p[`${handSide}Elbow`], W = p[`${handSide}Wrist`];
            return { upper: angle(S, E), fore: angle(E, W) - angle(S, E) };
        };
        // Two-sided: a channel at its clamp moves only one way.
        const probe = (channel, part) => {
            const was = this.pose[channel];
            let turn = 0;
            for (const step of [0.05, -0.05]) {
                this.pose[channel] = was;
                this.draw();
                const a = read()[part];
                this.pose[channel] = was + step;
                this.draw();
                turn = wrap(read()[part] - a) / step;
                if (Math.abs(turn) > 0.05) break;
            }
            this.pose[channel] = was;
            return turn;
        };
        const armTurn = probe(`${arm}Arm`, 'upper'), elbowTurn = probe(`${arm}Elbow`, 'fore');
        const signs = { arm: Math.sign(armTurn) || 1, elbow: Math.sign(elbowTurn) || 1 };
        if (Math.abs(armTurn) <= 0.05 || Math.abs(elbowTurn) <= 0.05) return signs; // no clean reading: retry next time
        this._gripSignCache[key] = signs;
        return signs;
    }

    // MoveRuntime's ring fit (clipStaging.js): the shift of the shared origin
    // that keeps the whole authored path of every staged role inside the
    // ropes, so the tableau is moved as one piece instead of each body being
    // clamped on its own. `ext` is in rig units along the staging axis.
    stagingFit(frame, ext) {
        if (!ext) return 0;
        const margin = 20;
        const yA = frame.originY + ext.minY * frame.scale;
        const yB = frame.originY + ext.maxY * frame.scale;
        const a = ringBoundsAtY(yA), b = ringBoundsAtY(yB);
        const left = Math.max(a.left, b.left) + margin;
        const right = Math.min(a.right, b.right) - margin;
        const xs = [ext.minX, ext.maxX].map(dx => frame.originX + frame.facing * dx * frame.scale);
        const lo = Math.min(...xs), hi = Math.max(...xs);
        if (hi - lo > right - left) return (left + right) / 2 - (lo + hi) / 2;
        if (lo < left) return left - lo;
        if (hi > right) return right - hi;
        return 0;
    }

    // Absolute placement from a role-local authored offset. Absolute, not
    // incremental: this is what makes an arbitrary seek land in the same place
    // as playing there, and what stops repeated frames from ratcheting an actor
    // across the ring.
    _applyStagedTransform(transform, staging) {
        const point = stagedWorldPoint(staging, transform);
        this.x = point.x;
        this.y = point.y;
        // Ring bounds still win. A clip authored with a big lateral offset that
        // is started near the ropes gets clamped rather than staging a wrestler
        // through the apron — the same rule every other position writer obeys.
        this._clamp();
        // While a clip owns position, walk velocity must not also be integrating
        // into x/y. Clip-driven moves run in input-locked states so update()'s
        // walk branch is already dormant, but zeroing here means the frame after
        // the clip releases starts from rest instead of resuming a stale ramp —
        // no slide-away on completion or cancellation.
        this.vx = 0;
        this.vy = 0;
    }

    // Map any semantic variant slots a clip authors onto the skeleton's real
    // render slots. `strikingForearm` follows the punching arm and
    // `workingHand` the gripping one: both drive lArm, which the skeleton
    // renders as the NEAR arm facing right and the FAR arm facing left
    // (Skeleton.js's [far,near] arm mapping). Binding the art to the role keeps
    // it correct in both facings and both wrestler slots — never a screen-space
    // correction that only holds facing right.
    //
    // The mapping itself lives in src/rig/partVariants.js so the move editor
    // previews a clip's semantic slots through the same table, rather than
    // showing the author art the game will put on the other hand.
    _resolveVariantSlots(parts) {
        return resolveSemanticSlots(parts, this.facing, this.skeleton?._textureConfig, this.skeleton?.lChannelSide?.(this.facing));
    }

    // Cancel any MoveRuntime-driven move on this wrestler. Cancellation removes
    // the clip handle (no further impact events) and MoveRuntime resets its
    // part variants to base; the caller that's taking over the pose sets the
    // new stance. Safe to call when nothing is active. `initiator` defaults to
    // `this` — the wrestler whose own pose-claim triggered the cancel — so a
    // paired move's onCancel can tell which bound actor is about to get a new
    // pose (and must be left alone) versus which is the stranded partner (and
    // needs a recovery tween), without guessing from actor state.
    _cancelActiveMove(reason = 'interrupted', initiator = this) {
        if (this._activeMove) {
            // cancel() runs the handle's onCancel, which nulls _activeMove on
            // EVERY bound actor (both wrestlers, for a paired move) — so by the
            // time cancel returns this is usually already null. The explicit
            // reset below is the single-actor safety net and is harmless when
            // onCancel already cleared it.
            this.scene.moveRuntime?.cancel(this._activeMove, reason, { initiator });
            this._activeMove = null;
        }
    }

    // Tween this.pose toward a target. The six original channels normalize to
    // zero when omitted; articulated elbow/knee channels are copied whenever
    // authored and otherwise remain at their current value. Dropping them here
    // makes a valid rig-tuner pose look like broken limb art at runtime.
    // Kills any in-flight pose tween first so sequences don't stack.
    tweenPose(target, duration, ease = 'Linear', onComplete) {
        // A tweenPose means something other than a clip now owns the stance —
        // getting hit and selling, blocking, a follow-up move, the idle
        // settle. Release any active clip so the two don't fight over the pose
        // and so an interrupted strike stops before its impact frame.
        this._cancelActiveMove('pose-override');
        // Whatever is claiming the pose now owns it; any pose-sequence deadline
        // from a superseded move is void. _runPoseSequence re-arms this after
        // its own tweenPose call, so a live sequence keeps its ownership.
        this._choreoUntil = 0;
        this.scene.tweens.killTweensOf(this.pose);
        let p = typeof target === 'string' ? POSES[target] : target;
        if (typeof target === 'string' && (target === 'idle' || target === this.idlePose)) {
            p = { ...p };
            // Recovery to neutral must actually unwind a previous hold. Other
            // sparse authored poses retain their existing merge semantics.
            for (const { local, legacy } of ARTICULATION_CHANNEL_PAIRS) {
                if (Number.isFinite(p[local]) || Number.isFinite(p[legacy])) continue;
                p[local] = local.endsWith('Elbow') ? 0.70 : Math.max(-0.10, -1.6 * (p.crouch ?? 0));
            }
        }
        // Normalize so lean/crouch always tween back to 0 for poses that omit them
        const t = { lLeg: p.lLeg ?? 0, rLeg: p.rLeg ?? 0, lArm: p.lArm ?? 0, rArm: p.rArm ?? 0,
                    lean: p.lean ?? 0, crouch: p.crouch ?? 0,
                    // A clip can leave the body tilted or lifted (piledriver,
                    // slams); every ordinary pose sets it back down.
                    tilt: p.tilt ?? 0, lift: p.lift ?? 0,
                    // Torso acting likewise settles back over the hips.
                    bend: p.bend ?? 0 };
        // Seeded so Phaser never tweens from undefined (NaN).
        this.pose.tilt ??= 0;
        this.pose.lift ??= 0;
        this.pose.bend ??= 0;
        // Articulated channels need a finite value on this.pose to interpolate
        // FROM. A channel the live pose has never carried has none, and Phaser
        // reads that `undefined` as NaN for the whole tween: clampLocalFlex
        // quietly swaps a NaN elbow for the joint default (so the joint renders
        // but never animates), while the legacy lForearm/lShin path multiplies
        // it straight into a sprite rotation and position and the limb
        // disappears. Measured on Thesz, whose theszIdle is the only pose
        // authoring these: a knee drop's recovery to idle blanked both shins
        // and boots.
        //
        // So a cold channel is seeded from the joint relationship the skeleton
        // is currently drawing, then tweened normally. The seed is by
        // construction render-identical to what is already on screen, so frame
        // one is unchanged and the joint animates into its authored value
        // rather than popping to it.
        //
        // Before the first render there is no relationship to read — and a
        // skeleton that reports a non-finite one is not trusted — so the
        // channel is assigned outright. Motionless for that one transition, but
        // the NaN can never come back.
        // Resolve each joint to ONE owner. Local flex is canonical and wins if
        // invalid compatibility content authors both it and the legacy absolute
        // child angle. Switching representations is continuous: seed the new
        // owner from the last upright render, then remove the old owner before
        // handing the destination to Phaser. Omitted joints keep their current
        // owner/value, matching seekable clip merge semantics.
        for (const { local, legacy } of ARTICULATION_CHANNEL_PAIRS) {
            if (Number.isFinite(this.pose[local]) && Number.isFinite(this.pose[legacy])) {
                delete this.pose[legacy];
            }
        }
        for (const { channel, counterpart } of authoredArticulationChannels(p)) {
            if (!Number.isFinite(this.pose[channel])) {
                const rendered = this.skeleton?.currentPoseChannel?.(channel);
                if (!Number.isFinite(rendered)) {
                    this.pose[channel] = p[channel];
                    delete this.pose[counterpart];
                    continue;
                }
                this.pose[channel] = rendered;
            }
            delete this.pose[counterpart];
            t[channel] = p[channel];
        }
        if (!duration) {
            Object.assign(this.pose, t);
            if (onComplete) onComplete();
            return;
        }
        this.scene.tweens.add({ targets: this.pose, ...t, duration, ease, onComplete });
    }

    // Chain through an array of { p, dur, e } pose steps; calls onDone when the last one finishes.
    _runPoseSequence(sequence, onDone) {
        const [head, ...rest] = sequence;
        if (!head) { if (onDone) onDone(); return; }
        this.tweenPose(
            POSES[head.p] ?? POSES.idle,
            head.dur,
            head.e ?? 'Linear',
            () => this._runPoseSequence(rest, onDone),
        );
        // Claim the stance for the remainder of the sequence. Set AFTER
        // tweenPose, which clears the deadline as part of taking the pose over.
        // Re-armed each step, so an interrupted sequence expires on its own.
        const remaining = sequence.reduce((ms, step) => ms + (step.dur ?? 0), 0);
        this._choreoUntil = this.scene.time.now + remaining;
    }

    // ── Core game tick ────────────────────────────────────────────────────────

    move(dt, other) {
        // A bound clip owns facing: the executor sets it before play() and
        // keyframes may author it. Arena ticks move() BEFORE moveRuntime.update,
        // so re-facing here undid any facing a clip didn't re-author every
        // frame — the shipped hammerlock's back-to-the-attacker defender lasted
        // one frame and played as a face-to-face clinch.
        if (this.state !== 'running' && !this._activeMove && !GROUNDED_FACING_LOCK.has(this.state)) {
            const dx = other.x - this.x;
            if (dx !== 0) this.facing = Math.sign(dx);
        }

        if (this.state !== 'standing') {
            // Not under walk control (mid-move, staggered, etc.) — re-enter
            // standing from a dead stop rather than carrying stale velocity.
            this.vx = 0;
            this.vy = 0;
            return;
        }

        let dx = 0, dy = 0;
        if (this.input.isDown('left'))  dx -= 1;
        if (this.input.isDown('right')) dx += 1;
        if (this.input.isDown('up'))    dy -= 1;
        if (this.input.isDown('down'))  dy += 1;

        const len = Math.hypot(dx, dy);
        // Hurt legs: slower target speed (phase advance below scales with
        // actual velocity so planted feet don't skate), and liable to stumble
        // mid-step — a stumble is a slam window, since tryAction grabs
        // staggered wrestlers.
        const hurt = Math.max(0, 1 - this.stamina / 35);
        const eff  = SPEED * (1 - 0.35 * hurt);

        let targetVx = 0, targetVy = 0;
        if (len > 0) {
            const speed = eff * this.s;
            targetVx = (dx / len) * speed;
            targetVy = (dy / len) * speed;
        }

        // Ramp actual velocity toward the target at a constant rate (accelerating
        // with input held, braking toward zero with none) — this is what gives
        // starts/stops/reversals real time instead of snapping to target speed.
        const rate = (len > 0 ? WALK_ACCEL : WALK_BRAKE) * this.s * dt;
        const dvx = targetVx - this.vx, dvy = targetVy - this.vy;
        const dv = Math.hypot(dvx, dvy);
        if (dv <= rate || dv === 0) {
            this.vx = targetVx;
            this.vy = targetVy;
        } else {
            this.vx += (dvx / dv) * rate;
            this.vy += (dvy / dv) * rate;
        }

        // Gait-phase direction must track actual travel relative to facing, not
        // raw input: the stance-sweep world-lock (Skeleton.js GAIT comment)
        // only cancels body displacement when dir === sign(vx) relative to
        // facing. During a live reversal, vx still points the old way through
        // the whole brake half of the ramp even though input flipped
        // instantly — driving dir off input there desyncs the phase step from
        // actual displacement and the planted foot slides. Below a small
        // epsilon, sign(vx) is noise from the ramp settling; hold the last
        // direction (matches the existing brake-to-stop behavior).
        const VX_EPS = 4 * this.s;
        if (Math.abs(this.vx) > VX_EPS) {
            this._walkPhaseDir = Math.sign(this.vx) === this.facing ? 1 : -1;
        }

        // Gait speed is fed from actual travel speed (not target speed) so the
        // planted foot stays locked to the ground through both the accel ramp
        // and the brake-to-stop tail — never the input's instantaneous target.
        const travelSpeed = Math.hypot(this.vx, this.vy);
        if (travelSpeed > 0.5) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            const unscaled = travelSpeed / this.s;
            this.walkPhase = ((this.walkPhase + this._walkPhaseDir * unscaled * dt * WALK_FREQ) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            this._clamp();
        } else {
            this.walkPhase *= Math.pow(0.85, dt * 60);
        }

        if (len > 0) {
            this.moveBlend = Math.min(1, this.moveBlend + dt * 6);
            if (hurt > 0 && Math.random() < 0.45 * hurt * dt) {
                this.startStagger();
                return;
            }
        } else {
            this.moveBlend  = Math.max(0, this.moveBlend - dt * 6);
            // Drift toward character's idle stance while standing still (~1.5s to settle)
            const idleTarget = POSES[this.idlePose] ?? POSES.idle;
            const drift = 1 - Math.pow(0.94, dt * 60);
            for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) {
                this.pose[k] += ((idleTarget[k] ?? 0) - this.pose[k]) * drift;
            }
        }

        this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_RECOVER * dt);

        // Y is depth in 2.5D — only separate wrestlers at the same ring depth.
        // If they're on clearly different depth tracks, let them pass freely.
        const depthDiff = Math.abs(this.y - other.y);
        if (depthDiff < 26) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
            const minDist = 80 * this.s;
            if (dist < minDist) {
                // Dead-centered (moves that set other.x = attacker.x leave dist
                // at exactly 0) has no angle to push along — step back opposite
                // our own facing instead of fusing into one silhouette
                const ang = dist > 0
                    ? Phaser.Math.Angle.Between(other.x, other.y, this.x, this.y)
                    : (this.facing > 0 ? Math.PI : 0);
                this.x = other.x + Math.cos(ang) * minDist;
                this.y = other.y + Math.sin(ang) * minDist;
                this._clamp();
            }
        } else if (depthDiff < 48 && (other.state === 'standing' || other.state === 'staggered')) {
            // Half-depth overlap: sprites are ~2.5× taller than the 26px gate, so
            // two upright wrestlers 26–48px apart in depth still fuse into one
            // silhouette. Ease them apart in y — gentle enough that a deliberate
            // walk-by (140·s px/s) slides through, firm enough that nobody loiters
            // inside the other guy.
            if (Math.abs(this.x - other.x) < 60 * this.s) {
                const away = Math.sign(this.y - other.y) || 1;
                this.y += away * 90 * (1 - depthDiff / 48) * dt;
                this._clamp();
            }
        }
    }

    tickDown(dt) {
        this._tickPain();
        if (this.state !== 'down') this._sell = null; // pinned, picked up, rising: the sell stops
        if (this.state !== 'down' && this.state !== 'staggered') return;
        if (this.state === 'down') this._tickSell(dt);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            if (this.state === 'staggered') {
                this.tweenPose('idle', 180, 'Linear');
                this.state = 'standing';
            } else if (this.input.isDown('down')) {
                // Player holds down to play possum — stay flat, 4s before forced rise
                this.state      = 'possum';
                this.stateTimer = 4.0;
            } else {
                this._startRiseUp();
            }
        }
    }

    // Plan the sells for this trip to the mat from the move that put him
    // here (registry `sell`: body part, intensity) and his style, sized to
    // the down timer, then advance them. A roll turns him over at its
    // midpoint: lying and facing flip together, so his head stays put (the
    // pose there draws identically either way, see sells.js).
    _tickSell(dt) {
        const pain = this._pain;
        if (!this._sell && pain?.phase === 'mat' && !pain.planned) {
            pain.planned = true;
            if (pain.part) {
                const plan = planSells({
                    style: this.sellStyle, lying: this.lying, part: pain.part, intensity: pain.severity,
                    budget: this.stateTimer - SELL_LEAD_SEC - SELL_TAIL_SEC,
                    limb: pain.limb, compact: aftermathCandidate(),
                });
                // facing0: the facing he went down with. The hurt limb's slot is
                // measured from it, plus one flip per roll (groundedSlot).
                if (plan.length) this._sell = { plan, i: 0, t: -SELL_LEAD_SEC, facing0: this.facing };
            }
        }
        const sell = this._sell;
        if (!sell) return;
        sell.t += dt;
        const turnOver = (cur) => {
            const to = SELLS[cur.lying][cur.name]?.to;
            if (!to || cur.turned) return;
            cur.turned = true;
            this.lying  = to;
            this.facing = -this.facing;
        };
        let cur = sell.plan[sell.i];
        while (cur && sell.t >= cur.duration) {
            turnOver(cur);
            sell.t -= cur.duration;
            cur = sell.plan[++sell.i];
        }
        if (!cur) { this._sell = null; return; }
        const swapAt = SELLS[cur.lying][cur.name]?.swapAt;
        if (swapAt !== undefined && sell.t / cur.duration >= swapAt) turnOver(cur);
    }

    // The grounded pose and hand reaches of the sell playing now, or null.
    _sellPose() {
        const sell = this._sell;
        const cur = sell?.plan[sell.i];
        if (!cur || sell.t < 0) return null;
        const u = Math.min(1, sell.t / cur.duration);
        const slot = cur.name === 'clutch' ? groundedSlot(cur.limb, sell.facing0, cur.lying, this.skeleton, cur.rolls) : null;
        const def = cur.name === 'clutch' ? clutchSell(cur.lying, cur.part, cur.duration, slot ?? 'near') : SELLS[cur.lying][cur.name];
        const keys = cur.turned ? def.after : def.keys;
        const lying = cur.turned ? def.to : cur.lying;
        const { d, reach } = sampleSell(keys, u, cur.amp);
        const hands = {};
        for (const [side, w] of Object.entries(reach)) hands[side] = { to: def.hands[side], w };
        return { g: applyOffsets(Skeleton.GROUNDED_POSES[lying], d), reach: hands };
    }

    tickPossum(dt) {
        if (this.state !== 'possum') return;
        this.stateTimer -= dt;
        // Action or power = quick spring to feet
        if (this.input.justDown('action') || this.input.justDown('power')) {
            this._startQuickRise();
            return;
        }
        // Forced rise after possum window expires
        if (this.stateTimer <= 0) this._startRiseUp();
    }

    tickRun(dt) {
        if (this.state !== 'running') return;

        // Whipped or bounced while already on his rope target (x === runTarget,
        // e.g. whipped into the ropes he's standing at), the sign is 0: keep
        // running his way. A zero here became facing = 0 at the turn, and the
        // next draw threw, freezing AI-vs-AI matches (Derek, 2026-10-16).
        const dir = Math.sign(this.runTarget - this.x) || this.runFacing || 1;
        this.x += dir * RUN_SPEED * this.s * dt;
        this.walkPhase = (this.walkPhase + RUN_SPEED * dt * WALK_FREQ * 0.8) % (Math.PI * 2);
        this.moveBlend = Math.min(1, this.moveBlend + dt * 8);

        const past = dir > 0 ? this.x >= this.runTarget : this.x <= this.runTarget;
        if (!past) return;

        this.x = this.runTarget;
        if (this.runPhase === 'toRope') {
            const b = ringBoundsAtY(this.y);
            this.runFacing = -dir;
            this.facing    = -dir;
            this.runTarget = dir > 0 ? b.left + 20 : b.right - 20;
            this.runPhase  = 'returning';
            this.scene.triggerRopeBounce?.('far');
        } else {
            this.state    = 'standing';
            this.runPhase = null;
            this.scene.triggerRopeBounce?.('near');
        }
    }

    // ── Input ─────────────────────────────────────────────────────────────────

    // Defense keys — the mixup triangle: block stuffs grapples (attacker
    // staggers), strikes land on blockers normally, evade dodges strikes but
    // concedes ground. Called every tick from Arena.
    tickDefense(dt, other) {
        this._evadeCooldown = Math.max(0, this._evadeCooldown - dt);

        if (this.state === 'standing') {
            if (this._evadeCooldown <= 0 && this.input.justDown('evade')) {
                this.startEvade(other);
                return 'evade';
            }
            if (this.input.isDown('block')) {
                this.state = 'blocking';
                this.tweenPose('block', 130, 'Cubic.easeOut');
            }
        } else if (this.state === 'blocking' && !this.input.isDown('block')) {
            this.state = 'standing';
            this.tweenPose('idle', 160, 'Linear');
        }
        return false;
    }

    // Backstep with dodge frames: while 'evading', strike impacts whiff (see
    // the _doJab/_doHeadbutt/_doDoubleAxeHandle impact checks and the dropkick
    // hit test) and grapple attempts find nothing to grab. Costs a little
    // stamina and carries a cooldown so it can't be spammed into a retreat.
    startEvade(other) {
        this._drain(2);
        this.state          = 'evading';
        this._evadeCooldown = 0.55;
        const dir = this.x <= other.x ? -1 : 1; // hop away from the opponent
        const b   = ringBoundsAtY(this.y);
        const targetX = Math.max(b.left + 20, Math.min(b.right - 20, this.x + dir * 110 * this.s));
        this._runPoseSequence([
            { p: 'evade', dur: 120, e: 'Cubic.easeOut' },
            { p: 'idle',  dur: 220, e: 'Linear'        },
        ]);
        this.scene.tweens.add({
            targets:  this,
            x:        targetX,
            duration: 320,
            ease:     'Cubic.easeOut',
            onComplete: () => { if (this.state === 'evading') this.state = 'standing'; },
        });
    }

    // Grapple key: clothesline vs returning runner | pin vs down | slam vs staggered | Irish whip vs standing
    tryAction(other) {
        if (this.state !== 'standing') return false;
        if (!this.input.justDown('action')) return false;

        if (other.state === 'running' && other.runPhase === 'returning') {
            const xDist   = Math.abs(other.x - this.x);
            // Positive = P2 has run past P1's X in the run direction
            const pastDist = (other.x - this.x) * other.runFacing;
            // Window: within ~4 ring-feet approaching, forgiving ~1 foot past
            const inRange = xDist < 160 * this.s && pastDist < 45 * this.s;

            // Directional override: holding `up` answers the rebound with a
            // back body drop instead of a clothesline.
            if (this.input.isDown('up') && inRange && this.moveSet.includes('backBodyDrop')) {
                this._doBackBodyDrop(other);
                return 'backBodyDrop';
            }
            if (inRange && this.moveSet.includes('clothesline')) {
                this._doClothesline(other);
                return 'clothesline';
            }
        }

        const dist  = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
        const reach = 110 * this.s;
        if (dist > reach) return false;

        // Grapple block: a braced opponent stuffs the tie-up and shoves the
        // attacker off balance — the free window swings the other way.
        // Strikes are the answer to a turtle, not grapples.
        if (other.state === 'blocking') {
            this.x -= this.facing * 26 * this.s;
            this._clamp();
            this.startStagger();
            return 'grappleBlocked';
        }

        if ((other.state === 'down' || other.state === 'possum') && this.moveSet.includes('pin')) {
            this.state  = 'pinning';
            other.state = 'pinned';
            this._runPoseSequence(MOVE_DEFS.pin.poseSeq);
            return 'pin';
        }

        // Grab a staggered opponent — but a fresh wrestler (≥60 stamina) still
        // has the legs to resist the snatch: you get a tie-up, not a free
        // slam. The big-throw window has to be earned by wearing them down.
        if (other.state === 'staggered') {
            if (other.stamina < 60) {
                if (this.moveSet.includes('piledriver')) { this._doPiledriver(other); return 'piledriver'; }
                if (this.moveSet.includes('bodySlam'))   { this._doBodySlam(other);   return 'slam';       }
            }
            this.state  = 'lockup';
            other.state = 'lockup';
            this.tweenPose('lockup', 180, 'Cubic.easeOut');
            other.tweenPose('lockup', 180, 'Cubic.easeOut');
            return 'lockup';
        }

        if (other.state === 'standing') {
            this.state  = 'lockup';
            other.state = 'lockup';
            this.tweenPose('lockup', 180, 'Cubic.easeOut');
            other.tweenPose('lockup', 180, 'Cubic.easeOut');
            return 'lockup';
        }

        return false;
    }

    // Power key: headbutt (vs staggered) | elbow drop (vs downed) | jab (point-blank) | dropkick (medium)
    // Knee lift / knee drop (vs standing / grounded) — directional overrides, checked here
    // (not in resolvePowerMove) because they need to read the held up/down keys.
    tryPower(other) {
        if (this.state !== 'standing') return false;
        if (!this.input.justDown('power')) return false;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);

        if (this.input.isDown('up') && other.state === 'standing' && dist <= 85 * this.s &&
            this.moveSet.includes('kneeLift')) {
            this._doKneeLift(other);
            return 'kneeLift';
        }
        if (this.input.isDown('down') && (other.state === 'down' || other.state === 'possum') && dist <= 105 * this.s &&
            this.moveSet.includes('kneeDrop')) {
            this._doKneeDrop(other);
            return 'kneeDrop';
        }

        // Front kick — directional override (down + power) of the close strikes:
        // a planted push-kick to the belly from jab range out to a stride away.
        // Checked here, not in resolvePowerMove, for the same reason as the
        // knee lift: it reads the held direction, so no default strike can
        // shadow it.
        if (this.input.isDown('down') && (other.state === 'standing' || other.state === 'blocking') &&
            dist <= FRONT_KICK_REACH * this.s && this.moveSet.includes('frontKick')) {
            this._doFrontKick(other);
            return 'frontKick';
        }

        const move = resolvePowerMove({
            dist,
            scale:      this.s,
            otherState: other.state,
            moveSet:    this.moveSet,
        });

        switch (move) {
            case 'headbutt':  this._doHeadbutt(other);  return 'headbutt';
            case 'elbowDrop': this._doElbowDrop(other); return 'elbowDrop';
            case 'shove':     this._doShove(other);     return 'shove';
            case 'jab':       this._doJab(other);       return 'jab';
            case 'dropkick':  this._doDropkick(other);  return 'dropkick';
            default:          return false;
        }
    }

    // Run key: self-initiated run toward the rope you're facing
    tryRun() {
        if (this.state !== 'standing') return false;
        if (!this.input.justDown('run')) return false;
        const b       = ringBoundsAtY(this.y);
        const backDir = -this.facing; // run to the rope behind you, bounce back toward opponent
        this.state     = 'running';
        this.runPhase  = 'toRope';
        this.runFacing = backDir;
        this.facing    = backDir;
        this.runTarget = backDir > 0 ? b.right - 20 : b.left + 20;
        return 'run';
    }

    // Power key while returning from rope: double axe-handle if opponent is in range
    tryRunningAttack(other) {
        if (this.state !== 'running' || this.runPhase !== 'returning') return false;
        if (!this.input.justDown('power')) return false;
        if (Math.abs(other.x - this.x) > 170 * this.s) return false;
        if (this.moveSet.includes('doubleAxeHandle')) {
            this._doDoubleAxeHandle(other);
            return 'doubleAxeHandle';
        }
        return false;
    }

    // Climb turnbuckle — near corners use down (pressing into the post), far use up
    tryClimb() {
        if (this.state === 'standing') {
            const corner   = this._nearCorner();
            if (!corner) return false;
            const isNear   = corner.matY >= RING.nearLeft.y;
            const pressed  = isNear ? this.input.justDown('down') : this.input.justDown('up');
            if (!pressed) return false;
            this._corner    = corner;
            this._ropeLevel = 1;
            this.state      = 'climbing';
            this.scene.tweens.add({
                targets:  this,
                x:        corner.x,
                y:        corner.y,
                duration: 400,
                ease:     'Cubic.easeOut',
                onComplete: () => {
                    if (this.state === 'climbing') {
                        this.state  = 'onTurnbuckle';
                        this.facing = this._corner.facing;
                    }
                },
            });
            return 'climb';
        }

        // Up again from middle rope = climb to top rope (always up — going higher on the post)
        if (this.state === 'onTurnbuckle' && this._ropeLevel === 1 && this.input.justDown('up')) {
            this._ropeLevel = 2;
            this.state      = 'climbing';
            this.scene.tweens.add({
                targets:  this,
                y:        this._corner.topY,
                duration: 250,
                ease:     'Cubic.easeOut',
                onComplete: () => { if (this.state === 'climbing') this.state = 'onTurnbuckle'; },
            });
            return 'climb';
        }

        return false;
    }

    // While on turnbuckle: down/power = dive, left/right = climb down, finisher = rope taunt
    tryDive(other) {
        if (this.state !== 'onTurnbuckle') return false;
        if (this.input.justDown('finisher')) {
            this._doTurnbuckleTaunt();
            return 'turnbuckleTaunt';
        }
        if (this.input.isDown('left') || this.input.isDown('right')) {
            this._climbDown();
            return false;
        }
        if (!(this.input.justDown('down') || this.input.justDown('power'))) return false;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);

        if (this._ropeLevel === 2) {
            if (dist > 560 * this.s) return false;
            this._doTopDive(other);
            return 'topDive';
        }

        // Middle rope
        if (dist > 350 * this.s) return false;
        this._doDive(other);
        return 'dive';
    }

    _climbDown() {
        this.state      = 'climbing';
        this._ropeLevel = 0;
        this.scene.tweens.add({
            targets:  this,
            x:        this._corner.x,
            y:        this._corner.matY - 20,
            duration: 350,
            ease:     'Cubic.easeOut',
            onComplete: () => { if (this.state === 'climbing') this.state = 'standing'; },
        });
    }

    // Finisher key: sleeper hold vs nearby standing opponent; taunt when out of range
    tryFinisher(other) {
        if (this.state !== 'standing') return false;
        if (!this.input.justDown('finisher')) return false;

        const dist  = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
        const reach = 120 * this.s;

        // Block stuffs the sleeper the same as any grapple
        if (dist <= reach && other.state === 'blocking' && this.moveSet.includes('sleeperHold')) {
            this.x -= this.facing * 26 * this.s;
            this._clamp();
            this.startStagger();
            return 'grappleBlocked';
        }

        if (dist <= reach && other.state === 'standing' && this.moveSet.includes('sleeperHold')) {
            this._doSleeperHold(other);
            return 'sleeperHold';
        }

        // A submission on a man who is down. Up takes the arm bar, down the
        // ankle lock; with neither held, the first one in the kit (George's
        // figure-four, Lou's ankle lock).
        if (dist <= reach * 1.4 && (other.state === 'down' || other.state === 'possum')) {
            const has = move => this.moveSet.includes(move);
            const hold = this.input.isDown('up') && has('armBar') ? 'armBar'
                : this.input.isDown('down') && has('ankleLock') ? 'ankleLock'
                : GROUND_HOLDS.find(has);
            if (hold) {
                this[GROUND_HOLD_EXECUTORS[hold]](other);
                return hold;
            }
        }

        // Thesz press — the flying body press that lands straight into the
        // cover (Lou's original, not the mounted-punches version). A charge
        // move: launches from beyond grapple range; whiffing it (opponent
        // evades or moves mid-flight) leaves the attacker flat on the mat.
        if (dist > reach && dist <= 300 * this.s &&
            (other.state === 'standing' || other.state === 'staggered') &&
            this.moveSet.includes('theszPress')) {
            this._doTheszPress(other);
            return 'theszPress';
        }

        this._doTaunt();
        return 'taunt';
    }

    // ── Move execution ────────────────────────────────────────────────────────

    // Jab — first move on the seekable clip runtime (RIG_AND_MOVE_PIPELINE.md).
    // The clip owns choreography and the impact TIMING; gameplay below still
    // decides legality, damage, stamina, and selling. The impact marker sits at
    // the same 83ms the old delayedCall used, so the drain/sell/stagger feel is
    // unchanged. A missing runtime (unit-test construction) falls back to the
    // legacy pose-sequence + timer path so Wrestler stays usable standalone.
    _doJab(other) {
        const runtime = this.scene.moveRuntime;
        if (!runtime) { this._doJabLegacy(other); return; }
        // A fresh jab supersedes any in-flight one, so repeated presses can't
        // leave overlapping handles or stack two impacts.
        this._cancelActiveMove('rejab');
        this._activeMove = runtime.play('jab', { attacker: this }, {
            onEvent: (event) => {
                if (event.type !== 'impact') return;
                // Drain and sell fire at the authored impact frame so a
                // defender who reads the wind-up can still slip it with an evade.
                if (other.state === 'evading') {
                    this.scene._logEvent('dodge', { wrestler: other === this.scene.w1 ? 'p1' : 'p2', move: 'jab' });
                    return;
                }
                other._drain(STAMINA_DRAIN.jab);
                other._doSell('sellHead', 110, () => other.startStagger());
                this.scene.crowd?.impact?.('strike', 0.6);
            },
            onComplete: () => { this._activeMove = null; },
            onCancel:   () => { this._activeMove = null; },
        });
    }

    // Front kick — a planted push-kick on the clip runtime (clips/frontKick.js,
    // author_frontkick.mjs). The attacker first closes to (or backs off to)
    // the clip's boot-to-belly standoff, so the art connects at any legal
    // range; damage, stagger and the push-back land on the authored impact
    // frame only, and only if the target is still in reach then. The
    // push-back moves the defender, never the attacker.
    _doFrontKick(other) {
        const runtime = this.scene.moveRuntime;
        if (!runtime) return;
        this._cancelActiveMove('refrontkick');
        const facing = Math.sign(other.x - this.x) || this.facing;
        this.facing  = facing;
        const b       = ringBoundsAtY(this.y);
        const margin  = 30 * this.s;
        const clampX  = x => Math.max(b.left + margin, Math.min(b.right - margin, x));
        const standX  = clampX(other.x - facing * FRONT_KICK_STANDOFF * this.s);
        const stance  = this.scene.tweens.add({ targets: this, x: standX, duration: 200, ease: 'Sine.easeOut' });
        this._activeMove = runtime.play(frontKickClip.id, { attacker: this }, {
            onEvent: (event) => {
                if (event.type !== 'impact') return;
                if (other.state === 'evading') {
                    this.scene._logEvent('dodge', { wrestler: other === this.scene.w1 ? 'p1' : 'p2', move: 'frontKick' });
                    return;
                }
                const strikable = other.state === 'standing' || other.state === 'blocking' || other.state === 'staggered';
                if (!strikable || Math.abs(other.y - this.y) > STRIKE_DEPTH_TOLERANCE ||
                    Math.abs(other.x - this.x) > FRONT_KICK_HIT * this.s) return;
                other._hurt(STAMINA_DRAIN.frontKick, 'frontKick');
                other._doSell('sellChest', 110, () => other.startStagger());
                // The boot shoves him a step away from the attacker.
                const pushX = Math.max(b.left + margin, Math.min(b.right - margin, other.x + facing * 28 * this.s));
                this.scene.tweens.add({ targets: other, x: pushX, duration: 105, ease: 'Cubic.easeOut' });
                this.scene.crowd?.impact?.('kick', 0.7);
            },
            onComplete: () => { this._activeMove = null; },
            onCancel:   () => { stance.stop(); this._activeMove = null; },
        });
    }

    // Shove — a two-handed guard-breaker on the clip runtime (clips/shove.js,
    // author_shove.mjs). Same shape as the front kick: settle to the clip's
    // palms-to-chest standoff, land damage/stagger/push on the impact frame
    // only while the target is still in reach, and move the defender, never
    // the attacker.
    _doShove(other) {
        const runtime = this.scene.moveRuntime;
        if (!runtime) return;
        this._cancelActiveMove('reshove');
        const facing = Math.sign(other.x - this.x) || this.facing;
        this.facing  = facing;
        const b       = ringBoundsAtY(this.y);
        const margin  = 30 * this.s;
        const clampX  = x => Math.max(b.left + margin, Math.min(b.right - margin, x));
        const standX  = clampX(other.x - facing * SHOVE_STANDOFF * this.s);
        const stance  = this.scene.tweens.add({ targets: this, x: standX, duration: 150, ease: 'Sine.easeOut' });
        this._activeMove = runtime.play(shoveClip.id, { attacker: this }, {
            onEvent: (event) => {
                if (event.type !== 'impact') return;
                if (other.state === 'evading') {
                    this.scene._logEvent('dodge', { wrestler: other === this.scene.w1 ? 'p1' : 'p2', move: 'shove' });
                    return;
                }
                const strikable = other.state === 'standing' || other.state === 'blocking' || other.state === 'staggered';
                if (!strikable || Math.abs(other.y - this.y) > STRIKE_DEPTH_TOLERANCE ||
                    Math.abs(other.x - this.x) > SHOVE_HIT * this.s) return;
                other._hurt(STAMINA_DRAIN.shove, 'shove');
                other._doSell('sellChest', 110, () => other.startStagger());
                const pushX = Math.max(b.left + margin, Math.min(b.right - margin, other.x + facing * 40 * this.s));
                this.scene.tweens.add({ targets: other, x: pushX, duration: 105, ease: 'Cubic.easeOut' });
                this.scene.crowd?.impact?.('strike', 0.6);
            },
            onComplete: () => { this._activeMove = null; },
            onCancel:   () => { stance.stop(); this._activeMove = null; },
        });
    }

    _doJabLegacy(other) {
        this._runPoseSequence(MOVE_DEFS.jab.poseSeq);
        this.scene.time.delayedCall(83, () => {
            if (other.state === 'evading') {
                this.scene._logEvent('dodge', { wrestler: other === this.scene.w1 ? 'p1' : 'p2', move: 'jab' });
                return;
            }
            other._drain(STAMINA_DRAIN.jab);
            other._doSell('sellHead', 110, () => other.startStagger());
        });
    }

    _doHeadbutt(other) {
        this._runPoseSequence(MOVE_DEFS.headbutt.poseSeq);
        // Drain and sell fire when the head lunges forward (after headbuttCock)
        this.scene.time.delayedCall(117, () => {
            if (other.state === 'evading') {
                this.scene._logEvent('dodge', { wrestler: other === this.scene.w1 ? 'p1' : 'p2', move: 'headbutt' });
                return;
            }
            other._hurt(STAMINA_DRAIN.headbutt, 'headbutt');
            other._doSell('sellHead', 150, () => other.startFall());
        });
    }

    _doDoubleAxeHandle(other) {
        this.state    = 'slamming';
        this.runPhase = null;
        this.facing   = Math.sign(other.x - this.x) || this.facing;

        this._runPoseSequence(MOVE_DEFS.doubleAxeHandle.poseSeq, () => {
            if (this.state === 'slamming') this.state = 'standing';
        });

        // Drain and sell fire when arms come down (~280ms wind-up) — long
        // enough that an alert defender can sidestep the whole thing
        this.scene.time.delayedCall(280, () => {
            if (this.state !== 'slamming') return;
            if (other.state === 'evading') {
                this.scene._logEvent('dodge', { wrestler: other === this.scene.w1 ? 'p1' : 'p2', move: 'doubleAxeHandle' });
                return;
            }
            other._hurt(STAMINA_DRAIN.doubleAxeHandle, 'doubleAxeHandle');
            this.scene.cameras.main.shake(80, 0.001);
            other._doSell('sellHead', 130, () => other.startStagger());
        });
    }

    _doIrishWhip(other, dir = this.facing) {
        const b = ringBoundsAtY(other.y);

        other.state     = 'running';
        other.runPhase  = 'toRope';
        other.runFacing = dir;
        other.facing    = dir;
        other.runTarget = dir > 0 ? b.right - 20 : b.left + 20;

        this.facing = dir;

        // Sidestep toward far rope so defender passes in front
        const stepY = Math.max(RING.farLeft.y + 20, this.y - 22 * this.s);
        this.scene.tweens.add({ targets: this, y: stepY, duration: 180, ease: 'Cubic.easeOut' });

        this._runPoseSequence(MOVE_DEFS.irishWhip.poseSeq);
    }

    _drain(amount) {
        this.stamina = Math.max(0, this.stamina - amount);
    }

    // A confirmed hit from a move that can put him down: the damage, plus the
    // move's pain context (registry `sell`), sold once he is on the mat
    // (_tickSell) and carried through the rise. Only confirmed hits call
    // this, so a move that never landed is never sold. The latest hit
    // replaces the previous one. `limb` (lLeg/rLeg/lArm/rArm, anatomical)
    // overrides the registry's `sell.limb`.
    _hurt(amount, moveId, { limb } = {}) {
        this._drain(amount);
        const sell = MOVE_SPECS[moveId]?.sell;
        this._pain = {
            source: moveId,
            part: sell?.part ?? null,
            limb: limb ?? sell?.limb ?? null,
            severity: sell?.intensity ?? 0,
            // 'mat' until the rise, 'rise' during it, then 'recover' until `until`.
            phase: 'mat',
            until: null,
            planned: false, // sells planned for this trip to the mat (once per trip)
        };
    }

    // Pain context lifecycle (PLAN_MOVE_PERFORMANCE.md D3). Visual continuity
    // only: nothing here touches damage, timers or input.
    //   - A pin clears it.
    //   - Leaving the mat other than by rising (picked up into a hold or
    //     throw) after this trip's sells were planned clears it. A hit taken
    //     standing waits for his next trip down, as the sell tag always did.
    //   - 'recover' expires at `until`.
    _tickPain() {
        const pain = this._pain;
        if (!pain) return;
        const onMat = this.state === 'down' || this.state === 'possum';
        if (this.state === 'pinned'
            || (pain.phase === 'mat' && pain.planned && !onMat)
            || (pain.phase === 'recover' && this.scene.time.now >= pain.until)) {
            this._pain = null;
        }
    }

    _painRising() {
        if (this._pain) this._pain.phase = 'rise';
    }

    // On his feet: the hurt is carried for up to 2.5 s, scaled by severity.
    _painRecovering() {
        const pain = this._pain;
        if (pain?.phase !== 'rise') return;
        pain.phase = 'recover';
        pain.since = this.scene.time.now;
        pain.until = pain.since + 2500 * pain.severity;
    }

    // Protective recovery (?aftermath=v2, D4): while the hurt is carried on his
    // feet, the pose he is already in is drawn with a few offsets that favour
    // the hurt part. Applies only in the 'recover' phase, standing, with no move
    // or choreography owning the pose; any of those claims the pose and the
    // weight is 0 that frame. Returns 0..1 and touches nothing.
    _recoveryWeight() {
        const pain = this._pain;
        if (pain?.phase !== 'recover' || this.state !== 'standing' || this._choreoOwnsPose()) return 0;
        if (!aftermathCandidate()) return 0;
        const t = this.scene.time.now;
        if (t >= pain.until) return 0;
        const ramp = Math.min(1, (t - pain.since) / RECOVERY_RAMP_MS);
        const left = (pain.until - t) / (pain.until - pain.since);
        // knee limps down evenly; back settles slowly (holds, then eases out)
        return ramp * (pain.part === 'back' ? 1 - (1 - left) * (1 - left) : left);
    }

    // A COPY of the pose with the motif added, or null when there is nothing to
    // add. this.pose is never written.
    _recoveryPose() {
        const w = this._recoveryWeight();
        if (w <= 0) return null;
        const pain = this._pain;
        const pose = { ...this.pose };
        if (pain.part === 'knee') {
            pose.crouch = (pose.crouch ?? 0) + 0.05 * w;
            const hurt = pain.limb?.endsWith('Leg') ? pain.limb[0] : null; // 'l' | 'r'
            if (hurt) {
                const other = hurt === 'l' ? 'r' : 'l';
                const flex = 0.15 * w;
                // lKnee is local flex; lShin an absolute shin angle (more negative = more bent)
                if (pose[`${hurt}Knee`] !== undefined) pose[`${hurt}Knee`] += flex;
                else if (pose[`${hurt}Shin`] !== undefined) pose[`${hurt}Shin`] -= flex;
                else pose[`${hurt}Knee`] = flex;
                // the sound leg takes the weight: the hurt one steps back off it
                pose[`${hurt}Leg`] = (pose[`${hurt}Leg`] ?? 0) - 0.06 * w;
                pose[`${other}Leg`] = (pose[`${other}Leg`] ?? 0) + 0.03 * w;
            }
        } else if (pain.part === 'back') {
            pose.bend = (pose.bend ?? 0) + 0.12 * w;
        } else {
            return null; // motifs exist for the two pilots only
        }
        return pose;
    }

    clearPain() {
        this._pain = null;
    }

    _doClothesline(other) {
        other._hurt(STAMINA_DRAIN.clothesline, 'clothesline');

        // Step up into delivery position — arm extends at this Y
        const stepY = Math.max(RING.farLeft.y + 20, this.y - 18 * this.s);
        this.scene.tweens.add({ targets: this, y: stepY, duration: 100, ease: 'Cubic.easeOut' });

        this._runPoseSequence(MOVE_DEFS.clothesline.poseSeq);
        // Sell fires at impact (after clotheslineCock wind-up phase)
        this.scene.time.delayedCall(100, () => {
            other._doSell('sellChest', 150, () => other.startClotheslineFall(other.runFacing));
        });
    }

    // Lou's body slam: scooped, swung across the shoulders and slammed on his
    // back in front (author_bodyslam.mjs, sheet frames 322–328 / 120–121).
    _doBodySlam(other) {
        this._playPairedThrow(other, 'bodySlam', {
            damage: STAMINA_DRAIN.bodySlam,
            finish: () => {
                other._layOnBack(DOWN_SEC);
                this._standBackUp();
            },
        });
    }

    // Vertical suplex: hooked, stood straight up overhead, and taken over
    // backward; both land on their backs, the victim behind the attacker
    // (author_suplex.mjs, sheet frames 370–374 / 357–365).
    _doSuplex(other) {
        this._playPairedThrow(other, 'suplex', {
            damage: STAMINA_DRAIN.suplex,
            shake: [180, 0.003],
            foley: ['mat', 1.0],
            finish: () => {
                other._layOnBack(DOWN_SEC + 1.0);
                this._layOnBack(1.5);
            },
        });
    }

    _doElbowDrop(other) {
        // Wind-up: crouch + raise elbow while still upright (skeleton visible)
        this.state = 'slamming';
        this._runPoseSequence([
            { p: 'elbowCrouch', dur: 130, e: 'Cubic.easeOut' },
            { p: 'elbowRaise',  dur: 200, e: 'Cubic.easeOut' },
        ], () => {
            if (this.state !== 'slamming') return;
            // Now jump: the flight is the elbowDrop clip (sheet frames
            // 165–168, author_elbowdrop.mjs) on the rig; this moves him onto
            // the target over the same 380 ms.
            this._playFlight(elbowDropClip, { x: other.x, ease: 'Sine.easeInOut' }, () => {
                // Damage lands with the elbow, not at the wind-up, so an
                // interrupted drop costs the defender nothing (as kneeDrop).
                other._hurt(STAMINA_DRAIN.elbowDrop, 'elbowDrop');
                other.stateTimer = DOWN_SEC;
                this.scene.cameras.main.shake(130, 0.002);
                this.scene.crowd?.impact?.('mat', 0.7);
                // Show landing / recovery poses (skeleton visible again)
                this.state = 'slamming';
                this._runPoseSequence([
                    { p: 'elbowLand',   dur:  80, e: 'Cubic.easeIn'  },
                    { p: 'elbowImpact', dur: 100, e: 'Linear'        },
                    { p: 'idle',        dur: 260, e: 'Cubic.easeOut' },
                ], () => {
                    if (this.state === 'slamming') this.state = 'standing';
                });
            });
        });
    }

    // An airborne flight posed by a one-wrestler clip (elbow drop, knee drop,
    // dives): state 'elbowDropping' or 'diving' for the length of the clip
    // (stretched to `duration` ms when given), with `motion` tweened on the
    // wrestler itself — the clip never places him. `land` runs when the clip
    // ends, still in the flight state, with tilt/lift handed back to zero
    // unless the landing keeps him on the mat.
    _playFlight(clip, motion, land, { state = 'elbowDropping', duration = clip.duration * 1000 } = {}) {
        const runtime = this.scene.moveRuntime;
        this.state = state;
        let travel;
        const done = (finished) => {
            if (!finished) travel?.stop();
            this._activeMove = null;
            if (this.state !== state) return;
            if (!finished) { this._standBackUp(); return; }
            land();
        };
        this._activeMove = runtime.play(clip.id, { attacker: this }, {
            rate: clip.duration * 1000 / duration,
            onComplete: () => done(true),
            onCancel: () => done(false),
        });
        // Old clip cancellation may have restored standing. Claim the new
        // state and travel only after the previous owner has been released.
        this.state = state;
        travel = this.scene.tweens.add({ targets: this, ...motion, duration });
    }

    // Dropkick: a one-wrestler clip posed against the Royal Rumble sheet (frames
    // 224–232, tools/move-editor/author_dropkick.mjs) — crouch, tuck, both
    // feet out level, down on the back. The clip only poses him; this moves
    // him across to the target, resolves the hit on the clip's `impact`
    // (the frame the feet are out) and lays him down when it ends.
    _doDropkick(other) {
        const runtime = this.scene.moveRuntime;
        if (!runtime) return;
        this.state = 'dropkicking';
        const facing  = this.facing;
        // The attacker ends this move down at targetX — against a
        // rope-hugging victim that lands him through the rope plane, so clamp
        // with the downed-body margin (still inside the 100·s hit range)
        const b        = ringBoundsAtY(this.y);
        const m        = 60 * this.s;
        // ?dropkick=v2: the comparison candidate, posed to connect at its own
        // reach instead of passing through the chest. Hit range unchanged.
        const v2       = dropkickCandidate();
        const clip     = v2 ? dropkickV2Clip : dropkickClip;
        const reach    = v2 ? DROPKICK_V2_REACH : 35;
        const targetX  = Math.max(b.left + m, Math.min(b.right - m, other.x - facing * reach * this.s));
        const hitRange = 100 * this.s;
        const kickAt   = clip.events.find(event => event.type === 'impact').at;

        let travel;

        let landed = false;
        const lie = () => {
            this._activeMove = null;
            if (this.state !== 'dropkicking') return;
            this._layOnBack(landed ? 1.5 : 2.8);
        };
        this._activeMove = runtime.play(clip.id, { attacker: this }, {
            onEvent: (event) => {
                if (event.type !== 'impact' || this.state !== 'dropkicking') return;
                const dist = Math.abs(this.x - other.x);
                landed = dist <= hitRange &&
                         (other.state === 'standing' || other.state === 'running' || other.state === 'blocking');
                if (landed) {
                    other._hurt(STAMINA_DRAIN.dropkick, 'dropkick');
                    other._doSell('sellChest', 140, () => other.startClotheslineFall(facing));
                    this.scene.cameras.main.shake(120, 0.0015);
                    this.scene.crowd?.impact?.('kick', 0.9);
                }
            },
            onComplete: () => {
                if (!landed) this.scene.cameras.main.shake(80, 0.001);
                // His own back hitting the mat: lighter than a throw.
                this.scene.crowd?.impact?.('mat', 0.45);
                lie();
            },
            onCancel: () => { travel?.stop(); lie(); },
        });
        this.state = 'dropkicking';
        // v2 runs up into the kick when there is room for a stride; from
        // close in it starts at the gather (seek emits no skipped markers).
        const gap = Math.abs(other.x - this.x) / this.s;
        const startAt = v2 && gap < DROPKICK_V2_STRIDE_MIN_GAP ? DROPKICK_V2_GATHER_AT : 0;
        if (startAt) runtime.seek(this._activeMove, startAt);
        // Across to the target by the time the feet are out. v2 covers ground
        // at a steady run (easeIn left the stride running in place).
        travel = this.scene.tweens.add({ targets: this, x: targetX, duration: (kickAt - startAt) * 1000, ease: v2 ? 'Linear' : 'Sine.easeOut' });
    }

    // A throw played on the clip runtime, posed in the move editor against the
    // Royal Rumble sheet (tools/move-editor/author_*.mjs). The clip stages both
    // wrestlers and turns the victim over with the body tilt/lift channels;
    // this owns the gameplay: both are held for the clip, the damage lands on
    // its `impact` marker, and `finish` hands them back when it ends. An
    // interruption drops the victim with no damage and puts the attacker back
    // on his feet. Nobody is ever left tilted.
    // `foley` is the contact sound (CrowdAudio.impact); a throw hits the mat
    // by default, a submission's squeeze markers stay silent.
    _playPairedThrow(other, clipId, { damage, shake = [200, 0.003], finish, hitEvent = 'impact',
        foley = hitEvent === 'impact' ? ['mat', 0.9] : null }) {
        const runtime = this.scene.moveRuntime;
        if (!runtime) return;

        this.state       = 'holding';
        other.state      = 'holding';
        other.facing     = -this.facing; // face to face for the grab
        // Exempt from _orphanWatchdog like the hammerlock: the release is the
        // clip's end, not an Arena-tracked hold.
        this._fixedHold  = true;
        other._fixedHold = true;

        const release = (finished) => {
            this._activeMove  = null;
            other._activeMove = null;
            this._fixedHold   = false;
            other._fixedHold  = false;
            if (finished) { finish(); return; }
            if (other.state === 'holding') other._layOnBack(DOWN_SEC);
            if (this.state === 'holding') this._standBackUp();
        };

        const handle = runtime.play(clipId, { attacker: this, defender: other }, {
            onEvent: (event) => {
                if (event.type !== hitEvent) return;
                if (this.state !== 'holding' || other.state !== 'holding') return;
                other._hurt(damage, clipId);
                this.scene.cameras.main.shake(...shake);
                if (foley) this.scene.crowd?.impact?.(...foley);
            },
            onComplete: () => release(true),
            onCancel: () => release(false),
        });
        this._activeMove  = handle;
        other._activeMove = handle;
        this.state = other.state = 'holding';
        this._fixedHold = other._fixedHold = true;
    }

    // Hand a body a throw clip left lying back over to the grounded rig.
    _layOnBack(seconds) { this._layDown(seconds, 'supine'); }

    // ...or face down (prone: head toward his facing), as the piledriver's
    // forward crumple leaves him.
    _layDown(seconds, lying) {
        this.pose.tilt   = 0;
        this.pose.lift   = 0;
        this.pose.bend   = 0;
        this.state       = 'down';
        this.lying       = lying;
        this.stateTimer  = seconds;
        // Ease from the clip's last rendered body into the grounded pose
        // (Skeleton.groundedPoseFrom) instead of cutting to it.
        const points = this.skeleton?.jointAttachmentPoints;
        this._groundHandoff = points?.neck
            ? { joints: { ...JSON.parse(JSON.stringify(points)), art: this.skeleton.artPlacement() }, from: null, t0: seconds }
            : null;
    }

    _standBackUp() {
        this.pose.tilt = 0;
        this.pose.lift = 0;
        this.pose.bend = 0;
        this.state     = 'standing';
        this.tweenPose(this.idlePose ?? 'idle', 200, 'Linear');
    }

    // Hip toss (author_hiptoss.mjs, Bret's sheet 345–356): hip in, over he
    // goes, flat on his back in front. Fills the lockup + power slot for a
    // wrestler who has it, ahead of the arm drag.
    _doHipToss(other) {
        this._playPairedThrow(other, 'hipToss', {
            foley: ['mat', 0.7],
            damage: STAMINA_DRAIN.hipToss,
            finish: () => {
                other._layOnBack(DOWN_SEC);
                this._standBackUp();
            },
        });
    }

    // Mat submissions on a downed man (author_groundholds.mjs): the ankle lock
    // stands the foot up and wrenches it; the arm bar sits through and lies
    // back across the chest. Each drains on its three `squeeze` markers.
    _doAnkleLock(other) {
        this._playPairedThrow(other, 'ankleLock', {
            damage: STAMINA_DRAIN.ankleLock, hitEvent: 'squeeze', shake: [80, 0.001],
            finish: () => { other._layOnBack(DOWN_SEC); this._standBackUp(); },
        });
    }

    _doArmBar(other) {
        this._playPairedThrow(other, 'armBar', {
            damage: STAMINA_DRAIN.armBar, hitEvent: 'squeeze', shake: [80, 0.001],
            finish: () => { other._layOnBack(DOWN_SEC); this._standBackUp(); },
        });
    }

    // George's figure-four leglock, borrowed from Ric Flair's signature row
    // (author_figurefour.mjs): struts in, steps over, crosses the legs and
    // falls back into it. Each of the clip's three `squeeze` markers drains;
    // the victim is left on his back, George gets back up.
    _doFigureFour(other) {
        this._playPairedThrow(other, 'figureFour', {
            damage: STAMINA_DRAIN.figureFour,
            hitEvent: 'squeeze',
            shake: [90, 0.0012],
            finish: () => {
                other._layOnBack(DOWN_SEC);
                this._standBackUp();
            },
        });
    }

    // George's piledriver: Lou stood on his head, driven into the mat
    // (author_piledriver.mjs, sheet frames 140–153). Both end on their backs.
    _doPiledriver(other) {
        this._playPairedThrow(other, 'piledriver', {
            damage: STAMINA_DRAIN.piledriver,
            shake: [220, 0.0035],
            foley: ['mat', 1.0],
            finish: () => {
                // He crumples forward, face down (author_piledriver.mjs).
                other._layDown(DOWN_SEC + 2.0, 'prone');
                this._layOnBack(2.0);
            },
        });
    }

    _doDive(other) {
        this._divLandY   = other.y;
        // The flight is the dive clip (sheet frames 209–213, author_dive.mjs)
        // stretched to 550 ms; this flies him off the turnbuckle onto the target.
        this._playFlight(divingElbowClip, { x: other.x, y: other.y, ease: 'Sine.easeIn' }, () => {
            const dist = Math.abs(this.x - other.x);
            const hit  = dist <= 130 * this.s &&
                         (other.state === 'standing' || other.state === 'down' || other.state === 'possum' || other.state === 'staggered');
            if (hit) {
                other._hurt(STAMINA_DRAIN.divingElbow, 'divingElbow');
                if (other.state === 'down') {
                    other.stateTimer = DOWN_SEC;
                } else {
                    other._doSell('sellChest', 150, () => other.startClotheslineFall(this.facing));
                }
                this.scene.cameras.main.shake(180, 0.003);
            } else {
                this.scene.cameras.main.shake(70, 0.001);
            }
            this.pose.tilt   = 0;
            this.pose.lift   = 0;
            this.state       = 'down';
            this.lying       = 'prone';
            this.stateTimer  = 2.0;
        }, { state: 'diving', duration: 550 });
    }

    _doTopDive(other) {
        this._divLandY   = other.y;
        // The flight is the dive clip (sheet frames 209–213, author_dive.mjs)
        // stretched to 700 ms; this flies him off the turnbuckle onto the target.
        this._playFlight(topDiveClip, { x: other.x, y: other.y, ease: 'Sine.easeIn' }, () => {
            const dist = Math.abs(this.x - other.x);
            const inRange = dist <= 140 * this.s;
            if (inRange && (other.state === 'down' || other.state === 'possum')) {
                // Splash on downed opponent — maximum damage, extended down time
                other._hurt(STAMINA_DRAIN.topDive, 'topDive');
                other.stateTimer = DOWN_SEC + 2.0;
                this.scene.cameras.main.shake(260, 0.005);
            } else if (inRange && (other.state === 'standing' || other.state === 'staggered')) {
                // Flying cross-body on standing opponent — big knockdown
                other._hurt(STAMINA_DRAIN.topDive - 6, 'topDive');
                other._doSell('sellChest', 120, () => other.startClotheslineFall(this.facing));
                this.scene.cameras.main.shake(200, 0.004);
            } else {
                this.scene.cameras.main.shake(110, 0.002);
            }
            this.pose.tilt   = 0;
            this.pose.lift   = 0;
            this.state       = 'down';
            this.lying       = 'prone';
            this.stateTimer  = 3.0;
        }, { state: 'diving', duration: 700 });
    }

    _doTheszPress(other) {
        this._divLandY     = other.y; // shadow anchor, same as the dives
        // He ends this move lying on top of the opponent — clamp the landing
        // with the downed-body margin like every other flat-ending move
        const b     = ringBoundsAtY(other.y);
        const m     = 60 * this.s;
        const landX = Math.max(b.left + m, Math.min(b.right - m, other.x));

        // The flight is the theszPress clip (sheet frames 210–213,
        // author_theszpress.mjs); this flies him onto the target.
        this._playFlight(theszPressClip, { x: landX, y: other.y, ease: 'Sine.easeIn' }, () => {
            const dist = Math.abs(this.x - other.x);
            // Blocking doesn't save you from a flying body — evading does
            const hit  = dist <= 130 * this.s &&
                         (other.state === 'standing' || other.state === 'staggered' || other.state === 'blocking');
            if (hit) {
                other._hurt(STAMINA_DRAIN.theszPress, 'theszPress');
                // The press IS the cover — victim goes flat underneath
                other.x      = this.x;
                other.y      = this.y;
                other.facing = -this.facing;
                this.scene.cameras.main.shake(220, 0.004);
                this.scene.startPin(this, other);
            } else {
                // Whiffed — crash and burn, long punish window. (On a hit
                // the pin's pinHold tween brings tilt/lift back up into
                // the cover; here he goes straight to the grounded rig.)
                this.pose.tilt  = 0;
                this.pose.lift  = 0;
                this.state      = 'down';
                this.lying      = 'prone';
                this.stateTimer = 2.6;
                this.scene.cameras.main.shake(90, 0.0012);
            }
        }, { state: 'pressing' });
    }

    _doSleeperHold(other) {
        this.state  = 'holding';
        other.state = 'sleeping';
        this._runPoseSequence(MOVE_DEFS.sleeperHold.poseSeq);
        other.tweenPose('sleeping', 300, 'Linear');
    }

    _doHeadlock(other) {
        this.state   = 'holding';
        other.state  = 'headlocked';
        other.facing = this.facing; // both face same direction — side headlock, not a clinch
        this._runPoseSequence(MOVE_DEFS.headlock.poseSeq);
        other.tweenPose('headlocked', 250, 'Cubic.easeOut');
    }

    _doArmDrag(other) {
        other._hurt(STAMINA_DRAIN.armDrag, 'armDrag');
        this._runPoseSequence(MOVE_DEFS.armDrag.poseSeq);
        this.scene.time.delayedCall(90, () => {
            other._doSell('sellChest', 110, () => other.startClotheslineFall(this.facing));
        });
    }

    // ── Four-move blueprint (Codex, 2026-07-24; approved by Derek) ─────────────
    // See AI_HANDOFF_ENTRIES/2026-07-24-codex-four-move-blueprint.md for the
    // full spec each of these four implements.

    // Behind-the-back arm lock. Triggered from Arena._tickLockup (finisher
    // key, attacker-only) — no range test here, the lockup already
    // established validity. Fixed-duration working hold, not a KO/escape loop.
    //
    // First PAIRED move on the seekable clip runtime (RIG_AND_MOVE_PIPELINE.md
    // migration step 2). The clip owns the synchronized attacker/defender
    // choreography AND the event TIMING; gameplay below still owns staging,
    // damage, stamina, state, and the character-specific recovery. The two old
    // delayedCalls (drain @300ms, release @1400ms) are gone — those beats are
    // now the clip's apply-drain / release-contact markers, at the same times.
    // A missing runtime never happens in production (Arena always builds one);
    // there is intentionally no legacy timing fallback for the paired path.
    _doHammerlock(other) {
        const runtime = this.scene.moveRuntime;
        if (!runtime) return;

        this.state       = 'holding';
        other.state      = 'holding';
        other.facing     = this.facing;
        // _fixedHold exempts this working hold from _orphanWatchdog's 0.6s grace
        // (its release is a clip marker, not an Arena-tracked hold-state).
        // releaseHold clears it on completion OR interruption.
        this._fixedHold  = true;
        other._fixedHold = true;
        this._drain(3); // attacker commitment cost

        // Staging is the CLIP's now, not the executor's. It used to be built
        // here as two ring-clamped Phaser tweens toward `sx + facing*30*s`;
        // those same offsets are authored as transform channels on the clip
        // (HAMMERLOCK_STAGING), so the tableau can be composed, previewed and
        // re-measured in tools/move-editor instead of living in gameplay code.
        //
        // Clip staging and executor staging are mutually exclusive by
        // construction — a clip that authors transform captures a staging frame
        // and owns position; one that does not leaves position alone (see
        // src/animation/clipStaging.js's OWNERSHIP note) — so there is nothing
        // to coordinate here and no way for two owners to fight. Ring bounds
        // are still honoured: Wrestler._applyStagedTransform clamps every
        // placed frame, which is strictly more than the old code's clamp of the
        // two tween TARGETS.
        //
        // Facing is set above, BEFORE play(): the staging frame captures it, so
        // the tableau mirrors as one rigid unit.

        // 220ms settle to a wrestler's OWN idle (Lou's theszIdle vs George's
        // powerIdle) — executor-owned so the shared clip never bakes in a
        // character pose.
        const recoverToIdle = wrestler => wrestler.tweenPose(wrestler.idlePose, 220, 'Linear');

        // Shared teardown for BOTH the natural release and any interruption
        // (either wrestler claiming a pose, cancelTarget, or Scene shutdown).
        // Clears the paired handles FIRST so the recovery tweens can't re-enter
        // cancellation, frees the fixed-hold, releases the logical hold (states
        // back to a legal standing), and — only on a clean finish — settles each
        // wrestler to its CONFIGURED idle. Idempotent: onComplete and onCancel
        // each fire at most once and never both (MoveRuntime guarantees it).
        const releaseHold = (recover, handle) => {
            this._activeMove  = null;
            other._activeMove = null;
            this._fixedHold   = false;
            other._fixedHold  = false;
            // Nothing to stop on cancellation any more: the clip placed both
            // actors absolutely on every frame it owned, so the frame after the
            // handle dies is simply the last frame it wrote. There is no
            // in-flight tween left to keep sliding a wrestler toward an
            // abandoned stance — the class of bug the retained tween handles
            // existed to fix cannot occur.
            if (this.state === 'holding')  this.state  = 'standing';
            if (other.state === 'holding') other.state = 'standing';
            if (recover) {
                // Safe here: _activeMove is already null above, so tweenPose's
                // pose-override cancel is a no-op.
                recoverToIdle(this);
                recoverToIdle(other);
            } else if (handle?.reason === 'pose-override') {
                // One bound actor claimed a brand-new pose, which is what tore
                // the shared hold down. That actor (the initiator) already has
                // its newly requested pose/tween in flight — leave it alone.
                // Its partner has no idea the hold just ended and is otherwise
                // left visually stranded, sampled mid-clip; give it a short
                // recovery toward its OWN idle. Never fires during shutdown
                // (reason there is 'shutdown', not 'pose-override').
                const initiator = handle.cancelMeta?.initiator;
                const partner = initiator === this ? other : initiator === other ? this : null;
                partner && recoverToIdle(partner);
            }
        };

        const handle = runtime.play('hammerlock', { attacker: this, defender: other }, {
            onEvent: (event) => {
                if (event.type === 'apply-drain') {
                    // First crank drain (was delayedCall(300)). Guarded so a hold
                    // already released or cancelled can never still drain.
                    if (this.state === 'holding' && other.state === 'holding') {
                        other._hurt(STAMINA_DRAIN.hammerlock, 'hammerlock');
                    }
                } else if (event.type === 'release-contact') {
                    // Release drain (was the delayedCall(1400)'s +4). Reached only
                    // on natural completion — a move cancelled before 1.4s never
                    // crosses this marker, so an interrupted hold deals no release
                    // damage. onComplete's releaseHold(true) runs right after.
                    other._drain(4);
                }
                // acquire-contact is the choreographic catch frame; the physical
                // grab is the holding state set synchronously above, so there is
                // no separate gameplay effect to run here (deliberately not a
                // general contact-constraint system).
            },
            onComplete: () => releaseHold(true),
            onCancel:   handle => releaseHold(false, handle),
        });
        // Bind the SAME handle to both actors: either one claiming a new pose or
        // state cancels the paired move and releaseHold cleans up both.
        this._activeMove  = handle;
        other._activeMove = handle;
        this.state = other.state = 'holding';
        this._fixedHold = other._fixedHold = true;
    }

    // Rising knee lift — planted close-range strike; creates stagger, not an
    // automatic knockdown. Directional override of the point-blank jab.
    _doKneeLift(other) {
        this.state  = 'slamming'; // generic "attacker mid-move" — input-locked until the sequence completes
        this.facing = Math.sign(other.x - this.x) || this.facing;
        this._drain(3); // attacker cost
        this._runPoseSequence(MOVE_DEFS.kneeLift.poseSeq, () => {
            if (this.state === 'slamming') this.state = 'standing';
        });

        // Contact at 190ms — when kneeLiftImpact begins (load 100 + chamber 90)
        this.scene.time.delayedCall(190, () => {
            if (this.state !== 'slamming') return;
            if (other.state === 'evading') {
                this.scene._logEvent('dodge', { wrestler: other === this.scene.w1 ? 'p1' : 'p2', move: 'kneeLift' });
                return;
            }
            other._hurt(STAMINA_DRAIN.kneeLift, 'kneeLift');
            other._doSell('sellChest', 140, () => other.startStagger());
        });
    }

    // Back body drop — the defensive answer to a returning runner. Directional
    // override of the returning-runner clothesline (tryAction).
    _doBackBodyDrop(other) {
        other._hurt(STAMINA_DRAIN.backBodyDrop, 'backBodyDrop');
        this.state  = 'slamming';
        other.state = 'selling'; // halts the run; blocks other's input/movement like any sell
        this._drain(4); // attacker cost
        const runDir  = other.runFacing;
        const centerX = this.x;
        const targetY = this.y + 10 * this.s;

        this._runPoseSequence(MOVE_DEFS.backBodyDrop.poseSeq, () => {
            if (this.state === 'slamming') this.state = 'standing';
        });

        // Bring the defender to the attacker's centerline over the brace+dip
        // phases (230ms), then launch — reusing the clothesline/dropkick flip
        // machinery with a bigger arc and further travel than a clothesline.
        this.scene.tweens.add({
            targets:  other,
            x:        centerX,
            y:        targetY,
            duration: 230,
            ease:     'Cubic.easeOut',
            onComplete: () => {
                if (other.state !== 'selling') return;
                other.startClotheslineFall(runDir, { travelDist: 90, arcHeight: 130 });
            },
        });
    }

    // Knee drop — measured drop onto a grounded opponent. Directional override
    // of the elbow drop. Flies through the same _playFlight plumbing
    // (state elbowDropping) with its own short hop clip and an offset
    // landing spot.
    _doKneeDrop(other) {
        this.state  = 'slamming';
        this.facing = Math.sign(other.x - this.x) || this.facing;
        this._drain(4); // attacker cost

        this._runPoseSequence([
            { p: 'kneeDropSet', dur: 120, e: 'Cubic.easeOut' },
        ], () => {
            if (this.state !== 'slamming') return;
            // Settle beside the opponent rather than directly on top, on
            // whichever side the attacker jumped in from.
            const approachDir = Math.sign(this.x - other.x) || this.facing;
            const landX       = other.x + approachDir * 30 * this.s;

            // The 230 ms hop is the kneeDrop clip: leap → tuck, 38 units up.
            this._playFlight(kneeDropClip, { x: landX, ease: 'Sine.easeInOut' }, () => {
                this.state         = 'slamming';
                this.scene.cameras.main.shake(110, 0.0018);
                this.scene.crowd?.impact?.('mat', 0.6);
                // Contact at 350ms total (120 set + 230 airborne) — the
                // defender stays in its existing grounded draw state, no
                // pose change, no down-timer restart.
                other._hurt(STAMINA_DRAIN.kneeDrop, 'kneeDrop');
                this._runPoseSequence([
                    { p: 'kneeDropLand', dur: 120, e: 'Linear' },
                    { p: this.idlePose,  dur: 220, e: 'Cubic.easeOut' },
                ], () => {
                    if (this.state === 'slamming') this.state = 'standing';
                });
            });
        });
    }

    tryHeadlockEscape() {
        if (this.state !== 'headlocked') return false;
        if (!this.input.justDown('action')) return false;
        // Fresh = wriggle right out; worn down = the hold starts to stick
        const chance = this.stamina >= 35 ? 1 : Math.max(0.15, this.stamina / 35);
        return Math.random() < chance;
    }

    tryKickout() {
        if (this.state !== 'pinned') return false;
        if (!this.input.justDown('action')) return false;
        // Stamina above floor = guaranteed escape; below floor = random chance
        const chance = this.stamina <= KICKOUT_FLOOR
            ? this.stamina / KICKOUT_FLOOR * 0.4   // 0–40% when exhausted
            : 1;
        return Math.random() < chance;
    }

    tryEscape() {
        if (this.state !== 'sleeping') return false;
        if (!this.input.justDown('action')) return false;
        // The sleeper is an attrition finisher: trivial to shrug off fresh,
        // genuinely dangerous once you're drained below half stamina.
        const chance = this.stamina >= 50 ? 1 : Math.max(0.05, this.stamina / 50 * 0.7);
        return Math.random() < chance;
    }

    _doTurnbuckleTaunt() {
        this.state = 'taunting';
        this._runPoseSequence(MOVE_DEFS.turnbuckleTaunt.poseSeq, () => {
            if (this.state === 'taunting') this.state = 'onTurnbuckle';
        });
    }

    _doTaunt() {
        this.state = 'taunting';
        // A hurt heel doesn't preen, he begs: hands up, "no, no", shaking.
        if (this.begsOff && this.stamina < BEG_STAMINA) {
            this._runPoseSequence([
                { p: 'begPlead', dur: 160, e: 'Cubic.easeOut' },
                { p: 'begShake', dur: 130, e: 'Sine.easeInOut' },
                { p: 'begPlead', dur: 130, e: 'Sine.easeInOut' },
                { p: 'begShake', dur: 130, e: 'Sine.easeInOut' },
                { p: 'begPlead', dur: 130, e: 'Sine.easeInOut' },
                { p: 'begShake', dur: 130, e: 'Sine.easeInOut' },
                { p: this.idlePose ?? 'idle', dur: 300, e: 'Linear' },
            ], () => {
                if (this.state === 'taunting') this.state = 'standing';
            });
            return;
        }
        // Flair's strut: four hunched, stalking steps forward.
        if (this.struts) {
            const steps = ['strutLeft', 'strutRight', 'strutLeft', 'strutRight'];
            const b = ringBoundsAtY(this.y);
            const toX = Math.max(b.left + 20, Math.min(b.right - 20, this.x + this.facing * 48 * this.s));
            this.scene.tweens.add({ targets: this, x: toX, duration: 4 * 200, ease: 'Linear' });
            this._runPoseSequence([
                ...steps.map((p, i) => ({ p, dur: 200, e: i ? 'Sine.easeInOut' : 'Cubic.easeOut' })),
                { p: this.idlePose ?? 'idle', dur: 300, e: 'Linear' },
            ], () => {
                if (this.state === 'taunting') this.state = 'standing';
            });
            return;
        }
        const tauntSeq = MOVE_DEFS.taunt.poseSeq.map(step =>
            step.p === 'tauntArmsWide' ? { ...step, p: this.tauntPose } : step
        );
        this._runPoseSequence(tauntSeq, () => {
            if (this.state === 'taunting') this.state = 'standing';
        });
    }

    _doSell(poseName, duration, onDone) {
        // Sells arrive on delayed callbacks (synced to the attacker's impact
        // frame), so by the time one fires this wrestler may have started a
        // two-body move. Interrupting those strands the partner in 'grabbed'/
        // 'pinned' with no ticker to free them — no-sell instead.
        if (UNSELLABLE_STATES.has(this.state)) return;
        this.state = 'selling';
        this.tweenPose(poseName, duration, 'Cubic.easeOut', () => {
            onDone();
        });
    }

    // The normal rise: flat → sit up → all fours → standing, drawn by the
    // skeleton's grounded keyposes. A worn wrestler takes visibly longer to
    // peel himself off the mat — the get-up itself sells the damage.
    _startRiseUp() {
        this.state = 'gettingUp';
        this._sell = null;
        this._painRising();
        this.riseT = 0;
        const hurt = Math.max(0, 1 - this.stamina / 100);
        this.scene.tweens.add({
            targets:  this,
            riseT:    1,
            duration: 850 + 750 * hurt,
            ease:     'Sine.easeInOut',
            onComplete: () => {
                if (this.state === 'gettingUp') {
                    this.state = 'standing';
                    this._painRecovering();
                    this.tweenPose('idle', 150, 'Linear');
                }
            },
        });
    }

    _startQuickRise() {
        this.state        = 'risingUp';
        this._sell = null;
        this._painRising();
        this._fallVariant = this.lying === 'prone' ? 'forward' : 'backward';
        this.fallProgress = 1;
        this.scene.tweens.add({
            targets:      this,
            fallProgress: 0,
            duration:     160,
            ease:         'Cubic.easeOut',
            onComplete:   () => {
                if (this.state === 'risingUp') {
                    this.state = 'standing';
                    this._painRecovering();
                    this.tweenPose('idle', 120, 'Linear');
                }
            },
        });
    }

    // A stagger is one of STAGGER_TYPES (src/animation/staggers.js), chosen by how
    // hurt he is: rock, stumble, reel, buckle, out on his feet. Each is its own
    // movement, with real backward steps and a torso that reels (`bend`).
    startStagger() {
        this.state = 'staggered';
        const type = staggerFor(this.stamina);
        this.stateTimer = type.seconds;
        this._staggerType = type.id;
        this._runStaggerSteps(type.steps);
    }

    // Plays pose steps and, on each, the backward travel that goes with it. Travel
    // stops the moment he is no longer staggered (hit again, grabbed, dropped).
    _runStaggerSteps(steps) {
        const [head, ...rest] = steps;
        if (!head) return;
        this.tweenPose(head.pose, head.dur, head.e, () => {
            if (this.state === 'staggered') this._runStaggerSteps(rest);
        });
        const total = steps.reduce((ms, st) => ms + st.dur, 0);
        this._choreoUntil = this.scene.time.now + total;
        if (!head.dx) return;
        const b = ringBoundsAtY(this.y);
        const m = 40 * this.s;
        const x = Phaser.Math.Clamp(this.x - this.facing * head.dx * this.s, b.left + m, b.right - m);
        this.scene.tweens.add({
            targets: this, x, duration: head.dur, ease: 'Sine.easeOut',
            onUpdate: (tw) => { if (this.state !== 'staggered') tw.stop(); },
        });
    }

    // `fall` is a direction ('backward' / 'forward', a random variant of it,
    // see Skeleton.FALL_VARIANTS) or one Skeleton.FALLS variant by name.
    startFall(downTime = DOWN_SEC, fall = 'backward') {
        const variants = Skeleton.FALL_VARIANTS[fall];
        const variant  = variants ? variants[Math.floor(Math.random() * variants.length)] : fall;
        const spec     = Skeleton.FALLS[variant];
        if (!spec) throw new RangeError(`unknown fall "${fall}"`);
        this.state        = 'falling';
        this.fallProgress = 0;
        this._fallVariant = variant;
        this.lying        = spec.lands;
        this.scene.tweens.add({
            targets:      this,
            fallProgress: 1,
            duration:     spec.duration,
            ease:         'Sine.easeIn',
            onComplete: () => {
                this.state        = 'down';
                this.stateTimer   = downTime;
                this.fallProgress = 0;
                this.scene.cameras.main.shake(100, 0.0015);
            },
        });
    }

    // travelDist/arcHeight are unscaled (× this.s internally), defaulting to
    // the original clothesline numbers so every existing caller is
    // byte-identical. backBodyDrop overrides both for a bigger throw arc —
    // see _doBackBodyDrop.
    startClotheslineFall(runFacing, { travelDist = 80, arcHeight = 85 } = {}) {
        this.state         = 'flipping';
        this.flipProgress  = 0;
        this.flipDir       = runFacing;
        // Lands on his back with the head toward -runFacing, as before; on the
        // back the head lies away from facing, so facing is runFacing.
        this.facing        = runFacing;
        this.lying         = 'supine';
        this._fallVariant  = 'flip';
        this._flipArcHeight = arcHeight;
        // Downed bodies draw ~200·s wide, so the landing spot needs a wider
        // clamp margin than the standing 20px or head/boots hang through the
        // rope plane (measured down bodies at x=892, ~70px outside).
        const downMargin = 60 * this.s;
        const b          = ringBoundsAtY(this.y);
        const landX      = Math.max(b.left + downMargin,
                           Math.min(b.right - downMargin, this.x + runFacing * travelDist * this.s));

        this.scene.tweens.add({
            targets:      this,
            flipProgress: 1,
            x:            landX,
            duration:     380,
            ease:         'Cubic.easeOut',
            onComplete: () => {
                this.state        = 'down';
                this.stateTimer   = DOWN_SEC;
                this.flipProgress = 0;
                this.scene.cameras.main.shake(150, 0.002);
            },
        });
    }

    // ── Drawing ───────────────────────────────────────────────────────────────

    draw() {
        const { x, y, facing, state, skinCol, trunksCol } = this;
        // On ropes, size is locked to the corner's mat depth — climbing up the post
        // doesn't move the wrestler deeper into the ring. Also applies during rope taunts.
        const onRopes = (state === 'climbing' || state === 'onTurnbuckle' || (state === 'taunting' && this._ropeLevel > 0)) && this._corner;
        // heightScale folded in here only — every draw()-local use of `s`
        // below (skeleton render, fallback gfx shapes, shadow) picks it up
        // uniformly; `this.s` itself (movement/reach/hit-detection) is untouched.
        const s = (onRopes ? perspectiveScale(this._corner.matY) : this.s) * this._heightScale;
        const gfx   = this.gfx;
        // Depth from ring position, not screen y — a climbing wrestler's y is
        // tweened up the post but his depth in the ring doesn't change.
        const depth = 12 + (onRopes ? this._corner.matY : y) * 0.03;
        gfx.clear();
        gfx.setDepth(depth);
        this.skeleton.setDepth(depth);
        this.skeleton.invalidatePoseChannels();
        this.skeleton.setVisible(false); // shown only for upright states below

        if (state === 'falling' || state === 'risingUp') {
            const p = this.fallProgress;
            gfx.fillStyle(0x000000, 0.22);
            gfx.fillEllipse(x, y, (120 + p * 60) * s, 36 * s);
            this.skeleton.setVisible(true);
            this.skeleton.updateFall(x, y, s, facing, this._fallVariant, p);
            return;
        }

        if (state === 'gettingUp') {
            // Shadow shrinks as the body gathers itself off the mat
            gfx.fillStyle(0x000000, 0.22);
            gfx.fillEllipse(x, y, (170 - this.riseT * 60) * s, 36 * s);
            this.skeleton.setVisible(true);
            this.skeleton.updateGetUp(x, y, s, facing, this.riseT, this.lying);
            return;
        }

        if (state === 'flipping') {
            const arc = Math.sin(this.flipProgress * Math.PI); // 0 → 1 → 0
            gfx.fillStyle(0x000000, 0.22 + arc * 0.10);
            gfx.fillEllipse(x, y, (120 + arc * 55) * s, (36 + arc * 10) * s);
            this.skeleton.setVisible(true);
            this.skeleton.updateFall(x, y - arc * (this._flipArcHeight ?? 85) * s, s, facing, 'flip', this.flipProgress);
            return;
        }

        if (state === 'elbowDropping' || state === 'diving' || state === 'pressing') {
            // Flights posed by one-wrestler clips (_playFlight). The dives' and
            // press's shadow stays on the landing spot while he flies in.
            const shadowY = state === 'elbowDropping' ? y : this._divLandY;
            gfx.fillStyle(0x000000, 0.22);
            gfx.fillEllipse(x, shadowY, 130 * s, 36 * s);
            this.skeleton.setVisible(true);
            this.skeleton.updateUpright(x, y, s, facing, this.pose, 0, 0, facing * (this.pose.lean ?? 0), 0, 0.5, 0);
            return;
        }



        const shadowY = onRopes ? this._corner.matY : y;
        gfx.fillStyle(0x000000, 0.22);
        gfx.fillEllipse(x, shadowY, 120 * s, 36 * s);

        // Lying on the mat now renders through the modular rig instead of
        // _drawFlat's primitives, so these states carry real joints, bindings
        // and parts — and share their pose object with the get-up's first
        // keyframe, so rising no longer cuts from rectangles to a skeleton.
        if (state === 'down' || state === 'pinned' || state === 'possum') {
            this.skeleton.setVisible(true);
            // Lies however he landed (this.lying; Arena.startPin turns a pinned
            // wrestler onto his back). Supine is the prone pose rotated the
            // other way, never reflected (see Skeleton.GROUNDED_SUPINE).
            const handoff = this._groundHandoff;
            if (handoff && state === 'down') {
                handoff.lying ??= this.lying;
                handoff.from ??= Skeleton.groundedPoseFrom(handoff.joints, x, y, s, facing, Skeleton.GROUNDED_POSES[handoff.lying]);
                // Game time (stateTimer counts down in scaled dt), so slow
                // motion and pauses stretch the blend with everything else.
                const u = (handoff.t0 - this.stateTimer) / GROUND_HANDOFF_SEC;
                if (handoff.from && u < 1 && handoff.lying === this.lying) {
                    this.skeleton.updateGroundedBlend(x, y, s, facing, this.lying, handoff.from, u);
                    return;
                }
                this._groundHandoff = null;
            } else if (handoff) {
                this._groundHandoff = null;
            }
            const sold = state === 'down' ? this._sellPose() : null;
            if (sold) {
                this.skeleton.updateGroundedReach(x, y, s, facing, sold.g, sold.reach);
                return;
            }
            this.skeleton.updateGrounded(x, y, s, facing, this.lying);
            return;
        }

        this.skeleton.setVisible(true);
        // Body bob is no longer bolted on here — it emerges from the gait leg geometry
        // inside the skeleton (hip rides the weight-bearing leg). Just pass moveBlend.
        // Movement lean plus the pose's own torso pitch (both facing-relative),
        // plus a slow drunken sway once stamina sinks below 35 — hurt wrestlers
        // visibly wobble on their feet even between staggers
        const hurt  = Math.max(0, 1 - this.stamina / 35);
        const wooze = hurt > 0 && (state === 'standing' || state === 'staggered')
            ? Math.sin(this.scene.time.now * 0.0021 + (this._woozeSeed ??= Math.random() * Math.PI * 2)) * 0.11 * hurt
            : 0;
        // Walking can leave moveBlend and walkPhase frozen when a move takes
        // over: move() returns early outside standing. Never let that stale
        // gait replace a held wrestler's authored knees or swing their arms.
        const choreography = this._choreoOwnsPose();
        const locomotion = !choreography && (state === 'standing' || state === 'running');
        const gaitBlend = locomotion ? this.moveBlend : 0;
        const gaitPhase = locomotion ? this.walkPhase : 0;
        const lean      = this.facing * (0.07 * gaitBlend + (this.pose.lean ?? 0)) + wooze;
        const liftScale = state === 'running' ? 1.0 : 0.5;
        const runBlend  = state === 'running' ? gaitBlend : 0;
        // Choreography outranks the combat-ready guard — see _choreoOwnsPose().
        const guard = choreography ? 0 : this.combatBlend;
        // ?aftermath=v2: favour the hurt part on a copy of the pose (null otherwise).
        this.skeleton.updateUpright(x, y, s, facing, this._recoveryPose() ?? this.pose, gaitPhase, guard, lean, gaitBlend, liftScale, runBlend);
        if (this._activeMove && this._floorContacts) {
            const turn = (this.pose.tilt ?? 0) + (this.pose.bend ?? 0);
            for (const { point, w } of this._floorContacts) this.skeleton.holdOnFloor(point, y, s, w, turn);
        }
    }

    _nearCorner() {
        const corners = [
            { x: RING.nearLeft.x,  y: RING.ropes[1].nearY, topY: RING.ropes[2].nearY, matY: RING.nearLeft.y,  facing:  1 },
            { x: RING.nearRight.x, y: RING.ropes[1].nearY, topY: RING.ropes[2].nearY, matY: RING.nearRight.y, facing: -1 },
            { x: RING.farLeft.x,   y: RING.ropes[1].farY,  topY: RING.ropes[2].farY,  matY: RING.farLeft.y,   facing:  1 },
            { x: RING.farRight.x,  y: RING.ropes[1].farY,  topY: RING.ropes[2].farY,  matY: RING.farRight.y,  facing: -1 },
        ];
        const b = ringBoundsAtY(this.y);
        for (const c of corners) {
            const edgeX = c.facing > 0 ? b.left : b.right;
            if (Math.abs(this.x - edgeX) < 35 && Math.abs(this.y - c.matY) < 40) return c;
        }
        return null;
    }

    _clamp() {
        const margin = 20;
        // Depth margin is tighter than the side margin so a body at the near
        // or far wall stands AT that rope's plane. At 20px the near rope sat
        // in front of him and the far rope behind, so the top rope crossed
        // at the chest near the camera and at the nose at the back (Derek,
        // 2026-10-08). Presses still reach full contact (press() saturates
        // at 20px).
        const marginY = 6;
        this.y = Math.max(RING.farLeft.y + marginY, Math.min(RING.nearLeft.y - marginY, this.y));
        const b = ringBoundsAtY(this.y);
        this.x = Math.max(b.left + margin, Math.min(b.right - margin, this.x));
    }
}
