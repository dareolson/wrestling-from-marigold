// PLAN_GRAPPLES T1.9: stepped-browser checks of the flag branch (Arena has no Node test). Fails nonzero.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_assert.mjs
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
import { LOCKUP } from '../../src/animation/lockup.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const ENGAGE_F = Math.ceil(LOCKUP.engageEnd * 60);
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` (got ${JSON.stringify(got)})`}`); if (!ok) fails++; };

const SPY = () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    window.__calls = [];
    for (const [side, w] of [['a', sc.w1], ['d', sc.w2]]) for (const m of ['_doHeadlock', '_doSuplex', '_doIrishWhip', '_doPiledriver', '_doBodySlam', '_doHipToss', '_doArmDrag', '_doHammerlock']) {
        const f = w[m];
        if (f) w[m] = function (...args) { window.__calls.push({ side, m, dir: typeof args[1] === 'number' ? args[1] : null }); return f.apply(this, args); };
    }
};

async function fresh(att = LOU, def = GEORGE) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    await h.page.waitForTimeout(2500);
    const info = await h.page.evaluate(INSTALL);
    await h.page.evaluate(SPY);
    return { h, page: h.page, moveSets: info.moveSets };
}
const start = (page, o = {}) => page.evaluate(SETUP, { facing: 1, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11, ...o });
async function run(page, script, frames) {
    const rows = [];
    for (let i = 0; i < frames; i++) rows.push(await page.evaluate(STEP, script(i) ?? {}));
    return rows;
}
const calls = (page) => page.evaluate(() => window.__calls);
const clear = (page) => page.evaluate(() => { window.__calls.length = 0; });

// 1-3: a press in the engage keeps its direction after the keys are released, and fires once.
for (const [name, keys, want, moveKey] of [['up+action gives the suplex', ['up'], '_doSuplex', 'suplex'], ['down+action gives the headlock', ['down'], '_doHeadlock', 'headlock'], ['right+action gives the whip', ['right'], '_doIrishWhip', 'irishWhip']]) {
    const { h, page, moveSets } = await fresh();
    await start(page);
    if (!moveSets.a.includes(moveKey)) { console.log(`skip ${name}: not in the kit`); await h.close(); continue; }
    await run(page, (i) => (i === 4 ? { press: { a: ['action'] }, hold: { a: keys } } : {}), ENGAGE_F + 8);
    const c = await calls(page);
    check(`${name}, released before the engage ends, fires once`, c.length === 1 && c[0].m === want && c[0].side === 'a', c);
    await h.close();
}

// 4: it does not fire early.
{
    const { h, page } = await fresh();
    await start(page);
    await run(page, (i) => (i === 4 ? { press: { a: ['action'] }, hold: { a: ['up'] } } : {}), ENGAGE_F - 3);
    check('nothing fires before the engage ends', (await calls(page)).length === 0, await calls(page));
    await h.close();
}

// 5: both men press in the engage: today's order, the contest first (a steal, no move).
{
    const { h, page } = await fresh();
    await start(page);
    const rows = await run(page, (i) => (i === 4 ? { press: { a: ['action'], d: ['action'] } } : {}), ENGAGE_F + 4);
    const c = await calls(page);
    check('both press in the engage: the defender\'s contest wins, no move, roles swap', c.length === 0 && rows.at(-1).who === 'd' && rows.at(-1).g.stealAt !== null, { c, who: rows.at(-1).who });
    await h.close();
}

// 6: the pending press dies with the lockup; 7: no follow-up in the break.
{
    const { h, page } = await fresh();
    await start(page);
    await run(page, (i) => (i === 4 ? { press: { a: ['action'] } } : {}), 8);
    await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.lockupState = null; sc.w1.state = 'standing'; sc.w2.state = 'standing'; });
    await run(page, () => ({}), ENGAGE_F);
    check('an interrupted lockup discards the pending press', (await calls(page)).length === 0, await calls(page));
    await clear(page);
    await start(page);
    const f = Math.ceil(LOCKUP.timeout * 60) + 3;
    const rows = await run(page, (i) => (i === f ? { press: { a: ['action'] } } : {}), f + 30);
    check('a press during the break does nothing', (await calls(page)).length === 0 && rows[f].g?.phase === 'break', [await calls(page), rows[f].g?.phase]);
    const end = rows.at(-1);
    check('break cleanup: lockup over, both standing', !end.locked && end.a.state === 'standing' && end.d.state === 'standing', [end.locked, end.a.state, end.d.state]);
    check('break cleanup: the torso settles back', Math.abs(end.a.pose.bend ?? 0) < 0.02 && Math.abs(end.d.pose.bend ?? 0) < 0.02, [end.a.pose.bend, end.d.pose.bend]);
    await h.close();
}

// 8: steal rights: the new attacker has the follow-up, the old one contests.
{
    const { h, page } = await fresh();
    await start(page);
    const steal = 40, f = steal + 26;
    const rows = await run(page, (i) => (i === steal ? { press: { d: ['action'] } } : i === f ? { press: { d: ['action'] }, hold: { d: ['up'] } } : {}), f + 4);
    const c = await calls(page);
    check('after a steal the stealer has the follow-up', c.length === 1 && c[0].side === 'd', c);
    check('the steal hitches, then the drive goes the other way', rows.some(r => r.g?.phase === 'steal') && rows[steal + 2].who === 'd', rows[steal + 2].who);
    await h.close();
}

// 9: a real stall: the phase is reached and the pair's x holds.
{
    const { h, page } = await fresh();
    await start(page, { defRope: 40 });
    const rows = await run(page, () => ({}), Math.ceil(LOCKUP.timeout * 60) - 2);
    const st = rows.filter(r => r.g?.phase === 'stall');
    check('the ropes stop the drive', st.length >= 5, st.length);
    const xs = st.map(r => r.a.x + r.d.x);
    check('the pair does not move in the stall', st.length > 1 && Math.max(...xs) - Math.min(...xs) < 0.01, xs.slice(0, 4));
    await h.close();
}

console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
