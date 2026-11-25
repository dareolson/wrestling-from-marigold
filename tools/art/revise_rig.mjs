// One art revision of one rig, end to end (ART_REVISION.md):
//   node tools/art/revise_rig.mjs <rig> [--dry] [--out research/art-revisions/<date>-<rig>]
//   rig: thesz-procreate-v1 | george-roster-v1 | kowalski-roster-v1 | guido-roster-v1
//
// 1. snapshot the rig's current art + resolved textures into <out>/old/ (the "before" the variants were drawn on)
// 2. run the rig's generator (re-cuts base parts from the PSD exports, rewrites src/characters/generated/<rig>.base.js)
// 3. build <out>/job.json: every variant painted on a base part's canvas (same size as the OLD base png), with its
//    semantic anchors, plus each base part's own anchors; projected/own-canvas art is skipped (it does not inherit)
// 4. run tools/art/rebase_variants.py: variants re-fitted onto the new base, anchors carried, IoU + lost ink reported
// 5. print the anchor values to paste into the rig file and the checks to run next
// --dry: steps 1 and 3-4 against the CURRENT art (no generator, no writes into src): a no-op revision, IoU ~1.0.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RIGS = {
    'thesz-procreate-v1': { file: 'thesz_procreate_v1.js', exp: 'theszProcreateV1', gen: ['tools/wrestler-cutter/prepare-lou-base.py'] },
    'george-roster-v1': { file: 'george_roster_v1.js', exp: 'georgeRosterV1', gen: ['tools/wrestler-cutter/prepare-roster-character.py', 'george'] },
    'kowalski-roster-v1': { file: 'kowalski_roster_v1.js', exp: 'kowalskiRosterV1', gen: ['tools/wrestler-cutter/prepare-roster-character.py', 'kowalski'] },
    'guido-roster-v1': { file: 'guido_roster_v1.js', exp: 'guidoRosterV1', gen: ['tools/wrestler-cutter/prepare-roster-character.py', 'guido'] },
};
// variant family -> [base texture key, base png]; far slots first so a farShin variant pairs with far_shin.png
const FAMILIES = {
    farShin: ['farShin', 'far_shin.png'], farThigh: ['farThigh', 'far_thigh.png'], farForearm: ['farForearm', 'far_forearm.png'],
    shin: ['shin', 'shin.png'], thigh: ['thigh', 'thigh.png'], forearm: ['forearm', 'forearm.png'], upperArm: ['upperArm', 'upper_arm.png'],
    torso: ['torso', 'torso.png'],
};

const args = process.argv.slice(2), rigId = args[0], dry = args.includes('--dry');
const rig = RIGS[rigId];
if (!rig) { console.error(`usage: node tools/art/revise_rig.mjs <${Object.keys(RIGS).join('|')}> [--dry] [--out dir]`); process.exit(2); }
const date = new Date().toISOString().slice(0, 10);
const outRel = args.includes('--out') ? args[args.indexOf('--out') + 1] : `research/art-revisions/${date}-${rigId}${dry ? '-dry' : ''}`;
const out = path.resolve(ROOT, outRel), assetRel = `src/assets/wrestlers/${rigId}`;
const pngSize = f => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const load = async () => (await import(pathToFileURL(path.join(ROOT, 'src/characters', rig.file)).href + `?t=${Date.now()}`))[rig.exp].textures;
const pairs = o => o ? Object.fromEntries(Object.entries(o).map(([k, a]) => [k, [a.u, a.v]])) : undefined;

// 1. snapshot
mkdirSync(path.join(out, 'old'), { recursive: true });
for (const f of readdirSync(path.join(ROOT, assetRel))) if (f.endsWith('.png')) cpSync(path.join(ROOT, assetRel, f), path.join(out, 'old', f));
const before = await load();
writeFileSync(path.join(out, 'old', 'textures.json'), JSON.stringify(before, null, 1));

// 2. regenerate
if (!dry) execFileSync('python3', rig.gen, { cwd: ROOT, stdio: 'inherit' });

// 3. job
const job = { out: dry ? path.join(out, 'dry-out') : assetRel, report: path.join(out, 'rebase.json'), parts: {} };
if (dry) mkdirSync(job.out, { recursive: true });
const skipped = [];
for (const [family, [baseKey, baseFile]] of Object.entries(FAMILIES)) {
    const oldBase = path.join(out, 'old', baseFile);
    if (!existsSync(oldBase) || !before[baseKey]) continue;
    const size = pngSize(oldBase).join('x'), variants = [];
    for (const [name, v] of Object.entries(before.variants?.[family] ?? {})) {
        if (!v?.file) continue;
        const src = path.join(out, 'old', v.file);
        if (!existsSync(src)) { skipped.push(`${family}.${name}: ${v.file} not in the asset folder`); continue; }
        if (v.projectedArm || pngSize(src).join('x') !== size) { skipped.push(`${family}.${name}: own canvas (does not inherit ${baseFile})`); continue; }
        variants.push({ name, src: path.relative(ROOT, src), dst: v.file, anchors: pairs(v.semanticAnchors) });
    }
    const anchors = pairs(before[baseKey].semanticAnchors);
    if (!variants.length && !anchors) continue;
    job.parts[family] = { old: path.relative(ROOT, oldBase), new: `${assetRel}/${baseFile}`, anchors, variants };
}
writeFileSync(path.join(out, 'job.json'), JSON.stringify(job, null, 1));

// 4. re-fit
execFileSync('python3', ['tools/art/rebase_variants.py', path.join(out, 'job.json')], { cwd: ROOT, stdio: 'inherit' });

// 5. what to paste, what to check
const report = JSON.parse(readFileSync(path.join(out, 'rebase.json')));
const fmt = a => '{ ' + Object.entries(a).map(([k, p]) => `${k}: { u: ${p.u.toFixed(6)}, v: ${p.v.toFixed(6)} }`).join(', ') + ' }';
console.log(`\nAnchors for src/characters/${rig.file} (semanticAnchors):`);
for (const [family, r] of Object.entries(report)) {
    if (Object.keys(r.anchors).length) console.log(`  ${family} (base): ${fmt(r.anchors)}`);
    for (const [file, v] of Object.entries(r.variants)) if (Object.keys(v.anchors).length) console.log(`  ${family} ${file}: ${fmt(v.anchors)}`);
}
if (skipped.length) console.log('\nNot re-fitted (check by eye):\n  ' + skipped.join('\n  '));
console.log(`\nNext (ART_REVISION.md steps 4-7): look at the overlays, add "splice" per variant where the joint end changed, re-run
tools/art/rebase_variants.py ${path.relative(ROOT, out)}/job.json; paste anchors; node tools/rig/validate-character-rigs.mjs; npm test;
height ladder + back-sell probes; both-facing strips for Derek.`);
