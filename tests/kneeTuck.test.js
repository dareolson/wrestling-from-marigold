// PLAN_GETUPS T2.1b: the knee tuck by flex. Off = today; below f0 nothing moves; at f1 the full tuck.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';

const rig = (cfg, extra = {}) => { const sk = Object.assign(Object.create(Skeleton.prototype), extra); sk.setKneeTuck(cfg); return sk; };
const CFG = { tuck: 10, f0: 0.6, f1: 1.6 };

test('no config, no tuck, whatever the flex', () => {
    const sk = rig(null);
    for (const f of [0, 0.5, 1, 2, 3]) assert.equal(sk._kneeTuckPx(0, -f), 0);
    assert.equal(Object.create(Skeleton.prototype)._kneeTuckPx(0, -2), 0, 'a rig that never saw setKneeTuck');
});

test('below f0 nothing, f1 and beyond the full tuck, monotonic and symmetric in the sign of the flex', () => {
    const sk = rig(CFG);
    assert.equal(sk._kneeTuckPx(0, 0), 0);
    assert.equal(sk._kneeTuckPx(0.1, -0.4), 0, 'flex .5 < f0');
    assert.equal(sk._kneeTuckPx(0.1, -0.5), 0, 'flex exactly f0');
    assert.equal(sk._kneeTuckPx(0, -1.6), 10);
    assert.equal(sk._kneeTuckPx(0, -2.5), 10);
    let last = 0;
    for (let f = 0; f <= 2.2; f += 0.05) { const v = sk._kneeTuckPx(0, -f); assert.ok(v >= last - 1e-12); last = v; }
    assert.equal(sk._kneeTuckPx(0.3, 1.9), sk._kneeTuckPx(1.9, 0.3));
});

test('a rig\'s own kneeFlexTuck overrides the candidate amount, and 0 turns it off for that rig', () => {
    assert.equal(rig(CFG, { _kneeFlexTuckRig: 4 })._kneeTuckPx(0, -2), 4);
    assert.equal(rig(CFG, { _kneeFlexTuckRig: 0 })._kneeTuckPx(0, -2), 0);
});

test('_attachChild: tuck 0 is today\'s result for both kinds of art; a tuck pulls further up the bone, also with jointPivotFrac', () => {
    const sk = rig(CFG);
    const plain = { _jointPivotFrac: 0 }, pivoted = { _jointPivotFrac: 0.2 };
    const ang = 0.7;
    assert.deepEqual(sk._attachChild(plain, 100, 100, ang, 1, 18), sk._end(100, 100, -18, ang));
    assert.deepEqual(sk._attachChild(plain, 100, 100, ang, 1, 18, 0), sk._attachChild(plain, 100, 100, ang, 1, 18));
    assert.deepEqual(sk._attachChild(pivoted, 100, 100, ang, 1, 18, 0), { x: 100, y: 100 });
    assert.deepEqual(sk._attachChild(plain, 100, 100, ang, 2, 18, 10), sk._end(100, 100, -56, ang));
    assert.deepEqual(sk._attachChild(pivoted, 100, 100, ang, 2, 18, 10), sk._end(100, 100, -20, ang));
});

test('the standing and lying legs sit below f0, so the tuck leaves them alone', () => {
    const sk = rig(CFG);
    for (const k of [...Skeleton.GETUP_SUPINE_POSES, Skeleton.GROUNDED_FLAT, Skeleton.GETUP_POSES.at(-1)]) {
        for (const side of ['far', 'near']) if (k.t === 0 || k.t === 1) assert.equal(sk._kneeTuckPx(k[`${side}Thigh`], k[`${side}Shin`]), 0, `${k.t} ${side}`);
    }
});

test('_tuckBound slides both anchors of a bound shin up its axis; unbound art and tuck 0 are untouched', () => {
    const sk = rig(CFG);
    const knee = { x: 10, y: 20 }, ankle = { x: 10, y: 80 };
    assert.deepEqual(sk._tuckBound({ _binding: {} }, knee, ankle, 0, 1, 0), [knee, ankle]);
    assert.deepEqual(sk._tuckBound({}, knee, ankle, 0, 1, 10), [knee, ankle]);
    const [k, a] = sk._tuckBound({ _binding: {} }, knee, ankle, 0, 2, 10);
    assert.ok(Math.abs(k.y - 0) < 1e-9 && Math.abs(a.y - 60) < 1e-9 && k.x === 10, 'straight down shin: both move up 20 px at scale 2');
    assert.equal(a.y - k.y, ankle.y - knee.y, 'length unchanged');
});
