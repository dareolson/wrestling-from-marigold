import { RING, ringBoundsAtY, perspectiveScale } from './constants.js';
import Skeleton, { GAIT } from './Skeleton.js';

const SPEED      = 140;
const RUN_SPEED  = 340;
const DOWN_SEC   = 4.5;
// Derived so a planted foot stays world-locked (no skating) — see Skeleton GAIT.
const WALK_FREQ  = GAIT.WALK_FREQ; // radians per unscaled pixel of travel

// ─── Stamina ─────────────────────────────────────────────────────────────────
const STAMINA_MAX      = 100;
const STAMINA_RECOVER  = 6;   // per second while standing
const STAMINA_DRAIN    = {    // drained from the DEFENDER on each move landing
    jab:          5,
    headbutt:     8,
    clothesline:  12,
    bodySlam:     22,
    piledriver:   30,
    dropkick:     14,
    elbowDrop:         10,
    doubleAxeHandle:   12,
    sleeperHold:       18, // total drained if hold runs full duration
    headlock:         3.0, // per second (applied in Arena._tickHeadlock)
    armDrag:          14,
    suplex:            20,
    divingElbow:       18,
    topDive:           28,
};
// Kick-out chance: 100% at full stamina, 0% at or below this threshold
const KICKOUT_FLOOR = 15;

// ─── Pose library ────────────────────────────────────────────────────────────
// Angles are facing-relative: positive = toward facing direction.
// Walk cycle blends additively on top; idle = all zeros lets the walk cycle
// run freely with no bias.
export const POSES = {
    idle:        { lLeg: 0,     rLeg: 0,     lArm: 0,     rArm: 0     },
    grapple:     { lLeg: 0.12,  rLeg:-0.08,  lArm: 0.50,  rArm: 0.18  },
    slamHold:    { lLeg: 0.20,  rLeg:-0.22,  lArm: 2.80,  rArm: 2.80  }, // arms straight overhead, wide stance
    slamThrow:   { lLeg: 0.50,  rLeg:-0.28,  lArm: 1.30,  rArm: 1.00  }, // follow-through as opponent is driven down
    whipRelease: { lLeg: 0.22,  rLeg: 0.12,  lArm: 0.88,  rArm: 0.30  },
    clothesline: { lLeg:-0.15,  rLeg: 0.38,  lArm: 1.18,  rArm:-0.28  },
    pinHold:     { lLeg: 0.28,  rLeg: 0.28,  lArm: 0.30,  rArm:-0.30  },
    elbowRaise:  { lLeg: 0.10,  rLeg: 0.05,  lArm:-1.40,  rArm: 0.15  },
    elbowImpact: { lLeg: 0.08,  rLeg: 0.06,  lArm:-0.08,  rArm: 0.08  },
    dropkick:    { lLeg: 0.80,  rLeg: 0.65,  lArm:-0.50,  rArm:-0.50  },
    stumble:     { lLeg: 0.24,  rLeg:-0.20,  lArm:-0.55,  rArm: 0.55  }, // landing recovery — arms wide for balance
    sleeperHold: { lLeg: 0.08,  rLeg:-0.05,  lArm: 1.40,  rArm: 0.30  },
    sleeping:    { lLeg:-0.08,  rLeg:-0.04,  lArm:-0.50,  rArm:-0.45  },
    pileSit:        { lLeg: 0.55,  rLeg: 0.50,  lArm:-0.20,  rArm:-0.16  }, // seated after piledriver — legs spread forward, arms low at sides
    stagger:        { lLeg:-0.14,  rLeg: 0.12,  lArm: 0.22,  rArm: 0.18  }, // mild — slight lurch, arms loose
    staggerMed:     { lLeg:-0.24,  rLeg: 0.20,  lArm: 0.55,  rArm: 0.45  }, // hurting — deeper stumble, arms flailing
    staggerHeavy:   { lLeg:-0.34,  rLeg: 0.28,  lArm: 0.90,  rArm: 0.72  }, // badly hurt — near-buckle, arms way out
    staggerCollapse:{ lLeg:-0.42,  rLeg: 0.36,  lArm: 1.18,  rArm: 0.96  }, // critical — knees nearly giving, arms thrown wide
    staggerBack:    { lLeg: 0.20,  rLeg:-0.16,  lArm:-0.38,  rArm:-0.30  }, // counter-sway — reeling back the other way
    jab:            { lLeg: 0.18,  rLeg:-0.12,  lArm: 1.00,  rArm:-0.35  }, // near arm punches forward, far arm pulls back
    headbutt:       { lLeg: 0.38,  rLeg: 0.15,  lArm: 0.30,  rArm: 0.25  }, // whole body lunges forward, head leads
    sellChest:      { lLeg:-0.10,  rLeg: 0.08,  lArm:-0.90,  rArm:-0.82  }, // chest impact — both arms whip back violently
    sellHead:       { lLeg: 0.06,  rLeg: 0.06,  lArm: 0.65,  rArm: 0.55  }, // head strike — hands fly up toward face
    brawlerIdle:    { lLeg: 0.06,  rLeg:-0.04,  lArm: 0.28,  rArm: 0.18  }, // guard stance — weight forward, fists up
    powerIdle:      { lLeg: 0.10,  rLeg:-0.09,  lArm: 0.10,  rArm: 0.07  }, // wide, imposing — arms hanging low
    tauntArmsWide:  { lLeg: 0.22,  rLeg:-0.20,  lArm: 2.20,  rArm: 2.00  }, // arms raised wide above shoulder, legs spread
    ropeOneTaunt:   { lLeg: 0.08,  rLeg:-0.06,  lArm: 1.80,  rArm:-1.80  }, // one arm raised to crowd, other grips rope
    axeHandleUp:    { lLeg: 0.08,  rLeg: 0.12,  lArm: 2.70,  rArm: 3.10  }, // arms raised overhead — near arm slightly forward, far arm slightly back, peak above head
    axeHandleDown:  { lLeg: 0.30,  rLeg: 0.18,  lArm: 1.20,  rArm: 1.15  }, // whole body lurching forward, arms smashing down at ~40° below horizontal
    axeHandleImpact:{ lLeg: 0.34,  rLeg: 0.24,  lArm: 0.70,  rArm: 0.65  }, // arms at impact depth, body weight fully dropped
    axeHandleFollow:{ lLeg: 0.38,  rLeg: 0.28,  lArm: 0.38,  rArm: 0.35  }, // momentum carries arms past, hunched over
    lockup:         { lLeg: 0.18,  rLeg:-0.12,  lArm: 1.57,  rArm: 1.57  }, // arms fully horizontal at shoulder level, wide stance — collar-and-elbow tie-up
    // ── Strike wind-up / recoil ───────────────────────────────────────────────
    jabCock:        { lLeg: 0.12,  rLeg:-0.10,  lArm:-0.55,  rArm: 0.26  }, // punch loaded back, guard hand high
    jabRecoil:      { lLeg: 0.14,  rLeg:-0.09,  lArm: 0.82,  rArm:-0.10  }, // arm bounces slightly after contact, guard drops
    headbuttCock:   { lLeg: 0.14,  rLeg:-0.12,  lArm: 0.32,  rArm: 0.28  }, // body coiling back, head tilted
    headbuttRecoil: { lLeg: 0.22,  rLeg: 0.18,  lArm: 0.42,  rArm: 0.38  }, // rocking back after impact, arms flying out
    // ── Running attack phases ─────────────────────────────────────────────────
    clotheslineCock:{ lLeg:-0.08,  rLeg: 0.28,  lArm:-0.85,  rArm:-0.18  }, // arm cocked way back, full running stride
    clotheslineFollow:{ lLeg:-0.22, rLeg: 0.46, lArm: 0.82,  rArm:-0.40  }, // arm carried through past impact
    // ── Irish whip phases ─────────────────────────────────────────────────────
    whipGrab:       { lLeg: 0.14,  rLeg:-0.09,  lArm: 0.65,  rArm: 0.48  }, // both hands reaching to grab wrist/arm
    whipLoad:       { lLeg: 0.22,  rLeg: 0.14,  lArm: 0.90,  rArm: 0.25  }, // pulling back to generate throw momentum
    whipFollow:     { lLeg: 0.10,  rLeg: 0.08,  lArm: 0.50,  rArm: 0.12  }, // arm settling after release
    // ── Slam phases ───────────────────────────────────────────────────────────
    slamGrab:       { lLeg: 0.25,  rLeg:-0.28,  lArm: 0.78,  rArm: 0.72  }, // bending down, wide stance, reaching to lift
    slamPeak:       { lLeg: 0.20,  rLeg:-0.20,  lArm: 3.14,  rArm: 2.80  }, // opponent at full height — arms locked out overhead
    // ── Elbow drop phases (visible before jump) ───────────────────────────────
    elbowCrouch:    { lLeg: 0.28,  rLeg: 0.25,  lArm: 0.22,  rArm: 0.18  }, // knee-bend crouch before the leap
    elbowLand:      { lLeg: 0.10,  rLeg: 0.08,  lArm:-0.12,  rArm: 0.10  }, // just landed, arm still down at side
    // ── Grapple holds ────────────────────────────────────────────────────────
    headlockHold:   { lLeg: 0.22,  rLeg:-0.18,  lArm: 2.10,  rArm: 0.85  }, // near arm cranked past horizontal pressing head down, far arm locked across
    headlocked:     { lLeg: 0.35,  rLeg: 0.30,  lArm:-0.45,  rArm:-0.40  }, // torso bent forward hard, arms hanging/pushing down trying to pry free
    armDragGrab:    { lLeg: 0.14,  rLeg:-0.10,  lArm: 0.72,  rArm: 0.55  }, // both hands reaching to snatch the arm
    armDragPull:    { lLeg:-0.08,  rLeg: 0.30,  lArm: 1.45,  rArm: 0.85  }, // pivoting hard, dragging opponent through
    armDragFollow:  { lLeg:-0.16,  rLeg: 0.24,  lArm: 0.58,  rArm: 0.22  }, // arms settling after release
};

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
    bodySlam:    { poseSeq: [{ p: 'slamGrab',    dur: 150, e: 'Cubic.easeOut' },
                              { p: 'slamHold',    dur: 200, e: 'Cubic.easeOut' },
                              { p: 'slamPeak',    dur: 130, e: 'Linear'        },
                              { p: 'slamThrow',   dur: 150, e: 'Cubic.easeIn'  },
                              { p: 'idle',        dur:   0                     }] },
    clothesline: { poseSeq: [{ p: 'clotheslineCock',   dur: 100, e: 'Cubic.easeOut' },
                              { p: 'clothesline',       dur:  80, e: 'Cubic.easeIn'  },
                              { p: 'clotheslineFollow', dur: 130, e: 'Linear'        },
                              { p: 'idle',              dur: 200, e: 'Cubic.easeOut' }] },
    pin:         { poseSeq: [{ p: 'pinHold',     dur: 200, e: 'Linear'        }] },
    elbowDrop:   { poseSeq: [{ p: 'elbowCrouch', dur: 130, e: 'Cubic.easeOut' },
                              { p: 'elbowRaise',  dur: 200, e: 'Cubic.easeOut' },
                              { p: 'elbowLand',   dur:  80, e: 'Cubic.easeIn'  },
                              { p: 'elbowImpact', dur: 100, e: 'Linear'        },
                              { p: 'idle',        dur: 260, e: 'Cubic.easeOut' }] },
    dropkick:    { poseSeq: [{ p: 'dropkick',    dur: 150, e: 'Cubic.easeOut' },
                              { p: 'stumble',     dur: 250, e: 'Linear'        },
                              { p: 'idle',        dur: 300, e: 'Linear'        }] },
    piledriver:  { poseSeq: [{ p: 'slamGrab',    dur: 130, e: 'Cubic.easeOut' },
                              { p: 'slamHold',    dur: 200, e: 'Cubic.easeOut' },
                              { p: 'slamHold',    dur: 130, e: 'Linear'        },
                              { p: 'pileSit',     dur: 130, e: 'Cubic.easeIn'  },
                              { p: 'idle',        dur: 220, e: 'Cubic.easeOut' }] },
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
    suplex:      { poseSeq: [{ p: 'slamGrab',    dur: 130, e: 'Cubic.easeOut' },
                              { p: 'slamHold',    dur: 300, e: 'Cubic.easeOut' },
                              { p: 'slamPeak',    dur: 100, e: 'Linear'        },
                              { p: 'slamThrow',   dur: 200, e: 'Cubic.easeIn'  },
                              { p: 'idle',        dur:   0                     }] },
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
};


// ─── State machine reference ──────────────────────────────────────────────────
// 'standing'    default; can move, accept input, initiate moves
// 'staggered'   brief stun after a light strike; stateTimer counts down; no input; second hit knocks down
// 'selling'     brief reaction tween on the defender before fall/stagger; blocks movement and input
// 'taunting'    attacker mid-taunt pose sequence; blocks movement and input; ~1.3s total
// 'running'     Irish whip victim; runPhase 'toRope' → 'returning'; no input
// 'falling'     400ms fall tween before going down; no input
// 'flipping'    clothesline/dropkick victim arc; flipProgress 0→1; no input
// 'dropkicking'   attacker airborne during dropkick; dropProgress 0→1
// 'elbowDropping' attacker airborne during elbow drop; elbowProgress 0→1
// 'slamming'    attacker mid-slam, elbow drop, or dropkick launch; no input
// 'grabbed'     defender lifted during body slam or piledriver; no input
// 'down'        flat on mat; stateTimer counts down to 0 → 'risingUp' (or 'possum' if holding down)
// 'possum'      faking unconscious; hold down key to stay flat; action/power = quick spring up
// 'risingUp'    350ms get-up tween; drawn as falling in reverse; no input
// 'pinned'      flat during a pin; mash action to attempt kickout
// 'pinning'     attacker holding the pin
// 'holding'     attacker applying sleeper hold or headlock
// 'sleeping'    defender in sleeper hold; mash action to escape
// 'headlocked'  defender in side headlock; mash action to escape
// 'lockup'      grapple clinch; attacker follows up with action+direction, defender contests with action
// 'climbing'    tweening up to or down from a turnbuckle corner; no input
// 'onTurnbuckle' standing on middle rope at corner; power = dive, movement = climb down
// 'diving'      airborne from turnbuckle dive; divProgress 0→1

// ─── Wrestler class ───────────────────────────────────────────────────────────
export default class Wrestler {
    constructor(scene, x, y, skinCol, trunksCol, input, moveSet = ['irishWhip', 'clothesline', 'bodySlam', 'pin', 'elbowDrop', 'dropkick', 'doubleAxeHandle']) {
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
        this.runPhase     = null;
        this.runTarget    = 0;
        this.runFacing    = 1;
        this.walkPhase    = 0;
        this.moveBlend    = 0;
        this.stamina      = STAMINA_MAX;
        this.flipProgress  = 0;
        this.flipDir       = 1;
        this.dropProgress  = 0;
        this.elbowProgress = 0;
        this.divProgress   = 0;
        this._corner       = null;
        this._divLandY     = 0;
        this._ropeLevel    = 0; // 0=none, 1=middle rope, 2=top rope
        this.slamPhase    = null; // 'up' | 'throwing' | 'dropping'
        this.slamType     = null; // 'slam' | 'pile' — which move is in progress
        this.slamY        = 0;
        this.pose            = { ...POSES.idle }; // live joint angles, tweened per move
        this.idlePose        = 'idle';            // character-specific resting stance — override after construction
        this.tauntPose       = 'tauntArmsWide';   // character-specific taunt — override after construction
        this._runStepTimer   = 0;
        this.gfx             = scene.add.graphics();
        this.skeleton        = new Skeleton(scene, skinCol, trunksCol);
        this.combatBlend     = 0;
    }

    get s() { return perspectiveScale(this.y); }

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

    // Tween this.pose toward a target (pose name string or {lLeg,rLeg,lArm,rArm} object).
    // Kills any in-flight pose tween first so sequences don't stack.
    tweenPose(target, duration, ease = 'Linear', onComplete) {
        this.scene.tweens.killTweensOf(this.pose);
        const t = typeof target === 'string' ? POSES[target] : target;
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
    }

    // ── Core game tick ────────────────────────────────────────────────────────

    move(dt, other) {
        if (this.state !== 'running') {
            const dx = other.x - this.x;
            if (dx !== 0) this.facing = Math.sign(dx);
        }

        if (this.state !== 'standing') return;

        let dx = 0, dy = 0;
        if (this.input.isDown('left'))  dx -= 1;
        if (this.input.isDown('right')) dx += 1;
        if (this.input.isDown('up'))    dy -= 1;
        if (this.input.isDown('down'))  dy += 1;

        const len = Math.hypot(dx, dy);
        if (len > 0) {
            const speed = SPEED * this.s * dt;
            this.x += (dx / len) * speed;
            this.y += (dy / len) * speed;
            const backward = dx !== 0 && Math.sign(dx) !== this.facing;
            const phaseDir = backward ? -1 : 1;
            this.walkPhase = ((this.walkPhase + phaseDir * SPEED * dt * WALK_FREQ) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            this.moveBlend = Math.min(1, this.moveBlend + dt * 6);
            this._clamp();
        } else {
            this.walkPhase *= Math.pow(0.85, dt * 60);
            this.moveBlend  = Math.max(0, this.moveBlend - dt * 6);
            // Drift toward character's idle stance while standing still (~1.5s to settle)
            const idleTarget = POSES[this.idlePose] ?? POSES.idle;
            const drift = 1 - Math.pow(0.94, dt * 60);
            for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm']) {
                this.pose[k] += (idleTarget[k] - this.pose[k]) * drift;
            }
        }

        this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_RECOVER * dt);

        // Y is depth in 2.5D — only separate wrestlers at the same ring depth.
        // If they're on clearly different depth tracks, let them pass freely.
        const depthDiff = Math.abs(this.y - other.y);
        if (depthDiff < 26) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
            const minDist = 80 * this.s;
            if (dist < minDist && dist > 0) {
                const ang = Phaser.Math.Angle.Between(other.x, other.y, this.x, this.y);
                this.x = other.x + Math.cos(ang) * minDist;
                this.y = other.y + Math.sin(ang) * minDist;
                this._clamp();
            }
        }
    }

    tickDown(dt) {
        if (this.state !== 'down' && this.state !== 'staggered') return;
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

        const dir = Math.sign(this.runTarget - this.x);
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

    // Grapple key: clothesline vs returning runner | pin vs down | slam vs staggered | Irish whip vs standing
    tryAction(other) {
        if (this.state !== 'standing') return false;
        if (!this.input.justDown('action')) return false;

        if (other.state === 'running' && other.runPhase === 'returning') {
            if (this.moveSet.includes('clothesline')) {
                const xDist   = Math.abs(other.x - this.x);
                // Positive = P2 has run past P1's X in the run direction
                const pastDist = (other.x - this.x) * other.runFacing;
                // Window: within ~4 ring-feet approaching, forgiving ~1 foot past
                if (xDist < 160 * this.s && pastDist < 45 * this.s) {
                    this._doClothesline(other);
                    return 'clothesline';
                }
            }
        }

        const dist  = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
        const reach = 110 * this.s;
        if (dist > reach) return false;

        if ((other.state === 'down' || other.state === 'possum') && this.moveSet.includes('pin')) {
            this.state  = 'pinning';
            other.state = 'pinned';
            this._runPoseSequence(MOVE_DEFS.pin.poseSeq);
            return 'pin';
        }

        // Grab a staggered opponent for a big throw — jab → grapple combo
        if (other.state === 'staggered') {
            if (this.moveSet.includes('piledriver')) { this._doPiledriver(other); return 'piledriver'; }
            if (this.moveSet.includes('bodySlam'))   { this._doBodySlam(other);   return 'slam';       }
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
    tryPower(other) {
        if (this.state !== 'standing') return false;
        if (!this.input.justDown('power')) return false;

        const dist     = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
        const jabReach = 85  * this.s;
        const reach    = 110 * this.s;
        const medReach = 220 * this.s;

        // Headbutt: follow-up strike on a staggered opponent — knocks them down
        if (other.state === 'staggered' && dist <= reach && this.moveSet.includes('headbutt')) {
            this._doHeadbutt(other);
            return 'headbutt';
        }

        if ((other.state === 'down' || other.state === 'possum') && dist <= reach && this.moveSet.includes('elbowDrop')) {
            this._doElbowDrop(other);
            return 'elbowDrop';
        }

        // Jab: point-blank strike vs standing — staggers, sets up follow-ups
        if (other.state === 'standing' && dist <= jabReach && this.moveSet.includes('jab')) {
            this._doJab(other);
            return 'jab';
        }

        if (other.state === 'standing' && dist <= medReach && this.moveSet.includes('dropkick')) {
            this._doDropkick(other);
            return 'dropkick';
        }

        return false;
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

        if (dist <= reach && other.state === 'standing' && this.moveSet.includes('sleeperHold')) {
            this._doSleeperHold(other);
            return 'sleeperHold';
        }

        this._doTaunt();
        return 'taunt';
    }

    // ── Move execution ────────────────────────────────────────────────────────

    _doJab(other) {
        other._drain(STAMINA_DRAIN.jab);
        this._runPoseSequence(MOVE_DEFS.jab.poseSeq);
        // Sell fires when punch reaches full extension (after jabCock phase)
        this.scene.time.delayedCall(83, () => {
            other._doSell('sellHead', 110, () => other.startStagger());
        });
    }

    _doHeadbutt(other) {
        other._drain(STAMINA_DRAIN.headbutt);
        this._runPoseSequence(MOVE_DEFS.headbutt.poseSeq);
        // Sell fires when head lunges forward (after headbuttCock phase)
        this.scene.time.delayedCall(117, () => {
            other._doSell('sellHead', 150, () => other.startFall());
        });
    }

    _doDoubleAxeHandle(other) {
        other._drain(STAMINA_DRAIN.doubleAxeHandle);
        this.state    = 'slamming';
        this.runPhase = null;
        this.facing   = Math.sign(other.x - this.x) || this.facing;

        this._runPoseSequence(MOVE_DEFS.doubleAxeHandle.poseSeq, () => {
            if (this.state === 'slamming') this.state = 'standing';
        });

        // Sell fires when arms come down (~280ms wind-up)
        this.scene.time.delayedCall(280, () => {
            if (this.state !== 'slamming') return;
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

    _doClothesline(other) {
        other._drain(STAMINA_DRAIN.clothesline);

        // Step up into delivery position — arm extends at this Y
        const stepY = Math.max(RING.farLeft.y + 20, this.y - 18 * this.s);
        this.scene.tweens.add({ targets: this, y: stepY, duration: 100, ease: 'Cubic.easeOut' });

        this._runPoseSequence(MOVE_DEFS.clothesline.poseSeq);
        // Sell fires at impact (after clotheslineCock wind-up phase)
        this.scene.time.delayedCall(100, () => {
            other._doSell('sellChest', 150, () => other.startClotheslineFall(other.runFacing));
        });
    }

    _doBodySlam(other) {
        other._drain(STAMINA_DRAIN.bodySlam);
        this.state      = 'slamming';
        other.state     = 'grabbed';
        other.slamPhase = 'up';
        other.slamType  = 'slam';
        const facing = this.facing;
        const sx = this.x, sy = this.y, ss = this.s;

        other.x      = sx;
        other.facing = facing;
        other.slamY  = other.y - 130 * other.s; // start near body center, lift to overhead

        // Attacker visual: pose sequence runs in parallel with defender tweens
        this._runPoseSequence(MOVE_DEFS.bodySlam.poseSeq);

        // Defender phase 1 — lift flat to overhead position
        this.scene.tweens.add({
            targets:  other,
            slamY:    sy - 250 * ss,
            duration: 280,
            ease:     'Cubic.easeOut',
            onComplete: () => {
                if (this.state !== 'slamming') return;
                const b     = ringBoundsAtY(sy);
                const landX = Math.max(b.left + 20, Math.min(b.right - 20, sx + facing * 120 * ss));
                other.slamPhase = 'throwing';
                other.facing    = facing;

                // Defender phase 2 — arc forward and land flat
                this.scene.tweens.add({
                    targets:  other,
                    x:        landX,
                    y:        sy,
                    duration: 220,
                    ease:     'Cubic.easeIn',
                    onComplete: () => {
                        other.state      = 'down';
                        other.stateTimer = DOWN_SEC;
                        other.slamPhase  = null;
                        this.state       = 'standing';
                        this.scene.cameras.main.shake(200, 0.003);
                    },
                });
            },
        });
    }

    _doSuplex(other) {
        other._drain(STAMINA_DRAIN.suplex);
        this.state      = 'slamming';
        other.state     = 'grabbed';
        other.slamPhase = 'up';
        other.slamType  = 'suplex';
        const sx = this.x, sy = this.y, ss = this.s;
        const facing = this.facing;

        other.x     = sx;
        other.slamY = other.y - (88 + 112 + 34 * 0.7) * other.s;

        this._runPoseSequence(MOVE_DEFS.suplex.poseSeq);

        // Hoist opponent inverted overhead (300ms) then drop behind attacker
        this.scene.tweens.add({
            targets:  other,
            slamY:    sy - 100 * ss,
            duration: 300,
            ease:     'Cubic.easeOut',
            onComplete: () => {
                if (this.state !== 'slamming') return;
                other.x          = sx - facing * 90 * ss;
                other.y          = sy;
                other.state      = 'down';
                other.stateTimer = DOWN_SEC + 1.0;
                other.slamPhase  = null;
                other.slamType   = null;
                this.scene.cameras.main.shake(180, 0.003);
                this.startFall(1.5);
            },
        });
    }

    _doElbowDrop(other) {
        other._drain(STAMINA_DRAIN.elbowDrop);
        // Wind-up: crouch + raise elbow while still upright (skeleton visible)
        this.state = 'slamming';
        this._runPoseSequence([
            { p: 'elbowCrouch', dur: 130, e: 'Cubic.easeOut' },
            { p: 'elbowRaise',  dur: 200, e: 'Cubic.easeOut' },
        ], () => {
            if (this.state !== 'slamming') return;
            // Now jump — switch to elbowDropping (custom draw takes over)
            this.state         = 'elbowDropping';
            this.elbowProgress = 0;
            this.scene.tweens.add({
                targets:       this,
                elbowProgress: 1,
                x:             other.x,
                duration:      380,
                ease:          'Sine.easeInOut',
                onComplete: () => {
                    if (this.state !== 'elbowDropping') return;
                    other.stateTimer = DOWN_SEC;
                    this.scene.cameras.main.shake(130, 0.002);
                    this.elbowProgress = 0;
                    // Show landing / recovery poses (skeleton visible again)
                    this.state = 'slamming';
                    this._runPoseSequence([
                        { p: 'elbowLand',   dur:  80, e: 'Cubic.easeIn'  },
                        { p: 'elbowImpact', dur: 100, e: 'Linear'        },
                        { p: 'idle',        dur: 260, e: 'Cubic.easeOut' },
                    ], () => {
                        if (this.state === 'slamming') this.state = 'standing';
                    });
                },
            });
        });
    }

    _doDropkick(other) {
        this.state        = 'dropkicking';
        this.dropProgress = 0;
        const facing  = this.facing;
        const targetX = other.x - facing * 35 * this.s;
        const hitRange = 100 * this.s;

        this.scene.tweens.add({
            targets: this,
            dropProgress: 1,
            x: targetX,
            duration: 500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                const dist = Math.abs(this.x - other.x);
                const hit  = dist <= hitRange &&
                             (other.state === 'standing' || other.state === 'running');
                if (hit) {
                    other._drain(STAMINA_DRAIN.dropkick);
                    other._doSell('sellChest', 140, () => other.startClotheslineFall(facing));
                    this.state      = 'down';
                    this.stateTimer = 1.5;
                    this.scene.cameras.main.shake(120, 0.0015);
                } else {
                    this.state      = 'down';
                    this.stateTimer = 2.8;
                    this.scene.cameras.main.shake(80, 0.001);
                }
                this.dropProgress = 0;
            },
        });
    }

    _doPiledriver(other) {
        other._drain(STAMINA_DRAIN.piledriver);
        this.state      = 'slamming';
        other.state     = 'grabbed';
        other.slamPhase = 'up';
        other.slamType  = 'pile';
        const facing = this.facing;
        const sx = this.x, sy = this.y, ss = this.s;

        // Head sits at thigh level (between knee and hip), feet pointing at ceiling
        other.x     = sx;
        other.slamY = sy - 58 * ss;

        this._runPoseSequence(MOVE_DEFS.piledriver.poseSeq);

        // Phase 1 — hold (200ms): attacker standing, opponent upside down at thigh level
        this.scene.time.delayedCall(200, () => {
            if (this.state !== 'slamming') return;
            // Phase 2 — jump: both go up together
            this.scene.tweens.add({
                targets: this, y: sy - 26 * ss,
                duration: 120, ease: 'Cubic.easeOut',
                onUpdate: () => { other.slamY = this.y - 58 * ss; },
                onComplete: () => {
                    if (this.state !== 'slamming') return;
                    other.slamPhase = 'dropping';
                    other.facing    = facing;
                    // Phase 3 — crash: attacker's butt hits mat (y + lH brings hip to sy),
                    // opponent's head hits mat independently
                    this.scene.tweens.add({
                        targets: other, slamY: sy,
                        duration: 130, ease: 'Cubic.easeIn',
                    });
                    this.scene.tweens.add({
                        targets: this, y: sy + 88 * ss,
                        duration: 130, ease: 'Cubic.easeIn',
                        onComplete: () => {
                            other.x          = sx;
                            other.y          = sy;
                            other.state      = 'down';
                            other.stateTimer = DOWN_SEC + 2.0;
                            other.slamPhase  = null;
                            other.slamType   = null;
                            this.scene.cameras.main.shake(220, 0.0035);
                            // Phase 4 — sit 400ms (pileSit pose, slamming state, butt on mat)
                            this.scene.time.delayedCall(400, () => {
                                // Roll to flat: go to 'down', slide y back to sy over 200ms
                                this.state      = 'down';
                                this.stateTimer = 2.0;
                                this.scene.tweens.add({
                                    targets: this, y: sy,
                                    duration: 200, ease: 'Linear',
                                });
                            });
                        },
                    });
                },
            });
        });
    }

    _doDive(other) {
        this.state       = 'diving';
        this.divProgress = 0;
        this._divLandY   = other.y;

        this.scene.tweens.add({
            targets:     this,
            divProgress: 1,
            x:           other.x,
            y:           other.y,
            duration:    550,
            ease:        'Sine.easeIn',
            onComplete: () => {
                if (this.state !== 'diving') return;
                const dist = Math.abs(this.x - other.x);
                const hit  = dist <= 130 * this.s &&
                             (other.state === 'standing' || other.state === 'down' || other.state === 'possum' || other.state === 'staggered');
                if (hit) {
                    other._drain(STAMINA_DRAIN.divingElbow);
                    if (other.state === 'down') {
                        other.stateTimer = DOWN_SEC;
                    } else {
                        other._doSell('sellChest', 150, () => other.startClotheslineFall(this.facing));
                    }
                    this.scene.cameras.main.shake(180, 0.003);
                } else {
                    this.scene.cameras.main.shake(70, 0.001);
                }
                this.state       = 'down';
                this.stateTimer  = 2.0;
                this.divProgress = 0;
            },
        });
    }

    _doTopDive(other) {
        this.state       = 'diving';
        this.divProgress = 0;
        this._divLandY   = other.y;

        this.scene.tweens.add({
            targets:     this,
            divProgress: 1,
            x:           other.x,
            y:           other.y,
            duration:    700,
            ease:        'Sine.easeIn',
            onComplete: () => {
                if (this.state !== 'diving') return;
                const dist = Math.abs(this.x - other.x);
                const inRange = dist <= 140 * this.s;
                if (inRange && (other.state === 'down' || other.state === 'possum')) {
                    // Splash on downed opponent — maximum damage, extended down time
                    other._drain(STAMINA_DRAIN.topDive);
                    other.stateTimer = DOWN_SEC + 2.0;
                    this.scene.cameras.main.shake(260, 0.005);
                } else if (inRange && (other.state === 'standing' || other.state === 'staggered')) {
                    // Flying cross-body on standing opponent — big knockdown
                    other._drain(STAMINA_DRAIN.topDive - 6);
                    other._doSell('sellChest', 120, () => other.startClotheslineFall(this.facing));
                    this.scene.cameras.main.shake(200, 0.004);
                } else {
                    this.scene.cameras.main.shake(110, 0.002);
                }
                this.state       = 'down';
                this.stateTimer  = 3.0;
                this.divProgress = 0;
            },
        });
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
        other._drain(STAMINA_DRAIN.armDrag);
        this._runPoseSequence(MOVE_DEFS.armDrag.poseSeq);
        this.scene.time.delayedCall(90, () => {
            other._doSell('sellChest', 110, () => other.startClotheslineFall(this.facing));
        });
    }

    tryHeadlockEscape() {
        if (this.state !== 'headlocked') return false;
        return this.input.justDown('action');
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
        return this.input.justDown('action');
    }

    _doTurnbuckleTaunt() {
        this.state = 'taunting';
        this._runPoseSequence(MOVE_DEFS.turnbuckleTaunt.poseSeq, () => {
            if (this.state === 'taunting') this.state = 'onTurnbuckle';
        });
    }

    _doTaunt() {
        this.state = 'taunting';
        const tauntSeq = MOVE_DEFS.taunt.poseSeq.map(step =>
            step.p === 'tauntArmsWide' ? { ...step, p: this.tauntPose } : step
        );
        this._runPoseSequence(tauntSeq, () => {
            if (this.state === 'taunting') this.state = 'standing';
        });
    }

    _doSell(poseName, duration, onDone) {
        this.state = 'selling';
        this.tweenPose(poseName, duration, 'Cubic.easeOut', () => {
            onDone();
        });
    }

    _startRiseUp() {
        this.state        = 'risingUp';
        this.fallProgress = 1; // reuse fallProgress in reverse: 1 → 0
        this.scene.tweens.add({
            targets:      this,
            fallProgress: 0,
            duration:     350,
            ease:         'Cubic.easeOut',
            onComplete:   () => {
                if (this.state === 'risingUp') {
                    this.state = 'standing';
                    this.tweenPose('idle', 200, 'Linear');
                }
            },
        });
    }

    _startQuickRise() {
        this.state        = 'risingUp';
        this.fallProgress = 1;
        this.scene.tweens.add({
            targets:      this,
            fallProgress: 0,
            duration:     160,
            ease:         'Cubic.easeOut',
            onComplete:   () => {
                if (this.state === 'risingUp') {
                    this.state = 'standing';
                    this.tweenPose('idle', 120, 'Linear');
                }
            },
        });
    }

    startStagger() {
        this.state = 'staggered';
        const hp = this.stamina;

        if (hp > 60) {
            // Fresh — one quick stumble, recovers fast
            this.stateTimer = 0.85;
            this._runPoseSequence([
                { p: 'stagger',  dur: 140, e: 'Cubic.easeOut' },
                { p: 'idle',     dur: 220, e: 'Linear'        },
            ]);
        } else if (hp > 35) {
            // Hurting — two-sway wobble
            this.stateTimer = 1.1;
            this._runPoseSequence([
                { p: 'staggerMed',  dur: 150, e: 'Cubic.easeOut'  },
                { p: 'staggerBack', dur: 130, e: 'Sine.easeInOut'  },
                { p: 'staggerMed',  dur: 120, e: 'Sine.easeInOut'  },
                { p: 'idle',        dur: 270, e: 'Linear'          },
            ]);
        } else if (hp > 15) {
            // Badly hurt — three swings, near-buckle
            this.stateTimer = 1.35;
            this._runPoseSequence([
                { p: 'staggerHeavy', dur: 160, e: 'Cubic.easeOut' },
                { p: 'staggerBack',  dur: 140, e: 'Sine.easeInOut' },
                { p: 'staggerHeavy', dur: 130, e: 'Sine.easeInOut' },
                { p: 'staggerBack',  dur: 120, e: 'Sine.easeInOut' },
                { p: 'idle',         dur: 310, e: 'Linear'         },
            ]);
        } else {
            // Critical — rubber legs, knees buckling
            this.stateTimer = 1.65;
            this._runPoseSequence([
                { p: 'staggerCollapse', dur: 180, e: 'Cubic.easeOut' },
                { p: 'staggerBack',     dur: 155, e: 'Sine.easeInOut' },
                { p: 'staggerCollapse', dur: 165, e: 'Sine.easeInOut' },
                { p: 'staggerBack',     dur: 135, e: 'Sine.easeInOut' },
                { p: 'staggerMed',      dur: 120, e: 'Sine.easeInOut' },
                { p: 'idle',            dur: 360, e: 'Linear'         },
            ]);
        }
    }

    startFall(downTime = DOWN_SEC) {
        this.state        = 'falling';
        this.fallProgress = 0;
        this.scene.tweens.add({
            targets:      this,
            fallProgress: 1,
            duration:     400,
            ease:         'Cubic.easeIn',
            onComplete: () => {
                this.state        = 'down';
                this.stateTimer   = downTime;
                this.fallProgress = 0;
                this.scene.cameras.main.shake(100, 0.0015);
            },
        });
    }

    startClotheslineFall(runFacing) {
        this.state        = 'flipping';
        this.flipProgress = 0;
        this.flipDir      = runFacing;
        const travelX     = runFacing * 80 * this.s;

        this.scene.tweens.add({
            targets:      this,
            flipProgress: 1,
            x:            this.x + travelX,
            duration:     380,
            ease:         'Cubic.easeOut',
            onComplete: () => {
                this.state        = 'down';
                this.stateTimer   = DOWN_SEC;
                this.flipProgress = 0;
                this.facing       = -runFacing; // head points back, feet went forward
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
        const s = onRopes ? perspectiveScale(this._corner.matY) : this.s;
        const gfx   = this.gfx;
        const depth = 12 + y * 0.03;
        gfx.clear();
        gfx.setDepth(depth);
        this.skeleton.setDepth(depth);
        this.skeleton.setVisible(false); // shown only for upright states below

        if (state === 'falling' || state === 'risingUp') {
            this._drawFalling(x, y, s, facing, skinCol, trunksCol, this.fallProgress);
            return;
        }

        if (state === 'flipping') {
            this._drawClotheslineFall(x, y, s, this.flipProgress, this.flipDir, skinCol, trunksCol);
            return;
        }

        if (state === 'dropkicking') {
            const arcFrac = Math.sin(this.dropProgress * Math.PI);
            // Scale up the airborne figure — horizontal orientation reads much smaller
            // than the upright skeleton at the same s, so 1.3× compensates.
            const ds    = s * 1.3;
            const airY  = y - arcFrac * 115 * s;
            gfx.fillStyle(0x000000, 0.22 + arcFrac * 0.08);
            gfx.fillEllipse(x, y, (120 + arcFrac * 50) * s, (36 + arcFrac * 10) * s);
            this._drawDropkickFront(x, airY, ds, facing, skinCol, trunksCol);
            return;
        }

        if (state === 'elbowDropping') {
            const arcFrac = Math.sin(this.elbowProgress * Math.PI);
            const airY    = y - arcFrac * 100 * s;
            gfx.fillStyle(0x000000, 0.22 + arcFrac * 0.08);
            gfx.fillEllipse(x, y, (120 + arcFrac * 50) * s, (36 + arcFrac * 10) * s);
            this._drawElbowDropAir(x, airY, s, facing, skinCol, trunksCol);
            return;
        }

        if (state === 'diving') {
            gfx.fillStyle(0x000000, 0.15 + this.divProgress * 0.08);
            gfx.fillEllipse(x, this._divLandY, (100 + this.divProgress * 60) * s, (30 + this.divProgress * 12) * s);
            this._drawElbowDropAir(x, y, s, facing, skinCol, trunksCol);
            return;
        }

        if (state === 'grabbed') {
            if (this.slamType === 'pile' && (this.slamPhase === 'up' || this.slamPhase === 'dropping'))
                this._drawPiledriverHeld(x, this.slamY, s, skinCol, trunksCol);
            else if (this.slamPhase === 'up' && this.slamType === 'slam')
                this._drawFlat(x, this.slamY, s, this.facing, skinCol, trunksCol);
            else if (this.slamPhase === 'up')
                this._drawInverted(x, this.slamY, s, skinCol, trunksCol);
            else
                this._drawFlat(x, y, s, facing, skinCol, trunksCol);
            return;
        }

        const shadowY = onRopes ? this._corner.matY : y;
        gfx.fillStyle(0x000000, 0.22);
        gfx.fillEllipse(x, shadowY, 120 * s, 36 * s);

        if (state === 'down' || state === 'pinned' || state === 'possum') {
            this._drawFlat(x, y, s, facing, skinCol, trunksCol);
            return;
        }

        this.skeleton.setVisible(true);
        // Body bob is no longer bolted on here — it emerges from the gait leg geometry
        // inside the skeleton (hip rides the weight-bearing leg). Just pass moveBlend.
        const lean      = this.facing * 0.07 * this.moveBlend;
        const liftScale = state === 'running' ? 1.0 : 0.5;
        const runBlend  = state === 'running' ? this.moveBlend : 0;
        this.skeleton.updateUpright(x, y, s, facing, this.pose, this.walkPhase, this.combatBlend, lean, this.moveBlend, liftScale, runBlend);
    }

    // Narrow side-view of opponent held upside down for piledriver.
    // slamY = head position (lowest point). Body and boots extend upward.
    _drawPiledriverHeld(x, slamY, s, skinCol, trunksCol) {
        const gfx  = this.gfx;
        const lH   = 88  * s, lW  = 22 * s;
        const tH   = 112 * s, tW  = 20 * s, trH = 40 * s;
        const hR   = 34  * s;

        // Head at slamY — the part that hits the mat
        gfx.fillStyle(skinCol, 1);
        gfx.fillCircle(x, slamY, hR);

        // Torso goes UP from head
        const neckTop  = slamY - hR * 1.4;
        const torsoTop = neckTop - tH;
        gfx.fillStyle(skinCol,   1); gfx.fillRect(x - tW / 2, torsoTop, tW, tH - trH);
        gfx.fillStyle(trunksCol, 1); gfx.fillRect(x - tW / 2, neckTop - trH, tW, trH);

        // Legs extend further upward — boots pointing at ceiling
        const hipY = torsoTop;
        gfx.fillStyle(skinCol,  1);
        gfx.fillRect(x - lW / 2 - 8 * s, hipY - lH * 0.72, lW, lH * 0.72);
        gfx.fillRect(x + lW / 2 + 2 * s, hipY - lH * 0.72, lW, lH * 0.72);
        gfx.fillStyle(0x181818, 1);
        gfx.fillRect(x - lW / 2 - 8 * s, hipY - lH, lW, lH * 0.28);
        gfx.fillRect(x + lW / 2 + 2 * s, hipY - lH, lW, lH * 0.28);
    }

    _drawInverted(x, slamY, s, skinCol, trunksCol) {
        const gfx = this.gfx;
        const lH  = 88  * s, lW  = 24 * s, lG  = 16 * s;
        const tH  = 112 * s, tW  = 72 * s, trH = 40 * s;
        const hR  = 34  * s;

        gfx.fillStyle(skinCol, 1);
        gfx.fillCircle(x, slamY, hR);

        const neckY     = slamY - hR * 0.7;
        const shoulderY = neckY - tH + 12 * s;
        const hipY      = neckY - tH;

        gfx.fillStyle(skinCol,  1); gfx.fillRect(x - tW / 2, neckY - (tH - trH), tW, tH - trH);
        gfx.fillStyle(trunksCol,1); gfx.fillRect(x - tW / 2, neckY - tH, tW, trH);

        gfx.fillStyle(skinCol, 1);
        gfx.fillRect(x - tW / 2 - 20 * s, shoulderY - 76 * s, 20 * s, 76 * s);
        gfx.fillRect(x + tW / 2,           shoulderY - 76 * s, 20 * s, 76 * s);
        gfx.fillRect(x - lG - lW, hipY - lH * 0.72, lW, lH * 0.72);
        gfx.fillRect(x + lG,      hipY - lH * 0.72, lW, lH * 0.72);

        gfx.fillStyle(0x181818, 1);
        gfx.fillRect(x - lG - lW, hipY - lH, lW, lH * 0.28);
        gfx.fillRect(x + lG,      hipY - lH, lW, lH * 0.28);
    }

    _drawFalling(x, y, s, facing, skinCol, trunksCol, p) {
        const gfx    = this.gfx;
        const pCube  = p * p * p;
        const vScale = 1 - pCube;

        const lH  = 88  * s * vScale, lW  = 24 * s, lG = 16 * s;
        const tH  = 112 * s * vScale, tW  = 72 * s, trH = 40 * s * vScale;
        const hR  = 34  * s;

        gfx.fillStyle(0x000000, 0.22 + pCube * 0.12);
        gfx.fillEllipse(x, y, (120 + pCube * 110) * s, (36 + pCube * 12) * s);

        if (vScale > 0.04) {
            gfx.fillStyle(0x181818, 1);
            gfx.fillRect(x - lG - lW, y - lH * 0.28, lW, lH * 0.28);
            gfx.fillRect(x + lG,      y - lH * 0.28, lW, lH * 0.28);
            gfx.fillStyle(skinCol, 1);
            gfx.fillRect(x - lG - lW, y - lH, lW, lH * 0.72);
            gfx.fillRect(x + lG,      y - lH, lW, lH * 0.72);
            gfx.fillStyle(trunksCol, 1);
            gfx.fillRect(x - tW / 2, y - lH - trH, tW, trH);
            gfx.fillStyle(skinCol, 1);
            gfx.fillRect(x - tW / 2, y - lH - tH, tW, tH - trH);
            const armY = y - lH - tH + 12 * s * vScale;
            gfx.fillRect(x - tW / 2 - 20 * s, armY, 20 * s, 76 * s * vScale);
            gfx.fillRect(x + tW / 2,           armY, 20 * s, 76 * s * vScale);
        }

        const headY = y - vScale * (88 + 112 + 34 * 0.7) * s;
        const headX = x + facing * pCube * 118 * s;
        gfx.fillStyle(skinCol, 1);
        gfx.fillCircle(headX, headY, hR);
    }

    _drawClotheslineFall(x, y, s, flipProgress, flipDir, skinCol, trunksCol) {
        const gfx  = this.gfx;
        const arc  = Math.sin(flipProgress * Math.PI); // 0 → 1 → 0
        const arcY = y - arc * 85 * s;

        // Shadow stays on the mat, expands as body rises
        gfx.fillStyle(0x000000, 0.22 + arc * 0.10);
        gfx.fillEllipse(x, y, (120 + arc * 55) * s, (36 + arc * 10) * s);

        // Body arcing through air — flat, head opposite to run direction
        this._drawFlat(x, arcY, s, -flipDir, skinCol, trunksCol);
    }

    // Front-facing horizontal view for the dropkick.
    // Both legs extend toward `facing` (kick direction); head on the opposite side.
    // "Front-facing" = viewer sees the wrestler's chest while they're airborne.
    _drawDropkickFront(x, y, s, facing, skinCol, trunksCol) {
        const gfx     = this.gfx;
        const legLen  = 92 * s;
        const shinLen = legLen - 20 * s;  // boot takes the remaining 20s
        const bootLen = 20 * s;
        const legW    = 19 * s;           // each leg bar's vertical thickness
        const legGap  = 13 * s;           // offset above/below center
        const torsoW  = 72 * s;
        const torsoH  = 38 * s;
        const trunkW  = 28 * s;
        const hR      = 30 * s;

        // Boot is at the kick end; shin is from the hip toward the kick end.
        const shinLeft = facing > 0 ? x            : x - legLen + bootLen;
        const bootLeft = facing > 0 ? x + shinLen  : x - legLen;

        // Two legs (upper and lower, side-by-side as seen from front)
        gfx.fillStyle(skinCol,  1); gfx.fillRect(shinLeft, y - legGap - legW, shinLen, legW);
        gfx.fillStyle(0x181818, 1); gfx.fillRect(bootLeft, y - legGap - legW, bootLen, legW);
        gfx.fillStyle(skinCol,  1); gfx.fillRect(shinLeft, y + legGap,        shinLen, legW);
        gfx.fillStyle(0x181818, 1); gfx.fillRect(bootLeft, y + legGap,        bootLen, legW);

        // Torso: attaches at the hip end, extends away from the kick
        const torsoLeft = facing > 0 ? x - torsoW : x;
        gfx.fillStyle(skinCol,   1); gfx.fillRect(torsoLeft, y - torsoH / 2, torsoW, torsoH);
        gfx.fillStyle(trunksCol, 1);
        gfx.fillRect(torsoLeft + (torsoW - trunkW) / 2, y - torsoH / 2, trunkW, torsoH);

        // Head: beyond torso, away from kick
        const headX = facing > 0 ? torsoLeft - hR * 0.8 : torsoLeft + torsoW + hR * 0.8;
        gfx.fillStyle(skinCol, 1);
        gfx.fillCircle(headX, y, hR);
    }

    _drawElbowDropAir(x, y, s, facing, skinCol, trunksCol) {
        // Same front-facing horizontal as the dropkick, with one arm hanging straight down
        this._drawDropkickFront(x, y, s, facing, skinCol, trunksCol);
        const torsoW      = 72 * s;
        const torsoH      = 38 * s;
        const armW        = 18 * s;
        const armLen      = 60 * s;
        const torsoCenter = facing > 0 ? x - torsoW / 2 : x + torsoW / 2;
        this.gfx.fillStyle(skinCol, 1);
        this.gfx.fillRect(torsoCenter - armW / 2, y + torsoH / 2, armW, armLen);
    }

    _drawFlat(x, y, s, facing, skinCol, trunksCol) {
        const gfx   = this.gfx;
        const bW    = 200 * s;
        const bH    = 44  * s;
        const headX = x + facing * (bW * 0.45 + 28 * s);

        gfx.fillStyle(skinCol,   1); gfx.fillRect(x - bW / 2, y - bH / 2, bW, bH);
        gfx.fillStyle(trunksCol, 1); gfx.fillRect(x - bW * 0.15, y - bH / 2, bW * 0.3, bH);
        gfx.fillStyle(skinCol,   1); gfx.fillCircle(headX, y, 32 * s);
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
        this.y = Math.max(RING.farLeft.y + margin, Math.min(RING.nearLeft.y - margin, this.y));
        const b = ringBoundsAtY(this.y);
        this.x = Math.max(b.left + margin, Math.min(b.right - margin, this.x));
    }
}
