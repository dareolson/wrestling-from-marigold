// Dense trace of a move-editor draft: for both actors, every published joint
// and every body part's PAINTED outline (opaque-pixel boundary points of its
// texture, placed exactly as rendered), at a fixed frame rate. The trace is
// the critic's only input (metrics.mjs is pure), so a move is measured on the
// renderer and forward kinematics the author poses against.
//
//   node tools/move-critic/sample.mjs <draftId|path.json> <out.json> [--fps 60] [--strip dir] [--cast thesz,george] [--times 0,0.5]
//
// Expects the dev server on 127.0.0.1:5173. --strip saves a clean (handles,
// bones, references hidden) zoomed-out frame every 1/30 s for eye review.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const [source, outPath] = args;
const fps = Number(flag('--fps', 60));
const stripDir = flag('--strip', null);
const cast = flag('--cast', null); // attacker,defender character ids
const zoom = Number(flag('--zoom', 0.8));
const only = flag('--times', null); // comma list: sample (and strip) just these times

const PARTS = ['head', 'torso', 'trunks', 'nearThigh', 'nearShin', 'nearBoot', 'nearUpArm', 'nearForearm', 'nearHand',
    'farThigh', 'farShin', 'farBoot', 'farUpArm', 'farForearm', 'farHand'];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:5173/tools/move-editor/');
await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
await page.evaluate(() => localStorage.clear());
if (source.endsWith('.json')) {
    const draft = JSON.parse(readFileSync(source, 'utf8'));
    await page.evaluate(d => window.__MOVE_EDITOR.adoptDraft(d), draft);
} else {
    await page.evaluate(id => window.__MOVE_EDITOR.loadLibraryDraft(id), source);
}
await page.waitForTimeout(1200);
if (cast) {
    const [attacker, defender] = cast.split(',');
    await page.evaluate(([attacker, defender]) => {
        const E = window.__MOVE_EDITOR;
        const d = JSON.parse(JSON.stringify(E.draft));
        d.preview = { ...d.preview, characters: { attacker, defender } };
        E.adoptDraft(d);
    }, [attacker, defender]);
    await page.waitForTimeout(1200);
}

// Page-side helpers: sample without the timeline redraw setPlayhead does, and
// cache each texture frame's opaque boundary once.
await page.evaluate(async () => {
    const E = window.__MOVE_EDITOR;
    const model = await import('/tools/move-editor/model.js');
    const { outline } = await import('/tools/move-critic/page-outline.js');
    window.__CRITIC = {
        sampleAt(at, parts) {
            const draft = E.draft;
            const sampled = model.sampleDraft(draft, at);
            const out = { at, actors: {} };
            for (const role of ['attacker', 'defender']) {
                const actor = E.actors[role], state = sampled.tracks[role];
                actor.pose = { ...model.basePose(), ...state.pose };
                actor.transform = { x: 0, y: 0, ...state.transform };
                actor.parts = { ...state.parts };
                actor.facing = state.facing !== undefined ? E.stagingFacing() * state.facing : (draft.preview?.facing?.[role] ?? actor.facing);
            }
            for (const role of ['attacker', 'defender']) {
                E.renderActor(role);
                const actor = E.actors[role], sk = actor.skeleton, root = E.actorRoot(role);
                const outlines = {};
                for (const name of parts) {
                    const img = sk[name];
                    if (!img || img.visible === false || !img.displayWidth || img.alpha === 0) continue;
                    outlines[name] = outline(img).map(p => p.map(n => Math.round(n * 10) / 10));
                }
                out.actors[role] = {
                    floorY: root.y, rootX: root.x, facing: actor.facing,
                    pose: { ...actor.pose }, parts: { ...actor.parts },
                    joints: JSON.parse(JSON.stringify(sk.jointAttachmentPoints ?? {})),
                    outline: outlines,
                };
            }
            return out;
        },
        clean(zoom) {
            for (const h of E.handleLayer) h.setAlpha(0);
            for (const child of E.scene.children.list) if (child.type === 'Graphics' && child.depth >= 90) child.setAlpha(0);
            const box = document.getElementById('refShow');
            if (box) { box.checked = false; box.dispatchEvent(new Event('change')); }
            const onion = document.getElementById('onionSkin');
            if (onion) { onion.checked = false; onion.dispatchEvent(new Event('change')); }
            E.scene.cameras.main.setZoom(zoom).centerOn(E.TABLEAU_ORIGIN.x - 20, E.TABLEAU_ORIGIN.y - 190 * 0.8 / zoom);
        },
    };
});

const meta = await page.evaluate(() => {
    const E = window.__MOVE_EDITOR;
    const d = E.draft;
    return {
        id: d.id, duration: d.duration, events: d.events, contacts: d.contacts,
        characters: Object.fromEntries(['attacker', 'defender'].map(r => [r, E.actors[r].character])),
        scale: E.SCALE, origin: E.TABLEAU_ORIGIN,
        keyTimes: Object.fromEntries(Object.entries(d.tracks).map(([r, t]) => [r, t.keyframes.map(k => k.at)])),
        eases: Object.fromEntries(Object.entries(d.tracks).map(([r, t]) => [r, t.keyframes.map(k => k.ease ?? 'linear')])),
    };
});

const times = [];
for (let i = 0; i / fps < meta.duration - 1e-9; i++) times.push(Number((i / fps).toFixed(5)));
times.push(meta.duration);
if (only) times.splice(0, times.length, ...only.split(',').map(Number));

if (stripDir) { mkdirSync(stripDir, { recursive: true }); await page.evaluate(z => window.__CRITIC.clean(z), zoom); }
const canvas = await page.$('canvas');
const frames = [];
for (const [i, at] of times.entries()) {
    frames.push(await page.evaluate(([at, parts]) => window.__CRITIC.sampleAt(at, parts), [at, PARTS]));
    if (stripDir && (only || i % Math.max(1, Math.round(fps / 30)) === 0 || i === times.length - 1)) {
        await page.evaluate(z => window.__CRITIC.clean(z), zoom);
        await page.waitForTimeout(40);
        await canvas.screenshot({ path: `${stripDir}/f_${String(i).padStart(3, '0')}.png` });
    }
}
writeFileSync(outPath, JSON.stringify({ meta: { ...meta, fps, source }, frames }));
console.log(`${meta.id}: ${frames.length} frames → ${outPath}${errors.length ? `  page errors: ${errors.join(' | ')}` : ''}`);
await browser.close();
