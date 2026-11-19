// PLAN_LIGHT_MOVES Stage 12 (T12.11): an AI-vs-AI soak per pairing under ?light=v1, reporting which of the ten Stage 12 moves played, page errors and stuck states.
//   WFM_URL=http://localhost:5197 PAIR=lou-george SEC=150 node tools/debug/g12_soak.mjs [outDir]   (real time at WFM_TS x, default 3; PAIR = any two of lou george kowalski guido)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1', kowalski: 'kowalski-roster-v1', guido: 'guido-roster-v1' };
const NEW = ['wristlock', 'headlockTakeover', 'flyingMare', 'testOfStrength', 'leapfrog', 'backwardRoll', 'abdominalStretch', 'bodyScissors', 'indianDeathlock', 'backdropSuplex'];
const PAIR = process.env.PAIR ?? 'lou-george', SEC = Number(process.env.SEC ?? 150);
const outDir = process.argv[2] ?? 'research/animation/light-moves-2026-11/g12/soak-runs';
const [a, b] = PAIR.split('-');
process.env.WFM_P1 = RIGS[a]; process.env.WFM_P2 = RIGS[b]; process.env.WFM_TS = process.env.WFM_TS ?? '3';
process.env.WFM_QS = 'notitle=1&light=v1' + (process.env.SCALE ? '&scale=v1' : '');   // SCALE=1: PLAN_SCALE T2.3, the same soak under ?scale=v1
const INSTALL = () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const n of [1, 2]) if (sc[`w${n}`].input !== sc[`_p${n}AI`]) sc._togglePlayer(n);
    const S = window.__gsoak = { gsec: 0, stuck: [], played: {}, matches: 0, plays: {} };
    const rt = sc.moveRuntime, play0 = rt.play.bind(rt); rt.play = (id, ...r) => { S.plays[id] = (S.plays[id] ?? 0) + 1; return play0(id, ...r); };   // clips started, to set against the 'move' events (a hit/landing): the gap is whiffs and aborts
    const lim = { falling: 3, flipping: 3, selling: 2.5, staggered: 4, grabbed: 3, down: 12, slamming: 6, running: 8 }, since = { p1: [null, 0], p2: [null, 0] };
    sc.events.on('postupdate', (time, delta) => {
        S.gsec += delta / 1000 * sc.timeScale;
        for (const [id, w] of [['p1', sc.w1], ['p2', sc.w2]]) {
            const [st, t] = since[id];
            if (w.state !== st) since[id] = [w.state, S.gsec];
            else if (lim[w.state] && S.gsec - t > lim[w.state] + 4 && !S.stuck.some(s => s.who === id && s.state === w.state && S.gsec - s.t < 6)) S.stuck.push({ t: +S.gsec.toFixed(1), who: id, state: w.state, for: +(S.gsec - t).toFixed(1) });
        }
    });
    return true;
};
const h = await launch();
const errors = [];
try {
    const page = h.page;
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2 && window.__WFM_GAME.scene.scenes[0].moveRuntime, null, { timeout: 90000 });   // 4 soaks in parallel load slowly: wait for the scene, not a fixed 2.5 s
    await page.waitForTimeout(2500);
    await page.evaluate(INSTALL);
    const clock = () => page.evaluate(() => window.__gsoak.gsec), start = await clock(), ts = Number(process.env.WFM_TS), wall0 = Date.now();
    for (;;) { await page.waitForTimeout(2000); if ((await clock()) - start >= SEC || (Date.now() - wall0) / 1000 > SEC / ts * 2 + 60) break; }
    const data = await page.evaluate((NEW) => {
        const sc = window.__WFM_GAME.scene.scenes[0], ev = sc.matchEvents, S = window.__gsoak;
        const counts = ev.reduce((c, e) => { if (e.type === 'move') c[e.move] = (c[e.move] ?? 0) + 1; return c; }, {});
        return { gameSec: S.gsec, plays: S.plays, dodges: ev.filter(e => e.type === 'dodge').length, stuck: S.stuck, newMoves: Object.fromEntries(NEW.map(m => [m, counts[m] ?? 0])), allMoves: counts, events: ev.length, matchesEnded: ev.filter(e => e.type === 'matchEnd' || e.type === 'pinfall' || e.type === 'timeLimitDraw').length };
    }, NEW);
    mkdirSync(outDir, { recursive: true });
    const out = { pair: PAIR, ts, errors, ...data, gameSec: +data.gameSec.toFixed(1) };
    writeFileSync(join(outDir, `${PAIR}.json`), JSON.stringify(out, null, 1));
    console.log(`[soak] ${PAIR}: ${out.gameSec} game s, new moves ${JSON.stringify(out.newMoves)}, stuck ${out.stuck.length}, page errors ${errors.length}`);
} finally { await h.close(); }
