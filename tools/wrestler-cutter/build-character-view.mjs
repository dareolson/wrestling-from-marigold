#!/usr/bin/env node
// Generates and validates one character/view in a single command.
//
//   npm run art:build -- --manifest <manifest.json> --view profile
//   npm run art:build -- --view profile --output /tmp/candidate
//
// Every path comes from the character's manifest unless a flag overrides it, so
// producing another wrestler or another view is data and artwork, not a code
// edit. That is the whole point of the command: it is the thing wrestler #2 runs.
//
// Stages, in order:
//   1. manifest schema and contract validation
//   2. landmark contract replay, checked against the frozen Pass-A sheet
//   3. part normalization and proof render
//   4. artifact identity verification of what was just written

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    DEFAULT_MANIFEST, REPO_ROOT, declaredViews, parseFlags, resolveProduction,
} from './production-config.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function run(script, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path.join(SCRIPT_DIR, script), ...args], {
            stdio: 'inherit',
            cwd: REPO_ROOT,
        });
        child.on('error', reject);
        child.on('exit', code => (code === 0
            ? resolve()
            : reject(new Error(`${script} exited ${code}`))));
    });
}

async function main() {
    const flags = parseFlags(process.argv.slice(2));
    const manifestPath = path.resolve(REPO_ROOT, flags.manifest ?? DEFAULT_MANIFEST);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

    if (flags['list-views']) {
        console.log(declaredViews(manifest).join('\n'));
        return;
    }

    const config = resolveProduction(manifest, flags);
    const rel = target => path.relative(REPO_ROOT, target);
    const manifestArgs = ['--manifest', manifestPath];
    const viewArgs = [...manifestArgs, '--view', config.view];

    console.log(`building ${config.characterId} / ${config.view}`);
    console.log(`  sheet   ${rel(config.passASheet)}`);
    console.log(`  parts   ${rel(config.sourceParts)}`);
    console.log(`  output  ${rel(config.output)}\n`);

    console.log('[1/4] validating the source manifest');
    await run('validate-source-manifest.mjs', [manifestPath]);

    console.log('\n[2/4] replaying the landmark contract against the frozen sheet');
    await run('apply-landmark-contract.mjs', [...viewArgs, '--sheet', config.passASheet]);

    console.log('\n[3/4] normalizing parts and rendering proofs');
    const passThrough = [];
    for (const flag of ['source-parts', 'revised-torso', 'output', 'proof-prefix']) {
        if (flags[flag]) passThrough.push(`--${flag}`, flags[flag]);
    }
    await run('normalize-profile-v2-parts.mjs', [...viewArgs, ...passThrough]);

    console.log('\n[4/4] verifying artifact identity');
    await run('verify-candidate.mjs', [config.output]);

    console.log(`\n${config.characterId} / ${config.view} built and verified`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
