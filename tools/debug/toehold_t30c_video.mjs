// T3.0c: the two-knee toe hold, recorded. Reads <waypointDir>/<case>/waypoints.json (toehold_t30c_solve.mjs), builds one clip per case, then
//   1. a stepped pass measures every frame (grips, knees, foot, fists, boot coverage, joint travel per frame),
//   2. a second stepped pass photographs the 12-frame contact sheet,
//   3. a live pass records normal speed and a 0.5x copy (Playwright recordVideo, webm).
//   node tools/debug/toehold_t30c_video.mjs <seedDir> <outDir>    env: ONLY=<pair prefix>, FACE=1|-1, NOREC=1 (measure + sheet only), NOHALF=1, FOREGROUND=1 (whole attacker in front)
import { mkdirSync, writeFileSync, readFileSync, statSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { PAIRS, fistSummary, SETUP, STEPF, GRIPPX, READ, MASKS, METRICS, FISTS } from './toehold_t30_lib.mjs';
import { MEASURE, installPage, T, FPS, DIST, fistKeys, armsAt } from './toehold_t30c_lib.mjs';

const [seedDir, outDir] = process.argv.slice(2);
const FOREGROUND = process.env.FOREGROUND === '1';
const FRONT_ORDER = [['defender', 'farArm'], ['defender', 'nativeBody'], ['defender', 'nearArm'], ['attacker', 'farArm'], ['attacker', 'nativeBody'], ['attacker', 'nearArm']];
const PORT = 5199, URL0 = `http://localhost:${PORT}`;
import { buildClip, PLAYCLIP } from './toehold_t30c_clip.mjs';
export { buildClip } from './toehold_t30c_clip.mjs';

const BOUNDS = () => {
    const sc = window.__WFM_GAME.scene.scenes[0]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const w of [sc.w1, sc.w2]) for (const i of w.skeleton._parts) { if (!i || !i.visible || i.alpha <= 0 || !i.getBounds) continue; const b = i.getBounds(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom); }
    return [x0, y0, x1, y1];
};
const LOCK = ({ cx, cy, z }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main;
    cam.stopFollow?.(); cam.removeBounds?.();
    const frame = () => { cam.setZoom(z); cam.centerOn(cx, cy); requestAnimationFrame(frame); };
    frame();
};

// ---- numbers from the per-frame series ----------------------------------------------------------------------------------------------------------------------
const KINDS = ['Hip', 'Knee', 'Ankle', 'Wrist'];
const dd = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
// near/far labels swap when a facing mirrors, so each kind (hips, knees, ...) is matched both ways round and the better match counts
const jump = (a, b, who) => Math.max(...KINDS.map(k => { const A = a.m.pts[who], B = b.m.pts[who]; return Math.min(Math.max(dd(A['near' + k], B['near' + k]), dd(A['far' + k], B['far' + k])), Math.max(dd(A['near' + k], B['far' + k]), dd(A['far' + k], B['near' + k]))); }));
const summarise = (rows, fistRows, facing) => {
    const at = t => rows[Math.round(t * FPS)];
    const gripRows = rows.filter(r => r.t >= .02 && r.t <= T.end - .03), g = r => Math.max(r.m.grip.heel ?? 99, r.m.grip.toe ?? 99);
    const worst = gripRows.reduce((b, r) => (g(r) > g(b) ? r : b), gripRows[0]);
    const over6 = gripRows.filter(r => g(r) > 6).map(r => r.t);
    // knee drop: first frame each knee is within 3 px of the mat
    const land = i => rows.find(r => r.t >= T.dropStart && r.m.knees[i] <= 3)?.t ?? null;
    const hold = rows.filter(r => r.t >= T.land - .001 && r.t <= T.end - .03), hipY = t => at(t).m.hip.y;
    const ks = i => ({ min: Math.min(...hold.map(r => r.m.knees[i])), max: Math.max(...hold.map(r => r.m.knees[i])) });
    // joint travel per frame: the attacker over the turn, the man over the roll, against the median frame
    const per = (who, t0, t1) => { const v = []; for (let k = Math.round(t0 * FPS); k < Math.round(t1 * FPS); k++) v.push({ t: rows[k + 1].t, d: jump(rows[k], rows[k + 1], who) }); return v; };
    const worstOf = v => v.reduce((b, x) => (x.d > b.d ? x : b), v[0]);
    const turn = per('att', T.turnStart, T.turnEnd), roll = per('def', T.rollStart, T.rollEnd), drop = per('att', T.dropStart, T.land);
    // wrenches: foot from the start of each pull (peak - 0.3 s) to the peak; knees stay put
    const wrenches = T.peaks.map(p => {
        const a = at(p - .3).m.foot, b = at(p).m.foot, path = rows.filter(r => r.t >= p - .3 && r.t <= p);
        let len = 0; for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].m.foot.x - path[i - 1].m.foot.x, path[i].m.foot.y - path[i - 1].m.foot.y);
        const hipA = at(p - .3).m.hip, hipB = at(p).m.hip;
        return { peak: p, foot: +Math.hypot(b.x - a.x, b.y - a.y).toFixed(1), footPath: +len.toFixed(1), hipBack: +((hipB.x - hipA.x) * facing).toFixed(1), kneesAtPeak: at(p).m.knees.map(v => +v.toFixed(1)) };
    });
    const bootRows = rows.filter(r => r.m.boot && r.t >= T.rollEnd), cov = r => r.m.boot.bootCoveredPx;
    // fists: contact per arm per strike; a strike must land on each wrench peak
    const fist = fistSummary(fistRows), lSide = fistRows[0].lSide, sideOf = ch => (ch === 'l' ? lSide : lSide === 'near' ? 'far' : 'near');
    // each strike: the arm that should land on the wrench's peak (l, r, l), the frame its contact run starts (0..4 px after being lifted), how long it stays on the mat, how high it was lifted
    const strikes = T.peaks.map((p, i) => {
        const arm = ['l', 'r', 'l'][i], sd = sideOf(arm), rel = r => r[sd];
        const win = fistRows.filter(r => r.t >= p - .5 && r.t <= p + .4), lifted = Math.min(...win.filter(r => r.t <= p).map(rel));
        const start = win.findIndex((r, k) => k > 0 && rel(r) !== null && rel(r) >= 0 && rel(r) <= 4 && rel(win[k - 1]) !== null && rel(win[k - 1]) < 0);
        let run = 0; if (start >= 0) for (let k = start; k < win.length && rel(win[k]) !== null && rel(win[k]) >= 0 && rel(win[k]) <= 4; k++) run++;
        return { peak: p, arm, side: sd, lift: +lifted.toFixed(1), landedAt: start >= 0 ? win[start].t : null, offsetFrames: start >= 0 ? Math.round((win[start].t - p) * FPS) : null, contactFrames: run };
    });
    return {
        grip: { worst: +g(worst).toFixed(1), worstAt: worst.t, framesOver6: over6.length, over6Times: over6.slice(0, 40) },
        drop: { hipDrop: +(hipY(T.land) - hipY(T.dropStart)).toFixed(1), start: T.dropStart, land: T.land, seconds: +(T.land - T.dropStart).toFixed(3), landFrame: [land(0), land(1)].map(t => t === null ? null : Math.round(t * FPS)), standingKnees: rows.find(r => Math.abs(r.t - T.dropStart) < .01).m.knees.map(v => +v.toFixed(1)), worstFrameJump: +worstOf(drop).d.toFixed(1) },
        turn: { seconds: +(T.turnEnd - T.turnStart).toFixed(3), flipAt: +T.turnFlip.toFixed(4), worstFrameJump: { ...worstOf(turn), d: +worstOf(turn).d.toFixed(1) }, medianFrameJump: +turn.map(x => x.d).sort((x, y) => x - y)[Math.floor(turn.length / 2)].toFixed(1) },
        roll: { seconds: +(T.rollEnd - T.rollStart).toFixed(3), afterLand: +(T.rollStart - T.land).toFixed(3), flipAt: +T.rollFlip.toFixed(4), worstFrameJump: { ...worstOf(roll), d: +worstOf(roll).d.toFixed(1) }, medianFrameJump: +roll.map(x => x.d).sort((x, y) => x - y)[Math.floor(roll.length / 2)].toFixed(1) },
        kneesHold: [ks(0), ks(1)].map(k => ({ min: +k.min.toFixed(1), max: +k.max.toFixed(1) })),
        kneeTravelPx: [0, 1].map(i => +Math.max(...hold.map(r => Math.hypot(r.m.kneeX[i] - hold[0].m.kneeX[i], 0))).toFixed(1)),
        wrenches, fists: fist, strikes,
        boot: { easeCovered: bootRows.length ? cov(bootRows[0]) : null, bootPx: bootRows.length ? bootRows[0].m.boot.bootPx : null, wrenchMin: Math.min(...bootRows.map(cov)), wrenchMax: Math.max(...bootRows.map(cov)), atPeaks: T.peaks.map(p => { const r = bootRows.reduce((b, x) => (Math.abs(x.t - p) < Math.abs(b.t - p) ? x : b), bootRows[0]); return cov(r); }) },
        pinned: [...new Set(rows.flatMap(r => r.m.pinned))],
    };
};

// ---- main -------------------------------------------------------------------------------------------------------------------------------------------------
const waitFor = async url => { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).ok) return; } catch { /* not up */ } await new Promise(r => setTimeout(r, 250)); } throw new Error('vite never came up'); };
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: new URL('../..', import.meta.url).pathname, stdio: 'ignore' });
process.on('exit', () => vite.kill());
await waitFor(URL0);
process.env.WFM_URL = URL0;
mkdirSync(`${outDir}/video`, { recursive: true });
const SHEET = [[.5, 'grab'], [.95, 'step-over'], [1.2, 'turning'], [1.3, 'turned'], [1.5, 'drop starts'], [1.7, 'knees land'], [1.95, 'roll starts'], [2.15, 'roll turns'], [2.35, 'on his stomach'], [2.8, 'wrench 1 + left fist'], [3.7, 'wrench 2 + right fist'], [4.6, 'wrench 3 + left fist']];
const manifestPath = `${outDir}/video/manifest.json`;
let manifest = []; try { manifest = JSON.parse(readFileSync(manifestPath)); } catch { /* first run */ }
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
try {
    for (const [pair, att, def] of PAIRS) {
        if (process.env.ONLY && !pair.startsWith(process.env.ONLY)) continue;
        for (const facing of [1, -1]) {
            if (process.env.FACE && +process.env.FACE !== facing) continue;
            const side = facing > 0 ? 'right' : 'left', tag = `${pair}-${side}`, caseDir = `${outDir}/${tag}`;
            const W = JSON.parse(readFileSync(`${caseDir}/waypoints.json`)), rep = JSON.parse(readFileSync(`${seedDir}/${tag}/report.json`)), p3 = rep['3-kneel'].authored;
            const orders = { p1: rep['1-grab'].authored.order, p2: rep['2-step-over'].authored.order, cap: p3.order };
            if (FOREGROUND) for (const phase of Object.keys(orders)) orders[phase] = FRONT_ORDER;
            const clip = buildClip(W, p3.def.fists, orders);
            process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&light=v1';
            const h = await launch(), rows = [], fistRows = [], box = [1e9, 1e9, -1e9, -1e9];
            let cam, summary;
            try {
                await h.page.waitForTimeout(2500);
                await h.page.evaluate(INSTALL); await h.page.evaluate(MASKS);
                await installPage(h.page, { SETUP, STEPF, GRIPPX, READ, METRICS, MEASURE });
                await h.page.evaluate(SETUP, { facing, sep: DIST }); await h.page.evaluate(PLAYCLIP, { id: 'toeholdC_' + tag, clip, rate: 1 });
                for (let f = 0; f <= Math.ceil(clip.duration * FPS); f++) {
                    const t = f / FPS;
                    rows.push({ t: +t.toFixed(4), m: await h.page.evaluate(m => window.__MEASURE(m), t >= T.rollEnd - .1 && f % 3 === 0) });
                    if (t >= T.rollEnd - .1) fistRows.push({ t: +t.toFixed(4), ...(await h.page.evaluate(FISTS)) });
                    if (f % 6 === 0) { const b = await h.page.evaluate(BOUNDS); box[0] = Math.min(box[0], b[0]); box[1] = Math.min(box[1], b[1]); box[2] = Math.max(box[2], b[2]); box[3] = Math.max(box[3], b[3]); }
                    await h.page.evaluate(STEPF);
                }
                summary = summarise(rows, fistRows.filter(r => r.t >= T.rollEnd), facing);
                if (FOREGROUND) summary.foreground = {
                    frames: rows.length - 2,
                    startupDepthGap: rows[0].m.actorDepthGap,   // before the first rendered clip frame
                    failures: rows.slice(1, -1).filter(r => !r.m.attackerInFront).length,
                    minDepthGap: Math.min(...rows.slice(1, -1).map(r => r.m.actorDepthGap))
                };
                cam = { cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2, z: +Math.min(960 / (box[2] - box[0] + 50), 600 / (box[3] - box[1] + 50)).toFixed(2) };
                // contact sheet: the same clip again, camera locked on the pair, 12 photographs
                await h.page.evaluate(SETUP, { facing, sep: DIST }); await h.page.evaluate(PLAYCLIP, { id: 'toeholdC_sheet_' + tag, clip, rate: 1 });
                await h.page.evaluate(LOCK, cam); await h.page.waitForTimeout(200);
                const shots = [];
                for (let f = 0; f <= Math.round(SHEET[SHEET.length - 1][0] * FPS); f++) {
                    const hit = SHEET.find(([t]) => Math.round(t * FPS) === f);
                    if (hit) { await h.page.waitForTimeout(60); shots.push([hit, (await h.page.locator('canvas').screenshot({ type: 'png' })).toString('base64')]); }
                    await h.page.evaluate(STEPF);
                }
                const sheet = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
                await sheet.setContent(`<body style="margin:0;background:#111;color:#eee;font:15px system-ui"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:4px">${shots.map(([[t, label], b]) => `<figure style="margin:0"><div style="aspect-ratio:4/3;overflow:hidden;position:relative;background:#000"><img src="data:image/png;base64,${b}" style="position:absolute;width:140%;left:-20%;top:-9%"></div><figcaption style="padding:2px 4px"><b>${t.toFixed(2)} s</b> ${label}</figcaption></figure>`).join('')}</div>`);
                await sheet.waitForTimeout(400);
                await sheet.screenshot({ path: `${caseDir}/contact-sheet.png`, fullPage: true }); await sheet.close();
            } finally { await h.close(); }
            writeFileSync(`${caseDir}/series.json`, JSON.stringify({ cam, rows: rows.map(r => ({ t: r.t, grip: r.m.grip, knees: r.m.knees.map(v => +v.toFixed(1)), kneeX: r.m.kneeX.map(v => +v.toFixed(1)), foot: r.m.foot, actorDepthGap: r.m.actorDepthGap, boot: r.m.boot ? [r.m.boot.bootCoveredPx, r.m.boot.bootPx] : null })), fists: fistRows }));
            console.log(tag, JSON.stringify(summary).slice(0, 1800));
            if (process.env.NOREC) {
                const recorded = manifest.some(m => m.tag === tag && m.file);
                manifest = recorded ? manifest.map(m => m.tag === tag && m.rate === 1 ? { ...m, summary } : m)
                    : [...manifest.filter(m => m.tag !== tag), { tag, pair, side, summary }];
                continue;
            }
            const entries = [];
            for (const [rate, suffix] of [[1, ''], ...(process.env.NOHALF ? [] : [[.5, '-half']])]) {
                const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 }, recordVideo: { dir: `${outDir}/video/_raw`, size: { width: 780, height: 496 } } });
                const t0 = Date.now(), page = await ctx.newPage();
                page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
                await page.goto(`${URL0}/?p1=${att}&p2=${def}&notitle=1&light=v1&arena=1`, { waitUntil: 'load' });
                await page.waitForSelector('canvas'); await page.locator('canvas').click(); await page.waitForTimeout(2500);
                await page.evaluate(INSTALL);
                await page.evaluate(() => { window.__WFM_GAME.loop.wake(); document.querySelector('canvas').style.visibility = 'hidden'; });
                await page.evaluate(SETUP, { facing, sep: DIST }); await page.evaluate(LOCK, cam);
                await page.waitForTimeout(300);
                await page.evaluate(PLAYCLIP, { id: 'toeholdCLive_' + tag + suffix, clip, rate });
                await page.evaluate(() => { document.querySelector('canvas').style.visibility = 'visible'; });
                const tStart = (Date.now() - t0) / 1000;
                await page.waitForFunction(() => window.__clipDone, null, { timeout: (clip.duration / rate + 10) * 1000, polling: 100 });
                const tEnd = (Date.now() - t0) / 1000;
                await page.evaluate(() => { document.querySelector('canvas').style.visibility = 'hidden'; });
                await page.waitForTimeout(200);
                const file = `${tag}${suffix}.webm`;
                await ctx.close(); await page.video().saveAs(`${outDir}/video/${file}`);
                entries.push({ file, tag, pair, side, rate, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2), bytes: statSync(`${outDir}/video/${file}`).size, ...(suffix ? {} : { summary }) });
                console.log(file, entries[entries.length - 1].bytes, 'bytes');
            }
            manifest = [...manifest.filter(m => !entries.some(e => e.file === m.file) && !(m.tag === tag && !m.file)), ...entries];
        }
    }
} finally {
    await browser.close(); vite.kill();
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
}
