// The landing (PLAN_FALLS D5, T2.1): what a body does on the mat in the half second after it hits, as offsets on top of the lying pose
// (Skeleton.lyingBase), in the grounded channels of sells.js (hip height in px at s = 1, absolute segment angles). Pure data and math, like sells.js;
// Wrestler plays it, one response for every path to the mat.
//
//   contact -> compression -> rebound (a ballistic hop, a second smaller one at intensity >= 0.8) -> settle -> wince
//
// Authored and bounded, not a ragdoll. Each limb has its own lag, frequency and damping so the limbs flail at different times and their amplitude falls
// with every rebound. Every knee and elbow offset is BEND-ONLY (flex change >= 0): the drawn flex is never below the rest pose's, so nothing hyperextends
// whatever the keys do; the caps keep the bend under JOINT_LIMITS. The arms only ever move away from the torso's line (the missile test, D6).
// Every offset is exactly 0 at the end, so the sell, the hold and the get-up start from the rest pose with no step.
//
// Angle sense as in sells.js, facing right (the renderer mirrors): supine torso + presses the shoulders down, - lifts them; prone torso + lifts the chest.
// A knee's flex is thigh - shin and an elbow's is forearm - arm, both > 0 when bent the proper way.

export const GRAVITY = 1100;   // px/s^2 at s = 1: a standing man (pelvis 88 px) free-falls in 0.40 s (D4)
export const REF_VY = 440;     // px/s at s = 1: the pelvis's speed at the end of that free fall; the incoming speed that scales the rebound is read against it
export const REBOUND_PX = 11;  // rebound height per unit intensity at the reference speed: Lou at 0.7 hops 7.7 px (the 6-10 px tuning target)
const REBOUND_MAX = 14;
const COMPRESS_SEC = 0.05;
const SECOND_HOP_FROM = 0.8;   // intensity at which a second, smaller hop happens
const SETTLE_SEC = 0.32;       // from the last contact to the end: the limbs settle and the wince builds, then everything fades to the rest pose
const FADE_SEC = 0.12;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (u) => { const k = clamp(u, 0, 1); return k * k * (3 - 2 * k); };

// Per-kind constants. `lift` is the torso's sign for the upper body leaving the mat; `press` its opposite.
export const KINDS = Object.freeze({
    // a back bump: shoulders and arms meet the mat together, the arms slap out (D3)
    back: Object.freeze({ lift: -1, torsoPerPx: 0.014, compress: 2.5, torsoPress: 0.05, nearArmSign: -1, farArmSign: 1, armSlap: 0.30, elbowMax: 0.35, kneeNear: 0.34, kneeFar: 0.24, wince: { torso: -0.10, knee: 0.22 } }),
    // a forward fall: hands and forearms land first (1-2 frames before the chest), the chest bounces, the heels kick up
    front: Object.freeze({ lift: 1, torsoPerPx: 0.012, compress: 2.0, torsoPress: 0.04, nearArmSign: 1, farArmSign: 1, armSlap: 0.12, elbowMax: 0.30, kneeNear: 0.30, kneeFar: 0.22, wince: { torso: 0.07, knee: 0.20 } }),
});

/** The hop schedule: when he leaves the mat and lands, from intensity (0-1) and the incoming speed (px/s at s = 1, positive down). */
export function reboundPlan(intensity, incomingVy = REF_VY) {
    const i = clamp(intensity, 0, 1.2), speed = clamp(incomingVy / REF_VY, 0.4, 1.6);
    const h1 = Math.min(REBOUND_MAX, REBOUND_PX * i * speed);
    const hops = [];
    let t = COMPRESS_SEC;
    const heights = i >= SECOND_HOP_FROM ? [h1, h1 * 0.32] : [h1];
    for (const h of heights) {
        const air = 2 * Math.sqrt(2 * h / GRAVITY);
        hops.push({ t0: t, air, h });
        t += air + 0.03;   // the re-contact's own small compression
    }
    const lastContact = hops[hops.length - 1].t0 + hops[hops.length - 1].air;
    return { hops, contacts: [0, ...hops.map(p => p.t0 + p.air)], end: lastContact + SETTLE_SEC, h1 };
}

/** Total length of the landing, seconds. */
export function landingDuration(kind, intensity, incomingVy = REF_VY) { return reboundPlan(intensity, incomingVy).end; }

// The pelvis's height above the rest pose at t: 0 in contact, a parabola in flight.
function hopHeight(plan, t) {
    for (const p of plan.hops) if (t >= p.t0 && t <= p.t0 + p.air) { const u = t - p.t0; return Math.max(0, (GRAVITY / 2) * u * (p.air - u)); }
    return 0;
}

// One limb's lagged, damped wave in [-1, 1] sign, bend-only variant below: starts at `lag`, `freq` cycles a second, e^(-t/tau).
function wave(t, lag, freq, tau) { return t <= lag ? 0 : Math.exp(-(t - lag) / tau) * Math.sin(2 * Math.PI * freq * (t - lag)); }
function bend(t, lag, freq, tau) { return t <= lag ? 0 : Math.exp(-(t - lag) / tau) * (1 - Math.cos(2 * Math.PI * freq * (t - lag))) / 2; }   // >= 0

/**
 * The offsets at `t` seconds after contact.
 * @param {'back'|'front'} kind  the body's landing: on the back (supine) or the front (prone)
 * @param {number} intensity     the move's sell intensity, 0-1
 * @param {number} incomingVy    pelvis speed at contact, px/s at s = 1 (REF_VY if unknown)
 * @param {number} t             seconds since contact
 * @returns {{ d: Object<string, number>, done: boolean, phase: string, lift: number }} channel offsets over the rest pose; `lift` is the pelvis hop in px
 */
export function landingResponse(kind, intensity, incomingVy, t) {
    const K = KINDS[kind];
    if (!K) throw new RangeError(`unknown landing kind "${kind}"`);
    const i = clamp(intensity, 0, 1.2), plan = reboundPlan(i, incomingVy);
    if (t >= plan.end) return { d: zero(), done: true, phase: 'done', lift: 0 };
    const tt = Math.max(0, t);
    const fade = 1 - smooth((tt - (plan.end - FADE_SEC)) / FADE_SEC);   // 1 until the last 0.12 s, then 0 at the end: every offset reaches the rest pose
    const h = hopHeight(plan, tt);
    // compression: the first contact and each re-contact flatten the trunk for a few frames (a pulse of the contact's own weight)
    let press = 0;
    plan.contacts.forEach((c, k) => { const w = k === 0 ? 1 : 0.4, len = k === 0 ? COMPRESS_SEC : 0.03; if (tt >= c && tt < c + len) press = Math.max(press, w * Math.sin(Math.PI * (tt - c) / len)); });
    const lastContact = plan.contacts[plan.contacts.length - 1];
    const wince = smooth((tt - lastContact - 0.04) / 0.14);   // builds after the last contact, the fade takes it back to the rest pose
    const a = Math.min(1, 0.4 + i);                            // limb amplitude scale: a soft landing still moves the limbs a little
    const d = {};
    d.hip = (-K.compress * i * press + h) * fade;
    d.torso = ((-K.lift) * K.torsoPress * i * press + K.lift * K.torsoPerPx * h + K.wince.torso * wince) * fade;
    // legs: the thighs follow the pelvis a beat late; the knees only bend (heels kick up for the prone body)
    const fNear = K.kneeNear * a * bend(tt, 0.02, 4.2, 0.30) + K.wince.knee * wince, fFar = K.kneeFar * a * bend(tt, 0.06, 3.6, 0.26) + K.wince.knee * 0.7 * wince;
    const thighNear = (kind === 'back' ? 1 : 0) * 0.20 * a * wave(tt, 0.03, 3.4, 0.28), thighFar = (kind === 'back' ? 1 : 0) * 0.15 * a * wave(tt, 0.07, 3.0, 0.24);
    d.nearThigh = thighNear * fade; d.nearShin = (thighNear - fNear) * fade;
    d.farThigh = thighFar * fade; d.farShin = (thighFar - fFar) * fade;
    // arms: away from the torso's line only (slap out), the far arm a beat behind; a supporting arm yields at contact (the bend) and is free in the rebound
    const slapNear = K.armSlap * a * Math.abs(wave(tt, 0.0, 3.8, 0.26)), slapFar = K.armSlap * 0.8 * a * Math.abs(wave(tt, 0.05, 3.2, 0.22));
    const eNear = K.elbowMax * a * bend(tt, 0.02, 4.0, 0.22), eFar = K.elbowMax * 0.8 * a * bend(tt, 0.06, 3.4, 0.2);
    const armNear = K.nearArmSign * slapNear, armFar = K.farArmSign * slapFar;
    d.nearArm = armNear * fade; d.nearFore = (armNear + eNear) * fade;
    d.farArm = armFar * fade; d.farFore = (armFar + eFar) * fade;
    const phase = tt < COMPRESS_SEC ? 'compression' : h > 0 ? 'rebound' : tt < lastContact + 0.04 ? 'contact' : 'settle';
    return { d, done: false, phase, lift: h };
}

function zero() { return { hip: 0, torso: 0, nearThigh: 0, nearShin: 0, farThigh: 0, farShin: 0, nearArm: 0, nearFore: 0, farArm: 0, farFore: 0 }; }

/** The signed flex change a landing's offsets make at a knee or an elbow (want >= 0 always): thigh - shin, forearm - arm. */
export function flexChange(d, joint, side) {
    return joint === 'knee' ? d[`${side}Thigh`] - d[`${side}Shin`] : d[`${side}Fore`] - d[`${side}Arm`];
}
