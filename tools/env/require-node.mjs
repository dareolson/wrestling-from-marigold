#!/usr/bin/env node
// Production art/rig commands must run on the Node version this repository
// pins in .nvmrc. The default `node` on this machine's PATH is a stale v19
// symlink, and several generated artifacts (PNG container bytes in particular)
// differ between major versions, so a wrong-version run produces output that
// looks certified and does not reproduce.
//
// Usage: `node tools/env/require-node.mjs` as a pre-step, or
//        `import { requireNode } from './tools/env/require-node.mjs'`.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function pinnedMajor(root = ROOT) {
    const raw = readFileSync(path.join(root, '.nvmrc'), 'utf8').trim();
    const major = Number.parseInt(raw.replace(/^v/, ''), 10);
    if (!Number.isInteger(major)) throw new Error(`.nvmrc does not name a Node major: ${raw}`);
    return major;
}

export function runningMajor(version = process.version) {
    return Number.parseInt(version.replace(/^v/, ''), 10);
}

export function checkNode({ root = ROOT, version = process.version } = {}) {
    const required = pinnedMajor(root);
    const running = runningMajor(version);
    return { required, running, ok: running === required };
}

export function requireNode(options = {}) {
    const { required, running, ok } = checkNode(options);
    if (ok) return { required, running };
    const message = [
        '',
        `  This command requires Node ${required} (pinned in .nvmrc); it is running Node ${running}.`,
        '',
        '  The default `node` on PATH is often a stale symlink. Use the pinned version:',
        '',
        '    nvm use              # reads .nvmrc',
        `    nvm exec ${required} npm test`,
        '',
        `  Or call it directly: ~/.nvm/versions/node/v${required}.*/bin/node`,
        '',
    ].join('\n');
    process.stderr.write(`${message}\n`);
    process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    requireNode();
}
