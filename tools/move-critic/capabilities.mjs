// The capability index (capabilities.json): what the engine has learned, who uses
// it, how it is tested, and, as separate fields, whether it is mechanically
// verified and whether Derek approved it. An index, not a second move registry:
// clip ids are checked against the real registry, never copied.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTERED_MOVE_CLIPS } from '../../src/animation/clips/index.js';
import { ADAPTER_IDS } from './adapters.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
export const CAPABILITIES_PATH = resolve(HERE, 'capabilities.json');

export const MATURITY = ['proposed', 'pilot', 'reused', 'retired', 'parked'];
export const MECHANICAL_STATUS = ['pass', 'fail', 'unverified', 'not-applicable'];
export const VISUAL_STATUS = ['approved', 'not-approved', 'unverified', 'not-applicable'];
export const CONSUMER_KINDS = ['clip', 'adapter', 'tool'];

export const loadCapabilities = (path = CAPABILITIES_PATH) => JSON.parse(readFileSync(path, 'utf8'));

/** Returns a list of human-readable problems; empty means valid. */
export function validateCapabilities(data, {
    clipIds = REGISTERED_MOVE_CLIPS.map(c => c.id),
    adapterIds = ADAPTER_IDS,
    root = ROOT,
} = {}) {
    const errors = [];
    if (data?.version !== 1) errors.push(`version must be 1 (got ${JSON.stringify(data?.version)})`);
    if (!Array.isArray(data?.capabilities)) return [...errors, 'capabilities must be an array'];
    const nonEmpty = v => typeof v === 'string' && v.trim() !== '';
    const checkStatus = (where, entry, states) => {
        if (!states.includes(entry?.status)) {
            errors.push(`${where}: status ${JSON.stringify(entry?.status)} must be one of ${states.join(', ')}`);
        } else if (entry.status !== 'pass' && entry.status !== 'approved' && !nonEmpty(entry.reason)) {
            errors.push(`${where}: status "${entry.status}" needs a reason`);
        }
    };
    const seen = new Set();
    for (const c of data.capabilities) {
        const at = `capability ${c?.id ?? '(no id)'}`;
        if (!nonEmpty(c?.id)) errors.push(`${at}: id is required`);
        else if (seen.has(c.id)) errors.push(`${at}: duplicate id`);
        else seen.add(c.id);
        for (const key of ['summary', 'authoring', 'supported', 'fallbacks']) {
            if (!nonEmpty(c?.[key])) errors.push(`${at}: ${key} is required`);
        }
        if (!nonEmpty(c?.origin?.failure) || !nonEmpty(c?.origin?.evidence)) errors.push(`${at}: origin needs failure and evidence`);
        if (!Array.isArray(c?.implementation) || !c.implementation.length) errors.push(`${at}: implementation must list at least one file`);
        for (const file of c?.implementation ?? []) {
            if (!existsSync(resolve(root, file))) errors.push(`${at}: implementation file not found: ${file}`);
        }
        if (!MATURITY.includes(c?.maturity)) errors.push(`${at}: maturity ${JSON.stringify(c?.maturity)} must be one of ${MATURITY.join(', ')}`);
        if (c?.maturity === 'parked' && !nonEmpty(c.parkedReason)) errors.push(`${at}: parked needs a parkedReason`);
        if (!Array.isArray(c?.consumers)) errors.push(`${at}: consumers must be an array`);
        for (const k of c?.consumers ?? []) {
            if (!CONSUMER_KINDS.includes(k?.kind)) errors.push(`${at}: consumer kind ${JSON.stringify(k?.kind)} must be one of ${CONSUMER_KINDS.join(', ')}`);
            else if (k.kind === 'clip' && !clipIds.includes(k.id)) errors.push(`${at}: consumer clip "${k.id}" is not a registered clip`);
            else if (k.kind === 'adapter' && !adapterIds.includes(k.id)) errors.push(`${at}: consumer adapter "${k.id}" is not a known adapter`);
            else if (k.kind === 'tool' && !existsSync(resolve(root, k.id))) errors.push(`${at}: consumer tool file not found: ${k.id}`);
        }
        if (!Array.isArray(c?.regression)) errors.push(`${at}: regression must be an array`);
        for (const cmd of c?.regression ?? []) {
            const file = cmd.replace(/^node --test /, '');
            if (!existsSync(resolve(root, file))) errors.push(`${at}: regression test not found: ${file}`);
        }
        checkStatus(`${at} mechanical`, c?.mechanical, MECHANICAL_STATUS);
        if (c?.mechanical?.status === 'pass' && !nonEmpty(c.mechanical.evidence)) errors.push(`${at} mechanical: pass needs evidence`);
        if (!Array.isArray(c?.visual) || !c.visual.length) errors.push(`${at}: visual must list at least one entry (use "unverified" with a reason)`);
        for (const [i, v] of (c?.visual ?? []).entries()) {
            checkStatus(`${at} visual[${i}]`, v, VISUAL_STATUS);
            if (v?.status === 'approved' && !(nonEmpty(v.by) && nonEmpty(v.date) && nonEmpty(v.scope))) {
                errors.push(`${at} visual[${i}]: approved needs by, date and scope`);
            }
        }
    }
    for (const d of data.localDecisions ?? []) {
        for (const key of ['id', 'decision', 'by', 'date', 'evidence']) {
            if (!nonEmpty(d?.[key])) errors.push(`localDecision ${d?.id ?? '(no id)'}: ${key} is required`);
        }
    }
    return errors;
}
