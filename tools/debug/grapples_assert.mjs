// PLAN_GRAPPLES T1.9: stepped-browser checks of the flag branch (Arena has no Node test). Fails nonzero.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_assert.mjs
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
import { LOCKUP, breakKind } from '../../src/animation/lockup.js';
import { INSTALL_LEGS, legFails } from './grapples_legs.mjs';
import { runLegs } from './grapples_legs_run.mjs';

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
    const rows = await run(page, (i) => (i === f ? { press: { a: ['action'] } } : {}), f + 48);
    check('a press during the break does nothing', (await calls(page)).length === 0 && rows[f].g?.phase === 'break', [await calls(page), rows[f].g?.phase]);   // the run outlasts the 220 ms idle tween
    const end = rows.at(-1);
    check('break cleanup: lockup over, both standing', !end.locked && end.a.state === 'standing' && end.d.state === 'standing', [end.locked, end.a.state, end.d.state]);
    check('break cleanup: the torso settles back', Math.abs(end.a.pose.bend ?? 0) < 0.02 && Math.abs(end.d.pose.bend ?? 0) < 0.02, [end.a.pose.bend, end.d.pose.bend]);
    check('break cleanup: the legs are handed back (no absolute shin left, the knee owner is back at 0 flex)', [end.a, end.d].every(w => w.pose.lShin === undefined && w.pose.rShin === undefined && w.pose.lKnee === 0 && w.pose.rKnee === 0), [end.a.pose.lShin, end.a.pose.lKnee, end.d.pose.rShin, end.d.pose.rKnee]);
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

// 10-12: the endings. Seeds picked by breakKind so each kind is filmed on purpose; no stamina moves.
{
    const { h, page } = await fresh();
    const seedFor = (want) => { for (let s = 1; s < 500; s++) if (breakKind(s, false) === want) return s; };
    const T = Math.ceil(LOCKUP.timeout * 60) + 30;
    await start(page, { defRope: 40 });
    let rows = await run(page, () => ({}), T);
    let last = rows.findLast(r => r.locked);
    check('a stall that times out is a rope break: the attacker backs off, the defender stays', last.g.phase === 'break' && Math.abs(last.a.x - rows[60].a.x) > 25 && Math.abs(last.d.x - rows[60].d.x) < 1, [last.a.x, rows[60].a.x, last.d.x, rows[60].d.x]);
    await start(page, { seed: seedFor('shove'), facing: 1, midX: 480 });
    rows = await run(page, () => ({}), T);
    last = rows.findLast(r => r.locked);
    const dGo = Math.abs(last.d.x - rows[83].d.x), aGo = Math.abs(last.a.x - rows[83].a.x);
    check('the shove sends the defender back and the attacker keeps his feet', dGo > 30 && aGo < 10, [dGo, aGo]);
    check('no stamina change in either ending', last.a.state && rows.at(-1).a.state === 'standing' && (await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return sc.w1.stamina === 100 && sc.w2.stamina === 100; })), 'stamina');
    check('no pending moves from an ending', (await calls(page)).length === 0, await calls(page));
    await h.close();
}

// 13: D13, rendered on the real rigs: no knee behind the hip-ankle line and two readable legs, both men, both facings, engage / even / drive / break.
// (Sole height and trunks are measured by grapples_legs_run.mjs and reported, not asserted.)
for (const [att, def] of [[LOU, GEORGE], [GEORGE, LOU]]) {
    const { h, page } = await fresh(att, def);
    await page.evaluate(INSTALL_LEGS);
    for (const facing of [1, -1]) {
        const { summary } = await runLegs({ att, def, facing, page });
        const bad = legFails(summary).filter(f => ['kneeLine', 'ankleStagger', 'kneeStagger'].includes(f.measure));
        check(`${att === LOU ? 'Lou' : 'George'} attacking, facing ${facing}: no backward knee, ankles 20 / knees 14 px apart in every phase`, bad.length === 0, bad.slice(0, 3));
    }
    await h.close();
}

// 14: D13 layers, on the real rigs: through a drive each man's far leg draws behind his own torso and his near leg in front of it (and every part of the
// first man's body behind the second's torso), both facings.
for (const [att, def] of [[LOU, GEORGE], [GEORGE, LOU]]) {
    const { h, page } = await fresh(att, def);
    for (const facing of [1, -1]) {
        await page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
        const bad = [];
        for (let i = 0; i < 80; i++) {
            await page.evaluate(STEP, { press: { a: [], d: [] }, hold: { a: [], d: [] }, legs: null });
            if (i < 20 || i % 10) continue;
            const d = await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return [sc.w1, sc.w2].map(w => { const k = w.skeleton, z = (n) => k[n].depth; return { farBehind: Math.max(z('farThigh'), z('farShin')) < z('torso'), nearFront: Math.min(z('nearThigh'), z('nearShin')) > z('torso'), top: Math.max(...['farThigh', 'farShin', 'nearThigh', 'nearShin', 'torso', 'head'].map(z)), low: Math.min(...['farThigh', 'farShin', 'nearThigh', 'nearShin', 'torso', 'head'].map(z)) }; }); });
            for (const [k, m] of d.entries()) if (!m.farBehind || !m.nearFront) bad.push({ i, man: k, ...m });
            const [first, second] = d[0].low < d[1].low ? d : [d[1], d[0]];
            if (first.top > second.low) bad.push({ i, bodies: [first.top, second.low] });
        }
        check(`${att === LOU ? 'Lou' : 'George'} attacking, facing ${facing}: each far leg behind its torso, each near leg in front, one body behind the other`, bad.length === 0, bad.slice(0, 3));
    }
    await h.close();
}

// 15: D13 exits: a move taken out of the lockup (the whip) does not inherit the lockup's absolute shins, for either rig, both men.
for (const [att, def] of [[LOU, GEORGE], [GEORGE, LOU]]) {
    const { h, page } = await fresh(att, def);
    await page.evaluate(SPY);
    await page.evaluate(SETUP, { facing: 1, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
    let gone = null;
    for (let i = 0; i < 80; i++) {
        const row = await page.evaluate(STEP, { press: { a: i === 48 ? ['action'] : [], d: [] }, hold: { a: i === 48 ? ['right'] : [], d: [] }, legs: null });
        if (!row.locked && i >= 54) { gone = [row.a, row.d].map(w => [w.pose.lShin, w.pose.rShin]); break; }
    }
    check(`${att === LOU ? 'Lou' : 'George'} attacking: after the whip no lockup shin is left on either man`, gone !== null && gone.flat().every(v => v === undefined), gone);
    await h.close();
}

console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
