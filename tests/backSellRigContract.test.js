// The back sell's rig contract (PLAN_GEORGE_TRANSFER T1.4): every registered character either has BOTH
// textures.torso.semanticAnchors.backWaist and textures.backSell (and they validate), or NEITHER, or is
// named in WAIVERS below with a reason. Today Procreate Lou and George (george-roster-v1) have both. A rig that gets the anchor
// first (George, at T3.1) needs a waiver until its data lands; a waiver that is no longer needed fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { backSellSupport } from '../src/rig/backSell.js';
import { george } from '../src/characters/george.js';
import { thesz } from '../src/characters/thesz.js';
import { theszFront3qR1 } from '../src/characters/thesz_front3q_r1.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';
import { theszRosterV1 } from '../src/characters/thesz_roster_v1.js';
import { georgeRosterV1 } from '../src/characters/george_roster_v1.js';
import { kowalskiRosterV1 } from '../src/characters/kowalski_roster_v1.js';
import { guidoRosterV1 } from '../src/characters/guido_roster_v1.js';

const BY_NAME = { george, thesz, theszFront3qR1, theszProcreateV1, theszRosterV1, georgeRosterV1, kowalskiRosterV1, guidoRosterV1 };
// id -> reason. Delete an entry when its data lands (a waiver for a rig that satisfies the contract fails).
const WAIVERS = {};

const registered = () => {
    const src = readFileSync(new URL('../src/scenes/Arena.js', import.meta.url), 'utf8');
    const names = src.match(/const CHARACTERS = \[([^\]]*)\]/)?.[1].split(',').map(n => n.trim()).filter(Boolean);
    assert.ok(names?.length, 'found Arena.js CHARACTERS');
    return names;
};
const view = c => ({ _textureConfig: c.textures, torso: { _semanticAnchors: c.textures?.torso?.semanticAnchors } });

test('this test lists exactly the characters Arena registers', () => {
    assert.deepEqual([...registered()].sort(), Object.keys(BY_NAME).sort());
});

test('every registered character has both backWaist and backSell, or neither, or a waiver', () => {
    for (const name of registered()) {
        const c = BY_NAME[name], id = c.id;
        const hasAnchor = !!c.textures?.torso?.semanticAnchors?.backWaist, hasData = !!c.textures?.backSell;
        if (id in WAIVERS) {
            assert.notEqual(hasAnchor, hasData, `${id}: waiver for a rig that satisfies the contract; delete it (${WAIVERS[id]})`);
            assert.ok(WAIVERS[id].length > 10, `${id}: a waiver needs a reason`);
            continue;
        }
        assert.equal(hasAnchor, hasData, `${id}: backWaist ${hasAnchor} but backSell ${hasData}; both or neither, or waive it with a reason`);
        const s = backSellSupport(view(c));
        assert.equal(s.ok, hasAnchor, `${id}: ${s.reason}`);
        if (hasAnchor) assert.ok(c.textures.backSell.evidence.length > 10, `${id}: backSell.evidence names the tool and date`);
    }
});

test('Procreate Lou and George support the back sell, each on its own numbers; every other rig is unsupported, never on borrowed ones', () => {
    const supported = Object.values(BY_NAME).filter(c => backSellSupport(view(c)).ok).map(c => c.id);
    assert.deepEqual(supported.sort(), ['george-roster-v1', 'thesz-procreate-v1']);
    assert.notDeepEqual(georgeRosterV1.textures.backSell, theszProcreateV1.textures.backSell, 'George does not carry Lou\'s numbers');
    assert.equal(georgeRosterV1.textures.backSell.holdW === theszProcreateV1.textures.backSell.holdW, false);
    for (const c of Object.values(BY_NAME)) if (c !== theszProcreateV1 && c !== georgeRosterV1) {
        const s = backSellSupport(view(c));
        assert.equal(s.ok, false, c.id);
        assert.equal(s.data, null, `${c.id}: no data borrowed`);
        assert.equal(s.reason, 'no backWaist anchor', c.id);
    }
});

test('backSell.handUnder is optional but must be a boolean when present (Rev 2 D6); only George sets it, Lou does not', () => {
    for (const c of Object.values(BY_NAME)) {
        const h = c.textures?.backSell?.handUnder;
        assert.ok(h === undefined || typeof h === 'boolean', `${c.id}: handUnder ${JSON.stringify(h)}`);
    }
    assert.equal(georgeRosterV1.textures.backSell.handUnder, true);
    assert.equal(theszProcreateV1.textures.backSell.handUnder, undefined, 'Lou\'s draw order is unchanged');
    for (const bad of ['yes', 1, null, {}]) {
        const s = backSellSupport({ ...view(georgeRosterV1), _textureConfig: { ...georgeRosterV1.textures, backSell: { ...georgeRosterV1.textures.backSell, handUnder: bad } } });
        assert.deepEqual([s.ok, s.reason], [false, 'invalid backSell data: handUnder'], JSON.stringify(bad));
    }
    for (const good of [true, false, undefined]) {
        const s = backSellSupport({ ...view(georgeRosterV1), _textureConfig: { ...georgeRosterV1.textures, backSell: { ...georgeRosterV1.textures.backSell, handUnder: good, aroundVia: undefined } } });
        assert.equal(s.ok, true, String(good));
    }
});

test('backSell.aroundVia is optional, finite { u, v }, only with handUnder (Rev 3 D9); George has it (G8a B), Lou does not', () => {
    assert.deepEqual(georgeRosterV1.textures.backSell.aroundVia, { u: -0.4772, v: 0.6358, recoveryArm: -0.45, recoveryElbow: -1.8, approach: 0.4, path: [{ u: -0.4772, v: 0.6358 }] });
    assert.equal(theszProcreateV1.textures.backSell.aroundVia, undefined);
    const withData = patch => backSellSupport({ ...view(georgeRosterV1), _textureConfig: { ...georgeRosterV1.textures, backSell: { ...georgeRosterV1.textures.backSell, ...patch } } });
    for (const bad of ['x', 1, null, {}, { u: 0.1 }, { v: 0.1 }, { u: NaN, v: 0 }, { u: 0, v: Infinity }, { u: '1', v: 0 }])
        assert.deepEqual([withData({ aroundVia: bad }).ok, withData({ aroundVia: bad }).reason], [false, 'invalid backSell data: aroundVia'], JSON.stringify(bad));
    assert.equal(withData({ aroundVia: { u: -0.5, v: 1.2 } }).ok, true, 'off the image is fine');
    assert.equal(withData({ aroundVia: undefined }).ok, true);
    // the standing via pose: both offsets or neither, finite
    for (const bad of [{ recoveryArm: -0.6 }, { recoveryElbow: -0.4 }, { recoveryArm: NaN, recoveryElbow: 0 }, { recoveryArm: 0, recoveryElbow: '1' }, { recoveryArm: null, recoveryElbow: 0 }])
        assert.equal(withData({ aroundVia: { u: 0, v: 0, ...bad } }).reason, 'invalid backSell data: aroundVia', JSON.stringify(bad));
    assert.equal(withData({ aroundVia: { u: 0, v: 0 } }).ok, true, 'the standing via pose is optional');
    assert.equal(withData({ aroundVia: { u: 0, v: 0, recoveryArm: 0, recoveryElbow: 0 } }).ok, true);
    assert.equal(withData({ handUnder: false }).reason, 'invalid backSell data: aroundVia', 'meaningless without handUnder');
    assert.equal(withData({ handUnder: undefined }).reason, 'invalid backSell data: aroundVia');
});
