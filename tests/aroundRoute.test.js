// Rev 3 D9 (T8.3): the hand's route round through backSell.aroundVia. Pure pieces and the seams only; the whole route on the
// real Wrestler draw is measured by tools/debug/route_probe.mjs (numbers in the plan's Progress line).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import { clutchSell, sampleSell } from '../src/animation/sells.js';
import { AROUND, recoveryVia } from '../src/rig/backSell.js';
import { georgeRosterV1 } from '../src/characters/george_roster_v1.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';

const view = (c, torsoImage) => ({ _textureConfig: c.textures, torso: { ...torsoImage, _semanticAnchors: c.textures?.torso?.semanticAnchors } });
const W = 346, H = 585;
const torso = { frame: { realWidth: W, realHeight: H }, displayOriginX: W / 2, displayOriginY: H / 2, flipX: false, flipY: false,
    getWorldTransformMatrix: () => ({ a: 0.13, b: 0, c: 0, d: 0.13, tx: 100, ty: 200 }) };

test('Skeleton.aroundViaPoint: George\'s aroundVia as a world point (off the art, below and outboard of backWaist), null for Lou and for a rig without handUnder', () => {
    const g = Skeleton.prototype.aroundViaPoint.call(view(georgeRosterV1, torso));
    const via = georgeRosterV1.textures.backSell.aroundVia;
    assert.ok(Math.abs(g.x - (100 + 0.13 * (via.u * W - W / 2))) < 1e-9 && Math.abs(g.y - (200 + 0.13 * (via.v * H - H / 2))) < 1e-9);
    const waist = Skeleton.imageAnchorPoint({ ...torso, ...view(georgeRosterV1, torso).torso }, georgeRosterV1.textures.torso.semanticAnchors.backWaist);
    assert.ok(g.y > waist.y && g.x < waist.x, 'below (+y) and outboard (-x, the back side of the art) of the waist');
    assert.equal(Skeleton.prototype.aroundViaPoint.call(view(theszProcreateV1, torso)), null, 'Lou has no aroundVia');
    const noUnder = { ...georgeRosterV1.textures, backSell: { ...georgeRosterV1.textures.backSell, handUnder: false, aroundVia: undefined } };
    assert.equal(Skeleton.prototype.aroundViaPoint.call(view({ ...georgeRosterV1, textures: noUnder }, torso)), null);
});

test('clutchSell: the reach takes `approach` of the clutch to get in (default .25, so every other rig is unchanged); the rest of the keys stay', () => {
    const base = clutchSell('supine', 'back', 1.38, 'near', 0.7), slow = clutchSell('supine', 'back', 1.38, 'near', 0.7, 0.4);
    assert.deepEqual(base.keys.map(k => k.t), [0, 0.25, 0.45, 0.7, 1]);
    assert.deepEqual(slow.keys.map(k => k.t), [0, 0.4, 0.45, 0.7, 1]);
    assert.deepEqual(clutchSell('supine', 'back', 1.38, 'near', 0.7, undefined).keys, base.keys, 'undefined = the default');
    for (const u of [0, 0.1, 0.25, 0.4]) assert.ok(sampleSell(slow.keys, u).reach.near <= sampleSell(base.keys, u).reach.near + 1e-12, `slower in at u ${u}`);
    assert.equal(sampleSell(slow.keys, 0.4).reach.near, 1); assert.equal(sampleSell(slow.keys, 1).reach.near, 0.7);
});

test('George\'s route numbers: viaW and standW in range, a via pose with elbow inside its limit, an approach that leaves the key order intact', () => {
    assert.ok(AROUND.viaW > 0 && AROUND.viaW < 1 && AROUND.standW > 0 && AROUND.standW < 1);
    const b = georgeRosterV1.textures.backSell;
    assert.deepEqual(recoveryVia(b), { arm: -0.6, elbow: -0.4 });
    assert.ok(b.settledElbow + b.aroundVia.recoveryElbow >= 0, 'the via elbow stays a bent elbow');
    assert.ok(b.aroundVia.approach > 0.25 && b.aroundVia.approach < 0.45);
    assert.equal(recoveryVia(theszProcreateV1.textures.backSell), null);
});
