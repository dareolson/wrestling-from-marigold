import test from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';

// Torso acting: `bend` rotates the upper body rigidly about the hips. The
// arm chain moves with the chest (attachments preserved), the legs never move,
// and zero is a no-op — so every move authored before the channel is unchanged.
function rig() {
    const part = (x, y) => ({ x, y, rotation: 0, visible: true,
        setPosition(nx, ny) { this.x = nx; this.y = ny; return this; },
        setRotation(r) { this.rotation = r; return this; } });
    const r = Object.create(Skeleton.prototype);
    Object.assign(r, {
        _headIsImage: true,
        torso: part(100, 60), head: part(100, 30), nearUpArm: part(85, 70), farUpArm: part(115, 70),
        nearForearm: part(85, 110), farForearm: part(115, 110), nearHand: part(85, 140), farHand: part(115, 140),
        nearThigh: part(92, 160), nearShin: part(92, 200),
        jointAttachmentPoints: {
            neck: { x: 100, y: 40 }, nearShoulder: { x: 85, y: 70 }, farShoulder: { x: 115, y: 70 },
            nearElbow: { x: 85, y: 110 }, farElbow: { x: 115, y: 110 }, nearWrist: { x: 85, y: 140 }, farWrist: { x: 115, y: 140 },
            nearHip: { x: 92, y: 150 }, farHip: { x: 108, y: 150 }, nearKnee: { x: 92, y: 190 }, nearAnkle: { x: 92, y: 230 },
        },
    });
    return r;
}
const snapshot = r => JSON.parse(JSON.stringify({ j: r.jointAttachmentPoints, t: [r.torso.x, r.torso.y], th: [r.nearThigh.x, r.nearThigh.y, r.nearThigh.rotation] }));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('zero bend leaves the render untouched', () => {
    const r = rig(); const before = snapshot(r);
    r._applyTorsoBend(1, 0);
    assert.deepEqual(snapshot(r), before);
});

test('bend rotates the upper body rigidly about the hips; legs stay put', () => {
    for (const facing of [1, -1]) {
        const r = rig(); const j0 = JSON.parse(JSON.stringify(r.jointAttachmentPoints));
        r._applyTorsoBend(facing, 0.4);
        const j = r.jointAttachmentPoints;
        // Shoulder→elbow→wrist lengths (attachment) preserved.
        assert.ok(Math.abs(dist(j.nearShoulder, j.nearElbow) - dist(j0.nearShoulder, j0.nearElbow)) < 1e-9);
        assert.ok(Math.abs(dist(j.nearElbow, j.nearWrist) - dist(j0.nearElbow, j0.nearWrist)) < 1e-9);
        // Forward bend carries the neck toward facing.
        assert.ok(Math.sign(j.neck.x - j0.neck.x) === facing);
        assert.equal(r.torso.rotation, facing * 0.4);
        // Legs untouched.
        for (const name of ['nearHip', 'farHip', 'nearKnee', 'nearAnkle']) assert.deepEqual(j[name], j0[name]);
        assert.deepEqual([r.nearThigh.x, r.nearThigh.y, r.nearThigh.rotation], [92, 160, 0]);
    }
});
