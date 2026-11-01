// What the AI does with a cornered man (PLAN_GRAPPLES T3c.7): the match runs in real time with both sides on AI (grapples=v1);
// at the start of each trial one man is run into a corner the way the whip does it. Counts what the other AI did.
//   WFM_URL=http://localhost:5173 node tools/debug/corner_ai.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';
const root = 'research/animation/whip-2026-10';
mkdirSync(root, { recursive: true });
const TRIALS = Number(process.env.TRIALS ?? 6);
const results = [];
for (const [pair, p1, p2] of [['lou-ai-vs-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-ai-vs-lou', 'george-roster-v1', 'thesz-procreate-v1']]) {
    process.env.WFM_P1 = p1; process.env.WFM_P2 = p2; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        console.log(pair, await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return [sc.w1.input.constructor.name, sc.w2.input.constructor.name, sc.w1.moveSet.includes('cornerCharge'), sc.w2.moveSet.includes('cornerCharge')]; }));
        for (let t = 0; t < TRIALS; t++) {
            const corner = [['left', 'near'], ['right', 'far'], ['left', 'far'], ['right', 'near']][t % 4];
            await h.page.evaluate(async ({ side, depth }) => {
                const { ringBoundsAtY, RING } = await import('/src/constants.js');
                const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
                for (const w of [a, d]) { sc.tweens.killTweensOf(w); sc.tweens.killTweensOf(w.pose); w.state = 'standing'; w.stamina = 100; w._cornerEp = null; w.runPhase = null; }
                sc.lockupState = null;
                a.input = sc._p1AI; d.input = sc._p2AI;   // the debug launch gives both men the keyboard; hand them to the AIs
                const y = depth === 'near' ? RING.nearLeft.y - 6 : RING.farLeft.y + 6, b = ringBoundsAtY(y);
                const dir = side === 'left' ? -1 : 1;
                d.y = y; d.x = dir < 0 ? b.left + 260 : b.right - 260; d.state = 'running'; d.runPhase = 'toCorner'; d.runFacing = d.facing = dir; d.moveBlend = 0;
                d.runTarget = dir < 0 ? b.left + 20 : b.right - 20; d._setRunLine(dir, y);
                a.y = y - 20; a.x = dir < 0 ? b.right - 260 : b.left + 260; a.facing = -dir;
                window.__trial = { t0: sc.time.now, log: [], moves0: sc.matchEvents.length };
            }, { side: corner[0], depth: corner[1] });
            const log = [];
            for (let k = 0; k < 110; k++) {   // 11 s real time
                await h.page.waitForTimeout(100);
                log.push(await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return { a: sc.w1.state + (sc.w1.runPhase ? ':' + sc.w1.runPhase : ''), d: sc.w2.state, dx: Math.round(Math.abs(sc.w1.x - sc.w2.x)), ds: Math.round(sc.w2.stamina), ai: { stall: +(sc._p1AI._stallTimer).toFixed(2), cd: +(sc._p1AI._cooldown).toFixed(2), off: +(sc._p1AI._offense).toFixed(2), show: !!sc._p1AI._showboat }, ev: sc.matchEvents.slice(window.__trial.moves0).map(e => e.type + (e.move ? ':' + e.move : '')) }; }));
            }
            const first = log.findIndex(r => r.d === 'cornered');
            const win = log.slice(Math.max(0, first), Math.max(0, first) + 22).filter(r => r.a.startsWith('standing'));   // the first 2.2 s of the daze, while the attacker is free to decide
            const gate = first < 0 ? null : { standingSamples: win.length, stalling: win.filter(r => r.ai.stall > 0).length, cooldown: win.filter(r => r.ai.cd > 0).length, offenseCooldown: win.filter(r => r.ai.off > 0).length, showboat: win.filter(r => r.ai.show).length };
            const ev = log.at(-1).ev;
            const charged = ev.filter(e => e === 'move:cornerCharge').length;
            const row = { pair, corner: corner.join('-'), corneredAtMs: first < 0 ? null : first * 100, chargeHits: charged, cornerHitEvents: ev.filter(e => e === 'cornerHit').length, chargeMisses: ev.filter(e => e === 'cornerChargeMiss').length,
                attackerPhases: [...new Set(log.slice(Math.max(0, first)).map(r => r.a))].slice(0, 12), moves: ev.filter(e => e.startsWith('move:') || e.startsWith('stagger') || e.startsWith('knockdown')).slice(0, 8), minDistWhileCornered: Math.min(...log.filter(r => r.d === 'cornered').map(r => r.dx), 9999) };
            row.gate = gate; results.push(row); console.log(JSON.stringify(row));
        }
    } finally { await h.close(); }
}
writeFileSync(`${root}/corner-ai-results.json`, JSON.stringify(results, null, 2));
