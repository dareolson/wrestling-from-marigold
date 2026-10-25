// The back sell's rig contract (PLAN_GEORGE_TRANSFER T1.4): every registered character either has BOTH
// textures.torso.semanticAnchors.backWaist and textures.backSell (and they validate), or NEITHER, or is
// named in WAIVERS below with a reason. Today only Procreate Lou has both. A rig that gets the anchor
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
const WAIVERS = {
    'george-roster-v1': 'backWaist added at T3.1 (Derek G6a, candidate C); backSell data comes from T3.2 measurement, so the sell stays off until T3.3',
};

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

test('today only Procreate Lou supports the back sell; every other rig is unsupported with a reason, never on Lou\'s numbers', () => {
    const reasonFor = c => c === georgeRosterV1 ? 'no backSell data' : 'no backWaist anchor';
    const supported = Object.values(BY_NAME).filter(c => backSellSupport(view(c)).ok).map(c => c.id);
    assert.deepEqual(supported, ['thesz-procreate-v1']);
    for (const c of Object.values(BY_NAME)) if (c !== theszProcreateV1) {
        const s = backSellSupport(view(c));
        assert.equal(s.ok, false, c.id);
        assert.equal(s.data, null, `${c.id}: no data borrowed`);
        assert.equal(s.reason, reasonFor(c), c.id);
    }
});
