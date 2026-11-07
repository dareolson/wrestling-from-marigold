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

export const GRAVITY = 1710;   // px/s^2 at s = 1: D4's g, picked once so a standing man (pelvis 136.7 px, falls_probe) free-falls in 0.40 s
export const REF_VY = 684;     // px/s at s = 1: the pelvis's speed at the end of that free fall (g * 0.40); the incoming speed that scales the rebound is read against it
export const REBOUND_PX = 11;  // rebound height per unit intensity at the reference speed: Lou at 0.7 hops 7.7 px (the 6-10 px tuning target)
const REBOUND_MAX = 14;
const COMPRESS_SEC = 0.05;
const SECOND_HOP_FROM = 0.8;   // intensity at which a second, smaller hop happens
const SETTLE_SEC = 0.32;       // from the last contact to the end: the limbs settle and the wince builds, then everything fades to the rest pose
const FADE_SEC = 0.12;
const KNEE_SOFT_CAP = 2.45;    // applyOffsetsSoft: a bend added to a knee saturates toward this, below sells.js's hard cap (2.55), so no plateau of pinned frames

// PLAN_FALLS T2.5d, the body slam's impact tiers (`?slamTier=heavy|exceptional`; default = r2 = no tier). Shape, not only height: a shorter and harder
// compression, bigger and more staggered knee and arm recoil, ONE dominant rebound, a much smaller settle, and a spent pause before the sell (`spent`, seconds,
// read by Wrestler). `hopPx` is per unit intensity at the reference speed (r2: REBOUND_PX = 11); `hopMax` replaces REBOUND_MAX for the tier only.
// Targets, drawn over the blend base at intensity 0.7: heavy 11-12 px, exceptional 14-16 px.
export const TIERS = Object.freeze({
    default: Object.freeze({ hopPx: REBOUND_PX, hopMax: REBOUND_MAX, second: true, compressSec: COMPRESS_SEC, settleSec: SETTLE_SEC, fadeSec: FADE_SEC, press: 1, limb: 1, stagger: 0, wince: 1, spent: 0 }),
    heavy: Object.freeze({ hopPx: 17.5, hopMax: 17, second: false, compressSec: 0.04, settleSec: 0.17, fadeSec: 0.10, press: 1.4, limb: 1.3, stagger: 0.03, wince: 0.5, spent: 0.15 }),
    exceptional: Object.freeze({ hopPx: 23.5, hopMax: 23, second: false, compressSec: 0.035, settleSec: 0.15, fadeSec: 0.09, press: 1.7, limb: 1.5, stagger: 0.05, wince: 0.4, spent: 0.2 }),
});
const tierOf = (tier) => TIERS[tier] ?? TIERS.default;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (u) => { const k = clamp(u, 0, 1); return k * k * (3 - 2 * k); };

// Per-kind constants. `lift` is the torso's sign for the upper body leaving the mat; `press` its opposite.
export const KINDS = Object.freeze({
    // a back bump: shoulders and arms meet the mat together, the arms slap out (D3)
    back: Object.freeze({ lift: -1, torsoPerPx: 0.014, compress: 2.5, torsoPress: 0.05, nearArmSign: -1, farArmSign: 1, armSlap: 0.30, elbowMax: 0.35, kneeNear: 0.34, kneeFar: 0.24, wince: { torso: -0.10, knee: 0.22 } }),
    // the piledriver's crumple (T2.5g): face down with no hand catch, the arms stay limp on the rest pose (no yield, no flail), the legs and the chest react
    limp: Object.freeze({ lift: 1, torsoPerPx: 0.012, compress: 2.0, torsoPress: 0.04, nearArmSign: 1, farArmSign: 1, armSlap: 0, elbowMax: 0, kneeNear: 0.30, kneeFar: 0.22, wince: { torso: 0.07, knee: 0.20 } }),
    // a forward fall: hands and forearms land first (1-2 frames before the chest), the chest bounces, the heels kick up
    front: Object.freeze({ lift: 1, torsoPerPx: 0.012, compress: 2.0, torsoPress: 0.04, nearArmSign: 1, farArmSign: 1, armSlap: 0.12, elbowMax: 0.30, kneeNear: 0.30, kneeFar: 0.22, wince: { torso: 0.07, knee: 0.20 } }),
});

/** The hop schedule: when he leaves the mat and lands, from intensity (0-1) and the incoming speed (px/s at s = 1, positive down). */
export function reboundPlan(intensity, incomingVy = REF_VY, tier = null) {
    const T = tierOf(tier);
    const i = clamp(intensity, 0, 1.2), speed = clamp(incomingVy / REF_VY, 0.4, 1.6);
    // a tier's hop reads the intensity up to 0.85 only: the piledriver's full intensity (1.0) otherwise hopped 17.6-18.7 px drawn against the exceptional range of 14-16;
    // the slam (0.8) is below the cap and unchanged
    const ih = T === TIERS.default ? i : Math.min(i, 0.85);
    const h1 = Math.min(T.hopMax, T.hopPx * ih * speed);
    const hops = [];
    let t = T.compressSec;
    const heights = i >= SECOND_HOP_FROM && T.second ? [h1, h1 * 0.32] : [h1];
    for (const h of heights) {
        const air = 2 * Math.sqrt(2 * h / GRAVITY);
        hops.push({ t0: t, air, h });
        t += air + 0.03;   // the re-contact's own small compression
    }
    const lastContact = hops[hops.length - 1].t0 + hops[hops.length - 1].air;
    return { hops, contacts: [0, ...hops.map(p => p.t0 + p.air)], end: lastContact + T.settleSec, h1 };
}

/** Total length of the landing, seconds. */
export function landingDuration(kind, intensity, incomingVy = REF_VY, tier = null) {
    if (SHAPES[kind]) return shapeDuration(SHAPES[kind], intensity);
    return reboundPlan(intensity, incomingVy, tier).end;
}

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
 * @param {string} [tier]        the body slam's impact tier (TIERS), 'back' only; omitted = r2
 * @returns {{ d: Object<string, number>, done: boolean, phase: string, lift: number }} channel offsets over the rest pose; `lift` is the pelvis hop in px
 */
export function landingResponse(kind, intensity, incomingVy, t, tier = null) {
    if (SHAPES[kind]) return shapeResponse(kind, SHAPES[kind], intensity, t);
    const K = KINDS[kind];
    if (!K) throw new RangeError(`unknown landing kind "${kind}"`);
    const T = tierOf(tier), st = T.stagger;
    const i = clamp(intensity, 0, 1.2), plan = reboundPlan(i, incomingVy, tier);
    if (t >= plan.end) return { d: zero(), done: true, phase: 'done', lift: 0 };
    const tt = Math.max(0, t);
    const fade = 1 - smooth((tt - (plan.end - T.fadeSec)) / T.fadeSec);   // 1 until the last fadeSec (0.12 s at r2), then 0 at the end: every offset reaches the rest pose
    const h = hopHeight(plan, tt);
    // compression: the first contact and each re-contact flatten the trunk for a few frames (a pulse of the contact's own weight)
    let press = 0;
    plan.contacts.forEach((c, k) => { const w = k === 0 ? 1 : 0.4, len = k === 0 ? T.compressSec : 0.03; if (tt >= c && tt < c + len) press = Math.max(press, w * Math.sin(Math.PI * (tt - c) / len)); });
    press *= T.press;
    const lastContact = plan.contacts[plan.contacts.length - 1];
    const wince = smooth((tt - lastContact - 0.04) / 0.14) * T.wince;   // builds after the last contact, the fade takes it back to the rest pose
    const a = Math.min(1, 0.4 + i) * T.limb;                            // limb amplitude scale: a soft landing still moves the limbs a little
    const d = {};
    d.hip = (-K.compress * i * press + h) * fade;
    d.torso = ((-K.lift) * K.torsoPress * i * Math.min(press, 1.15) + K.lift * K.torsoPerPx * h + K.wince.torso * wince) * fade;
    // legs: the thighs follow the pelvis a beat late; the knees only bend (heels kick up for the prone body)
    const fNear = K.kneeNear * a * bend(tt, 0.02, 4.2, 0.30) + K.wince.knee * wince, fFar = K.kneeFar * a * bend(tt, 0.06 + st, 3.6, 0.26) + K.wince.knee * 0.7 * wince;
    const thighNear = (kind === 'back' ? 1 : 0) * 0.20 * a * wave(tt, 0.03, 3.4, 0.28), thighFar = (kind === 'back' ? 1 : 0) * 0.15 * a * wave(tt, 0.07 + st, 3.0, 0.24);
    d.nearThigh = thighNear * fade; d.nearShin = (thighNear - fNear) * fade;
    d.farThigh = thighFar * fade; d.farShin = (thighFar - fFar) * fade;
    // arms: away from the torso's line only (slap out), the far arm a beat behind; a supporting arm yields at contact (the bend) and is free in the rebound
    const slapNear = K.armSlap * a * Math.abs(wave(tt, 0.0, 3.8, 0.26)), slapFar = K.armSlap * 0.8 * a * Math.abs(wave(tt, 0.05 + st, 3.2, 0.22));
    const eNear = K.elbowMax * a * bend(tt, 0.02, 4.0, 0.22), eFar = K.elbowMax * 0.8 * a * bend(tt, 0.06 + st, 3.4, 0.2);
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

// ---- the other falls (PLAN_FALLS T2.5b-e) ------------------------------------------------------------------------------------------------------------------
// Each is its own shape, not the slam's hop on another pose. None is a flight: a forward fall is SUPPORTED (hands and forearms are on the mat, they yield and push
// back), a seated collapse keeps the pelvis where it hit and rocks the shoulders. Same rules as above: offsets over the rest pose, every knee and elbow offset
// bend-only, arms only away from the torso's line, exactly 0 at the end. `lift` is the pelvis rise in px (a supported push-up of a few px, or 0).
//   catch   `forward`: the hands landed first (the fall's own last keys); the chest arrives, the elbows yield (the near forearm reacts, the far one stays planted),
//           the arms push the chest back up a few px, the heels kick up behind, then the wince.
//   knees   `kneesForward`: the knees are already down; the chest and face arrive over them, the upper body bounces without the pelvis, both elbows yield out, the
//           lower legs flutter.
//   seat    `sitBack`: the hips hit first (the fall's key before the end); the shoulders arrive and rock back up and down with the pelvis staying, the legs kick, the
//           arms slap out lightly. No full-body hop.
//   spill   the sideways spill concept (`?falls=v1`, the shove calls it): seat's response, quieter in the legs, the far arm the one that reacts.
export const SHAPES = Object.freeze({
    catch: Object.freeze({ lying: 'prone', end: 0.62, sec: 0.09, compress: 1.8, torsoPress: 0.06, push: { px: 3.4, max: 4.2, from: 0.09, len: 0.2 }, torsoPerPx: 0.015, rock: 0, wince: { torso: 0.07, knee: 0.20 },
        knee: { near: [0.50, 0.06, 3.2, 0.35], far: [0.38, 0.12, 3.0, 0.30] }, thigh: null,
        elbow: { near: [0.45, 0.0, 5.0, 0.22], far: [0.06, 0.04, 5.0, 0.22] }, arm: { near: [0.10, 0.0, 3.6, 0.26], far: [0, 0, 1, 1] } }),
    knees: Object.freeze({ lying: 'prone', end: 0.66, sec: 0.07, compress: 3.0, torsoPress: 0.08, push: null, torsoPerPx: 0, rock: { amp: 0.10, lag: 0.07, freq: 3.4, tau: 0.28 }, wince: { torso: 0.06, knee: 0.18 },
        knee: { near: [0.55, 0.02, 4.2, 0.30], far: [0.45, 0.07, 3.8, 0.28] }, thigh: null,
        elbow: { near: [0.38, 0.0, 4.4, 0.24], far: [0.32, 0.05, 4.0, 0.22] }, arm: { near: [0.14, 0.0, 3.6, 0.26], far: [0.12, 0.05, 3.2, 0.22] } }),
    seat: Object.freeze({ lying: 'supine', end: 0.64, sec: 0.06, compress: 2.0, torsoPress: 0.04, push: null, torsoPerPx: 0, rock: { amp: -0.12, lag: 0.02, freq: 3.2, tau: 0.30 }, wince: { torso: -0.08, knee: 0.20 },
        knee: { near: [0.34, 0.02, 4.2, 0.30], far: [0.28, 0.07, 3.6, 0.26] }, thigh: { near: [0.38, 0.04, 3.0, 0.30], far: [0.30, 0.09, 2.8, 0.26] },
        elbow: { near: [0.25, 0.02, 4.0, 0.22], far: [0.22, 0.06, 3.4, 0.2] }, arm: { near: [-0.20, 0.0, 3.8, 0.26], far: [0.16, 0.05, 3.2, 0.22] } }),
    spill: Object.freeze({ lying: 'supine', end: 0.60, sec: 0.06, compress: 1.6, torsoPress: 0.035, push: null, torsoPerPx: 0, rock: { amp: -0.08, lag: 0.03, freq: 3.0, tau: 0.28 }, wince: { torso: -0.07, knee: 0.18 },
        knee: { near: [0.26, 0.02, 4.0, 0.28], far: [0.22, 0.08, 3.4, 0.24] }, thigh: { near: [0.20, 0.04, 3.0, 0.28], far: [0.16, 0.09, 2.8, 0.24] },
        elbow: { near: [0.10, 0.02, 4.0, 0.22], far: [0.34, 0.04, 3.6, 0.22] }, arm: { near: [-0.08, 0.0, 3.8, 0.26], far: [0.26, 0.03, 3.2, 0.22] } }),
});
const shapeDuration = (S, intensity) => S.end * (0.9 + 0.1 * clamp(intensity, 0, 1.2));

function shapeResponse(kind, S, intensity, t) {
    const i = clamp(intensity, 0, 1.2), end = shapeDuration(S, i);
    if (t >= end) return { d: zero(), done: true, phase: 'done', lift: 0 };
    const tt = Math.max(0, t), fade = 1 - smooth((tt - (end - FADE_SEC)) / FADE_SEC);
    const a = Math.min(1, 0.4 + i);
    const press = tt < S.sec ? Math.sin(Math.PI * tt / S.sec) : 0;
    let h = 0, pushing = false;
    if (S.push) { const u = (tt - S.push.from) / S.push.len; if (u > 0 && u < 1) { h = Math.min(S.push.max, S.push.px * i) * Math.sin(Math.PI * u) ** 2; pushing = true; } }
    const wince = smooth((tt - (S.push ? S.push.from + S.push.len : S.sec) - 0.04) / 0.16);
    const lift = S.lying === 'supine' ? -1 : 1;
    const rock = S.rock ? S.rock.amp * a * bend(tt, S.rock.lag, S.rock.freq, S.rock.tau) : 0;
    const d = {};
    d.hip = (-S.compress * i * press + h) * fade;
    d.torso = ((-lift) * S.torsoPress * i * press + lift * S.torsoPerPx * h + rock + S.wince.torso * wince) * fade;
    const b = (c) => c[0] * a * bend(tt, c[1], c[2], c[3]);
    const w = (c) => c[0] * a * wave(tt, c[1], c[2], c[3]);
    const fNear = b(S.knee.near) + S.wince.knee * wince, fFar = b(S.knee.far) + S.wince.knee * 0.7 * wince;
    const thNear = S.thigh ? w(S.thigh.near) : 0, thFar = S.thigh ? w(S.thigh.far) : 0;
    d.nearThigh = thNear * fade; d.nearShin = (thNear - fNear) * fade;
    d.farThigh = thFar * fade; d.farShin = (thFar - fFar) * fade;
    const armN = Math.sign(S.arm.near[0]) * Math.abs(w(S.arm.near)), armF = Math.sign(S.arm.far[0]) * Math.abs(w(S.arm.far));
    d.nearArm = armN * fade; d.nearFore = (armN + b(S.elbow.near)) * fade;
    d.farArm = armF * fade; d.farFore = (armF + b(S.elbow.far)) * fade;
    return { d, done: false, phase: pushing ? 'rebound' : tt < S.sec ? 'compression' : tt < end - 0.2 ? 'contact' : 'settle', lift: h };
}

/**
 * Offsets over a pose, with a knee's ADDED bend saturating toward KNEE_SOFT_CAP instead of running into sells.js's hard cap. A sell's or a landing's offsets
 * were authored over the missile pose (knees straight); over the rest pose's drawn-up near knee (flex 1.5) the same bend ran into the cap and sat there, a
 * pinned fold for ten frames (PLAN_FALLS T2.5a). Below the cap this is `applyOffsets` (rest + delta); above it the bend keeps rising but never reaches it.
 * Straightening (a negative change) and every other channel pass through unchanged.
 */
export function applyOffsetsSoft(base, d, cap = KNEE_SOFT_CAP) {
    const g = { ...base };
    for (const [c, v] of Object.entries(d)) if (c in g) g[c] += v;
    for (const side of ['near', 'far']) {
        const th = `${side}Thigh`, sh = `${side}Shin`;
        if (!(th in base && sh in base && th in d && sh in d)) continue;
        const delta = d[th] - d[sh], f0 = base[th] - base[sh], H = cap - f0;
        if (delta > 0 && H <= 0.05) { g[sh] = g[th] - f0; continue; }                // the base is already at the cap: the added bend is dropped, the knee stays where it was
        const knee = f0 + 0.6 * H;                                                  // up to here: untouched (rest + delta)
        if (delta <= 0 || f0 + delta <= knee) continue;
        const flex = knee + 0.4 * H * (1 - Math.exp(-(f0 + delta - knee) / (0.4 * H)));   // continuous and smooth at the knee point, tends to the cap
        g[sh] = g[th] - flex;
    }
    return g;
}

// ── The right fall for the situation (PLAN_FALLS Stage 3, T3.1-T3.2) ─────────────────────────────────────────────────────────────────────────────
// `chooseFall(ctx)` is pure: the caller (Wrestler) measures the situation, this picks the fall and says why. Everything it returns is a Skeleton.FALLS
// variant `startFall(downTime, fall, true)` accepts.

/** What each move may cause (T3.2). `hit`: where it lands; `glancing`: a shove-type blow that can spill him; `falls`: the variants it is allowed to cause. */
export const MOVE_FALLS = Object.freeze({
    headbutt:        Object.freeze({ hit: 'head',  falls: Object.freeze(['backward', 'sitBack', 'forward', 'kneesForward']) }),
    jab:             Object.freeze({ hit: 'head',  falls: Object.freeze(['backward', 'sitBack', 'forward', 'kneesForward']) }),
    doubleAxeHandle: Object.freeze({ hit: 'head',  falls: Object.freeze(['backward', 'sitBack', 'forward', 'kneesForward']) }),
    frontKick:       Object.freeze({ hit: 'gut',   falls: Object.freeze(['kneesForward', 'sitBack', 'forward', 'backward']) }),
    kneeLift:        Object.freeze({ hit: 'gut',   falls: Object.freeze(['kneesForward', 'sitBack', 'forward', 'backward']) }),
    shove:           Object.freeze({ hit: 'chest', glancing: true, falls: Object.freeze(['spill', 'backward', 'sitBack', 'forward', 'kneesForward']) }),
    cornerCharge:    Object.freeze({ hit: 'chest', falls: Object.freeze(['forward', 'kneesForward']) }),   // the corner behind him: inward only
});

/** Big moves: a receiver this tired takes the exceptional landing from them (T3.1). */
export const BIG_MOVES = Object.freeze(['suplex', 'backBodyDrop', 'bodySlam']);
// T3.13-T3.15: `wear` (0-100) is how beaten-up he is over the match, apart from stamina's moment-to-moment drain. It rises with the damage he takes and drops slowly.
export const WEAR_MAX = 100;
export const WEAR_PER_DAMAGE = 0.8;      // wear gained per point of damage (tuned in T3.15)
export const WEAR_RECOVER = 0.4;       // wear lost per second (stamina recovers 6)
export const KNOCKDOWN_WEAR = 60;      // T3.14: a strike that leaves him at or over this puts him down instead of staggering him
export const EXCEPTIONAL_WEAR = 92;    // a big move on a man at or over this lands exceptional
export const TIRED_WEAR = KNOCKDOWN_WEAR;   // at or over: the collapses (sitBack, kneesForward); under FRESH_WEAR: the straight falls (backward, forward)
export const FRESH_WEAR = 30;
/** Wear after taking `damage` (stamina points drained by a hit). */
export const wearAfterDamage = (wear, damage) => Math.min(WEAR_MAX, wear + Math.max(0, damage) * WEAR_PER_DAMAGE);
/** Wear after `dt` seconds of recovery. */
export const wearAfterRecovery = (wear, dt) => Math.max(0, wear - WEAR_RECOVER * dt);
const SPILL_SIDE_PX = 40;              // depth room (px at s = 1) the spill needs on the side it goes

/** How far a fall's lying body reaches from where he stood, along his facing (px at s = 1; measured on the rows of the G2 page, both facings). */
export const LYING_REACH = Object.freeze({
    backward:     Object.freeze({ back: 70, front: 96 }),    // head 68 behind where he stood, boots 95 ahead
    sitBack:      Object.freeze({ back: 70, front: 96 }),
    forward:      Object.freeze({ back: 92, front: 84 }),    // boots 91 behind, head 83 ahead
    kneesForward: Object.freeze({ back: 92, front: 84 }),
    spill:        Object.freeze({ back: 70, front: 96 }),
});

/** The landing tier of `move` on a receiver at `wear` (read before the move's own damage): exceptional for a big move at EXCEPTIONAL_WEAR or over, else the move's own `baseTier`. */
export const tierFor = (move, wear, baseTier = null) => (BIG_MOVES.includes(move) && wear >= EXCEPTIONAL_WEAR ? 'exceptional' : (baseTier ?? null));

const COLLAPSES = new Set(['sitBack', 'kneesForward']);

/**
 * ctx: { move, hit?: 'head'|'chest'|'gut', side: 'front'|'behind', wear, room: { back, front, side? }, tier?, glancing?, spillAvailable?, rng? }
 *   side: where the attacker is relative to the way the receiver faces ('behind' falls him forward). room: px at s = 1 from him to the rope along his facing
 *   (`front`), against it (`back`) and in depth (`side`). tier: the move's own landing tier (T2.5g/h). rng: () => [0, 1), Math.random by default.
 * Returns { fall, tier, reason }: `reason` is the rule that picked, for the G3 page and the logs.
 */
export function chooseFall(ctx) {
    const rng = ctx.rng ?? Math.random;
    const spec = MOVE_FALLS[ctx.move];
    const hit = ctx.hit ?? spec?.hit ?? 'chest';
    const wear = ctx.wear ?? 0;
    const tired = wear >= TIRED_WEAR, fresh = wear < FRESH_WEAR;
    const allowed = new Set(spec?.falls ?? ['backward', 'sitBack', 'forward', 'kneesForward']);
    const fits = (f) => ctx.room == null
        || (ctx.room.back >= LYING_REACH[f].back && ctx.room.front >= LYING_REACH[f].front && (f !== 'spill' || (ctx.room.side ?? 0) >= SPILL_SIDE_PX));

    let rule, pool;
    if (ctx.side === 'behind') { rule = 'from behind'; pool = ['forward', 'kneesForward']; }
    else if ((ctx.glancing ?? spec?.glancing) && allowed.has('spill') && ctx.spillAvailable !== false && fits('spill')) { rule = 'glancing blow, room to the side'; pool = ['spill']; }
    else if (hit === 'gut') { rule = 'front, gut'; pool = ['kneesForward', 'sitBack']; }
    else { rule = `front, ${hit}`; pool = ['backward', 'sitBack']; }

    let cand = pool.filter(f => allowed.has(f));
    if (!cand.length) cand = [...allowed].filter(f => ctx.side === 'behind' ? f === 'forward' || f === 'kneesForward' : f !== 'spill' || ctx.spillAvailable !== false);
    let left = cand.filter(fits);
    if (!left.length) {   // the pool leaves the ring: try the move's other falls, then take the one that overshoots least
        left = [...allowed].filter(f => (f !== 'spill' || ctx.spillAvailable !== false) && fits(f));
        if (left.length) rule += ' (ring room)';
        else {
            const over = (f) => Math.max(0, LYING_REACH[f].back - ctx.room.back) + Math.max(0, LYING_REACH[f].front - ctx.room.front);
            const best = Math.min(...cand.map(over));
            left = cand.filter(f => over(f) === best);
            rule += ' (cramped)';
        }
    }

    // fresh: toward the straight falls; tired: toward the collapses (weights 3:1 either way); in between, even
    const weight = (f) => (tired ? (COLLAPSES.has(f) ? 3 : 1) : fresh ? (COLLAPSES.has(f) ? 1 : 3) : 1);
    const total = left.reduce((t, f) => t + weight(f), 0);
    let r = rng() * total, fall = left[left.length - 1];
    for (const f of left) { r -= weight(f); if (r < 0) { fall = f; break; } }
    const state = tired ? 'tired' : fresh ? 'fresh' : 'worn';
    const tier = tierFor(ctx.move, wear, ctx.tier);
    // T3.9: no fall fits, so the chosen one is kept and the caller slides him inward over the fall by `slide` (px at s = 1, signed along his facing: + toward `front`),
    // the way the corner fall does; null when it fits
    let slide = null;
    if (ctx.room && !fits(fall)) {
        const back = Math.max(0, LYING_REACH[fall].back - ctx.room.back), front = Math.max(0, LYING_REACH[fall].front - ctx.room.front);
        slide = { back, front, dx: back - front };   // dx > 0: toward his front (away from the rope behind him); < 0: toward his back
    }
    return { fall, tier, slide, reason: `${rule}, ${state} (wear ${Math.round(wear)}) -> ${fall}` };
}

// PLAN_FALLS T4.1, the down-hit reaction: an elbow, knee or dive lands on a man already on the mat and he jolts at the waist, arms flailing, then drops
// back flat. Offsets over the rest pose in the landing's channels, so Wrestler draws it through the same path. Every offset is exactly 0 at the end.
// Supine: the shoulders and head come off the mat (torso -), the knees come up (thigh +, shin - by more, so the flex only grows), the arms fly up and out.
// Prone: the chest and head lift (torso +), the heels kick up (shin -), the arms flail at the sides. The two arms differ in frequency, phase and size.
export const JOLT_PEAK_SEC = 0.12;
const JOLT_TORSO = [0.35, 0.61];   // rad off the rest pose at intensity 0 and 1 (20 to 35 degrees)
const JOLT_ARM = { near: { amp: 0.95, freq: 4.4, phase: 0.4 }, far: { amp: 0.7, freq: 5.8, phase: 2.3 } };

/** Seconds a jolt of `intensity` lasts (0.45 to 0.60). */
export const joltDuration = (intensity) => 0.45 + 0.15 * clamp(intensity, 0, 1);

/**
 * @param {'supine'|'prone'} lying
 * @param {number} intensity  the move's weight, 0-1 (elbowDrop 0.7, kneeDrop 0.8, dives 0.9)
 * @param {number} t          seconds since the impact
 * @returns {{ d: Object<string, number>, done: boolean, peak: boolean }}
 */
export function joltResponse(lying, intensity, t) {
    const i = clamp(intensity, 0, 1), end = joltDuration(i);
    if (t >= end) return { d: zero(), done: true, peak: false };
    const tt = Math.max(0, t);
    // up to the peak in 120 ms, then back down over the rest; the arms keep flailing on the way down, in their own envelope
    const env = tt < JOLT_PEAK_SEC ? smooth(tt / JOLT_PEAK_SEC) : 1 - smooth((tt - JOLT_PEAK_SEC) / (end - JOLT_PEAK_SEC));
    const arms = smooth(tt / 0.06) * (1 - smooth((tt - (end - 0.15)) / 0.15));
    const sway = (A) => 0.5 + 0.5 * Math.sin(2 * Math.PI * A.freq * tt + A.phase);   // 0..1
    const lift = JOLT_TORSO[0] + (JOLT_TORSO[1] - JOLT_TORSO[0]) * i;
    const d = zero();
    const nearA = JOLT_ARM.near.amp * (0.5 + 0.5 * i) * arms * sway(JOLT_ARM.near), farA = JOLT_ARM.far.amp * (0.5 + 0.5 * i) * arms * sway(JOLT_ARM.far);
    if (lying === 'supine') {
        d.torso = -lift * env; d.hip = 2 * env;
        d.nearThigh = 0.30 * env; d.nearShin = d.nearThigh - 0.45 * env;
        d.farThigh = 0.22 * env; d.farShin = d.farThigh - 0.35 * env;
        d.nearArm = nearA; d.nearFore = nearA + 0.30 * arms;      // bend-only elbows: the forearm leads the arm
        d.farArm = farA; d.farFore = farA + 0.25 * arms;
    } else {
        d.torso = lift * env; d.hip = 3 * env;
        d.nearShin = -0.70 * env; d.farShin = -0.55 * env;
        d.nearArm = nearA; d.nearFore = nearA + 0.30 * arms;
        d.farArm = farA; d.farFore = farA + 0.25 * arms;
    }
    return { d, done: false, peak: tt >= JOLT_PEAK_SEC * 0.5 && tt <= JOLT_PEAK_SEC * 1.5 };
}
