// Resolves where one character's production inputs and outputs live.
//
// Producer stages used to pin these at module scope, which is why adding a
// second wrestler meant copying and editing the .mjs files rather than running
// them. Paths now come from the character's own manifest, and any of them can be
// overridden per invocation, so a new character or view is data plus artwork.
//
// Precedence: CLI flag > manifest `production` block > error.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
export const DEFAULT_MANIFEST = path.join(SCRIPT_DIR, 'templates/rig-source-manifest.v2.example.json');

/** Parses `--flag value` and `--flag=value` into a plain object. */
export function parseFlags(argv) {
    const flags = {};
    for (let index = 0; index < argv.length; index++) {
        const token = argv[index];
        if (!token.startsWith('--')) continue;
        const [name, inline] = token.slice(2).split(/=(.*)/s);
        if (inline !== undefined) {
            flags[name] = inline;
        } else if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
            flags[name] = argv[++index];
        } else {
            flags[name] = true;
        }
    }
    return flags;
}

/**
 * Produces the absolute paths one normalization run needs.
 *
 * @param manifest parsed rig source manifest
 * @param flags    parsed CLI flags; --view, --sheet, --source-parts,
 *                 --revised-torso and --output each override the manifest
 */
export function resolveProduction(manifest, flags = {}) {
    const production = manifest.production;
    if (!production) {
        throw new Error(`${manifest.characterId ?? 'manifest'} has no "production" block; `
            + 'add one naming characterRoot, passASheet and per-view directories');
    }

    const view = flags.view ?? production.defaultView
        ?? Object.keys(production.views ?? {})[0];
    if (!view) throw new Error('no view given and the manifest declares none');

    const viewConfig = production.views?.[view];
    if (!viewConfig && !(flags['source-parts'] && flags.output)) {
        const known = Object.keys(production.views ?? {}).join(', ') || 'none';
        throw new Error(`manifest declares no production paths for view "${view}" `
            + `(declared: ${known}); pass --source-parts and --output to override`);
    }

    const root = path.resolve(REPO_ROOT, production.characterRoot);
    const under = (flag, declared) => {
        const value = flags[flag] ?? declared;
        if (!value) return null;
        return path.isAbsolute(value) ? value : path.resolve(root, value);
    };

    return {
        characterId: manifest.characterId,
        view,
        root,
        passASheet: flags.sheet
            ? path.resolve(REPO_ROOT, flags.sheet)
            : path.resolve(root, production.passASheet),
        passASha256: production.passASha256 ?? null,
        sourceParts: under('source-parts', viewConfig?.sourceParts),
        revisedTorso: under('revised-torso', viewConfig?.revisedTorso),
        output: under('output', viewConfig?.output),
        // Proof filenames are part of a candidate's published identity, so they
        // are declared rather than derived from the directory name.
        proofPrefix: flags['proof-prefix'] ?? viewConfig?.proofPrefix ?? `${view}-proof`,
    };
}

/** Every view the manifest declares production paths for. */
export function declaredViews(manifest) {
    return Object.keys(manifest.production?.views ?? {});
}
