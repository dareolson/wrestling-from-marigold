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
