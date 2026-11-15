// Shared phrases for mat holds (PLAN_LIGHT_MOVES build rules: reuse phrases, don't copy key blocks). The half crab is the first user; the pickup is
// ankleLockV2's entry. Each takes the move's merged spec and returns poses; the clip decides when and where they play.

// The attacker's step around the man's leg. The facing flips on the `cross` pose: legs crossing, knees and elbows straight, because knees and elbows bend toward
// the facing and any other pose snaps when mirrored.
export const turnPoses = att => ({
    wide:  { ...att, crouch: 0.5, bend: 0.1, lean: 0, lLeg: 0.38, rLeg: -0.38, lFold: 0.35, rFold: 0.35, lArm: 0.1, lElbow: 0.7, rArm: 0.1, rElbow: 0.4 },
    cross: { ...att, crouch: 0, bend: 0, lean: 0, lLeg: 0, rLeg: 0, lFold: 0, rFold: 0, lArm: 0, lElbow: 0, rArm: 0, rElbow: 0 },
});

// The receiver's roll onto his front: the flip is stepped on the mirrored pose (`over` -> `down`).
export const rollPoses = def => {
    const down = { ...def, tilt: Math.PI / 2, lift: -100, lLeg: -0.5, rLeg: 0.1, lFold: 0, rFold: 0, lArm: 0.05, rArm: 0.05, lElbow: 0, rElbow: 0 };
    return { down, over: { ...down, tilt: -Math.PI / 2, lLeg: 0.5, rLeg: -0.1, lArm: -0.05, rArm: -0.05 } };
};

// The attacker's exit: he rises and backs out along the mat, facing unchanged (three poses, the caller sets the gap), then the receiver lets the leg go and lies.
export const exitPoses = (att, def) => ({
    attacker: [
        { crouch: 1.0, bend: 0.1, lean: 0, lFold: 1.4, rFold: 1.4, lArm: 0, lElbow: 0.6, rArm: 0, rElbow: 0.3 },
        { crouch: 0.5, bend: 0.1, lean: 0, lFold: 0.8, rFold: 0.8, lArm: 0, lElbow: 0.3, rArm: 0, rElbow: 0.2 },
        { crouch: 0.2, bend: 0, lean: 0, lFold: 0.3, rFold: 0.3, lArm: 0, lElbow: 0.1, rArm: 0, rElbow: 0.1 },
    ].map(p => ({ ...att, ...p })),
    defenderLetGo: { ...def, lLeg: def.lLeg + 0.3, lFold: def.lFold - 0.4 },
    defenderLies:  { ...def, lLeg: 0.1, lFold: 0.3, lArm: 1.2, rArm: 2.2, lElbow: 0.8, rElbow: 0.5 },
});
