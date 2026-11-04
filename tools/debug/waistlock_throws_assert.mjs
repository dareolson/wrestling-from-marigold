// PLAN_GRAPPLES T4c.2-T4c.3: the atomic drop and the snapmare reversal out of the waistlock, asserted on both rigs and both facings with the stepped
// film of waistlock_throws.mjs: the drop lands once and both men stand; a press inside the lift reverses it into a flip that lands the attacker on his
// back in front of the thrower; a late press is ignored; a landing past the ropes is denied and the drop completes. Fails nonzero.
//   WFM_URL=http://localhost:5173 node tools/debug/waistlock_throws_assert.mjs
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film, DROP_AT } from './waistlock_throws.mjs';
import { ATOMIC, SNAPMARE } from '../../src/animation/waistlockThrows.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['Lou on George', LOU, GEORGE], ['George on Lou', GEORGE, LOU]];
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` (got ${JSON.stringify(got)})`}`); if (!ok) fails++; };
const types = (rows) => rows.flatMap(r => r.events.map(e => e.type));
const clipsOf = (rows) => [...new Set(rows.map(r => r.t.clip).filter(Boolean))];
const last = (rows) => rows[rows.length - 1];

for (const [label, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL);
        for (const facing of [-1, 1]) {
            const tag = `${label}, attacker first facing ${facing < 0 ? 'left' : 'right'}`;
            // the plain drop
            let rows = await film(page, info, { facing, case: 'drop' });
            const end = last(rows);
            check(`${tag}: the drop plays its clip once, logs a move, nothing else`, JSON.stringify(clipsOf(rows)) === '["atomicDrop"]' && types(rows).filter(t => t === 'move').length === 1 && !types(rows).includes('orphanRescue'), { clips: clipsOf(rows), types: types(rows) });
            check(`${tag}: both stand at the end, no facing lock, nothing held`, end.t.states.every(s => s === 'standing') && !end.held && !end.t.drop, end.t.states);
            const low = Math.min(...rows.map(r => r.t.stamina[1]));
            check(`${tag}: the defender is down 12 stamina at the knee (before it regenerates)`, Math.abs(100 - low - 12) < 0.5, low);
            // reversal inside the lift
            rows = await film(page, info, { facing, case: 'reverse', rev: 6 });
            const e2 = last(rows), landed = rows.find(r => r.t.clip === 'snapmare' && r.t.time >= SNAPMARE.land);
            check(`${tag}: a press 0.1 s into the lift reverses it into the snapmare, once`, JSON.stringify(clipsOf(rows)) === '["atomicDrop","snapmare"]' && types(rows).includes('snapmare') && !types(rows).includes('orphanRescue'), { clips: clipsOf(rows), types: types(rows) });
            check(`${tag}: the thrown man (the old attacker) ends down on his back, the thrower stands, nobody tilted`, e2.t.states[0] === 'down' && e2.t.lying[0] === 'supine' && e2.t.states[1] === 'standing' && e2.t.tilt.every(v => v === 0), { s: e2.t.states, l: e2.t.lying, t: e2.t.tilt });
            const low2 = Math.min(...rows.map(r => r.t.stamina[0]));
            check(`${tag}: the thrown man is down 16 stamina (the snapmare), the thrower none`, Math.abs(100 - low2 - 16) < 0.5 && Math.min(...rows.map(r => r.t.stamina[1])) > 99.9, [low2, Math.min(...rows.map(r => r.t.stamina[1]))]);
            check(`${tag}: he turns the whole flip: tilt at the landing is a turn plus the landing angle`, landed && landed.t.tilt[0] > 2 * Math.PI * SNAPMARE.turns + 4, landed?.t.tilt);
            // a late press
            rows = await film(page, info, { facing, case: 'late', rev: Math.round(ATOMIC.reverseWindow * 60) + 3 });
            check(`${tag}: a press after the window is ignored and the drop completes`, JSON.stringify(clipsOf(rows)) === '["atomicDrop"]' && !types(rows).includes('snapmare'), { clips: clipsOf(rows), types: types(rows) });
            // denied at the ropes
            rows = await film(page, info, { facing, case: 'reverse', denied: true, rev: 6 });
            check(`${tag}: with no room to land, the reversal is denied (logged) and the drop completes`, JSON.stringify(clipsOf(rows)) === '["atomicDrop"]' && types(rows).includes('snapmareDenied') && !types(rows).includes('snapmare') && !types(rows).includes('orphanRescue'), { clips: clipsOf(rows), types: types(rows) });
        }
    } finally { await h.close(); }
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
