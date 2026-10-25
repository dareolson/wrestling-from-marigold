// ?risefix=1 (PLAN_RISE_HANDOFF T2.1): the rise and the quick rise end on the pose the first standing frame draws.
// Node has no Phaser parts, so the renderers themselves are measured in the browser (tools/debug/rise_handoff_probe.mjs,
// T2.2: per-part step on every rig); here the solver runs against a stub forward-kinematics rig with the real
// conventions, and the wiring (which pose each stage is handed, what the swap does) is pinned on the real methods.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import Wrestler, { REST_POSE } from '../src/Wrestler.js';

const withFlag = (search, fn) => { globalThis.location = { search }; try { return fn(); } finally { delete globalThis.location; } };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// ── standingChannels on a stub rig ────────────────────────────────────────────────────────────────
const TH = 40, SH = 40, UA = 30, FA = 30, TORSO = 60;
const dirOf = (f, a) => ({ x: Math.sin(f * a), y: Math.cos(f * a) });
// the grounded renderer's chains, with _applyGrounded's own conventions (angle = facing * channel, root at the hip)
function groundedPoints(x, y, s, facing, g) {
    const f = facing >= 0 ? 1 : -1, hip = { x, y: y - g.hip * s }, td = dirOf(f, g.torso);
    const sh = { x: hip.x + td.x * TORSO * s, y: hip.y + td.y * TORSO * s };
    const chain = (root, a, la, b, lb) => { const m = { x: root.x + dirOf(f, a).x * la * s, y: root.y + dirOf(f, a).y * la * s };
        return [m, { x: m.x + dirOf(f, b).x * lb * s, y: m.y + dirOf(f, b).y * lb * s }]; };
    const p = {};
    for (const side of ['far', 'near']) {
        p[`${side}Hip`] = { ...hip }; [p[`${side}Knee`], p[`${side}Ankle`]] = chain(hip, g[`${side}Thigh`], TH, g[`${side}Shin`], SH);
        p[`${side}Shoulder`] = { ...sh }; [p[`${side}Elbow`], p[`${side}Wrist`]] = chain(sh, g[`${side}Arm`], UA, g[`${side}Fore`], FA);
    }
    return p;
}
// an "upright" the solver has to reach: the same chains, but from an independent set of channels (hip 120, a crouch)
const UPRIGHT = { hip: 120, torso: Math.PI, farThigh: 0.10, farShin: -0.20, nearThigh: -0.18, nearShin: 0.12, farArm: 0.05, farFore: 0.60, nearArm: 0.12, nearFore: 0.70 };
function stubRig(lock = false) {
    const sk = Object.create(Skeleton.prototype);
    Object.assign(sk, { _lockLimbJoints: lock, _parts: [], jointAttachmentPoints: {}, _jointState: 'seeded', torso: null });
    Object.defineProperty(sk, 'standingHipHeight', { value: 124 });
    sk.updateUpright = (x, y, s, facing) => { sk.jointAttachmentPoints = groundedPoints(x, y, s, facing, UPRIGHT); };
    sk._applyGrounded = (x, y, s, facing, g) => { sk.jointAttachmentPoints = groundedPoints(x, y, s, facing, g); };
    return sk;
}

test('standingChannels recovers the channels whose grounded render lands on the upright render', () => {
    for (const facing of [1, -1]) for (const s of [0.6, 1]) {
        const sk = stubRig();
        const { g, errPx } = sk.standingChannels(s, facing, REST_POSE);
        for (const k of ['hip', 'torso', 'farThigh', 'farShin', 'nearThigh', 'nearShin', 'farArm', 'farFore', 'nearArm', 'nearFore']) near(g[k], UPRIGHT[k], 1e-4, `${facing}/${s} ${k}`);
        assert.equal(errPx, 0, 'no parts on the stub: nothing left to measure');
        assert.equal(sk._jointState, null, 'the upright pose-channel seeds it touched are cleared');
        assert.equal(g.t, 1);
    }
});

test('standingChannels is cached per scale, facing and pose, and a rig it cannot measure gives null', () => {
    const sk = stubRig(); let n = 0; const up = sk.updateUpright;
    sk.updateUpright = (...a) => { n++; return up(...a); };
    const a = sk.standingChannels(1, -1, REST_POSE), b = sk.standingChannels(1, -1, REST_POSE);
    assert.equal(a, b); assert.equal(n, 1);
    sk.standingChannels(1, 1, REST_POSE); sk.standingChannels(0.5, -1, REST_POSE); sk.standingChannels(1, -1, { ...REST_POSE, lean: 0.1 });
    assert.equal(n, 4);
    const blind = stubRig(); blind.updateUpright = () => { blind.jointAttachmentPoints = {}; };
    assert.equal(blind.standingChannels(1, 1, REST_POSE), null);
});

// ── the rise draws the stand at t = 1 and nothing earlier ────────────────────────────────────────
const STAND = { t: 1, hip: 120, torso: Math.PI, farThigh: 0.10, farShin: -0.20, nearThigh: -0.18, nearShin: 0.12, farArm: 0.05, farFore: 0.60, nearArm: 0.12, nearFore: 0.70 };
function risePose(lying, t, stand, lock = false) {
    let got = null;
    Skeleton.prototype.updateGetUp.call({ _lockLimbJoints: lock, standingHipHeight: 131.5, _applyGrounded: (...a) => { got = { ...a[4] }; } }, 0, 0, 1, 1, t, lying, null, stand);
    return got;
}
test('with a stand the last segment ends on it; every key before it, and everything up to the second-to-last key, is unchanged', () => {
    for (const lying of ['supine', 'prone']) for (const lock of [false, true]) {
        const K = lying === 'supine' ? Skeleton.GETUP_SUPINE_POSES : Skeleton.GETUP_POSES, t2 = K.at(-2).t;
        for (const k of Object.keys(STAND)) near(risePose(lying, 1, STAND, lock)[k], STAND[k], 1e-12, `${lying} t=1 ${k}`);
        for (const t of [0, 0.1, 0.34, 0.5, t2]) assert.deepEqual(risePose(lying, t, STAND, lock), risePose(lying, t, null, lock), `${lying} lock=${lock} t=${t}`);
        // inside the last segment it is the straight blend from the second-to-last key to the stand
        const mid = (t2 + 1) / 2, a = risePose(lying, mid, STAND, lock);
        for (const k of ['hip', 'farThigh', 'nearFore']) near(a[k], (K.at(-2)[k] + STAND[k]) / 2, 1e-9, `${lying} mid ${k}`);
    }
});

test('the hip finish of a locked-limb rig is not stacked on top of the stand', () => {
    near(risePose('supine', 1, STAND, true).hip, STAND.hip, 1e-12, 'locked rig, t = 1');
    assert.notEqual(risePose('supine', 1, null, true).hip, STAND.hip);
});

test('the quick rise: the standing end of the fall is the stand, the rest of the fall is untouched', () => {
    for (const variant of Object.keys(Skeleton.FALLS)) {
        const pose = (p, stand) => { let g = null; Skeleton.prototype.updateFall.call({ _applyGrounded: (...a) => { g = { ...a[4] }; } }, 0, 0, 1, 1, variant, p, stand); return g; };
        for (const k of Object.keys(STAND)) if (k !== 't') near(pose(0, STAND)[k], STAND[k], 1e-12, `${variant} p=0 ${k}`);
        const k1 = Skeleton.FALLS[variant].keys[1].t;
        for (const p of [k1, (k1 + 1) / 2, 1]) {
            const a = pose(p, STAND), b = pose(p, null);
            assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
            for (const k of Object.keys(b)) near(a[k], b[k], 1e-12, `${variant} p=${p} ${k}`);
        }
        assert.deepEqual(pose(0.3, null), pose(0.3, undefined));
    }
});

test('carriedRiseEndArm solves the near arm on the rise as it now ends', () => {
    let seen = null;
    const sk = Object.assign(Object.create(Skeleton.prototype), { _lockLimbJoints: false, nearForearm: null,
        _solveGroundedReach: (x, y, s, f, g) => { seen = { ...g }; return { nearArm: 0.2, nearFore: 0.3 }; } });
    Object.defineProperty(sk, 'standingHipHeight', { value: 124 });
    sk.carriedRiseEndArm(1, 1, 1, STAND);
    for (const k of Object.keys(STAND)) if (k !== 't') near(seen[k], STAND[k], 1e-12, k);
    sk.carriedRiseEndArm(1, 1, 1, null);
    assert.equal(seen.hip, Skeleton.GETUP_SUPINE_POSES.at(-1).hip, 'no stand: as authored (and not served from the stand\'s cache)');
});

// ── the swap, through the real methods with the scene stubbed out ───────────────────────────────────────
function wrestler(extra = {}) {
    const calls = [];
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { tweens: { add: cfg => { w._cfg = cfg; }, killTweensOf() {} }, time: { now: 1234 } },
        stamina: 60, lying: 'supine', state: 'down', riseT: 0, fallProgress: 0, facing: -1, moveBlend: 0.7, walkPhase: 1.3, combatBlend: 0,
        pose: { lLeg: 0.1, rLeg: 0.35, lArm: 0.05, rArm: 0.12, lean: 0.2, crouch: 0.3, tilt: 0, lift: 0, bend: 0.1, lElbow: 0.1, rElbow: 0.2, lKnee: 0.15, rKnee: 0.6, lForearm: 0.8 },
        _lyingHold: () => null, _syncSellAppearance() {}, _painRising() {}, _painRecovering() {}, _carriedRiseEnd: () => null, _cancelActiveMove() {},
        _heightScale: 1, ...extra,
    });
    return { w, calls };
}
test('REST_POSE is what tweenPose(\'idle\') settles on', () => {
    const { w } = wrestler();
    w.tweenPose('idle', 0);
    for (const [k, v] of Object.entries(REST_POSE)) near(w.pose[k], v, 1e-12, k);
    assert.equal(w.pose.lForearm, undefined, 'the legacy forearm channel does not outlive the local elbow');
    assert.deepEqual(Object.keys(w.pose).sort(), Object.keys(REST_POSE).sort());
});

test('?risefix=1: both rises hand the first standing frame REST_POSE, a gait at rest and the swap time', () => {
    for (const kind of ['rise', 'quick']) {
        const { w } = wrestler();
        withFlag('?risefix=1', () => { kind === 'quick' ? w._startQuickRise() : w._startRiseUp(); w._cfg.onComplete(); });
        assert.equal(w.state, 'standing');
        for (const [k, v] of Object.entries(REST_POSE)) near(w.pose[k], v, 1e-12, `${kind} ${k}`);
        assert.equal(w.moveBlend, 0);
        assert.equal(w.walkPhase, 0);
        assert.equal(w._riseSwapAt, 1234);
    }
});

test('?risefix=1 hands the rise its stand and nothing without the flag or a rig that can measure it', () => {
    const { w } = wrestler({ skeleton: { standingChannels: (s, f, pose) => ({ g: { s, f, pose } }) } });
    assert.equal(w._riseStand(0.8, -1), null, 'flag off');
    const g = withFlag('?risefix=1', () => w._riseStand(0.8, -1));
    assert.deepEqual(g, { s: 0.8, f: -1, pose: REST_POSE });
    const bare = wrestler({ skeleton: {} }).w;
    assert.equal(withFlag('?risefix=1', () => bare._riseStand(1, 1)), null);
});

test('?risefix=1: the guard starts to come in the frame after the swap, not on it', () => {
    globalThis.Phaser = { Math: { Distance: { Between: (a, b, c, d) => Math.hypot(c - a, d - b) } } };
    const { w } = wrestler({ state: 'standing', x: 100, y: 300, _riseSwapAt: 1234 });
    const opp = { x: 200, y: 300 };
    withFlag('?risefix=1', () => { w.updateCombatBlend(1 / 60, opp); });
    assert.equal(w.combatBlend, 0, 'same frame as the swap');
    w.scene.time.now = 1250.7;
    withFlag('?risefix=1', () => { w.updateCombatBlend(1 / 60, opp); });
    assert.ok(w.combatBlend > 0, 'next frame ramps as before');
    const off = wrestler({ state: 'standing', x: 100, y: 300, _riseSwapAt: 1234 }).w;
    off.updateCombatBlend(1 / 60, opp);
    assert.ok(off.combatBlend > 0, 'flag off: the same frame ticks as before');
    delete globalThis.Phaser;
});

test('risefix is on by default: absent and =1 on, =off and anything else off, no location off', () => {
    const { w } = wrestler({ skeleton: { standingChannels: () => ({ g: 'stand' }) } });
    const at = search => withFlag(search, () => w._riseStand(1, 1));
    assert.equal(at(''), 'stand', 'absent: on');
    assert.equal(at('?risefix=1'), 'stand', '=1: on');
    assert.equal(at('?risefix=off'), null, '=off: off');
    assert.equal(at('?risefix=0'), null, 'any other value: off');
    assert.equal(w._riseStand(1, 1), null, 'Node without location: off');
});
