// G1a film (PLAN_GETUPS T2.1): the authored get-up under ?getups=v1 next to today's rise, forced rises (B1b), 1/60 s steps.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/getups_film.mjs [outRoot] [rig,rig]
//
// Per rig x column (today | new) x facing x opponent (front = no turn, behind = turn) it writes
//   <outRoot>/frames/<column>/<rig>-<l|r>-<front|behind>/sNNNN.jpg   every step from the last down frame to 2 s standing
//   <outRoot>/poses/<rig>-<l|r>-<front|behind>/pNN.jpg               the entry's keys, posed by setting riseT (the flip twice)
//   <outRoot>/film.json                                              ms, facings, flip step, per-frame part steps
// Frames and poses are raw film: not committed (.git/info/exclude).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP, partSteps } from './rise_handoff_probe.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const COLUMNS = { today: 'notitle=1', new: 'notitle=1&getups=v1' };
const STAND_MS = 2000, STEP_MS = 1000 / 60;

async function filmRig(name, rig, outRoot, results) {
    for (const [column, qs] of Object.entries(COLUMNS)) {
        process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george'; process.env.WFM_QS = qs;
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(400);
            await page.evaluate(INSTALL);
            const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
                const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
            const clip = { width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
            for (const facing of [-1, 1]) for (const opp of ['front', 'behind']) {
                const id = `${name}-${facing < 0 ? 'l' : 'r'}-${opp}`;
                const dir = join(outRoot, 'frames', column, id);
                rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
                const begin = await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: false, facing, pose: 'stale', opp });
                const rows = []; let prev = null, standAt = null, flipI = null, getUp = null;
                for (let i = 0; i < 400; i++) {
                    const f = await page.evaluate(STEP);
                    if (i === 0) getUp = await page.evaluate(() => window.__rw._getUp?.id ?? null);
                    const turned = prev && prev.facing !== f.facing;
                    if (turned && flipI === null && f.state === 'gettingUp') flipI = i;
                    rows.push({ i, now: f.now, state: f.state, facing: f.facing, riseT: f.riseT, x: f.x,
                        step: prev ? +Math.max(...Object.values(partSteps(prev, f, turned ? prev.x : null))).toFixed(2) : 0,
                        rawStep: prev ? +Math.max(...Object.values(partSteps(prev, f))).toFixed(2) : 0 });
                    await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 85, clip });
                    if (standAt === null && f.state === 'standing') standAt = f.now;
                    if (standAt !== null && f.now - standAt >= STAND_MS) break;
                    prev = f;
                }
                const t0 = rows[0].now, st = rows.find(r => r.state === 'standing');
                results.push({ rig: name, column, facing, opp, getUp, frames: rows.length, riseMs: st ? +(st.now - t0).toFixed(1) : null,
                    flipStep: flipI, flipMs: flipI === null ? null : +(rows[flipI].now - t0).toFixed(1), facingStart: facing, facingEnd: rows.at(-1).facing,
                    maxStep: Math.max(...rows.map(r => r.step)), flipFrameStep: flipI === null ? null : rows[flipI].step, rows });
                console.log(`[film] ${column}/${id}: ${rows.length} frames, rise ${st ? (st.now - t0).toFixed(0) : '?'} ms, ${getUp ?? 'legacy'}, facing ${facing} -> ${rows.at(-1).facing}, flip step ${flipI}, max step ${Math.max(...rows.map(r => r.step))}`);
                if (column === 'new') {
                    // the keys, one still each; the flip key twice (just before, on it)
                    const pdir = join(outRoot, 'poses', id);
                    rmSync(pdir, { recursive: true, force: true }); mkdirSync(pdir, { recursive: true });
                    await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: false, facing, pose: 'stale', opp });
                    const times = await page.evaluate(() => {
                        const e = window.__rw._getUp, ts = e.keys.map(k => k.t).concat(e.after ? e.after.slice(1).map(k => k.t) : []);
                        return e.flipAt === undefined ? ts : [...ts.slice(0, e.keys.length - 1), e.flipAt - 0.002, e.flipAt, ...ts.slice(e.keys.length)];
                    });
                    for (const [n, t] of times.entries()) {
                        await page.evaluate((t) => { const w = window.__rw; w.scene.tweens.killTweensOf(w); w.riseT = t; }, t);
                        await page.evaluate(STEP); await page.evaluate(STEP);
                        await page.screenshot({ path: join(pdir, `p${String(n).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 90, clip });
                    }
                    results.push({ rig: name, facing, opp, poseTimes: times });
                }
            }
        } finally { await h.close(); }
    }
}

const [outRoot = 'research/animation/getups-2026-10/g1a', rigArg = 'lou,george'] = process.argv.slice(2);
const results = [];
for (const n of rigArg.split(',')) await filmRig(n, RIGS[n], outRoot, results);
writeFileSync(join(outRoot, 'film.json'), JSON.stringify(results));
process.exit(0);
