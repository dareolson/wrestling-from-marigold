// PLAN_LIGHT_MOVES T3.0b: the toehold as a moving preview. One clip per case chains the saved still poses through the real move runtime:
// grab -> step-over (facing flips once) -> roll onto his stomach (PLACEHOLDER: a snap, no roll art) -> kneel -> sit-back pull x3 with the fist sell -> hold 0.5 s.
// A stepped pass measures the clip (fists, grips, caps); a live pass records it with Playwright recordVideo (webm, no ffmpeg), the canvas magnified onto the pair.
//   node tools/debug/toehold_t30_video.mjs <reportDir> <outDir>     env: ONLY=<pair prefix>, FACE=1|-1, ENDING=4a|4b, NOSLOW=1
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { PAIRS, sellFrames, fistSummary, SETUP, STEPF, GRIPPX, READ, MASKS, FISTS } from './toehold_t30_lib.mjs';

const [reportDir, outDir] = process.argv.slice(2);
const PORT = 5198, URL0 = `http://localhost:${PORT}`, DIST = 120;

// ---- the timeline (node side): waypoints per role, sampled at every keyframe time ------------------------------------------------
const T = { hold: .5, stepEnd: 1.2, flip: 1.25, roll: 1.51, kneel: 2.0, pull: 2.3, step: .45, end: 5.05 };
const num = (a, b, k) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => typeof (a[key] ?? b[key]) === 'number').map(key => [key, (a[key] ?? 0) + ((b[key] ?? 0) - (a[key] ?? 0)) * k]));
const sample = (wps, t) => {   // piecewise linear over [{ t, v }]; v is a flat numeric object
    if (t <= wps[0].t) return wps[0].v;
    for (let i = 1; i < wps.length; i++) if (t <= wps[i].t) { const k = (t - wps[i - 1].t) / (wps[i].t - wps[i - 1].t); return num(wps[i - 1].v, wps[i].v, k); }
    return wps[wps.length - 1].v;
};
const flat = (still, role) => { const { fists, ...rest } = still[role]; return role === 'att' ? { ...rest, _gap: still.gap, _attY: still.attY ?? 0 } : rest; };
export const buildClip = (P, ending) => {
    const [p1, p2, p3, p4] = [P['1-grab'], P['2-step-over'], P['3-kneel'], P[ending]];
    const fists = p3.def.fists, mid = role => num(flat(p3, role), flat(p4, role), .5);
    // kneel, then pull (to the ending), release halfway, pull, release halfway, pull, hold
    const pullTimes = [T.pull, ...[1, 2, 3, 4, 5].map(i => T.pull + i * T.step), T.end];
    const pullVal = (role, i) => (i === 0 ? flat(p3, role) : [1, 3, 5, 6].includes(i) ? flat(p4, role) : mid(role));
    const wp = role => [{ t: 0, v: flat(p1, role) }, { t: T.hold, v: flat(p1, role) }, { t: T.stepEnd, v: flat(p2, role) },
        ...(role === 'att' ? [{ t: T.flip, v: flat(p2, role) }, { t: T.kneel, v: flat(p3, role) }] : [{ t: T.roll - .01, v: flat(p2, role) }, { t: T.roll, v: flat(p3, role) }, { t: T.kneel, v: flat(p3, role) }]),
        ...pullTimes.map((t, i) => ({ t, v: pullVal(role, i) }))].sort((a, b) => a.t - b.t);
    const wa = wp('att'), wd = wp('def'), sell = sellFrames(fists, T.roll, T.end, 1.8);
    const times = [...new Set([...wa.map(w => w.t), ...wd.map(w => w.t), T.flip, T.roll, ...sell.map(f => f.at)].map(t => +t.toFixed(3)))].sort((a, b) => a - b);
    const armsAt = t => { const i = sell.findIndex(f => f.at >= t - 1e-9); if (i < 0) return sell[sell.length - 1].ch; if (i === 0 || sell[i].at - t < 1e-9) return sell[i].ch; const a = sell[i - 1], b = sell[i], k = (t - a.at) / (b.at - a.at); return num(a.ch, b.ch, k); };
    const frames = { attacker: [], defender: [] };
    for (const t of times) {
        const { _gap, _attY, ...ap } = sample(wa, t), d = sample(wd, t), after = t >= T.roll;
        frames.attacker.push({ at: t, pose: ap, x: DIST - _gap, y: _attY, facing: t >= T.flip ? -1 : 1, parts: {} });
        frames.defender.push({ at: t, pose: after ? { ...d, ...armsAt(t) } : d, x: DIST, y: 0, facing: after ? 1 : -1,   // the axis is the attacker's facing at play: the supine man faces -1, the prone man +1
           
            parts: after ? { lShin: 'ankleTwist', nearForearm: 'grip', farForearm: 'grip' } : { lShin: 'base', nearForearm: 'base', farForearm: 'base' } });
    }
    return { duration: T.end, flipAt: T.flip, rollAt: T.roll, frames, layers: [{ from: 0, to: .85, order: p1.order }, { from: .85, to: T.roll, order: p2.order }, { from: T.roll, to: T.end, order: p3.order }] };
};

// ---- in page ---------------------------------------------------------------------------------------------------------------------
const PLAYCLIP = ({ id, clip, rate }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    return import('/src/rig/articulation.js').then(({ shinsFromFolds }) => {
        const kf = frames => frames.map(f => ({ at: f.at, ease: 'linear', pose: shinsFromFolds(f.pose), transform: { x: f.x, y: f.y }, facing: f.facing, parts: f.parts }));
        const a0 = a.facing, dur = clip.duration, tf = clip.flipAt;
        const sides = flip => { const as = a.skeleton.lChannelSide(flip ? -a0 : a0), ds = d.skeleton.lChannelSide(flip ? a0 : -a0), sf = s => (s === ds ? 'same' : 'other'); return { l: sf(as), r: sf(as === 'near' ? 'far' : 'near') }; };
        const pre = sides(false), post = sides(true);
        const G = (arm, side, anchor, i, o) => ({ role: 'attacker', arm, to: { role: 'defender', joint: 'Ankle', side, anchor }, in: i, out: o, natural: true, palm: 'clutch' });
        sc.moveRuntime.register({ id, duration: dur, events: [{ at: clip.rollAt, type: 'roll' }], tracks: { attacker: { keyframes: kf(clip.frames.attacker) }, defender: { keyframes: kf(clip.frames.defender) } },
            grips: [G('l', pre.l, 'heel', [0, .05], [tf - .01, tf]), G('r', pre.r, 'toe', [0, .05], [tf - .01, tf]), G('l', post.l, 'heel', [tf, tf + .01], [dur - .01, dur]), G('r', post.r, 'toe', [tf, tf + .01], [dur - .01, dur])],
            plants: [], layers: clip.layers });
        a.state = d.state = 'holding';
        window.__clipDone = false;
        const h = sc.moveRuntime.play(id, { attacker: a, defender: d }, { rate, onEvent: e => { if (e.type === 'roll') d.lying = 'prone'; }, onComplete() { window.__clipDone = true; }, onCancel() { window.__clipDone = true; } });
        a._activeMove = d._activeMove = h; a._fixedHold = d._fixedHold = true;
        d.facing = -a.facing; d.lying = 'supine';
        return true;
    });
};
// drawn bounds of both men (world px): the stepped pass unions these over the clip to frame the recording
const BOUNDS = () => {
    const sc = window.__WFM_GAME.scene.scenes[0]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const w of [sc.w1, sc.w2]) for (const i of w.skeleton._parts) { if (!i || !i.visible || i.alpha <= 0 || !i.getBounds) continue; const b = i.getBounds(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom); }
    return [x0, y0, x1, y1];
};
// a fixed game camera on the pair for the recording
const LOCK = ({ cx, cy, z }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main;
    cam.stopFollow?.(); cam.removeBounds?.();
    const frame = () => { cam.setZoom(z); cam.centerOn(cx, cy); requestAnimationFrame(frame); };
    frame();
};

// ---- main ------------------------------------------------------------------------------------------------------------------------
const waitFor = async url => { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).ok) return; } catch { /* not up */ } await new Promise(r => setTimeout(r, 250)); } throw new Error('vite never came up'); };
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: new URL('../..', import.meta.url).pathname, stdio: 'ignore' });
process.on('exit', () => vite.kill());
await waitFor(URL0);
process.env.WFM_URL = URL0;
mkdirSync(`${outDir}/video`, { recursive: true });
const manifest = [], browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
try {
    for (const [pair, att, def] of PAIRS) {
        if (process.env.ONLY && !pair.startsWith(process.env.ONLY)) continue;
        for (const facing of [1, -1]) {
            if (process.env.FACE && +process.env.FACE !== facing) continue;
            const side = facing > 0 ? 'right' : 'left', rep = JSON.parse(readFileSync(`${reportDir}/${pair}-${side}/report.json`));
            const P = Object.fromEntries(Object.entries(rep).map(([k, v]) => [k, v.authored]));
            for (const ending of ['4a-heels', '4b-mat']) {
                if (process.env.ENDING && !ending.startsWith(process.env.ENDING)) continue;
                const tag = `${pair}-${side}-${ending.slice(0, 2)}`, clip = buildClip(P, ending);
                // 1. stepped pass: deterministic numbers over the whole clip
                process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&light=v1';
                const h = await launch(), series = [], grips = [], pinned = new Set(), box = [1e9, 1e9, -1e9, -1e9];
                try {
                    await h.page.waitForTimeout(2500);
                    await h.page.evaluate(INSTALL); await h.page.evaluate(MASKS);
                    await h.page.evaluate(SETUP, { facing, sep: DIST });
                    await h.page.evaluate(PLAYCLIP, { id: 'toeholdVideo_' + tag, clip, rate: 1 });
                    for (let f = 0; f < Math.ceil(clip.duration * 60); f++) {
                        const t = f / 60;
                        if (t >= T.roll + .05) series.push({ t: +t.toFixed(3), ...(await h.page.evaluate(FISTS)) });
                        if (f % 3 === 0 && t < clip.duration - .1) grips.push({ t, ...(await h.page.evaluate(GRIPPX)) });
                        if (f % 6 === 0) { const b = await h.page.evaluate(BOUNDS); box[0] = Math.min(box[0], b[0]); box[1] = Math.min(box[1], b[1]); box[2] = Math.max(box[2], b[2]); box[3] = Math.max(box[3], b[3]); }
                        if (f % 10 === 0) { const r = await h.page.evaluate(READ); for (const role of ['att', 'def']) for (const p of r[role].pinned) pinned.add(`${role} ${p}`); }
                        await h.page.evaluate(STEPF);
                    }
                } finally { await h.close(); }
                const cam = { cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2, z: +Math.min(960 / (box[2] - box[0] + 50), 600 / (box[3] - box[1] + 50)).toFixed(2) };
                const gmax = (rows, k) => Math.max(0, ...rows.map(g => g[k] ?? 0));
                // grips: while the kneel and the pulls run (2.0 s on) and over the transit before it (0.15-2.0 s: grab, step-over, flip, roll, the move into the kneel)
                const near = g => Math.abs(g.t - T.flip) < .07, held = grips.filter(g => g.t >= T.kneel), transit = grips.filter(g => g.t > .15 && g.t < T.kneel && !near(g)), flip = grips.filter(near);
                const summary = { fists: fistSummary(series), gripKneelAndPulls: { heel: gmax(held, 'heel'), toe: gmax(held, 'toe') }, gripTransit: { heel: gmax(transit, 'heel'), toe: gmax(transit, 'toe') }, gripFlipFrames: { heel: gmax(flip, 'heel'), toe: gmax(flip, 'toe') }, pinned: [...pinned] };
                // 2. recorded pass(es): normal speed always; a 0.25x copy for one case per pairing
                for (const [rate, suffix] of [[1, ''], ...(!process.env.NOSLOW && side === 'right' && ending === '4a-heels' ? [[.25, '-slow']] : [])]) {
                    const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 }, recordVideo: { dir: `${outDir}/video/_raw`, size: { width: 780, height: 496 } } });
                    const t0 = Date.now(), page = await ctx.newPage();
                    page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
                    await page.goto(`${URL0}/?p1=${att}&p2=${def}&notitle=1&light=v1&arena=1`, { waitUntil: 'load' });
                    await page.waitForSelector('canvas'); await page.locator('canvas').click(); await page.waitForTimeout(2500);
                    await page.evaluate(INSTALL);
                    await page.evaluate(() => { window.__WFM_GAME.loop.wake(); document.querySelector('canvas').style.visibility = 'hidden'; });
                    await page.evaluate(SETUP, { facing, sep: DIST }); await page.evaluate(LOCK, cam);
                    await page.waitForTimeout(300);
                    await page.evaluate(PLAYCLIP, { id: 'toeholdVideoLive_' + tag + suffix, clip, rate });
                    await page.evaluate(() => { document.querySelector('canvas').style.visibility = 'visible'; });
                    const tStart = (Date.now() - t0) / 1000;
                    await page.waitForFunction(() => window.__clipDone, null, { timeout: (clip.duration / rate + 10) * 1000, polling: 100 });
                    const tEnd = (Date.now() - t0) / 1000;
                    await page.evaluate(() => { document.querySelector('canvas').style.visibility = 'hidden'; });
                    await page.waitForTimeout(200);
                    const file = `${tag}${suffix}.webm`;
                    await ctx.close(); await page.video().saveAs(`${outDir}/video/${file}`);
                    const bytes = statSync(`${outDir}/video/${file}`).size;
                    manifest.push({ file, pair, side, ending, rate, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2), bytes, ...(suffix ? {} : { summary }) });
                    console.log(file, bytes, 'bytes', JSON.stringify(suffix ? '' : summary).slice(0, 500));
                }
            }
        }
    }
} finally {
    await browser.close(); vite.kill();
    const path = `${outDir}/video/manifest.json`;
    let old = []; try { old = JSON.parse(readFileSync(path)); } catch { /* first run */ }
    writeFileSync(path, JSON.stringify([...old.filter(o => !manifest.some(m => m.file === o.file)), ...manifest], null, 1));
}
