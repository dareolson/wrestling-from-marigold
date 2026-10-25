import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCapabilities, validateCapabilities } from '../tools/move-critic/capabilities.mjs';

const good = () => ({
    version: 1,
    capabilities: [{
        id: 'x', summary: 's', origin: { failure: 'f', evidence: 'e' },
        implementation: ['src/animation/clipLayers.js'], authoring: 'a',
        consumers: [{ kind: 'clip', id: 'suplex' }], supported: 's', fallbacks: 'f',
        regression: ['tests/clipLayers.test.js'], maturity: 'pilot',
        mechanical: { status: 'pass', evidence: 'ev' },
        visual: [{ status: 'unverified', reason: 'not shown' }],
    }],
});
const withChange = fn => { const d = good(); fn(d.capabilities[0], d); return validateCapabilities(d); };

test('the real capabilities.json validates', () => {
    assert.deepEqual(validateCapabilities(loadCapabilities()), []);
});

test('the fixture baseline is valid', () => assert.deepEqual(validateCapabilities(good()), []));

test('a consumer clip that is not registered fails with its id', () => {
    const e = withChange(c => { c.consumers = [{ kind: 'clip', id: 'noSuchClip' }]; });
    assert.ok(e.some(m => m.includes('"noSuchClip" is not a registered clip')), e.join('\n'));
});

test('an unknown adapter and a missing tool file fail', () => {
    const e = withChange(c => { c.consumers = [{ kind: 'adapter', id: 'rise:nope' }, { kind: 'tool', id: 'tools/none.mjs' }]; });
    assert.ok(e.some(m => m.includes('"rise:nope" is not a known adapter')));
    assert.ok(e.some(m => m.includes('tools/none.mjs')));
});

test('an unknown maturity fails', () => {
    const e = withChange(c => { c.maturity = 'shiny'; });
    assert.ok(e.some(m => m.includes('maturity "shiny"')), e.join('\n'));
});

test('unverified / not-approved without a reason fail; pass without evidence fails', () => {
    assert.ok(withChange(c => { c.mechanical = { status: 'unverified' }; }).some(m => m.includes('needs a reason')));
    assert.ok(withChange(c => { c.visual = [{ status: 'not-approved' }]; }).some(m => m.includes('needs a reason')));
    assert.ok(withChange(c => { c.mechanical = { status: 'pass' }; }).some(m => m.includes('needs evidence')));
});

test('an approval must name who, when and for what', () => {
    const e = withChange(c => { c.visual = [{ status: 'approved' }]; });
    assert.ok(e.some(m => m.includes('approved needs by, date and scope')));
});

test('a missing regression test file and a parked capability without a reason fail', () => {
    assert.ok(withChange(c => { c.regression = ['tests/nope.test.js']; }).some(m => m.includes('tests/nope.test.js')));
    assert.ok(withChange(c => { c.maturity = 'parked'; }).some(m => m.includes('parkedReason')));
});

test('every unverified entry in the real file carries its one-line reason', () => {
    for (const c of loadCapabilities().capabilities) {
        if (c.mechanical.status === 'unverified') assert.ok(c.mechanical.reason, c.id);
        for (const v of c.visual) if (v.status === 'unverified') assert.ok(v.reason, c.id);
    }
});
