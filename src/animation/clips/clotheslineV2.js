// ?light=v1 (Derek 2026-11-14: "the clothesline doesn't make contact"): the old clothesline sold on the cocked frame, 100 ms before the arm came
// through, with the runner still 110-145 px off, and its arm (lArm 1.18, elbow loose) passed at hip height. Wrestler._doClotheslineV2 times the
// swing to the runner instead: the cock stretches to his arrival, the attacker takes the last step, and the hit lands on the swing's last frame.
// Per rig: the arm straight at the runner's neck, and `contact` = body-to-body distance (units) at which the runner's neck meets the forearm
// near the wrist (tools/debug/strike_contact.mjs clothesline).
const ARM = {
    'thesz-procreate-v1': { lArm: 1.68, bend: 0.20, contact: 64 },
    'george-roster-v1':   { lArm: 1.88, bend: 0.25, contact: 52 },
    'guido-roster-v1':    { lArm: 1.95, bend: 0.25, contact: 50 },
    'kowalski-roster-v1': { lArm: 1.68, bend: 0.20, contact: 58 },
};
const DEFAULT = ARM['george-roster-v1'];
export const CLOTHESLINE_SWING_MS = 80;
// The cock stretches so the arm arrives with the runner, within these bounds (the old cock was 100 ms).
export const CLOTHESLINE_ARRIVE_MS = { min: 140, max: 300 };

export function clotheslineV2For(rigId) {
    const { lArm, bend, contact } = ARM[rigId] ?? DEFAULT;
    return {
        contact,
        cock:   { lLeg: -0.08, rLeg: 0.28, lArm: -0.85, rArm: -0.18, lElbow: 0.3, lean: -0.12, bend: -0.05 },
        swing:  { lLeg: -0.15, rLeg: 0.38, lArm, rArm: -0.28, lElbow: 0, lean: 0.30, bend },
        follow: { lLeg: -0.22, rLeg: 0.46, lArm: lArm - 0.35, rArm: -0.40, lElbow: 0.15, lean: 0.38, bend: bend * 0.6 },
        idle:   { lLeg: -0.04, rLeg: 0.16, lArm: 0, rArm: 0, lElbow: 0.75, lean: 0, crouch: 0, bend: 0 },
    };
}
