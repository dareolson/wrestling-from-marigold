// The back sell's support rule (PLAN_GEORGE_TRANSFER T1.3): a rig runs it only with BOTH a painted
// torso backWaist AND textures.backSell. No default numbers, ever. Also what the contact reports.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import { backSellSupport, BACK_SELL_FIELDS } from '../src/rig/backSell.js';
import { stepGripLatch, newGripLatch } from '../src/animation/sellAppearance.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';

const ANCHOR = { u: 0.5, v: 0.5 };
const DATA = { holdW: 0.7, recoveryArm: -1, recoveryElbow: 1, settledElbow: 0.7, contactPx: 12, evidence: 'a test' };
const rig = ({ backWaist = true, backSell = DATA, grip = false, clutch = true } = {}) => ({
    _textureConfig: { handInForearm: true, backSell,
        forearm: { key: 'f', box: { w: 1, h: 1 } },
        variants: grip ? { forearm: { grip: { key: 'g', file: 'g.png', semanticAnchors: clutch ? { clutch: { u: 0.5, v: 0.5 } } : undefined } } } : {} },
    torso: backWaist ? { _semanticAnchors: { backWaist: { ...ANCHOR } } } : {},
});

test('Lou supports the back sell with a painted grip and a clutch-patch contact', () => {
    const s = backSellSupport({ _textureConfig: theszProcreateV1.textures, torso: { _semanticAnchors: theszProcreateV1.textures.torso.semanticAnchors } });
    assert.deepEqual({ ok: s.ok, reason: s.reason, gripArt: s.gripArt, contact: s.contact }, { ok: true, reason: null, gripArt: 'painted', contact: 'clutchPatch' });
    assert.equal(s.data, theszProcreateV1.textures.backSell);
});

test('both are required: the anchor alone is "no backSell data", the data alone is "no backWaist anchor"', () => {
    const anchorOnly = backSellSupport(rig({ backSell: null }));
    assert.deepEqual([anchorOnly.ok, anchorOnly.reason, anchorOnly.data], [false, 'no backSell data', null]);
    const dataOnly = backSellSupport(rig({ backWaist: false }));
    assert.deepEqual([dataOnly.ok, dataOnly.reason, dataOnly.data], [false, 'no backWaist anchor', null]);
    assert.equal(backSellSupport(rig()).ok, true);
    for (const bad of [null, undefined, {}]) assert.equal(backSellSupport(bad).ok, false);
});

test('a malformed backSell is unsupported and names the field; nothing is filled in from another rig', () => {
    for (const k of BACK_SELL_FIELDS) {
        const s = backSellSupport(rig({ backSell: { ...DATA, [k]: undefined } }));
        assert.equal(s.ok, false, k);
        assert.equal(s.reason, `invalid backSell data: ${k}`);
        assert.equal(s.data, null);
    }
    assert.equal(backSellSupport(rig({ backSell: { ...DATA, holdW: 1.2 } })).ok, false, 'holdW > 1');
    assert.equal(backSellSupport(rig({ backSell: { ...DATA, contactPx: 0 } })).ok, false, 'contactPx 0');
    assert.equal(backSellSupport(rig({ backSell: { ...DATA, evidence: '' } })).reason, 'invalid backSell data: evidence');
});

test('grip art and contact are reported, never assumed: no donor = none + wristProxy; donor without a patch = painted + wristProxy', () => {
    const none = backSellSupport(rig());
    assert.deepEqual([none.ok, none.gripArt, none.contact], [true, 'none', 'wristProxy']);
    const patch = backSellSupport(rig({ grip: true }));
    assert.deepEqual([patch.gripArt, patch.contact], ['painted', 'clutchPatch']);
    const noPatch = backSellSupport(rig({ grip: true, clutch: false }));
    assert.deepEqual([noPatch.gripArt, noPatch.contact], ['painted', 'wristProxy']);
});

test('the grip latch threshold is the rig\'s: a different contactPx moves the switch, a missing one changes nothing', () => {
    const at = (px, d) => { let st = newGripLatch(false, 0); for (let t = 0; t <= 300; t += 20) st = stepGripLatch(st, d, t, px); return st.on; };
    assert.equal(at(15, 14), true);
    assert.equal(at(12, 14), false);
    const st = newGripLatch(false, 0);
    assert.equal(stepGripLatch(st, 1, 500), st, 'no contactPx: no change');
});

// ── Skeleton: backWaistPoint / backContact on a stub with a real-looking image ──────────────────────
const image = (key, extra = {}) => ({ frame: { realWidth: 100, realHeight: 100 }, displayOriginX: 50, displayOriginY: 50,
    getWorldTransformMatrix: () => ({ a: 1, b: 0, c: 0, d: 1, tx: 200, ty: 300 }), texture: { key }, ...extra });
function skeleton(support, { patch = false, wrist = { x: 210, y: 300 } } = {}) {
    const sk = Object.create(Skeleton.prototype);
    const r = rig(support);
    sk._textureConfig = r._textureConfig;
    sk.torso = { ...image('torso'), _semanticAnchors: r.torso._semanticAnchors };
    sk.nearForearm = image('forearm', patch ? { _semanticAnchors: { clutch: { u: 0.5, v: 0.5 } } } : {});
    sk.jointAttachmentPoints = { nearWrist: wrist };
    return sk;
}

test('backWaistPoint: the painted point on a supported rig, null on a rig with the anchor but no data', () => {
    assert.deepEqual(skeleton({}).backWaistPoint(), { x: 200, y: 300 });
    assert.equal(skeleton({ backSell: null }).backWaistPoint(), null);
    assert.equal(skeleton({ backWaist: false }).backWaistPoint(), null);
});

test('backContact reports which contact it measured; backContactDistance is its distance; unsupported rigs measure nothing', () => {
    assert.deepEqual(skeleton({}).backContact(), { dist: 10, contact: 'wristProxy' });
    assert.deepEqual(skeleton({}, { patch: true }).backContact(), { dist: 0, contact: 'clutchPatch' });
    assert.equal(skeleton({}).backContactDistance(), 10);
    assert.equal(skeleton({ backSell: null }).backContact(), null);
    assert.equal(skeleton({ backSell: null }).backContactDistance(), null);
});

test('force (measuring tools only) reads the anchor on a rig that is not supported; the game path never does', () => {
    const sk = skeleton({ backSell: null });
    assert.equal(sk.backWaistPoint(), null);
    assert.deepEqual(sk.backWaistPoint(true), { x: 200, y: 300 });
    assert.deepEqual(sk.backContact({ force: true }), { dist: 10, contact: 'wristProxy' });
    assert.equal(sk.backContactDistance(), null);
});

// Rev 3 D9: the hand's route is a polyline in the reach weight (grounded) and in the recovery hand weight (standing)
import { aroundChannel as _aroundChannel, aroundGoal, AROUND as _AROUND } from '../src/rig/backSell.js';
test('aroundGoal: posed place -> via over [0, viaW], via -> target over [viaW, 1], continuous, exact at the ends', () => {
    const a = { x: 0, y: 0 }, v = { x: 10, y: -20 }, t = { x: 30, y: 0 }, vw = 0.2;
    assert.deepEqual(aroundGoal(a, v, t, 0, vw), a);
    assert.deepEqual(aroundGoal(a, v, t, vw, vw), v);
    assert.deepEqual(aroundGoal(a, v, t, 1, vw), t);
    const near = (p, q) => assert.ok(Math.hypot(p.x - q.x, p.y - q.y) < 1e-9, JSON.stringify(p));
    near(aroundGoal(a, v, t, 0.1, vw), { x: 5, y: -10 });
    near(aroundGoal(a, v, t, 0.6, vw), { x: 20, y: -10 });
    assert.deepEqual(aroundGoal(a, v, t, -1, vw), a); assert.deepEqual(aroundGoal(a, v, t, 2, vw), t);
    // continuous across the corner
    const l = aroundGoal(a, v, t, vw - 1e-9, vw), r = aroundGoal(a, v, t, vw + 1e-9, vw);
    assert.ok(Math.hypot(l.x - r.x, l.y - r.y) < 1e-6);
    assert.deepEqual(aroundGoal(a, v, t, 0.5), aroundGoal(a, v, t, 0.5, _AROUND.viaW), 'the default is AROUND.viaW');
});
test('aroundChannel: start -> start + via offset over [0, standW], -> target over [standW, 1]', () => {
    const sw = 0.3;
    assert.equal(_aroundChannel(0.1, -0.6, -0.6, 0, sw), 0.1);
    assert.ok(Math.abs(_aroundChannel(0.1, -0.6, -0.6, sw, sw) - -0.5) < 1e-12);
    assert.equal(_aroundChannel(0.1, -0.6, -0.6, 1, sw), -0.6);
    assert.ok(Math.abs(_aroundChannel(0.1, -0.6, 0.9, 0.65, sw) - (-0.5 + (0.9 + 0.5) * 0.5)) < 1e-12);
    assert.ok(Math.abs(_aroundChannel(0.1, -0.6, 0.9, 5, sw) - 0.9) < 1e-12); assert.equal(_aroundChannel(0.1, -0.6, 0.9, -1, sw), 0.1);
});

// T2.5: aroundVia.phase, the channels of the route moving one after the other
test('aroundChannel with a phase: the channel moves only inside its share of the way to the via pose, eased, same ends', () => {
    const sw = _AROUND.standW;
    assert.equal(_aroundChannel(0.1, -0.6, -0.6, 0, sw, [0, 0.5]), 0.1);
    assert.ok(Math.abs(_aroundChannel(0.1, -0.6, -0.6, sw, sw, [0.4, 1]) - (0.1 - 0.6)) < 1e-12, 'reaches the via pose at standW');
    assert.equal(_aroundChannel(0.2, -1, -1, sw * 0.3, sw, [0.5, 1]), 0.2, 'a channel that starts at .5 has not moved at .3');
    const half = _aroundChannel(0, -1, -1, sw * 0.25, sw, [0, 0.5]);
    assert.ok(Math.abs(half - -0.5) < 1e-12, 'smoothstep midpoint');
    assert.equal(_aroundChannel(0, -1, 0.4, 0.8, sw, [0, 0.5]), _aroundChannel(0, -1, 0.4, 0.8, sw), 'past standW the phase is not used');
    for (let k = 0; k <= 1; k += 0.05) assert.equal(_aroundChannel(0.3, -0.6, 0.1, k, sw, null), _aroundChannel(0.3, -0.6, 0.1, k, sw), 'null phase = today');
});

test('aroundVia.phase is validated and passed through recoveryVia', async () => {
    const { backSellSupport, recoveryVia } = await import('../src/rig/backSell.js');
    const skel = (via) => ({ _textureConfig: { backSell: { holdW: 0.7, recoveryArm: -0.7, recoveryElbow: 1.1, settledElbow: 0.7, contactPx: 15, evidence: 'x', handUnder: true, aroundVia: { u: -0.25, v: 0.9, recoveryArm: -0.6, recoveryElbow: -0.4, ...via } } },
        torso: { _semanticAnchors: { backWaist: { u: 0.25, v: 0.6 } } } });
    assert.equal(backSellSupport(skel({})).ok, true);
    const ph = { arm: [0, 0.55], elbow: [0.35, 1] };
    const ok = backSellSupport(skel({ phase: ph }));
    assert.equal(ok.ok, true);
    assert.deepEqual(recoveryVia(ok.data).phase, ph);
    assert.equal('phase' in recoveryVia(backSellSupport(skel({})).data), false, 'no phase, no key: today\'s object');
    for (const bad of [{ arm: [0.5, 0.5], elbow: [0, 1] }, { arm: [0, 1.2], elbow: [0, 1] }, { arm: [0, 1] }, { arm: 'x', elbow: [0, 1] }, { arm: [-0.1, 1], elbow: [0, 1] }])
        assert.equal(backSellSupport(skel({ phase: bad })).ok, false, JSON.stringify(bad));
});
