// Pure-math coverage for the George AI pilot's dynamic-pelvis hip-socket
// mechanism (_solveTorsoOrigin/_socketPoint round-trip, _gaitLeg's optional
// hip-point root override), independent of Phaser -- same mock-object
// pattern as tests/skeletonAnchor.test.js.
//
// Added 2026-07-25 alongside the George AI pilot integration (see Sprite
// sheets/AI Pilot/George/CLAUDE_INTEGRATION_HANDOFF.md's "Hip-socket design
// for this pilot"). No shipped character (George/Thesz) supplies nearHip/
// farHip sockets yet, so this is the only coverage for the mechanism until
// the live browser audits (torso_socket_sweep.mjs, joint_attachment_audit.mjs)
// run against the pilot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';

const proto = Skeleton.prototype;

function mockSkeleton(torsoTexDims, sockets) {
    return {
        torso: { _texDims: torsoTexDims },
        _torsoSockets: sockets,
        _socketPoint: proto._socketPoint,
        _solveTorsoOrigin: proto._solveTorsoOrigin,
        _endXY: proto._endXY,
    };
}

test('_solveTorsoOrigin round-trips with _socketPoint: placing the torso there and reading the hip-socket midpoint back reproduces the pelvis target', () => {
    const sockets = {
        nearHip: { u: 0.72, v: 0.91 },
        farHip:  { u: 0.18, v: 0.89 },
    };
    const sk = mockSkeleton({ w: 60, h: 120 }, sockets);
    const midU = (sockets.nearHip.u + sockets.farHip.u) / 2;
    const midV = (sockets.nearHip.v + sockets.farHip.v) / 2;

    for (const facing of [1, -1]) {
        for (const s of [1, 0.8, 1.4]) {
            for (let angle = -Math.PI; angle <= Math.PI; angle += 0.4) {
                const pelvisX = 130, pelvisY = 260;
                const origin = sk._solveTorsoOrigin(pelvisX, pelvisY, angle, s, facing);
                const back = sk._socketPoint(sk.torso, midU, midV, origin.x, origin.y, angle, s, facing);
                assert.ok(Math.abs(back.x - pelvisX) < 1e-9, `x: angle ${angle} s ${s} facing ${facing}`);
                assert.ok(Math.abs(back.y - pelvisY) < 1e-9, `y: angle ${angle} s ${s} facing ${facing}`);
            }
        }
    }
});

test('_solveTorsoOrigin: individual near/far hip sockets, read off the solved origin, straddle the pelvis target symmetrically at angle 0', () => {
    // At angle 0, facing 1, a symmetric near/far pair (equal offset from
    // u=0.5, mirrored) should place both hip sockets equidistant from the
    // pelvis target on the x axis and at the same y.
    const sockets = {
        nearHip: { u: 0.7, v: 0.9 },
        farHip:  { u: 0.3, v: 0.9 },
    };
    const sk = mockSkeleton({ w: 60, h: 120 }, sockets);
    const midU = 0.5, midV = 0.9;
    const pelvisX = 100, pelvisY = 200;
    const origin = sk._solveTorsoOrigin(pelvisX, pelvisY, 0, 1, 1);
    // Sanity: origin round-trips through the midpoint too.
    const mid = sk._socketPoint(sk.torso, midU, midV, origin.x, origin.y, 0, 1, 1);
    assert.ok(Math.abs(mid.x - pelvisX) < 1e-9 && Math.abs(mid.y - pelvisY) < 1e-9);

    const near = sk._socketPoint(sk.torso, sockets.nearHip.u, sockets.nearHip.v, origin.x, origin.y, 0, 1, 1);
    const far  = sk._socketPoint(sk.torso, sockets.farHip.u,  sockets.farHip.v,  origin.x, origin.y, 0, 1, 1);
    assert.ok(near.x > pelvisX, 'nearHip (u>0.5) sits toward facing +x of the pelvis target');
    assert.ok(far.x < pelvisX, 'farHip (u<0.5) sits toward -x');
    assert.ok(Math.abs((near.x - pelvisX) + (far.x - pelvisX)) < 1e-9, 'symmetric about the pelvis target');
    assert.ok(Math.abs(near.y - far.y) < 1e-9, 'same y (angle 0, same v)');
});

test('_gaitLeg: hipPoint override becomes the returned hx/hy and the IK root, not the shared (x, hipY)', () => {
    const gaitLeg = (...args) => proto._gaitLeg.apply({}, args);
    const foot = { fx: 10, lift: 0, liftFrac: 0 };
    const x = 100, hipY = 200, ankleGndY = 280, thighH = 56, shinH = 64, s = 1, facing = 1;

    const legacy = gaitLeg(foot, facing, x, hipY, ankleGndY, thighH, shinH, s, 1, null);
    assert.equal(legacy.hx, x);
    assert.equal(legacy.hy, hipY);

    const hipPoint = { x: 108, y: 194 }; // a socket displaced from the shared root
    const socketed = gaitLeg(foot, facing, x, hipY, ankleGndY, thighH, shinH, s, 1, hipPoint);
    assert.equal(socketed.hx, hipPoint.x);
    assert.equal(socketed.hy, hipPoint.y);
    // Same foot target, different root -> different solved thigh angle (the
    // whole point of "re-solve each leg's IK from its own hip socket to the
    // existing foot target" in the pilot's contract).
    assert.notEqual(socketed.thighAng, legacy.thighAng);
});

test('_gaitLeg: default hipPoint (absent) is byte-identical to the pre-pilot call shape', () => {
    const gaitLeg = (...args) => proto._gaitLeg.apply({}, args);
    const foot = { fx: -6, lift: 4, liftFrac: 0.5 };
    const withoutArg = gaitLeg(foot, -1, 50, 210, 285, 56, 64, 1.1, 1.2);
    const withNullArg = gaitLeg(foot, -1, 50, 210, 285, 56, 64, 1.1, 1.2, null);
    assert.deepStrictEqual(withoutArg, withNullArg);
    assert.deepStrictEqual(Object.keys(withoutArg), ['hx', 'hy', 'thighAng', 'shinAng', 'bootAng']);
});

test('_gaitLeg: authored off-axis sole is the IK target in both facings', () => {
    const sk = { _anchorVector: proto._anchorVector };
    const soleImg = {
        _jointPivotFrac: 0.16,
        _texDims: { w: 67, h: 95 },
        _soleAnchorFrac: { u: 0.374, v: 0.923 },
    };
    const foot = { fx: 8, lift: 7, liftFrac: 0.5 };
    for (const facing of [1, -1]) {
        const x = 100, hipY = 190, groundY = 285, thighH = 54, shinH = 40, s = 0.8;
        const solved = proto._gaitLeg.call(sk, foot, facing, x, hipY, groundY, thighH, shinH, s, 1, null, soleImg, s);
        const knee = proto._end(x, hipY, thighH, solved.thighAng);
        const vector = proto._anchorVector.call(sk, soleImg, soleImg._soleAnchorFrac, s, facing);
        const sole = proto._endXY(knee.x, knee.y, vector.x, vector.y, solved.shinAng);
        assert.ok(Math.abs(sole.x - solved.soleX) < 1e-9, `x facing ${facing}`);
        assert.ok(Math.abs(sole.y - solved.soleY) < 1e-9, `y facing ${facing}`);
        assert.equal(solved.soleY, groundY - foot.lift * s);
    }
});

test('_gaitLeg: a modular boot sole is grounded in both facings', () => {
    const boot = {
        _texDims: { w: 120, h: 100 },
        _binding: { proximal: { u: 0.3, v: 0.22 } },
        _semanticAnchors: { sole: { u: 0.57, v: 0.88 } },
        _attachmentDisplayScale: 0.25,
    };
    const foot = { fx: 4, lift: 0, liftFrac: 0 };
    for (const facing of [1, -1]) {
        const x = 100, hipY = 190, groundY = 285, thighH = 54, shinH = 64, s = 0.8;
        const solved = proto._gaitLeg.call({}, foot, facing, x, hipY, groundY, thighH, shinH, s, 1, null, null, s, boot);
        const knee = proto._end(x, hipY, thighH, solved.thighAng);
        const ankle = proto._end(knee.x, knee.y, shinH, solved.shinAng);
        const factor = s * boot._attachmentDisplayScale;
        const localX = facing * (boot._semanticAnchors.sole.u - boot._binding.proximal.u) * boot._texDims.w * factor;
        const localY = (boot._semanticAnchors.sole.v - boot._binding.proximal.v) * boot._texDims.h * factor;
        const sole = proto._endXY(ankle.x, ankle.y, localX, localY, solved.bootAng);
        assert.ok(Math.abs(sole.x - solved.soleX) < 1e-9, `x facing ${facing}`);
        assert.ok(Math.abs(sole.y - groundY) < 1e-9, `ground y facing ${facing}`);
    }
});
