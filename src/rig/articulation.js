export const JOINT_LIMITS = Object.freeze({
    elbow: Object.freeze({ min: -0.12, max: 2.75, preferred: 0.70 }),
    knee: Object.freeze({ min: -0.10, max: 2.55, preferred: 0.22 }),
});

export const MANNEQUIN_ARTICULATION_MATRIX = Object.freeze({
    extended: Object.freeze({ shoulder: 0.10, elbow: 0.02, hip: -0.08, knee: 0.08 }),
    guard90: Object.freeze({ shoulder: 0.55, elbow: Math.PI / 2, hip: 0.05, knee: 0.45 }),
    deepFlex: Object.freeze({ shoulder: 0.30, elbow: 2.45, hip: 0.45, knee: 2.20 }),
    overhead: Object.freeze({ shoulder: 2.65, elbow: 0.55, hip: -0.25, knee: 0.35 }),
});

// The local-flex channels are the production contract. The absolute child-
// angle channels remain readable for old rig-tuner exports, but a joint may
// never be owned by both representations at once: Skeleton necessarily gives
// local flex precedence, which otherwise leaves a legacy value animating
// invisibly underneath it and makes the result depend on pose history.
export const ARTICULATION_CHANNEL_PAIRS = Object.freeze([
    Object.freeze({ local: 'lElbow', legacy: 'lForearm' }),
    Object.freeze({ local: 'rElbow', legacy: 'rForearm' }),
    Object.freeze({ local: 'lKnee', legacy: 'lShin' }),
    Object.freeze({ local: 'rKnee', legacy: 'rShin' }),
]);

export const ARTICULATED_CHANNELS = Object.freeze(
    ARTICULATION_CHANNEL_PAIRS.flatMap(({ local, legacy }) => [local, legacy]),
);

// Return the single representation authored for each joint. New/local wins if
// malformed compatibility content supplies both; callers also remove the
// losing live channel so there is one authoritative value after the write.
export function authoredArticulationChannels(pose = {}) {
    return ARTICULATION_CHANNEL_PAIRS.flatMap(({ local, legacy }) => {
        if (Number.isFinite(pose[local])) return [{ channel: local, counterpart: legacy, mode: 'local' }];
        if (Number.isFinite(pose[legacy])) return [{ channel: legacy, counterpart: local, mode: 'legacy' }];
        return [];
    });
}

export function mergeArticulatedPose(target, sample = {}) {
    const selected = authoredArticulationChannels(sample);
    for (const { channel, counterpart } of selected) {
        delete target[counterpart];
        target[channel] = sample[channel];
    }
    for (const [key, value] of Object.entries(sample)) {
        if (!ARTICULATED_CHANNELS.includes(key)) target[key] = value;
    }
    return target;
}

export function clampLocalFlex(value, joint) {
    const limits = JOINT_LIMITS[joint];
    if (!limits) throw new RangeError(`unknown articulated joint ${joint}`);
    const flex = Number.isFinite(value) ? value : limits.preferred;
    return Math.max(limits.min, Math.min(limits.max, flex));
}

// Local flex is facing-independent content. Positive values bend toward the
// wrestler's authored forward direction; facing only mirrors the solved world
// angle. This prevents a left-facing pose from becoming hyperextended.
export function childAngleFromLocalFlex(parentWorldAngle, localFlex, facing, joint) {
    if (facing !== 1 && facing !== -1) throw new RangeError('facing must be 1 or -1');
    return parentWorldAngle + facing * clampLocalFlex(localFlex, joint);
}

export function localFlexFromChildAngle(parentWorldAngle, childWorldAngle, facing, joint) {
    return clampLocalFlex((childWorldAngle - parentWorldAngle) * facing, joint);
}
