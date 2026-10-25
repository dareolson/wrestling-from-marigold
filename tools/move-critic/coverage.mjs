// Honest move coverage: for every move in the registry (clip or legacy) plus the
// non-clip performance adapters, what is declared, what the critic actually
// measures, and what is unverified. Pure Node: reads MOVE_SPECS,
// REGISTERED_MOVE_CLIPS and SPECS; nothing is copied into JSON.
//
//   npm run moves:coverage                   print the report
//   npm run moves:coverage -- --json out.json
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MOVE_SPECS } from '../../src/moves/registry.js';
import { REGISTERED_MOVE_CLIPS } from '../../src/animation/clips/index.js';
import { specStatus } from './specs.mjs';
import { ADAPTERS } from './adapters.mjs';
import { loadCapabilities } from './capabilities.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
export const WAIVERS_PATH = resolve(HERE, 'coverage-waivers.json');
export { ADAPTERS };

// What metrics.mjs critique() measures from a spec. Each is a requirement the
// critic can grade; clip-declared grips / floorContacts / layers / parts have no
// metric, so they are always unchecked here (unit tests may cover the mechanism,
// but the critic does not measure it on a trace).
const SPEC_KINDS = ['contacts', 'strikes', 'landings', 'airborne'];
const CLIP_KINDS = ['grips', 'floorContacts', 'layers', 'parts'];
export const KINDS = [...SPEC_KINDS, ...CLIP_KINDS];

const stable = v => Array.isArray(v) ? v.map(stable)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])]))
    : v;
export const fingerprint = value => createHash('sha256').update(JSON.stringify(stable(value) ?? null)).digest('hex').slice(0, 12);

/** Part-variant requests in a clip's keyframes, as sorted `role:slot=variant` strings. */
export function partRequests(clip) {
    const out = new Set();
    for (const [role, track] of Object.entries(clip?.tracks ?? {})) {
        for (const frame of track.keyframes ?? []) {
            for (const [slot, variant] of Object.entries(frame.parts ?? {})) out.add(`${role}:${slot}=${variant}`);
        }
    }
    return [...out].sort();
}

/** The requirements a move declares: from its critic spec and from its clip. */
export function declaredFor(spec, clip) {
    const airborne = Object.values(spec?.airborne ?? {}).reduce((n, spans) => n + spans.length, 0);
    return {
        contacts: spec?.contacts?.length ?? 0,
        strikes: spec?.strikes?.length ?? 0,
        landings: spec?.landings?.length ?? 0,
        airborne,
        grips: clip?.grips?.length ?? 0,
        floorContacts: clip?.floorContacts?.length ?? 0,
        layers: clip?.layers?.length ?? 0,
        parts: partRequests(clip).length,
    };
}

/** Which declared kinds the critic measures, and why not for the rest. */
export function checksFor(declared, spec, clip) {
    const eventTypes = new Set((clip?.events ?? []).map(e => e.type));
    const checks = {};
    for (const kind of KINDS) {
        if (!declared[kind]) continue;
        if (CLIP_KINDS.includes(kind)) checks[kind] = { checked: false, why: 'the critic has no metric for it' };
        else if (!clip) checks[kind] = { checked: false, why: 'legacy move: no clip to trace' };
        else if (kind === 'strikes' && !eventTypes.has('impact')) checks[kind] = { checked: false, why: 'clip has no impact event to measure at' };
        else if (kind === 'landings' && spec.landings.some(l => !eventTypes.has(l.event))) checks[kind] = { checked: false, why: 'a landing names an event the clip lacks' };
        else checks[kind] = { checked: true };
    }
    return checks;
}

/**
 * One move's record. status: covered | partial | unverified | not-applicable.
 * `waiver` ({ reason, by, date }) makes it not-applicable, with the reason shown.
 */
export function classifyMove({ id, clip = null, spec: lookup, waiver = null }) {
    const { status: specState, spec } = lookup;
    const declared = declaredFor(spec, clip);
    const checks = checksFor(declared, spec, clip);
    const unchecked = Object.entries(checks).filter(([, c]) => !c.checked).map(([k, c]) => `${k}: ${c.why}`);
    const checked = Object.entries(checks).filter(([, c]) => c.checked).map(([k]) => k);
    const requirements = { spec, grips: clip?.grips ?? null, floorContacts: clip?.floorContacts ?? null,
        layers: clip?.layers ?? null, layerTie: clip?.layerTie ?? null, parts: partRequests(clip) };
    const record = { id, clip: clip?.id ?? null, specStatus: specState, declared, checked, unchecked,
        fingerprint: fingerprint(requirements) };
    if (waiver) return { ...record, status: 'not-applicable', reason: waiver.reason, waiver };
    if (specState === 'missing') return { ...record, status: 'unverified', reason: 'no critic spec' };
    if (specState === 'empty') return { ...record, status: 'unverified', reason: 'spec is empty and not waived' };
    if (!SPEC_KINDS.some(k => declared[k])) return { ...record, status: 'unverified', reason: 'spec declares no contacts, strikes, landings or airborne spans' };
    if (unchecked.length) return { ...record, status: 'partial', reason: `unchecked: ${unchecked.join('; ')}` };
    return { ...record, status: 'covered', reason: null };
}

/** The whole report. Every input is injectable so tests can use fixture registries. */
export function buildCoverage({
    moveSpecs = MOVE_SPECS, clips = REGISTERED_MOVE_CLIPS, lookup = specStatus,
    waivers = loadWaivers(), capabilities = loadCapabilities(), adapters = ADAPTERS,
    exists = rel => existsSync(resolve(ROOT, rel)),
} = {}) {
    const clipById = new Map(clips.map(c => [c.id, c]));
    const moves = Object.entries(moveSpecs).map(([id, def]) => classifyMove({
        id, clip: def.clip ? clipById.get(def.clip) ?? null : null, spec: lookup(id), waiver: waivers[id] ?? null,
    }));
    const adapterRows = adapters.map(a => {
        const caps = capabilities.capabilities.filter(c => c.consumers.some(k => k.kind === 'adapter' && k.id === a.id));
        const tests = [...new Set(caps.flatMap(c => c.regression))].map(t => ({ test: t, exists: exists(t.replace(/^node --test /, '')) }));
        return { id: a.id, summary: a.summary, source: a.source,
            capabilities: caps.map(c => ({ id: c.id, maturity: c.maturity, mechanical: c.mechanical.status, visual: c.visual.map(v => v.status) })),
            tests, status: caps.length && tests.length && tests.every(t => t.exists) ? 'recorded' : 'unverified',
            reason: !caps.length ? 'no capability record lists this adapter' : !tests.length ? 'capabilities name no regression test'
                : tests.filter(t => !t.exists).map(t => `missing ${t.test}`).join('; ') || null };
    });
    const counts = {};
    for (const m of moves) counts[m.status] = (counts[m.status] ?? 0) + 1;
    return { moves, adapters: adapterRows, summary: { moves: moves.length, counts, adapters: adapterRows.length,
        adaptersRecorded: adapterRows.filter(a => a.status === 'recorded').length } };
}

export function loadWaivers(path = WAIVERS_PATH) {
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}

const pad = (s, n) => String(s).padEnd(n);
const declaredText = d => Object.entries(d).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ') || '-';

export function formatReport(report) {
    const lines = [pad('move', 18) + pad('clip', 12) + pad('spec', 10) + pad('declared', 46) + pad('checked', 26) + 'status'];
    for (const m of report.moves) {
        lines.push(pad(m.id, 18) + pad(m.clip ?? '(legacy)', 12) + pad(m.specStatus, 10) + pad(declaredText(m.declared), 46)
            + pad(m.checked.join(',') || '-', 26) + m.status + (m.reason ? `  (${m.reason})` : ''));
    }
    lines.push('', 'adapters (non-clip performances)');
    for (const a of report.adapters) {
        lines.push(`${pad(a.id, 16)}${pad(a.status, 11)}${a.capabilities.map(c => `${c.id}[${c.maturity}; mech ${c.mechanical}; visual ${c.visual.join('/')}]`).join(', ') || '-'}`);
        if (a.reason) lines.push(`${pad('', 16)}${a.reason}`);
    }
    const c = report.summary.counts;
    lines.push('', `${report.summary.moves} moves: ` + ['covered', 'partial', 'unverified', 'not-applicable'].map(k => `${c[k] ?? 0} ${k}`).join(', ')
        + `; ${report.summary.adaptersRecorded}/${report.summary.adapters} adapters have a capability record and existing tests`);
    return lines.join('\n');
}

function main(argv) {
    const report = buildCoverage();
    const jsonAt = argv.indexOf('--json');
    if (jsonAt >= 0) writeFileSync(resolve(argv[jsonAt + 1]), JSON.stringify(report, null, 2) + '\n');
    console.log(formatReport(report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
