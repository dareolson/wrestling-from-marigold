import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoverage, classifyMove, fingerprint, formatReport } from '../tools/move-critic/coverage.mjs';
import { specStatus } from '../tools/move-critic/specs.mjs';

const clip = (id, extra = {}) => ({ id, duration: 1, events: [{ at: 0.5, type: 'impact' }],
    tracks: { attacker: { keyframes: [{ at: 0, parts: {} }] } }, ...extra });
const lookupFrom = table => id => {
    if (!(id in table)) return { status: 'missing', spec: {} };
    return { status: Object.keys(table[id]).length ? 'specified' : 'empty', spec: table[id] };
};
const contactSpec = (from, to) => ({ contacts: [{ role: 'attacker', source: 'nearWrist', target: 'neck', from, to }] });
const caps = { capabilities: [] };
const build = (table, moves, clips, waivers = {}) => buildCoverage({
    moveSpecs: moves, clips, lookup: lookupFrom(table), waivers, capabilities: caps, adapters: [], exists: () => true });
const byId = (report, id) => report.moves.find(m => m.id === id);

test('a move with no spec is unverified, not covered', () => {
    const r = build({}, { poke: { clip: 'poke' } }, [clip('poke')]);
    assert.equal(byId(r, 'poke').status, 'unverified');
    assert.equal(byId(r, 'poke').specStatus, 'missing');
});

test('an empty spec with a waiver is not-applicable and shows the waiver reason', () => {
    const r = build({ pose: {} }, { pose: { clip: 'pose' } }, [clip('pose')], { pose: { reason: 'no contact to check', by: 'T', date: '2026-10-25' } });
    assert.equal(byId(r, 'pose').status, 'not-applicable');
    assert.equal(byId(r, 'pose').reason, 'no contact to check');
    assert.match(formatReport(r), /no contact to check/);
});

test('an empty spec without a waiver stays unverified', () => {
    const r = build({ pose: {} }, { pose: { clip: 'pose' } }, [clip('pose')]);
    assert.equal(byId(r, 'pose').status, 'unverified');
});

test('a fully specified and measured move is covered', () => {
    const r = build({ hug: contactSpec(0, 1) }, { hug: { clip: 'hug' } }, [clip('hug')]);
    assert.equal(byId(r, 'hug').status, 'covered');
    assert.deepEqual(byId(r, 'hug').checked, ['contacts']);
});

test('clip-declared grips / layers / parts the critic cannot measure make it partial', () => {
    const r = build({ hug: contactSpec(0, 1) }, { hug: { clip: 'hug' } }, [clip('hug', { layers: [{ from: 0, to: 1, order: [] }] })]);
    assert.equal(byId(r, 'hug').status, 'partial');
    assert.match(byId(r, 'hug').reason, /layers/);
});

test('a strike spec on a clip with no impact event is unchecked (partial)', () => {
    const table = { kick: { strikes: [{ role: 'attacker', source: 'nearAnkle', target: 'part:torso' }] } };
    const r = build(table, { kick: { clip: 'kick' } }, [clip('kick', { events: [] })]);
    assert.equal(byId(r, 'kick').status, 'partial');
    assert.match(byId(r, 'kick').reason, /no impact event/);
});

test('a legacy move with a spec cannot be traced, so its requirements are unchecked', () => {
    const r = build({ old: contactSpec(0, 1) }, { old: { clip: null } }, []);
    assert.equal(byId(r, 'old').status, 'partial');
    assert.match(byId(r, 'old').reason, /legacy move/);
});

test('the fingerprint changes when a contact window changes, and not otherwise', () => {
    const fp = spec => classifyMove({ id: 'hug', clip: clip('hug'), spec: { status: 'specified', spec } }).fingerprint;
    assert.equal(fp(contactSpec(0, 1)), fp(contactSpec(0, 1)));
    assert.notEqual(fp(contactSpec(0, 1)), fp(contactSpec(0, 0.9)));
    const withGrip = classifyMove({ id: 'hug', clip: clip('hug', { grips: [{ arm: 'l' }] }), spec: { status: 'specified', spec: contactSpec(0, 1) } });
    assert.notEqual(withGrip.fingerprint, fp(contactSpec(0, 1)));
    assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }));
});

test('adapters report their capabilities and flag a missing regression test', () => {
    const capabilities = { capabilities: [{ id: 'cap', maturity: 'pilot', mechanical: { status: 'pass' }, visual: [{ status: 'unverified' }],
        consumers: [{ kind: 'adapter', id: 'rise:x' }], regression: ['tests/here.test.js', 'tests/gone.test.js'] }] };
    const r = buildCoverage({ moveSpecs: {}, clips: [], lookup: specStatus, waivers: {}, capabilities,
        adapters: [{ id: 'rise:x', summary: 's', source: 'x' }, { id: 'rise:y', summary: 's', source: 'y' }],
        exists: rel => rel === 'tests/here.test.js' });
    assert.equal(r.adapters[0].status, 'unverified');
    assert.match(r.adapters[0].reason, /missing tests\/gone\.test\.js/);
    assert.equal(r.adapters[1].status, 'unverified');
    assert.match(r.adapters[1].reason, /no capability record/);
});

test('the real repo: every registry move is reported, and hammerlock (empty spec) and armBar (no spec) are unverified', () => {
    const r = buildCoverage();
    assert.equal(r.moves.length, Object.keys(r.moves.reduce((o, m) => ({ ...o, [m.id]: 1 }), {})).length);
    assert.equal(byId(r, 'hammerlock').status, 'unverified');
    assert.equal(byId(r, 'armBar').status, 'unverified');
    assert.equal(byId(r, 'taunt').status, 'not-applicable');
    assert.equal(r.adapters.length, 5);
});
