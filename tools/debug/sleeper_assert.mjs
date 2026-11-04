// PLAN_GRAPPLES T4d.2: the rear sleeper out of the waistlock, asserted on both rigs and both facings with waistlock_throws.mjs's stepped film: the finisher in the hold applies it
// (behind him, both facing the same way, upstage); untouched it runs the stages and ends in the KO; a mash in the flail rises him a stage, a mash in the fight escapes; the
// front sleeper is off with the flag on (a finisher at a standing man in reach does nothing). Fails nonzero.
//   WFM_URL=http://localhost:5173 node tools/debug/sleeper_assert.mjs
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film, DROP_AT } from './waistlock_throws.mjs';
import { SLEEPER } from '../../src/animation/sleeper.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['Lou on George', LOU, GEORGE], ['George on Lou', GEORGE, LOU]];
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` (got ${JSON.stringify(got)})`}`); if (!ok) fails++; };
const types = (rows) => rows.flatMap(r => r.events.map(e => e.type));
const count = (rows, t) => types(rows).filter(x => x === t).length;

for (const [label, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL);
        for (const facing of [-1, 1]) {
            const tag = `${label}, attacker first facing ${facing < 0 ? 'left' : 'right'}`;
            let rows = await film(page, info, { facing, case: 'sleeper' }, null, { frames: 400 });
            const on = rows.findIndex(r => r.t.sleeper);
            check(`${tag}: the finisher in the hold applies the rear sleeper once`, on > 0 && count(rows, 'sleeperApplied') === 1 && !types(rows).includes('orphanRescue'), { on, types: types(rows) });
            const mid = rows.find((r, i) => i > on + 30 && r.t.sleeper), A = mid?.a, D = mid?.d;
            check(`${tag}: he is behind him (about ${SLEEPER.behind} px at s = 1) and upstage, both facing the same way`, A && D && A.facing === D.facing && Math.abs(Math.abs(A.x - D.x) / A.s - SLEEPER.behind) < 3 && A.y < D.y, A && D && { dx: Math.abs(A.x - D.x) / A.s, dy: D.y - A.y, f: [A.facing, D.facing] });
            check(`${tag}: states are holding and sleeping`, mid && mid.a.state === 'holding' && mid.d.state === 'sleeping', mid && [mid.a.state, mid.d.state]);
            const last = rows[rows.length - 1];
            check(`${tag}: untouched, it ends in the KO (the old 4 s) and nobody is left tilted`, types(rows).includes('sleeperKO') && last.t.tilt.every(v => v === 0), { types: types(rows), tilt: last.t.tilt });
            rows = await film(page, info, { facing, case: 'sleeperMash', sleeperFrom: 100 }, null, { frames: 400 });
            check(`${tag}: a mash in the flail rises him a stage, then a mash in the fight escapes`, count(rows, 'sleeperStageUp') >= 1 && count(rows, 'sleeperEscape') === 1 && !types(rows).includes('sleeperKO'), { types: types(rows) });
            const end = rows[rows.length - 1];
            check(`${tag}: after the escape both stand and nothing is held`, end.t.states.every(s => s === 'standing') && !end.t.sleeper && !end.held, { s: end.t.states });
        }
        // the front sleeper is off with the flag on: a finisher at a standing man in reach starts nothing
        const front = await page.evaluate(() => {
            const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
            if (!a.moveSet.includes('sleeperHold')) a.moveSet.push('sleeperHold');
            a.state = 'standing'; d.state = 'standing'; d.x = a.x + a.facing * 60; d.y = a.y;
            a.input.justDown = (k) => k === 'finisher';
            const r = a.tryFinisher(d);
            return { r, states: [a.state, d.state] };
        });
        check(`${label}: the front sleeper is off: tryFinisher at a standing man returns false and changes no state`, front.r === false && front.states[0] === 'standing' && front.states[1] === 'standing', front);
    } finally { await h.close(); }
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
