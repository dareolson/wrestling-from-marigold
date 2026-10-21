import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Default rig (Derek, 2026-10-18): forearms stack BELOW upper arms on both arms. The upper arm's rounded outline is the elbow cap; if
// the forearm wins the tie, the cap sweeps across the joint as the elbow bends.
// Skeleton.setDepth is the single owner of this order (no other file sets
// either part's depth), so pin the offsets it assigns.
const source = readFileSync(new URL('../src/Skeleton.js', import.meta.url), 'utf8');
const offset = (part) => {
    const m = source.match(new RegExp(`this\\.${part}\\??\\.setDepth\\(base(?:\\s*\\+\\s*([0-9.]+))?\\)`));
    assert.ok(m, `${part}.setDepth(base...) not found in Skeleton.js`);
    return m[1] ? Number(m[1]) : 0;
};

test('the near upper arm draws above the near forearm', () => {
    assert.ok(offset('nearUpArm') > offset('nearForearm'));
});

test('the far upper arm draws above the far forearm', () => {
    assert.ok(offset('farUpArm') > offset('farForearm'));
});

test('forearmOverUpperArm is opt-in and flips both arms for the characters that declare it', async () => {
    assert.match(source, /_forearmOverUpperArm = !!textures\.forearmOverUpperArm/);
    assert.match(source, /farForearm\.setDepth\(base \+ 0\.00002\)/);
    assert.match(source, /nearForearm\.setDepth\(base \+ 0\.00402\)/);
    const { georgeRosterV1 } = await import('../src/characters/george_roster_v1.js');
    assert.equal(georgeRosterV1.textures.forearmOverUpperArm, true);
    const { george } = await import('../src/characters/george.js');
    assert.equal(george.textures.forearmOverUpperArm, undefined, 'shipped George is untouched');
});

test('no other module reassigns an arm part depth', () => {
    for (const file of ['Wrestler.js', 'animation/MoveRuntime.js']) {
        let text = '';
        try { text = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'); } catch { continue; }
        assert.doesNotMatch(text, /(?:near|far)(?:UpArm|Forearm)\.setDepth/, `${file} must not reorder the arms`);
    }
});

test('farLegOverTorso is opt-in: far leg above trunks, below the near leg and near arms', async () => {
    assert.match(source, /_farLegOverTorso = !!textures\.farLegOverTorso/);
    const m = source.match(/farThigh\.setDepth\(base \+ 0\.0027\)/);
    assert.ok(m, 'far thigh is lifted to base + 0.0027');
    assert.ok(0.0027 > offset('trunks') && 0.0027 < 0.003 && 0.0027 < offset('nearForearm'));
    const { georgeRosterV1 } = await import('../src/characters/george_roster_v1.js');
    assert.equal(georgeRosterV1.textures.farLegOverTorso, true);
    const { george } = await import('../src/characters/george.js');
    assert.equal(george.textures.farLegOverTorso, undefined, 'shipped George is untouched');
});
