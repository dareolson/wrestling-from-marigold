// T3.6a (PLAN_GETUPS): loop strip before the G2 measuring pass.
//   WFM_URL=http://localhost:5173 node tools/debug/getups_g2_strip.mjs [outDir=research/animation/getups-2026-10/g2-strip]
// Per rig (Lou, George) x family (frontKnee turn = opponent behind, backTuck = opponent in front) x facing x column
// (keys = ?getups=v1&handsOff=1: the T3.2 keys without hand targets | t34b = ?getups=v1 as it plays now) it films 1/60 s steps
// (frames are raw film, not committed) and measures from the DRAWN wrists (pts.<side>Wrist):
//  - per world hand phase: tLift, ms from push start, planted frames (push start to lift), slip while planted
//  - step comparison: largest per-frame wrist step in the window (lift .. release end, or push start .. release end when it never lifts),
//    keyed arm (handsOff column) vs T3.4b, same window; plus the whole-rise largest wrist step of each. The facing-flip frame is excluded.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP } from './rise_handoff_probe.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const CASES = [{ family: 'frontKnee', lying: 'prone', opp: 'behind' }, { family: 'backTuck', lying: 'supine', opp: 'front' }];
const COLS = { keys: 'handsOff=1', t34b: '' };
const out = process.argv[2] ?? 'research/animation/getups-2026-10/g2-strip';
const r2 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(2));
const d = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);
const HOLD = () => { const w = window.__rw, h = w.skeleton._getUpHold;
    return { hands: w._getUp?.hands ?? null, pts: h ? JSON.parse(JSON.stringify(h.pts)) : {}, lift: h?.lift ? { ...h.lift } : {} }; };

const cells = [];
for (const [name, rig] of Object.entries(RIGS)) for (const c of CASES) {
    const per = {};
    for (const [col, extra] of Object.entries(COLS)) {
        process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george';
        process.env.WFM_QS = `notitle=1&getups=v1&getup=${c.family}${extra ? '&' + extra : ''}`;
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(400);
            await page.evaluate(INSTALL);
            const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
                const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
            const clip = { width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
            for (const facing of [-1, 1]) {
                const id = `${name}-${c.family}-${facing < 0 ? 'l' : 'r'}`;
                const dir = join(out, 'frames', col, id);
                rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
                await page.evaluate(BEGIN, { kind: 'gettingUp', lying: c.lying, pain: false, facing, pose: 'stale', opp: c.opp });
                const fr = []; let standAt = null;
                for (let i = 0; i < 500; i++) {
                    const f = await page.evaluate(STEP);
                    const hd = await page.evaluate(HOLD);
                    fr.push({ i, now: f.now, state: f.state, t: f.riseT, facing: f.facing, pts: f.pts, hold: hd });
                    await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 85, clip });
                    if (standAt === null && f.state === 'standing') standAt = f.now;
                    if (standAt !== null && f.now - standAt >= 2000) break;
                }
                (per[id] ??= { rig: name, family: c.family, facing, frames: fr.length })[col] = fr;
                console.log(`[strip] ${col}/${id}: ${fr.length} frames`);
            }
        } finally { await h.close(); }
    }
    for (const [id, p] of Object.entries(per)) {
        const rise = (fr) => fr.filter(x => x.state === 'gettingUp');
        const rk = rise(p.keys), rn = rise(p.t34b);
        const hands = rn.find(x => x.hold.hands)?.hold.hands ?? {};
        const t0 = rn[0].now, st = p.t34b.find(x => x.state === 'standing');
        const cell = { id, rig: p.rig, family: p.family, facing: p.facing, frames: p.frames, riseMs: st ? r2(st.now - t0) : null, hands: {} };
        const stepMax = (r, side, lo, hi) => { let m = null;
            for (let i = 1; i < r.length; i++) { if (r[i].t < lo - 1e-9 || r[i].t > hi + 1e-9 || r[i].facing !== r[i - 1].facing) continue;
                const s = d(r[i].pts[`${side}Wrist`], r[i - 1].pts[`${side}Wrist`]); if (s !== null && (m === null || s > m)) m = s; }
            return m; };
        for (const side of ['near', 'far']) {
            const ph = [].concat(hands[side] ?? []), mat = ph.findIndex(q => q.space === 'world'); if (mat < 0) continue;
            const m = ph[mat], key = `${side}${mat}`;
            const lifted = rn.find(x => x.hold.lift[key] !== undefined), tLift = lifted ? lifted.hold.lift[key] : null;
            const start = rn.find(x => x.t >= m.push[0] - 1e-9);
            const planted = rn.filter(x => x.t >= m.push[0] - 1e-9 && x.t < (tLift ?? m.push[1]) && x.hold.pts[key]);
            const slip = planted.map(x => d(x.pts[`${side}Wrist`], x.hold.pts[key]));
            const lo = tLift ?? m.push[0], hi = m.release[1];
            cell.hands[side] = { push: m.push, release: m.release, tLift: r2(tLift), msFromPush: lifted && start ? r2(lifted.now - start.now) : null,
                plantedFrames: planted.length, slipMax: r2(Math.max(...slip, 0)), neverPlants: planted.length <= 1,
                window: [r2(lo), r2(hi)], lifted: tLift !== null,
                keysStep: r2(stepMax(rk, side, lo, hi)), t34bStep: r2(stepMax(rn, side, lo, hi)),
                keysWhole: r2(stepMax(rk, side, 0, 2)), t34bWhole: r2(stepMax(rn, side, 0, 2)) };
            console.log(id, side, JSON.stringify(cell.hands[side]));
        }
        cells.push(cell);
    }
}
writeFileSync(join(out, 'strip.json'), JSON.stringify(cells, null, 1));
process.exit(0);
