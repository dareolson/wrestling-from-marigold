// Proportions in unscaled pixels — multiply by s before placing parts.
// Lengths chosen to match the old single-piece stick-figure totals exactly
// (arm 76, leg 89≈88, torso 112) while splitting at elbow and knee joints.
const P = {
    thighH:    32,
    shinH:     32,
    bootH:     25,
    legW:      26,
    upperArmH: 34,
    forearmH:  42,
    armW:      18,
    torsoH:    112,
    torsoW:    20,
    trunksH:   40,
    headR:     34,
};

const TAU = Math.PI * 2;

// ─── Gait tuning ─────────────────────────────────────────────────────────────
// STRIDE  — full front-to-back foot travel, unscaled px
// STANCE  — fraction of the cycle a foot is planted (vs. swinging)
// LIFT    — how high the swing foot lifts off the mat, unscaled px
//
// WALK_FREQ is DERIVED, not guessed. For a planted foot to stay locked in world
// space (no skating), its backward sweep speed must exactly cancel the body's
// forward speed. Working that through (see BUILDLOG), the lock condition is:
//     WALK_FREQ = STANCE * 2π / STRIDE
// and it is independent of SPEED — so the same stride locks at walk and run pace.
export const GAIT = {
    STRIDE: 56,   // step length — long enough to slow the cadence, short enough not to lunge
    STANCE: 0.55, // a touch less ground time so the forward recovery swing reads
    LIFT:   22,   // pick the feet up enough that the step is legible, not a backward paw
    get WALK_FREQ() { return this.STANCE * TAU / this.STRIDE; },
};

// Foot offset for one leg at a given gait phase.
//   fx       — horizontal offset from the hip, unscaled px (+ = forward of hip)
//   lift     — vertical lift off the mat, unscaled px
//   liftFrac — 0 planted … 1 peak of swing
function footGait(phase) {
    const t = (((phase % TAU) + TAU) % TAU) / TAU; // 0..1
    if (t < GAIT.STANCE) {
        // Stance: foot planted, sweeping linearly from front to back at ground speed.
        const u = t / GAIT.STANCE;
        return { fx: GAIT.STRIDE * (0.5 - u), lift: 0, liftFrac: 0 };
    }
    // Swing: foot lifts in a sine arc and eases forward to the next plant.
    const u = (t - GAIT.STANCE) / (1 - GAIT.STANCE);
    const e = u * u * (3 - 2 * u);                 // smoothstep — accelerate then settle
    const liftFrac = Math.sin(Math.PI * u);
    return { fx: GAIT.STRIDE * (-0.5 + e), lift: GAIT.LIFT * liftFrac, liftFrac };
}

// Two-bone IK (law of cosines). Root at (hx,hy), target at (fx,fy); bone lengths
// L1 (thigh) and L2 (shin). kneeDir (±1) picks which way the knee points.
// Angles use the skeleton convention: 0 = straight down, +angle rotates toward +x
// (so endpoint = pivot + (sin·len, cos·len)).
function solveLeg(hx, hy, fx, fy, L1, L2, kneeDir) {
    let dx = fx - hx, dy = fy - hy;
    let dist = Math.hypot(dx, dy);
    const reach = (L1 + L2) * 0.999;
    if (dist > reach) { const k = reach / dist; dx *= k; dy *= k; dist = reach; }
    if (dist < 1e-3) dist = 1e-3;
    const aFoot = Math.atan2(dx, dy);
    let c = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
    c = Math.min(1, Math.max(-1, c));
    const thighAng = aFoot + kneeDir * Math.acos(c);
    const kx = hx + Math.sin(thighAng) * L1;
    const ky = hy + Math.cos(thighAng) * L1;
    const shinAng = Math.atan2(fx - kx, fy - ky);
    return { thighAng, shinAng };
}

function ensureTexture(scene) {
    if (scene.textures.exists('sk_pixel')) return;
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture('sk_pixel', 2, 2);
    g.destroy();
}

export default class Skeleton {
    constructor(scene, skinCol, trunksCol) {
        ensureTexture(scene);
        this._headCol  = skinCol;
        this.skinCol   = skinCol;
        this.trunksCol = trunksCol;

        const img = col => scene.add.image(0, 0, 'sk_pixel').setOrigin(0.5, 0).setTint(col);

        this.farThigh    = img(skinCol);
        this.farShin     = img(skinCol);
        this.farBoot     = img(0x181818);
        this.farUpArm    = img(skinCol);
        this.farForearm  = img(skinCol);
        this.torso       = img(skinCol);
        this.trunks      = img(trunksCol);
        this.nearThigh   = img(skinCol);
        this.nearShin    = img(skinCol);
        this.nearBoot    = img(0x181818);
        this.nearUpArm   = img(skinCol);
        this.nearForearm = img(skinCol);
        this.head        = scene.add.graphics();

        this._parts = [
            this.farThigh, this.farShin, this.farBoot,
            this.farUpArm, this.farForearm,
            this.torso, this.trunks,
            this.nearThigh, this.nearShin, this.nearBoot,
            this.nearUpArm, this.nearForearm,
            this.head,
        ];
    }

    // Sub-depths enforce far→torso→near→head layering within a single wrestler depth slot.
    setDepth(base) {
        this.farThigh.setDepth(base);
        this.farShin.setDepth(base);
        this.farBoot.setDepth(base);
        this.farUpArm.setDepth(base);
        this.farForearm.setDepth(base);
        this.torso.setDepth(base + 0.001);
        this.trunks.setDepth(base + 0.002);
        this.nearThigh.setDepth(base + 0.003);
        this.nearShin.setDepth(base + 0.003);
        this.nearBoot.setDepth(base + 0.003);
        this.nearUpArm.setDepth(base + 0.004);
        this.nearForearm.setDepth(base + 0.004);
        this.head.setDepth(base + 0.005);
    }

    setVisible(v) {
        this._parts.forEach(p => p.setVisible(v));
    }

    // Place a limb Image: pivot at top-center (origin 0.5, 0), rotated by angle.
    _place(img, px, py, w, h, angle) {
        img.setPosition(px, py)
           .setRotation(angle)
           .setDisplaySize(Math.max(1, w), Math.max(1, h));
    }

    // World-space endpoint (bottom) of a limb given its pivot and length.
    _end(px, py, h, angle) {
        return {
            x: px + Math.sin(angle) * h,
            y: py + Math.cos(angle) * h,
        };
    }

    updateUpright(x, y, s, facing, pose, walkPhase, combatBlend = 0, lean = 0, moveBlend = 0) {
        const thighH    = P.thighH    * s;
        const shinH     = P.shinH     * s;
        const bootH     = P.bootH     * s;
        const legW      = P.legW      * s;
        const upperArmH = P.upperArmH * s;
        const forearmH  = P.forearmH  * s;
        const armW      = P.armW      * s;
        const torsoH    = P.torsoH    * s;
        const torsoW    = P.torsoW    * s;
        const trunksH   = P.trunksH   * s;
        const headR     = P.headR     * s;

        const sinWP = Math.sin(walkPhase);
        const swing = facing * sinWP;

        // Use the procedural foot-locking gait for walking and plain idle. When a move
        // poses the legs (slam, lockup, sleeper, etc.) and the wrestler is essentially
        // stationary, fall back to the original pose-driven FK so those moves are untouched.
        const poseLegActive = Math.abs(pose.lLeg) + Math.abs(pose.rLeg) > 0.05;
        const useGait = moveBlend > 0.2 || !poseLegActive;

        // ── Hip height ──────────────────────────────────────────────────────────
        // In gait mode the hip rides on whichever leg is bearing weight, so the body
        // bob EMERGES from leg geometry instead of being a bolted-on sine. The hip can
        // never be higher than a planted (near-straight) leg allows: H = min(reach_i).
        const legLen     = thighH + shinH;       // hip → ankle chain
        const ankleRest  = bootH * 0.9;          // ankle rides this far above the mat
        const ankleGndY  = y - ankleRest;
        const LMAX       = legLen * 0.985;        // never fully lock the knee

        const footA = footGait(walkPhase);
        const footB = footGait(walkPhase + Math.PI);

        let hipY;
        if (useGait) {
            const dxA = footA.fx * s, dxB = footB.fx * s;
            const reachA = Math.sqrt(Math.max(0, LMAX * LMAX - dxA * dxA));
            const reachB = Math.sqrt(Math.max(0, LMAX * LMAX - dxB * dxB));
            const hipYwalk  = ankleGndY - Math.min(reachA, reachB);
            const hipYstand = ankleGndY - LMAX * 0.99;
            hipY = hipYstand + (hipYwalk - hipYstand) * Math.min(1, moveBlend);
        } else {
            hipY = y - (thighH + shinH + bootH);
        }

        const torsoTop  = hipY - torsoH;
        const shoulderY = torsoTop + 12 * s; // arm pivot slightly below torso top
        // Lean: shift shoulders and head forward in facing direction while hips stay put.
        const leanX     = Math.sin(lean) * torsoH * 0.6;
        const shoulderX = x + leanX;

        const MAX_ARM   = 0.26;
        const ELBOW_LAG = 0.14; // max forearm trail behind upper arm during swing

        // Upper-arm angles — pose + counter-swing against the legs.
        let lArmAng = facing * pose.lArm - swing * MAX_ARM;
        let rArmAng = facing * pose.rArm + swing * MAX_ARM;
        let lForearmAng = lArmAng + facing * sinWP * ELBOW_LAG;
        let rForearmAng = rArmAng - facing * sinWP * ELBOW_LAG;

        // Combat-ready guard: arms come up and forward as opponents close in.
        if (combatBlend > 0) {
            const GUARD_UPPER = facing * 0.60;
            const GUARD_FORE  = facing * 1.50;
            const b = combatBlend;
            lArmAng = lArmAng + (GUARD_UPPER - lArmAng) * b;
            rArmAng = rArmAng + (GUARD_UPPER - rArmAng) * b;
            lForearmAng = lForearmAng + (GUARD_FORE - lForearmAng) * b;
            rForearmAng = rForearmAng + (GUARD_FORE - rForearmAng) * b;
        }

        // Arms hang slightly in front of the centerline — breaks mirror symmetry.
        const ARM_FWD = facing * 0.09;
        lArmAng     += ARM_FWD;
        rArmAng     += ARM_FWD;
        lForearmAng += ARM_FWD;
        rForearmAng += ARM_FWD;

        const [farAA, farFA, nearAA, nearFA] =
            facing >= 0
                ? [rArmAng, rForearmAng, lArmAng, lForearmAng]
                : [lArmAng, lForearmAng, rArmAng, rForearmAng];

        // ── Legs ────────────────────────────────────────────────────────────────
        let far, near;
        if (useGait) {
            // Two feet half a cycle apart, knees solved by IK. A=near, B=far.
            far  = this._gaitLeg(footB, facing, x, hipY, ankleGndY, thighH, shinH, s);
            near = this._gaitLeg(footA, facing, x, hipY, ankleGndY, thighH, shinH, s);
        } else {
            // Original pose-driven FK (move stances). Preserves the facing-based
            // far/near mapping and per-leg swing alternation exactly as before.
            const MAX_LEG = 0.38, KNEE_BEND = 0.22;
            const lLegAng = facing * pose.lLeg + swing * MAX_LEG;
            const rLegAng = facing * pose.rLeg - swing * MAX_LEG;
            const lShinAng = lLegAng - facing * sinWP * KNEE_BEND;
            const rShinAng = rLegAng + facing * sinWP * KNEE_BEND;
            const farPlant  = Math.max(0,  sinWP * facing);
            const nearPlant = Math.max(0, -sinWP * facing);
            const mk = (t, sh, plant) => ({
                hx: x, hy: hipY, thighAng: t, shinAng: sh,
                bootAng: sh * Math.max(0.25, 1 - plant * 0.75),
            });
            if (facing >= 0) {
                far  = mk(rLegAng, rShinAng, farPlant);
                near = mk(lLegAng, lShinAng, nearPlant);
            } else {
                far  = mk(lLegAng, lShinAng, farPlant);
                near = mk(rLegAng, rShinAng, nearPlant);
            }
        }

        // Far leg — drawn first (behind torso)
        this._place(this.farThigh, far.hx, far.hy, legW, thighH, far.thighAng);
        const farKnee  = this._end(far.hx, far.hy, thighH, far.thighAng);
        this._place(this.farShin, farKnee.x, farKnee.y, legW, shinH, far.shinAng);
        const farAnkle = this._end(farKnee.x, farKnee.y, shinH, far.shinAng);
        this._place(this.farBoot, farAnkle.x, farAnkle.y, legW + 4 * s, bootH, far.bootAng);

        // Far arm
        this._place(this.farUpArm, shoulderX, shoulderY, armW, upperArmH, farAA);
        const farElbow = this._end(shoulderX, shoulderY, upperArmH, farAA);
        this._place(this.farForearm, farElbow.x, farElbow.y, armW, forearmH, farFA);

        // Torso + trunks — always vertical
        this._place(this.torso,  x, torsoTop,       torsoW, torsoH - trunksH, 0);
        this._place(this.trunks, x, hipY - trunksH, torsoW, trunksH,          0);

        // Near leg — drawn in front of torso
        this._place(this.nearThigh, near.hx, near.hy, legW, thighH, near.thighAng);
        const nearKnee  = this._end(near.hx, near.hy, thighH, near.thighAng);
        this._place(this.nearShin, nearKnee.x, nearKnee.y, legW, shinH, near.shinAng);
        const nearAnkle = this._end(nearKnee.x, nearKnee.y, shinH, near.shinAng);
        this._place(this.nearBoot, nearAnkle.x, nearAnkle.y, legW + 4 * s, bootH, near.bootAng);

        // Near arm
        this._place(this.nearUpArm, shoulderX, shoulderY, armW, upperArmH, nearAA);
        const nearElbow = this._end(shoulderX, shoulderY, upperArmH, nearAA);
        this._place(this.nearForearm, nearElbow.x, nearElbow.y, armW, forearmH, nearFA);

        // Head — circle centered above torso top, follows shoulder lean
        const headY = torsoTop - headR * 0.7;
        this.head.clear();
        this.head.fillStyle(this._headCol, 1);
        this.head.fillCircle(shoulderX, headY, headR);
    }

    // Gait leg: foot target from footGait, knee solved by two-bone IK. The planted
    // boot rolls flat-forward over the ball of the foot; the swing boot trails the shin.
    _gaitLeg(foot, facing, x, hipY, ankleGndY, thighH, shinH, s) {
        const footX = x + facing * foot.fx * s;
        const footY = ankleGndY - foot.lift * s;
        const { thighAng, shinAng } = solveLeg(x, hipY, footX, footY, thighH, shinH, facing);
        // Boot continues the line of the shin (no kink so it never reads as a detached
        // block) with just a small forward toe.
        const bootAng = shinAng + facing * 0.35;
        return { hx: x, hy: hipY, thighAng, shinAng, bootAng };
    }

    destroy() {
        this._parts.forEach(p => p.destroy());
    }
}
