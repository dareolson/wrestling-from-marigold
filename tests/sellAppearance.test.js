import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { jabClip } from '../src/animation/clips/jab.js';
import { backRiseParts, clutchArtPhase, groundedSellParts } from '../src/animation/sellAppearance.js';
import { MOVE_SPECS } from '../src/moves/registry.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';
import { george } from '../src/characters/george.js';

const ON = '?sellart=v1';
function withFlag(search, fn) {
    const prior = globalThis.location;
    if (search === undefined) delete globalThis.location;
    else globalThis.location = { search };
    try { return fn(); }
    finally {
        if (prior === undefined) delete globalThis.location;
        else globalThis.location = prior;
    }
}
function sell({ part = 'back', lying = 'supine', facing = 1, limb = null, rolls = 0, name = 'clutch', t = 0.4 } = {}) {
    return { plan: [{ name, part, lying, limb, rolls, duration: 1, amp: 1 }], i: 0, t, facing0: facing };
}
function fixture() {
    const calls = [], rises = [], grounded = [];
    const noop = () => {};
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now: 1000 }, tweens: { killTweensOf: noop, add: () => ({ stop() {} }) } },
        state: 'down', stateTimer: 3, facing: 1, lying: 'supine', _heightScale: 1,
        x: 400, y: 380, skinCol: 0, trunksCol: 0, stamina: 100,
        moveBlend: 0, walkPhase: 0, combatBlend: 0, pose: {},
        _activeMove: null, _choreoUntil: 0, _groundHandoff: null,
        _sell: sell(), _pain: null,
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
        skeleton: {
            _textureConfig: theszProcreateV1.textures,
            lChannelSide: () => 'near', setPartVariants: p => calls.push({ ...p }),
            setDepth: noop, invalidatePoseChannels: noop, setVisible: noop,
            updateGroundedReach: (...args) => grounded.push(args), updateGrounded: noop, updateUpright: noop,
            updateGetUp: (...args) => rises.push(args), updateFall: noop,
        },
    });
    return { w, calls, rises, grounded };
}

test('clutch art uses authored approach, contact and release phases with base endpoints', () => {
    const { w } = fixture();
    for (const [u, phase] of [[-1, 'rest'], [0, 'rest'], [0.01, 'approach'], [0.249, 'approach'],
        [0.25, 'contact'], [0.70, 'contact'], [0.701, 'release'], [0.999, 'release'], [1, 'rest'], [NaN, 'rest']]) {
        assert.equal(clutchArtPhase(u), phase);
        assert.deepEqual(groundedSellParts(sell({ t: u }), w.skeleton),
            phase === 'rest' ? {} : { nearForearm: 'grip' });
    }
});

test('the actual suplex back sell selects its one reaching hand; the head example is separate', () => {
    const { w } = fixture();
    assert.equal(MOVE_SPECS.suplex.sell.part, 'back');
    assert.deepEqual(groundedSellParts(sell({ part: MOVE_SPECS.suplex.sell.part }), w.skeleton), { nearForearm: 'grip' });
    assert.deepEqual(groundedSellParts(sell({ part: 'head' }), w.skeleton), { nearForearm: 'grip', farForearm: 'grip' });
    assert.deepEqual(groundedSellParts(sell({ part: 'head', lying: 'prone' }), w.skeleton), { nearForearm: 'grip' });
    for (const part of ['knee', 'chest', 'arm']) assert.deepEqual(groundedSellParts(sell({ part }), w.skeleton), {});
});

test('art follows the clutch anatomical slot for each facing, lying and roll parity', () => {
    for (const flipsWithFacing of [false, true]) for (const facing of [1, -1])
        for (const lying of ['supine', 'prone']) for (const rolls of [0, 1, 2]) for (const limb of ['lArm', 'rArm']) {
            const { w } = fixture();
            w.skeleton.lChannelSide = f => flipsWithFacing && f === -1 ? 'far' : 'near';
            const lNear = !(flipsWithFacing && facing === -1);
            const near = ((limb === 'lArm') === lNear) !== Boolean(rolls % 2);
            assert.deepEqual(groundedSellParts(sell({ facing, lying, rolls, limb }), w.skeleton),
                { [near ? 'nearForearm' : 'farForearm']: 'grip' });
        }
});

test('unavailable donor, absent image, unloaded texture and unsupported rigs all keep base art', () => {
    const { w } = fixture();
    assert.deepEqual(groundedSellParts(w._sell, { _textureConfig: george.textures }), {});
    assert.deepEqual(groundedSellParts(w._sell, {}), {});
    assert.deepEqual(groundedSellParts(w._sell, { _textureConfig: theszProcreateV1.textures, _partImages: { nearForearm: null } }), {});
    assert.deepEqual(groundedSellParts(w._sell, w.skeleton, () => false), {});
    assert.deepEqual(groundedSellParts(w._sell, w.skeleton, key => key === 'thesz_pv1_forearm_grip'), { nearForearm: 'grip' });
    const separateHands = { _textureConfig: { hand: 'base_hand', variants: { hand: { grip: { key: 'grip_hand' } } } } };
    assert.deepEqual(groundedSellParts(w._sell, separateHands), { nearHand: 'grip' });
    assert.deepEqual(backRiseParts(0.5, { _textureConfig: george.textures }), {});
});

test('default behavior, wrong flag and node without location make no appearance writes', () => {
    for (const search of [undefined, '', '?sellart=v2', '?aftermath=v2']) withFlag(search, () => {
        const { w, calls } = fixture();
        w.draw();
        assert.deepEqual(calls, []);
    });
});

test('painted hand contacts are requested only by the sell-art candidate', () => {
    for (const search of [undefined, '', ON]) withFlag(search, () => {
        const { w, grounded } = fixture();
        w.draw();
        assert.deepEqual(grounded.at(-1)[6], search === ON ? { paintedContacts: true, backContact: true } : undefined);
    });
});

test('one complete owner handles hold, release, sell completion and roll without stale other-hand art', () => withFlag(ON, () => {
    const { w, calls } = fixture();
    w._sell = sell({ part: 'head' });
    w.draw(); w.draw();
    assert.deepEqual(calls, [{ nearForearm: 'grip', farForearm: 'grip' }], 'unchanged selection is applied once');
    w._sell = sell(); w.draw();
    assert.deepEqual(calls.at(-1), { nearForearm: 'grip' }, 'complete selection clears far donor');
    w._sell = sell({ name: 'roll' }); w.draw();
    assert.deepEqual(calls.at(-1), {});
    w._sell = sell(); w.draw();
    w._sell = null; w.draw();
    assert.deepEqual(calls.at(-1), {});
    w._sell = sell(); w.draw();
    w._sell.t = 1; w.draw();
    assert.deepEqual(calls.at(-1), {});
}));

test('pin, pickup, possum, reset and other state exits clear on draw before tickDown can run', () => withFlag(ON, () => {
    for (const state of ['pinned', 'grabbed', 'possum', 'standing', 'gettingUp', 'risingUp', 'selling']) {
        const { w, calls } = fixture();
        w.draw();
        w.state = state;
        w.draw();
        assert.deepEqual(calls, [{ nearForearm: 'grip' }, {}], state);
        w.state = 'down'; w.draw();
        assert.equal(calls.length, 2, 'an interrupted same sell cannot resume stale art');
        w._sell = sell(); w.draw();
        assert.deepEqual(calls.at(-1), { nearForearm: 'grip' }, 'a new trip to mat can select art');
    }
}));

test('clip prepare releases the sell first; its samples own appearance until cancellation', () => withFlag(ON, () => {
    const { w, calls } = fixture();
    const runtime = new MoveRuntime();
    runtime.register(jabClip);
    w.draw();
    const handle = runtime.play('jab', { attacker: w }, { onCancel: () => { w._activeMove = null; } });
    w._activeMove = handle;
    assert.deepEqual(calls, [{ nearForearm: 'grip' }, {}, { nearForearm: 'base' }]);
    runtime.seek(handle, 0.04);
    assert.deepEqual(calls.at(-1), { nearForearm: 'fist' });
    const count = calls.length;
    w.draw();
    assert.equal(calls.length, count, 'draw does not write over active clip art');
    runtime.cancel(handle);
    assert.deepEqual(calls.at(-1), {});
    w.draw();
    assert.equal(calls.length, count + 1, 'cancelled old sell stays retired');
}));

test('legacy choreography and pose overrides release appearance and retire the old sell', () => withFlag(ON, () => {
    for (const legacySequence of [false, true]) {
        const { w, calls } = fixture();
        w.draw();
        if (legacySequence) w._choreoUntil = 1500;
        else w.tweenPose('idle', 100);
        w.draw();
        assert.deepEqual(calls, [{ nearForearm: 'grip' }, {}]);
        w._choreoUntil = 0; w.draw();
        assert.equal(calls.length, 2);
    }
}));

test('back-pain rise passes the optional performance context and uses its shared envelope', () => withFlag(ON, () => {
    const { w, calls, rises } = fixture();
    w.state = 'gettingUp';
    w._pain = { phase: 'rise', part: 'back', severity: 0.8 };
    for (const t of [0, 0.1, 0.5, 0.8, 0.85, 1]) {
        w.riseT = t; w.draw();
        assert.deepEqual(rises.at(-1)[6], { part: 'back', severity: 0.8 });
        assert.deepEqual(backRiseParts(t, w.skeleton), t > 0 && t < 0.85 ? { nearForearm: 'grip' } : {});
    }
    assert.deepEqual(calls, [{ nearForearm: 'grip' }, {}]);
    for (const pain of [null, { phase: 'mat', part: 'back', severity: 1 }, { phase: 'rise', part: 'head', severity: 1 },
        ...[undefined, 0, -1, NaN, Infinity].map(severity => ({ phase: 'rise', part: 'back', severity }))]) {
        w._pain = pain;
        assert.equal(w._backRiseContext(), null);
    }
    w._pain = { phase: 'rise', part: 'back', severity: 1 };
    w.lying = 'prone'; w.draw();
    assert.equal(rises.at(-1)[6], null, 'prone rise keeps its existing pose and contact path');
    assert.deepEqual(calls.at(-1), {}, 'prone rise does not keep a protective donor');
    w.lying = 'supine';
    w._activeMove = {}; assert.equal(w._backRiseContext(), null);
    w._activeMove = null; w._choreoUntil = 1500; assert.equal(w._backRiseContext(), null);
}));

test('a missing loaded donor is not passed to Skeleton even when configured', () => withFlag(ON, () => {
    const { w, calls } = fixture();
    w.scene.textures = { exists: () => false };
    w.draw();
    assert.deepEqual(calls, []);
}));

test('flag off: a back-pain rise passes no pain context and writes no appearance', () => {
    for (const search of [undefined, '', '?sellart=v2', '?aftermath=v2']) withFlag(search, () => {
        const { w, calls, rises } = fixture();
        w.state = 'gettingUp';
        w._pain = { phase: 'rise', part: 'back', severity: 1 };
        for (const t of [0, 0.2, 0.5, 0.9, 1]) {
            w.riseT = t; w.draw();
            assert.equal(rises.at(-1)[6], null);
        }
        assert.equal(w._backRiseContext(), null);
        assert.deepEqual(calls, []);
    });
});
