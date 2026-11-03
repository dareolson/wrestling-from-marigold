// PLAN_GRAPPLES T5.2: the live soak. Real time, both sides on the real AI, nothing placed by hand (except --interrupts and --keyboard,
// which name what they place). A monitor in the page checks every frame; this file starts it, polls it and writes JSON (no frames).
//
//   WFM_URL=http://127.0.0.1:5173 PAIR=lou-george GAIT=v2 GRAPPLES=v1 MAX_MIN=20 node tools/debug/grapples_soak.mjs
//   ... node tools/debug/grapples_soak.mjs --interrupts      forced hits in the reaction, fall, get-up; a pin in the sell
//   ... node tools/debug/grapples_soak.mjs --keyboard        the chain through the input object, both directions
// Env: PAIR (lou-george, george-lou, kow-guido, guido-kow, lou-guido, george-kow), GAIT (default|v2), GRAPPLES (v1|off),
//      MAX_MIN (wall minutes cap, 20), MIN_CHAINS (3), MIN_MATCHES (2), OUT (json path).
//      WAISTLOCK=v1 (PLAN_GRAPPLES T4b.4): adds ?waistlock=v1, counts go-behinds, switches and each ending, fails a waistlock alive past 6 s or a facing
//      lock left on after it; the run then ends at MIN_WL (8) go-behinds or MAX_MIN, not at chains. WFM_TS=3 runs the game at 3x.
// Fails: page error; non-finite x, y or pose; facing 0; orphanRescue; a state past its limit (grabbed 1 s, cornered 4 s, running 6 s);
// a leftover _cornerEp, _charge, _whip or _returnVia after 0.5 s standing or down; x or y outside the ring beyond the fall swing.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1', kow: 'kowalski-roster-v1', guido: 'guido-roster-v1' };
const argv = process.argv.slice(2);
const MODE = argv.includes('--interrupts') ? 'interrupts' : argv.includes('--keyboard') ? 'keyboard' : 'soak';
const PAIR = process.env.PAIR ?? 'lou-george';
const GAIT = process.env.GAIT ?? 'default';
const GRAPPLES = process.env.GRAPPLES ?? 'v1';
const WAISTLOCK = process.env.WAISTLOCK === 'v1';
const MIN_WL = Number(process.env.MIN_WL ?? 8);
const MAX_MIN = Number(process.env.MAX_MIN ?? 20);
const MIN_CHAINS = Number(process.env.MIN_CHAINS ?? 3);
const MIN_MATCHES = Number(process.env.MIN_MATCHES ?? 2);
const [a, b] = PAIR.split('-');
process.env.WFM_P1 = RIGS[a]; process.env.WFM_P2 = RIGS[b];
process.env.WFM_QS = ['notitle=1', `grapples=${GRAPPLES}`, GAIT === 'v2' ? 'gait=v2' : '', WAISTLOCK ? 'waistlock=v1' : ''].filter(Boolean).join('&');
const OUT = process.env.OUT ?? `research/animation/grapples-soak-2026-10/${MODE}-${PAIR}-${GAIT}-${GRAPPLES}${WAISTLOCK ? '-waistlock' : ''}.json`;

// ── The page side ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Installed once. window.__soak holds everything; polled from Node as plain JSON.
function installMonitor() {
    return window.__WFM_GAME && (async () => {
        const { ringBoundsAtY, RING } = await import('/src/constants.js');
        const sc = window.__WFM_GAME.scene.scenes[0];
        const S = window.__soak = {
            t0: sc.time.now, frames: 0, failures: [], chains: [], whips: [], flatWhips: 0, cornerWhips: 0, ropesWhips: 0, moves: {}, lockups: 0, matches: [],
            charge: { gut: 0, head: 0, miss: 0 }, maxStateSec: {}, maxExcess: { x: 0, yFar: 0, yNear: 0 }, gameSec: 0, events: 0, idx: 0,
            fallLog: [], wl: { starts: 0, switches: 0, denied: 0, ends: {} }, wlSince: null, lockSince: {}, interrupt: null, interruptLog: [], lockGap: { p1: [], p2: [] },
        };
        const LIMIT = { grabbed: 1, cornered: 4, running: 6 };
        const W = () => [['p1', sc.w1], ['p2', sc.w2]];
        const other = (id) => (id === 'p1' ? 'p2' : 'p1');
        const wOf = (id) => (id === 'p1' ? sc.w1 : sc.w2);
        const fail = (kind, who, detail) => {
            if (S.failures.length < 60 && !S.failures.some(f => f.kind === kind && f.who === who && sc.time.now - f.at < 3000)) {
                S.failures.push({ kind, who, detail, at: Math.round(sc.time.now - S.t0), matchSec: +sc._matchTime.toFixed(1) });
            }
        };
        const track = { p1: { state: null, since: 0, clean: 0 }, p2: { state: null, since: 0, clean: 0 } };
        const active = {};   // receiver id → open chain
        let lastOver = false, lastLock = false, lastMatchTime = 0;
        const finish = (c, how) => { if (!c.end) { c.end = how; c.endAt = +(sc.time.now - c.at0).toFixed(0); if (active[c.rec] === c) delete active[c.rec]; } };

        sc.events.on('postupdate', () => {
            S.frames++;
            const now = sc.time.now;
            // match clock, lockups, match end
            if (!sc.matchOver) S.gameSec += Math.max(0, sc._matchTime - lastMatchTime);
            lastMatchTime = sc._matchTime;
            if (!!sc.lockupState && !lastLock) S.lockups++;
            lastLock = !!sc.lockupState;
            {   // the held tie-up gap, per attacker (the lockup's own clock past its engage)
                const ls = sc.lockupState, g = ls?.grapple;
                if (g && g.t > 0.6) { const id = ls.attacker === sc.w1 ? 'p1' : 'p2', L = S.lockGap[id]; if (L.length < 4000) L.push(+Math.abs(ls.attacker.x - ls.defender.x).toFixed(1)); }
            }
            if (sc.matchOver && !lastOver) {
                const end = [...sc.matchEvents].reverse().find(e => ['pinfall', 'sleeperKO', 'timeLimitDraw'].includes(e.type));
                S.matches.push({ len: +sc._matchTime.toFixed(1), how: end?.type ?? '?', winner: end?.winner ?? null });
            }
            lastOver = sc.matchOver;

            // events since the last frame
            for (; S.idx < sc.matchEvents.length; S.idx++) {
                const e = sc.matchEvents[S.idx];
                S.events++;
                if (e.move) { const k = `${e.type}:${e.move}`; S.moves[k] = (S.moves[k] ?? 0) + 1; }
                if (e.type === 'orphanRescue') fail('orphanRescue', e.wrestler, e.from);
                if (e.type === 'waistlockStart') S.wl.starts++;
                if (e.type === 'waistlockSwitch') S.wl.switches++;
                if (e.type === 'waistlockDenied') S.wl.denied++;
                if (e.type === 'waistlockEnd') S.wl.ends[e.kind] = (S.wl.ends[e.kind] ?? 0) + 1;
                if (e.type === 'whipRelease') {
                    const rec = W().find(([, w]) => w.state === 'running' && w.runPhase !== 'returning' && w._whip === null)?.[0] ?? null;
                    const rw = rec && wOf(rec), bnd = rw && ringBoundsAtY(rw.y);
                    const ropes = rw && (rw.x <= bnd.left + 34 * rw.s || rw.x >= bnd.right - 34 * rw.s);
                    if (e.depth) {
                        S.cornerWhips++;
                        if (rec) {
                            if (active[rec]) finish(active[rec], 'superseded');
                            const c = { rec, whipper: other(rec), at0: now, depth: e.depth, dir: e.direction, stages: { whip: true }, after: [] };
                            S.chains.push(c); active[rec] = c;
                        }
                    } else { S.flatWhips++; if (ropes) S.ropesWhips++; }
                }
                if (e.type === 'cornerHit' && e.hand && !active[e.wrestler]) {   // --interrupts: the run into the corner was placed by hand, the chain opens here
                    const c = { rec: e.wrestler, whipper: other(e.wrestler), at0: now, depth: 0, dir: 0, stages: { whip: true }, after: [], hand: true }; S.chains.push(c); active[e.wrestler] = c;
                }
                if (e.type === 'cornerHit') { const c = active[e.wrestler]; if (c && !c.stages.corner) { c.stages.corner = true; c.cornerAt = Math.round(now - c.at0); } }
                if (e.type === 'move' && e.move === 'cornerCharge') {
                    S.charge[e.part === 'gut' ? 'gut' : 'head']++;
                    const c = active[other(e.attacker)]; if (c) { c.stages.charge = true; c.part = e.part; c.chargeAt = Math.round(now - c.at0); }
                }
                if (e.type === 'cornerChargeMiss') { S.charge.miss++; const c = active[other(e.wrestler)]; if (c) c.missed = (c.missed ?? 0) + 1; }
                for (const c of Object.values(active)) if (c.stages.charge && !(e.type === 'move' && e.move === 'cornerCharge') && c.after.length < 10 && !['cornerHit', 'cornerLeave', 'whipRelease'].includes(e.type)) c.after.push(e.type + (e.move ? ':' + e.move : ''));
                if (e.type === 'pinAttempt') { const c = active[other(e.attacker)]; if (c && c.stages.down && !c.resolved) { c.resolved = 'pin'; finish(c, c.stages.sell ? 'complete' : 'noSell'); } }
            }
            // chain stages that come from states
            for (const c of Object.values(active)) {
                const w = wOf(c.rec);
                if (c.stages.charge && !c.stages.react && (w.state === 'selling')) { c.stages.react = true; }   // the 150 ms hit reaction
                if (c.stages.down && w._sell?.plan?.length) {   // the sell on the mat: the plan the down body is running
                    const p0 = w._sell.plan[0];
                    c.stages.sell = true;
                    if (p0.forced) { c.forcedSeen = true; c.forcedPlan = `${p0.name}:${p0.part}:${p0.duration?.toFixed?.(2)}`; c.forcedMaxT = +Math.max(c.forcedMaxT ?? 0, w._sell.t ?? 0).toFixed(2); }
                    else { c.otherPlan = w._sell.plan.map(e => `${e.name}:${e.part}:${e.duration?.toFixed?.(2)}`); }   // a later hit's own sell (a new _pain loses forceClutch)
                }
                if (c.stages.charge && !c.stages.down && w.state === 'down') {
                    c.stages.down = true; c.downAt = Math.round(now - c.at0);
                    c.fall = { facing: w.facing, lying: w.lying, variant: w._fallVariant, x: Math.round(w.x), y: Math.round(w.y) };
                }
                if (c.stages.down && !c.resolved && w.state === 'standing') { c.resolved = 'recovery'; finish(c, c.stages.sell ? 'complete' : 'noSell'); }
                if (now - c.at0 > 45000) finish(c, 'expired');
            }

            // the waistlock: alive no longer than a hold can last (circle + hold + let-go, over several switches: 6 s without a new switch), and no facing lock left behind
            {
                const ws = sc.waistlockState;
                if (ws) { if (S.wlSince?.ws !== ws) S.wlSince = { ws, at: now }; else if (now - S.wlSince.at > 6000 && !sc.matchOver) fail('waistlockStuck', 'both', `${ws.phase} t ${ws.t.toFixed(2)}`); }
                for (const [id, w] of W()) {
                    const stale = w._facingLock === true && !ws;
                    S.lockSince[id] = stale ? (S.lockSince[id] ?? now) : null;
                    if (S.lockSince[id] && now - S.lockSince[id] > 500) fail('facingLock', id, 'left on after the waistlock');
                }
            }

            // per wrestler checks
            for (const [id, w] of W()) {
                const T = track[id];
                if (w.state !== T.state) { T.state = w.state; T.since = now; }
                const dwell = (now - T.since) / 1000;
                S.maxStateSec[w.state] = Math.max(S.maxStateSec[w.state] ?? 0, +dwell.toFixed(2));
                if (LIMIT[w.state] && dwell > LIMIT[w.state] && !sc.matchOver) fail('stateLimit', id, `${w.state} ${dwell.toFixed(2)}s`);
                if (![w.x, w.y].every(Number.isFinite)) fail('nonFinite', id, `x ${w.x} y ${w.y}`);
                for (const [k, v] of Object.entries(w.pose ?? {})) if (typeof v === 'number' && !Number.isFinite(v)) { fail('nonFinitePose', id, k); break; }
                if (!w.facing || !Number.isFinite(w.facing)) fail('facing', id, String(w.facing));
                const bnd = ringBoundsAtY(Math.min(RING.nearLeft.y, Math.max(RING.farLeft.y, w.y)));
                S.maxExcess.x = Math.max(S.maxExcess.x, +Math.max(bnd.left - w.x, w.x - bnd.right, 0).toFixed(1));
                S.maxExcess.yFar = Math.max(S.maxExcess.yFar, +(RING.farLeft.y - w.y).toFixed(1));
                S.maxExcess.yNear = Math.max(S.maxExcess.yNear, +(w.y - RING.nearLeft.y).toFixed(1));
                if (Math.max(bnd.left - w.x, w.x - bnd.right) > 100) fail('outX', id, `x ${w.x.toFixed(0)} bounds ${bnd.left.toFixed(0)}..${bnd.right.toFixed(0)} state ${w.state}`);
                if (w.y < RING.farLeft.y - 40 || w.y > RING.nearLeft.y + 40) fail('outY', id, `y ${w.y.toFixed(0)} state ${w.state}`);
                const rest = w.state === 'standing' || w.state === 'down';
                const left = rest && (w._cornerEp || w._charge || w._whip || w._returnVia);
                T.clean = left ? T.clean + (now - (T.last ?? now)) : 0; T.last = now;
                if (T.clean > 500) fail('leftover', id, `${w.state}: ${['_cornerEp', '_charge', '_whip', '_returnVia'].filter(k => w[k]).join(',')}`);
            }

            // forced interruptions (--interrupts only)
            const I = S.interrupt;
            if (I && !I.fired) {
                for (const c of Object.values(active)) {
                    const rec = wOf(c.rec), atk = wOf(c.whipper);
                    const hit = { reaction: rec.state === 'selling' && !!rec._cornerKnock, fall: rec.state === 'falling' && !!rec._cornerFallTok,
                        getup: rec.state === 'gettingUp' && c.stages.down, pinSell: rec.state === 'selling' && !!rec._cornerKnock, pinDown: rec.state === 'down' && c.stages.down }[I.kind];
                    if (!hit) continue;
                    I.fired = true; I.at = now; I.chain = c; I.before = { rec: rec.state, atk: atk.state, recX: Math.round(rec.x), recY: Math.round(rec.y) };
                    if (I.kind.startsWith('pin')) { if (atk.state === 'slamming' || atk.state === 'running') atk.state = 'standing'; sc.startPin(atk, rec); }
                    else { if (atk.state !== 'standing') atk.state = 'standing'; atk._doJab(rec); }
                    break;
                }
            }
        });
        return true;
    })();
}

const snapshot = (page) => page.evaluate(() => {
    const S = window.__soak, sc = window.__WFM_GAME.scene.scenes[0];
    const complete = S.chains.filter(c => c.end === 'complete');
    return { frames: S.frames, wallSec: Math.round((sc.time.now - S.t0) / 1000), gameSec: Math.round(S.gameSec), matchTime: sc._matchTime, over: sc.matchOver, matches: S.matches, failures: S.failures,
        chains: S.chains.length, complete: complete.length, cornerWhips: S.cornerWhips, flatWhips: S.flatWhips, ropesWhips: S.ropesWhips, lockups: S.lockups, charge: S.charge, wl: S.wl,
        p1: sc.w1.state, p2: sc.w2.state };
});

const handToAIs = (page) => page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const n of [1, 2]) if (sc[`w${n}`].input !== sc[`_p${n}AI`]) sc._togglePlayer(n);
    return [sc.w1.input.constructor.name, sc.w2.input.constructor.name, sc.w1.moveSet.includes('cornerCharge'), sc.w2.moveSet.includes('cornerCharge')];
});

const pageErrors = [];
async function open() {
    const h = await launch();
    h.page.on('pageerror', e => pageErrors.push(e.message));
    h.page.on('crash', () => { pageErrors.push('PAGE CRASH'); console.log('[PAGE CRASH]'); });
    h.page.on('close', () => console.log('[PAGE CLOSED]', new Date().toISOString()));
    h.page.on('console', m => { if (m.type() === 'error') pageErrors.push(`console: ${m.text()}`); });
    await h.page.waitForTimeout(2500);
    return h;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const save = (obj) => { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(obj, null, 2)); };

// ── soak ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function soak() {
    const h = await open();
    const inputs = await handToAIs(h.page);
    await h.page.evaluate(installMonitor);
    console.log(PAIR, GAIT, GRAPPLES, 'inputs', JSON.stringify(inputs));
    const start = Date.now();
    let last = null, stuckSince = Date.now(), lastMt = -1, lost = null, lastPoll = Date.now(), maxPollGap = 0;
    for (;;) {
        await sleep(2000);
        const s = await snapshot(h.page); last = s;
        maxPollGap = Math.max(maxPollGap, (Date.now() - lastPoll) / 1000); lastPoll = Date.now();   // a page that stops answering shows here
        if (s.matchTime !== lastMt || s.over) { lastMt = s.matchTime; stuckSince = Date.now(); }
        if (Date.now() - stuckSince > 15000) { lost = `match clock frozen at ${s.matchTime} for 15 s (${s.p1}/${s.p2})`; break; }
        const el = (Date.now() - start) / 60000;
        if (Math.round(el * 30) % 30 === 0) console.log(`${PAIR} ${GAIT} ${GRAPPLES} ${el.toFixed(1)}min chains ${s.complete}/${s.chains} matches ${s.matches.length} failures ${s.failures.length} gameSec ${s.gameSec}`);
        const enough = WAISTLOCK ? s.wl.starts >= MIN_WL : GRAPPLES === 'off' ? s.matches.length >= MIN_MATCHES + 1 : s.complete >= MIN_CHAINS && s.matches.length >= MIN_MATCHES;
        if (enough || el >= MAX_MIN) break;
    }
    const S = await h.page.evaluate(() => { const s = window.__soak; return { lockGap: Object.fromEntries(Object.entries(s.lockGap).map(([k, v]) => [k, v.length ? { n: v.length, min: Math.min(...v), mean: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1), max: Math.max(...v) } : null])), chains: s.chains, moves: s.moves, maxStateSec: s.maxStateSec, maxExcess: s.maxExcess, events: s.events, frames: s.frames }; });
    const finalSnap = await snapshot(h.page);
    await h.close();
    const matchLens = finalSnap.matches.map(m => m.len);
    const out = {
        mode: MODE, pair: PAIR, gait: GAIT, grapples: GRAPPLES, wallMin: +((Date.now() - start) / 60000).toFixed(1), gameMin: +(finalSnap.gameSec / 60).toFixed(2),
        fps: +(S.frames / Math.max(1, finalSnap.wallSec)).toFixed(1), maxPollGapSec: +maxPollGap.toFixed(1), pageSec: finalSnap.wallSec, chainsStarted: S.chains.length, chainsComplete: finalSnap.complete,
        chainByEnd: S.chains.reduce((m, c) => (m[c.end ?? 'open'] = (m[c.end ?? 'open'] ?? 0) + 1, m), {}), chainFarthestStage: S.chains.map(c => Object.keys(c.stages).join('>')),
        cornerWhips: finalSnap.cornerWhips, flatWhips: finalSnap.flatWhips, ropesEscapeWhips: finalSnap.ropesWhips,
        cornerWhipRate: finalSnap.cornerWhips + finalSnap.flatWhips ? +(finalSnap.cornerWhips / (finalSnap.cornerWhips + finalSnap.flatWhips)).toFixed(3) : null,
        cornerWhipRateOpenRing: finalSnap.cornerWhips + finalSnap.flatWhips - finalSnap.ropesWhips ? +(finalSnap.cornerWhips / (finalSnap.cornerWhips + finalSnap.flatWhips - finalSnap.ropesWhips)).toFixed(3) : null,
        charge: finalSnap.charge, waistlock: WAISTLOCK ? finalSnap.wl : undefined, lockGapPx: S.lockGap, lockups: finalSnap.lockups, lockupsPerGameMin: finalSnap.gameSec ? +(finalSnap.lockups / (finalSnap.gameSec / 60)).toFixed(2) : null,
        matches: finalSnap.matches, meanMatchLen: matchLens.length ? +(matchLens.reduce((x, y) => x + y, 0) / matchLens.length).toFixed(1) : null,
        moves: S.moves, maxStateSec: S.maxStateSec, maxExcess: S.maxExcess, failures: finalSnap.failures, pageErrors, lostFlow: lost, chains: S.chains,
    };
    save(out);
    console.log(JSON.stringify({ ...out, chains: undefined, chainFarthestStage: undefined, moves: undefined }, null, 1));
    return out;
}

// ── interrupted cases ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// The only hand placement in the file: a man is run into a corner the way the whip does it (as tools/debug/corner_ai.mjs does), the
// AI does the rest; when the receiver reaches the named state, one hit (the real jab) or a pin is forced on him.
async function interrupts() {
    const h = await open();
    await handToAIs(h.page);
    await h.page.evaluate(installMonitor);
    const results = [];
    const kinds = ['reaction', 'fall', 'getup', 'pinSell', 'pinDown'];
    const corners = [['left', 'near'], ['right', 'far'], ['left', 'far'], ['right', 'near']];
    const TRIALS = Number(process.env.TRIALS ?? 4);
    for (const kind of kinds) for (let t = 0; t < TRIALS; t++) {
        const [side, depth] = corners[t % 4];
        for (let attempt = 0; attempt < 4; attempt++) {
            await h.page.evaluate(async ({ side, depth, kind }) => {
                const { ringBoundsAtY, RING } = await import('/src/constants.js');
                const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, D = sc.w2;
                for (const w of [A, D]) { sc.tweens.killTweensOf(w); sc.tweens.killTweensOf(w.pose); w.state = 'standing'; w.stamina = 100; w._cornerEp = null; w._charge = null; w._whip = null; w._returnVia = null; w.runPhase = null; }
                sc.lockupState = null; sc.pinState = null; sc.matchOver = false;
                const y = depth === 'near' ? RING.nearLeft.y - 6 : RING.farLeft.y + 6, bnd = ringBoundsAtY(y), dir = side === 'left' ? -1 : 1;
                D.y = y; D.x = dir < 0 ? bnd.left + 260 : bnd.right - 260; D.state = 'running'; D.runPhase = 'toCorner'; D.runFacing = D.facing = dir; D.moveBlend = 0;
                D.runTarget = dir < 0 ? bnd.left + 20 : bnd.right - 20; D._setRunLine(dir, y);
                A.y = y - 20; A.x = dir < 0 ? bnd.right - 260 : bnd.left + 260; A.facing = -dir;
                const S = window.__soak;
                S.interrupt = { kind, fired: false };
            }, { side, depth, kind });
            // the monitor's chain map is private: a cornerHit event marked `hand` opens the chain for the man placed above
            await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc._logEvent('cornerHit', { wrestler: 'p2', side: 'near', dir: 0, hand: true }); });
            const trace = [];
            const t0 = Date.now();
            let fired = false;
            while (Date.now() - t0 < 24000) {
                await sleep(100);
                const r = await h.page.evaluate(async () => {
                    const { ringBoundsAtY } = await import('/src/constants.js');
                    const sc = window.__WFM_GAME.scene.scenes[0], S = window.__soak, I = S.interrupt;
                    return { a: sc.w1.state, d: sc.w2.state, fired: I.fired, over: sc.matchOver, ev: sc.matchEvents.length, f: S.failures.length, dx: Math.round(sc.w2.x), dy: Math.round(sc.w2.y), ex: Math.round(Math.max(ringBoundsAtY(sc.w2.y).left - sc.w2.x, sc.w2.x - ringBoundsAtY(sc.w2.y).right, 0)) };
                });
                trace.push(r);
                if (r.fired && !fired) { fired = true; }
                if (fired && trace.length > 0) {
                    const sinceFire = trace.length - trace.findIndex(x => x.fired);
                    if (sinceFire >= 120 || r.over) break;   // 12 s after the force, or the match ended
                }
            }
            if (!fired) { continue; }   // the AI never charged this time; place him again
            const after = await h.page.evaluate(() => {
                const sc = window.__WFM_GAME.scene.scenes[0], S = window.__soak;
                return { before: S.interrupt.before, kind: S.interrupt.kind, aState: sc.w1.state, dState: sc.w2.state, pinState: !!sc.pinState, over: sc.matchOver,
                    leftover: ['_cornerEp', '_charge', '_whip', '_returnVia', '_cornerKnock'].filter(k => sc.w1[k] || sc.w2[k]),   // _cornerFallTok is an inert tween token a normal fall leaves too
                    events: sc.matchEvents.slice(-12).map(e => e.type + (e.move ? ':' + e.move : '')), failures: S.failures.length };
            });
            const fi = trace.findIndex(x => x.fired), post = trace.slice(fi);
            const seq = (k) => post.map(x => x[k]).filter((v, i, arr) => i === 0 || v !== arr[i - 1]);
            const failsAfter = post.at(-1).f - (trace[Math.max(0, fi - 1)].f);
            // ok: nothing flagged by the monitor during the 12 s, no leftover episode fields once he is at rest, and he got back to standing
            const rest = ['standing', 'down'].includes(after.dState);
            results.push({ kind, side, depth, before: after.before, recvAfterFire: seq('d').slice(0, 14), atkAfterFire: seq('a').slice(0, 10), endRecv: after.dState, endAtk: after.aState, leftover: after.leftover, maxRingExcessAfter: Math.max(...post.map(x => x.ex)), failuresDuring: failsAfter,
                reachedStanding: seq('d').includes('standing'), pinState: after.pinState, matchOver: after.over, ok: failsAfter === 0 && (!after.leftover.length || !rest) && seq('d').includes('standing') || (failsAfter === 0 && after.over) });
            console.log(JSON.stringify(results.at(-1)));
            break;
        }
    }
    const snap = await snapshot(h.page);
    await h.close();
    const out = { mode: MODE, pair: PAIR, gait: GAIT, grapples: GRAPPLES, results, failures: snap.failures, pageErrors, byKind: Object.fromEntries(kinds.map(k => [k, { fired: results.filter(r => r.kind === k).length, ok: results.filter(r => r.kind === k && r.ok).length }])) };
    save(out);
    console.log(JSON.stringify(out.byKind), 'failures', snap.failures.length, 'pageErrors', pageErrors.length);
}

// ── keyboard ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// P1 is driven through an input object (isDown / justDown, as InputHandler); P2 is given an idle one. Walks, grapples, whips to a corner,
// runs the charge: both directions (P1 left of P2, then right), far and near corner, high and low charge.
async function keyboard() {
    const h = await open();
    await h.page.evaluate(installMonitor);
    await h.page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const mk = () => { const o = { down: {}, just: {}, isDown: (k) => !!o.down[k], justDown: (k) => { const v = !!o.just[k]; o.just[k] = false; return v; }, clear() { o.down = {}; o.just = {}; }, tap(k) { o.just[k] = true; o.down[k] = true; } }; return o; };
        window.__kb1 = mk(); window.__kb2 = mk();
        sc.w1.input = window.__kb1; sc.w2.input = window.__kb2;
        // the arena's own keyboard handlers stay where they were; only the wrestlers' input objects are replaced
    });
    const results = [];
    const cases = [['right', 'up', false], ['left', 'up', true], ['right', 'down', true], ['left', 'down', false]];   // [P1 side of P2 → whip direction, corner, low charge]
    for (const [dirName, corner, low] of cases) {
        const dir = dirName === 'right' ? 1 : -1;
        const log = [];
        // P1 stands left of P2 for dir +1 (whips him to the right), right of P2 for dir -1. A real walk from the start spots, nothing teleported
        // beyond the reset to those spots between cases.
        await h.page.evaluate(async ({ dir }) => {
            const { ringBoundsAtY } = await import('/src/constants.js');
            const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, D = sc.w2;
            for (const w of [A, D]) { sc.tweens.killTweensOf(w); sc.tweens.killTweensOf(w.pose); w.state = 'standing'; w.stamina = 100; w.runPhase = null; w._cornerEp = null; w._charge = null; w._whip = null; w._returnVia = null; }
            sc.lockupState = null; sc.pinState = null; sc.matchOver = false; sc.heat = 30;
            const y = 360; A.y = D.y = y; A.x = dir > 0 ? 330 : 630; D.x = dir > 0 ? 630 : 330; A.facing = dir; D.facing = -dir;
            window.__kb1.clear(); window.__kb2.clear(); window.__soak.interrupt = null;
        }, { dir });
        const t0 = Date.now();
        let phase = 'walk', lastEv = 0, flow = [], whipped = false;
        const pressAt = {};
        while (Date.now() - t0 < 40000) {
            await sleep(60);
            const r = await h.page.evaluate(({ phase, dir, corner, low }) => {
                const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, D = sc.w2, k = window.__kb1;
                const gap = Math.abs(D.x - A.x);
                k.clear();
                let note = '';
                if (phase === 'walk') { if (gap > 88) k.down[dir > 0 ? 'right' : 'left'] = true; else { k.tap('action'); note = 'grapple'; } }
                else if (phase === 'lockup') { k.down[dir > 0 ? 'right' : 'left'] = true; k.down[corner] = true; k.tap('action'); note = 'whip'; }
                else if (phase === 'charge') { if (low) k.down.down = true; k.tap('run'); note = 'run'; }
                return { phase, note, a: A.state, d: D.state, lock: !!sc.lockupState, ax: Math.round(A.x), dx: Math.round(D.x), ev: sc.matchEvents.length, aRun: A.runPhase };
            }, { phase, dir, corner, low });
            flow.push(`${r.phase}:${r.a}/${r.d}`); if (process.env.KBDEBUG && flow.length % 10 === 1) console.log(JSON.stringify(r));
            if (phase === 'walk' && r.lock) phase = 'lockup';
            else if (phase === 'lockup' && !r.lock && (r.d === 'grabbed' || r.d === 'running')) { phase = 'wait-corner'; whipped = true; }
            else if (phase === 'wait-corner' && r.d === 'cornered') { phase = 'charge'; }
            else if (phase === 'charge' && r.aRun === 'charge') { phase = 'after'; pressAt.charge = Date.now() - t0; }
            else if (phase === 'after' && (r.d === 'down' || r.d === 'standing') && Date.now() - t0 > (pressAt.charge ?? 0) + 3000) { if (r.d === 'down' || r.d === 'standing') { phase = 'done'; } }
            if (phase === 'done') break;
            // a lockup that timed out while walking in: start over from the grapple
            if (phase === 'lockup' && !r.lock && r.d === 'standing') phase = 'walk';
        }
        await sleep(6000);
        const res = await h.page.evaluate(() => {
            const sc = window.__WFM_GAME.scene.scenes[0], S = window.__soak;
            return { events: sc.matchEvents.map(e => e.type + (e.move ? ':' + e.move : '') + (e.part ? ':' + e.part : '') + (e.depth ? ':d' + e.depth : '')).slice(-14), chain: S.chains.at(-1) ?? null, aState: sc.w1.state, dState: sc.w2.state, failures: S.failures.length };
        });
        results.push({ dirName, corner, low, finishedPhase: phase, whipped, ...res });
        console.log(JSON.stringify({ dirName, corner, low, finishedPhase: phase, ...res, chain: res.chain && { stages: Object.keys(res.chain.stages), part: res.chain.part, end: res.chain.end, fall: res.chain.fall } }));
    }
    const snap = await snapshot(h.page);
    await h.close();
    save({ mode: MODE, pair: PAIR, gait: GAIT, grapples: GRAPPLES, results, failures: snap.failures, pageErrors });
    console.log('keyboard failures', snap.failures.length, 'pageErrors', pageErrors.length);
}

if (MODE === 'soak') await soak(); else if (MODE === 'interrupts') await interrupts(); else await keyboard();
