// Ring psychology probe — runs N AI-vs-AI matches, recording per-match:
// event log, heat trace, position trace, state occupancy, out-of-bounds
// incidents. Writes JSON for analysis.
//
// Env: MATCHES=2 OUT=path WFM_TS=3 WFM_URL=... WFM_P1/WFM_P2, SHOTS=dir

import { launch } from './harness.mjs';
import { writeFileSync } from 'node:fs';

const N = Number(process.env.MATCHES) || 2;
const OUT = process.env.OUT || '/tmp/psych.json';
const SHOTS = process.env.SHOTS || '';

const h = await launch();
const page = h.page;
await page.waitForTimeout(600);
// Both default to keyboard now (Derek, 2026-07-12) — toggle both AI on.
await page.keyboard.press('1'); // P1 -> AI
await page.keyboard.press('2'); // P2 -> AI
await page.waitForTimeout(300);

// Page-side recorder on postupdate: throttled traces + OOB watch.
await page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    window.__REC = { heat: [], pos: [], oob: [], occ: {}, lastHeatT: -1, lastPosT: -1, frames: 0 };
    const AIR = new Set(['climbing', 'onTurnbuckle', 'diving', 'dropkicking', 'elbowDropping', 'grabbed', 'slamming', 'taunting']);
    const RING = { nearY: 445, farY: 258, nearL: 40, nearR: 920, farL: 210, farR: 750 };
    const boundsAt = (y) => {
        const t = (RING.nearY - y) / (RING.nearY - RING.farY);
        return { left: RING.nearL + (RING.farL - RING.nearL) * t, right: RING.nearR + (RING.farR - RING.nearR) * t };
    };
    sc.events.on('postupdate', () => {
        const R = window.__REC;
        const t = sc._matchTime;
        R.frames++;
        // Self-heal a match-boundary race: the "matchOver" handler below resets
        // R.last{Heat,Pos}T to -1 the instant matchOver flips true, but
        // sc._matchTime is still frozen at the OLD match's final (high) value
        // during the win-banner phase — that reset fires while t is still e.g.
        // 600, so the very next tick logs one bogus sample at t=600 and pins
        // last{Heat,Pos}T there. Once the *new* match actually starts and
        // _matchTime resets to ~0, `t - lastHeatT` is deeply negative and never
        // clears the >=1/>=0.5 threshold again — every trace after match 1 was
        // silently frozen at a single stale sample. Detect the rewind (new
        // match's t drops below the last recorded time) and re-baseline.
        if (t < R.lastHeatT) R.lastHeatT = -1;
        if (t < R.lastPosT) R.lastPosT = -1;
        if (t - R.lastHeatT >= 1) { R.heat.push([Math.round(t), Math.round(sc.heat), Math.round(sc.heatFloor)]); R.lastHeatT = t; }
        if (t - R.lastPosT >= 0.5) {
            R.pos.push([Math.round(t * 10) / 10,
                Math.round(sc.w1.x), Math.round(sc.w1.y), sc.w1.state, Math.round(sc.w1.stamina),
                Math.round(sc.w2.x), Math.round(sc.w2.y), sc.w2.state, Math.round(sc.w2.stamina)]);
            R.lastPosT = t;
        }
        for (const [name, w] of [['p1', sc.w1], ['p2', sc.w2]]) {
            R.occ[name] = R.occ[name] || {};
            R.occ[name][w.state] = (R.occ[name][w.state] || 0) + 1;
            if (!AIR.has(w.state)) {
                const b = boundsAt(w.y);
                if (w.y > 431 || w.y < 272 || w.x < b.left + 12 || w.x > b.right - 12) {
                    if (R.oob.length < 200) R.oob.push({ t: Math.round(t * 10) / 10, who: name, x: Math.round(w.x), y: Math.round(w.y), st: w.state });
                }
            }
        }
    });
    // hook match end to snapshot per-match data
    window.__MATCHES = [];
    let wasOver = false;
    sc.events.on('postupdate', () => {
        if (sc.matchOver && !wasOver) {
            const R = window.__REC;
            window.__MATCHES.push({
                events: sc.matchEvents.slice(window.__EVCUT || 0),
                heat: R.heat, pos: R.pos, oob: R.oob, occ: R.occ, frames: R.frames,
            });
            window.__EVCUT = sc.matchEvents.length;
            window.__REC = { heat: [], pos: [], oob: [], occ: {}, lastHeatT: -1, lastPosT: -1, frames: 0 };
        }
        wasOver = sc.matchOver;
    });
});

let done = 0;
let lastShot = -999;
while (done < N) {
    await page.waitForTimeout(1000);
    let count = 0, t = 0;
    try {
        const r = await page.evaluate(() => ({
            n: window.__MATCHES.length,
            t: window.__WFM_GAME.scene.scenes[0]._matchTime,
            over: window.__WFM_GAME.scene.scenes[0].matchOver,
        }));
        count = r.n; t = r.t;
        if (SHOTS && !r.over && t - lastShot >= 75) {
            await h.screenshot(`${SHOTS}/m${count}_t${Math.round(t)}.png`);
            lastShot = t;
        }
    } catch { continue; }
    if (count > done) {
        done = count;
        lastShot = -999;
        console.log(`match ${done}/${N} complete (game clock ~${Math.round(t)}s)`);
    }
}

const matches = await page.evaluate(() => window.__MATCHES);
writeFileSync(OUT, JSON.stringify(matches));
console.log(`wrote ${OUT}`);
await h.close();
