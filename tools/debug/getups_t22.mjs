// G1 film (PLAN_GETUPS T2.2/T2.3): backKneeHurt and its back-sell variant, suplex receiver (forced rise, back pain), Lou and
// George, both facings, opponent in front (no turn) and behind (turn); today (flag off) | new (?getups=v1). 1/60 s steps
// from the last down frame to 2 s standing.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/getups_t22.mjs [outRoot] [rig,rig]
//
// Writes <outRoot>/frames/<column>/<rig>-<l|r>-<front|behind>/sNNNN.jpg (raw, not committed) and <outRoot>/measure.json.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP, partSteps } from './rise_handoff_probe.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const COLUMNS = { today: 'notitle=1', new: 'notitle=1&getups=v1' };
const STAND_MS = 2000;
const dist = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);
const r1 = (v) => (v === null || v === undefined ? null : +v.toFixed(2));

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
                await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: true, facing, pose: 'stale', opp });
                const getUp = await page.evaluate(() => window.__rw._getUp?.id ?? null);
                const fr = []; let prev = null, standAt = null;
                for (let i = 0; i < 400; i++) {
                    const f = await page.evaluate(STEP);
                    const flipped = prev && prev.facing !== f.facing && prev.state === 'gettingUp';
                    const pivot = flipped ? prev.pts.nearKnee?.x ?? null : null;
                    fr.push({ ...f, i, flipped: !!flipped,
                        step: prev ? Math.max(...Object.values(partSteps(prev, f, flipped ? pivot : null))) : 0,
                        rawStep: prev ? Math.max(...Object.values(partSteps(prev, f))) : 0 });
                    await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 85, clip });
                    if (standAt === null && f.state === 'standing') standAt = f.now;
                    if (standAt !== null && f.now - standAt >= STAND_MS) break;
                    prev = f;
                }
                const t0 = fr[0].now, rising = fr.filter(x => x.state === 'gettingUp'), stand = fr.find(x => x.state === 'standing');
                const flipF = fr.find(x => x.flipped);
                const lastRise = rising.at(-1), afterStand = fr[fr.indexOf(stand) + 1];
                const win = (a, b) => rising.filter(x => x.riseT >= a && x.riseT <= b);
                // planted contacts: the near knee on the mat and the far foot, world x relative to their first frame in the window
                const drift = (key, a, b) => { const w = win(a, b).filter(x => x.pts[key]); if (w.length < 2) return null;
                    return Math.max(...w.map(x => Math.abs(x.pts[key].x - w[0].pts[key].x))); };
                const flipIdx = flipF ? fr.indexOf(flipF) : null;
                const jump = (key) => (flipF && fr[flipIdx - 1].pts[key] && flipF.pts[key] ? Math.abs(flipF.pts[key].x - fr[flipIdx - 1].pts[key].x) : null);
                const push = win(0.46, 0.72).map(x => dist(x.pts.farWrist, x.pts.farKnee)).filter(v => v !== null);
                const back = rising.map(x => x.backDist).filter(v => v !== null);
                const row = { rig: name, column, facing, opp, getUp, frames: fr.length,
                    riseMs: stand ? r1(stand.now - t0) : null,
                    maxStep: r1(Math.max(...fr.filter(x => x.state === 'gettingUp').map(x => x.step))),
                    maxRawStep: r1(Math.max(...fr.filter(x => x.state === 'gettingUp').map(x => x.rawStep))),
                    flipStep: flipF ? r1(flipF.step) : null, flipRawStep: flipF ? r1(flipF.rawStep) : null, flipFrame: flipIdx,
                    flipToStandFrames: flipF && stand ? stand.i - flipF.i : null,
                    xShiftAtFlip: flipF ? r1(flipF.x - fr[flipIdx - 1].x) : null,
                    kneeJumpAtFlip: r1(jump('nearKnee')), farAnkleJumpAtFlip: r1(jump('farAnkle')), nearAnkleJumpAtFlip: r1(jump('nearAnkle')),
                    nearKneeDrift: r1(drift('nearKnee', 0.46, 0.72)), farAnkleDriftAfterFlip: r1(drift('farAnkle', flipF ? flipF.riseT + 0.001 : 0.5, 0.72)),
                    pushDist: push.length ? { min: r1(Math.min(...push)), max: r1(Math.max(...push)), mean: r1(push.reduce((a, b) => a + b, 0) / push.length) } : null,
                    backDist: back.length ? { max: r1(Math.max(...back)), last: r1(back.at(-1)), mean: r1(back.reduce((a, b) => a + b, 0) / back.length) } : null,
                    facingStart: facing, facingLastRise: lastRise?.facing, facingFirstStand: stand?.facing, facingAfter: afterStand?.facing,
                    reFaceAtStand: stand && lastRise ? (stand.facing !== lastRise.facing || afterStand?.facing !== stand.facing) : null,
                    series: fr.map(x => ({ i: x.i, now: x.now, state: x.state, facing: x.facing, riseT: x.riseT, step: r1(x.step), rawStep: r1(x.rawStep), backDist: x.backDist })) };
                results.push(row);
                console.log(`[t22] ${column}/${id}: ${getUp ?? 'legacy'} rise ${row.riseMs} ms, step ${row.maxStep} (flip ${row.flipStep}), turn ${facing}->${row.facingAfter}, re-face ${row.reFaceAtStand}, push ${JSON.stringify(row.pushDist)}, back ${JSON.stringify(row.backDist)}`);
            }
        } finally { await h.close(); }
    }
}

const [outRoot = 'research/animation/getups-2026-10/g1', rigArg = 'lou,george'] = process.argv.slice(2);
mkdirSync(outRoot, { recursive: true });
const results = [];
for (const n of rigArg.split(',')) await filmRig(n, RIGS[n], outRoot, results);
writeFileSync(join(outRoot, `measure-${rigArg.replace(/,/g, '-')}.json`), JSON.stringify(results));
process.exit(0);
