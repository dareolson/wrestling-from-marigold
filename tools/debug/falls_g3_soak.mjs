// PLAN_FALLS T3.10: real-match evidence, nothing capped or placed. Both sides on the real AI, ?falls=v1&grapples=v1, real time at WFM_TS x (default 3).
//   WFM_URL=http://localhost:5173 PAIR=lou-george SEC=150 node tools/debug/falls_g3_soak.mjs [out=research/animation/falls-2026-11/g3/soak]
// Logs per run: every landed strike (Wrestler._strikeReact, called at the hit after the damage) with the receiver's stamina right then and what it did (fall or stagger);
// every fall's pick reason; every landing (kind, tier, stamina, how long until it ended = the earliest legal pin: tryAction pins once !isLanding()); a landing cut short by a
// pick-up; page errors; states stuck past a limit. Nothing is retuned: the stamina recovery and the 35 line are the game's.
// T3.15: also the wear of both men once per game second (S.wear) and the receiver's wear at every strike and landing; the knockdown/exceptional table is
// tools/debug/falls_g3_wear_table.mjs over the JSON this writes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const PAIR = process.env.PAIR ?? 'lou-george', SEC = Number(process.env.SEC ?? 150), RUN = process.env.RUN ?? '1';
const outDir = process.argv[2] ?? 'research/animation/falls-2026-11/g3/soak';
const [a, b] = PAIR.split('-');
process.env.WFM_P1 = RIGS[a]; process.env.WFM_P2 = RIGS[b]; process.env.WFM_TS = process.env.WFM_TS ?? '3';
process.env.WFM_QS = `notitle=1&grapples=v1&falls=${process.env.FALLS ?? 'v1'}`;   // FALLS=off: the T4.3 get-up baseline

const INSTALL = () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const n of [1, 2]) if (sc[`w${n}`].input !== sc[`_p${n}AI`]) sc._togglePlayer(n);
    const S = window.__fsoak = { gsec: 0, strikes: [], landings: [], stuck: [], matches: 0, frames: 0, picked: [], wear: [], downHits: [], pops: [] };   // T4.3: downHits = _downHitReact calls, pops = largest joint step on the frame a man goes down -> gettingUp -> standing
    const W = [['p1', sc.w1], ['p2', sc.w2]];
    const log = sc._logEvent.bind(sc);
    sc._logEvent = (type, payload) => { log(type, payload); sc.matchEvents.at(-1).g = +S.gsec.toFixed(2); };   // g: the soak's game clock, which _matchTime is not across match resets
    const now = () => +S.gsec.toFixed(2);   // game seconds: real frame time x the arena's timeScale (WFM_TS), summed across the arena's own match resets
    for (const [id, w] of W) {
        const react = w._strikeReact.bind(w);
        w._strikeReact = (attacker, move, ...rest) => {
            const stamina = +w.stamina.toFixed(1), before = sc.matchEvents.filter(e => e.type === 'fall').length, st0 = w.state;
            react(attacker, move, ...rest);
            S.strikes.push({ t: now(), who: id, move, stamina, wear: +(w.wear ?? 0).toFixed(1), state: st0 });
        };
        const dh = w._downHitReact.bind(w);
        w._downHitReact = (attacker, move, intensity, sell) => { const st = w.state, ok = dh(attacker, move, intensity, sell); S.downHits.push({ t: now(), who: id, move, sell: sell ?? null, ok, ...(ok ? {} : { state: st }) }); return ok; };
        const start = w._startLanding.bind(w);
        w._startLanding = (kind, vy, additive, tier) => {
            start(kind, vy, additive, tier);
            S.landings.push({ t: now(), who: id, kind, tier: tier ?? null, stamina: +w.stamina.toFixed(1), wear: +(w.wear ?? 0).toFixed(1), source: w._pain?.source ?? w._fallVariant ?? null, endT: null, cut: false });
        };
    }
    const lim = { falling: 2, flipping: 2, selling: 1.5, staggered: 3, grabbed: 2, down: 10 }, since = { p1: [null, 0], p2: [null, 0] }, prevSt = { p1: null, p2: null }, prevPts = { p1: null, p2: null };
    const snap = (w) => Object.fromEntries(Object.entries(w.skeleton.jointAttachmentPoints ?? {}).filter(([, p]) => p).map(([k, p]) => [k, [p.x, p.y]]));
    const step = (c, p) => { let m = 0; for (const k of Object.keys(c)) if (p[k]) m = Math.max(m, Math.hypot(c[k][0] - p[k][0], c[k][1] - p[k][1])); return +m.toFixed(2); };
    sc.events.on('postupdate', (time, delta) => {
        S.frames++; S.gsec += delta / 1000 * sc.timeScale;
        if (Math.floor(S.gsec) > (S.wear.at(-1)?.t ?? -1)) S.wear.push({ t: Math.floor(S.gsec), p1: +(sc.w1.wear ?? 0).toFixed(1), p2: +(sc.w2.wear ?? 0).toFixed(1) });
        for (const [id, w] of W) {
            // the landing ends: isLanding() false while still down = the earliest legal pin; leaving 'down' first = cut short
            const open = [...S.landings].reverse().find(l => l.who === id && l.endT == null);
            if (open) { if (!w._landing) open.endT = now(); else if (w.state !== 'down' && now() - open.t > 0.05) { open.endT = now(); open.cut = true; } }
            const pts = snap(w);
            if (prevPts[id] && prevSt[id] && prevSt[id] !== w.state && ((prevSt[id] === 'down' && w.state === 'gettingUp') || (prevSt[id] === 'gettingUp' && w.state === 'standing'))) S.pops.push({ t: now(), who: id, edge: `${prevSt[id]}>${w.state}`, step: step(pts, prevPts[id]) });
            prevSt[id] = w.state; prevPts[id] = pts;
            const [st, t] = since[id];
            if (w.state !== st) since[id] = [w.state, now()];
            else if (lim[w.state] && now() - t > lim[w.state] + 3 && !S.stuck.some(s => s.who === id && s.state === w.state && now() - s.t < 5)) S.stuck.push({ t: now(), who: id, state: w.state, for: +(now() - t).toFixed(1) });
        }
    });
    return true;
};

const h = await launch();
const errors = [];
try {
    const page = h.page;
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(2500);
    await page.evaluate(INSTALL);
    const clock = () => page.evaluate(() => window.__fsoak.gsec), start = await clock(), ts = Number(process.env.WFM_TS), wall0 = Date.now();
    for (;;) {
        await page.waitForTimeout(2000);
        if ((await clock()) - start >= SEC || (Date.now() - wall0) / 1000 > SEC / ts * 2 + 60) break;
    }
    const data = await page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0], S = window.__fsoak, ev = sc.matchEvents;
        const count = (f) => ev.filter(f).length;
        return { S, falls: ev.filter(e => e.type === 'fall'), counts: ev.reduce((c, e) => { const k = e.type === 'move' ? `move:${e.move}` : e.type; c[k] = (c[k] ?? 0) + 1; return c; }, {}), matchSec: sc._matchTime, sec: S.gsec, count: count(e => e.type === 'knockdown') };
    });
    mkdirSync(outDir, { recursive: true });
    const gameSec = data.sec - start;
    const out = { pair: PAIR, run: RUN, gameSec: +gameSec.toFixed(1), ts, errors, ...data };
    writeFileSync(join(outDir, `${PAIR}-${RUN}.json`), JSON.stringify(out, null, 1));
    const byMove = {}; for (const s of data.S.strikes) { const m = (byMove[s.move] ??= { landed: 0, belowLine: 0, minStamina: 100 }); m.landed++; if (s.stamina < 35) m.belowLine++; m.minStamina = Math.min(m.minStamina, s.stamina); }
    console.log(`[soak] ${PAIR} run ${RUN}: ${out.gameSec} game s, strikes ${JSON.stringify(byMove)}, falls ${data.falls.length} ${JSON.stringify(data.falls.reduce((c, f) => { c[f.move + ':' + f.fall] = (c[f.move + ':' + f.fall] ?? 0) + 1; return c; }, {}))}, landings ${data.S.landings.length}, downHits ${data.S.downHits.length} ${JSON.stringify(data.S.downHits.reduce((c, d) => { c[d.move + ':' + (d.sell ?? 'jolt') + (d.ok ? '' : ':refused')] = (c[d.move + ':' + (d.sell ?? 'jolt') + (d.ok ? '' : ':refused')] ?? 0) + 1; return c; }, {}))}, getUp pops max ${Math.max(0, ...data.S.pops.map(p => p.step))} over ${data.S.pops.length} edges, stuck ${data.S.stuck.length}, errors ${errors.length}`);
} finally { await h.close(); }
