// PLAN_GEORGE_PERFORMANCE A, "Admire me / how dare you" (?light=v1&georgePerformance=1): after the strut settles, George stands still and
// presents himself to the crowd, holds for the applause that does not come, recoils offended, sweeps the crowd away with the near forearm
// and hands back to his idle. Upper body only: the legs, crouch and any knee/shin channels hold the stance he starts from, so the soles stay
// planted and no knee is authored. One-wrestler clip; Wrestler._doCrowdTaunt plays it and drives the face on its events.
// Angles are a first pass by eye on the rig (lArm ~1.1 = forearm level at the face, jab.js); Derek judges.
export const CROWD_TAUNT = {
    times: { settle: 0.30, present: 0.70, holdEnd: 1.35, recoil: 1.60, sweepMid: 1.83, sweep: 2.05, end: 2.60 },
    keys: {
        // chest up, elbows out
        settle:  { lArm: 0.30, rArm: 0.05, lElbow: 0.85, rElbow: 0.85, lean: -0.08, bend: -0.04 },
        // arms open below the shoulder, the near arm leading, elbows soft: "here I am"
        present: { lArm: 0.85, rArm: 0.55, lElbow: 0.45, rElbow: 0.55, lean: -0.14, bend: -0.08 },
        // the hold: almost still, a touch more open
        hold:    { lArm: 0.90, rArm: 0.60, lElbow: 0.42, rElbow: 0.52, lean: -0.15, bend: -0.09 },
        // offended: chest draws back, the near hand comes to the upper chest (below the face), the far arm drops
        recoil:  { lArm: 0.40, rArm: 0.25, lElbow: 2.10, rElbow: 0.90, lean: -0.24, bend: -0.14 },
        // the dismissal: the near forearm sweeps out and down once, low
        sweepMid:{ lArm: 0.80, rArm: 0.20, lElbow: 1.10, rElbow: 0.85, lean: -0.16, bend: -0.06 },
        sweep:   { lArm: 0.55, rArm: 0.15, lElbow: 0.35, rElbow: 0.80, lean: -0.10, bend: -0.02 },
    },
};

// PLAN_GEORGE_PERFORMANCE B, "Effortless superiority": with the other man down, a chest lift, the near hand turned out at waist height to
// present him ("look what I did"), the far fist on the hip, a self-satisfied pause, back to guard. 1.15 s, no travel.
export const SUPERIORITY = {
    times: { lift: 0.20, present: 0.40, holdEnd: 0.90, end: 1.15 },
    keys: {
        lift:    { lArm: 0.25, rArm: -0.10, lElbow: 0.80, rElbow: 1.20, lean: -0.12, bend: -0.06 },
        present: { lArm: 0.55, rArm: -0.25, lElbow: 0.55, rElbow: 1.70, lean: -0.15, bend: -0.08 },
        hold:    { lArm: 0.58, rArm: -0.25, lElbow: 0.52, rElbow: 1.70, lean: -0.16, bend: -0.09 },
    },
};

const UPPER = ['lArm', 'rArm', 'lElbow', 'rElbow', 'lean', 'bend'];

// `stance`: the pose he is in when it starts (his own idle after the strut). Its lower body is held on every key; the first key is the stance
// itself and the last returns the upper body to `idle` (his idlePose, so tweening on to it afterwards is a no-op).
export function georgeCrowdTauntClip(stance, idle = stance, spec = CROWD_TAUNT) {
    const t = spec.times;
    const lower = Object.fromEntries(Object.entries(stance).filter(([k, v]) => Number.isFinite(v) && !UPPER.includes(k) && !['tilt', 'lift'].includes(k)));
    const upperOf = p => Object.fromEntries(UPPER.map(k => [k, Number.isFinite(p[k]) ? p[k] : (k.endsWith('Elbow') ? 0.7 : 0)]));
    const key = (at, upper, ease = 'easeInOut') => ({ at, ease, pose: { ...lower, ...upper } });
    return {
        id: 'georgeCrowdTaunt',
        duration: t.end,
        events: [{ at: t.settle, type: 'present' }, { at: t.holdEnd, type: 'reject' }, { at: t.recoil, type: 'dismiss' }, { at: t.sweep, type: 'release' }],
        tracks: { attacker: { keyframes: [
            key(0, upperOf(stance)),
            key(t.settle, spec.keys.settle),
            key(t.present, spec.keys.present),
            key(t.holdEnd, spec.keys.hold, 'linear'),
            key(t.recoil, spec.keys.recoil, 'easeOut'),
            key(t.sweepMid, spec.keys.sweepMid),
            key(t.sweep, spec.keys.sweep, 'easeOut'),
            key(t.end, upperOf(idle)),
        ] } },
    };
}

export function georgeSuperiorityClip(stance, idle = stance, spec = SUPERIORITY) {
    const t = spec.times;
    const lower = Object.fromEntries(Object.entries(stance).filter(([k, v]) => Number.isFinite(v) && !UPPER.includes(k) && !['tilt', 'lift'].includes(k)));
    const upperOf = p => Object.fromEntries(UPPER.map(k => [k, Number.isFinite(p[k]) ? p[k] : (k.endsWith('Elbow') ? 0.7 : 0)]));
    const key = (at, upper, ease = 'easeInOut') => ({ at, ease, pose: { ...lower, ...upper } });
    return {
        id: 'georgeSuperiority',
        duration: t.end,
        events: [{ at: 0.05, type: 'superior' }, { at: t.holdEnd, type: 'release' }],   // the runtime does not fire an event at 0
        tracks: { attacker: { keyframes: [
            key(0, upperOf(stance)),
            key(t.lift, spec.keys.lift),
            key(t.present, spec.keys.present, 'easeOut'),
            key(t.holdEnd, spec.keys.hold, 'linear'),
            key(t.end, upperOf(idle)),
        ] } },
    };
}
