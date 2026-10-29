// George's back clutch and standing release with ?getups OFF (PLAN_GETUPS T3.3, E1 / D6): exactly what they were before
// 794cfd1 (T2.9) put the T2.6 hand route into his base aroundVia. THE FIXTURE (fixtures/georgeClutchFlagOff.json) WAS RECORDED
// FROM 794cfd1^ (a worktree of the commit before T2.9, this very file run there with WFM_UPDATE_FIXTURE=1), NOT from the code
// under test. Never regenerate it to make a failing run pass.
// Node has no Phaser parts, so the claim is bounded to what the code hands the skeleton: per frame of a compact (.63 s) and a
// normal (1.38 s) back clutch, both facings, the real `_sellPose` reach weight and the hand goal that weight gives through the
// rig's aroundVia point on a fixed stub torso image (aroundGoal, the point as a world point); and the standing recovery's
// `_recoveryPose` channels and hand weights for both facings, plain and carried. The wrist px steps (4.0 / 8.6 px a frame) and
// the hold margin (.48 px) come from the browser tools (route_probe.mjs, hold_weight_sweep.mjs); their numbers are in the plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import Skeleton from '../src/Skeleton.js';
import Wrestler, { POSES } from '../src/Wrestler.js';
import { AROUND, aroundGoal, recoveryVia } from '../src/rig/backSell.js';
import { georgeRosterV1 } from '../src/characters/george_roster_v1.js';
import { onlyListed } from './support/promotedFlags.js';

const FIXTURE = new URL('./fixtures/georgeClutchFlagOff.json', import.meta.url);
const TOL = 1e-9;
const noop = () => {};
const withFlag = (search, fn) => { globalThis.location = { search: onlyListed(search) }; try { return fn(); } finally { delete globalThis.location; } };
const IDLE = { lLeg: -0.05, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05, lElbow: 0.7, rElbow: 0.7, lShin: -0.11, rShin: -0.06 };
const BS = georgeRosterV1.textures.backSell;
const ANCHORS = georgeRosterV1.textures.torso.semanticAnchors;
const FRAME = 1 / 60;

// a torso image with a fixed 1000 x 1500 frame, origin at its middle, world matrix = scale 0.2 at (400, 300); flipped for facing -1
function torsoImage(facing) {
    return { frame: { realWidth: 1000, realHeight: 1500 }, displayOriginX: 500, displayOriginY: 750, flipX: facing < 0, flipY: false,
        getWorldTransformMatrix: () => ({ a: 0.2, b: 0, c: 0, d: 0.2, tx: 400, ty: 300 }), _semanticAnchors: ANCHORS };
}
const skeletonStub = (facing, side = 'near') => ({ _textureConfig: georgeRosterV1.textures, torso: torsoImage(facing), lChannelSide: () => side,
    setPartVariants: noop, backContactDistance: () => 5, aroundViaPoint: Skeleton.prototype.aroundViaPoint, aroundPathPoints: Skeleton.prototype.aroundPathPoints, backWaistPoint: Skeleton.prototype.backWaistPoint });
const round = v => (typeof v === 'number' ? +v.toFixed(9) : v);

function clutchTrack(facing, duration, notLast) {
    const sk = skeletonStub(facing);
    const w = Object.assign(Object.create(Wrestler.prototype), { skeleton: sk, facing, lying: 'supine', state: 'down' });
    const item = { name: 'clutch', part: 'back', lying: 'supine', limb: null, rolls: 0, duration, amp: 1.3 };
    const contact = { x: 380, y: 340 }, T = sk.backWaistPoint(), via = sk.aroundViaPoint();
    const rows = [];
    for (let t = 0; t <= duration + 1e-9; t += FRAME) {
        w._sell = { plan: notLast ? [item, { ...item }] : [item], i: 0, t, facing0: facing };
        const reach = w._sellPose().reach.near?.w ?? 0;
        const g = via ? aroundGoal(contact, via, T, reach) : null;
        rows.push([round(t), round(reach), g && round(g.x), g && round(g.y)]);
    }
    return { via, waist: T, path: sk.aroundPathPoints(), rows };
}

function standing({ facing = 1, side = 'near', now = 1000, since = 1000, until = 3500 } = {}) {
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now }, tweens: { add: () => ({ stop() {} }) } },
        x: 400, y: 380, _heightScale: 1, facing, state: 'standing', lying: 'supine', idlePose: georgeRosterV1.idlePose,
        skinCol: 0, trunksCol: 0, stamina: 100, moveBlend: 0, walkPhase: 0, combatBlend: 0, pose: { ...IDLE },
        _activeMove: null, _choreoUntil: 0, _floorContacts: null, _sell: null, _groundHandoff: null, _hold: null, _riseFrom: 0, _gripLatch: null,
        stateTimer: 0, input: { isDown: () => false, justDown: () => false },
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
        skeleton: { ...skeletonStub(facing, side), solveRouteHand: () => { throw new Error('the route solver must not run with getups off'); } },
    });
    w._pain = { source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'recover', since, until, planned: true };
    return w;
}

function snapshot() {
    const out = { values: { aroundVia: BS.aroundVia && { u: BS.aroundVia.u, v: BS.aroundVia.v, approach: BS.aroundVia.approach, recoveryArm: BS.aroundVia.recoveryArm, recoveryElbow: BS.aroundVia.recoveryElbow, path: BS.aroundVia.path ?? null },
        recoveryVia: recoveryVia(BS), holdW: BS.holdW, AROUND: { ...AROUND } }, clutch: {}, recoveryPose: {}, routeDraw: {} };
    withFlag('?sellart=v1&aftermath=v2', () => {
        for (const facing of [1, -1]) for (const [dur, notLast] of [[0.63, false], [1.38, false], [1.38, true]])
            out.clutch[`facing=${facing}/${dur}s${notLast ? '/notLast' : ''}`] = clutchTrack(facing, dur, notLast);
        for (const facing of [1, -1]) for (const side of ['near', 'far']) for (const mode of ['plain', 'carried']) {
            out.recoveryPose[`facing=${facing}/l=${side}/${mode}`] = [1010, 1100, 1250, 1500, 1800, 2300, 3000, 3499].map(now => {
                const w = standing({ facing, side, now });
                if (mode === 'carried') { w._pain.carried = 0.8; w._pain.riseEnd = { arm: 0.9, elbow: 1.2 }; }
                return { now, weight: w._recoveryWeight(), handWeight: w._recoveryHandWeight(), pose: w._recoveryPose() };
            });
        }
        // the standing route solver stays out: no path, so _routeHandDraw is null at every hand weight (the stub's solver throws)
        for (const facing of [1, -1]) out.routeDraw[`facing=${facing}`] = [1010, 1100, 1250, 1500, 2300].map(now => standing({ facing, now })._routeHandDraw(400, 380, 1, facing, { ...IDLE }));
    });
    return out;
}

function compare(a, b, path = '') {
    if (typeof a === 'number' && typeof b === 'number') return assert.ok(Math.abs(a - b) <= TOL, `${path}: ${a} vs ${b}`);
    if (Array.isArray(a)) { assert.equal(a.length, b.length, `${path} length`); a.forEach((v, i) => compare(v, b[i], `${path}[${i}]`)); return; }
    if (a && typeof a === 'object') {
        assert.deepEqual(Object.keys(a), Object.keys(b), `${path} keys`);
        for (const k of Object.keys(a)) compare(a[k], b[k], `${path}/${k}`);
        return;
    }
    assert.equal(a, b, path);
}

test('George\'s compact and normal back clutch and standing release, getups off, equal 794cfd1^ (the T2.9 route is behind ?getups)', () => {
    const now = JSON.parse(JSON.stringify(snapshot()));
    if (process.env.WFM_UPDATE_FIXTURE) writeFileSync(FIXTURE, JSON.stringify(now, null, 1) + '\n');
    compare(now, JSON.parse(readFileSync(FIXTURE, 'utf8')));
});

test('the snapshot is not vacuous: the goal travels to the waist, the via point is the base one, the release moves the arm', () => {
    const s = snapshot();
    assert.deepEqual([s.values.aroundVia.u, s.values.aroundVia.v], [-0.25, 0.9069]);
    for (const [k, c] of Object.entries(s.clutch)) {
        assert.ok(c.via && c.waist, k);
        const last = c.rows.at(-1), top = Math.max(...c.rows.map(r => r[1]));
        assert.ok(top > 0.5, `${k}: the reach gets in (${top})`);
        assert.ok(c.rows.some(r => r[2] !== c.rows[0][2]), k);
        assert.ok(last[0] > 0);
    }
    assert.notEqual(s.recoveryPose['facing=1/l=near/plain'].at(2).pose.lArm, IDLE.lArm);
    assert.ok(s.routeDraw['facing=1'].every(v => v === null));
});

test('with getups ON the overlay is the route: other via, path, via pose; the base fields it does not name stay', async () => {
    const { resolveAroundVia } = await import('../src/rig/backSell.js');
    const off = resolveAroundVia(BS, false), on = resolveAroundVia(BS, true);
    assert.deepEqual([off.u, off.v, off.recoveryArm, off.recoveryElbow, off.path], [-0.25, 0.9069, -0.6, -0.4, undefined]);
    assert.deepEqual([on.u, on.v, on.recoveryArm, on.recoveryElbow, on.approach], [-0.4772, 0.6358, -0.45, -1.8, 0.4]);
    assert.deepEqual(on.path, [{ u: -0.4772, v: 0.6358 }]);
});
