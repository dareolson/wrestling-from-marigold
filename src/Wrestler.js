import { RING, ringBoundsAtY, perspectiveScale } from './constants.js';

const SPEED      = 140;
const RUN_SPEED  = 340;
const DOWN_SEC   = 4.5;
const STAGGER_SEC = 0.9; // how long a stagger lasts before recovering to standing
const WALK_FREQ  = 0.05; // radians per unscaled pixel of travel

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
    suplex:            20,
    divingElbow:       18,
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
    slamHold:    { lLeg:-0.15,  rLeg: 0.28,  lArm: 0.58,  rArm: 0.58  },
    slamThrow:   { lLeg: 0.42,  rLeg:-0.20,  lArm: 1.00,  rArm: 0.72  },
    whipRelease: { lLeg: 0.18,  rLeg: 0.10,  lArm: 0.65,  rArm: 0.22  },
    clothesline: { lLeg:-0.12,  rLeg: 0.32,  lArm: 1.05,  rArm:-0.18  },
    pinHold:     { lLeg: 0.28,  rLeg: 0.28,  lArm: 0.30,  rArm:-0.30  },
    elbowRaise:  { lLeg: 0.10,  rLeg: 0.05,  lArm:-1.40,  rArm: 0.15  },
    elbowImpact: { lLeg: 0.08,  rLeg: 0.06,  lArm:-0.08,  rArm: 0.08  },
    dropkick:    { lLeg: 0.80,  rLeg: 0.65,  lArm:-0.50,  rArm:-0.50  },
    stumble:     { lLeg: 0.20,  rLeg:-0.15,  lArm:-0.35,  rArm: 0.35  },
    sleeperHold: { lLeg: 0.08,  rLeg:-0.05,  lArm: 1.40,  rArm: 0.30  },
    sleeping:    { lLeg:-0.08,  rLeg:-0.04,  lArm:-0.50,  rArm:-0.45  },
    pileSit:        { lLeg: 1.25,  rLeg: 1.15,  lArm:-0.28,  rArm:-0.22  }, // seated impact — legs shoot nearly horizontal, arms back
    stagger:        { lLeg:-0.10,  rLeg: 0.08,  lArm:-0.55,  rArm:-0.48  }, // stumbles back, both arms fly up in surprise
    jab:            { lLeg: 0.10,  rLeg:-0.05,  lArm: 0.78,  rArm:-0.18  }, // near arm punches forward, far arm pulls back
    headbutt:       { lLeg: 0.28,  rLeg: 0.12,  lArm: 0.22,  rArm: 0.18  }, // whole body lunges forward, head leads
    sellChest:      { lLeg:-0.06,  rLeg: 0.05,  lArm:-0.70,  rArm:-0.62  }, // chest impact — both arms whip back violently
    sellHead:       { lLeg: 0.04,  rLeg: 0.04,  lArm:-0.38,  rArm:-0.32  }, // head strike — hands fly up toward face
    brawlerIdle:    { lLeg: 0.06,  rLeg:-0.04,  lArm: 0.28,  rArm: 0.18  }, // guard stance — weight forward, fists up
    powerIdle:      { lLeg: 0.10,  rLeg:-0.09,  lArm: 0.10,  rArm: 0.07  }, // wide, imposing — arms hanging low
    tauntArmsWide:  { lLeg: 0.14,  rLeg:-0.12,  lArm:-0.82,  rArm:-0.75  }, // arms raised wide, legs spread
    axeHandleUp:    { lLeg: 0.08,  rLeg: 0.12,  lArm: 2.70,  rArm: 3.10  }, // arms raised overhead — near arm slightly forward, far arm slightly back, peak above head
    axeHandleDown:  { lLeg: 0.30,  rLeg: 0.18,  lArm: 1.20,  rArm: 1.15  }, // whole body lurching forward, arms smashing down at ~40° below horizontal
};

// ─── Move definitions ─────────────────────────────────────────────────────────
// poseSeq drives the attacker's visual. Durations mirror the defender's tween
// timings so both sides stay in sync.
// Defender spatial logic stays in _doXxx — it varies too much per move to
// collapse into data without a more complex DSL.
export const MOVE_DEFS = {
    irishWhip:   { poseSeq: [{ p: 'whipRelease', dur: 150, e: 'Cubic.easeOut' },
                              { p: 'idle',        dur: 280, e: 'Linear'        }] },
    bodySlam:    { poseSeq: [{ p: 'slamHold',    dur: 280, e: 'Cubic.easeOut' },
                              { p: 'slamThrow',   dur: 220, e: 'Cubic.easeIn'  },
                              { p: 'idle',        dur: 0                       }] },
    clothesline: { poseSeq: [{ p: 'clothesline', dur: 180, e: 'Cubic.easeOut' },
                              { p: 'idle',        dur: 260, e: 'Linear'        }] },
    pin:         { poseSeq: [{ p: 'pinHold',     dur: 200, e: 'Linear'        }] },
    elbowDrop:   { poseSeq: [{ p: 'elbowRaise',  dur: 220, e: 'Cubic.easeOut' },
                              { p: 'elbowImpact', dur: 130, e: 'Cubic.easeIn'  },
                              { p: 'idle',        dur: 280, e: 'Linear'        }] },
    dropkick:    { poseSeq: [{ p: 'dropkick',    dur: 150, e: 'Cubic.easeOut' },
                              { p: 'stumble',     dur: 250, e: 'Linear'        },
                              { p: 'idle',        dur: 300, e: 'Linear'        }] },
    piledriver:  { poseSeq: [{ p: 'slamHold',    dur: 200, e: 'Cubic.easeOut' }, // hold
                              { p: 'slamHold',    dur: 120, e: 'Linear'        }, // jump
                              { p: 'pileSit',     dur: 130, e: 'Cubic.easeIn'  }] }, // crash — attacker goes down after
    doubleAxeHandle: { poseSeq: [{ p: 'axeHandleUp',   dur: 280, e: 'Cubic.easeOut' },
                                  { p: 'axeHandleDown', dur: 160, e: 'Cubic.easeIn'  },
                                  { p: 'idle',          dur: 320, e: 'Cubic.easeOut' }] },
    sleeperHold: { poseSeq: [{ p: 'sleeperHold', dur: 200, e: 'Linear'        }] },
    suplex:      { poseSeq: [{ p: 'slamHold',      dur: 300, e: 'Cubic.easeOut' },
                              { p: 'slamThrow',    dur: 220, e: 'Cubic.easeIn'  },
                              { p: 'idle',         dur: 0                       }] },
    taunt:       { poseSeq: [{ p: 'tauntArmsWide', dur: 380, e: 'Cubic.easeOut' },
                              { p: 'tauntArmsWide', dur: 500, e: 'Linear'        },
                              { p: 'idle',          dur: 450, e: 'Linear'        }] },
    jab:         { poseSeq: [{ p: 'jab',         dur:  80, e: 'Cubic.easeOut' },
                              { p: 'idle',        dur: 160, e: 'Linear'        }] },
    headbutt:    { poseSeq: [{ p: 'headbutt',    dur: 110, e: 'Cubic.easeOut' },
                              { p: 'idle',        dur: 190, e: 'Linear'        }] },
};

// ─── Drawing helper ───────────────────────────────────────────────────────────
// Returns 4 world-space points for a rotated rectangle.
// Pivot at top-center; limb hangs downward at `angle` from vertical.
// angle=0 → straight down; positive → swings right; negative → swings left.
function limbPts(px, py, w, h, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
        { x: px - w / 2 * cos,           y: py + w / 2 * sin           },
        { x: px + w / 2 * cos,           y: py - w / 2 * sin           },
        { x: px + w / 2 * cos + h * sin, y: py - w / 2 * sin + h * cos },
        { x: px - w / 2 * cos + h * sin, y: py + w / 2 * sin + h * cos },
    ];
}

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
// 'down'        flat on mat; stateTimer counts down to 0 → 'risingUp'
// 'risingUp'    350ms get-up tween; drawn as falling in reverse; no input
// 'pinned'      flat during a pin; mash action to attempt kickout
// 'pinning'     attacker holding the pin
// 'holding'     attacker applying sleeper hold
// 'sleeping'    defender in sleeper hold; mash action to escape
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
        this.stamina      = STAMINA_MAX;
        this.flipProgress  = 0;
        this.flipDir       = 1;
        this.dropProgress  = 0;
        this.elbowProgress = 0;
        this.divProgress   = 0;
        this._corner       = null;
        this._divLandY     = 0;
        this.slamPhase    = null; // 'up' | 'throwing' | 'dropping'
        this.slamType     = null; // 'slam' | 'pile' — which move is in progress
        this.slamY        = 0;
        this.pose            = { ...POSES.idle }; // live joint angles, tweened per move
        this.idlePose        = 'idle';            // character-specific resting stance — override after construction
        this.tauntPose       = 'tauntArmsWide';   // character-specific taunt — override after construction
        this._runStepTimer   = 0;
        this.gfx             = scene.add.graphics();
    }

    get s() { return perspectiveScale(this.y); }

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
            this.walkPhase = (this.walkPhase + SPEED * dt * WALK_FREQ) % (Math.PI * 2);
            this._clamp();
        } else {
            this.walkPhase *= Math.pow(0.85, dt * 60);
            // Drift toward character's idle stance while standing still (~1.5s to settle)
            const idleTarget = POSES[this.idlePose] ?? POSES.idle;
            const drift = 1 - Math.pow(0.94, dt * 60);
            for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm']) {
                this.pose[k] += (idleTarget[k] - this.pose[k]) * drift;
            }
        }

        this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_RECOVER * dt);

        const dist = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
        const minDist = 80 * this.s;
        if (dist < minDist && dist > 0) {
            const ang = Phaser.Math.Angle.Between(other.x, other.y, this.x, this.y);
            this.x = other.x + Math.cos(ang) * minDist;
            this.y = other.y + Math.sin(ang) * minDist;
            this._clamp();
        }
    }

    tickDown(dt) {
        if (this.state !== 'down' && this.state !== 'staggered') return;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            if (this.state === 'staggered') {
                this.tweenPose('idle', 180, 'Linear');
                this.state = 'standing';
            } else {
                this._startRiseUp();
            }
        }
    }

    tickRun(dt) {
        if (this.state !== 'running') return;

        const dir = Math.sign(this.runTarget - this.x);
        this.x += dir * RUN_SPEED * this.s * dt;
        this.walkPhase = (this.walkPhase + RUN_SPEED * dt * WALK_FREQ) % (Math.PI * 2);

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

        if (other.state === 'down' && this.moveSet.includes('pin')) {
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
            if (dist <= 90 * this.s && this.moveSet.includes('suplex')) {
                this._doSuplex(other);
                return 'suplex';
            }
            if (this.moveSet.includes('irishWhip')) {
                let dir = this.facing;
                if (this.input.isDown('left'))  dir = -1;
                if (this.input.isDown('right')) dir =  1;
                this._doIrishWhip(other, dir);
                return 'irishWhip';
            }
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

        if (other.state === 'down' && dist <= reach && this.moveSet.includes('elbowDrop')) {
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

    // Up key near a corner: climb to middle rope
    tryClimb() {
        if (this.state !== 'standing') return false;
        if (!this.input.justDown('up')) return false;
        const corner = this._nearCorner();
        if (!corner) return false;
        this._corner = corner;
        this.state   = 'climbing';
        this.scene.tweens.add({
            targets:  this,
            x:        corner.x,
            y:        corner.y,
            duration: 400,
            ease:     'Cubic.easeOut',
            onComplete: () => {
                if (this.state === 'climbing') {
                    this.state  = 'onTurnbuckle';
                    this.facing = corner.facing;
                }
            },
        });
        return 'climb';
    }

    // While on turnbuckle: power = dive, movement = climb down
    tryDive(other) {
        if (this.state !== 'onTurnbuckle') return false;
        if (this.input.isDown('left') || this.input.isDown('right') || this.input.isDown('down')) {
            this.state = 'climbing';
            this.scene.tweens.add({
                targets:  this,
                x:        this._corner.x,
                y:        this._corner.matY - 20,
                duration: 350,
                ease:     'Cubic.easeOut',
                onComplete: () => { if (this.state === 'climbing') this.state = 'standing'; },
            });
            return false;
        }
        if (!this.input.justDown('power')) return false;
        this._doDive(other);
        return 'dive';
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
        other._doSell('sellHead', 110, () => other.startStagger());
    }

    _doHeadbutt(other) {
        other._drain(STAMINA_DRAIN.headbutt);
        this._runPoseSequence(MOVE_DEFS.headbutt.poseSeq);
        other._doSell('sellHead', 150, () => other.startFall());
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
        other._doSell('sellChest', 150, () => other.startClotheslineFall(other.runFacing));
    }

    _doBodySlam(other) {
        other._drain(STAMINA_DRAIN.bodySlam);
        this.state      = 'slamming';
        other.state     = 'grabbed';
        other.slamPhase = 'up';
        other.slamType  = 'slam';
        const facing = this.facing;
        const sx = this.x, sy = this.y, ss = this.s;

        other.x     = sx;
        other.slamY = other.y - (88 + 112 + 34 * 0.7) * other.s;

        // Attacker visual: pose sequence runs in parallel with defender tweens
        this._runPoseSequence(MOVE_DEFS.bodySlam.poseSeq);

        // Defender phase 1 — lift inverted to held position
        this.scene.tweens.add({
            targets:  other,
            slamY:    sy - 100 * ss,
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
                // Lie flat for a beat then pop straight back up
                this.scene.time.delayedCall(110, () => {
                    if (this.state === 'elbowDropping') {
                        this.elbowProgress = 0;
                        this.state         = 'standing';
                    }
                });
            },
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
                             (other.state === 'standing' || other.state === 'down' || other.state === 'staggered');
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

    _doSleeperHold(other) {
        this.state  = 'holding';
        other.state = 'sleeping';
        this._runPoseSequence(MOVE_DEFS.sleeperHold.poseSeq);
        other.tweenPose('sleeping', 300, 'Linear');
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

    startStagger() {
        this.state      = 'staggered';
        this.stateTimer = STAGGER_SEC;
        this.tweenPose('stagger', 120, 'Cubic.easeOut');
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
        const { x, y, s, facing, state, skinCol, trunksCol } = this;
        const gfx = this.gfx;
        gfx.clear();
        // 12 + y*0.03: ~19.7 at far edge (behind near ropes at 25), ~25.4 at near edge (in front)
        gfx.setDepth(12 + y * 0.03);

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
            const airY    = y - arcFrac * 115 * s;
            gfx.fillStyle(0x000000, 0.22 + arcFrac * 0.08);
            gfx.fillEllipse(x, y, (120 + arcFrac * 50) * s, (36 + arcFrac * 10) * s);
            this._drawDropkickFront(x, airY, s, facing, skinCol, trunksCol);
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

        // Grabbed — no mat shadow (off the ground during the slam)
        if (state === 'grabbed') {
            if (this.slamType === 'pile' && (this.slamPhase === 'up' || this.slamPhase === 'dropping'))
                this._drawPiledriverHeld(x, this.slamY, s, skinCol, trunksCol);
            else if (this.slamPhase === 'up')
                this._drawInverted(x, this.slamY, s, skinCol, trunksCol);
            else
                this._drawFlat(x, y, s, facing, skinCol, trunksCol);
            return;
        }

        gfx.fillStyle(0x000000, 0.22);
        gfx.fillEllipse(x, y, 120 * s, 36 * s);

        if (state === 'down' || state === 'pinned') {
            this._drawFlat(x, y, s, facing, skinCol, trunksCol);
            return;
        }

        this._drawUpright(x, y, s, facing, skinCol, trunksCol);
    }

    _drawUpright(x, y, s, facing, skinCol, trunksCol) {
        const gfx = this.gfx;
        const wp  = this.walkPhase;
        const p   = this.pose;

        // Side-view proportions: torso is narrow (we see its depth, not its width).
        // Legs are close together; one arm draws in front of the torso, one behind.
        const lH   = 88  * s, lW  = 22 * s;
        const tH   = 112 * s, tW  = 20 * s, trH = 40 * s;
        const hR   = 34  * s;
        const aH   = 76  * s, aW  = 18 * s;

        const shinH = lH * 0.72;
        const bootH = lH * 0.28;

        const MAX_LEG = 0.38;
        const MAX_ARM = 0.26;

        // Pose angles are facing-relative; facing* converts to screen space.
        // Walk cycle blends in additively so any pose animates naturally.
        const swing   = facing * Math.sin(wp);
        const lLegAng = facing * p.lLeg + swing * MAX_LEG;
        const rLegAng = facing * p.rLeg - swing * MAX_LEG;
        const lArmAng = facing * p.lArm - swing * MAX_ARM;
        const rArmAng = facing * p.rArm + swing * MAX_ARM;

        // In side view both limbs originate from the same center x.
        // Near/far depth is handled purely by draw order, not x-offset.
        const hipY      = y - lH;
        const shoulderY = y - lH - tH + 12 * s;

        // Near/far split: when facing right the left side faces the camera (near),
        // right side faces away (far). Draw far first so near renders on top.
        const [farLA, farAA, nearLA, nearAA] =
            facing >= 0
                ? [rLegAng, rArmAng, lLegAng, lArmAng]
                : [lLegAng, lArmAng, rLegAng, rArmAng];

        const boot = (bx, ang) => [
            bx + Math.sin(ang) * shinH,
            hipY + Math.cos(ang) * shinH,
        ];

        // Far leg (behind torso)
        gfx.fillStyle(skinCol,   1); gfx.fillPoints(limbPts(x, hipY, lW, shinH, farLA), true);
        gfx.fillStyle(0x181818,  1); gfx.fillPoints(limbPts(...boot(x, farLA), lW + 4 * s, bootH, farLA), true);

        // Far arm (behind torso)
        gfx.fillStyle(skinCol, 1);
        gfx.fillPoints(limbPts(x, shoulderY, aW, aH, farAA), true);

        // Trunks + torso
        gfx.fillStyle(trunksCol, 1); gfx.fillRect(x - tW / 2, y - lH - trH, tW, trH);
        gfx.fillStyle(skinCol,   1); gfx.fillRect(x - tW / 2, y - lH - tH,  tW, tH - trH);

        // Near leg (in front of torso)
        gfx.fillStyle(skinCol,   1); gfx.fillPoints(limbPts(x, hipY, lW, shinH, nearLA), true);
        gfx.fillStyle(0x181818,  1); gfx.fillPoints(limbPts(...boot(x, nearLA), lW + 4 * s, bootH, nearLA), true);

        // Near arm (in front of torso)
        gfx.fillStyle(skinCol, 1);
        gfx.fillPoints(limbPts(x, shoulderY, aW, aH, nearAA), true);

        // Head
        gfx.fillCircle(x, y - lH - tH - hR * 0.7, hR);
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
            { x: RING.nearLeft.x,  y: RING.ropes[1].nearY, matY: RING.nearLeft.y,  facing:  1 },
            { x: RING.nearRight.x, y: RING.ropes[1].nearY, matY: RING.nearRight.y, facing: -1 },
            { x: RING.farLeft.x,   y: RING.ropes[1].farY,  matY: RING.farLeft.y,   facing:  1 },
            { x: RING.farRight.x,  y: RING.ropes[1].farY,  matY: RING.farRight.y,  facing: -1 },
        ];
        for (const c of corners) {
            if (Phaser.Math.Distance.Between(this.x, this.y, c.x, c.matY) < 70) return c;
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
