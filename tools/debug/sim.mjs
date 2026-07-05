// Balance telemetry: run N AI-vs-AI matches and print per-match stats plus
// totals. The baseline every balance change gets measured against.
//
//   npm run debug:sim -- 5        — simulate 5 matches (default 3)

import { launch } from './harness.mjs';

const N = Number(process.argv[2]) || 3;
const h = await launch();
await h.page.keyboard.press('1'); // P1 → brawler AI (P2 already George AI)
await h.page.waitForTimeout(500);

const results = [];
let startIdx = 0;
let wasOver = false;

let nullStreak = 0;
while (results.length < N) {
    await h.page.waitForTimeout(500);
    let s = null;
    try { s = await h.snap(); } catch { /* page hiccup — treat as a null snap */ }
    if (!s) {
        // Long overnight runs can lose the headless renderer (~6 matches in,
        // observed 2026-07-05). Ride out brief gaps; after ~6s revive the page.
        nullStreak++;
        if (nullStreak >= 12) {
            console.log('scene unavailable for 6s — reloading page');
            try {
                await h.page.reload({ waitUntil: 'load' });
                await h.page.waitForSelector('canvas', { timeout: 15000 });
                await h.page.locator('canvas').click();
                await h.page.keyboard.press('1'); // P1 back to brawler AI
                startIdx = 0; // fresh instance = fresh event log
                wasOver  = false;
            } catch (e) {
                console.log(`reload failed: ${e.message}`);
            }
            nullStreak = 0;
        }
        continue;
    }
    nullStreak = 0;
    if (s.over && !wasOver) {
        const ev = await h.events(startIdx);
        startIdx += ev.length;
        const offense = { p1: 0, p2: 0 };
        let nearfalls = 0, deadAir = 0, lastT = 0, dodges = 0, blocks = 0;
        let winner = 'draw';
        for (const e of ev) {
            if (e.attacker && (e.type === 'move' || e.type === 'knockdown' || e.type === 'stagger')) offense[e.attacker]++;
            if (e.type === 'nearfall') nearfalls++;
            if (e.type === 'dodge') dodges++;
            if (e.type === 'grappleBlock') blocks++;
            if (e.type === 'pinfall' || e.type === 'sleeperKO') winner = e.winner;
            deadAir = Math.max(deadAir, e.t - lastT);
            lastT = e.t;
        }
        const total = offense.p1 + offense.p2 || 1;
        const r = { winner, dur: lastT, share: Math.round(offense.p1 / total * 100), nearfalls, deadAir, dodges, blocks };
        results.push(r);
        console.log(`match ${results.length}: ${r.winner} wins in ${r.dur}s — offense ${r.share}/${100 - r.share}, nearfalls ${r.nearfalls}, dodges ${r.dodges}, blocks ${r.blocks}, longest dead air ${r.deadAir}s`);
    }
    wasOver = s.over;
}

const wins = results.filter(r => r.winner === 'p1').length;
const avg = k => results.length ? Math.round(results.reduce((a, r) => a + r[k], 0) / results.length) : 0;
console.log(`\nTOTALS: p1 ${wins}/${N} wins — avg duration ${avg('dur')}s, avg offense ${avg('share')}/${100 - avg('share')}, avg nearfalls ${avg('nearfalls')}, avg dodges ${avg('dodges')}, avg blocks ${avg('blocks')}, avg worst dead air ${avg('deadAir')}s`);
await h.close();
