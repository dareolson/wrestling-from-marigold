// Proportions in unscaled pixels — multiply by s before placing parts.
// Lengths chosen to match the old single-piece stick-figure totals exactly
// (arm 76, leg 89≈88, torso 112) while splitting at elbow and knee joints.
const P = {
    thighH:    32,
    shinH:     32,
    bootH:     25,
    legW:      22,
    upperArmH: 34,
    forearmH:  42,
    armW:      18,
    torsoH:    112,
    torsoW:    20,
    trunksH:   40,
    headR:     34,
};

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

    updateUpright(x, y, s, facing, pose, walkPhase, combatBlend = 0, lean = 0) {
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

        const hipY      = y  - (thighH + shinH + bootH);
        const torsoTop  = hipY - torsoH;
        const shoulderY = torsoTop + 12 * s; // arm pivot slightly below torso top
        // Lean: shift shoulders and head forward in facing direction while hips stay put.
        const leanX     = Math.sin(lean) * torsoH * 0.6;
        const shoulderX = x + leanX;

        const MAX_LEG   = 0.38;
        const MAX_ARM   = 0.26;
        const KNEE_BEND = 0.22; // max shin trail behind thigh during swing
        const ELBOW_LAG = 0.14; // max forearm trail behind upper arm during swing

        const sinWP   = Math.sin(walkPhase);
        const swing   = facing * sinWP;

        // Thigh / upper-arm angles — driven by pose + walk swing (same as before)
        const lLegAng = facing * pose.lLeg + swing * MAX_LEG;
        const rLegAng = facing * pose.rLeg - swing * MAX_LEG;
        let   lArmAng = facing * pose.lArm - swing * MAX_ARM;
        let   rArmAng = facing * pose.rArm + swing * MAX_ARM;

        // Knee: shin trails the thigh during the swing phase.
        // When lLeg swings forward (+sinWP), lShin is pulled less far = knee bends.
        // Fades naturally to 0 as walkPhase decays (wrestler standing still).
        const lShinAng = lLegAng - facing * sinWP * KNEE_BEND;
        const rShinAng = rLegAng + facing * sinWP * KNEE_BEND;

        // Elbow: forearm trails upper arm in the same way.
        let lForearmAng = lArmAng + facing * sinWP * ELBOW_LAG;
        let rForearmAng = rArmAng - facing * sinWP * ELBOW_LAG;

        // Combat-ready guard: arms come up and forward as opponents close in.
        // Upper arm angles forward ~34°; forearms bent to near-horizontal (L-shape guard).
        // Only blends arm angles — legs and torso are unaffected.
        if (combatBlend > 0) {
            const GUARD_UPPER = facing * 0.60;
            const GUARD_FORE  = facing * 1.50;
            const b = combatBlend;
            lArmAng = lArmAng + (GUARD_UPPER - lArmAng) * b;
            rArmAng = rArmAng + (GUARD_UPPER - rArmAng) * b;
            lForearmAng = lForearmAng + (GUARD_FORE - lForearmAng) * b;
            rForearmAng = rForearmAng + (GUARD_FORE - rForearmAng) * b;
        }

        // Arms hang slightly in front of the body's centerline — breaks perfect mirror symmetry
        // and gives the forward-swinging arm more reach than the backward-swinging arm.
        const ARM_FWD = facing * 0.09;
        lArmAng     += ARM_FWD;
        rArmAng     += ARM_FWD;
        lForearmAng += ARM_FWD;
        rForearmAng += ARM_FWD;

        // Far side is behind torso, near side in front — draw far first.
        const [farLA, farSA, farAA, farFA, nearLA, nearSA, nearAA, nearFA] =
            facing >= 0
                ? [rLegAng, rShinAng, rArmAng, rForearmAng, lLegAng, lShinAng, lArmAng, lForearmAng]
                : [lLegAng, lShinAng, lArmAng, lForearmAng, rLegAng, rShinAng, rArmAng, rForearmAng];

        // Boot flattening: when a leg is in its planted/push-off phase the boot sole should
        // sit flat rather than tip backward with the shin. sinWP*facing > 0 = far leg planted.
        const farPlantDepth  = Math.max(0,  sinWP * facing);
        const nearPlantDepth = Math.max(0, -sinWP * facing);
        const farBootAng  = farSA  * Math.max(0.25, 1 - farPlantDepth  * 0.75);
        const nearBootAng = nearSA * Math.max(0.25, 1 - nearPlantDepth * 0.75);

        // Far leg — thigh, shin, boot chained at knee then ankle
        this._place(this.farThigh, x, hipY, legW, thighH, farLA);
        const farKnee  = this._end(x, hipY, thighH, farLA);
        this._place(this.farShin, farKnee.x, farKnee.y, legW, shinH, farSA);
        const farAnkle = this._end(farKnee.x, farKnee.y, shinH, farSA);
        this._place(this.farBoot, farAnkle.x, farAnkle.y, legW + 4 * s, bootH, farBootAng);

        // Far arm — upper arm, forearm chained at elbow
        this._place(this.farUpArm, shoulderX, shoulderY, armW, upperArmH, farAA);
        const farElbow = this._end(shoulderX, shoulderY, upperArmH, farAA);
        this._place(this.farForearm, farElbow.x, farElbow.y, armW, forearmH, farFA);

        // Torso + trunks — always vertical
        this._place(this.torso,  x, torsoTop,       torsoW, torsoH - trunksH, 0);
        this._place(this.trunks, x, hipY - trunksH, torsoW, trunksH,          0);

        // Near leg
        this._place(this.nearThigh, x, hipY, legW, thighH, nearLA);
        const nearKnee  = this._end(x, hipY, thighH, nearLA);
        this._place(this.nearShin, nearKnee.x, nearKnee.y, legW, shinH, nearSA);
        const nearAnkle = this._end(nearKnee.x, nearKnee.y, shinH, nearSA);
        this._place(this.nearBoot, nearAnkle.x, nearAnkle.y, legW + 4 * s, bootH, nearBootAng);

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

    destroy() {
        this._parts.forEach(p => p.destroy());
    }
}
